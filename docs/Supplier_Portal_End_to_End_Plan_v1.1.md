> **SUPERSEDED by Revised Build Plan v2.1** (`docs/Supplier_Portal_Revised_Build_Plan_v2.1.md`). Retained for history. Note: this file was previously misnamed `Supplier_Portal_Current_State_of_Truth_v1.md` — it contains Build Plan **v1.1**, not a Current State of Truth (see `docs/findings.md` DOC-02).

# Supplier Portal — End-to-End Build Plan

**Version:** 1.1
**Date:** 2026-07-01
**Owner:** JJ (VP SCM Digital Transformation, Paragon Corp)
**Project:** Ops Project #11 — Global Supplier Portal Platform (Paragon Odyssey)
**App repo:** `github.com/jcalderabarboza-star/paragon-supplier-portal` @ `main` (HEAD `f78581d`)
**Built on:** `Supplier_Portal_Current_State_of_Truth_v1.md` (the factual ground) · `Supplier_Portal_Vision_and_Roadmap_v1.md` (the North Star) · `Platform_DNA_Universal_Principles_v1.md` (the blueprint) · `Global_Supplier_Portal_Platform__Build-over-Buy_Analysis.md` (the strategic thesis)
**Status:** FACT-CHECKED — pending JJ ratification of the Decisions Register. Once ratified, this is the build spec.

**v1.1 changes (from CLI read-only fact-check against HEAD `659ebf6`):** (1) Batch 1.1 split into 9 truly one-step B-pages vs. 4 that need a service method built first; the 5 mixed supplier B-pages flagged as carrying a C-legacy tail. (2) Batch 2.2 narrowed — only ~23 of the 34 H-class actions share the export pattern; the other ~11 are creation/config/relationship/sync verbs rerouted to the command layer or create-wizards. (3) Phase 3 · P3 notes the two-source compliance-data reconciliation. (4) Added Part H — the code-verified module-by-module map. The CST baseline (A=0 / B=13 / C-legacy=13 / C-inline=4) re-verified byte-for-byte; PO-confirm first-target and type-cleanup ordering confirmed unchanged.

---

## PART A — ORIENTATION

### A.1 The three-sentence situation

The spine is one-third real: identity (1A) is complete and intact; the data layer (1B) has its full foundation built but **zero of 30 pages consume it**; the action layer (1C) does not exist, leaving **98 dead actions**. The forced dependency order is therefore unchanged from the Vision — finish the data layer by migrating the pages onto it, build the action layer the dead buttons call, then wire the five feature pillars onto the completed spine. The one hard external constraint is the **halal compliance deadline of Oct 17, 2026**, which pulls the Compliance pillar (P3) forward in the sequence regardless of its intrinsic leverage ordering.

### A.2 What "done" means (the vision, compressed)

Every screen transacts; the procurement lifecycle flows end-to-end (Discovery → RFQ → PO → ASN → GR → Invoice → Payment); each supplier sees only their own data (scoping structural, not per-page); the differentiating layers (WhatsApp-native, halal compliance) actually function; and all of it sits behind service interfaces so the real SAP/NestJS backend drops in as an adapter, not a rewrite. The platform is honest-by-construction throughout — no screen implies a capability it lacks.

### A.3 The two principles this plan serves

Every sequencing choice below descends from the two crown principles:

- **Platform-vision-not-app-vision** — we finish the *substrate* (spine) before the *features* (pillars), because the pillars are wirings of the spine, not separate builds. Reverse the order and every pillar re-implements scoping, mutation, and identity locally — compounding structural debt.
- **Honest-by-construction** — the 98 dead actions are not "bugs to hide" but the honest inventory of what is deferred. As each becomes real it is wired to a real operation; until then it is named as deferred. No dead button is dressed up as live to demo well.

---

## PART B — THE DECISIONS REGISTER (ratify before build)

Five open decisions from the Current State of Truth. Each carries a recommendation; JJ ratifies. These are the pre-locks that compress the build — resolving them now avoids per-batch re-litigation.

