# DESIGN 3 · The state machine end to end — no document strands, no hand-off is nothing

**Seat 3, consultant, Ops Project #11 · 2026-09-28 · DRAFT FOR OPERATOR RULING · READ-ONLY session (nothing written in the repo).**
**Pinned tree:** `main` @ `81c98403a83a674df80959f7d2290898ddd822fa`, read from the reviewer's `git archive` export; every file:line is against that tree.
**What this document is:** the third design draft, on the R3 lane as the operator confirmed on 2026-09-28: the source-to-pay machine as ONE process, its stranded hand-offs, its practical dead ends, and the processes a procurement platform has that this tree does not — each ruled OURS / SAP / SE-SCOPE. It builds on `R3_STATE_MACHINE.md` (the derived census in its Appendix A, corrected in its header) and shares vocabulary with Designs 1 and 2. **The Flow Builder is in scope, built by the SE Team, and gets its own design (Design 6) after Design 5 (operator ruling, 28 Sep 2026)**; nothing here designs it, and where a change touches what a builder would later read (registry labels, hook parameters) it says so.
**Standing rulings applied:** SAP owns documents and numbers (C11 V15); SOMO owns planning; the call-off is the SAP release; law 0.5 (no clock-fired transition, no stored clock state); roles, never names; a register entry is not a deliverable.

---

## 0 · The one-page version

1. **The machine is structurally clean where it is declared and stranded where it is not.** The census returns 0 unreachable states and 0 dead transitions, 11 censused loose ends and no stale census row (R3 §1.4). What it also returns is a chain of hand-offs that are **nothing** — sourcing into a contract, a contract into a scheduling agreement, an approved requisition into anything — and five practical dead ends that are product gaps, not seams (R3 §1.4, §2.3).
2. **One rule closes the class:** every hand-off between flows is a **cascade**, a **human verb**, or a **declared external fact with a rendered wait** — never a fixture link and never a client-minted number. Every non-terminal state has at least one exit that is either dispatchable by a seat that exists or an external fact whose owner the surface names. A test derives both populations every run (§5).
3. **What the portal owns in the chain, and what it does not.** SAP owns the PO, the contract, the scheduling agreement, the goods movement, the FI documents and the vendor master — the portal **carries** those as external facts with a feed at F2. The portal owns every **collaboration document** around them: the supplier's change request on a PO, the return notice and its root cause, the quality notification, the supplier's standing, the outcome of an invoice dispute as the supplier reads it, and the record of an award until S/4 answers with a contract. Those are the verbs this design adds.
4. **Nine hand-off designs**, in chain order (§3): requisition after approval · award to contract · contract to agreement · PO change request · ASN ending · quality hold and return · invoice variance and dispute outcome · payment wait · RFQ close by a person. Plus three portal objects the tree lacks (§4): supplier standing · quality notification · dispute outcome ledger.
5. **Two inert lanes get a ruling each** (§3.2, §4.4): `contract` becomes a **fed** external-fact flow with a target (the feed is SE-scope; the declaration and the honest surface are ours), and `compliance` is **retired as a machine** in favour of the write path that exists (`supplierDocument`) and the projection that already renders — a machine with no creation transition and no caller is a projection wearing a flow's clothes.
6. **Registry hygiene rides the batches that touch each file**, never standalone: the ASN's empty `terminals`, the requirement response's false `initial`, the census header's stale *"NINE"*, `t_po_view` as a read-side stamp, and one settings surface for the four governed ledgers that today have a verb and no door.
7. **Nine batches, with ownership RULED (operator, 28 Sep 2026, §7):** ours is ONLY the contract wizard's client-side numbering (Week 4, batch E1) — **measured already retired at `f5338c2`, so E1 reduces to the V15 gate and the stale C11 text (§3.2 correction) — RULED as exactly that, operator, 28 Sep 2026**; everything else in this design is the SE Team's (SE-17).

---

## 1 · What is kept, and the instrument that keeps it

| Kept | Where |
|---|---|
| The registry shape: `FlowDefinition` / `TransitionDef`, `trigger: 'clock'` a compile error, `surfaceable` with owner, `statePreserving`, `sapBoundary ⇔ settlesTo` | `schema.ts`, `validate.ts` |
| The analyzer and the bilateral loose-end census (a derived hole with no row is red; a row with no hole is red) | `flowGraph.ts`, `looseEndCensus.ts`, `flowGraph.test.ts` |
| The atom lattice: 80 atoms, none unheld, 12 automation-only, cascade targets covered | `businessRoles.test.ts` |
| Every cascade in the tree (GR → ASN discrepancy · GR post → invoice match · RFQ create → PR source · RFQ award → quotation award/reject) | `cascades.ts` |
| `nextActFor` and its owner order (`yours` > `external` > `computed`), the renderer of every wait | `nextAct.ts` |
| The dispatcher's refusal order, compare-and-set, idempotency replay, attribution from scope only | `dispatcher.ts` |
| C1's pinned counts, re-harvested by every batch that changes the catalog | `c1MethodSurface.contract.test.ts` |

