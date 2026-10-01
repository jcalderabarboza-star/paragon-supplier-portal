---
entity: goodsReceipt
locale: en
title: Goods receipt
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_gr_create
  - t_gr_start_inspection
  - t_gr_hold
  - t_gr_request_retest
  - t_gr_approve
  - t_gr_partial_approve
  - t_gr_reject
  - t_gr_post
---

<!-- section:summary -->
## 1 · What this process is

Paragon's record of what physically turned up and whether it was fit to use. It is the fact finance pays against, so anything wrong here becomes a billing argument later. A goods receipt (GR) is a **buyer-side** document: the warehouse receives an inbound shipment or advance ship notice, inspects it line by line, and disposes it. The header outcome — Approved, Partially Approved or Rejected — is **never chosen**; it is rolled up from the inspected lines, and the machine re-derives that rollup before it lets the verb through.

One lane does everything: buyer **receiving** (atoms `gr:receive`, `gr:inspect`, `gr:disposition`, `gr:post`). The single door is `/buyer/goods-receipt` (**Goods Receipt & Quality Control**): the **New GR** button and the **Start inspection** footer both open the same four-step wizard — **Source selection → Receipt details → Quality checks → Disposition & submit** — whose last button, **Create GR**, fires the whole chain in one go: create, start inspection, the rolled-up disposition, and (if ticked) **Post to SAP**. The supplier never touches a GR; the supplier feels it through the ASN, which a rejected or partially approved receipt flags as a discrepancy.

