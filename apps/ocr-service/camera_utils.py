"""
Camera utility to detect and open USB and built-in cameras safely on Windows.
Always prioritizes external USB camera (Index 1).
"""
import cv2

def get_available_cameras(max_tested: int = 5):
    """
    Test available camera indexes and return list of opened indexes.
    """
    available = []
    for idx in range(max_tested):
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if cap.isOpened():
            ret, _ = cap.read()
            if ret:
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                available.append({
                    "index": idx,
                    "resolution": f"{w}x{h}",
                    "type": "USB / External Camera" if idx >= 1 else "Default / Laptop Camera"
                })
            cap.release()
    return available

def open_usb_camera(preferred_index: int = 1, width: int = 1280, height: int = 720, fps: int = 30):
    """
    Explicitly prioritizes the USB camera (Index 1 by default).
    If preferred_index is specified, tries that first.
    Otherwise attempts: [1, 2, 0].
    """
    target = preferred_index if preferred_index is not None else 1
    
    # Priority order: target first, then index 1 (USB), index 2, and finally 0 (laptop)
    candidates = [target]
    for c in [1, 2, 0]:
        if c not in candidates:
            candidates.append(c)

    cap = None
    chosen_idx = None

    for idx in candidates:
        cam_desc = "USB / External Camera" if idx >= 1 else "Laptop Camera"
        print(f"[Camera] Trying Camera Index {idx} ({cam_desc})...")
        
        # Try DirectShow first on Windows
        c = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        c.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'M', *'J', *'P', *'G'))
        c.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        c.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        c.set(cv2.CAP_PROP_FPS, fps)
        c.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if not c.isOpened():
            # Fallback to default backend
            c = cv2.VideoCapture(idx)
            c.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'M', *'J', *'P', *'G'))
            c.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            c.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
            c.set(cv2.CAP_PROP_FPS, fps)
            c.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if c.isOpened():
            # Test reading a frame to verify it is responsive
            ret, test_frame = c.read()
            if ret and test_frame is not None:
                cap = c
                chosen_idx = idx
                actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                print(f"[Camera SUCCESS] Active: Camera Index {chosen_idx} [{cam_desc}] ({actual_w}x{actual_h})")
                
                # Attempt to enable hardware autofocus if supported
                try:
                    c.set(cv2.CAP_PROP_AUTOFOCUS, 1)
                    af_status = c.get(cv2.CAP_PROP_AUTOFOCUS)
                    print(f"[Camera] Hardware Autofocus enabled: {af_status == 1.0}")
                except Exception as ex:
                    print(f"[Camera] Could not set autofocus: {ex}")
                
                break
            else:
                c.release()

    if cap is None:
        raise RuntimeError("No camera could be opened. Please verify your USB camera is connected.")

    return cap, chosen_idx

def set_camera_autofocus(cap, enabled: bool) -> bool:
    """Enable (1) or disable (0) camera hardware autofocus."""
    if not cap or not cap.isOpened():
        return False
    val = 1 if enabled else 0
    return bool(cap.set(cv2.CAP_PROP_AUTOFOCUS, val))

def set_camera_focus(cap, focus_value: float) -> bool:
    """Set manual focus value. Disables autofocus first so manual focus takes effect."""
    if not cap or not cap.isOpened():
        return False
    cap.set(cv2.CAP_PROP_AUTOFOCUS, 0)
    return bool(cap.set(cv2.CAP_PROP_FOCUS, float(focus_value)))

def get_camera_focus_info(cap) -> dict:
    """Retrieve current autofocus state and focus distance."""
    if not cap or not cap.isOpened():
        return {"autofocus": None, "focus": None}
    try:
        af = cap.get(cv2.CAP_PROP_AUTOFOCUS)
        f = cap.get(cv2.CAP_PROP_FOCUS)
        return {"autofocus": bool(af == 1.0), "focus": float(f) if f >= 0 else None}
    except Exception:
        return {"autofocus": None, "focus": None}

def open_camera_settings_dialog(cap) -> bool:
    """Open the native Windows DirectShow Camera Control properties window."""
    if not cap or not cap.isOpened():
        return False
    try:
        return bool(cap.set(cv2.CAP_PROP_SETTINGS, 1))
    except Exception:
        return False
