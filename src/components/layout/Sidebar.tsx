import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersona } from '../../context/PersonaContext';
import {
  LayoutDashboard, Search, Store, Users, FileText, ScrollText,
  ShoppingCart, Package, Ship, ClipboardCheck, Receipt,
  Award, BarChart2, AlertTriangle, Smartphone,
  Home, MessageSquare, ClipboardList, Truck,
  FolderOpen, BarChart, ShoppingBag, ShieldCheck, Settings, HelpCircle,
} from 'lucide-react';

// ─── Design tokens (inline — matches Odyssey brand system) ──────────────────
const NAVY      = '#0D1B2A';
const BORDER    = '#1E3A5F';
const TEAL      = '#0097A7';
const TEAL_WASH = 'rgba(0, 151, 167, 0.15)';
const HOVER_BG  = 'rgba(255, 255, 255, 0.05)';
const TEXT_DIM  = '#94A3B8';   // default nav item text
const TEXT_MID  = '#64748B';   // section headers, inactive toggle
const TEXT_HOVER = '#CBD5E1';  // hovered nav item

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  badgeColor?: string;
  toastMsg?: string;
}

interface NavSection {
  header?: string;
  items: NavItem[];
}

// ─── Buyer nav ────────────────────────────────────────────────────────────────
const BUYER_SECTIONS: NavSection[] = [
  {
    items: [
      { text: 'Dashboard', icon: <LayoutDashboard size={16} />, path: '/buyer/dashboard' },
    ],
  },
  {
    header: 'ACQUIRE',
    items: [
      { text: 'Supplier Request & Discovery', icon: <Search size={16} />,       path: '/buyer/discovery' },
      { text: 'Supplier Catalog',        icon: <Store size={16} />,        path: '/marketplace' },
      { text: 'Supplier Directory', icon: <Users size={16} />,        path: '/buyer/suppliers' },
      { text: 'Sourcing Events',     icon: <FileText size={16} />,     path: '/buyer/sourcing' },
      { text: 'Contracts',          icon: <ScrollText size={16} />,   path: '/buyer/contracts' },
    ],
  },
  {
    header: 'TRANSACT',
    items: [
      { text: 'Purchase Orders',      icon: <ShoppingCart size={16} />,    path: '/buyer/purchase-orders' },
      { text: 'Inventory Visibility', icon: <Package size={16} />,         path: '/buyer/inventory' },
      { text: 'Shipments & ASN',      icon: <Ship size={16} />,            path: '/buyer/shipments' },
      { text: 'Goods Receipt (GR)',   icon: <ClipboardCheck size={16} />,  path: '/buyer/goods-receipt' },
    ],
  },
  {
    header: 'SETTLE',
    items: [
      { text: 'Invoices & Payment', icon: <Receipt size={16} />, path: '/buyer/invoices' },
    ],
  },
  {
    header: 'INTELLIGENCE',
    items: [
      { text: 'Supplier Scorecard', icon: <Award size={16} />,        path: '/buyer/scorecard' },
      { text: 'Analytics',          icon: <BarChart2 size={16} />,    path: '/buyer/analytics' },
      { text: 'Supply Risk',        icon: <AlertTriangle size={16} />, path: '/buyer/risk' },
      { text: 'Communication Tools', icon: <MessageSquare size={16} />, path: '/buyer/whatsapp' },
    ],
  },
];

const BUYER_FIXED: NavItem[] = [
  { text: 'Compliance (2)', icon: <ShieldCheck size={16} />, path: '/buyer/compliance',
    badge: '2', badgeColor: '#BB0000' },
  { text: 'Settings', icon: <Settings size={16} />, path: '/buyer/settings',
    toastMsg: 'Settings — Coming Soon in Phase 2' },
];

// ─── Supplier nav ─────────────────────────────────────────────────────────────
const SUPPLIER_SECTIONS: NavSection[] = [
  {
    items: [
      { text: 'My Dashboard', icon: <Home size={16} />, path: '/supplier/dashboard' },
    ],
  },
  {
    header: 'RESPOND',
    items: [
      { text: 'Communication Tools', icon: <MessageSquare size={16} />, path: '/supplier/whatsapp' },
      { text: 'My RFQs & Quotes', icon: <ClipboardList size={16} />, path: '/supplier/rfqs' },
    ],
  },
  {
    header: 'EXECUTE',
    items: [
      { text: 'My Orders',          icon: <ShoppingCart size={16} />, path: '/supplier/orders' },
      { text: 'My Shipments & ASN', icon: <Truck size={16} />,        path: '/supplier/ship-notices' },
      { text: 'My Inventory',       icon: <Package size={16} />,      path: '/supplier/inventory' },
    ],
  },
  {
    header: 'SETTLE',
    items: [
      { text: 'My Invoices', icon: <Receipt size={16} />, path: '/supplier/invoices' },
    ],
  },
  {
    header: 'MY PROFILE',
    items: [
      { text: 'My Documents',   icon: <FolderOpen size={16} />,  path: '/supplier/documents' },
      { text: 'My Performance', icon: <BarChart size={16} />,    path: '/supplier/performance' },
      { text: 'My Storefront',  icon: <ShoppingBag size={16} />, path: '/supplier/storefront' },
    ],
  },
];

