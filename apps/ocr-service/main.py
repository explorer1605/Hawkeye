import cv2
import uvicorn
import threading
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from ultralytics import YOLO
import pytesseract
import time
import queue
import numpy as np
import io
from PIL import Image

app = FastAPI(title="Hawkeye OCR Service")

# 1. Configuration
# Once you train YOLO on the extracted frames, update this path
YOLO_MODEL_PATH = "yolov8n_custom.pt" 
CAMERA_SOURCE = "../../assets/test_vid.mp4" # Or use 0 for webcam

# Tesseract highly optimized config
TESSERACT_CONFIG = "--psm 7 -c tessedit_char_whitelist=HT0123456789"

# Thread-safe queue for the latest processed frame
frame_queue = queue.Queue(maxsize=2)

def ocr_worker():
    """Background thread to read camera, run YOLO, run Tesseract, and push to queue."""
    # Load YOLO model (Using a dummy placeholder for now until you provide the trained model)
    global yolo_model
    try:
        yolo_model = YOLO(YOLO_MODEL_PATH)
        print(f"Loaded YOLO model from {YOLO_MODEL_PATH}")
    except Exception as e:
        print(f"Warning: Could not load YOLO model (expected since you are training it). Error: {e}")
        yolo_model = None
        
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            # Loop the video for testing
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
            
        start_time = time.time()
        
        # 2. YOLO Text Detection
        if yolo_model:
            # We use half precision or specific imgsz for extra speed if needed
            results = yolo_model(frame, verbose=False, imgsz=640)
            
            for box in results[0].boxes:
                # Get coordinates
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                # Crop the text region
                text_crop = frame[y1:y2, x1:x2]
                
                # 3. Tesseract OCR
                if text_crop.size > 0:
                    gray_crop = cv2.cvtColor(text_crop, cv2.COLOR_BGR2GRAY)
                    # Optional: Thresholding for better OCR
                    _, thresh_crop = cv2.threshold(gray_crop, 150, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
                    
                    detected_text = pytesseract.image_to_string(thresh_crop, config=TESSERACT_CONFIG).strip()
                    
                    # Draw bounding box and text on the main frame
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, detected_text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
        # Calculate and display FPS
        fps = 1.0 / (time.time() - start_time)
        cv2.putText(frame, f"FPS: {fps:.1f}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

        # Push to queue for streaming
        if frame_queue.full():
            try:
                frame_queue.get_nowait()
            except queue.Empty:
                pass
        frame_queue.put(frame)

def generate_frames():
    """Generator for MJPEG stream"""
    while True:
        frame = frame_queue.get()
        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            continue
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.on_event("startup")
def startup_event():
    # Start the background worker thread
    worker_thread = threading.Thread(target=ocr_worker, daemon=True)
    worker_thread.start()

@app.get("/video_feed")
def video_feed():
    """Stream endpoint for the web dashboard."""
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

yolo_model = None

@app.post("/read_text")
async def read_text(file: UploadFile = File(...)):
    """API endpoint to perform OCR on an uploaded image."""
    global yolo_model
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    if yolo_model is None:
        try:
            yolo_model = YOLO(YOLO_MODEL_PATH)
        except Exception as e:
            raise HTTPException(status_code=500, detail="YOLO model not loaded.")

    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    frame = np.array(image)
    # Convert RGB to BGR for OpenCV processing
    frame = frame[:, :, ::-1].copy()

    detected_text = ""
    confidence = 0.0

    results = yolo_model(frame, verbose=False, imgsz=640)
    
    if len(results[0].boxes) > 0:
        # Take the first detected box
        box = results[0].boxes[0]
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        
        text_crop = frame[y1:y2, x1:x2]
        
        if text_crop.size > 0:
            gray_crop = cv2.cvtColor(text_crop, cv2.COLOR_BGR2GRAY)
            _, thresh_crop = cv2.threshold(gray_crop, 150, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
            
            # You can also use pytesseract.image_to_data for confidence
            data = pytesseract.image_to_data(thresh_crop, config=TESSERACT_CONFIG, output_type=pytesseract.Output.DICT)
            texts = data['text']
            confs = data['conf']
            
            valid_texts = []
            valid_confs = []
            for i, text in enumerate(texts):
                if text.strip():
                    valid_texts.append(text.strip())
                    if int(confs[i]) > 0:
                        valid_confs.append(int(confs[i]))
            
            detected_text = "".join(valid_texts)
            if valid_confs:
                confidence = sum(valid_confs) / len(valid_confs) / 100.0
            else:
                confidence = 0.5
    else:
        # If no box detected by YOLO, fallback to full image OCR or return empty
        pass
        
    return {
        "status": "success",
        "text": detected_text,
        "confidence": confidence
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
