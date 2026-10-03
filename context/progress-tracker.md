# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress

## Current Goal

- Implement live OCR text detector with 24+ FPS on GPU and web app integration

## Completed

- Initial MVP — canvas-drawn conveyor simulation with simulated inspection data
- Live camera integration — replaced canvas animation with real USB webcam via `getUserMedia()`
- Implemented Python Vision Service (`apps/ocr-service`):
  - Model verification: DBNet text detector (`mpsc_text_det.onnx`) with DirectML on NVIDIA RTX 4050 GPU
  - Raw GPU inference benchmarked at **8.3ms (~120 FPS)**, comfortably exceeding 24 FPS requirement
  - DBNet pre/post-processing module (`detector.py`) with contour extraction, polygon scoring, and unclip offset
  - Fixed Windows camera crash caused by duplicate OpenCV library collision (`opencv-python` vs `opencv-contrib-python`)
  - Added smart USB camera auto-selection (`camera_utils.py` targeting camera index 1)
  - Standalone live OpenCV test runner (`live_test.py`) with crash-proof exception handling
  - FastAPI vision server (`main.py`) streaming low-latency MJPEG video (`/video_feed`) and WebSocket telemetry (`/ws`)
- Web Dashboard Integration (`apps/web`):
  - Updated `CameraFeed.tsx` to automatically default to Python GPU Vision Service (USB camera)
  - Added continuous `/health` polling to keep USB camera stream alive without falling back to laptop webcam
  - Added persistent top-bar button to instantly toggle between USB Camera and Laptop Webcam
  - Locked Vite webapp to strictly port 3000 (`strictPort: true`) to prevent jumping ports
  - Added hardware autofocus enablement and manual focus slider + DirectShow properties trigger to Python vision engine and web dashboard
  - Pinned DirectML to NVIDIA RTX 4050 (device_id 1) for 8.7ms inference, avoiding Intel integrated GPU
  - Configured hardware MJPEG stream (`CAP_PROP_FOURCC = MJPG`) and buffer size 1 for low-latency 30 FPS USB camera video
  - Added Pause Frame / Resume Feed feature with client-side offscreen canvas frame freeze and `/camera/snapshot` fallback
  - Streams live 30 FPS video with GPU detection overlays and real-time GPU FPS counter

## In Progress

- Live webcam text detection validation and text extraction testing

## Next Up

- Run standalone and web live test with sample billet text
- Add text recognizer module to read characters from detected bounding boxes
- Wire OCR results into `POST /api/v1/inspections/ingest` for full dashboard history

## Open Questions

- ML pipeline technology stack (YOLO, custom model, etc.)
- Camera frame capture strategy (grab frames from stream, or separate OpenCV process?)

## Architecture Decisions

- Dual-source camera feed: Primary Python GPU Vision Service (`/video_feed`
  MJPEG stream with DirectML DBNet on RTX 4050 GPU at 24+ FPS), with fallback
  and persistent toggle to browser `getUserMedia()` webcam
- Kept simulation engine for inspection data temporarily so the dashboard
  remains functional while the ML pipeline is being built
- Removed demo/simulation mode toggle per user decision — will be
  deleted entirely once ML pipeline is wired up

## Session Notes

- CameraFeed.tsx fully rewritten (was 400-line canvas simulation, now
  live webcam with overlay)
- App.tsx unchanged — still uses simulation engine for data, which is
  correct for now
- Web dashboard locked strictly to port 3000 (`strictPort: true`)
