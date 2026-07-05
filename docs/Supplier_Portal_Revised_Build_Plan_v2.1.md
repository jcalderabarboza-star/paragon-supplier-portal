# Supplier Portal — Revised Build Plan v2.1

**Document type:** Revised, dependency-ordered build plan — supersedes v1.1 and v2.0 upon ratification
**Project:** Ops Project #11 — Global Supplier Portal Platform (Paragon Odyssey)
**Built on:** Current State of Truth v1.0 (code-verified) · End-to-End Build Plan v1.1 (baseline) · Critical Review Report v1 + Revised Build Plan v2.0 + CMVE Infra Brief v1 (the Fable audit) · Fable Audit Adjudication v1 (the rulings) · CLI read-only fact-check (the verification)
**Date:** 2026-07-03 · **Days to compliance deadline: ~106 (17 Oct 2026 — CONFIRMED per GR 42/2024, D-DATE RESOLVED)**
**As-built HEAD:** main @ 248ca75
**Status:** RATIFIED · Phase 0 complete. Authored on **verified ground**: every repo-facing claim below was confirmed by CLI fact-check against the running tree, not reasoned from documents.

> **What v2.1 is:** the reviewed plan. It takes v2.0's two-track structure (Track R regulatory / Track S spine), applies the adjudication's four amendments, and folds in five corrections the CLI fact-check forced against the running code. It is the executable spec.

---

## PART 0 — WHAT CHANGED vs v2.0 (and why)

