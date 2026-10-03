import React, { useState } from 'react';
import { BarChart2, ChevronDown } from 'lucide-react';
import type { InspectionEvent } from '@hawkeye/shared';

interface InspectionAnalyticsProps {
  events: InspectionEvent[];
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
}

export const InspectionAnalytics: React.FC<InspectionAnalyticsProps> = ({
  events,
  selectedRange = 'Last 1 Hour',
  onRangeChange,
}) => {
  const [range, setRange] = useState<string>(selectedRange);
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    time: string;
    inspected: number;
    fails: number;
    x: number;
    yTop: number;
    yBottom: number;
  } | null>(null);

  const handleRangeChange = (newRange: string) => {
    setRange(newRange);
    if (onRangeChange) onRangeChange(newRange);
  };

  const trendPoints = [
    { time: '09:30', inspected: 20, fails: 2 },
    { time: '09:45', inspected: 23, fails: 3 },
    { time: '10:00', inspected: 28, fails: 4 },
    { time: '10:15', inspected: 24, fails: 2 },
    { time: '10:30', inspected: 27, fails: 3 },
    { time: '10:45', inspected: 29, fails: 2 },
  ];

  const defectBreakdown = [
    { name: 'Crack', count: 45, pct: 42, color: 'var(--cat-1)' },
    { name: 'Scratch', count: 30, pct: 28, color: 'var(--cat-2)' },
    { name: 'Dimension', count: 19, pct: 18, color: 'var(--cat-3)' },
    { name: 'OCR', count: 13, pct: 12, color: 'var(--cat-4)' },
  ];
  const totalFails = defectBreakdown.reduce((sum, d) => sum + d.count, 0);

  const chartW = 380;
  const chartH = 220;
  const topPanelH = chartH * 0.62;
  const bottomPanelH = chartH * 0.30;
  const panelGap = 16;
  const marginL = 36;
  const marginR = 16;
  const plotW = chartW - marginL - marginR;

  const maxInspected = 40;
  const maxFails = 6;

  const getX = (index: number) => marginL + (index / (trendPoints.length - 1)) * plotW;
  const getYInspected = (val: number) => topPanelH - (val / maxInspected) * (topPanelH - 24);
  const getYFails = (val: number) =>
    topPanelH + panelGap + bottomPanelH - (val / maxFails) * bottomPanelH;

  const inspectedPath = trendPoints
    .map((pt, i) => `${getX(i)},${getYInspected(pt.inspected)}`)
    .join(' ');
  const failsPath = trendPoints
    .map((pt, i) => `${getX(i)},${getYFails(pt.fails)}`)
    .join(' ');

  const donutR = 56;
  const circumference = 2 * Math.PI * donutR;
  let accumulatedPct = 0;

  return (
    <div
      className="bv-card"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="bv-card-header">
        <div className="bv-card-title">
          <BarChart2 size={20} strokeWidth={1.75} />
          <span>Inspection Analytics</span>
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={range}
            onChange={(e) => handleRangeChange(e.target.value)}
            style={{
              height: '40px',
              padding: '0 36px 0 16px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              appearance: 'none',
              outline: 'none',
            }}
          >
            <option value="Last 15 Minutes">Last 15 Minutes</option>
            <option value="Last 1 Hour">Last 1 Hour</option>
            <option value="Last 8 Hours">Last 8 Hours</option>
            <option value="Last 24 Hours">Last 24 Hours</option>
            <option value="Last 7 Days">Last 7 Days</option>
          </select>
          <ChevronDown
            size={16}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '7fr 5fr',
          gap: 'var(--space-6)',
          flex: 1,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}
          >
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Inspection Trend
            </span>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '2px',
                    backgroundColor: 'var(--status-pass)',
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>Pass</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '2px',
                    backgroundColor: 'var(--status-fail)',
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>Fail</span>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', flex: 1 }}>
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              {[0, 10, 20, 30, 40].map((val) => {
                const y = getYInspected(val);
                return (
                  <g key={`grid-top-${val}`}>
                    <line
                      x1={marginL}
                      y1={y}
                      x2={chartW - marginR}
                      y2={y}
                      stroke="var(--grid-line)"
                      strokeWidth={1}
                    />
                    <text
                      x={marginL - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="var(--text-muted)"
                      fontSize="13"
                      className="tabular"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {[0, 3, 6].map((val) => {
                const y = getYFails(val);
                return (
                  <g key={`grid-bot-${val}`}>
                    <line
                      x1={marginL}
                      y1={y}
                      x2={chartW - marginR}
                      y2={y}
                      stroke="var(--grid-line)"
                      strokeWidth={1}
                    />
                    <text
                      x={marginL - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="var(--text-muted)"
                      fontSize="13"
                      className="tabular"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              <polyline
                points={inspectedPath}
                fill="none"
                stroke="var(--status-pass)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <polyline
                points={failsPath}
                fill="none"
                stroke="var(--status-fail)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {trendPoints.map((pt, i) => {
                const x = getX(i);
                const yTop = getYInspected(pt.inspected);
                const yBot = getYFails(pt.fails);
                const isHovered = hoveredPoint?.index === i;

                return (
                  <g
                    key={`point-${i}`}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        index: i,
                        time: pt.time,
                        inspected: pt.inspected,
                        fails: pt.fails,
                        x,
                        yTop,
                        yBottom: yBot,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <text
                      x={x}
                      y={chartH - 2}
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize="13"
                      className="tabular"
                    >
                      {pt.time}
                    </text>

                    {isHovered && (
                      <>
                        <line
                          x1={x}
                          y1={topPanelH - 24}
                          x2={x}
                          y2={topPanelH + panelGap + bottomPanelH}
                          stroke="var(--border-strong)"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                        />
                        <circle cx={x} cy={yTop} r={4} fill="var(--status-pass)" stroke="#FFFFFF" strokeWidth={2} />
                        <circle cx={x} cy={yBot} r={4} fill="var(--status-fail)" stroke="#FFFFFF" strokeWidth={2} />
                      </>
                    )}

                    <rect x={x - 18} y={0} width={36} height={chartH} fill="transparent" />
                  </g>
                );
              })}
            </svg>

            {hoveredPoint && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(hoveredPoint.x / chartW) * 100}%`,
                  top: '12px',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  boxShadow: 'var(--shadow-popover)',
                  padding: '8px 12px',
                  pointerEvents: 'none',
                  zIndex: 20,
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {hoveredPoint.time}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-pass-text)' }}>
                  <span>Inspected:</span>
                  <span className="tabular" style={{ fontWeight: 600 }}>{hoveredPoint.inspected}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-fail-text)' }}>
                  <span>Fails:</span>
                  <span className="tabular" style={{ fontWeight: 600 }}>{hoveredPoint.fails}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Defect Distribution
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              flex: 1,
            }}
          >
            <div style={{ position: 'relative', width: '160px', height: '160px' }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                {defectBreakdown.map((item, idx) => {
                  const dashLength = (item.pct / 100) * circumference;
                  const dashOffset = -((accumulatedPct / 100) * circumference);
                  accumulatedPct += item.pct;

                  return (
                    <circle
                      key={`slice-${idx}`}
                      cx="80"
                      cy="80"
                      r={donutR}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={28}
                      strokeDasharray={`${dashLength - 2} ${circumference - dashLength + 2}`}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 80 80)"
                    />
                  );
                })}
              </svg>

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div
                  className="tabular"
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 600,
                    lineHeight: '1',
                    color: 'var(--text-primary)',
                  }}
                >
                  {totalFails}
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                  }}
                >
                  Fails
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                flex: 1,
              }}
            >
              {defectBreakdown.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        backgroundColor: item.color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  </div>
                  <span
                    className="tabular"
                    style={{
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
