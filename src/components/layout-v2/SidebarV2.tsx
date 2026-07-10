import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Store,
  Users,
  FileText,
  ShoppingCart,
  Boxes,
  Truck,
  ClipboardCheck,
  Receipt,
  BarChart2,
  Award,
  AlertTriangle,
  ShieldCheck,
  ScrollText,
  MessageCircle,
  LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { mockSuppliers } from '../../data/mockSuppliers';

const SEED_SUPPLIER_ID = 'sup-007';
const SEED_SUPPLIER_NAME =
  mockSuppliers.find((s) => s.id === SEED_SUPPLIER_ID)?.name ?? null;

interface NavItem {
  labelKey: string;
  icon: LucideIcon;
  path: string;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const BUYER_NAV: NavGroup[] = [
  {
    labelKey: 'nav.section.acquire',
    items: [
      { labelKey: 'nav.buyer.dashboard', icon: LayoutDashboard, path: '/buyer/dashboard' },
      { labelKey: 'nav.buyer.discovery', icon: Search, path: '/buyer/discovery' },
      { labelKey: 'nav.buyer.marketplace', icon: Store, path: '/marketplace' },
      { labelKey: 'nav.buyer.suppliers', icon: Users, path: '/buyer/suppliers' },
      { labelKey: 'nav.buyer.sourcing', icon: FileText, path: '/buyer/sourcing' },
    ],
  },
  {
    labelKey: 'nav.section.transact',
    items: [
      { labelKey: 'nav.buyer.requisitions', icon: FileText, path: '/buyer/purchase-requisition' },
      { labelKey: 'nav.buyer.purchaseOrders', icon: ShoppingCart, path: '/buyer/orders' },
      { labelKey: 'nav.buyer.inventory', icon: Boxes, path: '/buyer/inventory' },
      { labelKey: 'nav.buyer.shipments', icon: Truck, path: '/buyer/shipments' },
      { labelKey: 'nav.buyer.goodsReceipt', icon: ClipboardCheck, path: '/buyer/goods-receipt' },
    ],
  },
  {
    labelKey: 'nav.section.settle',
    items: [
      { labelKey: 'nav.buyer.invoices', icon: Receipt, path: '/buyer/invoices' },
      { labelKey: 'nav.buyer.contracts', icon: ScrollText, path: '/buyer/contracts' },
    ],
  },
  {
    labelKey: 'nav.section.intelligence',
    items: [
      { labelKey: 'nav.buyer.analytics', icon: BarChart2, path: '/buyer/analytics' },
      { labelKey: 'nav.buyer.scorecard', icon: Award, path: '/buyer/scorecard' },
      { labelKey: 'nav.buyer.risk', icon: AlertTriangle, path: '/buyer/risk' },
      { labelKey: 'nav.buyer.compliance', icon: ShieldCheck, path: '/buyer/compliance' },
      { labelKey: 'nav.buyer.whatsapp', icon: MessageCircle, path: '/buyer/whatsapp' },
    ],
  },
];

const SUPPLIER_NAV: NavGroup[] = [
  {
    labelKey: 'nav.section.acquire',
    items: [
      { labelKey: 'nav.supplier.dashboard', icon: LayoutDashboard, path: '/supplier/dashboard' },
      { labelKey: 'nav.supplier.rfqs', icon: Search, path: '/supplier/rfqs' },
      { labelKey: 'nav.supplier.storefront', icon: Store, path: '/supplier/storefront' },
    ],
  },
  {
    labelKey: 'nav.section.transact',
    items: [
      { labelKey: 'nav.supplier.orders', icon: ShoppingCart, path: '/supplier/orders' },
      { labelKey: 'nav.supplier.shipments', icon: Truck, path: '/supplier/shipments' },
      { labelKey: 'nav.supplier.inventory', icon: Boxes, path: '/supplier/inventory' },
    ],
  },
  {
    labelKey: 'nav.section.settle',
    items: [
      { labelKey: 'nav.supplier.invoices', icon: Receipt, path: '/supplier/invoices' },
      { labelKey: 'nav.supplier.documents', icon: FileText, path: '/supplier/documents' },
    ],
  },
  {
    labelKey: 'nav.section.intelligence',
    items: [
      { labelKey: 'nav.supplier.performance', icon: BarChart2, path: '/supplier/performance' },
      { labelKey: 'nav.supplier.whatsapp', icon: MessageCircle, path: '/supplier/whatsapp' },
    ],
  },
];

const SidebarV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const currentPath = `${location.pathname}`;
  const { identity, setIdentity } = useCurrentIdentity();
  const persona = identity.personaType;

  const groups = persona === 'buyer' ? BUYER_NAV : SUPPLIER_NAV;

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
