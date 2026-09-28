# Stage G — Grid / Planning Layer: Execution Plan v1 (through G0)

**Status:** DRAFT — authored by Seat 3 (strategic, read-only), 2026-07-14. Pending
operator adjudication. G0 is not cleared to Seat 2 until this document is ratified.
**Amended 2026-09-28** — FORK-G1's stale register row corrected and **FORK-G1′**
recorded (§3 G0.3, §6).

⚠️ **AND THE TWO SENTENCES ABOVE ARE THEMSELVES STALE, WHICH IS WORTH KNOWING BEFORE
READING ANYTHING ELSE HERE.** G0 *was* cleared. Derived rather than recalled —
`git log --format='%ad %s' --date=short | grep -oE '^[0-9-]+ G[0-9]\.[0-9][a-z]?' |
sort -u` returns **G0.1 · G0.2 · G1.1 · G1.2a (2026-07-14) · G1.2b · G1.3
(2026-07-15)**, and the C6 planning contract this document grounds has read
`CONTRACT · authored G0.1` ever since.

⚠️ **NOTE WHAT THE DERIVATION DOES NOT RETURN: THERE IS NO `G0.3` COMMIT.** G0.3 is
the FORK-G1 adjudication (§3 below), and its exit criterion was *the scorecard
artifact* — which exists (`docs/g0-2-engine-scorecard.md` §6.1 carries the ruling,
dated 2026-07-14) and landed inside the G0.2 batch. **A decision can be ratified
without a commit bearing its name**, so the absence is not a gap; it is recorded here
because a reader deriving the batch list will notice the hole and should not conclude
the fork was never ruled. It was — see the register row.
**Stage G is DORMANT at G1.3, not pending** (see `CLAUDE.md` → THE RECALIBRATED PATH).
The status line is left as written rather than rewritten, because *"pending
adjudication"* is what this document was when it was authored, and the Planning Grid
lane now starting is not a resumption of Stage G — it is a new lane that inherits
Stage G's keystone and its engine ruling. **This amendment touches only the two
engine rows**; nothing else here has been re-verified against the tree, and a reader
should treat the rest as a 2026-07-14 artefact.
**Grounding:** `Grid_Planning_Layer_Investigation_2026-07-14.md` (adjudicated).
**Scope of this document:** Stage G placement, the design keystone, the G0 engine
bake-off in full, and the G1/G2/G3+ skeleton. **G1+ batch detail is deliberately NOT
authored here — it is authored post-spike, against the chosen engine.**

---

## 1. What Stage G is

The platform today is transactional: state-machine flows execute decisions, but no
surface lets the team *compose* a decision over live data first. That planning work
round-trips through offline Excel — stale data, re-key errors, lost audit-of-why.
Stage G builds the in-platform **planning grid**: plan on live platform data, hold
proposed values honestly, execute through the existing command dispatcher.

**Adjudicated placement:** Stage G is the **I6 award-scenario implementation** — the
one surface the canon already specs as tabular plan-then-commit ("Award-scenario
seam"; "build the scenario UI, buy the solver"). It runs as the **priority build
phase after I3 closes**, ahead of the rest of Stage 2. The Grid is a horizontal
primitive (operator directive: everything operational eventually gets a plan layer,
Excel-grade UI/UX); I6 is where the primitive is proven first.

**Out of scope, permanently for this stage:** the desktop Excel add-in reaching into
the platform. That is a separate, later, DPO-governed seam. The solver/optimizer
itself is also out (A4, evaluate-buy, Keelvar-class) — Stage G builds the scenario
surface and the seam the solver later plugs into.

**Precondition (blocker):** `Paragon_World_Class_Build_Plan_v1.md` must be resolved
onto main (merge of docs-only branch `plan/world-class-build-plan-v1`, per the
2026-07-14 Seat-3 fact-find) so Stage G can be slotted into the canonical plan.

---

## 2. Design keystone: PLANNED is an axis, not a tier

The single load-bearing design rule, adjudicated:

- **"Planned" is orthogonal to liveness.** The LivenessRegistry answers *"is this
  data source real?"* (per-capability, two-gate: CommandTarget wired AND real data
  landed). A planned value answers *"is this value committed or proposed?"* (per
  cell/row). These never conflate: **no new registry tier is added for planning.**
  A grid cell therefore carries two independent markers: its source tier
  (LIVE/SIMULATED, registry-derived) and its plan state (PLANNED overlay, if edited).
- **PlanDraft lives outside the query cache.** Planned/edited values are held in a
  dedicated client-side plan store — never written through `IDataService`, never
  placed in the TanStack Query cache, never persisted to localStorage (the codebase
  deliberately deleted its localStorage overlays; that pattern stays dead).
