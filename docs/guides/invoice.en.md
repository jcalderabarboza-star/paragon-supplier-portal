---
entity: invoice
locale: en
title: Invoice
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_invoice_create
  - t_invoice_submit
  - t_invoice_match
  - t_invoice_approve
  - t_invoice_release_payment
  - t_invoice_remit
  - t_invoice_dispute
  - t_invoice_resolve
---

<!-- section:summary -->
## 1 · What this process is

The supplier's claim to be paid, and Paragon's decision on it. One document per claim, whichever side is looking at it. The invoice is ONE canonical record in the portal: the supplier page (`/supplier/invoices`, "My Invoices") and the buyer page (`/buyer/invoices`, "Invoices & Payment") both read the same row and show it through their own status labels, so the two sides can never disagree about where a bill stands.

Two roles touch it. The supplier's **back-office contact** (lane `back_office`) drafts the invoice against one of its own confirmed purchase orders and then submits it. Paragon's **finance officer** (lane `finance`) approves it, releases the payment, and may dispute it or resolve a dispute. Nobody presses the 3-way match: it is computed by the platform when a goods receipt on the same purchase order is posted, when an invoice is submitted, and when a dispute is resolved. Nobody presses the remittance step either: the money arriving is a bank fact, not a portal act.

It starts when the supplier creates a draft and ends at **Remittance Received**, the only terminal state. Between them the document passes through Submitted, Matched, Approved, the SAP interim **Releasing Payment**, and **Payment Released**. **Disputed** is the exception path, reachable from Submitted, Matched and Approved, and it leads back to Submitted.

Honesty markers a reader needs before using this guide. The release of payment crosses an SAP boundary: the portal act is real and recorded, but the SAP settlement callback that mints the FI document is **SIMULATED** in this build; no payment leaves any bank. The remittance step (`t_invoice_remit`) is authored and owned by the bank/SAP settlement feed; there is **no feed** connected, so no invoice in this build ever reaches Remittance Received. The demo invoices are **SIMULATED** fixtures, shifted onto the declared present (31 Aug 2026) so the aging and overdue reading stays coherent. A human act is recorded against the session's actor: `UNATTRIBUTED: NO_PERSON_IN_SESSION` when no sample user is seated, the named sample person when one is. Approval and payment release store who decided on the invoice (`approvedBy`, `releasedBy`); the approval toast says which of the two was recorded.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Draft | operator action (creation) | supplier · back_office | `t_invoice_create` |
| 2 | Draft → Submitted | operator action | supplier · back_office | `t_invoice_submit` |
| 3 | Submitted → Matched | cascade (from `t_gr_post`, `t_invoice_submit` or `t_invoice_resolve`; only on a `Matched` verdict) | automation | `t_invoice_match` |
| 4 | Matched → Approved | operator action | buyer · finance | `t_invoice_approve` |
| 5 | Approved → Releasing Payment ⇒ Payment Released | operator action, SAP boundary (settles) | buyer · finance | `t_invoice_release_payment` |
| 6 | Payment Released → Remittance Received | external fact (bank) — no feed today | automation | `t_invoice_remit` |
| 7 | Submitted, Matched, Approved → Disputed | operator action (exception) | buyer · finance | `t_invoice_dispute` |
| 8 | Disputed → Submitted | operator action (exception) | buyer · finance | `t_invoice_resolve` |

<!-- src: src/services/transitions/flows/invoice.flow.ts:34-210; src/services/transitions/cascades.ts:36-38 -->

**Forks**

- **At Submitted:** `t_invoice_match` — automation — when the match runs (a receipt posting on the same PO, the invoice being submitted, or a dispute being resolved) and the verdict is `Matched`; `t_invoice_dispute` — finance — when Paragon will not take the claim as it stands.
- **At Matched:** `t_invoice_approve` — finance — when the claim is owed; `t_invoice_dispute` — finance — when a variance or credit-note question stands in the way.
- **At Approved:** `t_invoice_release_payment` — finance — when the payment instruction is to go to SAP; `t_invoice_dispute` — finance — when the decision to pay is withdrawn before money moves.
- **At Disputed:** one exit only, `t_invoice_resolve` — finance — when the disagreement is settled; the claim returns to Submitted for re-match.

<!-- section:steps -->
## 3 · Step by step

### t_invoice_create — Create a draft invoice <!-- transition:t_invoice_create -->

