// ─────────────────────────────────────────────────────────────────────────────
// PSL (Preferred Supplier List) i18n fragment — P1. Namespace: `psl.*`
// Flat dot-keys, mirrors src/lib/i18n.ts.
//
// ── ⚠️ WHAT IS DELIBERATELY *NOT* KEYED HERE ───────────────────────────────
//   · THE STATUS WORDS themselves — `Sole Source`, `Mandatory`, `Validated`,
//     `Scheduled`, `Expired`, `Not Listed`. Every StatusPill in this portal
//     localises through the CENTRAL map (`lib/statusLabel.ts` + `statusTone.ts`),
//     so re-keying them here would be the second copy that goes wrong silently
//     — and the one that goes wrong is always the copy nobody renders in the
//     locale they are testing.
//   · MATERIAL CODES. `C9 §3` makes `materialCode` contractually OPAQUE: no
//     prefix, no substring and no name rule decides anything, so a code is DATA
//     and renders verbatim in both locales (`i18n-defer`).
//   · THE JUSTIFICATION AND CAP-JUSTIFICATION PROSE, and every ledger `reason`.
//     They are authored fixture content, not chrome — the same call
//     `SupplierDocument.rejectionReason` already gets, where a buyer's reason
//     renders verbatim to the supplier.
//   · DATES, which go through `formatDate` (Asia/Jakarta).
// ─────────────────────────────────────────────────────────────────────────────

export const pslEn: Record<string, string> = {
  // — Directory column —
  'psl.col.header': 'PSL',
  'psl.cell.listings.one': '{{count}} listing',
  'psl.cell.listings.other': '{{count}} listings',
  'psl.cell.coversOne': 'Covers {{code}}',
  'psl.cell.coversMore': 'Covers {{code}} +{{count}} more',

  // — Directory filter —
  'psl.filter.label': 'PSL status',
  'psl.filter.any': 'Any PSL',
  'psl.filter.inForce': 'In force',
  'psl.filter.lapsed': 'Expired',
  'psl.filter.none': 'Not listed',

  // — Publication —
  'psl.published': 'Published',
  'psl.internal': 'Internal',
  'psl.published.on': 'Published {{date}}',
  'psl.internal.explain': 'Not yet shared with the supplier.',

  // — Profile tab / section —
  'psl.tab': 'Preferred list',
  'psl.section.title': 'Preferred Supplier List',
  'psl.section.subtitle':
    'Governance decisions about this supplier. Read-only — listings are raised and approved off-portal.',
  'psl.section.empty': 'This supplier holds no PSL listing.',
  'psl.section.emptyHint':
    'Suppliers without a listing compete normally on every sourcing event.',

  // — Listing detail —
  'psl.detail.scope': 'Scope',
  'psl.detail.validity': 'Validity',
  'psl.detail.validFrom': 'From',
  'psl.detail.validUntil': 'Until',
  'psl.detail.effectiveUntil': 'Effective until',
  'psl.detail.cap': 'Validity cap',
  'psl.detail.capDays': '{{days}} days',
  'psl.detail.capSource.LISTING_OVERRIDE': 'Override recorded for this listing',
  'psl.detail.capSource.NO_SETTING_RECORDED': 'Portal default — no cap has been set',
  'psl.detail.capSource.CEILING_BOUNDED': 'Bounded by the platform ceiling',
  'psl.detail.capJustification': 'Cap justification',
  'psl.detail.justification': 'Justification',
  'psl.detail.evidence': 'Evidence',
  'psl.detail.evidenceNone': 'No documents referenced.',
  'psl.detail.history': 'Status history',
  'psl.detail.proposedBy': 'Proposed by',
  'psl.detail.decidedBy': 'Decided by',
  'psl.detail.decidedByNone': 'Not yet decided',
  'psl.detail.capDecidedBy': 'Cap decided by',
  // ⚠️ The ONE sentence a surface must render instead of a name. C10 §5.2 /
  // D-ID-3: no typed-name attribution until session-resolved identity exists.
  'psl.actor.unattributed': 'Recorded without an identified person',

  // — Sourcing invite step —
  'psl.invite.hint': 'PSL status is shown for information. It does not restrict who you may invite.',
};

export const pslId: Record<string, string> = {
  // — Kolom direktori —
  'psl.col.header': 'PSL',
  'psl.cell.listings.one': '{{count}} pencatatan',
  'psl.cell.listings.other': '{{count}} pencatatan',
  'psl.cell.coversOne': 'Mencakup {{code}}',
  'psl.cell.coversMore': 'Mencakup {{code}} +{{count}} lainnya',

  // — Filter direktori —
  'psl.filter.label': 'Status PSL',
  'psl.filter.any': 'Semua PSL',
  'psl.filter.inForce': 'Berlaku',
  'psl.filter.lapsed': 'Kedaluwarsa',
  'psl.filter.none': 'Tidak terdaftar',

  // — Publikasi —
  'psl.published': 'Dipublikasikan',
  'psl.internal': 'Internal',
  'psl.published.on': 'Dipublikasikan {{date}}',
  'psl.internal.explain': 'Belum dibagikan kepada pemasok.',

  // — Tab / bagian profil —
  'psl.tab': 'Daftar preferensi',
  'psl.section.title': 'Daftar Pemasok Preferensi',
  'psl.section.subtitle':
    'Keputusan tata kelola mengenai pemasok ini. Hanya baca — pencatatan diajukan dan disetujui di luar portal.',
  'psl.section.empty': 'Pemasok ini tidak memiliki pencatatan PSL.',
  'psl.section.emptyHint':
    'Pemasok tanpa pencatatan bersaing secara normal pada setiap acara pengadaan.',

  // — Detail pencatatan —
  'psl.detail.scope': 'Cakupan',
  'psl.detail.validity': 'Masa berlaku',
  'psl.detail.validFrom': 'Dari',
  'psl.detail.validUntil': 'Sampai',
  'psl.detail.effectiveUntil': 'Berlaku efektif sampai',
  'psl.detail.cap': 'Batas masa berlaku',
  'psl.detail.capDays': '{{days}} hari',
  'psl.detail.capSource.LISTING_OVERRIDE': 'Pengesampingan tercatat untuk pencatatan ini',
  'psl.detail.capSource.NO_SETTING_RECORDED': 'Bawaan portal — belum ada batas yang ditetapkan',
  'psl.detail.capSource.CEILING_BOUNDED': 'Dibatasi oleh plafon platform',
  'psl.detail.capJustification': 'Justifikasi batas',
  'psl.detail.justification': 'Justifikasi',
  'psl.detail.evidence': 'Bukti',
  'psl.detail.evidenceNone': 'Tidak ada dokumen yang dirujuk.',
  'psl.detail.history': 'Riwayat status',
  'psl.detail.proposedBy': 'Diajukan oleh',
  'psl.detail.decidedBy': 'Diputuskan oleh',
  'psl.detail.decidedByNone': 'Belum diputuskan',
  'psl.detail.capDecidedBy': 'Batas diputuskan oleh',
  'psl.actor.unattributed': 'Tercatat tanpa identitas orang',

  // — Langkah undangan pengadaan —
  'psl.invite.hint':
    'Status PSL ditampilkan sebagai informasi. Ini tidak membatasi siapa yang dapat Anda undang.',
};