- **Overlay is never merged into seam rows — structurally.** The grid renders
  `seamRow + plannedOverlay`; a planned value is always visually and programmatically
  distinct. The `extraRfqs` pattern in `BuyerSourcing` (client-fabricated rows
  indistinguishable from seam-backed rows) is the named anti-pattern this rule
  outlaws; Stage G retires it by moving RFQ creation onto the dispatcher.
- **Push-to-execute is the ONLY exit from PLANNED.** Committing a plan iterates its
  rows into real `svc.commands.dispatch(...)` calls — inheriting scope, role,
  legality, requiredFields, policy validation and DR-10 audit — then invalidation
  re-reads the seam and the overlay clears because the seam now agrees. No
  optimistic writes, no onMutate. Failed dispatches stay PLANNED with the failure
  reason attached. A plan push is grouped under one correlation via the existing
  `causationId` mechanics (cascade precedent) — the durable audit-of-why.
- **Two-gate discipline holds.** A grid that dispatches real commands over simulated
  data still renders SIMULATED. Gate-1 (wiring) never flips a marker green alone;
  gate-2 (real data source) is independent. No derived value (score, should-cost,
  projection) is ever minted client-side and presented as platform truth.

---

## 3. G0 — Engine bake-off + doctrine (the only phase authored in detail)

G0 produces two artifacts and one ruling. No product code merges to main from G0
except the doctrine contract and the scorecard.

### G0.1 — Plan doctrine contract
Author `docs/contracts/C6-planning.md`: the PlanDraft shape, the overlay rule, the
push pipeline, causation-grouped audit, and the honesty matrix (source tier × plan
state → required marker). This freezes §2 as contract before any engine code exists,
so the engine choice cannot bend the doctrine.

### G0.2 — Engine spike: AG Grid Enterprise vs Handsontable + HyperFormula
Two throwaway spike branches (never merged; artifacts only), one identical harness:
a dev-only route rendering **fixture quotation data** (multi-tenant sup-002/005/007)
as an award-scenario grid — quotations × criteria, one editable what-if weight
column, a mocked PLANNED overlay, `LivenessPill` on the surface, EN/ID toggle,
DP-3 tokens applied.

Both engines are scored on the same axes:

| Axis | What is tested |
|---|---|
| Excel-UX fidelity | Range selection, fill handle, clipboard round-trip with real Excel, keyboard model, undo/redo, multi-cell edit |
| DP-3 theming | Can cells render the mono/data-navy token grammar, quiet StatusPill chips, light table grammar — without fighting the engine's own chrome? |
| EN/ID i18n | All engine-owned chrome localizable; number/date/IDR formatting (Asia/Jakarta) inside engine cells |
| a11y | Keyboard-only operation, screen-reader behavior of engine chrome, focus model |
| Bundle impact | Gzip delta vs current bundle; lazy-load / route-split feasibility |
| License terms | Per-dev cost, deployment/audit obligations, procurement compatibility |
| **Honesty containment** | Does the engine make fabricated derived values easy? Can formula support be shipped fully OFF (hard requirement under the formulas-OUT lean)? Does the engine insist on owning data state (masquerade risk), or is it strictly data-in/data-out? Can the PLANNED overlay be enforced per-cell at the engine layer? |
| Test-floor compatibility | Renders and is assertable under vitest/jsdom (the floor must be able to see it) |

**Hard gates (disqualifying regardless of score):** DP-3 theming failure, EN/ID
failure, honesty containment failure (formulas cannot be disabled, or engine state
cannot be kept subordinate to the seam), or inability to test under the floor.

### G0.3 — FORK-G1 adjudication
**Exit criterion of G0 = the scorecard artifact:** one document (findings-register
style) with per-axis scores for both engines, EN/ID screenshots, measured bundle
deltas, license terms, and a written honesty determination. The operator rules
**FORK-G1**: engine, license posture, and formulas IN/OUT.

**Recorded lean (to be confirmed by the spike, not a pre-decision):**
**AG Grid Enterprise, formulas OUT.** Rationale: investigation honesty risk 5 — a
formula cell is user-authored math rendered beside platform truth; structured
editing without an in-grid formula engine is the safer default. Handsontable +
HyperFormula remains the challenger if the operator's "Excel total experience" bar
requires in-grid formulas AND the spike shows they can be honesty-contained.

*Gate: no Stage G product code is written before FORK-G1 is ruled.*

### ⚠️ THE OUTCOME, RECORDED WHERE THE LEAN IS — AND IT WAS NOT THE LEAN

