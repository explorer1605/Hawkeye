import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Play, Pause, AlertTriangle } from 'lucide-react';
import type { InspectionEvent, InspectionStatus } from '@hawkeye/shared';
import { simulationEngine } from '@/lib/realtime/simulation-engine';

interface CameraFeedProps {
  currentEvent: InspectionEvent;
  fps?: number;
}

const OVERLAY_COLORS: Record<InspectionStatus, string> = {
  PASS: '#3DDC84',
  FAIL: '#FF6B63',
  REWORK: '#FFB938',
  REVIEW: '#6BB0FF',
};

export const CameraFeed: React.FC<CameraFeedProps> = ({ currentEvent, fps = 24 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(false);

  const animRef = useRef<number | null>(null);
  const rollerOffsetRef = useRef<number>(0);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    if (isPlaying) {
      rollerOffsetRef.current = (rollerOffsetRef.current + 1.2) % 40;
    }

    ctx.fillStyle = '#0a101c';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#111928';
    ctx.fillRect(0, 0, w, h * 0.4);

    ctx.fillStyle = '#b8860b';
    ctx.fillRect(0, h * 0.28, w, h * 0.04);
    ctx.fillStyle = '#8b6508';
    ctx.fillRect(0, h * 0.32, w, h * 0.015);

    const bedTop = h * 0.38;
    const bedHeight = h * 0.58;

    ctx.fillStyle = '#161c28';
    ctx.fillRect(0, bedTop, w, bedHeight);

    const rollerSpacing = w * 0.085;
    const rollerY = bedTop + h * 0.35;
    const rollerRadius = h * 0.08;

    for (let x = -rollerSpacing; x < w + rollerSpacing; x += rollerSpacing) {
      const rx = x + (rollerOffsetRef.current / 40) * rollerSpacing;

      ctx.fillStyle = '#0d131f';
      ctx.beginPath();
      ctx.ellipse(rx, rollerY + 12, rollerSpacing * 0.42, rollerRadius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      const rollerGrad = ctx.createLinearGradient(rx - rollerSpacing * 0.4, 0, rx + rollerSpacing * 0.4, 0);
      rollerGrad.addColorStop(0, '#2c3340');
      rollerGrad.addColorStop(0.3, '#525b6c');
      rollerGrad.addColorStop(0.5, '#7b879c');
      rollerGrad.addColorStop(0.7, '#414856');
      rollerGrad.addColorStop(1, '#1e2430');

      ctx.fillStyle = rollerGrad;
      ctx.beginPath();
      ctx.ellipse(rx, rollerY, rollerSpacing * 0.4, rollerRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a1f2c';
      ctx.beginPath();
      ctx.arc(rx, rollerY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const bgBillet1X = w * 0.03;
    const bgBillet1Y = h * 0.38;
    const bgBillet1W = w * 0.16;
    const bgBillet1H = h * 0.28;

    ctx.fillStyle = '#3a414e';
    ctx.fillRect(bgBillet1X, bgBillet1Y, bgBillet1W, bgBillet1H);
    ctx.fillStyle = '#4f5767';
    ctx.fillRect(bgBillet1X + 4, bgBillet1Y + 4, bgBillet1W - 8, bgBillet1H * 0.3);

    const bgBillet2X = w * 0.72;
    const bgBillet2Y = h * 0.25;
    const bgBillet2W = w * 0.24;
    const bgBillet2H = h * 0.25;

    ctx.fillStyle = '#323945';
    ctx.fillRect(bgBillet2X, bgBillet2Y, bgBillet2W, bgBillet2H);
    ctx.fillStyle = '#454c5b';
    ctx.fillRect(bgBillet2X + 4, bgBillet2Y + 4, bgBillet2W - 8, bgBillet2H * 0.35);

    const bx = w * 0.21;
    const by = h * 0.26;
    const bw = w * 0.48;
    const bh = h * 0.34;

    ctx.fillStyle = '#596478';
    ctx.beginPath();
    ctx.moveTo(bx + 16, by);
    ctx.lineTo(bx + bw + 24, by - 24);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx, by + 18);
    ctx.closePath();
    ctx.fill();

    const sideGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    sideGrad.addColorStop(0, '#4b5568');
    sideGrad.addColorStop(0.4, '#394151');
    sideGrad.addColorStop(1, '#232936');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(bx, by + 18, bw, bh);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const lineY = by + 28 + i * 16;
      ctx.beginPath();
      ctx.moveTo(bx + 10, lineY);
      ctx.lineTo(bx + bw - 15, lineY);
      ctx.stroke();
    }

    ctx.save();
    ctx.font = 'bold 26px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(225, 235, 245, 0.75)';
    ctx.fillText(currentEvent.billetId, bx + bw * 0.22, by + bh * 0.58);
    ctx.restore();

    if (currentEvent.status !== 'PASS') {
      if (currentEvent.defectCategory === 'Crack') {
        ctx.strokeStyle = '#ffb938';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.55, by + bh * 0.3);
        ctx.lineTo(bx + bw * 0.58, by + bh * 0.45);
        ctx.lineTo(bx + bw * 0.56, by + bh * 0.6);
        ctx.lineTo(bx + bw * 0.61, by + bh * 0.78);
        ctx.stroke();
      } else if (currentEvent.defectCategory === 'Scratch') {
        ctx.strokeStyle = '#ffb938';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.15, by + bh * 0.7);
        ctx.lineTo(bx + bw * 0.4, by + bh * 0.75);
        ctx.stroke();
      }
    }

    const vigGrad = ctx.createRadialGradient(w * 0.48, h * 0.5, w * 0.2, w * 0.5, h * 0.5, w * 0.7);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(5, 10, 18, 0.5)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = 'rgba(61, 220, 132, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bgBillet2X - 4, bgBillet2Y - 14, bgBillet2W + 8, bgBillet2H + 24);
    ctx.strokeRect(bgBillet1X - 2, bgBillet1Y - 8, bgBillet1W + 4, bgBillet1H + 16);
    ctx.restore();

    const overlayColor = OVERLAY_COLORS[currentEvent.status] || '#3DDC84';
    const boxX = bx - 6;
    const boxY = by - 8;
    const boxW = bw + 14;
    const boxH = bh + 32;

    ctx.save();
    ctx.strokeStyle = overlayColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    const chipText = `${currentEvent.billetId}  ${currentEvent.status}`;
    ctx.font = '600 14px "IBM Plex Mono", monospace';
    const textMetrics = ctx.measureText(chipText);
    const chipPadX = 10;
    const chipPadY = 6;
    const chipW = textMetrics.width + chipPadX * 2;
    const chipH = 26;
    const chipX = boxX;
    const chipY = boxY - chipH + 2;

    ctx.fillStyle = overlayColor;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 6);
    ctx.fill();

    ctx.fillStyle = '#0A101C';
    ctx.textBaseline = 'middle';
    ctx.fillText(chipText, chipX + chipPadX, chipY + chipH / 2);
    ctx.restore();
  }, [currentEvent, isPlaying]);

  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      renderFrame();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [renderFrame]);

  const handleTogglePlay = () => {
    const nextState = simulationEngine.togglePlay();
    setIsPlaying(nextState);
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
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
        }}
      />

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
              height: '28px',
              padding: '0 12px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: '#FFFFFF',
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
                backgroundColor: isPlaying ? 'var(--overlay-pass)' : 'var(--text-muted)',
              }}
            />
            <span>{isPlaying ? 'LIVE' : 'PAUSED'}</span>
          </div>

          <div
            className="tabular"
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-on-dark-muted)',
            }}
          >
            FPS: {isPlaying ? fps : 0}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          padding: '4px 10px',
          borderRadius: 'var(--radius-control)',
          backgroundColor: 'rgba(10, 16, 28, 0.72)',
          color: 'var(--text-on-dark-muted)',
          fontSize: '0.8125rem',
          fontWeight: 500,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Simulated feed
      </div>

      {showControls && (
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
            }}
            title={isPlaying ? 'Pause Feed' : 'Resume Feed'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={() => simulationEngine.triggerManualInspection('crack')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'rgba(242, 163, 58, 0.25)',
              color: 'var(--overlay-rework)',
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}
            title="Inject simulated crack defect"
          >
            <AlertTriangle size={14} />
            <span>Simulate Defect</span>
          </button>
        </div>
      )}
    </div>
  );
};
