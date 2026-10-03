import React, { useState, useEffect } from 'react';
import type { InspectionEvent, AlertItem } from '@hawkeye/shared';
import { simulationEngine } from '@/lib/realtime/simulation-engine';
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

  useEffect(() => {
    const unsubInspection = simulationEngine.subscribeInspection((newEvent) => {
      setCurrentEvent(newEvent);
      setHistory(simulationEngine.getHistory());
    });

    const unsubAlert = simulationEngine.subscribeAlert(() => {
      setAlerts(simulationEngine.getAlerts());
    });

    return () => {
      unsubInspection();
      unsubAlert();
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