- **Step kind:** operator action (creation)
- **Role:** supplier · back_office (atom `invoice:submit`)
- **From → to:** ∅ → Draft
- **Operator — where:** `/supplier/invoices` → header button **New invoice** → panel "New invoice" → **Create draft**. If your seat does not hold `invoice:submit`, the button's slot shows "Awaiting Supplier Back Office" instead.
- **Operator — do:** The supplier starts a bill against an order it has served, while the figures are still theirs to correct. Pick the purchase order from the "Purchase order" list (only your own POs in state Confirmed are offered; if there are none the list says "No confirmed POs available to invoice."), type the amount, press Create draft. The portal assigns the invoice number (form `INV-2026-9001`, `INV-2026-9002`…) and shows "INV-… drafted · Draft created against PO-… · cmd_… recorded."
- **Operator — fill:** the purchase order reference (required by the machine: `poReference`); the amount in IDR (required by the form — digits only; a blank, a non-number or an ambiguous "1.500" is refused with its own message, and the amount must exceed zero).
- **Tester — expected state:** Draft
- **Tester — confirm:** the new row appears at the top of the supplier's list with status pill Draft and a **Submit** button; the buyer's Invoice Queue does NOT show it (the buyer read filters Draft out). The panel's key facts show "SAP FI doc — pending —" and "Payment ref — pending —".
- **Tester — trigger event:** `t_invoice_create`
- **Checks that can refuse:** `invoice_create_po_confirmed` — the parent PO must exist and be in state Confirmed ("PO … is not Confirmed" / "parent PO not found"). Scope — a supplier may draft only against its OWN PO; another supplier's PO is refused `SCOPE_DENIED` before any other check.
- **Glossary:** `MISSING_FIELDS`, `POLICY_REJECTED`, `SCOPE_DENIED`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`.
- **Honesty:** Dates are defaulted by the store, not the wall clock: submitted date = the declared present, due date = +30 days (Net 30), so a fresh draft is never born overdue. The new invoice starts with match status `Pending`. The SAP FI document and payment reference stay empty until settlement.
<!-- src: src/services/transitions/flows/invoice.flow.ts:52-64; src/pages-v2/SupplierInvoices.tsx:254-310; src/pages-v2/SupplierInvoices.tsx:399-420; src/services/data/mock/MockCommandService.ts:380-468; src/services/query/commandHooks.ts:760-777; src/lib/i18n/supplierInvoices.ts:105-127; src/lib/i18n.ts:566-570; src/services/data/mock/stores/invoiceStore.ts:45-48 -->

### t_invoice_submit — Submit the invoice <!-- transition:t_invoice_submit -->

- **Step kind:** operator action
- **Role:** supplier · back_office (atom `invoice:submit`)
- **From → to:** Draft → Submitted
- **Operator — where:** `/supplier/invoices` → the Draft row → **Submit** (in the Action column). A seat without the atom sees "Awaiting Supplier Back Office" in that slot.
- **Operator — do:** The supplier formally asks to be paid; the clock on payment terms starts running here. Press Submit on the draft. The toast reads "INV-… submitted for approval · cmd_… recorded. Awaiting 3-way match and approval."
- **Operator — fill:** nothing new to type — the row's amount is sent as the required `amount`.
- **Tester — expected state:** Submitted
- **Tester — confirm:** supplier pill changes from Draft to **Pending Approval** (the supplier label for Submitted and Matched); the buyer's Invoice Queue now lists it with label **Pending Match** and a "3-way match" column reading Pending; the buyer drawer footer says "Review match". That is the reading when no receipt on the PO is posting or posted. If one is, the match runs at the submission itself: the row already carries a verdict with its figures, and on a `Matched` verdict the invoice is already Matched (footer **Approve for payment**).
- **Tester — trigger event:** `t_invoice_submit`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ILLEGAL_TRANSITION`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Honesty:** Pressing "Review match" on the buyer side changes nothing: the toast says "Awaiting 3-way match — Nothing was changed here. The match runs by itself when a receipt is posted on the purchase order and when an invoice is submitted or returned from a dispute." The match is a cascade, not a button.
<!-- src: src/services/transitions/flows/invoice.flow.ts:65-75; src/pages-v2/SupplierInvoices.tsx:229-252; src/pages-v2/SupplierInvoices.tsx:574-588; src/services/query/commandHooks.ts:779-797; src/services/data/invoiceProjection.ts:55-93; src/lib/i18n.ts:571-575; src/lib/i18n.ts:605-607 -->

### t_invoice_match — 3-way match (computed) <!-- transition:t_invoice_match -->

- **Step kind:** cascade (system-driven); fired by `t_gr_post`, `t_invoice_submit` and `t_invoice_resolve`
- **Role:** automation (atom `invoice:match`; no human lane holds it)
- **From → to:** Submitted → Matched
- **Operator — where:** nobody presses this in the portal. The match runs on three events: a receipt being posted at `/buyer/goods-receipt` (the GR inspection wizard, **Post to SAP**), an invoice being submitted, and a dispute being resolved.
- **Operator — do:** Paragon checks the bill against what was ordered, what was received and what has already been invoiced. Each time the match runs, every Submitted invoice on that PO gets its verdict recomputed from all receipts on the PO that are posting or posted (Posting to SAP, Posted to SAP) and all invoices on the PO. An invoice is **Matched** only while its amount fits inside what was received and accepted on the PO, less what earlier invoices on that PO already claim. Three figures, all at the PO's own unit prices: *ordered* = Σ confirmed qty × unit price; *received* = Σ accepted qty × unit price over those receipts, accepted quantity pooled per material and each PO line capped at its confirmed quantity; *already invoiced* = the sum of the other invoices on the PO in Matched, Approved, Releasing Payment, Payment Released or Remittance Received. The tolerance is 1% of the ordered value. Four causes: within what is payable → **Matched**; more than was received and accepted → **Qty Mismatch**; would fit what was received, but earlier invoices already claim it → **Qty Mismatch**; above the whole order at PO prices → **Price Variance** (the only case shown as a price variance — an invoice carries a total and no lines, so the portal cannot say which price or quantity differs). Rejected quantity is not payable, but a receipt with rejects no longer forces a mismatch: an invoice for the accepted part matches. An invoice for less than what is payable matches (partial invoices are allowed). Invoices awaiting a match are taken oldest first (submitted date, then invoice number), and one that matches claims its amount before the next is looked at, so of two invoices for the same goods the first is matched and the second is held. Only a `Matched` verdict advances the invoice header; any other verdict is written and the invoice stays Submitted (an honest no-op, not a defect). With no posting or posted receipt on the PO nothing is written and the invoice stays Pending.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Matched (buyer label stays **Pending Match**; supplier label stays **Pending Approval**)
- **Tester — confirm:** buyer drawer "3-way match" section reads "The invoice is within what was received and accepted on the purchase order, after earlier invoices." and shows four figures — "Ordered (confirmed quantity × PO price)", "Received and accepted", "Already invoiced", "This invoice"; the footer's primary slot now says **Approve for payment**. Use `inv-fir-0325` (INV-2026-FIR-0325, PO-2025-00104, 540,000,000) with receipt `GR-2026-012` (Approved; the PO's own line FR-MKOV-5510, 200 accepted, 0 rejected) — the one seeded pair whose verdict is `Matched`. When the PO's stated total differs from the sum of its own lines by more than 1%, the same section adds "The purchase order states a total of …, but its lines come to …; the match uses the lines." A seeded row that carries no figures reads "Recorded as matched. This row carries no match figures." (or "Recorded as a quantity mismatch. …" / "Recorded as a price variance. …"); Pending reads "Not matched yet: no receipt is posted on this purchase order."
- **Tester — trigger event:** `t_invoice_match` (its event carries `causationId` = the correlationId of the command that caused it: the GR post, the invoice submission or the dispute resolution)
- **Checks that can refuse:** `invoice_rollup_matched` — the header may advance only when the invoice's own match status is `Matched` ("match axis is 'Qty Mismatch', not 'Matched'"). The cascade resolver never fires the verb on a variance, so this hook only bites a hand-crafted dispatch.
- **Glossary:** `POLICY_REJECTED`; match statuses Pending, Pending GR, Matched, Qty Mismatch, Price Variance.
- **Honesty:** The match runs from both sides: a receipt posting finds its invoices, and an invoice submitted after its receipt posted is matched by its own submission. The verdict is recomputed from every posting or posted receipt and every invoice on the PO each time, so a held invoice is cleared by a further receipt and a resolved dispute is matched again. The verdict is stored with the figures it rests on (`matchBasis`). A verdict other than `Matched` writes no event. A receipt that is inspected but not posted (Approved / Partially Approved) is not read. An invoice whose amount is not a positive number is given no verdict and counts for nothing as already invoiced. The 1% tolerance is a provisional placeholder, not the AP policy. `Pending GR` appears on seeded rows only — a runtime-created invoice shows `Pending` until a receipt posts, because the sub-flow verb that would write `Pending GR` is unwired.
<!-- src: src/services/transitions/flows/invoice.flow.ts:76-94; src/services/data/mock/MockCommandService.ts:2851-2881; src/services/transitions/invoiceRollup.ts:33-54; src/services/transitions/invoiceRollup.ts:83-104; src/services/transitions/invoiceRollup.ts:153-177; src/services/transitions/policies.ts:156-164; src/services/data/mock/fixtures/invoices.ts:161-200; src/data/mockGoodsReceipts.ts:355-379; src/lib/i18n/buyerInvoices.ts:140-149 -->

