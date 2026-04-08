import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersona } from '../../context/PersonaContext';
import {
  SHELL_BG, SHELL_BORDER, SHELL_TEXT, SHELL_TEXT_MUTED,
  SHELL_ACTIVE_BG, SHELL_HOVER_BG, PARAGON_TEAL,
} from '../../theme/fioriTheme';

interface NavItem {
  text: string;
  icon: string;
  path: string;
  badge?: string;
  toastMsg?: string; // if set, show toast instead of navigating
}

interface NavSection {
  header?: string; // undefined = no label
  items: NavItem[];
}

// ─── Buyer nav ────────────────────────────────────────────────────────────────
const BUYER_SECTIONS: NavSection[] = [
  {
    items: [
      { text: 'Dashboard', icon: '📊', path: '/buyer/dashboard' },
    ],
  },
  {
    header: 'ACQUIRE',
    items: [
      { text: 'Supplier Discovery', icon: '🔍', path: '/buyer/discovery',
        toastMsg: 'Supplier Discovery — Coming Soon in Phase 2' },
      { text: 'Supplier Directory', icon: '🤝', path: '/buyer/suppliers' },
      { text: 'Sourcing & RFQ',     icon: '📋', path: '/buyer/sourcing'  },
    ],
  },
  {
    header: 'TRANSACT',
    items: [
      { text: 'Purchase Orders',     icon: '📄', path: '/buyer/purchase-orders' },
      { text: 'Inventory Visibility', icon: '📦', path: '/buyer/inventory'       },
      { text: 'Shipments & ASN',     icon: '🚢', path: '/buyer/shipments'        },
    ],
  },
  {
    header: 'SETTLE',
    items: [
      { text: 'Invoices & Payment', icon: '🧾', path: '/buyer/invoices',
        toastMsg: 'Invoices & Payment — Coming Soon in Phase 2' },
    ],
  },
  {
    header: 'INTELLIGENCE',
    items: [
      { text: 'Supplier Scorecard', icon: '🏅', path: '/buyer/scorecard' },
      { text: 'Analytics',          icon: '📈', path: '/buyer/analytics' },
      { text: 'Supply Risk',        icon: '⚠️', path: '/buyer/risk'      },
    ],
  },
];

const BUYER_FIXED: NavItem[] = [
  { text: 'Compliance (2)', icon: '✅', path: '/buyer/compliance',
    badge: '2', toastMsg: 'Compliance module — Coming Soon in Phase 2' },
  { text: 'Settings', icon: '⚙️', path: '/buyer/settings',
    toastMsg: 'Settings — Coming Soon in Phase 2' },
];

// ─── Supplier nav ─────────────────────────────────────────────────────────────
const SUPPLIER_SECTIONS: NavSection[] = [
  {
    items: [
      { text: 'My Dashboard', icon: '🏠', path: '/supplier/dashboard' },
    ],
  },
  {
    header: 'RESPOND',
    items: [
      { text: 'My RFQs & Quotes', icon: '📋', path: '/supplier/rfqs' },
    ],
  },
  {
    header: 'EXECUTE',
    items: [
      { text: 'My Orders',          icon: '📄', path: '/supplier/orders' },
      { text: 'My Shipments & ASN', icon: '🚚', path: '/supplier/asn'   },
    ],
  },
  {
    header: 'SETTLE',
    items: [
      { text: 'My Invoices', icon: '🧾', path: '/supplier/invoices' },
    ],
  },
  {
    header: 'MY PROFILE',
    items: [
      { text: 'My Documents',   icon: '📄', path: '/supplier/documents'   },
      { text: 'My Inventory',   icon: '📦', path: '/supplier/inventory'   },
      { text: 'My Performance', icon: '📊', path: '/supplier/performance',
        toastMsg: 'My Performance — Coming Soon in Phase 2' },
    ],
  },
];

const SUPPLIER_FIXED: NavItem[] = [
  { text: 'Support', icon: '💬', path: '/supplier/support',
    toastMsg: 'Support chat coming in Phase 2' },
];

