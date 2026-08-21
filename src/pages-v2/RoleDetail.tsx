import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, Info } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import NotFound from './NotFound';
import { findRoleView, deriveRoleViews } from './roles/roleModel';

// ─────────────────────────────────────────────────────────────────────────────
// ONE ROLE — its permissions, the modules it touches, and the acts it can take.
//
// The list answers WHICH ROLES EXIST; this answers WHAT THIS ONE CAN DO. Both
// read the same derivation (`roles/roleModel.ts`), so the detail can never show
// a permission the list did not count.
//
// ⚠️ **AN UNKNOWN ROLE IS A 404, NOT AN EMPTY PAGE.** `/buyer/roles/whatever`
// renders the real NotFound rather than a role-shaped page with nothing in it —
// an empty detail reads as "this role has no permissions", which is a different
// and much worse claim than "there is no such role".
// ─────────────────────────────────────────────────────────────────────────────

const RoleDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roleId } = useParams<{ roleId: string }>();
  const role = useMemo(() => (roleId ? findRoleView(roleId) : undefined), [roleId]);
  // The footer repeats the list's marker, so it must repeat the list's COUNT —
  // from the same derivation, never a second figure that could disagree.
  const roleCount = useMemo(() => deriveRoleViews().length, []);

  if (!role) return <NotFound />;

  const surfacedVerbs = role.verbs.filter((v) => v.surfaced);

  return (
    <AppShellV2>
      {/* §70 — see the note on `RolesCatalogue`: the shell owns padding and
          nothing constrains page width. This one was `max-w-4xl` while the
          catalogue it links from was `max-w-6xl`, so the two halves of one
          module disagreed. The div survives only to carry its testid. */}
      <div data-testid={`role-detail-${role.id}`}>
        <button
          type="button"
          onClick={() => navigate('/buyer/roles')}
          data-testid="role-detail-back"
          className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary mb-3"
        >
          <ChevronLeft size={14} />
          {t('roles.page.back')}
        </button>

        <header className="mb-5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-text-primary">{t(role.nameKey)}</h1>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-border-subtle text-text-secondary bg-bg-hover"
              data-testid={`role-badge-${role.id}`}
            >
              <Lock size={10} className="text-teal" />
              {t(role.isSystem ? 'roles.page.systemBadge' : 'roles.page.customBadge')}
            </span>
          </div>
          <div className="font-mono text-xs text-data-navy mt-0.5">{role.id}</div>
          <p className="text-sm text-text-secondary mt-2">{t(role.descriptionKey)}</p>
          <p className="text-xs text-text-tertiary mt-1" data-testid={`role-counts-${role.id}`}>
            {t('roles.page.countSummary', {
              permissions: role.atoms.length,
              verbs: role.verbs.length,
              surfaced: role.surfacedCount,
            })}
          </p>
        </header>

        {/* — MODULES — */}
        <section className="bg-white border border-border-subtle rounded-lg p-4 mb-4">
          <div className="text-label text-text-tertiary uppercase">
            {t('roles.page.modulesHeader')}
          </div>
          <ul className="flex flex-wrap gap-1 mt-2" data-testid={`role-modules-${role.id}`}>
            {role.modules.map((m) => (
              <li
                key={m}
                className="font-mono text-[11px] text-data-navy bg-bg-hover border border-border-subtle rounded px-1.5 py-0.5"
              >
                {m}
              </li>
            ))}
          </ul>
        </section>

        {/* — PERMISSIONS. The permission IS the requiredRole string (C10 §3.3);
            there is no other kind, so they are shown as themselves. — */}
        <section className="bg-white border border-border-subtle rounded-lg p-4 mb-4">
          <div className="text-label text-text-tertiary uppercase">
            {t('roles.page.permissionsHeader')}
          </div>
          <ul className="flex flex-wrap gap-1 mt-2" data-testid={`role-atoms-${role.id}`}>
            {role.atoms.map((a) => (
              <li
                key={a}
                className="font-mono text-[11px] text-data-navy border border-border-subtle rounded px-1.5 py-0.5"
              >
                {a}
              </li>
            ))}
          </ul>
        </section>

        {/* — THE ACTS — */}
        <section className="bg-white border border-border-subtle rounded-lg p-4">
          <div className="text-label text-text-tertiary uppercase">
            {t('roles.page.verbsHeader')}
          </div>
          {surfacedVerbs.length === 0 ? (
            <p className="text-xs text-text-tertiary mt-2" data-testid={`role-none-${role.id}`}>
              {t('roles.page.holdsNone')}
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1" data-testid={`role-verbs-${role.id}`}>
              {surfacedVerbs.map((v) => (
                <li key={v.id} className="text-xs flex items-center gap-2">
                  <span className="font-mono text-data-navy">{v.id}</span>
                  <span className="text-text-tertiary">·</span>
                  <span className="font-mono text-[10px] text-text-tertiary">{v.entity}</span>
                  {!v.wired && (
                    <span className="text-[10px] text-text-tertiary italic">
                      {t('roles.page.unwiredNote')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-4 flex gap-2 text-xs text-text-tertiary" data-testid="role-detail-marker">
          <Info size={12} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed">{t('roles.page.readOnlyBody', { count: roleCount })}</p>
        </div>
      </div>
    </AppShellV2>
  );
};

export default RoleDetail;
