import os
import json
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

app = FastAPI(title="Defect Detection Service")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ONNX_DIR = os.path.join(BASE_DIR, "onnx")

# Load meta.json
try:
    with open(os.path.join(ONNX_DIR, "meta.json"), "r") as f:
        meta = json.load(f)
except Exception as e:
    print(f"Failed to load meta.json: {e}")
    meta = {}

# Initialize ONNX sessions
try:
    goodbad_sess = ort.InferenceSession(os.path.join(ONNX_DIR, "goodbad_cls.onnx"))
    defect_type_sess = ort.InferenceSession(os.path.join(ONNX_DIR, "defect_type_cls.onnx"))
except Exception as e:
    print(f"Failed to load ONNX models: {e}")

def preprocess_image(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize((224, 224))
    img_array = np.array(image).astype(np.float32) / 255.0
    # HWC to CHW
    img_array = np.transpose(img_array, (2, 0, 1))
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

@app.post("/inspect")
async def inspect_billet(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    image_bytes = await file.read()
    
    try:
        input_tensor = preprocess_image(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image preprocessing failed: {e}")

    # Stage 1: Good vs Bad classification
    gb_input_name = goodbad_sess.get_inputs()[0].name
    gb_outputs = goodbad_sess.run(None, {gb_input_name: input_tensor})
    # Assuming the model outputs logits or probabilities in shape (1, 2)
    gb_class_idx = np.argmax(gb_outputs[0], axis=1)[0]
    gb_class_name = meta.get("goodbad", {}).get(str(gb_class_idx), "unknown")

    result = {
        "status": "success",
        "quality": gb_class_name,
        "defect_type": None,
        "action": "Pass",
        "instructions": "No action needed."
    }

    # Stage 2: Defect classification if 'not-good'
    if gb_class_name == meta.get("bad_name", "not-good"):
        dt_input_name = defect_type_sess.get_inputs()[0].name
        dt_outputs = defect_type_sess.run(None, {dt_input_name: input_tensor})
        dt_class_idx = np.argmax(dt_outputs[0], axis=1)[0]
        dt_class_name = meta.get("defect_types", {}).get(str(dt_class_idx), "unknown")
        
        result["defect_type"] = dt_class_name
        
        remedy_info = meta.get("remedy", {}).get(dt_class_name)
        if remedy_info and len(remedy_info) == 2:
            result["action"] = remedy_info[0]
            result["instructions"] = remedy_info[1]
        else:
            result["action"] = "Review"
            result["instructions"] = "Check manually."

    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
