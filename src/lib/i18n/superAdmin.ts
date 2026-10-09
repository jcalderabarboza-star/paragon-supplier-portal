// ADM-1 · Super Admin fragment. Namespace: superAdmin.*
//
// The reason prompt, the note a document carries when a check stood aside for a
// Super Admin, and the activity view. EN+ID from birth (MARKER-I18N-HOLE-01).
//
// `superAdmin.rule.<HEAD>` names each check that can stand aside, keyed on the
// refusal head the dispatcher records. `superAdminBypass.test.ts` holds the map
// equal to the heads the policies ask the exemption for, both ways.
export const superAdminEn: Record<string, string> = {
  'superAdmin.stamp': 'Super Admin — four-eyes bypassed',

  'superAdmin.reason.title': 'Super Admin — state the reason',
  'superAdmin.reason.intro':
    'This act passes a check that refuses every other seat. It will be recorded as "Super Admin — four-eyes bypassed", with the check it passed and the reason you state here.',
  'superAdmin.reason.rules': 'Check passed',
  'superAdmin.reason.label': 'Reason (one line, required)',
  'superAdmin.reason.placeholder': 'Why this act is taken on the Super Admin exemption',
  'superAdmin.reason.confirm': 'Record the reason and continue',
  'superAdmin.reason.cancel': 'Cancel — do not take the act',
  'superAdmin.reason.limit': 'Up to {{max}} characters, on one line.',

  'superAdmin.rule.PSL_DECIDER_IS_PROPOSER': 'The person who proposed a listing may not decide it',
  'superAdmin.rule.PSL_SEAT_HOLDS_BOTH_AUTHORITIES':
    'A restrictive designation is not decided by a seat that also raises listings',
  'superAdmin.rule.MATERIALREQUEST_DECIDER_IS_REQUESTER':
    'The person who raised a material request may not decide it',
  'superAdmin.rule.INVOICE_RELEASER_IS_APPROVER':
    'The person who approved an invoice may not release its payment',
  'superAdmin.rule.SAMPLE_ACTOR_CANNOT_LOOSEN':
    'A sample identity may not loosen a governed setting',
  'superAdmin.rule.unknown': 'A check ({{rule}})',

  'superAdmin.note.line': '{{person}} · {{when}} · {{rule}}',
  'superAdmin.note.reason': 'Reason: {{reason}}',

  'superAdmin.activity.nav': 'Super Admin activity',
  'superAdmin.activity.crumb': 'SET-SA · SUPER ADMIN ACTIVITY',
  'superAdmin.activity.title': 'Super Admin activity',
  'superAdmin.activity.subtitle':
    'Every act a Super Admin took: when, what, on which document, which check stood aside and the reason stated for it.',
  'superAdmin.activity.session':
    'Read from this session’s audit trail. The trail is held in this browser until the backend’s durable audit store lands, so it starts empty after a reload.',
  'superAdmin.activity.notForSeat':
    'This view is for the Super Admin and for Compliance. This seat holds neither role.',
  'superAdmin.activity.filter.all': 'All acts',
  'superAdmin.activity.filter.bypassed': 'Passed a check',
  'superAdmin.activity.filter.refused': 'Refused',
  'superAdmin.activity.search': 'Search by action, document, check or reason',
  'superAdmin.activity.col.when': 'When',
  'superAdmin.activity.col.who': 'Who',
  'superAdmin.activity.col.what': 'What',
  'superAdmin.activity.col.document': 'Document',
  'superAdmin.activity.col.rule': 'Check passed',
  'superAdmin.activity.col.reason': 'Reason',
  'superAdmin.activity.none': 'No check was passed',
  'superAdmin.activity.noDocument': 'No document',
  'superAdmin.activity.refused': 'Refused',
  'superAdmin.activity.refusedNoReason': 'Refused — a check would have been passed and no reason was stated',
  'superAdmin.activity.empty': 'No Super Admin act is recorded in this session.',
  'superAdmin.activity.emptyFiltered': 'No recorded act matches this filter.',
  'superAdmin.activity.count_one': '{{count}} act',
  'superAdmin.activity.count_other': '{{count}} acts',
};

