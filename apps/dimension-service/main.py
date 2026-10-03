import cv2
import asyncio
import threading
import json
import os
import time
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
import uvicorn

from detector import DimensionDetector

thread_running = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global thread_running
    thread_running = True
    t = threading.Thread(target=camera_loop, daemon=True)
    t.start()
    yield
    thread_running = False

app = FastAPI(title="Hawkeye Dimension Service", lifespan=lifespan)

# Allow CORS for the web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
detector = DimensionDetector()
camera = None
latest_frame_encoded = None
latest_detections = []
lock = threading.Lock()

class CalibrateRequest(BaseModel):
    reference_width_mm: float

class CameraSwitchRequest(BaseModel):
    camera_index: int

# Track current camera index from environment or default to 0
current_camera_index = int(os.environ.get("CAMERA_INDEX", 0))

def camera_loop():
    global camera, latest_frame_encoded, latest_detections, current_camera_index, thread_running
    
    while thread_running:
        if camera is None or not camera.isOpened():
            print(f"Attempting to open camera index {current_camera_index}...")
            camera = cv2.VideoCapture(current_camera_index)
            
            if not camera.isOpened():
                print(f"Error: Could not open camera {current_camera_index}. Retrying in 2 seconds...")
                time.sleep(2)
                continue
                
            # Set resolution for better detection
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            print(f"Successfully opened camera {current_camera_index}")
            
        ret, frame = camera.read()
        if not ret:
            print("Failed to grab frame. Reconnecting...")
            camera.release()
            time.sleep(1)
            continue
            
        # Process the frame through our dimension detector
        annotated_frame, detections = detector.process_frame(frame)
        
        # Encode for HTTP Streaming
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        if ret:
            with lock:
                latest_frame_encoded = buffer.tobytes()
                latest_detections = detections
                
def generate_frames():
    while True:
        with lock:
            frame_bytes = latest_frame_encoded
            
        if frame_bytes is None:
            continue
            
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
               
@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "hawkeye-dimension-vision",
        "camera_active": camera.isOpened() if camera else False,
        "active_detections": len(latest_detections)
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[WebSocket] Client connected")
    try:
        while True:
            with lock:
                payload = {
                    "type": "DIMENSION_DETECTION",
                    "detections": latest_detections,
                    "ppm": detector.ppm,
                    "timestamp": time.time()
                }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1.0 / 24.0)  # Stream at 24 FPS
    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")

@app.get("/video_feed")
def video_feed():
    """
    Returns an MJPEG stream of the annotated camera feed.
    """
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.post("/calibrate")
def calibrate(request: CalibrateRequest):
    """
    Calibrates the camera using the largest detected object in the current frame.
    """
    if camera is None or not camera.isOpened():
        raise HTTPException(status_code=500, detail="Camera is not active.")
        
    # Grab a fresh frame for calibration
    ret, frame = camera.read()
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to grab frame for calibration.")
        
    success = detector.calibrate(frame, request.reference_width_mm)
    
    if success:
        return {"status": "success", "message": f"Calibrated successfully! PPM: {detector.ppm:.4f}"}
    else:
        raise HTTPException(status_code=400, detail="Calibration failed. Make sure a reference object is clearly visible in the frame.")

@app.post("/switch_camera")
def switch_camera(request: CameraSwitchRequest):
    """
    Switches the active camera index.
    """
    global current_camera_index, camera
    current_camera_index = request.camera_index
    if camera and camera.isOpened():
        camera.release()
    return {"status": "success", "message": f"Switching to camera index {current_camera_index}..."}

@app.get("/detections")
def get_detections():
    """
    Returns the latest detections as JSON.
    """
    with lock:
        return JSONResponse(content={"detections": latest_detections, "ppm": detector.ppm})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
