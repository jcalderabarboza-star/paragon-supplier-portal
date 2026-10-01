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

**This process is modelled but not active.** There is no command target behind `invoiceMatch`, so none of its four verbs can fire; a dispatch naming the entity is refused `UNKNOWN_ENTITY` before an event exists. Every verb is declared computed and carries the automation atom `invoice:match`, which no human lane holds. What is real is the **verdict**, and it is produced elsewhere: when a goods receipt is posted (`t_gr_post`), the platform derives the verdict from the purchase order, the receipt and each Submitted invoice on the same PO, writes it onto the invoice as `matchStatus`, and fires the invoice's own header step `t_invoice_match` only when the verdict is `Matched`. A variance verdict is written and the invoice stays Submitted — an honest no-op. The invoice guide describes that cascade; this guide describes the vocabulary it writes.

The vocabulary is what a finance officer sees. On `/buyer/invoices` the "3-way match" column and the drawer section show one of the five values with a one-line explanation: "Match not yet started." (Pending), "Awaiting goods receipt posting in SAP before match can complete." (Pending GR), "PO, GR and invoice quantities + prices all reconcile." (Matched), "Delivered quantity does not match invoiced quantity. Credit note required." (Qty Mismatch), "Invoice unit price exceeds PO price by more than tolerance." (Price Variance). The invoice's own header may advance from Submitted to Matched only when this axis reads `Matched` — the hook `invoice_rollup_matched` on the invoice flow reads the same field, so the header is derived from the match, never asserted over it.

Honesty markers: the demo invoices are **SIMULATED** fixtures; a runtime-created invoice starts at `Pending` and reaches a verdict only when a receipt on its PO posts; `Pending GR` appears on seeded rows only, because the step that would write it is one of the four unwired verbs here. The price tolerance is a provisional **1%** placeholder, not the accounts-payable policy. The pairing runs receipt → invoices only; an invoice submitted after its receipt already posted is matched by nothing, and a later receipt on the same PO overwrites an earlier verdict without an event.

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

- **At Pending and at Pending GR:** the three verdicts are one decision with three outcomes, taken in this order by the shipped derivation: `t_invmatch_qty_variance` — automation — when the posted receipt carries any rejected quantity; `t_invmatch_matched` — automation — when the invoiced amount is within 1% of Σ(confirmed qty × unit price) on the purchase order; `t_invmatch_price_variance` — automation — otherwise (including a PO whose expected value is zero). `t_invmatch_await_gr` — automation — when no receipt exists yet; declared, and written by nothing at runtime.
- **At Qty Mismatch and Price Variance:** no exit. The machine deliberately has no re-match edge; a later receipt overwrites the stored verdict directly, outside this machine.

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
- **Honesty:** the only rows reading **Pending GR** are seeded (`inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325`); a runtime-created invoice stays at **Pending** ("Match not yet started.") until a receipt on its PO posts, because this step is unwired.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:333-350; src/services/data/mock/MockCommandService.ts:442; src/services/data/mock/fixtures/invoices.ts:50; src/services/data/mock/fixtures/invoices.ts:80; src/services/data/mock/fixtures/invoices.ts:195; src/lib/i18n/buyerInvoices.ts:143-145 -->

### t_invmatch_matched — Order, receipt and bill agree <!-- transition:t_invmatch_matched -->