Every verb below is authored in the tree's idiom; every new cascade is a `CascadeLink` plus a resolver in the command service; every new state is declared, reachable and exitable or terminal; every clock-shaped condition is a read-time projection.

---

## 2 · The two rules, stated as invariants the tree can check

**R-A · A hand-off is never nothing.** For every pair of flows that the source-to-pay chain joins, the join is one of: a `CascadeLink` from a source transition; a human verb on the target flow whose payload names the source document; or a `creation` transition declared `external-fact` with an owner and a `why`. A fixture field that names another document (`SchedulingAgreement.contractId`, `poId` on an invoice) is a **carried identity**, not a hand-off, and the design says which verb or feed populates it.

**R-B · No document strands.** For every non-terminal state of every wired flow, at least one exit is (i) `DISPATCHED-BY-SURFACE` or `DISPATCHED-NON-LITERAL` by a seat that holds the atom, or (ii) an `external-fact` whose owner `nextActFor` renders as a wait on every surface that lists the document. A state whose only exits are `WIRED-NO-CALLER`, `AUTHORED-UNWIRED`, or an external fact the surface does not render as a wait, is a **practical dead end** and is red.

Both are instruments in §5, not paragraphs. R3's classification script is the population source; the two rules are assertions over it.

---

## 3 · The hand-offs, in chain order

### 3.1 Requisition after approval — `Approved` and `Sourcing Event` gain a human exit and an honest wait

Today `Approved` exits only by `t_pr_source` (fired when an RFQ is raised from the PR) or `t_pr_convert` (declared `computed`, no caller, censused as unauthored). An approved requisition nobody sources sits forever, and one that is sourced sits in `Sourcing Event` forever, because the only terminal is `PO Created` and nothing produces it (R1 F12, R3 §1.4).

