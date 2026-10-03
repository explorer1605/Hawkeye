# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress

## Current Goal

- Integrate live USB camera feed into the dashboard

## Completed

- Initial MVP — canvas-drawn conveyor simulation with simulated inspection data
- Live camera integration — replaced canvas animation with real USB webcam via `getUserMedia()`
  - Real `<video>` element rendering live camera feed
  - Canvas overlay for bounding boxes and status chips
  - Camera permission handling (denied, not found, in-use errors)
  - Loading / error / offline fallback states with retry button
  - Play/pause controls that pause/resume the actual video stream
  - Removed "Simulate Defect" button and "Simulated feed" badge

## In Progress

- Inspection data still flows from frontend simulation engine (temporary until ML pipeline is ready)

## Next Up

- Build ML vision pipeline (Python) to process camera frames
- Wire ML pipeline output → `POST /api/v1/inspections/ingest` → WebSocket broadcast
- Replace frontend simulation engine with real API + WebSocket data flow

## Open Questions

- ML pipeline technology stack (YOLO, custom model, etc.)
- Camera frame capture strategy (grab frames from stream, or separate OpenCV process?)

## Architecture Decisions

- Used browser `getUserMedia()` API for camera access instead of backend
  RTSP/MJPEG proxy — simplest approach for USB webcam on same PC
- Kept simulation engine for inspection data temporarily so the dashboard
  remains functional while the ML pipeline is being built
- Removed demo/simulation mode toggle per user decision — will be
  deleted entirely once ML pipeline is wired up

## Session Notes

- CameraFeed.tsx fully rewritten (was 400-line canvas simulation, now
  live webcam with overlay)
- App.tsx unchanged — still uses simulation engine for data, which is
  correct for now
- Dev server runs on port 3001 (3000 was in use)