**FORK-G1 was RULED on 2026-07-14: `react-datasheet-grid` v4.11.6 (MIT), formulas
OUT, no licence** (`docs/g0-2-engine-scorecard.md` §6.1). The lean above named AG
Grid Enterprise; the ruling went the other way, on the ground that *"the engine is
a reversible frontend implementation detail; the doctrine is the permanent
contract"* — and a commercial licence is premature cost on a reversible decision.
`package.json` has shipped `react-datasheet-grid` ever since.

⚠️ **THE LEAN IS LEFT STANDING ABOVE RATHER THAN DELETED, AND THIS BLOCK IS WHY
THAT IS SAFE NOW.** For over a year the register carried the lean as though it were
the outcome (see the FORK-G1 row in §6, corrected in the same batch as this block),
so a reader met a pre-decision wearing a ruling's clothes. Deleting the lean would
hide that it was overturned, which is the more useful fact of the two: **the spike
was run, and it changed the answer.**

### FORK-G1′ — AG Grid Enterprise, AFTER THE HANDOVER (operator ruling, 2026-09-28)

**The ruling.** AG Grid Enterprise, **two developer licences**, is **INSTALLED BY THE
SE TEAM AFTER HANDOVER (28 Oct 2026)**. Our Planning Grid is built on **the engine
already in the repository** (`react-datasheet-grid`).

**What this does and does not reverse.** It does **not** reverse FORK-G1's reasoning
— the engine remains a reversible detail and the doctrine remains the contract. It
adds an owner and a date: the Enterprise-grade capabilities (row grouping, subtotals,
range selection, fill handle, set filters, column chooser, export, saved layouts, and
the accessibility gap below) are the **SE Team's** to build on AG Grid after handover.

**What we build, and the consequence for sequencing.** The registries, the views, the
read seam and the **governed-edit seam** ship on the installed engine, so the move to
AG Grid is an **engine swap, not a redesign**. Our grid batches therefore do **not**
depend on the licence arriving — which is the whole point of recording the ownership
split rather than the purchase.

**Why AG Grid at all, given FORK-G1 ruled against it.** The scorecard's §6.3 made the
upgrade **FIRM** on four named triggers and said the trigger would be *"a scale
event"*. The Planning Grid meets **two of them on its first view** — complex
grouping / pivoting / aggregation (trigger 2) and heavy concurrent editing (trigger 3)
— and **the first at RFP scale** (outgrowing client-side virtualisation). So this is
the scorecard's own upgrade path firing, not a reversal of its ruling.

**Plus a fifth ground §6.3 did not weigh: accessibility.** The read-only review of
2026-09-28 measured **zero ARIA on the installed engine** — 0 `role=`/`aria-` in
`dist`, 0 `[role=grid]` in the DOM — against an RFP that asks for a daily-use
instrument for named users with RBAC and audit. **Recorded as that review's
measurement, not re-measured here**, and it is the one trigger a scale event would
never produce: it does not improve with volume, and nothing in §6.3's list would ever
have fired on it. A licence is no longer premature cost on a reversible decision; it
is the cost of the accessibility and the grouping the surface actually needs.

**Licence handling, so it is not re-derived at install time.** USD 999 per developer,
perpetual with one year of updates (vendor page, 2026-09-28). ⚠️ **The pricing page
does not define who counts as a developer — the EULA does**, and confirming that the
two licences cover the two front-end developers who will *edit grid code* (and that
reviewers, QA and code readers do not need a third) is a named action for the Lead
Engineer **before** the install. The design names the file boundary
`plan-grid/engine/**` so *"writes grid code"* is checkable in a PR rather than argued.
The key is read from a non-`VITE_`-prefixed build-time env in the vendor's documented
manner; it is not a secret and is not treated as one, and it does not live in the
repository.

**What stays on the installed engine regardless:** `BulkStockEntryGrid` (supplier SOH
batches), until the supplier-collaboration confirmation grid lands on the new
component. `react-datasheet-grid` leaves `package.json` only then.

**If the operator reverses this:** the honest fallback is the installed engine with
model-layer sort/filter/totals and **the accessibility gap filed OPEN** — not a third
engine, which is an engine to write rather than to choose.

---

## 4. Phase skeleton — G1 / G2 / G3+ (names, intent, honesty gates ONLY)

> **G1+ batch detail is authored post-spike, against the chosen engine.** Nothing
> below is a batch spec; it is the shape the post-spike authoring fills in.

- **G1 — `PlanGrid` primitive + I6 anchor.** Wrap the chosen engine as the one
  DP-3-conformant grid primitive (EN/ID from birth); ship the award-scenario grid
  in BuyerSourcing (quotations × criteria, what-if weights marked as
  client-computed, session scenarios, push via the existing `t_rfq_award` cascade);
  ride-along validator: PO-confirmation grid on `t_po_confirm` (the one per-line
  verb that exists — the cheapest genuine live loop); retire `extraRfqs` by putting
  RFQ creation on the dispatcher. *Honesty gates: overlay never merged; every
  marker registry-derived; no fabricated scores (quote scores stay SIMULATED until
  the I2-class scoring primitive; F0.3-FIND-01 stands).*
