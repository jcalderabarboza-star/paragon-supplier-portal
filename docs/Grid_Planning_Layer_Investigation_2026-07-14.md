# Grid / Planning-Layer Investigation — Seat 3, 2026-07-14 (ADJUDICATED)

**Status:** ADJUDICATED. Read-only strategic investigation (Seat 3) into a future
in-platform Grid / planning-layer primitive: plan on live platform data, execute
through the command spine. Grounded in three parallel sweeps (docs/specs corpus;
all 31 routed pages; architecture seams). The execution plan derived from this
investigation lives in `Stage_G_Grid_Planning_Layer_Plan_v1.md`.
**Operator directive (during investigation):** the Grid is a horizontal platform
primitive — everything operational eventually gets a plan layer, with Excel-grade
UI/UX as the target experience.
**Out of scope:** the desktop Excel add-in reaching into the platform (separate,
later, DPO-governed seam).

**Adjudications recorded:** (1) Stage G = the I6 award-scenario implementation,
priority build phase after I3 closes — §(b) confirmed; (2) the PLANNED-axis
boundary design — §(c) confirmed as the keystone; (3) engine lean = AG Grid
Enterprise, formulas OUT (honesty risk 5) — a lean the G0 spike confirms, not a
pre-decision (FORK-G1 remains open).

---

## (a) Planning-layer map across modules

The portal is almost entirely transactional. Full survey of all 31 routed pages:

| Module / surface | Today | Planning verdict | What offline Excel is forced to do |
|---|---|---|---|
| **Sourcing / RFQ award** (`BuyerSourcing.tsx`) | Quotation comparison matrix (criteria × quotes, AI column highlighted) but the decision collapses to **one radio pick** — no split award, no editable allocations, no saved scenarios | **Planning-shaped, not planning** | Award scenarios, split-quantity allocation, weight sensitivity |
| **Goods receipt** (`GRInspectionWizard.tsx`) | Per-line editable qty-received/accepted + live derived header disposition before commit | **Strongest existing compose-then-commit pattern** (per-document only) | — (pattern exists; scope is one GR) |
| **PO confirmation** (`SupplierOrders.tsx`) | Per-line editable `confirmedQuantities` with live deviation warning; the **only per-line-array verb in the spine** (`t_po_confirm`) | Partial planning affordance | — |
| **Requisitions / intake** (`BuyerRequisitions.tsx`) | Single-material, single-document create form | Transactional only | Any multi-item demand plan / basket composition |
| **Inventory** (Buyer/Supplier) | Read-only; safety stock & reorder point are display labels | None | Replenishment planning, reorder quantities |
| **Spend / analytics** (`BuyerAnalytics.tsx`) | Read-only dashboard, pre-aggregated | None | Budget planning, category what-if |
| **Forecast / demand / capacity** | **Does not exist anywhere** | None | The entire activity |
| Orders, invoices, shipments, contracts, compliance, risk, scorecard, discovery, marketplace, WhatsApp | View + single-action verbs; all create-forms are single-document (ASN wizard even uses only `lineItems[0]`) | Transactional only | Anything multi-row |

Two structural absences: there is **no row-multiselect / bulk-edit pattern anywhere**
(`BulkActionsBar` is a misnomer — a page-header button cluster with no selection
model), and **no scenario/what-if/draft-comparison surface anywhere**. The docs
corpus confirms this is greenfield vocabulary: zero hits for
grid/what-if/plan-then-execute; "spreadsheet" appears only as the thing the platform
replaces ("Track R becomes a platform capability, not a spreadsheet").

## (b) First anchor: I6 award-scenario — confirmed [ADJUDICATED]

**I6 is already specced as a tabular planning surface, and it is the right first
anchor.** The documentary basis is explicit:

- The Build Plan's integration-seam register: *"Award optimization solver (A4/I6) |
  scenario model → solver → award recommendation | **Evaluate buy** (Keelvar-class);
  **build the scenario UI**"* — the division of labor is already ruled: the platform
  builds the scenario surface, the solver is bought.
- I6's named leave-behind primitive is the **"Award-scenario seam"**; the
  Benchmarking doc's competitive bar is "the platform models thousands of award
  scenarios against cost, capacity, risk, ESG, delivery constraints — not a single
  best-bid-wins approach."