const SUPPLIER_FIXED: NavItem[] = [
  { text: 'Support', icon: <HelpCircle size={16} />, path: '/supplier/support',
    toastMsg: 'Support chat coming in Phase 2' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ label: string; collapsed: boolean }> = ({ label, collapsed }) => {
  if (collapsed) return null;
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      color: TEXT_MID,
      letterSpacing: '2px',
      padding: '14px 16px 4px 16px',
      textTransform: 'uppercase',
      display: 'block',
      userSelect: 'none',
    }}>
      {label}
    </div>
  );
};

const NavRow: React.FC<{
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}> = ({ item, active, collapsed, onClick }) => {
  const [hovered, setHovered] = React.useState(false);

  const bg    = active ? TEAL_WASH : hovered ? HOVER_BG : 'transparent';
  const color = active ? '#FFFFFF' : hovered ? TEXT_HOVER : TEXT_DIM;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? item.text : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 8,
        padding: collapsed ? '10px 0' : active ? '7px 14px 7px 19px' : '7px 14px',
        margin: collapsed ? undefined : active ? '1px 0' : '1px 8px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: bg,
        color,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: 'all 0.15s ease',
        userSelect: 'none',
        borderLeft: active ? `3px solid ${TEAL}` : 'none',
        borderRadius: active ? '0 6px 6px 0' : collapsed ? 0 : 6,
      }}
    >
      <span style={{
        flexShrink: 0,
        width: collapsed ? 'auto' : '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {item.icon}
      </span>
      {!collapsed && (
        <span style={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {item.text}
        </span>
      )}
      {!collapsed && item.badge && (
        <span style={{
          background: item.badgeColor ?? TEAL,
          color: 'white',
          borderRadius: '9999px',
          fontSize: '10px',
          fontWeight: 700,
          padding: '1px 6px',
          flexShrink: 0,
          minWidth: '18px',
          textAlign: 'center',
        }}>
          {item.badge}
        </span>
      )}
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
interface SidebarProps { collapsed?: boolean; }

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { persona, setPersona } = usePersona();
  const [toast, setToast] = useState<string | null>(null);

  const sections  = persona === 'buyer' ? BUYER_SECTIONS  : SUPPLIER_SECTIONS;
  const fixedItems = persona === 'buyer' ? BUYER_FIXED     : SUPPLIER_FIXED;

  const handlePersonaToggle = (next: 'buyer' | 'supplier') => {
    setPersona(next);
    navigate(next === 'buyer' ? '/buyer/dashboard' : '/supplier/dashboard');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setToast(null), 3500);
  };

  const handleClick = (item: NavItem) => {
    if (item.toastMsg) showToast(item.toastMsg);
    else navigate(item.path);
  };

  return (
    <div style={{
      width: collapsed ? '56px' : '220px',
      minWidth: collapsed ? '56px' : '220px',
      height: '100vh',
      background: NAVY,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s',
      overflow: 'hidden',
      borderRight: `1px solid ${BORDER}`,
      position: 'relative',
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '16px',
          background: '#1E293B',
          color: 'white',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          maxWidth: '260px',
          lineHeight: 1.4,
          borderLeft: `3px solid ${TEAL}`,
        }}>
          {toast}
        </div>
      )}

      {/* OPS PROJECT header */}
      {!collapsed && (
        <div style={{
          height: 36,
          background: 'rgba(0, 151, 167, 0.08)',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 8,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: TEAL,
          }}>
            OPS PROJECT #11
          </span>
        </div>
      )}

      {/* Persona toggle */}
      {!collapsed && (
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['buyer', 'supplier'] as const).map(p => (
              <button
                key={p}
                onClick={() => handlePersonaToggle(p)}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  border: persona === p ? 'none' : `1px solid ${BORDER}`,
                  borderRadius: '9999px',
                  background: persona === p ? TEAL : 'transparent',
                  color: persona === p ? 'white' : TEXT_MID,
                  fontSize: '12px',
                  fontWeight: persona === p ? 600 : 400,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  letterSpacing: '0.02em',
                  transition: 'all 0.15s',
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sectioned nav */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingTop: collapsed ? '8px' : '4px' }}>
        {sections.map((section, si) => (
          <React.Fragment key={si}>
            {section.header && <SectionHeader label={section.header} collapsed={collapsed} />}
            {section.items.map(item => (
              <NavRow
                key={item.path}
                item={item}
                active={location.pathname === item.path ||
                  (item.path !== '/buyer/dashboard' && item.path !== '/supplier/dashboard' &&
                   location.pathname.startsWith(item.path))}
                collapsed={collapsed}
                onClick={() => handleClick(item)}
              />
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* Fixed bottom items */}
      <div style={{
        borderTop: `1px solid ${BORDER}`,
        padding: '8px 0',
        marginTop: 'auto',
      }}>
        {fixedItems.map(item => (
          <NavRow
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            collapsed={collapsed}
            onClick={() => handleClick(item)}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
