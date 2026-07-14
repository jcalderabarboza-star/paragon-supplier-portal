# Paragon Procurement & Supplier Portal Platform
## Strategic Spine v1 — The Brief for the World-Class Build Plan

**Purpose.** This is the *strategic spine* — the synthesis that sits between (a) the 2026 competitive-frontier research, (b) the current-state census of the codebase, and (c) the operator's three-part north star. It is the authoritative brief from which the executable, repo-grounded build plan is produced. It contains the *what, why, in what order, and to what bar* — not implementation detail (batch structure, file paths, sizing), which is the executable plan's job.

**Audience.** Two readers: the code-generation seat (Fable 5) that turns this into the executable build plan, and the SE Team that will build the real backend against the contracts this platform defines.

---

## 1. The North Star (non-negotiable design axioms)

Every decision in the build plan is judged against three axioms. They are ranked; when they conflict, higher wins.

**Axiom 1 — Adaptive.** The platform bends to Paragon, not the reverse. The build-over-buy thesis made concrete: a configurable engine (data model + workflow) that fits Paragon's actual process — direct-materials-heavy, 95% imported inputs, halal-first, SAP S/4HANA system-of-record, Snowflake analytics. We are not replicating Coupa/Ariba's opinionated process and forcing Paragon into it.

**Axiom 2 — Best-practice-guiding.** The platform teaches Paragon. Adaptivity without opinion lets bad habits persist. The resolution the research confirms: **configurable underneath, opinionated on the surface.** The compliant, preferred, pre-negotiated, halal-certified path is engineered to be the path of least resistance (guided buying, positive nudging), with an "advanced" escape hatch for genuine edge cases. Authoritativeness through guidance, not prohibition.

**Axiom 3 — Extensible ecosystem.** The platform grows for years without rebuilds. New capabilities plug into stable, documented seams rather than requiring surgery. This is where the existing architecture already excels (canonical state machine, DR-10 event taxonomy, `IDataService` abstraction) — the plan must *protect and extend* these seams, and every new module must establish a reusable primitive, not just a feature. A commodity-price feed is not a feature; it is a **data-feed primitive** that later powers finance, risk, and AI. Robustness comes from this compounding.

**Cross-cutting discipline — Honest-by-construction.** Already load-bearing (`live=false` cannot render a green pill; "Sample data" markers). This is the credibility mechanism that lets Paragon demo a fixture-backed platform to executives and the SE Team *without lying about what's real*. It survives every phase. When the backend lands, honest-by-construction is what proves each capability went from simulated to real, one seam at a time.

---

## 2. The Central Reframe: The Frontend Is The Specification

Census ground truth: the platform is a frontend on fixtures — no backend, no data warehouse, no live SAP/Snowflake. The naive reading is "it's a prototype." The correct reading, given that **the SE Team builds the backend**, is:

> **The fixture-backed frontend is the executable specification the SE Team builds against.**

Every fixture is a data contract. Every `IDataService` method signature is an API contract. Every DR-10 event is an integration event contract. Every state-machine transition is a business-rule contract. The platform *proves the behavior in simulation first*; the SE Team implements a real backend satisfying the same contracts; `httpDataService` drops into the existing seam without touching the pages.

**Consequence:** the plan is not only "what to build in the frontend." It is equally "what contracts to specify so the SE Team builds exactly the right backend." The highest-value artifacts of this arc:
- **Data contracts** — entity schemas, the shape of every read/write (landing in Snowflake and S/4HANA).
- **Event contracts** — the S/4HANA event-driven surface (what the platform consumes/emits, in DR-10 shape).
- **API surface** — `IDataService` fully specified (every method the real backend implements).
- **Integration seams** — S/4HANA via Event Mesh + OData; Snowflake as analytical layer; external data feeds; the AI layer.

This is why "full ambition, all three stages" is the right scope: the SE Team needs the *whole* target to build a backend that won't need re-architecting when Stage 3 arrives. We specify the destination; we sequence the journey.

---

## 3. The Three Stages (the shape to sequence)

Universal 2026 truth from the research: **data before intelligence before agents.** This is the master ordering; everything respects it.