| ID | Decision | Recommendation | Rationale |
|---|---|---|---|
| **D-1** | Canonical deploy target | **Vercel only.** Retire the committed GH-Pages root artifacts (`index.html`, `assets/`) and the CLAUDE.md build-copy-push flow. Keep `vercel.json`. | Vercel is the live Preview the QA harness already targets; the committed root artifacts carry the wrong base path and are dead weight. One target = one truth. |
| **D-2** | Test runner adoption | **Add Vitest now, before the hook migration.** Establish the test floor as the first batch of Phase 1B-continued. | The migration touches all 30 pages — the ideal moment to start a non-regressing floor is *before* the churn, so each migrated page lands with a smoke test. The DNA's test-ratcheting principle cannot engage with 0 tests. |
| **D-3** | 1B migration ordering | **B-pages first (13, one-step), then C-legacy (13, two-step), then C-inline (4).** | Bank the fast wins (fixture already relocated + service method exists → pure hook-wire), build rhythm and the migration pattern, then take the harder relocations. Momentum + proven pattern before difficulty. |
| **D-4** | Branch policy (CLAUDE.md conflict) | **Reconcile CLAUDE.md to Working Rules: branch + PR + JJ-merge.** Delete the "direct to main, no PRs" instruction. | CLAUDE.md is stale (it predates the four-actor model). Direct-to-main is a lane breach; the whole audit loop depends on the PR boundary. Fix the doc so CLI doesn't follow the wrong rule. |
| **D-5** | Docs true-up timing | **Fold README + CLAUDE.md true-up into the 1B close**, not now. | The docs drift (README stack/routes/personas, CLAUDE.md deploy flow) is real but low-urgency; batching it at a phase boundary avoids a context-switch mid-build. D-1 and D-4 land here too. |

**Note on D-2:** adopting Vitest is itself a small additive build (config + first smoke tests), not just a decision. It is sequenced as the opening batch of Phase 1 below.

---

## PART C — THE BUILD SEQUENCE

The plan runs in five phases. Phases 1–2 finish the spine; Phase 3 builds the pillars (halal-first for the deadline); Phase 4 is the backend swap; Phase 5 is hardening and go-live. Each phase closes on a behavioral audit (the QA harness) plus a structural pass.

### PHASE 0 — Foundation reconciliation (1 short session)

*Clear the drift and set the nets before touching pages. Additive, low-risk, high-leverage.*

- **0.1 — Deploy posture (D-1).** Remove committed GH-Pages root artifacts; confirm Vercel builds clean from `vercel.json`; verify the Preview URL the harness targets. One commit.
- **0.2 — Test runner (D-2).** Add Vitest + React Testing Library config. Land 2–3 smoke tests against the already-live pages (BuyerDashboard, SupplierRegistration, SupplierWhatsApp — the three fully-wired ones) to seed the floor. Establishes the non-regressing baseline.
- **0.3 — Branch policy (D-4).** Correct CLAUDE.md to the branch+PR+JJ-merge model. One commit. (Defers the fuller README true-up to 0.4 / phase close.)

**Exit:** one deploy target, a test floor > 0, and CLAUDE.md no longer instructs a lane breach. The nets are set.

### PHASE 1 — Complete the data layer (1B hook migration) — HIGHEST PRIORITY

*Turn on the engine that is already built. This is the single highest-leverage work remaining: it makes scoping structural, kills the type-drift, and is the precondition for every action and every pillar.*

Migration order per **D-3**. Each batch: investigation → APPROVED → atomic commits (one page or a small cluster per commit) → each page lands with a smoke test → Preview smoke → next.

