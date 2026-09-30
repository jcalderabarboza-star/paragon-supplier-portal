import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CurrentIdentityProvider } from '../context/CurrentIdentityContext';
import { mockIdentitySource } from '../context/identitySources';
import { ModuleActivationProvider, ModuleGate } from '../context/ModuleActivationContext';
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
import BuyerSupplierApplications from '../pages-v2/BuyerSupplierApplications';
import BuyerMaterialRequests from '../pages-v2/BuyerMaterialRequests';
import BuyerPreferredSuppliers from '../pages-v2/BuyerPreferredSuppliers';
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

// M1 · BROWSER-QA HARNESS — built ONLY when `VITE_QA_HARNESS=on` at build time.
// Vite replaces the env read with a literal, so in every other build this is
// `null` and the lazy import is dead code the bundler drops: the shipped bundle
// carries no harness (asserted by grepping the built chunk during QA).
const QaHarness =
  import.meta.env.VITE_QA_HARNESS === 'on' ? lazy(() => import('../qa/QaHarness')) : null;

import { ToastProvider } from '../hooks/useToast';
import Toaster from '../components/ui-v2/Toaster';

const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <ToastProvider>
        <Toaster />
        <CurrentIdentityProvider source={mockIdentitySource}>
        {/* M1 — what is switched on, read through the service; every route below
            except the redirect and the 404 sits in its module's gate. */}
        <ModuleActivationProvider>
        {QaHarness && (
          <Suspense fallback={null}>
            <QaHarness />
          </Suspense>
        )}
        <Routes>
          <Route path="/login" element={<ModuleGate path="/login"><Login /></ModuleGate>} />
          <Route path="/register" element={<ModuleGate path="/register"><SupplierRegistrationV2 /></ModuleGate>} />
          <Route path="/buyer/dashboard" element={<ModuleGate path="/buyer/dashboard"><BuyerDashboard /></ModuleGate>} />
          <Route path="/buyer/suppliers" element={<ModuleGate path="/buyer/suppliers"><BuyerSuppliers /></ModuleGate>} />
          <Route path="/buyer/suppliers/:id" element={<ModuleGate path="/buyer/suppliers/:id"><BuyerSupplierProfile /></ModuleGate>} />
          <Route path="/marketplace" element={<ModuleGate path="/marketplace"><Marketplace /></ModuleGate>} />
          <Route path="/marketplace/supplier/:id" element={<ModuleGate path="/marketplace/supplier/:id"><SupplierStorefrontV2 /></ModuleGate>} />
          <Route path="/buyer/orders" element={<ModuleGate path="/buyer/orders"><BuyerOrders /></ModuleGate>} />
          <Route path="/buyer/sourcing" element={<ModuleGate path="/buyer/sourcing"><BuyerSourcing /></ModuleGate>} />
          {/* Phase A/1 — the recommend-first triage that precedes the plan-grid
              push. Plain DOM (no grid engine) — stays in the entry chunk. */}
          <Route path="/buyer/intake-review" element={<ModuleGate path="/buyer/intake-review"><IntakeReview /></ModuleGate>} />
          <Route
            path="/buyer/plan-grid"
            element={
              <ModuleGate path="/buyer/plan-grid">
                <Suspense fallback={<LoadingState />}>
                  <PlanGrid />
                </Suspense>
              </ModuleGate>
            }
          />
          <Route
            path="/buyer/collaboration"
            element={
              <ModuleGate path="/buyer/collaboration">
                <Suspense fallback={<LoadingState />}>
                  <BuyerCollaboration />
                </Suspense>
              </ModuleGate>
            }
          />
          <Route path="/buyer/contracts" element={<ModuleGate path="/buyer/contracts"><BuyerContracts /></ModuleGate>} />
          {/* Nested contract detail — the traceability spine's leaf (Overview |
              Delivery Agreements | Docs). Must sit AFTER the list route. */}
          <Route path="/buyer/contracts/:id" element={<ModuleGate path="/buyer/contracts/:id"><BuyerContractDetail /></ModuleGate>} />
          <Route path="/buyer/delivery-agreements" element={<ModuleGate path="/buyer/delivery-agreements"><BuyerDeliveryAgreements /></ModuleGate>} />
          <Route path="/buyer/chase" element={<ModuleGate path="/buyer/chase"><BuyerChase /></ModuleGate>} />
          <Route path="/buyer/inventory" element={<ModuleGate path="/buyer/inventory"><BuyerInventory /></ModuleGate>} />
          <Route path="/buyer/shipments" element={<ModuleGate path="/buyer/shipments"><BuyerShipments /></ModuleGate>} />
          <Route path="/buyer/goods-receipt" element={<ModuleGate path="/buyer/goods-receipt"><BuyerGoodsReceipt /></ModuleGate>} />
          <Route path="/buyer/discovery" element={<ModuleGate path="/buyer/discovery"><BuyerDiscovery /></ModuleGate>} />
          <Route path="/buyer/purchase-requisition" element={<ModuleGate path="/buyer/purchase-requisition"><BuyerRequisitions /></ModuleGate>} />
          <Route path="/buyer/supplier-applications" element={<ModuleGate path="/buyer/supplier-applications"><BuyerSupplierApplications /></ModuleGate>} />
          <Route path="/buyer/material-requests" element={<ModuleGate path="/buyer/material-requests"><BuyerMaterialRequests /></ModuleGate>} />
          {/* PSL P3 — the preferred-supplier queue. A flat <Routes> with no
              layout route, so the page brings its own AppShellV2; a page that
              forgets it renders with no sidebar and no way back, and
              `renderWithProviders` will never say so
              (`ROUTE-SMOKE-GUARD-IS-SELF-REFERENTIAL-01`). */}
          <Route
            path="/buyer/preferred-suppliers"
            element={<ModuleGate path="/buyer/preferred-suppliers"><BuyerPreferredSuppliers /></ModuleGate>}
          />
          <Route path="/buyer/invoices" element={<ModuleGate path="/buyer/invoices"><BuyerInvoices /></ModuleGate>} />
          <Route path="/buyer/scorecard" element={<ModuleGate path="/buyer/scorecard"><BuyerScorecard /></ModuleGate>} />
          <Route path="/buyer/analytics" element={<ModuleGate path="/buyer/analytics"><BuyerAnalytics /></ModuleGate>} />
          <Route path="/buyer/risk" element={<ModuleGate path="/buyer/risk"><BuyerRisk /></ModuleGate>} />
          {/* Comm Hub C4a — the buyer/planner front door (chase-derived outbound
              queue + channel-sourced provenance trail). Replaces the retired
              WhatsApp-Hub engagement mock. */}
          <Route path="/buyer/comm-hub" element={<ModuleGate path="/buyer/comm-hub"><BuyerCommHub /></ModuleGate>} />
          <Route path="/buyer/compliance" element={<ModuleGate path="/buyer/compliance"><BuyerCompliance /></ModuleGate>} />
          {/* PF-1 — the Process Flows module: the surface for the PF-0
              flow-graph analyzer. Everything it draws is derived from
              getKnownFlows(); there is no second copy of any machine. */}
          <Route path="/buyer/process-flows" element={<ModuleGate path="/buyer/process-flows"><ProcessFlows /></ModuleGate>} />
          <Route path="/buyer/roles" element={<ModuleGate path="/buyer/roles"><RolesCatalogue /></ModuleGate>} />
          <Route path="/buyer/roles/:roleId" element={<ModuleGate path="/buyer/roles/:roleId"><RoleDetail /></ModuleGate>} />
          <Route path="/glossary" element={<ModuleGate path="/glossary"><Glossary /></ModuleGate>} />
          <Route path="/supplier/dashboard" element={<ModuleGate path="/supplier/dashboard"><SupplierDashboardV2 /></ModuleGate>} />
          <Route path="/supplier/storefront" element={<ModuleGate path="/supplier/storefront"><SupplierMyStorefront /></ModuleGate>} />
          <Route path="/supplier/documents" element={<ModuleGate path="/supplier/documents"><SupplierDocumentsV2 /></ModuleGate>} />
          <Route path="/supplier/whatsapp" element={<ModuleGate path="/supplier/whatsapp"><SupplierWhatsApp /></ModuleGate>} />
          {/* Comm Hub C2 — inbound reply triage (confirm-before-commit). */}
          <Route path="/supplier/comm-hub" element={<ModuleGate path="/supplier/comm-hub"><CommHubInbound /></ModuleGate>} />
          <Route path="/supplier/orders" element={<ModuleGate path="/supplier/orders"><SupplierOrders /></ModuleGate>} />
          <Route path="/supplier/rfqs" element={<ModuleGate path="/supplier/rfqs"><SupplierRFQsV2 /></ModuleGate>} />
          <Route
            path="/supplier/forecasts"
            element={
              <ModuleGate path="/supplier/forecasts">
                <Suspense fallback={<LoadingState />}>
                  <SupplierForecasts />
                </Suspense>
              </ModuleGate>
            }
          />
          <Route path="/supplier/shipments" element={<ModuleGate path="/supplier/shipments"><SupplierShipments /></ModuleGate>} />
          <Route path="/supplier/invoices" element={<ModuleGate path="/supplier/invoices"><SupplierInvoicesV2 /></ModuleGate>} />
          <Route path="/supplier/inventory" element={<ModuleGate path="/supplier/inventory"><SupplierInventoryV2 /></ModuleGate>} />
          <Route path="/supplier/delivery-agreements" element={<ModuleGate path="/supplier/delivery-agreements"><SupplierDeliveryAgreements /></ModuleGate>} />
          <Route path="/supplier/performance" element={<ModuleGate path="/supplier/performance"><SupplierPerformance /></ModuleGate>} />
          <Route path="/" element={<Navigate to="/buyer/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ModuleActivationProvider>
        </CurrentIdentityProvider>
      </ToastProvider>
    </HashRouter>
  );
};

export default AppRouter;
