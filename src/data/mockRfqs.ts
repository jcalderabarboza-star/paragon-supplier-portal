export type RFQStatus =
  | 'Draft'
  | 'Open'
  | 'Closed'
  | 'Awarded'
  | 'Cancelled';

export type RFQCategory =
  | 'Fragrance'
  | 'Active Ingredients'
  | 'Packaging'
  | 'Emulsifiers'
  | 'Botanical'
  | 'Other';

export interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  materialCategory: RFQCategory;
  materialIds: string[];
  buyerId: string;
  status: RFQStatus;
  createdAt: string;
  responseDeadline: string;
  awardDeadline: string;
  invitedSupplierIds: string[];
  respondedSupplierIds: string[];
  totalQty: number;
  uom: 'KG' | 'PCS' | 'L' | 'MT';
  estimatedValue: number;
  currency: 'IDR';
  incoterms: string;
  paymentTerms: string;
  awardedSupplierId?: string;
  awardedQuotationId?: string;
}

export const mockRfqs: RFQ[] = [
  {
    id: 'rfq-001',
    rfqNumber: 'RFQ-2026-001',
    title: 'Q2 2026 Active Ingredient Sourcing — Niacinamide USP',
    materialCategory: 'Active Ingredients',
    materialIds: ['AI-NIAC-6601'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-04-28',
    responseDeadline: '2026-05-20',
    awardDeadline: '2026-05-27',
    invitedSupplierIds: ['sup-005', 'sup-006', 'sup-009', 'sup-011'],
    respondedSupplierIds: ['sup-005', 'sup-009', 'sup-011'],
    totalQty: 5000,
    uom: 'KG',
    estimatedValue: 1_100_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 45',
  },
  {
    id: 'rfq-002',
    rfqNumber: 'RFQ-2026-002',
    title: 'PET Bottle 100ml Airless Pump — Wardah Q3 launch',
    materialCategory: 'Packaging',
    materialIds: ['PK-PETB-8810'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-05-02',
    responseDeadline: '2026-05-22',
    awardDeadline: '2026-05-29',
    invitedSupplierIds: ['sup-007', 'sup-008', 'sup-012'],
    respondedSupplierIds: ['sup-007', 'sup-008'],
    totalQty: 200_000,
    uom: 'PCS',
    estimatedValue: 260_000_000,
    currency: 'IDR',
    incoterms: 'FCA Tangerang',
    paymentTerms: 'Net 30',
  },
  {
    id: 'rfq-003',
    rfqNumber: 'RFQ-2026-003',
    title: 'Halal Glycerin 99.5% Kosher — Annual contract',
    materialCategory: 'Emulsifiers',
    materialIds: ['RM-EMUL-3310', 'RM-EMUL-3320'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-05-05',
    responseDeadline: '2026-05-19',
    awardDeadline: '2026-05-26',
    invitedSupplierIds: ['sup-001', 'sup-002', 'sup-010'],
    respondedSupplierIds: ['sup-001', 'sup-002', 'sup-010'],
    totalQty: 12_000,
    uom: 'KG',
    estimatedValue: 540_000_000,
    currency: 'IDR',
    incoterms: 'DDP Jakarta',
    paymentTerms: 'Net 30',
  },
  {
    id: 'rfq-004',
    rfqNumber: 'RFQ-2026-004',
    title: 'Givaudan Floral Accord — Wardah Hijab Refresh',
    materialCategory: 'Fragrance',
    materialIds: ['FR-WARD-4430', 'FR-WARD-4440'],
    buyerId: 'buyer-001',
    status: 'Closed',
    createdAt: '2026-03-12',
    responseDeadline: '2026-03-26',
    awardDeadline: '2026-04-02',
    invitedSupplierIds: ['sup-003', 'sup-004'],
    respondedSupplierIds: ['sup-003', 'sup-004'],
    totalQty: 400,
    uom: 'KG',
    estimatedValue: 880_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 45',
  },
  {
    id: 'rfq-005',
    rfqNumber: 'RFQ-2026-005',
    title: 'Folding Carton 150gsm — Emina Bright Stuff',
    materialCategory: 'Packaging',
    materialIds: ['PK-CART-9901', 'PK-CART-9910'],
    buyerId: 'buyer-001',
    status: 'Closed',
    createdAt: '2026-03-08',
    responseDeadline: '2026-03-22',
    awardDeadline: '2026-03-29',
    invitedSupplierIds: ['sup-007', 'sup-008'],
    respondedSupplierIds: ['sup-007', 'sup-008'],
    totalQty: 300_000,
    uom: 'PCS',
    estimatedValue: 78_000_000,
    currency: 'IDR',
    incoterms: 'FCA Surabaya',
    paymentTerms: 'Net 30',
  },
  {
    id: 'rfq-006',
    rfqNumber: 'RFQ-2026-006',
    title: 'Centella Asiatica Extract 10:1 — Skin care line',
    materialCategory: 'Botanical',
    materialIds: ['AI-CENT-6900'],
    buyerId: 'buyer-001',
    status: 'Awarded',
    createdAt: '2026-02-18',
    responseDeadline: '2026-03-04',
    awardDeadline: '2026-03-11',
    invitedSupplierIds: ['sup-001', 'sup-010', 'sup-009'],
    respondedSupplierIds: ['sup-001', 'sup-010', 'sup-009'],
    totalQty: 300,
    uom: 'KG',
    estimatedValue: 67_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 30',
    awardedSupplierId: 'sup-001',
    awardedQuotationId: 'qt-006a',
  },
  {
    id: 'rfq-007',
    rfqNumber: 'RFQ-2026-007',
    title: 'Sodium Hyaluronate HMW — Premium skin care',
    materialCategory: 'Active Ingredients',
    materialIds: ['AI-HYALU-6610'],
    buyerId: 'buyer-001',
    status: 'Awarded',
    createdAt: '2026-02-02',
    responseDeadline: '2026-02-16',
    awardDeadline: '2026-02-23',
    invitedSupplierIds: ['sup-005', 'sup-006', 'sup-009'],
    respondedSupplierIds: ['sup-005', 'sup-006', 'sup-009'],
    totalQty: 200,
    uom: 'KG',
    estimatedValue: 600_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 45',
    awardedSupplierId: 'sup-005',
    awardedQuotationId: 'qt-007a',
  },
  {
    id: 'rfq-008',
    rfqNumber: 'RFQ-2026-008',
    title: 'Shipper Box — Emina 12-pack — Draft',
    materialCategory: 'Packaging',
    materialIds: ['PK-CART-9910'],
    buyerId: 'buyer-001',
    status: 'Draft',
    createdAt: '2026-05-15',
    responseDeadline: '2026-05-30',
    awardDeadline: '2026-06-06',
    invitedSupplierIds: [],
    respondedSupplierIds: [],
    totalQty: 30_000,
    uom: 'PCS',
    estimatedValue: 75_000_000,
    currency: 'IDR',
    incoterms: 'FCA Surabaya',
    paymentTerms: 'Net 30',
  },
  {
    // Imported raw material — foreign suppliers price in USD. Exercises the CI-2
    // engine-native, FX-free USD spread branch (propylene glycol, international basis).
    id: 'rfq-009',
    rfqNumber: 'RFQ-2026-009',
    title: 'Propylene Glycol USP — imported, USD-quoted',
    materialCategory: 'Emulsifiers',
    materialIds: ['RM-HUMEC-3405'],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: '2026-05-06',
    responseDeadline: '2026-05-21',
    awardDeadline: '2026-05-28',
    invitedSupplierIds: ['sup-006', 'sup-005'],
    respondedSupplierIds: ['sup-006', 'sup-005'],
    totalQty: 8_000,
    uom: 'KG',
    estimatedValue: 360_000_000,
    currency: 'IDR',
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 30',
  },
];
