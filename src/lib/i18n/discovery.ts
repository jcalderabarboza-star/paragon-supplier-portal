// BuyerDiscovery i18n fragment (Batch 3). Namespace: discovery.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no reliance on the i18next plural
// resolver, matching the flat-key convention already shipped in i18n.ts).
// Canonical StatusPill children (In Network, risk levels, qualification status,
// category/cert chips) are localized centrally / are mock data and are NOT
// re-declared here. Example search-suggestion chips are left as EN literals in
// the page (i18n-defer) because they seed the search query against EN data.
export const discoveryEn: Record<string, string> = {
  // — Breadcrumb —
  'discovery.crumb.acquire': 'ACQUIRE',
  'discovery.crumb.discovery': 'DISCOVERY',
  // — Page header —
  'discovery.header.title': 'Supplier Discovery',
  'discovery.header.subtitle':
    'Find and qualify new suppliers globally.',
  'discovery.action.openMarketplace': 'Open Marketplace',
  // — Meta line —
  'discovery.meta.summary': '{{count}} candidates · last updated {{date}}',
  // — KPI cards —
  'discovery.kpi.candidates.eyebrow': 'Candidates Identified',
  'discovery.kpi.candidates.subtitle': 'Across global beauty market',
  'discovery.kpi.qualifying.eyebrow': 'In Qualification',
  'discovery.kpi.qualifying.subtitle': 'Active onboarding pipeline',
  'discovery.kpi.approved.eyebrow': 'Approved This Month',
  'discovery.kpi.approved.subtitle': 'Net-new qualified suppliers',
  'discovery.kpi.gaps.eyebrow': 'Dual-Source Gaps',
  'discovery.kpi.gaps.subtitle': 'Materials with single source',
  // — Sub-tabs —
  'discovery.tab.search': 'Global Search',
  'discovery.tab.recommendations': 'AI Recommendations',
  'discovery.tab.qualification': 'Qualification Pipeline',
  'discovery.tab.intelligence': 'Market Intelligence',
  // — Search / filters —
  'discovery.search.placeholder': 'Search by material, category, country, or capability…',
  'discovery.region.all': 'All regions',
  'discovery.region.apac': 'Asia Pacific',
  'discovery.region.europe': 'Europe',
  'discovery.region.americas': 'Americas',
  'discovery.region.middleEast': 'Middle East',
  'discovery.category.all': 'All categories',
  'discovery.category.fragrance': 'Fragrance',
  'discovery.category.activeIngredient': 'Active Ingredient',
  'discovery.category.rawMaterial': 'Raw Material',
  'discovery.category.packaging': 'Packaging',
  'discovery.category.vitamin': 'Vitamin',
  'discovery.category.emollient': 'Emollient',
  'discovery.toggle.halal': 'Halal certified only',
  'discovery.toggle.major': 'Claims a major brand',
  'discovery.filter.clear': 'Clear filters',
  'discovery.sort.label': 'Sort by',
  'discovery.sort.relevance': 'Relevance',
  'discovery.sort.grade': 'Grade',
  'discovery.sort.otif': 'OTIF',
  'discovery.sort.compliance': 'Compliance',
  // — Shared actions —
  'discovery.action.startQualification': 'Start qualification',
  // — Results —
  'discovery.results.count.one': '{{count}} supplier found',
  'discovery.results.count.other': '{{count}} suppliers found',
  'discovery.results.empty.title': 'No suppliers found',
  'discovery.results.empty.body':
    'No suppliers match your current search. Try different keywords, remove filters, or browse all regions.',
  'discovery.results.empty.clear': 'Clear all filters',
  // — Search hero (initial, no filter) —
  'discovery.hero.title': 'Search the global supplier market',
  'discovery.hero.body':
    "Find suppliers already validated by L'Oréal, Unilever, P&G, Shiseido, and LVMH. Filter by halal certification, region, and category. Invite directly to Paragon Marketplace or contact via ARIA AI agent.",
  // — Global supplier card —
  'discovery.card.meta': '{{country}} · {{region}} · Est. {{founded}} · {{employees}} employees',
  'discovery.card.matchScore': 'AI Match Score',
  // D-CENSUS-8 · DISCOVERY-ENDORSEMENT-01. Was 'Market validated by' over a green
  // check per brand — asserting that real, named corporations had vetted a
  // FICTIONAL supplier. The portal verifies nothing here. Retracted to what the
  // field actually is: an unverified list a supplier claims about itself.
  'discovery.card.validatedBy': 'Reference brands claimed (unverified)',
  'discovery.card.categories': 'Categories',
  'discovery.card.certifications': 'Certifications',
  'discovery.card.halal': 'Halal',
  'discovery.card.invite': 'Invite to Marketplace',
  'discovery.card.inNetwork': 'Already in Network',
  'discovery.card.contactAria': 'Contact via ARIA',
  // — Qualification card —
  'discovery.qual.stage.contact': 'Initial Contact',
  'discovery.qual.stage.docReview': 'Document Review',
  'discovery.qual.stage.techEval': 'Technical Eval',
  'discovery.qual.stage.commercial': 'Commercial',
  'discovery.qual.stage.approved': 'Approved',
  'discovery.qual.next': 'Next:',
  'discovery.qual.due': 'Due: {{date}} · {{owner}}',
  'discovery.qual.updateStatus': 'Update status',
  // — Recommendation card —
  'discovery.rec.covers': 'Covers:',
  'discovery.rec.viewStorefront': 'View storefront',
  'discovery.rec.inviteRfq': 'Invite to RFQ',
  // — Recommendations tab —
  'discovery.rec.dualSourceBanner':
    '5 critical materials have only one qualified supplier — dual sourcing strongly recommended.',
  'discovery.rec.secondSourceTitle': 'Materials requiring a second source',
  'discovery.rec.col.material': 'Material',
  'discovery.rec.col.category': 'Category',
  'discovery.rec.col.currentSupplier': 'Current supplier',
  'discovery.rec.col.riskLevel': 'Risk level',
  'discovery.rec.col.alternatives': 'Suggested alternatives',
  'discovery.rec.col.action': 'Action',
  'discovery.rec.matchesTitle': 'AI supplier matches — recommended for Paragon',
  'discovery.rec.matchesSubtitle':
    'Based on your category requirements, compliance standards, and halal certification needs.',
  // — Qualification tab —
  'discovery.qualTab.title': 'Active qualification processes',
  // — Intelligence tab —
  'discovery.intel.title': 'Category market intelligence',
  'discovery.intel.subtitle': "Current market conditions for Paragon's key procurement categories.",
  'discovery.intel.global': 'Global',
  'discovery.intel.inNetwork': 'In network',
  // — Toasts —
  'discovery.toast.invited.title': 'Invitation sent to {{name}}',
  'discovery.toast.invited.desc': 'ARIA will follow up via WhatsApp within 24 hours.',
  'discovery.toast.inNetwork.title': '{{name}} is already in your supplier network',
  'discovery.toast.aria.title': 'ARIA outreach drafted',
  'discovery.toast.aria.desc': 'Personalized message to {{name}} ready for review.',
  'discovery.toast.qualStarted.title': 'Qualification started for {{name}}',
  'discovery.toast.rfqInvited.title': '{{name}} invited to RFQ',
  'discovery.toast.rfqInvited.desc': 'Invitation sent via email.',
  'discovery.toast.statusUpdated.title': 'Status updated for {{name}}',
  // — Empty state (all-empty early return) —
  'discovery.empty.title': 'No discovery data yet',
  'discovery.empty.subtitle': 'Supplier discovery is a buyer-side surface.',
  'discovery.empty.message':
    'Global candidates, recommendations, and market intelligence will appear here.',
};

