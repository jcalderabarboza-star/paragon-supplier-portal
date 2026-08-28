// BuyerRequisitions i18n fragment. Namespace: requisitions.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no reliance on the i18next plural
// resolver, matching the flat-key convention already shipped in i18n.ts).
// Canonical StatusPill children (pr.status: Draft/Approved/…) are localized
// centrally by StatusPill via statusLabel.ts and are NOT re-declared here.
// ID vocab: Purchase Requisition → Permintaan Pembelian; PO/PIR/OA/SAP/ME21N/
// Outline Agreement/VP kept as codes; priority enum literals stay EN (logic).
export const requisitionsEn: Record<string, string> = {
  // — Breadcrumb —
  'requisitions.crumb.acquire': 'ACQUIRE',
  'requisitions.crumb.requisitions': 'REQUISITIONS',
  // — Procurement flow diagram —
  'requisitions.flow.label': 'Procurement flow',
  'requisitions.flow.createPr.label': 'Create PR',
  'requisitions.flow.createPr.sub': 'Requestor',
  'requisitions.flow.approval.label': 'Approval',
  'requisitions.flow.approval.sub': 'Procurement decides',
  'requisitions.flow.sourceCheck.label': 'Source Check',
  'requisitions.flow.sourceCheck.sub': 'PIR or OA?',
  'requisitions.flow.createPo.label': 'Create PO',
  'requisitions.flow.createPo.sub': 'Source found',
  'requisitions.flow.sourcingEvent.label': 'Sourcing Event',
  'requisitions.flow.sourcingEvent.sub': 'No source',
  // — Page header —
  'requisitions.header.title': 'Purchase Requisitions',
  'requisitions.header.subtitle': 'Starting point of procurement · PR → Approval → Source check → PO or Sourcing Event.',
  // — Header actions —
  'requisitions.action.export': 'Export',
  'requisitions.action.bulkDownload': 'Bulk download',
  'requisitions.action.newPr': 'New PR',
  // — Meta line —
  'requisitions.meta.summary.one': '{{count}} requisition · last updated {{date}}',
  'requisitions.meta.summary.other': '{{count}} requisitions · last updated {{date}}',
  // — KPI cards —
  'requisitions.kpi.draft.eyebrow': 'Draft',
  'requisitions.kpi.draft.subtitle': 'Not yet submitted',
  'requisitions.kpi.pending.eyebrow': 'Pending Approval',
  'requisitions.kpi.pending.subtitle': 'Awaiting reviewer',
  'requisitions.kpi.approved.eyebrow': 'Approved',
  'requisitions.kpi.approved.subtitle': 'Cleared for sourcing',
  'requisitions.kpi.sourcing.eyebrow': 'Sourcing Event',
  'requisitions.kpi.sourcing.subtitle': 'RFQ in progress',
  'requisitions.kpi.po.eyebrow': 'PO Created',
  'requisitions.kpi.po.subtitle': 'Converted to order',
  // — Group tabs —
  'requisitions.tab.all': 'All',
  'requisitions.tab.draft': 'Draft',
  'requisitions.tab.pending': 'Pending',
  'requisitions.tab.approved': 'Approved',
  'requisitions.tab.sourcing': 'Sourcing',
  'requisitions.tab.po': 'PO Created',
  // — Search —
  'requisitions.search.placeholder': 'Search by PR number, material, requestor, or linked doc…',
  // — Table —
  'requisitions.table.col.pr': 'PR #',
  'requisitions.table.col.material': 'Material',
  'requisitions.table.col.category': 'Category',
  'requisitions.table.col.qty': 'Qty',
  'requisitions.table.col.required': 'Required',
  'requisitions.table.col.estValue': 'Est. value',
  'requisitions.table.col.requestor': 'Requestor',
  'requisitions.table.col.status': 'Status',
  'requisitions.table.col.source': 'Source',
  'requisitions.table.col.linkedDoc': 'Linked doc',
  'requisitions.table.col.actions': 'Actions',
  'requisitions.table.empty': 'No requisitions match the current filters.',
  'requisitions.source.none': 'None',
  // — S/4HANA integration footnote —
  'requisitions.footnote.title': 'S/4HANA Integration (Phase 2):',
  'requisitions.footnote.body': 'PRs will be created in S/4HANA MM. Source check queries live PIRs and Outline Agreements. Approved PRs with source auto-trigger PO via ME21N.',
  // — Empty state (no PRs) —
  'requisitions.empty.title': 'No requisitions yet',
  'requisitions.empty.subtitle': 'Purchase requisitions are a buyer-side view.',
  'requisitions.empty.message': 'PRs and their sourcing status appear here for buyer accounts.',
  // — Detail side panel —
  'requisitions.panel.title': 'PR {{number}}',
  'requisitions.panel.close': 'Close',
  // — §67 · the approval lane (the three retired affordance labels are gone:
  //   createPoDirectly / createSourcingEvent / submitForApproval named acts
  //   this surface cannot perform) —
  'requisitions.panel.approve': 'Approve',
  'requisitions.panel.approving': 'Approving…',
  'requisitions.panel.reject': 'Reject',
  'requisitions.panel.rejecting': 'Rejecting…',
  'requisitions.panel.rejectConfirm': 'Confirm rejection',
  'requisitions.panel.rejectCancel': 'Cancel',
  'requisitions.panel.rejectSection': 'Reason for rejection',
  'requisitions.panel.rejectSrLabel': 'Reason for rejecting requisition {{number}}',
  'requisitions.panel.rejectPlaceholder': 'Required — what the requester needs to change',
  'requisitions.panel.rejectNote':
    'Recorded on the requisition and shown to the requester. A rejection cannot be saved without it.',
  'requisitions.panel.rejectedBecause': 'Rejected because',
  // — §68 · the requester's side —
  'requisitions.panel.submit': 'Submit for approval',
  'requisitions.panel.submitting': 'Submitting…',
  'requisitions.panel.revise': 'Revise and return to draft',
  'requisitions.panel.revising': 'Revising…',
  'requisitions.panel.reviseConfirm': 'Save revision',
  'requisitions.panel.reviseCancel': 'Cancel',
  'requisitions.panel.reviseSection': 'What changed',
  'requisitions.panel.reviseSrLabel': 'What changed on requisition {{number}}',
  'requisitions.panel.revisePlaceholder': 'Required — what you changed in response to the rejection',
  'requisitions.panel.reviseNote':
    'Recorded on the requisition and shown to the approver when it returns. A revision cannot be saved without it.',
  'requisitions.panel.revisedBecause': 'Revised — what changed',
  'requisitions.panel.unattributed.noPerson': 'Unattributed — no person in session',
  'requisitions.panel.unattributed.idpDown': 'Unattributed — identity provider unavailable',
  'requisitions.panel.attributionNote':
    'This portal holds no person identity yet, so the decision is recorded as unattributed. The act proceeds and the record says who could not be named.',
  // ⚠️ C.3 — REPLACES `terminal.*`, WHICH HAD BECOME FALSE. It said no producer
  // was wired for sourcing; one was wired at C.2 and this string did not move.
  // What is still true is named precisely: PO conversion has no producer, and
  // `t_pr_convert` is unauthored BY RULING until F2's event seam, not by
  // omission — a PO is raised in S/4 and arrives here as a fact.
  'requisitions.panel.sourcing.title': 'Approved — ready to source',
  'requisitions.panel.sourcing.body':
    'Raising an RFQ from this requisition moves it to Sourcing Event and records the RFQ against it. Direct PO conversion is not available here: a purchase order is raised in S/4 and arrives as a fact.',
  'requisitions.panel.sourcing.cta': 'Raise sourcing event',
  'requisitions.panel.draftNote.title': 'Draft — not yet in the approval queue',
  'requisitions.panel.draftNote.body':
    'Nobody is waiting on this yet. It reaches an approver when the requester submits it.',
  'requisitions.panel.keyFacts': 'Key facts',
  'requisitions.panel.field.material': 'Material',
  'requisitions.panel.field.category': 'Category',
  'requisitions.panel.field.quantity': 'Quantity',
  'requisitions.panel.field.requiredDate': 'Required date',
  'requisitions.panel.field.estValue': 'Estimated value',
  'requisitions.panel.field.priority': 'Priority',
  'requisitions.panel.field.requestor': 'Requestor',
  'requisitions.panel.field.costCenter': 'Cost center',
  'requisitions.panel.field.approvalLevel': 'Routes to',
  // §69 — the band SAYS it is authored, because it looks computed and is not.
  'requisitions.panel.approvalLevel.authored':
    'Authored on the document — not derived from the estimated value.',
  'requisitions.panel.approvalLevel.unassigned': 'Not assigned',
  'requisitions.panel.field.approvedBy': 'Approved by',
  'requisitions.panel.field.status': 'Status',
  'requisitions.panel.source.title': 'Source of supply',
  'requisitions.panel.source.found': 'Source found',
  'requisitions.panel.source.none': 'No source',
  'requisitions.panel.source.pirExists': 'PIR exists for {{material}}.',
  'requisitions.panel.source.noPir': 'No PIR found for {{material}}. A Sourcing Event will be required.',
  'requisitions.panel.linkedDocument': 'Linked document:',
  'requisitions.panel.justification': 'Justification',
  // — Toasts —
  // ⚠️ §68 — THE CREATE TOASTS ARE NOW NAMED FOR CREATION, AND THE OLD BODY
  //   WAS THE §67 MISLABEL'S TWIN ONE LINE DOWN. It read 'Routed to Section
  //   Head for approval.' on a `t_pr_create` that mints a DRAFT and routes to
  //   nobody. §67 corrected the BUTTON and left the toast the button fires,
  //   because the sweep that found it was looking at labels.
  'requisitions.toast.created.title': '{{prNumber}} created',
  'requisitions.toast.created.desc': 'Saved as a draft. Submit it when it is ready for approval.',
  'requisitions.toast.createFailed.title': 'Requisition could not be created',
  'requisitions.toast.createFailed.desc': 'The requisition was refused — nothing was created.',
  // And these now belong to `t_pr_submit`, where they are literally true.
  'requisitions.toast.submitted.title': '{{prNumber}} submitted for approval',
  'requisitions.toast.submitted.desc': 'It is now in the approval queue and waiting on Procurement.',
  'requisitions.toast.submitFailed.title': '{{prNumber}} was not submitted',
  'requisitions.toast.revised.title': '{{prNumber}} returned to draft',
  'requisitions.toast.revised.desc': 'The note is recorded on the requisition. Submit it again when it is ready.',
  'requisitions.toast.reviseFailed.title': '{{prNumber}} was not revised',
  'requisitions.toast.approved.title': '{{prNumber}} approved',
  'requisitions.toast.approved.desc': 'Recorded against this requisition as unattributed.',
  'requisitions.toast.approveFailed.title': '{{prNumber}} was not approved',
  'requisitions.toast.rejected.title': '{{prNumber}} rejected',
  'requisitions.toast.rejected.desc': 'The reason is recorded on the requisition.',
  'requisitions.toast.rejectFailed.title': '{{prNumber}} was not rejected',
  'requisitions.toast.actionFailed.desc': 'The command was refused — nothing changed.',
  // — New PR form —
  'requisitions.new.title': 'New Purchase Requisition',
  'requisitions.new.cancel': 'Cancel',
  // ⚠️ §67 — WAS 'Submit for approval', WHICH NAMED THE WRONG VERB. This
  //   button dispatches `t_pr_create`, and `t_pr_create` mints a DRAFT
  //   (C7 :131). Nothing here reaches the approval queue — `t_pr_submit`
  //   does that, and no surface offers it. The label promised the queue
  //   while the verb produced a draft, which is the false-affordance class
  //   living in a string rather than in a handler.
  'requisitions.new.submit': 'Create requisition',
  'requisitions.new.step1.eyebrow': 'Step 1',
  'requisitions.new.step1.title': 'Material & quantity',
  'requisitions.new.step1.desc': "What's being requested?",
  'requisitions.new.field.material': 'Material / service *',
  'requisitions.new.placeholder.material': 'e.g. Niacinamide B3 USP Grade',
  'requisitions.new.field.quantity': 'Quantity *',
  'requisitions.new.placeholder.quantity': '0',
  // — CP-0 · W1 · PR-2b — New-PR quantity refusals (the ONE parse) —
  'requisitions.new.qty.hint': 'Digits only — no thousands separators (e.g. 4500)',
  'requisitions.new.qty.refused.empty':
    'Enter a quantity — a blank field is not a zero. If the answer really is none, type 0.',
  'requisitions.new.qty.refused.notNumeric':
    'That is not a quantity — type digits only, e.g. 4500.',
  'requisitions.new.qty.refused.ambiguous':
    'This can be read two ways — "4.500" means four thousand five hundred in Indonesian and four-point-five in English. Type it without separators: 4500.',
  'requisitions.new.field.uom': 'UoM',
  'requisitions.new.step2.eyebrow': 'Step 2',
  'requisitions.new.step2.title': 'Timing & cost center',
  'requisitions.new.step2.desc': 'When is it needed and who pays?',
  'requisitions.new.field.requiredDate': 'Required date *',
  'requisitions.new.field.costCenter': 'Cost center *',
  'requisitions.new.select.placeholder': 'Select…',
  'requisitions.new.field.priority': 'Priority',
  'requisitions.new.step3.eyebrow': 'Step 3',
  'requisitions.new.step3.title': 'Business justification',
  'requisitions.new.step3.desc': 'Why is this needed?',
  'requisitions.new.placeholder.justification': 'Business reason…',
  // ⚠️ §69 — WAS 'After submission this PR routes to Section Head.' That named
  //   ONE rung of a three-rung authored vocabulary, named it unconditionally,
  //   and named it on the form whose verb writes `approvalLevel: ''` — so the
  //   promise was refuted by the fixture (pr-003 carries 'VP Procurement') AND
  //   by the create path in the same sentence. Procurement IS derivable-true:
  //   `pr:approve` lives in exactly one bundle (`businessRoles.ts`).
  'requisitions.new.info': 'After submission this PR goes to Procurement for a decision. If a PIR or Outline Agreement exists, a PO is created directly. Otherwise, a Sourcing Event is initiated.',
};