- **Batch 1.1a — B-pages, truly one-step (9).** Wire each to `useDataService()` — the fixture is relocated *and* a backing service method already exists, so this is pure hook-substitution. Fastest momentum. *(BuyerDiscovery → Discovery svc; BuyerInvoices → getBuyerInvoices; BuyerRisk → Risk svc; plus the 6 supplier B-pages: SupplierDocuments, SupplierInvoices, SupplierMyStorefront, SupplierPerformance, SupplierShipments, SupplierStorefront — all have real methods in MockProcurementService / MockRiskService / MockDiscoveryService.)*
- **Batch 1.1b — B-pages needing a service method first (4).** These fixtures are relocated but wired into **no service method** — so they are NOT one-step. Each needs a new `IDataService` method + interface entry + DTO, *then* the hook wire. *(BuyerAnalytics → `fixtures/buyerAnalytics`; BuyerCompliance → `fixtures/buyerCompliance` [note: `MockRiskService.getCompliance` exists but currently serves `buyerRisk` data — see P3]; BuyerDashboard → `fixtures/buyerDashboard`; BuyerWhatsAppHub → `fixtures/buyerWhatsApp`.)*
- **Note — the 5 mixed supplier B-pages carry a C-legacy tail.** SupplierInvoices, SupplierMyStorefront, SupplierPerformance, SupplierShipments, SupplierStorefront are fixture-backed (their B-half lands in 1.1a) but *also* read legacy modules directly (typically a `mockSuppliers` name-lookup, plus `mockPurchaseOrders`/`communicationProfiles`). That legacy read is a small relocation tail — usually a `suppliers.getCurrent()` swap — folded into Batch 1.2. These 5 are not fully one-step despite being fixture-backed.
- **Batch 1.2 — C-legacy (13, + the 5 mixed tails).** Two-step: relocate the raw legacy-mock reads into fixtures/service methods, then wire the hook. Removes the in-page re-implementation of `applySupplierScope` — scoping becomes structural here, per page. *(Buyer: Contracts, GoodsReceipt, Inventory, Orders, Shipments, Sourcing, SupplierProfile, Suppliers, Marketplace. Supplier: Dashboard, Inventory, Orders, RFQs. Plus the legacy tail of the 5 mixed pages above.)*
- **Batch 1.3 — C-inline (4).** Extract the hardcoded arrays into fixtures, then wire. *(BuyerRequisitions, BuyerScorecard, SupplierRegistration, SupplierWhatsApp — note the last two are fully-live on actions; only their data source moves.)*
- **Batch 1.4 — Type cleanup (Batch 5 from Vision).** With every reader now on canonical DTO names, drop the legacy dual fields (`totalAmount`/`qty`/`unit`/`poStatus`/`createdDate`/`deliveryDate`) and delete the dead `contactEmail`/`contactPhone`. The `dto.ts` bridge becomes unnecessary for migrated paths. Retire `types/purchaseOrder.types.ts` fat type. *(Watch-item: `GRInspectionWizard.tsx:74-76` reads `.qty` on a ShipmentLineItem — a different type, outside PO-drift scope, so it is unaffected; only extend cleanup to it if ShipmentLineItem is ever canonicalized.)*

**Exit criteria (Phase 1):** all 30 pages read via `useDataService()`; `applySupplierScope` is the sole scoping path (no in-page filtering remains); legacy dual fields gone; test floor risen with the migration. **Behavioral audit:** re-run sp-001 (all 31 routes still render) + a targeted sp-002 (toggle seeds identity, supplier pages scope to Berlina, `/supplier/inventory` leak stays closed *through the service*). Green = data layer real.

### PHASE 2 — Build the action layer (1C)

*Give the 98 dead actions something real to call. This is the mutation/command layer behind the service interface — the verbs of procurement become real operations against the (mock-backed) data layer.*

