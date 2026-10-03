import {
  DIMENSION_TOLERANCES,
  type InspectionEvent,
  type InspectionStatus,
} from '@hawkeye/shared';

export interface ToleranceCheckResult {
  widthViolation: boolean;
  widthLimitText?: string;
  heightViolation: boolean;
  heightLimitText?: string;
  lengthViolation: boolean;
  lengthLimitText?: string;
  confidenceViolation: boolean;
}

export function checkTolerances(event: Pick<InspectionEvent, 'widthMm' | 'heightMm' | 'lengthMm' | 'confidence'>): ToleranceCheckResult {
  const widthViolation =
    event.widthMm < DIMENSION_TOLERANCES.width.min ||
    event.widthMm > DIMENSION_TOLERANCES.width.max;

  const heightViolation =
    event.heightMm < DIMENSION_TOLERANCES.height.min ||
    event.heightMm > DIMENSION_TOLERANCES.height.max;

  const lengthViolation =
    event.lengthMm < DIMENSION_TOLERANCES.length.min ||
    event.lengthMm > DIMENSION_TOLERANCES.length.max;

  const confidenceViolation = event.confidence < DIMENSION_TOLERANCES.minConfidence;

  return {
    widthViolation,
    widthLimitText: `Limit ${DIMENSION_TOLERANCES.width.min} – ${DIMENSION_TOLERANCES.width.max} mm`,
    heightViolation,
    heightLimitText: `Limit ${DIMENSION_TOLERANCES.height.min} – ${DIMENSION_TOLERANCES.height.max} mm`,
    lengthViolation,
    lengthLimitText: `Limit ${DIMENSION_TOLERANCES.length.min} – ${DIMENSION_TOLERANCES.length.max} mm`,
    confidenceViolation,
  };
}

export function getStatusText(status: InspectionStatus): string {
  switch (status) {
    case 'PASS':
      return 'PASS';
    case 'FAIL':
      return 'FAIL';
    case 'REWORK':
      return 'REWORK';
    case 'REVIEW':
      return 'REVIEW';
  }
}
