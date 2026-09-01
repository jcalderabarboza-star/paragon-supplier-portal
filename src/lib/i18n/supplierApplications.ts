// BuyerSupplierApplications i18n fragment (B2). Namespace: applications.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
//
// Canonical StatusPill children (the four supplierApplication states) are
// localized centrally by StatusPill via statusLabel.ts and are NOT re-declared
// here — the same rule the requisitions fragment ships under.
//
// ID vocab: application → aplikasi (the register wizard's own word, kept so the
// two surfaces name the same object); applicant → pemohon; review → tinjau.
export const supplierApplicationsEn: Record<string, string> = {
  'applications.crumb.acquire': 'ACQUIRE',
  'applications.crumb.applications': 'Supplier Applications',
  'applications.title': 'Supplier Applications',
  'applications.subtitle':
    'Companies that have asked to supply Paragon, and where each one stands.',

  // — The honest note. This lane dispatches, and it is still not a live intake. —
  'applications.meta.note':
    'Every application here was raised through the platform’s own verbs. None arrived from outside: the registration form does not yet reach this queue.',

  // — KPI tiles —
  'applications.kpi.waiting': 'Waiting to be picked up',
  'applications.kpi.inReview': 'Being reviewed',
  'applications.kpi.decided': 'Decided',

  // — Tabs —
  'applications.tab.all': 'All',
  'applications.tab.waiting': 'Waiting',
  'applications.tab.inReview': 'In review',
  'applications.tab.decided': 'Decided',

  // — Table —
  'applications.col.number': 'Application',
  'applications.col.company': 'Company',
  'applications.col.type': 'Request type',
  'applications.col.declared': 'Declared',
  'applications.col.submitted': 'Raised',
  'applications.col.status': 'Status',
  'applications.search.placeholder': 'Search company or application number…',
  'applications.declared.none': 'Nothing declared',
  'applications.declared.count.one': '{{count}} document',
  'applications.declared.count.other': '{{count}} documents',

  // — Four honest states —
  'applications.empty.title': 'No applications',
  'applications.empty.body':
    'Nobody has applied. When the registration form reaches this queue, applications will appear here.',
  'applications.empty.filtered.title': 'Nothing matches',
  'applications.empty.filtered.body': 'No application matches this filter.',
  'applications.error.title': 'Applications did not load',

  // — Panel —
  'applications.panel.title': 'Application {{number}}',
  'applications.panel.section.applicant': 'Applicant',
  'applications.panel.section.declared': 'Declared documents',
  'applications.panel.section.decision': 'Decision',
  'applications.panel.field.company': 'Company',
  'applications.panel.field.type': 'Request type',
  'applications.panel.field.vendor': 'Existing vendor',
  'applications.panel.field.submitted': 'Raised',
  'applications.panel.field.submittedBy': 'Raised by',
  'applications.panel.field.reviewStarted': 'Picked up',
  'applications.panel.field.decidedAt': 'Decided',
  'applications.panel.field.decidedBy': 'Decided by',
  'applications.panel.field.reason': 'Reason given',
  'applications.panel.declared.empty': 'The applicant declared no documents.',
  // The one sentence that keeps this lane from over-claiming.
  'applications.panel.declared.note':
    'These are the applicant’s own statements. Nothing here has been verified — a certificate is checked in the supplier-document lane, not here.',
  'applications.panel.notStated': 'Not stated',
  // ⚠️ WHICH failure to resolve, never a bare "unknown" — the reason is the part
  // somebody can act on. Today every recorded act reads the first of these.
  'applications.attribution.noPerson': 'Unattributed — no person in session',
  'applications.attribution.idpDown': 'Unattributed — identity provider unavailable',

  // — Acts —
  'applications.action.startReview': 'Start review',
  'applications.action.approve': 'Approve',
  'applications.action.reject': 'Reject',
  'applications.action.cancel': 'Cancel',

  // — Confirm-before-commit —
  'applications.confirm.approve.title': 'Approve this applicant?',
  'applications.confirm.approve.body':
    'This records the decision for {{company}}. It cannot be undone, and it creates no supplier record — the vendor master is raised in S/4HANA.',
  'applications.confirm.approve.commit': 'Yes, approve',
  'applications.confirm.reject.title': 'Refuse this applicant?',
  'applications.confirm.reject.body':
    'This records the decision for {{company}} and cannot be undone. Say why in words somebody could repeat to the applicant.',
  'applications.confirm.reject.reasonLabel': 'Reason',
  'applications.confirm.reject.reasonPlaceholder':
    'e.g. no NIB on file, and the tax id does not match the legal name.',
  'applications.confirm.reject.reasonHint':
    'The applicant holds no seat here, so this text is the only account of the decision that will exist.',
  'applications.confirm.reject.commit': 'Yes, refuse',

  // — Toasts —
  'applications.toast.reviewStarted.title': 'Review started on {{number}}',
  'applications.toast.reviewStarted.desc': 'It is now on your pile rather than the queue.',
  'applications.toast.reviewFailed.title': 'Could not start the review on {{number}}',
  'applications.toast.approved.title': '{{number}} approved',
  'applications.toast.approved.desc': 'The decision is recorded. No supplier record was created.',
  'applications.toast.approveFailed.title': 'Could not approve {{number}}',
  'applications.toast.rejected.title': '{{number}} refused',
  'applications.toast.rejected.desc': 'The decision and its reason are recorded.',
  'applications.toast.rejectFailed.title': 'Could not refuse {{number}}',
  'applications.toast.actionFailed.desc': 'The command was refused. Nothing changed.',
};

