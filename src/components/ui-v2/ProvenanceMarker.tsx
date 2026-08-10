import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  feedProvenance,
  dispatchesCommands,
  readinessNote,
  type Capability,
} from '../../services/liveness';

// ────────────────────────────────────────────────────────────────────────────
// ProvenanceMarker (D-CENSUS-8) — the TWO-AXIS honest-render marker.
//
// `LivenessPill` answers one question with one token, which is right for a
// read-only surface. It is WRONG for the seven routes the census named: on
// /supplier/orders a Confirm really dispatches through a wired CommandTarget,
// mutates the store and writes the DR-10 trail — over orders that are frozen
// fixtures. A flat amber "Sample" tells the reader the button is theatre when it
// is not; a green "Live" tells them the data is real when it is not. Averaging
// the two into one token picks which lie to tell.
//
// So this renders both axes, separately labelled:
//   · FEED — where the data on screen comes from (amber "Sample data" today).
//   · VERB — whether acting here really does something (a distinct, NON-green
//     info token: "Commands dispatch — in-memory ledger").
//
// HONEST BY CONSTRUCTION, same as LivenessPill: the only input is `capability`.
// Both axes are looked up (`feedProvenance` / `dispatchesCommands`) — there is no
// boolean a caller can pass to claim either one. A page cannot assert that its
// own buttons work; unwire the target and the verb axis disappears with no edit
// here.
//
// DELIBERATELY NOT GREEN. The verb axis uses the `info` token, not `success`.
// Green is reserved for `isLive` — both gates, real feed included — and this
// marker never satisfies gate-2. A reader who has learned "green = real data"
// must not be taught a second, weaker green.
// ────────────────────────────────────────────────────────────────────────────

const ProvenanceMarker: React.FC<{
  capability: Capability;
  className?: string;
}> = ({ capability, className = '' }) => {
  const { t } = useTranslation();
  const fixture = feedProvenance(capability) === 'FIXTURE';
  const dispatches = dispatchesCommands(capability);
  // A harvest-gated capability already names its SPECIFIC waiting state ("Sample
  // — awaiting live supplier feed"); reuse it rather than flattening to the
  // generic token. One authority for the text, as I3.3 established.
  const note = readinessNote(capability);
  const feedLabel = note
    ? t(note.readinessNoteKey)
    : t('widget.honesty.sample');

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}
    >
      {fixture && (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-warning-hover">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full border border-warning"
          />
          {feedLabel}
        </span>
      )}
      {dispatches && (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-info">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-sm bg-info"
          />
          {t('widget.honesty.commandsDispatch')}
        </span>
      )}
    </span>
  );
};

export default ProvenanceMarker;
