export type ContractType =
  | 'Supply'
  | 'Service'
  | 'Framework'
  | 'NDA'
  | 'Quality'
  | 'Pricing';

export type ContractStatus =
  | 'Draft'
  | 'Active'
  | 'Expiring'
  | 'Expired'
  | 'Renewed'
  | 'Terminated';

export interface Contract {
  id: string;
  contractNumber: string;
  supplierId: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  autoRenewal: boolean;
  noticeRequiredDays: number;
  value: number;
  currency: 'IDR';
  paymentTerms: string;
  incoterms: string;
  signedByBuyer: string;
  signedBySupplier: string;
  signedDate: string;
  obligationCount: number;
  obligationsMet: number;
  daysUntilExpiry: number;
  category: string;
  brands: string[];
  performanceScore: number;
}

export const mockContracts: Contract[] = [
  // ── Active stable (> 180d) ───────────────────────────────────────────────
  {
    id: 'ctr-001',
    contractNumber: 'CTR-2026-001',
    supplierId: 'sup-001',
    title: 'Halal Emulsifier Master Supply Agreement 2026',
    type: 'Supply',
    status: 'Active',
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    autoRenewal: true,
    noticeRequiredDays: 90,
    value: 8_500_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 45',
    incoterms: 'CIF Jakarta',
    signedByBuyer: 'VP Procurement',
    signedBySupplier: 'CEO',
    signedDate: '2025-12-15',
    obligationCount: 5,
    obligationsMet: 3,
    daysUntilExpiry: 590,
    category: 'Raw Material',
    brands: ['Wardah', 'Emina', 'Make Over'],
    performanceScore: 92,
  },
  {
    id: 'ctr-002',
    contractNumber: 'CTR-2026-002',
    supplierId: 'sup-003',
    title: 'Givaudan Fragrance Framework 2026-2027',
    type: 'Framework',
    status: 'Active',
    startDate: '2026-01-15',
    endDate: '2027-03-31',
    autoRenewal: false,
    noticeRequiredDays: 60,
    value: 12_000_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 45',
    incoterms: 'CIF Jakarta',
    signedByBuyer: 'CPO',
    signedBySupplier: 'Regional Director APAC',
    signedDate: '2026-01-08',
    obligationCount: 4,
    obligationsMet: 2,
    daysUntilExpiry: 315,
    category: 'Fragrance',
    brands: ['Wardah', 'Make Over'],
    performanceScore: 95,
  },

  // ── Active expiring within 180d ──────────────────────────────────────────
  {
    id: 'ctr-003',
    contractNumber: 'CTR-2025-018',
    supplierId: 'sup-007',
    title: 'PT Berlina PET Bottle Supply 2025-2026',
    type: 'Supply',
    status: 'Active',
    startDate: '2025-10-01',
    endDate: '2026-09-30',
    autoRenewal: true,
    noticeRequiredDays: 60,
    value: 4_200_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 30',
    incoterms: 'FCA Tangerang',
    signedByBuyer: 'Director of Procurement',
    signedBySupplier: 'COO',
    signedDate: '2025-09-22',
    obligationCount: 3,
    obligationsMet: 2,
    daysUntilExpiry: 133,
    category: 'Packaging',
    brands: ['Wardah'],
    performanceScore: 88,
  },
  {
    id: 'ctr-004',
    contractNumber: 'CTR-2025-022',
    supplierId: 'sup-005',
    title: 'BASF Active Ingredient Pricing Agreement 2025-2026',
    type: 'Pricing',
    status: 'Active',
    startDate: '2025-11-01',
    endDate: '2026-10-31',
    autoRenewal: false,
    noticeRequiredDays: 90,
    value: 5_800_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 45',
    incoterms: 'CIF Jakarta',
    signedByBuyer: 'VP Procurement',
    signedBySupplier: 'Global Account Manager',
    signedDate: '2025-10-18',
    obligationCount: 4,
    obligationsMet: 3,
    daysUntilExpiry: 164,
    category: 'Active Ingredient',
    brands: ['Wardah', 'Kahf'],
    performanceScore: 90,
  },

  // ── Active expiring within 90d ───────────────────────────────────────────
  {
    id: 'ctr-005',
    contractNumber: 'CTR-2025-031',
    supplierId: 'sup-004',
    title: 'Firmenich Quality Audit & Compliance Agreement',
    type: 'Quality',
    status: 'Active',
    startDate: '2025-08-15',
    endDate: '2026-08-15',
    autoRenewal: true,
    noticeRequiredDays: 30,
    value: 850_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 30',
    incoterms: 'FCA Petaling Jaya',
    signedByBuyer: 'Head of Quality',
    signedBySupplier: 'QA Director',
    signedDate: '2025-08-01',
    obligationCount: 5,
    obligationsMet: 3,
    daysUntilExpiry: 87,
    category: 'Fragrance',
    brands: ['Wardah', 'Emina'],
    performanceScore: 86,
  },
  {
    id: 'ctr-006',
    contractNumber: 'CTR-2025-039',
    supplierId: 'sup-008',
    title: 'PT Indo Karton Secondary Packaging Supply',
    type: 'Supply',
    status: 'Active',
    startDate: '2025-07-25',
    endDate: '2026-07-25',
    autoRenewal: false,
    noticeRequiredDays: 30,
    value: 1_400_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 30',
    incoterms: 'FCA Surabaya',
    signedByBuyer: 'Senior Manager Packaging',
    signedBySupplier: 'Sales Director',
    signedDate: '2025-07-10',
    obligationCount: 3,
    obligationsMet: 2,
    daysUntilExpiry: 66,
    category: 'Packaging',
    brands: ['Emina', 'Instaperfect'],
    performanceScore: 80,
  },

  // ── Expiring (within 30d) ────────────────────────────────────────────────
  {
    id: 'ctr-007',
    contractNumber: 'CTR-2025-044',
    supplierId: 'sup-006',
    title: 'Evonik Specialty Chemicals NDA — Q2 2025',
    type: 'NDA',
    status: 'Expiring',
    startDate: '2025-06-15',
    endDate: '2026-06-15',
    autoRenewal: false,
    noticeRequiredDays: 30,
    value: 0,
    currency: 'IDR',
    paymentTerms: 'N/A',
    incoterms: 'N/A',
    signedByBuyer: 'Legal Counsel',
    signedBySupplier: 'Legal Counsel',
    signedDate: '2025-06-05',
    obligationCount: 2,
    obligationsMet: 1,
    daysUntilExpiry: 26,
    category: 'Active Ingredient',
    brands: ['Wardah'],
    performanceScore: 78,
  },
  {
    id: 'ctr-008',
    contractNumber: 'CTR-2025-046',
    supplierId: 'sup-009',
    title: 'Zhejiang NHU Vitamin Service Contract',
    type: 'Service',
    status: 'Expiring',
    startDate: '2025-06-05',
    endDate: '2026-06-05',
    autoRenewal: true,
    noticeRequiredDays: 30,
    value: 720_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 30',
    incoterms: 'CIF Jakarta',
    signedByBuyer: 'Procurement Manager',
    signedBySupplier: 'Account Director',
    signedDate: '2025-05-25',
    obligationCount: 4,
    obligationsMet: 4,
    daysUntilExpiry: 16,
    category: 'Active Ingredient',
    brands: ['Wardah', 'Kahf'],
    performanceScore: 84,
  },

  // ── Expired ──────────────────────────────────────────────────────────────
  {
    id: 'ctr-009',
    contractNumber: 'CTR-2024-117',
    supplierId: 'sup-002',
    title: 'Musim Mas Specialty Fats Pricing 2024-2025',
    type: 'Pricing',
    status: 'Expired',
    startDate: '2024-03-01',
    endDate: '2026-02-28',
    autoRenewal: false,
    noticeRequiredDays: 60,
    value: 3_200_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 30',
    incoterms: 'CIF Jakarta',
    signedByBuyer: 'VP Procurement',
    signedBySupplier: 'Commercial Director',
    signedDate: '2024-02-15',
    obligationCount: 3,
    obligationsMet: 3,
    daysUntilExpiry: -81,
    category: 'Raw Material',
    brands: ['Wardah', 'Emina'],
    performanceScore: 89,
  },

  // ── Renewed ──────────────────────────────────────────────────────────────
  {
    id: 'ctr-010',
    contractNumber: 'CTR-2025-058',
    supplierId: 'sup-001',
    title: 'PT Ecogreen Annual Service Agreement (Renewed)',
    type: 'Service',
    status: 'Renewed',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    autoRenewal: true,
    noticeRequiredDays: 60,
    value: 1_100_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 45',
    incoterms: 'CIF Jakarta',
    signedByBuyer: 'Director of Procurement',
    signedBySupplier: 'CEO',
    signedDate: '2025-12-01',
    obligationCount: 4,
    obligationsMet: 2,
    daysUntilExpiry: 225,
    category: 'Raw Material',
    brands: ['Wardah'],
    performanceScore: 91,
  },

  // ── Draft ────────────────────────────────────────────────────────────────
  {
    id: 'ctr-011',
    contractNumber: 'CTR-2026-015',
    supplierId: 'sup-011',
    title: 'Anhui Salicylics Framework Agreement (Draft)',
    type: 'Framework',
    status: 'Draft',
    startDate: '2026-07-01',
    endDate: '2027-12-31',
    autoRenewal: false,
    noticeRequiredDays: 90,
    value: 2_800_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 30',
    incoterms: 'CIF Jakarta',
    signedByBuyer: '—',
    signedBySupplier: '—',
    signedDate: '',
    obligationCount: 0,
    obligationsMet: 0,
    daysUntilExpiry: 590,
    category: 'Active Ingredient',
    brands: ['Wardah', 'Kahf'],
    performanceScore: 0,
  },

  // ── Terminated ───────────────────────────────────────────────────────────
  {
    id: 'ctr-012',
    contractNumber: 'CTR-2024-093',
    supplierId: 'sup-012',
    title: 'Caelo PET Manufacturer Supply (Terminated)',
    type: 'Supply',
    status: 'Terminated',
    startDate: '2024-05-01',
    endDate: '2026-04-15',
    autoRenewal: false,
    noticeRequiredDays: 60,
    value: 950_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 30',
    incoterms: 'CIF Jakarta',
    signedByBuyer: 'Procurement Manager',
    signedBySupplier: 'Managing Director',
    signedDate: '2024-04-20',
    obligationCount: 3,
    obligationsMet: 1,
    daysUntilExpiry: -35,
    category: 'Packaging',
    brands: ['Wardah'],
    performanceScore: 52,
  },

  // ── Active — the Delivery-Agreement demo anchor ──────────────────────────
  // A SECOND real PT Berlina (sup-007) supply contract. The pristine ctr-003
  // above stays the all-draft zero-state; this contract is the openable home
  // for the SIMULATED scheduling-agreement demo (sa-0002), so its Delivery
  // Agreements tab renders the active drawdown/fulfillment states. sup-007 is
  // kept because the demo shipments are PT Berlina's own (deriveAgreementView
  // filters the shipment pool to the agreement supplier).
  {
    id: 'ctr-013',
    contractNumber: 'CTR-2026-021',
    supplierId: 'sup-007',
    title: 'PT Berlina Packaging Scheduling Agreement 2026',
    type: 'Supply',
    status: 'Active',
    startDate: '2026-03-01',
    endDate: '2027-06-30',
    autoRenewal: true,
    noticeRequiredDays: 60,
    value: 6_100_000_000,
    currency: 'IDR',
    paymentTerms: 'Net 30',
    incoterms: 'FCA Tangerang',
    signedByBuyer: 'Director of Procurement',
    signedBySupplier: 'COO',
    signedDate: '2026-02-18',
    obligationCount: 3,
    obligationsMet: 2,
    daysUntilExpiry: 344,
    category: 'Packaging',
    brands: ['Wardah', 'Emina'],
    performanceScore: 88,
  },
];