| # | Change | Source | Effect |
|---|---|---|---|
| 1 | DR-3 (TanStack Query) → **gated**: adopt pending the 3-page pattern-proof | Adjudication | De-risks the single-operator learning curve; not a rejection |
| 2 | DR-5 (read envelope) → **freeze the type signature now, defer pagination machinery** (mock ignores cursor) | Adjudication | Stops the shape-freeze problem without scope creep |
| 3 | DR-6 (command template) → **prove on PO-confirm before fanning out** to all verbs | Adjudication | Three seams in one template; prove before broad application |
| 4 | DR-4 (error contract) → **corrective/full-urgency, not additive** | **Fact-check (Claim 1)** | No error channel exists at all (no Result/typed error; `T[]`/`T\|null` only); building it is greenfield, not refinement |
| 5 | "19 read methods" → **31 read methods, 27 list-returning** | **Fact-check (Claim 2)** | Fable undercounted ~40%; any sizing keyed to "19" rescales up |
| 6 | Fixture-seeding task **shrinks** | **Fact-check (Claim 4)** | Buyer-side cross-supplier tests are writable **today** (buyerInvoices carries sup-001…007; legacy mocks sup-001…012). Only *supplier-side* fixture diversity is missing — not "no multi-supplier data exists" |
| 7 | Locale pass **quantified: ~127 inline format sites across 23 files**, no util, no i18n lib | **Fact-check (Claim 6)** | Real work, cheap per-page during migration but not free — sequence deliberately |
| 8 | Added **R1.0 production-infra standup** as an explicit line | Adjudication G-1 | First-ever prod deployment is real elapsed time, not a clean code deliverable |
| 9 | Added **R2 operational exception-handling process + named owner** | Adjudication G-2 | The blocklist is only a control if a named human enforces it daily |
| 10 | Added **standing firewall**: no hybrid-product agent work on any critical path except compliance-as-agent (R2.3) | Adjudication F-13 | Vision documented now, built later; deadline work stays deterministic |
| 11 | I-5 email → **SES API from ap-southeast-3** (verified in-region); external SMTP vendor (X-6) **dropped** | Adjudication D.1 (web-verified) | SES API is available in Jakarta (only SMTP endpoint isn't); data stays in-region |
| 12 | I-8 → **trim always-on staging** to minimal/on-demand | Adjudication | The clearest infra over-build for a 15-week slice |
| 13 | Added NEEDS-INPUT items: 17-vs-18-Oct date, compliance-calendar reality, DPO, SAP capacity, corporate SSO (G-5), security gate (G-6), harvest staffing (G-7 — confirmed manual: SIHALAL has no verification API) | Adjudication + web-verify | Business facts that dominate the technical ones |

**Verified as sound and carried unchanged from v2.0:** the two-track structure; DR-1/DR-2/DR-7 as written; the action layer is greenfield (fact-check Claim 3); no query/cache layer exists (Claim 5); the Vitest floor is real and green — **now merged to main via PR #11** (Claim 7 + post-fact-check merge). The spine of Fable's reasoning holds against the running code.

---

## PART A — ORIENTATION

### A.1 The situation in three sentences

The spine is one-third real and v1.1's spine-first sequence remains correct **for the platform** — but the halal deadline is a real-world obligation a mock-backed pillar cannot meet, so compliance decouples into its own thin-real-backend track opening now. Track R is small by design (one entity family, one scheduler, one enforcement joint, one audit trail) and doubles as the early proof of the mock→real adapter bet. Track S proceeds in parallel, amended so its two once-only passes (the 30-page migration, the action layer) land on their final shape — async-honest consumption, flow-engine-ready commands, locale and role seams left behind.

### A.2 What "done" means

Everything in v1.1 stands, plus: **before the halal deadline, Paragon operates a real, evidenced control that non-halal-certified critical materials cannot be procured for mandatory-halal brands** — real certificate data, real escalations reaching real suppliers, a real block at the real PO-creation point (SAP), and an append-only evidence trail.

### A.3 The two tracks and the one rule

- **Track R — Regulatory (CMVE).** Hard-dated. A thin, real, Jakarta-resident backend + the business workstreams (data harvest, supplier chasing, WABA templates, DPO) that no code unblocks.
- **Track S — Spine & platform.** v1.1's phases, amended.
- **The rule:** on any resource conflict, **Track R wins until gate R2 passes.** Track S work is deliberately pattern-mechanical in that window so it tolerates interruption. The tracks rejoin at the certification-service seam: Track R's backend *is* the first real implementation of the spine's compliance interfaces, and Track S's compliance surfaces become its consumers.

---

## PART B — TRACK R: REGULATORY (CMVE) — hard-dated, opens this week

*Design center: the smallest real system that constitutes a defensible control by the deadline, with headroom. One entity family, one scheduler, one enforcement joint, one evidence trail.*

### R0 — Mobilization (now → ~mid-Jul) — mostly non-code, all lead-time-bound

- **R0.1 · Certificate data harvest (the long pole).** Build the authoritative registry content — supplier × material × cert × issuer × expiry — for halal-critical categories (fragrance/aroma, actives for halal brands, emulsifiers/surfactants, botanical extracts, contract manufacturing). Import shape = the harvest schema (Part H). A spreadsheet is an acceptable v0. **Owned at operator/procurement level; confirm procurement has the staff-hours (G-7). SIHALAL verification is MANUAL — no public API (web-verified) — so `sihalal_checked` is a human-attested field with an evidence link; budget hours accordingly.**
- **R0.2 · 90-day wave executed by whatever exists.** If the ladder engine is not yet live (it will not be), the wave goes out manually from the R0.1 registry — and becomes the engine's first regression baseline. **NEEDS-INPUT: is the ladder running today, and who owns it?**
- **R0.3 · WABA + template submissions.** 360dialog account + Meta business verification initiated; Bahasa renewal-reminder + escalation templates submitted as **utility category** (not marketing — avoids surcharge and higher rates; web-verified). Email fallback via SES API defined.
- **R0.4 · UU PDP floor.** DPO appointment process opened (required pre-go-live); consent language for document intake drafted; retention/classification mapped onto the R1 schema (audit → 7-year WORM).
- **R0.5 · SAP enforcement-joint engagement.** Open the SAP/BASIS conversation — **not "can you build a block" but "can an MM PO-create change land before the deadline at all?"** The answer determines whether the procedural floor is fallback or primary (F-5/X-4).
**Exit R0:** registry v0 populated for critical categories; 90-day wave sent; templates in review; DPO process moving; SAP conversation opened; date confirmed.

### R1 — The thin real slice (~mid-Jul → ~mid-Aug)

- **R1.0 · Production infrastructure standup (NEW — G-1).** The program's first production deployment. AWS account (ap-southeast-3), VPC, RDS provisioning, Secrets Manager, CI/CD with GitHub Actions OIDC federation, CloudWatch, backup/restore runbook (**named owner — G-8**). **Buildable local-first** (docker-compose parity) *before* AWS exists, so X-1 provisioning delay costs deployment time, not build time. This is real elapsed time, not a free precondition.
- **R1.1 · Service + store.** One NestJS service, PostgreSQL (RDS Multi-AZ — I-3 kept; it is the regulatory system of evidence), AWS ap-southeast-3. Entities per Part H. `AuditSink` append-only from day one; S3 Object Lock for evidence exports. Registry imported from R0.1.
- **R1.2 · Escalation engine.** Scheduler (EventBridge → endpoint, I-2) evaluating the 180/90/60/30/7 ladder daily against real expiry dates; notifications via approved WhatsApp templates + **SES API email**; every send audited. Ladder definition written as **declarative data, not code** — it becomes flow definition #2 in the Flow Builder era.
- **R1.3 · The blocklist product.** Deterministic daily output `{supplierId, materialRefs, reason, since}` for expired/missing required certs — queryable, exportable, audited. The enforcement substrate.
- **R1.4 · Document intake (DR-2a).** Procurement-mediated upload (internal auth only — I-6, pending SSO confirmation G-5), consent + provenance recorded; supplier magic-link as fast-follow.
- **R1.5 · Spine seam honored.** The service exposes the compliance subset of `IRiskService` (canonical DTOs) — the first real adapter. Contract tests: scoping, ladder trigger dates, blocklist correctness.

**Exit R1 (gate):** real registry served from Jakarta; ladder firing on real dates over real channels; blocklist correct; audit trail exporting.

### R2 — Enforcement joint + frontend truth (~mid-Aug → ~mid-Sep)

- **R2.1 · Enforcement per DR-1.** Target: SAP-side check at PO create against the blocklist (nightly table load + BAdI, hold-not-fail — I-10, the opening position to the SAP team; hold-vs-fail is procurement leadership's business call). **Guaranteed floor: procedural** — signed SOP forbidding PO creation for blocklisted pairs, daily blocklist distribution to procurement, weekly compliance report from the audit trail. **Validate the evidence pack with compliance/legal + confirm BPJPH-acceptable before relying on the floor (DR-1 amendment).**
- **R2.2 · `/buyer/compliance` goes real.** Portal compliance surfaces re-point from fixtures to the R1 service — the first production-backed screens; the visible proof of the adapter thesis. Migrates early onto the *real* service.
- **R2.3 · Extraction agent (accelerator, not gate — firewalled).** Claude reads submitted certificate documents → extracts issuer/scope/expiry → proposes registry entries → **human approves each (HITL)** → audit-logged. The program's first live agent, on the governance floor R1 poured. **Ships only if R2.1 is on track. The ladder ships rules-based regardless; the agent never gates the deadline.**
- **R2.OPS · Operational exception process (NEW — G-2).** Named procurement owner reads the blocklist daily; defined workflow for non-responsive suppliers, rejected documents, in-window expiries; sign-off cadence. The engine's output is only a control if a human enforces it.

**Exit R2 (gate — go/no-go for Oct):** enforcement joint live (technical, or procedural floor with technical in flight); compliance surfaces on real data; ≥ target coverage of critical-category suppliers; exception process operating; security review passed (G-6).

### R3 — Dry-run, hardening, buffer (~mid-Sep → deadline)

- 30-day wave runs through the engine end-to-end — full-dress rehearsal.
- Steering-committee evidence pack generated *from the audit trail*.
- Deliberate two-week buffer. If R2 slipped, buffer absorbs; if not, slack flows to Track S or the R2.3 agent's conversational fast-follow.

**Exit R3:** enforcement live and evidenced before the deadline.

---

## PART C — TRACK S: SPINE & PLATFORM (v1.1, amended)

*Everything not listed as changed is carried from v1.1 verbatim — the D-1…D-5 pre-locks, migration order, exit criteria, behavioral-audit cadence.*

### PHASE 0′ — Foundation reconciliation

> **[CLOSED — as-built main @ 248ca75.]** Phase 0 shipped in full: 0.1 deploy posture (#12) · 0.2 Vitest floor (#11) · 0.3 branch policy (#12) · 0.4 consumption pattern, gated 3-page proof (#13, #14) · 0.5 chaos mock + typed error contract (#13) · 0.6 locale + i18n primitive (#15) · 0.7 fixture depth + scoping contract (#15). Test floor: 48. The bullets below are the plan as authored.

Carried: **0.2 Vitest floor — DONE, merged to main (PR #11), green.** Remaining: **0.1 deploy posture (D-1)** — retire root GH-Pages artifacts (fact-check confirms `index.html`, `assets/`, `favicon.ico` still at repo root), Vercel-only; **0.3 branch policy (D-4)** — correct CLAUDE.md:5-7 (still says "main only / never create PRs / push directly to main" — stale, contradicted by the PR #10/#11 workflow).

**Added — "migrate once, to final shape":**
- **0.4 · Consumption pattern (DR-3, gated).** Adopt TanStack Query over `useDataService()` — **prove on the first 3 pages before declaring it the standard for all 30.** Decided before Batch 1.1.
- **0.5 · Chaos mock + error contract (DR-4 — corrective, full urgency).** Dev-only latency jitter + injectable failure on `mockDataService`; **typed error/Result envelope added to the interfaces — this channel does not exist today (fact-check), so it is greenfield.** Pagination envelope (DR-5): **freeze the type signature now; mock ignores the cursor.**
- **0.6 · Locale foundation.** One `formatIDR / formatDate / formatNumber` utility (Asia/Jakarta pinned); i18n primitive installed (provider mounted; keys for new/touched strings; no sentence concatenation). **Surface quantified: ~127 inline format sites across 23 files (fact-check)** — consolidate opportunistically during the migration, not as a separate project. **Guardrail: formatters + library install only — NOT translation work mid-migration.**
- **0.7 · Fixture depth (SHRUNK — fact-check Claim 4).** Buyer-side cross-supplier scoping tests are **writable today** (buyerInvoices sup-001…007; legacy mocks sup-001…012). Add service-level scoping contract tests now (buyer=all, supplier-A≠supplier-B, null-id=∅, parameterized). Seed *supplier-side* fixture diversity (currently sup-007-only) as the smaller remaining task.

**Exit:** v1.1's exit + final-shape migration pattern + scoping nets that can catch a leak.

### PHASE 1′ — Data-layer migration (v1.1 order, upgraded landing)

Batches 1.1–1.4 carried (B → C-legacy → C-inline → type cleanup, per D-3). Amendments: every page lands on the 0.4 pattern **with loading/error states rendered** — born async-honest; fold-ins where touched (deferred-action visual treatment; the two nav bugs — persona-toggle-navigate, real 404 — sub-hour each, F-14); `/buyer/compliance` may be pulled forward by R2.2 (migrates onto the *real* service — coordinate so it isn't done twice). Exit: v1.1's + "no page renders data without loading/error handling" + "scoping contract tests green across ≥3 suppliers."

### PHASE 2′ — Action layer (re-templated, re-prioritized)

- **2.1′ · Command template (DR-6 — prove on PO-confirm first).** Every lifecycle command carries declarative transition metadata `{from[], to, trigger, requiredRole (namespaced transition-role vocabulary — the D8 hedge), policyHooks[]}`; one dispatcher validates legality; commands return `{correlationId, status: done|submitted|failed}` so SAP-boundary verbs are honestly async. The default-lifecycle metadata table is **flow definition #1.** **Prove the full template end-to-end on PO-confirm (SupplierOrders — confirmed greenfield, non-persisting today) before fanning out.**
- **2.2′ · Re-prioritized batches (F-10).** By value: (i) P-class lifecycle-chain verbs (confirm PO → ASN → GR → invoice) + compliance-adjacent; (ii) R/O-class row verbs sharing handlers; (iii) H-class header/bulk as the one shared pattern — last, individually deferrable past exit (visibly named deferred). **Note: ~31 read methods / 27 list-returning (fact-check) — the interface surface the action layer sits beside is larger than v2.0 assumed.**
- Exit: every action wired **or visibly named deferred**; one full lifecycle joint proven; transition-table tests green.

**★ Phase 2′ exit = spine-complete milestone.**

### PHASE 3′ — Feature pillars (P3 enforcement has moved to Track R)

What remains here is P3's *frontend completion* as a consumer of the real service (largely done by R2.2 + Phase 1′). Order: **P1 lifecycle** (first; the raison d'être; mostly continuity over Phase 2′'s verbs) → **P2 WhatsApp — re-scoped as the conversational transaction surface** (message/photo → agent parse → `IActionService` verb under the same scoping + audit as the UI, HITL-gated by stakes; buyer hub to parity first) → **P4 analytics** (real numbers, multi-supplier fixtures make it non-hollow) → **P5 marketplace** (last; D6 open until pilot adoption data).

### PHASE 4′ — Backend expansion (no longer a cliff)

Track R already proved mock→real on the compliance slice. Phase 4′ is *extension*, service by service: auth/identity source-of-truth (OAuth2/OIDC, absorbing R1.4's magic-link) → SAP ACL master-data reads (business partner, product/material, cached per D3 hybrid lean) → transactional postings (idempotent via 2.1′'s correlation ids) → WhatsApp real send → EDI/Cleo → Control Tower emissions. D8 reconciliation decided at this boundary against the Phase 2′ vocabulary. Integration-test lane generalized from R1.5's contract tests.

### PHASE 5′ — Hardening & go-live

v1.1 Phase 5 carried; EN/ID full catalog extraction lands here (or earlier as an agent-seat batch); Learn ships **co-pilot-first** (RAG over live definitions; thin scripted onboarding only); Flow Builder ships **conversation-first, canvas-as-verifier**; the override engine is built only against the first real override need.

---

## PART D — MERGED DECISIONS REGISTER (ratify before build)

| # | Decision | Status | Note |
|---|---|---|---|
| D-1 | Vercel-only deploy (frontend) | **RATIFIED + DONE** | Landed Phase 0.1 (#12) |
| D-2 | Vitest floor before migration | **RATIFIED + DONE** | Merged PR #11, green on main |
| D-3 | Migration order B→C-legacy→C-inline | **RATIFIED** | — |
| D-4 | Branch+PR+operator-merge | **RATIFIED + DONE** | CLAUDE.md corrected Phase 0.3 (#12) |
| D-5 | Docs true-up at phase closes | **RATIFIED** | — |
| DR-1 | Enforcement: procedural floor + SAP target | **READY-TO-RATIFY** | + validate evidence pack before relying on floor |
| DR-2 | Procurement-mediated cert intake first | **READY-TO-RATIFY** | — |
| DR-3 | TanStack Query (gated: 3-page proof) | **RATIFIED + DONE** | GO ruled at 3-page proof (#13, #14) |
| DR-4 | Chaos mock + typed error contract (corrective) | **RATIFIED + DONE** | Greenfield channel per fact-check; landed #13 |
| DR-5 | Read-envelope: freeze types, defer machinery | **RATIFIED + DONE** | Types frozen; landed #13 |
| DR-6 | Command template, proven on PO-confirm first | **READY-TO-RATIFY** | — |
| DR-7 | R-priority interleave | **READY-TO-RATIFY** | Parallel-seat = test small, don't assume |
| I-1 | ECS Fargate | **READY-TO-RATIFY** | — |
| I-2 | EventBridge scheduler | **READY-TO-RATIFY** | — |
| I-3 | RDS Multi-AZ (prod DB) | **READY-TO-RATIFY** | Over-build trimmed at I-8 instead |
| I-4 | No queue in CMVE | **READY-TO-RATIFY** | — |
| I-5 | Email via SES API from ap-southeast-3 | **READY-TO-RATIFY** | Web-verified in-region; X-6 SMTP vendor dropped |
| I-6 | CMVE auth v0 = internal JWT | **NEEDS-INPUT** | Confirm corporate IT permits non-SSO for a PII system (G-5) |
| I-7 | Terraform | **READY-TO-RATIFY** | — |
| I-8 | Pipeline; staging trimmed to minimal/on-demand | **READY-TO-RATIFY** | Keep local→contract→prod; no always-on staging |
| I-9 | Separate CMVE repo | **READY-TO-RATIFY** | + G-3 continuity thread |
| I-10 | SAP interface = nightly load + BAdI + hold-not-fail | **READY-TO-RATIFY as opening position** | SAP team's decision + procurement's hold-vs-fail call |
| D-DATE | Deadline 17 vs 18 Oct | **RESOLVED** | 17 Oct 2026 confirmed per GR 42/2024 |
| D-CAL | Compliance-calendar reality | **NEEDS-INPUT** | Is the 180/90-day ladder running today? Who owns it? |
| D-DPO | DPO appointment | **NEEDS-INPUT** | Appointed/in-process? ~10-week clock |
| D-SAP | SAP team capacity | **NEEDS-INPUT** | Can an MM PO-create change land before the deadline at all? |
| D-SSO | Corporate identity/SSO expectation | **NEEDS-INPUT** | Drives I-6 |
| D-SEC | Security review / pen-test gate | **NEEDS-INPUT** | Required before prod PII? Lead time? |
| D-STAFF | Procurement harvest staffing | **NEEDS-INPUT** | People-hours against a manual SIHALAL process |

---

## PART E — EXECUTION MODEL & GUARDRAILS

Four-actor model, mega-batch dispatch, behavioral audits, identity-clean commits, operator-merges-via-UI: carried. **Extension:** Track R introduces a second repo (CMVE) with a **backend execution loop** — the operator's ≤5-min Preview smoke becomes a ≤5-min *staging* smoke via a committed HTTP smoke pack; the browser-agent audit becomes a CI contract-test suite + staging canary; the browser harness still audits `/buyer/compliance` after R2.2. **Capacity rule:** Track R wins conflicts until R2 gate; one-thing-at-a-time within a session, tracks interleave across sessions; second CLI seat for mechanical migration batches *tested small before depended on* (DR-7); any week Track R consumes fully is a planned Track S zero-week, not a slip. **Continuity tax (G-3):** the CMVE repo carries its own CST/handoff thread. Standing firewall (F-13): no hybrid-product agent work on any critical path except compliance-as-agent (R2.3), itself gated behind R2.1.

---

## PART F — THE CRITICAL PATH (one view)
TRACK R (regulatory — hard-dated)
R0 mobilize ─▶ R1 (infra standup + thin slice) ─▶ R2 (enforcement joint + real /buyer/compliance) ─▶ R3 (dry-run+buffer) ─▶ ● DEADLINE: ENFORCED & EVIDENCED
│                        └── first real adapter proves Phase 4′ early ──┐
▼                                                                        ▼
TRACK S (spine/platform)
Phase 0′ (0.1 deploy + 0.3 branch + 0.4 query[gated] + 0.5 chaos/error + 0.6 locale + 0.7 fixtures)
─▶ Phase 1′ (30-page migration, final shape) ─▶ Phase 2′ (commands as flow-seed, prove on PO-confirm) ── SPINE ★
─▶ Phase 3′ (P1 → P2 conversational → P4 → P5) ─▶ Phase 4′ backend expansion ─▶ Phase 5′ hardening + capabilities

**Two governing dates:** the **R2 gate (~mid-Sep)** is technical-vs-procedural go/no-go; the **deadline (17/18 Oct)** is immovable. Track S has no date; it has a shape.

---

## PART G — RISK REGISTER (top-line)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Certificate harvest slips / suppliers can't renew in time | High | Critical | R0.1 opens now; renewal is a business campaign; blocklist gives early visibility of the un-renewable; **manual SIHALAL confirmed — staff it (G-7)** |
| AWS provisioning (X-1) slips | Med-High | High | **Local-first: full service built on docker-compose before AWS exists** — delay costs deploy time, not build time |
| SAP team can't land technical block by deadline | Medium | High | DR-1 procedural floor is deadline-proof by design |
| Corporate SSO mandate enlarges CMVE auth (G-5) | Medium | Medium | Confirm in X-1 conversation before I-6 locks |
| Security-review gate adds lead time (G-6) | Medium | Medium | Surface with IT now; schedule before R2 prod PII |
| Capacity overload across two tracks | Medium | High | E rules; Track S zero-weeks planned not slips; second seat tested small |
| WABA/template approval delays | Medium | Medium | Submitted in R0; SES API email fallback |
| Nobody enforces the blocklist daily (G-2) | Medium | High | R2.OPS named owner + defined exception workflow |
| Deadline date wrong (17 vs 18) on a supplier-facing artifact | Low | Medium | Confirm vs regulation text before any artifact cites it |

---

## PART H — REGISTRY HARVEST SCHEMA (hand to procurement now)

One row per supplier × material × certificate:

`supplier_code (SAP BP#) · supplier_name · material_codes (SAP, semicolon-sep) · material_category (fragrance/actives/emulsifiers/botanicals/contract-mfg/other) · brands_supplied · cert_type (HALAL_BPJPH / HALAL_MUI_LEGACY / HALAL_FOREIGN / BPOM / ISO / OTHER) · cert_number · issuer · issue_date (YYYY-MM-DD) · expiry_date (YYYY-MM-DD) · scope_text · evidence_file_ref · sihalal_checked (Y/N/NA) · sihalal_check_date · contact_wa_number (+62…) · contact_email · wa_opt_in (Y/N/PENDING) · required_for_halal_brands (Y/N) · notes`

Rules: dates ISO; unknown expiry = blank, never guessed (a blank expiry on a required cert is itself a finding); `wa_opt_in` is a UU PDP consent field — evidenced, not assumed; `sihalal_checked` is a **manual** portal lookup (no API — web-verified) — budget procurement hours.

---

## PART I — THIS-WEEK ACTIONS (three lanes)

**Lane 1 — Operator/business (longest lead times):**
1. Answer the compliance-calendar question (D-CAL) — highest priority; a conversation, not a project.
2. Open the certificate-data harvest (Part H) + confirm procurement staffing (D-STAFF).
3. Initiate DPO appointment + consent language (D-DPO).
4. Book the SAP/BASIS session — "can an MM PO-create change land before the deadline at all?" (D-SAP).
5. Confirm evidence-pack acceptability with compliance/legal (DR-1).
6. Confirm the deadline date 17 vs 18 Oct (D-DATE).

**Lane 2 — External-dependency tickets (owner-role + escalation date):** X-1 AWS account (corporate IT, escalate ~mid-Jul), X-2 360dialog contract+WABA (procurement/IT, ~late-Jul), X-4 SAP session (VP→BASIS, ~mid-Jul), X-5 DPO (legal, ~early-Aug), X-9 security review (IT/security, before R2), X-10 corporate SSO expectation (corporate IT, before I-6).

**Lane 3 — CC CLI build dispatches (in order):**
1. **Sync main + confirm the floor is live on main** (in flight now).
2. **Phase 0.1 deploy reconciliation + 0.3 branch policy** — small, closes the Phase 0 base on a test-floored main.
3. **CMVE scaffold local-first** (docker-compose parity) — buildable before AWS, gated only on I-6/SSO for the auth slice.

---

*End of Revised Build Plan v2.1. The reviewed plan, authored on verified ground: the Fable audit adopted, four decisions amended, five fact-check corrections folded, none of the two-track structure broken. Ratify the merged register, open the three lanes, continue Phase 0. Recalibrate at every phase boundary and both R-gates.*
