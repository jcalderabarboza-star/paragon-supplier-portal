import { mockPurchaseOrders } from '../../../data/mockPurchaseOrders';
import { mockInventory } from '../../../data/mockInventory';
import { mockShipments } from '../../../data/mockShipments';
import { mockGoodsReceipts } from '../../../data/mockGoodsReceipts';
import { mockContracts } from '../../../data/mockContracts';
import { mockObligations } from '../../../data/mockObligations';
import { mockRfqs } from '../../../data/mockRfqs';
import { mockQuotations } from '../../../data/mockQuotations';
import { toCanonicalPOs } from '../dto';
import { applySupplierScope } from '../scoping';
import { MOCK_ASNS } from './fixtures/supplierShipments';
import { DOCUMENTS } from './fixtures/supplierDocuments';
import { INVOICES as MOCK_SUPPLIER_INVOICES } from './fixtures/supplierInvoices';
import { BUYER_INVOICES } from './fixtures/buyerInvoices';
import {
  INITIAL_CATALOG,
  INITIAL_CERTS,
  PRODUCTS_DEFAULT,
} from './fixtures/supplierStorefront';
import {
  KPIS,
  RADAR_DATA,
  WEEKLY_TREND,
  SUP_007_SUPPLIER_ID,
} from './fixtures/supplierPerformance';
import type {
  IProcurementService,
  Page,
  QueryScope,
  PurchaseOrder,
  POFilter,
  InventoryRecord,
  InventoryFilter,
  Shipment,
  ShipmentFilter,
  ASN,
  ASNFilter,
  GoodsReceipt,
  GRFilter,
  Contract,
  ContractFilter,
  ContractObligation,
  ObligationFilter,
  RFQ,
  RFQFilter,
  Quotation,
  QuotationFilter,
  BuyerInvoice,
  SupplierInvoice,
  InvoiceFilter,
  SupplierDocument,
  CatalogItem,
  ProfileCert,
  StorefrontProduct,
  KpiSnapshot,
  PerformancePoint,
  TrendRange,
} from '../types';

const matchesList = <T>(value: T, filter: T | T[] | undefined): boolean => {
  if (filter === undefined) return true;
  return Array.isArray(filter) ? filter.includes(value) : value === filter;
};

const EMPTY_KPI_SNAPSHOT: KpiSnapshot = {
  kpis: [],
  radar: [],
  trend: [],
  improvementActions: [],
};

const SUP_007_KPI_SNAPSHOT: KpiSnapshot = {
  kpis: KPIS,
  radar: RADAR_DATA,
  trend: WEEKLY_TREND,
  // Improvement actions remain inline in SupplierPerformance.tsx pending
  // Batch 3-4 page migration; the fixture surface for them is deferred.
  improvementActions: [],
};

// Today every relocated supplier fixture is tagged sup-007; the snapshot
// is only meaningful when scope resolves to that supplier (or to a buyer
// reading sup-007's data through the portfolio view). Fan-out across
// suppliers is a deferred follow-up.
function snapshotForScope(scope: QueryScope): KpiSnapshot {
  if (scope.personaType === 'buyer') return SUP_007_KPI_SNAPSHOT;
  if (scope.supplierId === SUP_007_SUPPLIER_ID) return SUP_007_KPI_SNAPSHOT;
  return EMPTY_KPI_SNAPSHOT;
}

function trendForScope(scope: QueryScope): PerformancePoint[] {
  if (scope.personaType === 'buyer') return [...WEEKLY_TREND];
  if (scope.supplierId === SUP_007_SUPPLIER_ID) return [...WEEKLY_TREND];
  return [];
}

export class MockProcurementService implements IProcurementService {
  // ─── Purchase orders ──────────────────────────────────────────────────────

