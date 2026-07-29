// SupplierRFQs i18n fragment (Batch 2). Namespace: rfqs.*
// Chrome only — canonical StatusPill children (Under Review / Awarded / Not
// Awarded / Open) localize centrally via statusLabel.ts; RFQ/quote numbers,
// currency, material/category data, and certificate names stay verbatim.
export const rfqsEn: Record<string, string> = {
  // breadcrumb
  'rfqs.crumb.section': 'ACQUIRE',
  'rfqs.crumb.page': 'MY RFQS & QUOTES',
  // header + meta
  'rfqs.header.title': 'My Sourcing Events',
  'rfqs.header.subtitle': 'RFQs received from Paragon Corp procurement team — {{supplier}}.',
  'rfqs.meta.event.one': 'open event',
  'rfqs.meta.event.other': 'open events',
  'rfqs.meta.quote.one': 'quote pending evaluation',
  'rfqs.meta.quote.other': 'quotes pending evaluation',
  // KPIs
  'rfqs.kpi.open.eyebrow': 'Open Events',
  'rfqs.kpi.open.subtitle': 'Awaiting your quotation',
  'rfqs.kpi.submitted.eyebrow': 'Quotes Submitted',
  'rfqs.kpi.submitted.subtitle': 'Pending evaluation',
  'rfqs.kpi.award.eyebrow': 'Awaiting Award',
  'rfqs.kpi.award.subtitle': 'Decision pending',
  // tabs
  'rfqs.tab.open': 'Open events',
  'rfqs.tab.quotes': 'My Quotes',
  'rfqs.tab.history': 'Awards & history',
  // evaluation segments
  'rfqs.eval.price': 'Price',
  'rfqs.eval.quality': 'Quality',
  'rfqs.eval.leadTime': 'Lead Time',
  'rfqs.eval.sustainability': 'Sustainability',
  'rfqs.eval.risk': 'Risk',
  // RFQ card
  'rfqs.card.daysRemaining': '{{count}} days remaining',
  'rfqs.card.daysToDeadline': '{{count}} days to deadline',
  'rfqs.card.sampleDetail': 'Sample detail',
  'rfqs.card.via': 'via {{channel}}',
  'rfqs.card.received': 'Received {{date}}',
  'rfqs.card.qty': 'Qty:',
  'rfqs.card.location': 'Location:',
  'rfqs.card.reqDelivery': 'Req. Delivery:',
  'rfqs.card.deadline': 'Deadline:',
  'rfqs.card.specialReqs': 'Special requirements',
  'rfqs.card.showMore': 'Show more',
  'rfqs.card.showLess': 'Show less',
  'rfqs.card.evalCriteria': 'Evaluation criteria',
  'rfqs.card.submitQuote': 'Submit quote',
  'rfqs.card.askQuestion': 'Ask question',
  'rfqs.card.decline': 'Decline RFQ',
  // open tab empty
  'rfqs.open.emptyTitle': 'No open RFQs at this time',
  'rfqs.open.emptyBody': 'New RFQs from Paragon will appear here.',
  // my quotes tab — the supplier's OWN submitted quotes (real read); own facts +
  // status only (no competitive score/rank — that needs the hidden sibling set)
  'rfqs.quotes.emptyTitle': 'No quotes submitted yet',
  'rfqs.quotes.emptyBody': 'Quotes you submit against open RFQs appear here.',
  'rfqs.quotes.col.quoteNo': 'Quote #',
  'rfqs.quotes.col.submitted': 'Submitted',
  'rfqs.quotes.col.unitPrice': 'Unit price',
  'rfqs.quotes.col.totalPrice': 'Total price',
  'rfqs.quotes.col.leadTime': 'Lead time (est.)',
  'rfqs.quotes.col.validUntil': 'Valid until',
  // awards tab
  'rfqs.awards.emptyTitle': 'No award decisions yet',
  'rfqs.awards.emptyBody': 'Award outcomes appear here once Paragon awards an RFQ you quoted on.',
  'rfqs.awards.col.rfq': 'RFQ #',
  'rfqs.awards.col.material': 'Material',
  'rfqs.awards.col.result': 'Result',
  'rfqs.awards.col.awardDate': 'Award date',
  'rfqs.awards.col.contractValue': 'Contract value',
  'rfqs.awards.col.poIssued': 'PO issued',
  'rfqs.awards.col.notes': 'Notes',
  'rfqs.awards.note.won': 'Awarded — your quotation was selected',
  'rfqs.awards.note.lost': 'Not awarded — another quotation was selected',
  'rfqs.awards.winRate.one': 'Your win rate: {{awarded}} of {{total}} decided RFQ awarded ({{pct}}%)',
  'rfqs.awards.winRate.other': 'Your win rate: {{awarded}} of {{total}} decided RFQs awarded ({{pct}}%)',
  'rfqs.awards.winRateLabel': 'Win rate',
  // quote side panel
  'rfqs.panel.title': 'Submit quotation — {{rfq}}',
  'rfqs.panel.cancel': 'Cancel',
  'rfqs.panel.submit': 'Submit quotation',
  'rfqs.panel.submitting': 'Submitting…',
  'rfqs.panel.step1.eyebrow': 'Step 1',
  'rfqs.panel.step1.title': 'Pricing',
  'rfqs.panel.step1.desc': 'Unit price drives total. Currency defaults to IDR.',
  'rfqs.panel.unitPrice': 'Unit price *',
  'rfqs.panel.totalPrice': 'Total price (auto-calculated)',
  // — CP-0 · W1 · 2e-a — bid-price refusals (the ONE parse, on a ranking surface) —
  'rfqs.panel.price.hint': 'Digits only — no thousands separators (e.g. 15000)',
  'rfqs.panel.price.refused.empty':
    'Enter your unit price — a blank field is not a price.',
  'rfqs.panel.price.refused.notNumeric':
    'That is not a price — type digits only, e.g. 15000.',
  'rfqs.panel.price.refused.ambiguous':
    'This can be read two ways — "1.500" means one thousand five hundred in Indonesian and one-point-five in English. Type it without separators: 1500.',
  'rfqs.panel.price.refused.zero':
    'Zero is not a valid price. A quotation is an offer to sell — enter the price you are bidding.',
  'rfqs.panel.step2.eyebrow': 'Step 2',
  'rfqs.panel.step2.title': 'Timing & quantity',
  'rfqs.panel.step2.desc':
    'Estimated lead time and validity window. Paragon compares quotations on your estimate; the firm delivery date is confirmed at PO.',
  // — CP-0 · W1 · 2e-b-1a — the lead time: a REQUIRED ESTIMATE, three states,
  //   ack-gated 0. Required so the bid is comparable; labelled an estimate
  //   because a supplier cannot firmly commit before final quantity, PO date and
  //   capacity are known. The firm date is confirmed at PO (a separate arc).
  'rfqs.panel.leadTime': 'Estimated lead time *',
  'rfqs.panel.leadTime.hint':
    'Your best estimate — you will confirm the firm delivery date if this quotation is awarded.',
  'rfqs.panel.leadTime.refused.empty':
    'Give your estimated lead time — a price with no delivery estimate is an incomplete bid, and Paragon cannot compare it against one that has both. An estimate is enough; you will confirm the firm date if awarded.',
  'rfqs.panel.leadTime.refused.notNumeric':
    'That is not a lead time — type whole days as digits, e.g. 14, or leave it blank.',
  'rfqs.panel.leadTime.refused.ambiguous':
    'This can be read two ways — "1.500" means one thousand five hundred in Indonesian and one-point-five in English. Type it without separators: 1500.',
  'rfqs.panel.leadTime.refused.fractional':
    'Lead time is a whole number of days — a part-day cannot be a delivery promise. Enter whole days (e.g. 4), or switch the unit and enter whole weeks.',
  'rfqs.panel.leadTime.sameDay.note':
    '0 days means same-day delivery — confirm this is correct. It is the strongest possible lead-time score, so Paragon will evaluate your quote against a same-day commitment.',
  'rfqs.panel.leadTime.sameDay.ack':
    'I confirm this quotation offers same-day delivery.',
  'rfqs.panel.validUntil': 'Quote valid until *',
  'rfqs.panel.moq': 'Minimum order quantity (optional)',
  'rfqs.panel.moqPlaceholder': 'Leave blank if same as RFQ qty',
  'rfqs.unit.days': 'days',
  'rfqs.unit.weeks': 'weeks',
  'rfqs.panel.step3.eyebrow': 'Step 3',
  'rfqs.panel.step3.title': 'Compliance documents',
  'rfqs.panel.step3.desc': 'Documents already on file will be submitted with this quote.',
  'rfqs.panel.onFile': '— On file',
  'rfqs.panel.step4.eyebrow': 'Step 4',
  'rfqs.panel.step4.title': 'Notes & samples',
  'rfqs.panel.step4.desc': 'Optional context and sample availability.',
  'rfqs.panel.notes': 'Comments / notes',
  'rfqs.panel.notesPlaceholder':
    'Add any notes, conditions, or alternative options for Paragon procurement team…',
  'rfqs.panel.canSample': 'Can provide sample batch?',
  'rfqs.panel.yes': 'Yes',
  'rfqs.panel.no': 'No',
  'rfqs.panel.sampleLeadTime': 'Sample lead time',
  'rfqs.panel.sampleLeadPlaceholder': 'e.g. 5 days',
  'rfqs.panel.pdf': 'Quotation PDF (optional)',
  'rfqs.panel.pdfDrop': 'Click to attach quotation PDF or drag & drop',
  // wrapper empty state
  'rfqs.empty.title': 'No sourcing events yet',
  'rfqs.empty.subtitle': 'No RFQ invitations on file for {{supplier}}.',
  'rfqs.empty.message': 'RFQ invitations from Paragon Corp appear here.',
  // toasts
  'rfqs.toast.declined.title': 'RFQ {{rfq}} declined',
  'rfqs.toast.notified': 'Paragon team has been notified.',
  'rfqs.toast.question.title': 'Message sent for {{rfq}}',
  'rfqs.toast.question.body': 'Paragon procurement team will respond via Web Portal.',
  'rfqs.toast.missing.title': 'Required fields missing',
  'rfqs.toast.missing.body': 'Please fill: {{fields}}.',
  'rfqs.toast.priceRefused.title': 'Quotation not submitted — check the unit price',
  'rfqs.toast.leadTimeRefused.title': 'Quotation not submitted — check the lead time',
  'rfqs.toast.sameDayAck.title': 'Confirm the same-day commitment',
  'rfqs.toast.sameDayAck.body':
    'A 0-day lead time is a same-day delivery offer. Tick the confirmation under the lead-time field to submit it.',
  'rfqs.toast.submitted.title': 'Quotation submitted for {{rfq}}',
  'rfqs.toast.submitted.body': 'Paragon procurement team will review by {{date}}.',
  'rfqs.toast.submitFailed.title': 'Quotation could not be submitted',
  'rfqs.toast.submitFailed.body': 'Please try again, or contact Paragon procurement.',
  'rfqs.field.unitPrice': 'Unit price',
  'rfqs.field.leadTime': 'Lead time',
  'rfqs.field.validUntil': 'Quote valid until',
};

