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
  'supplierDocuments.action.declareCert': 'Declare a certificate',
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
  'supplierDocuments.action.declare': 'Declare',
  'supplierDocuments.action.view': 'View',
  'supplierDocuments.action.renew': 'Renew',
  'supplierDocuments.action.close': 'Close',
  'supplierDocuments.action.cancel': 'Cancel',
  'supplierDocuments.action.submit': 'Record declaration',
  // — BPJPH mandatory-transition banner —
  'supplierDocuments.bpjph.title': 'BPJPH Halal Mandatory Transition — October 2026:',
  'supplierDocuments.bpjph.body':
    'All cosmetics and personal care products distributed in Indonesia must carry BPJPH-issued halal certification. MUI certificates issued before the transition remain valid until expiry but cannot be renewed — new BPJPH certification must be obtained.',
  // — Upload side panel —
  'supplierDocuments.panel.newTitle': 'Declare a certificate',
  'supplierDocuments.panel.declareTitle': 'Declare — {{name}}',
  'supplierDocuments.panel.document': 'Document',
  'supplierDocuments.panel.certDetails': 'Certificate details',
  'supplierDocuments.panel.declaredMsg': 'Declaration recorded — Paragon’s compliance team will review it.',
  // — §82 · THE DECLARATION, AND THE SENTENCE THAT MAKES IT HONEST —
  'supplierDocuments.panel.noFile.title': 'No file is sent to Paragon',
  'supplierDocuments.panel.noFile.body':
    'This portal records what you state about a certificate — the scheme, the number, who granted it and the dates. It does not receive, store or forward the certificate document itself. Keep the original; Paragon’s compliance team will ask for it through your usual channel if they need to see it.',
  'supplierDocuments.panel.attribution':
    'Recorded against your company rather than against a named person — this portal has no individual sign-in yet.',
  'supplierDocuments.field.certType': 'Certificate scheme',
  'supplierDocuments.field.certType.hint':
    'What you state here is a claim until Paragon’s compliance team confirms it.',
  'supplierDocuments.field.certNumber': 'Certificate number',
  'supplierDocuments.field.issuer': 'Granted by',
  'supplierDocuments.field.issuedOn': 'Granted on',
  'supplierDocuments.field.expiresOn': 'Valid until',
  'supplierDocuments.field.expiresOn.hint':
    'Leave blank if it has no expiry — a BPJPH halal certificate does not.',
  'supplierDocuments.field.scopeText': 'What it covers',
  'supplierDocuments.field.scopeText.hint':
    'In your own words — the products, grades or sites. Paragon matches this to its own material codes when it reviews.',
  'supplierDocuments.field.scopeText.placeholder':
    'e.g. all PET bottle grades produced at the Tangerang plant',
  'supplierDocuments.panel.incomplete':
    'Every field except the expiry date is needed before this can be recorded.',
  'supplierDocuments.toast.declineFailed.title': 'Declaration not recorded',
  'supplierDocuments.action.redeclare': 'Declare again',
  // — Toasts —
  'supplierDocuments.toast.declared.title': 'Declaration recorded',
  'supplierDocuments.toast.declared.desc': 'Awaiting review by Paragon’s compliance team.',
  'supplierDocuments.toast.downloading': 'Download not available yet — {{name}} was not downloaded.',
  'supplierDocuments.toast.renewStarted': 'Renewal workflow started for {{name}}',
  // — Refusal (the one Rejected row) —
  // ⚠️ THE UNATTRIBUTED LINE IS NOT DECORATION AND MUST NOT BE TRIMMED. The
  // refusal is recorded against `UNATTRIBUTED: NO_PERSON_IN_SESSION`, so the
  // surface states that in the supplier's own language rather than leaving a
  // blank where a name would go. Copy follows the shipped precedent at
  // `roles.ts:207` — the platform says what it cannot know, in plain words.
  'supplierDocuments.refusal.label': 'Refused',
  'supplierDocuments.refusal.on': 'Refused on {{date}}',
  'supplierDocuments.refusal.reasonLabel': 'Reason',
  'supplierDocuments.refusal.unattributed':
    'Recorded without a named person — the portal has no user directory yet.',
  'supplierDocuments.alert.refused.one': '{{count}} document was refused:',
  'supplierDocuments.alert.refused.other': '{{count}} documents were refused:',
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
  'supplierDocuments.action.declareCert': 'Nyatakan sertifikat',
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
  'supplierDocuments.action.declare': 'Nyatakan',
  'supplierDocuments.action.view': 'Lihat',
  'supplierDocuments.action.renew': 'Perbarui',
  'supplierDocuments.action.close': 'Tutup',
  'supplierDocuments.action.cancel': 'Batal',
  'supplierDocuments.action.submit': 'Catat pernyataan',
  // — BPJPH mandatory-transition banner —
  'supplierDocuments.bpjph.title': 'Transisi Wajib Halal BPJPH — Oktober 2026:',
  'supplierDocuments.bpjph.body':
    'Semua produk kosmetik dan perawatan pribadi yang didistribusikan di Indonesia harus memiliki sertifikasi halal terbitan BPJPH. Sertifikat MUI yang diterbitkan sebelum transisi tetap berlaku hingga kedaluwarsa tetapi tidak dapat diperbarui — sertifikasi BPJPH baru harus diperoleh.',
  // — Upload side panel —
  'supplierDocuments.panel.newTitle': 'Nyatakan sertifikat',
  'supplierDocuments.panel.declareTitle': 'Nyatakan — {{name}}',
  'supplierDocuments.panel.document': 'Dokumen',
  'supplierDocuments.panel.certDetails': 'Rincian sertifikat',
  'supplierDocuments.panel.declaredMsg': 'Pernyataan tercatat — tim kepatuhan Paragon akan meninjaunya.',
  // — §82 —
  'supplierDocuments.panel.noFile.title': 'Tidak ada berkas yang dikirim ke Paragon',
  'supplierDocuments.panel.noFile.body':
    'Portal ini mencatat apa yang Anda nyatakan tentang sebuah sertifikat — skema, nomor, pihak yang menerbitkan, dan tanggalnya. Portal tidak menerima, menyimpan, atau meneruskan dokumen sertifikatnya sendiri. Simpan aslinya; tim kepatuhan Paragon akan memintanya lewat saluran biasa bila perlu melihatnya.',
  'supplierDocuments.panel.attribution':
    'Dicatat atas nama perusahaan Anda, bukan atas nama perorangan — portal ini belum memiliki masuk-akun untuk individu.',
  'supplierDocuments.field.certType': 'Skema sertifikat',
  'supplierDocuments.field.certType.hint':
    'Yang Anda nyatakan di sini adalah klaim sampai tim kepatuhan Paragon mengonfirmasinya.',
  'supplierDocuments.field.certNumber': 'Nomor sertifikat',
  'supplierDocuments.field.issuer': 'Diterbitkan oleh',
  'supplierDocuments.field.issuedOn': 'Tanggal terbit',
  'supplierDocuments.field.expiresOn': 'Berlaku sampai',
  'supplierDocuments.field.expiresOn.hint':
    'Kosongkan bila tidak ada masa berlaku — sertifikat halal BPJPH tidak memilikinya.',
  'supplierDocuments.field.scopeText': 'Cakupannya',
  'supplierDocuments.field.scopeText.hint':
    'Dengan kata-kata Anda sendiri — produk, grade, atau lokasi. Paragon mencocokkannya dengan kode materialnya sendiri saat meninjau.',
  'supplierDocuments.field.scopeText.placeholder':
    'mis. semua grade botol PET yang diproduksi di pabrik Tangerang',
  'supplierDocuments.panel.incomplete':
    'Semua kolom selain tanggal berakhir wajib diisi sebelum dapat dicatat.',
  'supplierDocuments.toast.declineFailed.title': 'Pernyataan tidak tercatat',
  'supplierDocuments.action.redeclare': 'Nyatakan ulang',
  // — Toasts —
  'supplierDocuments.toast.declared.title': 'Pernyataan tercatat',
  'supplierDocuments.toast.declared.desc': 'Menunggu tinjauan tim kepatuhan Paragon.',
  'supplierDocuments.toast.downloading': 'Unduhan belum tersedia — {{name}} tidak diunduh.',
  'supplierDocuments.toast.renewStarted': 'Alur pembaruan dimulai untuk {{name}}',
  // — Empty state (all-empty early return) —
  // — Penolakan (satu baris Rejected) —
  'supplierDocuments.refusal.label': 'Ditolak',
  'supplierDocuments.refusal.on': 'Ditolak pada {{date}}',
  'supplierDocuments.refusal.reasonLabel': 'Alasan',
  'supplierDocuments.refusal.unattributed':
    'Dicatat tanpa nama orang — portal ini belum memiliki direktori pengguna.',
  'supplierDocuments.alert.refused.one': '{{count}} dokumen ditolak:',
  'supplierDocuments.alert.refused.other': '{{count}} dokumen ditolak:',
  'supplierDocuments.empty.title': 'Belum ada dokumen',
  'supplierDocuments.empty.subtitle': 'Tidak ada dokumen tercatat untuk {{name}}.',
  'supplierDocuments.empty.supplierFallback': 'pemasok ini',
  'supplierDocuments.empty.message':
    'Sertifikasi, COA, dan kontrak yang diunggah akan muncul di sini.',
};
