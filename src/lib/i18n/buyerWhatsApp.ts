// BuyerWhatsAppHub i18n fragment. Namespace: buyerWhatsApp.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
//
// CHROME-vs-TEMPLATE (D-2 line): this fragment covers ONLY the buyer-portal UI
// chrome — page header, tabs, KPI eyebrows, flow-band explainers, capability
// banners, section headers, buttons, placeholders, empty states, and toasts.
// Authentic channel message CONTENT (chat bubbles, bot reply bodies, email
// subject/body, WeChat card content) stays verbatim in the page's SCENARIOS /
// thread / emails / email data structures and is NOT keyed here. Brand /
// provider names (Paragon AI, 360dialog, WeChat Official Account name),
// phone-number placeholders, and canonical StatusPill labels also stay verbatim.
// Embedded-bold phrases are split into `.bold` + `.rest` sibling keys (no
// <Trans>, matching the flat-key convention already shipped in i18n.ts).
export const buyerWhatsAppEn: Record<string, string> = {
  // — Breadcrumb —
  'buyerWhatsApp.crumb.intelligence': 'INTELLIGENCE',
  'buyerWhatsApp.crumb.hub': 'COMMUNICATIONS HUB',
  // — Page header —
  'buyerWhatsApp.header.title': 'Communications Hub',
  'buyerWhatsApp.header.subtitle':
    'WhatsApp · Email · WeChat — all supplier conversations in one place.',
  'buyerWhatsApp.meta.line': 'Multi-channel supplier comms · last refreshed {{date}}',
  // — Channel tabs —
  'buyerWhatsApp.tab.whatsapp': 'WhatsApp',
  'buyerWhatsApp.tab.email': 'Email',
  'buyerWhatsApp.tab.wechat': 'WeChat',
  // — WhatsApp channel intro + connection badge —
  'buyerWhatsApp.wa.intro':
    'All supplier WhatsApp conversations — powered by 360dialog + Paragon AI.',
  'buyerWhatsApp.wa.simulated': 'Simulated — 360dialog (Phase 4′)',
  // — WhatsApp KPI cards —
  'buyerWhatsApp.kpi.active.eyebrow': 'Active Conversations',
  'buyerWhatsApp.kpi.pending.eyebrow': 'Pending Responses',
  'buyerWhatsApp.kpi.automatedToday.eyebrow': 'Automated Today',
  'buyerWhatsApp.kpi.avgResponse.eyebrow': 'Avg Response Time',
  // — WhatsApp info banner (bold split) —
  'buyerWhatsApp.wa.banner.bold': "Paragon's WhatsApp procurement bot",
  'buyerWhatsApp.wa.banner.rest':
    ' handles PO confirmations, ASN submissions, inventory updates, and delivery notifications automatically. Human intervention only required for disputes, deviations >5%, or halal compliance issues.',
  // — WhatsApp sub-tabs —
  'buyerWhatsApp.watab.conversations': 'Active Conversations',
  'buyerWhatsApp.watab.automation': 'Automation Rules',
  'buyerWhatsApp.watab.analytics': 'Channel Analytics',
  'buyerWhatsApp.conv.none': 'No active conversations.',
  // — Conversations list —
  'buyerWhatsApp.search.placeholder': 'Search suppliers…',
  // — Chat thread (messenger chrome; message bodies stay verbatim) —
  'buyerWhatsApp.chat.online': 'Online',
  'buyerWhatsApp.chat.error': "Couldn't load this conversation.",
  'buyerWhatsApp.chat.retry': 'Try again',
  'buyerWhatsApp.chat.loading': 'Loading conversation…',
  'buyerWhatsApp.chat.autoNote.pre': 'This conversation was handled ',
  'buyerWhatsApp.chat.autoNote.bold': '100% automatically',
  'buyerWhatsApp.chat.autoNote.post':
    " by Paragon's WhatsApp AI. No human intervention required. All SAP updates completed in real-time.",
  'buyerWhatsApp.chat.inputPlaceholder': 'Type a message...',
  'buyerWhatsApp.chat.botMessage': 'Bot message',
  // — Bot action menu (UI descriptors) —
  'buyerWhatsApp.bot.action.poReminder': 'Send PO reminder',
  'buyerWhatsApp.bot.action.requestAsn': 'Request ASN',
  'buyerWhatsApp.bot.action.requestInventory': 'Request inventory update',
  'buyerWhatsApp.bot.action.paymentNotification': 'Send payment notification',
  'buyerWhatsApp.bot.toast.title': 'Bot message sent to {{supplier}}',
  'buyerWhatsApp.bot.toast.desc': '{{action}} dispatched via WhatsApp.',
  // — Automation tab —
  'buyerWhatsApp.auto.title': 'WhatsApp automation rules',
  'buyerWhatsApp.auto.subtitle':
    'Configure what Paragon AI handles automatically vs. escalates to humans.',
  'buyerWhatsApp.auto.trigger': 'Trigger: ',
  'buyerWhatsApp.auto.action': 'Action: ',
  'buyerWhatsApp.auto.escalateIf': '⚡ Escalate if: ',
  'buyerWhatsApp.auto.enable': 'Enable',
  'buyerWhatsApp.auto.disable': 'Disable',
  'buyerWhatsApp.auto.autoLabel': '🤖 Auto',
  'buyerWhatsApp.auto.manualLabel': '👤 Manual',
  'buyerWhatsApp.auto.editRule': 'Edit rule',
  'buyerWhatsApp.auto.toast.editComing': 'Rule editor coming in Phase 2A',
  // — Analytics: KPI cards —
  'buyerWhatsApp.an.kpi.messages.eyebrow': 'Messages Sent (Month)',
  'buyerWhatsApp.an.kpi.automated.eyebrow': 'Automated Actions',
  'buyerWhatsApp.an.kpi.avgResponse.eyebrow': 'Avg Response Time',
  'buyerWhatsApp.an.kpi.satisfaction.eyebrow': 'Supplier Satisfaction',
  // — Analytics: charts —
  'buyerWhatsApp.an.daily.title': 'Daily message volume (last 14 days)',
  'buyerWhatsApp.an.series.outbound': 'Outbound',
  'buyerWhatsApp.an.series.inbound': 'Inbound',
  'buyerWhatsApp.an.rate.title': 'Automation success rate by rule',
  'buyerWhatsApp.an.series.successRate': 'Success rate',
  'buyerWhatsApp.an.response.title': 'Supplier response times',
  // — Analytics: response-times table headers —
  'buyerWhatsApp.an.table.supplier': 'Supplier',
  'buyerWhatsApp.an.table.avg': 'Avg response',
  'buyerWhatsApp.an.table.fastest': 'Fastest',
  'buyerWhatsApp.an.table.slowest': 'Slowest',
  'buyerWhatsApp.an.table.automation': 'Automation rate',
  // — Shared sample-data marker —
  'buyerWhatsApp.sample.pill': 'Sample data',
  // — WeChat panel chrome —
  'buyerWhatsApp.wechat.sample':
    'WeChat channel wires to the engagement service in a later batch.',
  'buyerWhatsApp.wechat.banner.bold': 'WeChat channel',
  'buyerWhatsApp.wechat.banner.rest':
    ' targets Chinese suppliers — packaging components, active ingredients, fragrance compounds. Messages delivered via WeChat Official Account with bilingual CN/EN content.',
  'buyerWhatsApp.wechat.convHeader': 'Conversations ({{count}})',
  'buyerWhatsApp.wechat.send': 'Send message',
  'buyerWhatsApp.wechat.export': 'Export to SAP',
  'buyerWhatsApp.wechat.toast.sent.title': 'WeChat message dispatched',
  'buyerWhatsApp.wechat.toast.sent.desc': 'Delivered to {{supplier}}.',
  'buyerWhatsApp.wechat.toast.export': 'Exporting WeChat conversation to SAP',
  'buyerWhatsApp.wechat.sap.note':
    'IBP inventory auto-updated from WeChat reply · {{material}} stock: {{qty}}',
  // — Email panel chrome —
  'buyerWhatsApp.email.sample':
    'Email channel wires to the engagement service in a later batch.',
  'buyerWhatsApp.email.inboxHeader': 'Inbox ({{count}})',
  'buyerWhatsApp.email.field.from': 'From',
  'buyerWhatsApp.email.field.to': 'To',
  'buyerWhatsApp.email.field.subject': 'Subject',
  'buyerWhatsApp.email.field.date': 'Date',
  'buyerWhatsApp.email.reply': 'Reply',
  'buyerWhatsApp.email.forward': 'Forward',
  'buyerWhatsApp.email.archive': 'Archive',
  'buyerWhatsApp.email.toast.replying': 'Replying to {{subject}}',
  'buyerWhatsApp.email.toast.forwarded': 'Forwarded {{subject}}',
  'buyerWhatsApp.email.toast.archived': 'Archived {{subject}}',
  'buyerWhatsApp.email.sap.note':
    'SAP auto-updated — {{po}} confirmed at {{time}} · Order Confirmation Key updated',
  // — Main empty state —
  'buyerWhatsApp.state.empty.title': 'No conversations yet',
  'buyerWhatsApp.state.empty.subtitle': 'The communications hub is a buyer-side view.',
  'buyerWhatsApp.state.empty.message':
    'Supplier WhatsApp, Email, and WeChat threads appear here for buyer accounts.',
};

