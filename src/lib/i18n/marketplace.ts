// Marketplace i18n fragment (Batch 6). Namespace: marketplace.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
//
// Category tokens (filter chips + SupplierCard category chips) localize CENTRALLY
// via useCategoryLabel() — never re-keyed here; the filter `id` and the stored
// `s.category` value stay canonical EN. StatusPill children ("Sample data", "Open",
// Halal / BPOM compliance chips) auto-localize via the central resolver chain and
// are NOT re-keyed. The OPEN_RFQS teaser rows (material names, quantities, deadlines,
// RFQ numbers) are sample/mock fixture content and stay EN as DATA / i18n-defer.
export const marketplaceEn: Record<string, string> = {
  // — Breadcrumb —
  'marketplace.crumb.acquire': 'ACQUIRE',
  'marketplace.crumb.marketplace': 'MARKETPLACE',
  // — Page header —
  'marketplace.header.title': 'Global Supplier Marketplace',
  'marketplace.header.subtitle':
    'Discover and connect with vetted suppliers worldwide.',
  // — KPI cards —
  'marketplace.kpi.totalSuppliers.eyebrow': 'Total Suppliers',
  'marketplace.kpi.totalSuppliers.subtitle': 'Listed on the network',
  'marketplace.kpi.countries.eyebrow': 'Countries Covered',
  'marketplace.kpi.countries.subtitle': 'Across APAC + EMEA',
  'marketplace.kpi.activeRfqs.eyebrow': 'Active RFQs',
  'marketplace.kpi.activeRfqs.subtitle': 'Open for response',
  'marketplace.kpi.onboarding.eyebrow': 'Avg Onboarding',
  'marketplace.kpi.onboarding.subtitle': 'From invite to first PO',
  // — Category filter —
  'marketplace.filter.byCategory': 'Filter by category',
  // — Search —
  'marketplace.search.placeholder':
    'Search by name, category, country, or capability…',
  // — Supplier cards —
  'marketplace.cards.empty': 'No suppliers match the current filters.',
  'marketplace.grade': 'Grade {{grade}}',
  'marketplace.card.viewProfile': 'View profile',
  // — Open-RFQ teaser section —
  'marketplace.rfq.title': 'Open RFQ Opportunities',
  'marketplace.rfq.subtitle':
    'Illustrative open-RFQ teaser — not yet wired to live sourcing data.',
  'marketplace.rfq.viewAll': 'View all',
  'marketplace.rfq.col.rfq': 'RFQ #',
  'marketplace.rfq.col.material': 'Material',
  'marketplace.rfq.col.quantity': 'Quantity',
  'marketplace.rfq.col.deadline': 'Deadline',
  'marketplace.rfq.col.status': 'Status',
  // — Empty state (no suppliers early return) —
  'marketplace.empty.title': 'No suppliers in the marketplace',
  'marketplace.empty.subtitle':
    'The marketplace directory is empty for this view.',
  'marketplace.empty.message':
    'Vetted suppliers will appear here once they join the network.',
};

export const marketplaceId: Record<string, string> = {
  // — Breadcrumb —
  'marketplace.crumb.acquire': 'PENGADAAN',
  'marketplace.crumb.marketplace': 'PASAR',
  // — Page header —
  'marketplace.header.title': 'Pasar Pemasok Global',
  'marketplace.header.subtitle':
    'Temukan dan terhubung dengan pemasok tepercaya di seluruh dunia.',
  // — KPI cards —
  'marketplace.kpi.totalSuppliers.eyebrow': 'Total Pemasok',
  'marketplace.kpi.totalSuppliers.subtitle': 'Terdaftar di jaringan',
  'marketplace.kpi.countries.eyebrow': 'Negara Tercakup',
  'marketplace.kpi.countries.subtitle': 'Di seluruh APAC + EMEA',
  'marketplace.kpi.activeRfqs.eyebrow': 'RFQ Aktif',
  'marketplace.kpi.activeRfqs.subtitle': 'Terbuka untuk respons',
  'marketplace.kpi.onboarding.eyebrow': 'Rata-rata Onboarding',
  'marketplace.kpi.onboarding.subtitle': 'Dari undangan hingga PO pertama',
  // — Category filter —
  'marketplace.filter.byCategory': 'Filter menurut kategori',
  // — Search —
  'marketplace.search.placeholder':
    'Cari berdasarkan nama, kategori, negara, atau kapabilitas…',
  // — Supplier cards —
  'marketplace.cards.empty': 'Tidak ada pemasok yang cocok dengan filter saat ini.',
  'marketplace.grade': 'Kelas {{grade}}',
  'marketplace.card.viewProfile': 'Lihat profil',
  // — Open-RFQ teaser section —
  'marketplace.rfq.title': 'Peluang RFQ Terbuka',
  'marketplace.rfq.subtitle':
    'Cuplikan RFQ-terbuka ilustratif — belum terhubung ke data sourcing langsung.',
  'marketplace.rfq.viewAll': 'Lihat semua',
  'marketplace.rfq.col.rfq': 'RFQ #',
  'marketplace.rfq.col.material': 'Material',
  'marketplace.rfq.col.quantity': 'Kuantitas',
  'marketplace.rfq.col.deadline': 'Tenggat',
  'marketplace.rfq.col.status': 'Status',
  // — Empty state (no suppliers early return) —
  'marketplace.empty.title': 'Tidak ada pemasok di pasar',
  'marketplace.empty.subtitle':
    'Direktori pasar kosong untuk tampilan ini.',
  'marketplace.empty.message':
    'Pemasok tepercaya akan muncul di sini setelah bergabung dengan jaringan.',
};
