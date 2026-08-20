import React from 'react';
import { useTranslation } from 'react-i18next';
import type { VerbAvailability } from '../../services/transitions/handoff';
import { ownerLabelKeys } from '../../services/transitions/handoff';

// ─────────────────────────────────────────────────────────────────────────────
// THE WAIT, RENDERED. The operator's binding constraint, as one component.
//
//   > A verb a user's role does not hold shows as PENDING WITH AN OWNER —
//   > "Awaiting Finance" — NEVER AS AN ABSENT AFFORDANCE.
//
// ⚠️ **IT RENDERS TEXT, NOT A DISABLED BUTTON, AND THAT IS THE POINT.** A
// disabled button says "you may not"; it does not say WHO MAY, and to a
// screen-reader or a text sweep it is nearly indistinguishable from an absent
// one. This carries the owner's name, so a procurement user reads that payment
// is finance's next act rather than that nothing is happening — the difference
// between a clean process boundary and finance being an invisible bottleneck.
//
// ⚠️ **`unowned` GETS DIFFERENT COPY, DELIBERATELY.** "Awaiting <nobody>" is
// worse than silence: it promises an act that will never come. An `unowned`
// verb reaching a human surface is a FINDING (a machine act on the wrong
// screen, or a gap in the bundles), so it says so plainly instead of
// manufacturing an owner — the same reason `nextActorFrom` keeps `stranded`
// apart from `ended`.
//
// DP-2: this is state, not decoration — muted neutral text, no semantic colour.
// Nothing here informs a decision the user can act on, so nothing here is
// coloured (`DP-2`: if a chip's colour doesn't inform a decision, it goes
// neutral).
// ─────────────────────────────────────────────────────────────────────────────

export const HandoffNotice: React.FC<{
  availability: VerbAvailability;
  /** Distinguishes multiple notices on one surface in a test sweep. */
  testId?: string;
}> = ({ availability, testId = 'handoff-notice' }) => {
  const { t } = useTranslation();
  if (availability.kind === 'held') return null;

  if (availability.kind === 'unowned') {
    return (
      <span
        className="text-xs text-text-tertiary self-center"
        data-testid={testId}
        data-handoff="unowned"
      >
        {t('roles.handoff.unowned')}
      </span>
    );
  }

  // The owners, named. More than one is legitimate (an atom may sit in two
  // bundles) and reads as a list rather than as a picked winner — choosing one
  // would be the surface deciding something the machine did not.
  const owner = ownerLabelKeys(availability.owners)
    .map((k) => t(k))
    .join(' / ');

  return (
    <span
      className="text-xs text-text-tertiary self-center"
      data-testid={testId}
      data-handoff="withheld"
      title={t('roles.handoff.awaitingHint')}
    >
      {t('roles.handoff.awaiting', { owner })}
    </span>
  );
};

export default HandoffNotice;
