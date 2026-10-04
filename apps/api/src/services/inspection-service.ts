import crypto from 'node:crypto';
import type {
  InspectionEvent,
  AlertItem,
  InspectionStatus,
  DefectCategory,
} from '@hawkeye/shared';

class InspectionService {
  private history: InspectionEvent[] = [];
  private alerts: AlertItem[] = [];
  private billetCounter: number = 24054;

  constructor() {
    // Start with empty history, waiting for real data from Decision Engine
  }



  public getInspections(limit: number = 50, offset: number = 0) {
    return {
      data: this.history.slice(offset, offset + limit),
      total: this.history.length,
      limit,
      offset,
    };
  }

  public getAlerts(limit: number = 10) {
    return {
      data: this.alerts.slice(0, limit),
      total: this.alerts.length,
    };
  }

  public getCurrent() {
    return this.history[0];
  }

  public ingestEvent(event: Omit<InspectionEvent, 'eventId' | 'timestamp'>) {
    const fullEvent: InspectionEvent = {
      ...event,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.history.unshift(fullEvent);
    if (this.history.length > 500) {
      this.history.pop();
    }

    if (fullEvent.status !== 'PASS') {
      const alert: AlertItem = {
        id: crypto.randomUUID(),
        eventId: fullEvent.eventId,
        billetId: fullEvent.billetId,
        timestamp: fullEvent.timestamp,
        title: fullEvent.defect,
        detail: fullEvent.defectDetail ?? `Confidence ${Math.round(fullEvent.confidence * 100)}%`,
        status: fullEvent.status,
        severity: fullEvent.status === 'FAIL' ? 'high' : 'medium',
      };
      this.alerts.unshift(alert);
      if (this.alerts.length > 50) {
        this.alerts.pop();
      }
    }

    return fullEvent;
  }


}

export const inspectionService = new InspectionService();
