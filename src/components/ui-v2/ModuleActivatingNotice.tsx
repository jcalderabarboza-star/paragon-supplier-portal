import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { getModule, type ModuleCode } from '../../services/modules/registry';

// ─────────────────────────────────────────────────────────────────────────────
// M2 · THE ACTIVATING BANNER (Design 5 §A.2): a module in the `Activating`
// phase is ON — its pages and acts work — and says it is being configured,
// with a link to its guide.
//
// ⚠️ **THE GUIDE LINK POINTS AT THE PROCESS FLOWS UNTIL THE GUIDES LAND (G1/G2),
// AND ONLY FOR A BUYER SEAT.** `/buyer/process-flows` is a buyer route: a
// supplier seat sent there would leave its own shell, so the supplier side gets
// the sentence without the link rather than a door out of its portal.
//
// DP-2: a state notice, muted neutral like `ModuleOffNotice` — an Activating
// module is a decision somebody made, not a fault.
// ─────────────────────────────────────────────────────────────────────────────

export const ModuleActivatingNotice: React.FC<{ code: ModuleCode }> = ({ code }) => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const name = t(getModule(code).nameKey);
  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3"
      data-testid="module-activating-banner"
      data-module-activating={code}
    >
      <div className="text-sm font-semibold text-text-primary">
        {t('modules.activating.title', { module: name, code })}
      </div>
      <div className="text-xs text-text-secondary mt-1">{t('modules.activating.body')}</div>
      {identity.personaType === 'buyer' && (
        <Link
          to="/buyer/process-flows"
          className="inline-block text-xs text-action hover:underline mt-1"
          data-testid="module-activating-guide"
        >
          {t('modules.activating.guide')}
        </Link>
      )}
    </div>
  );
};

export default ModuleActivatingNotice;
