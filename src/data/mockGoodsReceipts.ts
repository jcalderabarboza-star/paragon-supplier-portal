export type GRStatus =
  | 'Pending Inspection'
  | 'Under Inspection'
  | 'Quality Hold'
  | 'Approved'
  | 'Partially Approved'
  | 'Rejected'
  // Submitted-interim SAP-boundary state (v2.2 Step 4 batch ii): the GR posting
  // has been submitted to SAP and awaits the async material-document callback.
  // A GR reads 'Posting to SAP' with NO sapMaterialDoc yet; the settlement
  // advances it to 'Posted to SAP' and assigns the real reference (Option B).
  | 'Posting to SAP'
  | 'Posted to SAP';

export type Disposition =
  | 'Accept'
  | 'Reject'
  | 'Quarantine'
  | 'Return to Supplier'
  | 'Pending';

export type CheckResult = 'Pass' | 'Fail' | 'Pending';
export type OptionalCheck = 'Pass' | 'Fail' | 'N/A';

export interface InspectionResult {
  materialCode: string;
  description: string;
  qtyExpected: number;
  qtyReceived: number;
  qtyAccepted: number;
  qtyRejected: number;
  rejectionReason?: string;
  labResultId?: string;
  visualCheck: CheckResult;
  packagingCheck: CheckResult;
  halalSealCheck?: OptionalCheck;
  bpomLotCheck?: OptionalCheck;
}

export interface GoodsReceipt {
  id: string;
  grNumber: string;
  asnId: string;
  asnNumber: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  receivedDate: string;
  receivedBy: string;
  status: GRStatus;
  inspectionResults: InspectionResult[];
  disposition: Disposition;
  sapMaterialDoc?: string;
  notes?: string;
}

