# DESIGN 2 · Supplier Collaboration — the write paths the RFP's #1 pain is missing

**Seat 3, consultant, Ops Project #11 · 2026-09-28 · DRAFT FOR OPERATOR RULING · READ-ONLY session (nothing written in the repo).**
**Pinned tree:** `main` @ `81c98403a83a674df80959f7d2290898ddd822fa`, read from the reviewer's `git archive` export. Every file:line is against that tree.
**What this document is:** the second of the two drafts the operator's 2026-09-28 rulings apply to. It designs the acts `R2_SUPPLIER_COLLABORATION.md` measured as absent — publish, bulk-confirm, revise, ask, acknowledge a call-off — on the lane that is otherwise the best-built in the portal, and it shares its grid, its column registry and its per-user layouts with `DESIGN_1_PLANNING_GRID.md`. It builds on R0, R2 and `_q2_sdc.md`, read first as ruled.
**Standing rulings applied:** roles, never names; SOMO computes demand and ROP; SAP owns documents and numbers; the call-off is the SAP release; every data input gets mass upload and a template (2026-09-10); the supplier list is loaded by the SE Team with the procurement team and is a **read** here; the SE Team lead is the **Lead Engineer**.

---

## 0 · The one-page version

1. **Keep what round-trips.** The review loop (`review → accept | dispute → resolve`) and the supplier's three objects (confirmation, stock on hand with batches and XLSX pre-fill, incoming shipments) are BUILT-E2E through one store and both seats read them back (R2 §2–§3). Nothing here rewrites them; everything here attaches to them.
2. **Build the publication.** A `forecastPublication` machine (`Draft → Published → Superseded | Withdrawn`), a store, a `CommandTarget`, `getPublications(scope)` on `ICollaborationService`, and the planner's **Publish from the grid** — allocation cells on Design 1's supplier rows are the draft; publishing snapshots them. The supplier hook stops importing a fixture. FLAG-2 stays structural: a SIMULATED publication is never supplier-visible except under the sample banner the supplier already sees.
3. **Confirm in bulk, on the same grid.** The supplier's view of the same component — own lines only, editable `confirmedQty`, `committedDate`, root cause — dispatches one `t_requirementresponse_submit` per row and one **Submit all drafts** that promotes them under one `SubmissionSession`. A **template** per creation verb (derived from `requiredFields`, OD-3) and the existing workbook parser make the Excel round-trip real for confirmations and shipments, not only stock batches.
4. **Close the two versioning holes** that were measured: a supplier **revises** from `Disputed` and from `Accepted` through a verb that links versions and retires the old one to `Superseded`; the consolidation gains `revised-after-accept`; version numbers and the "latest" pick stop depending on insertion order.
5. **Make the ask an act.** `t_chase_ask` appends the `OutboundRequestRecord` C3 already models ("composed — not sent"); the chase card gets a button; the supplier's page gets an inbound list and a **deadline**. Transport and the scheduler stay SE-scope, said plainly on the surface as today.
6. **Give the supplier a verb on the call-off:** `t_delivery_acknowledge` — quantity, date, root cause — distinct from the buyer's drawdown `confirm`, on the `fulfilment` lane, read by the chase on day one. Whether it posts back to SAP is the triple-point ruling; the portal-side record is buildable regardless and is the RFP's Appendix-2 #4.
7. **Nine batches**, ordered so the publication lands first (everything else hangs off `publishedAt`) and the grid-dependent pieces follow Design 1's B4/B5.

---

## 1 · What is kept, verbatim

