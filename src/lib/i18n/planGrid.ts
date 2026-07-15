// Plan Grid (Stage G · G1.2a) i18n fragment. Namespace: planGrid.*
// The procurement-EXECUTION grid: award what-if overlay + C7 PrIntakeLine review.
// READ-ONLY surface — nothing dispatches (that is G1.2b).
export const planGridEn: Record<string, string> = {
  // — Page chrome —
  'planGrid.crumb.acquire': 'Acquire',
  'planGrid.crumb.planGrid': 'Plan Grid',
  'planGrid.header.title': 'Plan Grid',
  'planGrid.header.subtitle': 'Award what-if & requisition intake review',
  'planGrid.meta.summary': 'Sample planning surface — {{quotations}} quotations, {{lines}} intake lines',

  // — Honesty banner (SIMULATED; the ONE governed push in 1.2b) —
  'planGrid.honesty.title': 'Planning sandbox',
  'planGrid.honesty.body':
    'The award what-if recomputes a proposed score in your browser; the committed AI composite is never changed. In the intake panel you may adjust an accepted quantity — a governed decision that requires a reason and is audited. Pushing creates a Draft requisition, but with no live producer yet it stays simulated, never a live procurement instruction.',

  // — Award what-if grid —
  'planGrid.award.title': 'Award scenario — RFQ-2026-003 (Halal Glycerin)',
  'planGrid.award.subtitle': 'Re-weight the criteria to see a what-if score. The committed composite holds.',
  'planGrid.award.col.supplier': 'Supplier',
  'planGrid.award.col.seamScore': 'AI composite',
  'planGrid.award.col.whatIfScore': 'What-if score',
  'planGrid.award.col.recommended': 'Recommended',
  'planGrid.whatif.label': 'What-if weights',
  'planGrid.whatif.reset': 'Reset weights',
  'planGrid.whatif.hint': 'Adjust a weight below; the what-if column recomputes instantly.',
  'planGrid.clientComputed': 'Client-computed',

  // — Award criteria (column headers + weight labels) —
  'planGrid.criterion.compliance': 'Compliance',
  'planGrid.criterion.price': 'Price',
  'planGrid.criterion.leadTime': 'Lead time',
  'planGrid.criterion.reliability': 'Reliability',

  // — Intake grid —
  'planGrid.intake.title': 'Requisition intake — review',
  'planGrid.intake.subtitle': 'One intake shape, two producers (internal Grid & SOMO).',
  'planGrid.intake.col.material': 'Material',
  'planGrid.intake.col.source': 'Producer',
  'planGrid.intake.col.lane': 'Source lane',
  'planGrid.intake.col.segment': 'Segment',
  'planGrid.intake.col.suggestedQty': 'Suggested',
  'planGrid.intake.col.acceptedQty': 'Accepted',
  'planGrid.intake.col.adjusted': 'Adjusted',
  'planGrid.intake.col.period': 'Period',
  'planGrid.intake.col.estValue': 'Est. value',
  'planGrid.intake.col.provenance': 'Provenance',

  // — Producer labels —
  'planGrid.source.SOMO': 'SOMO',
  'planGrid.source.INTERNAL_GRID': 'Internal Grid',

  // — Adjustment —
  'planGrid.adjusted.yes': 'Adjusted',
  'planGrid.adjusted.no': 'As suggested',

  // — Adjust & push panel (G1.2b — C6-LOCK governed override) —
  'planGrid.push.title': 'Adjust & push to requisition',
  'planGrid.push.subtitle':
    'Accepted quantity is the only editable field. Any change from the suggested quantity requires a reason before it can be pushed. Pushing creates a Draft PR — simulated, awaiting a live producer.',
  'planGrid.push.lockedNote':
    'Computed columns (scores, what-if, estimated value) are locked — only accepted quantity is editable.',
  'planGrid.push.col.material': 'Material',
  'planGrid.push.col.suggested': 'Suggested',
  'planGrid.push.col.accepted': 'Accepted',
  'planGrid.push.col.reason': 'Reason',
  'planGrid.push.col.state': 'State',
  'planGrid.push.col.action': 'Action',
  'planGrid.push.reasonRequired': 'Reason required to push an override',
  'planGrid.push.reasonPlaceholder': 'Why the accepted quantity differs…',
  'planGrid.push.button': 'Push to PR',
  'planGrid.push.pushing': 'Pushing…',
  'planGrid.push.committed': 'Pushed → {{pr}}',
  'planGrid.push.failed': 'Push failed: {{reason}}',

  // — Working-set drawer + full-screen (G1.3.2) —
  'planGrid.drawer.title': 'Adjust & push — selected line',
  'planGrid.drawer.subtitle':
    'Select a line above to adjust its accepted quantity. An override requires a reason and is audited; pushing creates a Draft PR — simulated.',
  'planGrid.drawer.empty': 'Select a requisition line above to adjust and push it.',
  'planGrid.intake.col.select': 'Adjust',
  'planGrid.intake.select.action': 'Adjust {{material}}',
  'planGrid.fullscreen.expand': 'Full screen',
  'planGrid.fullscreen.collapse': 'Exit full screen',

  // — Honest-render markers (source tier × plan state) —
  'planGrid.tier.live': 'Live',
  'planGrid.tier.simulated': 'Simulated',
  'planGrid.plan.planned': 'Planned',
  'planGrid.plan.committed': 'Committed',

  // — Empty / placeholder —
  'planGrid.empty.dash': 'None',
};

