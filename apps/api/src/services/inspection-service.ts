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
    this.seedData();
  }

  private seedData() {
    const now = Date.now();

    const initialDefs = [
      {
        id: 'HT24051',
        status: 'PASS' as InspectionStatus,
        defect: 'None',
        cat: 'None' as DefectCategory | 'None',
        conf: 0.98,
        width: 150.8,
        height: 151.2,
        length: 8120,
        offsetSec: 0,
      },
      {
        id: 'HT24053',
        status: 'REWORK' as InspectionStatus,
        defect: 'Longitudinal Crack Detected',
        cat: 'Crack' as DefectCategory | 'None',
        detail: 'Confidence 94%',
        conf: 0.94,
        width: 150.4,
        height: 150.9,
        length: 8118,
        offsetSec: 25,
      },
      {
        id: 'HT24049',
        status: 'FAIL' as InspectionStatus,
        defect: 'Width Out of Tolerance',
        cat: 'Dimension' as DefectCategory | 'None',
        detail: 'Measured 154.2 mm. Limit 148 – 152 mm',
        conf: 0.96,
        width: 154.2,
        height: 151.0,
        length: 8125,
        offsetSec: 50,
      },
      {
        id: 'HT24047',
        status: 'REVIEW' as InspectionStatus,
        defect: 'OCR Low Confidence',
        cat: 'OCR' as DefectCategory | 'None',
        detail: 'Confidence 82%',
        conf: 0.82,
        width: 150.2,
        height: 149.8,
        length: 8115,
        offsetSec: 75,
      },
    ];

    for (const item of initialDefs) {
      const timeStr = new Date(now - item.offsetSec * 1000).toISOString();
      const event: InspectionEvent = {
        eventId: crypto.randomUUID(),
        billetId: item.id,
        timestamp: timeStr,
        lengthMm: item.length,
        widthMm: item.width,
        heightMm: item.height,
        defect: item.defect,
        defectCategory: item.cat,
        defectDetail: item.detail,
        confidence: item.conf,
        status: item.status,
        boundingBox: { x: 0.22, y: 0.24, width: 0.42, height: 0.38 },
      };
      this.history.push(event);

      if (item.status !== 'PASS') {
        this.alerts.push({
          id: crypto.randomUUID(),
          eventId: event.eventId,
          billetId: event.billetId,
          timestamp: timeStr,
          title: item.defect,
          detail: item.detail ?? `Confidence ${Math.round(item.conf * 100)}%`,
          status: item.status,
          severity: item.status === 'FAIL' ? 'high' : 'medium',
        });
      }
    }
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

  public generateRandomEvent(): InspectionEvent {
    const id = `HT${this.billetCounter++}`;
    let status: InspectionStatus = 'PASS';
    let defect = 'None';
    let cat: DefectCategory | 'None' = 'None';
    let detail: string | undefined = undefined;
    let width = 150.0 + (Math.random() - 0.5) * 2.0;
    let height = 150.0 + (Math.random() - 0.5) * 2.0;
    let length = 8120 + Math.round((Math.random() - 0.5) * 20);
    let conf = 0.96 + Math.random() * 0.03;

    const rnd = Math.random();
    if (rnd < 0.08) {
      status = 'REWORK';
      defect = 'Longitudinal Crack Detected';
      cat = 'Crack';
      conf = 0.94;
      detail = 'Confidence 94%';
    } else if (rnd < 0.14) {
      status = 'FAIL';
      defect = 'Width Out of Tolerance';
      cat = 'Dimension';
      width = 154.4;
      detail = 'Measured 154.4 mm. Limit 148 – 152 mm';
    } else if (rnd < 0.18) {
      status = 'REVIEW';
      defect = 'OCR Low Confidence';
      cat = 'OCR';
      conf = 0.81;
      detail = 'Confidence 81%';
    }

    return this.ingestEvent({
      billetId: id,
      lengthMm: length,
      widthMm: Number(width.toFixed(1)),
      heightMm: Number(height.toFixed(1)),
      defect,
      defectCategory: cat,
      defectDetail: detail,
      confidence: Number(conf.toFixed(2)),
      status,
      boundingBox: {
        x: 0.20 + (Math.random() - 0.5) * 0.04,
        y: 0.23 + (Math.random() - 0.5) * 0.02,
        width: 0.44,
        height: 0.38,
      },
    });
  }
}

export const inspectionService = new InspectionService();
