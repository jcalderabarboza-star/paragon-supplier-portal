// SupplierStorefront i18n fragment (Batch 6). Namespace: supplierStorefront.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// The BUYER-FACING read-only view of a supplier's storefront
// (/marketplace/supplier/:id). Shares "Etalase" storefront vocabulary with
// supplierMyStorefront.*.
//
// HONEST DISPLAY-vs-DATA boundary:
//  • Category (supp.category) renders through useCategoryLabel(); channel
//    (supp.preferredChannel — the PreferredChannel enum WhatsApp/Email/Web/API)
//    through useChannelLabel(). Stored values stay canonical EN.
//  • Cert status pills (Valid/Expiring/Expired) + the "Sample data" chip
//    auto-localize via StatusPill → statusLabel; NOT re-keyed here.
//  • The channelHint.* keys are keyed by the exact PreferredChannel enum value
//    (WhatsApp/Email/Web/API) so the page selects them by `preferredChannel`.
//  • Mono DATA (doc numbers, MOQ/lead time, dates, OTIF %, years, email/phone/
//    website via <Data>/props), supplier & product & cert NAMES, cert issuer org
//    names, and the entire TRACK_RECORD sample-data timeline stay EN as data /
//    i18n-defer.
export const supplierStorefrontEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierStorefront.crumb.acquire': 'ACQUIRE',
  'supplierStorefront.crumb.marketplace': 'MARKETPLACE',
  // — Back-nav link —
  'supplierStorefront.nav.marketplace': 'Marketplace',
  // — Not-found state —
  'supplierStorefront.notFound.title': 'Supplier storefront not found',
  'supplierStorefront.notFound.back': 'Back to Marketplace',
  // — Header actions —
  'supplierStorefront.header.connect': 'Connect',
  'supplierStorefront.header.requestRfq': 'Request RFQ',
  // — Hero —
  'supplierStorefront.hero.est': 'Est. {{year}}',
  'supplierStorefront.hero.fallbackNote':
    '{{category}} specialist serving {{country}} and regional markets. Preferred channel: {{channel}}.',
  // — KPI strip —
  'supplierStorefront.kpi.years.eyebrow': 'Years in Business',
  'supplierStorefront.kpi.years.since': 'Since {{year}}',
  'supplierStorefront.kpi.years.na': 'Founding date n/a',
  'supplierStorefront.kpi.otif.eyebrow': 'OTIF',
  'supplierStorefront.kpi.otif.subtitle': 'On-time, in-full',
  'supplierStorefront.kpi.categories.eyebrow': 'Categories Served',
  'supplierStorefront.kpi.certs.eyebrow': 'Certifications',
  'supplierStorefront.kpi.certs.subtitle': '{{count}} currently valid',
  // — Tabs —
  'supplierStorefront.tab.catalog': 'Catalog',
  'supplierStorefront.tab.certifications': 'Certifications',
  'supplierStorefront.tab.trackRecord': 'Track Record',
  'supplierStorefront.tab.contact': 'Contact',
  // — Catalog tab —
  'supplierStorefront.catalog.empty':
    'This supplier has not published a public catalog yet.',
  'supplierStorefront.catalog.moq': 'MOQ',
  'supplierStorefront.catalog.leadTime': 'Lead time',
  'supplierStorefront.catalog.requestQuote': 'Request quote',
  // — Certifications tab —
  'supplierStorefront.certs.expires': 'Expires',
  // — Track-record tab —
  'supplierStorefront.track.title': 'Delivery track record',
  // — Contact tab —
  'supplierStorefront.contact.sendVia': 'Send via {{channel}}',
  'supplierStorefront.contact.message': 'Message',
  'supplierStorefront.contact.messagePlaceholder':
    "Hi {{name}}, we'd like to discuss…",
  'supplierStorefront.contact.saveDraft': 'Save draft',
  'supplierStorefront.contact.send': 'Send message',
  'supplierStorefront.contact.primaryContact': 'Primary contact',
  'supplierStorefront.contact.preferred': '{{channel}} preferred',
  // — Channel hints (keyed by PreferredChannel enum value) —
  'supplierStorefront.channelHint.WhatsApp':
    'This supplier prefers WhatsApp. Replies typically within a few hours during business hours.',
  'supplierStorefront.channelHint.Email':
    'This supplier prefers email. Expect a response within one business day.',
  'supplierStorefront.channelHint.Web':
    'This supplier prefers portal messaging. Replies routed through the SAP Ariba inbox.',
  'supplierStorefront.channelHint.API':
    'This supplier is API-integrated. Requests are auto-submitted to their ERP.',
};

