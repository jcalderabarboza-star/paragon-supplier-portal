import React from 'react';
import { targetStatus, TARGET_STATUS, TargetStatus } from '../../lib/chartPalette';

// DP2-TARGET-01 — the ONE target/KPI bar. Fill length = attainment (pct); a navy
// target-tick marks the target position. Colour comes from the central
// targetStatus() (meeting = green, near = DP2-WARN-01 amber, missing = red), and
// the meaning is carried by tick + fill position too, so it survives without
// colour (colourblind-safe). Replaces the per-page fixture-hex bars, the
// tailwind-variant ProgressBar, and the hand-assigned KPI colours.
interface TargetBarProps {
  /** Bar fill, 0–100 (attainment toward target on a shared axis). */
  pct: number;
  /** Target position, 0–100 — renders the tick. Omit for a plain state bar. */
  target?: number;
  /** How far below target still counts as "near" (default 10). */
  nearBand?: number;
  /** Override the derived state (e.g. when target isn't on the pct axis). */
  status?: TargetStatus;
  /** Track background — bars sit on different surfaces per page. */
  trackClass?: string;
  className?: string;
}

const TargetBar: React.FC<TargetBarProps> = ({
  pct,
  target,
  nearBand = 10,
  status,
  // i18n-defer: a Tailwind class name, not copy — it reaches `className`, never a reader.
  trackClass = 'bg-bg-hover',
  className = '',
}) => {
  const width = Math.min(Math.max(pct, 0), 100);
  const resolved =
    status ?? (target != null ? targetStatus(pct, target, nearBand) : 'meeting');
  const tickAt = target != null ? Math.min(Math.max(target, 0), 100) : null;
  return (
    <div className={`relative ${className}`}>
      <div className={`h-1.5 rounded-full overflow-hidden ${trackClass}`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${width}%`, backgroundColor: TARGET_STATUS[resolved].fill }}
        />
      </div>
      {tickAt != null && (
        <span
          aria-hidden="true"
          className="absolute inset-y-[-2px] w-0.5 rounded-sm bg-navy"
          style={{ left: `calc(${tickAt}% - 1px)` }}
        />
      )}
    </div>
  );
};

export default TargetBar;