- **Batch 2.1 — Command interface + optimistic-update pattern.** Define `IActionService` (or extend `IProcurementService` with mutation methods): `confirmPO`, `advanceStage`, `submitASN`, `awardRFQ`, `postGoodsReceipt`, `releaseInvoice`, `sendReminder`, etc. Mock implementation mutates the in-memory data layer and returns updated state. Establish the one canonical pattern: button → command → data-layer mutation → UI re-derives. **Prove it end-to-end on ONE action first: PO confirm on SupplierOrders** — fact-check confirmed it's the cleanest target. The panel, quantity-edit UX, and validation already exist; `confirmOrder` (`SupplierOrders.tsx:155-168`) currently sets local state + toasts but does NOT persist (ephemeral — reverts on remount). The only missing piece is persistence: a `confirmPO(scope, id, qtys)` command writing through the (mock) data layer, with the list re-deriving from the mutated store. Pairs naturally with SupplierOrders' own Batch 1.2 migration — the command should write through the same service the page reads from.
- **Batch 2.2 — Export/bulk/templates as one shared capability (~23).** Only the genuinely-homogeneous header actions — Export / Export Report / SAP-AP Export / EDI-846/856 Export / Bulk upload / Bulk download / Templates — share one pattern. Wire them as a single shared capability (one `useBulkAction` / export utility consumed everywhere), not 23 individual handlers. Structural fix for a structural gap. **Do NOT fold in the other ~11 H-slot controls** (below) — they were bucketed H only because they sit in the header/BulkActionsBar slot, but they are not export/bulk.
- **Batch 2.2-reroute — the ~11 non-export H-slot controls go to the command layer / create-wizards, not the export util.** Creation verbs → create-wizard work (New PO `BuyerOrders:342`, New invoice `SupplierInvoices:213`, Manual ASN Entry `BuyerShipments:423`); relationship/command verbs → command layer (Invite supplier `BuyerSuppliers:109`, Connect `SupplierStorefront:182`, Request RFQ `SupplierStorefront:185`); config/view surfaces → their own panels (Configure Alerts `BuyerRisk:895`, Dock Schedule `BuyerShipments:418`, Lab Results `BuyerGoodsReceipt:411`); data-refresh → a refresh command (Sync now `BuyerInventory:332`, `SupplierInventory:170`). Sequence each with its natural sibling (creation verbs alongside the relevant wizard; relationship verbs in 2.3).
- **Batch 2.3 — Panel-primary verbs (P = 32).** The real workflow CTAs (Post to SAP, Send reminder, Award RFQ, Submit ASN). Each maps to a command-layer method. Where the action's true home is the backend (Post to SAP), the command is honest: it performs the mock mutation and is *named* as the SAP-boundary operation the adapter will later fulfill.
- **Batch 2.4 — Row/card + menu actions (R = 27, O = 5).** The inline per-row verbs and menu items. Many share handlers with 2.2/2.3.

**Exit criteria (Phase 2):** the 98 dead actions are either (a) wired to a real command-layer mutation, or (b) explicitly and visibly named as a backend-boundary deferral (not silently dead). Sensitivity band closed — no toast-only stubs remain masquerading as live. One full lifecycle joint proven: confirm a PO → it advances → the next stage sees it. **Behavioral audit:** sp-003 exercises a full mutation chain. Green = spine complete (1A+1B+1C).

**★ Phase 2 exit is the milestone: the spine is poured. Everything after is pillars on a stable base — parallelizable.**

### PHASE 3 — The feature pillars (halal-first for the deadline)

*Vertical slices wired onto the completed spine. Ordered by regulatory clock first, then leverage. Once the spine holds, these can parallelize across seats.*

- **P3 · Compliance enforcement — FIRST (hard deadline Oct 17, 2026).** The halal/BPOM certification engine: documents as first-class objects with expiry, the escalation ladder (180/90/60/30/7 days), and **PO auto-block logic** when a required cert is expired/missing. Today it is a display + live countdown only; this makes it *enforce*. This pillar is sequenced first not for leverage but because it is the regulatory commitment. **Reconcile the two compliance data sources first:** `MockRiskService.getCompliance` exists but serves `fixtures/buyerRisk` data, while `BuyerCompliance.tsx` reads its own unwired `fixtures/buyerCompliance` — one wired-but-unused, one used-but-unwired. P3 must unify these onto a single source before building enforcement on top. *Verify the exact cosmetics deadline and GR 42/2024 scope against the primary BPJPH source before locking the enforcement dates (Build-over-Buy Caveat).*
- **P1 · Procurement lifecycle (B1–B10) — SECOND.** Connect the lifecycle joints so an object flows Discovery → RFQ → PO → ASN → GR → Invoice → Payment, each stage advancing the next. This is the platform's reason to exist and the spine's primary consumer; it is second only because P3 has a date. Much of its wiring is completed *by* Phase 2's action layer — this pillar makes the chain continuous.
- **P4 · Analytics/reporting — THIRD.** `/buyer/dashboard`, `/buyer/analytics`, `/supplier/performance` derive from the real data layer instead of static fixtures; filters actually re-derive. Unblocked once the data layer is fully consumed (Phase 1) and mutations flow (Phase 2), so the numbers are real.
- **P2 · WhatsApp-native layer — FOURTH.** Bring `/buyer/whatsapp` (a SHELL) to parity with the already-real supplier chat simulator. Front-end-complete target is a fully-working simulated spine, swap-ready for 360dialog. The #1 differentiator; sequenced fourth because the simulator already proves the pattern and real send needs the backend.
- **P5 · Marketplace/storefront — FIFTH.** Wire the dead Connect / Request quote / Send message CTAs (SupplierStorefront is fully-dead today); scope storefront content to the real supplier. Lowest regulatory/lifecycle urgency.

