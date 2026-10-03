import React, { useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Layers,
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        <div className="bv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Inspected</span>
            <Layers size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div
            className="tabular"
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginTop: 'var(--space-2)',
            }}
          >
            {total.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Continuous production line
          </div>
        </div>

        <div className="bv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>First-Pass Yield</span>
            <CheckCircle2 size={18} style={{ color: 'var(--status-pass)' }} />
          </div>
          <div
            className="tabular"
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: 'var(--status-pass-text)',
              marginTop: 'var(--space-2)',
            }}
          >
            {yieldRate}%
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Target: ≥ 92.0%
          </div>
        </div>

        <div className="bv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Defect & Rework</span>
            <AlertTriangle size={18} style={{ color: 'var(--status-fail)' }} />
          </div>
          <div
            className="tabular"
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: 'var(--status-fail-text)',
              marginTop: 'var(--space-2)',
            }}
          >
            {failRate}%
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {fails} Fails, {reworks} Reworks
          </div>
        </div>

        <div className="bv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Width CpK Index</span>
            <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div
            className="tabular"
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: 'var(--accent)',
              marginTop: 'var(--space-2)',
            }}
          >
            1.48
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Process capability stable
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
              <BarChart2 size={20} strokeWidth={1.75} />
              <span>Billet Width Distribution (mm)</span>
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Nominal: 150.0 ± 2.0 mm</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0' }}>
            {[
              { bin: '< 148.0 (Undersize)', count: 2, pct: 2, color: 'var(--status-fail)' },
              { bin: '148.0 – 148.9 mm', count: 18, pct: 15, color: 'var(--accent)' },
              { bin: '149.0 – 149.9 mm', count: 48, pct: 40, color: 'var(--status-pass)' },
              { bin: '150.0 – 150.9 mm', count: 36, pct: 30, color: 'var(--status-pass)' },
              { bin: '151.0 – 151.9 mm', count: 12, pct: 10, color: 'var(--accent)' },
              { bin: '> 152.0 (Oversize)', count: 4, pct: 3, color: 'var(--status-fail)' },
            ].map((b) => (
              <div key={b.bin} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ width: '160px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {b.bin}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: '24px',
                    backgroundColor: 'var(--surface-sunken)',
                    borderRadius: 'var(--radius-control)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${b.pct * 2.2}%`,
                      backgroundColor: b.color,
                      borderRadius: 'var(--radius-control)',
                    }}
                  />
                </div>
                <span className="tabular" style={{ width: '60px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500 }}>
                  {b.count} ({b.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bv-card">
          <div className="bv-card-header">
            <div className="bv-card-title">
              <PieChart size={20} strokeWidth={1.75} />
              <span>Defect Classifications</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                  padding: '12px',
                  backgroundColor: 'var(--surface-sunken)',
                  borderRadius: 'var(--radius-control)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: d.color }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {d.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Standard protocol: {d.action}
                  </div>
                </div>
                <span className="tabular" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
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