Honesty markers: the fourteen seeded receipts are **SIMULATED fixtures** and the page's provenance marker says so; **Posting to SAP → Posted to SAP** is a real two-act SAP boundary in the command spine, but the "SAP" that settles it is the in-memory mock, which mints the material document number; `t_gr_hold` is registered and **no screen fires it** (the one `Quality Hold` row is a fixture); the footer buttons **Submit inspection results**, **Override hold**, **View in SAP**, **Export** and **Lab Results** are toasts that say plainly they do nothing; the halal **certificate notice** on the quality step tells the receiver something is wrong but does not stop the receipt.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Pending Inspection | operator action · creation | buyer · receiving | `t_gr_create` |
| 2 | Pending Inspection → Under Inspection | operator action (fired by the wizard's one commit) | buyer · receiving | `t_gr_start_inspection` |
| 3 | Under Inspection → Quality Hold | not active (no caller) | buyer · receiving | `t_gr_hold` |
| 4 | Quality Hold → Under Inspection | operator action | buyer · receiving | `t_gr_request_retest` |
| 5a | Under Inspection → Approved | operator action (rolled up) | buyer · receiving | `t_gr_approve` |
| 5b | Under Inspection → Partially Approved | operator action (rolled up) · cascades `t_asn_discrepancy` | buyer · receiving | `t_gr_partial_approve` |
| 5c | Under Inspection → Rejected | operator action (rolled up) · cascades `t_asn_discrepancy` | buyer · receiving | `t_gr_reject` |
| 6 | Approved, Partially Approved → Posting to SAP ⇒ Posted to SAP | SAP boundary (submitted, then settled) · cascades `t_invoice_match` | buyer · receiving | `t_gr_post` |
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:57-188; src/services/transitions/grRollup.ts:49-72 -->

Terminals: `Rejected` and `Posted to SAP`. `Quality Hold` is deliberately not a terminal — it is a hold with one exit (retest).

**Forks**

- **At Under Inspection:** `t_gr_approve` — receiving — when every line rolls up Accepted; `t_gr_partial_approve` — receiving — when the lines are a mix; `t_gr_reject` — receiving — when every line rolls up Rejected; `t_gr_hold` — receiving — never in practice (no caller). The receiver does not pick among the first three: the wizard reads the lines and offers the one the rollup names.
- **At Approved / Partially Approved:** `t_gr_post` — receiving — when the receiver ticks **Auto-post to SAP** in the wizard, or later presses **Post to SAP** in the receipt's footer. There is no other exit; an approved receipt that is never posted simply stays where it is.

<!-- section:steps -->
## 3 · Step by step

### t_gr_create — Create GR <!-- transition:t_gr_create -->

- **Step kind:** operator action · creation
- **Role:** buyer · receiving (atom `gr:receive`)
- **From → to:** ∅ → Pending Inspection
- **Operator — where:** `/buyer/goods-receipt` → **New GR** (header) or **Start inspection** (footer of a `Pending Inspection` receipt, which opens the wizard with that receipt's shipment pre-selected) → wizard step 1 **Source selection**: either **Select inbound at dock** (a list of shipments **At Dock** / **Unloading** plus every live ASN in Submitted / In Transit / Delivered, the latter labelled "No dock appointment · Scheduled via TMS") or **Enter ASN number** (resolves only against the live ASN store). Then step 2 **Receipt details**, step 3 **Quality checks**, step 4 **Disposition & submit** → **Create GR**.
- **Operator — do:** open the receiving record for a delivery that has reached the dock, so the goods are accounted for before anybody touches them. On step 2 record **Received Date**, **Received By** (free text), **Warehouse Location**, optional **Notes**, and per line the **Received** and **Accepted** quantities (Rejected is derived; a rejection reason is required on any line with a rejected quantity). On step 3 answer **Visual Inspection** and **Packaging Integrity** per line, plus **Halal Seal Check** and **BPOM Lot Tracking** where the material master says the material requires them; tick **Lab sample required** if a lab sample is taken.
- **Operator — fill:** `asnReference` (the chosen shipment's or ASN's number). The wizard also sends `inspectionResults` (one row per line: material, expected / received / accepted / rejected quantities, the four checks, rejection reason), `receivedDate`, `receivedBy`, `notes`.
- **Tester — expected state:** Pending Inspection — for an instant only. The same **Create GR** click immediately continues to `t_gr_start_inspection` and the rolled-up disposition, so the state a tester sees after the wizard closes is Approved / Partially Approved / Rejected (or Posting to SAP / Posted to SAP with auto-post).
- **Tester — confirm:** a new row **GR-2026-0xx** (store-assigned) appears at the top of the list with the chosen ASN and PO numbers; toast **"GR-… — <disposition> — <correlationId> recorded. Header disposition derived from the inspected lines."** (or the posting toasts, below). The wizard's step 4 previews the result: **Header Disposition (derived from lines)** — "Rolled up from N lines — X accepted, Y rejected. Not editable".
- **Tester — trigger event:** `t_gr_create`
- **Checks that can refuse:** `gr_create_shipment_received` — the referenced shipment must be At Dock, Unloading or Delivered, or the reference must be an ASN the store holds ("no arrived shipment or ASN found for …" otherwise); `gr_inspection_materials_declared` — every inspected material code must be one the shipment or ASN declared ("UNDECLARED_MATERIAL: … the parent document never declared this material"). Creation scope is buyer-side: a buyer receives any supplier's inbound.
- **Glossary:** `POLICY_REJECTED`, `MISSING_FIELDS`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`, `UNKNOWN_MATERIAL`, `UNDETERMINED_APPLICABILITY`, `halal.seal`, `bpom.lot`, `BLOCK`.
- **Honesty:** **Start inspection** on a seeded `Pending Inspection` row does **not** advance that row — the wizard always creates a **new** receipt, so the fixture stays `Pending Inspection` beside the new one. **Enter ASN number** does not recognise dock shipment numbers (`ASN-2026-0xx`): only ASN-store numbers (`ASN-2025-…`) resolve there. On the quality step a material whose master entry is unknown or has no halal / BPOM determination **blocks the line** ("cannot be inspected until…"); a required check left unanswered blocks under the default `BLOCK` mode ("Not answered. This check is required…"). The **halal certificate notice** ("Halal certificate — action needed." with the reason: no certificate, expired, scheme invalid, under review) **tells and does not stop**; the receipt proceeds. Receipt lines and the `Received By` text are recorded as typed; no person is resolved from them.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:58-77; src/services/data/mock/MockCommandService.ts:237-311,313-375; src/components/v2-features/GRInspectionWizard.tsx:226-230,650-670,910-916,951-1037,1230-1330,1415-1463,1524-1583; src/pages-v2/BuyerGoodsReceipt.tsx:480-503,767-808; src/services/query/commandHooks.ts:615-635; src/lib/i18n/goodsReceipt.ts:139-267; src/lib/i18n.ts:522-531 -->

### t_gr_start_inspection — Start inspection <!-- transition:t_gr_start_inspection -->

- **Step kind:** operator action (fired as the second act of the wizard's one commit)
- **Role:** buyer · receiving (atom `gr:inspect`)
- **From → to:** Pending Inspection → Under Inspection
- **Operator — where:** `/buyer/goods-receipt` → the same **Create GR** button. There is no separate control for it; the finalize hook dispatches it right after the create returns, then continues with the rolled-up disposition. The **Start inspection** footer button on a seeded row opens the wizard (see `t_gr_create`).
- **Operator — do:** quality picks the delivery up and starts checking it; from here somebody owns the decision. In practice the receiver did the checking on the wizard's step 3 before pressing the button.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Under Inspection — transient in the wizard path; the disposition follows in the same click.
- **Tester — confirm:** the audit trail carries a `t_gr_start_inspection` event under its own correlation id immediately after `t_gr_create`; on the page the row is already at its disposition. The seeded `Under Inspection` rows (`gr-001`, `gr-008`) show the state chip and the **Submit inspection results** footer.
- **Tester — trigger event:** `t_gr_start_inspection`
- **Checks that can refuse:** none beyond role, legality and required fields. A receipt already `Under Inspection` answers `ILLEGAL_TRANSITION`, which the finalize hook deliberately ignores.
- **Glossary:** `ILLEGAL_TRANSITION`.
- **Honesty:** for the two seeded `Under Inspection` receipts the footer offers **Submit inspection results**, which is a toast ("Submit form will open in a future release") — a seeded receipt in this state **cannot be dispositioned** from the page; only a wizard-created receipt reaches the disposition verbs.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:78-88; src/services/query/commandHooks.ts:647-675; src/pages-v2/BuyerGoodsReceipt.tsx:504-517; src/lib/i18n/goodsReceipt.ts:72,88-89 -->

### t_gr_hold — Put the receipt on quality hold <!-- transition:t_gr_hold -->

- **Step kind:** not active (no caller)
- **Role:** buyer · receiving (atom `gr:inspect`)
- **From → to:** Under Inspection → Quality Hold
- **Operator — where:** not offered anywhere today.
- **Operator — do:** nothing can be done — the verb exists so that goods that look wrong can be frozen rather than taken or refused, with the reason written down for the supplier to answer, but no screen fires it.
- **Operator — fill:** `holdReason` would be required (text with substance); no form collects it.
- **Tester — expected state:** Quality Hold (fixture-only)
- **Tester — confirm:** the seeded `gr-007` (GR-2026-007) shows the `Quality Hold` chip, counts in the **On Quality Hold** KPI ("Quarantined / retest") and the **Quality Hold** tab, and offers **Request lab retest** and **Override hold** in the footer.
- **Tester — trigger event:** `t_gr_hold` (never emitted by a surface)
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `MISSING_FIELDS` (what a hand-crafted dispatch without `holdReason` would get).
- **Honesty:** **WIRED-NO-CALLER.** The rollup vocabulary the wizard uses (Pending / Accepted / Rejected / Partial per line) has no hold state, so the wizard cannot land here. **Override hold** on the fixture is a toast: "Nothing was overridden. An override must name the person who accepted the risk, and the platform cannot yet name a person."
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:89-99; src/pages-v2/BuyerGoodsReceipt.tsx:519-566; src/data/mockGoodsReceipts.ts:222-247; _derived/surfaces.md:16 -->

### t_gr_request_retest — Request lab retest <!-- transition:t_gr_request_retest -->

- **Step kind:** operator action
- **Role:** buyer · receiving (atom `gr:inspect`)
- **From → to:** Quality Hold → Under Inspection
- **Operator — where:** `/buyer/goods-receipt` → open a `Quality Hold` receipt (or **Quality Hold** tab) → side panel footer → **Request lab retest** (shows **Releasing…** in flight).
- **Operator — do:** say that the problem that froze the goods has been dealt with and the receipt should be looked at again. Without this, frozen stock has no way back into use.
- **Operator — fill:** nothing to fill — payload-free; the hold already recorded its reason.
- **Tester — expected state:** Under Inspection
- **Tester — confirm:** toast **"GR-… back under inspection — The hold is released. Record the retest result, then take a disposition."**; the chip reads `Under Inspection`; the **On Quality Hold** KPI decrements and the row moves to the **Under Inspection** tab; the **Disposition workflow** timeline in the panel moves back a step.
- **Tester — trigger event:** `t_gr_request_retest`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Honesty:** it lands on `Under Inspection`, not `Pending Inspection`, because that is where a decision can be taken — but for a **seeded** receipt the footer there is the **Submit inspection results** toast, so `gr-007`, once released, cannot be dispositioned from the page. A seat without `gr:inspect` sees **Awaiting Receiving** in the retest slot.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:100-129; src/pages-v2/BuyerGoodsReceipt.tsx:519-540,727-750; src/services/query/commandHooks.ts:706-724; src/lib/i18n/goodsReceipt.ts:73,90-95 -->

### t_gr_approve — Approve the whole delivery <!-- transition:t_gr_approve -->

- **Step kind:** operator action (the header verb the rollup names)
- **Role:** buyer · receiving (atom `gr:disposition`)
- **From → to:** Under Inspection → Approved
- **Operator — where:** `/buyer/goods-receipt` → wizard step 4 **Disposition & submit** → **Create GR**, when the derived header reads **Approved**.
- **Operator — do:** quality takes the whole delivery; the supplier gets clean credit for it and the goods can be used. The receiver reaches this by entering accepted quantities equal to the received quantities on every line and passing every check.
- **Operator — fill:** nothing beyond the lines already recorded at create.
- **Tester — expected state:** Approved (or straight on to Posting to SAP / Posted to SAP with **Auto-post to SAP** ticked, which is the default)
- **Tester — confirm:** toast **"GR-… — Approved — … Header disposition derived from the inspected lines."**; chip `Approved`; the row's **Disposition** column reads Accept; the footer offers **Post to SAP**; the **Approved Today** KPI counts it. The panel's **Next** line reads **Your move** for a receiving seat.
- **Tester — trigger event:** `t_gr_approve`
- **Checks that can refuse:** `gr_rollup_all_accepted` — the stored lines must roll up to Approved: every line Accepted, meaning no rejected quantity and no failed visual / packaging / halal-seal / BPOM check, and no line still Pending ("line rollup is '…', not 'Approved'" otherwise).
- **Glossary:** `POLICY_REJECTED`, `PASS`, `ADVERSE`.
- **Honesty:** no cascade fires on approve. The wizard cannot offer Approve when the lines disagree — it computes the same rollup the hook re-checks — so the refusal is reachable only by a hand-crafted dispatch.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:130-141; src/services/transitions/policies.ts:135-150; src/services/transitions/grRollup.ts:18-33,49-58,61-72; src/components/v2-features/GRInspectionWizard.tsx:705-737,1585-1606; src/lib/i18n.ts:532-533 -->

### t_gr_partial_approve — Approve part, reject part <!-- transition:t_gr_partial_approve -->

- **Step kind:** operator action (the header verb the rollup names) · cascade source
- **Role:** buyer · receiving (atom `gr:disposition`)
- **From → to:** Under Inspection → Partially Approved
- **Operator — where:** `/buyer/goods-receipt` → wizard step 4 → **Create GR**, when the derived header reads **Partially Approved**.
- **Operator — do:** some of the delivery is usable and some is not; Paragon keeps what it can use, and the rest becomes a claim against the supplier. The receiver reaches this by accepting fewer units than received on a line (a **Rejection Reason** is then required on that line), or by failing a check on a line that still has accepted units, while at least one other line is clean.
- **Operator — fill:** nothing beyond the recorded lines; the wizard's per-line rejection reason travels inside `inspectionResults`, not as a header field.
- **Tester — expected state:** Partially Approved (then Posting to SAP / Posted to SAP with auto-post)
- **Tester — confirm:** toast **"GR-… — Partially Approved — …"**; chip `Partially Approved`; footer **Post to SAP**. If the receipt named a live ASN (`ASN-2025-…`), that ASN now reads `Discrepancy` on `/supplier/shipments` and appears in this page's **Shipment discrepancies** section.
- **Tester — trigger event:** `t_gr_partial_approve` (fires `t_asn_discrepancy` on the linked ASN)
- **Checks that can refuse:** `gr_rollup_mixed` — the lines must roll up to Partially Approved: no line Pending, not all Accepted, not all Rejected.
- **Glossary:** `POLICY_REJECTED`, `ADVERSE`.
- **Honesty:** the cascade is best-effort and silent: a receipt created from a dock shipment (`ASN-2026-0xx`) has no matching ASN in the store, so nothing is flagged and nothing says so. The seeded `gr-010` in this state carries a `sapMaterialDoc` although it was never posted — a fixture field nothing wrote.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:142-154; src/services/transitions/policies.ts:135-150; src/services/transitions/cascades.ts:24-30; src/services/data/mock/MockCommandService.ts:2884-2889; src/components/v2-features/GRInspectionWizard.tsx:1191-1215; src/data/mockGoodsReceipts.ts:301-325 -->

### t_gr_reject — Reject the whole delivery <!-- transition:t_gr_reject -->

- **Step kind:** operator action (the header verb the rollup names) · cascade source
- **Role:** buyer · receiving (atom `gr:disposition`)
- **From → to:** Under Inspection → Rejected (terminal)
- **Operator — where:** `/buyer/goods-receipt` → wizard step 4 → **Rejection Reason (required)** ("Explain the full-lot rejection") → **Create GR**, when the derived header reads **Rejected**.
- **Operator — do:** none of the delivery is usable. The reason written here is what the supplier and buying argue from, and it blocks payment for the lot. The receiver reaches this by accepting zero units on every line (or failing a check on every line with nothing accepted).
- **Operator — fill:** `dispositionReason` — the header rejection reason; the wizard will not enable **Create GR** on a Rejected rollup until it has text.
- **Tester — expected state:** Rejected
- **Tester — confirm:** toast **"GR-… — Rejected — …"**; chip `Rejected` (danger tone); the row's **Disposition** reads Reject; no footer verb (terminal); the **Rejection Rate (30d)** KPI moves; the linked live ASN (if any) reads `Discrepancy` and appears under **Shipment discrepancies**.
- **Tester — trigger event:** `t_gr_reject` (fires `t_asn_discrepancy` on the linked ASN)
- **Checks that can refuse:** `MISSING_FIELDS` first if `dispositionReason` is blank (the page renders "A rejection reason is required to reject this receipt."); then `gr_rollup_all_rejected` — every line must roll up Rejected.
- **Glossary:** `MISSING_FIELDS`, `POLICY_REJECTED`, `ADVERSE`.
- **Honesty:** `Rejected` is a terminal — there is no return-to-supplier or re-inspect verb after it on the header (the seeded `gr-011` shows a "Return to Supplier" disposition label that is fixture data, not a state). Auto-post never fires on a rejected receipt. The cascade caveat under `t_gr_partial_approve` applies.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:155-166; src/services/transitions/policies.ts:135-150; src/components/v2-features/GRInspectionWizard.tsx:921-925,1440-1452,1585-1606; src/lib/i18n.ts:534-536; src/data/mockGoodsReceipts.ts:328-353 -->

### t_gr_post — Post to SAP <!-- transition:t_gr_post -->

- **Step kind:** SAP boundary — submitted, then settled (records a fact in SAP) · cascade source
- **Role:** buyer · receiving (atom `gr:post`)
- **From → to:** Approved, Partially Approved → Posting to SAP ⇒ Posted to SAP (terminal, reached only by settlement)
- **Operator — where:** `/buyer/goods-receipt` → either the wizard's **Auto-post to SAP** tick-box (on by default; fires right after the disposition), or the footer **Post to SAP** on an `Approved` / `Partially Approved` receipt.
- **Operator — do:** hand the receipt to SAP so the stock exists in the books and the plant can consume it. Nothing is truly received until SAP says so. The act is two-part: the portal **submits** and shows the interim `Posting to SAP` with no material document; the SAP callback **settles** it to `Posted to SAP` and assigns the material document number.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Posting to SAP (interim, usually for a moment) ⇒ Posted to SAP
- **Tester — confirm:** toasts **"GR-… posting to SAP — Submitted to SAP — awaiting the material-document callback. No document assigned yet."** then **"GR-… posted to SAP — SAP assigned the material document on settlement."**; the **SAP Doc** column fills with **MAT-DOC-…**; the footer becomes **View in SAP**; the **Disposition workflow** timeline completes **Posted to SAP**. While interim, the footer reads "Awaiting SAP settlement — no material document yet". If a Submitted invoice shares the receipt's PO and the 3-way verdict is Matched, that invoice advances (`t_invoice_match`); a Qty Mismatch / Price Variance is written on the invoice but does not advance it.
- **Tester — trigger event:** `t_gr_post` (outcome `submitted`, then a second `done` event under the same correlation id on settle; fires `t_invoice_match` on a Matched invoice)
- **Checks that can refuse:** none beyond role, legality and required fields on the submit. The **settlement** can fault separately: `REFUSED` (asking again will not help), `TRANSPORT` (the settling system did not answer; retry is safe), `UNGOVERNED` (unclassified; not retryable).
- **Glossary:** `REFUSED`, `TRANSPORT`, `UNGOVERNED`, `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Honesty:** the "SAP" is the in-memory mock; the material document number is minted by the store on settle, never client-side. A failed settle leaves the receipt at `Posting to SAP`; this page offers **Retry settlement** only for a fault this session saw and only when it is retryable, and says "Settlement was refused. Asking again will not change the answer…" otherwise. A receipt parked by an earlier session shows the wait and offers nothing. **View in SAP** is a toast ("SAP document view not available yet"). Posting a receipt does **not** move the purchase order; the PO's delivery state is S/4HANA's own fact.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:167-187; src/services/data/mock/MockCommandService.ts:2746-2883,2962-2969; src/pages-v2/BuyerGoodsReceipt.tsx:567-620,642-720; src/components/v2-features/GRInspectionWizard.tsx:1608-1678; src/services/query/commandHooks.ts:678-751; src/lib/i18n.ts:537-562; src/lib/i18n/goodsReceipt.ts:76-86 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Which disposition (at Under Inspection).** Not a choice but a derivation, line by line: a line is **Accepted** when its accepted quantity equals its received quantity and every check passed; **Rejected** when nothing was accepted and something was rejected or a check failed; **Partial** when some units were accepted and some rejected or a check failed; **Pending** when its checks are still pending and no quantity was entered. Then the header — Branch A `t_gr_approve` — **When:** every line Accepted. Branch B `t_gr_reject` — **When:** every line Rejected (header reason required). Branch C `t_gr_partial_approve` — **When:** any other mix. No branch — **When:** any line is Pending: the wizard will not let you finish.
- **Post now or later (at Approved / Partially Approved).** Branch A — **Auto-post to SAP** ticked — **When:** the receiver wants the stock in the books immediately (default). Branch B — untick, then **Post to SAP** from the footer later — **When:** something must be checked first. Either way the exit is `t_gr_post`.
- **Quality hold (exception path).** Entry — `t_gr_hold` — **When:** never today (no caller); the fixture `gr-007` is the only specimen. Exit — `t_gr_request_retest` — **When:** the condition that caused the hold has been addressed; lands on `Under Inspection`. **Override hold** — **When:** never today; it needs a named person and the platform cannot name one.
- **Rejected (exception path, terminal).** No exit. The supplier's ASN is flagged `Discrepancy` and the receiver later reconciles it on this same page (see the advance ship notice guide).
- **A failed settlement (exception path at Posting to SAP).** Branch A — **Retry settlement** — **When:** the fault was `TRANSPORT` and this session issued the post. Branch B — nothing offered — **When:** the fault was `REFUSED` / `UNGOVERNED`, or the post came from another session.
- **A halal certificate that does not satisfy (inside the wizard).** No branch in the machine: the notice names the reason (`NO_CERT`, `EXPIRED`, `SCHEME_INVALID`, `UNDER_REVIEW`) and says "This does not stop the receipt. Record it and raise the renewal with the supplier and the compliance team."

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| On Quality Hold ("Quarantined / retest") | operator-raised (fixture only today) | Quality Hold | a receipt is in `Quality Hold` | `/buyer/goods-receipt` KPI tile, **Quality Hold** tab, danger-tone chip |
| Rejection Rate (30d) | derived at read | all | rejected quantity over received quantity | KPI tile |
| Pending Inspection ("Awaiting QC start") | derived at read | Pending Inspection | count of receipts not yet inspected | KPI tile, **Pending** tab |
| Awaiting SAP settlement — no material document yet | derived at read (settling) | Posting to SAP | the post was submitted and not yet settled | side panel footer |
| Settlement was refused… / Retry settlement | external (settle fault, classified) | Posting to SAP | this session saw the settle fail | side panel footer |
| Shipment discrepancies | operator-raised via cascade | (ASN side) Discrepancy | a reject / partial approve flagged a live ASN | section above the tabs, with **Reconcile** |
| Halal certificate — action needed | derived at read against the compliance registry (SIMULATED sample certificates) | wizard step 3 | the supplier × material has no satisfying certificate at the receipt instant | per-line notice in **Quality checks** |
| Halal / BPOM applicability cannot be determined | derived at read from the material master | wizard step 3 | material code unknown or undetermined | per-line refusal block; the line cannot be inspected |
| Not answered. This check is required… | derived at read | wizard step 3 | a required halal-seal / BPOM-lot check is unanswered under `BLOCK` | per-line marker; **Create GR** stays disabled |
| Awaiting Receiving | derived at read (handoff) | all | the seat lacks one of `gr:receive` / `gr:inspect` / `gr:post` (first missing named) or `asn:flag` | header beside **New GR**, footers, reconcile cell |
| Your move | derived at read (next act) | Pending Inspection, Under Inspection, Quality Hold, Approved, Partially Approved | the receiving seat holds a legal verb from the state; at `Posting to SAP` the line yields to the footer's settlement text; at the two terminals it renders nothing | **Next** line under the status in the panel |
| Provenance marker | SIMULATED marker | all | always | meta line |
<!-- src: src/pages-v2/BuyerGoodsReceipt.tsx:272-287,343-372,567-602,824-870,1146; src/components/v2-features/GRInspectionWizard.tsx:428-534,844-858,1295-1373; src/lib/i18n/goodsReceipt.ts:34-41,83-86,204-260 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `gr-002` (GR-2026-002, state `Pending Inspection`, supplier `sup-007`).

| Joins to | By | Note |
|---|---|---|
| Shipment | `asnId` = `shp-012`, `asnNumber` = `ASN-2026-012` (status At Dock) | the dock source the wizard pre-selects from **Start inspection**; the shipment is a TMS-shaped fixture, not an ASN-store document |
| Advance ship notice | `asnNumber` | the cascade key for `t_asn_discrepancy`; **no seeded GR names an ASN-store number**, so seeded receipts never flag a seeded ASN |
| Purchase order | `poNumber` = `PO-2025-00107` (`po-007`) | read by the GR-post 3-way match (`confirmedQty × unitPrice`); the GR never writes to the PO |
| Supplier | `supplierId` = `sup-007`, `supplierName` | derived from the parent shipment or ASN at create; used for per-supplier read scoping; the panel shows the supplier from the supplier list |
| Invoices | invoice `poNumber` = GR `poNumber`, invoice `status` = Submitted | on `t_gr_post` the resolver writes the invoice's `matchStatus` and fires `t_invoice_match` only on Matched |
| Inspection lines | `inspectionResults[]` (`materialCode`, `qtyExpected`, `qtyReceived`, `qtyAccepted`, `qtyRejected`, `rejectionReason`, `labResultId`, `visualCheck`, `packagingCheck`, `halalSealCheck`, `bpomLotCheck`) | the substrate the header is rolled up from; shown in the panel's **Line items** table with the legend V · P · H · B |
| `disposition` | written by the header verb (Accept / Reject) | seeded values such as Quarantine / Return to Supplier are fixture labels the machine never writes |
| `sapMaterialDoc` | written on settle only | seeded on `gr-005`, `gr-006`, `gr-014` (Posted) and, inconsistently, on `gr-010` (Partially Approved) — display-only there |
| `receivedBy`, `receivedDate`, `notes` | written at create from the wizard's fields | free text; no person is resolved from `receivedBy` |
<!-- src: src/data/mockGoodsReceipts.ts:27-56,88-112,301-325; src/data/mockShipments.ts:324-347; src/services/data/mock/MockCommandService.ts:252-311,2746-2883,2962-2969; src/lib/i18n/goodsReceipt.ts:104-123 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent` (`event`, `actor` — a buyer seat writes `buyer:all` — `ts`, `outcome`, `correlationId`). `t_gr_post` is the special case: it first records `submitted`, and the settlement writes a **second** event under the **same** correlation id with outcome `done`, which is what lets the ledger tell a settled receipt from a seeded one. Cascades (`t_asn_discrepancy`, `t_invoice_match`) carry `causationId` = the receipt command's correlation id. The wizard's one click therefore produces three or four correlation ids in a row.

Worked sequence a tester produces from **New GR** with **Enter ASN number** = `ASN-2025-00211` (In Transit, `sup-007`, PO-2025-00107), rejecting one of two lines and leaving **Auto-post to SAP** ticked:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Pending Inspection | buyer · receiving (`buyer:all`) | **Create GR** | `t_gr_create` · done (new `GR-2026-0xx` returned) |
| T+0 | Pending Inspection → Under Inspection | buyer · receiving (`buyer:all`) | same click (finalize hook) | `t_gr_start_inspection` · done |
| T+0 | Under Inspection → Partially Approved | buyer · receiving (`buyer:all`) | same click (rolled-up header verb) | `t_gr_partial_approve` · done |
| T+0 | (ASN-2025-00211) In Transit → Discrepancy | automation (`causationId` = the partial-approve id) | cascade | `t_asn_discrepancy` · done |
| T+0 | Partially Approved → Posting to SAP | buyer · receiving (`buyer:all`) | same click (auto-post) | `t_gr_post` · submitted |
| T+1 | Posting to SAP ⇒ Posted to SAP | settlement, recorded under the same scope | mock SAP callback | `t_gr_post` · done (same correlation id; `MAT-DOC-…` assigned) |
| T+2 | (ASN-2025-00211) Discrepancy → Delivered | buyer · receiving (`buyer:all`) | **Reconcile** in **Shipment discrepancies** | `t_asn_resolve_discrepancy` · done |
<!-- src: src/services/transitions/events.ts:9-19,25-129; src/services/transitions/dispatcher.ts:397-473; src/services/query/commandHooks.ts:647-675; src/components/v2-features/GRInspectionWizard.tsx:1524-1690 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| **Awaiting Receiving** beside the header, no **New GR** button; footers show the notice | handoff text where the button would be | the seat lacks `gr:receive`, `gr:inspect` or `gr:post` (the first missing one is named) | use a buyer seat in the **receiving** lane |
| "ASN not found among receivable shipments. Enter a submitted ASN (status Submitted, In Transit, or Delivered)." | red text under **ASN Number** | the number is a dock shipment (`ASN-2026-0xx`), a `Draft` ASN, or a typo | pick the shipment from **Select inbound at dock**, or enter a live `ASN-2025-…` |
| "Could not create goods receipt — … (…gr_create_shipment_received: shipment … has not arrived (In Transit))" | error toast | the referenced shipment is not At Dock / Unloading / Delivered | receive a shipment that has arrived |
| "The goods receipt could not be created: it inspects a material the shipment or ASN never declared (…UNDECLARED_MATERIAL…)" | error toast | a line names a material the parent did not carry (only reachable by a hand-crafted payload — the wizard seeds lines from the parent) | check the line against the shipping document |
| "Enter the quantity. If nothing arrived for this line, enter 0…" / "That is not a quantity" | inline under a quantity cell; **Next** disabled | blank, non-numeric or ambiguous quantity | type digits only; 0 is a real answer, blank is not |
| "Halal applicability cannot be determined." / "BPOM applicability cannot be determined." | red block on the line, step 3 | material master lacks the code or its determination | the line cannot be inspected until the master is ruled on |
| "Not answered. This check is required for this material…" | marker under Halal Seal Check / BPOM Lot Tracking | a required check is unanswered under `BLOCK` | select Pass or Fail |
| **Create GR** disabled on step 4 with a Rejected rollup | greyed button | **Rejection Reason (required)** is empty | write the full-lot rejection reason |
| "Could not finalize GR-… — A governing rule refused the action (…gr_rollup_…: line rollup is '…', not '…')" | warning toast after create | the header verb did not match the stored lines (hand-crafted dispatch) | let the wizard derive the verb |
| Receipt stuck at `Posting to SAP`; footer "Awaiting SAP settlement — no material document yet" | interim state | the settle has not returned, or it failed in another session | wait; if this session saw a `TRANSPORT` fault, press **Retry settlement** |
| "Settlement was refused. Asking again will not change the answer…" | red footer text | settle fault `REFUSED` / `UNGOVERNED` | resolve what the refusal names; report the reference for `UNGOVERNED` |
| Seeded `Under Inspection` receipt offers only **Submit inspection results**, which does nothing | info toast "Submit form will open in a future release" | seeded receipts cannot be dispositioned from the page | create a new receipt through the wizard |
| **Start inspection** created a new GR and left the old row `Pending Inspection` | two rows for one shipment | the wizard always creates; it does not advance a seeded row | expected in the demo |
| Rejected a receipt, no ASN discrepancy appeared | supplier page unchanged | the receipt referenced a dock shipment, not an ASN-store number | receive against a live `ASN-2025-…` |
| **Override hold** / **View in SAP** / **Export** / **Lab Results** do nothing | toasts saying so | display-only controls | none |
<!-- src: src/lib/glossary/refusals.glossary.ts:32-152; src/lib/i18n/goodsReceipt.ts:88-103,157,182-227; src/lib/i18n.ts:522-564; src/pages-v2/BuyerGoodsReceipt.tsx:567-620 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Pending Inspection | `gr-002`, `gr-009` | GR-2026-002, GR-2026-009 | `gr-002` pre-selects dock shipment `shp-012` (At Dock) from **Start inspection**; `gr-009`'s shipment `shp-011` is in Customs Clearance and is not in the dock list |
| Under Inspection | `gr-001`, `gr-008` | GR-2026-001, GR-2026-008 | footer is the **Submit inspection results** toast; cannot be dispositioned from the page |
| Quality Hold | `gr-007` | GR-2026-007 | the only hold specimen (no caller creates one); **Request lab retest** works here |
| Approved | `gr-003`, `gr-004`, `gr-012`, `gr-013` | GR-2026-003, -004, -012, -013 | **Post to SAP** in the footer is live on each |
| Partially Approved | `gr-010` | GR-2026-010 | **Post to SAP** live; carries a fixture `sapMaterialDoc` it never earned |
| Rejected | `gr-011` | GR-2026-011 | terminal; no footer verb |
| Posting to SAP | none | — | reach it by posting; visible transiently, or persistently after a failed settle |
| Posted to SAP | `gr-005`, `gr-006`, `gr-014` | GR-2026-005, -006, -014 | terminal; **View in SAP** is a toast |
| Dock sources for a new receipt | — | ASN-2026-012 / -013 / -014 / -015 | dock shipments, not receipts: `shp-012`, `shp-013` (At Dock); `shp-014`, `shp-015` (Unloading); plus live ASNs `ASN-2025-00211`, `-00198`, `-00301`, `-00302` (the ones that can cascade a discrepancy) |
<!-- src: src/data/mockGoodsReceipts.ts:61-442; src/data/mockShipments.ts:324-488; src/services/data/mock/fixtures/supplierShipments.ts:84-216; _derived/guidefacts.json (goodsReceipt.fixtures) -->
