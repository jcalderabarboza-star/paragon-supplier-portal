import React from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import { verbOf, entityVerbOf } from './flowLayout';
import type { TransitionView } from '../../services/transitions/catalogView';

// ────────────────────────────────────────────────────────────────────────────
// The flags the page DERIVES for a transition — records a fact, SAP boundary,
// fans out, fired by. Lifted out of the transitions table's last column at G1
// so the guide's "Exception flags" tab renders the same pills beside the
// guide's own flags, from the same code (Design 5 §B.2). Unchanged otherwise.
// ────────────────────────────────────────────────────────────────────────────

/** Does this transition carry any derived flag? */
export const hasDerivedFlags = (tv: TransitionView): boolean =>
  tv.recordsFact || tv.sapBoundary || tv.fansOutTo.length > 0 || tv.def.trigger === 'cascade';

const DerivedFlags: React.FC<{ tv: TransitionView }> = ({ tv }) => {
  const { t } = useTranslation();
  const { def } = tv;
  return (
    <span className="flex flex-wrap gap-1">
      {tv.recordsFact && (
        <StatusPill variant="neutral" className="text-[10px]">
          {t('processFlows.flag.recordsFact')}
        </StatusPill>
      )}
      {tv.sapBoundary && (
        <StatusPill variant="info" className="text-[10px]">
          {t('processFlows.flag.sapBoundary', { state: tv.settlesTo })}
        </StatusPill>
      )}
      {tv.fansOutTo.map((link) => (
        <StatusPill key={link.targetTransitionId} variant="info" className="text-[10px]">
          {t('processFlows.flag.fansOut', {
            entity: link.targetEntity,
            verb: verbOf(link.targetTransitionId),
          })}
        </StatusPill>
      ))}
      {def.trigger === 'cascade' && (
        <StatusPill
          variant={tv.firedBy.length > 0 ? 'info' : 'warning'}
          className="text-[10px]"
        >
          {tv.firedBy.length > 0
            ? // ⚠️ ENTITY-QUALIFIED (C.2). A cascade source lives on ANOTHER
              // machine, so a bare verb here can collide with a transition
              // in THIS table — measured on three of the five rows that
              // render this pill. Same form the `fansOut` pill above already
              // uses, so both directions of one relationship read alike. The
              // i18n key is untouched: only the value in `{{sources}}`
              // changed, so EN and ID needed no new string.
              t('processFlows.flag.firedBy', {
                sources: tv.firedBy.map(entityVerbOf).join(', '),
              })
            : t('processFlows.flag.firedByNothing')}
        </StatusPill>
      )}
    </span>
  );
};

export default DerivedFlags;
