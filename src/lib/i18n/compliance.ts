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
  'compliance.toast.exporting': 'Generating compliance report PDF',
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
  'compliance.deadline.title': 'BPJPH mandatory deadline',
  'compliance.deadline.subtitle':
    'All Indonesian cosmetics must carry BPJPH halal cert by 17 Oct 2026.',
  'compliance.deadline.daysRemaining': 'days remaining',
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
  'compliance.table.remind': 'Remind',
  'compliance.table.empty': 'No certificates match the current filters.',
  // — Certificate scheme labels (derived from certType) —
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
  'compliance.toast.exporting': 'Membuat PDF laporan kepatuhan',
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
  'compliance.deadline.title': 'Tenggat wajib BPJPH',
  'compliance.deadline.subtitle':
    'Semua kosmetik Indonesia harus memiliki sertifikat halal BPJPH paling lambat 17 Okt 2026.',
  'compliance.deadline.daysRemaining': 'hari tersisa',
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
  'compliance.table.remind': 'Ingatkan',
  'compliance.table.empty': 'Tidak ada sertifikat yang cocok dengan filter saat ini.',
  // — Certificate scheme labels (derived from certType) —
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
