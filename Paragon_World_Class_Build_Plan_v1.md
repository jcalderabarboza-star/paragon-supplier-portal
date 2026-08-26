# Paragon World-Class Build Plan v1
## The Executable Plan — from the Strategic Spine to independently-green batches

**Status: ADOPTED (merged #65, 2026-07-14) — and RECALIBRATED 2026-08-20 — see §9 and §9′.**

> ⚠️ **THE LINE THAT STOOD HERE WAS STALE IN BOTH HALVES.** It read *"DRAFT —
> operator review pending. Lives at repo root deliberately; it earns its place in
> `docs/` only after operator review + adjudication."* This document was reviewed,
> adjudicated and merged as PR #65 on 2026-07-14, and `CLAUDE.md` has named it
> **the canonical forward plan** ever since. It has stayed at repo root, which is
> fine; what was not fine is a plan of record introducing itself as a draft
> awaiting the review it had already passed.

**Authority chain.** This plan executes `docs/Paragon_Platform_Strategic_Spine_v1.md` (the
authoritative brief; when in doubt, the Spine wins), evidenced by the 2026 competitive-frontier
benchmarking report, grounded in the 2026-07-13 repo readiness census (main @ `14e9ce9`).
It **supersedes the sequencing** of `Supplier_Portal_Revised_Build_Plan_v2_2.md` from Stage 1
forward; v2.2 remains the historical record of Phases 0–2′ and stays valid for its ratified
decisions (DR-6/7/9/10, the design principles, the honest-state findings register).

**The one reframe that governs everything** (Spine §2): the fixture-backed frontend is not a
prototype — it is **the SE Team's executable specification**. Every `IDataService` signature is
an API contract, every fixture a data contract, every DR-10 event an integration contract,
every state-machine transition a business-rule contract. This plan therefore has two products
at all times: (a) platform capability, (b) the contract the SE Team builds the real backend
against. Section 3 — the contract package — is a first-class deliverable, not an appendix.

---

## 1. LEDGER RE-BASELINE — where we actually are

Census ground truth (verified against git + code, 2026-07-13):

| Ledger item | Stated (stale) | Actual |
|---|---|---|
| CLAUDE.md "Current state" | pinned `main @ 2b0be05`, "Next: Step 3 — Phase 2.1′" | main @ `14e9ce9` (PR #53); Phase 2.1′ **done** (PR #35), Phase 2.2′ batches (i)–(iv) **done** (PRs #36–#38, #41) |
| Command spine | "next" | **Built.** Schema + dispatcher + DR-10 events + cascades; PO/ASN/GR/Invoice/RFQ-award verbs wired end-to-end; floor 557 |
| Phase 2′ exit ("SPINE COMPLETE ★") | — | **Unstamped.** 5 of 15 machines (Contract, Obligation, PurchaseRequisition, Shipment, SupplierDocument) have census paper-fits but no authored flows; mutation-chain audit + F2-16 sizing recalibration not run |
| Phase 3′ | not started | **Already in it, unannounced:** i18n Batches 0–6 + coverage sweep (PRs #44–#53) *are* the plan's "existing-page key sweep = Phase 3′"; DP-2/DP-3 polish (#39–#43) landed |
| Backend | — | **Greenfield.** Zero server code, zero datastore clients; data = in-memory fixtures behind `mockDataService` (`src/main.tsx:18-21`); scoping enforced client-side |
| Track R (halal lane) | — | **Normal capability, operator-paced.** R0.1–R1.5 NOT STARTED (operational, not a build blocker); D-CAL / D-STAFF / D-SAP / D-DPO OPEN as non-blocking operator inputs. No external deadline gates the build |

**Re-baseline actions (Batch F0.1, first PR of this plan):**
1. Rewrite CLAUDE.md "Current state" to the table above; retire the "Next: Step 3" pointer.
2. Flip the four `docs/findings.md` rows still marked "CLOSED — pending PR merge" (INV-SEED-01,
   GR-FABRICATION-01, GR-LEGACY-READ-01, INV-XPERSONA-FIXTURE-01) to CLOSED — their PRs merged.
3. Register this plan's stage vocabulary (F/I/A, below) as the forward numbering; map old
   Phase 3′/4′/5′ references onto it.
4. Stamp Phase 2′ exit **honestly**: "core five lifecycle machines wired end-to-end; remaining
   five authored at contract-freeze (F0.4); compliance machine deliberately rides R2.2 DTO-v2."
   (The stricter alternative — wire all remaining verbs first — is Decision FORK-2, §8.)

---

## 2. DEPENDENCY-SEQUENCED ROADMAP

Master ordering (Spine §3, non-negotiable): **data before intelligence before agents.**
Three stages → phases → atomic, independently-green batches (one PR each, floor never
regresses, honest-by-construction markers on everything simulated).

**Critical path, stated plainly:** the long pole is not in this repo. It is (a) the SE Team
standing up the real backend + S/4HANA event integration, and (b) the data-quality work
(spend classified to L3+, vendor master resolved, BOM linkage) landing in Snowflake. The
frontend seat's highest-leverage move is to **front-load the contract package (F0)** so the SE
Team starts against a frozen spec, then build Stage-2 capability surfaces fixture-first behind
honest markers so nothing waits idle on the backend.

```
 STAGE 1 — FOUNDATION                STAGE 2 — INTELLIGENCE              STAGE 3 — AGENTIC
 (0–9 mo; SE-Team-heavy)             (9–18 mo; value visible)            (18+ mo; disciplined)

 F0 Contract freeze ──────┐          I1 Spend classification ──┐        A1 Copilot
 F1 Real backend core ────┤──────►   I2 Should-cost/commodity ──┤──────► A2 Document intelligence
 F2 S/4HANA event seam ───┤          I3 Risk + compliance ──────┤        A3 Bounded agents
 F3 Snowflake + data QA ──┘          I4 3-way match + e-Faktur ─┤        A4 Advanced levers (buy)
        ▲                            I5 Guided-buying intake ───┤
        │                            I6 BOM-linked sourcing ────┘
 TRACK R (operator lane, normal capability — no build-gating clock) ──► feeds I3 ─────►
```

Frontend surfaces for I1–I6 may be built fixture-first **in parallel with F1–F3** (they are
the spec for the corresponding backend capability); their "Live" flip depends on Stage 1.

### STAGE 1 — FOUNDATION: the governed data & integration backbone

#### Phase F0 — Contract freeze & ledger truth *(frontend seat; starts immediately)*
Goal: freeze the executable specification so SE-Team work starts against a stable target.
Entry: this plan approved. Exit: contract package v1 published; all 15 machines authored;
Phase 2′ exit stamped; ledger corrected.

| Batch | Content | Size |
|---|---|---|
| F0.1 | Ledger re-baseline (§1 actions) | S |
| F0.2 | Wire the **GR-post → invoice-match cascade** (`t_gr_post` settle → `t_invoice_match` fan-out). Authored-unwired today (`invoiceMatch.flow.ts:11-16`, no `t_gr_post` entry in `cascades.ts:24-39`). Cheap, closes INV-GR-OVERLAY-01, and is the seed of the I4 match engine — the contract must ship with this behavior proven in simulation | S |
| F0.3 | Wire RFQ neighbor verbs (`t_rfq_publish/close/cancel/reopen`) + quotation verbs (`t_quotation_submit/evaluate`) to their surfaces; closes SUPPLIER-SOURCING-01's write half; the sourcing contract must be behavior-complete | M |
| F0.4 | Author the 5 remaining lifecycle flows (Contract, Obligation, PurchaseRequisition, Shipment, SupplierDocument) from the census paper-fits (`transition-schema-census.md`) — schema-authored, wired only where a page already has the verb; compliance machine explicitly deferred to R2.2 DTO-v2. Stamp **Phase 2′ exit** + run the mutation-chain behavioral audit | M |
| F0.5 | **Contract package v1** (§3): generate + hand-author `docs/contracts/` — API reference, entity schemas, event contracts, Snowflake spec, integration-seam register. The SE Team kickoff artifact | M |
| F0.6 | **LivenessRegistry primitive** — one central per-seam `live/simulated` map driving every "Sample data"/"Simulated" marker (today scattered as hardcoded pills). This is the mechanism §6 flips seam-by-seam | S |

#### Phase F1 — The real backend core *(SE Team; frontend seat supplies adapter + conformance kit)*
Goal: a real service implementing `IDataService` verbatim; `httpDataService` drops into the
existing seam (`DataServiceContext.tsx:5`) and **pages do not change**.
Entry: F0.5 contract v1. Exit: portal runs end-to-end against the real backend in a staging
env; scoping enforced server-side; OIDC live; commands durable.

- **SE Team:** persistence, auth (OIDC — swaps the persona→role data table per
  `transitions/roles.ts:6`), server-side `QueryScope` enforcement (today client-side —
  `scoping.contract.test.ts` becomes the server's acceptance test), durable command dispatch +
  `settle` webhook, **durable AuditSink** persisting the DR-10 `TransitionEvent` shape verbatim
  (`transitions/events.ts:14-36` — designed for zero-retrofit persistence).
- **Frontend seat batches:** F1.1 `httpDataService` adapter (fetch + `DataError` mapping +
  auth header seam) — S/M; F1.2 **contract-conformance test kit** — the existing floor's service
  contracts (scoping, Page envelope, DataError, command semantics) packaged to run against any
  `IDataService` implementation over HTTP; this is how the SE Team proves conformance — M;
  F1.3 per-service liveness flip wiring (mock/http composable per sub-service, so `suppliers`
  can go live while `engagement` stays mock) — S.
- **Buy-vs-build:** backend stack is the **SE Team's choice**; the portal constrains only the
  contract. This plan does not prescribe NestJS/Postgres/Redis/RabbitMQ.

#### Phase F2 — S/4HANA event-driven integration *(SE Team + frontend seat)*
Goal: the composable-stack pattern — S/4HANA emits business events via Event Mesh; the platform
consumes a minimal payload then calls back OData for detail. Never transactional coupling.
Entry: F1 core live for at least PO/GR/Invoice reads. Exit: live PO/GR/invoice events flowing;
`sapBoundary` transitions settle from real S/4HANA callbacks; Live markers on.

- The repo is **pre-shaped for exactly this**: inbound S/4HANA events map to the authored
  `'system'`-trigger transitions and to `settle()` on `submitted` commands (Option B,
  `dispatcher.ts` sapBoundary path, proven by `sapBoundary.test.ts`). The event contract map
  is specified in §3-C3.
- **Frontend seat batches:** F2.1 inbound-event **simulator** honoring the §3-C3 contract
  (drives `t_asn_in_transit`/`t_asn_deliver` + settle callbacks in demo; retired when the real
  feed lands) — M; F2.2 event-timeline surface reading the AuditSink (the portal finally
  *shows* its own audit stream; also the Stage-3 agent audit UI) — M.
- INT-TMS-01 (portal↔TMS ASN boundary) is a **sub-case of this phase**: the TMS feed posts the
  same two logistics verbs. Build the seam once; TMS and S/4HANA are two producers.

#### Phase F3 — Snowflake analytical layer + data-quality prerequisites *(SE/data team + operator)*
Goal: the warehouse where classified spend, resolved vendor master, and BOM linkage land;
everything in Stage 2 reads from here. Governance in-account (Cortex-style).
Entry: F2 events flowing (facts need sources). Exit = **the Stage-1 exit bar** (Spine §3):
90%+ spend classified to L3; vendor master de-duplicated; live PO/GR/invoice in platform + Snowflake.

- Research is blunt: *an agent on unclassified data is worse than no agent.* No Stage-2
  intelligence capability flips Live until its F3 data prerequisite is met (per-capability
  prerequisites in §5).
- **Frontend seat batch:** F3.1 extend `IAnalyticsService` per §3-C4 (classified-spend reads,
  vendor-360 reads) fixture-first — the spec for the warehouse views — M.

### STAGE 2 — INTELLIGENCE: capabilities that make users efficient

Each capability = **a feature + an ecosystem primitive** (Axiom 3; the full primitive register
is §4). Each ships fixture-first behind LivenessRegistry markers (the SE-Team spec), then flips
Live when its Stage-1 prerequisite lands. Sequenced by Paragon-specific value:

| Phase | Capability | Key repo seam it builds on | Primitive it establishes |
|---|---|---|---|
| I1 | AI spend analytics & classification (L3+, continuously learning, Paragon taxonomy) | `IAnalyticsService` (7 reads live today, fixture-backed); F3 warehouse | **Classification engine + taxonomy** — every downstream analysis reuses it |
| I2 | Should-cost & commodity/FX intelligence (95% imported inputs — highest Paragon-specific value) | `IRiskService.getCommodities` already exists (`types.ts:1086`) — grows into the feed surface | **External-data-feed + should-cost engine** — later powers finance + risk |
| I3 | Supplier risk + compliance intelligence (supplier 360; halal/BPOM/ISO lifecycle at supplier *and raw-material* level). **Platform capability — modeled fully; no external deadline gates the build (certification handled manually by the compliance team)** | Compliance machine + DTO-v2 at R2.2; resolves COMPLIANCE-CARVEOUT-01 + HALAL-XPERSONA/CLOCK/UNDERREVIEW/REMIND/ISSUER-BLIND-01; Track R harvest feeds it | **Risk-scoring + certificate-lifecycle engine** |
| I4 | 3-way match automation + e-Faktur/e-invoicing | GR→invoice-match cascade (wired at F0.2); invoice machine (DR-7) + match sub-flow + rollup already authored | **Match/exception engine** — foundation for finance intelligence (dynamic discounting later) |
| I5 | Guided-buying intake layer — the opinionated surface (Axiom 2) made real: one front door, preferred/contracted/halal-certified routing, positive nudging, "advanced" escape hatch | `getCapabilities`/`CapabilitySet` DNA seed (`types.ts:1016-1021`); PurchaseRequisition machine (authored F0.4); Marketplace/Discovery reads | **Intake/orchestration router** — the surface Stage-3 agents plug into |
| I6 | Direct-materials / BOM-linked sourcing + award-scenario view | RFQ/quotation machines (wired F0.3); F3 BOM linkage | **Award-scenario seam** (solver itself: buy-vs-build, §8) |

Typical capability phase shape (3–5 batches each): (1) contract extension — new reads/verbs
specced + fixture-implemented; (2) surface — pages/panels, DP-1/2/3-conformant, EN/ID from
birth; (3) simulation depth — honest fixture behavior proving the business rule; (4) Live flip
— when the backend capability lands; (5) primitive hardening — the reusable piece documented
as a seam. **Stage-2 exit bar** (Spine): should-cost baselines on top raw-material categories;
automated match rate >70%; halal expiries auto-tracked ahead of the mandate; guided buying
live with best-practice defaults.

**The Learn module lands here as FORK-1 (§8)** — v2.2 and v2.1 specify different shapes
(scripted GuidedLesson vs copilot-first RAG); operator decides, this plan does not silently pick.

### STAGE 3 — AGENTIC & ADVANCED: disciplined, bounded, audited

Research caveat honored: 40%+ agentic-project cancellation predicted by 2027; ~8% deployment
maturity. Stage 3 is **selective, human-in-the-loop, kill-switched, ROI-gated**. No agent
ships onto data that hasn't passed its F3 prerequisite.

| Phase | Content | Primitive |
|---|---|---|
| A1 | **Procurement copilot** — conversational navigation/summarization over the now-clean data + DR-10 event stream. Safest entry; absorbs Learn if FORK-1 chooses copilot-first | **Conversational query layer** over `IDataService` + AuditSink |
| A2 | **Document intelligence** — invoice/contract extraction feeding I4 match + contract obligations. Rossum/Icertis-Vera pattern: **buy the extractor, build the seam** | **Extraction-pipeline seam** (documents → structured payloads → commands) |
| A3 | **Bounded task agents** (bid comparison, supplier discovery, intake triage) — each with kill-switch, DR-10 audit trail, demonstrated-ROI-before-widening gate. The agent fires *commands through the same dispatcher as humans* — legality/role/scope/policy enforced identically; `actor` field distinguishes agents in the audit stream | **Agent-execution harness** (dispatcher + capabilities + audit, already 80% designed) |
| A4 | **Advanced levers, buy-vs-build evaluated** — combinatorial award optimization (Keelvar-class integrate), dynamic discounting/SCF, n-tier ESG, full CLM (likely buy/integrate Icertis-class) | Seams only; feeds bought |

**Stage-3 exit bar:** demonstrated ROI + clean audit on every deployed agent; new capability
plugs into stable seams without surgery.

---

## 3. THE SE TEAM CONTRACT PACKAGE (Batch F0.5 — the highest-value artifact)

Delivered as `docs/contracts/` (versioned; changes go through PR review like code — the
contract *is* code). Source of truth is the TypeScript itself; generated artifacts + prose
semantics wrap it. Five components:

### C1 — The `IDataService` API surface (every method the real backend implements)

Frozen surface as of `14e9ce9` — **54 methods**: 51 reads + 3 command methods, across 7
sub-services + capabilities (`src/services/data/types.ts:1023-1133`):

| Sub-service | Methods | Count |
|---|---|---|
| `suppliers` | `list`, `getById`, `getCurrent` | 3 |
| `procurement` | `getPurchaseOrders/-Order`, `getInventory`, `getRFQs`, `getQuotations`, `getShipments`, `getASNs`, `getGoodsReceipts`, `getBuyerInvoices`, `getSupplierInvoices`, `getContracts`, `getObligations`, `getDocuments`, `getStorefrontCatalog/-Certs/-Products`, `getKpis`, `getPerformanceTrend`, `getSupplierScorecards`, `getRequisitions`, `getProductionLines`, `getSupplierHealth` | 22 |
| `risk` | `getRiskAlerts`, `getGeoRisks`, `getExposure`, `getScenarios`, `getCompliance`, `getCommodities` | 6 |
| `discovery` | `getGlobalSuppliers`, `getRecommended`, `getQualifications`, `getMarketIntel`, `getSingleSourceItems` | 5 |
| `analytics` | `getSummary`, `getSpendByCategory`, `getTopSuppliers`, `getOtifTrend`, `getPoVolumeTrend`, `getChannelMix`, `getSupplierPerformance` | 7 |
| `engagement` | `getSummary`, `getConversations`, `getConversationThread`, `getAutomationRules`, `getDailyMessages`, `getRuleRates`, `getResponseTimes` | 7 |
| `commands` | `dispatch`, `getCommandStatus`, `settle` | 3 |
| root | `getCapabilities` | 1 |

Contract semantics the backend MUST honor (all proven today by the vitest floor — the
conformance kit of F1.2 makes them executable acceptance tests):
- **`QueryScope` on every call** — buyer = cross-supplier superset; supplier = own rows only;
  cross-supplier access throws `SCOPE_DENIED`. Today enforced client-side
  (`scoping.contract.test.ts`); **the backend re-enforces server-side** — the frontend check
  becomes defense-in-depth, not the boundary.
- **`Page<T>` envelope** on all list reads (shape frozen; pagination params reserved — the
  machinery is deliberately deferred, the envelope means adding it is non-breaking).
- **`DataError` taxonomy** on reads (`NOT_FOUND`, `SCOPE_DENIED`, …); commands *resolve* domain
  rejections as `status:'failed'` + machine-readable `reason`, and *throw* only hard authz.
- **Command semantics** (`types.ts:952-1013`): `dispatch` validates legality + role +
  requiredFields + scope + policy, then applies; outcomes `done | submitted | failed`;
  `submitted` = SAP-boundary two-phase (Option B) settled later via `settle(correlationId)` —
  **idempotent**; creation transitions omit `entityId` and return the store-assigned id.
- **Transition legality is the business-rule contract**: the flow definitions under
  `src/services/transitions/flows/` are normative — state × transition × role × requiredFields.
  The backend implements the same machines (or defers to this dispatcher logic server-side).

### C2 — Entity/data schemas

Every entity in `src/services/data/types.ts` (~40 exported interfaces: `PurchaseOrder`, `ASN`,
`GoodsReceipt`, `BuyerInvoice`/`SupplierInvoice`, `RFQ`, `Quotation`, `Contract`,
`ContractObligation`, `PurchaseRequisition`, `Supplier`, `InventoryRecord`, KPI shapes, filter
shapes, …) is the data dictionary. Deliverable: **JSON Schema generated from the TS types**
(`ts-json-schema-generator` or equivalent) + a prose data-dictionary noting per-field
semantics, units (IDR, Asia/Jakarta dates), and the HONEST rule (stored values canonical EN;
localization is display-only). Fixtures (`src/services/data/mock/fixtures/`, `src/data/`) ship
as **worked examples** of every schema — including the three-tenant scoping dataset
(sup-002/sup-005/sup-007) which doubles as the backend's seed/test data.
**Addition at F0.5:** `ComplianceRegistryEntry` DTO-v2 (from v2.2 Step 5.5/5.6 + the two Halal
Compliance Control Design docs) is included as a *specified-not-implemented* schema so the SE
Team sees the R2.2 target from day one.

### C3 — Event contracts (DR-10 shape; Event Mesh + OData pattern)

**Outbound (portal → world):** every command outcome emits one `TransitionEvent`
(`transitions/events.ts:14-36`): `{event: transitionId, actor: "personaType:supplierId",
scope, correlationId, causationId?, outcome, ts}`. `causationId` reassembles cascade fan-outs
(e.g. RFQ award → winning + losing quotations) into one correlatable group. The durable
AuditSink (F1) persists this shape **verbatim** — designed so the Phase-5′/CMVE persistence is
a zero-retrofit implementation of the existing `AuditSink` interface.

**Inbound (S/4HANA / TMS → portal):** the composable pattern — minimal event payload, OData
callback for detail. Inbound events resolve to exactly two existing mechanisms:

| External event (illustrative) | Portal mechanism | Repo seam |
|---|---|---|
| `sap.s4.beh.purchaseorder.released.v1` | fire/settle PO lifecycle transition | `purchaseOrder.flow.ts` |
| GR material document posted | `settle(correlationId)` on the `submitted` `t_gr_post` | sapBoundary Option B, proven `sapBoundary.test.ts` |
| Invoice cleared / payment run | `settle` on `t_invoice_release_payment` | invoice flow (DR-7) |
| TMS: shipment departed | fire `t_asn_in_transit` (system trigger) | `advanceShipNotice.flow.ts:53-63` — **authored-unwired today; this event is what wires it** |
| TMS: shipment delivered | fire `t_asn_deliver` (system trigger) | `advanceShipNotice.flow.ts:64-73` |

Inbound envelope (specified at F0.5): `{source: "s4hana"|"tms"|…, externalEvent, entityRef
{type, externalId, sapRef?}, ts, payload?}` → adapter maps to `CommandInput` or `settle`. The
F2.1 simulator implements this same envelope so demo and production share one contract.

### C4 — Snowflake analytical-layer spec

Not transactional — the intelligence foundation. Subject areas (each with owning source,
grain, and the `IDataService` reads it serves):

| Subject area | Feeds | Serves (reads) |
|---|---|---|
| Classified spend (L3+ Paragon taxonomy) | S/4HANA PO/invoice facts + I1 classifier | `analytics.getSpendByCategory/getTopSuppliers/getSummary` |
| Resolved vendor master (entity-resolved, de-duplicated) | S/4HANA vendor master + resolution pipeline | `suppliers.*`, supplier-360 (I3) |
| PO / GR / Invoice fact stream | F2 event feed | `getOtifTrend`, `getPoVolumeTrend`, match-rate KPIs (I4) |
| Certificate registry (halal/BPOM/ISO; supplier AND raw-material grain) | Track R harvest → CMVE | I3 compliance reads; `risk.getCompliance` |
| Commodity + FX indices | **bought external feed** (I2) | `risk.getCommodities`, should-cost models |
| BOM linkage (material ↔ product) | S/4HANA / PLM extract | I6 BOM-linked sourcing; should-cost decomposition |
| DR-10 event archive | durable AuditSink | event timeline (F2.2), agent audit (A3), usage telemetry |

Governance: in-account (Cortex-style) — analysis runs where the data lives; nothing leaves.
Quality gates (from the research, adopted as hard prerequisites): spend ≥90% classified to L3
before I1 flips Live; vendor master de-duplicated before I3 supplier-360 flips Live.

### C5 — Integration-seam register

| Seam | Pattern | Buy/Build call |
|---|---|---|
| S/4HANA | Event Mesh (events) + OData (detail callback); never direct transactional coupling | Build the adapter (SE Team) |
| TMS Control Tower (INT-TMS-01) | same inbound envelope as C3 | Build the seam; feed exists |
| Snowflake | analytical reads per C4 | Build views; buy nothing |
| Commodity/FX price indices | external feed → C4 subject area | **Buy** (S&P Global / Beroe class); build only the feed adapter |
| Supplier risk / financial-health data | external feed → I3 scoring | **Buy**; build the scoring composition |
| WhatsApp BSP | 360dialog Business API (today honestly badged "Simulated — 360dialog") | **Buy** (BSP); build template + webhook seam |
| e-Faktur / e-invoicing | DJP-compliant provider | **Buy/integrate**; build the match hook (I4) |
| OIDC IdP | claims → transition-role mapping (the data table in `roles.ts` swaps per design) | **Buy** (corporate IdP); build the mapping |
| Document extraction (A2) | extractor → structured payload → command | **Buy** (Rossum-class); build the seam |
| Award optimization solver (A4/I6) | scenario model → solver → award recommendation | **Evaluate buy** (Keelvar-class); build the scenario UI |
| Full CLM | contracts as structured data | **Likely buy** (Icertis-class); build obligation reads |

---

## 4. PER-CAPABILITY PRIMITIVE REGISTER (Axiom 3 — capabilities must compound)

The rule: **no capability ships without naming the primitive it leaves behind**, and each
primitive must have a second consumer identified (or it's a feature, not a primitive).

| Primitive | Established by | Second+ consumers (the compounding proof) |
|---|---|---|
| Classification engine + Paragon taxonomy | I1 | I2 should-cost inputs; I5 guided-buying category routing; A1 copilot grounding |
| External-data-feed adapter (indices/FX) | I2 | Finance (landed-cost), risk alerts, A1 answers, contract index-linked clauses (A4 CLM) |
| Should-cost engine | I2 | I6 award scenarios; finance variance analysis |
| Risk-scoring + certificate-lifecycle engine | I3 (fed by Track R) | I5 routing (halal-certified filter); marketplace badges; A3 sanctions/risk agents; n-tier ESG later |
| Match/exception engine | I4 (seeded F0.2) | Dynamic discounting eligibility (A4); AP analytics; fraud patterns |
| Intake/orchestration router | I5 | **The** Stage-3 agent plug-point (intake triage agent = a router client); Learn surface routing |
| Conversational query layer | A1 | Learn (if FORK-1 = copilot-first); every later agent's explain-yourself surface |
| Extraction-pipeline seam | A2 | I4 touchless input; CLM obligation extraction; GR document capture |
| Agent-execution harness (dispatcher + capabilities + DR-10 audit + kill-switch) | A3 | Every subsequent agent; the ROI-gate reporting reads its audit stream |
| LivenessRegistry | F0.6 | Every seam flip in §6; the env badge; demo-honesty at exec reviews |
| Event timeline surface | F2.2 | A3 agent audit UI; support/debugging; CMVE evidence view |

Already-existing primitives this plan protects (do-not-break list): the canonical state-machine
schema + dispatcher; DR-10 event taxonomy; `IDataService`/`QueryScope`/`Page<T>`/`DataError`;
the scoped query-hook layer; central label maps + StatusPill resolver (i18n); chartPalette +
DP tokens; the vitest floor (557, never regresses).

---

## 5. EFFORT / SIZING + SEQUENCING (census-grounded, not roadmap-optimism)

Units: **batch** = one independently-green PR (the established working unit; floor grows or
holds every batch). Sizing reflects the actual seams found in the census — where a seam is
authored-unwired, the estimate is small *because the census proved the hard part exists*.

| Work item | Owner | Size (batches) | Grounding |
|---|---|---|---|
| F0.1 ledger | frontend seat | 1 | docs-only |
| F0.2 GR→invoice-match cascade | frontend seat | 1 | fan-out slot + resolver pattern already exist (`cascades.ts`, RFQ-award precedent); flow authored |
| F0.3 RFQ/quotation verb wiring | frontend seat | 2–3 | verbs authored-unwired; UI surfaces exist; per-verb toast/i18n/floor work |
| F0.4 five remaining flows + exit stamp | frontend seat | 2–3 | paper-fits done in census doc; schema authoring is the proven cheap motion (PO flow precedent) |
| F0.5 contract package | frontend seat | 2–3 | generation tooling + hand-authored semantics; types are the source |
| F0.6 LivenessRegistry | frontend seat | 1 | replaces scattered hardcoded markers |
| F1 backend core | **SE Team** | **LONG POLE #1** (research: bulk of the 0–9-mo window) | greenfield: zero server code today; contract de-risks but does not shrink it |
| F1.1–F1.3 adapter + conformance kit + flips | frontend seat | 3–4 | seam designed for this (`DataServiceContext.tsx:5`); floor contracts already executable |
| F2 S/4HANA event seam | SE Team (+ SAP BASIS) | LONG POLE #2 — **blocked on D-SAP** (§7) | Event Mesh provisioning is org work, not code |
| F2.1 simulator + F2.2 timeline | frontend seat | 3–4 | envelope specified at F0.5; AuditSink read surface exists |
| F3 Snowflake + data QA | data team + operator | **LONG POLE #3** — spend classification & vendor-master resolution are organizational, quarter-scale efforts | research: non-negotiable prerequisite |
| I1–I6 fixture-first surfaces | frontend seat | ~4 batches each, ≈ 22–28 total | precedent: every prior page/verb batch landed at this cadence |
| I3 compliance (incl. carve-out payoff) | frontend seat + Track R | 5–6 | resolves 7 registered HALAL-*/CARVEOUT findings; DTO-v2 specified at F0.5; **date-bound** |
| I1–I6 Live flips | SE/data + frontend | 1 each | LivenessRegistry + conformance kit make each flip small |
| A1–A3 | frontend seat + SE Team | 3–5 each; **gated** on F3 quality bar + per-agent ROI gate | harness is ~80% designed (dispatcher/capabilities/audit exist) |
| A4 | mostly procurement of feeds | seam batches only (1–2 each) | buy-vs-build per §3-C5 |

**Long poles, ranked:** (1) F1 real backend — greenfield, SE Team, everything Live depends on
it; (2) F3 data quality — organizational, not code; starts the moment F2 events flow, needs
operator sponsorship; (3) **Track R harvest — operator-paced** (a normal capability; feeds the
I3 compliance surface whenever it lands — no external deadline gates the build); (4) D-SAP
decision — informs F2 provisioning lead time.

**Frontend-seat throughput reality:** at the demonstrated cadence (~1–2 green batches/day on
this codebase), F0 completes in roughly one working week. Stage-2 fixture-first surfaces are
weeks, not months. **The calendar is set by the SE Team, data quality, and Track R — not by
this repo.** The frontend seat's job is to never be the reason anything waits.

**What this seat will NOT do:** invent backend estimates on the SE Team's behalf (their stack,
their sizing — the contract is the interface), or ship any intelligence capability as "Live"
ahead of its data-quality gate.

---

## 6. HONEST-BY-CONSTRUCTION MIGRATION PATH (simulated → real, seam by seam)

Mechanism: the **LivenessRegistry** (F0.6) — one map `{seam → 'simulated' | 'live'}` driving
every marker. A seam flips ONLY when its real integration passes the conformance/acceptance
test; the flip PR carries the proof. The demo never outruns the truth (Spine §7): fixture-backed
is fine *because it is marked*, and the markers turning off one by one **is** the SE-Team
progress report.

| Seam | Today (marker) | Flip event (proof required) |
|---|---|---|
| Each `IDataService` sub-service (7 flags, per F1.3) | mock fixtures | F1 backend passes the F1.2 conformance kit for that sub-service |
| Auth / identity | in-app persona switcher | OIDC live; persona switcher becomes a dev tool |
| Tenant scoping | client-side (`applySupplierScope`) | server-side enforcement demonstrated (scoping suite green over HTTP) |
| SAP posting (`sapBoundary`: GR post, invoice release) | mock `settle` mints fake refs (`REF-1`) | real material-document/clearing refs arrive via F2 webhook |
| ASN logistics (`t_asn_in_transit`/`t_asn_deliver`) | **unfired** (honest: no fake movement today) | first real TMS/carrier event fires them; F2.1 simulator marked simulated in the interim |
| WhatsApp channel | badge literally reads "Simulated — 360dialog (Phase 4′)" | 360dialog BSP live; templates approved |
| Commodity/FX intel | `getCommodities` fixture rows | bought index feed flowing into C4 subject area |
| Spend analytics | fixture aggregates | Snowflake views live + ≥90% L3 classification gate met |
| Compliance registry | fixture certs + BuyerCompliance carve-out | R2.2: DTO-v2 served from CMVE off the Track R harvest; carve-out page re-pointed to `useDataService()` |
| Audit trail | `InMemoryAuditSink` (lost on reload) | durable sink persisting DR-10 shape; timeline (F2.2) reads history |
| Sample-data pills (grade history, storefront, etc.) | "Sample data" StatusPill | each replaced by a real read (e.g. PERF-GRADEHIST-01 `getGradeHistory`) |
| Agents (Stage 3) | n/a | each agent ships with kill-switch + audit + ROI gate **before** autonomy widens |

Rule: **no green "CONNECTED"/"Live" affordance can render from a simulated seam** — the
registry makes this structural (the marker component reads the registry; pages cannot lie).

---

## 7. TRACK R — THE PARALLEL OPERATOR LANE (a normal capability)

**Track R is a NORMAL capability — de-pressurized, on equal footing with every other lane.**
The GR 42/2024 halal regime (BPJPH — mandatory halal certification for cosmetics) is real-world
regulatory context, but **no external deadline gates the platform build**: certification is
handled manually by the compliance team, and our job is only that the platform MODELS the full
compliance process well, switchable on whenever (this year or next). Switch-on timing is
operational, not a build gate. The census found the lane cold (R0.1–R1.5 NOT STARTED); that is
an operational state on the operator side, not a code blocker.

Firewalled from the code spine (law 0.7) but **feeding the Stage-2 I3 primitive**: the
certificate-lifecycle engine is only as real as the harvested registry behind it. Sequence:
Track R harvest (operator) → CMVE/registry (R1–R2.2, SE-adjacent) → DTO-v2 serves
`getCompliance`/compliance surfaces → I3 flips Live → the 7 registered HALAL-* findings close.

**Four operator inputs remain OPEN (informational — they shape switch-on timing on the operator side; they do NOT gate the build):**

| Decision | What it decides | What it blocks while open |
|---|---|---|
| **D-CAL** | The renewal-calendar ownership + the certification calendar of record | The reminder ladder (R1.2) and every expiry clock downstream (HALAL-CLOCK-STATE-01) |
| **D-STAFF** | Who runs the harvest + registry upkeep (named owner, not a role) | R0.1 certificate harvest — **the long pole of the lane** (operator-paced) |
| **D-SAP** | SAP BASIS/integration session — event/OData access, vendor-master extract | F2 provisioning lead time; the vendor-master feed into F3; SAP-side cert custody questions |
| **D-DPO** | Data-protection sign-off for supplier document/cert storage | The registry itself (CMVE persistence) and WhatsApp reminder dispatch (HALAL-REMIND-01) |

Interim mitigation already honest in-product: reminder toasts are truthfully labeled, the
"Phase 2" banners state what isn't built (HALAL-REMIND-01/UNDERREVIEW-01 registered). R0.3
static how-to-renew content remains **operator-authored, zero platform build** (the operator-authored
Learn substitute — untouched by FORK-1).

**Recommended cadence:** a standing Track-R checkpoint on the operator's side with the four
inputs as the agenda until they close; the build plan's I3 phase consumes whatever the harvest
yields whenever it lands — the phase is not scheduled against an external date.

---

## 8. DECISION REGISTER — forks surfaced for the operator (not silently picked)

| # | Fork | Options | This plan's note (not a decision) |
|---|---|---|---|
| FORK-1 | **Learn module shape** — v2.2 says "TMS GuidedLesson shape, 7 lessons/~24 steps, flow-bound, bilingual, halal-renewal first"; v2.1 says "co-pilot-first (RAG over live definitions; thin scripted onboarding only)" | (a) scripted GuidedLesson at Stage 2 (buildable fixture-first now, no AI dependency) · (b) copilot-first at Stage 3 A1 (better end-state, later) · (c) minimal scripted halal-renewal walkthrough at I3 + full Learn absorbed into A1 | (c) preserves the halal-first intent without double-building; R0.3 static content covers the deadline window either way |
| FORK-2 | **Phase 2′ exit strictness** — author-only the 5 remaining flows (F0.4 as written) vs wire every remaining verb before stamping | author-only is honest if stated; full wiring adds ~3–4 batches before contract freeze | Contract completeness argues for at least authoring; wiring can ride the Stage-2 phase that owns each surface |
| FORK-3 | **Contract-package tooling** — generated JSON Schema/OpenAPI from TS vs hand-authored specs | generation keeps contract & code in lockstep; hand-authored reads better for the SE kickoff | Recommend generate + a hand-authored semantics layer (both, thin) |
| FORK-4 | **ID-first default flip** (findings.md:50) — when does the runtime default flip EN→ID? | now (sweep complete, floor 557) vs at first external supplier demo | Cheap either way; purely an operator call on audience |
| FORK-5 | **Buy-list confirmations** (per §3-C5) — price-index vendor, risk-feed vendor, e-Faktur provider, OIDC IdP, WhatsApp BSP (360dialog assumed), CLM/solver evaluations | procurement decisions with lead times | Only the *seams* are in this plan's scope; feeds are bought (Spine §7) |
| FORK-6 | **Backend stack** — SE Team's choice, unconstrained by this plan | — | The portal constrains the contract only; do not import the old NestJS/Postgres assumption as a requirement |
| FORK-7 | **Design opens needing operator sign-off** — DP2-PALETTE-01 recolor set, DP3-CHIP-01 tone conflicts (both explicitly waiting on operator per findings.md) | approve proposed sets vs re-scope | Small batches once signed; they ride Stage-2 surface work opportunistically |

---

## 9. IMMEDIATE NEXT ACTIONS — DISCHARGED 2026-07-14, SUPERSEDED 2026-08-20

⚠️ **EVERY ITEM THIS SECTION LISTED AS "NEXT" CLOSED FIVE WEEKS BEFORE THIS
CORRECTION, AND THE SECTION WAS STILL THE PLAN OF RECORD'S LAST WORD.** What it
said, and what is derivably true:

| §9 said | Derived state (2026-08-20) |
|---|---|
| 1. Operator reviews; on acceptance it becomes the canonical forward plan | **DONE** — merged PR #65, 2026-07-14; named canonical in `CLAUDE.md` |
| 2. Operator rules on FORK-1 / FORK-2 | **DONE** — FORK-1 = (c), FORK-2 = hybrid, both recorded in `CLAUDE.md` |
| 3. Frontend seat executes F0.1 → F0.6 as sequenced batches | **DONE** — all six merged 2026-07-13, F0 closed by PR #60 (`db625d5`) |
| 4. F0.5 contract-package hand-off = the Stage-1 kickoff | **F0.5 SHIPPED** (PR #59, `docs/contracts/`); the hand-off MEETING is operator-side and unrecorded here |

Re-runnable: `git log --format='%ad %s' --date=short | grep -oE '^[0-9-]+
F0\.[0-9]' | sort -u`. Stage I ran on past it too — I3.1 → I3.4 merged
2026-07-13/14 (PRs #61–#64) — and so did all of Stage G (G0.1 → G1.3, PRs #67–#73,
2026-07-14/15).

**THE INSTRUCTIVE PART IS NOT THAT IT WENT STALE. IT IS THAT NOTHING COULD
NOTICE.** `npm run gates` typechecks the tree, collects the suite and asserts the
floor; **no gate reads a plan.** A build number that drifts reddens CI within a
day; a plan that drifts is corrected only when a human happens to re-read it, and
this one was not re-read for five weeks while five arcs ran past it. That is the
same mechanism as `FLOOR-IN-PROSE-01` — a fact restated in prose, with no build
step failing when it stopped being true — and it is why the recalibrated path
below lives in `CLAUDE.md`, which every seat loads, rather than only here.

---

## 9′. THE RECALIBRATED PATH (ruled 2026-08-20)

The canonical statement is `CLAUDE.md` → **THE RECALIBRATED PATH**; it is
summarized here so this document does not again become the stale copy. Three
arcs, in order, and **nothing else is queued**:

1. **ARC 1 · TRACK R** — the operator-editable halal certificate registry
   (`COMPLIANCE_REGISTRY` is 16 frozen synthetic rows and `compliance` has no
   `CommandTarget`, so nobody can edit a certificate), the expiry projection
   running on dates a person entered, and `verifyHalalAtReceipt` — authored,
   tested, and headless by ruling — finally acquiring its consumer at H4.
   **This reverses, for sequencing only, the 2026-07-15 de-pressurization
   (PR #75).** Track R remains a capability the platform models honestly; what
   changed is that it is now first. The 17 Oct 2026 BPJPH date (GR 42/2024) is
   58 days out from this ruling. No honesty marker moves: `compliance` stays
   SIMULATED behind its two-gate guard until the harvest is real.
2. **ARC 2 · THE REQUISITION LANE** — the approval half. `t_pr_submit` /
   `_approve` / `_reject` are dispatchable (the `CommandTarget` IS wired) and
   have no caller; the `Draft` panel's **"Submit for approval"** button fires a
   success toast over no state change, and `Pending Approval` has no affordance
   at all.
3. **ARC 3 · SUPPLIER ONBOARDING** — `/register` is 1,551 lines of `useState`
   with zero service calls. A supplier completes onboarding and nothing records
   that they did.

**PARKED, NOT QUEUED** (machine hygiene, not mandate work — full statement and
derived populations in `CLAUDE.md`): the dead-end-state census (**37**, not
eight), GL-0b's **125** unregistered unions, the **29** stored-field allowlist
rows, and R1d — which is parked as a token because the register names it once and
defines it nowhere.

**And one rule now governs what may be dispatched at all:** *no batch may be
dispatched whose deliverable is a register entry, unless that entry is a
contract* (`CLAUDE.md`; measured in `docs/findings.md` §61).

---

*Produced by Seat 2 (Fable 5) on 2026-07-13 from: `docs/Paragon_Platform_Strategic_Spine_v1.md`
(authoritative brief), the 2026 competitive-frontier benchmarking report, and the repo
readiness census @ `14e9ce9`. Honest-by-construction applies to this document too: everything
labeled greenfield is greenfield; every seam claimed to exist carries a file reference.*
