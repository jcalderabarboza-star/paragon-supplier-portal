// ────────────────────────────────────────────────────────────────────────────
// M2 · THE ACTIVATION LEDGER, FOR THE TWO SCREENS — read once, rendered twice
// (the drawer's ledger and the admin row's "Last updated by …").
//
// ⚠️ **"LAST UPDATED BY" IS THE LATEST LEDGER ROW, NEVER A STORED LABEL**
// (Design 5 §A.4). The person is resolved through `personLabel`, so a sample
// person reads "(SAMPLE)" by the same resolver every rendered person uses.
// ────────────────────────────────────────────────────────────────────────────

import { useServiceQuery } from '../../services/query/useServiceQuery';
import { MODULE_LEDGER_KEY } from '../../services/query/commandHooks';
import { personLabel } from '../../services/identity/personLabel';
import { formatDate } from '../../lib/format';
import type { ModuleActivationSetting } from '../../services/modules/activation';
import type { TFunction } from 'i18next';

export function useModuleLedger() {
  return useServiceQuery(MODULE_LEDGER_KEY, (svc, scope) => svc.modules.getModuleLedger(scope));
}

/** A subject's acts, newest first. */
export const rowsFor = (ledger: readonly ModuleActivationSetting[], subject: string) =>
  ledger.filter((r) => r.code === subject).sort((a, b) => b.seq - a.seq);

/** Who recorded an act — the person through `personLabel`, or the lane's honest absence. */
export function setByLabel(row: ModuleActivationSetting, t: TFunction): string {
  return row.setBy.kind === 'RESOLVED' ? personLabel(row.setBy.person.personId, t) : t('modules.ledger.unattributed');
}

const TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });

/** "01 Oct 2026 08:14" — the date in the seat's locale, the time in Jakarta. */
export function formatSetAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? formatDate(iso) : `${formatDate(iso)} ${TIME.format(d)}`;
}