  async getPurchaseOrders(
    scope: QueryScope,
    filter?: POFilter,
  ): Promise<Page<PurchaseOrder>> {
    const canonical = toCanonicalPOs(mockPurchaseOrders);
    let rows = applySupplierScope(scope, canonical);
    if (filter?.supplierId)
      rows = rows.filter((p) => p.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((p) => matchesList(p.status, filter.status));
    if (filter?.dateFrom) rows = rows.filter((p) => p.orderDate >= filter.dateFrom!);
    if (filter?.dateTo) rows = rows.filter((p) => p.orderDate <= filter.dateTo!);
    return { items: rows };
  }

  async getPurchaseOrder(
    scope: QueryScope,
    id: string,
  ): Promise<PurchaseOrder | null> {
    const { items } = await this.getPurchaseOrders(scope);
    return items.find((p) => p.id === id) ?? null;
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  async getInventory(
    scope: QueryScope,
    filter?: InventoryFilter,
  ): Promise<Page<InventoryRecord>> {
    let rows = applySupplierScope(scope, mockInventory);
    if (filter?.supplierId)
      rows = rows.filter((r) => r.supplierId === filter.supplierId);
    if (filter?.materialCode)
      rows = rows.filter((r) => r.materialCode === filter.materialCode);
    if (filter?.stockStatus)
      rows = rows.filter((r) => matchesList(r.stockStatus, filter.stockStatus));
    return { items: rows };
  }

  // ─── Sourcing ─────────────────────────────────────────────────────────────

  async getRFQs(scope: QueryScope, filter?: RFQFilter): Promise<Page<RFQ>> {
    // RFQ scoping is not supplierId-based: an RFQ is visible to suppliers
    // whose id appears in invitedSupplierIds.
    let rows: RFQ[] = [...mockRfqs];
    if (scope.personaType === 'supplier') {
      if (!scope.supplierId) return { items: [] };
      rows = rows.filter((r) => r.invitedSupplierIds.includes(scope.supplierId!));
    }
    if (filter?.status) rows = rows.filter((r) => matchesList(r.status, filter.status));
    if (filter?.category)
      rows = rows.filter((r) => matchesList(r.materialCategory, filter.category));
    if (filter?.invitedSupplierId)
      rows = rows.filter((r) =>
        r.invitedSupplierIds.includes(filter.invitedSupplierId!),
      );
    return { items: rows };
  }

  async getQuotations(
    scope: QueryScope,
    filter?: QuotationFilter,
  ): Promise<Page<Quotation>> {
    let rows = applySupplierScope(scope, mockQuotations);
    if (filter?.rfqId) rows = rows.filter((q) => q.rfqId === filter.rfqId);
    if (filter?.supplierId)
      rows = rows.filter((q) => q.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((q) => matchesList(q.status, filter.status));
    return { items: rows };
  }

  // ─── Fulfilment ───────────────────────────────────────────────────────────

  async getShipments(
    scope: QueryScope,
    filter?: ShipmentFilter,
  ): Promise<Page<Shipment>> {
    let rows = applySupplierScope(scope, mockShipments);
    if (filter?.supplierId)
      rows = rows.filter((s) => s.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((s) => matchesList(s.status, filter.status));
    if (filter?.mode) rows = rows.filter((s) => matchesList(s.mode, filter.mode));
    return { items: rows };
  }

  async getASNs(scope: QueryScope, filter?: ASNFilter): Promise<Page<ASN>> {
    let rows = applySupplierScope(scope, MOCK_ASNS);
    if (filter?.status) rows = rows.filter((a) => matchesList(a.status, filter.status));
    return { items: rows };
  }

  async getGoodsReceipts(
    scope: QueryScope,
    filter?: GRFilter,
  ): Promise<Page<GoodsReceipt>> {
    let rows = applySupplierScope(scope, mockGoodsReceipts);
    if (filter?.supplierId)
      rows = rows.filter((g) => g.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((g) => matchesList(g.status, filter.status));
    return { items: rows };
  }

  // ─── Finance ──────────────────────────────────────────────────────────────

  async getBuyerInvoices(
    scope: QueryScope,
    filter?: InvoiceFilter,
  ): Promise<Page<BuyerInvoice>> {
    let rows = applySupplierScope(scope, BUYER_INVOICES);
    if (filter?.supplierId)
      rows = rows.filter((i) => i.supplierId === filter.supplierId);
    if (filter?.poNumber)
      rows = rows.filter((i) => i.poNumber === filter.poNumber);
    if (filter?.status) rows = rows.filter((i) => i.status === filter.status);
    return { items: rows };
  }

  async getSupplierInvoices(
    scope: QueryScope,
    filter?: InvoiceFilter,
  ): Promise<Page<SupplierInvoice>> {
    let rows = applySupplierScope(scope, MOCK_SUPPLIER_INVOICES);
    if (filter?.supplierId)
      rows = rows.filter((i) => i.supplierId === filter.supplierId);
    if (filter?.poNumber)
      rows = rows.filter((i) => i.poNumber === filter.poNumber);
    if (filter?.status) rows = rows.filter((i) => i.status === filter.status);
    return { items: rows };
  }

  // ─── Contracts ────────────────────────────────────────────────────────────

  async getContracts(
    scope: QueryScope,
    filter?: ContractFilter,
  ): Promise<Page<Contract>> {
    let rows = applySupplierScope(scope, mockContracts);
    if (filter?.supplierId)
      rows = rows.filter((c) => c.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((c) => matchesList(c.status, filter.status));
    if (filter?.type) rows = rows.filter((c) => matchesList(c.type, filter.type));
    return { items: rows };
  }

  async getObligations(
    scope: QueryScope,
    filter?: ObligationFilter,
  ): Promise<Page<ContractObligation>> {
    // Obligation has no supplierId — scope via parent contract.
    const { items: scopedContracts } = await this.getContracts(scope);
    const allowedContractIds = new Set(scopedContracts.map((c) => c.id));
    let rows = mockObligations.filter((o) => allowedContractIds.has(o.contractId));
    if (filter?.contractId)
      rows = rows.filter((o) => o.contractId === filter.contractId);
    if (filter?.status) rows = rows.filter((o) => matchesList(o.status, filter.status));
    if (filter?.owner) rows = rows.filter((o) => o.owner === filter.owner);
    return { items: rows };
  }

  // ─── Supplier-side supporting data ────────────────────────────────────────

  async getDocuments(scope: QueryScope): Promise<Page<SupplierDocument>> {
    return { items: applySupplierScope(scope, DOCUMENTS) };
  }

  async getStorefrontCatalog(
    scope: QueryScope,
    supplierId?: string,
  ): Promise<Page<CatalogItem>> {
    let rows = applySupplierScope(scope, INITIAL_CATALOG);
    if (supplierId) rows = rows.filter((r) => r.supplierId === supplierId);
    return { items: rows };
  }

  async getStorefrontCerts(
    scope: QueryScope,
    supplierId?: string,
  ): Promise<Page<ProfileCert>> {
    let rows = applySupplierScope(scope, INITIAL_CERTS);
    if (supplierId) rows = rows.filter((r) => r.supplierId === supplierId);
    return { items: rows };
  }

  async getStorefrontProducts(
    scope: QueryScope,
    supplierId?: string,
  ): Promise<Page<StorefrontProduct>> {
    let rows = applySupplierScope(scope, PRODUCTS_DEFAULT);
    if (supplierId) rows = rows.filter((r) => r.supplierId === supplierId);
    return { items: rows };
  }

  // ─── KPIs / performance ───────────────────────────────────────────────────

  async getKpis(scope: QueryScope): Promise<KpiSnapshot> {
    return snapshotForScope(scope);
  }

  async getPerformanceTrend(
    scope: QueryScope,
    _range: TrendRange,
  ): Promise<Page<PerformancePoint>> {
    return { items: trendForScope(scope) };
  }
}