export const buyerWhatsAppId: Record<string, string> = {
  // — Breadcrumb —
  'buyerWhatsApp.crumb.intelligence': 'INTELIJEN',
  'buyerWhatsApp.crumb.hub': 'PUSAT KOMUNIKASI',
  // — Page header —
  'buyerWhatsApp.header.title': 'Pusat Komunikasi',
  'buyerWhatsApp.header.subtitle':
    'WhatsApp · Email · WeChat — semua percakapan pemasok di satu tempat.',
  'buyerWhatsApp.meta.line':
    'Komunikasi pemasok multi-kanal · terakhir disegarkan {{date}}',
  // — Channel tabs —
  'buyerWhatsApp.tab.whatsapp': 'WhatsApp',
  'buyerWhatsApp.tab.email': 'Email',
  'buyerWhatsApp.tab.wechat': 'WeChat',
  // — WhatsApp channel intro + connection badge —
  'buyerWhatsApp.wa.intro':
    'Semua percakapan WhatsApp pemasok — didukung oleh 360dialog + Paragon AI.',
  'buyerWhatsApp.wa.simulated': 'Simulasi — 360dialog (Fase 4′)',
  // — WhatsApp KPI cards —
  'buyerWhatsApp.kpi.active.eyebrow': 'Percakapan Aktif',
  'buyerWhatsApp.kpi.pending.eyebrow': 'Respons Tertunda',
  'buyerWhatsApp.kpi.automatedToday.eyebrow': 'Otomatis Hari Ini',
  'buyerWhatsApp.kpi.avgResponse.eyebrow': 'Rata-rata Waktu Respons',
  // — WhatsApp info banner (bold split) —
  'buyerWhatsApp.wa.banner.bold': 'Bot pengadaan WhatsApp Paragon',
  'buyerWhatsApp.wa.banner.rest':
    ' menangani konfirmasi PO, pengajuan ASN, pembaruan inventaris, dan notifikasi pengiriman secara otomatis. Intervensi manusia hanya diperlukan untuk sengketa, deviasi >5%, atau masalah kepatuhan halal.',
  // — WhatsApp sub-tabs —
  'buyerWhatsApp.watab.conversations': 'Percakapan Aktif',
  'buyerWhatsApp.watab.automation': 'Aturan Otomatisasi',
  'buyerWhatsApp.watab.analytics': 'Analitik Kanal',
  'buyerWhatsApp.conv.none': 'Tidak ada percakapan aktif.',
  // — Conversations list —
  'buyerWhatsApp.search.placeholder': 'Cari pemasok…',
  // — Chat thread —
  'buyerWhatsApp.chat.online': 'Online',
  'buyerWhatsApp.chat.error': 'Tidak dapat memuat percakapan ini.',
  'buyerWhatsApp.chat.retry': 'Coba lagi',
  'buyerWhatsApp.chat.loading': 'Memuat percakapan…',
  'buyerWhatsApp.chat.autoNote.pre': 'Percakapan ini ditangani ',
  'buyerWhatsApp.chat.autoNote.bold': '100% otomatis',
  'buyerWhatsApp.chat.autoNote.post':
    ' oleh AI WhatsApp Paragon. Tanpa intervensi manusia. Semua pembaruan SAP selesai secara real-time.',
  'buyerWhatsApp.chat.inputPlaceholder': 'Ketik pesan...',
  'buyerWhatsApp.chat.botMessage': 'Pesan bot',
  // — Bot action menu —
  'buyerWhatsApp.bot.action.poReminder': 'Kirim pengingat PO',
  'buyerWhatsApp.bot.action.requestAsn': 'Minta ASN',
  'buyerWhatsApp.bot.action.requestInventory': 'Minta pembaruan inventaris',
  'buyerWhatsApp.bot.action.paymentNotification': 'Kirim notifikasi pembayaran',
  'buyerWhatsApp.bot.toast.title': 'Pesan bot dikirim ke {{supplier}}',
  'buyerWhatsApp.bot.toast.desc': '{{action}} dikirim melalui WhatsApp.',
  // — Automation tab —
  'buyerWhatsApp.auto.title': 'Aturan otomatisasi WhatsApp',
  'buyerWhatsApp.auto.subtitle':
    'Konfigurasikan apa yang ditangani Paragon AI secara otomatis vs. dieskalasikan ke manusia.',
  'buyerWhatsApp.auto.trigger': 'Pemicu: ',
  'buyerWhatsApp.auto.action': 'Tindakan: ',
  'buyerWhatsApp.auto.escalateIf': '⚡ Eskalasi jika: ',
  'buyerWhatsApp.auto.enable': 'Aktifkan',
  'buyerWhatsApp.auto.disable': 'Nonaktifkan',
  'buyerWhatsApp.auto.autoLabel': '🤖 Otomatis',
  'buyerWhatsApp.auto.manualLabel': '👤 Manual',
  'buyerWhatsApp.auto.editRule': 'Edit aturan',
  'buyerWhatsApp.auto.toast.editComing': 'Editor aturan hadir pada Fase 2A',
  // — Analytics: KPI cards —
  'buyerWhatsApp.an.kpi.messages.eyebrow': 'Pesan Terkirim (Bulan)',
  'buyerWhatsApp.an.kpi.automated.eyebrow': 'Tindakan Otomatis',
  'buyerWhatsApp.an.kpi.avgResponse.eyebrow': 'Rata-rata Waktu Respons',
  'buyerWhatsApp.an.kpi.satisfaction.eyebrow': 'Kepuasan Pemasok',
  // — Analytics: charts —
  'buyerWhatsApp.an.daily.title': 'Volume pesan harian (14 hari terakhir)',
  'buyerWhatsApp.an.series.outbound': 'Keluar',
  'buyerWhatsApp.an.series.inbound': 'Masuk',
  'buyerWhatsApp.an.rate.title': 'Tingkat keberhasilan otomatisasi per aturan',
  'buyerWhatsApp.an.series.successRate': 'Tingkat keberhasilan',
  'buyerWhatsApp.an.response.title': 'Waktu respons pemasok',
  // — Analytics: response-times table headers —
  'buyerWhatsApp.an.table.supplier': 'Pemasok',
  'buyerWhatsApp.an.table.avg': 'Rata-rata respons',
  'buyerWhatsApp.an.table.fastest': 'Tercepat',
  'buyerWhatsApp.an.table.slowest': 'Terlama',
  'buyerWhatsApp.an.table.automation': 'Tingkat otomatisasi',
  // — Shared sample-data marker —
  'buyerWhatsApp.sample.pill': 'Data contoh',
  // — WeChat panel chrome —
  'buyerWhatsApp.wechat.sample':
    'Kanal WeChat terhubung ke layanan engagement pada batch berikutnya.',
  'buyerWhatsApp.wechat.banner.bold': 'Kanal WeChat',
  'buyerWhatsApp.wechat.banner.rest':
    ' menyasar pemasok Tiongkok — komponen kemasan, bahan aktif, senyawa pewangi. Pesan dikirim melalui Akun Resmi WeChat dengan konten dwibahasa CN/EN.',
  'buyerWhatsApp.wechat.convHeader': 'Percakapan ({{count}})',
  'buyerWhatsApp.wechat.send': 'Kirim pesan',
  'buyerWhatsApp.wechat.export': 'Ekspor ke SAP',
  'buyerWhatsApp.wechat.toast.sent.title': 'Pesan WeChat dikirim',
  'buyerWhatsApp.wechat.toast.sent.desc': 'Terkirim ke {{supplier}}.',
  'buyerWhatsApp.wechat.toast.export': 'Mengekspor percakapan WeChat ke SAP',
  'buyerWhatsApp.wechat.sap.note':
    'Inventaris IBP diperbarui otomatis dari balasan WeChat · stok {{material}}: {{qty}}',
  // — Email panel chrome —
  'buyerWhatsApp.email.sample':
    'Kanal Email terhubung ke layanan engagement pada batch berikutnya.',
  'buyerWhatsApp.email.inboxHeader': 'Kotak Masuk ({{count}})',
  'buyerWhatsApp.email.field.from': 'Dari',
  'buyerWhatsApp.email.field.to': 'Kepada',
  'buyerWhatsApp.email.field.subject': 'Subjek',
  'buyerWhatsApp.email.field.date': 'Tanggal',
  'buyerWhatsApp.email.reply': 'Balas',
  'buyerWhatsApp.email.forward': 'Teruskan',
  'buyerWhatsApp.email.archive': 'Arsipkan',
  'buyerWhatsApp.email.toast.replying': 'Membalas {{subject}}',
  'buyerWhatsApp.email.toast.forwarded': 'Meneruskan {{subject}}',
  'buyerWhatsApp.email.toast.archived': 'Mengarsipkan {{subject}}',
  'buyerWhatsApp.email.sap.note':
    'SAP diperbarui otomatis — {{po}} dikonfirmasi pukul {{time}} · Order Confirmation Key diperbarui',
  // — Main empty state —
  'buyerWhatsApp.state.empty.title': 'Belum ada percakapan',
  'buyerWhatsApp.state.empty.subtitle': 'Pusat komunikasi adalah tampilan sisi pembeli.',
  'buyerWhatsApp.state.empty.message':
    'Utas WhatsApp, Email, dan WeChat pemasok muncul di sini untuk akun pembeli.',
};
