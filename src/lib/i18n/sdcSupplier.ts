// Supplier Data Collaboration (SDC-2b) i18n fragment. Namespace: sdcSup.*
// The P1 supplier surface: an invited supplier sees ITS OWN published forecast
// lines and confirms them (t_requirementresponse_submit). FLAG-2 layer 3 holds
// here: the supplier-facing class vocabulary is commitmentClass ONLY — no
// internal liveness / plan-state grammar ever reaches these strings.
export const sdcSupplierEn: Record<string, string> = {
  // — Page chrome —
  'sdcSup.crumb.section': 'Acquire',
  'sdcSup.crumb.page': 'Forecasts',
  'sdcSup.header.title': 'Forecast Commitments',
  'sdcSup.header.subtitle': 'Published forecast lines for {{supplier}} — confirm what you can supply',
  'sdcSup.meta.summary': '{{lines}} published line(s) · {{responses}} response(s) · plan {{planVersion}}',

  // — FLAG-2 honesty banner (the governed LIVE lane is empty; sample fallback) —
  'sdcSup.honesty.title': 'Sample forecast — no live publication yet',
  'sdcSup.honesty.body':
    'There is no live forecast publication for your account yet — the SOMO C8 feed has not landed. The lines below are simulated sample data shown for demonstration; nothing here is a binding Paragon commitment until a live publication arrives.',

  // — Tabs —
  'sdcSup.tab.lines': 'Published lines',
  'sdcSup.tab.responses': 'My responses',

  // — Commitment classes (the ONLY supplier-facing class vocabulary) —
  'sdcSup.class.firm': 'Firm',
  'sdcSup.class.semiFirm': 'Semi-firm',
  'sdcSup.class.visibilityOnly': 'Visibility only',

  // — Published lines —
  'sdcSup.line.demand': 'Requested',
  'sdcSup.line.period': 'Period',
  'sdcSup.line.confirm': 'Confirm',
  'sdcSup.line.visibilityHint': 'Forward visibility only — no commitment requested.',
  'sdcSup.line.lastResponse': 'Your latest response: {{qty}} {{uom}} · v{{version}} · {{status}}',
  'sdcSup.lines.emptyTitle': 'No published lines',
  'sdcSup.lines.emptyBody': 'No forecast lines have been published to your account.',

  // — My responses (own facts + status ONLY) —
  'sdcSup.responses.emptyTitle': 'No responses yet',
  'sdcSup.responses.emptyBody': 'Confirm a published line and it will appear here.',
  'sdcSup.responses.col.material': 'Material',
  'sdcSup.responses.col.period': 'Period',
  'sdcSup.responses.col.confirmed': 'Confirmed',
  'sdcSup.responses.col.committedDate': 'Committed date',
  'sdcSup.responses.col.version': 'Version',
  'sdcSup.responses.col.submitted': 'Submitted',
  'sdcSup.responses.rootCause': 'Root cause',

  // — Confirm panel —
  'sdcSup.panel.title': 'Confirm {{material}}',
  'sdcSup.panel.requested': 'Requested',
  'sdcSup.panel.qty.eyebrow': 'Step 1',
  'sdcSup.panel.qty.title': 'Confirmed quantity',
  'sdcSup.panel.qty.desc': 'The quantity you commit to supply for this period. 0 is a valid answer when you cannot supply at all.',
  'sdcSup.panel.qtyLabel': 'Confirmed quantity ({{uom}})',
  'sdcSup.panel.date.eyebrow': 'Step 2',
  'sdcSup.panel.date.title': 'Delivery commitment',
  'sdcSup.panel.date.desc': 'Optional: the date you commit to deliver by, and any capacity constraint worth flagging.',
  'sdcSup.panel.committedDate': 'Committed date',
  'sdcSup.panel.capacityConstraint': 'Capacity constraint',
  'sdcSup.panel.capacityPlaceholder': 'e.g. line changeover limits August output',
  'sdcSup.panel.rootCause.eyebrow': 'Step 3',
  'sdcSup.panel.rootCause.title': 'Root cause',
  'sdcSup.panel.rootCause.desc': 'Required when you confirm below the requested quantity — explain the deviation.',
  'sdcSup.panel.rootCause.level1': 'Category',
  'sdcSup.panel.rootCause.select': 'Select a category…',
  'sdcSup.panel.rootCause.note': 'Note',
  'sdcSup.panel.rootCause.notePlaceholder': 'What constrains this commitment?',
  'sdcSup.rootCause.capacity': 'Capacity',
  'sdcSup.rootCause.material': 'Material availability',
  'sdcSup.rootCause.logistics': 'Logistics',
  'sdcSup.rootCause.quality': 'Quality',
  'sdcSup.rootCause.other': 'Other',
  'sdcSup.panel.cancel': 'Cancel',
  'sdcSup.panel.submit': 'Submit confirmation',
  'sdcSup.panel.submitting': 'Submitting…',

  // — Toasts —
  'sdcSup.toast.missingQty.title': 'Quantity required',
  'sdcSup.toast.missingQty.body': 'Enter the quantity you confirm (0 is valid when you cannot supply).',
  'sdcSup.toast.missingRootCause.title': 'Root cause required',
  'sdcSup.toast.missingRootCause.body': 'You are confirming below the requested quantity — select a root-cause category.',
  'sdcSup.toast.submitted.title': 'Confirmation submitted — {{material}}',
  'sdcSup.toast.submitted.body': 'Your response is recorded under My responses.',
  'sdcSup.toast.failed.title': 'Confirmation not submitted',
  'sdcSup.toast.failed.body': 'The submission was rejected. Please try again.',

  // — Empty page —
  'sdcSup.empty.title': 'No forecast publications',
  'sdcSup.empty.subtitle': 'Nothing has been published to {{supplier}} yet.',
  'sdcSup.empty.message': 'Published forecast lines appear here when a planning cycle publishes.',
};

