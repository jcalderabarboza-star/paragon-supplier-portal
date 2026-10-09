---
entity: invoiceMatch
locale: en
title: Invoice 3-way match (substrate)
wired: false
owner: substrate
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_invmatch_await_gr
  - t_invmatch_matched
  - t_invmatch_qty_variance
  - t_invmatch_price_variance
---

<!-- section:summary -->
## 1 · What this process is

The three-way check behind a bill: what was ordered, what arrived, what is being charged. It is why a wrong bill is caught before money moves, not after. The match is modelled as its own small machine, orthogonal to the invoice lifecycle: it starts at **Pending**, may park at **Pending GR** while no goods receipt exists, and settles into one of three verdicts — **Matched** (the only ending), **Qty Mismatch** or **Price Variance**. The two variance states have no re-match edge and are deliberately not endings.

**This process is modelled but not active.** There is no command target behind `invoiceMatch`, so none of its four verbs can fire; a dispatch naming the entity is refused `UNKNOWN_ENTITY` before an event exists. Every verb is declared computed and carries the automation atom `invoice:match`, which no human lane holds. What is real is the **verdict**, and it is produced elsewhere: on three events — a goods receipt being posted (`t_gr_post`), an invoice being submitted (`t_invoice_submit`) and a dispute being resolved (`t_invoice_resolve`) — the platform recomputes the verdict of every Submitted invoice on that PO from the purchase order, all receipts on it that are posting or posted, and all invoices on it, writes it onto the invoice as `matchStatus` together with the figures it rests on (`matchBasis`), and fires the invoice's own header step `t_invoice_match` only when the verdict is `Matched`. Any other verdict is written and the invoice stays Submitted — an honest no-op. With no posting or posted receipt on the PO nothing is written and the invoice stays Pending. The invoice guide describes that cascade; this guide describes the vocabulary it writes.

The vocabulary is what a finance officer sees. On `/buyer/invoices` the "3-way match" column shows one of the five values and the drawer section explains it. A verdict written by the match shows its cause and four figures ("Ordered (confirmed quantity × PO price)", "Received and accepted", "Already invoiced", "This invoice"): "The invoice is within what was received and accepted on the purchase order, after earlier invoices." (Matched); "Invoiced for more than was received and accepted: … is invoiced and … is payable on what was received." or "Earlier invoices on this purchase order already claim what was received: … is already invoiced and … is left to pay." (Qty Mismatch); "The invoice is above the whole order at purchase-order prices: … invoiced against … ordered. The match compares totals and does not read an invoice’s lines, so the portal cannot say which price or quantity differs." (Price Variance). When the PO's stated total differs from the sum of its own lines by more than 1% the section adds "The purchase order states a total of …, but its lines come to …; the match uses the lines." A seeded row carries no figures and reads "Recorded as matched. This row carries no match figures." (Matched), "Recorded as a quantity mismatch. This row carries no match figures." (Qty Mismatch) or "Recorded as a price variance. This row carries no match figures." (Price Variance). Before any verdict: "Not matched yet: no receipt is posted on this purchase order." (Pending), "Awaiting goods receipt posting in SAP before match can complete." (Pending GR). The invoice's own header may advance from Submitted to Matched only when this axis reads `Matched` — the hook `invoice_rollup_matched` on the invoice flow reads the same field, so the header is derived from the match, never asserted over it.

Honesty markers: the demo invoices are **SIMULATED** fixtures; a runtime-created invoice starts at `Pending` and reaches a verdict the first time the match runs for its PO with a receipt on it posting or posted; `Pending GR` appears on seeded rows only, because the step that would write it is one of the four unwired verbs here. The tolerance is a provisional **1%** of the ordered value, a placeholder, not the accounts-payable policy. The match runs from both sides: a receipt posting finds its invoices, and an invoice submitted after its receipt posted is matched by its own submission. The verdict is recomputed from every posting or posted receipt and every invoice on the PO each time, so a held invoice is cleared by a further receipt and a resolved dispute is matched again; a verdict other than `Matched` writes no event.

