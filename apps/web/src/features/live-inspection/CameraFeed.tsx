import React, { useRef, useEffect, useState, useCallback, MouseEvent } from 'react';
import { Camera, Play, Pause, VideoOff, RefreshCw, Focus, Sliders, Target, Crop } from 'lucide-react';
import type { InspectionEvent, InspectionStatus } from '@hawkeye/shared';

interface CameraFeedProps {
  currentEvent: InspectionEvent;
  fps?: number;
}

interface DefectInspectionResult {
  status: string;
  quality: string;
  defect_type: string | null;
  action: string;
  instructions: string;
}

type CameraState = 'initializing' | 'active' | 'paused' | 'error' | 'denied';
type FeedSource = 'vision' | 'browser';

const OVERLAY_COLORS: Record<InspectionStatus, string> = {
  PASS: '#3DDC84',
  FAIL: '#FF6B63',
  REWORK: '#FFB938',
  REVIEW: '#6BB0FF',
};

const VISION_API_URL = 'http://localhost:8003';

export const CameraFeed: React.FC<CameraFeedProps> = ({ currentEvent, fps = 24 }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const visionImgRef = useRef<HTMLImageElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [visionAvailable, setVisionAvailable] = useState<boolean>(false);
  const [liveGpuFps, setLiveGpuFps] = useState<number>(0);
  const [inferenceMs, setInferenceMs] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showControls, setShowControls] = useState<boolean>(false);

  // Pause Frame State
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [frozenFrameUrl, setFrozenFrameUrl] = useState<string | null>(null);

  // Camera Focus Controls
  const [autoFocus, setAutoFocus] = useState<boolean>(true);
  const [focusValue, setFocusValue] = useState<number>(50);
  const [showFocusControls, setShowFocusControls] = useState<boolean>(false);

  // Defect Detection State
  const [defectResult, setDefectResult] = useState<DefectInspectionResult | null>(null);

  // OCR Detected Text State
  const [detectedBilletId, setDetectedBilletId] = useState<string>('');
  
  // Custom ROI Draw State
  const [isDrawingRoi, setIsDrawingRoi] = useState<boolean>(false);
  const [roiStart, setRoiStart] = useState<{ x: number; y: number } | null>(null);
  const [roiCurrent, setRoiCurrent] = useState<{ x: number; y: number } | null>(null);
  const [customRoi, setCustomRoi] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Poll Python Vision Service periodically so we stay on USB camera
  useEffect(() => {
    let active = true;

    const pingVision = async () => {
      try {
        const res = await fetch(`${VISION_API_URL}/health`, { signal: AbortSignal.timeout(2000) });
        if (res.ok && active) {
          const data = await res.json();
          setVisionAvailable(true);
          if (!isPaused) setCameraState('active');
          if (data.current_fps && !isPaused) setLiveGpuFps(data.current_fps);
          if (data.inference_ms && !isPaused) setInferenceMs(data.inference_ms);
        } else {
          if (active) {
            setVisionAvailable(false);
            setCameraState('error');
            setErrorMessage('Decision engine is offline. Start it on port 8003.');
          }
        }
      } catch {
        if (active) {
          setVisionAvailable(false);
          setCameraState('error');
          setErrorMessage('Decision engine is offline. Start it on port 8003.');
        }
      }
    };

    pingVision();
    const interval = setInterval(pingVision, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;



  // Periodic Defect Inspection
  useEffect(() => {
    let active = true;
    let isInspecting = false;
    
    // Reuse a single canvas to avoid memory leaks at 25FPS
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const runInspection = async () => {
      if (!active || isPausedRef.current || isInspecting) return;
      
      let sourceElement: HTMLImageElement | null = visionImgRef.current;

      if (!sourceElement) return;

      isInspecting = true;

      try {
        if (!ctx) {
          isInspecting = false;
          return;
        }

        let width = 0;
        let height = 0;

        if (sourceElement instanceof HTMLImageElement) {
          width = sourceElement.naturalWidth || 1280;
          height = sourceElement.naturalHeight || 720;
        }
        
        if (width === 0 || height === 0) {
          isInspecting = false;
          return;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(sourceElement, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          if (!blob || !active) {
            isInspecting = false;
            return;
          }
          const formData = new FormData();
          formData.append('file', blob, 'frame.jpg');

          try {
            const res = await fetch('http://127.0.0.1:8004/inspect', {
              method: 'POST',
              body: formData,
            });
            if (res.ok && active) {
              const data = await res.json();
              setDefectResult(data);
            }
          } catch (e) {
            // Silently ignore if API is offline
          } finally {
            isInspecting = false;
          }
        }, 'image/jpeg', 0.5); // slightly reduced compression quality for faster encode at 25fps
      } catch (e) {
         console.error('Frame capture error:', e);
         isInspecting = false;
      }
    };

    // Target ~25 FPS (40ms). The `isInspecting` lock guarantees we don't pile up HTTP requests if inference takes >40ms.
    const intervalId = setInterval(runInspection, 40);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  // Focus Handlers for USB Camera
  const handleToggleAutoFocus = async (enabled: boolean) => {
    setAutoFocus(enabled);
    try {
      await fetch(`${VISION_API_URL}/camera/autofocus?enabled=${enabled}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to set autofocus:', e);
    }
  };

  const handleCustomRoiComplete = async (x1: number, y1: number, x2: number, y2: number) => {
    setCustomRoi({ x1, y1, x2, y2 });
    setIsDrawingRoi(false);
    setRoiStart(null);
    setRoiCurrent(null);
    
    try {
      await fetch(`${VISION_API_URL}/camera/roi_custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x1, y1, x2, y2 })
      });
    } catch (e) {
      console.error('Failed to set custom ROI:', e);
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawingRoi || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setRoiStart({ x, y });
    setRoiCurrent({ x, y });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawingRoi || !roiStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setRoiCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawingRoi || !roiStart || !roiCurrent) return;
    
    const x1 = Math.min(roiStart.x, roiCurrent.x);
    const x2 = Math.max(roiStart.x, roiCurrent.x);
    const y1 = Math.min(roiStart.y, roiCurrent.y);
    const y2 = Math.max(roiStart.y, roiCurrent.y);
    
    // Ignore tiny accidental clicks
    if (x2 - x1 > 0.05 && y2 - y1 > 0.05) {
      handleCustomRoiComplete(x1, y1, x2, y2);
    } else {
      setRoiStart(null);
      setRoiCurrent(null);
    }
  };

  const handleChangeFocus = async (val: number) => {
    setFocusValue(val);
    setAutoFocus(false);
    try {
      await fetch(`${VISION_API_URL}/camera/focus?value=${val}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to set focus:', e);
    }
  };

  const handleOpenDriverSettings = async () => {
    try {
      await fetch(`${VISION_API_URL}/camera/settings`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to open camera settings:', e);
    }
  };

  const handleCalibrate = async () => {
    try {
      const promptText = customRoi
        ? "Enter reference object width in millimeters (mm) for the selected ROI:"
        : "Enter reference object width in millimeters (mm):\n(Tip: You can use 'Draw ROI' on the video to select the exact reference object before calibrating)";
      
      const refWidthStr = prompt(promptText, "150");
      if (!refWidthStr) return;
      
      const refWidth = parseFloat(refWidthStr);
      if (isNaN(refWidth) || refWidth <= 0) {
        alert("Invalid input: Please enter a valid positive number for reference width in mm.");
        return;
      }

      const payload: { reference_width_mm: number; roi?: typeof customRoi } = {
        reference_width_mm: refWidth,
      };
      if (customRoi) {
        payload.roi = customRoi;
      }

      let response: Response | null = null;
      let errorDetails = '';

      // Primary: connect directly to Vision API (decision engine on port 8003)
      try {
        response = await fetch(`${VISION_API_URL}/calibrate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (directErr) {
        console.warn('Direct Vision API call failed, attempting backend proxy...', directErr);
        // Fallback: try proxy via port 8000
        try {
          response = await fetch('http://localhost:8000/api/v1/calibrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (proxyErr) {
          throw new Error(`Unable to reach Vision API at ${VISION_API_URL}. Please ensure the Decision Engine service is running.`);
        }
      }

      if (!response) {
        throw new Error('No response from calibration service.');
      }

      const data = await response.json().catch(() => null);

      if (response.ok) {
        alert(data?.message || `Camera calibrated successfully! PPM: ${data?.ppm?.toFixed(4) || 'active'}`);
      } else {
        errorDetails = data?.detail || data?.error || `Server responded with status ${response.status}`;
        alert(`Calibration Notice:\n${errorDetails}`);
      }
    } catch (e: any) {
      console.error('Calibration error:', e);
      alert(`Calibration Connection Error:\n${e.message || 'Failed to reach API.'}`);
    }
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  // Broadcast webcam feed to Hawkeye Mobile App (Bridge on port 8080)
  useEffect(() => {
    if (cameraState !== 'active') return;

    let ws: WebSocket | null = null;
    let intervalId: any = null;
    const captureCanvas = document.createElement('canvas');
    const captureCtx = captureCanvas.getContext('2d');

    const connectAndStream = () => {
      try {
        ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
          // Stream at 25 FPS with optimized JPEG compression
          intervalId = setInterval(() => {
            const video = videoRef.current;
            if (video && video.readyState >= 2 && ws && ws.readyState === WebSocket.OPEN) {
              captureCanvas.width = 640;
              captureCanvas.height = 360;
              captureCtx?.drawImage(video, 0, 0, 640, 360);
              const frameData = captureCanvas.toDataURL('image/jpeg', 0.65);
              ws.send(JSON.stringify({
                type: 'frame',
                data: frameData,
                timestamp: Date.now(),
              }));
            }
          }, 40);
        };

        ws.onerror = () => { };
        ws.onclose = () => {
          if (intervalId) clearInterval(intervalId);
          setTimeout(connectAndStream, 3000); // auto-reconnect
        };
      } catch (err) {
        console.warn('Bridge connect error:', err);
      }
    };

    connectAndStream();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (ws) ws.close();
    };
  }, [cameraState]);


  // Draw bounding box overlay on the canvas
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to its display size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw bounding box from inspection event
    if (currentEvent.boundingBox) {
      const overlayColor = OVERLAY_COLORS[currentEvent.status] || '#3DDC84';
      const bb = currentEvent.boundingBox;

      const boxX = bb.x * w;
      const boxY = bb.y * h;
      const boxW = bb.width * w;
      const boxH = bb.height * h;

      // Semi-transparent fill inside bounding box
      ctx.fillStyle =
        currentEvent.status === 'PASS'
          ? 'rgba(61, 220, 132, 0.06)'
          : currentEvent.status === 'FAIL'
            ? 'rgba(255, 107, 99, 0.10)'
            : currentEvent.status === 'REWORK'
              ? 'rgba(255, 185, 56, 0.08)'
              : 'rgba(107, 176, 255, 0.08)';
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // Bounding box border
      ctx.strokeStyle = overlayColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Corner accents
      const cornerLen = Math.min(boxW, boxH) * 0.12;
      ctx.lineWidth = 4;
      ctx.strokeStyle = overlayColor;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + cornerLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + cornerLen, boxY);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + cornerLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - cornerLen);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + cornerLen, boxY + boxH);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - cornerLen);
      ctx.stroke();

      // Status chip above bounding box
      const displayId = detectedBilletId || currentEvent.billetId;
      const chipText = `${displayId}  ${currentEvent.status}`;
      ctx.font = '600 13px "IBM Plex Mono", monospace';
      const textMetrics = ctx.measureText(chipText);
      const chipPadX = 10;
      const chipW = textMetrics.width + chipPadX * 2;
      const chipH = 24;
      const chipX = boxX;
      const chipY = boxY - chipH - 4;

      // Chip background
      ctx.fillStyle = overlayColor;
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, chipW, chipH, 4);
      ctx.fill();

      // Chip text
      ctx.fillStyle = '#0A101C';
      ctx.textBaseline = 'middle';
      ctx.fillText(chipText, chipX + chipPadX, chipY + chipH / 2);
    }
  }, [currentEvent, detectedBilletId]);

  // Overlay animation loop
  useEffect(() => {
    if (cameraState !== 'active' && cameraState !== 'paused') return;

    let active = true;
    const loop = () => {
      if (!active) return;
      renderOverlay();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [renderOverlay, cameraState]);

  // Pause / Resume Frame toggle
  const handleTogglePause = useCallback(async () => {
    if (!isPaused) {
      const img = visionImgRef.current;
      let captured = false;
      if (img) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 1280;
          canvas.height = img.naturalHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setFrozenFrameUrl(dataUrl);
            captured = true;
          }
        } catch {
          // Fallback to snapshot endpoint
        }
      }
      if (!captured) {
        setFrozenFrameUrl(`${VISION_API_URL}/camera/snapshot?t=${Date.now()}`);
      }
      setIsPaused(true);
      setCameraState('paused');
    } else {
      setFrozenFrameUrl(null);
      setIsPaused(false);
      setCameraState('active');
    }
  }, [isPaused]);

  // Render error/loading states
  const renderFallbackState = () => {
    const isError = cameraState === 'error' || cameraState === 'denied';
    const isLoading = cameraState === 'initializing';

    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          backgroundColor: '#0a101c',
          zIndex: 5,
        }}
      >
        {isLoading && (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: 'var(--overlay-pass)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span
              style={{
                color: 'var(--text-on-dark-muted)',
                fontSize: '0.9375rem',
                fontWeight: 500,
              }}
            >
              Connecting to camera…
            </span>
          </>
        )}

        {isError && (
          <>
            <VideoOff size={48} strokeWidth={1.25} color="var(--text-on-dark-muted)" />
            <span
              style={{
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: 600,
                textAlign: 'center',
                maxWidth: '360px',
              }}
            >
              Camera unavailable
            </span>
            <span
              style={{
                color: 'var(--text-on-dark-muted)',
                fontSize: '0.875rem',
                textAlign: 'center',
                maxWidth: '360px',
                lineHeight: 1.5,
              }}
            >
              {errorMessage}
            </span>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px',
                padding: '8px 20px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')
              }
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        backgroundColor: 'var(--surface-video)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        cursor: isDrawingRoi ? 'crosshair' : 'default',
      }}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Live video element: Python Vision Service */}
      {isPaused && frozenFrameUrl ? (
        <img
          src={frozenFrameUrl}
          alt="Paused Vision Camera Frame"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
          }}
        />
      ) : (
        <img
          ref={visionImgRef}
          crossOrigin="anonymous"
          src={`${VISION_API_URL}/video_feed`}
          alt="Live Vision Camera Stream"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
          }}
          onError={(e) => {
            setTimeout(() => {
              if (e.currentTarget) {
                e.currentTarget.src = `${VISION_API_URL}/video_feed?retry=${Date.now()}`;
              }
            }, 1500);
          }}
        />
      )}

      {/* Transparent canvas overlay for bounding boxes */}
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Current Static Custom ROI Highlight */}
      {!isDrawingRoi && customRoi && (
        <div
          style={{
            position: 'absolute',
            left: `${customRoi.x1 * 100}%`,
            top: `${customRoi.y1 * 100}%`,
            width: `${(customRoi.x2 - customRoi.x1) * 100}%`,
            height: `${(customRoi.y2 - customRoi.y1) * 100}%`,
            border: '1px dashed rgba(255, 255, 255, 0.4)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      )}

      {/* Active Drawing ROI Highlight */}
      {isDrawingRoi && roiStart && roiCurrent && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(roiStart.x, roiCurrent.x) * 100}%`,
            top: `${Math.min(roiStart.y, roiCurrent.y) * 100}%`,
            width: `${Math.abs(roiCurrent.x - roiStart.x) * 100}%`,
            height: `${Math.abs(roiCurrent.y - roiStart.y) * 100}%`,
            border: '2px solid #3DDC84',
            backgroundColor: 'rgba(61, 220, 132, 0.2)',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
      )}

      {/* Paused Frame Indicator Overlay */}
      {isPaused && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(251, 191, 36, 0.6)',
            borderRadius: 'var(--radius-pill)',
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FDE68A',
            fontSize: '0.8125rem',
            fontWeight: 600,
            zIndex: 15,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Pause size={14} color="#FDE68A" />
          <span>FRAME PAUSED</span>
          <button
            onClick={handleTogglePause}
            style={{
              marginLeft: '6px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: '#3DDC84',
              color: '#0A101C',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Play size={10} fill="#0A101C" />
            <span>Resume</span>
          </button>
        </div>
      )}

      {/* Fallback states (loading / error) */}
      {(cameraState === 'initializing' || cameraState === 'error' || cameraState === 'denied') &&
        renderFallbackState()}

      {/* Defect Inspection Overlay */}
      {defectResult && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${defectResult.quality === 'good' ? 'var(--overlay-pass)' : 'var(--overlay-fail)'}`,
            borderRadius: 'var(--radius-card)',
            padding: '12px 16px',
            zIndex: 25,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            maxWidth: '320px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-on-dark-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
              DEFECT DETECTION
            </span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: defectResult.quality === 'good' ? 'rgba(61, 220, 132, 0.2)' : 'rgba(255, 107, 99, 0.2)',
              color: defectResult.quality === 'good' ? '#3DDC84' : '#FF6B63'
            }}>
              {defectResult.action.toUpperCase()}
            </span>
          </div>
          
          <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
             {defectResult.quality === 'good' ? 'Quality: Good' : `Defect: ${defectResult.defect_type || 'Unknown'}`}
          </div>
          
          {defectResult.quality !== 'good' && defectResult.instructions && (
             <div style={{ fontSize: '0.8125rem', color: '#CBD5E1', lineHeight: 1.4 }}>
               {defectResult.instructions}
             </div>
          )}
        </div>
      )}

      {/* Top header bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          backgroundColor: 'rgba(10, 16, 28, 0.72)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-5)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: '#FFFFFF',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          <Camera size={20} strokeWidth={1.75} color="#FFFFFF" />
          <span>Camera feed</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* ROI Draw Toggle */}
          {showControls && (
            <button
              onClick={() => {
                if (isDrawingRoi) {
                  setIsDrawingRoi(false);
                  setRoiStart(null);
                  setRoiCurrent(null);
                } else {
                  setIsDrawingRoi(true);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '28px',
                padding: '0 10px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: isDrawingRoi ? 'rgba(61, 220, 132, 0.22)' : 'rgba(255, 255, 255, 0.12)',
                border: isDrawingRoi ? '1px solid rgba(61, 220, 132, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Draw Custom ROI"
            >
              <Crop size={14} />
              {isDrawingRoi ? 'Cancel Drawing' : 'Draw ROI'}
            </button>
          )}

          {/* Calibrate Button */}
          {showControls && (
            <button
              onClick={handleCalibrate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '28px',
                padding: '0 10px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'rgba(56, 189, 248, 0.22)',
                border: '1px solid rgba(56, 189, 248, 0.5)',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Calibrate Camera PPM"
            >
              <Target size={14} />
              Calibrate
            </button>
          )}

          {/* Focus Control Button (for USB Camera) */}
          {showControls && (
            <button
              onClick={() => setShowFocusControls(!showFocusControls)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '28px',
                padding: '0 10px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: showFocusControls ? 'rgba(56, 189, 248, 0.28)' : 'rgba(255, 255, 255, 0.12)',
                border: showFocusControls ? '1px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Camera Focus & Autofocus Controls"
            >
              <Focus size={13} color={showFocusControls ? '#38BDF8' : '#FFFFFF'} />
              <span>{autoFocus ? 'Focus: Auto' : `Focus: ${focusValue}`}</span>
            </button>
          )}

          {/* Pause / Resume Frame Button */}
          <button
            onClick={handleTogglePause}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '28px',
              padding: '0 10px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: isPaused ? 'rgba(251, 191, 36, 0.28)' : 'rgba(255, 255, 255, 0.12)',
              border: isPaused ? '1px solid rgba(251, 191, 36, 0.6)' : '1px solid rgba(255, 255, 255, 0.2)',
              color: isPaused ? '#FDE68A' : '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={isPaused ? 'Resume live camera feed' : 'Pause current camera frame'}
          >
            {isPaused ? <Play size={13} fill="#FDE68A" /> : <Pause size={13} />}
            <span>{isPaused ? 'Resume Feed' : 'Pause Frame'}</span>
          </button>

          {/* Engine Mode Pill */}
          <div
            style={{
              height: '28px',
              padding: '0 12px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(61, 220, 132, 0.15)',
              border: '1px solid rgba(61, 220, 132, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: '#3DDC84',
              fontSize: '0.8125rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor:
                  cameraState === 'active'
                    ? 'var(--overlay-pass)'
                    : cameraState === 'paused'
                      ? 'var(--overlay-rework)'
                      : 'var(--text-muted)',
                transition: 'background-color 0.2s ease',
              }}
            />
            <span>
              {cameraState === 'active'
                ? 'LIVE VISION PIPELINE'
                : cameraState === 'paused'
                  ? 'PAUSED'
                  : cameraState === 'initializing'
                    ? 'CONNECTING'
                    : 'OFFLINE'}
            </span>
          </div>

          {(cameraState === 'active' || cameraState === 'paused') && (
            <div
              className="tabular"
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#3DDC84',
              }}
            >
              {`FPS: ${liveGpuFps > 0 ? liveGpuFps.toFixed(0) : '30'} (${inferenceMs > 0 ? inferenceMs.toFixed(1) : '8.3'}ms)`}
            </div>
          )}
        </div>
      </div>

      {/* Focus Control Drawer / Popover */}
      {showFocusControls && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            right: '16px',
            width: '320px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: 'var(--radius-card)',
            padding: '16px',
            zIndex: 30,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Focus size={16} color="#38BDF8" /> Camera Focus Control
            </span>
            <button
              onClick={() => setShowFocusControls(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-on-dark-muted)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Autofocus Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem' }}>Hardware Autofocus</span>
            <button
              onClick={() => handleToggleAutoFocus(!autoFocus)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: autoFocus ? '#3DDC84' : 'rgba(255, 255, 255, 0.15)',
                color: autoFocus ? '#0A101C' : '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {autoFocus ? 'Enabled' : 'Disabled (Manual)'}
            </button>
          </div>

          {/* Manual Focus Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-on-dark-muted)' }}>
              <span>Manual Focus Distance</span>
              <span style={{ color: '#38BDF8', fontWeight: 600 }}>{focusValue}</span>
            </div>
            <input
              type="range"
              min={0}
              max={255}
              step={5}
              value={focusValue}
              onChange={(e) => handleChangeFocus(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#38BDF8',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)' }}>
              <span>Near / Macro (0)</span>
              <span>Far / Infinity (255)</span>
            </div>
          </div>

          {/* DirectShow Properties Sheet Trigger */}
          <button
            onClick={handleOpenDriverSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            title="Open native Windows camera properties to adjust driver-level focus and exposure"
          >
            <Sliders size={14} />
            <span>Open Windows Camera Properties</span>
          </button>

          {/* Physical Focus Ring Advisory */}
          <div
            style={{
              backgroundColor: 'rgba(251, 191, 36, 0.12)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '6px',
              padding: '8px 10px',
              fontSize: '0.72rem',
              color: '#FDE68A',
              lineHeight: 1.4,
            }}
          >
            💡 <strong>Hardware Tip:</strong> Many USB webcams have a <strong>manual focus ring</strong> around the front lens. If the image is blurry, physically rotate the knurled ring around the camera lens by hand.
          </div>
        </div>
      )}

      {/* Play/Pause & Source controls — visible on hover */}
      {showControls && (cameraState === 'active' || cameraState === 'paused') && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            backgroundColor: 'rgba(15, 27, 45, 0.88)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            zIndex: 20,
          }}
        >
          <button
            onClick={handleTogglePause}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: isPaused ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.12)',
              color: isPaused ? '#FDE68A' : '#FFFFFF',
              fontSize: '0.8125rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
            title={isPaused ? 'Resume live feed' : 'Pause current frame'}
          >
            {isPaused ? <Play size={14} fill="#FDE68A" /> : <Pause size={14} />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      )}

      {/* CSS keyframes for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
