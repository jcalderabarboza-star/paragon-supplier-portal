import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Info, Lock, Users, ArrowRight, AlertTriangle, Plus } from 'lucide-react';
import { deriveRoleViews, roleTotals, type RoleView } from './roles/roleModel';
import CreateRolePanel from './roles/CreateRolePanel';
import Dialog from '../components/ui-v2/Dialog';
import Button from '../components/ui-v2/Button';
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { type Column } from '../components/ui-v2/DataTable';
import StatusPill from '../components/ui-v2/StatusPill';
import SearchBar from '../components/ui-v2/SearchBar';
import { customRoleStore } from '../services/transitions/customRoles';

// ─────────────────────────────────────────────────────────────────────────────
// THE ROLES CATALOGUE — A LIST, AND A ROLE OPENS ITS OWN PAGE.
//
// The reference (Paragon TMS) lists roles as a table — code, name, description,
// kind, and a view action — and puts the permissions on the role's own page.
// **That shape is what transfers.** A stack of fully-expanded cards makes the
// roster unscannable exactly when it grows, which is the moment a catalogue is
// for.
//
// ⚠️ **WHAT DOES NOT TRANSFER: USERS ASSIGNED · LAST MODIFIED · STATUS.** We
// hold no people, no modification record and no activation state, so those three
// columns would be three invented facts filling a layout. They are ABSENT, not
// empty — see `roles/roleModel.ts`.
//
// ⚠️ **THERE IS NOW A CREATE PANEL, AND IT IS GATED — THE FIRST ROLE-GATED
// SURFACE IN THIS PLATFORM.** The sentence that stood here said a Create button
// would build a role that vanished on reload; a grant is now recorded through
// the dispatcher and enforced for the session, and the marker states exactly
// what survives and what does not rather than dropping the claim.
//
// ⚠️ **NOTHING BELOW THIS LINE LEARNED THAT CUSTOM ROLES EXIST.** The columns,
// the table, the KPI tiles and the reach column are unchanged: they read
// `deriveRoleViews()`, and the derivation grew. That is the property the
// catalogue was built for and the reason the tile moves 8 → 9 with no edit here.
// The two additions are the WRITE path (`CreateRolePanel`) and a version bump
// that lets the memo re-derive after a grant — neither is a display change.
// ─────────────────────────────────────────────────────────────────────────────

const KpiTile: React.FC<{
  labelKey: string;
  value: number;
  testId: string;
  /** Optional derived breakdown — what the total is made of. */
  sub?: string;
}> = ({ labelKey, value, testId, sub }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-border-subtle rounded-lg p-4" data-testid={testId}>
      <div className="text-label text-text-tertiary uppercase">{t(labelKey)}</div>
      <div className="text-2xl font-semibold text-data-navy font-mono mt-1">{value}</div>
      {sub && <div className="text-xs text-text-tertiary font-mono mt-0.5">{sub}</div>}
    </div>
  );
};