- Fixture-first surfaces for I1–I6 are sanctioned **in parallel with F1–F3**; the
  Live flip waits on Stage F.

Why I6 wins over the alternatives: the RFQ/quotation machines are **already wired**
(in `WIRED_COMMAND_TARGETS`), the award cascade (`t_rfq_award` → winner awarded,
siblings rejected, `causationId`-grouped) is the platform's most mature execution
path, and the comparison-matrix UI already exists to evolve. The Grid's first
push-to-execute loop works end-to-end **today** with zero new verbs.

**The caveat:** honest I6 depth is prerequisite-heavy. Quotations have no line items
and award is whole-quote to one supplier — split-award needs a new verb +
quotation-line model. Quote scores (`priceScore`, `aiCompositeScore`…) are
fixture-authored; F0.3-FIND-01 rules they can't be honestly computed until an
I2-class scoring primitive lands. So the first anchor grid plans over what exists
(compare, weight-sensitivity what-if, single-select award) and stays marked
SIMULATED; split-award scenarios are a later phase.

Runner-up worth noting: the **PO-confirmation grid** is the cheapest genuine live
loop (its per-line verb already exists) and should ride early as the second proof —
but it's supplier-side, single-document, and low planning value, so it's a
validator, not the anchor. Requisition-intake (multi-line demand planning) is the
highest-pain gap but its PR machine is authored-unwired — per FORK-2, its verbs get
wired when its grid surface is built, which slots it naturally as the first rollout
after the anchor.

## (c) The SIMULATED-until-executed boundary [ADJUDICATED — the keystone]

The core design insight from the seams sweep: **"planned" is a new, orthogonal
axis — not a new LivenessRegistry tier.** The registry answers *"is this data source
real?"* (per-capability, two-gate: CommandTarget wired AND real data landed). A
planned cell answers *"is this value committed or proposed?"* (per-cell/per-row).
Conflating them would corrupt the registry's single purpose. So:

1. **A plan is a first-class client-side document (`PlanDraft`), never row data.**
   Planned values live in a dedicated plan store **outside the TanStack Query
   cache**, are never written through `IDataService`, and are **never merged into
   seam-backed row arrays**. The codebase already contains the exact anti-pattern to
   outlaw: `BuyerSourcing`'s `extraRfqs` fabricates local RFQs
   (`rfq-new-${Date.now()}`) that render indistinguishably from seam-backed rows and
   vanish on remount. The Grid doctrine makes that structurally impossible: the grid
   renders `seamRow + plannedOverlay`, and the overlay is always visually and
   programmatically distinct.
2. **Three provenance classes per cell**: source-LIVE (registry green),
   source-SIMULATED (registry amber — the existing `LivenessPill` per capability),
   and **PLANNED overlay** (new marker: a StatusPill variant + distinct cell
   treatment for locally edited, not-yet-dispatched values). A plan-level banner
   states "N planned changes — not committed until pushed."
3. **Push-to-execute is the only exit from PLANNED.** "Push plan" iterates planned
   rows → real `svc.commands.dispatch(scope, {transitionId, entity, entityId,
   payload})` calls → the full validation pipeline (scope, role, legality,
   requiredFields, policy) and DR-10 audit run for free → `onSuccess` invalidation
   re-reads the seam → the overlay clears because the seam now agrees. Failures stay
   PLANNED with the `failed` reason attached. No optimistic writes, no `onMutate` —
   consistent with the existing "pages hold no local seeded copy" rule.
4. **Audit-of-why**: group a plan push under one correlation using the existing
   `causationId` mechanics (precedent: the award cascade), and carry the plan
   rationale in payloads. Long-term (phase G2), `Plan` itself becomes a canonical
   entity with its own lifecycle machine (Draft → Pushed → Settled) so the "why" is
   durable platform state — this is what actually kills the "lost audit-of-why"
   Excel failure.
5. **Two-gate discipline holds** (LIVENESS-DATASOURCE-01): a grid dispatching real
   commands over simulated data must still render SIMULATED — gate-1 wiring never
   flips green alone. And no derived value (score, should-cost, solver
   recommendation) is ever minted client-side and presented as real.
