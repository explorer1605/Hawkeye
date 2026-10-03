import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Play, Pause, VideoOff, RefreshCw, Focus, Sliders } from 'lucide-react';
import type { InspectionEvent, InspectionStatus } from '@hawkeye/shared';

interface CameraFeedProps {
  currentEvent: InspectionEvent;
  fps?: number;
}

type CameraState = 'initializing' | 'active' | 'paused' | 'error' | 'denied';
type FeedSource = 'vision' | 'browser';

const OVERLAY_COLORS: Record<InspectionStatus, string> = {
  PASS: '#3DDC84',
  FAIL: '#FF6B63',
  REWORK: '#FFB938',
  REVIEW: '#6BB0FF',
};

const VISION_API_URL = 'http://localhost:8001';
const VISION_WS_URL = 'ws://localhost:8001/ws';

export const CameraFeed: React.FC<CameraFeedProps> = ({ currentEvent, fps = 24 }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const visionImgRef = useRef<HTMLImageElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('active');
  const [feedSource, setFeedSource] = useState<FeedSource>('vision');
  const [visionAvailable, setVisionAvailable] = useState<boolean>(true);
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

  // Poll Python Vision Service periodically so we stay on USB camera
  useEffect(() => {
    let active = true;

    const pingVision = async () => {
      try {
        const res = await fetch(`${VISION_API_URL}/health`, { signal: AbortSignal.timeout(2000) });
        if (res.ok && active) {
          const data = await res.json();
          setVisionAvailable(true);
          setFeedSource('vision');
          if (!isPaused) setCameraState('active');
          if (data.current_fps && !isPaused) setLiveGpuFps(data.current_fps);
          if (data.inference_ms && !isPaused) setInferenceMs(data.inference_ms);

          // Stop browser camera tracks if they were running
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        }
      } catch {
        if (active) setVisionAvailable(false);
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

  // Connect to Python WebSocket for 24+ FPS telemetry
  useEffect(() => {
    if (feedSource !== 'vision') {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const connectWs = () => {
      try {
        const ws = new WebSocket(VISION_WS_URL);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          if (!isMounted || isPausedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            if (data.fps !== undefined) setLiveGpuFps(data.fps);
            if (data.inference_ms !== undefined) setInferenceMs(data.inference_ms);
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          if (isMounted && feedSource === 'vision') {
            setTimeout(connectWs, 2000);
          }
        };
      } catch {
        // Fallback retry
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [feedSource]);

  // Focus Handlers for USB Camera
  const handleToggleAutoFocus = async (enabled: boolean) => {
    setAutoFocus(enabled);
    try {
      await fetch(`${VISION_API_URL}/camera/autofocus?enabled=${enabled}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to set autofocus:', e);
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

  // Start the browser webcam (fallback mode)
  const startBrowserWebcam = useCallback(async () => {
    setFeedSource('browser');
    setCameraState('initializing');
    setErrorMessage('');

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState('active');
      }
    } catch (err: unknown) {
      const error = err as DOMException;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraState('error');
        setErrorMessage('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraState('error');
        setErrorMessage('Camera is in use by another application. Please close it and retry.');
      } else {
        setCameraState('error');
        setErrorMessage(`Camera error: ${error.message || 'Unknown error'}`);
      }
    }
  }, []);

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
      const chipText = `${currentEvent.billetId}  ${currentEvent.status}`;
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
  }, [currentEvent]);

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

  // Pause / Resume Frame toggle (supports both GPU Vision MJPEG and Browser Webcam)
  const handleTogglePause = useCallback(async () => {
    if (!isPaused) {
      if (feedSource === 'vision') {
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
            // In case canvas capture fails, fallback to snapshot endpoint
          }
        }
        if (!captured) {
          setFrozenFrameUrl(`${VISION_API_URL}/camera/snapshot?t=${Date.now()}`);
        }
      } else {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
      setIsPaused(true);
      setCameraState('paused');
    } else {
      if (feedSource === 'vision') {
        setFrozenFrameUrl(null);
      } else {
        if (videoRef.current) {
          await videoRef.current.play();
        }
      }
      setIsPaused(false);
      setCameraState('active');
    }
  }, [isPaused, feedSource]);

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
              onClick={startBrowserWebcam}
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
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        backgroundColor: 'var(--surface-video)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Live video element: Python Vision Service (GPU 24+ FPS) or Browser Webcam */}
      {feedSource === 'vision' ? (
        isPaused && frozenFrameUrl ? (
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
              // Auto retry stream every 1.5 seconds instead of falling back to laptop camera
              setTimeout(() => {
                if (e.currentTarget) {
                  e.currentTarget.src = `${VISION_API_URL}/video_feed?retry=${Date.now()}`;
                }
              }, 1500);
            }}
          />
        )
      ) : (
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
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
          {/* Persistent USB Camera / Webcam Toggle Button */}
          <button
            onClick={() => {
              if (feedSource === 'vision') {
                startBrowserWebcam();
              } else {
                setFeedSource('vision');
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach((track) => track.stop());
                  streamRef.current = null;
                }
                setCameraState('active');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '28px',
              padding: '0 10px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: feedSource === 'vision' ? 'rgba(61, 220, 132, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              border: feedSource === 'vision' ? '1px solid rgba(61, 220, 132, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Switch between USB Camera (GPU Vision) and Browser Webcam"
          >
            <RefreshCw size={12} />
            <span>{feedSource === 'vision' ? 'USB Camera (Active)' : 'Switch to USB Cam'}</span>
          </button>

          {/* Focus Control Button (for USB Camera) */}
          {feedSource === 'vision' && (
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
              backgroundColor: feedSource === 'vision' ? 'rgba(61, 220, 132, 0.15)' : 'rgba(255, 255, 255, 0.1)',
              border: feedSource === 'vision' ? '1px solid rgba(61, 220, 132, 0.35)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: feedSource === 'vision' ? '#3DDC84' : '#FFFFFF',
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
              {feedSource === 'vision'
                ? 'GPU VISION (RTX 4050)'
                : cameraState === 'active'
                  ? 'LIVE WEBCAM'
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
                color: feedSource === 'vision' ? '#3DDC84' : 'var(--text-on-dark-muted)',
              }}
            >
              {feedSource === 'vision'
                ? `FPS: ${liveGpuFps > 0 ? liveGpuFps.toFixed(0) : '30'} (${inferenceMs > 0 ? inferenceMs.toFixed(1) : '8.3'}ms)`
                : `FPS: ${cameraState === 'active' ? fps : 0}`}
            </div>
          )}
        </div>
      </div>

      {/* Focus Control Drawer / Popover */}
      {showFocusControls && feedSource === 'vision' && (
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
          {visionAvailable && (
            <button
              onClick={() => {
                if (feedSource === 'vision') {
                  startBrowserWebcam();
                } else {
                  setFeedSource('vision');
                  if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                  }
                  setCameraState('active');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
              title="Toggle Feed Source"
            >
              <RefreshCw size={13} />
              <span>{feedSource === 'vision' ? 'Switch to Webcam' : 'Switch to GPU Vision'}</span>
            </button>
          )}

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
