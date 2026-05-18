import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Store,
  Users,
  FileText,
  ShoppingCart,
  Truck,
  ClipboardCheck,
  Receipt,
  BarChart2,
  Award,
  AlertTriangle,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';

type Persona = 'buyer' | 'supplier';

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
      { label: 'Dashboard', icon: LayoutDashboard, path: '/v2/dashboard' },
      { label: 'Discovery', icon: Search, path: '/buyer/discovery' },
      { label: 'Marketplace', icon: Store, path: '/marketplace' },
      { label: 'Suppliers', icon: Users, path: '/buyer/suppliers' },
    ],
  },
  {
    label: 'TRANSACT',
    items: [
      { label: 'Requisitions', icon: FileText, path: '/buyer/purchase-requisition' },
      { label: 'Purchase Orders', icon: ShoppingCart, path: '/buyer/purchase-orders' },
      { label: 'Shipments', icon: Truck, path: '/buyer/shipments' },
      { label: 'Goods Receipt', icon: ClipboardCheck, path: '/buyer/goods-receipt' },
    ],
  },
  {
    label: 'SETTLE',
    items: [
      { label: 'Invoices', icon: Receipt, path: '/buyer/invoices' },
      { label: 'Contracts', icon: FileText, path: '/buyer/contracts' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Analytics', icon: BarChart2, path: '/buyer/analytics' },
      { label: 'Scorecard', icon: Award, path: '/buyer/scorecard' },
      { label: 'Risk', icon: AlertTriangle, path: '/buyer/risk' },
      { label: 'Compliance', icon: ShieldCheck, path: '/buyer/compliance' },
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
      { label: 'Ship Notices', icon: Truck, path: '/supplier/ship-notices' },
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
    ],
  },
];

const SidebarV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = `${location.pathname}`;
  const [persona, setPersona] = useState<Persona>('buyer');

  const groups = persona === 'buyer' ? BUYER_NAV : SUPPLIER_NAV;

  return (
    <aside className="w-60 shrink-0 h-full bg-bg-sidebar border-r border-border-subtle flex flex-col">
      {/* Logo block */}
      <div className="px-5 pt-5 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-teal flex items-center justify-center text-white text-xs font-bold">
            P
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-bold tracking-widest text-text-primary">
              PARAGON CORP
            </div>
            <div className="text-[10px] tracking-widest text-teal font-semibold">
              SUPPLIER PORTAL
            </div>
          </div>
        </div>
      </div>

      {/* Persona toggle */}
      <div className="px-4 pt-4">
        <div className="bg-bg-hover rounded-full p-1 flex text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPersona('buyer')}
            className={`flex-1 h-7 rounded-full transition-colors ${
              persona === 'buyer'
                ? 'bg-bg-surface text-text-primary shadow-sm'
                : 'text-text-tertiary'
            }`}
          >
            Buyer
          </button>
          <button
            type="button"
            onClick={() => setPersona('supplier')}
            className={`flex-1 h-7 rounded-full transition-colors ${
              persona === 'supplier'
                ? 'bg-bg-surface text-text-primary shadow-sm'
                : 'text-text-tertiary'
            }`}
          >
            Supplier
          </button>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
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
