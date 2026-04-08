import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PersonaProvider } from '../context/PersonaContext';
import AppShell from '../components/layout/AppShell';
import Login from '../pages/auth/Login';

// Buyer pages
import Dashboard from '../pages/buyer/Dashboard';
import PurchaseOrders from '../pages/buyer/PurchaseOrders';
import SupplierDirectory from '../pages/buyer/SupplierDirectory';
import InventoryVisibility from '../pages/buyer/InventoryVisibility';
import Analytics from '../pages/buyer/Analytics';
import Sourcing from '../pages/buyer/Sourcing';
import ShipmentTracking from '../pages/buyer/ShipmentTracking';
import SupplierScorecard from '../pages/buyer/SupplierScorecard';
import SupplyRisk from '../pages/buyer/SupplyRisk';
import SupplierProfile from '../pages/buyer/SupplierProfile';

// Marketplace pages
import MarketplaceDiscovery from '../pages/marketplace/MarketplaceDiscovery';
import SupplierStorefront from '../pages/marketplace/SupplierStorefront';

// Supplier pages
import SupplierDashboard from '../pages/supplier/SupplierDashboard';
import MyOrders from '../pages/supplier/MyOrders';
import ShipNotices from '../pages/supplier/ShipNotices';
import CreateASN from '../pages/supplier/CreateASN';
import Invoices from '../pages/supplier/Invoices';
import MyInventory from '../pages/supplier/MyInventory';
import MyDocuments from '../pages/supplier/MyDocuments';
import SupplierRFQs from '../pages/supplier/SupplierRFQs';
import MyStorefront from '../pages/supplier/MyStorefront';

// Onboarding
import SupplierRegistration from '../pages/onboarding/SupplierRegistration';

const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <PersonaProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SupplierRegistration />} />
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/buyer/dashboard" replace />} />
            <Route path="buyer/dashboard" element={<Dashboard />} />
            <Route path="buyer/purchase-orders" element={<PurchaseOrders />} />
            <Route path="buyer/sourcing" element={<Sourcing />} />
            <Route path="buyer/suppliers" element={<SupplierDirectory />} />
            <Route path="buyer/suppliers/:id" element={<SupplierProfile />} />
            <Route path="buyer/inventory" element={<InventoryVisibility />} />
            <Route path="buyer/shipments" element={<ShipmentTracking />} />
            <Route path="buyer/analytics" element={<Analytics />} />
            <Route path="buyer/scorecard" element={<SupplierScorecard />} />
            <Route path="buyer/risk" element={<SupplyRisk />} />
            <Route path="marketplace" element={<MarketplaceDiscovery />} />
            <Route path="marketplace/supplier/:id" element={<SupplierStorefront />} />
            <Route path="supplier/dashboard" element={<SupplierDashboard />} />
            <Route path="supplier/rfqs" element={<SupplierRFQs />} />
            <Route path="supplier/orders" element={<MyOrders />} />
            <Route path="supplier/ship-notices" element={<ShipNotices />} />
            <Route path="supplier/asn" element={<CreateASN />} />
            <Route path="supplier/invoices" element={<Invoices />} />
            <Route path="supplier/inventory" element={<MyInventory />} />
            <Route path="supplier/documents" element={<MyDocuments />} />
            <Route path="supplier/storefront" element={<MyStorefront />} />
            <Route path="*" element={<Navigate to="/buyer/dashboard" replace />} />
          </Route>
        </Routes>
      </PersonaProvider>
    </HashRouter>
  );
};

export default AppRouter;
