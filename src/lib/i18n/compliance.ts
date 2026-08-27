// BuyerCompliance i18n fragment. Namespace: compliance.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases interpolate a `{{count}}`/`{{days}}` value; no plural
// resolver is used (flat-key convention already shipped in i18n.ts).
// Canonical StatusPill children — the status chips (Valid/Expiring/Expired/
// Missing/Under Review) — are localized centrally via statusLabel.ts and are NOT
// re-declared here. Filter-chip option labels (which are plain text, not pills)
// ARE declared, and their status labels deliberately match statusLabel's ID so
// the filter reads consistently with the table pills.
//
// I3.2 (surface re-point): the page now reads the canonical `ComplianceRegistry
// Entry` via `useComplianceRegistry`. The certificate SCHEME (certType) and the
// per-row action label are DERIVED (complianceView.ts) and localized here
// (compliance.certType.* / compliance.action.state.*) — action labels are
// state-descriptive, never imperative (D4). The legacy `priority` column and
// per-row free-text `action`/`country` are dropped (not on the DTO).
export const complianceEn: Record<string, string> = {
  // — Breadcrumb —
  'compliance.crumb.intelligence': 'INTELLIGENCE',
  'compliance.crumb.tracker': 'COMPLIANCE TRACKER',
  // — Page header —
  'compliance.header.title': 'Compliance Tracker',
  'compliance.header.subtitle':
    'Halal · BPOM · ISO · REACH · GMP — October 2026 BPJPH mandatory transition.',
  'compliance.action.exportReport': 'Export Report',
  'compliance.toast.exporting': 'Compliance report not available yet — no PDF was generated.',
  // — Meta line —
  'compliance.meta.summary': '{{count}} certificates · last refreshed {{date}}',
  // — Data-readiness (waiting-state) banner (I3.3) —
  'compliance.readiness.title': 'Illustrative data — proven surface, awaiting Track-R harvest.',
  'compliance.readiness.body':
    'These certificates are synthetic samples. The tracker is wired to the data seam and proven end-to-end; it flips to live records when the Track-R certificate harvest (R0.1) lands the real registry. No figure here reflects a real certificate.',
  // — BPJPH mandatory-transition banner —
  'compliance.bpjph.banner.title': 'BPJPH Mandatory Transition — October 2026:',
  'compliance.bpjph.banner.body':
    'All cosmetics and personal care products distributed in Indonesia must carry BPJPH-issued halal certification. Suppliers with MUI-only certificates must initiate BPJPH applications now.',
  'compliance.bpjph.banner.certs': '{{compliant}} of {{total}} halal certs',
  'compliance.bpjph.banner.compliantSuffix': 'are BPJPH-compliant.',
  // — BPJPH deadline card —
  // D-CENSUS-8 — this card was NOT deleted, and the distinction matters.
  // The 17 Oct 2026 BPJPH date is a REAL Indonesian regulatory fact; the canon
  // de-pressurized the BUILD on 2026-07-15 (Track-R is a normal operator lane, no
  // deadline gates delivery, certification is handled manually by the compliance
  // team), NOT the regulation. Deleting a true external fact would have replaced
  // one distortion with another. What WAS false was the framing: a red countdown
  // presented it as PRODUCT urgency — as if this portal were the thing racing the
  // date. The fact stays; the urgency is retracted, and the copy now says who
  // actually owns the work.
  'compliance.deadline.title': 'BPJPH regulatory date (external)',
  'compliance.deadline.subtitle':
    'Indonesian cosmetics must carry BPJPH halal certification by 17 Oct 2026. Certification is handled manually by the compliance team — this portal tracks status, it does not perform or submit certification, and this date does not gate any work here.',
  'compliance.deadline.daysRemaining': 'days until the regulatory date',
  // — KPI cards —
  'compliance.kpi.expired.eyebrow': 'Expired',
  'compliance.kpi.expired.subtitle': 'Blocks new POs',
  'compliance.kpi.expiring.eyebrow': 'Expiring ≤90d',
  'compliance.kpi.expiring.subtitle': 'Renewal window open',
  'compliance.kpi.missing.eyebrow': 'Missing',
  'compliance.kpi.missing.subtitle': 'Application not started',
  'compliance.kpi.valid.eyebrow': 'Valid',
  'compliance.kpi.valid.subtitle': 'In good standing',
  'compliance.kpi.underReview.eyebrow': 'Under Review',
  'compliance.kpi.underReview.subtitle': 'Awaiting verification',
  // — Status filter chips —
  'compliance.filter.status.all': 'All',
  'compliance.filter.status.expired': 'Expired',
  'compliance.filter.status.expiring': 'Expiring',
  'compliance.filter.status.missing': 'Missing',
  'compliance.filter.status.underReview': 'Under Review',
  'compliance.filter.status.valid': 'Valid',
  // — Category filter chips —
  'compliance.filter.category.all': 'All',
  'compliance.filter.category.halal': 'Halal',
  'compliance.filter.category.quality': 'Quality',
  'compliance.filter.category.regulatory': 'Regulatory',
  'compliance.filter.category.other': 'Other',
  // — Filter result summary —
  'compliance.filter.summary': '{{filtered}} of {{total}} items',
  // — Table columns —
  'compliance.table.supplier': 'Supplier',
  'compliance.table.certificate': 'Certificate',
  'compliance.table.category': 'Category',
  'compliance.table.issuedBy': 'Issued by',
  'compliance.table.expiry': 'Expiry',
  'compliance.table.status': 'Status',
  'compliance.table.actionRequired': 'Action required',
  // — SAP sync state (per ROW, outbound). Deliberately distinct from the
  //   readiness banner above, which is INBOUND and per-capability: that one says
  //   the portal has no real data yet; these say S/4HANA does not hold this row.
  'compliance.table.sapSync': 'In SAP',
  'compliance.sapSync.AWAITING_SYNC': 'Not yet',
  'compliance.sapSync.AWAITING_SYNC.title':
    'S/4HANA has not acknowledged this certificate. The portal holds it; the sync that would hand it over does not exist yet.',
  'compliance.sapSync.note':
    'No certificate here has been handed to S/4HANA — the portal cannot transmit one yet. A row says so rather than leaving you to assume otherwise.',
  'compliance.table.remind': 'Remind',
  'compliance.table.empty': 'No certificates match the current filters.',
  // — Certificate scheme labels (derived from certType) —
  // — §82 · COMPLIANCE'S REVIEW QUEUE —
  // The copy never says "uploaded" or "document received": nothing was
  // transmitted, and a queue that implies a file arrived would reintroduce on
  // the buyer side exactly the claim §82 removed from the supplier side.
  'compliance.queue.title': 'Declared certificates awaiting review',
  'compliance.queue.subtitle.one':
    '{{count}} certificate has been stated. Nothing was uploaded — check the details against the certificate itself before confirming.',
  'compliance.queue.subtitle.other':
    '{{count}} certificates have been stated. Nothing was uploaded — check the details against the certificates themselves before confirming.',
  'compliance.queue.field.issuer': 'Granted by',
  'compliance.queue.field.dates': 'Valid',
  'compliance.queue.field.scope': 'Covers',
  'compliance.queue.field.declared': 'Stated',
  'compliance.queue.declaredBy.unattributed': 'by the supplier (no named person)',
  'compliance.queue.noExpiry': 'no expiry',
  'compliance.queue.noDeclaration':
    'Seeded sample row — it reached review before declarations existed, so it carries no stated details.',
  'compliance.queue.action.verify': 'Confirm',
  'compliance.queue.action.reject': 'Refuse',
  'compliance.queue.action.cancel': 'Cancel',
  'compliance.queue.action.confirmReject': 'Record refusal',
  'compliance.queue.reject.label': 'Why it is being refused',
  'compliance.queue.reject.placeholder':
    'e.g. the scope does not cover the materials we buy from this supplier',
  'compliance.queue.reject.hint':
    'The supplier reads this text word for word on their own documents page, so write it to them.',
  'compliance.queue.toast.verified': 'Certificate confirmed',
  'compliance.queue.toast.rejected': 'Refusal recorded',
  'compliance.queue.toast.rejectedDesc':
    'The supplier sees the reason and the date on their documents page, and can declare again.',
  'compliance.queue.toast.failed': 'Not recorded',
  'compliance.certType.HALAL_BPJPH': 'Halal (BPJPH)',
  'compliance.certType.HALAL_MUI_LEGACY': 'Halal (MUI, legacy)',
  'compliance.certType.HALAL_FOREIGN': 'Halal (foreign scheme)',
  'compliance.certType.BPOM': 'BPOM',
  'compliance.certType.ISO': 'ISO',
  'compliance.certType.OTHER': 'Other',
  // — Descriptive action labels (state-descriptive, never imperative) —
  'compliance.action.state.expired': 'Renewal overdue',
  'compliance.action.state.expiring': 'Renewal due',
  'compliance.action.state.missing': 'Certificate not on file',
  'compliance.action.state.underReview': 'Under review',
  'compliance.action.state.valid': 'Current',
  // — Expiry cell relative days —
  'compliance.expiry.expiredAgo': 'Expired {{days}}d ago',
  'compliance.expiry.remaining': '{{days}}d remaining',
  // — Remind action + toast —
  'compliance.action.remind': 'Remind',
  'compliance.toast.reminderQueued': 'Reminder queued for {{supplier}}',
  'compliance.toast.reminderDesc': 'Simulated — delivery pending live channel.',
  // — Phase 2 integration banner —
  'compliance.phase2.title': 'Phase 2 — Live Integration:',
  'compliance.phase2.body':
    'Compliance tracking will connect to SAP S/4HANA vendor master, BPJPH API, and supplier document vault. Automated renewal reminders via WhatsApp 90 days before expiry.',
};