### t_invoice_approve — Approve for payment <!-- transition:t_invoice_approve -->

- **Step kind:** operator action
- **Role:** buyer · finance (atom `invoice:approve`)
- **From → to:** Matched → Approved
- **Operator — where:** `/buyer/invoices` → Invoice Queue → open the invoice → footer primary button **Approve for payment**. A procurement seat sees "Awaiting Finance" in that slot instead of the button.
- **Operator — do:** Finance agrees the claim is owed; the decision to pay is taken here, the money moves later. Press Approve for payment. There is deliberately no second confirmation step for this verb. With a sample user seated the toast reads "INV-… — approved for payment · Approved by {person}. The payment is released by somebody else."; with no sample user it reads "INV-… — approved for payment · Recorded without a named approver — no person is resolved in this session. Payment can now be released."
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Approved
- **Tester — confirm:** buyer pill reads **Approved** (or **Overdue** if the due date has passed); the footer now offers **Release payment**; supplier pill reads **Approved**; the "Approved" filter chip and the "Pending Approval" KPI on the buyer page move. The drawer's "Approver" field shows the recorded person (the role label with the SAMPLE marker), or "Not recorded — no person in session" when no sample user is seated.
- **Tester — trigger event:** `t_invoice_approve`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Honesty:** No seeded invoice sits in Matched, so this button is reachable only after the cascade above has run. The store stamps `approvedBy` from the session's actor: the named sample person when one is seated, otherwise `UNATTRIBUTED: NO_PERSON_IN_SESSION`. A caller cannot name the approver in a payload. The default finance seat holds both `invoice:approve` and `invoice:pay`, so the role check does not keep the two acts apart; the release step refuses a named person who approved the same invoice (see `t_invoice_release_payment`). An approval recorded with no sample user seated carries no name to compare against, and its release is admitted from any seat holding the atom — an unnamed approval is not guarded.
<!-- src: src/services/transitions/flows/invoice.flow.ts:95-147; src/pages-v2/BuyerInvoices.tsx:482-510; src/pages-v2/BuyerInvoices.tsx:1081-1141; src/pages-v2/invoices/invoiceActionModel.ts:68-106; src/services/query/commandHooks.ts:799-816; src/lib/i18n.ts:591-594; src/lib/i18n/buyerInvoices.ts:110-118 -->

### t_invoice_release_payment — Release payment (SAP boundary) <!-- transition:t_invoice_release_payment -->

