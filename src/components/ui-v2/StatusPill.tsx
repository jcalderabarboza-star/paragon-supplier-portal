import React from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusPillProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<Variant, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-bg-hover text-text-secondary',
};

const StatusPill: React.FC<StatusPillProps> = ({
  variant = 'neutral',
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default StatusPill;