| Built and kept | Where |
|---|---|
| `t_requirementresponse_submit` (creation → Draft) · `_promote` (→ Submitted) · `_acknowledge` (visibility-only) | `requirementResponse.flow.ts`; `sdcSupplierHooks.ts:159/189/224` |
| `t_requirementresponse_review` · `_accept` · `_dispute` (reason required, ledger) · `_resolve` (reason required, second ledger entry) | same flow; `sdcBuyerHooks.ts`; `BuyerCollaboration.tsx` |
| `t_inventorydeclaration_declare` (total-first, Σ batches = total, XLSX pre-fill, magic-link grid) · `_record` (buyer, from chat triage) | `SupplierForecasts.tsx`, `BulkStockEntryGrid.tsx`, `BuyerChannelTriage.tsx` |
| `t_incomingshipment_report` · `_ship` · `_arrive` · `_cancel` (ETA is a field, AWB is a TMS link) | `incomingShipment.flow.ts`; `SupplierForecasts.tsx:800-816` |
| `t_delivery_release` · `_adjust` · `_confirm` · `t_delivery_policy_set` (buyer) | `deliveryRelease.flow.ts`; `BuyerContractDetail.tsx:77-80` |
| The consolidation derivation (`awaiting · acknowledged · confirmed-full · short · stale-against-current`), rollups, chase list, coverage indicator (Σ, MODELED) | `consolidation.ts` |
| `SubmissionSession` envelope with the causation anchor; `ingest.ts` (grid/Excel rows → dispatch units); `parseWorkbook.ts`; the mapping panel | `session.ts`, `ingest.ts`, `parseWorkbook.ts`, `XlsxImportPanel.tsx` |
| The dispute LEDGER (raise stays, resolution lands beside it) | `types.ts` `DisputeEntry` |

Every new verb below follows the tree's idiom exactly: `FlowDefinition` with `requiredRole` atom, `requiredFields` for presence and a policy hook for agreement, `statePreserving` where the state does not move, store-minted stamps from `sdcClock`, no actor in the payload (`ACTOR_IN_PAYLOAD` refuses it), `readScopeOwner` naming the supplier where a supplier may act.

---

## 2 · The publication — the write path at the source

### 2.1 The machine

```
forecastPublication   (entityId = publicationId, store-minted 'PUB-<grain>-<planVersion>-r<n>')
  states: Draft · Published · Superseded · Withdrawn        initial Draft · terminals [Superseded, Withdrawn]

  t_publication_open        creation → Draft      user   atom publication:draft   (planning)
        fields: planVersion · grain · horizon[] · sourceRef (SOMO emission id or the generated fixture id)
        hooks:  PUB_HORIZON_ONE_GRAIN (parseBucket over horizon) · PUB_PLANVERSION_KNOWN (the SOMO plan version exists in the feed)
        target: copies MaterialPeriodTotal rows for the horizon into draft lines with allocation EMPTY (no supplier)

  t_publication_allocate    Draft → Draft  (statePreserving)   user   atom publication:allocate (planning)
        fields: materialCode · periodBucket · supplierId · forecastQty · forecastQtyRaw · basis
        hooks:  SDC_MATERIAL_KNOWN · PUB_LINE_IN_HORIZON · PUB_SUPPLIER_COLLABORATED (relationship exists or ruling-admitted new pairing)
                PUB_QTY_FLOOR (≥ 0) · PUB_QTY_AGREES (raw ↔ number) · PUB_ALLOC_WITHIN_TOTAL (Σ suppliers ≤ materialPeriodTotal — integrity #4)
        target: upsert the supplier line under the material×bucket total; uom from the master (invariant #2)

  t_publication_approve_firm  Draft → Draft (statePreserving)  user  atom publication:approve (procurement, NOT planning — segregation)
        fields: materialCode · periodBucket
        hooks:  PUB_LINE_IS_FIRM · PUB_ACTOR_ATTRIBUTED (a RESOLVED actor; a sample person is admitted, the (SAMPLE) marker rides the label)
        target: stamps Allocation.approvedBy (ActorAttribution from scope) + approvedAt (sdcClock)

  t_publication_publish     Draft → Published    user   atom publication:publish (planning)
        fields: []
        hooks:  PUB_HAS_LINES · PUB_FIRM_LINES_APPROVED (every firm-bucket allocation carries approvedBy — the invariant #3 the type already states)
                PUB_CLASS_PROJECTION_PRESENT (each line has a class; the projection rule itself is C8 §2.2, UNRATIFIED — see D7 in Design 1)
        target: stamps publishedAt (sdcClock) · responseDueAt = publishedAt + responseDueDays (a GOVERNED setting, §5.3) · liveness from the producer's tier
        cascade: t_publication_supersede on the previously Published publication of the same grain (system trigger)

  t_publication_supersede   Published → Superseded   cascade   atom automation
  t_publication_withdraw    Published → Withdrawn    user   atom publication:publish   fields ['reason']   hook PUB_TEXT_AUTHORED
```