- **Step kind:** operator action · SAP boundary (settles)
- **Role:** buyer · finance (atom `invoice:pay`)
- **From → to:** Approved → Releasing Payment ⇒ Payment Released (on settlement)
- **Operator — where:** `/buyer/invoices` → open an Approved invoice → footer **Release payment** → confirm panel "Confirm payment release" → **Confirm release — Rp …**.
- **Operator — do:** Sends the payment instruction to SAP; until SAP confirms, nobody should tell a supplier they have been paid. When the invoice carries a bank account the confirm panel warns "This action cannot be undone. Payment of … will be transferred to … Verify bank details before confirming." An invoice raised in the portal carries none; the panel then reads "This action cannot be undone. Payment of … will be released. The supplier’s bank account is not held in the portal — SAP pays to the account on the vendor record." and the Payment section shows "Not held in the portal". Either way the panel states that the settlement callback is simulated. After confirming, the first toast says "releasing payment — Submitted to SAP for payment — awaiting the FI-document callback. No payment posted yet."; about 1.2 seconds later the settle lands and a second toast says "payment released — SAP assigned the FI document on settlement."
- **Operator — fill:** nothing to fill; the confirmation click is the act.
- **Tester — expected state:** Releasing Payment immediately (buyer label **Payment Released**, supplier label **Approved**), then Payment Released after settlement (both labels **Payment Released**)
- **Tester — confirm:** while in flight the footer reads "Awaiting SAP settlement — no FI document yet". After settlement the drawer's "SAP documents" shows a minted FI document (`FI-5100011001`…) and a payment reference (`PAY-2026-95001`…) with payment date = the declared present, and the key facts show "Payment released by" with the recorded person (or "Not recorded — no person in session"); the supplier row shows a **Payment details** action and the panel offers "View payment details". To try the segregation check: seat Finance 1 (SAMPLE), approve, press Release payment and confirm → refused, the invoice stays Approved; seat a different sample user who holds finance's verbs (the all-roles buyer sample user, Buyer Operations Lead 1 (SAMPLE)) and release → it goes through. Fixtures to start from: `inv-giv-0892` (INV-2025-GIV-0892) and `inv-evo-0188` (INV-2025-EVO-0188), both Approved.
- **Tester — trigger event:** `t_invoice_release_payment` (outcome `submitted`, then the same correlationId settles to `done`)
- **Checks that can refuse:** `invoice_releaser_not_approver` — a NAMED person who approved the invoice is refused when they try to release its payment (`INVOICE_RELEASER_IS_APPROVER`); the invoice stays Approved. The reader sees "{person} approved this invoice and may not also release its payment. Approving an invoice and releasing its money are two authorities — somebody else releases it." Once the approval is named the release must be named too: a seat with no sample user is refused on such an invoice (`INVOICE_RELEASER_UNNAMED`) with "This invoice was approved by a named person, so its payment must be released by a named person who is not the approver. Pick a sample user on the identity panel, then try again." An approval that carries no name (no sample user was seated, or a seeded row) is not guarded: its release is admitted from any seat holding the atom. Settlement can fail separately (`REFUSED` / `TRANSPORT` / `UNGOVERNED`); the footer then shows **Retry settlement** only for a fault that a second ask can answer differently, otherwise "Settlement was refused. Asking again will not change the answer…".
- **Glossary:** `REFUSED`, `TRANSPORT`, `UNGOVERNED` (settle faults), `ROLE_NOT_PERMITTED`, `POLICY_REJECTED` (`INVOICE_RELEASER_IS_APPROVER`, `INVOICE_RELEASER_UNNAMED`).
- **Honesty:** The release itself is governed and real: it dispatches, the trail records it, and the invoice moves to Releasing Payment. The store stamps `releasedBy` from the session's actor, named or unattributed. The SAP settlement callback that mints the FI document is **SIMULATED** — no payment leaves any bank. The FI document, payment reference and payment date are minted only on settle, never before. The supplier is deliberately shown **Approved**, not paid, while the payment is in flight. At Payment Released the supplier's "Payment details" panel says "Paragon has released this payment. The bank has not confirmed remittance yet, so this is not a record that the money has reached your account."
<!-- src: src/services/transitions/flows/invoice.flow.ts:148-164; src/pages-v2/BuyerInvoices.tsx:515-583; src/pages-v2/BuyerInvoices.tsx:1101-1160; src/services/query/commandHooks.ts:862-896; src/services/data/mock/MockCommandService.ts:2972-2988; src/services/data/invoiceProjection.ts:55-93; src/lib/i18n/buyerInvoices.ts:104-108; src/lib/i18n/buyerInvoices.ts:150-161; src/lib/i18n.ts:595-604; src/lib/glossary/refusals.glossary.ts:139-152 -->

### t_invoice_remit — Remittance received (bank fact) <!-- transition:t_invoice_remit -->

- **Step kind:** external fact (bank) — no feed connected
- **Role:** automation (atom `invoice:pay`, finance lane; owner: bank)
- **From → to:** Payment Released → Remittance Received
- **Operator — where:** nobody presses this in the portal; not offered anywhere today.
- **Operator — do:** The supplier acknowledges the money and the advice that came with it, and the claim is finished. In the real process this is confirmed by the bank/SAP settlement feed: the buyer released the payment; the money arriving is not their act.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Remittance Received — not reachable in this build.
- **Tester — confirm:** no fixture sits in Remittance Received and no screen can produce one. What the screens do offer around it: the supplier's **Payment details** action / "View payment details" on an invoice whose payment is released (section "Payment details" with the fields "Amount", "Released on" and "Bank account" — or "Not held in the portal"; "Download PDF" is a toast saying no PDF was downloaded), and the buyer's "Send remittance" → **Send to supplier**, which is a toast: "Nothing was generated and nothing was sent to the supplier via …".
- **Tester — trigger event:** `t_invoice_remit` (never fires today)
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** external-fact owner "the bank" (`processFlows.owner.bank`).
- **Honesty:** This is a bank fact with no feed. On the process-flows page it carries "Owned by the bank". The buyer's remittance screen is a preview: "This remittance advice is a preview — no payment was processed and no notification was sent to the supplier." On the supplier side the sentence "The bank has confirmed remittance of this payment." appears only at Remittance Received, which this build cannot reach; at Payment Released the panel says the payment is released and the bank has not confirmed it.
<!-- src: src/services/transitions/flows/invoice.flow.ts:165-184; src/pages-v2/BuyerInvoices.tsx:652-660; src/pages-v2/BuyerInvoices.tsx:1181-1195; src/pages-v2/SupplierInvoices.tsx:640-660; src/lib/i18n/buyerInvoices.ts:168-175; src/lib/i18n.ts:608-610; src/lib/i18n/processFlows.ts:61-65; src/lib/i18n/externalFactOwner.ts:26-30 -->

### t_invoice_dispute — Dispute the invoice <!-- transition:t_invoice_dispute -->