6. **No localStorage plan persistence** in early phases — the codebase deliberately
   deleted its localStorage overlays in favor of the command spine; reintroducing
   one would regress that. Session-memory first, real Plan entity later.

## (d) Buy-vs-build lean: buy the engine, build the seam

The docs precedent generalizes cleanly: *solver = buy, scenario UI = build*. The
grid **engine** (virtualized cells, range selection, fill handle, clipboard/
Excel-paste fidelity, formula support, keyboard model) is the same class of problem
as the solver — a deep, non-differentiating engineering well. The **seam** (plan
store, provenance overlay, LivenessPill integration, dispatch push, DP-3 theming) is
exactly the differentiating part and must be built. Nothing exists in-repo to lean
on: no TanStack Table, no grid lib, no form/state library — the engine decision is
unconstrained by sunk cost.

Options, against the "Excel UI/UX total experience" bar:

| Option | License | Excel-UX fidelity | Notes |
|---|---|---|---|
| **AG Grid Enterprise** | Commercial (per-dev) | Very high (range selection, fill handle, clipboard, aggregation) | Industry default for this exact job; heavy bundle; themeable to DP-3 |
| **Handsontable + HyperFormula** | Commercial | Highest (it *is* a spreadsheet UX, real formula engine) | The purest "Excel total experience"; license cost; React wrapper mature |
| **AG Grid Community** | MIT | Medium | No range selection/fill handle — misses the stated bar |
| **Glide Data Grid** | MIT | Medium-high perf, low editing affordance | Canvas-based; editing/clipboard largely DIY |
| **Univer** | Apache-2 | High (full spreadsheet) | Young ecosystem; heavy; whole-app-in-a-canvas risk vs composing into DP-3 pages |
| **TanStack Table + Virtual (headless, build cells)** | MIT | Whatever we build | Aligns with TanStack investment, full DP-3 control — but Excel-grade interactions are multi-batch engineering; contradicts the buy-the-well doctrine |

**Lean [ADJUDICATED as lean, confirmed by G0 spike]:** commercial engine —
**AG Grid Enterprise, formulas OUT** ("Excel-grade editing over structured rows";
formulas stay out per honesty risk 5). **Handsontable + HyperFormula** is the
challenger if the bar is truly "formulas in-grid" AND the spike shows they can be
honesty-contained. A one-batch spike bake-off of the two against fixture quotation
data (DP-3 theming, EN/ID, a11y, bundle impact, license terms, honesty containment)
is the adjudication artifact for FORK-G1. This is a platform-wide engine choice, so
it gets the spike before commitment.

## (e) Honesty risks

1. **PLANNED masquerading as committed** — the `extraRfqs` precedent proves the
   failure mode is live in this codebase today. Mitigation is structural (overlay
   never merged into seam rows), not stylistic.
2. **Gate-1 illusion** — a grid that *executes* real commands feels live; its *data*
   may still be fixtures. The pill must derive from the registry, never from "the
   buttons work."
3. **Fabricated derived values** — what-if recomputation (re-weighted scores,
   projected totals) is client math over possibly-synthetic inputs; every derived
   column needs provenance marking, per F0.3-FIND-01.
4. **Excel-paste ingestion** — pasted external data entering the grid is
   un-provenance'd; it must land as PLANNED (or a distinct EXTERNAL marker), never
   as seam data.
5. **Formula cells** — a formula result is user-authored math rendered next to
   platform truth; this argues for structured editing over full-spreadsheet
   formulas, or explicit formula-cell marking. [Basis of the formulas-OUT lean.]
6. **"Screen savings"** — the Benchmarking doc quotes Jaggaer's own warning that
   scenario tools produce savings that never materialize; plan-vs-actual (settle)
   reporting should be in scope by G2, not bolted on.
7. **Process risk** — `Paragon_World_Class_Build_Plan_v1.md`, the canonical forward
   plan every doc points to, is **not on main** (docs-only branch
   `plan/world-class-build-plan-v1`; clean single-file merge per the 2026-07-14
   fact-find). A Grid phase would amend a plan that isn't on `main`. Resolve before
   G0 (Stage G precondition G-PRECOND).
