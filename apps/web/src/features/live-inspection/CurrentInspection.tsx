import React from 'react';
import { Focus, AlertCircle } from 'lucide-react';
import type { InspectionEvent, InspectionStatus } from '@hawkeye/shared';
import { formatDimension, formatConfidence } from '@/lib/format';
import { checkTolerances } from '@/lib/inspection-rules';
import { StatusIcon } from '@/components/ui/StatusIcon';

interface CurrentInspectionProps {
  event: InspectionEvent;
}

const VERDICT_STYLES: Record<
  InspectionStatus,
  { bg: string; text: string; label: string }
> = {
  PASS: {
    bg: 'var(--status-pass)',
    text: '#FFFFFF',
    label: 'PASS',
  },
  FAIL: {
    bg: 'var(--status-fail)',
    text: '#FFFFFF',
    label: 'FAIL',
  },
  REWORK: {
    bg: 'var(--status-rework)',
    text: 'var(--status-rework-on)',
    label: 'REWORK',
  },
  REVIEW: {
    bg: 'var(--status-review)',
    text: '#FFFFFF',
    label: 'REVIEW',
  },
};

export const CurrentInspection: React.FC<CurrentInspectionProps> = ({ event }) => {
  const tolerances = checkTolerances(event);
  const verdictStyle = VERDICT_STYLES[event.status] ?? VERDICT_STYLES.PASS;

  return (
    <div
      className="bv-card"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-5)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: '1.25rem',
              lineHeight: '1.75rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            <Focus size={22} strokeWidth={1.75} style={{ color: 'var(--text-secondary)' }} />
            <span>Current Inspection</span>
          </div>

          <div
            className="font-mono"
            style={{
              fontSize: '1.75rem',
              lineHeight: '2.25rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginTop: 'var(--space-1)',
            }}
          >
            {event.billetId}
          </div>
        </div>

        <div
          style={{
            height: '48px',
            padding: '0 20px',
            borderRadius: 'var(--radius-control)',
            backgroundColor: verdictStyle.bg,
            color: verdictStyle.text,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '1.25rem',
            lineHeight: '1.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            boxShadow: '0 2px 4px rgba(15, 27, 45, 0.1)',
            userSelect: 'none',
          }}
        >
          <StatusIcon status={event.status} size={22} strokeWidth={2.2} />
          <span>{verdictStyle.label}</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-6)',
          alignItems: 'stretch',
          flex: 1,
        }}
      >
        <div
          style={{
            width: '40%',
            minHeight: '220px',
            borderRadius: 'var(--radius-control)',
            overflow: 'hidden',
            backgroundColor: '#161d28',
            position: 'relative',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 300 240"
            preserveAspectRatio="xMidYMid slice"
            style={{ display: 'block' }}
          >
            <defs>
              <linearGradient id="billetFace" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#434e5f" />
                <stop offset="40%" stopColor="#2e3846" />
                <stop offset="100%" stopColor="#1e2530" />
              </linearGradient>
              <linearGradient id="billetShear" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#556275" />
                <stop offset="100%" stopColor="#6b7a91" />
              </linearGradient>
            </defs>

            <rect width="300" height="240" fill="#111822" />
            <polygon points="30,60 270,40 250,75 10,95" fill="url(#billetShear)" />
            <rect x="10" y="95" width="240" height="110" rx="2" fill="url(#billetFace)" />

            <line x1="25" y1="110" x2="235" y2="110" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="25" y1="130" x2="235" y2="130" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="25" y1="165" x2="235" y2="165" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            <text
              x="130"
              y="155"
              textAnchor="middle"
              fill="rgba(235, 240, 248, 0.85)"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="24"
              fontWeight="bold"
              letterSpacing="2"
            >
              {event.billetId}
            </text>

            {event.status === 'REWORK' && event.defectCategory === 'Crack' && (
              <path
                d="M 180,105 L 185,125 L 182,145 L 189,170"
                stroke="#ffb938"
                strokeWidth="2.5"
                fill="none"
              />
            )}
            {event.status === 'FAIL' && tolerances.widthViolation && (
              <rect x="10" y="95" width="240" height="110" fill="none" stroke="#FF6B63" strokeWidth="2" />
            )}
          </svg>
        </div>

        <div
          style={{
            width: '60%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Billet ID</span>
            <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {event.billetId}
            </span>
          </div>

          <div
            style={{
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Length</span>
            <span
              className="tabular"
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: tolerances.lengthViolation ? 'var(--status-fail-text)' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {tolerances.lengthViolation && <AlertCircle size={16} />}
              {formatDimension(event.lengthMm, true)}
            </span>
          </div>

          <div
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
              padding: tolerances.widthViolation ? '6px 0' : '0',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Width</span>
            <div style={{ textAlign: 'right' }}>
              <div
                className="tabular"
                style={{
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: tolerances.widthViolation ? 'var(--status-fail-text)' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '4px',
                }}
              >
                {tolerances.widthViolation && <AlertCircle size={16} />}
                {formatDimension(event.widthMm)}
              </div>
              {tolerances.widthViolation && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--status-fail-text)' }}>
                  {tolerances.widthLimitText}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Height</span>
            <span
              className="tabular"
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: tolerances.heightViolation ? 'var(--status-fail-text)' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {tolerances.heightViolation && <AlertCircle size={16} />}
              {formatDimension(event.heightMm)}
            </span>
          </div>

          <div
            style={{
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Defect</span>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: event.defect !== 'None' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {event.defect}
            </span>
          </div>

          <div
            style={{
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Confidence</span>
            <span
              className="tabular"
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: tolerances.confidenceViolation ? 'var(--status-review-text)' : 'var(--text-primary)',
              }}
            >
              {formatConfidence(event.confidence)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