- **Step kind:** operator action (exception path)
- **Role:** buyer · finance (atom `invoice:dispute`)
- **From → to:** Submitted, Matched, Approved → Disputed
- **Operator — where:** `/buyer/invoices` → open the invoice → footer **Dispute** → panel "Raise a dispute" → type the reason → **Raise dispute**. The Dispute button is offered exactly where the machine says it is legal (Submitted, Matched, Approved), including a past-due Approved invoice; a seat without the atom sees "Awaiting Finance".
- **Operator — do:** Paragon does not take the claim as it stands, and says why; it stops the payment clock and puts the ball back with the supplier. Fill the reason (placeholder: "Reason (e.g. quantity mismatch vs GR, price variance)…"; the panel notes "A credit note will be required before payment can be released."). Toast: "INV-… disputed · cmd_… recorded. Credit note required before payment."
- **Operator — fill:** the dispute reason (`disputeReason`, required; a blank is stopped at the surface with "A dispute reason is required.").
- **Tester — expected state:** Disputed
- **Tester — confirm:** buyer pill **Disputed**, the dispute banner on the buyer page ("Invoice dispute: … — payment is held until each dispute is resolved. Open an invoice to read its reason."), the Disputed KPI, and a drawer section "Dispute reason" showing the text that was typed; supplier pill **Disputed** with the note "This invoice is disputed. Payment is held until Paragon finance resolves it. Paragon’s reason: …" and the supplier dispute banner ("… — payment is held until Paragon finance resolves the dispute. Open the invoice to read the reason."). A seeded disputed row carries no reason: the buyer section reads "No reason was recorded for this dispute." and the supplier note ends "Paragon recorded no reason." The buyer footer now offers **Resolve dispute**.
- **Tester — trigger event:** `t_invoice_dispute`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `MISSING_FIELDS`, `ILLEGAL_TRANSITION`.
- **Honesty:** The reason is stored on the invoice (`disputeReason`) and shown to both sides while the invoice is Disputed. A disputed invoice claims nothing on its PO while it stands. The dispute does not change the match status; `inv-brl-0043` carries Qty Mismatch and `inv-smpl-1180` carries Price Variance as seeded facts. The supplier's own **Resolve** button on a disputed row is a toast only: "Dispute resolution not available yet — Nothing was changed — contact your Paragon Finance Controller." Resolution is finance's act.
<!-- src: src/services/transitions/flows/invoice.flow.ts:185-196; src/pages-v2/BuyerInvoices.tsx:585-624; src/pages-v2/BuyerInvoices.tsx:1085-1100; src/pages-v2/BuyerInvoices.tsx:1161-1180; src/pages-v2/SupplierInvoices.tsx:589-601; src/services/query/commandHooks.ts:818-836; src/lib/i18n/buyerInvoices.ts:162-167; src/lib/i18n.ts:576-580; src/lib/i18n/supplierInvoices.ts:50-54; src/lib/i18n/supplierInvoices.ts:91-93 -->

### t_invoice_resolve — Resolve the dispute <!-- transition:t_invoice_resolve -->