### STAGE 1 — FOUNDATION: The Governed Data & Integration Backbone
*The gating long pole. Nothing world-class is possible without it. Where the SE Team's work concentrates.*

The moat is not the AI; it is the clean, unified data layer beneath it.

- **The real backend**, implementing the fully-specified `IDataService` contract. `httpDataService` replaces the mock behind the existing seam; pages don't change. Persistence, cross-session state, real auth (OIDC), multi-tenant scoping enforced server-side (today client-side).
- **S/4HANA event-driven integration.** The composable-stack pattern: S/4HANA emits business events (PO released, GR posted, invoice cleared) via SAP Event Mesh / Integration Suite; the platform consumes a minimal payload, then calls back OData for detail — never brittle transactional coupling. The DR-10 taxonomy is *already shaped for this*; Stage 1 makes it durable and bidirectional.
- **Snowflake as the analytical/intelligence foundation.** Not transactional — the warehouse where classified spend, resolved vendor master, and BOM linkage land. Everything in Stage 2 reads from here. Governance in-account (Cortex-style) so data never leaves.
- **Data-quality prerequisites** (research names these non-negotiable): spend classified to L3+, vendor master de-duplicated/entity-resolved, BOM linkage established. *An agent on unclassified data is worse than no agent.*

**Exit bar:** 90%+ spend classified to L3; vendor master de-duplicated; live PO/GR/invoice flowing from S/4HANA into the platform and Snowflake. Honest-by-construction proof: "Live" markers turn on, seam by seam.

### STAGE 2 — INTELLIGENCE: The Capabilities That Make Users Efficient
*Turns data into decisions. Where "world-class" becomes visible to users.*

Each capability is both a feature *and* an ecosystem primitive (Axiom 3). Sequenced by Paragon-specific value:

- **AI spend analytics & classification** — auto-classify direct + indirect to L3+, continuously learning against a Paragon taxonomy. *Primitive: the classification engine + taxonomy every downstream analysis reuses.*
- **Should-cost & commodity/FX intelligence** — highest-value given 95% imported raw materials. Link cost elements to live market indices (external feed) + FX; index moves → models update, alerts fire. *Primitive: external-data-feed + should-cost engine — later powers finance and risk.*
- **Supplier risk + compliance intelligence** — continuously-scored supplier 360 (financial health, sanctions, concentration) **and** halal/BPOM/ISO certificate lifecycle at supplier *and raw-material* level. Track R becomes a platform capability, not a spreadsheet. *Primitive: risk-scoring + certificate-lifecycle engine.* **Carries the hard 17 Oct 2026 deadline — see §5.**
- **3-way match automation + Indonesian e-Faktur/e-invoicing** — touchless match on the existing PO→GR→Invoice spine (the seam is already authored-unwired in the codebase). *Primitive: the match/exception engine — foundation for finance intelligence.*
- **Guided-buying intake layer** — the opinionated surface (Axiom 2) made real. Single front door routing to preferred/contracted/halal-certified suppliers with positive nudging. *Primitive: the intake/orchestration router — foundation Stage 3 agents plug into.*
- **Direct-materials / BOM-linked sourcing** with award-scenario optimization — the manufacturer-specific depth generic P2P underserves.

**Exit bar:** should-cost baselines on top raw-material categories; automated match rate >70%; halal expiries auto-tracked ahead of mandate; guided buying live with best-practice defaults.

### STAGE 3 — AGENTIC & ADVANCED: Intelligent Orchestration
*The 2026 frontier — approached with discipline, not hype.*

Research is sobering: 40%+ of agentic projects cancelled by 2027; ~8% deployment maturity. Stage 3 is **selective, bounded, audited, human-in-the-loop.**

- **Procurement copilot** — conversational navigation/summarization over now-clean data ("AI is the new UI"). Safest, highest-adoption entry.
- **Document intelligence** — invoice/contract extraction (Rossum / Icertis-Vera pattern) feeding match and CLM.
- **A few bounded task-specific agents** — bid comparison, supplier discovery, intake triage — each with kill-switch, audit trail, *demonstrated-ROI-before-widening* gate.
- **Advanced levers, buy-vs-build evaluated:** combinatorial/expressive award optimization (or integrate Keelvar-class), dynamic discounting / supply-chain finance, n-tier ESG, full CLM (likely buy/integrate).