// ─── Components ───────────────────────────────────────────────────────────────
interface SidebarProps { collapsed?: boolean; }

const SectionHeader: React.FC<{ label: string; collapsed: boolean }> = ({ label, collapsed }) => {
  if (collapsed) return null;
  return (
    <div style={{
      fontSize: '10px', fontWeight: 600, color: SHELL_TEXT_MUTED,
      letterSpacing: '2px', padding: '16px 16px 4px',
      textTransform: 'uppercase', userSelect: 'none',
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
  const bg = active ? SHELL_ACTIVE_BG : hovered ? SHELL_HOVER_BG : 'transparent';
  const color = active ? 'white' : SHELL_TEXT;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? item.text : undefined}
      style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : '10px',
        padding: collapsed ? '10px 0' : '9px 16px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: bg, color, cursor: 'pointer',
        fontSize: '13px', fontWeight: active ? 600 : 400,
        transition: 'background 0.15s', userSelect: 'none',
        borderLeft: active ? `3px solid ${PARAGON_TEAL}` : '3px solid transparent',
        marginLeft: '-3px',
      }}
    >
      <span style={{ fontSize: '15px', flexShrink: 0, width: collapsed ? 'auto' : '18px', textAlign: 'center' }}>
        {item.icon}
      </span>
      {!collapsed && (
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.text}
        </span>
      )}
      {!collapsed && item.badge && (
        <span style={{
          background: PARAGON_TEAL, color: 'white', borderRadius: '9999px',
          fontSize: '10px', fontWeight: 700, padding: '1px 6px', flexShrink: 0,
        }}>
          {item.badge}
        </span>
      )}
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { persona, setPersona } = usePersona();
  const [toast, setToast] = useState<string | null>(null);

  const sections = persona === 'buyer' ? BUYER_SECTIONS : SUPPLIER_SECTIONS;
  const fixedItems = persona === 'buyer' ? BUYER_FIXED : SUPPLIER_FIXED;

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
    if (item.toastMsg) {
      showToast(item.toastMsg);
    } else {
      navigate(item.path);
    }
  };

  const allItems = sections.flatMap(s => s.items).concat(fixedItems);

  return (
    <div style={{
      width: collapsed ? '56px' : '220px',
      minWidth: collapsed ? '56px' : '220px',
      height: '100%', background: SHELL_BG,
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s', overflow: 'hidden',
      borderRight: `1px solid ${SHELL_BORDER}`,
      position: 'relative',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '16px',
          background: '#1E293B', color: 'white', borderRadius: 8,
          padding: '10px 14px', fontSize: 12, fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 9999,
          maxWidth: '260px', lineHeight: 1.4,
          borderLeft: `3px solid ${PARAGON_TEAL}`,
        }}>
          {toast}
        </div>
      )}

      {/* Persona toggle pills */}
      {!collapsed && (
        <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${SHELL_BORDER}` }}>
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.06)',
            borderRadius: '6px', padding: '3px', gap: '2px',
          }}>
            {(['buyer', 'supplier'] as const).map(p => (
              <button
                key={p}
                onClick={() => handlePersonaToggle(p)}
                style={{
                  flex: 1, padding: '5px 0', border: 'none', borderRadius: '4px',
                  background: persona === p ? PARAGON_TEAL : 'transparent',
                  color: persona === p ? 'white' : SHELL_TEXT_MUTED,
                  fontSize: '11px', fontWeight: persona === p ? 700 : 500,
                  cursor: 'pointer', textTransform: 'capitalize', letterSpacing: '0.02em',
                  transition: 'background 0.15s, color 0.15s',
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
                active={location.pathname === item.path}
                collapsed={collapsed}
                onClick={() => handleClick(item)}
              />
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* Fixed bottom items */}
      <div style={{ borderTop: `1px solid ${SHELL_BORDER}`, paddingTop: '4px', paddingBottom: '8px' }}>
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