export const supplierApplicationsId: Record<string, string> = {
  'applications.crumb.acquire': 'AKUISISI',
  'applications.crumb.applications': 'Aplikasi Pemasok',
  'applications.title': 'Aplikasi Pemasok',
  'applications.subtitle':
    'Perusahaan yang meminta menjadi pemasok Paragon, dan posisi masing-masing.',

  'applications.meta.note':
    'Setiap aplikasi di sini diajukan melalui tindakan platform sendiri. Tidak ada yang datang dari luar: formulir pendaftaran belum sampai ke antrean ini.',

  'applications.kpi.waiting': 'Menunggu diambil',
  'applications.kpi.inReview': 'Sedang ditinjau',
  'applications.kpi.decided': 'Sudah diputuskan',

  'applications.tab.all': 'Semua',
  'applications.tab.waiting': 'Menunggu',
  'applications.tab.inReview': 'Ditinjau',
  'applications.tab.decided': 'Diputuskan',

  'applications.col.number': 'Aplikasi',
  'applications.col.company': 'Perusahaan',
  'applications.col.type': 'Jenis permintaan',
  'applications.col.declared': 'Dinyatakan',
  'applications.col.submitted': 'Diajukan',
  'applications.col.status': 'Status',
  'applications.search.placeholder': 'Cari perusahaan atau nomor aplikasi…',
  'applications.declared.none': 'Tidak ada yang dinyatakan',
  'applications.declared.count.one': '{{count}} dokumen',
  'applications.declared.count.other': '{{count}} dokumen',

  'applications.empty.title': 'Belum ada aplikasi',
  'applications.empty.body':
    'Belum ada yang mengajukan. Ketika formulir pendaftaran sampai ke antrean ini, aplikasi akan muncul di sini.',
  'applications.empty.filtered.title': 'Tidak ada yang cocok',
  'applications.empty.filtered.body': 'Tidak ada aplikasi yang cocok dengan filter ini.',
  'applications.error.title': 'Aplikasi gagal dimuat',

  'applications.panel.title': 'Aplikasi {{number}}',
  'applications.panel.section.applicant': 'Pemohon',
  'applications.panel.section.declared': 'Dokumen yang dinyatakan',
  'applications.panel.section.decision': 'Keputusan',
  'applications.panel.field.company': 'Perusahaan',
  'applications.panel.field.type': 'Jenis permintaan',
  'applications.panel.field.vendor': 'Vendor yang sudah ada',
  'applications.panel.field.submitted': 'Diajukan',
  'applications.panel.field.submittedBy': 'Diajukan oleh',
  'applications.panel.field.reviewStarted': 'Diambil',
  'applications.panel.field.decidedAt': 'Diputuskan',
  'applications.panel.field.decidedBy': 'Diputuskan oleh',
  'applications.panel.field.reason': 'Alasan yang diberikan',
  'applications.panel.declared.empty': 'Pemohon tidak menyatakan dokumen apa pun.',
  'applications.panel.declared.note':
    'Ini adalah pernyataan pemohon sendiri. Tidak ada yang sudah diverifikasi — sertifikat diperiksa di jalur dokumen pemasok, bukan di sini.',
  'applications.panel.notStated': 'Tidak dinyatakan',
  'applications.attribution.noPerson': 'Tanpa atribusi — tidak ada orang dalam sesi',
  'applications.attribution.idpDown': 'Tanpa atribusi — penyedia identitas tidak tersedia',

  'applications.action.startReview': 'Mulai tinjau',
  'applications.action.approve': 'Setujui',
  'applications.action.reject': 'Tolak',
  'applications.action.cancel': 'Batal',

  'applications.confirm.approve.title': 'Setujui pemohon ini?',
  'applications.confirm.approve.body':
    'Ini mencatat keputusan untuk {{company}}. Tidak dapat dibatalkan, dan tidak membuat catatan pemasok — data induk vendor diterbitkan di S/4HANA.',
  'applications.confirm.approve.commit': 'Ya, setujui',
  'applications.confirm.reject.title': 'Tolak pemohon ini?',
  'applications.confirm.reject.body':
    'Ini mencatat keputusan untuk {{company}} dan tidak dapat dibatalkan. Nyatakan alasannya dengan kata-kata yang bisa diteruskan kepada pemohon.',
  'applications.confirm.reject.reasonLabel': 'Alasan',
  'applications.confirm.reject.reasonPlaceholder':
    'mis. NIB tidak ada, dan NPWP tidak cocok dengan nama badan hukum.',
  'applications.confirm.reject.reasonHint':
    'Pemohon tidak punya kursi di sini, sehingga teks ini adalah satu-satunya keterangan atas keputusan tersebut.',
  'applications.confirm.reject.commit': 'Ya, tolak',

  'applications.toast.reviewStarted.title': 'Tinjauan {{number}} dimulai',
  'applications.toast.reviewStarted.desc': 'Kini ada di meja Anda, bukan di antrean.',
  'applications.toast.reviewFailed.title': 'Tidak dapat memulai tinjauan {{number}}',
  'applications.toast.approved.title': '{{number}} disetujui',
  'applications.toast.approved.desc':
    'Keputusan tercatat. Tidak ada catatan pemasok yang dibuat.',
  'applications.toast.approveFailed.title': 'Tidak dapat menyetujui {{number}}',
  'applications.toast.rejected.title': '{{number}} ditolak',
  'applications.toast.rejected.desc': 'Keputusan dan alasannya tercatat.',
  'applications.toast.rejectFailed.title': 'Tidak dapat menolak {{number}}',
  'applications.toast.actionFailed.desc': 'Perintah ditolak. Tidak ada yang berubah.',
};