**Discipline:** every agent shows measurable value + clean audit before autonomy widens. Composable seams (Axiom 3) mean best-of-breed AI/optimization/risk feeds are *bought and plugged in*, not all rebuilt.

**Exit bar:** demonstrated ROI + audit on each deployed agent; the platform is a robust, extensible ecosystem where new capability plugs into stable seams.

---

## 4. Cross-Cutting Principles (every stage)

1. **Data before AI** — never ship intelligence on unclassified data.
2. **Composable seams** — clean APIs/events so best-of-breed feeds are bought, not rebuilt.
3. **Configurable engine, opinionated surface** — guided-buying philosophy, everywhere.
4. **Compliance as core** — halal/BPOM/ISO are first-class data objects with lifecycle, not attachments.
5. **Honest-by-construction** — survives every phase; proves simulated→real, seam by seam.
6. **Bilingual EN/ID + mobile-first** — matches the existing spine.
7. **The frontend is the SE Team's spec** — every fixture/method/event is a contract; document contracts as first-class deliverables.

---

## 5. The One Thing That Doesn't Wait: Track R (Halal)

Independent of the staged build, one lane has a **real, external, already-passed tripwire and a hard legal deadline: 17 Oct 2026** (Gov't Reg. 42/2024, BPJPH; mandatory halal certification for cosmetics). The census found Track R *cold* — R0.1–R1.5 NOT STARTED, four operator decisions (D-CAL/D-STAFF/D-SAP/D-DPO) OPEN, harvest tripwire (12 Jul) passed.

**Firewalled from the code spine** — operator-side certification/harvest work, not a frontend feature. But it is **the highest-urgency item on the board, in parallel with everything above.** The Stage 2 certificate-lifecycle capability *depends on* the harvest and decisions happening now. The build plan treats Track R as a parallel operator lane with its own clock, feeding the Stage 2 compliance-intelligence primitive.

---

## 6. What The Executable Plan Must Produce

1. **A re-baselined ledger** — census found CLAUDE.md stale ("Next: Step 3" while actually deep in Phase 3′). First act: stamp reality, correct the pointer.
2. **A dependency-sequenced roadmap** — three stages → phases → atomic, independently-green batches, respecting "data before intelligence before agents," backend/data-layer critical path explicit.
3. **The SE Team contract package** (Stage 1 especially): the fully-specified `IDataService` API surface, entity/data schemas, S/4HANA event contracts (DR-10 shape), Snowflake data-layer spec, integration seams. *Arguably the highest-value artifact of the whole arc.*
4. **Per-capability primitive definition** — for each Stage 2/3 capability, name the reusable primitive it establishes (Axiom 3), so the ecosystem compounds.
5. **Effort/sizing + sequencing** — grounded in the actual codebase seams the census named (authored-unwired logistics verbs, the GR→invoice-match cascade, the `IDataService` swap-point), so estimates are real.
6. **The honest-by-construction migration path** — how each capability goes simulated→real as the backend lands, seam by seam, with "Live" markers as proof.

---

## 7. Non-Goals / Cautions (keep the plan honest)

- **Do not over-index on agentic AI.** Hype-driven, low maturity, high cancellation. Stage 3 is disciplined and bounded. The value is in Stages 1–2.
- **Do not treat vendor metrics as truth.** Savings %, ROI, cycle-time claims are self-reported marketing — directional, not promises.
- **Do not build what's better bought.** Full CLM, external price-index data, supplier-risk feeds, possibly award-optimization — build the seam, buy the feed.
- **Do not let the demo outrun the truth.** Honest-by-construction is the guardrail: an impressive fixture-backed demo is fine *because it's marked simulated* and *is the SE Team's spec*. It must never claim live when it isn't.

---

*Synthesizes: the 2026 competitive-frontier research (Coupa, Ariba, Zip, Keelvar, Jaggaer, Ivalua, GEP, Fairmarkit, et al.), the current-state census (command spine complete, backend greenfield, Track R cold), and the operator's three-part north star (adaptive / best-practice-guiding / extensible-ecosystem) under the reframe that the frontend is the SE Team's executable specification. It is the authoritative brief for the executable build plan.*
