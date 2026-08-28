// Supplier Data Collaboration (SDC-1b) i18n fragment. Namespace: sdc.*
// The P2 planner consolidation view: the master-spreadsheet replacement —
// demand vs confirmation vs fulfilment over the SDC-0 fixtures. READ-ONLY
// surface — nothing edits, dispatches, or publishes (P1 submission is SDC-2).
export const sdcConsolidationEn: Record<string, string> = {
  // — Page chrome —
  'sdc.crumb.section': 'Acquire',
  'sdc.crumb.page': 'Supplier Collaboration',
  'sdc.header.title': 'Supplier Collaboration',
  'sdc.header.subtitle': 'Forecast consolidation — demand vs confirmation vs fulfilment',
  'sdc.meta.summary':
    '{{lines}} published lines · {{suppliers}} suppliers · plan {{planVersion}} — sample clock, as of {{asOf}}',

  // ⚠️ — Honesty banner. THE CARDINALITY IS GONE, AND ITS REMOVAL IS THE FIX.
  // This read *"read-only except dispute resolution"* / *"ONE action writes"*
  // and was TRUE when R1b wrote it. Wave C added three more writing verbs to
  // this page and the sentence went false with no file edited and no test able
  // to fail for it — `FLOOR-IN-PROSE-01` in a locale map. The remedy this
  // project rules for that class is DELETION IN FAVOUR OF A DERIVATION, never
  // correction to a newer number: *"four actions write"* is the same defect
  // with a fresher date, and it would go stale again on the next wave. So the
  // banner now names the KIND of thing that writes and lets the surface show
  // which — the sections are derived from the machine, so they cannot lie about
  // it. `sdcHonestyNoCardinality.guard.test.ts` is what keeps a number from
  // creeping back in. —
  'sdc.honesty.title': 'Consolidation view — reads are simulated; the review lane writes',
  'sdc.honesty.body':
    'Every figure below is simulated sample data. This view consolidates the published forecast against supplier confirmations. The actions offered on this page write to the supplier’s own response — each one is listed in its own section, and a section is empty when the machine offers nothing there. Nothing else here edits, dispatches, or publishes. The SOMO C8 feed has not landed — the page flips live only when it does.',

  // — Period filter bar (the PERIOD owns the commitment class; lines echo) —
  'sdc.period.all': 'All periods',
  'sdc.period.locked': '{{period}} · FIRM — period locked',
  'sdc.class.firm': 'Firm',
  'sdc.class.semiFirm': 'Semi-firm',
  'sdc.class.visibilityOnly': 'Visibility only',
  'sdc.class.mixed': 'Mixed',

  // — Consolidation grid —
  'sdc.grid.title': 'Consolidation — suppliers × materials × periods',
  'sdc.grid.subtitle':
    'Every line of the current publication joined to its supplier response. Filter by period above.',
  'sdc.col.supplier': 'Supplier',
  'sdc.col.material': 'Material',
  'sdc.col.period': 'Period',
  'sdc.col.class': 'Class',
  'sdc.col.demand': 'Demand',
  'sdc.col.confirmed': 'Confirmed',
  'sdc.col.deficit': 'Deficit',
  'sdc.col.state': 'Response state',
  'sdc.col.coverage': 'Coverage',
  'sdc.col.provenance': 'Provenance',

  // — Line response states —
  'sdc.state.awaiting': 'Awaiting',
  // SDC-2b-EXT: the visibility response — never rendered as "Confirmed".
  'sdc.state.acknowledged': 'Acknowledged',
  'sdc.state.confirmedFull': 'Confirmed',
  'sdc.state.short': 'Short',
  'sdc.state.stale': 'Stale — answered {{answered}}, now {{current}}',
  'sdc.state.staleUnverified': 'Stale — answered snapshot unavailable, now {{current}}',
  'sdc.state.carried': 'carried forward',
  'sdc.state.carriedTitle':
    'Confirmed against the previous version; the line did not move — presumed valid.',

  // — Supplier-coverage indicator (MODELED, Σ-marked; never a fabricated zero) —
  'sdc.coverage.covered': 'Covered',
  'sdc.coverage.atRisk': 'At risk',
  'sdc.coverage.uncovered': 'Uncovered',
  'sdc.coverage.noDeclaration': 'No declaration',
  'sdc.coverage.unbridgeable': 'lead time unbridgeable',
  'sdc.coverage.model': 'Model',
  'sdc.coverage.modelTitle':
    'Computed sufficiency heuristic — declared stock + incoming vs committed demand. Modeled, not measured.',
  // SDC-3b — the total-only (EXPIRY-BLIND) marker: the SOH floor is honest but
  // no batch/expiry detail was declared, so expiry bridgeability is unknown.
  'sdc.coverage.expiryBlind': 'expiry-blind',
  'sdc.coverage.expiryBlindTitle':
    'Total-only declaration — SOH floor is known but batch/expiry detail was not declared, so expiry bridgeability cannot be assessed (never assumed no-risk).',
  'sdc.coverage.legend':
    'Coverage is a modeled per-supplier sufficiency read (Σ) — declared stock + incoming vs committed demand. No declaration renders blank, never a fabricated zero.',

  // — Chase list (pre-scheduler interim; worked manually via WhatsApp) —
  'sdc.chase.title': 'Chase list',
  'sdc.chase.subtitle':
    'Suppliers to nudge — worked manually via WhatsApp until chase rules land.',
  'sdc.chase.empty': 'No one to chase — every supplier has responded in full.',
  'sdc.chase.reason.overdue': 'Overdue',
  'sdc.chase.reason.partial': 'Partial response',
  // `n`, not `count` — i18next reserves `count` for plural-suffix lookup.
  'sdc.chase.awaitingLines': '{{n}} awaiting line(s)',
  'sdc.chase.due': 'Due {{date}}',

  // — Supplier response rollup —
  'sdc.rollup.responded': 'Responded',
  'sdc.rollup.partial': 'Partial',
  'sdc.rollup.silent': 'Silent',

  // — Empty / placeholder —
  'sdc.empty.dash': '—',

  // — R1b · THE ONE WRITE ON THIS PAGE: resolving a dispute —
  // Per-state by construction: the column renders NOTHING unless the machine
  // offers `t_requirementresponse_resolve` from that row's state, so there is no
  // blanket "Action" string standing in for four different situations.
  'sdc.disputes.title': 'Disputes awaiting your resolution',
  'sdc.disputes.subtitle':
    'Every response the machine says you can resolve. Answering one requires words the supplier will read on their own line.',
  'sdc.disputes.none': 'No dispute is waiting on you.',
  'sdc.resolve.cta': 'Resolve',
  'sdc.resolve.ctaTitle': 'Answer this dispute — {{material}} · {{period}}',
  'sdc.resolve.panelTitle': 'Resolve dispute — {{material}}',
  'sdc.resolve.section.exchange': 'The dispute so far',
  'sdc.resolve.section.supplierSaid': 'What the supplier said',
  'sdc.resolve.section.answer': 'Your answer',
  'sdc.resolve.raised': 'Paragon disputed this',
  'sdc.resolve.resolved': 'Paragon resolved the dispute',
  'sdc.resolve.noRootCause': 'The supplier stated no cause.',
  'sdc.resolve.srLabel': 'Your answer to {{supplier}} on {{material}}',
  'sdc.resolve.placeholder': 'Explain what you are accepting, changing, or asking for.',
  'sdc.resolve.note':
    'Required. The supplier reads this on their own response, beside their words — a resolution with nothing said arrives as a bare status change.',
  'sdc.resolve.missingReason': 'A resolution needs an answer the supplier can read.',
  'sdc.resolve.cancel': 'Cancel',
  'sdc.resolve.commit': 'Resolve dispute',
  'sdc.resolve.done.title': 'Dispute resolved — {{material}}',
  'sdc.resolve.done.body': '{{supplier}} can now read your answer on their response.',
  'sdc.resolve.failed.title': 'Could not resolve the dispute on {{material}}',

  // — WAVE C · the review lane: review → accept | dispute —
  'sdc.review.title': 'Responses awaiting your review',
  'sdc.review.subtitle':
    'Every response the machine says you can take under review. Reviewing does not decide it — it moves the line onto your desk and tells the supplier you have it.',
  'sdc.review.none': 'No response is waiting for review.',
  'sdc.review.submitted': 'Submitted',
  'sdc.review.cta': 'Start review',
  'sdc.review.ctaTitle': 'Take this response under review — {{material}} · {{period}}',
  'sdc.review.done.title': 'Under review — {{material}}',
  'sdc.review.done.body': '{{supplier}} can see that you have taken their response up.',
  'sdc.review.failed.title': 'Could not take {{material}} under review',

  'sdc.underReview.title': 'Under review — accept or dispute',
  'sdc.underReview.subtitle':
    'Responses on your desk. Accepting closes the line; disputing sends the supplier words they can answer.',
  'sdc.underReview.none': 'Nothing is on your desk.',
  'sdc.underReview.chip': 'Under review',

  // ⚠️ THE TITLE SAYS TERMINAL BECAUSE THE FLOW SAYS TERMINAL — no transition in
  // `requirementResponse.flow.ts` declares `Accepted` as a `from` state, so this
  // is the last move the line ever makes. Derived, not asserted in prose.
  'sdc.accept.cta': 'Accept',
  'sdc.accept.ctaTitle': 'Accept this confirmation and close the line — {{material}} · {{period}}',
  'sdc.accept.done.title': 'Confirmation accepted — {{material}}',
  'sdc.accept.done.body': '{{supplier}} is committed on this line; it makes no further move.',
  'sdc.accept.failed.title': 'Could not accept {{material}}',

  'sdc.dispute.cta': 'Dispute',
  'sdc.dispute.ctaTitle': 'Dispute this confirmation — {{material}} · {{period}}',
  'sdc.dispute.panelTitle': 'Dispute confirmation — {{material}}',
  'sdc.dispute.section.objection': 'Your objection',
  'sdc.dispute.srLabel': 'Your objection to {{supplier}} on {{material}}',
  'sdc.dispute.placeholder': 'What is wrong with this confirmation, in words the supplier can answer.',
  'sdc.dispute.note':
    'This joins the exchange on the supplier’s own line. It is never translated and never edited.',
  'sdc.dispute.missingReason': 'A dispute needs an objection the supplier can answer.',
  'sdc.dispute.cancel': 'Cancel',
  'sdc.dispute.commit': 'Raise dispute',
  'sdc.dispute.done.title': 'Dispute raised — {{material}}',
  'sdc.dispute.done.body': '{{supplier}} can now read your objection on their response.',
  'sdc.dispute.failed.title': 'Could not dispute {{material}}',

};

