// ─────────────────────────────────────────────────────────────────────────────
// R8 · MATERIAL-REQUEST COPY, EN + ID.
//
// ── ⚠️ THREE CONSTRAINTS BIND EVERY STRING IN THIS FILE, AND THEY ARE NOT
//    STYLE NOTES — EACH TRACES TO A MEASUREMENT ─────────────────────────────
//
//   1. **NO CODE, AND NO CODE-SHAPED PLACEHOLDER, ANYWHERE.** The lane exists
//      because the master carries no code for these materials. A string that
//      showed one — even a `TEMP-…` or a `—` in a column headed "Code" — would
//      be the thing `materialCatalog.ts` measured and refused: *"a temporary
//      code and a code that is simply missing return byte-identical results at
//      the master lookup, the should-cost spread and the search filter."*
//
//   2. **NO DATE AND NO TIMELINE BY WHICH THE MATERIAL WILL EXIST.** Nothing in
//      this tree observes S/4 issuing a code; `MATERIAL_MASTER` is a frozen
//      fixture with no feed. A promised date would be a snapshot with no update
//      path — true the moment it was typed and quietly false afterwards.
//
//   3. **EVERY RFQ-SIDE STRING SAYS THE EVENT IS UNCHANGED.** A code-less pick
//      puts nothing on `materialIds` and no verb can edit an RFQ's materials
//      after creation, so a request can never make that event's material
//      resolve. The existing picker copy already says the event goes ahead and
//      will require competitive bidding; these strings must not undercut it.
//
// ── ⚠️ "ACCEPTED FOR CREATION", NEVER "APPROVED" OR "CREATED" ───────────────
//   `Approved` is the STATE; the label is what a reader takes away.
//   `/register` minting `APP-2026-{random}` beside a next-steps list is the
//   precedent for what a confident label buys — *"An external party was told a
//   numbered application exists. Nothing anywhere recorded that it did."* Here
//   the record IS real; what would be false is the implication that the
//   material is.
//
// ── ⚠️ AND NO STRING RENDERS A DAY-COUNT ───────────────────────────────────
//   This lane joins no anchored family (the store opens empty, so there is
//   nothing authored to anchor), and a waiting-time label is a day-label. The
//   queue answers *"has anybody started?"* with a STATE, not with an age.
// ─────────────────────────────────────────────────────────────────────────────