**Why `approve_firm` sits in `procurement` and not `planning`:** a firm class is *"the field on which a supplier builds stock and on which dead-stock liability disputes are decided"* (C8 §2.2). The planner splits; somebody else signs the split. Two lanes make narrowing possible; the default seat still holds both (the `SEGREGATION-CROSSED-IN-ONE-DRAWER-01` shape), which is recorded rather than pretended away. The approval stamp is an `ActorAttribution` written by the target from `scope.actor`, never a payload field; today it resolves only when the seat has adopted a sample person, which is exactly the opt-in the roster exists for.

**Revision = a new publication**, not an edit: the planner opens the next draft from the current SOMO plan version, the previous allocations pre-fill (basis `carried-forward`), and publishing supersedes. Responses bind `publicationId + planVersion` already, so `carriedForward` / `stale-against-current` keep working with no change to the response machine. **Net-change (C8 GG-7):** the supplier's grid marks lines whose `forecastQty` and class are unchanged from the superseded publication as *carried — no re-confirmation needed*, and their prior confirmation carries forward as the answer (derived at read: latest submitted against the superseded line, quantity equal, class equal). Full re-confirmation of an unchanged 200-line forecast every cycle is the adoption killer C8 names; this is the derivation that avoids it.

### 2.2 The store and the seam

- `forecastPublicationStore` (seeded from `FORECAST_PUBLICATIONS`, immutable append/replace, `reset()` for tests) replaces the frozen module constant as the source both seats read.
- `ICollaborationService.getPublications(scope)`: buyer scope → all; supplier scope → **`supplierVisiblePublications`** (LIVE only, FLAG-2), then the supplier's own lines only. The SIMULATED fallback the supplier page renders under its banner stays a *page* choice, read through the same service call with an explicit `includeSimulatedSample: true` that the banner and the copy are keyed to — the type comment overstates today (R2 §7, last row); after this batch the structure matches the comment.
- `useOwnForecastLines` reads the service; the fixture import goes.
- `MockCommandService` registers the target; `WIRED_COMMAND_TARGETS` gains `forecastPublication`, and the `getKnownFlows() ∖ WIRED_COMMAND_TARGETS` set shrinks by one without anyone editing prose.

### 2.3 The planner's surface — Publish from the grid

On Design 1's `rm-plan` / `pm-plan` views: the `allocation` measure on supplier rows edits the current **Draft** publication (§5.3 there). A publication panel (plain DOM beside the grid, the C6-LOCK precedent for a governed act) shows: plan version, grain, horizon, lines allocated / unallocated, firm lines awaiting approval (with the `HandoffNotice` naming `procurement` when the seat lacks the atom), response deadline, and the **Publish** button — disabled with the stated reason until the hooks would pass, never a toast after a refusal. A publication's history (published, superseded, withdrawn, by which role, when) renders as a ledger under the panel and on `/buyer/collaboration`.

### 2.4 What changes for the supplier

Nothing is asked of them that was not asked before, and three things they never had: a **deadline** (`responseDueAt`, rendered on every line and in the tab header), a **version banner** ("Plan PV-2026-09.1 published 3 Sep — 14 of 20 lines changed; 6 carried"), and a **receipt** — the buyer's accept renders as a dated line in "My responses", not only as a status chip.

---

## 3 · Bulk confirmation — the supplier's grid, template and import

### 3.1 The view

The same grid component and column registry as Design 1, in a `supplier-confirm` view over `getPublications(scope)` × own responses:

