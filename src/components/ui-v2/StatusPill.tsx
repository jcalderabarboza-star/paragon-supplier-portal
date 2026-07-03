import React from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusPillProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

// DP-3 (TMS alignment): quiet outlined chips — soft tint background, a thin
// matching-hue border, a small radius, and no solid saturated fills. The soft
// tint + colored text carry the DP-2 semantic; the border + tight radius give
// the TMS "quiet" grammar. All 110 StatusPill sites inherit this centrally.
const VARIANT_CLASS: Record<Variant, string> = {
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-info-soft text-info border-info/30',
  neutral: 'bg-bg-hover text-text-secondary border-border-subtle',
};

const StatusPill: React.FC<StatusPillProps> = ({
  variant = 'neutral',
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default StatusPill;
