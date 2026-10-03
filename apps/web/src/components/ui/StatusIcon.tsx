import React from 'react';
import { CircleCheck, CircleX, RotateCcw, Eye } from 'lucide-react';
import type { InspectionStatus } from '@hawkeye/shared';

interface StatusIconProps {
  status: InspectionStatus;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export const StatusIcon: React.FC<StatusIconProps> = ({
  status,
  size = 20,
  className = '',
  strokeWidth = 1.75,
}) => {
  switch (status) {
    case 'PASS':
      return <CircleCheck size={size} strokeWidth={strokeWidth} className={className} aria-label="Pass" />;
    case 'FAIL':
      return <CircleX size={size} strokeWidth={strokeWidth} className={className} aria-label="Fail" />;
    case 'REWORK':
      return <RotateCcw size={size} strokeWidth={strokeWidth} className={className} aria-label="Rework" />;
    case 'REVIEW':
      return <Eye size={size} strokeWidth={strokeWidth} className={className} aria-label="Review" />;
  }
};
