// SupplierWhatsApp i18n fragment. Namespace: supplierWhatsApp.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
//
// CHROME-vs-TEMPLATE (D-2 line): this fragment covers ONLY Paragon portal chrome
// that sits OUTSIDE the device/email frames — page header, tabs, panel titles +
// subtitles, scenario SELECTOR labels, FlowBox title/sub pairs, the capabilities
// list, language labels, the WeChat channel banner, reset buttons. The authentic
// channel content INSIDE the frames is left verbatim in the component: phone/
// WeChat chat bubbles + bot replies (SCENARIOS / BOT_REPLIES / FOLLOW_UP_REPLIES /
// WECHAT_SCENARIOS.bot|success|replies), pre-filled input drafts, quick-reply
// command tokens, email SUBJECT/PREHEADER (EMAIL_SCENARIOS) + the full rendered
// email body (prose, data card, action buttons, payment tracker, footer), and
// the simulated-app chrome (WhatsApp header/"Business Account"/"Type a message…",
// aria-labels, WeChat status bar / Official Account line). Command keywords
// (KONFIRMASI, ASN, STOK, DOKUMEN, BAYAR, DELAY, QUOTE, BANTUAN, IBP, RFQ, PO) and
// the demonstrative CN tags (自动执行 / 升级处理) are kept verbatim inside values.

