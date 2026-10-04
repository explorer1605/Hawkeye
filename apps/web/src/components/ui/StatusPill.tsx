import React from 'react';
import type { InspectionStatus } from '@hawkeye/shared';

interface StatusPillProps {
  status: InspectionStatus;
  className?: string;
  variant?: 'dot' | 'bordered';
}

const STATUS_CONFIG: Record<
  InspectionStatus,
  { bg: string; text: string; label: string }
> = {
  PASS: {
    bg: '#147A45',
    text: '#FFFFFF',
    label: 'PASS',
  },
  FAIL: {
    bg: '#C4302B',
    text: '#FFFFFF',
    label: 'FAIL',
  },
  REWORK: {
    bg: '#D97706',
    text: '#FFFFFF',
    label: 'REWORK',
  },
  REVIEW: {
    bg: '#2563EB',
    text: '#FFFFFF',
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
        height: '24px',
        padding: '0 10px',
        borderRadius: 'var(--radius-control)',
        backgroundColor: config.bg,
        color: config.text,
        fontSize: '0.75rem',
        lineHeight: 1,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      }}
    >
      {config.label}
    </span>
  );
};
