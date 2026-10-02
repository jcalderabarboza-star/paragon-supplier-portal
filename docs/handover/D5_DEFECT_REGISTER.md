# Defect register — open items, derived

**Status:** DRAFT for Seat 2 review · refreshed 2026-10-01 · from `main` @ `6f1da15aa41c03e38538562ea8e6c250353538a1` (PR #392).

**How this list was derived, and its limits.** Sources, each named in the `Source` column: (1) `docs/findings.md` — **unchanged between the two pins** (`git diff --stat 6964b1c8 6f1da15 -- docs/findings.md` is empty), so its rows are carried forward; for every finding id named below, the last status token on a line mentioning it was re-read at the pin on 2026-10-01 (✱ = also confirmed by reading the section on 2026-09-25). (2) `src/pages-v2/deadAffordance.guard.test.tsx`, `toastHonesty.guard.test.tsx`, `externalClaimHonesty.guard.test.tsx`. (3) The toast and claim sweep re-run against the pin by reading each previously listed site. (4) `src/services/transitions/looseEndCensus.ts` (13 rows). (5) `docs/contracts/C7`, `C8`, `C9` §7, `C10` §8, `C11` (`NOT ENFORCED` rows). (6) Verb caller derivation: non-test, non-flow source files naming the transition id literally, with non-literal ids resolved (D2 §2.5).

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
| QUOTATION-RESPONDED-01 | `t_quotation_submit` does not sync the RFQ's `respondedSupplierIds` (`MockCommandService.ts:566` initialises it empty) | L | OPEN | findings | should-fix |
| SUPPLIER-CALLOFF-ACK-ABSENT | the supplier cannot acknowledge a released call-off line; `t_delivery_confirm` is the buyer's act and takes no root cause (`deliveryRelease.flow.ts:133-142`) | M | OPEN | flow and lane | SE-19 |
| CHASE-IS-A-READ | nothing records that a planner chased; no `t_chase_ask` | M | OPEN | derivation | SE-19 (record), SE-7 (transport) |
| BULK-UPLOAD-COVERAGE | operator ruling 2026-09-10: every data input needs mass upload and templates; today `parseWorkbook.ts` and `BulkStockEntryGrid` only; "Bulk upload" on `BuyerSuppliers` now says honestly it is not available | M | OPEN | `BuyerSuppliers.tsx:207-214` | SE-15 (OD-3) |
| EXPORT-PRIMITIVE-ABSENT | no `Blob`, `createObjectURL` or `download=` in `src/`; every export control says so | M | OPEN | grep 2026-10-01 | SE-9 |
| ENFORCEMENT-AND-CAP-NO-SURFACE | `t_enforcement_set` is dispatched by a seed only; `t_psl_cap_set` by nothing outside tests; `t_delivery_policy_set` by `MockDeliveryService.ts:250` | L | OPEN | derivation | SE-18 (governed settings surface) |

## C · Data and contract gaps

| Id | Description | Sev | Status | Source | Bucket |
|---|---|---|---|---|---|
| C7-FIND-03 ✱ | `shortfall` promised RESERVED, never added to `PrIntakeLine`; pinned by `ledgerTruth.test.ts` | M | OPEN | C7 `:420`, `:690` | SE-5 |
| C7-SELF-CONTRADICTION | C7's register says C7-FIND-02 is CLOSED AT A2 (`:689`) but its §2 heading still reads "C7-FIND-02 (DEFECT, OPEN)" (`:375`); the field note "still spelled `period: string` … until B2" (`:318`) is stale | L | OPEN | C7 | must-fix (D8 §5a) |
| C7-MATERIAL-JOIN ✱ | C7 (display string) and C8 (code) material spaces do not join; an intake line contributes no planning facts until it carries a material code (`src/services/planning/facts.ts:17-26`) | M | OPEN | contracts README; facts.ts | SE-5 with C9 |
| C8-FIND-02 | SOMO's inbound emission shape is not modelled in code | M | OPEN | findings | SE-5 |
| C8-FIND-03 ✱ | the `locked → firm` `commitmentClass` mapping is a policy default awaiting ratification (`src/services/sdc/types.ts:23`) | M | OPEN | C8 `:624` | OPEN decision |
| C8 §2.2 | `commitmentClass` projection UNRATIFIED; Amendment 1 (2026-09-28) explicitly does not ratify it; the built default is period-global (`publication.ts:31-42`) | M | OPEN | C8 `:20`, `:221` | OPEN decision |
| SOMO-PLAN-PARAMETERS-SPEC | `rop`, `safetyStock`, `projectedStock` are registered measures with no producer and no fact; capability `somoPlanParameters` is `SPEC` | M | OPEN by design | `facts.ts:29`; `registry.ts` | SE-5 |
| PLAN-DRAFT-NOT-DURABLE | unpushed grid edits live in React state and are lost on reload (a banner says so) | M | OPEN by design | `PlanDraftProvider.tsx:2-7` | SE-18 (Design 1 §6.1, B9) |
| MODULE-LEDGER-NOT-DURABLE | the module activation ledger is in memory; a reload returns every module to `Active` | M | OPEN by design | `moduleActivationStore.ts` | SE-4 |
| ID-GUIDES-DRAFT | the 28 Indonesian guides are translations awaiting locale review; the page says so (`pf-guide-draft`) | L | OPEN | `src/guides/index.ts` `GUIDE_DRAFT_LOCALES` | locale review (operator) |
| C9 §7.1, 7.2, 7.4–7.12 ✱ | crosswalk zero rows / zero consumers; no policy engine; `substanceRef` reserved; UoM unresolved; SOMO side unverifiable; never delivered to SOMO | M | OPEN (12 of 13) | C9 §7 | SE-5 (SOMO ratification) |
| D-1 substance vs specification ✱ | escalated to procurement | M | OPEN | C9 §6.1 | OPEN decision |
| D-COMP-BPOM ✱ | BPOM applicability rule content is compliance's to state (mechanism shipped) | M | OPEN | C9 §6.2 | OPEN decision |
| C10 §8.1, 8.7, 8.8 ✱ | six-object model unbuilt; capability count is external; single-atom rule unguarded | M | OPEN | C10 | SE-3 |
| C10 stale text | header "ZERO CODE…", §8.4 "It does not" (the event does carry `attribution`), §8.5 (`PERSONA_ROLES`) | M | OPEN | C10 `:7`, `:699`, `:700` | must-fix (D8 §3) |
| D-ID-2, D-ID-5 ✱ | supplier-side IdP unprocured; registration-review side undecided | M | OPEN | C10 §7 | OPEN decision; SE-3 |
| HEADER-DISAGREES-WITH-LINES-01 ✱ | `PurchaseOrder.totalValue` disagrees with its own lines on 7 of 21 fixtures; pinned as an exact set (`asnRefIntegrity.test.ts`) | L | OPEN, pinned | findings | should-fix |
| ADOPTION-QUEUE-01 ✱ | ASN ref integrity pinned open on material | L | OPEN, pinned | findings | should-fix |
| LIVENESS-DATASOURCE-01 | liveness derives from wiring, not from source realness; the harvest gate is the shipped mitigation | L | OPEN by design | findings | flips when SE-5 / SE-6 land |
| MG-AIRLESS-AXIS-01 | an open taxonomy question | L | OPEN question | findings | OPEN decision |
| E2E-SUITE-01 | no committed browser end-to-end suite | M | OPEN | contracts README | should-fix |
| G0.1-FIND-01 | dispatch accepts no caller-supplied correlation. Partly overtaken: the planning grid now anchors a batch push on the first dispatch's `correlationId` (`planDraft.ts`). Not re-measured whether the finding is closed | L | UNKNOWN | contracts README | re-measure |
| DNA-SEED-01, F0.2-FIND-01 | listed open in the contracts README; the register's lines near `:63-64` carry `CLOSED` tokens. Not re-read | L | UNKNOWN | README, findings | re-measure |
| SIDEPANEL-I18N-01 | side-panel close button hardcoded English | L | UNKNOWN (register says OPEN; not measured in the tree) | findings | re-measure |

## D · Loose ends the flow catalogue declares (`looseEndCensus.ts`, 13 rows, bilateral)

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
| DOCS-STALE (see D8) | contracts README counts (55/72/10); C5 LivenessRegistry and OIDC rows; C7 self-contradiction; C10 header, §8.4, §8.5; C12 "C3 has no pin"; CLAUDE.md "main @ #65" | M | must-fix |
| CONTRIBUTING-ABSENT | no `CONTRIBUTING.md` at root or in `docs/` | L | should-fix |
| SUITE-LOAD | two whole-tree scans timed out under load on 2026-09-25; not re-measured | L | re-measure |
| REGISTER-OUTGREW-THE-SURFACES-01 ✱ | `docs/findings.md` is 1,837,163 bytes; unusable as a work list | M | this document set is the distillation |
| INVENTED-SYMBOL-FROM-A-REMEMBERED-TREE-01 ✱ | closes when a reconciliation runs with zero absent artefacts | L | should-fix |
| DESIGN-FOOTERS-NAME-A-PERSON | `DESIGN_3`–`DESIGN_6` end with a source-path footer containing the operator's Windows user name; the files go into `docs/designs/` unchanged | L | must-fix decision for Seat 2 (see `HANDOVER_INDEX.md`) |
| DP2-PALETTE-01, DP3-FONT-02, DP3-CHIP-01 | visual-conformance sweeps; the palette has a tree-wide gate; the other two not re-measured | L | should-fix |

## H · Gaps the RFP names that the tree does not answer

Requirements, not defects in shipped code. Each now names the SE package that carries it.

| Id | Requirement (RFP §) | State at the pin | Bucket |
|---|---|---|---|
| RFP-RFI-AUCTION | RFI / RFP / auctions (Objective 5, F6) | ABSENT | OPEN decision |
| RFP-NETWORK-DISCOVERY | discovery via a global business network (F6) | ABSENT; structural for an internal platform | OPEN decision |
| RFP-NOTIFICATION-ENGINE | real-time notifications and N-day reminders (A2.6, I5, F7) | ABSENT: no transport, no scheduler | SE-7, SE-19 |
| RFP-THRESHOLDS-SUBSCRIPTIONS | configurable thresholds and subscriptions (F7) | constants; recordable settings are the enforcement, PSL-cap, delivery-policy and module ledgers | SE-18 (governed settings), SE-7 |
| RFP-CAPACITY-SUBMISSION | supplier capacity calendars, MOQ, lead times (F3) | `CapacityProfile` declared and build-deferred (`src/services/sdc/types.ts:706-725`); MOQ and lead time are captured only on a quotation | Design 2 §7 / batch B9 (SE Team) |
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

## G · Not defects, recorded so nobody re-files them

- Verbs owned by S/4, the TMS or the bank have no surface by design (`surfaceable.owner`).
- `t_publication_supersede`, `t_requirementresponse_supersede` and the intake cascade's `t_pr_create` are cascade-only by design.
- An OFF module's routes still render (read-only), not a 404; that is the ruling (Design 5 §A.3).
- A sample person cannot switch modules on the production deployment; that is a lock, not a defect (`MODULE_SET_NOT_SAMPLE_IN_PROD`).
- The SOMO plan-version feed being SIMULATED and the supplier read being LIVE-only is by construction: the supplier sees the sample only when the page asks for it by name, under a sample banner.
