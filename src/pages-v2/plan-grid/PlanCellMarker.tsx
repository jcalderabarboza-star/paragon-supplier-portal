import React from 'react';
import { useTranslation } from 'react-i18next';
import { isLive, type Capability } from '../../services/liveness';
import type { IntakePlanState } from './planGridModel';

// ────────────────────────────────────────────────────────────────────────────
// PlanCellMarker — the per-row honest-render chip (C6 §5 conjunction).
//
// Two independent tokens, neither allowed to mask the other:
//  · SOURCE TIER — read from the ONE registry authority (`isLive`). Green
//    ("Live") is reachable ONLY when the registry greens the capability; there
//    is NO prop a caller can pass to force it. For `purchaseRequisitions`
//    (gate-1 wired, gate-2 shut) `isLive` is false → this always renders the
//    amber "Simulated" — wiring alone never flips green (LIVENESS-DATASOURCE-01).
//  · PLAN STATE — the C6 overlay axis, a legitimate per-row value
//    (PLANNED / committed). Orthogonal to the source tier.
//
// This is the C6 §5 matrix rendered as a chip: SIMULATED × PLANNED, honestly.
// ────────────────────────────────────────────────────────────────────────────

const PlanCellMarker: React.FC<{
  capability: Capability;
  planState: IntakePlanState;
  className?: string;
}> = ({ capability, planState, className = '' }) => {
  const { t } = useTranslation();
  const live = isLive(capability); // registry authority — never a caller boolean
  const committed = planState === 'committed';

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Source tier — green only if the registry greens it */}
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
          live ? 'text-success' : 'text-warning-hover'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${
            live ? 'bg-success' : 'border border-warning'
          }`}
        />
        {t(live ? 'planGrid.tier.live' : 'planGrid.tier.simulated')}
      </span>
      <span aria-hidden="true" className="text-text-tertiary">·</span>
      {/* Plan state — the C6 overlay axis (per row) */}
      <span
        className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          committed
            ? 'border-border-subtle bg-bg-hover text-text-secondary'
            : 'border-info/30 bg-info-soft text-info'
        }`}
      >
        {t(committed ? 'planGrid.plan.committed' : 'planGrid.plan.planned')}
      </span>
    </span>
  );
};

export default PlanCellMarker;
