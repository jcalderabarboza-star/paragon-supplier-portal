# Supplier Data Collaboration — Design v2

**Program:** Odyssey Digital Transformation · Ops #11 — Paragon Supplier Portal
**Author:** Strategic Seat · **Date:** 2026-07-16
**Status:** DESIGN v2 (build blueprint) — incorporates external-consultant review + SOMO C8 seam
**Lineage:** SCH matrix v2 (priority #1 lane) → SDC design v1 → Seat 3 (Fable 5) review
(BUILD-WITH-CHANGES, 10 changes) → C8 seam proposal → SOMO/IBP C8 conformance reply → **this v2.**
**Next step:** Seat 3 confirm-and-improve review of v2, then SDC-0…SDC-5 build decomposition.

---

## 0. What changed v1 → v2 (the delta)

v1's frame held — the lane is right, the priority is right, the federated boundary is right,
publish-and-version is the right governance spine. But the consultant review found the model
over-unified, the seam mis-attributed, and one business-critical term missing; and the SOMO
co-design firmed the seam grain. v2 integrates both:

1. **The model splits into three objects** (was one over-unified "faceted submission"). SOH and
   planned-incoming failed the spine's own test ("a statement about a material, for a period,
   against a published requirement version") — they have different lifecycles. → **RequirementResponse
   · InventoryDeclaration · IncomingShipment**, unified at the *session* level, not the object level.
2. **The forecast seam is C8, not C7.** C7 is post-acceptance PR-intake; a published forecast is
   pre-acceptance, rolling, period-bucketed. v2 sources publication from the **new C8 sibling seam**
   (co-designed with SOMO, conformance confirmed).
3. **`commitmentClass` added** — the missing business-critical term. Answers the supplier's first
   question ("which of these will you actually take?") and prevents dead-stock disputes. Derived from
   SOMO's real plan state.
4. **Shipment direction named**; incoming-*to-Paragon* converges on the existing **ASN object**, not a
   parallel one.
5. **Distributor-principal relationship modeled** (per supplier-material), not just a type flag.
6. **Publication = governed cycles + net-change deltas + explicit stale-carry-forward rule.**
7. **P2 boundary ruled**: response-tracking is ours; coverage *projection* is planning math (SOMO's).
8. **Chase list before chase engine**; delivery-due reminders added to triggers; chase rules as data.
9. **Excel round-trip (non-ERP suppliers)** named.
10. **Resequenced**: SDC-0 → P2-on-fixtures → P1 → P2-live, with a real-planner validation checkpoint.

Plus the SOMO C8 rulings: supplier fan-out is ours; `commitmentClass` from `(lockState,
approvalState)` with a period-global `firm` caveat; bucket-native grain; delta-on-read near-term;
`planVersion` on the response record.

---

## 1. The lane, and the federated boundary (confirmed)

Supplier Data Collaboration replaces the scattered email/chat/spreadsheet exchange (RFP Background +
Appendix 1) with one governed surface. The federated boundary, now firm:

- **SOMO owns the forecast** (demand). We read it via **C8** from the Snowflake commons. SOMO emits
  **material × period × qty**; **we fan it out to supplier × material × period** (supplier-master is
  ours — SOMO has no supplier dimension).
- **TMS owns journeys/ETA.** A supplier-supplied AWB is a *reference*; the journey is read from TMS.
- **We own the collaboration surface** — publish to the supplier, capture the structured response,
  version + audit, write back to the commons for SOMO's replan and the planner's view.

We build the surface; we sync demand (C8/SOMO) and tracking (TMS); we compute what's ours.

---

## 2. The data model — three objects, one session

The consultant's test — *"a statement about a material, for a period, against a published requirement
version"* — cleanly separates what belongs where. The unification that survives is the **submission
session** (one supplier visit, one governed dispatch path, one audit trail), not a single object.

### 2.1 RequirementResponse — the true spine (versioned against C8 publications)
```
RequirementResponse
  id, supplierId, material (S/4 RM/PM code), periodBucket,
  publicationId, planVersion,          ← binds to the exact C8 publication answered
  submittedAt, submissionVersion,
  status (Draft | Submitted | UnderReview | Accepted | Disputed),
  forecastConfirmation { confirmedQty, committedDate, capacityConstraint },
  rootCause? { level1, level2, note },  ← child of the confirmation (explains a deviation)
  provenance (source=SUPPLIER, liveness=LIVE×committed once submitted)
```
This is the spine: a confirmation against a published forecast version, with root-cause as its child.

### 2.2 InventoryDeclaration — SOH state (NOT against a requirement version)
```
InventoryDeclaration
  id, supplierId, material (S/4 code), declaredAt,   ← a state snapshot, as-of a timestamp
  batches: [ { batchNumber, qty, expiryDate } ],     ← PLURAL (v1's singular was a spec bug)
  provenance (source=SUPPLIER, liveness=LIVE×committed)
```
SOH is keyed by material + as-of, not by requirement version — it changes when stock moves, not when
demand publishes. Modeled separately so there is one true SOH per material, with a clear as-of.

### 2.3 IncomingShipment — long-lived, per shipment line, direction-named
```
IncomingShipment
  id, supplierId, material (S/4 code),
  direction: 'principal-to-distributor' | 'to-paragon',   ← NAMED (v1 conflated these)
  lifecycle (Booked | Shipped | ETARevised | Arrived),     ← its own lifecycle, revisable
  qty, etd?, eta?, awb?,                                    ← AWB is a TMS reference (link, don't track)
  provenance (source=SUPPLIER, liveness=LIVE×committed)
```
**Direction ruling:** `principal-to-distributor` is the distributor's supply-assurance data (Paragon
is not the consignee — a new object, RM supply visibility). `to-paragon` is a shipment to Paragon —
which is what the **already-built ASN object is for**. Rule: incoming-to-Paragon **converges on the ASN
machine**; we do NOT grow a parallel tracking object. This object carries the principal→distributor
leg (pure supply-assurance) natively, and links to-Paragon legs to ASN.

### 2.4 The submission session (the unification that survives)
One supplier visit opens a **SubmissionSession** that can touch all three objects through one
governed dispatch path with one audit trail (DR-10 TransitionEvent). The "one submission act" UX
insight from v1 is preserved — it was always a *session* unification, not a *data-model* one.

### 2.5 Call-off response — exits this lane
Call-off response moves OUT of this model; it rides the **call-off object** when that lane builds
(it's PO-adjacent, not forecast-collaboration). Named here so it's not lost.

---

## 3. The C8 forecast-publication object (the governance spine)

Sourced from the C8 seam (SOMO-confirmed). SOMO revises continuously; the publication is the governed
snapshot the supplier confirms *against*.

```
ForecastPublication            (ours, built from C8; the governed publication)
  publicationId, planVersion, publishedAt,
  horizon: [ periodBucket ],   ← C8 fixed 6-bucket window today (GG-8); we may trim per supplier
  lines: [ ForecastLine ]

ForecastLine                   (supplier × material × periodBucket — fanned out on OUR side)
  material (S/4 code), supplier, periodBucket, forecastQty,
  commitmentClass,             ← firm | semi-firm | visibility-only (§3.1)
  segment?, suggestedSource?,  ← SOMO read-only annotations (C7 GG-1/GG-2 vocabulary)
  provenance (source=SOMO, liveness=SIMULATED×PLANNED | LIVE×PLANNED)
```

**Supplier fan-out is ours** (SOMO C8 ruling): SOMO emits `material × period × qty`; we project to
`supplier × material × period` by associating materials to suppliers on our side.

### 3.1 commitmentClass — derived from SOMO plan state (the business-critical term)
The supplier's first question — *"which of these will Paragon actually take?"* — where dead-stock
liability lives. SOMO emits two raw axes; **C8 projects the class on our side** (we own the class
vocabulary; SOMO stays free of commitment-policy):

| commitmentClass | Derives from (SOMO raw state) | Meaning to supplier |
|---|---|---|
| `firm` | period is **locked** (S&OP freeze) | Paragon has frozen this period; the number will be taken |
| `semi-firm` | **approved**, period not locked | Consensus-committed at the line, not order-backed |
| `visibility-only` | **draft / submitted**, not locked | Forward visibility, no commitment |

**The period-global `firm` caveat (SOMO honest boundary):** the lock axis is **period-global, not
per-line** — a locked period locks all materials at once. So within a firm period every line reads
`firm`; within an unlocked period lines split semi-firm/visibility-only by approval state. **Our
supplier UI shows firmness at period granularity honestly.** Per-material firmness (per-node lock) is
a registered SOMO named-future — not buildable from today's plan, not faked.

### 3.2 Publication cadence + net-change + stale-carry-forward
- **Governed cadence** (SOMO-confirmed): publish monthly (RM) / weekly (PM), NOT per-revision, with
  mid-cycle emergency republication flagged. Publication is a deliberate act, not an echo of every
  replan.
- **Net-change delta = OURS to compute on read** (SOMO ruling — SOMO has no version-over-time history
  yet). We hold the prior published version (we're the SoR for what the supplier saw); we diff
  new-vs-last-published and only re-request confirmation where a line moved beyond **tolerance** (a
  collaboration-policy knob, ours). Full re-confirmation of an unchanged 200-line forecast every cycle
  is how distributor adoption dies. Plan-side delta is a SOMO named-future.
- **Stale-carry-forward rule (explicit):** a confirmation against v(n) **carries forward as
  presumed-valid under v(n+1), flagged**, with a tolerance-triggered re-confirm request where the
  line moved. (Not voided — voiding forces full re-confirmation churn.) This rule drives P2 display
  and P3 triggers, so it's pinned now.

---

## 4. P1 — Supplier submission surface (supplier side)

The supplier's governed response — mirrors the proven `t_quotation_submit` pattern.

- **Entry:** the supplier sees their published forecast lines (from C8), each honestly marked with
  `commitmentClass` (firm/semi-firm/visibility-only) and provenance/liveness. They know which numbers
  Paragon is committing to.
- **The response (one session, three objects):** confirm forecast (qty/date/capacity) + declare SOH
  (batches[]) + report incoming (direction-named) + root-cause where they can't meet it.
- **Governance:** one dispatch path, Draft → Submitted → Under Review; own-facts-only (the FORK-3b-C
  rule, proven); versioned + audited; binds `planVersion` (so the response answers a known snapshot).
- **EN/ID from day one**; the surface *is* the error-proof template (structured fields, not a
  free-form spreadsheet — retires the Appendix-1 two-format pain).
- **P1b — Excel round-trip (non-ERP suppliers):** RFP Objective #7 ("both ERP and non-ERP
  suppliers"). Large distributors won't all log into a portal. A structured Excel template
  export/import round-trip (same governed model, offline entry) is named as a P1 sub-deliverable, not
  an afterthought — it's an adoption requirement.

## 5. P2 — Planner consolidation view (buyer side) — the master-spreadsheet replacement

The half v1 under-scoped. This replaces the manually-compiled master spreadsheet (RFP page 13). The
Appendix-1 planner flow is: consolidate → compare to demand → **check impact on overall supply** →
decide expediting.

**The boundary ruling (critical — avoids rebuilding SOMO):**
- **Response tracking = ours.** Who responded, who confirmed in full, who's short, who's silent;
  confirmed-vs-demand per line; stale-against-current flags; deficit/shortfall surfacing. This is
  collaboration-state consolidation — squarely ours.
- **Coverage *projection* = SOMO's.** "SOH + confirmed incoming + confirmed supply vs demand over
  time → projected shortage date" is **planning math**. If P2 grew a projected-stock engine, we'd
  rebuild a slice of SOMO inside the portal — the exact thing federated doctrine forbids. **Ruling:**
  P2 *renders* projected coverage from the commons (SOMO computes, we display), OR shows an
  honestly-SIMULATED interim projection clearly marked, until the SOMO feed lands. P2 never computes
  the projection as if it were truth.
- **The grid:** P2 is a materials × suppliers × periods grid — the **Stage-G DSG engine's natural
  second consumer.** Reuse it; don't reach for a new table primitive.

**The chase list (pre-scheduler):** before any P3 scheduler exists, P2 surfaces an overdue/chase list
(who's past deadline, who's partially responded) that the planner works manually via the existing
WhatsApp chrome. ~60% of the chase value at zero scheduler cost, and it validates the trigger rules
with real usage before automation. An explicit P2/SDC-3 deliverable.

## 6. P3 — Reminder / chase engine (design now, wire later)

- **Chase rules are data** — deadline offsets, reminder cadence, escalation policy (properties of the
  publication + supplier relationship), authored in this lane. Delivery is the notification lane's
  (matrix v2 §6.2). That split keeps P3 here legitimately.
- **Trigger taxonomy** (expanded per consultant): response-overdue nudges; partial-response nudges;
  escalation to planner on repeated non-response; **AND delivery-due reminders ahead of ETA** (RFP
  Appendix-1's "request delivery reminder sent manually to each supplier" — not only response-overdue).
- **Scheduled jobs** are new backend infrastructure (F1+). Chase *rules + surfaces* land now
  (frontend-as-spec); the *scheduler* wires later. The P2 chase list (§5) is the pre-scheduler
  interim.

---

## 7. The distributor-principal model (interpretation, not just a flag)

For RM, the "supplier" is a **distributor** holding stock against a **principal's** lead time (RFP
Appendix 1). To *interpret* distributor SOH + incoming ("can this distributor bridge the principal's
lead time?"), the **principal relationship must be modeled** — not just a `supplierType` flag:

```
SupplierMaterialRelationship
  supplierId, material,
  supplierType: 'manufacturer' | 'distributor',
  principals?: [ { principalId, principalLeadTime } ],   ← for distributors: who backs them, lead time
```

Without the principal lead time, distributor SOH + incoming is data you can display but not
interpret. This attribute lives on the **supplier-material relationship**, not the supplier.

## 8. Federated boundaries — what we build vs sync (v2, explicit)

| Capability | Owner | Boundary |
|---|---|---|
| Forecast/demand | **SOMO** | Read via **C8**; SOMO emits material×period×qty; **we fan out to supplier**. |
| commitmentClass raw state (lock, approval) | **SOMO** | SOMO emits; **we project** the 3-way class. |
| The collaboration surface (P1/P2/P3 + publication + 3 objects) | **Ours** | We BUILD — the lane. |
| Coverage projection (projected shortage date) | **SOMO** | Planning math; we RENDER from commons (or honest-SIMULATED interim). |
| Journey/ETA behind an AWB | **TMS** | Supplier supplies AWB reference; we LINK; incoming-to-Paragon → ASN. |
| Net-change delta (near-term) | **Ours** | We hold prior published version; diff on read. Plan-side delta = SOMO named-future. |
| Execution reality (GR/OTIF) grounding fulfillment | **Ours → commons** | We write; SOMO + P2 read (F3 seam). |
| Notification delivery | **Ours** (next lane) | P3 chase rules here; delivery via notification engine. |
| Supplier/principal master | **Ours (+ SAP)** | supplierType + principal relationship + vendor-master alignment. |

---

## 9. Build sequencing (v2 — resequenced per consultant)

Design from the consumer backward; the planner is the *reachable* validation user; fixtures give P2
something to consolidate. Frontend-as-spec, atomic PRs, honest-by-construction, mirroring the
sourcing-spine cadence.

- **SDC-0 — the data model** (3 objects + ForecastPublication/ForecastLine + commitmentClass
  projection + SubmissionSession), pure/typed, SIMULATED fixtures on the C8 grain. The spine, no UI.
  Mirrors CI-1a's engine-first discipline. **The two must-resolve-before-freeze items (C8 grain,
  commitmentClass) are now resolved — SDC-0 can build.**
- **SDC-1 (P2-on-fixtures) — planner consolidation view, read-only on SIMULATED submissions.** Built
  BEFORE P1, so consolidation needs prove the model correct, and a real Paragon planner validates a
  fixture-backed P2 within one batch. Reuse the Stage-G DSG grid. Includes the chase list.
- **SDC-2 (P1) — supplier submission surface**, forecast-confirmation facet first, one dispatch path
  (mirror `t_quotation_submit`), own-facts-only, versioned, binds planVersion, EN/ID.
- **SDC-3 — the additional objects** (InventoryDeclaration w/ batches[], IncomingShipment
  direction-named + ASN convergence) on the submission session. Plus P1b Excel round-trip.
- **SDC-4 (P2-live) — P2 consumes real submissions**; net-change delta on read; stale-carry-forward.
- **SDC-5 — P3 chase rules** (frontend-as-spec; scheduler wires on the notification lane).

**Real-planner validation checkpoint:** get the fixture-backed P2 (SDC-1) in front of an actual
Paragon planner before P1's UX freezes. (Consultant's strongest sequencing point — the planner is
internal, feels the pain daily, and is reachable; suppliers are adoption-lagged.)

**Cross-team dependency (resolved):** C8 is co-designed and conformance-confirmed with SOMO
(period-bucket grain, commitmentClass from lock/approval state, delta-on-read, planVersion on
response). Registered as a deferred sibling seam alongside C7 — neither side wires live this quarter.
SDC builds against the agreed C8 now; SOMO-side feedback wiring converges on the F3 timeline.

---

## 10. Open questions for the Seat 3 (v2 confirm) review

1. Is the three-object split (RequirementResponse / InventoryDeclaration / IncomingShipment) now
   correct, or does any object still carry a facet that belongs elsewhere?
2. Is the SubmissionSession unification (one visit, three objects, one audit trail) the right shape,
   or does it re-introduce coupling the split was meant to remove?
3. Is the commitmentClass period-global `firm` caveat honestly handled in the supplier UI, or does
   period-granular firmness mislead a supplier in a way we must guard?
4. Is the P2 boundary (response-tracking ours / coverage-projection SOMO's) drawn in the right place,
   or is there a projection a planner needs that falls awkwardly across it?
5. Is P2-before-P1 fully sound now, or does building P2 on fixtures risk baking in a consolidation
   shape P1's real submissions can't feed?
6. Is anything from the v1 review under-integrated or lost in the fold to v2?
7. Is v2 solid enough to become the SDC build plan, or are there remaining must-fixes before SDC-0?

---

## 11. Bottom line

Supplier Data Collaboration is the RFP's #1 gap and the priority lane. v2 is **three objects under
one submission session** — RequirementResponse (the spine, versioned against C8) + InventoryDeclaration
(SOH state) + IncomingShipment (direction-named, ASN-converging) — plus the **planner consolidation
view** (built first, on fixtures, validated by a real planner), a **reminder/chase engine** (rules
now, scheduler later, chase-list interim), and the **C8 forecast-publication object** carrying
**commitmentClass** (derived from SOMO's lock/approval state — the term that answers "which will you
take?" and prevents dead-stock disputes).

It sits on the **co-designed C8 seam**: SOMO emits material×period×qty forecast, we fan out to
suppliers, publish with commitmentClass, capture the structured response, version + audit, and write
back to the Snowflake commons for SOMO's replan. TMS owns the tracking AWBs reference; SOMO owns the
demand; **we own the collaboration.** C8 is conformance-confirmed; we build against it now; SOMO-side
wiring converges on F3. This v2 is the blueprint — the Seat 3 confirm pass hardens it, then it
decomposes into SDC-0…SDC-5.
