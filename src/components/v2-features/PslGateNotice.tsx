import React from 'react';
import { useTranslation } from 'react-i18next';

import { statusLabelKey } from '../../lib/statusLabel';
import {
  COMPETITION_FLOOR_INVITEES,
  type SourcingDecision,
} from '../../services/data/rfqSourcingGate';

// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE SOURCING GATE HAS DECIDED, IN WORDS — the surface half of P2.
//
// ⚠️ **THIS IS A MIRROR, NOT A GATE.** Every sentence here is rendered from a
// `SourcingDecision` the caller obtained from `decideSourcing` — the SAME pure
// function the policy hooks call. Nothing is re-derived and nothing is decided:
// if this component and the hooks ever disagreed, one of them would be wrong,
// and there is only one place for them to disagree from.
//
// The precedent is `handlePinConfirm` / `rfq_fx_pin_well_formed`, and its own
// note is the reason this shape is used rather than a page-side rule: *"the
// dialog's own button is already disabled on a refusal; this is the structural
// twin, so a keyboard or a future caller cannot route around it."*
//
// ── ⚠️ WHY A MIRROR IS NEEDED AT ALL, WHICH IS NOT OBVIOUS ─────────────────
//   `PolicyDecision` is `{ ok, reason? }` and the dispatcher reads `reason`
//   ONLY on a refusal. So the operator's ruling — *exactly two invitees is
//   ALLOWED, with a visible note that three is the standard* — has no channel
//   through the hook at all. `AT_FLOOR` can only ever be said here.
//
//   And the floor refusal needs a mirror for a different reason: **nothing in
//   this platform can add an invitee to an RFQ that already exists.** Derived:
//   `invitedSupplierIds` is written once, at creation, and no verb edits it. A
//   buyer refused at publish would have to cancel the event and retype it, so
//   the refusal has to be said while the draft is still editable.
//
// ── ⚠️ WHAT IS DELIBERATELY NOT RENDERED ───────────────────────────────────
//   `SATISFIED` renders NOTHING. Three or more eligible invitees is the
//   ordinary case and the ruling says it passes silently; a reassurance on
//   every compliant event is noise that trains people to stop reading the line
//   that matters.
// ─────────────────────────────────────────────────────────────────────────────

/** A status word through the CENTRAL map, so it localises exactly once. */
function useStatusWord(): (canonical: string) => string {
  const { t } = useTranslation();
  return (canonical) => {
    const key = statusLabelKey(canonical);
    return key ? t(key) : canonical;
  };
}

const PslGateNotice: React.FC<{
  decision: SourcingDecision;
  /** Supplier display names, so a refusal can name a company and not an id. */
  nameOf?: (supplierId: string) => string;
}> = ({ decision, nameOf }) => {
  const { t } = useTranslation();
  const word = useStatusWord();
  const name = (id: string) => nameOf?.(id) ?? id;
  const { eligibility, exemption, competition } = decision;

  return (
    <div className="space-y-1.5" data-testid="psl-gate-notice">
      {eligibility.kind === 'INELIGIBLE_INVITEES' &&
        eligibility.offenders.map((o) => (
          <p
            key={o.supplierId}
            className="text-xs text-danger"
            data-testid="psl-gate-ineligible"
          >
            {t('psl.gate.ineligible', {
              supplier: name(o.supplierId),
              status: word(o.status),
            })}
          </p>
        ))}

      {competition.kind === 'NOT_REQUIRED' && (
        <p className="text-xs text-text-secondary" data-testid="psl-gate-not-required">
          {t('psl.gate.notRequired', {
            supplier: name(competition.exemption.supplierId),
            status: word(competition.exemption.status),
            code: competition.exemption.materialCode,
          })}
        </p>
      )}

      {competition.kind === 'AT_FLOOR' && (
        <p className="text-xs text-warning-hover" data-testid="psl-gate-at-floor">
          {t('psl.gate.atFloor')}
        </p>
      )}

      {competition.kind === 'UNDER_FLOOR' && (
        <p className="text-xs text-danger" data-testid="psl-gate-under-floor">
          {t('psl.gate.underFloor', {
            floor: COMPETITION_FLOOR_INVITEES,
            count: competition.eligible,
          })}
        </p>
      )}

      {/* ⚠️ AN UNDECIDABLE MATERIAL BLOCKS THE EXEMPTION, NOT THE EVENT
          (operator ruling). It is said in a NEUTRAL tone beside whatever the
          count verdict is, because the event is going ahead — reporting it as a
          problem would tell the buyer to fix something that is not broken. The
          codes are named, on the `FX_UNPINNED` precedent: a refusal that names
          what is missing is the difference between a remedy and a dead end. */}
      {exemption.kind === 'UNDECIDABLE' && (
        <p className="text-xs text-text-tertiary" data-testid="psl-gate-undecidable">
          {t('psl.gate.undecidable', { codes: exemption.codes.join(', ') })}
        </p>
      )}
    </div>
  );
};

export default PslGateNotice;