const RolesCatalogue: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // The derivation reads a MUTABLE store now, so the memo needs a reason to run
  // again. `version` is that reason and nothing else: no query caches a role
  // definition, so there is no `invalidateQueries` that would do this for us.
  const [version, setVersion] = useState(0);
  const views = useMemo(deriveRoleViews, [version]);
  // ⚠️ WHAT THE STORE REFUSED, READ FROM THE STORE ITSELF. A parse failure that
  // returns an empty list is indistinguishable from an empty store, and the
  // empty list is the reading that gets believed — `EMPTY-INPUT-REPORTS-CLEAN-01`
  // in a storage read's exact shape. Both facts are rendered.
  const store = useMemo(() => customRoleStore.readState(), [version]);
  const totals = useMemo(() => roleTotals(views), [views]);
  const [q, setQ] = useState('');
  // ADM-1 — the creation form is a pop-up opened from the header, not a
  // section that always stands on the page.
  const [creating, setCreating] = useState(false);

  const needle = q.trim().toLowerCase();
  const filtered = views.filter(
    (r) =>
      !needle ||
      r.id.toLowerCase().includes(needle) ||
      t(r.nameKey).toLowerCase().includes(needle),
  );

  const columns = useMemo<Column<RoleView>[]>(
    () => [
      {
        id: 'code',
        header: t('roles.page.col.code'),
        kind: 'id',
        cell: (role) => role.id,
      },
      {
        id: 'name',
        header: t('roles.page.col.name'),
        kind: 'text',
        cell: (role) => t(role.nameKey),
      },
      {
        id: 'description',
        header: t('roles.page.col.description'),
        kind: 'text',
        className: 'max-w-md',
        cell: (role) => t(role.descriptionKey),
      },
      {
        id: 'kind',
        header: t('roles.page.col.kind'),
        kind: 'status',
        cell: (role) => (
          // The test id sits on the wrapper: `StatusPill` takes none.
          <span data-testid={`role-badge-${role.id}`}>
            <StatusPill variant="neutral" className="gap-1 whitespace-nowrap">
              <Lock size={10} className="text-teal" />
              {t(role.isSystem ? 'roles.page.systemBadge' : 'roles.page.customBadge')}
            </StatusPill>
          </span>
        ),
      },
      {
        id: 'scope',
        header: t('roles.page.col.scope'),
        kind: 'text',
        cell: (role) => (
          <span className="whitespace-nowrap">
            {t('roles.page.reach', {
              count: role.modules.length,
              modules: role.modules.length,
              permissions: role.atoms.length,
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('roles.page.col.actions'),
        kind: 'actions',
        cell: () => (
          <span className="inline-flex items-center gap-1 text-action-text">
            {t('roles.page.view')}
            <ArrowRight size={12} />
          </span>
        ),
      },
    ],
    [t],
  );

  // ⚠️ §70 — NO WIDTH AND NO PADDING HERE, AND THE ABSENCE IS THE PATTERN
  // RATHER THAN AN OMISSION. The shell's own `<main class="flex-1 overflow-auto
  // bg-bg-page p-8">` supplies the padding and constrains nothing. The two
  // Roles routes were the only exceptions, they carried `p-6` ON TOP of that
  // `p-8`, and they did not even agree with each other (`max-w-6xl` here,
  // `max-w-4xl` on the detail). A `max-w-*` in this tree belongs on PROSE,
  // never on a container.
  //
  // UI-1b — the header this page built by hand (its own title size and a mono
  // breadcrumb) is gone: the frame is the shared `ListPage`, whose header
  // derives the first breadcrumb segment from the sidebar group (H1).
  return (
    <ListPage
      testId="roles-catalogue"
      breadcrumb={['SET-RL · ROLES']}
      title={t('roles.page.title')}
      subtitle={t('roles.page.subtitle')}
      actions={
        <Button
          variant="outline"
          icon={Plus}
          onClick={() => setCreating(true)}
          data-testid="roles-new"
        >
          {t('roles.page.newRole')}
        </Button>
      }
      notices={
        <>
          {/* — THE HONEST MARKER (D-CENSUS-8) — */}
          <div
            className="border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
            data-testid="roles-readonly-marker"
          >
            <Info size={16} className="text-teal shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-text-primary">
                {t('roles.page.readOnlyTitle')}
              </div>
              <p className="text-xs text-text-secondary leading-relaxed mt-1">
                {t('roles.page.readOnlyBody', { count: totals.roles })}
              </p>
            </div>
          </div>

          {(store.unreadable || store.rejected.length > 0) && (
            <section
              className="border border-warning rounded-lg bg-warning-soft p-4 flex gap-3"
              data-testid="roles-store-notice"
            >
              <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-warning-hover">
                  {t(
                    store.unreadable
                      ? 'roles.page.storeUnreadableTitle'
                      : 'roles.page.storeRejectedTitle',
                  )}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mt-1">
                  {t(
                    store.unreadable
                      ? 'roles.page.storeUnreadableBody'
                      : 'roles.page.storeRejectedBody',
                  )}
                </p>
                {store.rejected.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-0.5" data-testid="roles-store-rejected">
                    {store.rejected.map((r) => (
                      <li key={r.id} className="text-xs text-text-secondary">
                        <span className="font-mono text-data-navy">{r.id}</span>
                        {' — '}
                        {r.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          <div
            className="border border-border-subtle rounded-lg p-4 flex gap-3"
            data-testid="roles-users-deferred"
          >
            <Users size={16} className="text-text-tertiary shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-text-primary">
                {t('roles.page.usersDeferredTitle')}
              </div>
              <p className="text-xs text-text-secondary leading-relaxed mt-1">
                {t('roles.page.usersDeferredBody')}
              </p>
            </div>
          </div>
        </>
      }
      // KPI tiles — only the three we can DERIVE.
      kpiColumns={3}
      kpis={
        <>
          <KpiTile
            labelKey="roles.page.kpi.roles"
            value={totals.roles}
            testId="kpi-roles"
            // ⚠️ THE TILE NAMES WHAT IT COUNTS AND SHOWS THE SPLIT. The false
            // "six" was the BUYER subset written as the population; putting both
            // figures beside the total is what stops that reading recurring.
            sub={t('roles.page.kpi.rolesSplit', {
              buyer: totals.bySide.buyer,
              supplier: totals.bySide.supplier,
            })}
          />
          <KpiTile
            labelKey="roles.page.kpi.permissions"
            value={totals.permissions}
            testId="kpi-permissions"
          />
          <KpiTile labelKey="roles.page.kpi.actions" value={totals.actions} testId="kpi-actions" />
        </>
      }
      search={
        // The test id sits on the wrapper: `SearchBar` owns its input.
        <div data-testid="roles-search">
          <SearchBar value={q} onChange={setQ} placeholder={t('roles.page.search')} />
        </div>
      }
    >
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title={t('roles.page.createTitle')}
        testId="roles-create-dialog"
      >
        <CreateRolePanel
          onGranted={() => {
            setVersion((v) => v + 1);
            setCreating(false);
          }}
        />
      </Dialog>

      <DataTable
        testId="roles-table"
        columns={columns}
        rows={filtered}
        rowKey={(role) => role.id}
        onRowClick={(role) => navigate(`/buyer/roles/${role.id}`)}
        rowProps={(role) => ({ 'data-testid': `role-row-${role.id}` })}
        empty={<span data-testid="roles-no-match">{t('roles.page.noMatch')}</span>}
      />
    </ListPage>
  );
};

export default RolesCatalogue;
