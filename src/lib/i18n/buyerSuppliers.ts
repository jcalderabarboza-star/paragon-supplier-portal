// BuyerSuppliers i18n fragment (Batch 6). Namespace: buyerSuppliers.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (matching the flat-key convention
// already shipped in i18n.ts — no reliance on the i18next plural resolver).
//
// CENTRAL MAPS (not re-keyed here): StatusPill children — s.status, plus the
// Halal / BPOM / None compliance chips — localize centrally via statusLabel /
// categoryLabel (BPOM + None are unmapped acronyms/placeholders and render
// verbatim by design). The non-pill `s.category` table cell localizes via
// useCategoryLabel(), NOT a page key.
//
// HONEST DISPLAY-vs-DATA: FilterChipsBar `id`s (active/inactive/all) and the
// StatusFilter state stay canonical EN — only the chip LABEL localizes here.
// Mono DATA (SAP BP number, OTIF %, dates via <Data>/formatDate) and fixture
// content (supplier names, cities, country codes) stay EN as data.
export const buyerSuppliersEn: Record<string, string> = {
  // — Breadcrumb —
  'buyerSuppliers.crumb.acquire': 'ACQUIRE',
  'buyerSuppliers.crumb.directory': 'SUPPLIER DIRECTORY',
  // — All-empty state —
  'buyerSuppliers.empty.title': 'No suppliers yet',
  'buyerSuppliers.empty.subtitle': 'The supplier directory is empty.',
  'buyerSuppliers.empty.message':
    'Suppliers will appear here once they are onboarded to the network.',
  // — Page header —
  'buyerSuppliers.header.title': 'Supplier Directory',
  'buyerSuppliers.header.subtitle':
    'Manage your global supplier network across 12 countries.',
  // — Bulk actions —
  'buyerSuppliers.actions.bulkUpload': 'Bulk upload',
  'buyerSuppliers.actions.bulkDownload': 'Bulk download',
  'buyerSuppliers.actions.export': 'Export',
  'buyerSuppliers.actions.invite': 'Invite supplier',
  // — Meta line —
  'buyerSuppliers.meta.records.one': '{{count}} record',
  'buyerSuppliers.meta.records.other': '{{count}} records',
  'buyerSuppliers.meta.lastUpdated': 'last updated',
  // — Sub-tabs —
  'buyerSuppliers.tab.suppliers': 'Suppliers',
  'buyerSuppliers.tab.invitations': 'Pending Invitations',
  // — Status filter chips (labels only; ids stay canonical EN) —
  'buyerSuppliers.filter.active': 'Active',
  'buyerSuppliers.filter.inactive': 'Inactive',
  'buyerSuppliers.filter.all': 'All',
  // — Search —
  'buyerSuppliers.search.placeholder':
    'Search by name, SAP BP, country, or category…',
  // — Table columns —
  'buyerSuppliers.col.supplier': 'Supplier',
  'buyerSuppliers.col.country': 'Country',
  'buyerSuppliers.col.tier': 'Tier',
  'buyerSuppliers.col.category': 'Category',
  'buyerSuppliers.col.compliance': 'Compliance',
  'buyerSuppliers.col.otif': 'OTIF',
  'buyerSuppliers.col.status': 'Status',
  'buyerSuppliers.col.actions': 'Actions',
  'buyerSuppliers.table.noMatch': 'No suppliers match the current filters.',
  // — Connectivity-tier labels —
  'buyerSuppliers.tier.whatsapp': 'Tier 1 · WhatsApp',
  'buyerSuppliers.tier.web': 'Tier 2 · Web Portal',
  'buyerSuppliers.tier.api': 'Tier 3 · API/EDI',
};

export const buyerSuppliersId: Record<string, string> = {
  // — Breadcrumb —
  'buyerSuppliers.crumb.acquire': 'PENGADAAN',
  'buyerSuppliers.crumb.directory': 'DIREKTORI PEMASOK',
  // — All-empty state —
  'buyerSuppliers.empty.title': 'Belum ada pemasok',
  'buyerSuppliers.empty.subtitle': 'Direktori pemasok masih kosong.',
  'buyerSuppliers.empty.message':
    'Pemasok akan muncul di sini setelah onboarding ke jaringan.',
  // — Page header —
  'buyerSuppliers.header.title': 'Direktori Pemasok',
  'buyerSuppliers.header.subtitle':
    'Kelola jaringan pemasok global Anda di 12 negara.',
  // — Bulk actions —
  'buyerSuppliers.actions.bulkUpload': 'Unggah massal',
  'buyerSuppliers.actions.bulkDownload': 'Unduh massal',
  'buyerSuppliers.actions.export': 'Ekspor',
  'buyerSuppliers.actions.invite': 'Undang pemasok',
  // — Meta line —
  'buyerSuppliers.meta.records.one': '{{count}} catatan',
  'buyerSuppliers.meta.records.other': '{{count}} catatan',
  'buyerSuppliers.meta.lastUpdated': 'terakhir diperbarui',
  // — Sub-tabs —
  'buyerSuppliers.tab.suppliers': 'Pemasok',
  'buyerSuppliers.tab.invitations': 'Undangan Tertunda',
  // — Status filter chips (labels only; ids stay canonical EN) —
  'buyerSuppliers.filter.active': 'Aktif',
  'buyerSuppliers.filter.inactive': 'Nonaktif',
  'buyerSuppliers.filter.all': 'Semua',
  // — Search —
  'buyerSuppliers.search.placeholder':
    'Cari berdasarkan nama, SAP BP, negara, atau kategori…',
  // — Table columns —
  'buyerSuppliers.col.supplier': 'Pemasok',
  'buyerSuppliers.col.country': 'Negara',
  'buyerSuppliers.col.tier': 'Tingkat',
  'buyerSuppliers.col.category': 'Kategori',
  'buyerSuppliers.col.compliance': 'Kepatuhan',
  'buyerSuppliers.col.otif': 'OTIF',
  'buyerSuppliers.col.status': 'Status',
  'buyerSuppliers.col.actions': 'Tindakan',
  'buyerSuppliers.table.noMatch':
    'Tidak ada pemasok yang cocok dengan filter saat ini.',
  // — Connectivity-tier labels —
  'buyerSuppliers.tier.whatsapp': 'Tingkat 1 · WhatsApp',
  'buyerSuppliers.tier.web': 'Tingkat 2 · Portal Web',
  'buyerSuppliers.tier.api': 'Tingkat 3 · API/EDI',
};