export const planGridId: Record<string, string> = {
  // — Page chrome —
  'planGrid.crumb.acquire': 'Pengadaan',
  'planGrid.crumb.planGrid': 'Grid Perencanaan',
  'planGrid.header.title': 'Grid Perencanaan',
  'planGrid.header.subtitle': 'Simulasi penghargaan & tinjauan asupan permintaan',
  'planGrid.meta.summary': 'Permukaan perencanaan sampel — {{quotations}} penawaran, {{lines}} baris asupan',

  // — Honesty banner —
  'planGrid.honesty.title': 'Kotak-pasir perencanaan',
  'planGrid.honesty.body':
    'Simulasi penghargaan menghitung ulang skor usulan di peramban Anda; komposit AI yang telah dikomit tidak pernah diubah. Pada panel asupan Anda dapat menyesuaikan jumlah yang diterima — sebuah keputusan terkelola yang memerlukan alasan dan diaudit. Mengirim membuat permintaan Draft, tetapi tanpa produsen live jumlahnya tetap simulasi, bukan instruksi pengadaan langsung.',

  // — Award what-if grid —
  'planGrid.award.title': 'Skenario penghargaan — RFQ-2026-003 (Gliserin Halal)',
  'planGrid.award.subtitle': 'Ubah bobot kriteria untuk melihat skor simulasi. Komposit yang dikomit tetap.',
  'planGrid.award.col.supplier': 'Pemasok',
  'planGrid.award.col.seamScore': 'Komposit AI',
  'planGrid.award.col.whatIfScore': 'Skor simulasi',
  'planGrid.award.col.recommended': 'Direkomendasikan',
  'planGrid.whatif.label': 'Bobot simulasi',
  'planGrid.whatif.reset': 'Setel ulang bobot',
  'planGrid.whatif.hint': 'Sesuaikan bobot di bawah; kolom simulasi menghitung ulang secara instan.',
  'planGrid.clientComputed': 'Dihitung-klien',

  // — Award criteria —
  'planGrid.criterion.compliance': 'Kepatuhan',
  'planGrid.criterion.price': 'Harga',
  'planGrid.criterion.leadTime': 'Waktu tunggu',
  'planGrid.criterion.reliability': 'Keandalan',

  // — Intake grid —
  'planGrid.intake.title': 'Asupan permintaan — tinjauan',
  'planGrid.intake.subtitle': 'Satu bentuk asupan, dua produsen (Grid internal & SOMO).',
  'planGrid.intake.col.material': 'Material',
  'planGrid.intake.col.source': 'Produsen',
  'planGrid.intake.col.lane': 'Jalur sumber',
  'planGrid.intake.col.segment': 'Segmen',
  'planGrid.intake.col.suggestedQty': 'Disarankan',
  'planGrid.intake.col.acceptedQty': 'Diterima',
  'planGrid.intake.col.adjusted': 'Disesuaikan',
  'planGrid.intake.col.period': 'Periode',
  'planGrid.intake.col.estValue': 'Nilai est.',
  'planGrid.intake.col.provenance': 'Asal',

  // — Producer labels —
  'planGrid.source.SOMO': 'SOMO',
  'planGrid.source.INTERNAL_GRID': 'Grid Internal',

  // — Adjustment —
  'planGrid.adjusted.yes': 'Disesuaikan',
  'planGrid.adjusted.no': 'Sesuai saran',

  // — Panel sesuaikan & kirim (G1.2b — override terkelola C6-LOCK) —
  'planGrid.push.title': 'Sesuaikan & kirim ke permintaan',
  'planGrid.push.subtitle':
    'Jumlah yang diterima adalah satu-satunya bidang yang dapat diubah. Perubahan apa pun dari jumlah yang disarankan memerlukan alasan sebelum dapat dikirim. Mengirim membuat PR Draft — simulasi, menunggu produsen live.',
  'planGrid.push.lockedNote':
    'Kolom terhitung (skor, simulasi, nilai estimasi) terkunci — hanya jumlah yang diterima yang dapat diubah.',
  'planGrid.push.col.material': 'Material',
  'planGrid.push.col.suggested': 'Disarankan',
  'planGrid.push.col.accepted': 'Diterima',
  'planGrid.push.col.reason': 'Alasan',
  'planGrid.push.col.state': 'Status',
  'planGrid.push.col.action': 'Aksi',
  'planGrid.push.reasonRequired': 'Alasan diperlukan untuk mengirim override',
  'planGrid.push.reasonPlaceholder': 'Mengapa jumlah yang diterima berbeda…',
  'planGrid.push.button': 'Kirim ke PR',
  'planGrid.push.pushing': 'Mengirim…',
  'planGrid.push.committed': 'Terkirim → {{pr}}',
  'planGrid.push.failed': 'Pengiriman gagal: {{reason}}',

  // — Laci set-kerja + layar-penuh (G1.3.2) —
  'planGrid.drawer.title': 'Sesuaikan & kirim — baris terpilih',
  'planGrid.drawer.subtitle':
    'Pilih baris di atas untuk menyesuaikan jumlah yang diterima. Override memerlukan alasan dan diaudit; mengirim membuat PR Draft — simulasi.',
  'planGrid.drawer.empty': 'Pilih baris permintaan di atas untuk disesuaikan dan dikirim.',
  'planGrid.intake.col.select': 'Sesuaikan',
  'planGrid.intake.select.action': 'Sesuaikan {{material}}',
  'planGrid.fullscreen.expand': 'Layar penuh',
  'planGrid.fullscreen.collapse': 'Keluar layar penuh',

  // — Honest-render markers —
  'planGrid.tier.live': 'Langsung',
  'planGrid.tier.simulated': 'Simulasi',
  'planGrid.plan.planned': 'Direncanakan',
  'planGrid.plan.committed': 'Dikomit',

  // — Empty / placeholder —
  'planGrid.empty.dash': 'Tidak ada',
};
