# SE Handover — the front door

**Status:** DRAFT for Seat 2 review · refreshed 2026-10-01 by the consultant seat (Seat 3), read-only, from a `git archive` export of `main` at **`6f1da15aa41c03e38538562ea8e6c250353538a1`** (the merge commit of PR #392, 2026-10-01, verified at the remote with `git ls-remote origin refs/heads/main`). The previous issue of this set was pinned to `6964b1c8…` (PR #374, 2026-09-25); PRs #375–#392 have merged since.
**Audience:** the engineering team taking the platform over (the SE Team). You have never seen this repository, its working conventions, or its findings register. Every term local to this project is defined the first time it is used.
**Handover date:** 28 October 2026 (likely earlier).
**Rule of this document:** every claim carries a file path, a command or a section. Every figure names the test that pins it, or says that no test pins it. Where something was not measured, it says so.

---

## 1 · What this platform is, and what it is not

**It is a fixture-only React/TypeScript single-page application that serves as the executable specification for a supplier collaboration portal over SAP S/4HANA.** "Fixture-only" means every row of data is sample data authored in the repository (`src/data/*.ts`, `src/services/data/mock/fixtures/*.ts`, `src/services/sdc/fixtures.ts`, `src/services/planning/somoFixture.ts`). There is no server, no database, no real sign-in and no live integration. A user's actions are real in one specific sense: they run through a command dispatcher with module, role, scope, legality and policy checks, mutate in-memory stores, and emit audit events. Reload the page and the in-memory state is gone (five settings survive in `localStorage`, listed in D4 §5).

**It is not a system of record.** SAP S/4HANA owns purchase orders, goods receipts, invoices, contracts, the vendor master and the material master. SOMO owns demand, the plan and the reorder point. The portal owns the collaboration record: confirmations, declarations, uploads, review decisions, forecast publications to suppliers, and the trail of who was asked what. Every act the portal refuses to originate is declared as data on the verb (`surfaceable` in `src/services/transitions/schema.ts`). That table is rendered at `/buyer/process-flows`. Since PR #392 a source gate refuses any client-side construction of a governed document number (`src/lib/documentNumberGate/documentNumberGate.test.ts`; C11 V15 is now `GATE`).

**What the frontend specifies.** Read `src/services/data/types.ts` (the `IDataService` service contract), `src/services/transitions/flows/*.flow.ts` (the state machines), `docs/contracts/C1…C12`, and the six design documents committed with this set under `docs/designs/`. The backend is built against these; pages are meant not to change when the real service lands behind `DataServiceContext.tsx`.

**Measured shape at the pinned SHA.** Do not trust this table next month; re-derive it. *Re-verified at commit (H1) against `main` @ `5826c9f` (PR #393, the sidebar by process): every value below is unchanged, and the six that had no pin are now pinned by `src/handoverFigures.pin.test.ts`.*

| Population | Value | Pinned by | How to re-derive |
|---|---|---|---|
| Service methods on `IDataService` | 71 | `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts` (C1 Axis 1) | `docs/contracts/C1-methods.md:3-4` |
| Flows (state machines) | 28 | same test (C1 Axis 2) | `getKnownFlows()` |
| Transitions (verbs) | 127 | same test (C1 Axis 2) | sum of `flow.transitions.length` |
| Flows with a wired `CommandTarget` (the adapter that lets a verb write) | 22 | same test (C1 Axis 3) | `WIRED_COMMAND_TARGETS`, `src/services/data/mock/MockCommandService.ts` |
| Flows authored but not wired | 6: `compliance`, `contract`, `goodsReceiptLine`, `invoiceMatch`, `obligation`, `shipment` | C1 Axis 3 census (`C1-methods.md` "Wiring census") | `getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS` |
| Routes | 51 | `src/handoverFigures.pin.test.ts` (pinned at H1); `allRoutes.smoke` mounts every one | every `<Route path="…">` in `src/router/AppRouter.tsx`, comments removed. *Corrected at H1: this row read 47, from `grep -c "<Route "`, which misses the four declarations written across lines (`/buyer/plan-grid`, `/buyer/collaboration`, `/buyer/preferred-suppliers`, `/supplier/forecasts`).* |
| Modules (activation registry) | 16, of which `PLT` is always on; all default to `Active` | `src/handoverFigures.pin.test.ts` (pinned at H1: the count, `PLT` as the only always-on module by name, every default `Active`) | the registry |
| Process guides | 56 files = one EN and one ID guide per flow | `src/guides/guides.test.ts` (every flow has a pair, no pending list) | `ls docs/guides` |
| Liveness capabilities | 27; 5 render green (purchase orders, ASNs, goods receipts, invoices, RFQs); 1 is `SPEC` (`somoPlanParameters`) | `src/handoverFigures.pin.test.ts` (pinned at H1: the count, and the green and `SPEC` subsets by name) | `ALL_CAPABILITIES` × `isLive()` in `src/services/liveness/registry.ts` |
| Business roles ("system roles") | 13 | `src/handoverFigures.pin.test.ts` (pinned at H1); `businessRoles.test.ts` pins the bundles both ways | `SYSTEM_ROLES`, `src/services/transitions/businessRoles.ts` |
| Sample persons | 11 `sim-usr-*` rows | `src/handoverFigures.pin.test.ts` (pinned at H1); `simUsrNamespace.test.ts` pins the namespace | `src/services/identity/sampleRoster.ts` |
| Dead-control residue | 0 (the list is empty and two tests hold it empty) | `src/pages-v2/deadAffordance.guard.test.tsx:491`, `:689-703` | the guard |
| Test floor | see `scripts/floor.json` | `npm run gates` | — |

---

## 2 · How to read the platform in one hour

1. **Ten minutes — run it.** `npm ci && npm run build && npm run preview` (Node 24, per `package.json` `engines` and `.nvmrc`), then open the printed URL. You are the buyer seat holding every buyer lane. The avatar opens the identity panel (`src/components/layout-v2/IdentityPanel.tsx`), where you switch persona, narrow roles, or act as a role-named sample person (`src/services/identity/sampleRoster.ts`; a role and an ordinal, never a name).
2. **Ten minutes — the process map and the guides.** `/buyer/process-flows` renders every flow and verb, and since PR #390–#391 a process guide per flow in English and Indonesian (`docs/guides/<entity>.<en|id>.md`, compiled at build into `src/guides/generated/guides.json`). The English guide is authoritative; the Indonesian guide carries a draft banner (`GUIDE_DRAFT_LOCALES = ['id']`, `src/guides/index.ts`).
3. **Ten minutes — the modules.** `/buyer/platform/modules` (roadmap board) and `/buyer/platform/modules/admin` (switch modules on or off; PRs #388–#389). A module that is off makes its routes read-only and its verbs refuse `MODULE_INACTIVE`.
4. **Fifteen minutes — one verb end to end.** Follow `t_po_confirm`: the verb in `src/services/transitions/flows/purchaseOrder.flow.ts`, its adapter in `MockCommandService.ts`, the hook in `src/services/query/commandHooks.ts`, the button in `src/pages-v2/SupplierOrders.tsx`, the event in `src/services/transitions/events.ts`. D2 walks this in detail.
5. **Ten minutes — the contracts.** C1 (method surface), C3 (event shape), C5 (seams), C12 (what the backend must and must not do). D7 says which of the twelve are pinned and which carry stale text.
6. **Five minutes — the gates.** `npm run gates` runs the four checks CI runs (`scripts/gates.mjs`, `.github/workflows/gates.yml`). There is no lint script; do not add one without reading `CLAUDE.md`'s reason.

---

## 3 · What changed since the previous issue (PRs #375–#392)

| PR | What landed | Where it matters in this set |
|---|---|---|
| #375 | a clean clone runs green in any folder; `engines` (Node ≥24 <25, npm ≥11), `.nvmrc`, a derived `.env.example` (documents `GATE_USER` / `GATE_PASSWORD` / `GATE_SECRET`), README guards | D5 §F closed rows; D8 §6 dropped |
| #376 | no screen claims an act that did not happen: eight false toasts corrected; a second gate, `src/pages-v2/externalClaimHonesty.guard.test.tsx`, catches toasts that claim an external effect | D5 §A |
| #377 | every enabled control works, says honestly that it cannot, or is gone: the dead-control residue went from 29 to 0 | D5 §A |
| #378–#379 (A1, A1a) | the planning bucket is a vocabulary (`month` or ISO `week`; quarters refused); the requisition carries its origin (`intakeLineId`, `periodBucket`, `decision`); `wasAdjusted` is derived by the dispatcher; the login page no longer collects an email or a password | C6, C7 amendments (D7) |
| #380 (A2) | intake triage is a machine (`intakeLine`: `Pending → Dismissed / Committed`); `t_intake_commit` cascades to `t_pr_create` with the line id as idempotency key, so one line raises at most one requisition | C7-FIND-02 and C7-FIND-05 closed |
| #381 (A3) | a supplier revises a disputed or accepted answer (`t_requirementresponse_revise`, cascade `_supersede`); "latest" is ordered, not insertion-dependent | Design 2 §4 built |
| #382–#384 (B1–B3) | planning registries (15 measures, columns, 5 views) and the planning fact seam (`IPlanningService.getPlanningFacts`); the read-only grid at `/buyer/plan-grid`; governed edits (type or paste accepted quantity into a PLANNED overlay, push one `t_intake_commit` per row under one causation anchor) | Design 1 §2–§5 built on `react-datasheet-grid`; AG Grid is SE-1 |
| #385–#387 (B4a, B4b-1, B4b-2) | the forecast publication is a machine (`forecastPublication`: open, allocate, approve firm, publish, supersede, withdraw); publish from the grid; the supplier side shows deadline, version banner, net change and a dated receipt | Design 2 §2 built; feed SIMULATED (SOMO is SE-5) |
| #388–#389 (M1, M2) | module activation: 16-module registry, append-only attributed ledger, `MODULE_INACTIVE` refusal, OFF routes read-only, two screens | Design 5 Part A built |
| #390–#391 (G1, G2) | process guides for all 28 flows, EN and ID (ID draft), held to the flow registry by a bilateral test | Design 5 Part B.1–B.2 built; co-pilot is SE-20 |
| #392 (E1) | V15 gated; one rupiah formatter (`formatIDR`, `src/lib/format.ts:71`, gated by `numberConvention.gate.test.ts`); PSL terms on `/glossary`; `MODULE_INACTIVE` in every switchable guide; the personal-name guard reaches code comments | D5 §E, D7 |

---

## 4 · The SE Team's work packages

Twenty-three packages, each with the document that specifies it. "State at the pin" says what already exists to build on. Design documents are committed with this set under `docs/designs/` and are written against an older pin (`81c98403…` or `de101c67…`); read each one's ownership table together with this section, which supersedes it where the two differ (D8 §8).

| # | Package | Specification | State at the pin, and what the SE Team builds |
|---|---|---|---|
| **SE-1** | AG Grid install and licence | Design 1 §8 (and its batch B3 in §10) | Not installed: the planning grid renders on `react-datasheet-grid ^4.11.6` (`package.json:28`, `src/pages-v2/plan-grid/TimePhasedGrid.tsx`); sort, filter and totals live in the model (`planGridModel.ts`), so the move is an engine swap. Buy two AG Grid Enterprise developer licences (operator ruling 2026-09-28; the Lead Engineer names the two developers and confirms the EULA's definition of a developer). The key is injected at build from a non-`VITE_` environment variable and never committed. Cherry-pick modules; theme to DP-1/2/3; Indonesian locale text through i18next. |
| **SE-2** | Hosting in AWS Jakarta | D9 | Nothing in the repository records a host (C12 §6.7). Today a Vercel edge gate (`middleware.js`, `gate/`) fronts the pre-release build. Stand up `ap-southeast-3`; order publish after `npm run gates`; verify what is served against the commit it was built from. |
| **SE-3** | Real sign-in | C10 | `src/pages/auth/Login.tsx` picks a persona; it collects no email and no password. OIDC for Paragon staff (Entra) is RESERVED (C5); the supplier-side IdP is undecided (D-ID-2). Mint the permanent `personId` (D-ID-1), bind it with a `SubjectBinding`, replace the 16-row sample roster as the person source (keep it for seeds and tests). |
| **SE-4** | Backend, datastore, durable audit | C1, C3, C12, D4 | `IDataService` (71 methods) is served by in-memory mocks. Build `httpDataService` behind `DataServiceContext.tsx`; persist every store D4 lists; a durable, ordered `AuditSink` for `TransitionEvent` (C3; the event gained an optional `subject` at G1); run the two conformance factories (`src/services/contracts/conformance/`) against the real service. |
| **SE-5** | SOMO integration | C7, C8 (and C9 for the material crosswalk) | The portal side is built: the intake machine (`intakeLine`) and the publication machine (`forecastPublication`). The feeds are SIMULATED (`src/services/planning/somoFixture.ts`, plan version `PV-SIM-20261028`; `publicationFeed.ts`). `rop`, `safetyStock` and `projectedStock` have no producer (`somoPlanParameters` is the one `SPEC` capability). Open: C7-FIND-03 (`shortfall`), the C8 §2.2 `commitmentClass` ratification, C9 ratification. |
| **SE-6** | SAP S/4HANA integration | C5, C12, Design 3 | Outbound: two verbs settle through `settle()` (`t_gr_post`, `t_invoice_release_payment`). Inbound: no seam code (C12 §5). Build the feeds that fire the declared external-fact verbs with the SAP number as idempotency key (Design 3 batch B7); vendor master and material master are read, never written. |
| **SE-7** | Messaging and scheduler | Design 2 §5 (transport half, §5.3 cadence), Design 3 batch B8, D9 | Every non-portal channel is "Designed … (not connected)" (`src/data/communicationProfiles.ts`); chase conditions are derived at read (`src/services/chase/`); nothing sends and nothing runs on a timer. Build transports (WhatsApp BSP, email, EDI) and the scheduler that reads the cadence settings. |
| **SE-8** | Document storage | D4 §2, D9 §1 (no design document; requirement only) | Supplier uploads are declarations; no file bytes are stored anywhere. Build in-region object storage, virus scanning, retention, and a reference from `supplierDocument` to the stored object. |
| **SE-9** | Export and file generation | RFP F5 and F9 (D10 §2); Design 1 §7 (grid export) | No `Blob`, `createObjectURL` or `download=` in `src/`; every export control now says honestly that it is not available (PR #376). Build exports (Excel, CSV, PDF), packing lists and labels, remittance advice. |
| **SE-10** | TMS integration | C5 (`INT-TMS-01`), C12 §5 | The `shipment` flow is authored and unwired; ten shipment facts are TMS-owned. Build the boundary and carrier tracking. |
| **SE-11** | Process versions at runtime | Design 6 §8 | Flows carry `version: number`; a document does not record the flow version it was born under. Build per-document flow versions only if Flow Builder promotion (SE-16) requires it; Design 6 §8.4 states when §8 can be skipped. |
| **SE-12** | Invoice three-way match and e-Faktur | D6 OD-4; D10 §2 F5 | `invoiceMatch` is authored and "substrate-only" in the loose-end census; e-Faktur has no code and no contract. Both need the S/4 inbound seam (SE-6). |
| **SE-13** | Security and operations | D9; RFP N1–N6 | Atom-based RBAC and an in-memory audit exist; nothing else. Encryption, OWASP, penetration test, monitoring, logging, alerting, rate limiting, health checks, backup and DR, secret management, ownership transfer of the repository and the deployment. |
| **SE-14** | Excel-grade grid features | Design 1 §4–§7 | On top of SE-1: grouping, subtotals, totals bar, range selection, fill handle, set filters, column chooser, export, saved layouts, accessibility. The column, measure and view registries (`src/services/planning/`) are the specification; labels are i18n keys. |
| **SE-15** | Supplier bulk entry | Design 2 §3 (and D6 OD-3) | Not built: no confirmation grid, no template generator, no import for confirmations or incoming shipments. `src/services/sdc/parseWorkbook.ts` and `BulkStockEntryGrid` (stock on hand) are the only bulk paths. Templates derive from each verb's `requiredFields`. |
| **SE-16** | Flow Builder | Design 6 | Not built (no authoring surface, no draft object, no generator). Design 6 is written to be implemented from the text alone, with acceptance commands per batch. |
| **SE-17** | Process gaps | Design 3 | Everything in Design 3 except its batch E1: the V15 instrument it asked for is built (PR #392). Remaining: requisition close and honest waits, receipt lane (ASN close, hold door, return notice, quality notification), invoice variance and dispute outcome, RFQ close by a person and PO change request, supplier standing, the `contract` and `schedulingAgreement` targets, retiring the `compliance` machine (decision D2 in Design 3 §8). |
| **SE-18** | Identity panel, governed settings, durable plan drafts | Design 4; Design 1 §6 | The identity panel is unchanged since Design 4 was written. Plan edits live in React state and are lost on reload (`src/pages-v2/plan-grid/PlanDraftProvider.tsx:2-7`); Design 1 §6.1 forbids browser storage for plan state and specifies a durable `plan` entity (its batch B9); §6.2 specifies per-seat view state. Governed settings: the four recordable ledgers (enforcement mode, PSL cap, delivery policy, module activation) have no common settings surface except modules. |
| **SE-19** | Supplier acts: chase and call-off acknowledgement | Design 2 §5–§6 | Neither verb exists: no `t_chase_ask`, no `t_delivery_acknowledge`. `t_delivery_confirm` is a **buyer** act (procurement lane, `businessRoles.ts:260-262`) and carries no root cause. Design 2's ownership table listed these as ours; this dispatch assigns them to the SE Team. |
| **SE-20** | Co-pilot on the process guides | Design 5 B.3 | The guides exist (56 files, `guides.json` generated at build, stable citation keys described in Design 5 B.3). No LLM code exists in the tree. The co-pilot answers only from the guide registry and cites a key per sentence; document state comes from the store, never from a guide. |
| **SE-21** | Product catalogs | `SE21_PRODUCT_CATALOG.md` (this set) | Requirements and open decisions only. Today's material catalog is the RFQ wizard's picker over a frozen material master; the storefront's catalog is component state. |
| **SE-22** | Award reaches the forecast split | Operator ruling of 2026-10-09, after the end-to-end walk (hand-off 13); Design 2 for the split itself | An award records the chosen quotation and supplier on the sourcing event and nothing downstream reads it: the forecast publication's split is carried from the previous publication and edited by planning, and no control adds a supplier to a material. Build: an award makes the awarded supplier ELIGIBLE for the awarded material in the split and offers a SUGGESTED allocation. The planner decides; nothing is allocated by the award itself. |
| **SE-23** | Intake material codes | Operator ruling of 2026-10-09, after the end-to-end walk (hand-off 1); C7, and C9 for the material crosswalk | An intake line carries a material name and has no master-code field, so an intake line and the plan-grid row for the same material are two records that nothing joins, and a committed quantity has no row on the grid. Build: intake lines arrive with their master code from the producer (SE-5) through the C9 crosswalk, and the grid joins on it. |

Packages that depend on an operator decision say so in D6. Packages that depend on each other: SE-14 on SE-1; SE-12 and parts of SE-17 on SE-6; SE-3 before SE-18's post-IdP deletions; SE-7 before any reminder the RFP asks for.

---

## 5 · Ownership split at handover

| Concern | Ours (delivered as specification and mock) | SE Team |
|---|---|---|
| Hosting, publish pipeline, domain | none recorded in the repo (C12 §6.7); a Vercel edge access gate (`middleware.js`, `gate/`) | SE-2, SE-13 |
| Sign-in and identity provider | persona and role model, sample users, C10 | SE-3, SE-18 |
| Backend and datastore | `IDataService` (C1/C2), the dispatcher, in-memory stores, conformance factories | SE-4 |
| Audit trail | `TransitionEvent` shape and `AuditSink` interface (C3), in-memory sink | SE-4 |
| SAP S/4HANA | the never-originate rules, two settlement verbs, the V15 gate | SE-6, SE-12 |
| SOMO | C7 intake machine, C8 publication machine, the planning fact seam, C9 crosswalk schema (zero rows) | SE-5 |
| Planning grid | registries, read-only views, governed edits on `react-datasheet-grid` | SE-1, SE-14, SE-18 (durable drafts) |
| TMS | `INT-TMS-01` (C5, RESERVED) | SE-10 |
| Snowflake | C4 (SPEC, zero code) | outside the 21 packages; no package names it |
| Messaging | channel model, chase derivations | SE-7, SE-19 |
| Module activation | registry, ledger (in memory), two screens | SE-4 persists the ledger |
| Process guides | 56 guides; EN authoritative, ID draft | the ID locale review; SE-20 |
| Halal compliance | the compliance machine (authored, unwired), projection, receipt notice | D6 OD-2; Design 3 proposes retiring the machine (SE-17) |
| Data residency, UU PDP | requirements (D9) | SE-2, SE-13 |

Currency convention for all documents: IDR for financial figures, USD for vendor contracts (operator ruling). Since PR #392 every rupiah on screen renders through one formatter.

---

## 6 · What "done" means at handover

Four things are true at the pinned SHA and must stay true:

1. **A clean clone builds and passes the gates.** PR #375 made the suite independent of the clone directory's name (`src/lib/treeMutationGate/treeMutation.guard.test.ts:84-134`) and added `engines`, `.nvmrc` and `.env.example`. CI runs `npm run gates` on every PR, every push to `main` and daily. **This refresh did not re-run the gates**; it relies on CI having passed for the merge of #392 (verify with `gh pr checks 392`).
2. **Every write goes through the dispatcher.** On `IDataService` the only non-`dispatch` write is `settle`; the delivery service's three methods orchestrate dispatches; the module admin page dispatches one `t_module_set` per changed row.
3. **The honesty instruments are green and not vacuous.** `toastHonesty.guard.test.tsx`, `externalClaimHonesty.guard.test.tsx` (PR #376), `deadAffordance.guard.test.tsx` (residue 0), `documentNumberGate.test.ts` (V15), `numberConvention.gate.test.ts`, the liveness registry (a capability is green only when a wired target backs it and no harvest is pending).
4. **The documents in this set match the tree.** D8 lists the corrections still to apply to documents in the repository.

What "done" does **not** mean: that every screen transacts (D10), that the defect register is empty (D5), or that any decision listed as OPEN in D6 has been taken.

---

## 7 · Where everything else lives

| Document | Purpose |
|---|---|
| `docs/handover/HANDOVER_INDEX.md` | the file list of this set |
| D2 `D2_ENGINEERING_GUIDE.md` | how the code works, for humans |
| D3 `D3_ARCHITECTURE.md` | the federated landscape and each seam's status |
| D4 `D4_SAMPLE_DATA_REPLACEMENT.md` | every fixture, store, seed, mock service and storage key the backend replaces |
| D5 `D5_DEFECT_REGISTER.md` | open defects, derived, with bucket |
| D6 `D6_DECISION_REGISTER.md` | ratified and open decisions |
| D7 `D7_CONTRACTS_INDEX.md` | C1–C12: status, pin, staleness |
| D8 `D8_CORRECTIONS.md` | text in repository documents that is untrue at the pin |
| D9 `D9_SECURITY_AND_RESIDENCY.md` | requirements the SE Team inherits |
| D10 `D10_REQUIREMENTS_TRACE.md` | the RFP and the Vision traced to the platform |
| `SE21_PRODUCT_CATALOG.md` | SE-21 requirements and open decisions |
| `docs/designs/DESIGN_1…6` | the six designs (planning grid, supplier collaboration, state machine, identity panel, module activation and guides, Flow Builder) |
| `docs/reviews/R0…R4` | the consultant's review of 2026-09-28 that the designs answer |
| In the repo: `CLAUDE.md` | the working conventions of the automated seats that built this; long and seat-facing; read D2 first |
| In the repo: `docs/findings.md` | the findings register (about 1.8 MB); history, not a work list |
| In the repo: `docs/contracts/` | C1–C12 |
| In the repo: `docs/guides/` | the process guides |

**External sources.** The RFP (*Supplier Collaboration Hub*, an internal Paragon document), the Vision and Capabilities v1, the earlier SE Handoff v1 and the RFP Coverage Matrix v2 were read on 2026-09-25 and are traced in D10. None of them is committed with this set; they are referred to by name only.

---

## 8 · What the earlier SE Handoff v1 promised, and what this handover changes

The earlier handoff (`Paragon_Procurement_Supplier_Portal_SE_Handoff_v1.md`, not in the repository) was written at "post-Phase-0.2". An engineer holding both documents should read these as the differences (details in D8 §9 and D6 §2b):

| SE Handoff v1 said | This handover says | Why |
|---|---|---|
| the action layer is `IActionService` (`confirmPO`, `advanceStage`, `submitASN` …), TARGET | the action layer is the command dispatcher: 127 verbs on 28 flows through 22 `CommandTarget`s; `IActionService` does not exist in `src/` | built differently; C1 is the contract |
| roles live in two namespaces that must be reconciled | one namespace: the transition atom is the permission (C10 §3.3, C11 V3) | resolved by construction |
| "no i18n exists today" | EN/ID is built (`src/lib/i18n/`), and every process guide exists in both languages | landed after the handoff |
| the compliance engine is schedule-critical with a hard deadline of 17 October 2026, an escalation ladder and PO auto-block | halal compliance is a design policy handled offline; the date does not drive sequencing; the registry write path is OPEN (D6 OD-2) | operator ruling |
| the decided stack is NestJS / PostgreSQL / Redis / RabbitMQ on AWS Jakarta | the stack is the SE Team's choice, constrained only by the contracts (`Paragon_World_Class_Build_Plan_v1.md` §8, FORK-6); AWS Jakarta survives as a residency requirement | superseded |
| `AuditSink` entries carry `before`/`after` snapshots | the audit record is `TransitionEvent` `{ event, actor, scope, correlationId, causationId?, outcome, reason?, subject?, ts }` (C3, pinned) | C3 is ratified |
| Flow Builder, Module Activation and Learn/Co-pilot are backend builds | Module Activation is **built** (PRs #388–#389); process guides are **built** (PRs #390–#391); the Flow Builder is SE-16 and the co-pilot SE-20 | scope ruling of 2026-09-28 |
| SAP OData surfaces named (`API_PURCHASEORDER_2`, `API_BUSINESS_PARTNER`, …) | the repo names no SAP API; C12 §5 records no inbound seam code | useful input, unratified; SE-6 decides |
| companions "Current State of Truth" and "Platform DNA — Universal Principles" | neither exists in the repository; C1–C12 and this set replace them | not measured elsewhere |