| Column / measure | Source | Editable → verb | Notes |
|---|---|---|---|
| `materialCode`, `materialLabel`, `uom` | master | no | pinned left |
| `periodBucket` (flat rows: one row per line — the supplier answers lines, not a time series) | publication | no | |
| `commitmentClass` | publication | no | chip; visibility-only rows offer **Acknowledge** instead of a quantity |
| `forecastQty` | publication | no | the ask |
| `changedSincePrevious` | derived | no | pill: *new · changed · carried* (net-change, §2.1) |
| `confirmedQty` | supplier | **yes → `t_requirementresponse_submit`** (creation, lands Draft) | `confirmedQtyRaw` travels with it; `0` is legal (ruling F-2) |
| `committedDate` | supplier | yes (same payload) | optional |
| `capacityConstraint` | supplier | yes (same payload) | free text (RFP F3 structured capacity is D9 below) |
| `rootCause.level1` | supplier | yes (same payload) | set filter from the L1 codes; **required when short** (hook exists) |
| `rootCause.level2` | supplier | yes (same payload) | set from the L2 taxonomy under the chosen L1 — **the taxonomy is an operator input (D3)**; until ruled the column is hidden and `note` carries the text |
| `rootCause.note` | supplier | yes | |
| `responseStatus` | derived | no | Draft · Submitted · UnderReview · Accepted · Disputed · Superseded — through `statusLabelKey`, closing SDC-R11 |
| `dueAt` | publication | no | with an overdue pill derived at read |

**Row → command:** each edited row is one `t_requirementresponse_submit` (Draft) through `ingest.ts`'s IMPORT (1:1) grain — the mode its header names as *"intentionally not wired"*; this wires it — under one `SubmissionSession`; per-row partial success is the envelope's contract. **Submit all drafts** dispatches `t_requirementresponse_promote` per Draft under the same anchor. The Draft-first ruling (PF-1b, *"a commitment gets reviewed before it is sent"*) is kept: the grid shows N drafts, the supplier reviews, then promotes in one act. A draft row a supplier abandons is theirs alone — the buyer's consolidation skips `Draft` and the `draftInProgress` disclosure stays deleted.

### 3.2 Templates — derived from the verb, per OD-3

`templateFor(transitionId, scope)` generates the workbook shape from the creation verb's `requiredFields` minus the fields the context supplies (`supplierId`, `publicationId`, `planVersion`, `uom` — never a cell), plus the locked identity columns (`materialCode`, `periodBucket`, `forecastQty`, class) pre-filled with the supplier's own lines and protected. One template per surface: **forecast confirmation**, **incoming shipment**, **stock on hand** (the existing one, re-expressed through the same generator so there is one place a template comes from). Download is a real file (the export primitive Design 1 §7 introduces), named `<supplier>-<publicationId>-confirmation.xlsx`, in the seat's locale.

**Import** reuses `parseWorkbook` (file tier) → the mapping panel (the supplier sees and confirms header → field, never a silent guess) → `ingest.ts` IMPORT grain → the grid as PLANNED rows with the EXTERNAL marker → the supplier reviews → **Submit**. A row the adapter cannot build is shown with its `ParseReason` and dispatches nothing (honest silence). Snapshot-binding keys ride `context`, so a template edited to point at another line is refused by `RR_SUBMIT_PLANVERSION_BOUND`, not honoured.

### 3.3 Incoming shipments, the same way

A `supplier-shipments` view with editable `qty`, `etd`, `eta`, `awb`, `direction`, `asnRef` per new row → `t_incomingshipment_report`; ETA revisions on Booked/Shipped rows → the audited field update the shipment design already specifies (no `ETARevised` state). Template and import as §3.2. `principal-to-distributor` stays legal only for a distributor (`ISH_P2D_DISTRIBUTOR_ONLY`, from the supplier-material relationship — a master read, §8).

---

## 4 · Versioning integrity — the two measured holes and the ordering defect

### 4.1 `t_requirementresponse_revise` — the supplier's exit that does not exist

Probe A (R2 §8): a re-submission over a `Disputed` response leaves the dispute unanswered and invisible. Probe B: a re-submission over an `Accepted` one cuts a commitment with no trace. Both because the supplier has **no exit from any post-submit state** and the only move is a fresh creation.

