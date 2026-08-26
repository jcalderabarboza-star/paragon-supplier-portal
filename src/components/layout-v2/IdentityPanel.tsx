import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ShieldCheck, Info, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import {
  PERSONA_SYSTEM_ROLES,
  atomsFor,
  type SystemRoleId,
} from '../../services/transitions/businessRoles';

// ─────────────────────────────────────────────────────────────────────────────
// THE IDENTITY PANEL — the current role and the scope it grants.
//
// **IDENTITY BELONGS WITH IDENTITY.** Batch A put authorisation in the machine
// and left it invisible: a user could not see which role they held, so
// "Awaiting Finance" answered *whose act is next* while leaving *who am I*
// unanswered. That is half a handoff.
//
// ⚠️ **ONE ROLE CONTROL, NOT TWO** (operator ruling). The demo role switcher
// lives HERE and nowhere else. A chip block above the navigation was built and
// REJECTED for the reason worth keeping: a persistent control above the nav
// makes role-switching look like a navigation-level concern — something done
// constantly, like a filter. **A person holds a role; they do not shop for one.**
//
// ── THE SPLIT THAT MAKES THIS HONEST: ROLE IS SELECTABLE, SCOPE IS NOT ──────
// The reference (Paragon's TMS) states the role, offers a selector, shows the
// access scope, and says CHANGING SCOPE IS SOMEONE ELSE'S ACT. That last line is
// the same handoff pattern this arc ruled for cross-role verbs, one layer up —
// so it is not decoration, it is the rule applied to identity.
//
// ⚠️ **AND OUR SCOPE AXES ARE DERIVED, NOT IMPORTED.** TMS scopes on warehouses,
// nodes and workspaces. **Those are TMS's axes and none of them exists here.**
// Ours is exactly `QueryScope` — `{ personaType, supplierId }` — because that is
// the tuple every read and every command is actually scoped by. Copying TMS's
// axes would put three words on this panel that no code enforces, which is the
// false-affordance class this project spends its time removing.
// ─────────────────────────────────────────────────────────────────────────────