- **Step kind:** operator action (exception path)
- **Role:** buyer · finance (atom `invoice:dispute`)
- **From → to:** Disputed → Submitted
- **Operator — where:** `/buyer/invoices` → open the Disputed invoice → footer **Resolve dispute**. A procurement seat sees "Awaiting Finance" in that slot.
- **Operator — do:** The disagreement has been settled and the claim goes back for checking; without this, a contested bill has nowhere to go. Press Resolve dispute. Toast: "INV-… dispute resolved · cmd_… recorded. Returned for re-match."
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Submitted
- **Tester — confirm:** buyer pill returns to **Pending Match** (footer "Review match"); supplier pill returns to **Pending Approval**; the dispute banners clear. The match then runs for that PO: with a posting or posted receipt on it a fresh verdict and its figures are written, and a `Matched` verdict moves the invoice on to Matched (footer **Approve for payment**); with none, nothing is written and the row keeps the match status it had. Fixtures: `inv-brl-0043` (INV-2025-BRL-0043), `inv-smpl-1180` (INV-2026-SMPL-1180).
- **Tester — trigger event:** `t_invoice_resolve`
- **Checks that can refuse:** none beyond role, legality and required fields.
- **Glossary:** `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Honesty:** Resolving runs the match again: `t_invoice_resolve` is a cascade source exactly as `t_invoice_submit` is, so the toast's "Returned for re-match." is true. The verdict is recomputed from every posting or posted receipt and every invoice on the PO; if the PO has no such receipt, nothing is written.
<!-- src: src/services/transitions/flows/invoice.flow.ts:197-208; src/pages-v2/BuyerInvoices.tsx:626-650; src/pages-v2/BuyerInvoices.tsx:286-300; src/services/query/commandHooks.ts:838-856; src/services/transitions/invoiceRollup.ts:100-104; src/lib/i18n.ts:581-584 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Match or dispute (at Submitted).** Branch A — `t_invoice_match` — **When:** the match runs (a receipt posting on the same PO, the invoice being submitted, or a dispute being resolved) and the verdict is `Matched`; the platform fires it, nobody presses it. Branch B — `t_invoice_dispute` — **When:** finance will not take the claim (a Qty Mismatch or Price Variance verdict was written, a credit note is needed, the figures are wrong). Such a verdict on its own leaves the invoice in Submitted with the verdict and its figures visible; the human choice is then dispute, or wait for a further receipt on the same PO — the match runs again when it posts.
- **Approve or dispute (at Matched).** Branch A — `t_invoice_approve` — **When:** the claim is owed. Branch B — `t_invoice_dispute` — **When:** something outside the 3-way check stands in the way.
- **Release or dispute (at Approved).** Branch A — `t_invoice_release_payment` — **When:** the payment instruction is to go to SAP; this is the one irreversible commit on the buyer surface and it takes a confirmation step. A named person who approved the invoice is refused here (`INVOICE_RELEASER_IS_APPROVER`), and so is a seat that names nobody once the approval is named (`INVOICE_RELEASER_UNNAMED`); the invoice stays Approved until a different named person releases it. Branch B — `t_invoice_dispute` — **When:** the decision to pay is withdrawn before money moves. An Approved invoice whose due date has passed shows the label **Overdue** but keeps both branches.
- **Dispute → resolve (at Disputed).** `t_invoice_resolve` — **When:** the disagreement is settled; the only exit, and it returns the bill to Submitted for re-checking rather than to where it was.
- **Settlement wait (at Releasing Payment).** No verb is legal here. **When** the settle fails with a `TRANSPORT` fault the footer offers **Retry settlement**; **when** it fails `REFUSED` or `UNGOVERNED` the footer says asking again will not change the answer and the invoice stays until the refusal is resolved.

<!-- src: src/services/transitions/flows/invoice.flow.ts:51-208; src/pages-v2/BuyerInvoices.tsx:1101-1141; src/services/data/mock/MockCommandService.ts:2869-2877 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| **Overdue** | time-driven, derived at read | Submitted, Matched, Approved, Releasing Payment | the due date is before the reading day; never stored | buyer and supplier status pills; buyer banner "N overdue invoices: … (Nd overdue)"; buyer Overdue KPI and filter chip; supplier note "Payment is past its due date. Nothing in the portal escalates it — contact your Paragon Finance Controller." |
| **Disputed** | operator-raised | Disputed | finance raised a dispute | both pills; buyer dispute banner and drawer section "Dispute reason"; supplier dispute banner and note with Paragon's reason; Disputed KPIs |
| **3-way match verdict** — Pending / Pending GR / Matched / Qty Mismatch / Price Variance | derived (written by the match, which runs when a receipt posts, an invoice is submitted or a dispute is resolved) | any state; acted on at Submitted | Pending on a fresh draft and while no receipt on the PO is posting or posted; Pending GR on seeded rows; the three verdicts each time the match runs for the PO | buyer "3-way match" column and drawer section with the cause sentence and four figures (seeded rows without figures show a one-line "Recorded as …" sentence); buyer "3-Way Match Summary" tiles (Spend Analytics tab) |
| **PO total differs from its lines** | derived | any invoice carrying match figures | the PO's stated total differs from the sum of its own lines by more than 1% | buyer drawer "3-way match" section: "The purchase order states a total of …, but its lines come to …; the match uses the lines." |
| **Approver may not release** | refusal (`invoice_releaser_not_approver`) | Approved | a named person who approved the invoice presses Release payment; or the approval is named and the releasing seat has no sample user | failure toast: "{person} approved this invoice and may not also release its payment. Approving an invoice and releasing its money are two authorities — somebody else releases it."; for the unnamed seat: "This invoice was approved by a named person, so its payment must be released by a named person who is not the approver. Pick a sample user on the identity panel, then try again."; the invoice stays Approved |
| **Awaiting SAP settlement** | external (SAP boundary, SIMULATED) | Releasing Payment | after Confirm release, until the settle lands | buyer footer "Awaiting SAP settlement — no FI document yet"; "Retry settlement" or the not-retryable note after a failed settle |
| **Pending Match** | derived label | Draft (buyer never sees), Submitted, Matched | the buyer's collapsed label for the pre-approval states | buyer pill and filter chip; footer "Review match" (informational toast) |
| **Awaiting Finance / Awaiting Supplier Back Office** | derived handoff | wherever a verb is legal but the seat lacks its atom | a seat without `invoice:approve` / `invoice:pay` / `invoice:dispute` (buyer) or `invoice:submit` (supplier) opens the surface | in the button's own slot (`handoff-commit`, `handoff-dispute`, `handoff-invoice-create`, `handoff-invoice-submit`) |
| **SIMULATED settle / unattributed approval** | honesty marker | Approved → Releasing Payment; Matched → Approved | on the confirm panel; on the approval toast when no sample user is seated | confirm-release panel text; toast "Recorded without a named approver…" (with a sample user seated the toast names the approver instead); drawer fields "Approver" and "Payment released by" |

<!-- src: src/services/data/invoiceProjection.ts:30-93; src/lib/i18n/buyerInvoices.ts:41-48; src/lib/i18n/buyerInvoices.ts:104-108; src/lib/i18n/buyerInvoices.ts:140-161; src/lib/i18n/supplierInvoices.ts:33-36; src/lib/i18n/supplierInvoices.ts:91-95; src/pages-v2/BuyerInvoices.tsx:1085-1141; src/pages-v2/SupplierInvoices.tsx:399-420; src/pages-v2/SupplierInvoices.tsx:574-588; src/lib/i18n/roles.ts:26-52 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `inv-fir-0325` (INV-2026-FIR-0325) — the one Submitted invoice whose receipt can still post and whose verdict comes back `Matched`.

| Joins to | By | Note |
|---|---|---|
| Purchase order `po-004` / PO-2025-00104 | `poNumber`, `poId` | the create hook requires this PO to be Confirmed; the match reads the ordered value Σ(confirmedQty × unitPrice) from its lines (200 KG × 2,700,000 = 540,000,000) and prices the received quantity at the same unit prices |
| Goods receipt `gr-012` / GR-2026-012 (ASN-2026-008) | same `poNumber` | carries the PO's own line (FR-MKOV-5510, 200 accepted, 0 rejected); the match reads every receipt on the PO that is Posting to SAP or Posted to SAP, so this one must first be posted (it is postable from Approved / Partially Approved) |
| Supplier `sup-004` | `supplierId`, `supplierName` | scope owner — a supplier sees only its own invoices; the buyer sees all except Draft |
| `matchStatus`, `matchBasis` | written by the match each time it runs for the PO | the 3-way verdict and the figures it rests on (`orderedValue`, `receivedValue`, `alreadyInvoiced`, `invoiced`, `cause`, `poStatedTotal`, `poLineTotal`); runtime values, not fixture-only fields — seeded rows carry a `matchStatus` and no `matchBasis` |
| `approvedBy`, `releasedBy` | stamped by the store from the session's actor on approve / release payment | runtime-written; a named sample person or `UNATTRIBUTED`; refused as payload keys |
| `disputeReason` | written by `t_invoice_dispute` | runtime-written; shown to both sides while the invoice is Disputed; seeded disputed rows carry none |
| `sapFiDoc`, `paymentRef`, `paymentDate` | minted on settlement | SAP owns these; the portal never writes them before settle |
| `sapGrDoc`, `approver`, `buyerContact`, `bankAccount`, `channel`, `paymentTerms`, `remittanceNote` | fixture fields | display-only — nothing in the portal writes them at runtime; a created invoice carries empty values. `approver` is shown in the drawer's "Approver" field only when no `approvedBy` is recorded |
| `dueDate`, `submittedDate` | store-defaulted on create | shifted onto the declared present for seeded rows; used by the read-time Overdue projection |

<!-- src: src/services/data/mock/fixtures/invoices.ts:161-233; src/services/data/mock/MockCommandService.ts:380-459; src/services/data/mock/MockCommandService.ts:2851-2881; src/services/data/mock/MockCommandService.ts:2972-2988; src/services/transitions/invoiceRollup.ts:144-177; src/services/data/mock/MockProcurementService.ts:385-396 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `supplier:<supplierId>` for a supplier seat or `buyer:all` for a buyer seat, `ts`, `outcome` (`done` / `submitted` / `failed`), `correlationId` (`cmd_…`, shown in the success toasts), and `causationId` on a cascaded event (the correlationId of the command that caused it). A `failed` event carries the refusal `reason`. Human acts also carry the session's actor attribution: `UNATTRIBUTED: NO_PERSON_IN_SESSION` unless a sample user is seated. Approval and payment release also store it on the invoice (`approvedBy`, `releasedBy`), so with sample users seated T+2 and T+3 below need two different people. Worked sequence for `inv-fir-0325`, as a tester would produce it:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | (seeded) Submitted, match status Pending GR | — | fixture, no event | — |
| T+1 | receipt GR-2026-012: Approved → Posting to SAP ⇒ Posted to SAP | buyer · receiving (`buyer:all`) | **Post to SAP** in the GR wizard | `t_gr_post` (outcome `submitted`, then settles) |
| T+1 | Submitted → Matched; match status → Matched | automation (`buyer:all`, cascade) | fan-out of the receipt post | `t_invoice_match` (`causationId` = the `t_gr_post` correlationId) |
| T+2 | Matched → Approved | buyer · finance (`buyer:all`) | **Approve for payment** | `t_invoice_approve` |
| T+3 | Approved → Releasing Payment | buyer · finance (`buyer:all`) | **Release payment** → **Confirm release** | `t_invoice_release_payment` (outcome `submitted`) |
| T+3 +1.2 s | Releasing Payment ⇒ Payment Released; FI doc + payment ref minted | SAP boundary (SIMULATED) | settlement of the same correlationId | command status flips `submitted` → `done` |
| (alt.) T+2′ | Matched → Disputed | buyer · finance | **Dispute** → **Raise dispute** | `t_invoice_dispute` |
| (alt.) T+3′ | Disputed → Submitted, then matched again (→ Matched on a `Matched` verdict) | buyer · finance; automation for the match | **Resolve dispute** | `t_invoice_resolve`, then `t_invoice_match` (`causationId` = the `t_invoice_resolve` correlationId) |

<!-- src: src/services/transitions/events.ts:26-61; src/services/transitions/events.ts:127-129; src/services/transitions/dispatcher.ts:459-532; src/services/data/mock/MockCommandService.ts:2851-2881; src/pages-v2/BuyerInvoices.tsx:515-583 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| The button is replaced by "Awaiting Finance" / "Awaiting Supplier Back Office" | a notice sits in the button's slot | your seat does not hold the verb's atom (`ROLE_NOT_PERMITTED` if dispatched anyway) | someone holding the named role does it; the identity panel shows your seat's roles |
| "Could not create invoice" with "No confirmed POs available to invoice." | the PO list is empty | none of your POs is in state Confirmed (`invoice_create_po_confirmed` would refuse) | confirm the order first at `/supplier/orders` |
| "Could not create invoice" — amount message | toast names the amount rule | blank, non-numeric, ambiguous separator, or zero | type digits only, e.g. 250000000 |
| Create refused although the PO looks fine | refusal text mentions scope / "outside what your account may see" | the PO belongs to another supplier (`SCOPE_DENIED`) | draft only against your own POs |
| "The document is not in a state this action can be taken from" | refusal names the current state (`ILLEGAL_TRANSITION`) | the drawer was open while the state moved, or a verb was fired from the wrong state | close and reopen the document; act from the state shown |
| "One or more values the action requires were blank" (`MISSING_FIELDS`) | refusal names the field | `amount` (submit), `disputeReason` (dispute), `poReference` (create) | the surfaces stop these first; if seen, refill and retry |
| Invoice stays **Pending Match** after the receipt posted | 3-way match column reads Qty Mismatch or Price Variance; the drawer names the cause and shows the four figures | the invoice is for more than was received and accepted, earlier invoices on the PO already claim what was received, or the total is above the whole order — so the header did not advance (honest no-op) | dispute the invoice, or post a further receipt on the same PO — the match runs again and clears the invoice if it now fits |
| Invoice stays **Pending Match** and match reads Pending / Pending GR | drawer reads "Not matched yet: no receipt is posted on this purchase order." (Pending) | no receipt on that PO is posting or posted; an inspected receipt that is not posted is not read | post the receipt at `/buyer/goods-receipt`; the match runs at that posting. An invoice submitted after its receipt posted is matched at submission |
| Of two invoices for the same goods only one is Matched | the second reads Qty Mismatch with "Earlier invoices on this purchase order already claim what was received: …" | invoices are taken oldest first and a matched one claims its amount before the next is looked at | not a fault; dispute the duplicate, or post the receipt that covers it |
| "Review match" does nothing | info toast "Awaiting 3-way match — Nothing was changed here. The match runs by itself when a receipt is posted on the purchase order and when an invoice is submitted or returned from a dispute." | the footer on a Pending Match row is informational | not a fault; the match is a cascade |
| Release payment is refused with "{person} approved this invoice and may not also release its payment…" | failure toast naming the approver; the invoice stays Approved (`INVOICE_RELEASER_IS_APPROVER`, hook `invoice_releaser_not_approver`) | the seated sample user is the person recorded as the approver | seat a different sample user who holds finance's verbs (the all-roles buyer sample user, Buyer Operations Lead 1 (SAMPLE)) and release |
| Release payment is refused with "This invoice was approved by a named person, so its payment must be released by a named person who is not the approver…" | failure toast; the invoice stays Approved (`INVOICE_RELEASER_UNNAMED`) | the approval is recorded against a named person and the releasing seat has no sample user | pick a sample user other than the approver on the identity panel, then release |
| The confirm panel names no bank account | "… will be released. The supplier’s bank account is not held in the portal — SAP pays to the account on the vendor record."; Payment section "Not held in the portal" | the invoice was raised in the portal and carries no bank account | not a fault |
| Invoice stuck at **Releasing Payment** | footer "Awaiting SAP settlement — no FI document yet" or a fault note | the settle has not landed or failed | **Retry settlement** if offered; a `REFUSED` / `UNGOVERNED` fault needs the named cause fixed; report with the `cmd_…` reference |
| "Escalate" / "Send to supplier" / "Download PDF" / "Export" do nothing | info toast saying nothing was routed / generated / downloaded | these controls are not wired to a real channel | not a fault; use outside channels |
| Supplier's **Resolve** on a disputed row does nothing | toast "Dispute resolution not available yet" | resolution is finance's act on the buyer side | finance uses **Resolve dispute** at `/buyer/invoices` |
| Approval toast says "Recorded without a named approver" | success toast text | no sample user is seated, so no person is resolved in this session (by design) | not a fault; seat a sample user to record a name — the toast then reads "Approved by {person}. The payment is released by somebody else." |
| `STALE_STATE` | refusal names the expected and found states | a caller supplied `expectedState` and the document moved | no invoice screen supplies it today; re-open and decide again |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:INV`, or `MODULE_INACTIVE:INV.disputes` when only *Disputes* is off, or `MODULE_INACTIVE:INV.paymentRelease` when only *Payment release* is off; where the surface checks first, the control reads *"Switched off — Invoices & payment"* | the Invoices & payment module (or one of its parts) is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61-114; src/lib/glossary/refusals.glossary.ts:32-130; src/pages-v2/SupplierInvoices.tsx:254-310; src/pages-v2/BuyerInvoices.tsx:409-480; src/pages-v2/BuyerInvoices.tsx:1101-1141; src/services/data/mock/MockCommandService.ts:2851-2881; src/services/transitions/invoiceRollup.ts:83-104; src/lib/i18n/buyerInvoices.ts:104-108; src/lib/i18n/buyerInvoices.ts:176-180; src/lib/i18n/supplierInvoices.ts:50-55 -->

