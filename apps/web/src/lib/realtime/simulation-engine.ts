import type {
  InspectionEvent,
  AlertItem,
  InspectionStatus,
  DefectCategory,
} from '@hawkeye/shared';

type InspectionListener = (event: InspectionEvent) => void;
type AlertListener = (alert: AlertItem) => void;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class SimulationEngine {
  private isRunning: boolean = true;
  private billetCounter: number = 24054;
  private timer: number | null = null;
  private inspectionListeners: Set<InspectionListener> = new Set();
  private alertListeners: Set<AlertListener> = new Set();

  private history: InspectionEvent[] = [];
  private alerts: AlertItem[] = [];

  constructor() {
    this.seedInitialData();
    this.start();
  }

  private seedInitialData() {
    const now = Date.now();

    const initialDefs: Array<{
      id: string;
      status: InspectionStatus;
      defect: string;
      cat: DefectCategory | 'None';
      detail?: string;
      conf: number;
      width: number;
      height: number;
      length: number;
      offsetSec: number;
    }> = [
      {
        id: 'HT24051',
        status: 'PASS',
        defect: 'None',
        cat: 'None',
        conf: 0.98,
        width: 150.8,
        height: 151.2,
        length: 8120,
        offsetSec: 0,
      },
      {
        id: 'HT24053',
        status: 'REWORK',
        defect: 'Longitudinal Crack Detected',
        cat: 'Crack',
        detail: 'Confidence 94%',
        conf: 0.94,
        width: 150.4,
        height: 150.9,
        length: 8118,
        offsetSec: 25,
      },
      {
        id: 'HT24049',
        status: 'FAIL',
        defect: 'Width Out of Tolerance',
        cat: 'Dimension',
        detail: 'Measured 154.2 mm. Limit 148 – 152 mm',
        conf: 0.96,
        width: 154.2,
        height: 151.0,
        length: 8125,
        offsetSec: 50,
      },
      {
        id: 'HT24047',
        status: 'REVIEW',
        defect: 'OCR Low Confidence',
        cat: 'OCR',
        detail: 'Confidence 82%',
        conf: 0.82,
        width: 150.2,
        height: 149.8,
        length: 8115,
        offsetSec: 75,
      },
      {
        id: 'HT24046',
        status: 'PASS',
        defect: 'None',
        cat: 'None',
        conf: 0.97,
        width: 150.5,
        height: 150.7,
        length: 8122,
        offsetSec: 90,
      },
      {
        id: 'HT24045',
        status: 'PASS',
        defect: 'None',
        cat: 'None',
        conf: 0.99,
        width: 150.6,
        height: 150.3,
        length: 8120,
        offsetSec: 105,
      },
    ];

    for (const item of initialDefs) {
      const timeStr = new Date(now - item.offsetSec * 1000).toISOString();
      const event: InspectionEvent = {
        eventId: generateUUID(),
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
          id: generateUUID(),
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

    for (let i = 1; i <= 120; i++) {
      const offsetMinutes = i * 2.5;
      const t = new Date(now - offsetMinutes * 60 * 1000).toISOString();
      const rnd = Math.random();
      let status: InspectionStatus = 'PASS';
      let defect = 'None';
      let cat: DefectCategory | 'None' = 'None';
      let detail: string | undefined = undefined;
      let width = 150 + (Math.random() - 0.5) * 2.8;
      let height = 150 + (Math.random() - 0.5) * 2.6;
      const length = 8120 + Math.round((Math.random() - 0.5) * 30);
      let conf = 0.95 + Math.random() * 0.04;

      if (rnd < 0.07) {
        status = 'FAIL';
        defect = 'Width Out of Tolerance';
        cat = 'Dimension';
        width = 154.5;
        detail = 'Measured 154.5 mm. Limit 148 – 152 mm';
      } else if (rnd < 0.12) {
        status = 'REWORK';
        defect = 'Longitudinal Crack Detected';
        cat = 'Crack';
        detail = 'Confidence 93%';
        conf = 0.93;
      } else if (rnd < 0.16) {
        status = 'REWORK';
        defect = 'Surface Scratch Detected';
        cat = 'Scratch';
        detail = 'Confidence 91%';
        conf = 0.91;
      } else if (rnd < 0.19) {
        status = 'REVIEW';
        defect = 'OCR Low Confidence';
        cat = 'OCR';
        detail = 'Confidence 81%';
        conf = 0.81;
      }

      const id = `HT${24044 - i}`;
      const ev: InspectionEvent = {
        eventId: generateUUID(),
        billetId: id,
        timestamp: t,
        lengthMm: length,
        widthMm: Number(width.toFixed(1)),
        heightMm: Number(height.toFixed(1)),
        defect,
        defectCategory: cat,
        defectDetail: detail,
        confidence: Number(conf.toFixed(2)),
        status,
        boundingBox: { x: 0.22, y: 0.24, width: 0.42, height: 0.38 },
      };
      this.history.push(ev);

      if (status !== 'PASS' && this.alerts.length < 15) {
        this.alerts.push({
          id: generateUUID(),
          eventId: ev.eventId,
          billetId: ev.billetId,
          timestamp: t,
          title: defect,
          detail: detail ?? `Confidence ${Math.round(conf * 100)}%`,
          status,
          severity: status === 'FAIL' ? 'high' : 'medium',
        });
      }
    }
  }

  public start() {
    if (this.timer) return;
    this.isRunning = true;
    this.scheduleNextInspection();
  }

  public stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  public togglePlay(): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  private scheduleNextInspection() {
    if (!this.isRunning) return;
    const delay = 5000 + Math.random() * 2000;
    this.timer = window.setTimeout(() => {
      this.generateInspection();
      this.scheduleNextInspection();
    }, delay);
  }

  public triggerManualInspection(type: 'pass' | 'crack' | 'dimension' | 'ocr') {
    this.generateInspection(type);
  }

  private generateInspection(forceType?: 'pass' | 'crack' | 'dimension' | 'ocr') {
    const id = `HT${this.billetCounter++}`;
    const timestamp = new Date().toISOString();

    let status: InspectionStatus = 'PASS';
    let defect = 'None';
    let cat: DefectCategory | 'None' = 'None';
    let detail: string | undefined = undefined;
    let width = 150.0 + (Math.random() - 0.5) * 2.0;
    let height = 150.0 + (Math.random() - 0.5) * 2.0;
    let length = 8120 + Math.round((Math.random() - 0.5) * 20);
    let conf = 0.96 + Math.random() * 0.03;

    if (forceType === 'crack' || (!forceType && Math.random() < 0.09)) {
      status = 'REWORK';
      defect = 'Longitudinal Crack Detected';
      cat = 'Crack';
      conf = 0.94;
      detail = 'Confidence 94%';
    } else if (forceType === 'dimension' || (!forceType && Math.random() < 0.07)) {
      status = 'FAIL';
      defect = 'Width Out of Tolerance';
      cat = 'Dimension';
      width = 154.4;
      detail = 'Measured 154.4 mm. Limit 148 – 152 mm';
    } else if (forceType === 'ocr' || (!forceType && Math.random() < 0.05)) {
      status = 'REVIEW';
      defect = 'OCR Low Confidence';
      cat = 'OCR';
      conf = 0.81;
      detail = 'Confidence 81%';
    }

    const event: InspectionEvent = {
      eventId: generateUUID(),
      billetId: id,
      timestamp,
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
    };

    this.history.unshift(event);
    if (this.history.length > 200) {
      this.history.pop();
    }

    this.inspectionListeners.forEach((listener) => listener(event));

    if (status !== 'PASS') {
      const alert: AlertItem = {
        id: generateUUID(),
        eventId: event.eventId,
        billetId: event.billetId,
        timestamp,
        title: defect,
        detail: detail ?? `Confidence ${Math.round(conf * 100)}%`,
        status,
        severity: status === 'FAIL' ? 'high' : 'medium',
      };
      this.alerts.unshift(alert);
      if (this.alerts.length > 50) {
        this.alerts.pop();
      }
      this.alertListeners.forEach((listener) => listener(alert));
    }
  }

  public subscribeInspection(listener: InspectionListener): () => void {
    this.inspectionListeners.add(listener);
    return () => this.inspectionListeners.delete(listener);
  }

  public subscribeAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public getHistory(): InspectionEvent[] {
    return [...this.history];
  }

  public getAlerts(): AlertItem[] {
    return [...this.alerts];
  }

  public getCurrentInspection(): InspectionEvent {
    return this.history[0] ?? {
      eventId: generateUUID(),
      billetId: 'HT24051',
      timestamp: new Date().toISOString(),
      lengthMm: 8120,
      widthMm: 150.8,
      heightMm: 151.2,
      defect: 'None',
      defectCategory: 'None',
      confidence: 0.98,
      status: 'PASS',
      boundingBox: { x: 0.22, y: 0.24, width: 0.42, height: 0.38 },
    };
  }
}

export const simulationEngine = new SimulationEngine();
