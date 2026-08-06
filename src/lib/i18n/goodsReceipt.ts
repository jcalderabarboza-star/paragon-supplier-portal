// BuyerGoodsReceipt + GRInspectionWizard i18n fragment. Namespace: goodsReceipt.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no reliance on the i18next plural
// resolver, matching the flat-key convention already shipped in i18n.ts).
//
// SCOPE NOTE: the command/mutation toasts on both files already consume the
// seeded `gr.*` keys (i18n.ts) — those are NOT re-declared here. This fragment
// covers the static scaffolding (header, KPIs, tabs, filters, table, side panel,
// timeline, empty state) plus the GR inspection wizard's step/field labels. The
// placeholder "future release" toasts (Export / Lab Results / Submit results /
// Retest / Override hold / Opening SAP) are UI chrome, not command toasts, so
// they ARE externalized here under goodsReceipt.toast.*.
//
// Canonical StatusPill children (Posted to SAP / Pending Inspection / Under
// Inspection / Quality Hold / Approved / Rejected …) and the derived-disposition
// value are localized centrally (statusLabel.ts) and are NOT re-declared here.
// Quality-check tokens (Pass / Fail / N/A) are enum literals used as both value
// and radio label and are left verbatim.
export const goodsReceiptEn: Record<string, string> = {
  // — Breadcrumb —
  'goodsReceipt.crumb.transact': 'TRANSACT',
  'goodsReceipt.crumb.gr': 'GOODS RECEIPT & QC',
  // — Page header —
  'goodsReceipt.header.title': 'Goods Receipt & Quality Control',
  'goodsReceipt.header.subtitle': 'Receipt posting, inspection workflows, lab results, and disposition decisions.',
  // — Header actions —
  'goodsReceipt.action.export': 'Export',
  'goodsReceipt.action.labResults': 'Lab Results',
  // — Meta line (count-dependent) —
  'goodsReceipt.meta.count.one': '{{count}} GR this month',
  'goodsReceipt.meta.count.other': '{{count}} GRs this month',
  'goodsReceipt.meta.lastPosted': 'last posted',
  // — KPI cards —
  'goodsReceipt.kpi.pending.eyebrow': 'Pending Inspection',
  'goodsReceipt.kpi.pending.subtitle': 'Awaiting QC start',
  'goodsReceipt.kpi.hold.eyebrow': 'On Quality Hold',
  'goodsReceipt.kpi.hold.subtitle': 'Quarantined / retest',
  'goodsReceipt.kpi.approvedToday.eyebrow': 'Approved Today',
  'goodsReceipt.kpi.rejectionRate.eyebrow': 'Rejection Rate (30d)',
  'goodsReceipt.kpi.rejectionRate.subtitle': 'Qty rejected / received',
  // — Group tabs —
  'goodsReceipt.tab.all': 'All',
  'goodsReceipt.tab.pending': 'Pending',
  'goodsReceipt.tab.underInspection': 'Under Inspection',
  'goodsReceipt.tab.approved': 'Approved',
  'goodsReceipt.tab.hold': 'Quality Hold',
  'goodsReceipt.tab.rejected': 'Rejected',
  'goodsReceipt.tab.posted': 'Posted',
  // — Search / filters —
  'goodsReceipt.search.placeholder': 'Search by GR, ASN, PO, or supplier...',
  'goodsReceipt.filter.today': 'Today',
  'goodsReceipt.filter.week': 'This week',
  'goodsReceipt.filter.month': 'This month',
  'goodsReceipt.filter.30d': 'Last 30 days',
  'goodsReceipt.filter.all': 'All time',
  // — Main table —
  'goodsReceipt.table.col.grRefs': 'GR / Refs',
  'goodsReceipt.table.col.supplier': 'Supplier',
  'goodsReceipt.table.col.received': 'Received',
  'goodsReceipt.table.col.receivedBy': 'Received By',
  'goodsReceipt.table.col.items': 'Items',
  'goodsReceipt.table.col.status': 'Status',
  'goodsReceipt.table.col.disposition': 'Disposition',
  'goodsReceipt.table.col.sapDoc': 'SAP Doc',
  'goodsReceipt.table.empty': 'No goods receipts match the current filters.',
  // — Item count (count-dependent) —
  'goodsReceipt.items.count.one': '{{count}} item',
  'goodsReceipt.items.count.other': '{{count}} items',
  // — Side-panel footer buttons —
  'goodsReceipt.footer.startInspection': 'Start inspection',
  'goodsReceipt.footer.submitResults': 'Submit inspection results',
  'goodsReceipt.footer.requestRetest': 'Request lab retest',
  'goodsReceipt.footer.overrideHold': 'Override hold',
  'goodsReceipt.footer.viewInSap': 'View in SAP',
  // — Placeholder ("future release") toasts —
  'goodsReceipt.toast.submitResults.title': 'Inspection results',
  'goodsReceipt.toast.submitResults.desc': 'Submit form will open in a future release.',
  'goodsReceipt.toast.retest.title': 'Retest requested',
  'goodsReceipt.toast.retest.desc': 'Lab retest queued.',
  'goodsReceipt.toast.overrideHold.title': 'Hold override requested',
  'goodsReceipt.toast.overrideHold.desc': 'Awaiting QC manager approval.',
  'goodsReceipt.toast.openingSap.title': 'Opening SAP',
  'goodsReceipt.toast.openingSap.fallbackDoc': 'Material document',
  'goodsReceipt.toast.export.title': 'Export queued',
  'goodsReceipt.toast.export.desc': 'Goods receipts export will download shortly.',
  'goodsReceipt.toast.labOverview.title': 'Lab results overview',
  'goodsReceipt.toast.labOverview.desc': 'Lab dashboard will open in a future release.',
  // — Side panel: key facts —
  'goodsReceipt.panel.keyFacts': 'Key facts',
  'goodsReceipt.panel.field.gr': 'GR #',
  'goodsReceipt.panel.field.asn': 'ASN #',
  'goodsReceipt.panel.field.po': 'PO #',
  'goodsReceipt.panel.field.sapMaterialDoc': 'SAP Material Doc',
  'goodsReceipt.panel.field.supplier': 'Supplier',
  'goodsReceipt.panel.field.receivedDate': 'Received Date',
  'goodsReceipt.panel.field.receivedBy': 'Received By',
  'goodsReceipt.panel.field.status': 'Status',
  'goodsReceipt.panel.field.disposition': 'Disposition',
  // — Side panel: line items —
  'goodsReceipt.panel.lineItems': 'Line items',
  'goodsReceipt.panel.col.material': 'Material',
  'goodsReceipt.panel.col.exp': 'Exp',
  'goodsReceipt.panel.col.recv': 'Recv',
  'goodsReceipt.panel.col.acc': 'Acc',
  'goodsReceipt.panel.col.rej': 'Rej',
  'goodsReceipt.panel.col.checks': 'Checks',
  'goodsReceipt.panel.legend': 'V = Visual · P = Packaging · H = Halal Seal · B = BPOM Lot',
  // — Side panel: notes + workflow —
  'goodsReceipt.panel.inspectionNotes': 'Inspection notes',
  'goodsReceipt.panel.dispositionWorkflow': 'Disposition workflow',
  // — Disposition timeline —
  'goodsReceipt.timeline.received': 'Received',
  'goodsReceipt.timeline.inspectionStarted': 'Inspection Started',
  'goodsReceipt.timeline.labResultsReceived': 'Lab Results Received',
  'goodsReceipt.timeline.noLabRequired': 'No lab required',
  'goodsReceipt.timeline.dispositionDecision': 'Disposition Decision',
  'goodsReceipt.timeline.postedToSap': 'Posted to SAP',
  // — Wrapper empty state —
  'goodsReceipt.empty.title': 'No goods receipts yet',
  'goodsReceipt.empty.subtitle': 'No goods receipts have been posted.',
  'goodsReceipt.empty.message': 'Goods receipts and QC inspections appear here as deliveries arrive.',
  // — Wizard: chrome / steps —
  'goodsReceipt.wizard.complete': 'Create GR',
  'goodsReceipt.wizard.step.source.title': 'Source selection',
  'goodsReceipt.wizard.step.source.short': 'Source',
  'goodsReceipt.wizard.step.source.desc': 'Pick a shipment at the dock or enter PO/ASN manually.',
  'goodsReceipt.wizard.step.details.title': 'Receipt details',
  'goodsReceipt.wizard.step.details.short': 'Details',
  'goodsReceipt.wizard.step.details.desc': 'Record receipt info and per-line quantities.',
  'goodsReceipt.wizard.step.quality.title': 'Quality checks',
  'goodsReceipt.wizard.step.quality.short': 'Quality',
  'goodsReceipt.wizard.step.quality.desc': 'Visual, packaging, halal, BPOM, and lab sampling.',
  'goodsReceipt.wizard.step.disposition.title': 'Disposition & submit',
  'goodsReceipt.wizard.step.disposition.short': 'Submit',
  'goodsReceipt.wizard.step.disposition.desc': 'Confirm overall disposition and post to SAP.',
  // — Wizard: source selection (step 1) —
  'goodsReceipt.wizard.source.selectDock': 'Select inbound at dock',
  'goodsReceipt.wizard.source.enterAsn': 'Enter ASN number',
  'goodsReceipt.wizard.source.empty': 'No shipments at dock and no submitted ASNs to receive.',
  'goodsReceipt.wizard.field.asnNumber': 'ASN Number',
  'goodsReceipt.wizard.source.notFound': 'ASN not found among receivable shipments. Enter a submitted ASN (status Submitted, In Transit, or Delivered).',
  'goodsReceipt.wizard.source.readyToReceive': 'Ready to receive.',
  // — Wizard: receipt details (step 2) —
  'goodsReceipt.wizard.section.receiptInfo': 'Receipt Info',
  'goodsReceipt.wizard.field.receivedDate': 'Received Date',
  'goodsReceipt.wizard.field.receivedBy': 'Received By',
  'goodsReceipt.wizard.field.warehouseLocation': 'Warehouse Location',
  'goodsReceipt.wizard.field.notes': 'Notes',
  'goodsReceipt.wizard.placeholder.notes': 'Optional receipt context...',
  'goodsReceipt.wizard.section.lineItems': 'Line Items',
  'goodsReceipt.wizard.lines.empty': 'No line items yet. Select a source on Step 1.',
  'goodsReceipt.wizard.field.expected': 'Expected',
  'goodsReceipt.wizard.field.received': 'Received',
  'goodsReceipt.wizard.field.accepted': 'Accepted',
  'goodsReceipt.wizard.field.rejected': 'Rejected',
  'goodsReceipt.wizard.field.rejectionReason': 'Rejection Reason',
  'goodsReceipt.wizard.placeholder.rejectionReason': 'Required when any qty is rejected',
  'goodsReceipt.wizard.aria.received': 'Received quantity for {{code}}',
  'goodsReceipt.wizard.aria.accepted': 'Accepted quantity for {{code}}',
  'goodsReceipt.wizard.aria.rejectionReason': 'Rejection reason for {{code}}',
  // — Wizard: the quantity refusals (CP-0 · W1 · 2f-a) —
  // A blank is a REFUSAL here, not an absence: a receipt line with no quantity
  // is an unfinished inspection, and the line lifecycle already models that.
  // Enter 0 to state that nothing arrived — that is a real assertion and it is
  // recorded as one.
  'goodsReceipt.wizard.qty.refused.empty':
    'Enter the quantity. If nothing arrived for this line, enter 0 — that is recorded as a real receipt of none, and leaving it blank is not.',
  'goodsReceipt.wizard.qty.refused.notNumeric':
    'That is not a quantity — type digits only, e.g. 1500.',
  'goodsReceipt.wizard.qty.refused.ambiguous':
    'This can be read two ways — "1.500" means one thousand five hundred in Indonesian and one-point-five in English. Type it without separators: 1500.',
  // — Wizard: quality checks (step 3) —
  'goodsReceipt.wizard.section.qualityEyebrow': 'QUALITY CHECKS',
  'goodsReceipt.wizard.section.perLineInspection': 'Per-line inspection',
  'goodsReceipt.wizard.receivedSuffix': 'received',
  'goodsReceipt.wizard.field.visualInspection': 'Visual Inspection',
  'goodsReceipt.wizard.field.packagingIntegrity': 'Packaging Integrity',
  'goodsReceipt.wizard.field.halalSealCheck': 'Halal Seal Check',
  'goodsReceipt.wizard.field.bpomLotTracking': 'BPOM Lot Tracking',
  // CP-2 · 2B-4b — the BPOM refusal, by name. The two messages differ only in
  // which absence they name; both block the step identically.
  'goodsReceipt.wizard.bpom.refused.title': 'BPOM applicability cannot be determined.',
  'goodsReceipt.wizard.bpom.refused.unknownMaterial':
    'The material master does not name {{code}}, so whether this lot needs a BPOM lot check is unknown. This line cannot be inspected until the material is registered.',
  'goodsReceipt.wizard.bpom.refused.undetermined':
    'The material master names {{code}} but records no BPOM determination for it. This line cannot be inspected until someone rules on it.',
  'goodsReceipt.wizard.labSampleRequired': 'Lab sample required',
  'goodsReceipt.wizard.labRequestId': 'Lab Request ID:',
  // — Wizard: disposition & submit (step 4) —
  'goodsReceipt.wizard.section.finalDisposition': 'Final Disposition',
  'goodsReceipt.wizard.field.headerDisposition': 'Header Disposition (derived from lines)',
  'goodsReceipt.wizard.rollup.prefix.one': 'Rolled up from {{count}} line —',
  'goodsReceipt.wizard.rollup.prefix.other': 'Rolled up from {{count}} lines —',
  'goodsReceipt.wizard.rollup.acceptedWord': 'accepted,',
  'goodsReceipt.wizard.rollup.rejectedWord': 'rejected.',
  'goodsReceipt.wizard.rollup.notEditable': 'Not editable — the header follows the inspected quantities.',
  'goodsReceipt.wizard.field.rejectionReasonRequired': 'Rejection Reason (required)',
  'goodsReceipt.wizard.placeholder.fullLotRejection': 'Explain the full-lot rejection',
  'goodsReceipt.wizard.aria.headerRejectionReason': 'Header rejection reason',
  'goodsReceipt.wizard.autoPostSap': 'Auto-post to SAP',
  'goodsReceipt.wizard.field.finalNotes': 'Final Notes',
  'goodsReceipt.wizard.placeholder.optional': 'Optional',
  'goodsReceipt.wizard.summary.totalItems': 'Total items',
  'goodsReceipt.wizard.summary.totalAccepted': 'Total accepted',
  'goodsReceipt.wizard.summary.totalRejected': 'Total rejected',
  'goodsReceipt.wizard.summary.sapDoc': 'SAP Doc',
  'goodsReceipt.wizard.summary.assignedBySap': 'Assigned by SAP on posting',
  'goodsReceipt.wizard.summary.notPosted': 'Not posted',
};

