import { Router } from 'express';
import {
  getInspections,
  getAlerts,
  getCurrentInspection,
  ingestInspection,
  calibrateCamera,
  getHealth,
} from '../controllers/inspection-controller.js';

export const apiRouter = Router();

apiRouter.get('/health', getHealth);
apiRouter.get('/inspections', getInspections);
apiRouter.get('/inspections/current', getCurrentInspection);
apiRouter.get('/alerts', getAlerts);
apiRouter.post('/inspections/ingest', ingestInspection);
apiRouter.post('/calibrate', calibrateCamera);
