import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { mockSuppliers } from '../../data/mockSuppliers';
import { SEEDED_SEAT_ROLES } from '../../services/transitions/businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import { useModuleActivation } from '../../context/ModuleActivationContext';
import { BUYER_NAV, SUPPLIER_NAV, visibleNav } from './navModel';

const SEED_SUPPLIER_ID = 'sup-007';
const SEED_SUPPLIER_NAME =
  mockSuppliers.find((s) => s.id === SEED_SUPPLIER_ID)?.name ?? null;

const SidebarV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const currentPath = `${location.pathname}`;
  const { identity, setIdentity } = useCurrentIdentity();
  const persona = identity.personaType;

  // M1 — an OFF module leaves the navigation (Design 5 §A.3: never a dead
  // link). Its route still renders read-only if reached; the dashboard is PLT
  // and never leaves. A group left with no item leaves too (`visibleNav`).
  const activation = useModuleActivation();
  const groups = visibleNav(persona === 'buyer' ? BUYER_NAV : SUPPLIER_NAV, activation);

  return (
    <aside className="w-60 shrink-0 h-full bg-bg-sidebar border-r border-border-subtle flex flex-col">
      {/* Persona toggle */}
      <div className="mt-4 mb-6 mx-3">
        <div className="bg-bg-hover rounded-full h-8 p-0.5 flex">
          <button
            type="button"
            onClick={() => {
              setIdentity({
                personaType: 'buyer',
                supplierId: null,
                supplierName: null,
                businessRoles: SEEDED_SEAT_ROLES.buyer,
                actor: NO_PERSON,
              });
              navigate('/buyer/dashboard');
            }}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              persona === 'buyer'
                ? 'bg-white shadow-sm text-text-primary'
                : 'text-text-tertiary'
            }`}
          >
            {t('nav.persona.buyer')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIdentity({
                personaType: 'supplier',
                supplierId: SEED_SUPPLIER_ID,
                supplierName: SEED_SUPPLIER_NAME,
                businessRoles: SEEDED_SEAT_ROLES.supplier,
                actor: NO_PERSON,
              });
              navigate('/supplier/dashboard');
            }}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              persona === 'supplier'
                ? 'bg-white shadow-sm text-text-primary'
                : 'text-text-tertiary'
            }`}
          >
            {t('nav.persona.supplier')}
          </button>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
        {groups.map((group) => (
          <div key={group.labelKey}>
            <div className="text-label text-text-tertiary px-3 py-2 uppercase">
              {t(group.labelKey)}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = currentPath === item.path;
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`relative w-full h-9 px-3 rounded-md flex items-center gap-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-action-soft text-action-hover font-semibold'
                          : 'text-text-secondary hover:bg-bg-hover'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-action rounded-r" />
                      )}
                      <Icon size={18} />
                      <span>{t(item.labelKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default SidebarV2;
