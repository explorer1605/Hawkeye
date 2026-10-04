import cv2
import asyncio
import threading
import json
import os
import time
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
import uvicorn
import numpy as np
import io
from PIL import Image

from detector import DimensionDetector

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

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
@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "hawkeye-dimension-vision"
    }

@app.post("/calibrate")
async def calibrate(
    file: UploadFile = File(...),
    reference_width_mm: float = Form(...),
    roi: str = Form(None)
):
    """
    Calibrates the camera using the reference width and optional custom ROI or detected object.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
        
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    frame = np.array(image)
    # Convert RGB to BGR for OpenCV
    frame = frame[:, :, ::-1].copy()
        
    parsed_roi = None
    if roi:
        try:
            parsed_roi = json.loads(roi)
        except Exception:
            pass

    success, message = detector.calibrate(frame, reference_width_mm, parsed_roi)
    
    if success:
        return {"status": "success", "message": message, "ppm": detector.ppm}
    else:
        raise HTTPException(status_code=400, detail=message)



@app.post("/measure")
async def measure(file: UploadFile = File(...)):
    """
    Measures the dimensions of the object in the uploaded image.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    frame = np.array(image)
    # Convert RGB to BGR for OpenCV
    frame = frame[:, :, ::-1].copy()

    annotated_frame, detections = detector.process_frame(frame)
    return {"status": "success", "detections": detections, "ppm": detector.ppm}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
