import React from 'react';
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
}

const BUYER_ITEMS: NavItem[] = [
  { text: 'Dashboard', icon: '⊞', path: '/buyer/dashboard' },
  { text: 'Purchase Orders', icon: '📄', path: '/buyer/purchase-orders' },
  { text: 'Supplier Directory', icon: '🏢', path: '/buyer/suppliers' },
  { text: 'Inventory Visibility', icon: '📦', path: '/buyer/inventory' },
  { text: 'Analytics', icon: '📊', path: '/buyer/analytics' },
];

const BUYER_FIXED_ITEMS: NavItem[] = [
  { text: 'Compliance (2)', icon: '🛡️', path: '/buyer/compliance' },
  { text: 'Settings', icon: '⚙️', path: '/buyer/settings' },
];

const SUPPLIER_ITEMS: NavItem[] = [
  { text: 'My Dashboard', icon: '⊞', path: '/supplier/dashboard' },
  { text: 'My Orders', icon: '📋', path: '/supplier/orders' },
  { text: 'Ship Notices', icon: '🚚', path: '/supplier/ship-notices' },
  { text: 'Invoices', icon: '🧾', path: '/supplier/invoices' },
  { text: 'My Inventory', icon: '📦', path: '/supplier/inventory' },
  { text: 'My Documents', icon: '📎', path: '/supplier/documents' },
];

const SUPPLIER_FIXED_ITEMS: NavItem[] = [
  { text: 'My Performance', icon: '📈', path: '/supplier/performance' },
  { text: 'Support', icon: '💬', path: '/supplier/support' },
];

interface SidebarProps {
  collapsed?: boolean;
}

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
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '10px',
        padding: collapsed ? '10px 0' : '9px 16px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: bg,
        color,
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        transition: 'background 0.15s',
        userSelect: 'none',
        borderLeft: active ? `3px solid ${PARAGON_TEAL}` : '3px solid transparent',
        marginLeft: '-3px',
      }}
    >
      <span style={{ fontSize: '15px', flexShrink: 0, width: collapsed ? 'auto' : '18px', textAlign: 'center' }}>
        {item.icon}
      </span>
      {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { persona, setPersona } = usePersona();

  const mainItems = persona === 'buyer' ? BUYER_ITEMS : SUPPLIER_ITEMS;
  const fixedItems = persona === 'buyer' ? BUYER_FIXED_ITEMS : SUPPLIER_FIXED_ITEMS;
  const sectionLabel = persona === 'buyer' ? 'BUYER' : 'SUPPLIER';

  const handlePersonaToggle = (next: 'buyer' | 'supplier') => {
    setPersona(next);
    navigate(next === 'buyer' ? '/buyer/dashboard' : '/supplier/dashboard');
  };

  return (
    <div style={{
      width: collapsed ? '56px' : '220px',
      minWidth: collapsed ? '56px' : '220px',
      height: '100%',
      background: SHELL_BG,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s',
      overflow: 'hidden',
      borderRight: `1px solid ${SHELL_BORDER}`,
    }}>
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

      {/* Section label */}
      {!collapsed && (
        <div style={{
          fontSize: '10px', fontWeight: 600, color: SHELL_TEXT_MUTED,
          letterSpacing: '2px', padding: '16px 16px 4px', textTransform: 'uppercase',
        }}>
          {sectionLabel}
        </div>
      )}

      {/* Main nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingTop: collapsed ? '8px' : '2px' }}>
        {mainItems.map(item => (
          <NavRow
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            collapsed={collapsed}
            onClick={() => navigate(item.path)}
          />
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
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
