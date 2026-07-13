import React from 'react';
import { useTranslation } from 'react-i18next';
import { isLive, type Capability } from '../../services/liveness';

// ────────────────────────────────────────────────────────────────────────────
// LivenessPill — the shared honest-render marker for FULL PAGES.
//
// The page-level equivalent of ExpandableWidget's private `HonestyDot`, extracted
// so a page (not just a dashboard widget) can render the ONE authority's verdict.
// Honesty is DERIVED: the only input is `capability` → `isLive(capability)`. Green
// ("Live") is therefore STRUCTURALLY UNREACHABLE for a SIMULATED/SPEC capability —
// there is no boolean a caller can pass to force it. A SIMULATED capability can
// only ever render the amber "Sample" marker.
//
// This seeds the F0.6-FIND-01 sweep: the hand-rolled `<StatusPill>Sample data</…>`
// literals scattered across pages (Marketplace, SupplierPerformance, …) migrate
// onto this primitive so every page marker reads the registry, not a JSX literal.
// ────────────────────────────────────────────────────────────────────────────

const LivenessPill: React.FC<{ capability: Capability; className?: string }> = ({
  capability,
  className = '',
}) => {
  const { t } = useTranslation();
  const live = isLive(capability);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
        live ? 'text-success' : 'text-warning-hover'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          live ? 'bg-success' : 'border border-warning'
        }`}
      />
      {live ? t('widget.honesty.live') : t('widget.honesty.sample')}
    </span>
  );
};

export default LivenessPill;
