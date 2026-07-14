import React from 'react';
import { useTranslation } from 'react-i18next';
import { isLive, readinessNote, type Capability } from '../../services/liveness';

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
//
// WAITING-STATE (I3.3): for a harvest-gated capability the registry supplies a
// readiness note (the ONE authority), so the marker reads the SPECIFIC honest text
// "Sample — awaiting Track-R harvest" rather than the generic "Sample". Still
// SIMULATED, still amber — green stays structurally unreachable.
// ────────────────────────────────────────────────────────────────────────────

const LivenessPill: React.FC<{ capability: Capability; className?: string }> = ({
  capability,
  className = '',
}) => {
  const { t } = useTranslation();
  const live = isLive(capability);
  // A non-live, harvest-gated capability names its specific waiting-state; every
  // other SIMULATED capability keeps the generic "Sample". (Never shown when live.)
  const note = live ? null : readinessNote(capability);
  const label = live
    ? t('widget.honesty.live')
    : note
      ? t(note.readinessNoteKey)
      : t('widget.honesty.sample');
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
      {label}
    </span>
  );
};

export default LivenessPill;