- **Step kind:** system-driven · modelled, not active (no target)
- **Role:** automation (atom `invoice:match`; no human lane)
- **From → to:** Pending, Pending GR → Matched (terminal)
- **Operator — where:** not offered anywhere today. The verdict is derived by the receipt-post cascade: the receiver posts the goods receipt at `/buyer/goods-receipt` (**Post to SAP**), the platform writes `Matched` on each Submitted invoice of the same PO whose amount is within 1% of the PO's confirmed value, and fires the invoice's `t_invoice_match`. Nothing stands in the way of paying; the finance officer then sees **Approve for payment**.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Matched — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_invmatch_matched` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** this verb never fires; the value it names is written directly onto the invoice by the cascade resolver. The invoice header's advance is guarded by `invoice_rollup_matched`, which reads the same field ("match axis is 'Qty Mismatch', not 'Matched'"). The 1% tolerance is a placeholder.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:351-367; src/services/transitions/invoiceRollup.ts:26-54; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/policies.ts:151-164; src/lib/i18n/buyerInvoices.ts:141-142 -->

### t_invmatch_qty_variance — More charged than received <!-- transition:t_invmatch_qty_variance -->

- **Step kind:** system-driven · modelled, not active (no target)
- **Role:** automation (atom `invoice:match`; no human lane)
- **From → to:** Pending, Pending GR → Qty Mismatch
- **Operator — where:** not offered anywhere today. The cascade writes `Qty Mismatch` when the posted receipt carries any rejected quantity; the invoice stays **Submitted** (buyer label **Pending Match**) and the drawer reads "Delivered quantity does not match invoiced quantity. Credit note required." Somebody has to establish which count is right; the human path is **Dispute** on `/buyer/invoices`.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Qty Mismatch — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_invmatch_qty_variance` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** a variance verdict is an honest no-op on the invoice header — nothing advances and nothing is refused; the finance officer decides. No re-match edge exists; a later receipt on the same PO overwrites the verdict without an event.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:368-384; src/services/transitions/invoiceRollup.ts:45-50; src/services/data/mock/MockCommandService.ts:2869-2877; src/services/data/mock/fixtures/invoices.ts:41; src/lib/i18n/buyerInvoices.ts:146-147 -->

### t_invmatch_price_variance — Priced above what was agreed <!-- transition:t_invmatch_price_variance -->