<!-- section:testdata -->
## 9 · Test data

Fixtures are SIMULATED and shifted onto the declared present (31 Aug 2026). Seeded suppliers in the invoice corpus: sup-007, sup-002, sup-001, sup-003, sup-005, sup-006, sup-004.

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Draft | `inv-brl-0055` | INV-2026-BRL-0055 | sup-007; the only seeded draft — press **Submit** on the supplier side. A created draft is numbered `INV-2026-9001`… |
| Submitted | `inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325` | INV-2026-BRL-0051, INV-2026-MSM-0224, INV-2025-MUS-0214, INV-2026-FIR-0325 | all carry match status Pending GR; only `inv-fir-0325` (PO-2025-00104 + GR-2026-012: FR-MKOV-5510, 200 accepted, 0 rejected) reaches `Matched` when its receipt posts |
| Matched | — | — | no fixture; reach it via `inv-fir-0325` + posting GR-2026-012 |
| Approved | `inv-giv-0892`, `inv-evo-0188` | INV-2025-GIV-0892, INV-2025-EVO-0188 | both matched; `inv-evo-0188` is the corpus's intended Overdue row at the declared present |
| Releasing Payment | — | — | no fixture; interim state reached by **Release payment**, settles ~1.2 s later |
| Payment Released | `inv-brl-0042`, `inv-msm-0210`, `inv-eco-0341`, `inv-bas-0561`, `inv-fir-0309` | INV-2025-BRL-0042, INV-2025-MSM-0210, INV-2025-ECO-0341, INV-2025-BAS-0561, INV-2025-FIR-0309 | carry FI document and payment reference; **Payment details** action on the supplier side; counted in the supplier KPI "Payments Released" |
| Remittance Received | — | — | no fixture and no caller — the bank fact has no feed |
| Disputed | `inv-brl-0043`, `inv-smpl-1180` | INV-2025-BRL-0043, INV-2026-SMPL-1180 | Qty Mismatch and Price Variance respectively, with no stored dispute reason and no match figures; **Resolve dispute** returns them to Submitted and runs the match for their PO |

<!-- src: src/services/data/mock/fixtures/invoices.ts:25-233; src/services/data/mock/stores/invoiceStore.ts:45-58; _derived/guidefacts.json (invoice.fixtures) -->
