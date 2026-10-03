import { z } from 'zod';

export const INSPECTION_STATUSES = ['PASS', 'FAIL', 'REWORK', 'REVIEW'] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const DEFECT_CATEGORIES = ['Crack', 'Scratch', 'Dimension', 'OCR'] as const;
export type DefectCategory = (typeof DEFECT_CATEGORIES)[number];

export const DEFECT_TYPES = [
  'None',
  'Longitudinal Crack Detected',
  'Transverse Crack Detected',
  'Surface Scratch Detected',
  'Width Out of Tolerance',
  'Height Out of Tolerance',
  'Length Out of Tolerance',
  'OCR Low Confidence',
] as const;
export type DefectType = (typeof DEFECT_TYPES)[number];

export const BoundingBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const InspectionEventSchema = z.object({
  eventId: z.string().uuid(),
  billetId: z.string().min(1),
  timestamp: z.string().datetime(),
  lengthMm: z.number().positive(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  defect: z.string(),
  defectCategory: z.enum(['Crack', 'Scratch', 'Dimension', 'OCR', 'None']),
  defectDetail: z.string().optional(),
  confidence: z.number().min(0).max(1),
  status: z.enum(INSPECTION_STATUSES),
  boundingBox: BoundingBoxSchema,
  thumbnailUrl: z.string().optional(),
});
export type InspectionEvent = z.infer<typeof InspectionEventSchema>;

export const AlertItemSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  billetId: z.string(),
  timestamp: z.string().datetime(),
  title: z.string(),
  detail: z.string(),
  status: z.enum(INSPECTION_STATUSES),
  severity: z.enum(['high', 'medium', 'low']),
});
export type AlertItem = z.infer<typeof AlertItemSchema>;

export const DIMENSION_TOLERANCES = {
  width: { nominal: 150.0, min: 148.0, max: 152.0, unit: 'mm' },
  height: { nominal: 150.0, min: 148.0, max: 152.0, unit: 'mm' },
  length: { nominal: 8120.0, min: 8070.0, max: 8170.0, unit: 'mm' },
  minConfidence: 0.85,
} as const;
