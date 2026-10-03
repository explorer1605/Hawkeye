import React, { useState, useEffect } from 'react';
import { Video, BarChart2, FileText, Radio } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

export type NavTab = 'live' | 'analytics' | 'log';

interface AppHeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  systemStatus?: 'online' | 'reconnecting' | 'offline';
  fps?: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onTabChange,
  systemStatus = 'online',
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'live',
      label: 'Live inspection',
      icon: <Video size={20} strokeWidth={1.75} />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart2 size={20} strokeWidth={1.75} />,
    },
    {
      id: 'log',
      label: 'Inspection log',
      icon: <FileText size={20} strokeWidth={1.75} />,
    },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '72px',
        backgroundColor: 'var(--surface-header)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        className="bv-container"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(47, 111, 237, 0.3)',
              }}
            >
              <Radio size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.375rem',
                  lineHeight: '1.75rem',
                  fontWeight: 600,
                  color: 'var(--text-on-dark)',
                  letterSpacing: '-0.01em',
                }}
              >
                Hawkeye
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  lineHeight: '1.25rem',
                  color: 'var(--text-on-dark-muted)',
                }}
              >
                Automated inspection system
              </div>
            </div>
          </div>

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
            aria-label="Main Navigation"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    height: '44px',
                    padding: '0 16px',
                    borderRadius: 'var(--radius-control)',
                    backgroundColor: isActive
                      ? 'var(--surface-header-active)'
                      : 'transparent',
                    color: isActive ? 'var(--text-on-dark)' : 'var(--text-on-dark-muted)',
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'all 150ms ease-out',
                    border: 'none',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.color = 'var(--text-on-dark)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-on-dark-muted)';
                    }
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '16px',
                        right: '16px',
                        height: '2px',
                        backgroundColor: '#4C8DFF',
                        borderRadius: '1px',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-on-dark)',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  systemStatus === 'online'
                    ? 'var(--overlay-pass)'
                    : systemStatus === 'reconnecting'
                    ? 'var(--overlay-rework)'
                    : 'var(--overlay-fail)',
              }}
            />
            <span>
              {systemStatus === 'online'
                ? 'System online'
                : systemStatus === 'reconnecting'
                ? 'Reconnecting…'
                : 'Offline'}
            </span>
          </div>

          <div
            className="tabular"
            style={{
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              color: 'var(--text-on-dark-muted)',
              fontFamily: 'var(--font-ui)',
              letterSpacing: '0.01em',
            }}
          >
            {formatDateTime(currentTime)}
          </div>
        </div>
      </div>
    </header>
  );
};
