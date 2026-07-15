// Intake Review (Phase A/1 · sourcing spine) i18n fragment. Namespace: intakeReview.*
// The recommend-first TRIAGE surface: review the inbound requirement set (both
// producers), accept-as-suggested → the existing governed push, dismiss = honest
// session-only state. Producer labels + tier/plan markers reuse planGrid.* keys.
export const intakeReviewEn: Record<string, string> = {
  // — Page chrome —
  'intakeReview.crumb.acquire': 'Acquire',
  'intakeReview.crumb.review': 'Intake Review',
  'intakeReview.header.title': 'Intake Review',
  'intakeReview.header.subtitle':
    'Triage the inbound requirement set — accept into the sourcing workload, or set aside',
  'intakeReview.meta.summary':
    '{{total}} inbound requirement lines · {{pending}} pending · {{accepted}} accepted · {{dismissed}} dismissed (this session)',

  // — Honesty banner (SIMULATED; review owns no mutation) —
  'intakeReview.honesty.title': 'Recommend-first triage',
  'intakeReview.honesty.body':
    'Planning proposes; you decide. Accepting a line pushes a Draft requisition through the same governed path as the Plan Grid — with no live producer it stays simulated, never a live procurement instruction. Dismissing a line only sets it aside for this session — nothing is persisted or rejected upstream.',
  'intakeReview.adjustHint':
    'Need a different quantity? Adjust & push the line on the Plan Grid.',

  // — Review table —
  'intakeReview.col.material': 'Material',
  'intakeReview.col.producer': 'Producer',
  'intakeReview.col.lane': 'Source lane',
  'intakeReview.col.segment': 'Segment',
  'intakeReview.col.qty': 'Suggested qty',
  'intakeReview.col.period': 'Period',
  'intakeReview.col.estValue': 'Est. value',
  'intakeReview.col.why': 'Why (deficit)',
  'intakeReview.col.provenance': 'Provenance',
  'intakeReview.col.actions': 'Triage',
  'intakeReview.empty': 'No inbound requirement lines.',

  // — Triage actions —
  'intakeReview.action.accept': 'Accept as suggested',
  'intakeReview.action.accepting': 'Pushing…',
  'intakeReview.action.dismiss': 'Dismiss',
  'intakeReview.action.restore': 'Restore',
  'intakeReview.accept.aria': 'Accept as suggested — {{material}}',
  'intakeReview.dismiss.aria': 'Dismiss {{material}}',
  'intakeReview.restore.aria': 'Restore {{material}}',

  // — Triage outcomes (honest labels) —
  'intakeReview.accepted.label': 'Pushed → {{pr}}',
  'intakeReview.dismissed.label': 'Dismissed — this session only · not persisted',
  'intakeReview.failed.label': 'Push failed: {{reason}}',
};

export const intakeReviewId: Record<string, string> = {
  // — Kerangka halaman —
  'intakeReview.crumb.acquire': 'Pengadaan',
  'intakeReview.crumb.review': 'Tinjauan Asupan',
  'intakeReview.header.title': 'Tinjauan Asupan',
  'intakeReview.header.subtitle':
    'Triase kumpulan kebutuhan masuk — terima ke dalam beban kerja pengadaan, atau kesampingkan',
  'intakeReview.meta.summary':
    '{{total}} baris kebutuhan masuk · {{pending}} menunggu · {{accepted}} diterima · {{dismissed}} diabaikan (sesi ini)',

  // — Spanduk kejujuran —
  'intakeReview.honesty.title': 'Triase rekomendasi-dahulu',
  'intakeReview.honesty.body':
    'Perencanaan mengusulkan; Anda yang memutuskan. Menerima baris mengirim permintaan Draft melalui jalur terkelola yang sama dengan Grid Perencanaan — tanpa produsen live tetap simulasi, bukan instruksi pengadaan langsung. Mengabaikan baris hanya mengesampingkannya untuk sesi ini — tidak ada yang disimpan atau ditolak di hulu.',
  'intakeReview.adjustHint':
    'Perlu jumlah berbeda? Sesuaikan & kirim baris tersebut di Grid Perencanaan.',

  // — Tabel tinjauan —
  'intakeReview.col.material': 'Material',
  'intakeReview.col.producer': 'Produsen',
  'intakeReview.col.lane': 'Jalur sumber',
  'intakeReview.col.segment': 'Segmen',
  'intakeReview.col.qty': 'Jumlah disarankan',
  'intakeReview.col.period': 'Periode',
  'intakeReview.col.estValue': 'Nilai est.',
  'intakeReview.col.why': 'Alasan (defisit)',
  'intakeReview.col.provenance': 'Asal',
  'intakeReview.col.actions': 'Triase',
  'intakeReview.empty': 'Tidak ada baris kebutuhan masuk.',

  // — Aksi triase —
  'intakeReview.action.accept': 'Terima sesuai saran',
  'intakeReview.action.accepting': 'Mengirim…',
  'intakeReview.action.dismiss': 'Abaikan',
  'intakeReview.action.restore': 'Pulihkan',
  'intakeReview.accept.aria': 'Terima sesuai saran — {{material}}',
  'intakeReview.dismiss.aria': 'Abaikan {{material}}',
  'intakeReview.restore.aria': 'Pulihkan {{material}}',

  // — Hasil triase (label jujur) —
  'intakeReview.accepted.label': 'Terkirim → {{pr}}',
  'intakeReview.dismissed.label': 'Diabaikan — sesi ini saja · tidak disimpan',
  'intakeReview.failed.label': 'Pengiriman gagal: {{reason}}',
};