export const materialRequestsEn: Record<string, string> = {
  // — Page chrome —
  'materialRequests.title': 'Material requests',
  'materialRequests.subtitle':
    'Materials a buyer needs that the material master does not carry. Master data reviews each one; the material is created in SAP, not here.',
  'materialRequests.meta.queue': 'Master-data queue',
  'materialRequests.crumb.source': 'Source',
  'materialRequests.crumb.requests': 'Material requests',
  'materialRequests.meta.note':
    'Raised from the RFQ wizard when a picked material has no master code, or here. A request never changes a sourcing event.',
  'materialRequests.empty.subtitle': 'Nothing has been asked for yet',
  'materialRequests.empty.filtered.title': 'Nothing in this view',
  'materialRequests.empty.filtered.subtitle': 'No request matches',
  'materialRequests.empty.filtered.body': 'Clear the search or choose another tab.',
  // EXHAUSTIVE over the unattributed vocabulary, deliberately: widening it must
  // break the build rather than render a blank where a name would be.
  'materialRequests.attribution.noPerson': 'Not attributed — no person in session',
  'materialRequests.attribution.idpDown': 'Not attributed — identity provider unavailable',
  'materialRequests.raise.unattributed':
    'This request will be recorded against no person: there is no identity provider in this session yet.',

  // — KPI tiles, one per state —
  'materialRequests.kpi.submitted': 'Awaiting review',
  'materialRequests.kpi.underReview': 'Under review',
  'materialRequests.kpi.approved': 'Accepted for creation',
  'materialRequests.kpi.rejected': 'Declined',

  // — Tabs + table —
  'materialRequests.tab.all': 'All',
  'materialRequests.tab.submitted': 'Awaiting review',
  'materialRequests.tab.underReview': 'Under review',
  'materialRequests.tab.approved': 'Accepted',
  'materialRequests.tab.rejected': 'Declined',
  'materialRequests.search.placeholder': 'Search by number, material or category',
  'materialRequests.col.number': 'Request',
  'materialRequests.col.material': 'Material requested',
  'materialRequests.col.category': 'Category',
  'materialRequests.col.origin': 'Raised from',
  'materialRequests.col.status': 'Status',
  'materialRequests.origin.standalone': 'Raised directly',
  // ⚠️ NO `RFQ` PREFIX, AND BROWSER QA IS WHY. The stored id already carries
  // the `RFQ-2026-…` form, so `'RFQ {{rfq}}'` rendered "RFQ RFQ-2026-901". The
  // column header is already "Raised from", so the value stands alone.
  'materialRequests.origin.rfq': '{{rfq}}',

  // — Status labels. Deliberately NOT the raw machine states: "Accepted for
  //   creation" is the one that must never read as "created". —
  'materialRequests.status.Submitted': 'Awaiting review',
  'materialRequests.status.Under Review': 'Under review',
  'materialRequests.status.Approved': 'Accepted for creation',
  'materialRequests.status.Rejected': 'Declined',

  // — Empty / loading / error —
  'materialRequests.empty.title': 'No material requests',
  'materialRequests.empty.body':
    'A request is raised from the RFQ wizard when a picked material has no master code, or here.',
  'materialRequests.error.title': 'Could not load material requests',

  // — Raise panel (the standalone entrance) —
  'materialRequests.raise.open': 'Raise a material request',
  'materialRequests.raise.title': 'Raise a material request',
  'materialRequests.raise.section.what': 'What is needed',
  'materialRequests.raise.field.label': 'Material name',
  'materialRequests.raise.field.label.hint':
    'Your words. Nothing checks this against the master — that is what the request is for.',
  'materialRequests.raise.placeholder.label': 'e.g. Amber glass dropper 30ml',
  'materialRequests.raise.field.category': 'Category',
  'materialRequests.raise.field.need': 'Why it is needed',
  'materialRequests.raise.field.need.hint':
    'Master data decides whether this already exists under another name. This is what they read.',
  'materialRequests.raise.placeholder.need':
    'e.g. New serum line launching Q1; no existing dropper fits the 30ml fill',
  'materialRequests.raise.section.optional': 'Optional detail',
  'materialRequests.raise.field.specification': 'Specification or link',
  'materialRequests.raise.field.uom': 'Expected unit',
  'materialRequests.raise.field.uom.hint':
    'Your expectation, recorded as stated. Not validated against any unit list.',
  'materialRequests.raise.submit': 'Submit request',
  'materialRequests.raise.cancel': 'Cancel',

  // — Detail panel —
  'materialRequests.detail.title': 'Request {{number}}',
  'materialRequests.detail.section.request': 'The request',
  'materialRequests.detail.section.decision': 'The decision',
  'materialRequests.detail.field.need': 'Why it is needed',
  'materialRequests.detail.field.specification': 'Specification',
  'materialRequests.detail.field.uom': 'Expected unit (as stated)',
  'materialRequests.detail.field.origin': 'Raised from',
  'materialRequests.detail.field.reason': 'Why the catalog has no code',
  'materialRequests.detail.field.submittedAt': 'Submitted',
  'materialRequests.detail.field.submittedBy': 'Submitted by',
  'materialRequests.detail.field.reviewStartedAt': 'Picked up',
  'materialRequests.detail.field.decidedAt': 'Decided',
  'materialRequests.detail.field.decidedBy': 'Decided by',
  'materialRequests.detail.none': 'Not stated',

  // — The catalog reasons, reader-facing. One per CodeLessReason member; the
  //   set is pinned EQUAL to the union by the i18n spec, so a sixth reason
  //   cannot ship without copy. —
  'materialRequests.reason.AMBIGUOUS_IN_MASTER':
    'Several master materials fit this name and nothing distinguishes them.',
  'materialRequests.reason.UNCONFIRMED_LOOSE_MATCH':
    'A possible match exists in the master but nobody has confirmed it.',
  'materialRequests.reason.NARROWS_THE_MEANING':
    'The nearest master material means something narrower than this.',
  'materialRequests.reason.NO_MASTER_TARGET': 'No master material fits this at all.',
  'materialRequests.reason.NOT_A_MATERIAL': 'This is not a material — it is free text.',

  // — Acts —
  'materialRequests.action.startReview': 'Start review',
  'materialRequests.action.approve': 'Accept for creation',
  'materialRequests.action.reject': 'Decline',
  'materialRequests.action.confirmApprove': 'Confirm acceptance',
  'materialRequests.action.confirmReject': 'Confirm decline',
  'materialRequests.action.back': 'Back',
  'materialRequests.reject.field.justification': 'Why it is declined',
  'materialRequests.reject.field.justification.hint':
    'The whole account of this decision. The buyer reads this and nothing else.',
  'materialRequests.confirm.approve':
    'This records that the request was accepted. It does not create the material.',
  'materialRequests.confirm.reject': 'This cannot be undone. A new request would be a new record.',

  // — Outcomes. Constraint 1 and 2 live here. —
  'materialRequests.outcome.approved':
    'Accepted for creation in SAP. The material does not exist yet — the code is issued by SAP, not by this portal, and the catalog gains the material when it does.',
  'materialRequests.outcome.rejected':
    'Declined. The reason below is the whole account of the decision.',

  // — Toasts —
  'materialRequests.toast.submitted.title': 'Request {{number}} recorded',
  'materialRequests.toast.submitted.desc':
    'Master data will review it. The material does not exist yet.',
  'materialRequests.toast.submitFailed.title': 'Request not recorded',
  'materialRequests.toast.submitFailed.desc': 'Nothing was saved. Nothing was sent.',
  'materialRequests.toast.reviewStarted.title': 'Review started',
  'materialRequests.toast.approved.title': 'Accepted for creation',
  'materialRequests.toast.approved.desc':
    'Recorded. Creating the material in SAP is done outside this portal.',
  'materialRequests.toast.rejected.title': 'Request declined',
  'materialRequests.toast.rejected.desc': 'The reason is on the record.',
  'materialRequests.toast.failed.title': 'That did not go through',
};

