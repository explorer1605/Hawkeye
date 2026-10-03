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

    def calibrate(self, frame: np.ndarray, reference_width_mm: float) -> bool:
        """
        Calibrates the system using the largest detected object in the frame.
        Assuming the user places a reference object in the center/makes it prominent.
        """
        results = self.model(frame, verbose=False)
        
        largest_box = None
        max_area = 0
        
        # Find the largest bounding box in the frame
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # box.xyxy is [x1, y1, x2, y2]
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                w = x2 - x1
                h = y2 - y1
                area = w * h
                
                if area > max_area:
                    max_area = area
                    largest_box = (w, h)
                    
        if largest_box is None:
            return False # No objects found to calibrate against
            
        pixel_width, pixel_height = largest_box
        
        # Calculate Pixels Per Metric (PPM)
        # Using the width for calibration
        self.ppm = pixel_width / reference_width_mm
        print(f"Calibration successful! PPM set to: {self.ppm:.4f} pixels/mm")
        return True

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
