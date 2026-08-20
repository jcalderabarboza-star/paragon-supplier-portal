import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Info, Lock, Users, ArrowRight, Search } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import { deriveRoleViews, roleTotals, type RoleView } from './roles/roleModel';

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
// ⚠️ **AND NO CREATE BUTTON.** TMS has one; we cannot. Nothing in the platform
// persists a custom role, so a Create button writing to React state would build
// a role that vanished on reload — the false-affordance class this arc spent a
// batch removing. The page says so rather than leaving the absence to be read
// as an oversight.
// ─────────────────────────────────────────────────────────────────────────────

const KpiTile: React.FC<{ labelKey: string; value: number; testId: string }> = ({
  labelKey,
  value,
  testId,
}) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-border-subtle rounded-lg p-4" data-testid={testId}>
      <div className="text-label text-text-tertiary uppercase">{t(labelKey)}</div>
      <div className="text-2xl font-semibold text-data-navy font-mono mt-1">{value}</div>
    </div>
  );
};

const RoleRow: React.FC<{ role: RoleView }> = ({ role }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <tr
      className="border-t border-border-subtle hover:bg-bg-hover cursor-pointer"
      data-testid={`role-row-${role.id}`}
      onClick={() => navigate(`/buyer/roles/${role.id}`)}
    >
      <td className="py-3 px-4 align-middle">
        <span className="font-mono text-xs text-data-navy">{role.id}</span>
      </td>
      <td className="py-3 px-4 align-middle text-sm font-medium text-text-primary">
        {t(role.nameKey)}
      </td>
      <td className="py-3 px-4 align-middle text-xs text-text-secondary max-w-md">
        {t(role.descriptionKey)}
      </td>
      <td className="py-3 px-4 align-middle">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-border-subtle text-text-secondary bg-bg-hover whitespace-nowrap"
          data-testid={`role-badge-${role.id}`}
        >
          <Lock size={10} className="text-teal" />
          {t(role.isSystem ? 'roles.page.systemBadge' : 'roles.page.customBadge')}
        </span>
      </td>
      <td className="py-3 px-4 align-middle text-xs text-text-tertiary font-mono whitespace-nowrap">
        {t('roles.page.reach', {
          modules: role.modules.length,
          permissions: role.atoms.length,
        })}
      </td>
      <td className="py-3 px-4 align-middle text-right">
        <span className="inline-flex items-center gap-1 text-xs text-action whitespace-nowrap">
          {t('roles.page.view')}
          <ArrowRight size={12} />
        </span>
      </td>
    </tr>
  );
};

const RolesCatalogue: React.FC = () => {
  const { t } = useTranslation();
  const views = useMemo(deriveRoleViews, []);
  const totals = useMemo(() => roleTotals(views), [views]);
  const [q, setQ] = useState('');

  const needle = q.trim().toLowerCase();
  const filtered = views.filter(
    (r) =>
      !needle ||
      r.id.toLowerCase().includes(needle) ||
      t(r.nameKey).toLowerCase().includes(needle),
  );

  return (
    <AppShellV2>
      <div className="p-6 max-w-6xl" data-testid="roles-catalogue">
        <header className="mb-4">
          <div className="text-label text-text-tertiary uppercase font-mono">SET-RL · ROLES</div>
          <h1 className="text-xl font-semibold text-text-primary">{t('roles.page.title')}</h1>
          <p className="text-sm text-text-secondary">{t('roles.page.subtitle')}</p>
        </header>

        {/* KPI tiles — only the three we can DERIVE. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <KpiTile labelKey="roles.page.kpi.roles" value={totals.roles} testId="kpi-roles" />
          <KpiTile
            labelKey="roles.page.kpi.permissions"
            value={totals.permissions}
            testId="kpi-permissions"
          />
          <KpiTile labelKey="roles.page.kpi.actions" value={totals.actions} testId="kpi-actions" />
        </div>

        {/* — THE HONEST MARKER (D-CENSUS-8) — */}
        <div
          className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
          data-testid="roles-readonly-marker"
        >
          <Info size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">
              {t('roles.page.readOnlyTitle')}
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mt-1">
              {t('roles.page.readOnlyBody')}
            </p>
          </div>
        </div>

        <div
          className="mb-5 border border-border-subtle rounded-lg p-4 flex gap-3"
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

        <label className="relative block mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('roles.page.search')}
            data-testid="roles-search"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border-subtle rounded-md bg-white"
          />
        </label>

        <div className="bg-white border border-border-subtle rounded-lg overflow-x-auto">
          <table className="w-full text-left" data-testid="roles-table">
            <thead>
              <tr className="bg-bg-hover">
                <th className="py-2 px-4 text-label text-text-tertiary uppercase">
                  {t('roles.page.col.code')}
                </th>
                <th className="py-2 px-4 text-label text-text-tertiary uppercase">
                  {t('roles.page.col.name')}
                </th>
                <th className="py-2 px-4 text-label text-text-tertiary uppercase">
                  {t('roles.page.col.description')}
                </th>
                <th className="py-2 px-4 text-label text-text-tertiary uppercase">
                  {t('roles.page.col.kind')}
                </th>
                <th className="py-2 px-4 text-label text-text-tertiary uppercase">
                  {t('roles.page.col.scope')}
                </th>
                <th className="py-2 px-4 text-label text-text-tertiary uppercase text-right">
                  {t('roles.page.col.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <RoleRow key={r.id} role={r} />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-text-tertiary" data-testid="roles-no-match">
              {t('roles.page.noMatch')}
            </p>
          )}
        </div>
      </div>
    </AppShellV2>
  );
};

export default RolesCatalogue;
