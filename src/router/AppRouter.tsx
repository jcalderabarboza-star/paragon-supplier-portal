import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PersonaProvider } from '../context/PersonaContext';
import AppShell from '../components/layout/AppShell';
import Login from '../pages/auth/Login';

// Buyer pages
import Dashboard from '../pages/buyer/Dashboard';
import PurchaseOrders from '../pages/buyer/PurchaseOrders';
import PurchaseRequisition from '../pages/buyer/PurchaseRequisition';
import SupplierDirectory from '../pages/buyer/SupplierDirectory';
import InventoryVisibility from '../pages/buyer/InventoryVisibility';
import Analytics from '../pages/buyer/Analytics';
import InvoicePayment from '../pages/buyer/InvoicePayment';
import Sourcing from '../pages/buyer/Sourcing';
import ShipmentTracking from '../pages/buyer/ShipmentTracking';
import SupplierScorecard from '../pages/buyer/SupplierScorecard';
import SupplyRisk from '../pages/buyer/SupplyRisk';
import SupplierProfile from '../pages/buyer/SupplierProfile';
import GoodsReceipt from '../pages/buyer/GoodsReceipt';
import SupplierDiscovery from '../pages/buyer/SupplierDiscovery';
import ContractManagement from '../pages/buyer/ContractManagement';
import WhatsAppHub from '../pages/buyer/WhatsAppHub';
import Compliance from '../pages/buyer/Compliance';

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
import MyPerformance from '../pages/supplier/MyPerformance';
import SupplierRFQs from '../pages/supplier/SupplierRFQs';
import MyStorefront from '../pages/supplier/MyStorefront';
import WhatsAppSimulator from '../pages/supplier/WhatsAppSimulator';

// Onboarding
import SupplierRegistration from '../pages/onboarding/SupplierRegistration';

// V2 pages (new design system — additive)
import BuyerDashboard from '../pages-v2/BuyerDashboard';
import BuyerSuppliers from '../pages-v2/BuyerSuppliers';
import BuyerSupplierProfile from '../pages-v2/BuyerSupplierProfile';
import Marketplace from '../pages-v2/Marketplace';
import SupplierStorefrontV2 from '../pages-v2/SupplierStorefront';
import BuyerOrders from '../pages-v2/BuyerOrders';
import BuyerSourcing from '../pages-v2/BuyerSourcing';
import BuyerContracts from '../pages-v2/BuyerContracts';
import BuyerInventory from '../pages-v2/BuyerInventory';
import BuyerShipments from '../pages-v2/BuyerShipments';
import BuyerGoodsReceipt from '../pages-v2/BuyerGoodsReceipt';
import BuyerDiscovery from '../pages-v2/BuyerDiscovery';
import BuyerRequisitions from '../pages-v2/BuyerRequisitions';
import BuyerInvoices from '../pages-v2/BuyerInvoices';
import BuyerScorecard from '../pages-v2/BuyerScorecard';
import BuyerAnalytics from '../pages-v2/BuyerAnalytics';
import BuyerRisk from '../pages-v2/BuyerRisk';
import BuyerWhatsAppHub from '../pages-v2/BuyerWhatsAppHub';
import BuyerCompliance from '../pages-v2/BuyerCompliance';

import { ToastProvider } from '../hooks/useToast';
import Toaster from '../components/ui-v2/Toaster';

const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <ToastProvider>
        <Toaster />
        <PersonaProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SupplierRegistration />} />
          <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
          <Route path="/buyer/suppliers" element={<BuyerSuppliers />} />
          <Route path="/buyer/suppliers/:id" element={<BuyerSupplierProfile />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/supplier/:id" element={<SupplierStorefrontV2 />} />
          <Route path="/buyer/orders" element={<BuyerOrders />} />
          <Route path="/buyer/sourcing" element={<BuyerSourcing />} />
          <Route path="/buyer/contracts" element={<BuyerContracts />} />
          <Route path="/buyer/inventory" element={<BuyerInventory />} />
          <Route path="/buyer/shipments" element={<BuyerShipments />} />
          <Route path="/buyer/goods-receipt" element={<BuyerGoodsReceipt />} />
          <Route path="/buyer/discovery" element={<BuyerDiscovery />} />
          <Route path="/buyer/purchase-requisition" element={<BuyerRequisitions />} />
          <Route path="/buyer/invoices" element={<BuyerInvoices />} />
          <Route path="/buyer/scorecard" element={<BuyerScorecard />} />
          <Route path="/buyer/analytics" element={<BuyerAnalytics />} />
          <Route path="/buyer/risk" element={<BuyerRisk />} />
          <Route path="/buyer/whatsapp" element={<BuyerWhatsAppHub />} />
          <Route path="/buyer/compliance" element={<BuyerCompliance />} />
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/buyer/dashboard" replace />} />

            {/* ── Buyer routes ── */}
            <Route path="v1/buyer/dashboard"     element={<Dashboard />} />
            <Route path="v1/buyer/purchase-requisition" element={<PurchaseRequisition />} />
            <Route path="v1/buyer/orders"        element={<PurchaseOrders />} />
            <Route path="v1/buyer/sourcing"      element={<Sourcing />} />
            <Route path="v1/buyer/suppliers"     element={<SupplierDirectory />} />
            <Route path="v1/buyer/suppliers/:id" element={<SupplierProfile />} />
            <Route path="v1/buyer/inventory"     element={<InventoryVisibility />} />
            <Route path="v1/buyer/shipments"     element={<ShipmentTracking />} />
            <Route path="v1/buyer/goods-receipt" element={<GoodsReceipt />} />
            <Route path="v1/buyer/discovery"     element={<SupplierDiscovery />} />
            <Route path="v1/buyer/contracts"     element={<ContractManagement />} />
            <Route path="v1/buyer/whatsapp"      element={<WhatsAppHub />} />
            <Route path="v1/buyer/analytics"     element={<Analytics />} />
            <Route path="v1/buyer/invoices"      element={<InvoicePayment />} />
            <Route path="v1/buyer/scorecard"     element={<SupplierScorecard />} />
            <Route path="v1/buyer/risk"          element={<SupplyRisk />} />
            <Route path="v1/buyer/compliance"    element={<Compliance />} />

            {/* ── Marketplace routes ── */}
            <Route path="v1/marketplace"              element={<MarketplaceDiscovery />} />
            <Route path="v1/marketplace/supplier/:id" element={<SupplierStorefront />} />

            {/* ── Supplier routes ── */}
            <Route path="supplier/dashboard"    element={<SupplierDashboard />} />
            <Route path="supplier/rfqs"         element={<SupplierRFQs />} />
            <Route path="supplier/orders"       element={<MyOrders />} />
            <Route path="supplier/ship-notices" element={<ShipNotices />} />
            <Route path="supplier/asn"          element={<CreateASN />} />
            <Route path="supplier/invoices"     element={<Invoices />} />
            <Route path="supplier/inventory"    element={<MyInventory />} />
            <Route path="supplier/documents"    element={<MyDocuments />} />
            <Route path="supplier/performance"  element={<MyPerformance />} />
            <Route path="supplier/storefront"   element={<MyStorefront />} />
            <Route path="supplier/whatsapp"     element={<WhatsAppSimulator />} />

            <Route path="*" element={<Navigate to="/buyer/dashboard" replace />} />
          </Route>
        </Routes>
        </PersonaProvider>
      </ToastProvider>
    </HashRouter>
  );
};

export default AppRouter;
