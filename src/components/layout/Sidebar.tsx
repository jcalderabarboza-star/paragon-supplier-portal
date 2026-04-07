import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SideNavigation, SideNavigationItem } from '@ui5/webcomponents-react';
import { usePersona } from '../../context/PersonaContext';

interface NavItem {
  text: string;
  icon: string;
  path: string;
}

const BUYER_ITEMS: NavItem[] = [
  { text: 'Dashboard', icon: 'home', path: '/buyer/dashboard' },
  { text: 'Purchase Orders', icon: 'document', path: '/buyer/purchase-orders' },
  { text: 'Supplier Directory', icon: 'business-partner', path: '/buyer/suppliers' },
  { text: 'Inventory Visibility', icon: 'inventory', path: '/buyer/inventory' },
  { text: 'Analytics', icon: 'bar-chart', path: '/buyer/analytics' },
];

const BUYER_FIXED_ITEMS: NavItem[] = [
  { text: 'Compliance (2)', icon: 'certificate', path: '/buyer/compliance' },
  { text: 'Settings', icon: 'action-settings', path: '/buyer/settings' },
];

const SUPPLIER_ITEMS: NavItem[] = [
  { text: 'My Dashboard', icon: 'home', path: '/supplier/dashboard' },
  { text: 'My Orders', icon: 'sales-order', path: '/supplier/orders' },
  { text: 'Ship Notices', icon: 'shipping-status', path: '/supplier/ship-notices' },
  { text: 'Invoices', icon: 'invoice', path: '/supplier/invoices' },
  { text: 'My Inventory', icon: 'inventory', path: '/supplier/inventory' },
  { text: 'My Documents', icon: 'attachment', path: '/supplier/documents' },
];

const SUPPLIER_FIXED_ITEMS: NavItem[] = [
  { text: 'My Performance', icon: 'employee-approvals', path: '/supplier/performance' },
  { text: 'Support', icon: 'sys-help', path: '/supplier/support' },
];

interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { persona } = usePersona();

  const mainItems = persona === 'buyer' ? BUYER_ITEMS : SUPPLIER_ITEMS;
  const fixedItems = persona === 'buyer' ? BUYER_FIXED_ITEMS : SUPPLIER_FIXED_ITEMS;

  const handleSelectionChange = (e: CustomEvent) => {
    const item = e.detail?.item as HTMLElement | undefined;
    const path = item?.dataset?.path;
    if (path) navigate(path);
  };

  return (
    <SideNavigation
      style={{ width: collapsed ? '3.5rem' : '15rem', height: '100%', transition: 'width 0.2s' }}
      collapsed={collapsed}
      onSelectionChange={handleSelectionChange}
    >
      {mainItems.map((item) => (
        <SideNavigationItem
          key={item.path}
          text={item.text}
          icon={item.icon}
          data-path={item.path}
          selected={location.pathname === item.path}
        />
      ))}
      {fixedItems.map((item) => (
        <SideNavigationItem
          key={item.path}
          slot="fixedItems"
          text={item.text}
          icon={item.icon}
          data-path={item.path}
          selected={location.pathname === item.path}
        />
      ))}
    </SideNavigation>
  );
};

export default Sidebar;
