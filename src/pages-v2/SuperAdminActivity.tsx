import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { type Column } from '../components/ui-v2/DataTable';
import SearchBar from '../components/ui-v2/SearchBar';
import Data from '../components/ui-v2/Data';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { readAuditEvents } from '../services/audit/auditTrail';
import {
  filterSuperAdminActs,
  superAdminActs,
  type SuperAdminAct,
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

// A row here runs to several lines (a refusal under the verb, the checks that
// stood aside), so every cell reads from the top, as the table always did.
const TOP = '!align-top';

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

  const columns = useMemo<Column<SuperAdminAct>[]>(
    () => [
      {
        id: 'when',
        header: t('superAdmin.activity.col.when'),
        kind: 'date',
        className: TOP,
        cell: (a) => <Data>{formatSetAt(a.at)}</Data>,
      },
      {
        id: 'who',
        header: t('superAdmin.activity.col.who'),
        kind: 'text',
        className: `${TOP} whitespace-nowrap`,
        cell: (a) => personLabel(a.personId, t),
      },
      {
        id: 'what',
        header: t('superAdmin.activity.col.what'),
        kind: 'id',
        className: TOP,
        cell: (a) => (
          <>
            <Data>{a.transitionId}</Data>
            {a.status === 'failed' && (
              <div className="font-sans font-normal text-critical mt-0.5">
                {t(a.refusedForNoReason ? 'superAdmin.activity.refusedNoReason' : 'superAdmin.activity.refused')}
              </div>
            )}
          </>
        ),
      },
      {
        id: 'document',
        header: t('superAdmin.activity.col.document'),
        kind: 'text',
        className: TOP,
        cell: (a) =>
          a.entityId ? (
            <Data>{`${a.entity} · ${a.entityId}`}</Data>
          ) : (
            <span className="text-text-tertiary">{t('superAdmin.activity.noDocument')}</span>
          ),
      },
      {
        id: 'rule',
        header: t('superAdmin.activity.col.rule'),
        kind: 'text',
        className: TOP,
        cell: (a) =>
          a.bypassedRules.length === 0 ? (
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
          ),
      },
      {
        id: 'reason',
        header: t('superAdmin.activity.col.reason'),
        kind: 'text',
        className: `${TOP} max-w-xs`,
        cell: (a) => a.reason ?? '',
      },
    ],
    [t, i18n],
  );

  return (
    <ListPage
      testId="super-admin-activity"
      breadcrumb={[t('superAdmin.activity.crumb')]}
      title={t('superAdmin.activity.title')}
      subtitle={t('superAdmin.activity.subtitle')}
      meta={
        allowed ? (
          <span data-testid="super-admin-count">
            {t('superAdmin.activity.count', { count: rows.length })}
          </span>
        ) : undefined
      }
      notices={
        allowed ? (
          <div
            className="border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
            data-testid="super-admin-activity-session"
          >
            <Info size={16} className="text-teal shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">
              {t('superAdmin.activity.session')}
            </p>
          </div>
        ) : undefined
      }
      filters={
        allowed ? (
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        ) : undefined
      }
      search={
        allowed ? (
          // The test id sits on the wrapper: `SearchBar` owns its input.
          <div data-testid="super-admin-search">
            <SearchBar
              value={q}
              onChange={setQ}
              placeholder={t('superAdmin.activity.search')}
              ariaLabel={t('superAdmin.activity.search')}
            />
          </div>
        ) : undefined
      }
    >
      {!allowed ? (
        <section
          className="rounded-lg border border-border-subtle bg-bg-hover px-4 py-3 text-sm text-text-primary"
          data-testid="super-admin-activity-not-for-seat"
        >
          {t('superAdmin.activity.notForSeat')}
        </section>
      ) : rows.length === 0 ? (
        <p
          className="rounded-lg border border-dashed border-border-subtle p-6 text-sm text-text-secondary"
          data-testid="super-admin-activity-empty"
        >
          {t(acts.length === 0 ? 'superAdmin.activity.empty' : 'superAdmin.activity.emptyFiltered')}
        </p>
      ) : (
        <DataTable
          testId="super-admin-activity-table"
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          rowProps={(a) => ({
            'data-testid': `super-admin-act-${a.id}`,
            'data-bypassed': a.bypassedRules.length > 0 ? 'yes' : 'no',
            'data-status': a.status,
          })}
        />
      )}
    </ListPage>
  );
};

export default SuperAdminActivity;
