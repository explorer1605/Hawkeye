"""
Hawkeye Vision Service - Live Camera Feed & OCR Detection Server
Runs at 24+ FPS on NVIDIA GeForce RTX 4050 GPU using DirectML.
Provides:
- MJPEG low-latency video stream for web dashboard: /video_feed
- Real-time WebSocket detection stream: /ws
- REST API for latest detections and health
"""
import os
import sys
import time
import asyncio
import threading
import json
import cv2
import numpy as np
from contextlib import asynccontextmanager
from typing import List, Dict, Any
import argparse

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, Response
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from detector import DBNetTextDetector
from camera_utils import (
    open_usb_camera,
    set_camera_autofocus,
    set_camera_focus,
    get_camera_focus_info,
    open_camera_settings_dialog,
)

engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    if engine:
        engine.start()
    yield
    if engine:
        engine.stop()

app = FastAPI(title="Hawkeye OCR Vision Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Vision Engine State
class VisionEngine:
    def __init__(self, camera_index: int = 1):
        self.camera_index = camera_index  # 1 = USB camera by default
        self.model_dir = os.path.join(BASE_DIR, "models", "detector_out")
        self.detector = DBNetTextDetector(self.model_dir)

        self.cap = None
        self.running = False
        self.thread = None

        self.latest_raw_frame = None
        self.latest_annotated_frame = None
        self.latest_detections: List[Dict[str, Any]] = []
        self.current_fps = 0.0
        self.inference_time_ms = 0.0
        self.lock = threading.Lock()
        self.ws_clients: List[WebSocket] = []

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._capture_and_infer_loop, daemon=True)
        self.thread.start()
        print(f"[VisionEngine] Started live detection thread")

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
        if self.cap:
            self.cap.release()
            self.cap = None
        print("[VisionEngine] Stopped.")

    def _open_camera(self):
        try:
            cap, actual_idx = open_usb_camera(preferred_index=self.camera_index)
            self.camera_index = actual_idx
            return cap
        except Exception as e:
            print(f"[VisionEngine ERROR] Failed to open USB camera: {e}")
            return None

    def _capture_and_infer_loop(self):
        self.cap = self._open_camera()
        if not self.cap or not self.cap.isOpened():
            print(f"[VisionEngine ERROR] Could not open camera {self.camera_index}")
            self.running = False
            return

        fps_buffer = []
        prev_time = time.time()

        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.01)
                continue

            # Run GPU DBNet inference
            infer_result = self.detector.detect(frame)
            detections = infer_result["detections"]
            inf_ms = infer_result["inference_time_ms"]

            # Calculate actual loop FPS
            now = time.time()
            dt = now - prev_time
            prev_time = now
            inst_fps = 1.0 / dt if dt > 0 else 0.0
            fps_buffer.append(inst_fps)
            if len(fps_buffer) > 24:
                fps_buffer.pop(0)
            avg_fps = sum(fps_buffer) / len(fps_buffer)

            # Create annotated frame
            annotated = frame.copy()
            overlay = frame.copy()

            for det in detections:
                box = np.array(det["box"], dtype=np.int32)
                score = det["score"]

                # Fill polygon
                cv2.fillPoly(overlay, [box], (61, 220, 132))
                # Crisp outline
                cv2.polylines(annotated, [box], True, (61, 220, 132), 2, cv2.LINE_AA)

                # Text chip
                x_min = int(box[:, 0].min())
                y_min = int(box[:, 1].min())
                chip_text = f"TEXT: {score:.0%}"
                (tw, th), _ = cv2.getTextSize(chip_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                cv2.rectangle(annotated, (x_min, max(0, y_min - th - 8)), (x_min + tw + 6, y_min), (61, 220, 132), -1)
                cv2.putText(annotated, chip_text, (x_min + 3, max(th + 2, y_min - 4)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 16, 28), 1, cv2.LINE_AA)

            # Alpha blend for subtle highlight
            cv2.addWeighted(overlay, 0.12, annotated, 0.88, 0, annotated)

            # Store latest frames safely
            with self.lock:
                self.latest_raw_frame = frame
                self.latest_annotated_frame = annotated
                self.latest_detections = detections
                self.current_fps = round(avg_fps, 1)
                self.inference_time_ms = round(inf_ms, 1)

    def get_latest_jpeg(self, annotated: bool = True) -> bytes:
        with self.lock:
            frame = self.latest_annotated_frame if annotated else self.latest_raw_frame
            if frame is None:
                # Return placeholder black frame
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(frame, "Waiting for camera...", (180, 240),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            
            _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            return jpeg.tobytes()

    def set_autofocus(self, enabled: bool) -> bool:
        if self.cap and self.cap.isOpened():
            return set_camera_autofocus(self.cap, enabled)
        return False

    def set_focus(self, focus_val: float) -> bool:
        if self.cap and self.cap.isOpened():
            return set_camera_focus(self.cap, focus_val)
        return False

    def open_settings_dialog(self) -> bool:
        if self.cap and self.cap.isOpened():
            return open_camera_settings_dialog(self.cap)
        return False

    def get_focus_status(self) -> dict:
        if self.cap and self.cap.isOpened():
            return get_camera_focus_info(self.cap)
        return {"autofocus": None, "focus": None}

engine = VisionEngine(camera_index=1)

@app.get("/camera/info")
def camera_info():
    if not engine:
        return {"error": "Engine not running"}
    focus_info = engine.get_focus_status()
    return {
        "status": "online",
        "camera_index": engine.camera_index,
        "camera_active": engine.running,
        "current_fps": engine.current_fps,
        **focus_info
    }

@app.post("/camera/autofocus")
def camera_autofocus(enabled: bool = True):
    if not engine:
        return {"error": "Engine not running"}
    res = engine.set_autofocus(enabled)
    return {"success": res, "autofocus": enabled}

@app.post("/camera/focus")
def camera_focus(value: float = 0.0):
    if not engine:
        return {"error": "Engine not running"}
    res = engine.set_focus(value)
    return {"success": res, "focus": value}

@app.post("/camera/settings")
def camera_settings():
    if not engine:
        return {"error": "Engine not running"}
    res = engine.open_settings_dialog()
    return {"success": res, "message": "Camera DirectShow settings dialog requested"}

@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "hawkeye-ocr-vision",
        "camera_active": engine.running if engine else False,
        "current_fps": engine.current_fps if engine else 0.0,
        "inference_ms": engine.inference_time_ms if engine else 0.0,
        "active_detections": len(engine.latest_detections) if engine else 0,
    }

@app.get("/detections")
def get_detections():
    if not engine:
        return {"fps": 0, "inference_ms": 0, "detections": [], "timestamp": time.time()}
    with engine.lock:
        return {
            "fps": engine.current_fps,
            "inference_ms": engine.inference_time_ms,
            "detections": engine.latest_detections,
            "timestamp": time.time()
        }

def generate_video_stream():
    while True:
        frame_bytes = engine.get_latest_jpeg(annotated=True) if engine else b''
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(1.0 / 30.0)

@app.get("/video_feed")
def video_feed():
    """MJPEG stream endpoint for displaying in web browser <img src="/video_feed" />"""
    return StreamingResponse(
        generate_video_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/camera/snapshot")
def camera_snapshot():
    """Return the current single JPEG frame (useful for pausing or saving)"""
    if not engine:
        return JSONResponse(status_code=503, content={"error": "Engine not running"})
    jpeg_bytes = engine.get_latest_jpeg(annotated=True)
    return Response(content=jpeg_bytes, media_type="image/jpeg")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[WebSocket] Client connected")
    try:
        while True:
            if engine:
                with engine.lock:
                    payload = {
                        "type": "OCR_DETECTION",
                        "fps": engine.current_fps,
                        "inference_ms": engine.inference_time_ms,
                        "detections": engine.latest_detections,
                        "timestamp": time.time()
                    }
                await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1.0 / 24.0)  # Stream at 24 FPS
    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hawkeye Vision Service")
    parser.add_argument("--port", type=int, default=8001, help="Port to run FastAPI server (default: 8001)")
    parser.add_argument("--cam", type=int, default=1, help="Camera index (default: 1 for USB camera)")
    args = parser.parse_args()

    if args.cam is not None:
        engine.camera_index = args.cam

    print(f"[Main] Launching Hawkeye Vision Server on http://0.0.0.0:{args.port}...")
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")