| Change | Shape |
|---|---|
| `t_pr_convert` re-declared | `surfaceable: { surfaced: false, because: 'external-fact', owner: 's4hana', why: 'A purchase order is raised in S/4HANA against the requisition and arrives as a fact.' }` — it is not *computed*; it is SAP's act. `nextActFor` then renders *awaiting S/4HANA* on `Approved` / `Sourcing Event`, which it cannot today. The census row `purchaseRequisition#unauthored-cascade#t_pr_convert` retires because the trigger becomes `system`, not `cascade`. |
| `t_pr_close` (new) | `Approved \| Sourcing Event → Closed` (new terminal), `user`, atom `pr:approve` (procurement), `requiredFields: ['closeReason']`, hook `PR_CLOSE_REASON_AUTHORED`. The human exit for *no PO will be raised*. `Closed` is distinct from `Rejected` (which is the approver's refusal before approval and has `t_pr_revise` as an exit). |
| `t_pr_convert` feed | The F2 seam: the S/4 PO event carries the requisition reference and fires `t_pr_convert` with `poNumber` — SE Team (`C12`). Until then the state renders as a wait, which is the truth. |

### 3.2 Award to contract — the contract is S/4's and the portal stops pretending otherwise

`contract` is inert (no target) and every edge is an S/4 fact by ruling (its own header); award to contract is nothing (R3 §2.1).

> ⚠️ **CORRECTED 2026-09-28, MEASURED AGAINST THE PINNED TREE: `BuyerContracts` DOES NOT MINT A CONTRACT NUMBER.** R0 #7, R3 §2.1 and the first draft of this section said it mints `CTR-<year>-<n>` client-side, citing C11 V15's own text (*"the tree currently CONTRADICTS this row in one place"*). That sentence in C11 is stale: the minting was retired on **2026-09-11** (commit `f5338c2`, *"The contract lane refuses at the terminal act, and names the system that owns it"*) — the wizard now ends in a `RaisedElsewherePanel` that creates no row, and `grep` for any client-side construction of a governed document number over `src/` outside fixtures and tests returns nothing. What remains open is exactly what V15 says of itself: **`NOT ENFORCED` — no gate reads document-number construction.** The defect is gone; the instrument that keeps it gone does not exist. `FALSE-MECHANISM-MUST-NOT-BE-FILED-01`: the conclusion (V15 needs its gate) stands, the mechanism (a live minting) was false and is retracted rather than softened.

| Change | Shape |
|---|---|
| `contract` gets a `CommandTarget` — for the **feed**, not for a wizard | `t_contract_draft` (creation, external-fact s4hana) gains `requiredFields: ['sapContractNumber','supplierId','title','sourceRfqId?']`; the target creates the row **only** from a payload that carries the SAP number. The dispatch is the F2 inbound event's (SE Team); a portal surface never fires it. The flow leaves the target-less set honestly: it is wired to a feed, not to a button. |
| `BuyerContracts` wizard — **already honest (measured)** | The wizard collects a draft and stops at the `RaisedElsewherePanel` (*Contracts are raised in S/4HANA and arrive here as facts; no contract was created*) since `f5338c2` (2026-09-11). Nothing to retire. **What is left is V15's instrument (§5)** — the source gate over identifier construction — and the correction of C11 V15's stale sentence; `CTR-FABRICATION-01` is closed by that commit and its register row should say so. |
| Award record carries forward | `t_rfq_award` already lands `Awarded` with `awardedSupplierId`; the RFQ detail and the supplier's RFQ page render *awaiting S/4HANA contract* via `nextActFor` reading the contract flow's external owner, keyed by `sourceRfqId` once the feed answers. No new state on the RFQ. |
| `obligation` follows the contract | Stays declared, target-less until the contract feed exists; then `t_obligation_track` (creation, `procurement`) is the one **portal-owned** act in this lane — a commitment the buyer tracks against an S/4 contract. Named, sized, not built here. |

### 3.3 Contract to scheduling agreement — the agreement is born from S/4, and says so

`deliveryRelease#initial-integrity#Draft` is censused because schedule lines are generated from an agreement that exists only because the fixture says so (R3 §2.1).

| Change | Shape |
|---|---|
| `schedulingAgreement` flow (new, header-level) | `states: ['Active','Closed']`, `t_sa_receive` (creation, external-fact s4hana, `requiredFields: ['sapAgreementNumber','contractId','supplierId','items']`) — the LPA arrives as a fact; the target runs the existing release-calendar generator to materialise the draft lines, which is what the fixture does by hand today. `t_sa_close` (system, external-fact s4hana). |
| `deliveryRelease` census row | `deliveryRelease#initial-integrity#Draft` retires: a schedule line is born by the agreement's receipt, and the census gains no new row because the agreement flow declares its own creation. |
| The feed | SE Team (F2 OData on the LPA). Ours: the flow, the target, the generator call, the honest wait on `BuyerContractDetail` while no agreement has arrived. |

### 3.4 PO change request — the supplier's proposal is a collaboration document; the PO change is SAP's

A supplier who cannot meet the PO can only under-confirm (`t_po_confirm` with `confirmedQuantities`); RFP Functional #4 asks for *supplier accept/modify* (R3 §2.1, §3).

```
purchaseOrder (existing flow) — one verb pair added, both statePreserving
  t_po_change_request   Sent | Viewed | Acknowledged | Confirmed → (same)   user   atom po:change-request (supplier · fulfilment)
        fields: lines[] { lineNo, proposedQty?, proposedDate?, rootCause: { level1, level2?, note? } }
        hooks:  PO_CHANGE_HAS_ONE_PROPOSAL (at least one line proposes something) · PO_CHANGE_ROOT_CAUSE_PRESENT
        target: appends to PurchaseOrder.changeRequests[] { id, lines, requestedAt: clock, status: 'Open' }
  t_po_change_decide    (same states) → (same)                              user   atom po:change-decide (buyer · procurement)
        fields: changeRequestId · decision: 'accepted' | 'declined' · reason
        hooks:  PO_CHANGE_IS_OPEN · PO_CHANGE_REASON_AUTHORED · PO_CHANGE_DECIDER_ATTRIBUTED (the same shape as PR approval; admits a sample person)
        target: closes the request with the decision; an ACCEPTED request renders "awaiting S/4HANA change" until the F2 feed moves the PO (an external fact on the existing PO events)
```

The PO's own state never moves by a portal act — the ruling holds. The supplier's `SupplierOrders` gains *Request a change* beside *Confirm*; the buyer's `BuyerOrders` gains a change-request queue. The root cause reuses `RootCause` (Design 2 §7's L2 taxonomy applies).

### 3.5 The ASN ends — `Delivered` is closed by the receipt that posts

`advanceShipNotice` declares `terminals: []` and its comment says truthfully that every non-Draft state has an exit; the consequence is that a delivered, received, posted shipment is by declaration never finished (R3 §2.3).

