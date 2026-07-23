// Comm Hub C4a — the buyer/planner Communication Hub (chase-derived outbound queue
// + channel-sourced provenance trail). EN/ID parity is guarded by fragments.test.ts.

export const buyerCommHubEn: Record<string, string> = {
  'buyerCommHub.crumb.intelligence': 'Intelligence',
  'buyerCommHub.crumb.hub': 'Communication Hub',
  'buyerCommHub.header.title': 'Communication Hub',
  'buyerCommHub.header.subtitle':
    'The cyclical requests you owe suppliers and the replies you have recorded — derived from the chase, honest about what is sent.',
  'buyerCommHub.meta.line': 'Chase-derived · simulated timeline, as of {{date}}',
  'buyerCommHub.honesty.title': 'No live channel — nothing is sent from here.',
  'buyerCommHub.honesty.body':
    'Outbound requests are composed from the delivery chase; each reads “composed — not sent” until a real transport exists. Replies are recorded on the Channel Inbox, one supplier at a time.',
  // — Outbound queue —
  'buyerCommHub.outbound.title': 'Outbound requests',
  'buyerCommHub.outbound.subtitle': 'One per supplier with something to ask — worst first.',
  'buyerCommHub.outbound.empty': 'No outstanding requests — the chase is clear.',
  'buyerCommHub.outbound.composedNotSent': 'Composed — not sent',
  'buyerCommHub.outbound.subjectDue': 'due {{date}}',
  'buyerCommHub.outbound.lastAsked': 'Last asked {{date}}',
  'buyerCommHub.outbound.neverAsked': 'Not yet asked',
  'buyerCommHub.outbound.channel': 'via {{channel}}',
  'buyerCommHub.status.composed': 'To compose',
  'buyerCommHub.status.awaiting': 'Awaiting reply',
  'buyerCommHub.status.stale': 'No reply yet',
  'buyerCommHub.severity.hard': 'Urgent',
  'buyerCommHub.severity.soft': 'Advisory',
  'buyerCommHub.severity.none': 'Clear',
  'buyerCommHub.reason.overdue': 'Overdue response',
  'buyerCommHub.reason.partial-response': 'Partial response',
  'buyerCommHub.channel.whatsapp': 'WhatsApp',
  'buyerCommHub.channel.email': 'Email',
  'buyerCommHub.channel.wechat': 'WeChat',
  // — Channel-sourced provenance —
  'buyerCommHub.provenance.title': 'Channel-sourced submissions',
  'buyerCommHub.provenance.subtitle':
    'Replies confirmed into the governed ledger, with their channel origin — the audit trail.',
  'buyerCommHub.provenance.empty':
    'No channel-sourced submissions recorded yet. Confirmed replies appear here with their message origin.',
  'buyerCommHub.provenance.recorded': 'Recorded',
  'buyerCommHub.provenance.message': 'Message',
  'buyerCommHub.provenance.session': 'Session',
  'buyerCommHub.provenance.correlation': 'Correlation',
  'buyerCommHub.provenance.noCorrelation': 'No correlation yet',
  // — Triage deep-link —
  'buyerCommHub.inbound.title': 'Triage a new reply',
  'buyerCommHub.inbound.body':
    'No live inbound transport exists. Paste a supplier reply on the Channel Inbox to record it — the supplier is bound there, once. Cross-supplier buyer triage arrives with the recording verb.',
  'buyerCommHub.inbound.cta': 'Open Channel Inbox',
};

export const buyerCommHubId: Record<string, string> = {
  'buyerCommHub.crumb.intelligence': 'Intelijen',
  'buyerCommHub.crumb.hub': 'Pusat Komunikasi',
  'buyerCommHub.header.title': 'Pusat Komunikasi',
  'buyerCommHub.header.subtitle':
    'Permintaan berkala yang Anda ajukan ke pemasok dan balasan yang telah Anda catat — diturunkan dari pengejaran, jujur tentang apa yang terkirim.',
  'buyerCommHub.meta.line': 'Diturunkan dari pengejaran · lini masa simulasi, per {{date}}',
  'buyerCommHub.honesty.title': 'Tanpa kanal langsung — tidak ada yang dikirim dari sini.',
  'buyerCommHub.honesty.body':
    'Permintaan keluar disusun dari pengejaran pengiriman; masing-masing bertuliskan “disusun — belum terkirim” sampai transport nyata tersedia. Balasan dicatat di Kotak Masuk Kanal, satu pemasok sekali waktu.',
  // — Outbound queue —
  'buyerCommHub.outbound.title': 'Permintaan keluar',
  'buyerCommHub.outbound.subtitle': 'Satu per pemasok yang perlu ditanya — terparah dahulu.',
  'buyerCommHub.outbound.empty': 'Tidak ada permintaan tertunda — pengejaran bersih.',
  'buyerCommHub.outbound.composedNotSent': 'Disusun — belum terkirim',
  'buyerCommHub.outbound.subjectDue': 'jatuh tempo {{date}}',
  'buyerCommHub.outbound.lastAsked': 'Terakhir ditanya {{date}}',
  'buyerCommHub.outbound.neverAsked': 'Belum ditanya',
  'buyerCommHub.outbound.channel': 'via {{channel}}',
  'buyerCommHub.status.composed': 'Perlu disusun',
  'buyerCommHub.status.awaiting': 'Menunggu balasan',
  'buyerCommHub.status.stale': 'Belum ada balasan',
  'buyerCommHub.severity.hard': 'Mendesak',
  'buyerCommHub.severity.soft': 'Anjuran',
  'buyerCommHub.severity.none': 'Bersih',
  'buyerCommHub.reason.overdue': 'Balasan terlambat',
  'buyerCommHub.reason.partial-response': 'Balasan sebagian',
  'buyerCommHub.channel.whatsapp': 'WhatsApp',
  'buyerCommHub.channel.email': 'Email',
  'buyerCommHub.channel.wechat': 'WeChat',
  // — Channel-sourced provenance —
  'buyerCommHub.provenance.title': 'Kiriman bersumber kanal',
  'buyerCommHub.provenance.subtitle':
    'Balasan yang dikonfirmasi ke dalam buku besar terkelola, dengan asal kanalnya — jejak audit.',
  'buyerCommHub.provenance.empty':
    'Belum ada kiriman bersumber kanal yang tercatat. Balasan yang dikonfirmasi muncul di sini dengan asal pesannya.',
  'buyerCommHub.provenance.recorded': 'Tercatat',
  'buyerCommHub.provenance.message': 'Pesan',
  'buyerCommHub.provenance.session': 'Sesi',
  'buyerCommHub.provenance.correlation': 'Korelasi',
  'buyerCommHub.provenance.noCorrelation': 'Belum ada korelasi',
  // — Triage deep-link —
  'buyerCommHub.inbound.title': 'Triase balasan baru',
  'buyerCommHub.inbound.body':
    'Tidak ada transport masuk langsung. Tempel balasan pemasok di Kotak Masuk Kanal untuk mencatatnya — pemasok diikat di sana, sekali. Triase lintas-pemasok untuk pembeli hadir bersama verba pencatatan.',
  'buyerCommHub.inbound.cta': 'Buka Kotak Masuk Kanal',
};