export const supplierStorefrontId: Record<string, string> = {
  // — Breadcrumb —
  'supplierStorefront.crumb.acquire': 'PENGADAAN',
  'supplierStorefront.crumb.marketplace': 'PASAR',
  // — Back-nav link —
  'supplierStorefront.nav.marketplace': 'Pasar',
  // — Not-found state —
  'supplierStorefront.notFound.title': 'Etalase pemasok tidak ditemukan',
  'supplierStorefront.notFound.back': 'Kembali ke Pasar',
  // — Header actions —
  'supplierStorefront.header.connect': 'Hubungkan',
  'supplierStorefront.header.requestRfq': 'Ajukan RFQ',
  // — Hero —
  'supplierStorefront.hero.est': 'Berdiri {{year}}',
  'supplierStorefront.hero.fallbackNote':
    'Spesialis {{category}} yang melayani {{country}} dan pasar regional. Kanal pilihan: {{channel}}.',
  // — KPI strip —
  'supplierStorefront.kpi.years.eyebrow': 'Tahun Beroperasi',
  'supplierStorefront.kpi.years.since': 'Sejak {{year}}',
  'supplierStorefront.kpi.years.na': 'Tanggal berdiri t/a',
  'supplierStorefront.kpi.otif.eyebrow': 'OTIF',
  'supplierStorefront.kpi.otif.subtitle': 'Tepat waktu, lengkap',
  'supplierStorefront.kpi.categories.eyebrow': 'Kategori Dilayani',
  'supplierStorefront.kpi.certs.eyebrow': 'Sertifikasi',
  'supplierStorefront.kpi.certs.subtitle': '{{count}} berlaku saat ini',
  // — Tabs —
  'supplierStorefront.tab.catalog': 'Katalog',
  'supplierStorefront.tab.certifications': 'Sertifikasi',
  'supplierStorefront.tab.trackRecord': 'Rekam Jejak',
  'supplierStorefront.tab.contact': 'Kontak',
  // — Catalog tab —
  'supplierStorefront.catalog.empty':
    'Pemasok ini belum menerbitkan katalog publik.',
  'supplierStorefront.catalog.moq': 'MOQ',
  'supplierStorefront.catalog.leadTime': 'Waktu tunggu',
  'supplierStorefront.catalog.requestQuote': 'Minta penawaran',
  // — Certifications tab —
  'supplierStorefront.certs.expires': 'Kedaluwarsa',
  // — Track-record tab —
  'supplierStorefront.track.title': 'Rekam jejak pengiriman',
  // — Contact tab —
  'supplierStorefront.contact.sendVia': 'Kirim via {{channel}}',
  'supplierStorefront.contact.message': 'Pesan',
  'supplierStorefront.contact.messagePlaceholder':
    'Halo {{name}}, kami ingin membahas…',
  'supplierStorefront.contact.saveDraft': 'Simpan draf',
  'supplierStorefront.contact.send': 'Kirim pesan',
  'supplierStorefront.contact.primaryContact': 'Kontak utama',
  'supplierStorefront.contact.preferred': '{{channel}} lebih disukai',
  // — Channel hints (keyed by PreferredChannel enum value) —
  'supplierStorefront.channelHint.WhatsApp':
    'Pemasok ini lebih menyukai WhatsApp. Balasan biasanya dalam beberapa jam selama jam kerja.',
  'supplierStorefront.channelHint.Email':
    'Pemasok ini lebih menyukai email. Harapkan respons dalam satu hari kerja.',
  'supplierStorefront.channelHint.Web':
    'Pemasok ini lebih menyukai perpesanan portal. Balasan dirutekan melalui kotak masuk SAP Ariba.',
  'supplierStorefront.channelHint.API':
    'Pemasok ini terintegrasi API. Permintaan dikirim otomatis ke ERP mereka.',
};