- **Step kind:** system-driven · modelled, not active (no target)
- **Role:** automation (atom `invoice:match`; no human lane)
- **From → to:** Pending, Pending GR → Price Variance
- **Operator — where:** not offered anywhere today. The cascade writes `Price Variance` when the receipt has no rejects but the invoiced amount differs from Σ(confirmed qty × unit price) by more than 1% — or when that expected value is zero. The invoice stays **Submitted**; the drawer reads "Invoice unit price exceeds PO price by more than tolerance." Buying owns that conversation, not finance.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Price Variance — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_invmatch_price_variance` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** the shipped derivation is a relative test on the whole amount, both directions, not a per-line unit-price comparison as the explanation sentence suggests; and an under-charged invoice beyond 1% lands here too. Not measured beyond the function itself.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:385-401; src/services/transitions/invoiceRollup.ts:45-54; src/services/data/mock/MockCommandService.ts:2869-2877; src/services/data/mock/fixtures/invoices.ts:155; src/lib/i18n/buyerInvoices.ts:148-149 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **The one decision (at Pending / Pending GR), taken by the receipt-post cascade rather than by this machine.** Receipt carries rejected quantity — **When:** any inspection line has `qtyRejected > 0` → Qty Mismatch. Amount within tolerance — **When:** |invoiced − expected| ⁄ expected ≤ 0.01 → Matched, and the invoice header advances. Otherwise — **When:** the difference exceeds 1%, or the PO's expected value is zero → Price Variance. The variance branches leave the invoice Submitted; the human exception path is the invoice's **Dispute**.
- **The wait (at Pending).** `t_invmatch_await_gr` is declared for "no receipt yet" and is written by nothing; a runtime invoice reads Pending until a receipt posts.
- **No re-match.** Qty Mismatch and Price Variance have no exit in the machine. A second receipt on the same PO overwrites the stored verdict; resolving a dispute returns the invoice to Submitted carrying its previous verdict.

<!-- src: src/services/transitions/invoiceRollup.ts:33-54; src/services/transitions/invoiceRollup.ts:94-104; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/flows/invoiceMatch.flow.ts:329-331 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| 3-way match verdict — Pending / Pending GR / Matched / Qty Mismatch / Price Variance | derived (written by the receipt-post cascade; seeded on fixtures) | the invoice, in any state | Pending on a runtime invoice; Pending GR on seeded Submitted rows; a verdict when a receipt on the PO posts | `/buyer/invoices` "3-way match" column and drawer section with its one-line explanation; "3-Way Match Summary" tiles on the Spend Analytics tab |
| Authored — unwired | honesty marker | the flow itself | always | `/buyer/process-flows`, on every `invoiceMatch` step |

<!-- src: src/lib/i18n/buyerInvoices.ts:76; src/lib/i18n/buyerInvoices.ts:140-149; src/pages-v2/BuyerInvoices.tsx:955; src/lib/i18n/processFlows.ts:55 -->

<!-- section:linked -->
## 6 · Linked objects

**What the portal reads today:** the `matchStatus` field on the invoice, through the invoice reads. There is no match entity, no store and no id of its own. Representative invoice: `inv-fir-0325` (INV-2026-FIR-0325, Submitted, match status Pending GR) — the one seeded pair whose receipt (GR-2026-012 on PO-2025-00104) yields `Matched` when posted.

| Joins to | By | Note |
|---|---|---|
| Invoice `matchStatus` | same entity | the only place a verdict lives; typed `InvoiceMatchStatus`, exactly this machine's five states |
| Purchase order `PO-2025-00104` | invoice `poNumber` = PO `poNumber` | the expected value is Σ(`confirmedQty` × `unitPrice`) over its lines (200 KG × 2,700,000 = 540,000,000) |
| Goods receipt `GR-2026-012` | receipt `poNumber` = invoice `poNumber`; receipt `inspectionResults[].qtyRejected` | rejects decide Qty Mismatch; the pairing is receipt → Submitted invoices only |
| Invoice header `t_invoice_match` | hook `invoice_rollup_matched` reads `matchStatus` | the header advances only on `Matched` |

<!-- src: src/services/data/types.ts:617-622; src/services/transitions/invoiceRollup.ts:112-177; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/data/mock/fixtures/invoices.ts:195; src/services/transitions/policies.ts:151-164 -->

<!-- section:history -->
## 7 · Status history

There is none for this machine. Nothing dispatches an `invoiceMatch` verb — the entity has no command target, so a dispatch naming it is refused `UNKNOWN_ENTITY` before an event exists. The verdict's only trace is the invoice's own `t_invoice_match` event (on a `Matched` verdict), whose `causationId` is the receipt post's correlationId; a variance verdict leaves no event at all.

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| — | — | — | nothing dispatches | no `t_invmatch_*` events exist; see the invoice guide for `t_invoice_match` |

<!-- src: src/services/transitions/dispatcher.ts:548; src/services/data/mock/MockCommandService.ts:2869-2880 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| The match column reads Pending or Pending GR long after the invoice was submitted | `/buyer/invoices` "3-way match" column | no receipt on that PO has posted since; or the receipt posted **before** the invoice was submitted (the pairing runs one way) | post the receipt at `/buyer/goods-receipt`; if it already posted, there is no re-match path today |
| The column reads Qty Mismatch or Price Variance and the invoice stays Pending Match | drawer explanation names the variance | the verdict was written and the header honestly did not advance | finance disputes the invoice or waits for a corrected receipt on the same PO |
| A verdict changed without anybody acting | the column moved between two reads | a later receipt on the same PO overwrote it (no event) | check the receipts on that PO |
| Anything tries to fire `t_invmatch_*` | refusal `UNKNOWN_ENTITY:invoiceMatch` | the machine has no command target | not a fault; the verdict is written by the receipt-post cascade |
| — (cannot occur yet) | `MODULE_INACTIVE:INV` | this flow has no command target, so a hand-crafted dispatch is refused `UNKNOWN_ENTITY` before the module check runs; once it is wired, switching off the Invoices & payment module refuses every verb by this name | nothing to do today; the module switch is at `/buyer/platform/modules/admin` |

<!-- src: src/services/transitions/invoiceRollup.ts:56-110; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/dispatcher.ts:548 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| all | — | — | no fixture — modelled, not active. The five values appear only as `matchStatus` on invoices: Pending on `inv-brl-0055` (Draft) and on any runtime invoice; Pending GR on `inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325`; Matched on the Approved and Payment Released rows; Qty Mismatch on `inv-brl-0043`; Price Variance on `inv-smpl-1180`. To produce `Matched` at runtime, post GR-2026-012 with `inv-fir-0325` Submitted. |

<!-- src: src/services/data/mock/fixtures/invoices.ts:25-233; src/services/data/mock/MockCommandService.ts:442; _derived/guidefacts.json (invoiceMatch.fixtures = "no store") -->
