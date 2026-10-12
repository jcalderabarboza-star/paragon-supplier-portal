// ────────────────────────────────────────────────────────────────────────────
// PG-2 · PlanPushControls — the planned-changes drawer's footer: the push, with
// its reason asked first. A file of its own because it holds the drawer's ONE
// solid button, and `solidButtonRetired.guard` holds where such a file is
// mounted — inside a container, by name.
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import { FormField, TextInput } from '../../components/ui-v2/Form';
import { formatNumber } from '../../lib/format';
import { usePushTargets } from './PlannedChangesPanel';

/**
 * PG-2 · THE PUSH, WITH ITS REASON ASKED FIRST — the drawer's footer.
 *
 * Measured at R-PG: every edited line pushed was refused "a reason is
 * required" and none committed, because the reason was asked only after the
 * push had failed. Where a row of the push owes a reason and has none, the
 * footer shows ONE field for it beside the buttons; a push with the field empty
 * sends nothing and says so; with a reason written it goes onto each such row
 * and they are pushed in the same act. A row whose reason the planner already
 * wrote keeps its own.
 */
const PlanPushControls: React.FC<{
  selectedRefs: readonly string[];
  /** Changes each time the bar sends the planner here for a reason: the field takes focus. */
  asked?: number;
}> = ({ selectedRefs, asked = 0 }) => {
  const { t } = useTranslation();
  const push = usePushTargets(selectedRefs);
  const [reason, setReason] = useState('');
  const [refused, setRefused] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const owed = push.missing(push.plannedRefs);
  useEffect(() => {
    if (asked > 0 && owed > 0) {
      setRefused(true);
      fieldRef.current?.focus();
    }
    // only a NEW ask moves focus — not every keystroke that changes `owed`
  }, [asked]);
  if (!push.api) return null;
  const api = push.api;
  const send = (refs: readonly string[]) => {
    if (push.missing(refs) > 0 && reason.trim() === '') {
      setRefused(true);
      fieldRef.current?.focus();
      return;
    }
    setRefused(false);
    void api.pushWithReason(refs, reason);
  };
  return (
    <div className="flex w-full flex-wrap items-end justify-end gap-3" data-testid="plan-push-controls">
      {owed > 0 && (
        <FormField
          label={t('planGrid.edit.push.reasonAsk', { count: owed, n: formatNumber(owed) })}
          hint={t('planGrid.edit.push.reasonHelp')}
          error={refused && reason.trim() === '' ? t('planGrid.edit.push.reasonFirst') : undefined}
          className="min-w-[18rem] flex-1"
        >
          <TextInput
            ref={fieldRef}
            type="text"
            data-testid="plan-push-reason"
            placeholder={t('planGrid.push.reasonPlaceholder')}
            value={reason}
            disabled={push.pushing}
            onChange={(ev) => setReason(ev.target.value)}
          />
        </FormField>
      )}
      <Button
        variant="secondary"
        disabled={push.pushing || push.selected.length === 0}
        onClick={() => send(push.selected)}
        data-testid="plan-push-selection"
      >
        {t('planGrid.edit.push.selection', { n: formatNumber(push.selected.length) })}
      </Button>
      <Button
        variant="primary"
        disabled={push.pushing || push.plannedRefs.length === 0}
        onClick={() => send(push.plannedRefs)}
        data-testid="plan-push-all"
      >
        {push.pushing ? t('planGrid.push.pushing') : t('planGrid.edit.push.all', { n: formatNumber(push.plannedRefs.length) })}
      </Button>
    </div>
  );
};

export default PlanPushControls;