export const sdcSupplierId: Record<string, string> = {
  // — Kerangka halaman —
  'sdcSup.crumb.section': 'Pengadaan',
  'sdcSup.crumb.page': 'Prakiraan',
  'sdcSup.header.title': 'Komitmen Prakiraan',
  'sdcSup.header.subtitle': 'Baris prakiraan terbit untuk {{supplier}} — konfirmasikan yang dapat Anda pasok',
  'sdcSup.meta.summary': '{{lines}} baris terbit · {{responses}} respons · rencana {{planVersion}}',

  // — Spanduk kejujuran FLAG-2 —
  'sdcSup.honesty.title': 'Prakiraan sampel — belum ada publikasi live',
  'sdcSup.honesty.body':
    'Belum ada publikasi prakiraan live untuk akun Anda — feed SOMO C8 belum tersedia. Baris di bawah adalah data sampel simulasi untuk demonstrasi; tidak ada yang menjadi komitmen Paragon yang mengikat sampai publikasi live hadir.',

  // — Tab —
  'sdcSup.tab.lines': 'Baris terbit',
  'sdcSup.tab.responses': 'Respons Saya',

  // — Kelas komitmen —
  'sdcSup.class.firm': 'Firm',
  'sdcSup.class.semiFirm': 'Semi-firm',
  'sdcSup.class.visibilityOnly': 'Visibilitas saja',

  // — Baris terbit —
  'sdcSup.line.demand': 'Diminta',
  'sdcSup.line.period': 'Periode',
  'sdcSup.line.confirm': 'Konfirmasi',
  'sdcSup.line.visibilityHint': 'Visibilitas ke depan saja — tidak ada komitmen yang diminta.',
  'sdcSup.line.lastResponse': 'Respons terakhir Anda: {{qty}} {{uom}} · v{{version}} · {{status}}',
  'sdcSup.lines.emptyTitle': 'Tidak ada baris terbit',
  'sdcSup.lines.emptyBody': 'Belum ada baris prakiraan yang diterbitkan ke akun Anda.',

  // — Respons Saya —
  'sdcSup.responses.emptyTitle': 'Belum ada respons',
  'sdcSup.responses.emptyBody': 'Konfirmasikan baris terbit dan respons akan muncul di sini.',
  'sdcSup.responses.col.material': 'Material',
  'sdcSup.responses.col.period': 'Periode',
  'sdcSup.responses.col.confirmed': 'Dikonfirmasi',
  'sdcSup.responses.col.committedDate': 'Tanggal komitmen',
  'sdcSup.responses.col.version': 'Versi',
  'sdcSup.responses.col.submitted': 'Dikirim',
  'sdcSup.responses.rootCause': 'Akar masalah',

  // — Panel konfirmasi —
  'sdcSup.panel.title': 'Konfirmasi {{material}}',
  'sdcSup.panel.requested': 'Diminta',
  'sdcSup.panel.qty.eyebrow': 'Langkah 1',
  'sdcSup.panel.qty.title': 'Kuantitas dikonfirmasi',
  'sdcSup.panel.qty.desc': 'Kuantitas yang Anda komitmenkan untuk periode ini. 0 adalah jawaban sah bila Anda sama sekali tidak dapat memasok.',
  'sdcSup.panel.qtyLabel': 'Kuantitas dikonfirmasi ({{uom}})',
  'sdcSup.panel.date.eyebrow': 'Langkah 2',
  'sdcSup.panel.date.title': 'Komitmen pengiriman',
  'sdcSup.panel.date.desc': 'Opsional: tanggal komitmen pengiriman dan kendala kapasitas yang perlu ditandai.',
  'sdcSup.panel.committedDate': 'Tanggal komitmen',
  'sdcSup.panel.capacityConstraint': 'Kendala kapasitas',
  'sdcSup.panel.capacityPlaceholder': 'mis. pergantian lini membatasi output Agustus',
  'sdcSup.panel.rootCause.eyebrow': 'Langkah 3',
  'sdcSup.panel.rootCause.title': 'Akar masalah',
  'sdcSup.panel.rootCause.desc': 'Wajib bila Anda mengonfirmasi di bawah kuantitas yang diminta — jelaskan deviasinya.',
  'sdcSup.panel.rootCause.level1': 'Kategori',
  'sdcSup.panel.rootCause.select': 'Pilih kategori…',
  'sdcSup.panel.rootCause.note': 'Catatan',
  'sdcSup.panel.rootCause.notePlaceholder': 'Apa yang membatasi komitmen ini?',
  'sdcSup.rootCause.capacity': 'Kapasitas',
  'sdcSup.rootCause.material': 'Ketersediaan material',
  'sdcSup.rootCause.logistics': 'Logistik',
  'sdcSup.rootCause.quality': 'Kualitas',
  'sdcSup.rootCause.other': 'Lainnya',
  'sdcSup.panel.cancel': 'Batal',
  'sdcSup.panel.submit': 'Kirim konfirmasi',
  'sdcSup.panel.submitting': 'Mengirim…',

  // — Toast —
  'sdcSup.toast.missingQty.title': 'Kuantitas wajib diisi',
  'sdcSup.toast.missingQty.body': 'Masukkan kuantitas yang Anda konfirmasi (0 sah bila tidak dapat memasok).',
  'sdcSup.toast.missingRootCause.title': 'Akar masalah wajib diisi',
  'sdcSup.toast.missingRootCause.body': 'Anda mengonfirmasi di bawah kuantitas yang diminta — pilih kategori akar masalah.',
  'sdcSup.toast.submitted.title': 'Konfirmasi terkirim — {{material}}',
  'sdcSup.toast.submitted.body': 'Respons Anda tercatat di Respons Saya.',
  'sdcSup.toast.failed.title': 'Konfirmasi tidak terkirim',
  'sdcSup.toast.failed.body': 'Pengiriman ditolak. Silakan coba lagi.',

  // — Halaman kosong —
  'sdcSup.empty.title': 'Tidak ada publikasi prakiraan',
  'sdcSup.empty.subtitle': 'Belum ada yang diterbitkan ke {{supplier}}.',
  'sdcSup.empty.message': 'Baris prakiraan terbit muncul di sini saat siklus perencanaan menerbitkan.',
};
