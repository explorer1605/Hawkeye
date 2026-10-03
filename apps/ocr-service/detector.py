import os
import json
import time
import numpy as np
import cv2
import pyclipper
import onnxruntime as ort

class DBNetTextDetector:
    def __init__(self, model_dir: str):
        config_path = os.path.join(model_dir, "detector_config.json")
        with open(config_path, "r") as f:
            self.config = json.load(f)

        onnx_filename = self.config.get("onnx", "mpsc_text_det.onnx")
        self.onnx_path = os.path.join(model_dir, onnx_filename)

        self.input_size = self.config.get("input_size", 640)
        self.scale = self.config.get("scale", 1.0 / 255.0)
        self.swapRB = self.config.get("swapRB", True)
        self.binary_thresh = self.config.get("binary_threshold", 0.2)
        self.polygon_thresh = self.config.get("polygon_threshold", 0.5)
        self.unclip_ratio = self.config.get("unclip_ratio", 1.2)
        self.max_candidates = self.config.get("max_candidates", 300)

        # Prefer NVIDIA RTX 4050 Laptop GPU (DirectML device_id 1 is 8.7ms vs device_id 0 Intel iGPU 60ms)
        available_providers = ort.get_available_providers()
        providers = []
        if "DmlExecutionProvider" in available_providers:
            providers.append(("DmlExecutionProvider", {"device_id": 1}))
        if "CUDAExecutionProvider" in available_providers:
            providers.append("CUDAExecutionProvider")
        providers.append("CPUExecutionProvider")

        print(f"[DBNet] Initializing ONNX session with providers: {providers}")
        self.session = ort.InferenceSession(self.onnx_path, providers=providers)
        print(f"[DBNet] Active provider: {self.session.get_providers()}")

        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

    def preprocess(self, img_bgr: np.ndarray):
        h, w = img_bgr.shape[:2]
        resized = cv2.resize(img_bgr, (self.input_size, self.input_size))

        if self.swapRB:
            rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        else:
            rgb = resized

        # Normalized float32 [1, 3, H, W]
        img_norm = (rgb.astype(np.float32) * self.scale).transpose(2, 0, 1)
        blob = np.ascontiguousarray(img_norm[np.newaxis, ...], dtype=np.float32)
        scale_x = w / float(self.input_size)
        scale_y = h / float(self.input_size)
        return blob, scale_x, scale_y

    def unclip(self, box, unclip_ratio):
        poly = pyclipper.PyclipperOffset()
        poly.AddPath(box, pyclipper.JT_ROUND, pyclipper.ET_CLOSEDPOLYGON)
        area = cv2.contourArea(box)
        length = cv2.arcLength(box, True)
        if length == 0:
            return None
        distance = area * unclip_ratio / length
        offsetted = poly.Execute(distance)
        return offsetted

    def postprocess(self, pred_prob: np.ndarray, scale_x: float, scale_y: float, orig_w: int, orig_h: int):
        # pred_prob: (640, 640) with values in [0, 1]
        mask = (pred_prob > self.binary_thresh).astype(np.uint8) * 255
        contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

        results = []
        num_contours = min(len(contours), self.max_candidates)

        for i in range(num_contours):
            contour = contours[i]
            if len(contour) < 4:
                continue

            # Calculate contour area
            area = cv2.contourArea(contour)
            if area < 16:  # filter noise
                continue

            # Check polygon score inside contour
            c_mask = np.zeros(pred_prob.shape, dtype=np.uint8)
            cv2.drawContours(c_mask, [contour], -1, 1, -1)
            score = float(pred_prob[c_mask == 1].mean()) if np.any(c_mask == 1) else 0.0

            if score < self.polygon_thresh:
                continue

            # Unclip polygon
            poly = contour.reshape(-1, 2)
            unclipped = self.unclip(poly, self.unclip_ratio)
            if not unclipped or len(unclipped) == 0:
                continue

            expanded_poly = np.array(unclipped[0]).reshape(-1, 1, 2)
            rect = cv2.minAreaRect(expanded_poly)
            box = cv2.boxPoints(rect)  # 4x2 points

            # Scale back to original image size
            box[:, 0] = np.clip(box[:, 0] * scale_x, 0, orig_w)
            box[:, 1] = np.clip(box[:, 1] * scale_y, 0, orig_h)

            x_min = float(box[:, 0].min())
            y_min = float(box[:, 1].min())
            x_max = float(box[:, 0].max())
            y_max = float(box[:, 1].max())

            results.append({
                "box": box.astype(int).tolist(),
                "bbox": {
                    "x": max(0.0, x_min / orig_w),
                    "y": max(0.0, y_min / orig_h),
                    "width": min(1.0, (x_max - x_min) / orig_w),
                    "height": min(1.0, (y_max - y_min) / orig_h),
                },
                "score": round(score, 3)
            })

        return results

    def detect(self, img_bgr: np.ndarray):
        h, w = img_bgr.shape[:2]
        blob, scale_x, scale_y = self.preprocess(img_bgr)
        t0 = time.time()
        outputs = self.session.run([self.output_name], {self.input_name: blob})
        dt = (time.time() - t0) * 1000.0

        pred = outputs[0]
        if pred.ndim == 4:
            pred = pred[0, 0]
        elif pred.ndim == 3:
            pred = pred[0]

        detections = self.postprocess(pred, scale_x, scale_y, w, h)
        return {
            "detections": detections,
            "inference_time_ms": round(dt, 2),
            "fps": round(1000.0 / dt, 1) if dt > 0 else 0
        }
