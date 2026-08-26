// ─────────────────────────────────────────────────────────────────────────────
// PF-2 · PURPOSE PROSE. Namespace: processFlows.purpose.*
//
// ⚠️ **THIS IS THE ONLY AUTHORED PROSE ABOUT A SPECIFIC MACHINE IN THE TREE'S
// UI LAYER, AND IT IS DELIBERATELY QUARANTINED IN ITS OWN FILE.** `processFlows.
// ts` next door is page CHROME — not one string there names a flow, state or
// verb, and that claim is worth keeping literally true. Everything here does the
// opposite by design: each value explains ONE registered thing.
//
// ── ⚠️ EVERY KEY IS NAMED BY AN ANNOTATION, AND EVERY ANNOTATION IS HERE ────
//   `services/transitions/annotations.ts` holds the keys; this file holds the
//   words. `annotations.test.ts` pins the two together in BOTH directions, so
//   an orphan key here is red and a keyless annotation there is red. Nothing in
//   this file is looked up by concatenation — see the annotation header.
//
// ── ⚠️ NOT ONE SENTENCE RESTATES A MACHINE FACT ─────────────────────────────
//   No value below contains its own flow's state names, roles, required fields,
//   hook names, transition ids, entity key, or a trigger word. Those RENDER
//   FROM THE REGISTRY, next to the sentence, so a sentence that repeated one
//   would be a second copy — and the copy is the half that goes wrong silently
//   when somebody renames a state. Enforced, EN and ID, by the no-restatement
//   test. It is also why several sentences read a little sideways ("the goods
//   are frozen", not "the goods go on quality hold"): the sideways phrasing is
//   the one that survives a rename.
//
// ── WHO THIS IS WRITTEN FOR ─────────────────────────────────────────────────
//   A procurement person, not an engineer. Every sentence answers "why would I
//   do this, and what happens to my delivery" — never "what does this function
//   call". Purpose is the ONE thing the schema does not carry, and the audience
//   for it is the upstream supply-chain team.
//
// EN+ID from birth (MARKER-I18N-HOLE-01): ~110 hand-authored strings landing
// late in a page's life is the exact class an i18n coverage sweep is blind to.
// ─────────────────────────────────────────────────────────────────────────────

