import React from 'react';
import { useTranslation } from 'react-i18next';
import type { NextAct } from '../../services/transitions/nextAct';
import { ROLE_LABEL_KEY } from '../../services/transitions/handoff';
import { EXTERNAL_FACT_OWNER_KEY } from '../../lib/i18n/externalFactOwner';
import { NEXT_ACT_KEY } from '../../lib/i18n/nextAct';

// ─────────────────────────────────────────────────────────────────────────────
// WHO ACTS NEXT, RENDERED. One line, on a document, derived end to end.
//
// ⚠️ **THE STATE THIS EXISTS FOR IS THE ONE WHERE EVERYTHING ELSE IS SILENT.**
// A purchase order in `Confirmed` has no surfaceable exit, so it carries no
// button, no `HandoffNotice` (there is no atom to ask about) and no next-actor
// line (`nextActorFrom` returns `stranded`, which renders nothing). Both parties
// are waiting on an S/4HANA goods movement and the screen says so nowhere. This
// is the line that says it.
//
// ⚠️ **IT NEVER GRANTS, AND `mine` IS THE ARM TO WATCH.** `mine` states that the
// seat holds the atom for a verb legal from here — it does not unlock anything.
// Affordances stay gated by `useVerbAvailability` / the dispatcher, which check
// scope, required fields and every policy hook besides. A caller that renders a
// button off this line has moved the authorisation decision to a label.
//
// ⚠️ **THREE ARMS RENDER NOTHING AND THE COMPONENT MUST NOT BE "HELPFUL" ABOUT
// IT.** `ended` is over; `silent` is a state we cannot name honestly (operator
// ruling — the census carries it, this does not invent a sentence for it). A
// fallback string here would manufacture exactly the false comfort the register
// keeps catching.
//
// DP-2: this is state, not decoration — muted neutral text, no semantic colour.
// Nothing here informs a decision the reader can act on, so nothing is coloured.
// ─────────────────────────────────────────────────────────────────────────────

export const NextActLine: React.FC<{
  /**
   * `null` when no document is selected — the hook answers `null` rather than
   * guessing a state, and this renders nothing. Accepting the nullable type here
   * is what lets a caller keep the hook UNCONDITIONAL at the top of a component,
   * which is the only shape that is not a render-order bug when a drawer closes.
   */
  act: NextAct | null;
  /** Distinguishes multiple lines on one surface in a test sweep. */
  testId?: string;
}> = ({ act, testId = 'next-act' }) => {
  const { t } = useTranslation();
  if (act === null) return null;
  const key = NEXT_ACT_KEY[act.kind];

  // `theirs` renders through the handoff vocabulary rather than a second one.
  // More than one owner is legitimate (an atom may sit in two bundles) and reads
  // as a list — picking one would be the surface deciding what the machine did
  // not.
  if (act.kind === 'theirs') {
    const owner = act.owners.map((o) => t(ROLE_LABEL_KEY[o])).join(' / ');
    return (
      <span
        className="text-xs text-text-tertiary"
        data-testid={testId}
        data-next-act="theirs"
      >
        <span className="uppercase tracking-wider text-[10px] mr-1">{t('nextAct.label')}</span>
        {t('roles.handoff.awaiting', { owner })}
      </span>
    );
  }

  // `ended` · `silent` · `settling` — nothing, by decision. See `NEXT_ACT_KEY`'s
  // header; `settling` joined them at S2a, where it turned out to restate a
  // sentence both of its surfaces already render more specifically.
  if (key === null) return null;

  const text =
    act.kind === 'external'
      ? t(key, { owner: act.owners.map((o) => t(EXTERNAL_FACT_OWNER_KEY[o])).join(' / ') })
      : t(key);

  return (
    <span
      className="text-xs text-text-tertiary"
      data-testid={testId}
      data-next-act={act.kind}
    >
      <span className="uppercase tracking-wider text-[10px] mr-1">{t('nextAct.label')}</span>
      {text}
    </span>
  );
};

export default NextActLine;
