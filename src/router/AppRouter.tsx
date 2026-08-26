import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CurrentIdentityProvider } from '../context/CurrentIdentityContext';
import { mockIdentitySource } from '../context/identitySources';
import LoadingState from '../components/ui-v2/LoadingState';
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
import BuyerContractDetail from '../pages-v2/BuyerContractDetail';
import BuyerDeliveryAgreements from '../pages-v2/BuyerDeliveryAgreements';
import BuyerChase from '../pages-v2/BuyerChase';
import BuyerInventory from '../pages-v2/BuyerInventory';
import BuyerShipments from '../pages-v2/BuyerShipments';
import BuyerGoodsReceipt from '../pages-v2/BuyerGoodsReceipt';
import BuyerDiscovery from '../pages-v2/BuyerDiscovery';
import BuyerRequisitions from '../pages-v2/BuyerRequisitions';
import IntakeReview from '../pages-v2/IntakeReview';
import BuyerInvoices from '../pages-v2/BuyerInvoices';
import BuyerScorecard from '../pages-v2/BuyerScorecard';
import BuyerAnalytics from '../pages-v2/BuyerAnalytics';
import BuyerRisk from '../pages-v2/BuyerRisk';
import BuyerCommHub from '../pages-v2/BuyerCommHub';
import BuyerCompliance from '../pages-v2/BuyerCompliance';
import ProcessFlows from '../pages-v2/ProcessFlows';
import RolesCatalogue from '../pages-v2/RolesCatalogue';
import RoleDetail from '../pages-v2/RoleDetail';
// GL-1 — the glossary surface. PERSONA-NEUTRAL by route, deliberately: the term
// chips that lead here sit on buyer AND supplier refusal sites, so a
// `/buyer/...` path would have sent every supplier out of their own shell.
import Glossary from '../pages-v2/Glossary';
import SupplierDashboardV2 from '../pages-v2/SupplierDashboard';
import SupplierMyStorefront from '../pages-v2/SupplierMyStorefront';
import SupplierDocumentsV2 from '../pages-v2/SupplierDocuments';
import SupplierWhatsApp from '../pages-v2/SupplierWhatsApp';
import CommHubInbound from '../pages-v2/CommHubInbound';
import SupplierOrders from '../pages-v2/SupplierOrders';
import SupplierRFQsV2 from '../pages-v2/SupplierRFQs';
import SupplierShipments from '../pages-v2/SupplierShipments';
import SupplierInvoicesV2 from '../pages-v2/SupplierInvoices';
import SupplierInventoryV2 from '../pages-v2/SupplierInventory';
import SupplierRegistrationV2 from '../pages-v2/SupplierRegistration';
import SupplierDeliveryAgreements from '../pages-v2/SupplierDeliveryAgreements';
import SupplierPerformance from '../pages-v2/SupplierPerformance';
import NotFound from '../pages-v2/NotFound';

// Stage G · G1.2a — the FIRST route-split on main. The react-datasheet-grid
// engine ships in this page's own async chunk (lazy import), so it never enters
// the main entry chunk; first paint stays flat.
const PlanGrid = lazy(() => import('../pages-v2/PlanGrid'));
// SDC-1b — the second DSG consumer. Also lazy, so Vite hoists the shared
// engine into one common async chunk; the entry chunk stays flat.
const BuyerCollaboration = lazy(() => import('../pages-v2/BuyerCollaboration'));
// SDC-2b — the P1 supplier submission surface (no DSG; lazy keeps the SDC
// module out of the entry chunk).
const SupplierForecasts = lazy(() => import('../pages-v2/SupplierForecasts'));

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
          {/* Phase A/1 — the recommend-first triage that precedes the plan-grid
              push. Plain DOM (no grid engine) — stays in the entry chunk. */}
          <Route path="/buyer/intake-review" element={<IntakeReview />} />
          <Route
            path="/buyer/plan-grid"
            element={
              <Suspense fallback={<LoadingState />}>
                <PlanGrid />
              </Suspense>
            }
          />
          <Route
            path="/buyer/collaboration"
            element={
              <Suspense fallback={<LoadingState />}>
                <BuyerCollaboration />
              </Suspense>
            }
          />
          <Route path="/buyer/contracts" element={<BuyerContracts />} />
          {/* Nested contract detail — the traceability spine's leaf (Overview |
              Delivery Agreements | Docs). Must sit AFTER the list route. */}
          <Route path="/buyer/contracts/:id" element={<BuyerContractDetail />} />
          <Route path="/buyer/delivery-agreements" element={<BuyerDeliveryAgreements />} />
          <Route path="/buyer/chase" element={<BuyerChase />} />
          <Route path="/buyer/inventory" element={<BuyerInventory />} />
          <Route path="/buyer/shipments" element={<BuyerShipments />} />
          <Route path="/buyer/goods-receipt" element={<BuyerGoodsReceipt />} />
          <Route path="/buyer/discovery" element={<BuyerDiscovery />} />
          <Route path="/buyer/purchase-requisition" element={<BuyerRequisitions />} />
          <Route path="/buyer/invoices" element={<BuyerInvoices />} />
          <Route path="/buyer/scorecard" element={<BuyerScorecard />} />
          <Route path="/buyer/analytics" element={<BuyerAnalytics />} />
          <Route path="/buyer/risk" element={<BuyerRisk />} />
          {/* Comm Hub C4a — the buyer/planner front door (chase-derived outbound
              queue + channel-sourced provenance trail). Replaces the retired
              WhatsApp-Hub engagement mock. */}
          <Route path="/buyer/comm-hub" element={<BuyerCommHub />} />
          <Route path="/buyer/compliance" element={<BuyerCompliance />} />
          {/* PF-1 — the Process Flows module: the surface for the PF-0
              flow-graph analyzer. Everything it draws is derived from
              getKnownFlows(); there is no second copy of any machine. */}
          <Route path="/buyer/process-flows" element={<ProcessFlows />} />
          <Route path="/buyer/roles" element={<RolesCatalogue />} />
          <Route path="/buyer/roles/:roleId" element={<RoleDetail />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/supplier/dashboard" element={<SupplierDashboardV2 />} />
          <Route path="/supplier/storefront" element={<SupplierMyStorefront />} />
          <Route path="/supplier/documents" element={<SupplierDocumentsV2 />} />
          <Route path="/supplier/whatsapp" element={<SupplierWhatsApp />} />
          {/* Comm Hub C2 — inbound reply triage (confirm-before-commit). */}
          <Route path="/supplier/comm-hub" element={<CommHubInbound />} />
          <Route path="/supplier/orders" element={<SupplierOrders />} />
          <Route path="/supplier/rfqs" element={<SupplierRFQsV2 />} />
          <Route
            path="/supplier/forecasts"
            element={
              <Suspense fallback={<LoadingState />}>
                <SupplierForecasts />
              </Suspense>
            }
          />
          <Route path="/supplier/shipments" element={<SupplierShipments />} />
          <Route path="/supplier/invoices" element={<SupplierInvoicesV2 />} />
          <Route path="/supplier/inventory" element={<SupplierInventoryV2 />} />
          <Route path="/supplier/delivery-agreements" element={<SupplierDeliveryAgreements />} />
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
