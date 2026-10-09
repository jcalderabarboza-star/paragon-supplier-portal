# SE Handover — the front door

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · written by the consultant seat (Seat 3), read-only, from a `git archive` export of `main` @ `166a5611303121eb509675dbe19ff78edf786899` (the merge commit of PR #418, E2E-2; equal to `git ls-remote origin refs/heads/main` on 2026-10-09). v1 of this file was written against `6f1da15a…` (PR #392) and tagged `handover-v1` at `9cc535b`. PRs #395–#418 have merged since. The final review (the end-to-end walk of 8 and 9 October) is in: D5 §J, D6 §2 and §3a, and `SE_BACKLOG_v2.md` §6a.
**Audience:** the engineering team taking the platform over (the SE Team). You have never seen this repository, its working conventions, or its findings register. Every term local to this project is defined the first time it is used.
**Handover date:** 28 October 2026 (likely earlier).
**Rule of this document:** every claim carries a file path, a command or a section. Every figure names the test that pins it, or says that no test pins it. Where something was not measured, it says so.

---

## 1 · What this platform is, and what it is not

**It is a fixture-only React/TypeScript single-page application that serves as the executable specification for a supplier collaboration portal over SAP S/4HANA.** "Fixture-only" means every row of data is sample data authored in the repository (`src/data/*.ts`, `src/services/data/mock/fixtures/*.ts`, `src/services/sdc/fixtures.ts`, `src/services/planning/somoFixture.ts`). There is no server, no database, no real sign-in and no live integration. A user's actions are real in one specific sense: they run through a command dispatcher with module, role, scope, legality and policy checks, mutate in-memory stores, and emit audit events. Reload the page and the in-memory state is gone (six `localStorage` keys exist, listed in D4 §5).

**It is not a system of record.** SAP S/4HANA owns purchase orders, goods receipts, invoices, contracts, the vendor master and the material master. SOMO owns demand, the plan and the reorder point. The portal owns the collaboration record: confirmations, declarations, uploads, review decisions, forecast publications to suppliers, and the trail of who was asked what. Every act the portal refuses to originate is declared as data on the verb (`surfaceable` in `src/services/transitions/schema.ts`). That table is rendered at `/buyer/process-flows`. Since PR #392 a source gate refuses any client-side construction of a governed document number (`src/lib/documentNumberGate/documentNumberGate.test.ts`; C11 V15 is now `GATE`).

**What the frontend specifies.** Read `src/services/data/types.ts` (the `IDataService` service contract), `src/services/transitions/flows/*.flow.ts` (the state machines), `docs/contracts/C1…C12`, and the six design documents committed with this set under `docs/designs/`. The backend is built against these; pages are meant not to change when the real service lands behind `DataServiceContext.tsx`.

**Measured shape at the pinned SHA.** Do not trust this table next month; re-derive it. *v2: every value below was re-read at the pin. Five rows moved since v1 (service methods, flows, verbs, wired targets, guides) and the floor is now stated. The values pinned by `src/handoverFigures.pin.test.ts` are read from that test at the pin; CI ran it green on the pinned commit (gate run 37607801860, job `build · floor · test:gate` = success).*

| Population | Value | Pinned by | How to re-derive |
|---|---|---|---|
| Service methods on `IDataService` | 72 (v1: 71; one added at OPS-2, #411) | `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts` (C1 Axis 1) | `docs/contracts/C1-methods.md:3-4` |
| Flows (state machines) | 30 (v1: 28; `stageResponse` added at RFx-1, `materialRuling` at OPS-2) | same test (C1 Axis 2) | `getKnownFlows()` |
| Transitions (verbs) | 141 (v1: 127) | same test (C1 Axis 2) | sum of `flow.transitions.length` |
| Flows with a wired `CommandTarget` (the adapter that lets a verb write) | 24 (v1: 22; `stageResponse`, `materialRuling`) | same test (C1 Axis 3) | `WIRED_COMMAND_TARGETS`, `src/services/data/mock/MockCommandService.ts` |
| Flows authored but not wired | 6: `compliance`, `contract`, `goodsReceiptLine`, `invoiceMatch`, `obligation`, `shipment` | C1 Axis 3 census (`C1-methods.md` "Wiring census") | `getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS` |
| Routes | 52 (51 at the `handover-v2` tag; ADM-1 added `/buyer/platform/super-admin-activity`) | `src/handoverFigures.pin.test.ts` (pinned at H1); `allRoutes.smoke` mounts every one | every `<Route path="…">` in `src/router/AppRouter.tsx`, comments removed. *Corrected at H1: this row read 47, from `grep -c "<Route "`, which misses the four declarations written across lines (`/buyer/plan-grid`, `/buyer/collaboration`, `/buyer/preferred-suppliers`, `/supplier/forecasts`).* |
| Modules (activation registry) | 16, of which `PLT` is always on; all default to `Active` | `src/handoverFigures.pin.test.ts` (pinned at H1: the count, `PLT` as the only always-on module by name, every default `Active`) | the registry |
| Process guides | 60 files = one EN and one ID guide per flow (v1: 56) | `src/guides/guides.test.ts` (every flow has a pair, no pending list) | `ls docs/guides` |
| Liveness capabilities | 27; 5 render green (purchase orders, ASNs, goods receipts, invoices, RFQs); 1 is `SPEC` (`somoPlanParameters`) | `src/handoverFigures.pin.test.ts` (pinned at H1: the count, and the green and `SPEC` subsets by name) | `ALL_CAPABILITIES` × `isLive()` in `src/services/liveness/registry.ts` |
| Business roles ("system roles") | 14 (13 at the `handover-v2` tag; ADM-1 added `super_admin` and moved `admin` to the buyer side) | `src/handoverFigures.pin.test.ts` (pinned at H1); `businessRoles.test.ts` pins the bundles both ways | `SYSTEM_ROLES`, `src/services/transitions/businessRoles.ts` |
| Sample persons | 18 `sim-usr-*` rows (v1: 11; five supplier persons added at E2E-1, #417; 16 at the `handover-v2` tag; ADM-1 added one Admin and one Super Admin) | `src/handoverFigures.pin.test.ts` (pinned at H1); `simUsrNamespace.test.ts` pins the namespace | `src/services/identity/sampleRoster.ts` |
| Dead-control residue | 0 (the list is empty and two tests hold it empty) | `src/pages-v2/deadAffordance.guard.test.tsx:491`, `:689-703` | the guard |
| Test floor | 8,686 tests in 481 files; edge-gate suite 7 (v1 tag: 7,262 / 430 / 7) | `npm run gates` asserts it as a floor, not an equality | `scripts/floor.json` |

---

## 2 · How to read the platform in one hour

1. **Ten minutes — run it.** `npm ci && npm run build && npm run preview` (Node 24, per `package.json` `engines` and `.nvmrc`), then open the printed URL. You are the buyer seat holding every buyer lane. The avatar opens the identity panel (`src/components/layout-v2/IdentityPanel.tsx`), where you switch persona, narrow roles, or act as a role-named sample person (`src/services/identity/sampleRoster.ts`; a role and an ordinal, never a name).
2. **Ten minutes — the process map and the guides.** `/buyer/process-flows` renders every flow and verb, and since PR #390–#391 a process guide per flow in English and Indonesian (`docs/guides/<entity>.<en|id>.md`, compiled at build into `src/guides/generated/guides.json`). The English guide is authoritative; the Indonesian guide carries a draft banner (`GUIDE_DRAFT_LOCALES = ['id']`, `src/guides/index.ts`).
3. **Ten minutes — the modules.** `/buyer/platform/modules` (roadmap board) and `/buyer/platform/modules/admin` (switch modules on or off; PRs #388–#389). A module that is off makes its routes read-only and its verbs refuse `MODULE_INACTIVE`.
4. **Fifteen minutes — one verb end to end.** Follow `t_po_confirm`: the verb in `src/services/transitions/flows/purchaseOrder.flow.ts`, its adapter in `MockCommandService.ts`, the hook in `src/services/query/commandHooks.ts`, the button in `src/pages-v2/SupplierOrders.tsx`, the event in `src/services/transitions/events.ts`. D2 walks this in detail.
5. **Ten minutes — the contracts.** C1 (method surface), C3 (event shape), C5 (seams), C12 (what the backend must and must not do). D7 says which of the twelve are pinned and which carry stale text.
6. **Five minutes — the gates.** `npm run gates` runs the four checks CI runs (`scripts/gates.mjs`, `.github/workflows/gates.yml`). There is no lint script; do not add one without reading `CLAUDE.md`'s reason.

---

## 3 · What changed since v1 (PRs #395–#418)

A module-by-module review ran in the week of 2026-10-02 to 2026-10-08, and a final review walked one material through the whole chain on 8 and 9 October. `CHANGES_SINCE_V1.md` says the same in plain language per module; `SE_BACKLOG_v2.md` holds what the review found and did not fix. The table that stood here in v1 (PRs #375–#392) is in the `handover-v1` tag.

| PR | Batch | What landed | Where it matters in this set |
|---|---|---|---|
| #395 | PLN-1 | a paste the grid did not receive no longer reports success; a requisition is priced as unit price × committed quantity (`PrIntakeLine.unitPrice`, C7) | C7; D3 §3 |
| #396 | PLN-2 | one material, one grain: raw materials monthly, packaging weekly; refusal `INTAKE_ONE_GRAIN` | C7 Amendment 2 (A2-R3) |
| #397 | PLN-3 | the planning lane commits an intake line (new atom `intake:triage`); procurement approves the requisition; Intake Review is a view of the plan grid (`/buyer/intake-review` redirects) | C7 Amendment 2; D2 §3 |
| #398 | PLN-4 | a 50-row push runs under one anchor with one refresh and reports progress; one reason for many rows; bulk acts on the requisitions list | C7 Amendment 3 |
| #399 | PLN-5 | the grid starts above the fold and is the one scroller; keyboard, Delete, Ctrl+Z and Ctrl+C work; the intake view builds in 47 ms (was 1,810 ms, measured in the PR) | SE-1, SE-14 |
| #400 | SDC-1 | one current forecast publication per grain; a weekly publish no longer supersedes the monthly plan | C8; D3 §3 |
| #401 | SDC-2 | buyer and supplier read one response deadline; "carried" and "overdue" mean the same on both sides | Design 2 |
| #402 | SDC-3 | a revision replaces the prior answer only when it is sent; accept and dispute need a named person | D6 §3 |
| #403 | SDC-4 | nothing a supplier enters is dropped: a batch with no number is refused at its row; a multi-line reply becomes several rows | Design 2 |
| #404 | SDC-5 | a draft publication can be discarded (`t_publication_discard`); a published sample material can be answered; a leg already received is not counted as incoming | C1 (128 verbs at that merge) |
| #405 | SRC-1 | the award lane works end to end on an event made on the platform; closing bidding is a person's act; who has responded is derived, never stored; cancel withdraws the quotations | D5 §I; SE-17 |
| #406 | SRC-2 | a quotation is refused on an event that is not open, after its deadline, a second time, or with a past validity; RFQ and quotation fixtures anchored to the declared present; the supplier's read of an event is an allowlist projection | D2 §6; D4 §1 |
| #407 | RFx-1 | one sourcing event moves RFI → RFP → RFQ; advance with a shortlist; conclude without an award; new flow `stageResponse` | D10 Objective 5 |
| #408 | RFx-2 | RFI questionnaire (six question types, knock-out answers); the RFQ store writes each guarded field only for its own verb | D4 §2 |
| #409 | RFx-3 | RFP weighted criteria, proposals and scoring (new atom `rfq:evaluate`); the buyer side says "sourcing event" | D10 F6 |
| #410 | OPS-1 | the invoice match reads what was received and what is already invoiced; a late invoice is matched; approval and payment release record who decided; the supplier is no longer told a released payment was credited | SE-12; D5 §I |
| #411 | OPS-2 | an existing receipt is worked from the list (`t_gr_record_inspection`; `t_gr_hold` now has a caller); Compliance rules whether halal and BPOM apply to a material on a ledger (new flow `materialRuling`, verb `t_material_ruling_set`, atom `material:rule`); an invoice approval names a person and an unnamed approval is approved again (`t_invoice_reapprove`) | C1 (72 / 141 / 30 / 24 from this merge); D5 §J; D6 §3a |
| #412 | OPS-2b | the receipt blocks (halal ruling, certificate, seal, BPOM ruling, lot) are enforced when goods are accepted — hook `gr_receipt_compliant` on `t_gr_approve` and `t_gr_partial_approve`; the form and the hook call one function and judge at one clock, the declared present; SAMPLE certificates and SAMPLE BPOM rulings seeded; one supplier × material pair and one material left stopped on purpose | D4; D5 §J |
| #413 | OPS-3 | the confirmed date, note and quantity of an order confirmation are stored and shown on both sides; a ship notice carries every line at the confirmed quantity and every typed field, and is listed for the buyer; only the confirm verb writes a confirmation; three delivery-agreement findings fixed; supplier-side copy says "event" | D5 §J; SE-9, SE-8 |
| #414 | SUP-1 | a named person decides: six hooks refuse a seat that names nobody on application approve and refuse, certificate request, confirm and refuse, every preferred-supplier decision, material-request accept and decline, role grant and a buyer recording a supplier's stock; a certificate confirmation stamps who and when | D6 §3a; SE-3 |
| #415 | SUP-2 | figures that are not measured say so ("Illustrative — not measured") on Analytics, Scorecard, Risk, My Performance, My Storefront and the supplier dashboard; the supplier briefing names the reader's own order | D10; SE-5 |
| #416 | FIN-1 | the portal default validity cap refuses a seat that names nobody (`psl_cap_setter_named`; the verb still has no screen); the supplier briefing counts days from the declared present, in the reader's locale | D6 §3a |
| #417 | E2E-1 | a named person decides on three more lanes: `pr_decider_named` on requisition approve and reject, `publication_actor_named` on publish, discard and withdraw, `gr_disposer_named` on receipt approve, part-approve and reject (a hold stays open); the approval note and toast name the approver; the supplier's event card shows the criteria the buyer set and the event's own requested delivery date (a new optional field on the event); the wizard stores the incoterm it shows; an exchange rate's age, staleness and future-date check read the declared present; five more supplier sample persons (16 in all); Inventory Visibility moved under Collaborate | D5 §J; D6 §3a; SE-22 and SE-23 recorded |
| #418 | E2E-2 | the order and the ship notice show what was received, on both sides, as a read derived from posted receipts (`src/services/data/orderReceipt.ts`); nothing writes to an order or a ship notice, and the page says SAP keeps the order's status; Create ASN is not offered for a fully received order; the invoice form opens on the order's lines at the accepted quantity and may state less, never more (`invoice_lines_within_received` on create; `invoice_amount_is_lines_total` on submit and resolve); an invoice stores its lines | SE-12; D5 §J; D6 §2 |
| — | final review | one material walked end to end, in review mode on `fc65bf2`, English then Indonesian (report: `qaHandover\e2e\E2E_REPORT.md`, outside the repository). No P0. Nine P1 breaks: seven fixed in #417 and #418, two ruled to the SE Team as SE-22 and SE-23. Five P2 breaks and the smaller observations are open | D5 §J; D6 §3a; `SE_BACKLOG_v2.md` §6a |

---

## 4 · The SE Team's work packages

Twenty-three packages, each with the document that specifies it. "State at the pin" says what already exists to build on. Design documents are committed with this set under `docs/designs/` and are written against an older pin (`81c98403…` or `de101c67…`); read each one's ownership table together with this section, which supersedes it where the two differ (D8 §8).

| # | Package | Specification | State at the pin, and what the SE Team builds |
|---|---|---|---|
| **SE-1** | AG Grid install and licence | Design 1 §8 (and its batch B3 in §10) | Not installed: the planning grid renders on `react-datasheet-grid ^4.11.6` (`package.json:28`, `src/pages-v2/plan-grid/TimePhasedGrid.tsx`); sort, filter and totals live in the model (`planGridModel.ts`), so the move is an engine swap. Buy two AG Grid Enterprise developer licences (operator ruling 2026-09-28; the Lead Engineer names the two developers and confirms the EULA's definition of a developer). The key is injected at build from a non-`VITE_` environment variable and never committed. Cherry-pick modules; theme to DP-1/2/3; Indonesian locale text through i18next. *v2:* PLN-5 (#399) put `role=grid` on the current engine's own elements; native grid semantics (`aria-rowindex`, `aria-colindex`) still come with this move. |
| **SE-2** | Hosting in AWS Jakarta | D9 | Nothing in the repository records a host (C12 §6.7). Today a Vercel edge gate (`middleware.js`, `gate/`) fronts the pre-release build. Stand up `ap-southeast-3`; order publish after `npm run gates`; verify what is served against the commit it was built from. |
| **SE-3** | Real sign-in | C10 | `src/pages/auth/Login.tsx` picks a persona; it collects no email and no password. OIDC for Paragon staff (Entra) is RESERVED (C5); the supplier-side IdP is undecided (D-ID-2). Mint the permanent `personId` (D-ID-1), bind it with a `SubjectBinding`, replace the 16-row sample roster as the person source (keep it for seeds and tests). |
| **SE-4** | Backend, datastore, durable audit | C1, C3, C12, D4 | `IDataService` (72 methods) is served by in-memory mocks. Build `httpDataService` behind `DataServiceContext.tsx`; persist every store D4 lists; a durable, ordered `AuditSink` for `TransitionEvent` (C3; the event gained an optional `subject` at G1); run the two conformance factories (`src/services/contracts/conformance/`) against the real service. |
| **SE-5** | SOMO integration | C7, C8 (and C9 for the material crosswalk) | The portal side is built: the intake machine (`intakeLine`) and the publication machine (`forecastPublication`). The feeds are SIMULATED (`src/services/planning/somoFixture.ts`, plan version `PV-SIM-20261028`; `publicationFeed.ts`). `rop`, `safetyStock` and `projectedStock` have no producer (`somoPlanParameters` is the one `SPEC` capability). Open: C7-FIND-03 (`shortfall`), the C8 §2.2 `commitmentClass` ratification, C9 ratification. *v2:* C7 gained Amendment 2 (2026-10-02: the planning lane commits under `intake:triage`; one intake population; `INTAKE_ONE_GRAIN`) and Amendment 3 (2026-10-05: what a committed requisition carries; bulk acts); the intake line carries an optional `unitPrice`. The feed must supply all of these. |
| **SE-6** | SAP S/4HANA integration | C5, C12, Design 3 | Outbound: two verbs settle through `settle()` (`t_gr_post`, `t_invoice_release_payment`). Inbound: no seam code (C12 §5). Build the feeds that fire the declared external-fact verbs with the SAP number as idempotency key (Design 3 batch B7); vendor master and material master are read, never written. |
| **SE-7** | Messaging and scheduler | Design 2 §5 (transport half, §5.3 cadence), Design 3 batch B8, D9 | Every non-portal channel is "Designed … (not connected)" (`src/data/communicationProfiles.ts`); chase conditions are derived at read (`src/services/chase/`); nothing sends and nothing runs on a timer. Build transports (WhatsApp BSP, email, EDI) and the scheduler that reads the cadence settings. *v2, moved in:* nothing notifies a supplier of a stage advance, a conclude or a shortlist outcome on a sourcing event; each reads it on its next visit (PR #407). |
| **SE-8** | Document storage | D4 §2, D9 §1 (no design document; requirement only) | Supplier uploads are declarations; no file bytes are stored anywhere. Build in-region object storage, virus scanning, retention, and a reference from `supplierDocument` to the stored object. *v2, moved in:* an RFI document answer and an RFP proposal document record the file name only, and both forms say so (PRs #408, #409). |
| **SE-9** | Export and file generation | RFP F5 and F9 (D10 §2); Design 1 §7 (grid export) | No `Blob`, `createObjectURL` or `download=` in `src/`; every export control now says honestly that it is not available (PR #376). Build exports (Excel, CSV, PDF), packing lists and labels, remittance advice. *v2, moved in:* export of the RFI answer matrix and of the RFP ranking (PRs #408, #409). |
| **SE-10** | TMS integration | C5 (`INT-TMS-01`), C12 §5 | The `shipment` flow is authored and unwired; ten shipment facts are TMS-owned. Build the boundary and carrier tracking. |
| **SE-11** | Process versions at runtime | Design 6 §8 | Flows carry `version: number`; a document does not record the flow version it was born under. Build per-document flow versions only if Flow Builder promotion (SE-16) requires it; Design 6 §8.4 states when §8 can be skipped. |
| **SE-12** | Invoice three-way match and e-Faktur | D6 OD-4; D10 §2 F5 | `invoiceMatch` is authored and "substrate-only" in the loose-end census; e-Faktur has no code and no contract. Both need the S/4 inbound seam (SE-6). *v2, moved out:* the portal-side match is built on sample data (OPS-1, #410): an invoice is `Matched` only while its amount fits inside what was received and accepted on its PO, less what earlier invoices already claim, with a 1% tolerance; submit and dispute-resolve run the same match as a posted receipt. What remains for the SE Team: receipts and invoice lines from S/4 (the portal invoice carries a total and no lines, so it cannot tell a price difference from a quantity difference), `t_invoice_remit`'s feed, and e-Faktur. |
| **SE-13** | Security and operations | D9; RFP N1–N6 | Atom-based RBAC and an in-memory audit exist; nothing else. Encryption, OWASP, penetration test, monitoring, logging, alerting, rate limiting, health checks, backup and DR, secret management, ownership transfer of the repository and the deployment. |
| **SE-14** | Excel-grade grid features | Design 1 §4–§7 | On top of SE-1: grouping, subtotals, totals bar, range selection, fill handle, set filters, column chooser, export, saved layouts, accessibility. The column, measure and view registries (`src/services/planning/`) are the specification; labels are i18n keys. |
| **SE-15** | Supplier bulk entry | Design 2 §3 (and D6 OD-3) | Not built: no confirmation grid, no template generator, no import for confirmations or incoming shipments. `src/services/sdc/parseWorkbook.ts` and `BulkStockEntryGrid` (stock on hand) are the only bulk paths. Templates derive from each verb's `requiredFields`. *v2:* the review measured the cost of its absence: a 20-line confirmation takes about 5–6 actions per line (`SE_BACKLOG_v2.md`). On the buyer side PLN-4 (#398) added one reason for many rows and bulk acts on the requisitions list; those are built and are not SE-15. |
| **SE-16** | Flow Builder | Design 6 | Not built (no authoring surface, no draft object, no generator). Design 6 is written to be implemented from the text alone, with acceptance commands per batch. |
| **SE-17** | Process gaps | Design 3 | Everything in Design 3 except its batch E1: the V15 instrument it asked for is built (PR #392). Remaining: requisition close and honest waits, receipt lane (ASN close, hold door, return notice, quality notification), the invoice dispute-outcome ledger and the accept-variance verb (Design 3 §3.7), the PO change request, supplier standing, the `contract` and `schedulingAgreement` targets, retiring the `compliance` machine (decision D2 in Design 3 §8). *v2, moved out:* RFQ close by a person is built (`t_rfq_close`, SRC-1, #405). *v2, moved out on 8 October:* resuming an existing receipt and the halal / BPOM applicability ruling (OPS-2, #411, #412); a PO confirmation's date, note and quantity and the ship notice's fields arriving (OPS-3, #413). *v2, moved in:* goods stopped at the quality step cannot be held or rejected through the form; a partly delivered order cannot take a further ship notice; "Override hold" is still a message (backlog rows 86–88). |
| **SE-18** | Identity panel, governed settings, durable plan drafts | Design 4; Design 1 §6 | The identity panel is unchanged since Design 4 was written. Plan edits live in React state and are lost on reload (`src/pages-v2/plan-grid/PlanDraftProvider.tsx:2-7`); Design 1 §6.1 forbids browser storage for plan state and specifies a durable `plan` entity (its batch B9); §6.2 specifies per-seat view state. Governed settings: the four recordable ledgers (enforcement mode, PSL cap, delivery policy, module activation) have no common settings surface except modules. *v2, moved in:* RFI questionnaire templates live in this browser's `localStorage` (`paragon.rfiTemplates`, `src/pages-v2/sourcing/rfiTemplates.ts`); governed, shared templates for questionnaires, criteria and events are not built (PRs #408, #409). |
| **SE-19** | Supplier acts: chase and call-off acknowledgement | Design 2 §5–§6 | Neither verb exists: no `t_chase_ask`, no `t_delivery_acknowledge`. `t_delivery_confirm` is a **buyer** act (procurement lane, `businessRoles.ts:270`) and carries no root cause. Design 2's ownership table listed these as ours; this dispatch assigns them to the SE Team. |
| **SE-20** | Co-pilot on the process guides | Design 5 B.3 | The guides exist (60 files, `guides.json` generated at build, stable citation keys described in Design 5 B.3). No LLM code exists in the tree. The co-pilot answers only from the guide registry and cites a key per sentence; document state comes from the store, never from a guide. |
| **SE-21** | Product catalogs | `SE21_PRODUCT_CATALOG.md` (this set) | Requirements and open decisions only. Today's material catalog is the RFQ wizard's picker over a frozen material master; the storefront's catalog is component state. |
| **SE-22** | Award reaches the forecast split | Operator ruling of 2026-10-09, after the end-to-end walk (hand-off 13); Design 2 for the split itself | An award records the chosen quotation and supplier on the sourcing event and nothing downstream reads it: the forecast publication's split is carried from the previous publication and edited by planning, and no control adds a supplier to a material. Build: an award makes the awarded supplier ELIGIBLE for the awarded material in the split and offers a SUGGESTED allocation. The planner decides; nothing is allocated by the award itself. |
| **SE-23** | Intake material codes | Operator ruling of 2026-10-09, after the end-to-end walk (hand-off 1); C7, and C9 for the material crosswalk | An intake line carries a material name and has no master-code field, so an intake line and the plan-grid row for the same material are two records that nothing joins, and a committed quantity has no row on the grid. Build: intake lines arrive with their master code from the producer (SE-5) through the C9 crosswalk, and the grid joins on it. |

**What the week moved, in one paragraph.** Out of the SE packages: the portal-side invoice match (from SE-12) and RFQ close by a person (from SE-17); RFI and RFP, which v1 carried as an open scope decision, are built. Into them: sourcing exports (SE-9), sourcing notifications (SE-7), named-only documents (SE-8), governed templates (SE-18), and the ranked P2/P3 list in `SE_BACKLOG_v2.md`, each row naming its package. The review week added no package. The operator added two on 2026-10-09, after the end-to-end walk: SE-22 and SE-23 (the two rows above are as Seat 2 recorded them in #417). The count is twenty-three.

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
| Snowflake | C4 (SPEC, zero code) | outside the 23 packages; no package names it |
| Messaging | channel model, chase derivations | SE-7, SE-19 |
| Module activation | registry, ledger (in memory), two screens | SE-4 persists the ledger |
| Process guides | 60 guides; EN authoritative, ID draft | the ID locale review; SE-20 |
| Sourcing | one event through RFI → RFP → RFQ: questionnaire, weighted criteria, proposals, scoring, shortlist, award, conclude | SE-9 (exports), SE-7 (notifications), SE-8 (documents), SE-18 (templates) |
| Invoice match | the match on received and already-invoiced value, on sample data; named approval and release | SE-12 (S/4 receipts and invoice lines, e-Faktur), SE-6 (`t_invoice_remit` feed) |
| Halal compliance | the compliance machine (authored, unwired), projection, receipt notice | D6 OD-2; Design 3 proposes retiring the machine (SE-17) |
| Data residency, UU PDP | requirements (D9) | SE-2, SE-13 |

Currency convention for all documents: IDR for financial figures, USD for vendor contracts (operator ruling). Since PR #392 every rupiah on screen renders through one formatter.

---

## 6 · What "done" means at handover

Four things are true at the pinned SHA and must stay true:

1. **A clean clone builds and passes the gates.** PR #375 made the suite independent of the clone directory's name (`src/lib/treeMutationGate/treeMutation.guard.test.ts:84-134`) and added `engines`, `.nvmrc` and `.env.example`. CI runs `npm run gates` on every PR, every push to `main` and daily. **This refresh did not re-run the gates.** CI ran them on the pinned commit: gate run 37882266248, head `166a561`, job `build · floor · test:gate` = success (read with `gh run view 37882266248` on 2026-10-09; the job `report a scheduled failure` was skipped, as it is on every push).
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
| `SE_BACKLOG_v2.md` | the P2/P3 findings of the module review, ranked, each with its SE package |
| `CHANGES_SINCE_V1.md` | what changed per module since v1, for the Lead Engineer |
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
| the action layer is `IActionService` (`confirmPO`, `advanceStage`, `submitASN` …), TARGET | the action layer is the command dispatcher: 141 verbs on 30 flows through 24 `CommandTarget`s; `IActionService` does not exist in `src/` | built differently; C1 is the contract |
| roles live in two namespaces that must be reconciled | one namespace: the transition atom is the permission (C10 §3.3, C11 V3) | resolved by construction |
| "no i18n exists today" | EN/ID is built (`src/lib/i18n/`), and every process guide exists in both languages | landed after the handoff |
| the compliance engine is schedule-critical with a hard deadline of 17 October 2026, an escalation ladder and PO auto-block | halal compliance is a design policy handled offline; the date does not drive sequencing; the registry write path is OPEN (D6 OD-2) | operator ruling |
| the decided stack is NestJS / PostgreSQL / Redis / RabbitMQ on AWS Jakarta | the stack is the SE Team's choice, constrained only by the contracts (`Paragon_World_Class_Build_Plan_v1.md` §8, FORK-6); AWS Jakarta survives as a residency requirement | superseded |
| `AuditSink` entries carry `before`/`after` snapshots | the audit record is `TransitionEvent` `{ event, actor, scope, correlationId, causationId?, outcome, reason?, subject?, ts }` (C3, pinned) | C3 is ratified |
| Flow Builder, Module Activation and Learn/Co-pilot are backend builds | Module Activation is **built** (PRs #388–#389); process guides are **built** (PRs #390–#391); the Flow Builder is SE-16 and the co-pilot SE-20 | scope ruling of 2026-09-28 |
| SAP OData surfaces named (`API_PURCHASEORDER_2`, `API_BUSINESS_PARTNER`, …) | the repo names no SAP API; C12 §5 records no inbound seam code | useful input, unratified; SE-6 decides |
| companions "Current State of Truth" and "Platform DNA — Universal Principles" | neither exists in the repository; C1–C12 and this set replace them | not measured elsewhere |
