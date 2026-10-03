# Billet Vision

## Overview

Billet Vision is a web-based industrial inspection dashboard for monitoring automated billet quality inspection on manufacturing and steel production lines. It provides a live camera view with real-time billet detection overlays, displays the current billet's identification, dimensions, defect status, and confidence, raises instant alerts for inspection failures, and presents clean inspection analytics with access to the continuously updated inspection log. The application is designed for plant operators, quality-control teams, and production analysts, while initially supporting a simulated camera feed that can later be replaced by a live hardware camera.

## Goals

1. Provide a real-time inspection interface that displays the camera feed, billet bounding boxes, and current inspection results without requiring a physical camera during initial development.

2. Surface inspection failures immediately through clear alerts for detected defects, out-of-tolerance dimensions, OCR issues, or other inspection failures.

3. Provide a clean analytics and inspection-log interface that tracks inspection activity and allows operators to view/export structured Excel inspection records.

## Core User Flow

1. User opens the Billet Vision dashboard and views the current camera/inspection status.

2. A simulated or live camera feed streams into the application.

3. The ML inspection system detects a passing billet and sends its detection data to the webapp.

4. The dashboard displays the billet bounding box and current inspection details such as billet ID, dimensions, defect status, and confidence.

5. If an inspection rule fails, the application immediately creates and displays an alert indicating the reason and inspection status.

6. The inspection result is added to the inspection log.

7. Inspection analytics update with the latest inspection and failure information.

8. The operator can open the Inspection Log to review records and access/export the Excel data.

## Features

### Live Inspection

* Display a simulated video feed initially, with architecture prepared for integration with a live camera or video stream later.

* Render real-time billet bounding boxes and detection information supplied by the ML service.

* Display the current billet's ID, measured dimensions, detected defect, confidence, and PASS/FAIL/REWORK status.

### Alerts & Monitoring

* Show real-time alerts when a defect, dimensional tolerance violation, OCR issue, or inspection failure is detected.

* Maintain a concise list of recent inspection alerts with timestamp, billet ID, issue, and status.

### Inspection Analytics

* Provide clean visual analytics for inspection activity and failure trends.

* Show relevant inspection trends and defect/failure distribution without overcrowding the primary dashboard.

* Support time-range filtering for analytics such as recent inspection activity.

### Inspection Log & Excel

* Maintain a structured inspection record containing timestamp, billet ID, dimensions, detected defects, confidence, and final status.

* Provide an inspection-log view with filtering/search capabilities.

* Provide access to/export of the inspection data in Excel-compatible format.

## Scope

### In Scope

* Responsive web dashboard for billet inspection monitoring.

* Simulated camera/video feed for initial development and demonstration.

* Real-time detection overlay integration through an ML/API interface.

* Current inspection result panel.

* Real-time alert system.

* Inspection analytics dashboard.

* Inspection history/log interface.

* Excel-compatible inspection data export.

* Frontend/backend interfaces required for later ML and camera integration.

### Out of Scope

* Development of the physical camera, conveyor, or industrial inspection hardware.

* Training a complete industrial-grade vision/OCR model entirely within the webapp.

* Direct PLC/SCADA integration and production-line control.

* Fully production-ready industrial deployment, safety certification, or guaranteed ±1% measurement accuracy under all factory conditions.

## Success Criteria

1. A user can open the dashboard and view a simulated inspection feed with billet detections and bounding boxes.

2. A detected billet can display its inspection information, including ID, dimensions, defect status, confidence, and final result.

3. A failed inspection generates a visible alert immediately in the dashboard.

4. Inspection events update the analytics and inspection history without requiring manual refresh.

5. A user can view recorded inspection data and export it in an Excel-compatible format.

6. The frontend can accept the same inspection-event format when the simulated feed is replaced by the ML team's live detection pipeline.
