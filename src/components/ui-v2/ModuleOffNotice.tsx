import React from 'react';
import { useTranslation } from 'react-i18next';
import { useModuleActivation } from '../../context/ModuleActivationContext';
import { offDetail, type OffReason } from '../../services/modules/activation';
import { getModule, isModuleCode, type ModuleCode } from '../../services/modules/registry';
import { rolesHolding } from '../../services/transitions/businessRoles';
import { ownerLabelKeys } from '../../services/transitions/handoff';

// ─────────────────────────────────────────────────────────────────────────────
// M1 · WHAT IS SWITCHED OFF, AND WHO CAN SWITCH IT ON (Design 5 §A.3).
//
// Two shapes. The BANNER sits at the top of a read-only page and names the
// module (or part, or side), its phase, and the role that can switch it back
// on. The INLINE form takes a verb's own slot, where `HandoffNotice` would
// otherwise say "Awaiting …" — so a switched-off act is never an absent
// affordance and never a button that will be refused.
//
// ⚠️ **THE OWNER IS DERIVED, NEVER PASSED IN** — the `NoSupplierIdentity`
// pattern: `rolesHolding('module:set')` names whoever holds the atom today, so
// moving the atom to another lane changes this copy with no edit here.
//
// DP-2: a state notice, not a warning — muted neutral, no semantic colour. An
// OFF module is a decision somebody made, not a fault.
// ─────────────────────────────────────────────────────────────────────────────

const sideKey = (subject: string) => (subject === 'side:supplier' ? 'modules.side.supplier' : 'modules.side.buyer');

export const ModuleOffNotice: React.FC<{
  off: OffReason;
  variant?: 'banner' | 'inline';
  testId?: string;
}> = ({ off, variant = 'banner', testId = 'module-off-notice' }) => {
  const { t } = useTranslation();
  const view = useModuleActivation();
  const owner = ownerLabelKeys(rolesHolding('module:set'))
    .map((k) => t(k))
    .join(' / ');

  const code = isModuleCode(off.subject) ? (off.subject as ModuleCode) : null;
  const moduleName = code ? t(getModule(code).nameKey) : t(sideKey(off.subject));
  const partName = code && off.part ? t(getModule(code).parts.find((p) => p.id === off.part)?.nameKey ?? off.part) : null;

  if (variant === 'inline') {
    return (
      <span
        className="text-xs text-text-tertiary self-center"
        data-testid={testId}
        data-handoff="module-off"
        data-module-off={offDetail(off)}
        title={t('modules.off.inlineHint')}
      >
        {t('modules.off.inline', { name: partName ?? moduleName })}
      </span>
    );
  }

  const title = !code
    ? t('modules.off.sideTitle', { side: moduleName })
    : partName
      ? t('modules.off.partTitle', { part: partName, module: moduleName, code })
      : t('modules.off.moduleTitle', { module: moduleName, code });

  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3"
      data-testid={testId}
      data-module-off={offDetail(off)}
    >
      <div className="text-sm font-semibold text-text-primary">{title}</div>
      {code && (
        <div className="text-xs text-text-secondary mt-0.5" data-testid={`${testId}-phase`}>
          {t('modules.off.phase', { phase: t(`modules.phase.${view.modules[code].phase}`) })}
        </div>
      )}
      <div className="text-xs text-text-secondary mt-1">{t('modules.off.body', { owner })}</div>
    </div>
  );
};

export default ModuleOffNotice;