<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:304-403; src/services/transitions/invoiceRollup.ts:15-54; src/services/transitions/invoiceRollup.ts:56-110; src/services/data/mock/MockCommandService.ts:2745-2886; src/services/transitions/cascades.ts:31-38; src/services/transitions/flows/invoice.flow.ts:76-94; src/services/transitions/policies.ts:151-164; src/services/transitions/dispatcher.ts:548; src/lib/i18n/buyerInvoices.ts:140-149; src/services/data/types.ts:617-622; _derived/surfaces.md:23 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | Pending → Pending GR | system-driven · modelled, not active (no target) | automation (`invoice:match`) | `t_invmatch_await_gr` |
| 2 | Pending, Pending GR → Matched (terminal) | system-driven · modelled, not active (no target) | automation (`invoice:match`) | `t_invmatch_matched` |
| 3 | Pending, Pending GR → Qty Mismatch | system-driven · modelled, not active (no target) | automation (`invoice:match`) | `t_invmatch_qty_variance` |
| 4 | Pending, Pending GR → Price Variance | system-driven · modelled, not active (no target) | automation (`invoice:match`) | `t_invmatch_price_variance` |

**Forks**

- **At Pending and at Pending GR:** the three verdicts are one decision with three outcomes, taken in this order by the shipped derivation: `t_invmatch_matched` — automation — when the invoiced amount fits inside what was received and accepted on the purchase order, less what earlier invoices on it already claim (tolerance 1% of the ordered value); `t_invmatch_price_variance` — automation — when the amount is above the whole order at PO prices; `t_invmatch_qty_variance` — automation — otherwise: more than was received and accepted, or already claimed by earlier invoices. `t_invmatch_await_gr` — automation — when no receipt exists yet; declared, and written by nothing at runtime.
- **At Qty Mismatch and Price Variance:** no exit in the machine, which deliberately has no re-match edge. The stored verdict is nonetheless recomputed, outside this machine, each time the match runs for the PO while the invoice is Submitted.

<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:324-403; src/services/transitions/invoiceRollup.ts:33-54; src/services/transitions/invoiceRollup.ts:94-99 -->

<!-- section:steps -->
## 3 · Step by step

### t_invmatch_await_gr — Waiting for the goods receipt <!-- transition:t_invmatch_await_gr -->

- **Step kind:** system-driven · modelled, not active (no target)
- **Role:** automation (atom `invoice:match`; no human lane)
- **From → to:** Pending → Pending GR
- **Operator — where:** not offered anywhere today; nobody presses it and nothing fires it. The bill cannot be checked until the goods are booked in — this is the wait, made visible instead of looking like a stall.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Pending GR — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_invmatch_await_gr` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** the only rows reading **Pending GR** are seeded (`inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325`); a runtime-created invoice stays at **Pending** ("Not matched yet: no receipt is posted on this purchase order.") until the match runs with a receipt on its PO posting or posted, because this step is unwired.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:333-350; src/services/data/mock/MockCommandService.ts:442; src/services/data/mock/fixtures/invoices.ts:50; src/services/data/mock/fixtures/invoices.ts:80; src/services/data/mock/fixtures/invoices.ts:195; src/lib/i18n/buyerInvoices.ts:143-145 -->

### t_invmatch_matched — Order, receipt and bill agree <!-- transition:t_invmatch_matched -->

- **Step kind:** system-driven · modelled, not active (no target)
- **Role:** automation (atom `invoice:match`; no human lane)
- **From → to:** Pending, Pending GR → Matched (terminal)
- **Operator — where:** not offered anywhere today. The verdict is derived by the match cascade, which runs when a goods receipt is posted at `/buyer/goods-receipt` (**Post to SAP**), when an invoice is submitted and when a dispute is resolved: the platform writes `Matched` on each Submitted invoice of the same PO whose amount fits inside what was received and accepted, less what earlier invoices on the PO already claim, and fires the invoice's `t_invoice_match`. An invoice for less than what is payable matches (partial invoices are allowed); invoices are taken oldest first (submitted date, then invoice number) and one that matches claims its amount before the next is looked at. Nothing stands in the way of paying; the finance officer then sees **Approve for payment**.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Matched — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_invmatch_matched` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** this verb never fires; the value it names is written directly onto the invoice by the cascade resolver. The invoice header's advance is guarded by `invoice_rollup_matched`, which reads the same field ("match axis is 'Qty Mismatch', not 'Matched'"). The figures the verdict rests on are stored with it (`matchBasis`). The 1% tolerance, taken on the ordered value, is a placeholder.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:351-367; src/services/transitions/invoiceRollup.ts:26-54; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/policies.ts:151-164; src/lib/i18n/buyerInvoices.ts:141-142 -->

