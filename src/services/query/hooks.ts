// ────────────────────────────────────────────────────────────────────────────
// Domain query hooks — one per read method. Pages import THESE, never useQuery
// or useServiceQuery directly, so TanStack stays swappable and page migration
// is mechanical. Each hook returns the standard TanStack result
// ({ data, isPending, isError, error, ... }); list hooks resolve to Page<T>.
//
// Filter/param args are folded into the query key so distinct filters cache
// separately (on top of the scopeKey appended by useServiceQuery).
// ────────────────────────────────────────────────────────────────────────────

import { useServiceQuery } from './useServiceQuery';
import type {
  POFilter,
  InventoryFilter,
  RFQFilter,
  QuotationFilter,
  ShipmentFilter,
  ASNFilter,
  GRFilter,
  InvoiceFilter,
  ContractFilter,
  ObligationFilter,
  PRFilter,
  TrendRange,
} from '../data/types';

// ─── Suppliers ──────────────────────────────────────────────────────────────

export const useSuppliers = () =>
  useServiceQuery(['suppliers', 'list'], (svc, scope) => svc.suppliers.list(scope));

export const useSupplier = (id: string) =>
  useServiceQuery(['suppliers', 'byId', id], (svc, scope) =>
    svc.suppliers.getById(scope, id),
  );

export const useCurrentSupplier = () =>
  useServiceQuery(['suppliers', 'current'], (svc, scope) =>
    svc.suppliers.getCurrent(scope),
  );

// ─── Procurement ──────────────────────────────────────────────────────────

export const usePurchaseOrders = (filter?: POFilter) =>
  useServiceQuery(['procurement', 'purchaseOrders', filter], (svc, scope) =>
    svc.procurement.getPurchaseOrders(scope, filter),
  );

export const usePurchaseOrder = (id: string) =>
  useServiceQuery(['procurement', 'purchaseOrder', id], (svc, scope) =>
    svc.procurement.getPurchaseOrder(scope, id),
  );

export const useInventory = (filter?: InventoryFilter) =>
  useServiceQuery(['procurement', 'inventory', filter], (svc, scope) =>
    svc.procurement.getInventory(scope, filter),
  );

export const useRFQs = (filter?: RFQFilter) =>
  useServiceQuery(['procurement', 'rfqs', filter], (svc, scope) =>
    svc.procurement.getRFQs(scope, filter),
  );

export const useQuotations = (filter?: QuotationFilter) =>
  useServiceQuery(['procurement', 'quotations', filter], (svc, scope) =>
    svc.procurement.getQuotations(scope, filter),
  );

export const useShipments = (filter?: ShipmentFilter) =>
  useServiceQuery(['procurement', 'shipments', filter], (svc, scope) =>
    svc.procurement.getShipments(scope, filter),
  );

export const useASNs = (filter?: ASNFilter) =>
  useServiceQuery(['procurement', 'asns', filter], (svc, scope) =>
    svc.procurement.getASNs(scope, filter),
  );

export const useGoodsReceipts = (filter?: GRFilter) =>
  useServiceQuery(['procurement', 'goodsReceipts', filter], (svc, scope) =>
    svc.procurement.getGoodsReceipts(scope, filter),
  );

export const useBuyerInvoices = (filter?: InvoiceFilter) =>
  useServiceQuery(['procurement', 'buyerInvoices', filter], (svc, scope) =>
    svc.procurement.getBuyerInvoices(scope, filter),
  );

export const useSupplierInvoices = (filter?: InvoiceFilter) =>
  useServiceQuery(['procurement', 'supplierInvoices', filter], (svc, scope) =>
    svc.procurement.getSupplierInvoices(scope, filter),
  );

export const useContracts = (filter?: ContractFilter) =>
  useServiceQuery(['procurement', 'contracts', filter], (svc, scope) =>
    svc.procurement.getContracts(scope, filter),
  );

export const useObligations = (filter?: ObligationFilter) =>
  useServiceQuery(['procurement', 'obligations', filter], (svc, scope) =>
    svc.procurement.getObligations(scope, filter),
  );

export const useDocuments = () =>
  useServiceQuery(['procurement', 'documents'], (svc, scope) =>
    svc.procurement.getDocuments(scope),
  );

export const useStorefrontCatalog = (supplierId?: string) =>
  useServiceQuery(['procurement', 'storefrontCatalog', supplierId], (svc, scope) =>
    svc.procurement.getStorefrontCatalog(scope, supplierId),
  );