```
t_requirementresponse_revise   from [Disputed, Accepted] → Draft     user   atom requirementresponse:submit (commercial)
     fields: confirmedQty · confirmedQtyRaw    (the same floor + agreement hooks as submit; committedDate / rootCause optional as before)
     hooks:  SDC_MATERIAL_KNOWN · RR_SUBMIT_QTY_FLOOR · RR_SUBMIT_QTY_AGREES · RR_REVISE_ROOT_CAUSE_WHEN_CUT (revising an Accepted qty downward requires a root cause)
     target: mints the NEXT version of the SAME response key with `supersedes: <priorId>`; the prior response moves to a new state `Superseded`
             via cascade t_requirementresponse_supersede (automation); when the prior was Disputed, the ledger receives a store-minted entry
             { kind: 'superseded-by-revision', text: '', at } so "answered by revising" is distinguishable from "resolved by the buyer" and from "never answered"
```

Consequences the consolidation reads: the disputed row is no longer orphaned (the dispute's answer is the revision, and the buyer's queue shows *"revised in answer to your dispute — review v2"*); an accepted commitment cut downward derives `revised-after-accept` (latest Submitted has an Accepted sibling of lower version with a higher quantity), chased **hard** (SDC-R5). `Accepted` stops being terminal in the registry; `Superseded` is the new terminal. The `initial: 'Submitted'` false statement (SDC-R13) is corrected to `Draft` in the same edit.

**And `t_requirementresponse_submit` refuses a second creation while a non-superseded sibling exists** (`RR_SUBMIT_NO_OPEN_SIBLING`) — so the accidental path that produced Probes A and B is closed by the verb, not by the surface remembering.

### 4.2 Version numbers and the latest pick

- `submissionVersion` is minted over the response key `(supplierId, materialCode, periodBucket)` across publications, not per publication — the first answer to a re-published plan is v2, not a second v1.
- `latestSubmittedByLine` orders by `(publishedAt of publicationId, submissionVersion, submittedAt)` and a spec pins the tie Probe A produced (two rows on one line) to the deterministic winner. Insertion order is no longer load-bearing.

---

## 5 · The ask — chase becomes an act

### 5.1 The verb

C3's `outboundRequestStore` is *"deliberately NOT a transition machine … a command wrapper can front it later (C4)"*. This is that later, on the tree's degenerate-machine pattern (`t_enforcement_set`, `t_role_grant`, `t_delivery_policy_set`):

```
outboundRequest   single state 'Recorded' · statePreserving · append-only ledger
  t_chase_ask     creation → Recorded    user   atom chase:ask (planning)
       fields: supplierId · subjectRefs[] · channel · templateId
       hooks:  CHASE_SUPPLIER_KNOWN · CHASE_SUBJECTS_LIVE (each subject is a live chase reason for that supplier — derived from the unified chase, so a planner cannot record an ask about nothing)
       target: appends OutboundRequestRecord { id, supplierId, subjectRefs, channel, sentAt: sdcClock.now(), correlationAnchor: null }
```

The record's own honesty holds: it is **composed, not sent**. The surface copy says so, as `/buyer/chase` does today, and `OutboundStatus` (`composed · awaiting · stale`) is derived at read from asks vs replies — no new stored status.

### 5.2 Surfaces

- **Chase card** (`/buyer/collaboration`, `/buyer/chase`): a per-supplier **Ask** button (with `HandoffNotice` for a seat without `chase:ask`) opening a composer pre-filled from the template for the worst live reason; on record the card shows *asked <date> · awaiting reply*; a supplier who has been asked and has not replied since derives `stale` and rises in the list.
- **Comm hub**: the ask appears in the outbound queue with its status; the hub's dead controls stay dead-honest until transport exists (SE-scope).
- **Supplier inbound** (`/supplier/forecasts`, a new *Requests* strip above the tabs): the asks addressed to this supplier, newest first, each linking to the lines it is about. This is what the RFP's #6 "reminder" looks like before a transport exists: the supplier who opens the portal sees what they were asked.

### 5.3 Deadline and cadence as governed settings, not constants

