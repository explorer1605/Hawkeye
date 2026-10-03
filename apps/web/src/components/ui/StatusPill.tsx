import React from 'react';
import type { InspectionStatus } from '@hawkeye/shared';

interface StatusPillProps {
  status: InspectionStatus;
  className?: string;
  variant?: 'dot' | 'bordered';
}

const STATUS_CONFIG: Record<
  InspectionStatus,
  { dot: string; text: string; bg: string; border: string; label: string }
> = {
  PASS: {
    dot: 'var(--status-pass)',
    text: '#0E5C33',
    bg: 'rgba(20, 122, 69, 0.08)',
    border: 'rgba(20, 122, 69, 0.25)',
    label: 'PASS',
  },
  FAIL: {
    dot: 'var(--status-fail)',
    text: '#9E211C',
    bg: 'rgba(196, 48, 43, 0.08)',
    border: 'rgba(196, 48, 43, 0.25)',
    label: 'FAIL',
  },
  REWORK: {
    dot: 'var(--status-rework)',
    text: '#854D0E',
    bg: 'rgba(242, 163, 58, 0.12)',
    border: 'rgba(242, 163, 58, 0.35)',
    label: 'REWORK',
  },
  REVIEW: {
    dot: 'var(--status-review)',
    text: '#1B4DB0',
    bg: 'rgba(47, 111, 237, 0.08)',
    border: 'rgba(47, 111, 237, 0.25)',
    label: 'REVIEW',
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PASS;

  return (
    <span
      className={`bv-status-pill ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '22px',
        padding: '0 8px',
        borderRadius: 'var(--radius-control)',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
        fontSize: '0.75rem',
        lineHeight: 1,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {config.label}
    </span>
  );
};
