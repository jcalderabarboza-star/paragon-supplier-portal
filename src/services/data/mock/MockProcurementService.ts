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
import type {
  IProcurementService,
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

export class MockProcurementService implements IProcurementService {
  // ─── Purchase orders ──────────────────────────────────────────────────────

  async getPurchaseOrders(
    scope: QueryScope,
    filter?: POFilter,
  ): Promise<PurchaseOrder[]> {
    const canonical = toCanonicalPOs(mockPurchaseOrders);
    let rows = applySupplierScope(scope, canonical);
    if (filter?.supplierId)
      rows = rows.filter((p) => p.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((p) => matchesList(p.status, filter.status));
    if (filter?.dateFrom) rows = rows.filter((p) => p.orderDate >= filter.dateFrom!);
    if (filter?.dateTo) rows = rows.filter((p) => p.orderDate <= filter.dateTo!);
    return rows;
  }

  async getPurchaseOrder(
    scope: QueryScope,
    id: string,
  ): Promise<PurchaseOrder | null> {
    const all = await this.getPurchaseOrders(scope);
    return all.find((p) => p.id === id) ?? null;
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  async getInventory(
    scope: QueryScope,
    filter?: InventoryFilter,
  ): Promise<InventoryRecord[]> {
    let rows = applySupplierScope(scope, mockInventory);
    if (filter?.supplierId)
      rows = rows.filter((r) => r.supplierId === filter.supplierId);
    if (filter?.materialCode)
      rows = rows.filter((r) => r.materialCode === filter.materialCode);
    if (filter?.stockStatus)
      rows = rows.filter((r) => matchesList(r.stockStatus, filter.stockStatus));
    return rows;
  }

  // ─── Sourcing ─────────────────────────────────────────────────────────────

  async getRFQs(scope: QueryScope, filter?: RFQFilter): Promise<RFQ[]> {
    // RFQ scoping is not supplierId-based: an RFQ is visible to suppliers
    // whose id appears in invitedSupplierIds.
    let rows: RFQ[] = [...mockRfqs];
    if (scope.personaType === 'supplier') {
      if (!scope.supplierId) return [];
      rows = rows.filter((r) => r.invitedSupplierIds.includes(scope.supplierId!));
    }
    if (filter?.status) rows = rows.filter((r) => matchesList(r.status, filter.status));
    if (filter?.category)
      rows = rows.filter((r) => matchesList(r.materialCategory, filter.category));
    if (filter?.invitedSupplierId)
      rows = rows.filter((r) =>
        r.invitedSupplierIds.includes(filter.invitedSupplierId!),
      );
    return rows;
  }

  async getQuotations(
    scope: QueryScope,
    filter?: QuotationFilter,
  ): Promise<Quotation[]> {
    let rows = applySupplierScope(scope, mockQuotations);
    if (filter?.rfqId) rows = rows.filter((q) => q.rfqId === filter.rfqId);
    if (filter?.supplierId)
      rows = rows.filter((q) => q.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((q) => matchesList(q.status, filter.status));
    return rows;
  }

  // ─── Fulfilment ───────────────────────────────────────────────────────────

  async getShipments(
    scope: QueryScope,
    filter?: ShipmentFilter,
  ): Promise<Shipment[]> {
    let rows = applySupplierScope(scope, mockShipments);
    if (filter?.supplierId)
      rows = rows.filter((s) => s.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((s) => matchesList(s.status, filter.status));
    if (filter?.mode) rows = rows.filter((s) => matchesList(s.mode, filter.mode));
    return rows;
  }

  // ASN fixtures still live inline in SupplierShipments.tsx (Batch 2 will
  // relocate them with supplierId tagging).
  async getASNs(_scope: QueryScope, _filter?: ASNFilter): Promise<ASN[]> {
    return [];
  }

  async getGoodsReceipts(
    scope: QueryScope,
    filter?: GRFilter,
  ): Promise<GoodsReceipt[]> {
    let rows = applySupplierScope(scope, mockGoodsReceipts);
    if (filter?.supplierId)
      rows = rows.filter((g) => g.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((g) => matchesList(g.status, filter.status));
    return rows;
  }

  // ─── Finance — fixtures inline today (Batch 2) ───────────────────────────

  async getBuyerInvoices(
    _scope: QueryScope,
    _filter?: InvoiceFilter,
  ): Promise<BuyerInvoice[]> {
    return [];
  }

  async getSupplierInvoices(
    _scope: QueryScope,
    _filter?: InvoiceFilter,
  ): Promise<SupplierInvoice[]> {
    return [];
  }

  // ─── Contracts ────────────────────────────────────────────────────────────

  async getContracts(
    scope: QueryScope,
    filter?: ContractFilter,
  ): Promise<Contract[]> {
    let rows = applySupplierScope(scope, mockContracts);
    if (filter?.supplierId)
      rows = rows.filter((c) => c.supplierId === filter.supplierId);
    if (filter?.status) rows = rows.filter((c) => matchesList(c.status, filter.status));
    if (filter?.type) rows = rows.filter((c) => matchesList(c.type, filter.type));
    return rows;
  }

  async getObligations(
    scope: QueryScope,
    filter?: ObligationFilter,
  ): Promise<ContractObligation[]> {
    // Obligation has no supplierId — scope via parent contract.
    const scopedContracts = await this.getContracts(scope);
    const allowedContractIds = new Set(scopedContracts.map((c) => c.id));
    let rows = mockObligations.filter((o) => allowedContractIds.has(o.contractId));
    if (filter?.contractId)
      rows = rows.filter((o) => o.contractId === filter.contractId);
    if (filter?.status) rows = rows.filter((o) => matchesList(o.status, filter.status));
    if (filter?.owner) rows = rows.filter((o) => o.owner === filter.owner);
    return rows;
  }

  // ─── Supplier-side supporting data — fixtures inline today (Batch 2) ──────

  async getDocuments(_scope: QueryScope): Promise<SupplierDocument[]> {
    return [];
  }

  async getStorefrontCatalog(
    _scope: QueryScope,
    _supplierId?: string,
  ): Promise<CatalogItem[]> {
    return [];
  }

  async getStorefrontCerts(
    _scope: QueryScope,
    _supplierId?: string,
  ): Promise<ProfileCert[]> {
    return [];
  }

  async getStorefrontProducts(
    _scope: QueryScope,
    _supplierId?: string,
  ): Promise<StorefrontProduct[]> {
    return [];
  }

  // ─── KPIs / performance — fixtures inline today (Batch 2) ────────────────

  async getKpis(_scope: QueryScope): Promise<KpiSnapshot> {
    return EMPTY_KPI_SNAPSHOT;
  }

  async getPerformanceTrend(
    _scope: QueryScope,
    _range: TrendRange,
  ): Promise<PerformancePoint[]> {
    return [];
  }
}