`RESPONSE_DUE_DAYS = 7` and `ANTICIPATION_DAYS = 7` become entries on the enforcement-settings ledger pattern (`t_enforcement_set`'s shape: single state, append-only, reason, `setBy` from scope): `collaboration.responseDueDays` (per grain), `collaboration.reminderAfterDays`. The publication stamps `responseDueAt` from the setting **at publish** (a stored deadline is a fact about the publication, not a clock-projected state; *overdue* is derived at read — law 0.5 intact). The scheduler that fires "N days after" is SE-scope (`RFP-NOTIFICATION-ENGINE`); the setting is what it will read.

---

## 6 · The call-off — a supplier verb on the released line

```
t_delivery_acknowledge   Released → Released (statePreserving)   user   atom delivery:acknowledge (supplier · fulfilment)
     fields: ackQty · ackQtyRaw · ackDate
     hooks:  DELIVERY_ACK_QTY_FLOOR (≥ 0) · DELIVERY_ACK_QTY_AGREES · DELIVERY_ACK_ROOT_CAUSE_WHEN_DEVIATING (ackQty < plannedQty or ackDate after releaseDate ⇒ rootCause.level1 required)
     target: appends to ScheduleLine.supplierAcknowledgements[] { ackQty, ackDate, rootCause?, at: sdcClock } — a ledger, never a scalar overwrite; readScopeOwner names the agreement's supplierId
```

Distinct from `t_delivery_confirm`, which is the **buyer** accepting an inferred drawdown and must stay `procurement`'s (its own header argues the point). The chase's `deriveDeliveryChase` already computes *unconfirmed call-off*; it reads the acknowledgement on day one. `/supplier/delivery-agreements` stops saying *read-only* and offers **Acknowledge** on each released line; `/buyer/delivery-agreements` shows the acknowledged quantity and date beside the release. Appendix-2 #4's supplier half and #3's call-off half close together, and D10 A2.4's false claim becomes true.

**The triple-point question (D6 below):** the operator ruled the call-off is the SAP release. The acknowledgement is the *collaboration document* the matrix says is ours; whether it posts back to the scheduling agreement is F2's seam. The portal records it either way, and the record is what the post-back would carry.

---

## 7 · Root cause, decline, capacity — the smaller shapes

- **L2 taxonomy (SDC-R12):** the type carries `level2`; nothing writes it. The design proposes a starter taxonomy per L1 as an *operator input* and keeps the column hidden until ruled (D3). Under `capacity`: `machine-down · maintenance · labour · holiday`; under `material`: `principal-late · raw-shortage · quality-hold`; under `logistics`: `vessel-delay · customs · carrier`; under `commercial`: `moq · price · credit`; under `other`: free text required. A closed union, registered in the glossary like every other vocabulary.
- **Decline (SDC-R15):** no new state. A submitted `confirmedQty: 0` with a root cause derives the label **Declined** in both seats' vocabulary; the machine is unchanged and the RFP's words appear where the supplier reads them.
- **Capacity / MOQ / lead time (RFP F3, `CapacityProfile` with no writer):** a `t_capacity_declare` on the `fulfilment` lane, one row per supplier×material, `moq · leadTimeDays · capacityCalendar[]` by bucket, template and import like §3 — **batch B9, gated on the operator confirming F3 is in the first release** (D9). Not designed further here.
- **Supplier lanes (SDC-R8):** the split (`commercial` confirms, `fulfilment` declares and ships and acknowledges, `back_office` acknowledges visibility lines) stands unless the operator rules a supplier is one seat. The surface fix regardless: one notice per **verb in its own slot** (`ENTRANCE-IS-THE-UNIT-01`), never three banners.

---

## 8 · The supplier master — what this design reads and never writes

Read only: `supplierId`, `name`, `supplierType` and `principals` per material (`SupplierMaterialRelationship`), preferred channel, the seat's lanes. `PUB_SUPPLIER_COLLABORATED` admits an allocation to a supplier×material pair that has a relationship row or has been fanned before (`ownCollaboratedMaterials`'s (i)∪(ii) rule, mirrored at the verb); a **new pairing** is a master-data change, raised through the material-request lane or loaded by the SE Team — the grid refuses it by name rather than minting a relationship. The 9-of-12 empty-dropdown state the smoke memory records is the master being thin, not the rule being wrong; the loaded list closes it.

---

## 9 · Batch plan

### Ownership after the handover ruling (28 Sep 2026)

Handover to the SE Team is on **28 Oct 2026**. Our team builds only what defines the specification; the SE Team builds everything else from this design, after handover, at its own pace.