| Change | Shape |
|---|---|
| `Closed` (new terminal) | `t_asn_close`: `Delivered → Closed`, `trigger: 'cascade'`, atom `asn:carry` (automation), fired by a new `CascadeLink` on `t_gr_post` (the receipt posting is what ends the notice). `Discrepancy → Delivered` stays the resolution path, so a disputed notice closes only after resolution and posting. |
| Validator | A declared terminal must have no exit; `Closed` has none. `terminals: ['Closed']` and the comment above it becomes a derivation, not a narrative. |

### 3.6 Quality hold and return — the hold gets its door, the return gets its notice

`t_gr_hold` is wired and has no caller; `t_gr_request_retest` (its exit) is surfaced — a resume without a hold. Returns exist only on the substrate line flow (R3 §1.3, §3).

| Change | Shape |
|---|---|
| Hold entrance | `GRInspectionWizard` and `BuyerGoodsReceipt` offer **Place on hold** from `Under Inspection` with the required `holdReason`; the verb exists, the door does not. `surfaceable.test.ts`'s census row for `t_gr_hold` retires when the caller lands. |
| Return notice (portal-owned) | `t_gr_return_notice`: `Rejected \| Partially Approved → (same)`, statePreserving, `user`, atom `gr:disposition` (receiving), `fields: lines[] { lineNo, qty, returnReason: RootCause }`, target appends `GoodsReceipt.returnNotices[] { …, acknowledged?: { at, by } }`. |
| Supplier acknowledgement | `t_gr_return_acknowledge`: statePreserving, `user`, atom `gr:return-acknowledge` (supplier · fulfilment), `readScopeOwner` names the ASN's supplier; renders on `/supplier/shipments`. The SAP return delivery (movement 122) is the SE Team's F2 seam; the portal records what the supplier was told and what they answered. |
| `goodsReceiptLine` substrate | Unchanged; its `t_grline_return` stays the rollup's vocabulary. |

### 3.7 Invoice variance and dispute outcome — a variance gets a human exit besides "dispute", and a resolution says what it decided

`t_invoice_match` cascades only on a genuine `Matched` verdict; on a variance it no-ops and writes `matchStatus`, leaving the invoice in `Submitted` with `t_invoice_dispute` as its only human exit. A resolution returns the invoice to `Submitted` with no financial artefact and no word to the supplier (R3 §1.4, §3; `INVOICE-DISPUTE-REASON-UNSTORED-01`).

