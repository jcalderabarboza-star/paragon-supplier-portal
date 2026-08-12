// SupplierDocuments i18n fragment (Batch 5). Namespace: supplierDocuments.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Supplier-persona surface: ID-first tone is welcome.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no reliance on the i18next plural
// resolver, matching the flat-key convention already shipped in i18n.ts).
// Canonical StatusPill children — the document STATUS chips (Valid / Expiring
// Soon / Expired / Awaiting Upload / Under Review) — localize centrally via
// statusLabel.ts and are NOT re-declared here. The table CATEGORY pill
// (`{doc.category}`) renders EN by design: `category` is a canonical fixture
// field with no central category map yet (same filter-vs-pill split flagged for
// BuyerCompliance in Batch 4); the FILTER chip labels localize below while their
// `id` stays the canonical EN category value the filter matches against.
// Mono data (doc numbers, dates, file sizes, versions) is rendered via
// <Data>/formatters and is never translated. Fixture-seeded document names,
// issuer names, linked-to refs, and `notes` are mock data (i18n-defer) and stay
// EN in the page.
export const supplierDocumentsEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierDocuments.crumb.settle': 'SETTLE',
  'supplierDocuments.crumb.myDocuments': 'MY DOCUMENTS',
  // — Page header —
  'supplierDocuments.header.title': 'My Documents',
  'supplierDocuments.header.subtitle':
    'Certifications, compliance documents, COAs, and contracts · Halal & BPOM tracking — {{name}}.',
  'supplierDocuments.common.supplierFallback': 'Supplier',
  'supplierDocuments.action.uploadDoc': 'Upload document',
  // — Meta line —
  'supplierDocuments.meta.summary.one': '{{count}} document · last refreshed {{date}}',
  'supplierDocuments.meta.summary.other': '{{count}} documents · last refreshed {{date}}',
  // — Alert banners (chrome; the joined document names are mock data, kept EN) —
  'supplierDocuments.alert.expired.one':
    '{{count}} expired document — immediate renewal required:',
  'supplierDocuments.alert.expired.other':
    '{{count}} expired documents — immediate renewal required:',
  'supplierDocuments.alert.expiring.one':
    '{{count}} document expiring within 6 months:',
  'supplierDocuments.alert.expiring.other':
    '{{count}} documents expiring within 6 months:',
  'supplierDocuments.alert.awaiting.one': '{{count}} document awaiting upload:',
  'supplierDocuments.alert.awaiting.other': '{{count}} documents awaiting upload:',
  // — KPI cards —
  'supplierDocuments.kpi.total.eyebrow': 'Total Documents',
  'supplierDocuments.kpi.total.subtitle': 'In document vault',
  'supplierDocuments.kpi.valid.eyebrow': 'Valid',
  'supplierDocuments.kpi.valid.subtitle': 'In good standing',
  'supplierDocuments.kpi.expiring.eyebrow': 'Expiring ≤180d',
  'supplierDocuments.kpi.expiring.subtitle': 'Renewal window open',
  'supplierDocuments.kpi.expired.eyebrow': 'Expired',
  'supplierDocuments.kpi.expired.subtitle': 'Blocks new POs',
  'supplierDocuments.kpi.needsAction.eyebrow': 'Needs Action',
  'supplierDocuments.kpi.needsAction.subtitle': 'Upload required',
  // — Search —
  'supplierDocuments.search.placeholder': 'Search documents by name or issuer…',
  // — Category filter chips (labels localize; the chip `id` stays canonical EN) —
  'supplierDocuments.category.all': 'All',
  'supplierDocuments.category.halal': 'Halal',
  'supplierDocuments.category.bpom': 'BPOM',
  'supplierDocuments.category.taxLegal': 'Tax & Legal',
  'supplierDocuments.category.quality': 'Quality',
  'supplierDocuments.category.contract': 'Contract',
  'supplierDocuments.filter.count': '{{shown}} of {{total}} documents',
  // — Table columns —
  'supplierDocuments.table.document': 'Document',
  'supplierDocuments.table.category': 'Category',
  'supplierDocuments.table.issuedBy': 'Issued by',
  'supplierDocuments.table.issued': 'Issued',
  'supplierDocuments.table.expiry': 'Expiry',
  'supplierDocuments.table.status': 'Status',
  'supplierDocuments.table.version': 'Ver.',
  'supplierDocuments.table.actions': 'Actions',
  // — Table cells —
  'supplierDocuments.row.linked': 'Linked: {{value}}',
  'supplierDocuments.expiry.remaining': '{{count}}d remaining',
  'supplierDocuments.expiry.expiredAgo': 'Expired {{count}}d ago',
  'supplierDocuments.expiry.none': 'No expiry',
  'supplierDocuments.table.empty': 'No documents match the current filters.',
  // — Row / footer actions —
  'supplierDocuments.action.upload': 'Upload',
  'supplierDocuments.action.view': 'View',
  'supplierDocuments.action.renew': 'Renew',
  'supplierDocuments.action.close': 'Close',
  'supplierDocuments.action.cancel': 'Cancel',
  'supplierDocuments.action.submit': 'Submit',
  // — BPJPH mandatory-transition banner —
  'supplierDocuments.bpjph.title': 'BPJPH Halal Mandatory Transition — October 2026:',
  'supplierDocuments.bpjph.body':
    'All cosmetics and personal care products distributed in Indonesia must carry BPJPH-issued halal certification. MUI certificates issued before the transition remain valid until expiry but cannot be renewed — new BPJPH certification must be obtained.',
  // — Upload side panel —
  'supplierDocuments.panel.newTitle': 'Upload new document',
  'supplierDocuments.panel.uploadTitle': 'Upload — {{name}}',
  'supplierDocuments.panel.document': 'Document',
  'supplierDocuments.panel.uploadFile': 'Upload file',
  'supplierDocuments.panel.dropzone.title': 'Drop file here or click to browse',
  'supplierDocuments.panel.dropzone.hint': 'PDF, JPG, PNG · Max 20 MB',
  'supplierDocuments.panel.uploadedMsg': 'Document uploaded — pending Paragon review.',
  // — Toasts —
  'supplierDocuments.toast.uploaded.title': 'Document uploaded',
  'supplierDocuments.toast.uploaded.desc': 'Pending Paragon review.',
  'supplierDocuments.toast.downloading': 'Download not available yet — {{name}} was not downloaded.',
  'supplierDocuments.toast.renewStarted': 'Renewal workflow started for {{name}}',
  // — Empty state (all-empty early return) —
  'supplierDocuments.empty.title': 'No documents yet',
  'supplierDocuments.empty.subtitle': 'No documents on file for {{name}}.',
  'supplierDocuments.empty.supplierFallback': 'this supplier',
  'supplierDocuments.empty.message':
    'Uploaded certifications, COAs, and contracts will appear here.',
};