const IdentityPanel: React.FC = () => {
  const { t } = useTranslation();
  const { identity, setIdentity } = useCurrentIdentity();
  const [open, setOpen] = useState(false);
  // The role list is a DROPDOWN, collapsed by default. A permanently expanded
  // list made the panel as tall as the viewport on the supplier side and put six
  // controls in front of a reader who mostly wants to know WHICH ROLE THEY ARE.
  // Collapsed, the panel STATES the role and offers the change on request.
  const [rolesOpen, setRolesOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const persona = identity.personaType;
  const assignable = PERSONA_SYSTEM_ROLES[persona];
  const held = identity.businessRoles;

  // Close on outside click (mousedown so it beats the button's own onClick) —
  // the LanguageMenu precedent, one component over.
  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Esc collapses the dropdown first, then the panel — the inner surface
      // closes before the outer one, which is what a nested menu owes a
      // keyboard user.
      if (rolesOpen) {
        setRolesOpen(false);
        return;
      }
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!open) setRolesOpen(false);
  }, [open]);

  const toggleRole = useCallback(
    (role: SystemRoleId) => {
      const has = held.includes(role);
      const next = has ? held.filter((r) => r !== role) : [...held, role];
      // ⚠️ A SEAT WITH NO ROLES READS AS A BROKEN PORTAL, NOT A NARROW ONE.
      // Every governed act would refuse and every surface would look defective.
      // Narrowing is a choice; locking yourself out is not one worth offering.
      if (next.length === 0) return;
      setIdentity({ ...identity, businessRoles: next });
    },
    [held, identity, setIdentity],
  );

  // The seat's atoms — DERIVED, so the count cannot drift from what the
  // dispatcher will actually resolve. A restated number here would be
  // `FLOOR-IN-PROSE-01` on an identity panel.
  const atomCount = atomsFor(held).length;

  const initials = persona === 'supplier' ? 'PS' : 'JJ';

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('topbar.userAvatar')}
        data-testid="identity-avatar"
        className="w-8 h-8 rounded-full bg-action-muted text-white text-xs font-semibold flex items-center justify-center hover:ring-2 hover:ring-action/30"
      >
        {initials}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('identity.panel.title')}
          data-testid="identity-panel"
          className="absolute right-0 mt-2 w-80 bg-white border border-border-subtle rounded-lg shadow-lg z-50 p-4 text-left"
        >
          {/* — WHO — */}
          <div className="pb-3 border-b border-border-subtle">
            <div className="text-label text-text-tertiary uppercase">
              {t('identity.panel.signedInAs')}
            </div>
            <div className="text-sm font-medium text-text-primary" data-testid="identity-persona">
              {t(`nav.persona.${persona}`)}
            </div>
          </div>

          {/* — ACCESS SCOPE: SHOWN, NEVER EDITABLE HERE — */}
          <div className="py-3 border-b border-border-subtle">
            <div className="text-label text-text-tertiary uppercase flex items-center gap-1">
              <ShieldCheck size={12} className="text-teal" />
              {t('identity.panel.scope')}
            </div>
            <div className="text-sm text-text-primary mt-0.5" data-testid="identity-scope">
              {identity.supplierId
                ? t('identity.scope.oneSupplier', { name: identity.supplierName ?? identity.supplierId })
                : t('identity.scope.allSuppliers')}
            </div>
            {/* The honest handoff, one layer up from the verb-level one: a scope
                change is somebody else's act, and saying so beats a control that
                silently does nothing. */}
            <div className="text-xs text-text-tertiary mt-1" data-testid="identity-scope-handoff">
              {t('identity.panel.scopeHandoff')}
            </div>
          </div>

          {/* — ROLE: STATED, AND SELECTABLE — */}
          <div className="py-3 border-b border-border-subtle">
            <div className="text-label text-text-tertiary uppercase">
              {t('identity.panel.roles')}
            </div>
            <div className="text-xs text-text-tertiary mb-2" data-testid="identity-roles-summary">
              {t('identity.panel.rolesSummary', { roles: held.length, permissions: atomCount })}
            </div>
            {/* THE ROLE CONTROL — collapsed. The panel's job is to STATE the
                role; changing it is a secondary act and reads as one. */}
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={rolesOpen}
              data-testid="identity-roles-trigger"
              onClick={() => setRolesOpen((o) => !o)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md border border-border-subtle text-sm hover:bg-bg-hover text-left"
            >
              {/* ⚠️ THE CURRENT ROLE, NOT A LIST OF THEM. Enumerating every held
                  role in the trigger turns the panel's headline answer — WHICH
                  ROLE AM I — back into a roster, which is the question the
                  dropdown exists to keep collapsed. Extra roles are a count, so
                  nothing is hidden and nothing is spelled out. */}
              <span className="text-text-primary truncate" data-testid="identity-current-role">
                {t(`roles.owner.${held[0]}`)}
                {held.length > 1 && (
                  <span className="text-text-tertiary"> +{held.length - 1}</span>
                )}
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 text-text-tertiary transition-transform ${rolesOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {rolesOpen && (
              <ul
                role="menu"
                className="mt-1 flex flex-col gap-0.5 border border-border-subtle rounded-md p-1"
                data-testid="identity-roles-list"
              >
                {assignable.map((role) => {
                  const isHeld = held.includes(role);
                  return (
                    <li key={role}>
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={isHeld}
                        data-testid={`identity-role-${role}`}
                        onClick={() => toggleRole(role)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-bg-hover text-left"
                      >
                        <span className={isHeld ? 'text-text-primary' : 'text-text-tertiary'}>
                          {t(`roles.owner.${role}`)}
                        </span>
                        {isHeld && <Check size={14} className="text-action" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* — THE HONEST MARKER (D-CENSUS-8): what is real, what is not — */}
          <div className="pt-3 flex gap-2" data-testid="identity-demo-marker">
            <Info size={12} className="text-text-tertiary shrink-0 mt-0.5" />
            <p className="text-xs text-text-tertiary leading-relaxed">
              {t('identity.panel.demoMarker')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityPanel;