### t_invmatch_qty_variance — More charged than received <!-- transition:t_invmatch_qty_variance -->

- **Step kind:** system-driven · modelled, not active (no target)
- **Role:** automation (atom `invoice:match`; no human lane)
- **From → to:** Pending, Pending GR → Qty Mismatch
- **Operator — where:** not offered anywhere today. The cascade writes `Qty Mismatch` for two causes: the invoice is for more than was received and accepted on the PO, or it would fit what was received but earlier invoices on the PO already claim it. The invoice stays **Submitted** (buyer label **Pending Match**) and the drawer reads "Invoiced for more than was received and accepted: …" or "Earlier invoices on this purchase order already claim what was received: …", with the four figures. Rejected quantity is not payable, but a receipt with rejects does not by itself produce this verdict: an invoice for the accepted part matches. Somebody has to establish which count is right; the human path is **Dispute** on `/buyer/invoices`.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Qty Mismatch — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_invmatch_qty_variance` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** a variance verdict is an honest no-op on the invoice header — nothing advances and nothing is refused; the finance officer decides. The machine has no re-match edge, but the stored verdict is recomputed each time the match runs for the PO, so a further receipt that covers the invoice clears it. Of two invoices for the same goods the older is matched and the other is held here.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:368-384; src/services/transitions/invoiceRollup.ts:45-50; src/services/data/mock/MockCommandService.ts:2869-2877; src/services/data/mock/fixtures/invoices.ts:41; src/lib/i18n/buyerInvoices.ts:146-147 -->

### t_invmatch_price_variance — Priced above what was agreed <!-- transition:t_invmatch_price_variance -->

- **Step kind:** system-driven · modelled, not active (no target)
- **Role:** automation (atom `invoice:match`; no human lane)
- **From → to:** Pending, Pending GR → Price Variance
- **Operator — where:** not offered anywhere today. The cascade writes `Price Variance` in one case only: the invoiced amount is above the whole order, Σ(confirmed qty × unit price), by more than 1% of that value, whatever was received or already invoiced. The invoice stays **Submitted**; the drawer reads "The invoice is above the whole order at purchase-order prices: … invoiced against … ordered. The match compares totals and does not read an invoice’s lines, so the portal cannot say which price or quantity differs." Buying owns that conversation, not finance.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Price Variance — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_invmatch_price_variance` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** the shipped derivation tests the invoice total against the order's value, in one direction only; it is not a per-line unit-price comparison, and the explanation sentence says so. An invoice raised from the supplier's form states lines, at the order's prices; the match does not read them. An invoice for less than what is payable does not land here — it matches.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:385-401; src/services/transitions/invoiceRollup.ts:45-54; src/services/data/mock/MockCommandService.ts:2869-2877; src/services/data/mock/fixtures/invoices.ts:155; src/lib/i18n/buyerInvoices.ts:148-149; src/services/data/types.ts:619-633; src/services/transitions/invoiceRollup.ts:119-125 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **The one decision (at Pending / Pending GR), taken by the match cascade rather than by this machine.** Three figures at the PO's own unit prices: ordered = Σ confirmed qty × unit price; received = Σ accepted qty × unit price over every receipt on the PO that is posting or posted, accepted quantity pooled per material and each PO line capped at its confirmed quantity; already invoiced = the sum of the other invoices on the PO in Matched, Approved, Releasing Payment, Payment Released or Remittance Received. The tolerance is 1% of ordered. Within what is payable — **When:** ordered > 0 and invoiced ≤ received − already invoiced + tolerance → Matched, and the invoice header advances. Above the order — **When:** invoiced > ordered + tolerance → Price Variance. Already claimed — **When:** earlier invoices claim something and invoiced ≤ received + tolerance → Qty Mismatch. Otherwise — **When:** the invoice is for more than was received and accepted → Qty Mismatch. The Qty Mismatch and Price Variance branches leave the invoice Submitted; the human exception path is the invoice's **Dispute**.
- **The wait (at Pending).** `t_invmatch_await_gr` is declared for "no receipt yet" and is written by nothing; a runtime invoice reads Pending while no receipt on its PO is posting or posted.
- **Re-match, outside the machine.** Qty Mismatch and Price Variance have no exit in the machine. The stored verdict is recomputed each time the match runs for the PO — a receipt posting, an invoice being submitted, a dispute being resolved — so the first and the last computation agree; resolving a dispute returns the invoice to Submitted and matches it again.

