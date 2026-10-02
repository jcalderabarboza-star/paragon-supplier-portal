// Intake review i18n fragment. Namespace: intakeReview.*
// The recommend-first TRIAGE copy. Since PLN-3 it is the Plan Grid's
// `intake-review` view (Design 1 D8); the page and its chrome keys are retired.
// Producer labels + tier/plan markers reuse planGrid.* keys.
export const intakeReviewEn: Record<string, string> = {
  // — Queue summary —
  'intakeReview.meta.summary':
    '{{total}} inbound requirement lines · {{pending}} pending · {{committed}} committed · {{dismissed}} dismissed',

  // — Honesty banner (SIMULATED; review owns no mutation) —
  'intakeReview.honesty.title': 'Recommend-first triage',
  'intakeReview.honesty.body':
    'Planning proposes; you decide. Accepting a line commits the quantity the producer delivered and raises a Draft requisition — with no live producer it stays simulated, never a live procurement instruction. Every decision here is recorded: a dismissal is kept, survives a reload and is visible to your colleagues, and Restore puts the line back. Nothing is rejected upstream — the producer is not told.',
  'intakeReview.adjustHint':
    'Need a different quantity? Press Adjust on the line and push it from the panel below the list.',
  'intakeReview.search.label': 'Search intake lines',
  'intakeReview.search.placeholder': 'Material, code or period…',
  'intakeReview.filter.state': 'Show',
  'intakeReview.filter.Pending': 'Pending',
  'intakeReview.filter.Dismissed': 'Dismissed',
  'intakeReview.filter.Committed': 'Committed',
  'intakeReview.filter.all': 'All lines',
  'intakeReview.showing': 'Showing {{shown}} of {{total}}',

  // — Review table —
  'intakeReview.col.material': 'Material',
  'intakeReview.col.producer': 'Producer',
  'intakeReview.col.lane': 'Source lane',
  'intakeReview.col.segment': 'Segment',
  'intakeReview.col.qty': 'Delivered qty',
  'intakeReview.col.period': 'Period',
  'intakeReview.col.estValue': 'Est. value',
  'intakeReview.col.why': 'Why (deficit)',
  'intakeReview.col.provenance': 'Provenance',
  'intakeReview.col.actions': 'Triage',
  'intakeReview.empty': 'No inbound requirement lines.',

  // — Triage actions —
  'intakeReview.action.accept': 'Accept as delivered',
  'intakeReview.action.accepting': 'Committing…',
  'intakeReview.action.dismiss': 'Dismiss',
  'intakeReview.action.restore': 'Restore',
  'intakeReview.accept.aria': 'Accept as delivered — {{material}}',
  'intakeReview.dismiss.aria': 'Dismiss {{material}}',
  'intakeReview.restore.aria': 'Restore {{material}}',

  // — Triage outcomes (honest labels) —
  'intakeReview.committed.label': 'Committed → {{pr}}',
  'intakeReview.committed.noPr':
    'Committed — its requisition is not in this session’s store',
  'intakeReview.dismissed.label': 'Dismissed',
  'intakeReview.failed.label': 'Refused: {{reason}}',
};

export const intakeReviewId: Record<string, string> = {
  // — Ringkasan antrean —
  'intakeReview.meta.summary':
    '{{total}} baris kebutuhan masuk · {{pending}} menunggu · {{committed}} dikomit · {{dismissed}} diabaikan',

  // — Spanduk kejujuran —
  'intakeReview.honesty.title': 'Triase rekomendasi-dahulu',
  'intakeReview.honesty.body':
    'Perencanaan mengusulkan; Anda yang memutuskan. Menerima baris mengomit jumlah yang dikirim produsen dan membuat permintaan Draft — tanpa produsen live tetap simulasi, bukan instruksi pengadaan langsung. Setiap keputusan di sini dicatat: pengabaian tersimpan, bertahan setelah muat ulang, dan terlihat oleh rekan Anda, dan Pulihkan mengembalikan barisnya. Tidak ada yang ditolak di hulu — produsen tidak diberi tahu.',
  'intakeReview.adjustHint':
    'Perlu jumlah berbeda? Tekan Sesuaikan pada baris itu dan kirim dari panel di bawah daftar.',
  'intakeReview.search.label': 'Cari baris asupan',
  'intakeReview.search.placeholder': 'Material, kode, atau periode…',
  'intakeReview.filter.state': 'Tampilkan',
  'intakeReview.filter.Pending': 'Menunggu',
  'intakeReview.filter.Dismissed': 'Diabaikan',
  'intakeReview.filter.Committed': 'Dikomit',
  'intakeReview.filter.all': 'Semua baris',
  'intakeReview.showing': 'Menampilkan {{shown}} dari {{total}}',

  // — Tabel tinjauan —
  'intakeReview.col.material': 'Material',
  'intakeReview.col.producer': 'Produsen',
  'intakeReview.col.lane': 'Jalur sumber',
  'intakeReview.col.segment': 'Segmen',
  'intakeReview.col.qty': 'Jumlah dikirim',
  'intakeReview.col.period': 'Periode',
  'intakeReview.col.estValue': 'Nilai est.',
  'intakeReview.col.why': 'Alasan (defisit)',
  'intakeReview.col.provenance': 'Asal',
  'intakeReview.col.actions': 'Triase',
  'intakeReview.empty': 'Tidak ada baris kebutuhan masuk.',

  // — Aksi triase —
  'intakeReview.action.accept': 'Terima sesuai kiriman',
  'intakeReview.action.accepting': 'Mengomit…',
  'intakeReview.action.dismiss': 'Abaikan',
  'intakeReview.action.restore': 'Pulihkan',
  'intakeReview.accept.aria': 'Terima sesuai kiriman — {{material}}',
  'intakeReview.dismiss.aria': 'Abaikan {{material}}',
  'intakeReview.restore.aria': 'Pulihkan {{material}}',

  // — Hasil triase (label jujur) —
  'intakeReview.committed.label': 'Dikomit → {{pr}}',
  'intakeReview.committed.noPr':
    'Dikomit — permintaannya tidak ada di penyimpanan sesi ini',
  'intakeReview.dismissed.label': 'Diabaikan',
  'intakeReview.failed.label': 'Ditolak: {{reason}}',
};
