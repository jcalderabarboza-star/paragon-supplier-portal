import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '../ui-v2/Dialog';
import Button from '../ui-v2/Button';
import { FormField, TextInput } from '../ui-v2/Form';
import { registerBypassReasonPrompt } from '../../services/identity/bypassReasonPrompt';
import { BYPASS_REASON_MAX, readBypassReason } from '../../services/identity/superAdmin';

// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 · THE SUPER ADMIN REASON PROMPT. Mounted once by the router.
//
// The command seam asks through `registerBypassReasonPrompt` when a Super Admin
// act passed a four-eyes check and stated no reason. This names the check, takes
// one line, and hands it back; Cancel (or Escape) hands back nothing and the
// act stays refused.
//
// The Confirm button reads the SAME predicate the dispatcher does
// (`readBypassReason`), so a reason this accepts is one the dispatcher records.
// ─────────────────────────────────────────────────────────────────────────────

/** The label key for a refusal head, or the fallback that still names it. */
export function bypassRuleLabel(
  rule: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
  exists: (key: string) => boolean,
): string {
  const key = `superAdmin.rule.${rule}`;
  return exists(key) ? t(key) : t('superAdmin.rule.unknown', { rule });
}

const BypassReasonDialog: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [rules, setRules] = useState<readonly string[] | null>(null);
  const [reason, setReason] = useState('');
  const settle = useRef<((value: string | null) => void) | null>(null);

  useEffect(
    () =>
      registerBypassReasonPrompt(
        (asked) =>
          new Promise<string | null>((resolve) => {
            // A second ask while one is open cancels the first: one act at a time.
            settle.current?.(null);
            settle.current = resolve;
            setReason('');
            setRules(asked);
          }),
      ),
    [],
  );

  const finish = (value: string | null): void => {
    settle.current?.(value);
    settle.current = null;
    setRules(null);
  };

  const read = readBypassReason(reason);

  return (
    <Dialog
      open={rules !== null}
      onClose={() => finish(null)}
      title={t('superAdmin.reason.title')}
      testId="bypass-reason-dialog"
      widthClass="max-w-lg"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (read !== null) finish(read);
        }}
      >
        <p className="text-sm text-text-secondary">{t('superAdmin.reason.intro')}</p>
        <div>
          <div className="text-xs text-text-tertiary">{t('superAdmin.reason.rules')}</div>
          <ul className="mt-1 flex flex-col gap-1" data-testid="bypass-reason-rules">
            {(rules ?? []).map((rule) => (
              <li key={rule} className="text-sm text-text-primary">
                {bypassRuleLabel(rule, t, (k) => i18n.exists(k))}
              </li>
            ))}
          </ul>
        </div>
        <FormField
          label={t('superAdmin.reason.label')}
          hint={t('superAdmin.reason.limit', { max: BYPASS_REASON_MAX })}
        >
          <TextInput
            type="text"
            value={reason}
            maxLength={BYPASS_REASON_MAX}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('superAdmin.reason.placeholder')}
            data-testid="bypass-reason-input"
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => finish(null)} data-testid="bypass-reason-cancel">
            {t('superAdmin.reason.cancel')}
          </Button>
          <Button type="submit" variant="outline" disabled={read === null} data-testid="bypass-reason-confirm">
            {t('superAdmin.reason.confirm')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default BypassReasonDialog;