| Change | Shape |
|---|---|
| `t_invoice_accept_variance` (new) | `Submitted → Matched`, `user`, atom `invoice:approve` (finance), `fields: ['varianceReason']`, hooks `INVOICE_HAS_VARIANCE` (matchStatus is a variance kind) · `INVOICE_VARIANCE_REASON_AUTHORED` · `INVOICE_VARIANCE_ACTOR_ATTRIBUTED` (a tolerance override is a loosening: it needs a named actor and refuses a sample one by name — the two-lock rule). Finance accepts a within-judgement variance without opening a dispute. |
| Dispute outcome ledger | `t_invoice_dispute` stores its `disputeReason` (today discarded) and `t_invoice_resolve` requires `resolution: 'as-submitted' \| 'credit-note' \| 'debit-note' \| 'withdrawn'`, `resolutionReason`, `adjustmentAmount?` — appended to `Invoice.disputes[] { raised, resolved }` on the requirement-response ledger pattern. The supplier's `SupplierInvoices` renders the outcome. The FI credit or debit document is SAP's (F2); `t_invoice_remit`'s neighbour `t_invoice_credit_note` (external-fact, owner s4hana) is declared so the wait renders. |
| `invoiceMatch` substrate | Unchanged (its two exit-less states are the rollup's verdict vocabulary, censused). |

### 3.8 Payment — the wait is rendered, then the feed reads it

`t_invoice_remit` (bank) has no caller and no settle path; five fixtures rest in `Payment Released`. R3 did not measure whether the surface renders the wait.

| Change | Shape |
|---|---|
| Rendered wait | `nextActFor` already returns `external: ['bank']` for `Payment Released` because the exit is declared `external-fact:bank`; **the spec asserts it on `BuyerInvoices` and `SupplierInvoices`** (a row in `Payment Released` shows *awaiting bank remittance*). If either surface bypasses `nextActFor`, that is the defect the spec finds. |
| Feed | SAP FI payment status → `t_invoice_remit` — SE Team (SE handoff §262). `Remittance Received` stays the terminal. |

### 3.9 RFQ close — a person closes bidding; the deadline is a projection

`t_rfq_close` is declared `computed` (a deadline elapsing) and has no caller; law 0.5 forbids the clock as a trigger, so eight `Open` fixtures can only be awarded or cancelled (R3 §1.3).

| Change | Shape |
|---|---|
| Re-declared as a human act | `t_rfq_close`: `trigger: 'user'`, `surfaced: true`, atom `rfq:close` moves from the automation grant to `procurement`; `fields: []`; `BuyerSourcing` offers **Close bidding** on `Open`. `Closed` keeps `t_rfq_award` / `t_rfq_reopen` / `t_rfq_cancel`. |
| The deadline | Stays a read-time projection (*bidding closes in N days*, `DECLARED_PRESENT`-relative), rendered beside the button. A scheduler that fires the close when the deadline elapses is SE-scope and, if built, dispatches the same verb under the automation grant. |

---

## 4 · The portal objects the tree lacks — three that are OURS, and the rest ruled

### 4.1 Supplier standing (block / hold / offboard)

No state anywhere says a supplier may not be invited, listed or ordered from; the SE handoff promises a PO auto-block on expired certification and no block exists (R3 §3). The RFQ publish hook already asks `rosterStatusOf(supplierId)` and refuses named offenders — the consumer exists, the governed source does not.

```
supplierStanding   single state 'Governed' · statePreserving · append-only ledger (the t_enforcement_set shape)
  t_standing_set   creation → Governed   user   atom supplier:standing-set (compliance)
       fields: supplierId · standing: 'active' | 'on-hold' | 'blocked' | 'offboarded' · reason · reviewBy?
       hooks:  STANDING_SUPPLIER_KNOWN · STANDING_ACTUALLY_CHANGES · STANDING_REASON_AUTHORED · STANDING_ACTOR_ATTRIBUTED (blocking a supplier is a governance act; refuses a sample actor by name)
       target: appends { supplierId, standing, reason, setAt, setBy }; `rosterStatusOf` reads the LATEST entry
```

Consumers on day one: `rfq_publish_invitees_eligible` (exists), PSL's `psl_supplier_resolved`, the delivery release's chase, and the supplier's own dashboard (*your account is on hold — reason*). The SAP vendor block flag is the SE Team's write-back (RFP §8 master-data workflow); the portal's standing is the collaboration fact, and the application lane's `Approved` hands to that workflow rather than to nothing.

### 4.2 Quality notification (NCR)

A hold with no notification is not a process (R3 §3). Portal-owned, raised from the receipt, answered by the supplier:

```
qualityNotification   states: Raised · Acknowledged · Closed          initial Raised · terminals [Closed]
  t_qn_raise         creation → Raised        cascade from t_gr_reject / t_gr_partial_approve / t_gr_hold   atom qn:raise (automation)
                     payload from the GR: grNumber · asnReference · lines[] { lineNo, defect, qty } · holdReason | dispositionReason
  t_qn_acknowledge   Raised → Acknowledged     user   atom qn:acknowledge (supplier · fulfilment)   fields: rootCause { level1, level2?, note } · correctiveAction
  t_qn_close         Acknowledged → Closed     user   atom qn:close (receiving)   fields: closeReason
```

SAP QM is an optional later source (SE-scope); nothing here waits on it. The supplier sees it on `/supplier/shipments`; the buyer on `BuyerGoodsReceipt`. Root cause reuses `RootCause` and Design 2's taxonomy.

### 4.3 Dispute outcome ledger

Designed in §3.7; listed here because it is the third object the RFP's vocabulary needs (credit and debit notes as *outcomes the supplier reads*) and because it is the shape `INVOICE-DISPUTE-REASON-UNSTORED-01` asked for.

### 4.4 The `compliance` machine — retire it as a machine

Three states, no creation transition, two `system` verbs that map to no pipeline, no target, no caller — and beside it `supplierDocument` with five wired, dispatched verbs and `complianceProjection` rendering the cell (R3 §2.1, CLAUDE.md). Two vocabularies for one fact. **Recommendation:** delete `compliance.flow.ts` from the registry; the compliance cell is a **projection** of the supplier-document verdicts (`Valid` when a current document of the required type is verified; `Missing` otherwise; `Expiring/Expired` from the date, law 0.5). `/buyer/process-flows` stops advertising an inert lane; C1's counts change honestly; the `compliance#initial-integrity#Missing` census row retires. The alternative (wire it to a verification pipeline) builds a second write path for a fact the first one already writes — D2 below.

### 4.5 Ruled, not built here

| Process | Ruling | Why |
|---|---|---|
| Returns to vendor — the SAP movement | SAP (F2) | portal owns the notice (§3.6) |
| Credit / debit notes — the FI document | SAP (F2) | portal owns the outcome (§3.7) |
| Contract amendments, renewals, price changes | SAP | the contract feed carries them as facts; the obligation view is the portal's later act |
| Claims / penalties / chargebacks | later arc | needs a scorecard that is measured, not fixture |
| Consignment / VMI | SE-scope with SOMO | depends on the distributor model |
| Subcontracting, service entry sheets | SAP, out of RFP scope | — |
| Catalogue / punch-out | SE-scope | not in the functional scope |
| Reminder and chase scheduler | SE-scope | the record is Design 2 §5 |

---

## 5 · Instruments — the two rules as tests, and V15 as a gate

| Instrument | Population (derived, upstream of the code under test) | Assertion | Known-good / known-bad control |
|---|---|---|---|
| **Hand-off completeness (R-A)** | the chain table (§3) as a typed list of `(fromFlow, toFlow)` pairs | each pair resolves to a `CascadeLink`, a human verb naming the source id in `requiredFields`, or an `external-fact` creation with `owner` | `rfq → quotation` resolves (cascade); a mutant that deletes `t_asn_close` from `CASCADES` names `advanceShipNotice → closed` as broken |
| **No practical dead end (R-B)** | every non-terminal state of every flow in `WIRED_COMMAND_TARGETS` | at least one exit classified dispatched by the R3 script's classifier, or external with an owner that `nextActFor` returns for that state | `purchaseOrder Confirmed` passes as external s4hana; a mutant re-declaring `t_pr_convert` as `computed` makes `Approved` red by name |
| **Waits are rendered** | surfaces that list a flow's documents (derived: components calling the flow's list hook) | a row in an external-wait state renders the owner label from `nextActFor`, never a blank action slot | `BuyerInvoices` in `Payment Released` shows *bank*; a mutant that skips `nextActFor` on that surface is red |
| **V15 — no client-minted document identity** | source scan for construction of `PO-`, `GR-`, `INV-`, `CTR-`, `SA-` prefixed strings outside fixtures and tests | none | the deleted `CTR-${year}-${n}` site fires the gate when restored (the defect the tree really had — the probe input the repair produces) |
| **Census prose** | `looseEndCensus.ts` header | contains no cardinality word for its own row count | *"NINE"* restored is red |
| Mutation probes | every new hook removed in turn; restore by `sha256` with `git hash-object` beside it | a named test fires per hook | — |

