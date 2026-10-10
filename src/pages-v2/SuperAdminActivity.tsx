import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { CellSub, type Column } from '../components/ui-v2/DataTable';
import SearchBar from '../components/ui-v2/SearchBar';
import Data from '../components/ui-v2/Data';
import Notice from '../components/ui-v2/Notice';
import { ToggleChip } from '../components/ui-v2/Actions';
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
              <CellSub tone="critical">
                {t(a.refusedForNoReason ? 'superAdmin.activity.refusedNoReason' : 'superAdmin.activity.refused')}
              </CellSub>
            )}
          </>
        ),
      },
      {
        id: 'document',
        header: t('superAdmin.activity.col.document'),
        // A reference, so the column is `id`; the sentence that stands in for a
        // missing one is a note, not a reference.
        kind: 'id',
        className: TOP,
        cell: (a) =>
          a.entityId ? `${a.entity} · ${a.entityId}` : <CellSub>{t('superAdmin.activity.noDocument')}</CellSub>,
      },
      {
        id: 'rule',
        header: t('superAdmin.activity.col.rule'),
        kind: 'text',
        className: TOP,
        cell: (a) =>
          a.bypassedRules.length === 0 ? (
            t('superAdmin.activity.none')
          ) : (
            <>
              <div className="text-warning-hover">{t('superAdmin.stamp')}</div>
              {a.bypassedRules.map((r) => (
                <CellSub key={r}>{bypassRuleLabel(r, t, (k) => i18n.exists(k))}</CellSub>
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
          <Notice
            tone="neutral"
            icon={Info}
            data-testid="super-admin-activity-session"
          >
            <p>
              {t('superAdmin.activity.session')}
            </p>
          </Notice>
        ) : undefined
      }
      filters={
        allowed ? (
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <ToggleChip
                key={f}
                selected={filter === f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                data-testid={`super-admin-filter-${f}`}
              >
                {t(`superAdmin.activity.filter.${f}`)}
              </ToggleChip>
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
        <Notice
          tone="neutral"
          data-testid="super-admin-activity-not-for-seat"
        >
          {t('superAdmin.activity.notForSeat')}
        </Notice>
      ) : rows.length === 0 ? (
        <Notice
          tone="neutral"
          data-testid="super-admin-activity-empty"
        >
          {t(acts.length === 0 ? 'superAdmin.activity.empty' : 'superAdmin.activity.emptyFiltered')}
        </Notice>
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