export const discoveryId: Record<string, string> = {
  // — Breadcrumb —
  'discovery.crumb.acquire': 'PENGADAAN',
  'discovery.crumb.discovery': 'PENEMUAN',
  // — Page header —
  'discovery.header.title': 'Penemuan Pemasok',
  'discovery.header.subtitle':
    'Temukan dan kualifikasi pemasok baru secara global.',
  'discovery.action.openMarketplace': 'Buka Pasar',
  // — Meta line —
  'discovery.meta.summary': '{{count}} kandidat · terakhir diperbarui {{date}}',
  // — KPI cards —
  'discovery.kpi.candidates.eyebrow': 'Kandidat Teridentifikasi',
  'discovery.kpi.candidates.subtitle': 'Di seluruh pasar kecantikan global',
  'discovery.kpi.qualifying.eyebrow': 'Dalam Kualifikasi',
  'discovery.kpi.qualifying.subtitle': 'Alur onboarding aktif',
  'discovery.kpi.approved.eyebrow': 'Disetujui Bulan Ini',
  'discovery.kpi.approved.subtitle': 'Pemasok baru terkualifikasi',
  'discovery.kpi.gaps.eyebrow': 'Kesenjangan Sumber Ganda',
  'discovery.kpi.gaps.subtitle': 'Material dengan sumber tunggal',
  // — Sub-tabs —
  'discovery.tab.search': 'Pencarian Global',
  'discovery.tab.recommendations': 'Rekomendasi AI',
  'discovery.tab.qualification': 'Alur Kualifikasi',
  'discovery.tab.intelligence': 'Intelijen Pasar',
  // — Search / filters —
  'discovery.search.placeholder': 'Cari berdasarkan material, kategori, negara, atau kapabilitas…',
  'discovery.region.all': 'Semua wilayah',
  'discovery.region.apac': 'Asia Pasifik',
  'discovery.region.europe': 'Eropa',
  'discovery.region.americas': 'Amerika',
  'discovery.region.middleEast': 'Timur Tengah',
  'discovery.category.all': 'Semua kategori',
  'discovery.category.fragrance': 'Pewangi',
  'discovery.category.activeIngredient': 'Bahan Aktif',
  'discovery.category.rawMaterial': 'Bahan Baku',
  'discovery.category.packaging': 'Kemasan',
  'discovery.category.vitamin': 'Vitamin',
  'discovery.category.emollient': 'Emolien',
  'discovery.toggle.halal': 'Hanya bersertifikat halal',
  'discovery.toggle.major': 'Mengklaim merek besar',
  'discovery.filter.clear': 'Hapus filter',
  'discovery.sort.label': 'Urutkan menurut',
  'discovery.sort.relevance': 'Relevansi',
  'discovery.sort.grade': 'Grade',
  'discovery.sort.otif': 'OTIF',
  'discovery.sort.compliance': 'Kepatuhan',
  // — Shared actions —
  'discovery.action.startQualification': 'Mulai kualifikasi',
  // — Results —
  'discovery.results.count.one': '{{count}} pemasok ditemukan',
  'discovery.results.count.other': '{{count}} pemasok ditemukan',
  'discovery.results.empty.title': 'Tidak ada pemasok ditemukan',
  'discovery.results.empty.body':
    'Tidak ada pemasok yang cocok dengan pencarian Anda saat ini. Coba kata kunci lain, hapus filter, atau jelajahi semua wilayah.',
  'discovery.results.empty.clear': 'Hapus semua filter',
  // — Search hero (initial, no filter) —
  'discovery.hero.title': 'Cari pasar pemasok global',
  'discovery.hero.body':
    "Temukan pemasok yang telah divalidasi oleh L'Oréal, Unilever, P&G, Shiseido, dan LVMH. Saring berdasarkan sertifikasi halal, wilayah, dan kategori. Undang langsung ke Pasar Paragon atau hubungi via agen AI ARIA.",
  // — Global supplier card —
  'discovery.card.meta': '{{country}} · {{region}} · Berdiri {{founded}} · {{employees}} karyawan',
  'discovery.card.matchScore': 'Skor Kecocokan AI',
  'discovery.card.validatedBy': 'Merek referensi yang diklaim (belum diverifikasi)',
  'discovery.card.categories': 'Kategori',
  'discovery.card.certifications': 'Sertifikasi',
  'discovery.card.halal': 'Halal',
  'discovery.card.invite': 'Undang ke Pasar',
  'discovery.card.inNetwork': 'Sudah dalam Jaringan',
  'discovery.card.contactAria': 'Hubungi via ARIA',
  // — Qualification card —
  'discovery.qual.stage.contact': 'Kontak Awal',
  'discovery.qual.stage.docReview': 'Tinjauan Dokumen',
  'discovery.qual.stage.techEval': 'Evaluasi Teknis',
  'discovery.qual.stage.commercial': 'Komersial',
  'discovery.qual.stage.approved': 'Disetujui',
  'discovery.qual.next': 'Berikutnya:',
  'discovery.qual.due': 'Jatuh tempo: {{date}} · {{owner}}',
  'discovery.qual.updateStatus': 'Perbarui status',
  // — Recommendation card —
  'discovery.rec.covers': 'Mencakup:',
  'discovery.rec.viewStorefront': 'Lihat etalase',
  'discovery.rec.inviteRfq': 'Undang ke RFQ',
  // — Recommendations tab —
  'discovery.rec.dualSourceBanner':
    '5 material kritis hanya memiliki satu pemasok terkualifikasi — sumber ganda sangat disarankan.',
  'discovery.rec.secondSourceTitle': 'Material yang memerlukan sumber kedua',
  'discovery.rec.col.material': 'Material',
  'discovery.rec.col.category': 'Kategori',
  'discovery.rec.col.currentSupplier': 'Pemasok saat ini',
  'discovery.rec.col.riskLevel': 'Tingkat risiko',
  'discovery.rec.col.alternatives': 'Alternatif yang disarankan',
  'discovery.rec.col.action': 'Tindakan',
  'discovery.rec.matchesTitle': 'Kecocokan pemasok AI — direkomendasikan untuk Paragon',
  'discovery.rec.matchesSubtitle':
    'Berdasarkan persyaratan kategori, standar kepatuhan, dan kebutuhan sertifikasi halal Anda.',
  // — Qualification tab —
  'discovery.qualTab.title': 'Proses kualifikasi aktif',
  // — Intelligence tab —
  'discovery.intel.title': 'Intelijen pasar kategori',
  'discovery.intel.subtitle': 'Kondisi pasar saat ini untuk kategori pengadaan utama Paragon.',
  'discovery.intel.global': 'Global',
  'discovery.intel.inNetwork': 'Dalam jaringan',
  // — Toasts —
  'discovery.toast.invited.title': 'Undangan dikirim ke {{name}}',
  'discovery.toast.invited.desc': 'ARIA akan menindaklanjuti via WhatsApp dalam 24 jam.',
  'discovery.toast.inNetwork.title': '{{name}} sudah ada dalam jaringan pemasok Anda',
  'discovery.toast.aria.title': 'Penjangkauan ARIA disiapkan',
  'discovery.toast.aria.desc': 'Pesan personal untuk {{name}} siap ditinjau.',
  'discovery.toast.qualStarted.title': 'Kualifikasi dimulai untuk {{name}}',
  'discovery.toast.rfqInvited.title': '{{name}} diundang ke RFQ',
  'discovery.toast.rfqInvited.desc': 'Undangan dikirim via email.',
  'discovery.toast.statusUpdated.title': 'Status diperbarui untuk {{name}}',
  // — Empty state (all-empty early return) —
  'discovery.empty.title': 'Belum ada data penemuan',
  'discovery.empty.subtitle': 'Penemuan pemasok adalah permukaan sisi pembeli.',
  'discovery.empty.message':
    'Kandidat global, rekomendasi, dan intelijen pasar akan muncul di sini.',
};
