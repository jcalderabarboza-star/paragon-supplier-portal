# Supplier Data Collaboration — SDC-0 Build-Freeze Addendum

**Program:** Odyssey Digital Transformation · Ops #11 — Paragon Supplier Portal
**Author:** Strategic Seat · **Date:** 2026-07-16
**Status:** ADDENDUM to SDC Design v2 (schema-freeze residue — no new design round)
**Lineage:** SDC Design v2 → Seat 3 (Fable 5) confirm review (**BUILD-PLAN-READY**) → this addendum.
**Purpose:** fold the five schema-stage fixes into the SDC-0 spec and register the two governance
flags, so SDC-0 builds against the corrected model. v2 remains the design; this is the build-freeze
delta. Consumed by the SDC-0 dispatch.

---

## 0. Why an addendum, not a v3

The v2 confirm verdict was **build-plan-ready**: all ten v1 changes integrated faithfully, the C8
seam co-designed and conformance-confirmed, no design round needed. What remains is the normal
residue of a schema about to freeze — five fixes that live *inside* the objects and two governance
items that register as flags. An addendum keeps the lineage clean (v2 = the converged design; this =
the SDC-0 freeze deltas) rather than reopening v2.

The one genuinely new item is **#1 (allocation/fan-out)** — surfaced by the confirm pass as a
consequence of v2's own "supplier fan-out is ours" ruling. It is schema-affecting and is the top
must-fix. The other four are hygiene.

---

## 1. ⭐ Allocation / fan-out — the top must-fix (schema-affecting)

**The problem the fan-out ruling created.** SOMO commits (at most) to a **material × period total** —
the S&OP lock freezes the *total* for a period, not any supplier split. But v2 ruled supplier fan-out
is ours: we split that total across suppliers. So after fan-out, each supplier's allocated line wears
the `firm` badge — yet **SOMO never froze the split, only the total.** "The number will be taken"
becomes a statement about a quantity *we* computed. A bare `firm` badge on an allocated number claims
more than SOMO's lock supports.

**Two required corrections:**

**1a. The allocation mechanism must be specified.** "Associate materials to suppliers" (v2 §1) says
*who*, not *how much*. The split basis must be a named, governed thing. Options (SDC-0 to pick / make
configurable):
- planner-entered split at publication time (most honest for firm periods),
- quota / share-of-wallet by supplier-material,
- award-history-derived share.

**1b. `ForecastLine` carries allocation provenance** (schema change):
```
ForecastLine
  ... (material, supplier, periodBucket, forecastQty, commitmentClass, provenance) ...
  allocation: {
    materialPeriodTotal,      ← the SOMO-committed total this line was split from
    basis,                    ← 'planner-split' | 'quota' | 'award-history'
    approvedBy?, approvedAt?  ← for firm-period splits: the human who approved the fan-out
  }
```

**1c. Governance rule — firm-period publication requires an approved split.** The publication act
(already a deliberate, governed step) is where a **human approves the fan-out of any firm period**
before a supplier sees a `firm` badge on an allocated number. Non-firm (semi-firm / visibility-only)
lines may fan out by the configured basis without per-publication approval; firm lines require the
approval, because that badge is a commercial-liability statement.

**1d. Firm semantics scope statement (supplier-facing).** The supplier UI must frame firm honestly:
*"this period total is frozen; your allocation is Paragon's split of it"* — not a bare "this exact
number will be taken." The scope statement rides with the firm badge on allocated lines.

---

## 2. IncomingShipment lifecycle — an edit modeled as a state (fix)

v2's `lifecycle: Booked | Shipped | ETARevised | Arrived` is wrong: an **ETA revision is a repeatable
event** (can occur in Booked or Shipped), not a lifecycle stage. A shipment whose ETA changes twice
has nowhere to go, and `ETARevised` destroys the information of whether it's still in transit. Same
class of bug as v1's singular `batchNumber`.

