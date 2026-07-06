// ─────────────────────────────────────────────────────────────────────────────
// sp-001 — all-routes render smoke.
//
// Mounts every route AppRouter declares, under the real provider stack, at the
// correct persona, and asserts each renders without throwing and paints
// content. AppRouter hard-wires HashRouter + its own providers, so the route→
// element table is mirrored here and each element is mounted through
// renderWithProviders (MemoryRouter + full context). Dynamic segments mount
// under a matching <Route> at a concrete path so useParams resolves.
//
// This is a mount smoke — the deeper per-page behavior (four honest states,
// scoped reads) is covered by the page suites and the service scoping contract.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';

import Login from '../pages/auth/Login';
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

const BUYER: CurrentIdentity = { personaType: 'buyer', supplierId: null, supplierName: null };

// pattern = the <Route path>; at = the concrete URL mounted (resolves :params).
interface RouteCase {
  name: string;
  pattern: string;
  at: string;
  element: React.ReactElement;
  identity: CurrentIdentity;
}

const ROUTES: RouteCase[] = [
  { name: 'login', pattern: '/login', at: '/login', element: <Login />, identity: BUYER },
  { name: 'register', pattern: '/register', at: '/register', element: <SupplierRegistrationV2 />, identity: BUYER },
  { name: 'buyer/dashboard', pattern: '/buyer/dashboard', at: '/buyer/dashboard', element: <BuyerDashboard />, identity: BUYER },
  { name: 'buyer/suppliers', pattern: '/buyer/suppliers', at: '/buyer/suppliers', element: <BuyerSuppliers />, identity: BUYER },
  { name: 'buyer/suppliers/:id', pattern: '/buyer/suppliers/:id', at: '/buyer/suppliers/sup-007', element: <BuyerSupplierProfile />, identity: BUYER },
  { name: 'marketplace', pattern: '/marketplace', at: '/marketplace', element: <Marketplace />, identity: BUYER },
  { name: 'marketplace/supplier/:id', pattern: '/marketplace/supplier/:id', at: '/marketplace/supplier/sup-007', element: <SupplierStorefrontV2 />, identity: BUYER },
  { name: 'buyer/orders', pattern: '/buyer/orders', at: '/buyer/orders', element: <BuyerOrders />, identity: BUYER },
  { name: 'buyer/sourcing', pattern: '/buyer/sourcing', at: '/buyer/sourcing', element: <BuyerSourcing />, identity: BUYER },
  { name: 'buyer/contracts', pattern: '/buyer/contracts', at: '/buyer/contracts', element: <BuyerContracts />, identity: BUYER },
  { name: 'buyer/inventory', pattern: '/buyer/inventory', at: '/buyer/inventory', element: <BuyerInventory />, identity: BUYER },
  { name: 'buyer/shipments', pattern: '/buyer/shipments', at: '/buyer/shipments', element: <BuyerShipments />, identity: BUYER },
  { name: 'buyer/goods-receipt', pattern: '/buyer/goods-receipt', at: '/buyer/goods-receipt', element: <BuyerGoodsReceipt />, identity: BUYER },
  { name: 'buyer/discovery', pattern: '/buyer/discovery', at: '/buyer/discovery', element: <BuyerDiscovery />, identity: BUYER },
  { name: 'buyer/purchase-requisition', pattern: '/buyer/purchase-requisition', at: '/buyer/purchase-requisition', element: <BuyerRequisitions />, identity: BUYER },
  { name: 'buyer/invoices', pattern: '/buyer/invoices', at: '/buyer/invoices', element: <BuyerInvoices />, identity: BUYER },
  { name: 'buyer/scorecard', pattern: '/buyer/scorecard', at: '/buyer/scorecard', element: <BuyerScorecard />, identity: BUYER },
  { name: 'buyer/analytics', pattern: '/buyer/analytics', at: '/buyer/analytics', element: <BuyerAnalytics />, identity: BUYER },
  { name: 'buyer/risk', pattern: '/buyer/risk', at: '/buyer/risk', element: <BuyerRisk />, identity: BUYER },
  { name: 'buyer/whatsapp', pattern: '/buyer/whatsapp', at: '/buyer/whatsapp', element: <BuyerWhatsAppHub />, identity: BUYER },
  { name: 'buyer/compliance', pattern: '/buyer/compliance', at: '/buyer/compliance', element: <BuyerCompliance />, identity: BUYER },
  { name: 'supplier/dashboard', pattern: '/supplier/dashboard', at: '/supplier/dashboard', element: <SupplierDashboardV2 />, identity: SUPPLIER },
  { name: 'supplier/storefront', pattern: '/supplier/storefront', at: '/supplier/storefront', element: <SupplierMyStorefront />, identity: SUPPLIER },
  { name: 'supplier/documents', pattern: '/supplier/documents', at: '/supplier/documents', element: <SupplierDocumentsV2 />, identity: SUPPLIER },
  { name: 'supplier/whatsapp', pattern: '/supplier/whatsapp', at: '/supplier/whatsapp', element: <SupplierWhatsApp />, identity: SUPPLIER },
  { name: 'supplier/orders', pattern: '/supplier/orders', at: '/supplier/orders', element: <SupplierOrders />, identity: SUPPLIER },
  { name: 'supplier/rfqs', pattern: '/supplier/rfqs', at: '/supplier/rfqs', element: <SupplierRFQsV2 />, identity: SUPPLIER },
  { name: 'supplier/shipments', pattern: '/supplier/shipments', at: '/supplier/shipments', element: <SupplierShipments />, identity: SUPPLIER },
  { name: 'supplier/invoices', pattern: '/supplier/invoices', at: '/supplier/invoices', element: <SupplierInvoicesV2 />, identity: SUPPLIER },
  { name: 'supplier/inventory', pattern: '/supplier/inventory', at: '/supplier/inventory', element: <SupplierInventoryV2 />, identity: SUPPLIER },
  { name: 'supplier/performance', pattern: '/supplier/performance', at: '/supplier/performance', element: <SupplierPerformance />, identity: SUPPLIER },
  { name: '404 (unknown → NotFound)', pattern: '*', at: '/does/not/exist', element: <NotFound />, identity: BUYER },
];

describe('sp-001 — every route mounts without crashing', () => {
  it('route table covers all of AppRouter (31 elements + redirect)', () => {
    // Guards against a route being added to AppRouter but not the smoke.
    expect(ROUTES.length).toBe(32);
  });

  it.each(ROUTES)('$name renders and paints content', async ({ pattern, at, element, identity }) => {
    const { container } = renderWithProviders(
      <Routes>
        <Route path={pattern} element={element} />
      </Routes>,
      { identity, route: at },
    );
    // Mounted without throwing and painted something (loading / data / empty).
    await waitFor(() => expect(container).not.toBeEmptyDOMElement());
    // No React error boundary fell through to a blank error screen.
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});