<!-- src: src/services/transitions/invoiceRollup.ts:33-54; src/services/transitions/invoiceRollup.ts:94-104; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/flows/invoiceMatch.flow.ts:329-331 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| 3-way match verdict — Pending / Pending GR / Matched / Qty Mismatch / Price Variance | derived (written by the match cascade; seeded on fixtures) | the invoice, in any state | Pending on a runtime invoice; Pending GR on seeded Submitted rows; a verdict each time the match runs for the PO (a receipt posts, an invoice is submitted, a dispute is resolved) | `/buyer/invoices` "3-way match" column and drawer section with the cause sentence and four figures (a one-line "Recorded as …" sentence on seeded rows without figures); "3-Way Match Summary" tiles on the Spend Analytics tab |
| PO total differs from its lines | derived | an invoice carrying match figures | the PO's stated total differs from the sum of its own lines by more than 1% | drawer "3-way match" section: "The purchase order states a total of …, but its lines come to …; the match uses the lines." |
| Authored — unwired | honesty marker | the flow itself | always | `/buyer/process-flows`, on every `invoiceMatch` step |

<!-- src: src/lib/i18n/buyerInvoices.ts:76; src/lib/i18n/buyerInvoices.ts:140-149; src/pages-v2/BuyerInvoices.tsx:955; src/lib/i18n/processFlows.ts:55 -->

<!-- section:linked -->
## 6 · Linked objects

**What the portal reads today:** the `matchStatus` field on the invoice and, beside it, `matchBasis` (the figures a computed verdict rests on), through the invoice reads. There is no match entity, no store and no id of its own. Representative invoice: `inv-fir-0325` (INV-2026-FIR-0325, Submitted, match status Pending GR) — the one seeded pair whose receipt (GR-2026-012 on PO-2025-00104) yields `Matched` when posted.

| Joins to | By | Note |
|---|---|---|
| Invoice `matchStatus` | same entity | the only place a verdict lives; typed `InvoiceMatchStatus`, exactly this machine's five states |
| Invoice `matchBasis` | same entity | written with each computed verdict: `orderedValue`, `receivedValue`, `alreadyInvoiced`, `invoiced`, `cause` (`WITHIN`, `EXCEEDS_RECEIVED`, `ALREADY_INVOICED`, `EXCEEDS_ORDER`), `poStatedTotal`, `poLineTotal`; absent on seeded rows |
| Purchase order `PO-2025-00104` | invoice `poNumber` = PO `poNumber` | the ordered value is Σ(`confirmedQty` × `unitPrice`) over its lines (200 KG × 2,700,000 = 540,000,000); received quantity is priced at the same unit prices |
| Goods receipt `GR-2026-012` | receipt `poNumber` = invoice `poNumber`; receipt `inspectionResults[].materialCode`, `.qtyAccepted` | carries the PO's own line (FR-MKOV-5510, 200 accepted, 0 rejected); accepted quantity is what is payable, read from every receipt on the PO that is Posting to SAP or Posted to SAP; a material the PO does not carry earns nothing |
| Other invoices on the PO | same `poNumber` | those in Matched, Approved, Releasing Payment, Payment Released or Remittance Received count as already invoiced; Draft, Submitted and Disputed claim nothing |
| Invoice header `t_invoice_match` | hook `invoice_rollup_matched` reads `matchStatus` | the header advances only on `Matched` |

