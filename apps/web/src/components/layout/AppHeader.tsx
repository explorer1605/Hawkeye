import React, { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/format';
import logoImg from '@/assets/logo.png';

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

  const navItems: { id: NavTab; label: string }[] = [
    {
      id: 'live',
      label: 'Live inspection',
    },
    {
      id: 'analytics',
      label: 'Analytics',
    },
    {
      id: 'log',
      label: 'Inspection log',
    },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '62px',
        backgroundColor: 'var(--surface-header)',
        borderBottom: '1px solid #1E2D44',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={logoImg}
              alt="Hawkeye"
              style={{
                height: '30px',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
                mixBlendMode: 'screen',
              }}
            />
          </div>

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
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
                    justifyContent: 'center',
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-control)',
                    backgroundColor: isActive
                      ? 'var(--surface-header-active)'
                      : 'transparent',
                    color: isActive ? 'var(--text-on-dark)' : 'var(--text-on-dark-muted)',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: '0.01em',
                    transition: 'all 150ms ease-out',
                    border: 'none',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#18283E';
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
                  <span>{item.label}</span>
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '12px',
                        right: '12px',
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
            gap: 'var(--space-5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              color:
                systemStatus === 'online'
                  ? 'var(--overlay-pass)'
                  : systemStatus === 'reconnecting'
                  ? 'var(--overlay-rework)'
                  : 'var(--overlay-fail)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-control)',
            }}
          >
            {systemStatus === 'online'
              ? 'ONLINE'
              : systemStatus === 'reconnecting'
              ? 'RECONNECTING'
              : 'OFFLINE'}
          </div>

          <div
            className="tabular"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-on-dark-muted)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.02em',
            }}
          >
            {formatDateTime(currentTime)}
          </div>
        </div>
      </div>
    </header>
  );
};
