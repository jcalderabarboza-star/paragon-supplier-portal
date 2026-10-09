# Defect register — open items, derived

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · written by the consultant seat (Seat 3), read-only, from a `git archive` export of `main` @ `166a5611303121eb509675dbe19ff78edf786899` (the merge commit of PR #418, E2E-2; equal to `git ls-remote origin refs/heads/main` on 2026-10-09). v1 of this file was written against `6f1da15a…` (PR #392) and tagged `handover-v1` at `9cc535b`. PRs #395–#418 have merged since. The final review (the end-to-end walk of 8 and 9 October) is in: D5 §J, D6 §2 and §3a, and `SE_BACKLOG_v2.md` §6a.

**What v2 did to this register.** It re-checked every row that PRs #395–#418 or the H1 commit touched, moved the rows they closed to §I, and added §J for what the module review opened. The review's P2/P3 findings are **not** repeated here: they are in `SE_BACKLOG_v2.md`, ranked, each with its SE package. Rows not named in §I or §J are carried from v1 unchanged. `docs/findings.md` is byte-unchanged since the v1 pin (`git diff --stat 6f1da15 166a561 -- docs/findings.md` is empty). Line numbers in carried rows that point into files changed since `6f1da15` were re-located only where this document says so; `HANDOVER_INDEX_v2.md` §6 lists the rest.

**How the v1 list was derived, and its limits.** Sources, each named in the `Source` column: (1) `docs/findings.md` — unchanged between the two earlier pins (`git diff --stat 6964b1c8 6f1da15 -- docs/findings.md` is empty), so its rows are carried forward; for every finding id named below, the last status token on a line mentioning it was re-read at the pin on 2026-10-01 (✱ = also confirmed by reading the section on 2026-09-25). (2) `src/pages-v2/deadAffordance.guard.test.tsx`, `toastHonesty.guard.test.tsx`, `externalClaimHonesty.guard.test.tsx`. (3) The toast and claim sweep re-run against the pin by reading each previously listed site. (4) `src/services/transitions/looseEndCensus.ts` (13 rows). (5) `docs/contracts/C7`, `C8`, `C9` §7, `C10` §8, `C11` (`NOT ENFORCED` rows). (6) Verb caller derivation: non-test, non-flow source files naming the transition id literally, with non-literal ids resolved (D2 §2.5).

**Severity:** H = a user is told something false or a governed act is missing; M = a spec/contract gap the backend would build wrongly against; L = hygiene. **Bucket:** must-fix before handover / should-fix / SE package (D1 §4) / OPEN decision (D6).

---

## A · Surfaces that mislead a user

The 25 September issue listed eleven rows here. PRs #376 and #377 closed nine of them; they are moved to §I so nobody re-files them.

| Id | Description | Sev | Status | Source | Bucket |
|---|---|---|---|---|---|
| SUPPLIER-DASHBOARD-DOC-TOAST | `SupplierDashboard.tsx:838-847`: document actions toast `{{action}} — {{name}}` / "Document management workflow coming in Phase 2." (`src/lib/i18n/supplierDashboard.ts:89-90`). It implies nothing happened without saying so; the external-claim gate does not fire because no external effect is claimed | L | OPEN | sweep 2026-10-01 | should-fix (copy) |
| STOREFRONT-LOCAL-APPEND | `SupplierMyStorefront.tsx:218-237`: "New material" appends to component state (`setCatalog`) while the toast says honestly that nothing was sent. The item stays visible until reload | L | OPEN | sweep | SE-21 |
| SUPPLIER-DASHBOARD-FALSE-AFFORDANCES-01 ✱ | the PO row actions are now honest (`SupplierDashboard.tsx:733-742`); the finding is not closed in the register | L | OPEN in register, behaviour honest | findings §79 | should-fix (close the row) |
| ROW-LABEL-NAMES-A-WITHHELD-VERB-01 ✱ | `SupplierOrders` row label names a verb the seat cannot fire | L | OPEN | findings §79 | should-fix |
| PAGES-WITHOUT-HONESTY-MARKER | `LivenessPill` renders in 17 source files (16 pages plus `IllustrativeRegion`); dashboards, analytics, scorecard, orders, invoices, shipments and GR pages still render fixture data without one. Not measured at the rendered level | M | OPEN | source grep 2026-10-01 | should-fix |

## B · Governed acts missing or unreachable

| Id | Description | Sev | Status | Source | Bucket |
|---|---|---|---|---|---|
| COMPLIANCE-UNWIRED | `compliance` flow has no `CommandTarget`; `t_compliance_submit/verify/reject` cannot fire; the registry has no write path | H | OPEN | `WIRED_COMMAND_TARGETS` | OPEN decision OD-2; Design 3 §4.4 proposes retiring the machine (SE-17) |
| REGISTRATION-NO-WRITE | `/register` (`SupplierRegistration.tsx`) makes no service call; supplier self-registration does not create a `supplierApplication` | M | OPEN | `grep -c useDataService` = 0 | should-fix |
| GRLINE-UNWIRED | `goodsReceiptLine` unwired; `t_grline_*` have no caller; `WIZARD-ADMITS-A-SEAT-IT-WILL-REFUSE-01` ✱ open on the wizard interior | M | OPEN | derivation | SE-17 |
| GR-HOLD-NO-CALLER | `t_gr_hold` is surfaced and no surface dispatches it (its only non-flow mention is the `GRC.qualityHold` module part, `src/services/modules/registry.ts:248`) | M | OPEN | derivation | SE-17 (Design 3 §3.6, "the hold gets its door") |
| OBLIGATION-UNWIRED | `obligation` unwired; `t_obligation_track/complete` uncalled | L | OPEN | derivation | SE-17 |
| PO-VIEW-NO-CALLER | `t_po_view` (sole producer of `Viewed`) has no caller; the purchase-order guide says so | L | OPEN | derivation; `docs/guides/purchaseOrder.en.md` | should-fix |
| SEGREGATION-CROSSED-IN-ONE-DRAWER-01 ✱ | `BuyerRequisitions` offers revise → submit → approve on one document to one seat | M | FILED | findings §76d | OPEN decision (D6) |
| PUBLICATION-SIGN-NOT-SEGREGATED | the default buyer seat holds both `publication:draft/allocate/publish` (planning) and `publication:approve` (procurement), so one seat can allocate, sign and publish; `PUB_ACTOR_ATTRIBUTED` requires a named actor but not a different one | M | OPEN | `businessRoles.ts`; `publicationTarget.ts:184-191` | OPEN decision (D6, with SEGREGATION-…-01) |
| PF1A-OVERRIDE-HOLD-STILL-A-TOAST-01 ✱ | "Override hold" on GR is a toast by ruling until identity can name a person | M | OPEN, must not be wired yet | findings | SE-3 then SE-17 |
| ENF-UNKNOWN-MODE-FAILS-OPEN-01 | an unknown enforcement mode fails open | M | OPEN | findings | should-fix |
| HALAL-WARNS-IS-NOT-YET-A-SETTING-01 ✱ | the halal WARN mode is not a recordable setting | L | OPEN — operator | findings §62f | OPEN decision |
| HALAL-ISSUER-BLIND-01 ✱ | no scheme flag on the surface; needs real issuer data | L | OPEN | findings | SE-5 / data |
| SUPPLIERDOC-REJECT-LANDS-ON-AWAITING-UPLOAD-01 ✱ | a rejected supplier document lands on "awaiting upload" | M | OPEN | findings §80a | should-fix |
| SUPPLIERDOC-UPLOAD-OWNED-BUT-UNAUTHORED-01 ✱ | upload is owned by a lane but no verb authors it | M | OPEN | findings §79e | should-fix; SE-8 for the bytes |
| COMMERCIAL-SEAT-SEES-LIVE-UPLOAD-CONTROLS-01 ✱ | a commercial seat sees upload controls it cannot use | M | OPEN | findings §80d | should-fix |
| PF1B-CHANNEL-INGEST-LANDS-DRAFT-01 ✱ | channel ingest lands a Draft rather than the promised state | L | OPEN | findings | should-fix |
| PF1B-VERB-ID-NAMES-THE-OLD-ACT-01 | a verb id names the act it used to be | L | OPEN | findings | should-fix (a rename is a contract change) |
| DRAFT-IN-PROGRESS-IS-NOW-AN-ACTIVITY-MONITOR-01 ✱ | judgement call recorded as open | L | OPEN | findings | should-fix |
| SUPPLIER-CALLOFF-ACK-ABSENT | the supplier cannot acknowledge a released call-off line; `t_delivery_confirm` is the buyer's act and takes no root cause (`deliveryRelease.flow.ts:133-142`) | M | OPEN | flow and lane | SE-19 |
| CHASE-IS-A-READ | nothing records that a planner chased; no `t_chase_ask` | M | OPEN | derivation | SE-19 (record), SE-7 (transport) |
| BULK-UPLOAD-COVERAGE | operator ruling 2026-09-10: every data input needs mass upload and templates; today `parseWorkbook.ts` and `BulkStockEntryGrid` only; "Bulk upload" on `BuyerSuppliers` now says honestly it is not available | M | OPEN | `BuyerSuppliers.tsx:207-214` | SE-15 (OD-3) |
| EXPORT-PRIMITIVE-ABSENT | no `Blob`, `createObjectURL` or `download=` in `src/`; every export control says so | M | OPEN | grep 2026-10-01 | SE-9 |
| ENFORCEMENT-AND-CAP-NO-SURFACE | `t_enforcement_set` is dispatched by a seed only; `t_psl_cap_set` by nothing outside tests; `t_delivery_policy_set` by `MockDeliveryService.ts:250` | L | OPEN | derivation | SE-18 (governed settings surface) |

## C · Data and contract gaps

| Id | Description | Sev | Status | Source | Bucket |
|---|---|---|---|---|---|
| C7-FIND-03 ✱ | `shortfall` promised RESERVED, never added to `PrIntakeLine`; pinned by `ledgerTruth.test.ts` | M | OPEN | C7 `:420`, `:690` | SE-5 |
| C7-MATERIAL-JOIN ✱ | C7 (display string) and C8 (code) material spaces do not join; an intake line contributes no planning facts until it carries a material code (`src/services/planning/facts.ts:17-26`) | M | OPEN | contracts README; facts.ts | SE-5 with C9 |
| C8-FIND-02 | SOMO's inbound emission shape is not modelled in code | M | OPEN | findings | SE-5 |
| C8-FIND-03 ✱ | the `locked → firm` `commitmentClass` mapping is a policy default awaiting ratification (`src/services/sdc/types.ts:23`) | M | OPEN | C8 `:624` | OPEN decision |
| C8 §2.2 | `commitmentClass` projection UNRATIFIED; Amendment 1 (2026-09-28) explicitly does not ratify it; the built default is period-global (`commitmentClassFor`, `publication.ts:41-42`) | M | OPEN | C8 `:20`, `:221` | OPEN decision |
| SOMO-PLAN-PARAMETERS-SPEC | `rop`, `safetyStock`, `projectedStock` are registered measures with no producer and no fact; capability `somoPlanParameters` is `SPEC` | M | OPEN by design | `facts.ts:29`; `registry.ts` | SE-5 |
| PLAN-DRAFT-NOT-DURABLE | unpushed grid edits live in React state and are lost on reload (a banner says so) | M | OPEN by design | `PlanDraftProvider.tsx:2-7` | SE-18 (Design 1 §6.1, B9) |
| MODULE-LEDGER-NOT-DURABLE | the module activation ledger is in memory; a reload returns every module to `Active` | M | OPEN by design | `moduleActivationStore.ts` | SE-4 |
| ID-GUIDES-DRAFT | the 29 Indonesian guides are translations awaiting locale review; the page says so (`pf-guide-draft`) | L | OPEN | `src/guides/index.ts` `GUIDE_DRAFT_LOCALES` | locale review (operator) |
| C9 §7.1, 7.2, 7.4–7.12 ✱ | crosswalk zero rows / zero consumers; no policy engine; `substanceRef` reserved; UoM unresolved; SOMO side unverifiable; never delivered to SOMO | M | OPEN (12 of 13) | C9 §7 | SE-5 (SOMO ratification) |
| D-1 substance vs specification ✱ | escalated to procurement | M | OPEN | C9 §6.1 | OPEN decision |
| D-COMP-BPOM ✱ | BPOM applicability rule content is compliance's to state (mechanism shipped) | M | OPEN | C9 §6.2 | OPEN decision |
| C10 §8.1, 8.7, 8.8 ✱ | six-object model unbuilt; capability count is external; single-atom rule unguarded | M | OPEN | C10 | SE-3 |
| C10 stale text (residue) | the header, §8.4 and §8.5 were corrected by the errata of 2026-10-02 (§I). Still stale: the §2.4 rows that call PR approval and invoice approval unreachable from any screen | L | OPEN | C10 `:172-173` | should-fix (D8 §0) |
| D-ID-2, D-ID-5 ✱ | supplier-side IdP unprocured; registration-review side undecided | M | OPEN | C10 §7 | OPEN decision; SE-3 |
| HEADER-DISAGREES-WITH-LINES-01 ✱ | `PurchaseOrder.totalValue` disagrees with its own lines on 7 of 21 fixtures; pinned as an exact set (`src/services/data/mock/fixtures/asnRefIntegrity.test.ts`; the count was not re-derived at this pin). *v2:* PR #410 names four orders whose total is off by more than 1%; the invoice match now uses the lines and the drawer flags the order | L | OPEN, pinned | findings; PR #410 | should-fix (data) |
| ADOPTION-QUEUE-01 ✱ | ASN ref integrity pinned open on material | L | OPEN, pinned | findings | should-fix |
| LIVENESS-DATASOURCE-01 | liveness derives from wiring, not from source realness; the harvest gate is the shipped mitigation | L | OPEN by design | findings | flips when SE-5 / SE-6 land |
| MG-AIRLESS-AXIS-01 | an open taxonomy question | L | OPEN question | findings | OPEN decision |
| E2E-SUITE-01 | no committed browser end-to-end suite | M | OPEN | contracts README | should-fix |
| G0.1-FIND-01 | dispatch accepts no caller-supplied correlation. Partly overtaken: the planning grid now anchors a batch push on the first dispatch's `correlationId` (`planDraft.ts`). Not re-measured whether the finding is closed | L | UNKNOWN | contracts README | re-measure |
| DNA-SEED-01, F0.2-FIND-01 | listed open in the contracts README; the register's lines near `:63-64` carry `CLOSED` tokens. Not re-read | L | UNKNOWN | README, findings | re-measure |
| SIDEPANEL-I18N-01 | side-panel close button hardcoded English | L | UNKNOWN (register says OPEN; not measured in the tree) | findings | re-measure |

## D · Loose ends the flow catalogue declares (`looseEndCensus.ts`, 14 rows, bilateral)

*At this pin the derivation returns 14, all censused, and no census row is stale (census run of 2026-10-09). The one row added since v1 is `materialRuling#initial-integrity#Governed` (OPS-2, #411): the ruling ledger has no creation verb, as the other governed ledgers have none. It is not in the table below, which is v1's.*

| Entity | Kind | Subject | Reason |
|---|---|---|---|
| goodsReceiptLine | initial-integrity | Pending | substrate-only |
| invoiceMatch | initial-integrity | Pending | substrate-only |
| invoiceMatch | exit-less-state | Qty Mismatch | substrate-only |
| invoiceMatch | exit-less-state | Price Variance | substrate-only |
| purchaseRequisition | unauthored-cascade | `t_pr_convert` | authored-unwired |
| intakeLine | initial-integrity | Pending | born-state (new at A2) |
| compliance | initial-integrity | Missing | born-state |
| enforcement | initial-integrity | Governed | substrate-only |
| pslCapSetting | initial-integrity | Governed | substrate-only |
| role | initial-integrity | Defined | substrate-only |
| deliveryRelease | initial-integrity | Draft | substrate-only |
| deliveryPolicy | initial-integrity | Governed | substrate-only |
| moduleActivation | initial-integrity | Governed | substrate-only (new at M1) |

These are exemptions, not to-dos: each ships deliberately and `flowGraph.test.ts` fails if one is fixed without deleting its row. Three-way match and e-Faktur are SE-12.

## E · Invariants with no enforcer (`C11-invariants.md`)

| Row | Invariant | State |
|---|---|---|
| V15 | the portal never mints a document identity | **now `GATE`** (`src/lib/documentNumberGate/documentNumberGate.test.ts`, PR #392) — moved to §I |
| V16 | authentication is bought, authorisation is ours | `NOT ENFORCED` until an IdP lands (SE-3) |
| V17 | a refusal is a value, not an exception | `NOT ENFORCED`; a gate over the dispatcher's source for `throw` outside argument validation would enforce it |

## F · Documentation and delivery hygiene

| Id | Description | Sev | Bucket |
|---|---|---|---|
| DOCS-STALE (residue; see D8 §0) | most of v1's list was applied at H1 (§I). Still open at the pin: C5 has no row for the planning read seam or module activation; the contracts README says the same nothing; C10 §2.4 two rows; `CLAUDE.md:589` "Three arcs, in order. Nothing else is queued."; the four register appends of D8 §6 | L | should-fix |
| CONTRIBUTING-ABSENT | no `CONTRIBUTING.md` at root or in `docs/` | L | should-fix |
| SUITE-LOAD | two whole-tree scans timed out under load on 2026-09-25; not re-measured | L | re-measure |
| REGISTER-OUTGREW-THE-SURFACES-01 ✱ | `docs/findings.md` is 1,837,163 bytes; unusable as a work list | M | this document set is the distillation |
| INVENTED-SYMBOL-FROM-A-REMEMBERED-TREE-01 ✱ | closes when a reconciliation runs with zero absent artefacts | L | should-fix |
| DP2-PALETTE-01, DP3-FONT-02, DP3-CHIP-01 | visual-conformance sweeps; the palette has a tree-wide gate; the other two not re-measured | L | should-fix |

## H · Gaps the RFP names that the tree does not answer

Requirements, not defects in shipped code. Each now names the SE package that carries it.

| Id | Requirement (RFP §) | State at the pin | Bucket |
|---|---|---|---|
| RFP-RFI-AUCTION | RFI / RFP / auctions (Objective 5, F6) | **RFI and RFP are built** (RFx-1 to RFx-3, PRs #407–#409: stages, questionnaire, weighted criteria, proposals, scoring, shortlist). Auctions ABSENT | auctions: OPEN decision |
| RFP-NETWORK-DISCOVERY | discovery via a global business network (F6) | ABSENT; structural for an internal platform | OPEN decision |
| RFP-NOTIFICATION-ENGINE | real-time notifications and N-day reminders (A2.6, I5, F7) | ABSENT: no transport, no scheduler | SE-7, SE-19 |
| RFP-THRESHOLDS-SUBSCRIPTIONS | configurable thresholds and subscriptions (F7) | constants; recordable settings are the enforcement, PSL-cap, delivery-policy and module ledgers | SE-18 (governed settings), SE-7 |
| RFP-CAPACITY-SUBMISSION | supplier capacity calendars, MOQ, lead times (F3) | `CapacityProfile` declared and build-deferred (`src/services/sdc/types.ts:714-725`); MOQ and lead time are captured only on a quotation | Design 2 §7 / batch B9 (SE Team) |
| RFP-PACKING-LIST | label / packing-list generation (F5) | ABSENT | SE-9 |
| RFP-EXPORT-API | export Excel/CSV/PDF; API to curated datasets (F9) | ABSENT | SE-9; API with SE-4 |
| RFP-MASTER-DATA-WRITEBACK | supplier data update → approval → vendor-master write (Objective 4) | ABSENT | SE-6 |
| RFP-NON-ERP-ROUNDTRIP | Excel/EDI/API round-trip for non-ERP suppliers (Objective 7) | the SDC workbook import only | SE-15, SE-7 |
| RFP-DISTRIBUTOR-MODEL | distributor-vs-principal supplier model (Appendix 1) | ABSENT in the supplier entity | should-fix (schema) |
| RFP-SCORECARD-OBJECTIVE | objective OTIF / adherence / response-time metrics (F8) | fixture-stored `otif` | SE-4 with execution facts |
| RFP-USER-MGMT | user administration for 500+ suppliers; Planner / Warehouse-Expeditor personas (F1) | roles exist as lanes; no user objects | SE-3, SE-18 |
| RFP-PRODUCT-CATALOG | product catalogs for direct and indirect materials | the RFQ picker over a frozen master; storefront catalog is component state | SE-21 |
| RFP-NFR-OBSERVABILITY / -SECURITY | N4, N6 | ABSENT beyond RBAC atoms and the in-memory audit | SE-13 |
| RFP-DELIVERABLES | onboarding toolkit, migration, manuals, runbook, SLA (Deliverables 4, 7, 9) | the process guides now cover the "manual" half in EN (ID draft); the rest ABSENT | OPEN decision |

## I · Closed since the previous issue, recorded so nobody re-files them

| Id (25 Sep) | Closed by | Evidence |
|---|---|---|
| TOAST-BARE-EXPORT (`SupplierPerformance`) | #376 | `src/lib/i18n/supplierPerformance.ts:35-38` "Performance report not available yet / No file was generated…" |
| TOAST-BARE-REMITTANCE (`BuyerInvoices`) | #376 | `src/lib/i18n.ts:608-610` |
| TOAST-BARE-WARROOM (`BuyerRisk`) | #376 | `src/lib/i18n/risk.ts:102-104` |
| TOAST-LOCAL-STOREFRONT (four toasts) | #376 | `supplierMyStorefront.ts:60, :90-95, :108, :115`; the local append remains (§A) |
| TOAST-CLAIMS-NOTIFIED (five sites) | #376 | `shipments.ts:125-127`, `risk.ts:136`, `compliance.ts:147-150`, `rfqs.ts:171`, `discovery.ts:150-153`; and a new gate, `externalClaimHonesty.guard.test.tsx` |
| DEAD-AFFORDANCE-01 (residue was 29, not 26 as the previous issue said) | #377 | `RESIDUE = []` (`deadAffordance.guard.test.tsx:491`), held at `:689-703`; "New PO", "Invite supplier", "Create RFQ" now honest; the PO panel's footer and the supplier profile's Save were removed |
| TOAST-ONLY-HANDLERS | #376 / #377 | every export, download and send control now admits it does nothing; no positive "Exporting / Downloading / Generating" copy remains in `src/lib` |
| "Resolve" on a disputed supplier invoice | #376 | `supplierInvoices.ts:52-54`; the buyer-side resolve is a real dispatch |
| LOGIN-PASSWORD-IGNORED | A1 / H3 | `src/pages/auth/Login.tsx` has no email and no password field |
| C7-FIND-02 | A2 | C7 register `:689` (the heading still disagrees, §C) |
| C7-FIND-05 | A2 | C7 register `:692`; `idempotencyKey: line.id` on the intake cascade |
| V15 no enforcer | #392 | `documentNumberGate.test.ts`; C11 V15 `GATE` |
| SUITE-DIRNAME, RUN-ARTEFACTS | #375 | `treeMutation.guard.test.ts:84-134`; `engines`, `.nvmrc`, `.env.example` (documents `GATE_*`, held by `envExample.guard.test.ts`) |
| README personal names and stale claims | #375 | `readmeNoPersonalNames.guard.test.ts`, `readmeStructure.guard.test.ts` |
| Requirement-response "latest" depended on insertion order | A3 | `compareAnswerRecency`, `src/services/sdc/consolidation.ts:217-245` |
| No supplier exit from `Disputed` / `Accepted` | A3 | `t_requirementresponse_revise` |

**Closed since v1 (H1 and PRs #395–#418).**

| Id | Closed by | Evidence at the pin |
|---|---|---|
| QUOTATION-RESPONDED-01 | SRC-1 (#405) | the responder list is derived at read from the quotations (`src/data/rfqResponses.ts`); the fixture authors none. The review had found this as a P0: no event made on the platform could be awarded |
| C7-SELF-CONTRADICTION | H1 | `C7-pr-intake.md:464-467` (heading corrected, old heading quoted) |
| C10 stale header, §8.4, §8.5 | H1 errata 2026-10-02 | `C10-identity.md:7-15`, `:708-709`, `:776-777` |
| DOCS-STALE: contracts README counts; C5 LivenessRegistry and OIDC rows; C12 "C3 has no pin"; `CLAUDE.md` heading, Stage G and arc 2 | H1 | `docs/contracts/README.md:78-90` (and held to C1 by `src/handoverFigures.pin.test.ts`); `C5-seams.md:22`, `:26`, `:143`; `C12-backend-spec.md:47`; `CLAUDE.md:211` and the two retractions marked "H1, D8" |
| DESIGN-FOOTERS-NAME-A-PERSON | H1 | the five path lines carry `C:\Users\<operator>\`; `src/handoverIndex.guard.test.ts` holds the marked rows equal to the files that carry the placeholder |
| Figures with no pin (routes, modules, roles, sample persons, liveness) | H1 | `src/handoverFigures.pin.test.ts` |
| RFP-RFI (the RFI and RFP half of RFP-RFI-AUCTION) | RFx-1 to RFx-3 (#407–#409) | `rfq.flow.ts` (12 verbs, states incl. `Concluded`), `stageResponse.flow.ts` |
| Two invoices of Rp 2.0B each on one order with half the goods received both read "Matched" and were both released (R-OPS P0-1) | OPS-1 (#410) | the match reads received and already-invoiced value; the PR's repro spec fails on the previous `main` |
| The supplier was told a released payment "has been processed and credited to your account" (R-OPS P0-2) | OPS-1 (#410) | the "confirmed" sentence shows only at `Remittance Received` |
| An invoice submitted after its receipt posted was never matched (R-OPS P0, late invoice) | OPS-1 (#410) | `t_invoice_submit` and `t_invoice_resolve` cascade to `t_invoice_match` (`cascades.ts:42-46`) |
| A quotation was accepted on a closed or overdue event; every seeded open event read about a hundred days overdue | SRC-2 (#406) | four refusals on `t_quotation_submit` (`policies.ts`); fixture families `rfq`, `quotation` |
| The RFQ store wrote a rate or an awardee by payload shape on any verb | RFx-2 (#408) | `src/services/data/mock/rfx2StorePayload.test.ts` (fails on the previous `main`) |
| A weekly publish superseded the monthly plan | SDC-1 (#400) | one current publication per grain |
| A publication draft could not be discarded and blocked every new draft at its grain; a generated sample material could not be answered | SDC-5 (#404) | `t_publication_discard`; `src/services/planning/publishedMaterial.ts` |
| A paste the grid did not receive reported success; a requisition carried the suggestion's line total | PLN-1 (#395) | `unitPrice ×` committed quantity (C7) |
| One material could be committed at two grains | PLN-2 (#396) | `INTAKE_ONE_GRAIN` (`policyHooks.ts:892`) |

## J · Opened by the module review, still open at the pin

P0 and P1 items the module review found that are **not** closed at `166a561`, the rows of this section that closed on 8 and 9 October (kept one issue so nobody re-files them), what the state-machine census of 2026-10-09 added, and the breaks of the final review (the end-to-end walk, `qaHandover\e2e\E2E_REPORT.md`; the number in a row is the walk's hand-off). Everything smaller is in `SE_BACKLOG_v2.md`.

| Id | Description | Sev | Status | Source | Bucket |
|---|---|---|---|---|---|
| OPS-RECEIPT-QUALITY-STEP | a receipt could not pass the quality step for a material with no halal ruling (R-OPS) | H | **CLOSED** — #411 (halal applies to packaging by default; Compliance rules applicability on a ledger) and #412 (SAMPLE certificates and rulings). Left stopped on purpose: Sample Personal Care Emulsifiers GmbH × `RM-EMUL-9440` (certificate expired) and `RM-COCO-8200` (BPOM unruled) | PRs #411, #412; `ops2bEnforcement.test.ts` | closed |
| OPS-EXISTING-RECEIPT-UNWORKABLE | an existing receipt could not be worked from the list (R-OPS) | H | **CLOSED** — #411: the list opens the receiving form on that receipt; results are recorded by `t_gr_record_inspection`; a hold is placed with a reason | PR #411 | closed |
| OPS-SUPPLIER-INPUT-DROPPED | what the supplier typed on a PO confirmation and on an ASN did not all arrive | M | **CLOSED** — #413. The packing list is still a file name only | PR #413; `ops3SupplierTyped.test.ts` | closed; file storage SE-8 |
| INVOICE-UNNAMED-APPROVAL | an approval made with nobody named could be released by any seat holding the pay right | M | **CLOSED** — #411: approval by a seat that names nobody is refused; an Approved invoice with no named approver is approved again before release | PR #411; `policies.ts` (`INVOICE_APPROVER_UNATTRIBUTED`, `INVOICE_APPROVAL_UNNAMED`) | closed |
| ASN-NEVER-DELIVERED | a new ASN never reaches `Delivered` from any surface (its `In Transit` and `Delivered` are system verbs with no feed), so a leg to Paragon on a new ASN stays counted as incoming | M | OPEN; the operator ruled that the supplier never marks arrival, receipt records it | `qaHandover\STATE_2026-10-06.md` | SE-10 (TMS feed) or a receipt cascade |
| DELIVERY-OVERDUE-AFTER-DELIVERY | delivery agreements: the supplier was told "Overdue — Paragon is waiting" for a line already delivered late (R-OPS P1) | H | **CLOSED** — #413 | PR #413 | closed |
| DELIVERY-FLAG-FLAGS-NOTHING | delivery agreements: "Governed — flag over 10%" flagged nothing (R-OPS P1) | M | **CLOSED** — #413. The flag reports; it does not stop a release | PR #413 | closed |
| DELIVERY-RELEASE-ALWAYS-REFUSES | delivery agreements: past-dated draft lines offered a Release that always refused (R-OPS P1) | M | **CLOSED** — #413: no Release is offered; the row says to adjust the date | PR #413 | closed |
| PR-APPROVAL-UNNAMED | a requisition approval by a seat that names nobody was admitted and recorded against nobody (the previous issue measured `pr-004` → `Approved`, approver unattributed) | H | **CLOSED** — #417: `pr_decider_named` is first on `t_pr_approve` and `t_pr_reject`. The same probe, run through the shipped dispatcher at this pin: refused `PR_DECIDER_UNATTRIBUTED`, the requisition stays `Pending Approval`, nothing recorded | PR #417; census probe of 2026-10-09 at `166a561` | closed |
| PUBLICATION-ACTS-UNNAMED | publishing, discarding and withdrawing a forecast publication carried no named-person check | M | **CLOSED** — #417: `publication_actor_named` on the three verbs; each refuses the unnamed seat when its hook is fired (census probe at this pin) | PR #417 | closed |
| PR-SOURCING-EVENT-STRANDS | a requisition in `Sourcing Event` has no exit a person or a system can take: its only exit is `t_pr_convert`, which nothing fires (the purchase order is S/4's). One sample requisition rests there. Carried from v1 (R3 §1.4), unchanged | M | OPEN by ruling; a seam | census of 2026-10-09; `looseEndCensus.ts` (`purchaseRequisition#unauthored-cascade#t_pr_convert`) | SE-6 |
| RECEIPT-STOPPED-CANNOT-BE-TURNED-AWAY | goods stopped at the quality step cannot be held or rejected through the receiving form: its quality step comes before its decision step. The dispatcher allows both | M | OPEN | PR #412 ("For your attention") | SE-17 |
| PO-PARTIAL-NO-FURTHER-ASN | a Partially Delivered order cannot take a further ship notice in the portal (seen on PO-2025-00116; the cause was not sought) | M | OPEN | PR #412 | SE-17 |
| E2E-ORDER-NEVER-LEARNS (23) | after receipt, invoice and payment the order still read Confirmed and the ship notice Submitted, on both sides, and the supplier was still offered Create ASN | H | **CLOSED as a read** — #418: both pages show what was received, from posted receipts; Create ASN is withheld for a fully received order. By ruling SAP owns the order's status: no verb on an order or a ship notice changed, and the order's timeline still follows its own status (backlog row 109) | E2E report; PR #418 | closed; status feed SE-6 |
| E2E-INVOICE-FREE-TYPED (24) | the invoice form took an order number and a free-typed amount | H | **CLOSED** — #418: the form opens on the order's lines at the accepted quantity; the amount is the lines' total; the same rule sits behind the form as a hook | E2E report; PR #418; `e2e2InvoiceLines.test.ts` | closed |
| E2E-SMALL-P1 (4, 5a, 6a, 6b, 10a) | the approval note said "unattributed" while a named person was recorded; the wizard saved an incoterm other than the one shown; no Active Ingredients event could leave RFI with the sample roster; the supplier card listed criteria nobody set and showed the award deadline as the delivery date; an exchange rate's age was judged on the wall clock | M | **CLOSED** — #417, all five | E2E report; PR #417 | closed |
| E2E-AWARD-NOT-IN-SPLIT (13) | an award does not reach the forecast split: the awarded supplier is not made eligible for the awarded material, and no control adds it | H | OPEN by ruling of 2026-10-09 | E2E report; D1 §4 | SE-22 |
| E2E-INTAKE-NO-MASTER-CODE (1) | an intake line carries a material name and no master code, so it and the plan-grid row for the same material are two records nothing joins | H | OPEN by ruling of 2026-10-09 | E2E report; D1 §4 | SE-23 |
| INVOICE-NO-LINES-DOOR | an invoice created with **no** lines is not examined and is admitted with any amount; the match judges it. Left open so every existing caller keeps working | M | OPEN; the pull request asks whether it should close | PR #418 | decide (D6 §2); SE-12 |

## G · Not defects, recorded so nobody re-files them

- Verbs owned by S/4, the TMS or the bank have no surface by design (`surfaceable.owner`).
- `t_publication_supersede`, `t_requirementresponse_supersede` and the intake cascade's `t_pr_create` are cascade-only by design.
- An OFF module's routes still render (read-only), not a 404; that is the ruling (Design 5 §A.3).
- A sample person cannot switch modules on the production deployment; that is a lock, not a defect (`MODULE_SET_NOT_SAMPLE_IN_PROD`).
- A second quotation from the same supplier on one event is refused, not treated as a revision; that is the ruling at SRC-2 (no supersede link, state or rule exists).
- An RFI with no questionnaire and an RFP with no criteria still publish and take interest and a note; that is a decision recorded in PRs #408 and #409.
- A knock-out answer is not a refusal: the supplier submits it and is not told (PR #408).
- The SOMO plan-version feed being SIMULATED and the supplier read being LIVE-only is by construction: the supplier sees the sample only when the page asks for it by name, under a sample banner.
