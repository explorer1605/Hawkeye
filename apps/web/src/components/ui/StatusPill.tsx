import React from 'react';
import type { InspectionStatus } from '@hawkeye/shared';

interface StatusPillProps {
  status: InspectionStatus;
  className?: string;
}

const STATUS_STYLES: Record<
  InspectionStatus,
  { bg: string; color: string; label: string }
> = {
  PASS: {
    bg: 'var(--status-pass-bg)',
    color: 'var(--status-pass-text)',
    label: 'PASS',
  },
  FAIL: {
    bg: 'var(--status-fail-bg)',
    color: 'var(--status-fail-text)',
    label: 'FAIL',
  },
  REWORK: {
    bg: 'var(--status-rework-bg)',
    color: 'var(--status-rework-text)',
    label: 'REWORK',
  },
  REVIEW: {
    bg: 'var(--status-review-bg)',
    color: 'var(--status-review-text)',
    label: 'REVIEW',
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={`bv-status-pill ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '28px',
        padding: '0 12px',
        borderRadius: 'var(--radius-pill)',
        backgroundColor: style.bg,
        color: style.color,
        fontSize: '0.8125rem',
        lineHeight: '1.125rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {style.label}
    </span>
  );
};