export const rfqsId: Record<string, string> = {
  // breadcrumb
  'rfqs.crumb.section': 'PENGADAAN',
  'rfqs.crumb.page': 'RFQ & PENAWARAN SAYA',
  // header + meta
  'rfqs.header.title': 'Acara Sourcing Saya',
  'rfqs.header.subtitle': 'RFQ diterima dari tim pengadaan Paragon Corp — {{supplier}}.',
  'rfqs.meta.event.one': 'acara terbuka',
  'rfqs.meta.event.other': 'acara terbuka',
  'rfqs.meta.quote.one': 'penawaran menunggu evaluasi',
  'rfqs.meta.quote.other': 'penawaran menunggu evaluasi',
  // KPIs
  'rfqs.kpi.open.eyebrow': 'Acara Terbuka',
  'rfqs.kpi.open.subtitle': 'Menunggu penawaran Anda',
  'rfqs.kpi.submitted.eyebrow': 'Penawaran Dikirim',
  'rfqs.kpi.submitted.subtitle': 'Menunggu evaluasi',
  'rfqs.kpi.award.eyebrow': 'Menunggu Pemenangan',
  'rfqs.kpi.award.subtitle': 'Keputusan tertunda',
  // tabs
  'rfqs.tab.open': 'Acara terbuka',
  'rfqs.tab.quotes': 'Penawaran Saya',
  'rfqs.tab.history': 'Pemenangan & riwayat',
  // evaluation segments
  'rfqs.eval.price': 'Harga',
  'rfqs.eval.quality': 'Kualitas',
  'rfqs.eval.leadTime': 'Waktu Tunggu',
  'rfqs.eval.sustainability': 'Keberlanjutan',
  'rfqs.eval.risk': 'Risiko',
  // RFQ card
  'rfqs.card.daysRemaining': '{{count}} hari tersisa',
  'rfqs.card.daysToDeadline': '{{count}} hari menuju tenggat',
  'rfqs.card.sampleDetail': 'Detail contoh',
  'rfqs.card.via': 'melalui {{channel}}',
  'rfqs.card.received': 'Diterima {{date}}',
  'rfqs.card.qty': 'Jml:',
  'rfqs.card.location': 'Lokasi:',
  'rfqs.card.reqDelivery': 'Pengiriman Diminta:',
  'rfqs.card.deadline': 'Tenggat:',
  'rfqs.card.specialReqs': 'Persyaratan khusus',
  'rfqs.card.showMore': 'Tampilkan selengkapnya',
  'rfqs.card.showLess': 'Tampilkan lebih sedikit',
  'rfqs.card.evalCriteria': 'Kriteria evaluasi',
  'rfqs.card.submitQuote': 'Kirim penawaran',
  'rfqs.card.askQuestion': 'Ajukan pertanyaan',
  'rfqs.card.decline': 'Tolak RFQ',
  // open tab empty
  'rfqs.open.emptyTitle': 'Tidak ada RFQ terbuka saat ini',
  'rfqs.open.emptyBody': 'RFQ baru dari Paragon akan muncul di sini.',
  // my quotes tab — penawaran milik pemasok sendiri (pembacaan nyata); hanya
  // fakta + status sendiri (tanpa skor/peringkat kompetitif — butuh set saingan)
  'rfqs.quotes.emptyTitle': 'Belum ada penawaran dikirim',
  'rfqs.quotes.emptyBody': 'Penawaran yang Anda kirim untuk RFQ terbuka muncul di sini.',
  'rfqs.quotes.col.quoteNo': 'No. Penawaran',
  'rfqs.quotes.col.submitted': 'Dikirim',
  'rfqs.quotes.col.unitPrice': 'Harga satuan',
  'rfqs.quotes.col.totalPrice': 'Harga total',
  'rfqs.quotes.col.leadTime': 'Waktu tunggu (perk.)',
  'rfqs.quotes.col.validUntil': 'Berlaku hingga',
  // awards tab
  'rfqs.awards.emptyTitle': 'Belum ada keputusan pemenangan',
  'rfqs.awards.emptyBody': 'Hasil pemenangan muncul di sini setelah Paragon memenangkan RFQ yang Anda tawar.',
  'rfqs.awards.col.rfq': 'No. RFQ',
  'rfqs.awards.col.material': 'Material',
  'rfqs.awards.col.result': 'Hasil',
  'rfqs.awards.col.awardDate': 'Tanggal pemenangan',
  'rfqs.awards.col.contractValue': 'Nilai kontrak',
  'rfqs.awards.col.poIssued': 'PO diterbitkan',
  'rfqs.awards.col.notes': 'Catatan',
  'rfqs.awards.note.won': 'Dimenangkan — penawaran Anda dipilih',
  'rfqs.awards.note.lost': 'Tidak dimenangkan — penawaran lain dipilih',
  'rfqs.awards.winRate.one': 'Tingkat kemenangan Anda: {{awarded}} dari {{total}} RFQ diputuskan dimenangkan ({{pct}}%)',
  'rfqs.awards.winRate.other': 'Tingkat kemenangan Anda: {{awarded}} dari {{total}} RFQ diputuskan dimenangkan ({{pct}}%)',
  'rfqs.awards.winRateLabel': 'Tingkat kemenangan',
  // quote side panel
  'rfqs.panel.title': 'Kirim penawaran — {{rfq}}',
  'rfqs.panel.cancel': 'Batal',
  'rfqs.panel.submit': 'Kirim penawaran',
  'rfqs.panel.submitting': 'Mengirim…',
  'rfqs.panel.step1.eyebrow': 'Langkah 1',
  'rfqs.panel.step1.title': 'Harga',
  'rfqs.panel.step1.desc': 'Harga satuan menentukan total. Mata uang default IDR.',
  'rfqs.panel.unitPrice': 'Harga satuan *',
  'rfqs.panel.totalPrice': 'Harga total (dihitung otomatis)',
  // — CP-0 · W1 · 2e-a — penolakan harga penawaran (satu-satunya parser) —
  'rfqs.panel.price.hint': 'Angka saja — tanpa pemisah ribuan (misalnya 15000)',
  'rfqs.panel.price.refused.empty':
    'Masukkan harga satuan Anda — kolom kosong bukan berarti harga.',
  'rfqs.panel.price.refused.notNumeric':
    'Itu bukan harga — ketik angka saja, misalnya 15000.',
  'rfqs.panel.price.refused.ambiguous':
    'Ini bisa dibaca dua cara — "1.500" berarti seribu lima ratus dalam bahasa Indonesia dan satu koma lima dalam bahasa Inggris. Ketik tanpa pemisah: 1500.',
  'rfqs.panel.price.refused.zero':
    'Nol bukan harga yang sah. Penawaran adalah tawaran untuk menjual — masukkan harga yang Anda tawarkan.',
  'rfqs.panel.step2.eyebrow': 'Langkah 2',
  'rfqs.panel.step2.title': 'Waktu & kuantitas',
  'rfqs.panel.step2.desc':
    'Perkiraan waktu tunggu dan jendela validitas. Paragon membandingkan penawaran berdasarkan perkiraan Anda; tanggal pengiriman pasti dikonfirmasi saat PO.',
  'rfqs.panel.leadTime': 'Perkiraan waktu tunggu *',
  'rfqs.panel.leadTime.hint':
    'Perkiraan terbaik Anda — Anda akan mengonfirmasi tanggal pengiriman pasti jika penawaran ini dimenangkan.',
  'rfqs.panel.leadTime.refused.empty':
    'Berikan perkiraan waktu tunggu Anda — harga tanpa perkiraan pengiriman adalah penawaran yang tidak lengkap, dan Paragon tidak dapat membandingkannya dengan penawaran yang memiliki keduanya. Perkiraan sudah cukup; Anda akan mengonfirmasi tanggal pastinya jika menang.',
  'rfqs.panel.leadTime.refused.notNumeric':
    'Itu bukan waktu tunggu — ketik jumlah hari bulat sebagai angka, misalnya 14, atau kosongkan.',
  'rfqs.panel.leadTime.refused.ambiguous':
    'Ini bisa dibaca dua cara — "1.500" berarti seribu lima ratus dalam bahasa Indonesia dan satu koma lima dalam bahasa Inggris. Ketik tanpa pemisah: 1500.',
  'rfqs.panel.leadTime.refused.fractional':
    'Waktu tunggu adalah bilangan bulat hari — sebagian hari bukan janji pengiriman. Masukkan hari bulat (mis. 4), atau ganti satuan dan masukkan minggu bulat.',
  'rfqs.panel.leadTime.sameDay.note':
    '0 hari berarti pengiriman di hari yang sama — pastikan ini benar. Ini adalah skor waktu tunggu tertinggi, sehingga Paragon akan menilai penawaran Anda berdasarkan komitmen pengiriman hari yang sama.',
  'rfqs.panel.leadTime.sameDay.ack':
    'Saya konfirmasi penawaran ini menawarkan pengiriman di hari yang sama.',
  'rfqs.panel.validUntil': 'Penawaran berlaku hingga *',
  'rfqs.panel.moq': 'Kuantitas pesanan minimum (opsional)',
  'rfqs.panel.moqPlaceholder': 'Kosongkan jika sama dengan jml RFQ',
  'rfqs.unit.days': 'hari',
  'rfqs.unit.weeks': 'minggu',
  'rfqs.panel.step3.eyebrow': 'Langkah 3',
  'rfqs.panel.step3.title': 'Dokumen kepatuhan',
  'rfqs.panel.step3.desc': 'Dokumen yang sudah ada di berkas akan dikirim bersama penawaran ini.',
  'rfqs.panel.onFile': '— Ada di berkas',
  'rfqs.panel.step4.eyebrow': 'Langkah 4',
  'rfqs.panel.step4.title': 'Catatan & sampel',
  'rfqs.panel.step4.desc': 'Konteks opsional dan ketersediaan sampel.',
  'rfqs.panel.notes': 'Komentar / catatan',
  'rfqs.panel.notesPlaceholder':
    'Tambahkan catatan, syarat, atau opsi alternatif untuk tim pengadaan Paragon…',
  'rfqs.panel.canSample': 'Dapat menyediakan batch sampel?',
  'rfqs.panel.yes': 'Ya',
  'rfqs.panel.no': 'Tidak',
  'rfqs.panel.sampleLeadTime': 'Waktu tunggu sampel',
  'rfqs.panel.sampleLeadPlaceholder': 'mis. 5 hari',
  'rfqs.panel.pdf': 'PDF Penawaran (opsional)',
  'rfqs.panel.pdfDrop': 'Klik untuk melampirkan PDF penawaran atau seret & lepas',
  // wrapper empty state
  'rfqs.empty.title': 'Belum ada acara sourcing',
  'rfqs.empty.subtitle': 'Tidak ada undangan RFQ di berkas untuk {{supplier}}.',
  'rfqs.empty.message': 'Undangan RFQ dari Paragon Corp muncul di sini.',
  // toasts
  'rfqs.toast.declined.title': 'RFQ {{rfq}} ditolak',
  'rfqs.toast.notified': 'Tim Paragon telah diberi tahu.',
  'rfqs.toast.question.title': 'Pesan terkirim untuk {{rfq}}',
  'rfqs.toast.question.body': 'Tim pengadaan Paragon akan merespons melalui Portal Web.',
  'rfqs.toast.missing.title': 'Kolom wajib belum diisi',
  'rfqs.toast.missing.body': 'Harap isi: {{fields}}.',
  'rfqs.toast.priceRefused.title': 'Penawaran tidak dikirim — periksa harga satuan',
  'rfqs.toast.leadTimeRefused.title': 'Penawaran tidak dikirim — periksa waktu tunggu',
  'rfqs.toast.sameDayAck.title': 'Konfirmasi komitmen hari yang sama',
  'rfqs.toast.sameDayAck.body':
    'Waktu tunggu 0 hari adalah tawaran pengiriman di hari yang sama. Centang konfirmasi di bawah kolom waktu tunggu untuk mengirim.',
  'rfqs.toast.submitted.title': 'Penawaran dikirim untuk {{rfq}}',
  'rfqs.toast.submitted.body': 'Tim pengadaan Paragon akan meninjau paling lambat {{date}}.',
  'rfqs.toast.submitFailed.title': 'Penawaran tidak dapat dikirim',
  'rfqs.toast.submitFailed.body': 'Silakan coba lagi, atau hubungi pengadaan Paragon.',
  'rfqs.field.unitPrice': 'Harga satuan',
  'rfqs.field.leadTime': 'Waktu tunggu',
  'rfqs.field.validUntil': 'Penawaran berlaku hingga',
};
