import React from 'react';
import {
  BarChart2,
  PieChart,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { InspectionEvent } from '@hawkeye/shared';

interface AnalyticsViewProps {
  events: InspectionEvent[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ events }) => {
  const total = events.length;
  const passes = events.filter((e) => e.status === 'PASS').length;
  const fails = events.filter((e) => e.status === 'FAIL').length;
  const reworks = events.filter((e) => e.status === 'REWORK').length;

  const yieldRate = total > 0 ? ((passes / total) * 100).toFixed(1) : '94.2';
  const failRate = total > 0 ? (((fails + reworks) / total) * 100).toFixed(1) : '5.8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-5)',
        }}
      >
        <div className="bv-card" style={{ padding: 'var(--space-4) var(--space-5)' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Total Inspected
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="tabular"
              style={{
                fontSize: '1.75rem',
                lineHeight: 1.2,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {total.toLocaleString()}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--surface-sunken)',
                border: '1px solid var(--border)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-control)',
              }}
            >
              +12 today
            </span>
          </div>
        </div>

        <div className="bv-card" style={{ padding: 'var(--space-4) var(--space-5)' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            First-pass Yield
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="tabular"
              style={{
                fontSize: '1.75rem',
                lineHeight: 1.2,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {yieldRate}%
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: 'var(--status-pass-text)',
                backgroundColor: 'var(--status-pass-bg)',
                border: '1px solid rgba(20, 122, 69, 0.25)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-control)',
              }}
            >
              +2.1%
            </span>
          </div>
        </div>

        <div className="bv-card" style={{ padding: 'var(--space-4) var(--space-5)' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Defect & Rework Rate
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="tabular"
              style={{
                fontSize: '1.75rem',
                lineHeight: 1.2,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {failRate}%
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--surface-sunken)',
                border: '1px solid var(--border)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-control)',
              }}
            >
              -0.8% week
            </span>
          </div>
        </div>

        <div className="bv-card" style={{ padding: 'var(--space-4) var(--space-5)' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Width CpK Index
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="tabular"
              style={{
                fontSize: '1.75rem',
                lineHeight: 1.2,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              1.48
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: 'var(--status-pass-text)',
                backgroundColor: 'var(--status-pass-bg)',
                border: '1px solid rgba(20, 122, 69, 0.25)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-control)',
              }}
            >
              &gt;1.33 Nominal
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '7fr 5fr',
          gap: 'var(--space-6)',
        }}
      >
        <div className="bv-card">
          <div className="bv-card-header">
            <div className="bv-card-title">
              <BarChart2 size={18} strokeWidth={1.75} />
              <span>Billet Width Distribution (mm)</span>
            </div>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Nominal: 150.0 ± 2.0 mm</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
            {[
              { bin: '< 148.0 (Undersize)', count: 2, pct: 2, color: 'var(--status-fail)' },
              { bin: '148.0 – 148.9 mm', count: 18, pct: 15, color: 'var(--accent)' },
              { bin: '149.0 – 149.9 mm', count: 48, pct: 40, color: 'var(--status-pass)' },
              { bin: '150.0 – 150.9 mm', count: 36, pct: 30, color: 'var(--status-pass)' },
              { bin: '151.0 – 151.9 mm', count: 12, pct: 10, color: 'var(--accent)' },
              { bin: '> 152.0 (Oversize)', count: 4, pct: 3, color: 'var(--status-fail)' },
            ].map((b) => (
              <div key={b.bin} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ width: '160px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {b.bin}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: '20px',
                    backgroundColor: 'var(--surface-sunken)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${b.pct * 2.2}%`,
                      backgroundColor: b.color,
                      borderRadius: '2px',
                    }}
                  />
                </div>
                <span className="tabular" style={{ width: '60px', textAlign: 'right', fontSize: '0.8125rem', fontWeight: 500 }}>
                  {b.count} ({b.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bv-card">
          <div className="bv-card-header">
            <div className="bv-card-title">
              <PieChart size={18} strokeWidth={1.75} />
              <span>Defect Classifications</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { type: 'Longitudinal Crack', category: 'Crack', count: 45, action: 'Rework grinding', color: 'var(--cat-1)' },
              { type: 'Surface Scratch', category: 'Scratch', count: 30, action: 'Roller polishing', color: 'var(--cat-2)' },
              { type: 'Width Tolerance Exceeded', category: 'Dimension', count: 19, action: 'Reject / Shear scrap', color: 'var(--cat-3)' },
              { type: 'OCR Low Confidence', category: 'OCR', count: 13, action: 'Operator manual check', color: 'var(--cat-4)' },
            ].map((d) => (
              <div
                key={d.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {d.type}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Standard protocol: {d.action}
                  </div>
                </div>
                <span className="tabular" style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