export const supplierDocumentsId: Record<string, string> = {
  // — Breadcrumb —
  'supplierDocuments.crumb.settle': 'PENYELESAIAN',
  'supplierDocuments.crumb.myDocuments': 'DOKUMEN SAYA',
  // — Page header —
  'supplierDocuments.header.title': 'Dokumen Saya',
  'supplierDocuments.header.subtitle':
    'Sertifikasi, dokumen kepatuhan, COA, dan kontrak · Pelacakan Halal & BPOM — {{name}}.',
  'supplierDocuments.common.supplierFallback': 'Pemasok',
  'supplierDocuments.action.uploadDoc': 'Unggah dokumen',
  // — Meta line —
  'supplierDocuments.meta.summary.one': '{{count}} dokumen · terakhir disegarkan {{date}}',
  'supplierDocuments.meta.summary.other': '{{count}} dokumen · terakhir disegarkan {{date}}',
  // — Alert banners (chrome; the joined document names are mock data, kept EN) —
  'supplierDocuments.alert.expired.one':
    '{{count}} dokumen kedaluwarsa — pembaruan segera diperlukan:',
  'supplierDocuments.alert.expired.other':
    '{{count}} dokumen kedaluwarsa — pembaruan segera diperlukan:',
  'supplierDocuments.alert.expiring.one':
    '{{count}} dokumen akan kedaluwarsa dalam 6 bulan:',
  'supplierDocuments.alert.expiring.other':
    '{{count}} dokumen akan kedaluwarsa dalam 6 bulan:',
  'supplierDocuments.alert.awaiting.one': '{{count}} dokumen menunggu unggahan:',
  'supplierDocuments.alert.awaiting.other': '{{count}} dokumen menunggu unggahan:',
  // — KPI cards —
  'supplierDocuments.kpi.total.eyebrow': 'Total Dokumen',
  'supplierDocuments.kpi.total.subtitle': 'Di brankas dokumen',
  'supplierDocuments.kpi.valid.eyebrow': 'Berlaku',
  'supplierDocuments.kpi.valid.subtitle': 'Dalam kondisi baik',
  'supplierDocuments.kpi.expiring.eyebrow': 'Akan Kedaluwarsa ≤180h',
  'supplierDocuments.kpi.expiring.subtitle': 'Jendela pembaruan terbuka',
  'supplierDocuments.kpi.expired.eyebrow': 'Kedaluwarsa',
  'supplierDocuments.kpi.expired.subtitle': 'Memblokir PO baru',
  'supplierDocuments.kpi.needsAction.eyebrow': 'Perlu Tindakan',
  'supplierDocuments.kpi.needsAction.subtitle': 'Unggahan diperlukan',
  // — Search —
  'supplierDocuments.search.placeholder': 'Cari dokumen berdasarkan nama atau penerbit…',
  // — Category filter chips (labels localize; the chip `id` stays canonical EN) —
  'supplierDocuments.category.all': 'Semua',
  'supplierDocuments.category.halal': 'Halal',
  'supplierDocuments.category.bpom': 'BPOM',
  'supplierDocuments.category.taxLegal': 'Pajak & Hukum',
  'supplierDocuments.category.quality': 'Kualitas',
  'supplierDocuments.category.contract': 'Kontrak',
  'supplierDocuments.filter.count': '{{shown}} dari {{total}} dokumen',
  // — Table columns —
  'supplierDocuments.table.document': 'Dokumen',
  'supplierDocuments.table.category': 'Kategori',
  'supplierDocuments.table.issuedBy': 'Diterbitkan oleh',
  'supplierDocuments.table.issued': 'Diterbitkan',
  'supplierDocuments.table.expiry': 'Kedaluwarsa',
  'supplierDocuments.table.status': 'Status',
  'supplierDocuments.table.version': 'Ver.',
  'supplierDocuments.table.actions': 'Tindakan',
  // — Table cells —
  'supplierDocuments.row.linked': 'Tertaut: {{value}}',
  'supplierDocuments.expiry.remaining': '{{count}}h tersisa',
  'supplierDocuments.expiry.expiredAgo': 'Kedaluwarsa {{count}}h lalu',
  'supplierDocuments.expiry.none': 'Tanpa kedaluwarsa',
  'supplierDocuments.table.empty': 'Tidak ada dokumen yang cocok dengan filter saat ini.',
  // — Row / footer actions —
  'supplierDocuments.action.upload': 'Unggah',
  'supplierDocuments.action.view': 'Lihat',
  'supplierDocuments.action.renew': 'Perbarui',
  'supplierDocuments.action.close': 'Tutup',
  'supplierDocuments.action.cancel': 'Batal',
  'supplierDocuments.action.submit': 'Kirim',
  // — BPJPH mandatory-transition banner —
  'supplierDocuments.bpjph.title': 'Transisi Wajib Halal BPJPH — Oktober 2026:',
  'supplierDocuments.bpjph.body':
    'Semua produk kosmetik dan perawatan pribadi yang didistribusikan di Indonesia harus memiliki sertifikasi halal terbitan BPJPH. Sertifikat MUI yang diterbitkan sebelum transisi tetap berlaku hingga kedaluwarsa tetapi tidak dapat diperbarui — sertifikasi BPJPH baru harus diperoleh.',
  // — Upload side panel —
  'supplierDocuments.panel.newTitle': 'Unggah dokumen baru',
  'supplierDocuments.panel.uploadTitle': 'Unggah — {{name}}',
  'supplierDocuments.panel.document': 'Dokumen',
  'supplierDocuments.panel.uploadFile': 'Unggah berkas',
  'supplierDocuments.panel.dropzone.title': 'Letakkan berkas di sini atau klik untuk menelusuri',
  'supplierDocuments.panel.dropzone.hint': 'PDF, JPG, PNG · Maks 20 MB',
  'supplierDocuments.panel.uploadedMsg': 'Dokumen diunggah — menunggu tinjauan Paragon.',
  // — Toasts —
  'supplierDocuments.toast.uploaded.title': 'Dokumen diunggah',
  'supplierDocuments.toast.uploaded.desc': 'Menunggu tinjauan Paragon.',
  'supplierDocuments.toast.downloading': 'Unduhan belum tersedia — {{name}} tidak diunduh.',
  'supplierDocuments.toast.renewStarted': 'Alur pembaruan dimulai untuk {{name}}',
  // — Empty state (all-empty early return) —
  'supplierDocuments.empty.title': 'Belum ada dokumen',
  'supplierDocuments.empty.subtitle': 'Tidak ada dokumen tercatat untuk {{name}}.',
  'supplierDocuments.empty.supplierFallback': 'pemasok ini',
  'supplierDocuments.empty.message':
    'Sertifikasi, COA, dan kontrak yang diunggah akan muncul di sini.',
};