export const useStorefrontCerts = (supplierId?: string) =>
  useServiceQuery(['procurement', 'storefrontCerts', supplierId], (svc, scope) =>
    svc.procurement.getStorefrontCerts(scope, supplierId),
  );

export const useStorefrontProducts = (supplierId?: string) =>
  useServiceQuery(['procurement', 'storefrontProducts', supplierId], (svc, scope) =>
    svc.procurement.getStorefrontProducts(scope, supplierId),
  );

export const useKpis = () =>
  useServiceQuery(['procurement', 'kpis'], (svc, scope) => svc.procurement.getKpis(scope));

export const usePerformanceTrend = (range: TrendRange) =>
  useServiceQuery(['procurement', 'performanceTrend', range], (svc, scope) =>
    svc.procurement.getPerformanceTrend(scope, range),
  );

export const useSupplierScorecards = () =>
  useServiceQuery(['procurement', 'supplierScorecards'], (svc, scope) =>
    svc.procurement.getSupplierScorecards(scope),
  );

export const useRequisitions = (filter?: PRFilter) =>
  useServiceQuery(['procurement', 'requisitions', filter], (svc, scope) =>
    svc.procurement.getRequisitions(scope, filter),
  );

/**
 * The supplier applications a buyer reviews (B2).
 *
 * Buyer-only at the seam; a supplier scope resolves an empty page rather than a
 * refusal — see `getSupplierApplications` for why empty is the quieter answer.
 */
export const useSupplierApplications = () =>
  useServiceQuery(['procurement', 'supplierApplications'], (svc, scope) =>
    svc.procurement.getSupplierApplications(scope),
  );

// R8 — the material-request queue. Buyer-side only, one collection, no
// per-supplier shard: the persona gate in the service is the whole tenancy
// answer, so `scopeKey` has nothing to narrow on here.
export const useMaterialRequests = () =>
  useServiceQuery(['procurement', 'materialRequests'], (svc, scope) =>
    svc.procurement.getMaterialRequests(scope),
  );

// PSL P3 — the preferred supplier list. Buyer-side only, one collection, no
// per-supplier shard: the persona gate in the service is the whole tenancy
// answer, so `scopeKey` has nothing to narrow on. A supplier scope resolves an
// empty page rather than a refusal.
//
// ⚠️ **EVERY PSL SURFACE READS THROUGH THIS HOOK RATHER THAN THE STORE, AND
// THAT IS WHAT MAKES A DISPATCH VISIBLE.** The store is synchronous and the
// policy hooks read it directly (they have no query client), but a component
// that read it directly would never re-render when a verb changed it —
// `useInvalidateProcurement` is what closes that loop.
export const usePslListings = () =>
  useServiceQuery(['procurement', 'pslListings'], (svc, scope) =>
    svc.procurement.getPslListings(scope),
  );

// ⚠️ **PSL P4 — THE SUPPLIER'S OWN VIEW, AND IT IS A SEPARATE HOOK ON A
// SEPARATE KEY.** `usePslListings` above is the BUYER read; this one answers
// `[]` to a buyer and the buyer read answers `[]` to a supplier, so neither can
// stand in for the other. Two keys rather than one because the two reads return
// DIFFERENT TYPES — a shared key would let a buyer's cached `PslListing[]`
// satisfy a supplier's `SupplierPslView[]` request on a persona switch, which is
// the tenancy bleed `scopeKey` exists to prevent, arriving through the type
// system instead of through the cache.
export const useMyPslListings = () =>
  useServiceQuery(['procurement', 'myPslListings'], (svc, scope) =>
    svc.procurement.getMyPslListings(scope),
  );

export const useIntakeReview = () =>
  useServiceQuery(['procurement', 'prIntake'], (svc, scope) =>
    svc.procurement.getPrIntake(scope),
  );

// ⚠️ **RESTORED (operator direction).** These were retired when the widget grid
// was, and the operator's review kept both sections: Production Line Risk and
// the Supplier Health Index are SAMPLE data, marked as such, and they model
// domains no other buyer surface covers.
export const useProductionLines = () =>
  useServiceQuery(['procurement', 'productionLines'], (svc, scope) =>
    svc.procurement.getProductionLines(scope),
  );

export const useSupplierHealth = () =>
  useServiceQuery(['procurement', 'supplierHealth'], (svc, scope) =>
    svc.procurement.getSupplierHealth(scope),
  );

