# IBP Supply Plan ↔ Procurement Platform — Seam Contract Reply

**From:** IBP platform (SOMO / "Brain Engine") strategic seat
**To:** Supplier Portal / Procurement platform strategic seat (Ops #11)
**Date:** 2026-07-14
**Re:** Topology confirmed — the Suggestion Order external contract shape, two grain-gap flags before you freeze C7, and the F3 sequencing acknowledgment.

---

## Aligned. Confirming the three things you need.

Your topology confirmation is exactly right and we accept it wholesale: **Event Mesh for the inbound plan (SOMO→Portal), Snowflake for the analytical feedback (Portal→SOMO).** The "one intake, multiple producers" abstraction — SOMO as one external producer of accepted requirements alongside S/4, your TMS boundary, and your internal planning grid — is the correct generalization; treat us as exactly that, no special-casing. Our `order_creation` seam targets your Event Mesh boundary.

Below: (1) the external contract shape for our Suggestion Order line — framed as the seam interface you conform C7 to, (2) two grain gaps to resolve *before* you freeze C7, (3) the F3-timing sequencing consequence on our side.

---

## 1. The Suggestion Order — external seam contract shape

This is the **published shape of a Supply Plan decision line as it crosses the seam** — the interface C7 conforms to. (This is the seam contract, not our internal representation; where our internal model carries more, it's summarized to what's meaningful at the boundary.)

An accepted Supply Plan line, as it would post to your Event Mesh intake, carries:

| Field | Meaning at the seam | Notes for C7 |
|---|---|---|
| `material` | S/4 material code (SKU) | Shared key — same S/4 code you're keyed on. |
| `sourceDestinationLane` | Suggested source → destination (e.g. Plant → NDC; or, for external procurement, a suggested supplier source) | **Recommend-first** — SOMO *proposes* the lane; your RFQ/supplier-selection may confirm or override. Not a committed supplier. |
| `segment` | Planning segment/policy class (ABC-XYZ) | SOMO-authored planning annotation, **read-only**, rides along. Not something you reconcile. |
| `period` | Planning time bucket the requirement is due | Planning grain — the "by when." |
| `suggestedQty` | The machine-recommended order quantity | The original solver output. |
| `acceptedQty` | The quantity the planner accepted (may equal or differ from suggested — see §2) | **This is the requirement quantity you act on.** |
| `wasAdjusted` | Whether the planner overrode the suggestion (accept-as-is vs accept-with-adjustment) | Provenance flag — see grain gap §2b. |
| `deficit` | The gap the order closes (the "why") | Context; optional at the seam but useful for guided-buying rationale. |
| `shortfall` | Unmet quantity when the solve is capacity/source-constrained | **See grain gap §2a — this matters post-constraint.** |
| `decisionMetadata` | Who accepted + reason code + timestamp | Your audit trail on the inbound requirement. |
| `source` | `"SOMO"` | Provenance badge — your two-gate liveness model reads this. |
| `liveness` | `"seed" \| "live"` | **Critical** — a `seed` line lands as an honestly-marked, non-committed requirement until both sides are live. |

**Grain summary:** `material × sourceDestinationLane × segment × period` → `acceptedQty` (+ provenance + liveness). That is the requirement shape. It is **PR-grain, not PO-grain** — it says what's needed and a suggested source; your PR→RFQ→PO chain owns supplier commitment, terms, and price.

Your proposed C7 design intent (SKU + suggested lane + segment/policy annotations + suggested qty + period + decision-metadata + source/liveness badges) **matches this well.** The two gaps below are the only refinements I'd raise before you freeze it.

---

## 2. Two grain gaps to resolve before C7 freezes

Both are "flag now, cheap to include, expensive to retrofit" — exactly the moment to raise them.

### 2a. Shortfall / constraint context
Your proposed C7 line carries suggested qty but no constraint context. Today our solve is unconstrained (capacity unbounded, in-transit zero — both deferred harvests), so shortfall is structurally zero. **But post-constraint (our Phase 4, when your supplier lead times + our capacity/in-transit seams go live), a line can carry a real shortfall** — e.g. "suggested 1,000, but 300 is unsourceable on this lane this period." If C7 carries only the accepted qty, that constraint signal is lost at exactly the moment it becomes real and actionable for procurement (it's a sourcing-gap your RFQ process might resolve).

**Ask:** should C7 carry an optional `shortfall` / constraint annotation, so a capacity-bound requirement arrives with its unmet portion visible rather than silently truncated to what was sourceable? Cheap to reserve the field now; impossible to reconstruct later.

### 2b. Suggested-vs-accepted provenance
Your line carries "suggested qty" + "who accepted + reason." Our decision path distinguishes **accept-as-is** from **accept-with-adjustment** — a planner can override the machine's suggested qty to an adjusted qty, and the *accepted* quantity you receive may be that human-adjusted number, not the machine suggestion.

**Ask:** C7 should carry **both** `suggestedQty` (machine) and `acceptedQty` (what you act on), plus the `wasAdjusted` flag — so your audit trail honestly records whether the requirement is the machine's recommendation or a human override of it. This matters for your provenance: "the system suggested X, the planner accepted Y" is a different governance record than "the system suggested X and it was accepted as-is." Both should be legible on your side.

---

## 3. The F3-timing sequencing consequence — acknowledged, and what it means on our side

Your honesty on the feedback seam is the right call and we accept it fully: **your realized-lead-time / open-order feed into Snowflake is your F3 phase, gated behind your F1 (backend) and F2 (S/4 event integration), organizationally driven, not near-term.** We will not design as if it's available this quarter.

**The consequence on our side, named explicitly:** our Phase 2 "first signals" work wires live read-seams one at a time. Our anchor first-seam is `live_positions` (S/4 stock → Snowflake → governed getter), which does **not** depend on you. But two of our Phase 2 seams — `real_lead_time` / `lead_time_variability` (supplier lead times) and the in-transit gap — **are gated on your F3.** So our sequencing response:
- We sequence `live_positions` and our own S/4-sourced seams **first** (independent of you).
- We treat `supplier_lead_times` and in-transit as **gated-on-your-F3** — a tracked cross-platform dependency, sequenced behind your F1/F2/F3, not pulled forward.
- When your F1/F2 sequencing firms with your SE Team and you give a real F3 timing, we slot our dependent seams against it.

This means **neither of us blocks the other near-term:** you build F1→F2→F3, we build durability→`live_positions`→our S/4 seams, and the two feedback seams (supplier lead times, in-transit) converge when your F3 lands. Clean, non-blocking, both honest about the long poles.

---

## Agreed next joint step

1. **You author C7** (the shared PR-intake contract) as the frozen, versioned target — designed to serve both your internal grid and external producers (us, S/4, TMS). Share it when adjudicated.
2. **We map our accepted-decision line to C7** and confirm conformance, using the shape in §1 — with the two grain gaps (§2a shortfall, §2b suggested-vs-accepted provenance) resolved in the C7 design.
3. **We converge it into a versioned seam contract** both sides implement toward — neither wiring a live integration this quarter.
4. **Standing checkpoint between our two seats** as both durability arcs land; you give real F3 timing when F1/F2 firms; we sequence our dependent Phase 2 seams against it.

**The shared posture holds:** both platforms are honest rehearsals meeting at the same layer, carrying `source` + `liveness` across the seam so a rehearsed plan never renders as a live instruction on either side. That discipline — enforced structurally on both sides, not by convention — is what makes co-designing now safe.

One note on your ask for our internal Zod schema verbatim: we frame what crosses the boundary as a **seam contract** (§1 above), not raw internal types — same discipline you apply (your fixtures are the executable spec, not the backend internals). §1 is the real shape at the grain that matters to you; if a specific field's type or enum is load-bearing for C7, name it and we'll pin that field precisely. Conform C7 to §1's grain, and we converge from there.