export const materialRequestsId: Record<string, string> = {
  'materialRequests.title': 'Permintaan material',
  'materialRequests.subtitle':
    'Material yang dibutuhkan pembeli namun tidak ada di master material. Master data meninjau setiap permintaan; material dibuat di SAP, bukan di sini.',
  'materialRequests.meta.queue': 'Antrean master data',
  'materialRequests.crumb.source': 'Sumber',
  'materialRequests.crumb.requests': 'Permintaan material',
  'materialRequests.meta.note':
    'Diajukan dari wizard RFQ saat material yang dipilih tidak memiliki kode master, atau di sini. Permintaan tidak pernah mengubah acara sourcing.',
  'materialRequests.empty.subtitle': 'Belum ada yang diminta',
  'materialRequests.empty.filtered.title': 'Tidak ada apa pun di tampilan ini',
  'materialRequests.empty.filtered.subtitle': 'Tidak ada permintaan yang cocok',
  'materialRequests.empty.filtered.body': 'Hapus pencarian atau pilih tab lain.',
  'materialRequests.attribution.noPerson':
    'Tanpa atribusi — tidak ada orang dalam sesi ini',
  'materialRequests.attribution.idpDown':
    'Tanpa atribusi — penyedia identitas tidak tersedia',
  'materialRequests.raise.unattributed':
    'Permintaan ini akan dicatat tanpa nama orang: belum ada penyedia identitas dalam sesi ini.',

  'materialRequests.kpi.submitted': 'Menunggu tinjauan',
  'materialRequests.kpi.underReview': 'Sedang ditinjau',
  'materialRequests.kpi.approved': 'Disetujui untuk dibuat',
  'materialRequests.kpi.rejected': 'Ditolak',

  'materialRequests.tab.all': 'Semua',
  'materialRequests.tab.submitted': 'Menunggu tinjauan',
  'materialRequests.tab.underReview': 'Sedang ditinjau',
  'materialRequests.tab.approved': 'Disetujui',
  'materialRequests.tab.rejected': 'Ditolak',
  'materialRequests.search.placeholder': 'Cari berdasarkan nomor, material atau kategori',
  'materialRequests.col.number': 'Permintaan',
  'materialRequests.col.material': 'Material yang diminta',
  'materialRequests.col.category': 'Kategori',
  'materialRequests.col.origin': 'Diajukan dari',
  'materialRequests.col.status': 'Status',
  'materialRequests.origin.standalone': 'Diajukan langsung',
  'materialRequests.origin.rfq': '{{rfq}}',

  'materialRequests.status.Submitted': 'Menunggu tinjauan',
  'materialRequests.status.Under Review': 'Sedang ditinjau',
  'materialRequests.status.Approved': 'Disetujui untuk dibuat',
  'materialRequests.status.Rejected': 'Ditolak',

  'materialRequests.empty.title': 'Belum ada permintaan material',
  'materialRequests.empty.body':
    'Permintaan diajukan dari wizard RFQ saat material yang dipilih tidak memiliki kode master, atau di sini.',
  'materialRequests.error.title': 'Permintaan material tidak dapat dimuat',

  'materialRequests.raise.open': 'Ajukan permintaan material',
  'materialRequests.raise.title': 'Ajukan permintaan material',
  'materialRequests.raise.section.what': 'Apa yang dibutuhkan',
  'materialRequests.raise.field.label': 'Nama material',
  'materialRequests.raise.field.label.hint':
    'Dengan kata-kata Anda. Tidak ada yang memeriksanya terhadap master — itulah gunanya permintaan ini.',
  'materialRequests.raise.placeholder.label': 'mis. Pipet kaca amber 30ml',
  'materialRequests.raise.field.category': 'Kategori',
  'materialRequests.raise.field.need': 'Mengapa dibutuhkan',
  'materialRequests.raise.field.need.hint':
    'Master data menilai apakah ini sudah ada dengan nama lain. Inilah yang mereka baca.',
  'materialRequests.raise.placeholder.need':
    'mis. Lini serum baru diluncurkan Q1; tidak ada pipet yang sesuai untuk isi 30ml',
  'materialRequests.raise.section.optional': 'Detail opsional',
  'materialRequests.raise.field.specification': 'Spesifikasi atau tautan',
  'materialRequests.raise.field.uom': 'Satuan yang diharapkan',
  'materialRequests.raise.field.uom.hint':
    'Perkiraan Anda, dicatat sebagaimana dinyatakan. Tidak divalidasi terhadap daftar satuan mana pun.',
  'materialRequests.raise.submit': 'Kirim permintaan',
  'materialRequests.raise.cancel': 'Batal',

  'materialRequests.detail.title': 'Permintaan {{number}}',
  'materialRequests.detail.section.request': 'Permintaan',
  'materialRequests.detail.section.decision': 'Keputusan',
  'materialRequests.detail.field.need': 'Mengapa dibutuhkan',
  'materialRequests.detail.field.specification': 'Spesifikasi',
  'materialRequests.detail.field.uom': 'Satuan yang diharapkan (sebagaimana dinyatakan)',
  'materialRequests.detail.field.origin': 'Diajukan dari',
  'materialRequests.detail.field.reason': 'Mengapa katalog tidak memiliki kode',
  'materialRequests.detail.field.submittedAt': 'Diajukan',
  'materialRequests.detail.field.submittedBy': 'Diajukan oleh',
  'materialRequests.detail.field.reviewStartedAt': 'Diambil',
  'materialRequests.detail.field.decidedAt': 'Diputuskan',
  'materialRequests.detail.field.decidedBy': 'Diputuskan oleh',
  'materialRequests.detail.none': 'Tidak dinyatakan',

  'materialRequests.reason.AMBIGUOUS_IN_MASTER':
    'Beberapa material master cocok dengan nama ini dan tidak ada yang membedakannya.',
  'materialRequests.reason.UNCONFIRMED_LOOSE_MATCH':
    'Ada kemungkinan kecocokan di master tetapi belum ada yang mengonfirmasinya.',
  'materialRequests.reason.NARROWS_THE_MEANING':
    'Material master terdekat memiliki arti yang lebih sempit dari ini.',
  'materialRequests.reason.NO_MASTER_TARGET': 'Tidak ada material master yang cocok sama sekali.',
  'materialRequests.reason.NOT_A_MATERIAL': 'Ini bukan material — ini teks bebas.',

  'materialRequests.action.startReview': 'Mulai tinjauan',
  'materialRequests.action.approve': 'Setujui untuk dibuat',
  'materialRequests.action.reject': 'Tolak',
  'materialRequests.action.confirmApprove': 'Konfirmasi persetujuan',
  'materialRequests.action.confirmReject': 'Konfirmasi penolakan',
  'materialRequests.action.back': 'Kembali',
  'materialRequests.reject.field.justification': 'Mengapa ditolak',
  'materialRequests.reject.field.justification.hint':
    'Seluruh catatan keputusan ini. Pembeli hanya membaca ini.',
  'materialRequests.confirm.approve':
    'Ini mencatat bahwa permintaan disetujui. Ini tidak membuat materialnya.',
  'materialRequests.confirm.reject':
    'Ini tidak dapat dibatalkan. Permintaan baru akan menjadi catatan baru.',

  'materialRequests.outcome.approved':
    'Disetujui untuk dibuat di SAP. Material belum ada — kode diterbitkan oleh SAP, bukan oleh portal ini, dan katalog akan memuat material tersebut setelah kode terbit.',
  'materialRequests.outcome.rejected':
    'Ditolak. Alasan di bawah adalah seluruh catatan keputusan ini.',

  'materialRequests.toast.submitted.title': 'Permintaan {{number}} tercatat',
  'materialRequests.toast.submitted.desc':
    'Master data akan meninjaunya. Material belum ada.',
  'materialRequests.toast.submitFailed.title': 'Permintaan tidak tercatat',
  'materialRequests.toast.submitFailed.desc': 'Tidak ada yang disimpan. Tidak ada yang dikirim.',
  'materialRequests.toast.reviewStarted.title': 'Tinjauan dimulai',
  'materialRequests.toast.approved.title': 'Disetujui untuk dibuat',
  'materialRequests.toast.approved.desc':
    'Tercatat. Pembuatan material di SAP dilakukan di luar portal ini.',
  'materialRequests.toast.rejected.title': 'Permintaan ditolak',
  'materialRequests.toast.rejected.desc': 'Alasannya sudah tercatat.',
  'materialRequests.toast.failed.title': 'Tindakan itu tidak berhasil',
};