Every batch: EN/ID, floor, browser QA in both seats and locales whose output reaches the strategist.

---

## 6 · Contract touches

- **C1** re-harvested after each catalog change (new flows `schedulingAgreement`, `supplierStanding`, `qualityNotification`; retired `compliance`; new verbs listed in §3); the pin test is what makes a stale C1 red.
- **C11 V15** gains its instrument (§5) and moves from `NOT ENFORCED` to `ENFORCED`.
- **C3** unchanged: new verbs emit the same `TransitionEvent`; no new field.
- **C12** (the backend seam map) gains the feeds this design names: contract inbound, scheduling-agreement inbound, PO change outbound and PO event inbound, return delivery outbound, FI remittance and credit/debit inbound, vendor block outbound — each with its idempotency key (the SAP document number).
- **C10** unchanged: every attributed hook here is `PR_APPROVAL_ATTRIBUTED`'s shape; the sample-actor lock is copied where a governance risk is accepted (variance, standing).

---

## 7 · Batch plan

### Ownership after the handover ruling (28 Sep 2026) — RULED

Handover to the SE Team is on **28 Oct 2026**. Our team builds only what defines the specification; the SE Team builds everything else from this design, after handover, at its own pace.

| Owner | Batches |
|---|---|
| **OURS** | **Only** the contract wizard's client-side numbering — **Week 4, batch E1**. ⚠️ **Measured after the ruling: the minting is already gone** (`f5338c2`, 2026-09-11; the wizard ends in `RaisedElsewherePanel`). **E1 therefore reduces to the part that is still missing: the C11 V15 instrument** (a source gate refusing client-side construction of `PO-`/`GR-`/`INV-`/`CTR-`/`SA-` numbers, probed with the deleted site as its known-bad input) and the correction of C11 V15's stale sentence and `CTR-FABRICATION-01`'s register row. Estimated 0.5 batch. If the operator wants E1 to stay at "retire the numbers", it is already done and there is nothing to build. |
| **SE TEAM (SE-17)** | Everything else in this design: B0 contract touches and declarations · B1 requisition close + honest waits · B2 receipt lane (ASN close, hold door, return notice, quality-notification machine) · B3 invoice variance + dispute outcome ledger · B4 RFQ close by a person + PO change request · B5 supplier standing ledger · B6's remainder (`contract` fed target, `schedulingAgreement` flow, `compliance` retirement) · B7 feeds · B8 quality-notification surfaces + scheduler · the R-A / R-B instruments · migration of in-flight documents if any state is renamed |

