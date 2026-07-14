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

  // — Honesty banner (read-only, SIMULATED, no push in 1.2a) —
  'planGrid.honesty.title': 'Planning sandbox',
  'planGrid.honesty.body':
    'This grid is read-only. What-if weights recompute a proposed score in your browser; the committed AI composite is never changed. Requisition intake is sample data awaiting a live producer — nothing here is pushed to procurement.',

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
    'Grid ini hanya-baca. Bobot simulasi menghitung ulang skor usulan di peramban Anda; komposit AI yang telah dikomit tidak pernah diubah. Asupan permintaan adalah data sampel yang menunggu produsen live — tidak ada yang dikirim ke pengadaan.',

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

  // — Honest-render markers —
  'planGrid.tier.live': 'Langsung',
  'planGrid.tier.simulated': 'Simulasi',
  'planGrid.plan.planned': 'Direncanakan',
  'planGrid.plan.committed': 'Dikomit',

  // — Empty / placeholder —
  'planGrid.empty.dash': 'Tidak ada',
};