**Exit criteria (Phase 3):** each pillar runs the full build loop and closes on its own behavioral audit. P3 closes *before* Oct 17 with enforcement proven (an expired cert blocks a PO). At Phase 3 close the platform is **front-end-complete**: every screen transacts on mock-backed data, honestly.

### PHASE 4 — Backend swap (Phase 2A proper — separate program track)

*Replace the mock service implementations with real adapters. Additive by design — the interfaces do not change, so this is adapter work, not a rewrite.*

- Stand up the decided backend stack: NestJS + PostgreSQL (AWS RDS Multi-AZ Jakarta) + Redis (ElastiCache) + RabbitMQ (Amazon MQ), all in **AWS ap-southeast-3 Jakarta** for UU PDP data residency.
- Implement `IDataService` / `IProcurementService` / `IActionService` as real adapters over **SAP S/4HANA OData** (API_PURCHASEORDER_2 V4, API_BUSINESS_PARTNER, API_PRODUCT_2, API_MATERIAL_DOCUMENT_SRV type 101, API_INBOUND_DELIVERY_SRV, API_SUPPLIER_INVOICE_PROCESS_SRV, API_EXHGRATE, IBP InventoryPositionSet) behind an anti-corruption layer. *Verify current OData API version availability at spec time (Build-over-Buy Caveat).*
- Real WhatsApp send via **360dialog**; EDI via **Cleo Integration Cloud**; AI intelligence via **Anthropic Claude API** on the in-boundary posture.
- The dead-action "backend-boundary deferrals" from Phase 2 (Post to SAP, real WhatsApp send) now become live through their adapters — the honest boundary names were the spec.
- **New net required:** integration testing is out of the current QA-harness scope (behavioral-on-Preview). Flag and build an integration-test layer when this phase opens.
- **Ariba-ready:** `IProcurementService` is already the abstraction for a future Phase 2C SAP Ariba activation — no rework.

**Exit criteria (Phase 4):** each service swapped mock→real adapter with integration tests green; data residency verified in-boundary; no interface change forced. Front-end untouched by the swap (the proof the architecture worked).

### PHASE 5 — Hardening & go-live