export const supplierWhatsAppEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierWhatsApp.crumb.intelligence': 'INTELLIGENCE',
  'supplierWhatsApp.crumb.whatsappHub': 'CHANNEL DEMO',
  // — Page header (relabelled C5: unmistakably a demo, distinct from the real
  //   "Channel Inbox" where recording actually happens) —
  'supplierWhatsApp.header.title': 'Channel Demo — how Paragon reaches you',
  'supplierWhatsApp.header.subtitle':
    'Conversational commerce channels — WhatsApp, Email, and WeChat — {{supplier}}.',
  'supplierWhatsApp.fallback.supplier': 'Supplier',
  // — Demonstration honesty marker (C5) —
  'supplierWhatsApp.demo.banner':
    'Demonstration — these are scripted example conversations, not your real messages.',
  // — Meta line —
  'supplierWhatsApp.meta.sessionOpened': 'Interactive simulator · session opened',
  // — Channel tabs —
  'supplierWhatsApp.tab.whatsapp': 'WhatsApp',
  'supplierWhatsApp.tab.email': 'Email',
  'supplierWhatsApp.tab.wechat': 'WeChat',
  // — Shared chrome —
  'supplierWhatsApp.common.chooseScenario': 'Choose a scenario:',
  'supplierWhatsApp.action.resetConversation': 'Reset conversation',
  'supplierWhatsApp.aria.send': 'Send',
  // — Flow arrow labels (shared across all three channel flows) —
  'supplierWhatsApp.flow.arrow.triggers': 'Triggers',
  'supplierWhatsApp.flow.arrow.sendsVia': 'Sends via',
  'supplierWhatsApp.flow.arrow.supplierReplies': 'Supplier replies',
  // — WhatsApp panel —
  'supplierWhatsApp.wa.simulator.title': 'WhatsApp Procurement Simulator',
  'supplierWhatsApp.wa.simulator.subtitle':
    'Experience how suppliers interact with Paragon without logging into any portal.',
  'supplierWhatsApp.wa.scenario.po': 'Confirm a PO',
  'supplierWhatsApp.wa.scenario.asn': 'Submit ASN',
  'supplierWhatsApp.wa.scenario.inventory': 'Update Inventory',
  'supplierWhatsApp.wa.scenario.invoice': 'Invoice Query',
  'supplierWhatsApp.wa.flow.title': "How Paragon's WhatsApp Commerce Engine works",
  'supplierWhatsApp.wa.flow.sap.title': 'SAP S/4HANA Event',
  'supplierWhatsApp.wa.flow.sap.sub': 'PO created, delivery approaching, invoice overdue…',
  'supplierWhatsApp.wa.flow.engine.title': 'Paragon AI Engine',
  'supplierWhatsApp.wa.flow.engine.sub': 'Selects language, formats message, chooses template',
  'supplierWhatsApp.wa.flow.api.title': '360dialog WhatsApp API',
  'supplierWhatsApp.wa.flow.api.sub':
    "Delivers to supplier's WhatsApp. Interactive buttons. Read receipts.",
  'supplierWhatsApp.wa.flow.parser.title': 'AI Response Parser',
  'supplierWhatsApp.wa.flow.parser.sub': 'Understands: KONFIRMASI, ASN format, STOK update, free text',
  'supplierWhatsApp.wa.flow.autoExecute.title': 'Auto-Execute',
  'supplierWhatsApp.wa.flow.autoExecute.sub':
    'Updates SAP, creates ASN, logs in portal, sends confirmation',
  'supplierWhatsApp.wa.flow.escalate.title': 'Escalate to Buyer',
  'supplierWhatsApp.wa.flow.escalate.sub': 'Disputes, deviations >5%, halal issues, no response 24h',
  'supplierWhatsApp.wa.capabilities.title': 'What suppliers can do via WhatsApp',
  'supplierWhatsApp.wa.capabilities.subtitle': 'No app download, no portal login required:',
  'supplierWhatsApp.cap.confirmPo.title': 'Confirm Purchase Orders',
  'supplierWhatsApp.cap.confirmPo.desc': 'Reply KONFIRMASI to any PO notification',
  'supplierWhatsApp.cap.submitAsn.title': 'Submit ASN',
  'supplierWhatsApp.cap.submitAsn.desc': 'Send structured message: ASN PO-XXXXX date carrier tracking',
  'supplierWhatsApp.cap.updateInventory.title': 'Update Inventory',
  'supplierWhatsApp.cap.updateInventory.desc': 'STOK [code] [qty] [unit] — updates IBP automatically',
  'supplierWhatsApp.cap.requestDocs.title': 'Request Documents',
  // D-CENSUS-8 — no WhatsApp Business API is connected; the simulator scripts both
  // sides in the browser. 'instantly' and 'real-time' describe a bot that does not exist.
  'supplierWhatsApp.cap.requestDocs.desc': 'DOKUMEN [PO number] — designed to return the PDF (not connected)',
  'supplierWhatsApp.cap.checkPayment.title': 'Check Payment Status',
  'supplierWhatsApp.cap.checkPayment.desc': 'BAYAR [invoice number] — designed to return payment status (not connected)',
  'supplierWhatsApp.cap.reportDelays.title': 'Report Delays',
  'supplierWhatsApp.cap.reportDelays.desc': 'DELAY [PO] [new date] [reason] — auto-notifies buyer',
  'supplierWhatsApp.cap.submitRfq.title': 'Submit RFQ Response',
  'supplierWhatsApp.cap.submitRfq.desc': 'QUOTE [RFQ] [price] [leadtime] — logs in portal',
  'supplierWhatsApp.cap.getHelp.title': 'Get Help',
  'supplierWhatsApp.cap.getHelp.desc': 'BANTUAN — bot sends command list in Bahasa Indonesia',
  'supplierWhatsApp.wa.languages.title': 'Languages supported',
  'supplierWhatsApp.wa.languages.subtitle': "Language auto-detected from supplier's country profile.",
  'supplierWhatsApp.lang.id': 'Bahasa Indonesia',
  'supplierWhatsApp.lang.en': 'English',
  'supplierWhatsApp.lang.zh': 'Mandarin',
  'supplierWhatsApp.lang.de': 'German',
  'supplierWhatsApp.lang.ar': 'Arabic',
  'supplierWhatsApp.lang.pt': 'Portuguese',
  // — Email panel —
  'supplierWhatsApp.email.simulator.title': 'Email Procurement Simulator',
  'supplierWhatsApp.email.simulator.subtitle':
    'Experience how suppliers respond to procurement notifications via email.',
  'supplierWhatsApp.email.scenario.po': 'PO Notification',
  'supplierWhatsApp.email.scenario.asn': 'ASN Reminder',
  'supplierWhatsApp.email.scenario.inventory': 'Inventory Alert',
  'supplierWhatsApp.email.scenario.invoice': 'Invoice Status',
  'supplierWhatsApp.email.reset': 'Reset email',
  'supplierWhatsApp.email.flow.title': "How Paragon's Email Commerce Engine works",
  'supplierWhatsApp.email.flow.sap.title': 'SAP S/4HANA Event',
  'supplierWhatsApp.email.flow.sap.sub': 'PO created, delivery alert, invoice scheduled…',
  'supplierWhatsApp.email.flow.engine.title': 'Email Template Engine',
  'supplierWhatsApp.email.flow.engine.sub': 'Selects template, formats HTML, attaches PDF',
  'supplierWhatsApp.email.flow.gateway.title': 'SendGrid / SMTP Gateway',
  'supplierWhatsApp.email.flow.gateway.sub': 'Delivers to supplier inbox. HTML + plain text fallback.',
  'supplierWhatsApp.email.flow.parser.title': 'Email Reply Parser',
  'supplierWhatsApp.email.flow.parser.sub': 'Supplier replies via email — or clicks action button',
  'supplierWhatsApp.email.flow.autoExecute.title': 'Auto-Execute',
  'supplierWhatsApp.email.flow.autoExecute.sub': 'Parses structured reply, updates SAP, logs action',
  'supplierWhatsApp.email.flow.escalate.title': 'Escalate to Buyer',
  'supplierWhatsApp.email.flow.escalate.sub': 'Unstructured reply, dispute, no response 48h',
  // — WeChat panel —
  'supplierWhatsApp.wc.banner.label': 'WeChat channel',
  'supplierWhatsApp.wc.banner.text':
    ' targets Chinese suppliers — packaging components, active ingredients, fragrance compounds. Supports CN / EN / ID.',
  'supplierWhatsApp.wc.scenario.po': 'Confirm PO',
  'supplierWhatsApp.wc.scenario.asn': 'Submit ASN',
  'supplierWhatsApp.wc.scenario.inventory': 'Inventory Alert',
  'supplierWhatsApp.wc.scenario.invoice': 'Invoice Status',
  'supplierWhatsApp.wc.flow.title': "How Paragon's WeChat Engine works",
  'supplierWhatsApp.wc.flow.sap.title': 'SAP S/4HANA Event',
  'supplierWhatsApp.wc.flow.sap.sub': 'PO created, delivery approaching, invoice overdue…',
  'supplierWhatsApp.wc.flow.engine.title': 'WeChat Template Engine',
  'supplierWhatsApp.wc.flow.engine.sub': 'Formats message, selects language (CN/EN/ID)',
  'supplierWhatsApp.wc.flow.api.title': 'WeChat Official Account API',
  'supplierWhatsApp.wc.flow.api.sub':
    'Delivers via Official Account. Mini Program cards. Read receipts.',
  'supplierWhatsApp.wc.flow.parser.title': 'Reply Parser',
  'supplierWhatsApp.wc.flow.parser.sub': 'Text reply or Mini Program button tap',
  'supplierWhatsApp.wc.flow.autoExecute.title': 'Auto-Execute',
  'supplierWhatsApp.wc.flow.autoExecute.sub':
    'Parses reply, updates SAP, sends confirmation · 自动执行',
  'supplierWhatsApp.wc.flow.escalate.title': 'Escalate to Buyer',
  'supplierWhatsApp.wc.flow.escalate.sub': 'Dispute, no response 24h, complex query · 升级处理',
};

