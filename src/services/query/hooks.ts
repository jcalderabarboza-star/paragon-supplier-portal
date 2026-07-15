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

export const useIntakeReview = () =>
  useServiceQuery(['procurement', 'prIntake'], (svc, scope) =>
    svc.procurement.getPrIntake(scope),
  );

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

// ─── Engagement (buyer-side comms bus; discrete per-read) ─────────────────────

export const useEngagementSummary = () =>
  useServiceQuery(['engagement', 'summary'], (svc, scope) =>
    svc.engagement.getSummary(scope),
  );

export const useConversations = () =>
  useServiceQuery(['engagement', 'conversations'], (svc, scope) =>
    svc.engagement.getConversations(scope),
  );

export const useConversationThread = (conversationId: string) =>
  useServiceQuery(['engagement', 'thread', conversationId], (svc, scope) =>
    svc.engagement.getConversationThread(scope, conversationId),
  );

export const useAutomationRules = () =>
  useServiceQuery(['engagement', 'automationRules'], (svc, scope) =>
    svc.engagement.getAutomationRules(scope),
  );

export const useDailyMessages = () =>
  useServiceQuery(['engagement', 'dailyMessages'], (svc, scope) =>
    svc.engagement.getDailyMessages(scope),
  );

export const useRuleRates = () =>
  useServiceQuery(['engagement', 'ruleRates'], (svc, scope) =>
    svc.engagement.getRuleRates(scope),
  );

export const useResponseTimes = () =>
  useServiceQuery(['engagement', 'responseTimes'], (svc, scope) =>
    svc.engagement.getResponseTimes(scope),
  );

// ─── Discovery ──────────────────────────────────────────────────────────────

export const useGlobalSuppliers = () =>
  useServiceQuery(['discovery', 'global'], (svc, scope) =>
    svc.discovery.getGlobalSuppliers(scope),
  );

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