**Fix** (mirrors the platform's DR-10 doctrine):
```
IncomingShipment
  lifecycle: 'Booked' | 'Shipped' | 'Arrived' | 'Cancelled'   ← linear + Cancelled
  ...
  eta?                     ← a field; revisions are DR-10 TransitionEvent-audited field updates,
                             NOT lifecycle transitions
```
ETA revisions are audited field events on the shipment, preserving the true lifecycle state (still
Booked / Shipped) across any number of ETA changes.

---

## 3. `uom` on every quantity-bearing field (fix)

v2 has no unit of measure anywhere. C7 carries `uom`; RM/PM materials mix kg / pcs / rolls. A qty
without a unit is a spec-level bug — cheap now, painful later. Add `uom` to:
- `RequirementResponse.forecastConfirmation.confirmedQty` → `+ uom`
- `InventoryDeclaration.batches[].qty` → `+ uom`
- `IncomingShipment.qty` → `+ uom`
- `ForecastLine.forecastQty` → `+ uom`

`uom` should key off the material master (same S/4 discipline as the material code), so a supplier
never picks a unit that conflicts with the material's canonical UoM.

---

## 4. Capacity-profile object — reinstate (fix)

The v2 fold made P1b cover only the Excel half of the v1 review's change #9; the **capacity-profile
object** (capacity calendars, MOQ, WIP, output quantity, lead times, holiday/maintenance constraints
— RFP Functional #3, and Appendix-2 supplier-submission scope) was dropped. Reinstate — SDC-0 picks
one:
- **(a) a fourth object** — `CapacityProfile` (per supplier-material: MOQ, capacity calendar, WIP,
  lead time, constraints), submitted on the same SubmissionSession; or
- **(b) explicit out-of-lane deferral** — named as a separate lane with a reason, so it isn't
  silently lost (matrix v2 §2 Functional #3 still expects it).

**Lean: (a) as a deferred object in the model** — declared in SDC-0's schema (so the model is
complete) but built in a later SDC batch (SDC-3 or later), not in the first supplier surface. The
schema carries it; the build defers it. This keeps RFP Functional #3 visibly owned, not lost.

---

## 5. SubmissionSession — the envelope rule (fix: prevent re-coupling)

v2 unifies at the session level, but must pin the rule so the session doesn't re-couple the objects
the three-way split just decoupled. **The rule (one sentence in SDC-0):**

> A SubmissionSession is an **envelope**: a single visit's grouping id + shared audit correlation.
> Each object (RequirementResponse, InventoryDeclaration, IncomingShipment) dispatches its **own
> command with independent validation**; **partial success is allowed and reported per-object**; the
> session has **no lifecycle or status of its own** beyond "what was attempted together."

So one supplier visit can submit a forecast confirmation successfully while an inventory declaration
fails validation — each resolves independently, the session just correlates them for audit. This
keeps the "one visit" UX without re-introducing object coupling.

---

## 6. Supplier-coverage indicator — ruled OURS (boundary refinement)

The confirm pass identified one projection that straddles the P2 boundary and assigned it: the
**supplier-coverage indicator** — *"does this supplier's declared SOH + incoming cover their
firm/semi-firm horizon, given the principal lead time?"* This uses **only our objects + the published
lines** (not network-level netting, allocation-across-suppliers, or in-transit-to-Paragon — those
stay SOMO's). It is a per-supplier sufficiency read, and it is the consumer §7's principal-lead-time
modeling was built for.

**Ruling: OURS, explicitly.** Call it the **supplier-coverage indicator**; build it in P2. The
network-level projected-shortage-date stays SOMO's, rendered from the commons (v2 §5 unchanged).
Without this ruling, the principal modeling has no consumer, or the indicator gets built
un-adjudicated inside P2.

---

## 7. P2-before-P1 discipline (bake-in guard)

The confirm pass confirmed P2-before-P1 is sound *with one discipline* — pin it in the SDC-1 spec:

> SDC-1's fixtures must be **instances of the SDC-0 types, generated through the same command shapes
> P1 will dispatch** — fixtures as *recorded submissions*, never hand-shaped view rows. What the
> planner asks for at the validation checkpoint lands in **P2's projection/display layer**, not
> backfilled into the three objects.

If P2 consumes only what the model can express, it cannot bake in a shape P1 can't feed. This makes
P2-first strictly superior (the planner is the reachable validation user) with no model-drift risk.

---

## 8. Governance flags — registered (non-blocking for fixture-first; blocking before real-supplier visibility)

These do **not** block the fixture-first build. They **do** gate real-supplier visibility — the same
gate pattern the platform already uses (a capability built and demoable on SIMULATED data, with a
named ratification step before it goes live).

**FLAG-1 — commitmentClass mapping is a policy default pending business ratification.** `lock → firm
("will be taken")` derives a *commercial-liability statement* from a *planning state*. An S&OP freeze
means the plan won't change; it is not by itself a purchase commitment. The derivation is the right
mechanism, but **procurement + finance must ratify** the lock→firm mapping before any real supplier
sees a `firm` badge. Build on it with SIMULATED data now; gate real-supplier visibility on the
sign-off.

**FLAG-2 — the publication visibility gate.** A **SIMULATED publication must never be supplier-
visible at all** — publishing to a real supplier requires LIVE plan data. This is the platform's own
two-gate doctrine applied at the seam. The supplier-facing vocabulary is **`commitmentClass`**
(firm/semi-firm/visibility-only) — a supplier must **never** see internal liveness terms
(SIMULATED×PLANNED etc.). State once; the translation question evaporates.

---

## 9. Process items for the operator

1. **Commit the SOMO C8 conformance reply to `docs/`** alongside the C7 replies. v2's load-bearing
   derivations (lockState/approvalState mapping, period-global lock, delta-on-read, 6-bucket horizon)
   cite it; the same citability discipline C7 enforced applies to C8.
2. **The export-import / expeditor persona** (P2's third reader, matrix v2 §8) is intentionally out of
   this lane — named here so it's not lost; it lives in the matrix's non-scope section, to be picked
   up when the Warehouse/Expeditor persona is built.

---

## 10. SDC-0 build checklist (the fold, consolidated)

For the SDC-0 dispatch, the schema must incorporate:

1. **Allocation provenance** on `ForecastLine` (materialPeriodTotal + basis + approvedBy/At);
   firm-period publication requires an approved split; supplier-facing firm scope statement. **(Top,
   schema-affecting.)**
2. **IncomingShipment.lifecycle** = `Booked → Shipped → Arrived (+ Cancelled)`; ETA = audited field
   event, not a state.
3. **`uom`** on every qty-bearing field, keyed off material master.
4. **Capacity-profile object** declared in the schema (deferred build), or explicit out-of-lane note.
5. **SubmissionSession envelope rule** (independent per-object commands, partial success, no session
   lifecycle).
6. **Supplier-coverage indicator** ruled ours (P2 build item).
7. **SDC-1 fixture discipline** (fixtures = recorded submissions through P1's command shapes).
8. **FLAG-1 / FLAG-2** registered as real-supplier-visibility gates (non-blocking for fixture-first).

With these folded, SDC-0 builds against the corrected, frozen model. No further design round.

---

## 11. Bottom line

v2 is build-plan-ready; this addendum folds the five schema-stage fixes (allocation provenance the
top one, then IncomingShipment lifecycle, uom, capacity profile, SubmissionSession envelope) and
registers the two governance flags (commitmentClass ratification, publication visibility gate) plus
the supplier-coverage-indicator ruling and the P2 fixture discipline. The allocation fix is the one
of real substance — it closes the gap the fan-out ruling opened, keeping a `firm` badge honest about
what SOMO actually froze. SDC-0 now has a complete, corrected schema to build against; the lane
decomposes SDC-0 → SDC-1 (P2-on-fixtures) → SDC-2 (P1) → SDC-3 (objects + Excel) → SDC-4 (P2-live) →
SDC-5 (chase), ready to dispatch when Seat 2 pivots off CI-2.