- Migration-aware cutover: prove, item-by-item, that the platform covers the incumbent supplier-facing scope before retiring anything (DNA principle 14).
- a11y pass (persona-toggle `aria-pressed`/`role=switch`, focus, contrast), the navigation-coherence fixes (persona-toggle-doesn't-navigate, buyer-fall-through-404), i18n if Bahasa-native is in scope, performance.
- README + full doc true-up to final state.
- Pilot with a real supplier cohort; measure WhatsApp adoption (a Build-over-Buy threshold that could rebalance channel investment).

---

## PART D — IMPROVEMENTS (beyond the Vision baseline)

Opportunities surfaced by the harvest and the build-over-buy thesis that strengthen the platform beyond "finish the dead buttons." Sequenced into the phases above where noted; listed here so they are not lost.

| # | Improvement | Why it matters | Where it lands |
|---|---|---|---|
| I-1 | **Test floor from 0 → ratcheting** | The DNA's self-protecting principle needs a floor; 0 tests means every migration is unguarded. | Phase 0.2, rises through all phases |
| I-2 | **Scoping made structural (not per-page)** | Today 13 pages re-implement `applySupplierScope` inline — 13 places a leak can reappear. Consolidating to the service makes cross-supplier leaks structurally impossible. | Phase 1.2 |
| I-3 | **Command-layer as one pattern** | Wiring 98 actions individually invites 98 divergent implementations. One command pattern = legible, agent-operable, testable. | Phase 2.1 |
| I-4 | **Honest backend-boundary naming** | Actions whose true home is SAP (Post to SAP) named at the boundary now become the backend spec later — honesty-by-construction pays off directly. | Phase 2.3 → 4 |
| I-5 | **Agent-operability seams** | Clean named commands + explicit states make the platform drivable by agents (the build-over-buy AI-native thesis) without retrofitting. Build the seams now, activate agents at/after Phase 4. | Phase 2 (seams), Phase 4+ (activation) |
| I-6 | **Compliance as first-class objects** | Halal/BPOM certs modeled as entities with expiry + enforcement, not display strings — the single clearest build-over-buy justification. | Phase 3 / P3 |
| I-7 | **Navigation coherence** | persona-toggle-doesn't-navigate + no-404 fall-through are small but visible correctness gaps. | Phase 5 (or fold earlier if cheap) |
| I-8 | **Deploy/doc single-source** | Dual deploy posture + drifted docs erode trust in the repo as truth. One target, docs true-up at phase closes. | Phase 0.1 / 0.3, phase-close true-ups |

---

## PART E — EXECUTION MODEL & GUARDRAILS

### E.1 Model (from Working Rules — unchanged)

Supervised-batch via CC CLI (local Windows, open egress) as the build engine. Chat drafts mega-batch dispatches (multiple commits, one investigation phase); JJ approves the batch, smoke-tests at the Preview boundary (≤5 min), merges via GitHub UI (Squash + delete branch). The QA harness audits behaviorally post-deploy; structural audit pre-PR. Four actors, clean lanes: Chat = strategist/brain, CC CLI = implementer/auditor, JJ = operator/merge-authority, CC Web excluded (egress).

### E.2 The build loop (every increment)

Investigate → Plan → Develop → Structural audit (pre-PR) → Fix → Merge (JJ) → Deploy → Behavioral audit (post-deploy) → Fix → continue.

### E.3 Sequential vs. parallel

The spine (Phases 0–2) is **one sequential track** — everything depends on it. The pillars (Phase 3) are **parallelizable** once the spine holds; multi-seat earns its keep there, not before.

### E.4 Standing guardrails

- Atomic, additive commits; test floor never regresses; investigation before implementation.
- Identity-clean commits: no names, no Co-Authored-By, no AI attribution (in commit *and* PR body — the prior-session hygiene note).
- JJ merges via GitHub UI; chat never pushes/merges; CLI never merges.
- One repo per session; confirm `git rev-parse --show-toplevel` before work.
- Brand tokens locked: page `#FAFBFC`, navy `#0D1B2A`, teal `#0097A7`, mid `#354A5F`.
- UX/aesthetic polish is a named separate track (Phase 5), not folded into spine/pillar function work.
- IDR for financial figures, USD for vendor contracts.

---

## PART F — THE CRITICAL PATH (one view)

**Sequential spine (Phases 0–2) — one track, each gates the next:**

1. **Phase 0** — Reconcile: deploy target + test floor + branch policy.
2. **Phase 1** — 1B hook migration (B → C-legacy → C-inline → type cleanup). → *data layer REAL*
3. **Phase 2** — 1C action layer (command pattern → H → P → R/O). → **SPINE COMPLETE ★**

**Parallelizable pillars (Phase 3) — fan out once the spine holds:**

- **P3 · Compliance** — *first, hard deadline Oct 17, 2026* ⚠
- **P1 · Lifecycle** — the raison d'être
- **P4 · Analytics** — real numbers
- **P2 · WhatsApp** — the differentiator
- **P5 · Marketplace** — storefront

→ at Phase 3 close: **front-end-complete**

**Then, separate program track:**

4. **Phase 4** — Backend swap: mock → SAP/NestJS adapters, in-boundary Jakarta.
5. **Phase 5** — Hardening, migration-proof cutover, pilot, go-live.

**The one date that constrains the sequence:** P3 (halal compliance enforcement) must close before **Oct 17, 2026**. Everything upstream of P3 (Phases 0–2) is on the critical path to that date. This is why finishing the spine is not just architecturally correct but schedule-critical: the compliance pillar cannot be built until the spine it wires onto is complete.

---

## PART G — IMMEDIATE NEXT STEP

Ratify the Decisions Register (Part B), then open **Phase 0.1** — the deploy-posture reconciliation (D-1) — as the first supervised batch, or **Phase 0.2** (test runner) if you prefer to set the net before touching deploy. Recommendation: **0.2 first** (Vitest floor), so every subsequent change including the deploy cleanup lands guarded. First dispatch is investigation-only per standing pattern.

The CLI read-only fact-check is complete (folded into v1.1 above). The plan is code-verified; the only gate remaining before build is **JJ ratification of D-1 through D-5**. Once ratified, this is the locked spec.

---

## PART H — MODULE-BY-MODULE MAP (code-verified reference)

The "what are we building, module by module" reference, harvested read-only against HEAD. Each area under `src/` with its real-vs-stub status. This is orientation for anyone joining the build.

| Module (`src/`) | What it is | Real-vs-stub status |
|---|---|---|
| **context/** | `CurrentIdentityContext` (persona + supplierId + hook), `identitySources` (mockIdentitySource + seed), `AdaptiveContext` (country/channel/locale helpers) | **Real.** Identity spine (1A) complete; invariant enforced by construction. AdaptiveContext is a real runtime helper (Intl, Date). |
| **services/data/** | The service spine: `types.ts` (IDataService + 4 sub-interfaces + ~40 DTOs), `dto.ts` (legacy→canonical PO bridge), `scoping.ts` (`applySupplierScope`), `DataServiceContext` (provider + `useDataService`), `mock/` (4 services + `mockDataService` + 12 fixtures) | **Built, 0% consumed.** Engine real, scoping-correct, provider mounted; no page calls the hook. 4 buyer fixtures unwired into any service. `dto.ts` bridge dormant. |
| **components/** | `layout-v2/` (AppShellV2, SidebarV2, TopBarV2), `ui-v2/` (~28 primitives), `v2-features/` (GRInspectionWizard) | **Real** as presentational primitives. `BulkActionsBar` renders whatever `onClick` it's given — a missing handler is a genuine no-op (root of many H-class dead actions). |
| **pages-v2/** | The 30 canonical screens (12 supplier, 18 buyer incl. Marketplace) | **High-fidelity, largely stubbed at the seams.** All 30 bypass the hook; 98 dead actions; 4 fully-dead pages; 3 fully-live. Real workflows in pockets (order-confirm UX, quote submit, invoice release, storefront edit, wizards). |
| **pages/auth/** | `Login.tsx` — demo sign-in / persona seeder | **Real** (navigates + setIdentity); holds one benign seed constant. Not in `pages-v2/`. |
| **router/** | `AppRouter.tsx` — HashRouter, 31 routable pages + 2 redirects, wraps providers | **Real, two gaps:** catch-all `*` → buyer dashboard (no 404/guard); no per-persona route protection. |
| **types/** | `supplier.types.ts`, `purchaseOrder.types.ts` (fat legacy PO type), `kpi.types.ts` | **Mixed.** Enums real and used; `purchaseOrder.types.ts` is the drift-laden legacy type read by C-legacy pages; `contactEmail`/`contactPhone` dead. Slated for Batch 1.4 removal. |
| **hooks/** | `useToast` (real toast context, powers most stubs), `useSupplierPortal` (legacy portal hook) | `useToast` **real & pervasive.** `useSupplierPortal` legacy — verify usage before relying on it (not part of the v2 data spine). |
| **data/** (adjacent) | Legacy shared mock modules (mockPurchaseOrders, mockSuppliers, mockShipments, mockGoodsReceipts, mockContracts, mockRfqs, mockQuotations, mockObligations, mockInventory, mockKpis, communicationProfiles) | **Real data, wrong consumption path.** What C-legacy pages import directly (and the mock services also read). The migration funnels all reads through the service instead of these. |

---

*End of End-to-End Build Plan v1.1. Built on the Current State of Truth, fact-checked against code. Ratify the decisions, then build. Recalibrate at every phase boundary.*
