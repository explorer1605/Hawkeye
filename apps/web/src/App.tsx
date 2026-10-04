import React, { useState, useEffect } from 'react';
import type { InspectionEvent, AlertItem } from '@hawkeye/shared';
import { simulationEngine } from '@/lib/realtime/simulation-engine';
import { alarmService } from '@/lib/alarm-service';
import { AppHeader, type NavTab } from '@/components/layout/AppHeader';
import { CameraFeed, CurrentInspection } from '@/features/live-inspection';
import { LiveAlerts } from '@/features/alerts';
import { InspectionAnalytics, AnalyticsView } from '@/features/analytics';
import { InspectionLogView } from '@/features/inspection-log';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('live');
  const [currentEvent, setCurrentEvent] = useState<InspectionEvent>(() =>
    simulationEngine.getCurrentInspection()
  );
  const [alerts, setAlerts] = useState<AlertItem[]>(() =>
    simulationEngine.getAlerts()
  );
  const [history, setHistory] = useState<InspectionEvent[]>(() =>
    simulationEngine.getHistory()
  );
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(() => alarmService.getIsAlarmActive());
  const [activeAlarmInfo, setActiveAlarmInfo] = useState(() => alarmService.getActiveAlarmInfo());

  useEffect(() => {
    const unsubInspection = simulationEngine.subscribeInspection((newEvent) => {
      setCurrentEvent(newEvent);
      setHistory(simulationEngine.getHistory());
      // Trigger plant audio/visual alarm if FAIL or defect
      if (newEvent.status !== 'PASS') {
        alarmService.trigger(newEvent.status, {
          billetId: newEvent.billetId,
          title: newEvent.defect !== 'None' ? newEvent.defect : 'Tolerance Violation',
        });
      }
    });

    const unsubAlert = simulationEngine.subscribeAlert(() => {
      setAlerts(simulationEngine.getAlerts());
    });

    const unsubAlarm = alarmService.subscribe(() => {
      setIsAlarmActive(alarmService.getIsAlarmActive());
      setActiveAlarmInfo(alarmService.getActiveAlarmInfo());
    });

    return () => {
      unsubInspection();
      unsubAlert();
      unsubAlarm();
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--surface-page)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        systemStatus="online"
      />

      {/* Industrial Active Alarm Alert Strip */}
      {isAlarmActive && (
        <div
          style={{
            backgroundColor: '#C4302B',
            color: '#FFFFFF',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            boxShadow: '0 2px 8px rgba(196, 48, 43, 0.3)',
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>CRITICAL PLANT ALARM:</span>
            <span>
              {activeAlarmInfo.billetId ? `[${activeAlarmInfo.billetId}] ` : ''}
              {activeAlarmInfo.title ?? 'Spec tolerance violation detected on line'}
            </span>
          </div>

          <button
            onClick={() => alarmService.acknowledgeAlarm()}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#C4302B',
              border: 'none',
              padding: '4px 12px',
              borderRadius: 'var(--radius-control)',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            ACKNOWLEDGE & SILENCE
          </button>
        </div>
      )}

      <main
        style={{
          flex: 1,
          paddingTop: 'var(--space-5)',
          paddingBottom: 'var(--space-8)',
        }}
      >
        <div className="bv-container">
          {activeTab === 'live' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-5)',
              }}
            >
              <section
                aria-label="Live Visual Inspection"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: 'var(--space-5)',
                }}
              >
                <div style={{ gridColumn: 'span 7' }}>
                  <CameraFeed currentEvent={currentEvent} fps={24} />
                </div>
                <div style={{ gridColumn: 'span 5' }}>
                  <CurrentInspection event={currentEvent} />
                </div>
              </section>

              <section
                aria-label="Alerts and Analytics"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: 'var(--space-5)',
                }}
              >
                <div style={{ gridColumn: 'span 6' }}>
                  <LiveAlerts
                    alerts={alerts}
                    onViewAll={() => setActiveTab('log')}
                  />
                </div>
                <div style={{ gridColumn: 'span 6' }}>
                  <InspectionAnalytics events={history} />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'analytics' && <AnalyticsView events={history} />}

          {activeTab === 'log' && <InspectionLogView events={history} />}
        </div>
      </main>
    </div>
  );
};

export default App;
