# IBP Supply Plan ↔ Procurement Platform / Supplier Portal — Seam Design Answers

**From:** IBP platform (SOMO / "Brain Engine") strategic seat
**To:** Supplier Portal / Procurement platform strategic seat (Ops Project #11)
**Date:** 2026-07-14
**Status:** Honest current-state answers. Read the liveness caveat (§0) first — it changes how you design the seam.

---

## 0. Read this first — the liveness caveat (do not design around a wire that isn't live)

Before the five answers: **SOMO Supply Plan today is a complete, honest, scaled *rehearsal* of a planning module, not a live emitter.** Its output contract is real and governed (Zod-typed, byte-reproducible), its optimizer actually runs (OR-Tools min-cost-flow, offline), and its worklist behaves exactly as the live system will. But **every external seam is `deferred`** — 30/30 seams in our register are named-but-not-wired. There is no running endpoint you can call today, no event on a bus, no S/4 write. Supply Plan currently reads seed/synthetic inputs and holds every decision in a session-scoped in-memory store (a restart reseeds the world).

**What this means for your seam design:**
- The seam we design is a **contract to build toward**, not a live integration you wire this quarter. Design the *shape* now; both sides implement when the durability + first-signal arcs land (our Phase 1–2, below).
- Do **not** assume Supply Plan can emit a PR today. It emits a *governed decision artifact in a rehearsal*. The emission-to-your-platform is itself one of the deferred seams (`order_creation`).
- The honest framing on our side is "seam built, store deferred." We label liveness explicitly everywhere; your seam should carry the same honesty (an inbound plan is `source: SOMO, liveness: <live|seed>` so your platform never presents a rehearsed plan as a real one).

With that established — the five answers, against our real architecture.

---

## 1. Supply Plan's output contract — the shape of the decision that lands on your doorstep

**What it emits:** a **Suggestion Order** worklist. Each line is a *recommended replenishment/procurement decision* for one planning node, derived from a min-cost-flow solve over the buffer/position picture.

**Grain (per line):** **material (SKU) × source→destination lane × segment × time context.** Concretely, each Suggestion Order line today carries:
- SKU (the material)
- Source → destination (e.g. Plant Cikarang → NDC Jakarta — a sourcing lane, not just a supplier)
- Segment (ABC-XYZ class — e.g. AX, BZ, CZ — governs the service/policy applied)
- Lead time (days)
- Deficit (the gap the order closes)
- Suggested qty (the recommended order quantity — the core number)
- Shortfall (unmet, when capacity-bound — currently structurally 0 on seed; see §caveat below)
- Adjusted qty (the planner's override of Suggested qty)
- Decision (accept / reject / adjust — the governed human decision)

**What KIND of output it is — this is the most important answer for you:** it is a **proposal, not a firm committed plan, and not a raw forecast.** Specifically:
- It is **recommend-first**. Supply Plan *suggests* a quantity; a human planner accepts/adjusts/rejects each line through a governed, audited decision path (reason-coded, one line at a time). Nothing auto-commits.
- The **committed artifact is the accepted decision**, not the raw suggestion. What should land on your doorstep is the *post-decision* line (accepted qty + who decided + reason), not the pre-decision suggestion. An un-accepted suggestion is not an instruction to procure.
- Grain is **planning grain** (SKU × lane × period), which maps to a **procurement requirement**, not yet to a PO. It's "we need this much of this material, sourced this way, by this time" — which is exactly PR-shaped, not PO-shaped (see §5).

**Honest caveats on the numbers you'd receive:**
- Today's solve models **in-transit = 0** and **capacity = unbounded** (both honestly labeled, both deferred harvests). So on current data the Suggested qty is *deficit-driven* but not yet *pipeline-aware or capacity-constrained*. When your real supplier lead times + our in-transit/capacity seams go live, the suggested quantities become constrained-real. Design for the constrained shape; know the current numbers are the unconstrained rehearsal.
- Quantities are governed and byte-reproducible, but **seed-illustrative** until live positions/lead-times wire in.

**Your seam should conform to:** the accepted-decision line (SKU × lane × segment × period × accepted-qty × decision-metadata), carrying an explicit `liveness` and `source` badge.

---

## 2. The IBP technical substrate — what you're integrating with

**Not SAP IBP (the SAP module). Custom build.** SOMO / "Brain Engine" is an **in-house IBP platform built over SAP S/4HANA** — Paragon-owned code, not the SAP IBP product. (We benchmark against SAP IBP conceptually, but we are not it.)

**How it relates to S/4HANA:** S/4HANA is the **system of record and execution layer**; SOMO owns the **planning brain** and treats S/4 as **execution-only** from its perspective. SOMO does not replace S/4 — it reads position/lead-time/BOM truth *from* S/4 and posts execution decisions *back through* S/4 (via the aATP boundary for promising, and via order-creation seams for replenishment). The locked topology:
- **SAP S/4HANA** — system of record, execution (you already know this layer; it's live for you since Jan 2025).
- **Snowflake** — the planning data warehouse / analytical layer (our durable write-store target).
- **AWS** — the compute / write-path / (future) agent-runtime home.

**This is the key structural finding for your seam:** **we share the same substrate you do.** You have S/4HANA (Event Mesh + OData) as SoR and Snowflake as analytical layer. So do we. That means the seam between us is **not net-new infrastructure** — it's most likely one of:
- **(a) an S/4HANA event boundary** (the one you've already specced) — SOMO's accepted replenishment decision posts to S/4, your platform picks it up via Event Mesh as a procurement requirement; or
- **(b) Snowflake-mediated** — SOMO's accepted-plan lands in a shared Snowflake table your planning layer reads.

Your hypothesis that "we may be the same architectural problem from two sides" is **substantially correct on substrate** — we both sit on S/4 + Snowflake. (§6 refines *which* of (a)/(b) is primary.)

---

## 3. Intended flow direction — both, but the primary is Supply Plan → Portal

**Primary: Supply Plan → Procurement** (the plan drives procurement). This is the "Sold One, Make One" pull thesis: true downstream demand → SOMO computes the replenishment/production requirement → that requirement drives procurement execution. So the primary flow is **SOMO emits a procurement requirement → your platform executes it** (PR → RFQ → PO → GR → invoice-match, your spine).

**Secondary (but architecturally essential): Procurement → Supply Plan** (execution actuals feed replanning). SOMO's whole discipline is a **closed learning loop** — it needs execution truth back to replan honestly:
- **Supplier lead times** (`supplier_lead_times`) — your realized PO→GR times are exactly what SOMO needs to replace assumed lead times. This is a *named SOMO seam currently deferred* and gated on your Supplier Portal maturing. **You are the system-of-record we're waiting on for this.**
- **Open-order / in-transit** — your PO pipeline is what closes our "in-transit = 0" gap.
- **RM/PM requirements** (`rm_pm_requirements`) — when we do BOM explosion (our Phase 4), the raw/packaging-material requirements land in your procurement domain.

So: **primary is us→you (plan drives buy); the feedback you→us (actuals drive replan) is what makes the loop honest.** Both are real; design the primary first, but reserve the feedback seam — it's on our roadmap as a dependency *on you*.

---

## 4. Shared master data — same S/4 master, with one honest distinction

**Same enterprise master data: yes.** Both SOMO and the Portal use **S/4HANA master data** — same vendor master, same material codes. S/4 + MDG is the enterprise system of record for master data; neither of us re-authors it. Material codes and vendor codes reconcile because they come from the same S/4 source. **No material/vendor-code reconciliation problem** — we're keyed on the same identifiers.

**The one distinction — SOMO owns *planning* master data:** SOMO authors a **planning layer of master data that S/4 does not hold**: segments (ABC-XYZ), buffer policies, service targets, planning lead times, decoupling points. This is *planning parameters*, not entity master — it does not conflict with your vendor/material master; it *annotates* it. SOMO exposes a **read-only conformed catalog** with source-system + sync-state badges (so consumers see "this material's planning segment is SOMO-authored; its material code is S/4-sourced").

**For your seam:** you and we agree on **S/4 material + vendor codes as the shared key** — that's the join. SOMO's planning attributes (segment, policy) ride along as annotations on the requirement if useful to your guided-buying, but they are not something you reconcile — they're SOMO-authored and read-only. **The reconciliation surface is minimal** precisely because we both defer to S/4 for entity master.

---

## 5. Where the handoff lands — Purchase Requisition, through your PR chain (your hypothesis is right)

**SOMO's accepted replenishment decision lands as a Purchase Requirement / Purchase Requisition — it flows into your PR → RFQ → PO chain, NOT as a direct PO.** This confirms your hypothesis and it's the correct grain match:

- SOMO emits **planning grain** — "we need N units of material M, sourced via lane L, by period P." That is definitionally a **requirement / requisition**, not a purchase order. It says *what's needed*, not *the committed order to a specific supplier at agreed terms*.
- The **PR → RFQ → PO** steps — supplier selection, terms, price, the commercial commitment — are **your platform's domain**, not SOMO's. SOMO should not emit POs; it lacks (and shouldn't own) the commercial/supplier-selection logic your spine encodes.
- So **the connection point is your PR state machine / guided-buying intake surface.** A SOMO accepted-decision line becomes a PR that enters your chain. Your guided-buying intake is likely the exact seam.

**One nuance on "supplier" in our output:** our Suggestion Order line carries a *source→destination lane* (e.g. Plant→NDC), which for internal replenishment is a plant/DC, and for external procurement resolves to a supplier. Where the source is an external supplier, that's a *suggested* source — your RFQ/supplier-selection may confirm or override it. SOMO proposes the lane; your procurement process owns final supplier commitment. So even the supplier dimension is **recommend-first** from us — it seeds your PR, it doesn't dictate your PO.

**Net:** SOMO accepted decision → PR (with SOMO material/qty/period/suggested-lane/segment annotations + liveness badge) → *your* PR→RFQ→PO chain owns it from there.

---

## 6. Existing integration contract / event schema — what exists, what doesn't

**Honest state:** SOMO has a **governed internal contract** for the Suggestion Order (Zod-typed, the grain in §1), but **no external-facing API surface or event schema is published yet** — because the emission seam (`order_creation`) is `deferred`. There is nothing live for you to conform to *today*.

**So the recommendation is co-design, not conform-to-ours:** since neither side has the wire live, we design the seam contract *together* now, and both implement toward it. Given the substrate match (§2), the seam is most likely:

- **Primary (us→you): an S/4HANA event boundary** — SOMO's accepted replenishment decision posts as a procurement requirement that your platform consumes via the **Event Mesh boundary you've already specced.** This reuses your existing machinery — your hypothesis holds. The accepted-decision → PR mapping (§5) is the transform.
- **Feedback (you→us): Snowflake-mediated** — your realized lead times / open-orders / GR facts land in the shared Snowflake analytical layer, where SOMO's replan reads them. This is our deferred `supplier_lead_times` / in-transit seams; you're the SoR.

**Your hypothesis, adjudicated:** *"the Supply Plan connection and our Grid may be the same architectural problem from two sides"* — **largely confirmed, with one refinement.** We are the same problem on the same substrate (S/4 + Snowflake, plan-then-execute). The refinement: SOMO's plan is **recommend-first and human-gated** — what crosses the seam is a *post-decision accepted requirement*, not a raw plan. Your platform should treat the inbound as "a governed procurement requirement that a planner accepted," carrying source + liveness badges, entering as a PR. If your planning-grid work already models "plan over live data → push into the command spine," then yes — **the SOMO seam likely reuses that exact intake path**, with SOMO as an external producer of accepted requirements alongside your internal grid.

---

## Summary — the seam in one paragraph

SOMO Supply Plan (custom in-house IBP over S/4 + Snowflake, *currently a deferred-seam rehearsal*) emits **recommend-first, human-accepted replenishment requirements** at **SKU × lane × segment × period** grain. These should land in your platform as **Purchase Requisitions entering your PR→RFQ→PO chain** (not direct POs — you own supplier selection/terms), keyed on **shared S/4 material + vendor codes** (no reconciliation problem; SOMO adds read-only planning annotations). Primary flow **SOMO→you** via the **S/4 Event Mesh boundary you've specced**; essential feedback **you→SOMO** (realized lead times, open orders, GR facts) via **Snowflake** — you are the system-of-record SOMO is waiting on for supplier lead times and in-transit. **Nothing is live today on our side**; we co-design the contract now and both implement toward it as our durability (Phase 1) and first-signal (Phase 2) arcs land. Carry explicit `source` + `liveness` badges across the seam so a rehearsed plan is never presented as a live instruction.

---

## The three things I need back from the Procurement seat

1. **Your PR intake contract** — the schema/shape your PR state machine / guided-buying intake accepts. SOMO's accepted-decision line will map to it; give us the target shape and we conform the emission.
2. **Confirm the Event Mesh boundary as the primary seam** — is the S/4 Event Mesh the intake path you want SOMO's requirements to arrive on, or do you prefer a direct Snowflake handoff for the plan (not just the feedback)? Your call shapes our `order_creation` seam.
3. **Your realized-lead-time / open-order data availability in Snowflake** — timing and shape. This is the SOMO seam gated *on you*; knowing when your Supplier Portal can land those facts in Snowflake lets us sequence our Phase 2 first-signal work against your maturity.
