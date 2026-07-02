import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CurrentIdentityProvider } from '../context/CurrentIdentityContext';
import { mockIdentitySource } from '../context/identitySources';
import Login from '../pages/auth/Login';

// V2 pages (canonical)
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
import SupplierDashboardV2 from '../pages-v2/SupplierDashboard';
import SupplierMyStorefront from '../pages-v2/SupplierMyStorefront';
import SupplierDocumentsV2 from '../pages-v2/SupplierDocuments';
import SupplierWhatsApp from '../pages-v2/SupplierWhatsApp';
import SupplierOrders from '../pages-v2/SupplierOrders';
import SupplierRFQsV2 from '../pages-v2/SupplierRFQs';
import SupplierShipments from '../pages-v2/SupplierShipments';
import SupplierInvoicesV2 from '../pages-v2/SupplierInvoices';
import SupplierInventoryV2 from '../pages-v2/SupplierInventory';
import SupplierRegistrationV2 from '../pages-v2/SupplierRegistration';
import SupplierPerformance from '../pages-v2/SupplierPerformance';
import NotFound from '../pages-v2/NotFound';

import { ToastProvider } from '../hooks/useToast';
import Toaster from '../components/ui-v2/Toaster';

const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <ToastProvider>
        <Toaster />
        <CurrentIdentityProvider source={mockIdentitySource}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SupplierRegistrationV2 />} />
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
          <Route path="/supplier/dashboard" element={<SupplierDashboardV2 />} />
          <Route path="/supplier/storefront" element={<SupplierMyStorefront />} />
          <Route path="/supplier/documents" element={<SupplierDocumentsV2 />} />
          <Route path="/supplier/whatsapp" element={<SupplierWhatsApp />} />
          <Route path="/supplier/orders" element={<SupplierOrders />} />
          <Route path="/supplier/rfqs" element={<SupplierRFQsV2 />} />
          <Route path="/supplier/shipments" element={<SupplierShipments />} />
          <Route path="/supplier/invoices" element={<SupplierInvoicesV2 />} />
          <Route path="/supplier/inventory" element={<SupplierInventoryV2 />} />
          <Route path="/supplier/performance" element={<SupplierPerformance />} />
          <Route path="/" element={<Navigate to="/buyer/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </CurrentIdentityProvider>
      </ToastProvider>
    </HashRouter>
  );
};

export default AppRouter;
