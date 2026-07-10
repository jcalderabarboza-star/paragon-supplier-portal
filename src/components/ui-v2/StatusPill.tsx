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
// the TMS "quiet" grammar. All StatusPill sites inherit this centrally.
//
// DP3-FONT-01 chip mapping (ratified): the five canonical tones are
// positive=success, caution=warning, critical=danger, info, neutral. `info` is
// the #0070F2 action-blue family (informational statuses align with the blue
// system) — action-soft fill + action border, with action-hover text for AA
// (4.76:1 on soft; #0070F2 itself fails at ~3.6:1). Tone is resolved from the
// canonical table in src/lib/statusTone.ts — StatusPill never string-matches.
const VARIANT_CLASS: Record<Variant, string> = {
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning-hover border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-action-soft text-action-hover border-action/40',
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
