"""
Standalone Live USB Camera Test for Hawkeye Text Detector
Runs at 24+ FPS on GPU with OpenCV display window.
Press 'q' or 'ESC' to quit, 's' to save snapshot.
"""
import os
import sys
import time
import traceback
import argparse
import cv2
import numpy as np

# Ensure ocr-service directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from detector import DBNetTextDetector
from camera_utils import open_usb_camera, get_available_cameras

def run_live_test(preferred_index: int = None):
    print("=" * 65)
    print(" Hawkeye Live Text Detection (NVIDIA RTX 4050 GPU)")
    print("=" * 65)

    model_dir = os.path.join(BASE_DIR, "models", "detector_out")
    if not os.path.exists(model_dir):
        print(f"[ERROR] Model directory not found at: {model_dir}")
        return

    print(f"[1/3] Loading DBNet model from: {model_dir}...")
    try:
        detector = DBNetTextDetector(model_dir)
    except Exception as e:
        print(f"[ERROR] Failed to initialize model: {e}")
        traceback.print_exc()
        return

    print(f"[2/3] Detecting and opening USB camera...")
    try:
        cap, active_cam_idx = open_usb_camera(preferred_index=preferred_index)
    except Exception as e:
        print(f"[ERROR] Camera initialization error: {e}")
        return

    print(f"[3/3] Camera active on index {active_cam_idx}. Starting live detection...")
    print(" -------------------------------------------------------------")
    print("  Controls: Press 'q' or 'ESC' to quit | Press 's' to snapshot")
    print(" -------------------------------------------------------------")

    fps_history = []
    prev_time = time.time()
    window_name = "Hawkeye - USB Camera Text Detector (RTX 4050 GPU)"

    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 1024, 576)

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                time.sleep(0.01)
                continue

            frame_h, frame_w = frame.shape[:2]

            # Run GPU inference safely
            try:
                result = detector.detect(frame)
                inference_ms = result.get("inference_time_ms", 0.0)
                detections = result.get("detections", [])
            except Exception as e:
                print(f"[Inference Error]: {e}")
                inference_ms = 0.0
                detections = []

            # Calculate FPS
            curr_time = time.time()
            loop_dt = curr_time - prev_time
            prev_time = curr_time
            curr_fps = 1.0 / loop_dt if loop_dt > 0 else 0
            fps_history.append(curr_fps)
            if len(fps_history) > 30:
                fps_history.pop(0)
            avg_fps = sum(fps_history) / len(fps_history)

            # Draw detections
            overlay = frame.copy()
            for det in detections:
                box = np.array(det["box"], dtype=np.int32)
                score = det.get("score", 0.0)

                # Fill polygon with green tint
                cv2.fillPoly(overlay, [box], (61, 220, 132))

                # Outline
                cv2.polylines(frame, [box], True, (61, 220, 132), 2, cv2.LINE_AA)

                # Text score chip
                x_min = max(0, int(box[:, 0].min()))
                y_min = max(0, int(box[:, 1].min()))
                chip_text = f"TEXT: {score:.0%}"
                (tw, th), _ = cv2.getTextSize(chip_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                cv2.rectangle(frame, (x_min, max(0, y_min - th - 8)), (x_min + tw + 6, y_min), (61, 220, 132), -1)
                cv2.putText(frame, chip_text, (x_min + 3, max(th + 2, y_min - 4)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 16, 28), 1, cv2.LINE_AA)

            # Glassmorphism blend
            cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)

            # Top HUD Bar
            cv2.rectangle(frame, (0, 0), (frame_w, 42), (10, 16, 28), -1)
            status_color = (61, 220, 132) if avg_fps >= 24 else (56, 185, 255)
            cv2.circle(frame, (18, 21), 6, status_color, -1)
            cv2.putText(frame, f"USB CAM #{active_cam_idx} | FPS: {avg_fps:.1f} ({inference_ms:.1f}ms GPU) | Detections: {len(detections)}",
                        (34, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)

            cv2.imshow(window_name, frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:  # 'q' or ESC
                print("[INFO] Exiting on user request.")
                break
            elif key == ord('s'):
                snap_name = f"snapshot_{int(time.time())}.jpg"
                cv2.imwrite(snap_name, frame)
                print(f"[INFO] Saved snapshot: {snap_name}")

            # Check if user clicked the window's close 'X' button
            if cv2.getWindowProperty(window_name, cv2.WND_PROP_VISIBLE) < 1:
                print("[INFO] Window closed by user.")
                break

    except KeyboardInterrupt:
        print("[INFO] Stopped by user.")
    except Exception as e:
        print(f"[CRITICAL ERROR in live loop]: {e}")
        traceback.print_exc()
    finally:
        if cap is not None:
            cap.release()
        cv2.destroyAllWindows()
        print("[INFO] Clean shutdown complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hawkeye Live USB Camera OCR Test")
    parser.add_argument("--cam", type=int, default=None, help="Camera index (e.g. 1 for USB, 0 for laptop)")
    parser.add_argument("--list", action="store_true", help="List available cameras and exit")
    args = parser.parse_args()

    if args.list:
        cams = get_available_cameras()
        print("Connected Cameras:")
        for c in cams:
            print(f"  [{c['index']}] {c['type']} ({c['resolution']})")
    else:
        run_live_test(args.cam)