<!-- src: src/services/data/types.ts:617-622; src/services/transitions/invoiceRollup.ts:112-177; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/data/mock/fixtures/invoices.ts:195; src/services/transitions/policies.ts:151-164 -->

<!-- section:history -->
## 7 · Status history

There is none for this machine. Nothing dispatches an `invoiceMatch` verb — the entity has no command target, so a dispatch naming it is refused `UNKNOWN_ENTITY` before an event exists. The verdict's only trace is the invoice's own `t_invoice_match` event (on a `Matched` verdict), whose `causationId` is the correlationId of the command that caused it (the receipt post, the invoice submission or the dispute resolution); a Qty Mismatch or Price Variance verdict leaves no event at all.

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| — | — | — | nothing dispatches | no `t_invmatch_*` events exist; see the invoice guide for `t_invoice_match` |

<!-- src: src/services/transitions/dispatcher.ts:548; src/services/data/mock/MockCommandService.ts:2869-2880 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| The match column reads Pending or Pending GR long after the invoice was submitted | `/buyer/invoices` "3-way match" column | no receipt on that PO is posting or posted; an inspected receipt that is not posted is not read | post the receipt at `/buyer/goods-receipt`; the match runs at that posting. An invoice submitted after its receipt posted is matched at submission |
| The column reads Qty Mismatch or Price Variance and the invoice stays Pending Match | drawer explanation names the cause and shows the four figures | the verdict was written and the header honestly did not advance | finance disputes the invoice, or a further receipt on the same PO is posted — the match runs again |
| A verdict changed without anybody acting on that invoice | the column moved between two reads | the match ran again for the PO: a receipt posted, another invoice was submitted, or a dispute was resolved (no event unless the new verdict is `Matched`) | check the receipts and the other invoices on that PO |
| Of two invoices for the same goods only one is Matched | the other reads Qty Mismatch, "Earlier invoices on this purchase order already claim what was received: …" | invoices are taken oldest first and a matched one claims its amount | not a fault |
| Anything tries to fire `t_invmatch_*` | refusal `UNKNOWN_ENTITY:invoiceMatch` | the machine has no command target | not a fault; the verdict is written by the match cascade |
| — (cannot occur yet) | `MODULE_INACTIVE:INV` | this flow has no command target, so a hand-crafted dispatch is refused `UNKNOWN_ENTITY` before the module check runs; once it is wired, switching off the Invoices & payment module refuses every verb by this name | nothing to do today; the module switch is at `/buyer/platform/modules/admin` |

<!-- src: src/services/transitions/invoiceRollup.ts:56-110; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/dispatcher.ts:548 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| all | — | — | no fixture — modelled, not active. The five values appear only as `matchStatus` on invoices: Pending on `inv-brl-0055` (Draft) and on any runtime invoice; Pending GR on `inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325`; Matched on the Approved and Payment Released rows; Qty Mismatch on `inv-brl-0043`; Price Variance on `inv-smpl-1180`. To produce `Matched` at runtime, post GR-2026-012 with `inv-fir-0325` Submitted. |

<!-- src: src/services/data/mock/fixtures/invoices.ts:25-233; src/services/data/mock/MockCommandService.ts:442; _derived/guidefacts.json (invoiceMatch.fixtures = "no store") -->
