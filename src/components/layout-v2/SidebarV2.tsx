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
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { mockSuppliers } from '../../data/mockSuppliers';

const SEED_SUPPLIER_ID = 'sup-007';
const SEED_SUPPLIER_NAME =
  mockSuppliers.find((s) => s.id === SEED_SUPPLIER_ID)?.name ?? null;

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const BUYER_NAV: NavGroup[] = [
  {
    label: 'ACQUIRE',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/buyer/dashboard' },
      { label: 'Discovery', icon: Search, path: '/buyer/discovery' },
      { label: 'Marketplace', icon: Store, path: '/marketplace' },
      { label: 'Suppliers', icon: Users, path: '/buyer/suppliers' },
      { label: 'Sourcing & RFQ', icon: FileText, path: '/buyer/sourcing' },
    ],
  },
  {
    label: 'TRANSACT',
    items: [
      { label: 'Requisitions', icon: FileText, path: '/buyer/purchase-requisition' },
      { label: 'Purchase Orders', icon: ShoppingCart, path: '/buyer/orders' },
      { label: 'Inventory Visibility', icon: Boxes, path: '/buyer/inventory' },
      { label: 'Shipments', icon: Truck, path: '/buyer/shipments' },
      { label: 'Goods Receipt', icon: ClipboardCheck, path: '/buyer/goods-receipt' },
    ],
  },
  {
    label: 'SETTLE',
    items: [
      { label: 'Invoices', icon: Receipt, path: '/buyer/invoices' },
      { label: 'Contracts', icon: ScrollText, path: '/buyer/contracts' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Analytics', icon: BarChart2, path: '/buyer/analytics' },
      { label: 'Scorecard', icon: Award, path: '/buyer/scorecard' },
      { label: 'Risk', icon: AlertTriangle, path: '/buyer/risk' },
      { label: 'Compliance', icon: ShieldCheck, path: '/buyer/compliance' },
      { label: 'WhatsApp Hub', icon: MessageCircle, path: '/buyer/whatsapp' },
    ],
  },
];

const SUPPLIER_NAV: NavGroup[] = [
  {
    label: 'ACQUIRE',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/supplier/dashboard' },
      { label: 'RFQs', icon: Search, path: '/supplier/rfqs' },
      { label: 'My Storefront', icon: Store, path: '/supplier/storefront' },
    ],
  },
  {
    label: 'TRANSACT',
    items: [
      { label: 'My Orders', icon: ShoppingCart, path: '/supplier/orders' },
      { label: 'Shipments & ASN', icon: Truck, path: '/supplier/shipments' },
      { label: 'My Inventory', icon: Boxes, path: '/supplier/inventory' },
    ],
  },
  {
    label: 'SETTLE',
    items: [
      { label: 'Invoices', icon: Receipt, path: '/supplier/invoices' },
      { label: 'Documents', icon: FileText, path: '/supplier/documents' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Performance', icon: BarChart2, path: '/supplier/performance' },
      { label: 'WhatsApp Hub', icon: MessageCircle, path: '/supplier/whatsapp' },
    ],
  },
];

const SidebarV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
            onClick={() =>
              setIdentity({
                personaType: 'buyer',
                supplierId: null,
                supplierName: null,
              })
            }
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              persona === 'buyer'
                ? 'bg-white shadow-sm text-text-primary'
                : 'text-text-tertiary'
            }`}
          >
            Buyer
          </button>
          <button
            type="button"
            onClick={() =>
              setIdentity({
                personaType: 'supplier',
                supplierId: SEED_SUPPLIER_ID,
                supplierName: SEED_SUPPLIER_NAME,
              })
            }
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              persona === 'supplier'
                ? 'bg-white shadow-sm text-text-primary'
                : 'text-text-tertiary'
            }`}
          >
            Supplier
          </button>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-label text-text-tertiary px-3 py-2 uppercase">
              {group.label}
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
                          ? 'bg-bg-active-soft text-teal font-semibold'
                          : 'text-text-secondary hover:bg-bg-hover'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-teal rounded-r" />
                      )}
                      <Icon size={18} />
                      <span>{item.label}</span>
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