export const superAdminId: Record<string, string> = {
  'superAdmin.stamp': 'Super Admin — empat-mata dilewati',

  'superAdmin.reason.title': 'Super Admin — nyatakan alasannya',
  'superAdmin.reason.intro':
    'Tindakan ini melewati pemeriksaan yang menolak setiap kursi lain. Tindakan akan dicatat sebagai "Super Admin — empat-mata dilewati", beserta pemeriksaan yang dilewati dan alasan yang Anda nyatakan di sini.',
  'superAdmin.reason.rules': 'Pemeriksaan yang dilewati',
  'superAdmin.reason.label': 'Alasan (satu baris, wajib)',
  'superAdmin.reason.placeholder': 'Mengapa tindakan ini diambil dengan pengecualian Super Admin',
  'superAdmin.reason.confirm': 'Catat alasan dan lanjutkan',
  'superAdmin.reason.cancel': 'Batal — jangan ambil tindakan',
  'superAdmin.reason.limit': 'Hingga {{max}} karakter, dalam satu baris.',

  'superAdmin.rule.PSL_DECIDER_IS_PROPOSER':
    'Orang yang mengusulkan pencantuman tidak boleh memutuskannya',
  'superAdmin.rule.PSL_SEAT_HOLDS_BOTH_AUTHORITIES':
    'Penetapan yang membatasi tidak diputuskan oleh kursi yang juga mengajukan pencantuman',
  'superAdmin.rule.MATERIALREQUEST_DECIDER_IS_REQUESTER':
    'Orang yang mengajukan permintaan material tidak boleh memutuskannya',
  'superAdmin.rule.INVOICE_RELEASER_IS_APPROVER':
    'Orang yang menyetujui faktur tidak boleh merilis pembayarannya',
  'superAdmin.rule.SAMPLE_ACTOR_CANNOT_LOOSEN':
    'Identitas contoh tidak boleh melonggarkan pengaturan yang diatur',
  'superAdmin.rule.unknown': 'Sebuah pemeriksaan ({{rule}})',

  'superAdmin.note.line': '{{person}} · {{when}} · {{rule}}',
  'superAdmin.note.reason': 'Alasan: {{reason}}',

  'superAdmin.activity.nav': 'Aktivitas Super Admin',
  'superAdmin.activity.crumb': 'SET-SA · AKTIVITAS SUPER ADMIN',
  'superAdmin.activity.title': 'Aktivitas Super Admin',
  'superAdmin.activity.subtitle':
    'Setiap tindakan yang diambil Super Admin: kapan, apa, pada dokumen mana, pemeriksaan mana yang dilewati, dan alasan yang dinyatakan.',
  'superAdmin.activity.session':
    'Dibaca dari jejak audit sesi ini. Jejak disimpan di peramban ini sampai penyimpanan audit permanen di backend tersedia, sehingga kosong kembali setelah muat ulang.',
  'superAdmin.activity.notForSeat':
    'Tampilan ini untuk Super Admin dan Kepatuhan. Kursi ini tidak memegang keduanya.',
  'superAdmin.activity.filter.all': 'Semua tindakan',
  'superAdmin.activity.filter.bypassed': 'Melewati pemeriksaan',
  'superAdmin.activity.filter.refused': 'Ditolak',
  'superAdmin.activity.search': 'Cari menurut tindakan, dokumen, pemeriksaan, atau alasan',
  'superAdmin.activity.col.when': 'Kapan',
  'superAdmin.activity.col.who': 'Siapa',
  'superAdmin.activity.col.what': 'Apa',
  'superAdmin.activity.col.document': 'Dokumen',
  'superAdmin.activity.col.rule': 'Pemeriksaan yang dilewati',
  'superAdmin.activity.col.reason': 'Alasan',
  'superAdmin.activity.none': 'Tidak ada pemeriksaan yang dilewati',
  'superAdmin.activity.noDocument': 'Tanpa dokumen',
  'superAdmin.activity.refused': 'Ditolak',
  'superAdmin.activity.refusedNoReason': 'Ditolak — sebuah pemeriksaan akan dilewati dan alasannya tidak dinyatakan',
  'superAdmin.activity.empty': 'Belum ada tindakan Super Admin yang tercatat di sesi ini.',
  'superAdmin.activity.emptyFiltered': 'Tidak ada tindakan tercatat yang cocok dengan filter ini.',
  'superAdmin.activity.count_other': '{{count}} tindakan',
};