export const sdcConsolidationId: Record<string, string> = {
  // — Page chrome —
  'sdc.crumb.section': 'Pengadaan',
  'sdc.crumb.page': 'Kolaborasi Pemasok',
  'sdc.header.title': 'Kolaborasi Pemasok',
  'sdc.header.subtitle': 'Konsolidasi prakiraan — permintaan vs konfirmasi vs pemenuhan',
  'sdc.meta.summary':
    '{{lines}} baris terbit · {{suppliers}} pemasok · rencana {{planVersion}} — jam sampel, per {{asOf}}',

  // — Spanduk kejujuran. Kardinalitas dihapus, bukan diperbarui (lihat EN). —
  'sdc.honesty.title': 'Tampilan konsolidasi — bacaan disimulasikan; jalur telaah menulis',
  'sdc.honesty.body':
    'Semua angka di bawah adalah data sampel simulasi. Tampilan ini mengonsolidasikan prakiraan terbit terhadap konfirmasi pemasok. Tindakan yang ditawarkan di halaman ini menulis ke tanggapan pemasok sendiri — masing-masing tercantum di bagiannya sendiri, dan sebuah bagian kosong ketika mesin tidak menawarkan apa pun di sana. Selain itu tidak ada yang mengubah, mengirim, atau menerbitkan. Feed SOMO C8 belum tersedia — halaman ini beralih live hanya setelah feed itu ada.',

  // — Bilah saring periode —
  'sdc.period.all': 'Semua periode',
  'sdc.period.locked': '{{period}} · FIRM — periode terkunci',
  'sdc.class.firm': 'Firm',
  'sdc.class.semiFirm': 'Semi-firm',
  'sdc.class.visibilityOnly': 'Visibilitas saja',
  'sdc.class.mixed': 'Campuran',

  // — Grid konsolidasi —
  'sdc.grid.title': 'Konsolidasi — pemasok × material × periode',
  'sdc.grid.subtitle':
    'Setiap baris publikasi saat ini digabung dengan respons pemasoknya. Saring per periode di atas.',
  'sdc.col.supplier': 'Pemasok',
  'sdc.col.material': 'Material',
  'sdc.col.period': 'Periode',
  'sdc.col.class': 'Kelas',
  'sdc.col.demand': 'Permintaan',
  'sdc.col.confirmed': 'Dikonfirmasi',
  'sdc.col.deficit': 'Defisit',
  'sdc.col.state': 'Status respons',
  'sdc.col.coverage': 'Cakupan',
  'sdc.col.provenance': 'Asal',

  // — Status respons baris —
  'sdc.state.awaiting': 'Menunggu',
  // SDC-2b-EXT: respons visibilitas — tidak pernah tampil "Dikonfirmasi".
  // (Interim word choice per adjudication; JJ's Indonesian team reviews later.)
  'sdc.state.acknowledged': 'Ditanggapi',
  'sdc.state.confirmedFull': 'Dikonfirmasi',
  'sdc.state.short': 'Kurang',
  'sdc.state.stale': 'Kedaluwarsa — dijawab {{answered}}, kini {{current}}',
  'sdc.state.staleUnverified': 'Kedaluwarsa — snapshot jawaban tak tersedia, kini {{current}}',
  'sdc.state.carried': 'dibawa maju',
  'sdc.state.carriedTitle':
    'Dikonfirmasi terhadap versi sebelumnya; baris tidak berubah — dianggap tetap berlaku.',

  // — Indikator cakupan pemasok (MODEL, bertanda Σ) —
  'sdc.coverage.covered': 'Tercakup',
  'sdc.coverage.atRisk': 'Berisiko',
  'sdc.coverage.uncovered': 'Tak tercakup',
  'sdc.coverage.noDeclaration': 'Tanpa deklarasi',
  'sdc.coverage.unbridgeable': 'waktu tunggu tak terjembatani',
  'sdc.coverage.model': 'Model',
  'sdc.coverage.expiryBlind': 'buta-kedaluwarsa',
  'sdc.coverage.expiryBlindTitle':
    'Deklarasi total-saja — dasar SOH diketahui tetapi rincian batch/kedaluwarsa tidak dideklarasikan, sehingga keterjembatanan kedaluwarsa tidak dapat dinilai (tidak pernah diasumsikan tanpa risiko).',
  'sdc.coverage.modelTitle':
    'Heuristik kecukupan terhitung — stok terdeklarasi + kedatangan vs permintaan berkomitmen. Model, bukan pengukuran.',
  'sdc.coverage.legend':
    'Cakupan adalah pembacaan kecukupan per-pemasok hasil model (Σ) — stok terdeklarasi + kedatangan vs permintaan berkomitmen. Tanpa deklarasi tampil kosong, bukan nol buatan.',

  // — Daftar kejar —
  'sdc.chase.title': 'Daftar kejar',
  'sdc.chase.subtitle':
    'Pemasok yang perlu diingatkan — dikerjakan manual via WhatsApp sampai aturan kejar hadir.',
  'sdc.chase.empty': 'Tidak ada yang perlu dikejar — semua pemasok telah merespons penuh.',
  'sdc.chase.reason.overdue': 'Terlambat',
  'sdc.chase.reason.partial': 'Respons parsial',
  'sdc.chase.awaitingLines': '{{n}} baris menunggu',
  'sdc.chase.due': 'Jatuh tempo {{date}}',

  // — Ringkasan respons pemasok —
  'sdc.rollup.responded': 'Merespons',
  'sdc.rollup.partial': 'Parsial',
  'sdc.rollup.silent': 'Diam',

  // — Kosong / pengganti —
  'sdc.empty.dash': '—',

  // — R1b · penyelesaian sanggahan (bukan lagi satu-satunya tulisan: lihat Wave C) —
  'sdc.disputes.title': 'Sanggahan menunggu penyelesaian Anda',
  'sdc.disputes.subtitle':
    'Setiap tanggapan yang menurut mesin dapat Anda selesaikan. Menjawabnya memerlukan kata-kata yang akan dibaca pemasok pada baris mereka sendiri.',
  'sdc.disputes.none': 'Tidak ada sanggahan yang menunggu Anda.',
  'sdc.resolve.cta': 'Selesaikan',
  'sdc.resolve.ctaTitle': 'Jawab sanggahan ini — {{material}} · {{period}}',
  'sdc.resolve.panelTitle': 'Selesaikan sanggahan — {{material}}',
  'sdc.resolve.section.exchange': 'Sanggahan sejauh ini',
  'sdc.resolve.section.supplierSaid': 'Yang disampaikan pemasok',
  'sdc.resolve.section.answer': 'Jawaban Anda',
  'sdc.resolve.raised': 'Paragon menyanggah tanggapan ini',
  'sdc.resolve.resolved': 'Paragon menyelesaikan sanggahan',
  'sdc.resolve.noRootCause': 'Pemasok tidak menyatakan penyebab.',
  'sdc.resolve.srLabel': 'Jawaban Anda kepada {{supplier}} atas {{material}}',
  'sdc.resolve.placeholder': 'Jelaskan apa yang Anda terima, ubah, atau minta.',
  'sdc.resolve.note':
    'Wajib diisi. Pemasok membaca ini pada tanggapan mereka sendiri, di samping kata-kata mereka — penyelesaian tanpa penjelasan hanya tiba sebagai perubahan status.',
  'sdc.resolve.missingReason': 'Penyelesaian memerlukan jawaban yang dapat dibaca pemasok.',
  'sdc.resolve.cancel': 'Batal',
  'sdc.resolve.commit': 'Selesaikan sanggahan',
  'sdc.resolve.done.title': 'Sanggahan diselesaikan — {{material}}',
  'sdc.resolve.done.body': '{{supplier}} kini dapat membaca jawaban Anda pada tanggapan mereka.',
  'sdc.resolve.failed.title': 'Tidak dapat menyelesaikan sanggahan pada {{material}}',

  // — WAVE C · jalur telaah: telaah → terima | sanggah —
  'sdc.review.title': 'Tanggapan menunggu telaah Anda',
  'sdc.review.subtitle':
    'Setiap tanggapan yang menurut mesin dapat Anda telaah. Menelaah belum memutuskan apa pun — ia memindahkan baris ini ke meja Anda dan memberi tahu pemasok bahwa Anda sudah menerimanya.',
  'sdc.review.none': 'Tidak ada tanggapan yang menunggu telaah.',
  'sdc.review.submitted': 'Terkirim',
  'sdc.review.cta': 'Mulai telaah',
  'sdc.review.ctaTitle': 'Ambil tanggapan ini untuk ditelaah — {{material}} · {{period}}',
  'sdc.review.done.title': 'Sedang ditelaah — {{material}}',
  'sdc.review.done.body': '{{supplier}} dapat melihat bahwa Anda sudah menerima tanggapan mereka.',
  'sdc.review.failed.title': 'Tidak dapat menelaah {{material}}',

  'sdc.underReview.title': 'Sedang ditelaah — terima atau sanggah',
  'sdc.underReview.subtitle':
    'Tanggapan di meja Anda. Menerima menutup baris ini; menyanggah mengirimkan kata-kata yang dapat dijawab pemasok.',
  'sdc.underReview.none': 'Tidak ada apa pun di meja Anda.',
  'sdc.underReview.chip': 'Sedang ditelaah',

  'sdc.accept.cta': 'Terima',
  'sdc.accept.ctaTitle': 'Terima konfirmasi ini dan tutup baris — {{material}} · {{period}}',
  'sdc.accept.done.title': 'Konfirmasi diterima — {{material}}',
  'sdc.accept.done.body': '{{supplier}} terikat pada baris ini; baris ini tidak bergerak lagi.',
  'sdc.accept.failed.title': 'Tidak dapat menerima {{material}}',

  'sdc.dispute.cta': 'Sanggah',
  'sdc.dispute.ctaTitle': 'Sanggah konfirmasi ini — {{material}} · {{period}}',
  'sdc.dispute.panelTitle': 'Sanggah konfirmasi — {{material}}',
  'sdc.dispute.section.objection': 'Keberatan Anda',
  'sdc.dispute.srLabel': 'Keberatan Anda kepada {{supplier}} atas {{material}}',
  'sdc.dispute.placeholder':
    'Apa yang keliru pada konfirmasi ini, dalam kata-kata yang dapat dijawab pemasok.',
  'sdc.dispute.note':
    'Ini bergabung dengan percakapan pada baris pemasok sendiri. Tidak pernah diterjemahkan dan tidak pernah diubah.',
  'sdc.dispute.missingReason': 'Sanggahan memerlukan keberatan yang dapat dijawab pemasok.',
  'sdc.dispute.cancel': 'Batal',
  'sdc.dispute.commit': 'Ajukan sanggahan',
  'sdc.dispute.done.title': 'Sanggahan diajukan — {{material}}',
  'sdc.dispute.done.body': '{{supplier}} kini dapat membaca keberatan Anda pada tanggapan mereka.',
  'sdc.dispute.failed.title': 'Tidak dapat menyanggah {{material}}',

};
