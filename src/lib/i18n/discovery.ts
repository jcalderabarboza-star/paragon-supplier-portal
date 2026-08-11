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
    // Batch C — was 'Find and qualify new suppliers globally.' The GLOBAL half is
    // now gated on a discovery feed, so the subtitle led with the one capability
    // the page cannot currently deliver. It now describes what the page DOES.
    'Close sourcing gaps and qualify new suppliers.',
  'discovery.action.openMarketplace': 'Open Marketplace',
  // — Meta line —
  // Batch C — was '{{count}} candidates'. The candidate pool is deleted; the
  // number beside this label is now the dual-source gap count, so the label says so.
  'discovery.meta.summary': '{{count}} dual-source gaps · last updated {{date}}',
  // — KPI cards —
  // DISCOVERY-REAL-SUBJECTS-01 (C) — `candidates` and `approved` are GONE. The
  // candidates tile read 18 over a fixture of 8 (a `+ 10` literal with no
  // referent) and `approved` was a hard-coded 2. Neither counted anything.
  'discovery.kpi.atRisk.eyebrow': 'Qualifications At Risk',
  'discovery.kpi.atRisk.subtitle': 'Past due or blocked',
  'discovery.kpi.qualifying.eyebrow': 'In Qualification',
  'discovery.kpi.qualifying.subtitle': 'Active onboarding pipeline',
  'discovery.kpi.gaps.eyebrow': 'Dual-Source Gaps',
  'discovery.kpi.gaps.subtitle': 'Materials with single source',
  // — Sub-tabs —
  'discovery.tab.search': 'Global Search',
  'discovery.tab.gaps': 'Sourcing Gaps',
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
  // 'discovery.toggle.major' deleted with the endorsement field it filtered
  // (DISCOVERY-ENDORSEMENT-01). Both locales, together — a retraction that lands
  // in one language is MARKER-I18N-HOLE-01 wearing a different hat.
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
  // ── The gated global-search tab (batch C) ─────────────────────────────────
  //   The empty state says WHY it is empty and what would fill it. The
  //   "awaiting <source>" line is NOT here — it comes from the liveness
  //   registry's readiness note, so it has one home.
  'discovery.search.noFeed.title': 'No supplier-discovery feed is connected',
  'discovery.search.noFeed.body':
    'Global candidate search needs a real supplier-discovery source. Rather than '
    + 'show sample companies with scores nothing computed, this tab stays empty '
    + 'until a feed is connected — then candidates appear here with their source '
    + 'named. Your own sourcing gaps and qualification pipeline are available now.',
  'discovery.search.noFeed.toGaps': 'View sourcing gaps',
  'discovery.hero.title': 'Search the global supplier market',
  // DISCOVERY-ENDORSEMENT-01 · the hero. This string asserted that five named
  // real corporations had validated the suppliers below — the SAME claim as the
  // card label, one field above it, and it survived the D-CENSUS-8 retraction
  // because that pass fixed the field it was looking at and not the sentence
  // introducing it. Rewritten to describe what the search DOES.
  'discovery.hero.body':
    'Search global suppliers by halal certification, region, and category. Invite directly to Paragon Marketplace or contact via ARIA AI agent.',
  // — Global supplier card —
  'discovery.card.meta': '{{country}} · {{region}} · Est. {{founded}} · {{employees}} employees',
  'discovery.card.matchScore': 'AI Match Score',
  // D-CENSUS-8 · DISCOVERY-ENDORSEMENT-01. Was 'Market validated by' over a green
  // check per brand — asserting that real, named corporations had vetted a
  // FICTIONAL supplier. The portal verifies nothing here. Retracted to what the
  // field actually is: an unverified list a supplier claims about itself.
  // 'discovery.card.validatedBy' deleted — the label had already been retracted
  // from 'Market validated by' to 'Reference brands claimed (unverified)'. The
  // honest label was still a heading over named third parties, which is the
  // thing no wording fixes.
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
    'Tutup kesenjangan sumber dan kualifikasi pemasok baru.',
  'discovery.action.openMarketplace': 'Buka Pasar',
  // — Meta line —
  'discovery.meta.summary': '{{count}} kesenjangan sumber ganda · terakhir diperbarui {{date}}',
  // — KPI cards —
  'discovery.kpi.atRisk.eyebrow': 'Kualifikasi Berisiko',
  'discovery.kpi.atRisk.subtitle': 'Melewati tenggat atau terhambat',
  'discovery.kpi.qualifying.eyebrow': 'Dalam Kualifikasi',
  'discovery.kpi.qualifying.subtitle': 'Alur onboarding aktif',
  'discovery.kpi.gaps.eyebrow': 'Kesenjangan Sumber Ganda',
  'discovery.kpi.gaps.subtitle': 'Material dengan sumber tunggal',
  // — Sub-tabs —
  'discovery.tab.search': 'Pencarian Global',
  'discovery.tab.gaps': 'Kesenjangan Sumber',
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
  // 'discovery.toggle.major' deleted — see the EN block.
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
  // Batch C — the fabrication shipped in BOTH languages, so the honest empty
  // state does too. PF-2a's rule: the retraction is bilingual or it is partial.
  'discovery.search.noFeed.title': 'Tidak ada feed penemuan pemasok yang terhubung',
  'discovery.search.noFeed.body':
    'Pencarian kandidat global memerlukan sumber penemuan pemasok yang nyata. '
    + 'Daripada menampilkan perusahaan contoh dengan skor yang tidak dihitung oleh '
    + 'apa pun, tab ini tetap kosong sampai sebuah feed terhubung — kandidat lalu '
    + 'muncul di sini dengan sumbernya disebutkan. Kesenjangan sumber dan alur '
    + 'kualifikasi Anda sendiri sudah tersedia sekarang.',
  'discovery.search.noFeed.toGaps': 'Lihat kesenjangan sumber',
  'discovery.hero.title': 'Cari pasar pemasok global',
  // DISCOVERY-ENDORSEMENT-01 · the hero, ID. The fabrication shipped in BOTH
  // languages — a translated assertion is a second assertion, not a copy of one.
  'discovery.hero.body':
    'Cari pemasok global berdasarkan sertifikasi halal, wilayah, dan kategori. Undang langsung ke Pasar Paragon atau hubungi via agen AI ARIA.',
  // — Global supplier card —
  'discovery.card.meta': '{{country}} · {{region}} · Berdiri {{founded}} · {{employees}} karyawan',
  'discovery.card.matchScore': 'Skor Kecocokan AI',
  // 'discovery.card.validatedBy' deleted — see the EN block.
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
