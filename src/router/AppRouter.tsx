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

// Supplier pages
import SupplierDashboard from '../pages/supplier/SupplierDashboard';
import MyOrders from '../pages/supplier/MyOrders';
import ShipNotices from '../pages/supplier/ShipNotices';
import CreateASN from '../pages/supplier/CreateASN';
import Invoices from '../pages/supplier/Invoices';
import MyInventory from '../pages/supplier/MyInventory';
import MyDocuments from '../pages/supplier/MyDocuments';

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
            <Route path="buyer/inventory" element={<InventoryVisibility />} />
            <Route path="buyer/shipments" element={<ShipmentTracking />} />
            <Route path="buyer/analytics" element={<Analytics />} />
            <Route path="supplier/dashboard" element={<SupplierDashboard />} />
            <Route path="supplier/orders" element={<MyOrders />} />
            <Route path="supplier/ship-notices" element={<ShipNotices />} />
            <Route path="supplier/asn" element={<CreateASN />} />
            <Route path="supplier/invoices" element={<Invoices />} />
            <Route path="supplier/inventory" element={<MyInventory />} />
            <Route path="supplier/documents" element={<MyDocuments />} />
            <Route path="*" element={<Navigate to="/buyer/dashboard" replace />} />
          </Route>
        </Routes>
      </PersonaProvider>
    </HashRouter>
  );
};

export default AppRouter;
