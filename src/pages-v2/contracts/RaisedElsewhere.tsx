import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

import Button from '../../components/ui-v2/Button';
import { EXTERNAL_FACT_OWNER_KEY } from '../../lib/i18n/externalFactOwner';
import { contractDraftOwner } from '../../services/transitions/contractDraftOwner';

// ─────────────────────────────────────────────────────────────────────────────
// THE TWO SURFACES OF ONE REFUSAL — the pre-act line and the terminal panel.
//
// ⚠️ **BOTH READ THE OWNER FROM THE FLOW.** Neither spells `S/4HANA`. The token
// comes from `EXTERNAL_FACT_OWNER_KEY`, which is `Record<ExternalFactOwner, …>`
// and therefore exhaustive by type; the owner itself comes from
// `t_contract_draft.surfaceable`. Re-rule the owner and both sentences change;
// re-surface the verb and both disappear, with nobody editing this file.
//
// ⚠️ **AND IF THE TREE STOPS SAYING ANYBODY OWNS IT, THEY RENDER NOTHING.**
// `contractDraftOwner()` returns `null` rather than a default, so a refusal can
// never name a system the declaration does not. The terminal panel still
// renders its headline and its summary in that case — what it drops is the
// sentence it can no longer support, which is the honest degradation. A panel
// that claimed an owner it could not read would be the fabrication one layer
// up from the one this batch removes.
//
// DP-2: `info` tone, soft tint, thin border. Nothing here is a decision a
// reader can act on, so nothing here is saturated.
// ─────────────────────────────────────────────────────────────────────────────

/** The line the review step carries BEFORE the terminal act. */
export const RaisedElsewhereNote: React.FC = () => {
  const { t } = useTranslation();
  const owner = contractDraftOwner();
  if (!owner) return null;
  return (
    <p
      data-testid="contract-raised-elsewhere-note"
      className="flex items-start gap-2 rounded-md border border-info/30 bg-info-soft px-3 py-2 text-xs text-text-secondary"
    >
      <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
      <span>
        {t('contracts.wizard.raisedElsewhere.note', {
          owner: t(EXTERNAL_FACT_OWNER_KEY[owner]),
        })}
      </span>
    </p>
  );
};

/**
 * The terminal panel. It replaces the wizard once the last step is completed.
 *
 * ⚠️ **THE FLOW ENDS SOMEWHERE.** The operator's stop condition for this batch
 * was that removing the prepend must not leave the wizard ending nowhere — a
 * flow with no screen after its last step is worse than one ending in a marked
 * panel. This is that screen: headline, the owner sentence, what was collected,
 * and two ways out.
 */
export const RaisedElsewherePanel: React.FC<{
  summary: React.ReactNode;
  onRestart: () => void;
  onClose: () => void;
}> = ({ summary, onRestart, onClose }) => {
  const { t } = useTranslation();
  const owner = contractDraftOwner();
  return (
    <div
      data-testid="contract-raised-elsewhere-panel"
      className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface p-6 space-y-5"
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">
          {t('contracts.wizard.raisedElsewhere.headline')}
        </h2>
        {owner && (
          <p className="text-sm text-text-secondary">
            {t('contracts.wizard.raisedElsewhere.ownedBy', {
              owner: t(EXTERNAL_FACT_OWNER_KEY[owner]),
            })}
          </p>
        )}
        <p className="text-sm text-text-secondary">
          {t('contracts.wizard.raisedElsewhere.body')}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-label uppercase text-text-tertiary">
          {t('contracts.wizard.raisedElsewhere.collected')}
        </h3>
        {summary}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onRestart}>
          {t('contracts.wizard.raisedElsewhere.restart')}
        </Button>
        <Button variant="outline" onClick={onClose}>
          {t('contracts.wizard.raisedElsewhere.close')}
        </Button>
      </div>
    </div>
  );
};