export const complianceId: Record<string, string> = {
  // — Breadcrumb —
  'compliance.crumb.intelligence': 'INTELIJEN',
  'compliance.crumb.tracker': 'PELACAK KEPATUHAN',
  // — Page header —
  'compliance.header.title': 'Pelacak Kepatuhan',
  'compliance.header.subtitle':
    'Halal · BPOM · ISO · REACH · GMP — transisi wajib BPJPH Oktober 2026.',
  'compliance.action.exportReport': 'Ekspor Laporan',
  'compliance.toast.exporting': 'Laporan kepatuhan belum tersedia — tidak ada PDF yang dibuat.',
  // — Meta line —
  'compliance.meta.summary': '{{count}} sertifikat · terakhir diperbarui {{date}}',
  // — Data-readiness (waiting-state) banner (I3.3) —
  'compliance.readiness.title': 'Data ilustratif — antarmuka terbukti, menunggu panen data Track-R.',
  'compliance.readiness.body':
    'Sertifikat ini adalah sampel sintetis. Pelacak telah terhubung ke lapisan data dan terbukti secara menyeluruh; ia beralih ke catatan langsung saat panen data sertifikat Track-R (R0.1) menghadirkan registri sebenarnya. Tidak ada angka di sini yang mencerminkan sertifikat nyata.',
  // — BPJPH mandatory-transition banner —
  'compliance.bpjph.banner.title': 'Transisi Wajib BPJPH — Oktober 2026:',
  'compliance.bpjph.banner.body':
    'Semua produk kosmetik dan perawatan pribadi yang didistribusikan di Indonesia harus memiliki sertifikasi halal yang diterbitkan BPJPH. Pemasok yang hanya memiliki sertifikat MUI harus segera memulai permohonan BPJPH sekarang.',
  'compliance.bpjph.banner.certs': '{{compliant}} dari {{total}} sertifikat halal',
  'compliance.bpjph.banner.compliantSuffix': 'mematuhi BPJPH.',
  // — BPJPH deadline card —
  'compliance.deadline.title': 'Tanggal regulasi BPJPH (eksternal)',
  'compliance.deadline.subtitle':
    'Kosmetik Indonesia harus memiliki sertifikasi halal BPJPH paling lambat 17 Okt 2026. Sertifikasi ditangani secara manual oleh tim kepatuhan — portal ini melacak status, tidak melakukan atau mengajukan sertifikasi, dan tanggal ini tidak membatasi pekerjaan apa pun di sini.',
  'compliance.deadline.daysRemaining': 'hari menuju tanggal regulasi',
  // — KPI cards —
  'compliance.kpi.expired.eyebrow': 'Kedaluwarsa',
  'compliance.kpi.expired.subtitle': 'Memblokir PO baru',
  'compliance.kpi.expiring.eyebrow': 'Akan Kedaluwarsa ≤90 hari',
  'compliance.kpi.expiring.subtitle': 'Jendela pembaruan terbuka',
  'compliance.kpi.missing.eyebrow': 'Hilang',
  'compliance.kpi.missing.subtitle': 'Permohonan belum dimulai',
  'compliance.kpi.valid.eyebrow': 'Berlaku',
  'compliance.kpi.valid.subtitle': 'Dalam keadaan baik',
  'compliance.kpi.underReview.eyebrow': 'Sedang Ditinjau',
  'compliance.kpi.underReview.subtitle': 'Menunggu verifikasi',
  // — Status filter chips —
  'compliance.filter.status.all': 'Semua',
  'compliance.filter.status.expired': 'Kedaluwarsa',
  'compliance.filter.status.expiring': 'Akan Kedaluwarsa',
  'compliance.filter.status.missing': 'Hilang',
  'compliance.filter.status.underReview': 'Sedang Ditinjau',
  'compliance.filter.status.valid': 'Berlaku',
  // — Category filter chips —
  'compliance.filter.category.all': 'Semua',
  'compliance.filter.category.halal': 'Halal',
  'compliance.filter.category.quality': 'Kualitas',
  'compliance.filter.category.regulatory': 'Regulasi',
  'compliance.filter.category.other': 'Lainnya',
  // — Filter result summary —
  'compliance.filter.summary': '{{filtered}} dari {{total}} item',
  // — Table columns —
  'compliance.table.supplier': 'Pemasok',
  'compliance.table.certificate': 'Sertifikat',
  'compliance.table.category': 'Kategori',
  'compliance.table.issuedBy': 'Diterbitkan oleh',
  'compliance.table.expiry': 'Kedaluwarsa',
  'compliance.table.status': 'Status',
  'compliance.table.actionRequired': 'Tindakan diperlukan',
  // — Status sinkronisasi SAP (per BARIS, keluar) —
  'compliance.table.sapSync': 'Di SAP',
  'compliance.sapSync.AWAITING_SYNC': 'Belum',
  'compliance.sapSync.AWAITING_SYNC.title':
    'S/4HANA belum menerima sertifikat ini. Portal menyimpannya; sinkronisasi yang akan menyerahkannya belum ada.',
  'compliance.sapSync.note':
    'Belum ada sertifikat di sini yang diserahkan ke S/4HANA — portal belum dapat mengirimkannya. Setiap baris menyatakannya, alih-alih membiarkan Anda menduga sebaliknya.',
  'compliance.table.remind': 'Ingatkan',
  'compliance.table.empty': 'Tidak ada sertifikat yang cocok dengan filter saat ini.',
  // — Certificate scheme labels (derived from certType) —
  // — §82 —
  'compliance.queue.title': 'Sertifikat yang dinyatakan, menunggu tinjauan',
  'compliance.queue.subtitle.one':
    '{{count}} sertifikat telah dinyatakan. Tidak ada berkas yang diunggah — cocokkan rinciannya dengan sertifikat aslinya sebelum mengonfirmasi.',
  'compliance.queue.subtitle.other':
    '{{count}} sertifikat telah dinyatakan. Tidak ada berkas yang diunggah — cocokkan rinciannya dengan sertifikat aslinya sebelum mengonfirmasi.',
  'compliance.queue.field.issuer': 'Diterbitkan oleh',
  'compliance.queue.field.dates': 'Berlaku',
  'compliance.queue.field.scope': 'Mencakup',
  'compliance.queue.field.declared': 'Dinyatakan',
  'compliance.queue.declaredBy.unattributed': 'oleh pemasok (tanpa nama perorangan)',
  'compliance.queue.noExpiry': 'tanpa masa berlaku',
  'compliance.queue.noDeclaration':
    'Baris contoh bawaan — sudah masuk tinjauan sebelum pernyataan ada, jadi tidak membawa rincian yang dinyatakan.',
  'compliance.queue.action.verify': 'Konfirmasi',
  'compliance.queue.action.reject': 'Tolak',
  'compliance.queue.action.cancel': 'Batal',
  'compliance.queue.action.confirmReject': 'Catat penolakan',
  'compliance.queue.reject.label': 'Alasan penolakan',
  'compliance.queue.reject.placeholder':
    'mis. cakupannya tidak meliputi material yang kami beli dari pemasok ini',
  'compliance.queue.reject.hint':
    'Pemasok membaca teks ini kata demi kata di halaman dokumen mereka, jadi tulislah untuk mereka.',
  'compliance.queue.toast.verified': 'Sertifikat dikonfirmasi',
  'compliance.queue.toast.rejected': 'Penolakan tercatat',
  'compliance.queue.toast.rejectedDesc':
    'Pemasok melihat alasan dan tanggalnya di halaman dokumen mereka, dan dapat menyatakan ulang.',
  'compliance.queue.toast.failed': 'Tidak tercatat',
  'compliance.certType.HALAL_BPJPH': 'Halal (BPJPH)',
  'compliance.certType.HALAL_MUI_LEGACY': 'Halal (MUI, warisan)',
  'compliance.certType.HALAL_FOREIGN': 'Halal (skema asing)',
  'compliance.certType.BPOM': 'BPOM',
  'compliance.certType.ISO': 'ISO',
  'compliance.certType.OTHER': 'Lainnya',
  // — Descriptive action labels (state-descriptive, never imperative) —
  'compliance.action.state.expired': 'Pembaruan terlambat',
  'compliance.action.state.expiring': 'Pembaruan jatuh tempo',
  'compliance.action.state.missing': 'Sertifikat belum ada',
  'compliance.action.state.underReview': 'Sedang ditinjau',
  'compliance.action.state.valid': 'Terkini',
  // — Expiry cell relative days —
  'compliance.expiry.expiredAgo': 'Kedaluwarsa {{days}} hari lalu',
  'compliance.expiry.remaining': '{{days}} hari tersisa',
  // — Remind action + toast —
  'compliance.action.remind': 'Ingatkan',
  'compliance.toast.reminderQueued': 'Pengingat diantrikan untuk {{supplier}}',
  'compliance.toast.reminderDesc': 'Simulasi — pengiriman menunggu kanal langsung.',
  // — Phase 2 integration banner —
  'compliance.phase2.title': 'Fase 2 — Integrasi Langsung:',
  'compliance.phase2.body':
    'Pelacakan kepatuhan akan terhubung ke master vendor SAP S/4HANA, API BPJPH, dan brankas dokumen pemasok. Pengingat pembaruan otomatis via WhatsApp 90 hari sebelum kedaluwarsa.',
};
