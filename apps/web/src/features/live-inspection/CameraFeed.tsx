import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Play, Pause, VideoOff, RefreshCw } from 'lucide-react';
import type { InspectionEvent, InspectionStatus } from '@hawkeye/shared';

interface CameraFeedProps {
  currentEvent: InspectionEvent;
  fps?: number;
}

type CameraState = 'initializing' | 'active' | 'paused' | 'error' | 'denied';

const OVERLAY_COLORS: Record<InspectionStatus, string> = {
  PASS: '#3DDC84',
  FAIL: '#FF6B63',
  REWORK: '#FFB938',
  REVIEW: '#6BB0FF',
};

export const CameraFeed: React.FC<CameraFeedProps> = ({ currentEvent, fps = 24 }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showControls, setShowControls] = useState<boolean>(false);

  // Start the webcam
  const startCamera = useCallback(async () => {
    setCameraState('initializing');
    setErrorMessage('');

    try {
      // Stop any existing stream
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

  // Initialize camera on mount
  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [startCamera]);

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

  // Play/Pause toggle
  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    if (cameraState === 'active') {
      video.pause();
      setCameraState('paused');
    } else if (cameraState === 'paused') {
      video.play();
      setCameraState('active');
    }
  }, [cameraState]);

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
              onClick={startCamera}
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
      {/* Live video element */}
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
          <div
            style={{
              height: '24px',
              padding: '0 8px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'rgba(10, 16, 28, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color:
                cameraState === 'active'
                  ? 'var(--overlay-pass)'
                  : cameraState === 'paused'
                    ? 'var(--overlay-rework)'
                    : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
            }}
          >
            {cameraState === 'active'
              ? 'LIVE'
              : cameraState === 'paused'
                ? 'PAUSED'
                : cameraState === 'initializing'
                  ? 'CONNECTING'
                  : 'OFFLINE'}
          </div>

          {(cameraState === 'active' || cameraState === 'paused') && (
            <div
              className="tabular"
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-on-dark-muted)',
              }}
            >
              FPS: {cameraState === 'active' ? fps : 0}
            </div>
          )}
        </div>
      </div>

      {/* Play/Pause controls — visible on hover */}
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
            onClick={handleTogglePlay}
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
            title={cameraState === 'active' ? 'Pause Feed' : 'Resume Feed'}
          >
            {cameraState === 'active' ? <Pause size={14} /> : <Play size={14} />}
            <span>{cameraState === 'active' ? 'Pause' : 'Resume'}</span>
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
