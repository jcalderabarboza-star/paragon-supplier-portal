import React from 'react';
import { FlaskConical } from 'lucide-react';
import { isLive, type Capability } from '../../services/liveness';
import LivenessPill from './LivenessPill';

// ────────────────────────────────────────────────────────────────────────────
// IllustrativeRegion — the REGION-scoped honest-render enclosure (CP-0 · W2).
//
// LivenessPill marks a whole PAGE; ModelMarker marks a single FIGURE. Neither
// covers the case this solves: a page whose body is a demonstration of a
// real-later capability — content that is the SPECIFICATION for what a Stage-2
// computation will one day derive, rendered today from authored fixtures. A
// page-level "Sample" pill sitting above such a body is actively harmful: it
// reads as a scoped caveat on the chrome and lends borrowed credibility to the
// invented figures beneath it. The honesty has to travel WITH the content.
//
// So the marker is an enclosure, not a badge: a dashed-border container with a
// labelled header strip. Dashed = "authored, not observed" (the same grammar
// ModelMarker uses for "computed, not measured"), and the enclosure survives a
// screenshot — a stakeholder scrolling the page sees every fabricated region
// framed, top to bottom, not one caveat at the top.
//
// DERIVED, never asserted: the only input is `capability` → `isLive()`. There is
// no boolean a caller can pass to suppress the frame, and when the capability
// genuinely flips LIVE the frame disappears on its own — the content stops being
// illustrative at exactly the moment it stops being illustrative. The header also
// carries the shared LivenessPill so every region reads the ONE authority rather
// than a hand-rolled literal.
//
// Colour is deliberately NEUTRAL (dashed border + light header band), not
// semantic: "illustrative" is an epistemic fact about the data's provenance, not
// a risk/warning state, and DP-2 reserves semantic colour for true state. The
// amber lives only in the LivenessPill it hosts.
// ────────────────────────────────────────────────────────────────────────────

const IllustrativeRegion: React.FC<{
  capability: Capability;
  /** The honest, region-specific caption (i18n'd by the caller). */
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ capability, label, children, className = '' }) => {
  // Live data needs no frame — and this is the ONLY way the frame comes off.
  if (isLive(capability)) return <>{children}</>;
  return (
    <section
      data-illustrative-region={capability}
      className={`rounded-lg border border-dashed border-border-input ${className}`}
    >
      <div className="flex items-center gap-2 flex-wrap px-4 py-2 bg-bg-hover border-b border-dashed border-border-input rounded-t-lg">
        <FlaskConical size={12} aria-hidden="true" className="text-text-tertiary shrink-0" />
        <span className="text-label uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        <LivenessPill capability={capability} className="ml-auto" />
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
};

export default IllustrativeRegion;