- **G2 — Plan as platform state.** `Plan` canonical entity + lifecycle machine
  (Draft → Pushed → Settled/Abandoned) through `IDataService`; pushes grouped under
  one plan correlation; plan-vs-actual view (settle outcomes vs planned values —
  the anti-"screen savings" instrument). *Honesty gate: plan persistence goes
  through the seam, never a client overlay.*
- **G3+ — Module rollout ladder** (each rides FORK-2: verbs wire when the surface
  lands; order opportunistic): requisition-intake grid (wires the PR machine; feeds
  I5) → inventory replenishment grid → GR inspection port onto PlanGrid → invoice/
  match workbench (I4) → spend/budget grid (I1; bottoms-up over PO/PR lines; Live
  gated on F3) → split-award scenario grid v2 (new verb + quotation-line model +
  bought-solver seam, A4/I6). *Honesty gate per module: Live flips only on that
  module's Stage-F prerequisite, two-gate.*

---

## 5. Standing gates — every Stage G batch, no exceptions

1. Test floor never regresses (current floor at batch start is the floor).
2. Every liveness/honesty marker is registry-derived — no JSX/i18n literals.
3. Live flips ride Stage-F prerequisites only; gate-1 wiring never flips green alone.
4. Desktop Excel add-in stays out of scope (separate DPO-governed seam).
5. The investigation's honesty checklist runs at batch close: (i) no PLANNED value
   masquerading as committed; (ii) no gate-1 illusion; (iii) no fabricated derived
   values; (iv) Excel-paste lands as PLANNED/EXTERNAL, never as seam data; (v) no
   formula cells while formulas-OUT stands; (vi) plan-vs-actual honesty (no
   unaudited savings claims); (vii) no client-side plan persistence outside the seam.
   ⚠️ **(vii) IS ABOUT PLAN STATE AND NOTHING ELSE** (operator ruling A1-R4,
   2026-09-28, recorded in full at C6 §1): a per-seat grid LAYOUT — column order,
   width, hidden measures, sort, density — is **view** state and may be persisted, on
   the honest-read pattern with a reset control. A column width is not a truth about a
   material. Read as a ban on all client persistence, (vii) would forbid a planner
   keeping their own screen arrangement while doing nothing extra for plan integrity.
6. Browser QA before sealing visible UI; EN/ID from birth; DP-1/2/3 conformance.
7. Branch + PR + operator-approved merge (four-actor model) — unchanged.

---

## 6. Decision register (Stage G)

| ID | Decision | Status |
|---|---|---|
| G-PLACE | Stage G = I6 award-scenario implementation; priority after I3 closes | ADJUDICATED |
| G-KEYSTONE | PLANNED = orthogonal axis, not a registry tier; overlay never merged; push-only exit | ADJUDICATED |
| FORK-G1 | Grid engine + license posture + formulas IN/OUT | ⚠️ **RULED 2026-07-14 — `react-datasheet-grid` v4.11.6 (MIT), formulas OUT, no licence** (`docs/g0-2-engine-scorecard.md` §6.1). **CORRECTED 2026-09-28:** this row read *"OPEN — resolved by G0 scorecard (lean: AG Grid Enterprise, formulas OUT)"* for over a year — **both halves wrong in the same cell.** It was not open: the scorecard ruled it the day the row was written. And the *lean* it quoted is the option the ruling REJECTED, so the register named the losing engine as the outcome while `package.json` shipped the winning one. A pre-decision left in a status column reads as a decision, and this is the specimen. |
| **FORK-G1′** | AG Grid Enterprise, **two developer licences**, **installed by the SE Team AFTER handover (28 Oct 2026)**. Our Planning Grid is built on the engine already in the repository; the move is then an engine swap, not a redesign. Enterprise-grade features + the ARIA gap are the SE Team's. Licence-holder confirmation against the EULA is a named action for the Lead Engineer before install. | **RATIFIED — operator ruling 2026-09-28** (§3, G0.3). Does **not** reverse FORK-G1's reasoning; it adds an owner and a date. Our grid batches do not depend on the licence arriving |
| G-PRECOND | Build Plan branch merged to main before G0 opens | **SATISFIED 2026-07-14** — the Build Plan merged as PR #65 (`65edbde`) and G0.1 opened the next day as PR #67 (`dc059fc`). Carried as `OPEN — operator` for five weeks after the thing it gated had already run; corrected 2026-08-20. **Stage G is DORMANT at G1.3, not next** — see `CLAUDE.md` → THE RECALIBRATED PATH. |