| Owner | Batches |
|---|---|
| **OURS** | B1 publication machine · B2 publish from the grid (core) · B3 versioning integrity · B4 chase as an act (verb, record, card button, supplier inbound strip) · B5 supplier call-off acknowledgement |
| **SE TEAM** | B6 bulk confirmation grid and templates · B7 shipments grid · B8 consolidation on the grid · B9 capacity profile · the messaging transport and the scheduler |

| # | Batch | Delivers | Closes | Size | Depends on |
|---|---|---|---|---|---|
| **B1** | Publication machine + store + target + `getPublications` | §2.1–§2.2; supplier hook through the service; FLAG-2 structural; `WIRED_COMMAND_TARGETS` grows by one | SDC-R1 (write half), R7 | 1.5 | Design 1 B0 (bucket vocabulary) |
| **B2** | Publish from the grid + supplier deadline/version banner | §2.3–§2.4; `approve_firm` in `procurement`; responseDueAt from a governed setting | SDC-R1, R14 | 2 | B1, Design 1 B5 |
| **B3** | Versioning integrity | `t_requirementresponse_revise` + `Superseded`; `RR_SUBMIT_NO_OPEN_SIBLING`; `revised-after-accept`; ordered latest pick; `initial: 'Draft'` | SDC-R4, R5, R6, R13 | 1 | — |
| **B4** | Chase as an act | `t_chase_ask`, chase card button, comm-hub queue, supplier inbound strip; settings ledger for due/reminder days | SDC-R2 (record half); the 2026-09-10 "reminder" wording | 2 | B1 (deadline) |
| **B5** | Supplier call-off acknowledgement | §6 verb, both surfaces, chase reads it | SDC-R3; Appendix-2 #4, #3 (call-off half) | 1.5 | ruling D6 for the post-back only |
| **B6** | Bulk confirmation grid + template + import | §3.1–§3.2; `ingest.ts` IMPORT grain wired; `templateFor`; `statusLabelKey` on the status pill | SDC-R9, R11; 2026-09-10 ruling for confirmations | 2 | Design 1 B4–B5 |
| **B7** | Shipments grid + template | §3.3 | 2026-09-10 ruling for shipments | 1 | B6 |
| **B8** | Consolidation on the shared grid + Declined vocabulary + L2 column | `consolidation` view (Design 1 §4.3), exception-first, sort/filter/group; Declined label; L2 once ruled | SDC-R10, R12, R15 | 1 | Design 1 B4 |
| **B9** *(gated)* | Capacity profile write path | `t_capacity_declare`, view, template | RFP F3 | 1.5 | D9 |

Critical path: **B1 → B3 → B4** can run before the grid lands; **B2, B6, B7, B8** follow Design 1's B4/B5. B5 is independent of everything but the ruling on post-back, which does not block the portal-side record.

Every batch: i18n EN/ID, tests with the guard probed both ways, floor bump, browser QA in both seats and both locales whose output reaches the strategist, `--merge` and hand deletion of the branch after asserting ancestry at the remote.

---

## 10 · Tests and probes that must exist

- **Probe A re-run** (B3): dispute rr-0002; supplier revises; the disputed response is `Superseded` with a `superseded-by-revision` ledger entry; the buyer's queue lists v2 as *revised in answer to your dispute*; a plain `submit` against the open sibling is refused `POLICY_REJECTED:RR_SUBMIT_NO_OPEN_SIBLING`.
- **Probe B re-run** (B3): accept rr-0001; supplier revises 6 000 → 100 without a root cause → refused; with one → consolidation `revised-after-accept`, chase `hard`.
- **Publication visibility** (B1): a SIMULATED publication is absent from the supplier's service read (known-bad); a LIVE one is present (known-good — a test-only LIVE fixture); the supplier page's sample fallback is reached only through `includeSimulatedSample`.
- **Publish gates** (B1/B2): publish with an unapproved firm line refused by name; approve as an UNATTRIBUTED seat refused (`PUB_ACTOR_ATTRIBUTED`); approve as a sample person admitted and the stamp carries `personId` only (`personIdNeverRendered` guard extends to the new render sites); Σ allocation > total refused.
- **Ask** (B4): an ask about a supplier with no live chase reason refused; recorded ask flips the card to awaiting; a reply after the ask derives `awaiting`, none derives `stale`.
- **Acknowledge** (B5): a `commercial`-only supplier seat refused (`ROLE_NOT_PERMITTED`); a buyer seat refused at scope; `ackQty < plannedQty` without a root cause refused; the chase's unconfirmed-call-off entry disappears when acknowledged in full.
- **Template ↔ verb** (B6): `templateFor('t_requirementresponse_submit')` columns equal the verb's `requiredFields` minus context fields, derived — a new required field appears in the template with nobody editing it; a workbook missing that column fails the mapping step, not the dispatch.
- **Net-change** (B2): a superseded line with equal qty and class derives *carried* and its prior confirmation counts; a changed one derives *changed* and is awaiting.
- **Mutation probes** on every new hook (remove it, confirm a named test fires), with the restore reported as sha256 + `git hash-object`, CRLF-normalised.

