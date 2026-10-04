import type { Request, Response } from 'express';
import { inspectionService } from '../services/inspection-service.js';
import { realtimeManager } from '../realtime/websocket-server.js';

export const getInspections = (req: Request, res: Response) => {
  const limit = Math.min(200, parseInt((req.query.limit as string) || '50', 10));
  const offset = parseInt((req.query.offset as string) || '0', 10);
  const result = inspectionService.getInspections(limit, offset);
  res.json(result);
};

export const getAlerts = (req: Request, res: Response) => {
  const limit = Math.min(50, parseInt((req.query.limit as string) || '10', 10));
  const result = inspectionService.getAlerts(limit);
  res.json(result);
};

export const getCurrentInspection = (_req: Request, res: Response) => {
  const current = inspectionService.getCurrent();
  res.json({ data: current });
};

export const ingestInspection = (req: Request, res: Response) => {
  const event = inspectionService.ingestEvent(req.body);
  realtimeManager.broadcast('NEW_INSPECTION', event);
  res.status(201).json({ data: event });
};

export const calibrateCamera = async (req: Request, res: Response) => {
  try {
    const { reference_width_mm, roi } = req.body;
    const response = await fetch('http://localhost:8003/calibrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reference_width_mm: reference_width_mm || 150.0, roi }),
    });
    
    const data = await response.json().catch(() => null);
    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json(data || { error: `Decision engine returned status ${response.status}` });
    }
  } catch (error) {
    console.error('Calibration proxy error:', error);
    res.status(502).json({ error: 'Failed to reach decision-engine on port 8003 for calibration' });
  }
};

export const getHealth = (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'hawkeye-api',
  });
};
