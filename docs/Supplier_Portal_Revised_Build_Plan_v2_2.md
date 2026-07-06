# Supplier Portal — Build Plan v2.2 (Adjudicated Execution Plan)

**Date:** 2026-07-05 · **Days to 17 Oct 2026 halal deadline: 104**
**Supersedes:** Build Plan v2.1 (remains valid where not amended here)
**Basis:** Critical Review Report v2 (second Fable review, 33 findings: 2 BLOCKER · 12 MAJOR · 19 MINOR), chat-adjudicated 2026-07-05. All 33 accepted; F2-33(i) amended to operator ruling; F2-16 deferred to Phase 2′ exit.
**Canon correction:** TMS Learn module = 7 lessons (~24 guided steps), not 44. All prior references amended.
**Executor:** CC CLI seat (Opus 4.8). Follow steps literally and in order. Every step ends with a report to chat; no step begins without explicit GO unless marked AUTO.

---

## 0 · EXECUTION PROTOCOL (read first, binding)

1. Four-actor model: Chat (strategist) plans and adjudicates; CLI seat implements; the operator approves and merges via GitHub UI (Squash + delete branch); investigation ALWAYS precedes build.
2. Gates on every commit: `tsc --noEmit` green · `npm run build` green · full `npx vitest run` green · floor ≥203 (ratcheted at Phase 1′ close; never regresses) · identity-clean (no attribution lines in commits/PR bodies).
3. Atomic commits; one concern per commit; one batch per PR unless this plan says otherwise.
4. Findings flip to CLOSED only in a docs commit that follows merge evidence (F2-07 rule — now law).
5. Clock-derived states (Expiring/Expired/Overdue/Upcoming) are COMPUTED AT READ TIME from dates. Never stored, never commanded, never in a transition table (F2-09 — now law).
6. Honest-by-construction: no fabricated system artifacts (SAP doc numbers, delivery claims). Real, or visibly deferred/simulated.
7. Track R firewall: nothing in Phases 2′–5′ may gate or delay Track R. SEED NOW items are schema/type/naming work measured in hours inside already-scheduled batches.

---

## STEP 0 — PRECONDITIONS (verify, do not assume)

- **0.1** Confirm PR #31 merged to main, production green. If unmerged: HOLD, report to chat.
- **0.2 AUTO** Fresh branch `chore/v2_2-canon`. Verify this document is present in `docs/` (the operator commits it via web editor before you start).

---

## STEP 1 — CANON TRUE-UP PR (one PR, ~6 small commits) [F2-01, 03, 04, 05, 06, 07, 20, 26]

