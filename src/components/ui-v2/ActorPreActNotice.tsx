import React from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { personLabel } from '../../services/identity/personLabel';

// ─────────────────────────────────────────────────────────────────────────────
// THE PRE-ACT NOTICE — what a surface says about WHO is about to be recorded,
// BEFORE the act.
//
// ⚠️ **ONE COMPONENT, BECAUSE THE SENTENCE HAD TO CHANGE IN FIVE PLACES AND
// WOULD HAVE TO CHANGE AGAIN.** Five surfaces each carried their own line
// saying *"Paragon has no signed-in identity yet"*. That sentence is TRUE when
// no sample user is selected and FALSE the moment one is — and five independent
// copies is five chances for the sixth surface to keep saying the old thing.
//
// ⚠️ **THE UNATTRIBUTED ARM IS UNCHANGED, DELIBERATELY** (operator ruling). Each
// caller keeps passing its OWN key, because the existing lines are lane-specific
// and were written for their lane — *"This request will be recorded against no
// person"* reads differently from *"This decision will be recorded without an
// identified person"*, and collapsing them into one generic sentence would be a
// copy regression wearing a refactor's clothes. What is shared is the SAMPLE
// arm, which is the arm that did not exist before.
//
// ⚠️ **AND IT NAMES THE PERSON THROUGH `personLabel`**, so the "(SAMPLE)" marker
// is attached by the same resolver every rendered person goes through. A notice
// that said "recorded against Procurement 1" without the marker would be the
// one place in the portal a sample identity reads as a real one.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** The lane's own copy for "no person in session". Kept per-caller on purpose. */
  readonly unattributedKey: string;
  readonly className?: string;
  readonly testId?: string;
}

const ActorPreActNotice: React.FC<Props> = ({
  unattributedKey,
  // i18n-defer: a Tailwind class list, not copy. No reader ever sees these
  // characters — they name the tone this notice inherits from the five callers
  // that used to render the line inline, so the default keeps those surfaces
  // byte-identical to what they had.
  className = 'text-xs text-text-tertiary',
  testId = 'actor-pre-act-notice',
}) => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();

  if (identity.actor.kind !== 'RESOLVED') {
    return (
      <p className={className} data-testid={testId}>
        {t(unattributedKey)}
      </p>
    );
  }
  return (
    <p className={className} data-testid={`${testId}-sample`}>
      {t('identity.preAct.sample', {
        label: personLabel(identity.actor.person.personId, t),
      })}
    </p>
  );
};

export default ActorPreActNotice;