export const goodsReceiptId: Record<string, string> = {
  // — Breadcrumb —
  'goodsReceipt.crumb.transact': 'TRANSAKSI',
  'goodsReceipt.crumb.gr': 'PENERIMAAN BARANG & QC',
  // — Page header —
  'goodsReceipt.header.title': 'Penerimaan Barang & Kontrol Kualitas',
  'goodsReceipt.header.subtitle': 'Posting penerimaan, alur inspeksi, hasil lab, dan keputusan disposisi.',
  // — Header actions —
  'goodsReceipt.action.export': 'Ekspor',
  'goodsReceipt.action.labResults': 'Hasil Lab',
  // — Meta line (count-dependent) —
  'goodsReceipt.meta.count.one': '{{count}} GR bulan ini',
  'goodsReceipt.meta.count.other': '{{count}} GR bulan ini',
  'goodsReceipt.meta.lastPosted': 'terakhir diposting',
  // — KPI cards —
  'goodsReceipt.kpi.pending.eyebrow': 'Menunggu Inspeksi',
  'goodsReceipt.kpi.pending.subtitle': 'Menunggu mulai QC',
  'goodsReceipt.kpi.hold.eyebrow': 'Ditahan Kualitas',
  'goodsReceipt.kpi.hold.subtitle': 'Dikarantina / uji ulang',
  'goodsReceipt.kpi.approvedToday.eyebrow': 'Disetujui Hari Ini',
  'goodsReceipt.kpi.rejectionRate.eyebrow': 'Tingkat Penolakan (30h)',
  'goodsReceipt.kpi.rejectionRate.subtitle': 'Jml ditolak / diterima',
  // — Group tabs —
  'goodsReceipt.tab.all': 'Semua',
  'goodsReceipt.tab.pending': 'Menunggu',
  'goodsReceipt.tab.underInspection': 'Dalam Inspeksi',
  'goodsReceipt.tab.approved': 'Disetujui',
  'goodsReceipt.tab.hold': 'Ditahan Kualitas',
  'goodsReceipt.tab.rejected': 'Ditolak',
  'goodsReceipt.tab.posted': 'Terkirim',
  // — Search / filters —
  'goodsReceipt.search.placeholder': 'Cari berdasarkan GR, ASN, PO, atau pemasok...',
  'goodsReceipt.filter.today': 'Hari ini',
  'goodsReceipt.filter.week': 'Minggu ini',
  'goodsReceipt.filter.month': 'Bulan ini',
  'goodsReceipt.filter.30d': '30 hari terakhir',
  'goodsReceipt.filter.all': 'Sepanjang waktu',
  // — Main table —
  'goodsReceipt.table.col.grRefs': 'GR / Ref',
  'goodsReceipt.table.col.supplier': 'Pemasok',
  'goodsReceipt.table.col.received': 'Diterima',
  'goodsReceipt.table.col.receivedBy': 'Diterima Oleh',
  'goodsReceipt.table.col.items': 'Item',
  'goodsReceipt.table.col.status': 'Status',
  'goodsReceipt.table.col.disposition': 'Disposisi',
  'goodsReceipt.table.col.sapDoc': 'Dok SAP',
  'goodsReceipt.table.empty': 'Tidak ada penerimaan barang yang cocok dengan filter saat ini.',
  // — Item count (count-dependent) —
  'goodsReceipt.items.count.one': '{{count}} item',
  'goodsReceipt.items.count.other': '{{count}} item',
  // — Side-panel footer buttons —
  'goodsReceipt.footer.startInspection': 'Mulai inspeksi',
  'goodsReceipt.footer.submitResults': 'Kirim hasil inspeksi',
  'goodsReceipt.footer.requestRetest': 'Minta uji ulang lab',
  'goodsReceipt.footer.overrideHold': 'Timpa penahanan',
  'goodsReceipt.footer.viewInSap': 'Lihat di SAP',
  // — Placeholder ("future release") toasts —
  'goodsReceipt.toast.submitResults.title': 'Hasil inspeksi',
  'goodsReceipt.toast.submitResults.desc': 'Formulir pengiriman akan tersedia pada rilis mendatang.',
  'goodsReceipt.toast.retest.title': 'Uji ulang diminta',
  'goodsReceipt.toast.retest.desc': 'Uji ulang lab diantrekan.',
  'goodsReceipt.toast.overrideHold.title': 'Penimpaan penahanan diminta',
  'goodsReceipt.toast.overrideHold.desc': 'Menunggu persetujuan manajer QC.',
  'goodsReceipt.toast.openingSap.title': 'Membuka SAP',
  'goodsReceipt.toast.openingSap.fallbackDoc': 'Dokumen material',
  'goodsReceipt.toast.export.title': 'Ekspor diantrekan',
  'goodsReceipt.toast.export.desc': 'Ekspor penerimaan barang akan segera diunduh.',
  'goodsReceipt.toast.labOverview.title': 'Ikhtisar hasil lab',
  'goodsReceipt.toast.labOverview.desc': 'Dasbor lab akan tersedia pada rilis mendatang.',
  // — Side panel: key facts —
  'goodsReceipt.panel.keyFacts': 'Fakta utama',
  'goodsReceipt.panel.field.gr': 'No. GR',
  'goodsReceipt.panel.field.asn': 'No. ASN',
  'goodsReceipt.panel.field.po': 'No. PO',
  'goodsReceipt.panel.field.sapMaterialDoc': 'Dok Material SAP',
  'goodsReceipt.panel.field.supplier': 'Pemasok',
  'goodsReceipt.panel.field.receivedDate': 'Tanggal Penerimaan',
  'goodsReceipt.panel.field.receivedBy': 'Diterima Oleh',
  'goodsReceipt.panel.field.status': 'Status',
  'goodsReceipt.panel.field.disposition': 'Disposisi',
  // — Side panel: line items —
  'goodsReceipt.panel.lineItems': 'Item baris',
  'goodsReceipt.panel.col.material': 'Material',
  'goodsReceipt.panel.col.exp': 'Eksp',
  'goodsReceipt.panel.col.recv': 'Diterima',
  'goodsReceipt.panel.col.acc': 'Disetujui',
  'goodsReceipt.panel.col.rej': 'Ditolak',
  'goodsReceipt.panel.col.checks': 'Pemeriksaan',
  'goodsReceipt.panel.legend': 'V = Visual · P = Kemasan · H = Segel Halal · B = Lot BPOM',
  // — Side panel: notes + workflow —
  'goodsReceipt.panel.inspectionNotes': 'Catatan inspeksi',
  'goodsReceipt.panel.dispositionWorkflow': 'Alur disposisi',
  // — Disposition timeline —
  'goodsReceipt.timeline.received': 'Diterima',
  'goodsReceipt.timeline.inspectionStarted': 'Inspeksi Dimulai',
  'goodsReceipt.timeline.labResultsReceived': 'Hasil Lab Diterima',
  'goodsReceipt.timeline.noLabRequired': 'Tidak perlu lab',
  'goodsReceipt.timeline.dispositionDecision': 'Keputusan Disposisi',
  'goodsReceipt.timeline.postedToSap': 'Terkirim ke SAP',
  // — Wrapper empty state —
  'goodsReceipt.empty.title': 'Belum ada penerimaan barang',
  'goodsReceipt.empty.subtitle': 'Belum ada penerimaan barang yang diposting.',
  'goodsReceipt.empty.message': 'Penerimaan barang dan inspeksi QC muncul di sini saat pengiriman tiba.',
  // — Wizard: chrome / steps —
  'goodsReceipt.wizard.complete': 'Buat GR',
  'goodsReceipt.wizard.step.source.title': 'Pemilihan sumber',
  'goodsReceipt.wizard.step.source.short': 'Sumber',
  'goodsReceipt.wizard.step.source.desc': 'Pilih pengiriman di dermaga atau masukkan PO/ASN secara manual.',
  'goodsReceipt.wizard.step.details.title': 'Detail penerimaan',
  'goodsReceipt.wizard.step.details.short': 'Detail',
  'goodsReceipt.wizard.step.details.desc': 'Catat info penerimaan dan kuantitas per baris.',
  'goodsReceipt.wizard.step.quality.title': 'Pemeriksaan kualitas',
  'goodsReceipt.wizard.step.quality.short': 'Kualitas',
  'goodsReceipt.wizard.step.quality.desc': 'Visual, kemasan, halal, BPOM, dan pengambilan sampel lab.',
  'goodsReceipt.wizard.step.disposition.title': 'Disposisi & kirim',
  'goodsReceipt.wizard.step.disposition.short': 'Kirim',
  'goodsReceipt.wizard.step.disposition.desc': 'Konfirmasi disposisi keseluruhan dan kirim ke SAP.',
  // — Wizard: source selection (step 1) —
  'goodsReceipt.wizard.source.selectDock': 'Pilih kedatangan di dermaga',
  'goodsReceipt.wizard.source.enterAsn': 'Masukkan nomor ASN',
  'goodsReceipt.wizard.source.empty': 'Tidak ada pengiriman di dermaga dan tidak ada ASN yang diajukan untuk diterima.',
  'goodsReceipt.wizard.field.asnNumber': 'Nomor ASN',
  'goodsReceipt.wizard.source.notFound': 'ASN tidak ditemukan di antara pengiriman yang dapat diterima. Masukkan ASN yang diajukan (status Diajukan, Dalam Perjalanan, atau Terkirim).',
  'goodsReceipt.wizard.source.readyToReceive': 'Siap diterima.',
  // — Wizard: receipt details (step 2) —
  'goodsReceipt.wizard.section.receiptInfo': 'Info Penerimaan',
  'goodsReceipt.wizard.field.receivedDate': 'Tanggal Penerimaan',
  'goodsReceipt.wizard.field.receivedBy': 'Diterima Oleh',
  'goodsReceipt.wizard.field.warehouseLocation': 'Lokasi Gudang',
  'goodsReceipt.wizard.field.notes': 'Catatan',
  'goodsReceipt.wizard.placeholder.notes': 'Konteks penerimaan opsional...',
  'goodsReceipt.wizard.section.lineItems': 'Item Baris',
  'goodsReceipt.wizard.lines.empty': 'Belum ada item baris. Pilih sumber di Langkah 1.',
  'goodsReceipt.wizard.field.expected': 'Diharapkan',
  'goodsReceipt.wizard.field.received': 'Diterima',
  'goodsReceipt.wizard.field.accepted': 'Disetujui',
  'goodsReceipt.wizard.field.rejected': 'Ditolak',
  'goodsReceipt.wizard.field.rejectionReason': 'Alasan Penolakan',
  'goodsReceipt.wizard.placeholder.rejectionReason': 'Wajib diisi bila ada kuantitas yang ditolak',
  'goodsReceipt.wizard.aria.received': 'Kuantitas diterima untuk {{code}}',
  'goodsReceipt.wizard.aria.accepted': 'Kuantitas disetujui untuk {{code}}',
  'goodsReceipt.wizard.aria.rejectionReason': 'Alasan penolakan untuk {{code}}',
  // — Wizard: penolakan kuantitas (CP-0 · W1 · 2f-a) —
  'goodsReceipt.wizard.qty.refused.empty':
    'Masukkan kuantitas. Jika tidak ada yang tiba untuk baris ini, masukkan 0 — itu dicatat sebagai penerimaan nol yang sebenarnya, sedangkan membiarkannya kosong tidak.',
  'goodsReceipt.wizard.qty.refused.notNumeric':
    'Itu bukan kuantitas — ketik angka saja, misalnya 1500.',
  'goodsReceipt.wizard.qty.refused.ambiguous':
    'Ini bisa dibaca dua cara — "1.500" berarti seribu lima ratus dalam bahasa Indonesia dan satu koma lima dalam bahasa Inggris. Ketik tanpa pemisah: 1500.',
  // — Wizard: quality checks (step 3) —
  'goodsReceipt.wizard.section.qualityEyebrow': 'PEMERIKSAAN KUALITAS',
  'goodsReceipt.wizard.section.perLineInspection': 'Inspeksi per baris',
  'goodsReceipt.wizard.receivedSuffix': 'diterima',
  'goodsReceipt.wizard.field.visualInspection': 'Inspeksi Visual',
  'goodsReceipt.wizard.field.packagingIntegrity': 'Integritas Kemasan',
  'goodsReceipt.wizard.field.halalSealCheck': 'Pemeriksaan Segel Halal',
  'goodsReceipt.wizard.field.bpomLotTracking': 'Pelacakan Lot BPOM',
  'goodsReceipt.wizard.bpom.refused.title': 'Penerapan BPOM tidak dapat ditentukan.',
  'goodsReceipt.wizard.bpom.refused.unknownMaterial':
    'Master material tidak memuat {{code}}, sehingga tidak diketahui apakah lot ini memerlukan pemeriksaan lot BPOM. Baris ini tidak dapat diinspeksi sampai material tersebut terdaftar.',
  'goodsReceipt.wizard.bpom.refused.undetermined':
    'Master material memuat {{code}} tetapi tidak mencatat penetapan BPOM untuknya. Baris ini tidak dapat diinspeksi sampai ada yang memutuskan.',
  'goodsReceipt.wizard.labSampleRequired': 'Sampel lab diperlukan',
  'goodsReceipt.wizard.labRequestId': 'ID Permintaan Lab:',
  // — Wizard: disposition & submit (step 4) —
  'goodsReceipt.wizard.section.finalDisposition': 'Disposisi Akhir',
  'goodsReceipt.wizard.field.headerDisposition': 'Disposisi Header (diturunkan dari baris)',
  'goodsReceipt.wizard.rollup.prefix.one': 'Digulung dari {{count}} baris —',
  'goodsReceipt.wizard.rollup.prefix.other': 'Digulung dari {{count}} baris —',
  'goodsReceipt.wizard.rollup.acceptedWord': 'disetujui,',
  'goodsReceipt.wizard.rollup.rejectedWord': 'ditolak.',
  'goodsReceipt.wizard.rollup.notEditable': 'Tidak dapat diedit — header mengikuti kuantitas yang diinspeksi.',
  'goodsReceipt.wizard.field.rejectionReasonRequired': 'Alasan Penolakan (wajib)',
  'goodsReceipt.wizard.placeholder.fullLotRejection': 'Jelaskan penolakan seluruh lot',
  'goodsReceipt.wizard.aria.headerRejectionReason': 'Alasan penolakan header',
  'goodsReceipt.wizard.autoPostSap': 'Kirim otomatis ke SAP',
  'goodsReceipt.wizard.field.finalNotes': 'Catatan Akhir',
  'goodsReceipt.wizard.placeholder.optional': 'Opsional',
  'goodsReceipt.wizard.summary.totalItems': 'Total item',
  'goodsReceipt.wizard.summary.totalAccepted': 'Total disetujui',
  'goodsReceipt.wizard.summary.totalRejected': 'Total ditolak',
  'goodsReceipt.wizard.summary.sapDoc': 'Dok SAP',
  'goodsReceipt.wizard.summary.assignedBySap': 'Ditetapkan oleh SAP saat posting',
  'goodsReceipt.wizard.summary.notPosted': 'Belum diposting',
};
