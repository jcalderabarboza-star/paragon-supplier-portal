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
  // ⚠️ **THE OLD SENTENCE WENT FALSE THE MOMENT P3 LANDED AND IS REPLACED
  // RATHER THAN SOFTENED.** It read *"Read-only — listings are raised and
  // approved off-portal."* Listings are now raised, decided, re-designated,
  // renewed, published and capped IN this portal, and a subtitle telling a
  // buyer otherwise would send them looking for a process that no longer
  // exists. The replacement says what the section is and what the seat can do
  // here, which is what the old one was doing for a tree with no verbs.
  'psl.section.subtitle':
    'Governance decisions about this supplier. Listed designations are managed here; new listings are raised on the Preferred suppliers queue.',
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
  // ⚠️ PORTAL_DEFAULT WAS MISSING IN BOTH LOCALES UNTIL P4, AND NOTHING
  // COULD SEE IT. The consumer is a TEMPLATE key — `PslListingsSection.tsx`
  // renders t(`psl.detail.capSource.${cap.source}`) — so neither `tsc` nor
  // `GlossaryOf<PslCapSource>`'s exhaustiveness check reaches it, and the arm
  // is LIVE: the moment `t_psl_cap_set` records a portal default, every
  // listing without its own override returns this source.
  // `pslCapSourceCopy.guard.test.ts` now derives the members from the union.
  'psl.detail.capSource.PORTAL_DEFAULT': 'Portal default — a cap has been set',
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
  //
  // ⚠️ **THE HINT CHANGED AT P2 AND THE OLD ONE WAS A LIE THE MOMENT THE GATE
  // LANDED.** It read *"It does not restrict who you may invite."* — whose
  // first clause is still true and whose second became false: PSL standing now
  // decides whether the event needs competitive bidding at all. The first
  // clause is KEPT, because a status chip beside a checkbox reads as a
  // constraint unless the surface says otherwise, and it still is not one.
  'psl.invite.hint':
    'PSL status does not restrict who you may invite. It decides whether this event needs competitive bidding.',

  // — The sourcing gate (P2) —
  'psl.gate.notRequired':
    'Competitive bidding is not required: {{supplier}} holds a {{status}} listing for {{code, stop}}.',
  'psl.gate.atFloor':
    'Two eligible suppliers invited. Three is the standard for a competitive event.',
  'psl.gate.underFloor':
    'A competitive event needs at least {{floor}} eligible suppliers invited. This one has {{count, stop}}.',
  'psl.gate.ineligible':
    '{{supplier}} is {{status}} and may not be invited to a sourcing event. Remove them to continue.',
  'psl.gate.undecidable':
    'Preferred-supplier standing could not be checked for this event: {{codes, stop}}. It will be competed as usual.',

  // — Refusal toasts, keyed to the HOOK that refused (never to the code inside
  //   its reason: the hook is what the dispatcher names and what a type can
  //   check). Each names a REMEDY — a refusal that only says no is the dead end
  //   `HALAL-REFUSAL-DEAD-ENDS-01` is filed about.
  'psl.toast.publishIneligible':
    'An invited supplier may not be invited to a sourcing event. Remove them from the invitation and publish again.',
  'psl.toast.publishUnderFloor':
    'This event does not have enough eligible suppliers to be competitive. It cannot be published as it stands.',
  'psl.toast.awardIntegrity':
    'The award does not name the supplier who submitted the winning quotation, or names one who was never invited. Nothing was recorded.',

  // ── P3 · THE QUEUE ────────────────────────────────────────────────────────
  'psl.queue.title': 'Preferred suppliers',
  'psl.queue.subtitle':
    'Proposed listings waiting on a decision, and every listing this platform holds.',
  'psl.queue.nav': 'Preferred suppliers',
  'psl.queue.tab.proposed': 'Awaiting decision',
  'psl.queue.tab.all': 'All listings',
  'psl.queue.tab.expiring': 'Expiring',
  'psl.queue.tab.expiredListed': 'Expired, still listed',
  'psl.queue.emptyExpiring': 'No listing is inside its expiry window.',
  'psl.queue.emptyExpiredListed':
    'No listing has run past its effective end date while still listed.',
  'psl.queue.empty': 'No listing is waiting on a decision.',
  'psl.queue.emptyAll': 'No supplier holds a listing yet.',
  'psl.queue.emptyHint': 'Raise one with New listing.',
  'psl.queue.col.supplier': 'Supplier',
  'psl.queue.col.scope': 'Scope',
  'psl.queue.col.status': 'Designation',
  'psl.queue.col.lifecycle': 'State',
  'psl.queue.col.validity': 'Validity',
  'psl.queue.openProfile': 'Open the supplier profile',

  // ── P3 · THE VERBS ────────────────────────────────────────────────────────
  'psl.verb.propose': 'New listing',
  'psl.verb.grant': 'Approve',
  'psl.verb.reject': 'Refuse',
  'psl.verb.changeStatus': 'Change designation',
  'psl.verb.renew': 'Renew',
  'psl.verb.withdraw': 'Withdraw',
  'psl.verb.publish': 'Share with supplier',
  'psl.verb.capOverride': 'Set a cap for this listing',
  'psl.verb.cancel': 'Cancel',

  // ── P3 · THE FORMS ────────────────────────────────────────────────────────
  'psl.form.propose.title': 'Propose a preferred-supplier listing',
  'psl.form.supplier': 'Supplier',
  'psl.form.supplier.pick': 'Choose a supplier',
  'psl.form.materialCodes': 'Material codes',
  'psl.form.materialCodes.hint': 'One or more codes from the material catalog, comma separated.',
  'psl.form.status': 'Designation',
  'psl.form.validFrom': 'Valid from',
  'psl.form.validUntil': 'Valid until',
  'psl.form.justification': 'Justification',
  'psl.form.justification.hint':
    'Why this supplier holds this designation. A Mandatory or Sole Source listing suspends competitive bidding.',
  'psl.form.reason': 'Reason',
  'psl.form.reason.hint': 'Recorded in the listing ledger. A silent change of designation is not allowed.',
  'psl.form.capDays': 'Cap, in days',
  'psl.form.capJustification': 'Why this listing runs to a different cap',
  'psl.form.newValidUntil': 'New end date',
  'psl.form.evidence': 'Evidence references',
  'psl.form.evidence.hint': 'Supplier document ids, comma separated. Optional.',

  // ── P3 · WHAT THE SURFACE SAYS BEFORE THE ACT ─────────────────────────────
  //
  // ⚠️ The unattributed notice is rendered BEFORE a decision, not after it.
  // Every act below is recorded against `UNATTRIBUTED: NO_PERSON_IN_SESSION`,
  // and a person should know that before they commit, not discover it in a
  // ledger afterwards — `t_role_grant`'s surface makes the same call.
  'psl.notice.unattributed':
    'This decision will be recorded without an identified person. Paragon has no signed-in identity yet.',
  // ⚠️ THE SEAT-SEGREGATION MIRROR (`pslLeadCheck.ts`). It asks the SAME pure
  // function the policy hook asks, so the panel cannot promise what the
  // dispatcher will refuse. It deliberately does not say "Lead": there is no
  // Lead role in this platform and inventing one in copy would be worse than
  // the gap it papers over.
  'psl.notice.seatHoldsBoth':
    'A {{status}} designation suspends competitive bidding, so it cannot be decided by a seat that also raises listings. Narrow this seat to the deciding lane on the identity panel, or route the decision to somebody who holds it.',
  'psl.notice.published': 'Shared with the supplier on {{date, stop}}. Later changes reach them without sharing again.',
  'psl.notice.notPublished': 'This listing has not been shared with the supplier.',

  // ── P3 · OUTCOMES ─────────────────────────────────────────────────────────
  'psl.toast.proposed': 'Listing {{id}} raised for {{supplier, stop}}. It is waiting on a decision.',
  'psl.toast.granted': 'Listing {{id}} approved. It is now in force for its validity.',
  'psl.toast.rejected': 'Listing {{id}} refused. A later attempt is a new listing.',
  'psl.toast.statusChanged': 'Listing {{id}} is now {{status, stop}}.',
  'psl.toast.renewed': 'Listing {{id}} now runs to {{date, stop}}.',
  'psl.toast.withdrawn': 'Listing {{id}} withdrawn. It grants nothing from now on.',
  'psl.toast.published': 'Listing {{id}} shared with the supplier.',
  'psl.toast.capSet': 'A {{days}}-day cap is recorded for listing {{id, stop}}.',

  // ── P3 · REFUSALS, KEYED TO THE HOOK THAT REFUSED ─────────────────────────
  //
  // Keyed to the HOOK, never to a code inside its reason: the hook is what the
  // dispatcher names and what a type can check. Each names a REMEDY — a
  // refusal that only says no is the dead end `HALAL-REFUSAL-DEAD-ENDS-01` is
  // filed about.
  'psl.refusal.supplierUnknown':
    'That supplier is not on the roster. Pick the supplier from the directory rather than typing an id.',
  'psl.refusal.scopeEmpty':
    'A listing must name at least one material code. Add the materials this designation covers.',
  'psl.refusal.scopeUnknownCode':
    'One or more of those codes is not a material this platform carries. Pick them from the material catalog, or raise a material request for one that does not exist yet.',
  'psl.refusal.statusUnknown':
    'That is not a designation this platform recognises.',
  'psl.refusal.validityInverted':
    'The designation would end before it begins. Correct the dates.',
  'psl.refusal.validityUnreadable':
    'The validity dates must both be real days. Enter them as calendar dates.',
  'psl.refusal.justificationBlank':
    'A listing needs a written justification — it is the one sentence that says why this supplier holds a designation that may suspend competitive bidding.',
  'psl.refusal.decisionBlank':
    'Every entry in a listing ledger carries a reason. Write the reason, then act again.',
  'psl.refusal.deciderIsProposer':
    'Whoever proposed this listing may not also decide it. Route it to somebody else.',
  'psl.refusal.seatHoldsBoth':
    'This seat both raises and decides listings, so it cannot approve a designation that suspends competitive bidding. Narrow the seat on the identity panel.',
  'psl.refusal.statusUnchanged':
    'This listing already carries that designation. Pick a different one, or leave it as it stands.',
  'psl.refusal.renewalDoesNotExtend':
    'A renewal moves the end date later. To shorten a validity, record a cap override with its justification instead.',
  'psl.refusal.renewalExceedsCap':
    'That end date is beyond the validity cap in force. Record a cap override with its justification first, or renew to a date within the cap.',
  'psl.refusal.alreadyPublished':
    'This listing has already been shared with the supplier, and the date it was shared is not overwritten. Changes to the designation reach them without sharing again.',
  'psl.refusal.capAboveCeiling':
    'That cap exceeds the platform ceiling of {{ceiling}} days. Record a cap within the ceiling, or take the longer term to whoever can move the ceiling.',
  'psl.refusal.capNotADuration':
    'A validity cap is a whole number of days greater than zero.',
  'psl.refusal.capJustificationBlank':
    'An override with no justification is an unexplained exception. Write why this listing runs to a different cap from every other one.',

  // ── P4 · WHAT THE SUPPLIER READS ON /supplier/performance ─────────────
  //
  // ⚠️ **PROSE ONLY. NOT ONE STATUS WORD IS RE-KEYED HERE.** `Sole Source`,
  // `Mandatory`, `Validated`, `Listed`, `Expiring`, `Expired`, `Withdrawn`,
  // `Scheduled`, `Proposed` and `Rejected` all already resolve through
  // `statusLabel.ts` in BOTH locales with tones from `statusTone.ts` — measured
  // before a word was written. A second vocabulary here is how one axis ends up
  // with two sets of words that drift.
  //
  // ⚠️ **THE COPY NEVER PROMISES AN ACT.** There is no supplier verb in the
  // PSL machine — not one — so a sentence inviting the supplier to renew,
  // appeal or respond would be a false affordance in the COPY, which is the one
  // place a handler-based census is blind to (`label-names-wrong-verb`).
  'psl.supplier.title': 'Your preferred-supplier standing',
  'psl.supplier.subtitle':
    'How Paragon procurement has designated you, for which materials, and until when. This page is private to you.',
  'psl.supplier.empty':
    'Paragon has not shared a preferred-supplier designation with you.',
  'psl.supplier.emptyHint':
    'Designations are decided by the procurement team. Nothing is required from you here.',
  'psl.supplier.scope': 'Applies to',
  'psl.supplier.from': 'In effect from',
  'psl.supplier.until': 'Until',
  'psl.supplier.sharedOn': 'Shared with you on {{date}}',
  'psl.supplier.noEnd': 'No end date recorded',
  // R-D · two distinct sentences. "Never qualified" and "qualified, and the
  // qualification lapsed" are different facts and only the second implies an
  // act somebody failed to take — `bestPslStatus`'s own rule, on the surface.
  'psl.supplier.expiredLine': 'This designation ran until {{date, stop}}.',
  'psl.supplier.withdrawnLine':
    'This designation was withdrawn on {{date}} and no longer applies.',
  // R-F · the lapse line. States the date; asks for nothing.
  'psl.supplier.expiringLine':
    'Your preferred-supplier status for {{codes}} lapses on {{date, stop}}.',
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
    'Keputusan tata kelola mengenai pemasok ini. Penetapan yang terdaftar dikelola di sini; pencatatan baru diajukan pada antrean Pemasok preferensi.',
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
  'psl.detail.capSource.PORTAL_DEFAULT':
    'Bawaan portal — batas telah ditetapkan',
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
    'Status PSL tidak membatasi siapa yang dapat Anda undang. Status ini menentukan apakah acara ini memerlukan tender kompetitif.',

  // — Gerbang pengadaan (P2) —
  'psl.gate.notRequired':
    'Tender kompetitif tidak diperlukan: {{supplier}} memiliki daftar {{status}} untuk {{code, stop}}.',
  'psl.gate.atFloor':
    'Dua pemasok yang memenuhi syarat diundang. Tiga adalah standar untuk acara kompetitif.',
  'psl.gate.underFloor':
    'Acara kompetitif memerlukan setidaknya {{floor}} pemasok yang memenuhi syarat. Acara ini memiliki {{count, stop}}.',
  'psl.gate.ineligible':
    '{{supplier}} berstatus {{status}} dan tidak boleh diundang ke acara pengadaan. Keluarkan mereka untuk melanjutkan.',
  'psl.gate.undecidable':
    'Status pemasok pilihan tidak dapat diperiksa untuk acara ini: {{codes, stop}}. Acara akan ditenderkan seperti biasa.',

  // — Toast penolakan, dikunci ke HOOK yang menolak —
  'psl.toast.publishIneligible':
    'Salah satu pemasok yang diundang tidak boleh diundang ke acara pengadaan. Keluarkan mereka dari undangan lalu terbitkan lagi.',
  'psl.toast.publishUnderFloor':
    'Acara ini tidak memiliki cukup pemasok yang memenuhi syarat untuk bersaing. Acara tidak dapat diterbitkan seperti sekarang.',
  'psl.toast.awardIntegrity':
    'Penghargaan tidak menyebut pemasok yang mengajukan penawaran pemenang, atau menyebut pemasok yang tidak pernah diundang. Tidak ada yang dicatat.',

  // ── P3 · Antrean ──────────────────────────────────────────────────────────
  'psl.queue.title': 'Pemasok preferensi',
  'psl.queue.subtitle':
    'Pencatatan yang diajukan dan menunggu keputusan, serta seluruh pencatatan yang dimiliki platform ini.',
  'psl.queue.nav': 'Pemasok preferensi',
  'psl.queue.tab.proposed': 'Menunggu keputusan',
  'psl.queue.tab.all': 'Semua pencatatan',
  'psl.queue.tab.expiring': 'Akan kedaluwarsa',
  'psl.queue.tab.expiredListed': 'Kedaluwarsa, masih terdaftar',
  'psl.queue.emptyExpiring': 'Tidak ada pencatatan yang berada dalam jendela kedaluwarsa.',
  'psl.queue.emptyExpiredListed':
    'Tidak ada pencatatan yang melewati tanggal berakhir efektifnya selagi masih terdaftar.',
  'psl.queue.empty': 'Tidak ada pencatatan yang menunggu keputusan.',
  'psl.queue.emptyAll': 'Belum ada pemasok yang memiliki pencatatan.',
  'psl.queue.emptyHint': 'Ajukan satu melalui Pencatatan baru.',
  'psl.queue.col.supplier': 'Pemasok',
  'psl.queue.col.scope': 'Cakupan',
  'psl.queue.col.status': 'Penetapan',
  'psl.queue.col.lifecycle': 'Keadaan',
  'psl.queue.col.validity': 'Masa berlaku',
  'psl.queue.openProfile': 'Buka profil pemasok',

  // ── P3 · Verba ────────────────────────────────────────────────────────────
  'psl.verb.propose': 'Pencatatan baru',
  'psl.verb.grant': 'Setujui',
  'psl.verb.reject': 'Tolak',
  'psl.verb.changeStatus': 'Ubah penetapan',
  'psl.verb.renew': 'Perpanjang',
  'psl.verb.withdraw': 'Tarik',
  'psl.verb.publish': 'Bagikan ke pemasok',
  'psl.verb.capOverride': 'Tetapkan batas untuk pencatatan ini',
  'psl.verb.cancel': 'Batal',

  // ── P3 · Formulir ─────────────────────────────────────────────────────────
  'psl.form.propose.title': 'Ajukan pencatatan pemasok preferensi',
  'psl.form.supplier': 'Pemasok',
  'psl.form.supplier.pick': 'Pilih pemasok',
  'psl.form.materialCodes': 'Kode material',
  'psl.form.materialCodes.hint': 'Satu atau beberapa kode dari katalog material, dipisahkan koma.',
  'psl.form.status': 'Penetapan',
  'psl.form.validFrom': 'Berlaku dari',
  'psl.form.validUntil': 'Berlaku sampai',
  'psl.form.justification': 'Justifikasi',
  'psl.form.justification.hint':
    'Mengapa pemasok ini memegang penetapan tersebut. Pencatatan Wajib atau Sumber Tunggal menangguhkan tender kompetitif.',
  'psl.form.reason': 'Alasan',
  'psl.form.reason.hint': 'Dicatat dalam riwayat pencatatan. Perubahan penetapan tanpa alasan tidak diizinkan.',
  'psl.form.capDays': 'Batas, dalam hari',
  'psl.form.capJustification': 'Mengapa pencatatan ini memakai batas yang berbeda',
  'psl.form.newValidUntil': 'Tanggal akhir baru',
  'psl.form.evidence': 'Rujukan bukti',
  'psl.form.evidence.hint': 'Id dokumen pemasok, dipisahkan koma. Opsional.',

  // ── P3 · Yang dinyatakan sebelum tindakan ────────────────────────────────
  'psl.notice.unattributed':
    'Keputusan ini akan dicatat tanpa identitas orang. Paragon belum memiliki identitas yang masuk sesi.',
  'psl.notice.seatHoldsBoth':
    'Penetapan {{status}} menangguhkan tender kompetitif, sehingga tidak dapat diputuskan oleh kursi yang juga mengajukan pencatatan. Persempit kursi ini ke jalur pemutus pada panel identitas, atau alihkan keputusan kepada pihak yang memegangnya.',
  'psl.notice.published': 'Dibagikan kepada pemasok pada {{date, stop}}. Perubahan berikutnya sampai kepada mereka tanpa dibagikan ulang.',
  'psl.notice.notPublished': 'Pencatatan ini belum dibagikan kepada pemasok.',

  // ── P3 · Hasil ────────────────────────────────────────────────────────────
  'psl.toast.proposed': 'Pencatatan {{id}} diajukan untuk {{supplier, stop}}. Menunggu keputusan.',
  'psl.toast.granted': 'Pencatatan {{id}} disetujui. Kini berlaku selama masa berlakunya.',
  'psl.toast.rejected': 'Pencatatan {{id}} ditolak. Upaya berikutnya adalah pencatatan baru.',
  'psl.toast.statusChanged': 'Pencatatan {{id}} kini berstatus {{status, stop}}.',
  'psl.toast.renewed': 'Pencatatan {{id}} kini berlaku sampai {{date, stop}}.',
  'psl.toast.withdrawn': 'Pencatatan {{id}} ditarik. Mulai sekarang tidak memberikan apa pun.',
  'psl.toast.published': 'Pencatatan {{id}} dibagikan kepada pemasok.',
  'psl.toast.capSet': 'Batas {{days}} hari tercatat untuk pencatatan {{id, stop}}.',

  // ── P3 · Penolakan, dikunci ke HOOK yang menolak ─────────────────────────
  'psl.refusal.supplierUnknown':
    'Pemasok tersebut tidak ada dalam daftar. Pilih pemasok dari direktori, jangan mengetik id.',
  'psl.refusal.scopeEmpty':
    'Pencatatan harus menyebut setidaknya satu kode material. Tambahkan material yang dicakup penetapan ini.',
  'psl.refusal.scopeUnknownCode':
    'Satu atau beberapa kode tersebut bukan material yang dibawa platform ini. Pilih dari katalog material, atau ajukan permintaan material untuk yang belum ada.',
  'psl.refusal.statusUnknown':
    'Itu bukan penetapan yang dikenali platform ini.',
  'psl.refusal.validityInverted':
    'Penetapan akan berakhir sebelum dimulai. Perbaiki tanggalnya.',
  'psl.refusal.validityUnreadable':
    'Kedua tanggal masa berlaku harus berupa hari yang nyata. Masukkan sebagai tanggal kalender.',
  'psl.refusal.justificationBlank':
    'Pencatatan memerlukan justifikasi tertulis — itulah satu kalimat yang menyatakan mengapa pemasok ini memegang penetapan yang dapat menangguhkan tender kompetitif.',
  'psl.refusal.decisionBlank':
    'Setiap entri dalam riwayat pencatatan memuat alasan. Tulis alasannya, lalu lakukan lagi.',
  'psl.refusal.deciderIsProposer':
    'Pihak yang mengajukan pencatatan ini tidak boleh ikut memutuskannya. Alihkan kepada orang lain.',
  'psl.refusal.seatHoldsBoth':
    'Kursi ini mengajukan sekaligus memutuskan pencatatan, sehingga tidak dapat menyetujui penetapan yang menangguhkan tender kompetitif. Persempit kursi pada panel identitas.',
  'psl.refusal.statusUnchanged':
    'Pencatatan ini sudah memakai penetapan tersebut. Pilih yang lain, atau biarkan seperti sekarang.',
  'psl.refusal.renewalDoesNotExtend':
    'Perpanjangan memundurkan tanggal akhir. Untuk memperpendek masa berlaku, catat pengesampingan batas beserta justifikasinya.',
  'psl.refusal.renewalExceedsCap':
    'Tanggal akhir itu melampaui batas masa berlaku yang berlaku. Catat pengesampingan batas beserta justifikasinya terlebih dahulu, atau perpanjang ke tanggal dalam batas.',
  'psl.refusal.alreadyPublished':
    'Pencatatan ini sudah dibagikan kepada pemasok, dan tanggal pembagiannya tidak ditimpa. Perubahan penetapan sampai kepada mereka tanpa dibagikan ulang.',
  'psl.refusal.capAboveCeiling':
    'Batas itu melebihi plafon platform sebesar {{ceiling}} hari. Catat batas dalam plafon, atau bawa masa yang lebih panjang kepada pihak yang dapat memindahkan plafon.',
  'psl.refusal.capNotADuration':
    'Batas masa berlaku adalah bilangan bulat hari yang lebih besar dari nol.',
  'psl.refusal.capJustificationBlank':
    'Pengesampingan tanpa justifikasi adalah pengecualian yang tidak dijelaskan. Tulis mengapa pencatatan ini memakai batas yang berbeda dari yang lain.',

  // ── P4 · yang dibaca pemasok di /supplier/performance ───────────────
  'psl.supplier.title': 'Status pemasok pilihan Anda',
  'psl.supplier.subtitle':
    'Bagaimana pengadaan Paragon menetapkan Anda, untuk material apa, dan sampai kapan. Halaman ini bersifat pribadi bagi Anda.',
  'psl.supplier.empty':
    'Paragon belum membagikan penetapan pemasok pilihan kepada Anda.',
  'psl.supplier.emptyHint':
    'Penetapan diputuskan oleh tim pengadaan. Tidak ada yang diperlukan dari Anda di sini.',
  'psl.supplier.scope': 'Berlaku untuk',
  'psl.supplier.from': 'Berlaku sejak',
  'psl.supplier.until': 'Sampai',
  'psl.supplier.sharedOn': 'Dibagikan kepada Anda pada {{date}}',
  'psl.supplier.noEnd': 'Tidak ada tanggal berakhir yang tercatat',
  'psl.supplier.expiredLine': 'Penetapan ini berlaku sampai {{date, stop}}.',
  'psl.supplier.withdrawnLine':
    'Penetapan ini ditarik pada {{date}} dan tidak lagi berlaku.',
  'psl.supplier.expiringLine':
    'Status pemasok pilihan Anda untuk {{codes}} berakhir pada {{date, stop}}.',
};