---

## 11 · Decisions the operator must make (recommendation first)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Who **approves firm allocations** — `procurement` (segregated from the planner who split) or `planning` itself | `procurement`; the class is a commercial statement (C8 §2.2) and the split and its sign-off should be two authorities even while one default seat holds both. |
| D2 | **Publish SIMULATED?** May a planner publish while the SOMO feed is a fixture, with FLAG-2 hiding it from real suppliers and the sample banner showing it to the demo supplier | Yes; it is the only way to exercise the write path before F2, and the structure keeps the honesty. |
| D3 | **L2 taxonomy** | Adopt the §7 starter as PROVISIONAL, glossary-registered, compliance and planning to ratify; column hidden until then. |
| D4 | **Decline** as a verb or a label | Label; the machine already expresses it. |
| D5 | **One supplier seat or three lanes** (SDC-R8) | Keep three lanes; render one notice per verb in its own slot. Revisit when real supplier persons exist (D-ID-2). |
| D6 | **Call-off acknowledgement post-back to SAP** (the triple point) | Build the portal record now; the post-back is F2's seam and the record is its payload. |
| D7 | **Response deadline and reminder days as governed settings** | Yes, on the enforcement-settings ledger pattern; per grain. |
| D8 | **Where the supplier's bulk grid lives** — `/supplier/forecasts` tabs re-hosted on the shared grid, or a new route | Re-host the *Published lines* and *Shipments* tabs; keep the drawer for a single-line edit. |
| D9 | **Capacity profile (RFP F3) in the first release** | Yes if F3 is a must for wave 1; otherwise B9 waits — it is a fourth object on the same envelope and adds no new pattern. |

---

## 12 · Traceability

| R2 finding | Where it closes |
|---|---|
| SDC-R1 no publication write path | §2; B1, B2 |
| SDC-R2 chase is a read | §5; B4 |
| SDC-R3 no supplier call-off feedback | §6; B5 |
| SDC-R4 re-submission orphans a dispute | §4.1; B3 |
| SDC-R5 accepted commitment cut silently | §4.1; B3 |
| SDC-R6 version numbering / insertion order | §4.2; B3 |
| SDC-R7 publication outside the service seam | §2.2; B1 |
| SDC-R8 one visit, three lanes | §7, D5 |
| SDC-R9 line-by-line, no template, no bulk | §3; B6, B7 |
| SDC-R10 consolidation is a table | §4.3 of Design 1; B8 |
| SDC-R11 raw status pill | §3.1; B6 |
| SDC-R12 `level2` never written | §7, D3; B8 |
| SDC-R13 registry `initial` wrong | §4.1; B3 |
| SDC-R14 deadline invisible to the supplier | §2.4, §5.3; B2 |
| SDC-R15 no decline verb | §7, D4; B8 |

RFP Appendix-2: #1 and #2 kept (BUILT); #3 closes on both halves (B3 root cause on revise, B5 on call-off); #4 closes (B5); #5 stays SE-scope (TMS); #6 becomes recordable (B4) with transport and scheduler SE-scope and said so. Functional #2: publish (B1–B2), error-proof templates (B6–B7), confirmation with quantities, committed dates and capacity constraints (kept), version control and audit trail (B1, B3). Functional #3: B9, gated.
