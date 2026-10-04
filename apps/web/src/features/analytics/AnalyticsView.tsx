import React, { useMemo } from 'react';
import { BarChart2, PieChart } from 'lucide-react';
import type { InspectionEvent } from '@hawkeye/shared';

interface AnalyticsViewProps {
  events: InspectionEvent[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ events }) => {
  const total = events.length;
  const passes = events.filter((e) => e.status === 'PASS').length;
  const reworks = events.filter((e) => e.status === 'REWORK').length;
  const fails = events.filter((e) => e.status === 'FAIL').length;

  const passPct = total > 0 ? ((passes / total) * 100).toFixed(1) : '0.0';
  const reworkPct = total > 0 ? ((reworks / total) * 100).toFixed(1) : '0.0';
  const failPct = total > 0 ? ((fails / total) * 100).toFixed(1) : '0.0';

  // Compute Pass Rate for each hour of the day from live events
  const hourlyPassRates = useMemo(() => {
    const map = new Map<number, { total: number; pass: number }>();

    events.forEach((e) => {
      const d = new Date(e.timestamp);
      const h = d.getHours();
      const cur = map.get(h) || { total: 0, pass: 0 };
      cur.total += 1;
      if (e.status === 'PASS') cur.pass += 1;
      map.set(h, cur);
    });

    const sortedHours = Array.from(map.keys()).sort((a, b) => a - b);
    if (sortedHours.length === 0) return [];

    return sortedHours.map((h) => {
      const cur = map.get(h)!;
      const rate = ((cur.pass / cur.total) * 100).toFixed(1);
      const startStr = `${String(h).padStart(2, '0')}:00`;
      const endStr = `${String((h + 1) % 24).padStart(2, '0')}:00`;
      return {
        hour: h,
        label: `${startStr} – ${endStr}`,
        passRate: rate,
        total: cur.total,
        pass: cur.pass,
      };
    });
  }, [events]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Production Yield Overview Banner */}
      <div
        style={{
          backgroundColor: '#0D1E36',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(13, 30, 54, 0.15)',
        }}
      >
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            color: '#8FA4BD',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          PRODUCTION YIELD OVERVIEW
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <span
            className="tabular"
            style={{
              fontSize: '2.75rem',
              lineHeight: 1,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
            }}
          >
            {total}
          </span>
          <span
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-mono)',
              color: '#8FA4BD',
              fontWeight: 500,
            }}
          >
            Billets
          </span>
        </div>

        <div
          style={{
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            margin: '20px 0 16px 0',
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#8FA4BD', marginBottom: '4px' }}>
              Standard Nominal
            </div>
            <div
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#FFFFFF',
                fontFamily: 'var(--font-mono)',
              }}
            >
              1000 ±5 mm
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#8FA4BD', marginBottom: '4px' }}>
              Width / Diameter
            </div>
            <div
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#FFFFFF',
                fontFamily: 'var(--font-mono)',
              }}
            >
              120 ±1 mm
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#8FA4BD', marginBottom: '4px' }}>
              Min OCR Score
            </div>
            <div
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#10B981',
                fontFamily: 'var(--font-mono)',
              }}
            >
              90% Target
            </div>
          </div>
        </div>
      </div>

      {/* 3 Status Cards: PASSED, REWORK, REJECTED */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-5)',
        }}
      >
        {/* PASSED */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #A7F3D0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#374151',
                fontFamily: 'var(--font-mono)',
              }}
            >
              PASSED
            </span>
          </div>

          <div
            className="tabular"
            style={{
              fontSize: '2rem',
              lineHeight: 1.1,
              fontWeight: 800,
              color: '#059669',
              marginBottom: '4px',
            }}
          >
            {passes}
          </div>
          <div
            className="tabular"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#9CA3AF',
            }}
          >
            {passPct}%
          </div>
        </div>

        {/* REWORK */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #FDE68A',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#374151',
                fontFamily: 'var(--font-mono)',
              }}
            >
              REWORK
            </span>
          </div>

          <div
            className="tabular"
            style={{
              fontSize: '2rem',
              lineHeight: 1.1,
              fontWeight: 800,
              color: '#D97706',
              marginBottom: '4px',
            }}
          >
            {reworks}
          </div>
          <div
            className="tabular"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#9CA3AF',
            }}
          >
            {reworkPct}%
          </div>
        </div>

        {/* REJECTED */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #FECDD3',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#374151',
                fontFamily: 'var(--font-mono)',
              }}
            >
              REJECTED
            </span>
          </div>

          <div
            className="tabular"
            style={{
              fontSize: '2rem',
              lineHeight: 1.1,
              fontWeight: 800,
              color: '#DC2626',
              marginBottom: '4px',
            }}
          >
            {fails}
          </div>
          <div
            className="tabular"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#9CA3AF',
            }}
          >
            {failPct}%
          </div>
        </div>
      </div>

      {/* Hourly Pass Rates */}
      {hourlyPassRates.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {hourlyPassRates.map((h) => (
            <div
              key={h.hour}
              className="bv-card"
              style={{ padding: 'var(--space-4) var(--space-5)' }}
            >
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {h.label} Pass Rate
              </div>
              <div>
                <span
                  className="tabular"
                  style={{
                    fontSize: '1.75rem',
                    lineHeight: 1.2,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {h.passRate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Charts Grid: Billet Width Distribution + Defect Classifications */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '7fr 5fr',
          gap: 'var(--space-6)',
        }}
      >
        {/* Billet Width Distribution (mm) */}
        <div className="bv-card">
          <div className="bv-card-header">
            <div className="bv-card-title">
              <BarChart2 size={18} strokeWidth={1.75} />
              <span>Billet Width Distribution (mm)</span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}
            >
              Nominal: 150.0 ± 2.0 mm
            </span>
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
                <span
                  className="tabular"
                  style={{
                    width: '60px',
                    textAlign: 'right',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                  }}
                >
                  {b.count} ({b.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Defect Classifications */}
        <div className="bv-card">
          <div className="bv-card-header">
            <div className="bv-card-title">
              <PieChart size={18} strokeWidth={1.75} />
              <span>Defect Classifications</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { type: 'Longitudinal Crack', category: 'Crack', count: 45, color: 'var(--cat-1)' },
              { type: 'Surface Scratch', category: 'Scratch', count: 30, color: 'var(--cat-2)' },
              { type: 'Width Tolerance Exceeded', category: 'Dimension', count: 19, color: 'var(--cat-3)' },
              { type: 'OCR Low Confidence', category: 'OCR', count: 13, color: 'var(--cat-4)' },
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
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {d.type}
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