| # | Batch | Delivers | Closes | Size | Depends on |
|---|---|---|---|---|---|
| **B0** | Contract touches and declarations | C1 re-harvest; V15 instrument; `t_pr_convert` and `t_rfq_close` re-declared; ASN `Closed`; RR `initial: 'Draft'`; census header prose; C12 seam rows | R3 #5, #6 (part), F11-class prose | 1 | — |
| **B1** | Requisition after approval | `t_pr_close` + `Closed`; waits rendered on `BuyerRequisitions`; R-B instrument lands with this batch as its first consumer | R1 F12, R3 §1.4 rows 8 | 1 | B0 |
| **B2** | Receipt lane | hold door in the wizard and `BuyerGoodsReceipt`; `t_asn_close` cascade + resolver; `t_gr_return_notice` / `_acknowledge`; `qualityNotification` flow + target (surfaces SE) | R3 #6 `t_gr_hold`, §2.3 ASN, §3 RTV/NCR | 2 | B0 |
| **B3** | Invoice lane | `t_invoice_accept_variance`; dispute outcome ledger; `t_invoice_credit_note` declared; supplier renders outcomes; payment wait asserted | R3 §1.4 invoice rows, §3 credit/debit, `INVOICE-DISPUTE-REASON-UNSTORED-01` | 1.5 | B0 |
| **B4** | Sourcing and order lane | **Close bidding**; `t_po_change_request` / `_decide` with queues on both seats | R3 #6 `t_rfq_close`, §3 PO change | 1.5 | B0 |
| **B5** | Supplier standing | ledger, verb, settings surface (one page for the four governed ledgers + this one: enforcement mode, PSL cap, drawdown policy, standing), consumers repointed to the ledger | R3 §3 block/offboard; `t_enforcement_set` / `t_psl_cap_set` no door | 1.5 | B0 |
| **B6** | Contract and compliance lanes | `contract` target for the feed + `BuyerContracts` wizard retired; `schedulingAgreement` flow + target + generator call; `compliance` retired as a machine (D2) | R3 #1, #2; `CTR-FABRICATION-01`; census rows | 1.5 | B0, D2 |
| **B7** *(SE)* | Feeds | the C12 rows, each firing the declared external-fact verb with the SAP number as idempotency key | every rendered wait becomes a fact | — | F2 |
| **B8** *(SE)* | Quality notification surfaces + scheduler | both seats' NCR views; RFQ close and reminder jobs under the automation grant | R3 §3 NCR; Design 2 §5 | — | B2, B4 |

Order for our side: B0 → B1 → B3 → B2 → B4 → B5 → B6. B6 last because it retires a lane the process-flows page advertises, and the page's honesty copy should land with the retirement, not before.

---

## 8 · Decisions the operator must make (recommendation first)

> ⚠️ **RULED — OPERATOR, 28 SEPTEMBER 2026. `E1` IS THE C11 V15 GATE PLUS THE C11 SENTENCE
> CORRECTION. THE NUMBERING WAS ALREADY RETIRED AT `f5338c2`.**
> This settles the question D7 left open (*"the operator should confirm E1 means that"*): it does.
> **E1 delivers two things and nothing else** —
> 1. **The V15 instrument**: a source gate refusing client-side construction of a governed
>    document identity (`PO-` / `GR-` / `INV-` / `CTR-` / `SA-`) outside fixtures and tests, probed
>    with the deleted `CTR-${year}-${n}` site as its known-bad input — the defect the tree really
>    carried, which is what `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01` asks of a new instrument, and it
>    is cheapest to capture now rather than after it survives only as prose.
> 2. **The C11 V15 sentence correction.** `docs/contracts/C11-invariants.md` still reads *"the tree
>    currently CONTRADICTS this row in one place — `BuyerContracts.tsx` mints `CTR-${year}-${n}`"*
>    and carries V15 as `NOT ENFORCED`. Re-measured against `main` @ `de101c67`: **no live mint
>    remains** — every `CTR-` hit in `src/` outside fixtures and tests is a COMMENT naming the
>    retired defect (`BuyerContracts.tsx:420,603`, `lib/i18n/contracts.ts:140,168`,
>    `contractDraftOwner.ts:9`, `contract.flow.ts:17`, `requisitionPrefill.ts:84`), and the
>    bilateral control is clean too: the same matcher widened to `PO-` / `GR-` / `INV-` / `SA-`
>    template construction returns nothing outside fixtures and mocks. With the gate landed, V15
>    moves from `NOT ENFORCED` to `GATE` with its enforcer and `it(...)` title named, and
>    `CTR-FABRICATION-01`'s register row is corrected.
>
> **What E1 is NOT:** it is not the retirement of the minting (done, `f5338c2`, 2026-09-11) and it
> is not any other row of this design. **Everything else here remains the SE Team's (SE-17)**, per
> D8 and §7. Size unchanged at 0.5 batch.
>
> Design 5's D1–D8 were ruled in the same sitting, all eight as recommended; recorded at
> `DESIGN_5_MODULE_ACTIVATION_AND_GUIDES.md` §D.