export const requisitionsId: Record<string, string> = {
  // — Breadcrumb —
  'requisitions.crumb.acquire': 'PENGADAAN',
  'requisitions.crumb.requisitions': 'PERMINTAAN PEMBELIAN',
  // — Procurement flow diagram —
  'requisitions.flow.label': 'Alur pengadaan',
  'requisitions.flow.createPr.label': 'Buat PR',
  'requisitions.flow.createPr.sub': 'Pemohon',
  'requisitions.flow.approval.label': 'Persetujuan',
  'requisitions.flow.approval.sub': 'Diputuskan Pengadaan',
  'requisitions.flow.sourceCheck.label': 'Cek Sumber',
  'requisitions.flow.sourceCheck.sub': 'PIR atau OA?',
  'requisitions.flow.createPo.label': 'Buat PO',
  'requisitions.flow.createPo.sub': 'Sumber ditemukan',
  'requisitions.flow.sourcingEvent.label': 'Acara Sourcing',
  'requisitions.flow.sourcingEvent.sub': 'Tidak ada sumber',
  // — Page header —
  'requisitions.header.title': 'Permintaan Pembelian',
  'requisitions.header.subtitle': 'Titik awal pengadaan · PR → Persetujuan → Cek sumber → PO atau Acara Sourcing.',
  // — Header actions —
  'requisitions.action.export': 'Ekspor',
  'requisitions.action.bulkDownload': 'Unduh massal',
  'requisitions.action.newPr': 'PR Baru',
  // — Meta line —
  'requisitions.meta.summary.one': '{{count}} permintaan pembelian · terakhir diperbarui {{date}}',
  'requisitions.meta.summary.other': '{{count}} permintaan pembelian · terakhir diperbarui {{date}}',
  // — KPI cards —
  'requisitions.kpi.draft.eyebrow': 'Draf',
  'requisitions.kpi.draft.subtitle': 'Belum diajukan',
  'requisitions.kpi.pending.eyebrow': 'Menunggu Persetujuan',
  'requisitions.kpi.pending.subtitle': 'Menunggu peninjau',
  'requisitions.kpi.approved.eyebrow': 'Disetujui',
  'requisitions.kpi.approved.subtitle': 'Siap untuk sourcing',
  'requisitions.kpi.sourcing.eyebrow': 'Acara Sourcing',
  'requisitions.kpi.sourcing.subtitle': 'RFQ berlangsung',
  'requisitions.kpi.po.eyebrow': 'PO Dibuat',
  'requisitions.kpi.po.subtitle': 'Dikonversi ke pesanan',
  // — Group tabs —
  'requisitions.tab.all': 'Semua',
  'requisitions.tab.draft': 'Draf',
  'requisitions.tab.pending': 'Menunggu',
  'requisitions.tab.approved': 'Disetujui',
  'requisitions.tab.sourcing': 'Sourcing',
  'requisitions.tab.po': 'PO Dibuat',
  // — Search —
  'requisitions.search.placeholder': 'Cari berdasarkan nomor PR, material, pemohon, atau dok. tertaut…',
  // — Table —
  'requisitions.table.col.pr': 'No. PR',
  'requisitions.table.col.material': 'Material',
  'requisitions.table.col.category': 'Kategori',
  'requisitions.table.col.qty': 'Jml',
  'requisitions.table.col.required': 'Dibutuhkan',
  'requisitions.table.col.estValue': 'Nilai est.',
  'requisitions.table.col.requestor': 'Pemohon',
  'requisitions.table.col.status': 'Status',
  'requisitions.table.col.source': 'Sumber',
  'requisitions.table.col.linkedDoc': 'Dok. tertaut',
  'requisitions.table.col.actions': 'Tindakan',
  'requisitions.table.empty': 'Tidak ada permintaan pembelian yang cocok dengan filter saat ini.',
  'requisitions.source.none': 'Tidak ada',
  // — S/4HANA integration footnote —
  'requisitions.footnote.title': 'Integrasi S/4HANA (Fase 2):',
  'requisitions.footnote.body': 'PR akan dibuat di S/4HANA MM. Cek sumber menanyakan PIR aktif dan Outline Agreement. PR yang disetujui dengan sumber otomatis memicu PO via ME21N.',
  // — Empty state (no PRs) —
  'requisitions.empty.title': 'Belum ada permintaan pembelian',
  'requisitions.empty.subtitle': 'Permintaan pembelian adalah tampilan sisi pembeli.',
  'requisitions.empty.message': 'PR dan status sumbernya muncul di sini untuk akun pembeli.',
  // — Detail side panel —
  'requisitions.panel.title': 'PR {{number}}',
  'requisitions.panel.close': 'Tutup',
  // — §67 · jalur persetujuan —
  'requisitions.panel.approve': 'Setujui',
  'requisitions.panel.approving': 'Menyetujui…',
  'requisitions.panel.reject': 'Tolak',
  'requisitions.panel.rejecting': 'Menolak…',
  'requisitions.panel.rejectConfirm': 'Konfirmasi penolakan',
  'requisitions.panel.rejectCancel': 'Batal',
  'requisitions.panel.rejectSection': 'Alasan penolakan',
  'requisitions.panel.rejectSrLabel': 'Alasan penolakan permintaan {{number}}',
  'requisitions.panel.rejectPlaceholder': 'Wajib — apa yang perlu diubah pemohon',
  'requisitions.panel.rejectNote':
    'Dicatat pada permintaan dan ditampilkan kepada pemohon. Penolakan tidak dapat disimpan tanpa alasan ini.',
  'requisitions.panel.rejectedBecause': 'Ditolak karena',
  // — §68 · sisi pemohon —
  'requisitions.panel.submit': 'Ajukan untuk persetujuan',
  'requisitions.panel.submitting': 'Mengajukan…',
  'requisitions.panel.revise': 'Revisi dan kembalikan ke draf',
  'requisitions.panel.revising': 'Merevisi…',
  'requisitions.panel.reviseConfirm': 'Simpan revisi',
  'requisitions.panel.reviseCancel': 'Batal',
  'requisitions.panel.reviseSection': 'Apa yang berubah',
  'requisitions.panel.reviseSrLabel': 'Apa yang berubah pada permintaan {{number}}',
  'requisitions.panel.revisePlaceholder': 'Wajib — apa yang Anda ubah menanggapi penolakan',
  'requisitions.panel.reviseNote':
    'Dicatat pada permintaan dan ditampilkan kepada penyetuju saat kembali. Revisi tidak dapat disimpan tanpa ini.',
  'requisitions.panel.revisedBecause': 'Direvisi — apa yang berubah',
  'requisitions.panel.unattributed.noPerson': 'Tanpa atribusi — tidak ada orang dalam sesi',
  'requisitions.panel.unattributed.idpDown': 'Tanpa atribusi — penyedia identitas tidak tersedia',
  'requisitions.panel.attributionNote':
    'Portal ini belum memiliki identitas orang, sehingga keputusan dicatat tanpa atribusi. Tindakan tetap berjalan dan catatannya menyatakan siapa yang tidak dapat disebutkan.',
  'requisitions.panel.sourcing.title': 'Disetujui — siap disourcing',
  'requisitions.panel.sourcing.body':
    'Mengajukan RFQ dari permintaan ini memindahkannya ke Acara Sourcing dan mencatat RFQ tersebut padanya. Konversi PO langsung tidak tersedia di sini: pesanan pembelian dibuat di S/4 dan tiba sebagai fakta.',
  'requisitions.panel.sourcing.cta': 'Ajukan acara sourcing',
  'requisitions.panel.draftNote.title': 'Draf — belum masuk antrean persetujuan',
  'requisitions.panel.draftNote.body':
    'Belum ada yang menunggu ini. Permintaan sampai ke penyetuju ketika pemohon mengajukannya.',
  'requisitions.panel.keyFacts': 'Fakta utama',
  'requisitions.panel.field.material': 'Material',
  'requisitions.panel.field.category': 'Kategori',
  'requisitions.panel.field.quantity': 'Kuantitas',
  'requisitions.panel.field.requiredDate': 'Tanggal dibutuhkan',
  'requisitions.panel.field.estValue': 'Nilai perkiraan',
  'requisitions.panel.field.priority': 'Prioritas',
  'requisitions.panel.field.requestor': 'Pemohon',
  'requisitions.panel.field.costCenter': 'Pusat biaya',
  'requisitions.panel.field.approvalLevel': 'Diarahkan ke',
  'requisitions.panel.approvalLevel.authored':
    'Ditulis pada dokumen — bukan hasil perhitungan dari nilai estimasi.',
  'requisitions.panel.approvalLevel.unassigned': 'Belum ditetapkan',
  'requisitions.panel.field.approvedBy': 'Disetujui oleh',
  'requisitions.panel.field.status': 'Status',
  'requisitions.panel.source.title': 'Sumber pasokan',
  'requisitions.panel.source.found': 'Sumber ditemukan',
  'requisitions.panel.source.none': 'Tidak ada sumber',
  'requisitions.panel.source.pirExists': 'PIR tersedia untuk {{material}}.',
  'requisitions.panel.source.noPir': 'Tidak ada PIR untuk {{material}}. Acara Sourcing akan diperlukan.',
  'requisitions.panel.linkedDocument': 'Dokumen tertaut:',
  'requisitions.panel.justification': 'Justifikasi',
  // — Toasts —
  'requisitions.toast.created.title': '{{prNumber}} dibuat',
  'requisitions.toast.created.desc': 'Disimpan sebagai draf. Ajukan bila sudah siap untuk persetujuan.',
  'requisitions.toast.createFailed.title': 'Permintaan tidak dapat dibuat',
  'requisitions.toast.createFailed.desc': 'Permintaan ditolak — tidak ada yang dibuat.',
  'requisitions.toast.submitted.title': '{{prNumber}} diajukan untuk persetujuan',
  'requisitions.toast.submitted.desc': 'Sekarang berada di antrean persetujuan dan menunggu Pengadaan.',
  'requisitions.toast.submitFailed.title': '{{prNumber}} tidak diajukan',
  'requisitions.toast.revised.title': '{{prNumber}} dikembalikan ke draf',
  'requisitions.toast.revised.desc': 'Catatan tersimpan pada permintaan. Ajukan kembali bila sudah siap.',
  'requisitions.toast.reviseFailed.title': '{{prNumber}} tidak direvisi',
  'requisitions.toast.approved.title': '{{prNumber}} disetujui',
  'requisitions.toast.approved.desc': 'Dicatat pada permintaan ini tanpa atribusi.',
  'requisitions.toast.approveFailed.title': '{{prNumber}} tidak disetujui',
  'requisitions.toast.rejected.title': '{{prNumber}} ditolak',
  'requisitions.toast.rejected.desc': 'Alasannya dicatat pada permintaan.',
  'requisitions.toast.rejectFailed.title': '{{prNumber}} tidak ditolak',
  'requisitions.toast.actionFailed.desc': 'Perintah ditolak — tidak ada yang berubah.',
  // — New PR form —
  'requisitions.new.title': 'Permintaan Pembelian Baru',
  'requisitions.new.cancel': 'Batal',
  'requisitions.new.submit': 'Buat permintaan',
  'requisitions.new.step1.eyebrow': 'Langkah 1',
  'requisitions.new.step1.title': 'Material & kuantitas',
  'requisitions.new.step1.desc': 'Apa yang diminta?',
  'requisitions.new.field.material': 'Material / layanan *',
  'requisitions.new.placeholder.material': 'mis. Niacinamide B3 Grade USP',
  'requisitions.new.field.quantity': 'Kuantitas *',
  'requisitions.new.placeholder.quantity': '0',
  // — CP-0 · W1 · PR-2b — penolakan kuantitas PR baru (satu-satunya parser) —
  'requisitions.new.qty.hint': 'Angka saja — tanpa pemisah ribuan (misalnya 4500)',
  'requisitions.new.qty.refused.empty':
    'Masukkan kuantitas — kolom kosong bukan berarti nol. Jika memang tidak ada, ketik 0.',
  'requisitions.new.qty.refused.notNumeric':
    'Itu bukan kuantitas — ketik angka saja, misalnya 4500.',
  'requisitions.new.qty.refused.ambiguous':
    'Ini bisa dibaca dua cara — "4.500" berarti empat ribu lima ratus dalam bahasa Indonesia dan empat koma lima dalam bahasa Inggris. Ketik tanpa pemisah: 4500.',
  'requisitions.new.field.uom': 'Satuan',
  'requisitions.new.step2.eyebrow': 'Langkah 2',
  'requisitions.new.step2.title': 'Waktu & pusat biaya',
  'requisitions.new.step2.desc': 'Kapan dibutuhkan dan siapa yang membayar?',
  'requisitions.new.field.requiredDate': 'Tanggal dibutuhkan *',
  'requisitions.new.field.costCenter': 'Pusat biaya *',
  'requisitions.new.select.placeholder': 'Pilih…',
  'requisitions.new.field.priority': 'Prioritas',
  'requisitions.new.step3.eyebrow': 'Langkah 3',
  'requisitions.new.step3.title': 'Justifikasi bisnis',
  'requisitions.new.step3.desc': 'Mengapa ini dibutuhkan?',
  'requisitions.new.placeholder.justification': 'Alasan bisnis…',
  'requisitions.new.info': 'Setelah pengajuan, PR ini diteruskan ke tim Pengadaan untuk diputuskan. Jika PIR atau Outline Agreement tersedia, PO dibuat langsung. Jika tidak, Acara Sourcing dimulai.',
};
