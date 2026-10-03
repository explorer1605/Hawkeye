import React, { useEffect, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import type { AlertItem, InspectionStatus } from '@hawkeye/shared';
import { formatTime } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { StatusIcon } from '@/components/ui/StatusIcon';

interface LiveAlertsProps {
  alerts: AlertItem[];
  onViewAll?: () => void;
}

const ICON_CIRCLE_STYLES: Record<
  InspectionStatus,
  { bg: string; color: string }
> = {
  PASS: {
    bg: 'var(--status-pass-bg)',
    color: 'var(--status-pass-text)',
  },
  FAIL: {
    bg: 'var(--status-fail-bg)',
    color: 'var(--status-fail-text)',
  },
  REWORK: {
    bg: 'var(--status-rework-bg)',
    color: 'var(--status-rework-text)',
  },
  REVIEW: {
    bg: 'var(--status-review-bg)',
    color: 'var(--status-review-text)',
  },
};

export const LiveAlerts: React.FC<LiveAlertsProps> = ({ alerts, onViewAll }) => {
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (alerts.length > 0) {
      const latestId = alerts[0]?.id;
      if (latestId && !highlightedIds.has(latestId)) {
        setHighlightedIds((prev) => new Set(prev).add(latestId));
        const timer = setTimeout(() => {
          setHighlightedIds((prev) => {
            const next = new Set(prev);
            next.delete(latestId);
            return next;
          });
        }, 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [alerts]);

  const displayAlerts = alerts.filter((a) => a.status !== 'PASS').slice(0, 5);

  return (
    <div
      className="bv-card"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="bv-card-header">
        <div className="bv-card-title">
          <Bell size={20} strokeWidth={1.75} />
          <span>Live Alerts</span>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--accent)',
              transition: 'color 150ms ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          >
            <span>View All</span>
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {displayAlerts.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              padding: 'var(--space-8) 0',
            }}
          >
            No active alerts. All systems running within tolerance.
          </div>
        ) : (
          displayAlerts.map((alert, idx) => {
            const circleStyle = ICON_CIRCLE_STYLES[alert.status];
            const isHighlighted = highlightedIds.has(alert.id);
            const isLast = idx === displayAlerts.length - 1;

            return (
              <div
                key={alert.id}
                style={{
                  minHeight: '72px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-3) 0',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  backgroundColor: isHighlighted ? circleStyle.bg : 'transparent',
                  transition: 'background-color 1.5s ease-out',
                  borderRadius: isHighlighted ? 'var(--radius-control)' : '0',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    borderRadius: '50%',
                    backgroundColor: circleStyle.bg,
                    color: circleStyle.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <StatusIcon status={alert.status} size={18} strokeWidth={2.2} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '1rem',
                      lineHeight: '1.5rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {alert.title}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      fontSize: '0.875rem',
                      lineHeight: '1.25rem',
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    <span className="font-mono">Billet ID: {alert.billetId}</span>
                    <span>{alert.detail}</span>
                  </div>
                </div>

                <div
                  className="tabular"
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatTime(alert.timestamp)}
                </div>

                <div>
                  <StatusPill status={alert.status} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