export const processFlowPurposeEn: Record<string, string> = {
  // ── purchaseOrder ──────────────────────────────────────────────────────────
  'processFlows.purpose.entity.purchaseOrder':
    "Paragon's commitment to buy — what was ordered, at what price, for when. Every shipment, receipt and bill downstream hangs off this one document.",
  'processFlows.purpose.t_po_issue':
    'Buying makes its decision binding. Until this document exists, a supplier has nothing it can safely start producing against.',
  'processFlows.purpose.t_po_view':
    'Tells the buyer the order reached a person and not just an inbox — the first point at which silence starts to mean something.',
  'processFlows.purpose.t_po_acknowledge':
    'The supplier says it has the order and is working through it, without yet committing to the numbers. Useful when a real answer will take days.',
  'processFlows.purpose.t_po_confirm':
    'The supplier commits to the line amounts it will actually ship. This is the promise the plant plans production around, and the figure every later shortfall is measured against.',
  'processFlows.purpose.t_po_partial_deliver':
    'Part of the order has physically arrived. Worth recording because a partly served order still owes something, and the shortfall is what buying chases.',
  'processFlows.purpose.t_po_deliver':
    'Everything ordered has physically arrived. Buying stops chasing and finance starts expecting a bill.',
  'processFlows.purpose.t_po_close':
    'The order is finished with — received, billed and settled — and stops appearing in anybody’s open work.',

  // ── advanceShipNotice ──────────────────────────────────────────────────────
  'processFlows.purpose.entity.advanceShipNotice':
    'The supplier’s heads-up that goods are on their way, and what is on them. It is what lets a warehouse plan dock time instead of discovering a truck.',
  'processFlows.purpose.t_asn_create':
    'The supplier begins telling Paragon what it is about to send, while the details are still theirs to change.',
  'processFlows.purpose.t_asn_submit':
    'Hands the shipping details to Paragon’s warehouse: who is carrying it, how to trace it, and when to expect it.',
  'processFlows.purpose.t_asn_in_transit':
    'The goods have left the supplier. From here the arrival date is a logistics question, not a production one.',
  'processFlows.purpose.t_asn_deliver':
    'The goods reached Paragon. The notice stops being a forecast and becomes something the receiving team can check against.',
  'processFlows.purpose.t_asn_discrepancy':
    'What turned up did not match what was announced. It follows from the receiving team’s finding, and it is the supplier’s cue that something needs explaining.',
  'processFlows.purpose.t_asn_resolve_discrepancy':
    'The mismatch has been talked through and settled, so the notice stops sitting in an unresolved pile.',

  // ── goodsReceipt ───────────────────────────────────────────────────────────
  'processFlows.purpose.entity.goodsReceipt':
    'Paragon’s record of what physically turned up and whether it was fit to use. It is the fact finance pays against, so anything wrong here becomes a billing argument later.',
  'processFlows.purpose.t_gr_create':
    'Opens the receiving record for a delivery that has reached the dock, so the goods are accounted for before anybody touches them.',
  'processFlows.purpose.t_gr_start_inspection':
    'Quality picks the delivery up and starts checking it. From here somebody owns the decision.',
  'processFlows.purpose.t_gr_hold':
    'Something looks wrong, so the goods are frozen rather than taken or refused. The reason written here is what the supplier will be asked about.',
  'processFlows.purpose.t_gr_request_retest':
    'The problem that froze the goods has been dealt with — look again. Without this, frozen stock has no way back into use.',
  'processFlows.purpose.t_gr_approve':
    'Quality takes the whole delivery. The supplier gets clean credit for it and the goods can be used.',
  'processFlows.purpose.t_gr_partial_approve':
    'Some of the delivery is usable and some is not. Paragon keeps what it can use, and the rest becomes a claim against the supplier.',
  'processFlows.purpose.t_gr_reject':
    'None of the delivery is usable. The reason written here is what the supplier and buying argue from, and it blocks payment for the lot.',
  'processFlows.purpose.t_gr_post':
    'Hands the receipt to SAP so the stock exists in the books and the plant can consume it. Nothing is truly received until SAP says so.',

  // ── goodsReceiptLine ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.goodsReceiptLine':
    'The per-item verdict behind a delivery’s overall outcome. A delivery is only as good as its worst item, and this is where that is decided.',
  'processFlows.purpose.t_grline_inspect':
    'Somebody physically looks at one item — its condition and its packaging — and writes down what they saw.',
  'processFlows.purpose.t_grline_accept':
    'This item is fit for use. It counts toward the delivery being cleared as a whole.',
  'processFlows.purpose.t_grline_reject':
    'This item is not fit for use, with a reason attached. One such item is enough to stop a delivery being cleared whole.',
  'processFlows.purpose.t_grline_quarantine':
    'The item is set aside until somebody decides — not usable yet, not refused either. It keeps doubtful stock out of production.',
  'processFlows.purpose.t_grline_return':
    'The item goes back to the supplier rather than being scrapped or kept, so ownership of the problem goes back with it.',

  // ── invoice ────────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.invoice':
    'The supplier’s claim to be paid, and Paragon’s decision on it. One document per claim, whichever side is looking at it.',
  'processFlows.purpose.t_invoice_create':
    'The supplier starts a bill against an order it has served, while the figures are still theirs to correct.',
  'processFlows.purpose.t_invoice_submit':
    'The supplier formally asks to be paid. The clock on payment terms starts running here.',
  'processFlows.purpose.t_invoice_match':
    'Paragon checks the bill against what was ordered and what was received. A bill that fails this check is not a bill anybody can pay.',
  'processFlows.purpose.t_invoice_approve':
    'Finance agrees the claim is owed. The decision to pay is taken here; the money moves later.',
  'processFlows.purpose.t_invoice_release_payment':
    'Sends the payment instruction to SAP. Until SAP confirms, nobody should tell a supplier they have been paid.',
  'processFlows.purpose.t_invoice_remit':
    'The supplier acknowledges the money and the advice that came with it. The claim is finished.',
  'processFlows.purpose.t_invoice_dispute':
    'Paragon does not take the claim as it stands, and says why. It stops the payment clock and puts the ball back with the supplier.',
  'processFlows.purpose.t_invoice_resolve':
    'The disagreement has been settled and the claim goes back for checking. Without this, a contested bill has nowhere to go.',

  // ── invoiceMatch ───────────────────────────────────────────────────────────
  'processFlows.purpose.entity.invoiceMatch':
    'The three-way check behind a bill: what was ordered, what arrived, what is being charged. It is why a wrong bill is caught before money moves, not after.',
  'processFlows.purpose.t_invmatch_await_gr':
    'The bill cannot be checked until the goods are booked in. This is the wait, made visible instead of looking like a stall.',
  'processFlows.purpose.t_invmatch_matched':
    'Order, receipt and bill agree. Nothing stands in the way of paying.',
  'processFlows.purpose.t_invmatch_qty_variance':
    'The supplier is charging for more than Paragon can show it received. Somebody has to establish which count is right.',
  'processFlows.purpose.t_invmatch_price_variance':
    'The unit price on the bill sits above what was agreed, beyond what tolerance allows. Buying owns that conversation, not finance.',

  // ── rfq ────────────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.rfq':
    'A sourcing event: Paragon asks several suppliers for an offer on the same requirement, so the comparison is like for like.',
  'processFlows.purpose.t_rfq_create':
    'Buying starts shaping a request — what is needed, in what category, how much — while it is still internal.',
  'processFlows.purpose.t_rfq_publish':
    'Puts the request in front of the invited suppliers. Nothing is visible to them before this, so it is the moment sourcing actually begins.',
  'processFlows.purpose.t_rfq_close':
    'The response window ends. Late offers are not compared, which is what makes the comparison fair to everyone who answered on time.',
  'processFlows.purpose.t_rfq_award':
    'Buying picks the winning offer and records why. Everyone who bid learns where they stand, in one act rather than by rumour.',
  'processFlows.purpose.t_rfq_fx_pin':
    'Records the exchange basis foreign offers are being compared on, so a decision taken today can still be explained a year from now.',
  'processFlows.purpose.t_rfq_cancel':
    'Buying calls the event off before picking anyone — the requirement changed, or the budget went. The suppliers get told rather than left waiting.',
  'processFlows.purpose.t_rfq_reopen':
    'Reopens a finished event for further responses — too few answers, or a requirement that moved. It reuses the request rather than starting a new one.',

  // ── quotation ──────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.quotation':
    'A supplier’s offer against one sourcing request — the price and the delivery promise it is prepared to stand behind.',
  'processFlows.purpose.t_quotation_submit':
    'The supplier makes its offer: what it costs, in what money, and how long delivery takes. All three, because a price with no date is not comparable.',
  'processFlows.purpose.t_quotation_review':
    'Buying takes the offer into evaluation. It separates what has been read from what is still in the pile.',
  'processFlows.purpose.t_quotation_award':
    'This offer won. It follows from the buying decision on the request, and is never entered against a single supplier by hand.',
  'processFlows.purpose.t_quotation_reject':
    'This offer did not win. It lands at the same moment as the winning one, so nobody is left wondering and no one has to be told individually.',

  // ── shipment ───────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.shipment':
    'The inbound leg as logistics sees it — one physical movement tracked from the supplier’s gate to Paragon’s yard.',
  'processFlows.purpose.t_shipment_create':
    'Opens tracking for goods Paragon is expecting, so an inbound movement exists to hang milestones on before anything moves.',
  'processFlows.purpose.t_shipment_asn_received':
    'The supplier’s advance notice has landed, and the movement now carries real detail — what is coming, and when.',
  'processFlows.purpose.t_shipment_depart':
    'The goods have left the supplier. From here, the arrival date is somebody else’s to influence.',
  'processFlows.purpose.t_shipment_arrive_port':
    'The goods reached the port of entry. For an import, this is where the long tail of paperwork starts.',
  'processFlows.purpose.t_shipment_customs':
    'The goods are with the border authorities. Nothing Paragon does speeds that up, but knowing it stops a planner chasing the supplier.',
  'processFlows.purpose.t_shipment_dock':
    'The goods are at Paragon’s gate waiting for a slot. The delay from here on is Paragon’s own.',
  'processFlows.purpose.t_shipment_unload':
    'The container is being emptied. Receiving can start counting.',
  'processFlows.purpose.t_shipment_deliver':
    'The goods are physically in. The logistics leg is over and the receiving record takes over.',

  // ── contract ───────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.contract':
    'The standing agreement a supplier is bought from — the prices, volumes and terms that orders inherit rather than renegotiate each time.',
  'processFlows.purpose.t_contract_draft':
    'Buying begins setting out terms with a supplier, before anything binds either side.',
  'processFlows.purpose.t_contract_activate':
    'The terms take effect. Orders raised from now on inherit them, so this is the moment a negotiated price becomes a real price.',
  'processFlows.purpose.t_contract_renew':
    'The agreement continues for a further period. Recorded as its own act so nobody has to guess whether a lapsed date was an oversight or a decision.',
  'processFlows.purpose.t_contract_terminate':
    'The agreement ends, at its term or before it. Nothing new is bought under it from here, whatever the calendar says.',

  // ── obligation ─────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.obligation':
    'A promise written into an agreement — a volume, a rebate, a service level — tracked so somebody notices whether it was actually kept.',
  'processFlows.purpose.t_obligation_track':
    'Starts watching one commitment from an agreement, so it lives somewhere other than in a document nobody rereads.',
  'processFlows.purpose.t_obligation_complete':
    'The commitment was met. Recorded because an unmet promise is only visible if the kept ones are marked.',

  // ── purchaseRequisition ────────────────────────────────────────────────────
  'processFlows.purpose.entity.purchaseRequisition':
    'The internal request that starts everything: somebody in the plant needs something bought, and says so where it can be reviewed and traced.',
  'processFlows.purpose.t_pr_create':
    'A requester writes down what the plant needs, so a need enters Paragon as a document rather than as a message somebody may forget.',
  'processFlows.purpose.t_pr_submit':
    'Sends the request out for a decision. Until this happens it is one person’s note, not a claim on the budget.',
  'processFlows.purpose.t_pr_approve':
    'A budget holder agrees the need is real and funded. Nothing is sourced or ordered before this.',
  'processFlows.purpose.t_pr_reject':
    'The decision is no. The request stops here rather than quietly ageing in a queue.',
  'processFlows.purpose.t_pr_revise':
    'Puts a declined request back in the requester’s hands with a note on what changed, so the next reviewer sees a different document.',
  'processFlows.purpose.t_pr_source':
    'The need is going out to several suppliers for offers rather than straight to a known one. Recorded on the request so the requester can see where their need went.',
  'processFlows.purpose.t_pr_convert':
    'The need has become a real order. This is what closes the loop for whoever raised it.',

  // ── supplierDocument ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.supplierDocument':
    'The paperwork Paragon must hold on a supplier — certificates, licences, bank details — and where each one stands.',
  'processFlows.purpose.t_supplierdoc_request':
    'Paragon asks a supplier for one specific piece of paperwork, so the gap sits on somebody’s list rather than being discovered at an audit.',
  'processFlows.purpose.t_supplierdoc_submit':
    'The supplier hands over what was asked for. From here the delay is Paragon’s, not theirs.',
  'processFlows.purpose.t_supplierdoc_verify':
    'Somebody has confirmed the paper is genuine and current. Only now does it count for anything.',
  'processFlows.purpose.t_supplierdoc_reject':
    'The paper does not do the job — wrong one, out of date, or unreadable — and the supplier is asked again.',

  // ── compliance ─────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.compliance':
    'Whether a supplier holds the certificates a material actually requires — halal, BPOM and the rest — and where each requirement stands today.',
  'processFlows.purpose.t_compliance_submit':
    'The supplier provides the certificate for a requirement it has not yet covered. It is the only way that gap closes.',
  'processFlows.purpose.t_compliance_verify':
    'The certificate has been checked and stands up. Material covered by it can be bought without an exception.',
  'processFlows.purpose.t_compliance_reject':
    'The certificate does not satisfy the requirement, so the requirement is outstanding again and the supplier has to try once more.',

  // ── requirementResponse ────────────────────────────────────────────────────
  'processFlows.purpose.entity.requirementResponse':
    'A supplier’s answer to a published forecast line: how much of what Paragon asked for it can actually supply, in that period.',
  'processFlows.purpose.t_requirementresponse_submit':
    'The supplier works out what it can commit to against one forecast line, while the number is still theirs to change.',
  'processFlows.purpose.t_requirementresponse_acknowledge':
    'The supplier confirms it has seen a line it was not asked to commit against. Silence and “seen it” are different facts, and planning uses them differently.',
  'processFlows.purpose.t_requirementresponse_promote':
    'Sends the commitment to Paragon’s planner. Nothing is visible to planning before this, so it is the act that makes a promise a promise.',
  'processFlows.purpose.t_requirementresponse_review':
    'The planner takes the answer into evaluation rather than taking it on sight.',
  'processFlows.purpose.t_requirementresponse_accept':
    'The planner takes the commitment as the number to plan on. Downstream planning treats it as real from here.',
  'processFlows.purpose.t_requirementresponse_dispute':
    'The planner does not take the answer — the gap is too big, or the reason given does not hold — and says so to the supplier.',
  'processFlows.purpose.t_requirementresponse_resolve':
    'The disagreement has been worked through and the answer goes back for a decision, instead of sitting unfinished.',

  // ── inventoryDeclaration ───────────────────────────────────────────────────
  'processFlows.purpose.entity.inventoryDeclaration':
    'What a supplier says it is holding right now, for one item. It is the number Paragon plans against when it cannot see the supplier’s own stock.',
  'processFlows.purpose.t_inventorydeclaration_declare':
    'A supplier states its own stock on hand. Every statement is kept, so what was said last month is still there to compare against.',
  'processFlows.purpose.t_inventorydeclaration_record':
    'A planner writes down stock a supplier reported over chat or email. Kept apart from the supplier’s own statement, because who said it matters when the number turns out wrong.',

  // ── incomingShipment ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.incomingShipment':
    'A supply leg a supplier tells Paragon about — goods heading to Paragon, or goods moving between a principal and a distributor that Paragon’s own supply depends on.',
  'processFlows.purpose.t_incomingshipment_report':
    'The supplier tells Paragon a consignment exists, what is on it and how much. It is how supply visibility starts without waiting for a delivery.',
  'processFlows.purpose.t_incomingshipment_ship':
    'The leg has departed. The date it will land stops being a plan and becomes a travel estimate.',
  'processFlows.purpose.t_incomingshipment_arrive':
    'The leg has landed. For a supply-assurance leg, this is where Paragon’s exposure eases.',
  'processFlows.purpose.t_incomingshipment_cancel':
    'The leg is called off while under way. Better recorded than left in a plan as stock that is never coming.',

  // ── enforcement ────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.enforcement':
    'How hard each rule bites — blocking, warning, or merely watching — recorded as a decision somebody made rather than a setting nobody owns.',
  'processFlows.purpose.t_enforcement_set':
    'Somebody decides how strictly one rule is applied, and is named for it. Loosening a rule is exactly the act an audit asks about a year later.',

  // ── the permission bundles ─────────────────────────────────────
  // ⚠️ NEITHER SENTENCE CONTAINS THE WORD THIS MACHINE IS NAMED AFTER, and that
  // is the PF-2 rule rather than an evasion: a purpose that restates a machine
  // token tells a reader what the page already shows beside it.
  'processFlows.purpose.entity.role':
    'A copy of one permission bundle with extra permissions on top of it, kept as a record of what was copied and by whom — so a seat somebody invented last Tuesday reads differently from a standard one.',
  'processFlows.purpose.t_role_grant':
    'Somebody copies an existing set of permissions and widens it. Widening never removes anything, so nobody quietly loses an authority they were relied on to have, and the act is recorded like every other governed act.',
};

