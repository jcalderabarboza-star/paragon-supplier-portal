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

  // — Honesty banner (SIMULATED feed; read-only end-to-end) —
  'sdc.honesty.title': 'Consolidation view — read-only',
  'sdc.honesty.body':
    'Every figure below is simulated sample data. This view consolidates the published forecast against supplier confirmations; nothing here edits, dispatches, or publishes. The SOMO C8 feed has not landed — the page flips live only when it does.',

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
};

export const sdcConsolidationId: Record<string, string> = {
  // — Page chrome —
  'sdc.crumb.section': 'Pengadaan',
  'sdc.crumb.page': 'Kolaborasi Pemasok',
  'sdc.header.title': 'Kolaborasi Pemasok',
  'sdc.header.subtitle': 'Konsolidasi prakiraan — permintaan vs konfirmasi vs pemenuhan',
  'sdc.meta.summary':
    '{{lines}} baris terbit · {{suppliers}} pemasok · rencana {{planVersion}} — jam sampel, per {{asOf}}',

  // — Spanduk kejujuran —
  'sdc.honesty.title': 'Tampilan konsolidasi — hanya-baca',
  'sdc.honesty.body':
    'Semua angka di bawah adalah data sampel simulasi. Tampilan ini mengonsolidasikan prakiraan terbit terhadap konfirmasi pemasok; tidak ada yang mengubah, mengirim, atau menerbitkan. Feed SOMO C8 belum tersedia — halaman ini beralih live hanya setelah feed itu ada.',

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
};