| # | Decision | Recommendation |
|---|---|---|
| D1 | **`t_pr_convert`:** re-declare as an S/4 external fact (wait rendered) or keep `computed` | External fact; it is SAP's act and the wait is the truth. |
| D2 | **`compliance` machine:** retire as a machine and keep the projection, or wire a verification pipeline | **RULED (operator, 28 Sep 2026): retire the inert compliance machine; supplier documents are the one compliance process.** Built by the SE Team (SE-17). |
| D3 | **`t_rfq_close`:** a person closes bidding (recommended), a job does, or the state goes | A person, with the deadline as a projection; a job may fire the same verb later. |
| D4 | **`t_gr_hold`:** build the door or retire the state | Build the door; the resume exit already exists and the QN cascade needs the hold. |
| D5 | **PO change request:** build the collaboration document now, or wait for the F2 PO-change seam | Build now; the request is ours regardless of when SAP answers. |
| D6 | **Quality notification:** declare the machine before handover (ours) with surfaces after (SE), or leave the whole object to the SE Team | Declare it; a declared machine is a specification, and the cascade from the receipt is where its truth comes from. |
| D7 | **`BuyerContracts` wizard:** retire to an honest notice now (deleting the minted number) or wait for the feed | **RULED (operator, 28 Sep 2026): retire the contract wizard's invented numbers now.** Ours, Week 4, batch E1. ⚠️ **Measured after the ruling: already retired at `f5338c2` (2026-09-11).** **RULED 28 Sep 2026: E1 IS the V15 gate plus the stale C11 text (§3.2 correction, §7) — confirmed, and nothing more.** |
| D8 | **Ownership split (§7)** | **RULED:** only D7's lane is ours, as **E1 = the V15 gate + the C11 correction** (28 Sep 2026); everything else is SE-17. |
| D9 | **Which §4.5 rows enter an arc after handover** | None before handover; the SE Team sequences claims, consignment and catalogue from the RFP's wave plan. |

---

## 9 · Traceability

| R3 item | Where it closes |
|---|---|
| #1 27 transitions on 6 target-less flows | §3.2, §3.3, §4.4; B6 (contract fed, agreement declared, compliance retired; `goodsReceiptLine`, `invoiceMatch`, `shipment` stay substrate or TMS by design) |
| #2 sourcing → contract → agreement is nothing | §3.2, §3.3; B6, B7 |
| #4 payment one-way door | §3.8; B3, B7 |
| #5 census header "NINE" | §5; B0 |
| #6 five wired verbs no surface fires | `t_gr_hold` §3.6 B2 · `t_rfq_close` §3.9 B4 · `t_pr_convert` §3.1 B0 · `t_po_view` read-side stamp (B4, one line) · `t_psl_cap_set` / `t_enforcement_set` settings surface B5 |
| #8 missing processes | §4 (standing, NCR, dispute outcome built; the rest ruled) |
| §1.4 practical dead ends | §3.1, §3.5, §3.7, §3.8, §3.9; the R-B instrument |
| §2.3 stranding | R-B; every row named |
| §6 decisions 1, 2, 4, 5, 7 | D4, D3, D2, D9, B0 |
| §6 decision 6 (promotion), Q4 | the Flow Builder is in scope for the SE Team and is designed in Design 6, after Design 5; nothing here changes the promotion path's premises |

RFP: Functional #4 (supplier accept/modify — §3.4), #5 (payment visibility — §3.8), #7 (control tower exceptions — §4.2), §8 master-data workflow (§4.1 hands to it), Appendix-2 #3 (root cause on the call-off and now on returns and notifications).

*Source file: `C:\Users\<operator>\review-drafts\DESIGN_3_STATE_MACHINE.md` (2026-09-28).*
