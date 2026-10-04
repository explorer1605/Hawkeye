import cv2
import numpy as np
from ultralytics import YOLO

class DimensionDetector:
    def __init__(self, model_path="yolo11n.pt"):
        # Load the YOLO11 Nano model. It will auto-download if not present.
        print(f"Loading YOLO model from {model_path}...")
        self.model = YOLO(model_path)
        
        # Pixels Per Metric (e.g., pixels per mm). 
        # Default is 0 (uncalibrated).
        self.ppm = 0.0

    def calibrate(self, frame: np.ndarray, reference_width_mm: float, roi: dict = None) -> tuple[bool, str]:
        """
        Calibrates the system using:
        1. Custom ROI if provided ({x1, y1, x2, y2})
        2. YOLO detection (largest detected object, conf>=0.15)
        3. Contour edge detection (largest prominent object in view)
        """
        if reference_width_mm <= 0:
            return False, "Reference width must be greater than 0 mm."

        h_frame, w_frame = frame.shape[:2]

        # 1. Custom ROI provided
        if roi and all(k in roi for k in ("x1", "y1", "x2", "y2")):
            try:
                x1, y1, x2, y2 = float(roi["x1"]), float(roi["y1"]), float(roi["x2"]), float(roi["y2"])
                if max(x1, x2) <= 1.0: # Normalized coords (0.0 - 1.0)
                    pixel_width = abs(x2 - x1) * w_frame
                else:
                    pixel_width = abs(x2 - x1)

                if pixel_width >= 10:
                    self.ppm = pixel_width / reference_width_mm
                    msg = f"Calibrated successfully using custom ROI! PPM: {self.ppm:.4f} px/mm ({pixel_width:.1f}px = {reference_width_mm}mm)"
                    print(msg)
                    return True, msg
            except Exception as e:
                print(f"Error applying ROI calibration: {e}")

        # 2. YOLO Detection (conf=0.15 for higher sensitivity)
        largest_box = None
        max_area = 0
        try:
            results = self.model(frame, conf=0.15, verbose=False)
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    w = x2 - x1
                    h = y2 - y1
                    area = w * h
                    if area > max_area:
                        max_area = area
                        largest_box = (w, h)
        except Exception as e:
            print(f"YOLO calibration error: {e}")

        if largest_box is not None:
            pixel_width, _ = largest_box
            self.ppm = pixel_width / reference_width_mm
            msg = f"Calibrated successfully using detected object! PPM: {self.ppm:.4f} px/mm"
            print(msg)
            return True, msg

        # 3. OpenCV Contour Detection (Fallback for billets/cards/plates not in COCO)
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            frame_area = h_frame * w_frame

            _, thresh_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            thresh_inv = cv2.bitwise_not(thresh_otsu)
            edges = cv2.Canny(blurred, 30, 120)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            edges = cv2.dilate(edges, kernel, iterations=1)

            best_box = None
            max_cnt_area = 0

            for thresh in [thresh_otsu, thresh_inv, edges]:
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                for cnt in contours:
                    area = cv2.contourArea(cnt)
                    # Filter: contour must be at least 0.5% and at most 95% of the frame
                    if 0.005 * frame_area < area < 0.95 * frame_area:
                        x, y, w, h = cv2.boundingRect(cnt)
                        if w > 20 and h > 20 and area > max_cnt_area:
                            max_cnt_area = area
                            best_box = (w, h)

            if best_box is not None:
                pixel_width, _ = best_box
                self.ppm = pixel_width / reference_width_mm
                msg = f"Calibrated successfully using prominent contour! PPM: {self.ppm:.4f} px/mm"
                print(msg)
                return True, msg
        except Exception as e:
            print(f"Contour calibration error: {e}")

        return False, "No distinct reference object detected in frame. Tip: Use 'Draw ROI' on the video to select the reference object, then click Calibrate."

    def process_frame(self, frame: np.ndarray):
        """
        Runs inference and annotates the frame with dimensions.
        Returns the annotated frame and a list of detections.
        """
        results = self.model(frame, verbose=False)
        annotated_frame = frame.copy()
        
        detections = []
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Bounding box coordinates
                x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                
                # Class name and confidence
                cls_id = int(box.cls[0].cpu().numpy())
                conf = float(box.conf[0].cpu().numpy())
                class_name = result.names[cls_id]
                
                pixel_width = x2 - x1
                pixel_height = y2 - y1
                
                detection_info = {
                    "class": class_name,
                    "confidence": conf,
                    "pixel_width": pixel_width,
                    "pixel_height": pixel_height,
                    "width_mm": None,
                    "height_mm": None
                }
                
                # Draw the bounding box
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                
                # Label text
                label = f"{class_name} {conf:.2f}"
                
                if self.ppm > 0:
                    # If calibrated, calculate real-world dimensions
                    width_mm = pixel_width / self.ppm
                    height_mm = pixel_height / self.ppm
                    
                    detection_info["width_mm"] = width_mm
                    detection_info["height_mm"] = height_mm
                    
                    label += f" | {width_mm:.1f}x{height_mm:.1f}mm"
                
                detections.append(detection_info)
                
                # Draw label background and text
                (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
                cv2.rectangle(annotated_frame, (x1, y1 - 20), (x1 + w, y1), (0, 255, 0), -1)
                cv2.putText(annotated_frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
                
        # Draw calibration status on the top left
        status_color = (0, 255, 0) if self.ppm > 0 else (0, 0, 255)
        status_text = f"PPM: {self.ppm:.2f}" if self.ppm > 0 else "UNCALIBRATED"
        cv2.putText(annotated_frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
        
        return annotated_frame, detections
