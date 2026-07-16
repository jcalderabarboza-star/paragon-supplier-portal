import React from 'react';
import { Sigma } from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// ModelMarker — the epistemic-axis honest-render token (CI-2, build-plan §2).
//
// A modeled figure (a should-cost, a spread) is PERMANENTLY modeled — regardless
// of how live its feed is. That epistemic fact needs its own marker, DISTINCT
// from two neighbours it must never be confused with:
//   • the OBSERVED data grammar (DP-3 mono + data-navy) — a modeled number must
//     never wear it, or a screenshot would read the model as a hard fact;
//   • the feed-liveness pill (LivenessPill "Sample", amber dot) — that is the
//     ORTHOGONAL axis (how live the feed is), not whether the number is modeled.
//
// So the marker is deliberately its own shape: a Σ (the basket-sum formula) in a
// DASHED muted-neutral pill. Dashed = "computed, not measured" — it survives a
// screenshot and cannot be mistaken for a solid-border status chip or a live dot.
// Label/title are passed in so the component stays i18n-agnostic and reusable.
// ────────────────────────────────────────────────────────────────────────────

const ModelMarker: React.FC<{
  label: string;
  title?: string;
  className?: string;
}> = ({ label, title, className = '' }) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-text-secondary border border-dashed border-border-input rounded px-1 py-px ${className}`}
  >
    <Sigma size={9} aria-hidden="true" />
    {label}
  </span>
);

export default ModelMarker;
