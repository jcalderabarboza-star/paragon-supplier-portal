// ─────────────────────────────────────────────────────────────────────────────
// PolicyEditor — the inline drawdown-tolerance editor (the THIRD write's surface).
//
// A buyer-only, contract-DA-tab-only affordance that re-points ONE item's ACTIVE
// tolerance ({tolerancePct, enforcement}) with a REQUIRED reason (an attributable
// deviation — honesty guard 4). Two knobs, prefilled by the CASE_B / CASE_C
// quick-picks (the same presets the ledger seeds) or edited freely. `block` is
// offered but LABELED "recorded — not yet enforced": it flags at the ledger exactly
// like `flag` today; the release-blocking seam is a later batch, so the label
// prevents over-promising. `contractDefault` is never editable — it is the immutable
// reference the deviation is measured against.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../ui-v2/Button';
import type { DrawdownEnforcement, TolerancePolicy } from '../../services/delivery';
import type { EditPolicyPatch } from '../../services/delivery';

const ENFORCEMENTS: readonly DrawdownEnforcement[] = ['flag', 'ignore', 'block'];

/** Percent (10) ⇄ fraction (0.10). Rendered as a whole/decimal percent; stored as
 *  a fraction on the policy. `null` fraction = unlimited (Case C). */
const toPct = (frac: number | null): string => (frac === null ? '' : String(frac * 100));

const PolicyEditor: React.FC<{
  active: TolerancePolicy;
  contractDefault: TolerancePolicy;
  deviation: boolean;
  pending: boolean;
  onSave: (patch: EditPolicyPatch) => void;
  onReset: () => void;
  onCancel: () => void;
}> = ({ active, contractDefault, deviation, pending, onSave, onReset, onCancel }) => {
  const { t } = useTranslation();
  const [unlimited, setUnlimited] = useState(active.tolerancePct === null);
  const [pct, setPct] = useState(toPct(active.tolerancePct));
  const [enforcement, setEnforcement] = useState<DrawdownEnforcement>(active.enforcement);
  const [reason, setReason] = useState('');

  const applyPreset = (preset: TolerancePolicy) => {
    setUnlimited(preset.tolerancePct === null);
    setPct(toPct(preset.tolerancePct));
    setEnforcement(preset.enforcement);
  };

  const tolerancePct = unlimited ? null : Number(pct) / 100;
  const pctInvalid = !unlimited && (pct.trim() === '' || Number.isNaN(Number(pct)) || Number(pct) < 0);
  const canSave = !pending && reason.trim().length > 0 && !pctInvalid;

  const fmtPolicy = (p: TolerancePolicy): string =>
    `${p.tolerancePct === null ? t('delivery.policy.edit.unlimited') : `${p.tolerancePct * 100}%`} · ${t(
      `delivery.policy.edit.enforcement.${p.enforcement}`,
    )}`;

  return (
    <div className="mt-3 rounded-lg border border-border-subtle bg-bg-hover px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label uppercase text-text-tertiary">
          {t('delivery.policy.edit.title')}
        </span>
        <span className="text-[10px] text-text-tertiary">
          {t('delivery.policy.edit.contractDefault', { policy: fmtPolicy(contractDefault) })}
        </span>
      </div>

      {/* Quick-picks — prefill the two knobs from the seeded presets. */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={() => applyPreset({ tolerancePct: 0.1, enforcement: 'flag' })}
        >
          {t('delivery.policy.edit.presetB')}
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={() => applyPreset({ tolerancePct: null, enforcement: 'ignore' })}
        >
          {t('delivery.policy.edit.presetC')}
        </Button>
      </div>

      {/* The two knobs (custom-editable; a quick-pick just prefills them). */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-text-tertiary" htmlFor="policy-tolerance">
            {t('delivery.policy.edit.tolerance')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="policy-tolerance"
              type="number"
              min={0}
              inputMode="decimal"
              value={unlimited ? '' : pct}
              disabled={unlimited || pending}
              onChange={(e) => setPct(e.target.value)}
              className="w-24 rounded-md border border-border-input bg-bg-surface px-2 py-1.5 text-sm text-text-primary disabled:opacity-50"
            />
            <span className="text-xs text-text-tertiary">%</span>
            <label className="flex items-center gap-1 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={unlimited}
                disabled={pending}
                onChange={(e) => setUnlimited(e.target.checked)}
              />
              {t('delivery.policy.edit.unlimited')}
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-text-tertiary" htmlFor="policy-enforcement">
            {t('delivery.policy.edit.enforcement')}
          </label>
          <select
            id="policy-enforcement"
            value={enforcement}
            disabled={pending}
            onChange={(e) => setEnforcement(e.target.value as DrawdownEnforcement)}
            className="rounded-md border border-border-input bg-bg-surface px-2 py-1.5 text-sm text-text-primary"
          >
            {ENFORCEMENTS.map((e) => (
              <option key={e} value={e}>
                {t(`delivery.policy.edit.enforcement.${e}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Required reason — an unattributable deviation is refused at the service. */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase text-text-tertiary" htmlFor="policy-reason">
          {t('delivery.policy.edit.reason')}
        </label>
        <input
          id="policy-reason"
          type="text"
          value={reason}
          disabled={pending}
          placeholder={t('delivery.policy.edit.reasonPlaceholder')}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border border-border-input bg-bg-surface px-2 py-1.5 text-sm text-text-primary"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="px-3 py-1.5 text-xs"
          disabled={!canSave}
          onClick={() => onSave({ tolerancePct, enforcement, reason: reason.trim() })}
        >
          {pending ? t('delivery.policy.edit.saving') : t('delivery.policy.edit.save')}
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={onCancel}
        >
          {t('delivery.policy.edit.cancel')}
        </Button>
        {/* Reset-to-default — only meaningful when the active policy has deviated. */}
        {deviation && (
          <Button
            variant="secondary"
            className="ml-auto px-3 py-1.5 text-xs"
            disabled={pending}
            onClick={onReset}
          >
            {t('delivery.policy.edit.reset')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PolicyEditor;
