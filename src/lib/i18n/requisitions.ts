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
  'requisitions.flow.approval.sub': 'Section Head / VP',
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
  'requisitions.panel.attributionNote':
    'This portal holds no person identity yet, so the decision is recorded as unattributed. The act proceeds and the record says who could not be named.',
  'requisitions.panel.terminal.title': 'Approved — this is where it stops today',
  'requisitions.panel.terminal.body':
    'Sourcing and PO conversion are declared as automatic consequences of approval, and no producer is wired for either yet. Nothing on this screen advances an approved requisition further.',
  'requisitions.panel.draftNote.title': 'Draft — not yet in the approval queue',
  'requisitions.panel.draftNote.body':
    'Requisitions reach the approval queue from the system that raised them. This screen does not submit them.',
  'requisitions.panel.keyFacts': 'Key facts',
  'requisitions.panel.field.material': 'Material',
  'requisitions.panel.field.category': 'Category',
  'requisitions.panel.field.quantity': 'Quantity',
  'requisitions.panel.field.requiredDate': 'Required date',
  'requisitions.panel.field.estValue': 'Estimated value',
  'requisitions.panel.field.priority': 'Priority',
  'requisitions.panel.field.requestor': 'Requestor',
  'requisitions.panel.field.costCenter': 'Cost center',
  'requisitions.panel.field.approver': 'Approver',
  'requisitions.panel.field.status': 'Status',
  'requisitions.panel.source.title': 'Source of supply',
  'requisitions.panel.source.found': 'Source found',
  'requisitions.panel.source.none': 'No source',
  'requisitions.panel.source.pirExists': 'PIR exists for {{material}}.',
  'requisitions.panel.source.noPir': 'No PIR found for {{material}}. A Sourcing Event will be required.',
  'requisitions.panel.linkedDocument': 'Linked document:',
  'requisitions.panel.justification': 'Justification',
  // — Toasts —
  'requisitions.toast.submitted.title': '{{prNumber}} submitted',
  'requisitions.toast.submitted.desc': 'Routed to Section Head for approval.',
  'requisitions.toast.submitFailed.title': 'Requisition could not be created',
  'requisitions.toast.submitFailed.desc': 'The requisition was rejected — nothing was created.',
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
  'requisitions.new.info': 'After submission this PR routes to Section Head. If a PIR or Outline Agreement exists, a PO is created directly. Otherwise, a Sourcing Event is initiated.',
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
  'requisitions.flow.approval.sub': 'Kepala Seksi / VP',
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
  'requisitions.panel.attributionNote':
    'Portal ini belum memiliki identitas orang, sehingga keputusan dicatat tanpa atribusi. Tindakan tetap berjalan dan catatannya menyatakan siapa yang tidak dapat disebutkan.',
  'requisitions.panel.terminal.title': 'Disetujui — sampai di sini untuk saat ini',
  'requisitions.panel.terminal.body':
    'Sourcing dan konversi PO dideklarasikan sebagai konsekuensi otomatis dari persetujuan, dan belum ada produsen yang terhubung untuk keduanya. Tidak ada yang di layar ini yang memajukan permintaan yang sudah disetujui.',
  'requisitions.panel.draftNote.title': 'Draf — belum masuk antrean persetujuan',
  'requisitions.panel.draftNote.body':
    'Permintaan masuk ke antrean persetujuan dari sistem yang menerbitkannya. Layar ini tidak mengajukannya.',
  'requisitions.panel.keyFacts': 'Fakta utama',
  'requisitions.panel.field.material': 'Material',
  'requisitions.panel.field.category': 'Kategori',
  'requisitions.panel.field.quantity': 'Kuantitas',
  'requisitions.panel.field.requiredDate': 'Tanggal dibutuhkan',
  'requisitions.panel.field.estValue': 'Nilai perkiraan',
  'requisitions.panel.field.priority': 'Prioritas',
  'requisitions.panel.field.requestor': 'Pemohon',
  'requisitions.panel.field.costCenter': 'Pusat biaya',
  'requisitions.panel.field.approver': 'Penyetuju',
  'requisitions.panel.field.status': 'Status',
  'requisitions.panel.source.title': 'Sumber pasokan',
  'requisitions.panel.source.found': 'Sumber ditemukan',
  'requisitions.panel.source.none': 'Tidak ada sumber',
  'requisitions.panel.source.pirExists': 'PIR tersedia untuk {{material}}.',
  'requisitions.panel.source.noPir': 'Tidak ada PIR untuk {{material}}. Acara Sourcing akan diperlukan.',
  'requisitions.panel.linkedDocument': 'Dokumen tertaut:',
  'requisitions.panel.justification': 'Justifikasi',
  // — Toasts —
  'requisitions.toast.submitted.title': '{{prNumber}} diajukan',
  'requisitions.toast.submitted.desc': 'Diarahkan ke Kepala Seksi untuk persetujuan.',
  'requisitions.toast.submitFailed.title': 'Permintaan tidak dapat dibuat',
  'requisitions.toast.submitFailed.desc': 'Permintaan ditolak — tidak ada yang dibuat.',
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
  'requisitions.new.info': 'Setelah pengajuan, PR ini diarahkan ke Kepala Seksi. Jika PIR atau Outline Agreement tersedia, PO dibuat langsung. Jika tidak, Acara Sourcing dimulai.',
};