// ─── Risk ─────────────────────────────────────────────────────────────────

export const useRiskAlerts = () =>
  useServiceQuery(['risk', 'alerts'], (svc, scope) => svc.risk.getRiskAlerts(scope));

export const useGeoRisks = () =>
  useServiceQuery(['risk', 'geo'], (svc, scope) => svc.risk.getGeoRisks(scope));

export const useExposure = () =>
  useServiceQuery(['risk', 'exposure'], (svc, scope) => svc.risk.getExposure(scope));

export const useScenarios = () =>
  useServiceQuery(['risk', 'scenarios'], (svc, scope) => svc.risk.getScenarios(scope));

export const useCompliance = () =>
  useServiceQuery(['risk', 'compliance'], (svc, scope) => svc.risk.getCompliance(scope));

// I3.1 — the canonical compliance registry (census #11–15). supplierId-keyed;
// consumed by the I3.2 surface re-point (BuyerCompliance → useDataService()).
export const useComplianceRegistry = () =>
  useServiceQuery(['risk', 'complianceRegistry'], (svc, scope) =>
    svc.risk.getComplianceRegistry(scope),
  );

export const useCommodities = () =>
  useServiceQuery(['risk', 'commodities'], (svc, scope) => svc.risk.getCommodities(scope));

// ─── Analytics (buyer-side; discrete per-read so each chart loads on its own) ─

export const useAnalyticsSummary = () =>
  useServiceQuery(['analytics', 'summary'], (svc, scope) =>
    svc.analytics.getSummary(scope),
  );

export const useSpendByCategory = () =>
  useServiceQuery(['analytics', 'spendByCategory'], (svc, scope) =>
    svc.analytics.getSpendByCategory(scope),
  );

export const useTopSuppliers = () =>
  useServiceQuery(['analytics', 'topSuppliers'], (svc, scope) =>
    svc.analytics.getTopSuppliers(scope),
  );

export const useOtifTrend = () =>
  useServiceQuery(['analytics', 'otifTrend'], (svc, scope) =>
    svc.analytics.getOtifTrend(scope),
  );

export const usePoVolumeTrend = () =>
  useServiceQuery(['analytics', 'poVolumeTrend'], (svc, scope) =>
    svc.analytics.getPoVolumeTrend(scope),
  );

export const useChannelMix = () =>
  useServiceQuery(['analytics', 'channelMix'], (svc, scope) =>
    svc.analytics.getChannelMix(scope),
  );

export const useSupplierPerformance = () =>
  useServiceQuery(['analytics', 'supplierPerformance'], (svc, scope) =>
    svc.analytics.getSupplierPerformance(scope),
  );

// ─── Discovery ──────────────────────────────────────────────────────────────

export const useRecommended = () =>
  useServiceQuery(['discovery', 'recommended'], (svc, scope) =>
    svc.discovery.getRecommended(scope),
  );

export const useQualifications = () =>
  useServiceQuery(['discovery', 'qualifications'], (svc, scope) =>
    svc.discovery.getQualifications(scope),
  );

export const useMarketIntel = () =>
  useServiceQuery(['discovery', 'marketIntel'], (svc, scope) =>
    svc.discovery.getMarketIntel(scope),
  );

export const useSingleSourceItems = () =>
  useServiceQuery(['discovery', 'singleSource'], (svc, scope) =>
    svc.discovery.getSingleSourceItems(scope),
  );

// ─── Enforcement (CP-3 · E4) ────────────────────────────────────────────────

/**
 * The append-only enforcement-setting LEDGER — every recorded act, oldest first.
 *
 * ⚠️ **THE LEDGER, NEVER THE ANSWER.** There is deliberately no
 * `useEffectiveEnforcement(checkId)`: the mode in force is clock-derived, so a
 * hook that answered it would have to read a clock the caller is supposed to
 * supply as an argument (law 0.5). Consumers call `effectiveEnforcement(ledger,
 * checkId, instant)` with an instant they captured themselves — the
 * `effectivePin` shape, and the reason the seam has one method.
 *
 * ⚠️ BUYER-SCOPED. A supplier persona gets `SCOPE_DENIED`, not an empty page.
 */
export const useEnforcementSettings = () =>
  useServiceQuery(['enforcement', 'settings'], (svc, scope) =>
    svc.enforcement.getEnforcementSettings(scope),
  );
