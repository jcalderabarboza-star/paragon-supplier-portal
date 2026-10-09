# Architecture — the portal in the federated landscape

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · written by the consultant seat (Seat 3), read-only, from a `git archive` export of `main` @ `166a5611303121eb509675dbe19ff78edf786899` (the merge commit of PR #418, E2E-2; equal to `git ls-remote origin refs/heads/main` on 2026-10-09). v1 of this file was written against `6f1da15a…` (PR #392) and tagged `handover-v1` at `9cc535b`. PRs #395–#418 have merged since. The final review (the end-to-end walk of 8 and 9 October) is in: D5 §J, D6 §2 and §3a, and `SE_BACKLOG_v2.md` §6a.
**Tiers used below** (from `docs/contracts/README.md`): **LIVE** = code exists and runs (mock or in-memory); **RESERVED** = a named swap-point with no implementation; **SPEC** = a build target with zero code. The SE package that owns each integration is named (D1 §4).

---

## 1 · The systems

| System | Role | What the portal exchanges with it | Status in the tree | SE package |
|---|---|---|---|---|
| **Supplier portal (this repo)** | collaboration and orchestration layer; owns confirmations, declarations, uploads, reviews, forecast publications to suppliers, module activation, the audit trail | — | LIVE on fixtures | SE-4 |
| **SAP S/4HANA** | system of record for PO, GR, invoice, contract, scheduling agreement, vendor master, material master; owns the verbs the portal never fires | outbound: settlement of `t_gr_post` and `t_invoice_release_payment`; inbound: business events | outbound boundary LIVE (mock `settle`); inbound RESERVED, no seam code (C12 §5); document numbers never minted in the portal (C11 V15, gated) | SE-6, SE-12 |
| **SOMO (planning)** | emits demand, accepted requirements, plan versions, reorder point and safety stock | C7 intake lines → `intakeLine` machine → `t_pr_create`; C8 plan versions → `forecastPublication` machine → supplier responses; C9 material crosswalk | intake and publication machines LIVE on SIMULATED feeds (`src/services/planning/somoFixture.ts`, `src/services/data/mock/publicationFeed.ts`); `rop` / `safetyStock` / `projectedStock` SPEC (no producer); C9 zero rows | SE-5 |
| **TMS (transport)** | owns the shipment and ASN movement facts | `INT-TMS-01` ASN boundary | RESERVED (C5); `shipment` flow unwired | SE-10 |
| **Snowflake** | analytical layer | tee of the durable audit sink; curated datasets | SPEC (C4), zero code | not in the 23 packages |
| **Bank / settlement feed** | owns `t_invoice_remit` | — | no seam code (C12 §5) | SE-6 |
| **Messaging (WhatsApp BSP, email, EDI)** | supplier channels | outbound requests, inbound replies, reminders | every channel "Designed … (not connected)" (`src/data/communicationProfiles.ts`); an operator-fed inbound simulator at `/supplier/comm-hub`; no scheduler | SE-7, SE-19 |
| **Identity provider** | authenticates Paragon staff (Entra); supplier IdP unprocured (D-ID-2) | a `SubjectBinding` per person, nothing else | RESERVED (C5, C10) | SE-3 |
| **Object storage** | uploaded documents | file bytes behind `supplierDocument` | nothing stores bytes today | SE-8 |

**Two readings from the source documents, recorded as input rather than as fact.** The RFP Coverage Matrix v2 reads the landscape as hub-and-spoke on Snowflake; the tree does not implement it (C4 SPEC) and no contract ratifies it. The SE Handoff v1 names S/4 OData surfaces and a stack; none is referenced in the repository, and the Build Plan's FORK-6 leaves the stack to the SE Team. Both are open in D6.

## 2 · Diagram (Mermaid source)

```mermaid
flowchart LR
  subgraph Portal["Supplier portal (this repo)"]
    UI["pages-v2 (52 routes)\nModuleGate on every route"]
    Q["query hooks (TanStack)"]
    DS["IDataService (C1, 72 methods)\nmockDataService today"]
    CMD["Command dispatcher\n30 flows · 141 verbs · 24 targets\nMODULE_INACTIVE · role · scope · policy"]
    ST["in-memory stores + fixtures"]
    EV["AuditSink: TransitionEvent (C3)"]
    LR["Liveness registry (27 capabilities)"]
    GD["Process guides (60, EN + ID)"]
    UI --> Q --> DS --> CMD --> ST
    CMD --> EV
    LR -. tier per capability .-> UI
    GD -. rendered on /buyer/process-flows .-> UI
  end

  S4["SAP S/4HANA\nsystem of record"]
  SOMO["SOMO planning"]
  TMS["TMS"]
  SNOW["Snowflake (SPEC)"]
  IDP["Identity provider (RESERVED)"]
  MSG["WhatsApp / email / EDI\n(designed, not connected)"]
  BANK["Bank settlement feed"]

  CMD -- "settle(): t_gr_post, t_invoice_release_payment (LIVE mock)" --> S4
  S4 -. "inbound events (RESERVED, SE-6)" .-> DS
  SOMO -. "C7 intake lines · C8 plan versions (SIMULATED, SE-5)" .-> DS
  TMS -. "INT-TMS-01 (RESERVED, SE-10)" .-> CMD
  EV -. "durable tee (SPEC)" .-> SNOW
  IDP -. "SubjectBinding (RESERVED, SE-3)" .-> UI
  MSG -. "transports (not connected, SE-7)" .-> UI
  BANK -. "t_invoice_remit (no seam)" .-> CMD
```

---

## 3 · The seams, one paragraph each

**C5 — the seam register (`docs/contracts/C5-seams.md`).** The swap-points where the mock becomes the real system. `IDataService` behind `DataServiceContext.tsx` is LIVE (mock); `httpDataService` is RESERVED; `ICommandService` is LIVE in-memory; the SAP Option-B boundary is LIVE for two verbs; `AuditSink` is LIVE in-memory with the durable sink RESERVED; OIDC and `INT-TMS-01` are RESERVED; the backend datastore is RESERVED; Snowflake is SPEC. The two rows v1 reported wrong were corrected at H1 (2026-10-02), each quoting the old text: LivenessRegistry now reads "LIVE (in-memory)" (`C5-seams.md:26`, `:143`) and the OIDC swap-point reads the seat's `businessRoles` resolved by `atomsForSeat` (`:22`). Still missing at the pin: rows for the two read sub-services `IPlanningService` and `IModuleService` (`grep -i -E "planning|module" docs/contracts/C5-seams.md` returns nothing). D8 says which corrections stand open. Pinned by `pinReach.contract.test.ts` for its cited files, not for the tier column.

**C7 — purchase-requisition intake (`C7-pr-intake.md`, Amendment 1 2026-09-28).** One intake shape for two producers (the planning grid and SOMO). Since A2 an intake line is a machine: `intakeLine` (`Pending → Dismissed / Committed`, `t_intake_dismiss` / `_restore` / `_commit`; the atom is `intake:triage`, held by the planning lane, since PLN-3 — v1 said `pr:create`); commit cascades to `t_pr_create` with the line id as idempotency key, and `Committed` is terminal. The requisition carries its origin (`intakeLineId`, `periodBucket`, `decision`); the bucket is `month` or ISO `week` (`src/services/planning/bucket.ts`), quarters refused. `wasAdjusted` is derived by the dispatcher (`dispatcher.ts:492-495`) from the producer's baseline and is not a key any caller has. C7-FIND-02 and C7-FIND-05 are closed at A2; C7-FIND-03 (`shortfall`) stays open, pinned by `ledgerTruth.test.ts`. The self-contradiction v1 reported on C7-FIND-02 was corrected at H1 (`C7-pr-intake.md:464-467`). **New since v1:** Amendment 2 (2026-10-02) records who commits (planning triages, the cascade raises the requisition, procurement approves), one intake population (the queue lists every line the grid commits; Intake Review is a view of the plan grid) and `INTAKE_ONE_GRAIN` (one material × period commits at most once across grains; raw materials are planned monthly, packaging weekly). Amendment 3 (2026-10-05) records what a committed requisition carries (`category`, `requestorRole`) and the bulk acts. The intake line carries an optional `unitPrice` (IDR per unit) and a requisition is priced `unitPrice ×` the committed quantity (PLN-1, operator ruling).

**C8 — forecast publication (`C8-forecast-publication.md`, Amendment 1 2026-09-28).** The publication is a machine since B4a: `forecastPublication` (`Draft → Published → Superseded / Withdrawn`, and since SDC-5 `Draft → Discarded`; `open`, `allocate`, `approve_firm`, `publish`, `discard`, cascade `supersede`, `withdraw`); a revision is a new publication. Since SDC-1 (#400) there is one current publication **per grain**: a weekly publish supersedes only the weekly plan, both seats keep the monthly plan and its open responses, and a withdrawal brings nothing back. `t_publication_withdraw` has no caller on any surface (`SE_BACKLOG_v2.md`). Planners publish from `/buyer/plan-grid` (`PublicationPanel`, `PublicationLedger`); suppliers see deadline, version banner, net change against the superseded publication, and a dated receipt on `/supplier/forecasts`. Firm lines are signed under `publication:approve` (procurement) by a named actor. The `commitmentClass` projection is still UNRATIFIED: Amendment 1 says outright that it does not ratify it, and the period-global default (first bucket `firm`, later buckets `semi-firm`) is a policy default (`commitmentClassFor`, `src/services/sdc/publication.ts:41-42`); C8-FIND-03's void `locked → firm` mapping is still flagged in `src/services/sdc/types.ts:23`. The plan-version feed is SIMULATED; the supplier read is LIVE-only by construction and shows the sample only when asked for it by name.

**The planning fact seam (`IPlanningService.getPlanningFacts`, B1; C6 governs).** Long-form facts (`materialCode`, `supplierId`, `periodBucket`, `measureId`, `value`, `uom`, provenance) over 15 registered measures (`src/services/planning/measures.ts`); `value: null` means "no figure", never zero. Two measures are editable: `acceptedQty` (through `t_intake_commit`) and `allocation` (through `t_publication_allocate`). C6 Amendment 1 / 1a (2026-09-28) moved the override baseline to the producer and made `wasAdjusted` derived; A1-R4 allows per-seat view state to persist while plan state never persists in the browser.

**Module activation (`IModuleService`, M1).** `getModuleActivation` (every seat; what is ON, derived from the ledger, no attribution) and `getModuleLedger` (buyer only; the acts with who and why). The verb is `t_module_set` (atom `module:set`, compliance lane). No contract document covers this seam beyond C1's method list; Design 5 Part A is its specification.

**C9 — material master crosswalk.** Schema and types only: zero rows, zero consumers; thirteen self-declared non-conformances, twelve open. The material master is the frozen `MATERIAL_MASTER` (`src/services/sdc/fixtures.ts:135`, 42 codes). Ratification is SOMO's. The contract is unchanged since v1. One thing moved beside it: since SDC-5 the collaboration lane resolves a published line's material in the master it was published from (`src/services/planning/publishedMaterial.ts`), so a generated `SIM-*` sample material can be answered; those codes are **not** added to `MATERIAL_MASTER`, and sample materials are marked on screen (`SampleMaterialTag`).

**C10 — identity, authority and approval.** Amendment 1 (2026-09-24) plus an errata of 2026-10-02 (H1): the header, §8.4 and §8.5 are corrected as "corrections of fact … not yet ratified", each quoting the old text; the blob at the pin is `6725fa586c8fa7b0f5c4e749e6741611d1aaff6f` (v1 cited `42e23239…`). Amendment 1 discharged §8.2 and §8.3 in code and closed §8.6; §6.3a governs sample persons. Still open: §8.1 (the six-object model is unbuilt), §8.7, §8.8, D-ID-2, D-ID-5. Still stale at the pin: the §2.4 table rows that call PR approval and invoice approval unreachable from any screen (`C10-identity.md:172-173`); both have had surfaces for weeks, and invoice approval now records who approved (OPS-1). No test pins C10.

**Sourcing events (no contract document beyond C1; the guides `rfq`, `quotation` and `stageResponse` are the specification).** One event moves RFI → RFP → RFQ (`RFQ.stage`; absent means RFQ). The wizard chooses the start stage. At RFI the buyer may set a questionnaire on the draft (`t_rfq_questionnaire_set`); at RFP weighted criteria that sum to 100 (`t_rfq_criteria_set`). A supplier answers a stage through the `stageResponse` flow (`Draft → Submitted`; save, re-save, send, or submit in one act). The buyer closes bidding (`t_rfq_close`, a person's act), scores each proposal as a whole sheet (`t_rfq_proposal_score`, atom `rfq:evaluate`), advances with a shortlist of the suppliers who answered (`t_rfq_advance`) or concludes without an award (`t_rfq_conclude`, terminal `Concluded`), and awards only at the RFQ stage. Who has responded is derived at read from the quotations (`src/data/rfqResponses.ts`), never stored. A supplier's read of an event is an allowlist projection (`src/services/data/rfqSupplierView.ts`): it carries the criteria and their weights and never the scores, the knock-out answers or another supplier's id. Not built: exports, blind scoring, templates beyond one browser, inviting a supplier to a published event, any notification.

**The invoice match (the `invoice` and `invoiceMatch` guides are the specification).** Since OPS-1 an invoice is `Matched` only while its amount fits inside what was received and accepted on its purchase order, less what earlier invoices on that order already claim, at the order's own unit prices and with a tolerance of 1% of the ordered value. The match runs when a receipt posts, when an invoice is submitted and when a dispute is resolved. The store stamps `approvedBy` and `releasedBy` from the session. Since E2E-2 (#418) an invoice made from the form states lines at the order's prices, each up to the accepted quantity, and its amount must equal the lines' total; the match still compares totals and does not read the lines. What an order has received is one read, `src/services/data/orderReceipt.ts`, which uses the match's own receipt states and allocation, so the order page, the invoice form and the match cannot disagree. The `invoiceMatch` flow is still a rolled-up sub-flow with no target of its own.

**C11 — invariant pointer.** V15 (the portal never mints a document identity) is now `GATE`, enforced by `src/lib/documentNumberGate/documentNumberGate.test.ts` (PR #392). V16 and V17 remain `NOT ENFORCED`.

**C12 — the backend spec.** A map of what is absent per seam, the never-build rules, inherited invariants, the idempotency contract and the seam-code gap. §2.1's V15 paragraph was rewritten at #392 ("used to violate … retired … gated"). The §1 sentence v1 reported false ("C3 has no pin and no reader") was corrected at H1 (`C12-backend-spec.md:47` now names `c3Events.contract.test.ts`).

---

## 4 · Data flow for one act (what the backend reproduces)

A planner commits an accepted quantity from the planning grid:

1. `PlanGrid` / `TimePhasedGrid` (`src/pages-v2/plan-grid/`) holds the typed or pasted value in a PLANNED overlay (React state, `PlanDraftProvider.tsx`); a reason is required when it differs from the producer's baseline.
2. Push calls `useIntakeCommit` (`src/services/query/commandHooks.ts`) once per row; the first dispatch's `correlationId` becomes the `causationId` of the rest. Since PLN-4 a push of many rows refreshes the planning read once at the end, not once per row, and reports progress row by row.
3. The dispatcher checks the module (`PLN` for the intake line; `REQ` again for the cascaded create, `src/services/modules/registry.ts`, `flows: ['intakeLine']` at `:182`), the seat's atom (`intake:triage`; the cascaded create runs under the automation grant), tenancy, `expectedState`, legality (`Pending`), payload attribution keys, required fields, then the `INTAKE_*` hooks (including `INTAKE_ONE_GRAIN`), and derives `decision.wasAdjusted`.
4. `intakeLineTarget` marks the line `Committed`; the cascade dispatches `t_pr_create` with `idempotencyKey = line.id`, and the requisition store mints the requisition with its origin.
5. Two `TransitionEvent`s are emitted (the commit and the cascaded create), linked by `causationId`.
6. The hook invalidates the scoped query keys; the grid and `/buyer/purchase-requisition` re-read through `IDataService`.

The backend replaces steps 3 to 6 behind the same `IDataService` shape: a durable store, a durable sink, server-side scoping (`describeScopingConformance`, `src/services/contracts/conformance/scoping.ts`) and the same refusal order (`describeDispatchConformance`, `conformance/dispatch.ts`). Both factories are runnable against the real service. The overlay in step 1 becoming a durable plan draft is SE-18 (Design 1 §6).

---

## 5 · What is not in this picture

- No AG Grid (SE-1) and none of the Excel-grade grid features (SE-14); the grid on `main` is read-only views plus governed edits, with keyboard entry, Delete, undo and copy-out since PLN-5.
- No co-pilot, document intelligence or agents; the guides are ready for one (SE-20).
- No Flow Builder (SE-16); flows are code.
- No spend classification, should-cost engine or risk feed; `commodityIntel` is SIMULATED on vendored baskets.
- No export or download primitive anywhere in `src/` (no `Blob`, no `createObjectURL`); every export control says so (SE-9).
- No durable plan draft and no persisted module ledger (SE-18, SE-4).
