import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Search } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import Data from '../components/ui-v2/Data';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { readAuditEvents } from '../services/audit/auditTrail';
import {
  filterSuperAdminActs,
  superAdminActs,
  type SuperAdminActFilter,
} from '../services/audit/superAdminActivity';
import { maySeeSuperAdminActivity } from '../services/identity/superAdmin';
import { personLabel } from '../services/identity/personLabel';
import { bypassRuleLabel } from '../components/v2-features/BypassReasonDialog';
import { formatSetAt } from './modules/moduleLedger';

// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 · SUPER ADMIN ACTIVITY (Platform group).
//
// Every act a Super Admin took — when, what, the document, the check that stood
// aside and the reason — filtered out of the audit trail the dispatcher already
// writes (`superAdminActs`). Nothing is stored for this page.
//
// ⚠️ **WHO MAY READ IT: THE SUPER ADMIN AND COMPLIANCE** (operator ruling). It
// is a gate on READING a record, which is the first one in this platform —
// `/buyer/roles` is ungated on purpose — and it is asked of the seat's role ids,
// not of an atom: no transition is fired from here, so no atom could express it
// (C10 §3.3). Every other seat is told whose view it is.
// ─────────────────────────────────────────────────────────────────────────────

// i18n-defer: filter ids, not copy — each renders through `superAdmin.activity.filter.<id>`.
const FILTERS: readonly SuperAdminActFilter[] = ['all', 'bypassed', 'refused'];

const SuperAdminActivity: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { identity } = useCurrentIdentity();
  const [filter, setFilter] = useState<SuperAdminActFilter>('all');
  const [q, setQ] = useState('');
  const allowed = maySeeSuperAdminActivity(identity);
  // Read once per mount: the trail only grows through commands, and no command
  // is fired from this page.
  const acts = useMemo(() => (allowed ? superAdminActs(readAuditEvents()) : []), [allowed]);
  const rows = filterSuperAdminActs(acts, filter, q);

  return (
    <AppShellV2>
      <div data-testid="super-admin-activity">
        <PageHeader
          breadcrumb={[t('superAdmin.activity.crumb')]}
          title={t('superAdmin.activity.title')}
          subtitle={t('superAdmin.activity.subtitle')}
        />

        {!allowed ? (
          <section
            className="rounded-lg border border-border-subtle bg-bg-hover px-4 py-3 text-sm text-text-primary"
            data-testid="super-admin-activity-not-for-seat"
          >
            {t('superAdmin.activity.notForSeat')}
          </section>
        ) : (
          <>
            <div
              className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
              data-testid="super-admin-activity-session"
            >
              <Info size={16} className="text-teal shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('superAdmin.activity.session')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  data-testid={`super-admin-filter-${f}`}
                  className={`text-meta rounded-full border px-3 py-1 ${
                    filter === f
                      ? 'border-action text-action-text bg-action-soft'
                      : 'border-border-subtle text-text-secondary'
                  }`}
                >
                  {t(`superAdmin.activity.filter.${f}`)}
                </button>
              ))}
              <label className="relative ml-auto w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label={t('superAdmin.activity.search')}
                  placeholder={t('superAdmin.activity.search')}
                  data-testid="super-admin-search"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-border-input rounded-md bg-white"
                />
              </label>
              <span className="text-meta text-text-tertiary" data-testid="super-admin-count">
                {t('superAdmin.activity.count', { count: rows.length })}
              </span>
            </div>

            {rows.length === 0 ? (
              <p
                className="rounded-lg border border-dashed border-border-subtle p-6 text-sm text-text-secondary"
                data-testid="super-admin-activity-empty"
              >
                {t(acts.length === 0 ? 'superAdmin.activity.empty' : 'superAdmin.activity.emptyFiltered')}
              </p>
            ) : (
              <div className="bg-white border border-border-subtle rounded-lg overflow-x-auto">
                <table className="w-full text-left" data-testid="super-admin-activity-table">
                  <thead className="bg-bg-hover">
                    <tr className="text-label text-text-tertiary uppercase">
                      {(['when', 'who', 'what', 'document', 'rule', 'reason'] as const).map((c) => (
                        <th key={c} className="py-2 px-4 font-medium">
                          {t(`superAdmin.activity.col.${c}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr
                        key={a.id}
                        className="border-t border-border-subtle align-top"
                        data-testid={`super-admin-act-${a.id}`}
                        data-bypassed={a.bypassedRules.length > 0 ? 'yes' : 'no'}
                        data-status={a.status}
                      >
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          <Data>{formatSetAt(a.at)}</Data>
                        </td>
                        <td className="py-3 px-4 text-xs text-text-primary whitespace-nowrap">
                          {personLabel(a.personId, t)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <Data>{a.transitionId}</Data>
                          {a.status === 'failed' && (
                            <div className="text-critical mt-0.5">
                              {t(a.refusedForNoReason ? 'superAdmin.activity.refusedNoReason' : 'superAdmin.activity.refused')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {a.entityId ? (
                            <Data>{`${a.entity} · ${a.entityId}`}</Data>
                          ) : (
                            <span className="text-text-tertiary">{t('superAdmin.activity.noDocument')}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {a.bypassedRules.length === 0 ? (
                            <span className="text-text-tertiary">{t('superAdmin.activity.none')}</span>
                          ) : (
                            <>
                              <div className="font-semibold text-warning-hover">{t('superAdmin.stamp')}</div>
                              {a.bypassedRules.map((r) => (
                                <div key={r} className="text-text-primary">
                                  {bypassRuleLabel(r, t, (k) => i18n.exists(k))}
                                </div>
                              ))}
                            </>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-text-primary max-w-xs">{a.reason ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AppShellV2>
  );
};

export default SuperAdminActivity;