- **1.1** CLAUDE.md: rewrite "Current state" to actual (main SHA, Phase 1′ batches merged, floor 167); ADD SEC-GATE to Deploy section (middleware.js, HMAC cookie gate fronting shell + /assets/*).
- **1.2** findings.md: fix header SHA pin; fix drifted anchors (NAV-02 → AppRouter.tsx:82; DP1-WA-EMAIL-01 → :969); CLOSE SHIP-FIXTURE-01 (satisfied, evidence BuyerShipments.tsx:35-39); INV-SEED-01 disposition "Phase 2A" → "Phase 2.1′ (retired-by-pattern, see Step 3.6)".
- **1.3** findings.md: register **COMPLIANCE-CARVEOUT-01** — "BuyerCompliance deliberately unmigrated from fixtures; lands at R2.2. Phase 1′ exit criterion amended to: all pages on useDataService() EXCEPT this registered carve-out."
- **1.4** findings.md: register the six halal findings (fixture cross-persona contradiction sup-007; status-vs-expiry contradiction; deadline drift; Under-Review second-class [F2-23]; Remind no-audit/no-throttle/false-delivery [F2-24]; issuer-blind validity [F2-21]) + GR-FABRICATION-01 (GRInspectionWizard.tsx:677-726 fabricates MAT-DOC numbers + 'Posted to SAP' client-side; fix in 2.2′(i)) + GR-LEGACY-READ-01 (GRInspectionWizard.tsx:6,118-125 direct mockShipments import).
- **1.5** Commit `docs/Halal_Compliance_Control_Design_v1.md` into `docs/` (the operator supplies content from Project files via web editor if the CLI seat lacks it — coordinate through chat).
- **1.6** Build Plan v2.1 header: deadline line → "17 Oct 2026 — CONFIRMED per GR 42/2024 (D-DATE RESOLVED)"; delete the R0.6 confirm-instruction.
- **1.7** Two one-line code fixes (same PR, honest-now class): BuyerCompliance.tsx:111 + :174-175 → deadline 2026-10-17 everywhere; Remind toast copy (:332-350) → "Reminder queued (simulated — delivery pending live channel)" (full fix rides R2.2).
- **GATE:** Operator smoke (BuyerCompliance shows 17 Oct + honest toast) → merge.

---

## STEP 2 — BATCH 1.4 + PHASE 1′ CLOSE (as per v2.1, amended) — ✅ CLOSED (PRs #33, #34)

- **2.1** Investigation dispatch: legacy PO dual-field aliases, dto.ts fallback collapse, retire purchaseOrder.types.ts. Report before build (>25 files = report count). — ✅ **DONE** (12-file footprint; LOW-risk de-alias verified).
- **2.2** Build on GO. Exit criterion per COMPLIANCE-CARVEOUT-01. — ✅ **DONE (PR #33 `2b0be05`).** One canonical `PurchaseOrder`/`POLineItem` shape; `dto.ts` + `hooks/useSupplierPortal.ts` + `types/purchaseOrder.types.ts` retired. **Census MET:** every data-bearing page on `useDataService()` except the registered carve-out.
- **2.3** Exit audit. — ✅ **DONE (PR #34).** sp-001 all-routes smoke (32 routes), sp-002 scoping across 3 tenants (sup-007/002/005), **HALAL-XPERSONA-01** supplierId-keyed cross-persona invariant (KNOWN whitelist sup-007/sup-003 by finding-id; new contradiction fails; reads through `svc` so it survives R2.2). Floor 167→**203**. Playwright backstop: **operator ruling A** — rely on the in-floor vitest guarantee (3-tenant scoping contract + per-page `withChaos` states); committed suite deferred (E2E-SUITE-01). `.env` gate-creds hygiene confirmed (owner/SYSTEM-only ACL; `.gitignore` blocks `.env`).
- **2.4** D-5 docs true-up + Phase 1′ marked CLOSED with PR refs. **Phase 1′ ends here.** — ✅ **DONE (PR #34).** findings.md dispositions current (DP3-FONT-02, E2E-SUITE-01 registered; HALAL-XPERSONA-01 guard noted); CLAUDE.md current-state → floor 203 / PRs #32–#34; this plan Step 2 + Phase 1′ marked CLOSED.

**PHASE 1′ CLOSED** on the PR #34 merge. Exit criterion met: all pages consume `useDataService()` except the registered COMPLIANCE-CARVEOUT-01 (lands R2.2). Test floor 203.

---

## STEP 3 — PHASE 2.1′ REVISED: SCHEMA + PROOF (the amended core) [F2-08, 09, 10, 11, 12, 13, 15, 27, 29, 30, 32]

Investigation-first. Deliverables in order:

- **3.1 Transition schema (TMS-shape, adapted).** Metadata per transition: `{id (stable, t_po_confirm style), from[], to, trigger: 'user'|'system'|'cascade'|'creation', requiredRole (namespaced transition-role), requiredFields[], policyHooks[] (by registered name, never closure), version}`. Loader registry enumerating all flow definitions (`getKnownFlows()`). Clock triggers are TYPE-LEVEL DISALLOWED (compile error) — enforces law 0.5.
- **3.2 Census paper-fit (half-day, no code).** Fit the schema against all 15 machines from Review v2 Scope B census (PO 7, Shipment 9, ASN 5, GR 7+5+3 nested, Invoice 17 split, RFQ+Quotation 9 fan-out, Contract 6, Obligation 4, PR 6, SupplierDocument 5, Compliance ×5 vocabularies). Output: fit table — which machines need creation-shape, cascade, projection. Report to chat; close any schema gaps BEFORE building the dispatcher.
- **3.3 Invoice vocabulary ruling (chat adjudicates from the paper-fit):** unify to one canonical invoice machine + persona projections, OR two machines + a mapping. Decision registered as DR-7 before any invoice verb is templated.
- **3.4 Dispatcher.** Single dispatcher, validates: transition legality, requiredRole, requiredFields, AND **QueryScope on every command exactly as reads** (supplier A cannot command supplier B's entity — SCOPE_DENIED). Extend scoping.contract.test.ts to commands. This is DR-6-amended.
- **3.5 Command status:** returns `{correlationId, status: done|submitted|failed}` + new read `getCommandStatus(correlationId)`. Chaos mock extended: SAP-boundary verbs hold `submitted` pending with later settlement (reads-only chaos → commands too).
- **3.6 Canonical mutation pattern:** command → in-memory store mutation → targeted `invalidateQueries` by scopeKey prefix → page re-derives. NO local seeded copies. INV-SEED-01 retired-by-pattern; existing seeded copies (BuyerInvoices, SupplierRFQs, BuyerGoodsReceipt) migrate when their verbs land in 2.2′.
- **3.7 Role vocabulary:** namespaced transition-roles derived from the catalog + persona→transition-roles mapping table AS DATA (`buyer→[…], supplier→[…]`). Phase 4′ OIDC swaps the mapping, never the metadata.
- **3.8 Event taxonomy (ONE shape, coordinated with Track R):** dispatcher emits `{event: transitionId, actor, scope, correlationId, outcome, ts}`; CMVE AuditSink persists the same shape. Single decision prevents the Phase-5′ retrofit.
- **3.9 DNA type seeds (types only, zero build):** reserve `getCapabilities(scope): Promise<CapabilitySet>` on the service interface (mock-backed); add optional `guidance` prop slot to STATE-PRIM-01/DEFER-ACTION-01 primitives when they land.
- **3.10 PROOF: PO-confirm end-to-end** through 3.1–3.8 on SupplierOrders (user-trigger + requiredFields qty payload + scope enforcement + status + invalidation + event emission). Operator smoke → merge. **Proof gate = schema paper-fit accepted (3.2) + PO-confirm green. Both, not either.**
- **3.11** Re-baseline Phase 2′ sizing: interface surface = 50 read methods (not ~31); update action-layer estimates. Report deltas to chat. — **CONFIRMED (2026-07-06):** read surface counted at **50** (suppliers 3 · procurement 22 · risk 6 · discovery 5 · analytics 7 · engagement 7). NEW write surface: `commands.dispatch` + `commands.getCommandStatus` + `getCapabilities` (3 methods). Action-layer estimate is now **per-transition verbs over ONE dispatcher**, not per-method actions: the ~15 census machines' verbs route through the single `dispatch` seam (schema-driven), so the action-layer count scales with *transitions authored*, not interface methods. Full deltas reported to chat.

**Step 3 status (2026-07-06):** 3.1 schema + 3.2 census merged-pending (PR #35); **3.3 DR-7 RATIFIED** (Option A); **3.4–3.9 BUILT** (dispatcher + command status/settle + mutation store pattern + roles-as-data + one-shape event taxonomy + capabilities/DNA seed); **I18N-01** seam adopted (react-i18next, EN + ID stub); **3.10 PROOF GREEN** (PO-confirm end-to-end on SupplierOrders: user trigger + `confirmedQuantities` payload + scope enforcement + status + invalidation + event emission). Floor 224→241.

---

## STEP 4 — PHASE 2.2′ VERB BATCHES (per v2.1 order, amendments)

**Batch (i) — ASN verbs — ✅ BUILT (2026-07-06, floor 250→253).** ASN flow
authored (5 states; the `t_asn_create` `creation` verb is the CANONICAL creation
pattern — optional `CommandInput.entityId`, store-assigned number on
`CommandResult.entityId`, creation scope derived from the payload's parent PO
(`poReference` → supplierId, cross-supplier ⇒ SCOPE_DENIED), legality via the
`asn_create_po_confirmed` hook). Dispatcher creation path added. `t_asn_submit`
wired. Mutable `asnStore` (immutable-update). SupplierShipments create/submit
wired; the fabricated `ASN-2026-007` + false "Paragon WMS notified" toast are
retired (honest store-assigned number + "transmission pending live channel"; a
blank draft honestly fails). i18n `asn.*` (EN + ID). Riding fix: SupplierOrders
drawer Key Facts live-derive. `t_asn_in_transit`/`deliver` (system) +
`t_asn_discrepancy` (cascade ← GR) authored-unwired. Order next: (ii) GR verbs.

- Lifecycle chain first: confirm PO → ASN → GR → invoice. GR verb REPLACES the fabricated MAT-DOC path: 'Posted to SAP' becomes a `submitted` async command; fabricated number → "pending SAP assignment" treatment (GR-FABRICATION-01 closes here).
- Invoice verbs wait on DR-7 (Step 3.3).
- RFQ Award = cascade-class verb; must use the schema cascade shape, not N hook calls.
- Seeded-copy pages migrate to the 3.6 pattern as their verbs land.
- Phase 2′ exit = SPINE COMPLETE ★ + mutation-chain behavioral audit + P2/P4 sizing recalibration (F2-16 decision point).

---

## STEP 5 — TRACK R AMENDMENTS (parallel; operator-side items are THE critical path) [F2-17, 18, 19]

- **5.1 THIS WEEK (operator):** Track-R status register stands up as `docs/track-r-status.md` (this repo until CMVE exists): dated entries for R0.1 harvest, R0.2 wave, R0.3 WABA, D-DPO, D-SAP, D-CAL/D-STAFF. Rule: if the harvest hasn't opened by **12 Jul**, schedule slips week-per-week — re-plan R3 buffer immediately, not in September.
- **5.2** D-CAL + D-STAFF answers = this week's hard gate (the portal IS the ladder; the question is who operates Remind + escalation).
- **5.3** X-1 (AWS Jakarta) escalation files NOW if not filed.
- **5.4** Pre-declare a Track-S zero-week for the CMVE scaffold week (per Part E rule) — planned, not discovered.
- **5.5 R1 pre-task (registered, blocks R1.1): ComplianceRegistryEntry DTO v2** — CMVE-side canonical shape, superset of Part H harvest schema: `{supplierId, supplierName, certType, issuer/scheme (MUI|BPJPH — validity dimension), category, materialRefs[], evidenceLink, issued, expiry, status: valid|under_review|missing|expired-COMPUTED, remindAudit[]}` + portal projection. `ComplianceRow` (types.ts:562-570) is **deprecated-at-birth**. The five portal compliance vocabularies retire opportunistically into this. Restores v1.1's dropped reconciliation instruction.
- **5.6** R2.2 definition-of-done amended: BuyerCompliance re-point = DTO-v2 projection (it is a redesign, not a re-point); BPJPH KPI derives from scheme-aware validity (Valid+MUI post-deadline = NON-compliant); Under-Review gets explicit semantics (KPI slot, remind-eligibility=false); Remind dispatches through the R1.2 ladder (audited, throttled, real) or ships visibly deferred; sup-007 cross-persona fixture reconciliation rides the DTO, not row patches.
- **5.7** R0.3 WhatsApp reminder templates link to static how-to-renew content (operator-authored, zero platform build) — the deadline-safe Learn substitute.
- **5.8 OPERATOR RULING REQUIRED at R1 kickoff — magic-link elevation:** supplier taps WhatsApp reminder → lands on the exact upload screen, zero login friction. Deadline-POSITIVE (renewal conversion = R2 coverage) but consumes R1 capacity; floor (procurement-mediated intake) already planned. **Chat recommendation: elevate — coverage is the binding constraint at the R2 gate and supplier lead-times cannot be compressed. Decide explicitly, either way.**

---

## STEP 6 — DEFERRED/PLACED DNA ITEMS (register, do not build now)

- Learn guided lessons (TMS GuidedLesson shape, flow-bound, role-scoped, bilingual; halal-renewal walkthrough first): Phase 3′ alongside P2.
- Capability registry + admin: Phase 3′ (P5 pilot). Per-BU matrix: SKIP.
- Cmd+K palette: Phase 3′ tail or 5′. Adaptive/usage telemetry engine: SKIP until 5′ (event shape from 3.8 is the seed). Role admin/composition: Phase 4′ (OIDC). Delegation UI: SKIP.
- Inbound SAP event boundary: NAMED in Phase 4′ spec now (one sentence in canon), built 4′. Write-write conflict rule: designed at Phase 4′ SAP write path. Offline portal state: SKIP (WhatsApp is the low-connectivity channel).

---

## DECISION REGISTER DELTAS

- **DR-6 AMENDED:** dispatcher enforces QueryScope on all commands; scoping contract tests cover commands.
- **DR-7 RATIFIED (2026-07-06):** invoice = **one canonical machine + persona
  projections** (Option A). Canonical lifecycle `Submitted → Matched → Approved →
  Payment Released → Remittance Received` (+ `Disputed` branch). Buyer/supplier
  vocabularies are projections via the Step 3.7 persona→role/label mapping; the
  3-way-match is a registered sub-flow (census gap G2); `Overdue` is computed at
  read time (census gap G1, law 0.5). Two-machines-plus-mapping rejected on the
  HALAL-XPERSONA-01 drift precedent. Invoice verbs template against this shape
  (Step 4). See `docs/transition-schema-census.md` §5.
- **DR-8 ADOPTED:** clock-states computed-never-stored (law 0.5).
- **DR-9 ADOPTED:** TMS-shape transition schema as the 2.1′ metadata format.
- **DR-10 ADOPTED:** one audit/telemetry event taxonomy across dispatcher + AuditSink.
- **DR-11 OPEN (operator):** magic-link elevation into R1.4 core — rule at R1 kickoff.
- **D-DATE:** RESOLVED, 17 Oct 2026 (GR 42/2024).
- **Canon correction:** TMS Learn = 7 lessons, not 44.

---

## ORDER OF EXECUTION (literal)

`0 → 1 → 2 → 3 (3.1 → 3.2 → report → 3.3 ruling → 3.4–3.9 → 3.10 proof → 3.11) → 4` · Step 5 runs PARALLEL from today (5.1–5.3 immediately, operator-side) · Step 6 is registration only.

---

**End of Build Plan v2.2. The architecture survived review; the seams are the work. Execute in order, report every step, floor never regresses.**