export const supplierWhatsAppId: Record<string, string> = {
  // — Breadcrumb —
  'supplierWhatsApp.crumb.intelligence': 'INTELIJEN',
  'supplierWhatsApp.crumb.whatsappHub': 'DEMO KANAL',
  // — Page header (dilabeli ulang C5: jelas sebuah demo, berbeda dari "Kotak Masuk
  //   Kanal" nyata tempat pencatatan sebenarnya terjadi) —
  'supplierWhatsApp.header.title': 'Demo Kanal — cara Paragon menjangkau Anda',
  'supplierWhatsApp.header.subtitle':
    'Kanal perdagangan percakapan — WhatsApp, Email, dan WeChat — {{supplier}}.',
  'supplierWhatsApp.fallback.supplier': 'Pemasok',
  // — Penanda kejujuran demonstrasi (C5) —
  'supplierWhatsApp.demo.banner':
    'Demonstrasi — ini adalah contoh percakapan tertulis, bukan pesan asli Anda.',
  // — Meta line —
  'supplierWhatsApp.meta.sessionOpened': 'Simulator interaktif · sesi dibuka',
  // — Channel tabs —
  'supplierWhatsApp.tab.whatsapp': 'WhatsApp',
  'supplierWhatsApp.tab.email': 'Email',
  'supplierWhatsApp.tab.wechat': 'WeChat',
  // — Shared chrome —
  'supplierWhatsApp.common.chooseScenario': 'Pilih skenario:',
  'supplierWhatsApp.action.resetConversation': 'Atur ulang percakapan',
  'supplierWhatsApp.aria.send': 'Kirim',
  // — Flow arrow labels (shared across all three channel flows) —
  'supplierWhatsApp.flow.arrow.triggers': 'Memicu',
  'supplierWhatsApp.flow.arrow.sendsVia': 'Mengirim via',
  'supplierWhatsApp.flow.arrow.supplierReplies': 'Pemasok membalas',
  // — WhatsApp panel —
  'supplierWhatsApp.wa.simulator.title': 'Simulator Pengadaan WhatsApp',
  'supplierWhatsApp.wa.simulator.subtitle':
    'Rasakan bagaimana pemasok berinteraksi dengan Paragon tanpa masuk ke portal mana pun.',
  'supplierWhatsApp.wa.scenario.po': 'Konfirmasi PO',
  'supplierWhatsApp.wa.scenario.asn': 'Kirim ASN',
  'supplierWhatsApp.wa.scenario.inventory': 'Perbarui Inventaris',
  'supplierWhatsApp.wa.scenario.invoice': 'Pertanyaan Faktur',
  'supplierWhatsApp.wa.flow.title': 'Cara kerja Mesin Perdagangan WhatsApp Paragon',
  'supplierWhatsApp.wa.flow.sap.title': 'Peristiwa SAP S/4HANA',
  'supplierWhatsApp.wa.flow.sap.sub': 'PO dibuat, pengiriman mendekat, faktur jatuh tempo…',
  'supplierWhatsApp.wa.flow.engine.title': 'Mesin AI Paragon',
  'supplierWhatsApp.wa.flow.engine.sub': 'Memilih bahasa, memformat pesan, memilih templat',
  'supplierWhatsApp.wa.flow.api.title': '360dialog WhatsApp API',
  'supplierWhatsApp.wa.flow.api.sub':
    'Mengirim ke WhatsApp pemasok. Tombol interaktif. Tanda terima baca.',
  'supplierWhatsApp.wa.flow.parser.title': 'Pengurai Respons AI',
  'supplierWhatsApp.wa.flow.parser.sub': 'Memahami: KONFIRMASI, format ASN, pembaruan STOK, teks bebas',
  'supplierWhatsApp.wa.flow.autoExecute.title': 'Eksekusi Otomatis',
  'supplierWhatsApp.wa.flow.autoExecute.sub':
    'Memperbarui SAP, membuat ASN, mencatat di portal, mengirim konfirmasi',
  'supplierWhatsApp.wa.flow.escalate.title': 'Eskalasi ke Pembeli',
  'supplierWhatsApp.wa.flow.escalate.sub': 'Sengketa, deviasi >5%, masalah halal, tanpa respons 24 jam',
  'supplierWhatsApp.wa.capabilities.title': 'Yang dapat dilakukan pemasok via WhatsApp',
  'supplierWhatsApp.wa.capabilities.subtitle': 'Tanpa unduh aplikasi, tanpa perlu masuk portal:',
  'supplierWhatsApp.cap.confirmPo.title': 'Konfirmasi Pesanan Pembelian',
  'supplierWhatsApp.cap.confirmPo.desc': 'Balas KONFIRMASI untuk setiap notifikasi PO',
  'supplierWhatsApp.cap.submitAsn.title': 'Kirim ASN',
  'supplierWhatsApp.cap.submitAsn.desc': 'Kirim pesan terstruktur: ASN PO-XXXXX tanggal kurir pelacakan',
  'supplierWhatsApp.cap.updateInventory.title': 'Perbarui Inventaris',
  'supplierWhatsApp.cap.updateInventory.desc': 'STOK [kode] [qty] [unit] — memperbarui IBP otomatis',
  'supplierWhatsApp.cap.requestDocs.title': 'Minta Dokumen',
  'supplierWhatsApp.cap.requestDocs.desc': 'DOKUMEN [nomor PO] — dirancang untuk mengirim PDF (belum tersambung)',
  'supplierWhatsApp.cap.checkPayment.title': 'Cek Status Pembayaran',
  'supplierWhatsApp.cap.checkPayment.desc': 'BAYAR [nomor faktur] — dirancang untuk mengirim status pembayaran (belum tersambung)',
  'supplierWhatsApp.cap.reportDelays.title': 'Laporkan Keterlambatan',
  'supplierWhatsApp.cap.reportDelays.desc': 'DELAY [PO] [tanggal baru] [alasan] — otomatis memberi tahu pembeli',
  'supplierWhatsApp.cap.submitRfq.title': 'Kirim Respons RFQ',
  'supplierWhatsApp.cap.submitRfq.desc': 'QUOTE [RFQ] [harga] [waktu tunggu] — dicatat di portal',
  'supplierWhatsApp.cap.getHelp.title': 'Dapatkan Bantuan',
  'supplierWhatsApp.cap.getHelp.desc': 'BANTUAN — bot mengirim daftar perintah dalam Bahasa Indonesia',
  'supplierWhatsApp.wa.languages.title': 'Bahasa yang didukung',
  'supplierWhatsApp.wa.languages.subtitle': 'Bahasa terdeteksi otomatis dari profil negara pemasok.',
  'supplierWhatsApp.lang.id': 'Bahasa Indonesia',
  'supplierWhatsApp.lang.en': 'Inggris',
  'supplierWhatsApp.lang.zh': 'Mandarin',
  'supplierWhatsApp.lang.de': 'Jerman',
  'supplierWhatsApp.lang.ar': 'Arab',
  'supplierWhatsApp.lang.pt': 'Portugis',
  // — Email panel —
  'supplierWhatsApp.email.simulator.title': 'Simulator Pengadaan Email',
  'supplierWhatsApp.email.simulator.subtitle':
    'Rasakan bagaimana pemasok merespons notifikasi pengadaan via email.',
  'supplierWhatsApp.email.scenario.po': 'Notifikasi PO',
  'supplierWhatsApp.email.scenario.asn': 'Pengingat ASN',
  'supplierWhatsApp.email.scenario.inventory': 'Peringatan Inventaris',
  'supplierWhatsApp.email.scenario.invoice': 'Status Faktur',
  'supplierWhatsApp.email.reset': 'Atur ulang email',
  'supplierWhatsApp.email.flow.title': 'Cara kerja Mesin Perdagangan Email Paragon',
  'supplierWhatsApp.email.flow.sap.title': 'Peristiwa SAP S/4HANA',
  'supplierWhatsApp.email.flow.sap.sub': 'PO dibuat, peringatan pengiriman, faktur dijadwalkan…',
  'supplierWhatsApp.email.flow.engine.title': 'Mesin Templat Email',
  'supplierWhatsApp.email.flow.engine.sub': 'Memilih templat, memformat HTML, melampirkan PDF',
  'supplierWhatsApp.email.flow.gateway.title': 'SendGrid / SMTP Gateway',
  'supplierWhatsApp.email.flow.gateway.sub': 'Mengirim ke kotak masuk pemasok. HTML + cadangan teks biasa.',
  'supplierWhatsApp.email.flow.parser.title': 'Pengurai Balasan Email',
  'supplierWhatsApp.email.flow.parser.sub': 'Pemasok membalas via email — atau mengklik tombol tindakan',
  'supplierWhatsApp.email.flow.autoExecute.title': 'Eksekusi Otomatis',
  'supplierWhatsApp.email.flow.autoExecute.sub': 'Mengurai balasan terstruktur, memperbarui SAP, mencatat tindakan',
  'supplierWhatsApp.email.flow.escalate.title': 'Eskalasi ke Pembeli',
  'supplierWhatsApp.email.flow.escalate.sub': 'Balasan tidak terstruktur, sengketa, tanpa respons 48 jam',
  // — WeChat panel —
  'supplierWhatsApp.wc.banner.label': 'Kanal WeChat',
  'supplierWhatsApp.wc.banner.text':
    ' menyasar pemasok Tiongkok — komponen kemasan, bahan aktif, senyawa pewangi. Mendukung CN / EN / ID.',
  'supplierWhatsApp.wc.scenario.po': 'Konfirmasi PO',
  'supplierWhatsApp.wc.scenario.asn': 'Kirim ASN',
  'supplierWhatsApp.wc.scenario.inventory': 'Peringatan Inventaris',
  'supplierWhatsApp.wc.scenario.invoice': 'Status Faktur',
  'supplierWhatsApp.wc.flow.title': 'Cara kerja Mesin WeChat Paragon',
  'supplierWhatsApp.wc.flow.sap.title': 'Peristiwa SAP S/4HANA',
  'supplierWhatsApp.wc.flow.sap.sub': 'PO dibuat, pengiriman mendekat, faktur jatuh tempo…',
  'supplierWhatsApp.wc.flow.engine.title': 'Mesin Templat WeChat',
  'supplierWhatsApp.wc.flow.engine.sub': 'Memformat pesan, memilih bahasa (CN/EN/ID)',
  'supplierWhatsApp.wc.flow.api.title': 'WeChat Official Account API',
  'supplierWhatsApp.wc.flow.api.sub':
    'Mengirim via Official Account. Kartu Mini Program. Tanda terima baca.',
  'supplierWhatsApp.wc.flow.parser.title': 'Pengurai Balasan',
  'supplierWhatsApp.wc.flow.parser.sub': 'Balasan teks atau ketuk tombol Mini Program',
  'supplierWhatsApp.wc.flow.autoExecute.title': 'Eksekusi Otomatis',
  'supplierWhatsApp.wc.flow.autoExecute.sub':
    'Mengurai balasan, memperbarui SAP, mengirim konfirmasi · 自动执行',
  'supplierWhatsApp.wc.flow.escalate.title': 'Eskalasi ke Pembeli',
  'supplierWhatsApp.wc.flow.escalate.sub': 'Sengketa, tanpa respons 24 jam, kueri kompleks · 升级处理',
};