export const processFlowPurposeId: Record<string, string> = {
  // ── purchaseOrder ──────────────────────────────────────────────────────────
  'processFlows.purpose.entity.purchaseOrder':
    'Komitmen Paragon untuk membeli — apa yang dipesan, dengan harga berapa, untuk kapan. Setiap pengiriman, penerimaan, dan tagihan di hilir bergantung pada satu dokumen ini.',
  'processFlows.purpose.t_po_issue':
    'Pembelian menjadikan keputusannya mengikat. Sebelum dokumen ini ada, pemasok tidak punya dasar yang aman untuk mulai berproduksi.',
  'processFlows.purpose.t_po_view':
    'Memberi tahu pembeli bahwa pesanan sampai ke seseorang, bukan sekadar ke kotak masuk — titik pertama saat diamnya pemasok mulai berarti sesuatu.',
  'processFlows.purpose.t_po_acknowledge':
    'Pemasok menyatakan pesanan sudah diterima dan sedang ditelaah, tanpa mengikat diri pada angkanya. Berguna ketika jawaban sungguhan butuh berhari-hari.',
  'processFlows.purpose.t_po_confirm':
    'Pemasok berkomitmen pada jumlah tiap baris yang benar-benar akan dikirim. Inilah janji yang dipakai pabrik untuk merencanakan produksi, dan angka pembanding bagi setiap kekurangan di kemudian hari.',
  'processFlows.purpose.t_po_partial_deliver':
    'Sebagian pesanan sudah tiba secara fisik. Perlu dicatat karena pesanan yang baru terpenuhi sebagian masih menyisakan kewajiban, dan sisa itulah yang dikejar tim pembelian.',
  'processFlows.purpose.t_po_deliver':
    'Seluruh pesanan sudah tiba secara fisik. Pembelian berhenti mengejar dan keuangan mulai menunggu tagihan.',
  'processFlows.purpose.t_po_close':
    'Pesanan ini selesai — sudah diterima, ditagih, dan dibayar — dan tidak lagi muncul dalam daftar pekerjaan siapa pun.',

  // ── advanceShipNotice ──────────────────────────────────────────────────────
  'processFlows.purpose.entity.advanceShipNotice':
    'Pemberitahuan awal dari pemasok bahwa barang sedang dalam perjalanan, beserta isinya. Inilah yang memungkinkan gudang menjadwalkan waktu bongkar, bukan mendadak menemukan truk di depan pintu.',
  'processFlows.purpose.t_asn_create':
    'Pemasok mulai memberi tahu Paragon apa yang akan dikirimnya, selagi rinciannya masih bisa mereka ubah.',
  'processFlows.purpose.t_asn_submit':
    'Menyerahkan rincian pengapalan ke gudang Paragon: siapa yang membawa, bagaimana menelusurinya, dan kapan harus ditunggu.',
  'processFlows.purpose.t_asn_in_transit':
    'Barang sudah meninggalkan pemasok. Sejak titik ini tanggal kedatangan menjadi urusan logistik, bukan lagi urusan produksi.',
  'processFlows.purpose.t_asn_deliver':
    'Barang sampai di Paragon. Pemberitahuan ini berhenti menjadi perkiraan dan menjadi acuan yang bisa dicocokkan tim penerimaan.',
  'processFlows.purpose.t_asn_discrepancy':
    'Yang datang tidak sesuai dengan yang diberitahukan. Ini mengikuti temuan tim penerimaan, dan menjadi tanda bagi pemasok bahwa ada yang harus dijelaskan.',
  'processFlows.purpose.t_asn_resolve_discrepancy':
    'Ketidaksesuaiannya sudah dibicarakan dan dituntaskan, sehingga pemberitahuan ini tidak lagi menumpuk sebagai perkara terbuka.',

  // ── goodsReceipt ───────────────────────────────────────────────────────────
  'processFlows.purpose.entity.goodsReceipt':
    'Catatan Paragon tentang apa yang benar-benar datang dan apakah layak dipakai. Inilah fakta yang menjadi dasar pembayaran keuangan, sehingga kekeliruan di sini akan berubah menjadi perselisihan tagihan di kemudian hari.',
  'processFlows.purpose.t_gr_create':
    'Membuka catatan penerimaan untuk kiriman yang sudah sampai di dermaga, agar barangnya tercatat sebelum ada yang menyentuhnya.',
  'processFlows.purpose.t_gr_start_inspection':
    'Tim mutu mengambil alih kiriman dan mulai memeriksanya. Sejak titik ini ada orang yang memikul keputusannya.',
  'processFlows.purpose.t_gr_hold':
    'Ada yang tampak tidak beres, sehingga barangnya dibekukan alih-alih diterima atau ditolak. Alasan yang ditulis di sini adalah yang nanti ditanyakan kepada pemasok.',
  'processFlows.purpose.t_gr_request_retest':
    'Masalah yang membekukan barang sudah ditangani — periksa ulang. Tanpa ini, stok yang dibekukan tidak punya jalan kembali untuk dipakai.',
  'processFlows.purpose.t_gr_approve':
    'Tim mutu menerima seluruh kiriman. Pemasok mendapat penilaian bersih untuk kiriman itu dan barangnya boleh dipakai.',
  'processFlows.purpose.t_gr_partial_approve':
    'Sebagian kiriman layak pakai dan sebagian tidak. Paragon menyimpan yang bisa dipakai, sisanya menjadi klaim terhadap pemasok.',
  'processFlows.purpose.t_gr_reject':
    'Tidak ada bagian kiriman yang layak pakai. Alasan yang ditulis di sini menjadi dasar perundingan pemasok dan pembelian, sekaligus menahan pembayaran untuk seluruh lot.',
  'processFlows.purpose.t_gr_post':
    'Menyerahkan penerimaan ini ke SAP agar stoknya ada di pembukuan dan bisa dipakai pabrik. Tidak ada yang benar-benar diterima sebelum SAP menyatakannya.',

  // ── goodsReceiptLine ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.goodsReceiptLine':
    'Putusan per barang di balik hasil keseluruhan sebuah kiriman. Mutu kiriman hanya sebaik barang terburuknya, dan di sinilah hal itu diputuskan.',
  'processFlows.purpose.t_grline_inspect':
    'Seseorang memeriksa satu barang secara fisik — kondisi dan kemasannya — lalu menuliskan apa yang dilihatnya.',
  'processFlows.purpose.t_grline_accept':
    'Barang ini layak pakai. Ia menambah bobot agar kirimannya bisa diloloskan secara utuh.',
  'processFlows.purpose.t_grline_reject':
    'Barang ini tidak layak pakai, disertai alasannya. Satu barang seperti ini sudah cukup membuat kirimannya tidak bisa diloloskan seluruhnya.',
  'processFlows.purpose.t_grline_quarantine':
    'Barangnya disisihkan sampai ada yang memutuskan — belum boleh dipakai, belum juga ditolak. Ini menjaga stok yang meragukan tetap jauh dari produksi.',
  'processFlows.purpose.t_grline_return':
    'Barangnya dikembalikan ke pemasok alih-alih dibuang atau disimpan, sehingga tanggung jawab atas masalahnya ikut kembali.',

  // ── invoice ────────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.invoice':
    'Klaim pemasok untuk dibayar, dan keputusan Paragon atasnya. Satu dokumen per klaim, dari sisi mana pun ia dilihat.',
  'processFlows.purpose.t_invoice_create':
    'Pemasok mulai menyusun tagihan atas pesanan yang telah dipenuhinya, selagi angkanya masih bisa mereka perbaiki.',
  'processFlows.purpose.t_invoice_submit':
    'Pemasok resmi meminta pembayaran. Hitungan tempo pembayaran mulai berjalan dari sini.',
  'processFlows.purpose.t_invoice_match':
    'Paragon mencocokkan tagihan dengan apa yang dipesan dan apa yang diterima. Tagihan yang gagal di pemeriksaan ini bukan tagihan yang bisa dibayar siapa pun.',
  'processFlows.purpose.t_invoice_approve':
    'Keuangan menyetujui bahwa klaimnya memang terutang. Keputusan untuk membayar diambil di sini; uangnya berpindah kemudian.',
  'processFlows.purpose.t_invoice_release_payment':
    'Mengirim instruksi pembayaran ke SAP. Sebelum SAP mengonfirmasi, jangan ada yang memberi tahu pemasok bahwa mereka sudah dibayar.',
  'processFlows.purpose.t_invoice_remit':
    'Pemasok mengakui penerimaan uang beserta nota yang menyertainya. Klaim ini selesai.',
  'processFlows.purpose.t_invoice_dispute':
    'Paragon tidak menerima klaim itu apa adanya, dan menyatakan alasannya. Ini menghentikan hitungan pembayaran dan mengembalikan bola ke pemasok.',
  'processFlows.purpose.t_invoice_resolve':
    'Perselisihannya sudah dituntaskan dan klaimnya dikembalikan untuk diperiksa. Tanpa ini, tagihan yang dipersoalkan tidak punya jalan ke mana pun.',

  // ── invoiceMatch ───────────────────────────────────────────────────────────
  'processFlows.purpose.entity.invoiceMatch':
    'Pemeriksaan tiga arah di balik sebuah tagihan: apa yang dipesan, apa yang datang, dan berapa yang ditagihkan. Inilah sebabnya tagihan yang keliru tertangkap sebelum uang berpindah, bukan sesudahnya.',
  'processFlows.purpose.t_invmatch_await_gr':
    'Tagihannya belum bisa diperiksa sebelum barangnya tercatat masuk. Ini adalah masa tunggu, ditampilkan terang-terangan alih-alih tampak seperti mandek.',
  'processFlows.purpose.t_invmatch_matched':
    'Pesanan, penerimaan, dan tagihan sudah sejalan. Tidak ada lagi yang menghalangi pembayaran.',
  'processFlows.purpose.t_invmatch_qty_variance':
    'Pemasok menagih lebih banyak daripada yang bisa dibuktikan diterima Paragon. Seseorang harus memastikan hitungan mana yang benar.',
  'processFlows.purpose.t_invmatch_price_variance':
    'Harga satuan pada tagihan berada di atas kesepakatan, melampaui toleransi yang diizinkan. Percakapan itu milik pembelian, bukan keuangan.',

  // ── rfq ────────────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.rfq':
    'Sebuah acara pengadaan: Paragon meminta penawaran dari beberapa pemasok atas kebutuhan yang sama, agar perbandingannya setara.',
  'processFlows.purpose.t_rfq_create':
    'Pembelian mulai menyusun permintaan — apa yang dibutuhkan, dalam kategori apa, sebanyak apa — selagi masih bersifat internal.',
  'processFlows.purpose.t_rfq_publish':
    'Menyodorkan permintaan itu kepada para pemasok yang diundang. Sebelum ini tidak ada yang terlihat oleh mereka, jadi inilah saat pengadaan benar-benar dimulai.',
  'processFlows.purpose.t_rfq_close':
    'Jendela tanggapan berakhir. Penawaran yang terlambat tidak ikut dibandingkan, dan itulah yang membuat perbandingannya adil bagi semua yang menjawab tepat waktu.',
  'processFlows.purpose.t_rfq_award':
    'Pembelian memilih penawaran pemenang dan mencatat alasannya. Semua yang ikut menawar tahu posisinya, lewat satu tindakan, bukan lewat kabar burung.',
  'processFlows.purpose.t_rfq_fx_pin':
    'Mencatat dasar kurs yang dipakai membandingkan penawaran bermata uang asing, agar keputusan hari ini masih bisa dijelaskan setahun kemudian.',
  'processFlows.purpose.t_rfq_cancel':
    'Pembelian membatalkan acaranya sebelum memilih siapa pun — kebutuhannya berubah, atau anggarannya hilang. Para pemasok diberi tahu, bukan dibiarkan menunggu.',
  'processFlows.purpose.t_rfq_reopen':
    'Membuka kembali acara yang sudah berakhir untuk tanggapan tambahan — jawabannya terlalu sedikit, atau kebutuhannya bergeser. Permintaan yang sama dipakai ulang alih-alih membuat yang baru.',

  // ── quotation ──────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.quotation':
    'Penawaran seorang pemasok atas satu permintaan pengadaan — harga dan janji pengiriman yang siap mereka pertanggungjawabkan.',
  'processFlows.purpose.t_quotation_submit':
    'Pemasok mengajukan penawarannya: berapa biayanya, dalam mata uang apa, dan berapa lama pengirimannya. Ketiganya, karena harga tanpa tanggal tidak bisa dibandingkan.',
  'processFlows.purpose.t_quotation_review':
    'Pembelian membawa penawaran itu ke tahap penilaian. Ini memisahkan yang sudah dibaca dari yang masih menumpuk.',
  'processFlows.purpose.t_quotation_award':
    'Penawaran ini menang. Ia mengikuti keputusan pembelian atas permintaannya, dan tidak pernah dimasukkan satu per satu secara manual.',
  'processFlows.purpose.t_quotation_reject':
    'Penawaran ini tidak menang. Ia jatuh pada saat yang sama dengan yang menang, sehingga tak ada yang dibiarkan menerka dan tak seorang pun perlu dikabari satu per satu.',

  // ── shipment ───────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.shipment':
    'Rute masuk sebagaimana dilihat logistik — satu perpindahan fisik yang dilacak dari gerbang pemasok sampai halaman Paragon.',
  'processFlows.purpose.t_shipment_create':
    'Membuka pelacakan untuk barang yang ditunggu Paragon, agar ada satu perpindahan masuk sebagai tempat menggantungkan tonggak-tonggaknya sebelum apa pun bergerak.',
  'processFlows.purpose.t_shipment_asn_received':
    'Pemberitahuan awal dari pemasok sudah masuk, dan perpindahan ini kini membawa rincian nyata — apa yang datang, dan kapan.',
  'processFlows.purpose.t_shipment_depart':
    'Barang sudah meninggalkan pemasok. Sejak titik ini, tanggal kedatangan ada di tangan pihak lain.',
  'processFlows.purpose.t_shipment_arrive_port':
    'Barang sampai di pelabuhan masuk. Untuk barang impor, di sinilah rentetan panjang urusan dokumen dimulai.',
  'processFlows.purpose.t_shipment_customs':
    'Barangnya berada di tangan otoritas perbatasan. Tidak ada tindakan Paragon yang bisa mempercepatnya, tetapi mengetahuinya membuat perencana berhenti mengejar pemasok.',
  'processFlows.purpose.t_shipment_dock':
    'Barangnya sudah di gerbang Paragon menunggu giliran bongkar. Keterlambatan sejak titik ini adalah milik Paragon sendiri.',
  'processFlows.purpose.t_shipment_unload':
    'Peti kemasnya sedang dikosongkan. Tim penerimaan bisa mulai menghitung.',
  'processFlows.purpose.t_shipment_deliver':
    'Barangnya sudah masuk secara fisik. Rute logistiknya berakhir dan catatan penerimaan mengambil alih.',

  // ── contract ───────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.contract':
    'Perjanjian tetap yang menjadi dasar pembelian dari seorang pemasok — harga, volume, dan syarat yang diwarisi setiap pesanan alih-alih dirundingkan ulang tiap kali.',
  'processFlows.purpose.t_contract_draft':
    'Pembelian mulai menyusun syarat bersama pemasok, sebelum ada yang mengikat kedua pihak.',
  'processFlows.purpose.t_contract_activate':
    'Syarat-syaratnya mulai berlaku. Pesanan yang diterbitkan sejak sekarang mewarisinya, jadi inilah saat harga hasil perundingan menjadi harga sungguhan.',
  'processFlows.purpose.t_contract_renew':
    'Perjanjiannya dilanjutkan untuk satu periode berikutnya. Dicatat sebagai tindakan tersendiri agar tak seorang pun perlu menebak apakah tanggal yang lewat itu kelalaian atau keputusan.',
  'processFlows.purpose.t_contract_terminate':
    'Perjanjiannya berakhir, pada masanya atau sebelum itu. Tidak ada lagi pembelian baru di bawahnya sejak titik ini, apa pun kata kalender.',

  // ── obligation ─────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.obligation':
    'Sebuah janji yang tertulis dalam perjanjian — volume, potongan, tingkat layanan — dilacak agar ada yang menyadari apakah janji itu benar-benar ditepati.',
  'processFlows.purpose.t_obligation_track':
    'Mulai mengawasi satu komitmen dari sebuah perjanjian, agar ia hidup di suatu tempat selain dokumen yang tak pernah dibaca ulang.',
  'processFlows.purpose.t_obligation_complete':
    'Komitmennya sudah dipenuhi. Dicatat karena janji yang tak ditepati hanya terlihat kalau yang ditepati ikut ditandai.',

  // ── purchaseRequisition ────────────────────────────────────────────────────
  'processFlows.purpose.entity.purchaseRequisition':
    'Permintaan internal yang memulai segalanya: ada orang di pabrik yang butuh sesuatu dibeli, dan menyampaikannya di tempat yang bisa ditelaah dan dilacak.',
  'processFlows.purpose.t_pr_create':
    'Pemohon menuliskan apa yang dibutuhkan pabrik, agar kebutuhan itu masuk ke Paragon sebagai dokumen, bukan sebagai pesan yang bisa terlupakan.',
  'processFlows.purpose.t_pr_submit':
    'Mengirim permintaan itu untuk diputuskan. Sebelum ini terjadi, ia hanyalah catatan satu orang, bukan klaim atas anggaran.',
  'processFlows.purpose.t_pr_approve':
    'Pemegang anggaran menyetujui bahwa kebutuhannya nyata dan ada dananya. Tidak ada pengadaan atau pemesanan sebelum ini.',
  'processFlows.purpose.t_pr_reject':
    'Keputusannya tidak. Permintaannya berhenti di sini alih-alih menua diam-diam dalam antrean.',
  'processFlows.purpose.t_pr_revise':
    'Mengembalikan permintaan yang ditolak ke tangan pemohon disertai catatan tentang apa yang berubah, agar penelaah berikutnya melihat dokumen yang berbeda.',
  'processFlows.purpose.t_pr_source':
    'Kebutuhan ini ditawarkan ke beberapa pemasok sekaligus, bukan langsung ke satu yang sudah dikenal. Dicatat pada permintaannya agar pemohon bisa melihat ke mana kebutuhannya pergi.',
  'processFlows.purpose.t_pr_convert':
    'Kebutuhan itu sudah menjadi pesanan sungguhan. Inilah yang menutup lingkaran bagi siapa pun yang mengajukannya.',

  // ── supplierDocument ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.supplierDocument':
    'Dokumen yang wajib dipegang Paragon atas seorang pemasok — sertifikat, izin, rincian bank — dan posisi masing-masing.',
  'processFlows.purpose.t_supplierdoc_request':
    'Paragon meminta satu berkas tertentu dari pemasok, agar celahnya ada di daftar seseorang, bukan baru ketahuan saat audit.',
  'processFlows.purpose.t_supplierdoc_submit':
    'Pemasok menyerahkan apa yang diminta. Sejak titik ini keterlambatan ada di pihak Paragon, bukan pada mereka.',
  'processFlows.purpose.t_supplierdoc_verify':
    'Ada yang sudah memastikan berkasnya asli dan masih berlaku. Baru sekaranglah ia berarti sesuatu.',
  'processFlows.purpose.t_supplierdoc_reject':
    'Berkasnya tidak memenuhi kebutuhan — keliru, kedaluwarsa, atau tidak terbaca — dan pemasok diminta lagi.',

  // ── compliance ─────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.compliance':
    'Apakah seorang pemasok memegang sertifikat yang benar-benar dituntut oleh sebuah bahan — halal, BPOM, dan lainnya — serta posisi tiap persyaratan hari ini.',
  'processFlows.purpose.t_compliance_submit':
    'Pemasok menyerahkan sertifikat untuk persyaratan yang belum dipenuhinya. Hanya dengan cara inilah celah itu tertutup.',
  'processFlows.purpose.t_compliance_verify':
    'Sertifikatnya sudah diperiksa dan terbukti sah. Bahan yang tercakup olehnya boleh dibeli tanpa pengecualian.',
  'processFlows.purpose.t_compliance_reject':
    'Sertifikatnya tidak memenuhi persyaratan, sehingga persyaratan itu tertunggak lagi dan pemasok harus mencoba sekali lagi.',

  // ── requirementResponse ────────────────────────────────────────────────────
  'processFlows.purpose.entity.requirementResponse':
    'Jawaban pemasok atas satu baris ramalan yang diterbitkan: berapa banyak dari yang diminta Paragon yang benar-benar bisa dipasok, pada periode itu.',
  'processFlows.purpose.t_requirementresponse_submit':
    'Pemasok menghitung apa yang bisa dikomitmenkannya terhadap satu baris ramalan, selagi angkanya masih bisa mereka ubah.',
  'processFlows.purpose.t_requirementresponse_acknowledge':
    'Pemasok memastikan telah melihat sebuah baris yang tidak meminta komitmen apa pun. Diam dan “sudah dilihat” adalah dua fakta berbeda, dan perencanaan memakainya secara berbeda.',
  'processFlows.purpose.t_requirementresponse_promote':
    'Mengirim komitmen itu ke perencana Paragon. Sebelum ini tidak ada yang terlihat oleh perencanaan, jadi inilah tindakan yang membuat sebuah janji benar-benar menjadi janji.',
  'processFlows.purpose.t_requirementresponse_review':
    'Perencana membawa jawaban itu ke tahap penilaian alih-alih memakainya begitu saja.',
  'processFlows.purpose.t_requirementresponse_accept':
    'Perencana memakai komitmen itu sebagai angka untuk merencanakan. Perencanaan di hilir memperlakukannya sebagai nyata sejak titik ini.',
  'processFlows.purpose.t_requirementresponse_dispute':
    'Perencana tidak memakai jawaban itu — selisihnya terlalu besar, atau alasan yang diberikan tidak kuat — dan menyampaikannya kepada pemasok.',
  'processFlows.purpose.t_requirementresponse_resolve':
    'Perselisihannya sudah dibereskan dan jawabannya dikembalikan untuk diputuskan, alih-alih menggantung tanpa penyelesaian.',

  // ── inventoryDeclaration ───────────────────────────────────────────────────
  'processFlows.purpose.entity.inventoryDeclaration':
    'Apa yang dinyatakan pemasok sedang dipegangnya saat ini, untuk satu barang. Inilah angka yang dipakai Paragon untuk merencanakan ketika ia tidak bisa melihat stok pemasok sendiri.',
  'processFlows.purpose.t_inventorydeclaration_declare':
    'Pemasok menyatakan sendiri stok yang dipegangnya. Setiap pernyataan disimpan, sehingga apa yang disampaikan bulan lalu masih ada untuk dibandingkan.',
  'processFlows.purpose.t_inventorydeclaration_record':
    'Perencana mencatat stok yang dilaporkan pemasok lewat obrolan atau surel. Disimpan terpisah dari pernyataan pemasok sendiri, karena siapa yang mengatakannya jadi penting ketika angkanya ternyata keliru.',

  // ── incomingShipment ───────────────────────────────────────────────────────
  'processFlows.purpose.entity.incomingShipment':
    'Satu rute pasokan yang dilaporkan pemasok kepada Paragon — barang menuju Paragon, atau barang yang berpindah antara prinsipal dan distributor yang menjadi sandaran pasokan Paragon sendiri.',
  'processFlows.purpose.t_incomingshipment_report':
    'Pemasok memberi tahu Paragon bahwa ada satu kiriman, apa isinya dan sebanyak apa. Beginilah keterlihatan pasokan dimulai tanpa menunggu barangnya datang.',
  'processFlows.purpose.t_incomingshipment_ship':
    'Rute ini sudah berangkat. Tanggal tibanya berhenti menjadi rencana dan berubah menjadi perkiraan perjalanan.',
  'processFlows.purpose.t_incomingshipment_arrive':
    'Rute ini sudah mendarat. Untuk rute penjaminan pasokan, di sinilah risiko Paragon mengendur.',
  'processFlows.purpose.t_incomingshipment_cancel':
    'Rute ini dibatalkan di tengah jalan. Lebih baik dicatat daripada dibiarkan dalam rencana sebagai stok yang tak akan pernah datang.',

  // ── enforcement ────────────────────────────────────────────────────────────
  'processFlows.purpose.entity.enforcement':
    'Seberapa keras tiap aturan menggigit — menghalangi, memperingatkan, atau sekadar mengamati — dicatat sebagai keputusan yang dibuat seseorang, bukan pengaturan tanpa pemilik.',
  'processFlows.purpose.t_enforcement_set':
    'Seseorang memutuskan seberapa ketat satu aturan diterapkan, dan namanya tercatat untuk itu. Melonggarkan sebuah aturan justru tindakan yang ditanyakan audit setahun kemudian.',

  'processFlows.purpose.entity.role':
    'Salinan satu paket izin dengan izin tambahan di atasnya, disimpan sebagai catatan tentang apa yang disalin dan oleh siapa — sehingga kursi yang dibuat seseorang Selasa lalu terbaca berbeda dari kursi standar.',
  'processFlows.purpose.t_role_grant':
    'Seseorang menyalin satu kumpulan izin lalu memperluasnya. Memperluas tidak pernah menghapus apa pun, sehingga tidak ada yang diam-diam kehilangan wewenang yang diandalkan darinya, dan tindakan itu dicatat seperti setiap tindakan diatur lainnya.',
};
