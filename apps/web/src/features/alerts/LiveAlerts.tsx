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
        }, 3000);
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
              fontSize: '0.8125rem',
              padding: 'var(--space-6) 0',
            }}
          >
            No active alerts. All systems running within tolerance.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {displayAlerts.map((alert) => {
              const isHighlighted = highlightedIds.has(alert.id);

              return (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    backgroundColor: isHighlighted ? 'var(--surface-sunken)' : 'var(--surface-card)',
                    borderRadius: 'var(--radius-control)',
                    transition: 'background-color 1s ease-out',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.875rem',
                          lineHeight: '1.25rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {alert.title}
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          padding: '1px 6px',
                          backgroundColor: 'var(--surface-sunken)',
                          borderRadius: '2px',
                        }}
                      >
                        {alert.billetId}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      {alert.detail}
                    </div>
                  </div>

                  <div
                    className="tabular"
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
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
            })}
          </div>
        )}
      </div>
    </div>
  );
};