export const mockGoodsReceipts: GoodsReceipt[] = [
  {
    id: 'gr-001',
    grNumber: 'GR-2026-001',
    asnId: 'shp-014',
    asnNumber: 'ASN-2026-014',
    poNumber: 'PO-2025-00101',
    supplierId: 'sup-001',
    supplierName: 'PT Sample Oleochemicals',
    receivedDate: '2026-05-19',
    receivedBy: 'Warehouse Supervisor',
    status: 'Under Inspection',
    inspectionResults: [
      {
        materialCode: 'RM-COCO-8200',
        description: 'Coconut Fatty Acid Distillate (CFAD)',
        qtyExpected: 25000,
        qtyReceived: 25000,
        qtyAccepted: 0,
        qtyRejected: 0,
        visualCheck: 'Pending',
        packagingCheck: 'Pending',
        halalSealCheck: 'Pending' as OptionalCheck,
      },
    ],
    disposition: 'Pending',
    notes: 'Inspection in progress at Dock C-1.',
  },
  {
    id: 'gr-002',
    grNumber: 'GR-2026-002',
    asnId: 'shp-012',
    asnNumber: 'ASN-2026-012',
    poNumber: 'PO-2025-00107',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Pending Inspection',
    inspectionResults: [
      {
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        qtyExpected: 120000,
        qtyReceived: 120000,
        qtyAccepted: 0,
        qtyRejected: 0,
        visualCheck: 'Pending',
        packagingCheck: 'Pending',
        bpomLotCheck: 'Pending' as OptionalCheck,
      },
    ],
    disposition: 'Pending',
  },
  {
    id: 'gr-003',
    grNumber: 'GR-2026-003',
    asnId: 'shp-013',
    asnNumber: 'ASN-2026-013',
    poNumber: 'PO-2025-00108',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        qtyExpected: 95000,
        qtyReceived: 95000,
        qtyAccepted: 95000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        bpomLotCheck: 'Pass',
      },
    ],
    disposition: 'Accept',
  },
  {
    id: 'gr-004',
    grNumber: 'GR-2026-004',
    asnId: 'shp-015',
    asnNumber: 'ASN-2026-015',
    poNumber: 'PO-2025-00112',
    supplierId: 'sup-003',
    supplierName: 'Sample Fragrance House Indonesia',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        qtyExpected: 800,
        qtyReceived: 800,
        qtyAccepted: 800,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        labResultId: 'LAB-2026-018',
      },
    ],
    disposition: 'Accept',
    notes: 'Lab confirmed fragrance profile within spec.',
  },
  {
    id: 'gr-005',
    grNumber: 'GR-2026-005',
    asnId: 'shp-016',
    asnNumber: 'ASN-2026-016',
    poNumber: 'PO-2025-00116',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    receivedDate: '2026-05-15',
    receivedBy: 'Warehouse Supervisor',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic Acid — Double Pressed (Halal)',
        qtyExpected: 8000,
        qtyReceived: 8000,
        qtyAccepted: 8000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        halalSealCheck: 'Pass',
      },
    ],
    disposition: 'Accept',
    sapMaterialDoc: 'MAT-DOC-501192',
  },
  {
    id: 'gr-006',
    grNumber: 'GR-2026-006',
    asnId: 'shp-017',
    asnNumber: 'ASN-2026-017',
    poNumber: 'PO-2025-00117',
    supplierId: 'sup-008',
    supplierName: 'PT Sample Carton Packaging',
    receivedDate: '2026-05-13',
    receivedBy: 'Warehouse Supervisor',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: 'PK-CART-9901',
        description: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
        qtyExpected: 240000,
        qtyReceived: 240000,
        qtyAccepted: 235000,
        qtyRejected: 5000,
        rejectionReason: 'Print quality variance on outer flap',
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
      },
    ],
    disposition: 'Accept',
    sapMaterialDoc: 'MAT-DOC-501088',
    notes: 'Partial rejection of cosmetic-grade print defects.',
  },
  {
    id: 'gr-007',
    grNumber: 'GR-2026-007',
    asnId: 'shp-010',
    asnNumber: 'ASN-2026-010',
    poNumber: 'PO-2025-00113',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    receivedDate: '2026-05-18',
    receivedBy: 'QC Inspector',
    status: 'Quality Hold',
    inspectionResults: [
      {
        materialCode: 'RM-EMUL-3320',
        description: 'Cetearyl Alcohol — Vegetable Origin',
        qtyExpected: 11000,
        qtyReceived: 11000,
        qtyAccepted: 0,
        qtyRejected: 0,
        rejectionReason: 'Color variance vs spec — pending lab confirmation',
        labResultId: 'LAB-2026-021',
        visualCheck: 'Fail',
        packagingCheck: 'Pass',
      },
    ],
    disposition: 'Quarantine',
    notes: 'Held pending GC-MS retest; quarantine bay 4.',
  },
  {
    id: 'gr-008',
    grNumber: 'GR-2026-008',
    asnId: 'shp-009',
    asnNumber: 'ASN-2026-009',
    poNumber: 'PO-2025-00109',
    supplierId: 'sup-008',
    supplierName: 'PT Sample Carton Packaging',
    receivedDate: '2026-05-19',
    receivedBy: 'QC Inspector',
    status: 'Under Inspection',
    inspectionResults: [
      {
        materialCode: 'PK-CART-9901',
        description: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
        qtyExpected: 200000,
        qtyReceived: 200000,
        qtyAccepted: 0,
        qtyRejected: 0,
        visualCheck: 'Pending',
        packagingCheck: 'Pending',
      },
    ],
    disposition: 'Pending',
  },
  {
    id: 'gr-009',
    grNumber: 'GR-2026-009',
    asnId: 'shp-011',
    asnNumber: 'ASN-2026-011',
    poNumber: 'PO-2025-00115',
    supplierId: 'sup-010',
    supplierName: 'PT Sample Halal Emulsifiers',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Pending Inspection',
    inspectionResults: [
      {
        materialCode: 'RM-EMUL-9430',
        description: 'Polysorbate 80 — Halal, Food & Cosmetic Grade',
        qtyExpected: 3000,
        qtyReceived: 3000,
        qtyAccepted: 0,
        qtyRejected: 0,
        visualCheck: 'Pending',
        packagingCheck: 'Pending',
        halalSealCheck: 'Pending' as OptionalCheck,
      },
    ],
    disposition: 'Pending',
  },
  {
    id: 'gr-010',
    grNumber: 'GR-2026-010',
    asnId: 'shp-005',
    asnNumber: 'ASN-2026-005',
    poNumber: 'PO-2025-00105',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    receivedDate: '2026-05-12',
    receivedBy: 'Warehouse Supervisor',
    status: 'Partially Approved',
    inspectionResults: [
      {
        materialCode: 'RM-EMUL-3320',
        description: 'Cetearyl Alcohol — Vegetable Origin',
        qtyExpected: 9000,
        qtyReceived: 9000,
        qtyAccepted: 8200,
        qtyRejected: 800,
        rejectionReason: '2 drums damaged in transit',
        visualCheck: 'Pass',
        packagingCheck: 'Fail',
      },
    ],
    disposition: 'Accept',
    sapMaterialDoc: 'MAT-DOC-501012',
  },
  {
    id: 'gr-011',
    grNumber: 'GR-2026-011',
    asnId: 'shp-007',
    asnNumber: 'ASN-2026-007',
    poNumber: 'PO-2025-00106',
    supplierId: 'sup-006',
    supplierName: 'Sample Specialty Chemicals France',
    receivedDate: '2026-05-08',
    receivedBy: 'QC Inspector',
    status: 'Rejected',
    inspectionResults: [
      {
        materialCode: 'AI-PEPTIDE-8801',
        description: 'Peptide Complex Anti-Aging',
        qtyExpected: 250,
        qtyReceived: 250,
        qtyAccepted: 0,
        qtyRejected: 250,
        rejectionReason: 'Failed potency assay — below 92% spec floor',
        labResultId: 'LAB-2026-014',
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
      },
    ],
    disposition: 'Return to Supplier',
    notes: 'Full lot return initiated; debit memo opened.',
  },
  {
    id: 'gr-012',
    grNumber: 'GR-2026-012',
    asnId: 'shp-008',
    asnNumber: 'ASN-2026-008',
    poNumber: 'PO-2025-00104',
    supplierId: 'sup-004',
    supplierName: 'Sample Aromatics Sdn. Bhd.',
    receivedDate: '2026-05-10',
    receivedBy: 'QC Inspector',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'FR-EMIN-4420',
        description: 'Emina Fresh Citrus Accord',
        qtyExpected: 900,
        qtyReceived: 900,
        qtyAccepted: 900,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        labResultId: 'LAB-2026-009',
      },
    ],
    disposition: 'Accept',
  },
  {
    id: 'gr-013',
    grNumber: 'GR-2026-013',
    asnId: 'shp-006',
    asnNumber: 'ASN-2026-006',
    poNumber: 'PO-2025-00103',
    supplierId: 'sup-003',
    supplierName: 'Sample Fragrance House Indonesia',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        qtyExpected: 1200,
        qtyReceived: 1200,
        qtyAccepted: 1200,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
      },
    ],
    disposition: 'Accept',
  },
  {
    id: 'gr-014',
    grNumber: 'GR-2026-014',
    asnId: 'shp-004',
    asnNumber: 'ASN-2026-004',
    poNumber: 'PO-2025-00102',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    receivedDate: '2026-05-18',
    receivedBy: 'Operations Manager',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: 'RM-EMUL-9410',
        description: 'Glyceryl Stearate SE (Halal Emulsifier)',
        qtyExpected: 8000,
        qtyReceived: 8000,
        qtyAccepted: 8000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        halalSealCheck: 'Pass',
      },
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic Acid — Double Pressed (Halal)',
        qtyExpected: 10000,
        qtyReceived: 10000,
        qtyAccepted: 10000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        halalSealCheck: 'Pass',
      },
    ],
    disposition: 'Accept',
    sapMaterialDoc: 'MAT-DOC-501205',
  },
];
