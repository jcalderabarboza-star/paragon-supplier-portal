import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SideNavigation, SideNavigationItem, SideNavigationSubItem } from '@ui5/webcomponents-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SideNavigation
      style={{ width: '15rem', height: '100%' }}
      onSelectionChange={(e) => {
        const item = e.detail?.item;
        const path = item?.dataset?.path;
        if (path) navigate(path);
      }}
    >
      <SideNavigationItem text="Buyer" icon="manager" expanded>
        <SideNavigationSubItem
          text="Dashboard"
          icon="home"
          data-path="/buyer/dashboard"
          selected={location.pathname === '/buyer/dashboard'}
        />
        <SideNavigationSubItem
          text="Purchase Orders"
          icon="document"
          data-path="/buyer/purchase-orders"
          selected={location.pathname === '/buyer/purchase-orders'}
        />
        <SideNavigationSubItem
          text="Supplier Directory"
          icon="business-partner"
          data-path="/buyer/suppliers"
          selected={location.pathname === '/buyer/suppliers'}
        />
        <SideNavigationSubItem
          text="Inventory Visibility"
          icon="inventory"
          data-path="/buyer/inventory"
          selected={location.pathname === '/buyer/inventory'}
        />
        <SideNavigationSubItem
          text="Analytics"
          icon="bar-chart"
          data-path="/buyer/analytics"
          selected={location.pathname === '/buyer/analytics'}
        />
      </SideNavigationItem>
      <SideNavigationItem text="Supplier" icon="supplier" expanded>
        <SideNavigationSubItem
          text="My Dashboard"
          icon="home"
          data-path="/supplier/dashboard"
          selected={location.pathname === '/supplier/dashboard'}
        />
        <SideNavigationSubItem
          text="My Orders"
          icon="sales-order"
          data-path="/supplier/orders"
          selected={location.pathname === '/supplier/orders'}
        />
        <SideNavigationSubItem
          text="Ship Notices"
          icon="shipping-status"
          data-path="/supplier/ship-notices"
          selected={location.pathname === '/supplier/ship-notices'}
        />
        <SideNavigationSubItem
          text="Invoices"
          icon="invoice"
          data-path="/supplier/invoices"
          selected={location.pathname === '/supplier/invoices'}
        />
        <SideNavigationSubItem
          text="My Inventory"
          icon="inventory"
          data-path="/supplier/inventory"
          selected={location.pathname === '/supplier/inventory'}
        />
      </SideNavigationItem>
    </SideNavigation>
  );
};

export default Sidebar;
