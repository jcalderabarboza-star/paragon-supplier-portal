# Requirements trace — the RFP and the Vision traced to the platform

**Status:** DRAFT for Seat 2 review · refreshed 2026-10-01 · from `main` @ `6f1da15aa41c03e38538562ea8e6c250353538a1` (PR #392). The 25 September issue was pinned to `6964b1c8…`; every row was re-checked against the new pin and the rows PRs #375–#392 moved are marked **(moved)**.

**Sources.** The RFP (*Supplier Collaboration Hub*, an internal Paragon document; the file supplied is named `RFP__Supplier_Collaboration_Hub.pdf`, and it is in fact a container of page images with a text layer, which was read in full; the five spreadsheet screenshots on pages 9–13 were not transcribed). The RFP is **not** committed with this set and is referred to by name only. Also: the RFP Coverage Matrix v2 (2026-07-16), the Vision and Capabilities v1, the SE Handoff v1, and the in-tree Strategic Spine.

**Legend.** BUILT-E2E = dispatched through the audited command spine on sample data, result checked. UI-ONLY = the screen renders; writes are absent or local. ABSENT = no route, flow, type or capability. SE-n = the SE work package that carries it (D1 §4). A row can be BUILT-E2E on the portal half and SE-n on the integration half; both are stated. Population figures used below are pinned by C1 (71 methods, 28 flows, 127 verbs, 22 wired targets) or, where unpinned, derived on 2026-10-01 (47 routes, 27 liveness capabilities of which 5 green).

**Where this trace disagrees with the Coverage Matrix v2.** The matrix predates the SDC lanes, the delivery lane, the identity batches, the planning grid, the publication machine, module activation and the guides; its status column is stale on rows 1–4. Disagreements are listed in D8 §9.

---

## 1 · RFP Objectives → platform

| # | Objective | Status | Evidence |
|---|---|---|---|
| 1 | Single governed platform for forecast sharing, call-offs, confirmations, change management | BUILT-E2E (portal half); feeds SE-5, SE-6 **(moved)** | forecast: `forecastPublication` machine published from `/buyer/plan-grid`, answered through `requirementResponse` (9 verbs incl. revise) on `/supplier/forecasts`; call-offs: `deliveryRelease` (buyer release / adjust / confirm) + `deliveryPolicy`; change history `src/services/delivery/history.ts`; the plan feed is SIMULATED (`somoFixture.ts`, `publicationFeed.ts`) |
| 2 | End-to-end supply visibility: SOH, incoming, ASN, tracking with predictive ETA, inbound status, invoice collaboration | BUILT-E2E for SOH / incoming / ASN / invoice; tracking and ETA SE-10 | SOH: `t_inventorydeclaration_declare` (batch + expiry); incoming: `incomingShipment` (`etd`, `eta`, `awb`); ASN: `t_asn_create/submit`; invoices: 8 verbs; `shipment` unwired, `INT-TMS-01` RESERVED; predictive ETA ABSENT |
| 3 | Proactive risk detection and alerts for shortages, delays, capacity | UI-ONLY; transport SE-7 | chase reducers derive lateness at read; `/buyer/chase`; the planning grid's `exceptions` view sorts by first short bucket; no transport, no scheduler; thresholds constants |
| 4 | Managed supplier registration and data updates, integrated with master data | PARTIAL: buyer-raised applications BUILT-E2E; self-registration UI-ONLY; master-data write-back ABSENT (SE-6) | `supplierApplication` (4 verbs); `/register` makes no service call |
| 5 | E-sourcing: discovery, RFI/RFP/auctions, bid analysis | RFQ → quote → award BUILT-E2E; RFI and auctions ABSENT; discovery UI-ONLY | `rfq` (7 verbs), `quotation` (4), PSL governance; no `auction` or `rfi` in `src/` |
| 6 | Objective supplier performance (scorecards) | UI-ONLY | stored `otif`; `scorecards` capability SIMULATED |
| 7 | Integrates with ERP and logistics; ERP and non-ERP suppliers | SE-6, SE-10; non-ERP round-trip SE-15 / SE-7 | seams C5/C12; channels "Designed … (not connected)"; workbook import for SDC stock only |
| 8 | Reduce manual effort; data quality, traceability | BUILT (traceability) **(moved)** | one `TransitionEvent` per command with `subject`; liveness and honesty instruments; process guides for every flow |

## 2 · RFP Functional Scope → platform

| # | Requirement | Status | Evidence and gaps |
|---|---|---|---|
| F1 | Supplier & user management; 500+ suppliers; roles Planner / Procurement / Warehouse-Expeditor / Supplier / Admin | PARTIAL; users SE-3, SE-18 | roles: `planning`, `procurement`, `receiving`, `admin`, `supplier` (+ `commercial` / `fulfilment` / `back_office`); custom roles via `t_role_grant`; no user objects beyond the 16-row sample roster; "expeditor" appears nowhere; 500+ suppliers: twelve fictional, scale not measured |
| F2 | Forecast collaboration: publish RM/PM demand with error-proof templates; supplier confirms qty / dates / capacity; version control and audit trail | BUILT-E2E (publish, confirm, revise, version) **(moved)**; templates SE-15; feed SE-5 | publish: `t_publication_open/allocate/approve_firm/publish`, one open draft per grain, a revision is a new publication that supersedes the prior; supplier: deadline, version banner, net change, dated receipt (`SupplierForecasts.tsx`); revise: `t_requirementresponse_revise` → `_supersede`, ordered "latest"; RM and PM views (`rm-plan` month, `pm-plan` week); capacity as free text only; confirmation templates and bulk import not built (Design 2 §3, SE-15) |
| F3 | Inventory & capacity: SOH, WIP, capacity calendars, output, lead times, MOQ, constraints | SOH BUILT-E2E; capacity profile declared, build-deferred | `CapacityProfile` (`src/services/sdc/types.ts:706-725`, "DECLARED, BUILD-DEFERRED"); MOQ and lead time captured only on a quotation (`quotation.flow.ts`); Design 2 §7 / batch B9 |
| F4 | Call-off management: generate from forecast/ROP; supplier accept/modify; approval; change history | buyer side BUILT-E2E; supplier accept/modify ABSENT (SE-19) **(moved — correction)**; ROP SE-5 | `t_delivery_release` / `_adjust` / `_confirm` are all **procurement** acts (`businessRoles.ts:260-262`); the supplier's acknowledgement (`t_delivery_acknowledge`, Design 2 §6) does not exist; ROP has no producer (`somoPlanParameters` SPEC) |
| F5 | Inbound, shipment, payment: ASN, labels/packing list, status, ETA, tracking, exceptions, invoice collaboration | ASN and invoices BUILT-E2E; packing list SE-9; tracking and ETA SE-10; three-way match SE-12 | exceptions: `t_asn_discrepancy` cascade + `t_asn_resolve_discrepancy`; `invoiceMatch` substrate-only |
| F6 | Sourcing & registration: network discovery, self-registration, category compliance assessments, automated approvals | RFQ spine BUILT-E2E; registration UI-ONLY; network discovery ABSENT; compliance PARTIAL | supplier documents lane (5 verbs), halal receipt notice, PSL governance (8 verbs + cap) |
| F7 | Control tower & alerts; configurable thresholds and subscriptions | UI-ONLY; SE-7, SE-18 | chase reducers; recordable settings are the enforcement, PSL-cap, delivery-policy and module ledgers; no subscriptions; no transport |
| F8 | Supplier performance: scorecards, tiering, improvement tracking | UI-ONLY | fixture OTIF; "Send improvement plan" admits nothing was delivered (`src/lib/i18n/buyerScorecard.ts:76-77`) |
| F9 | Reporting & analytics: dashboards, ad-hoc, export Excel/CSV/PDF, API to curated datasets | dashboards UI-ONLY; export ABSENT (SE-9); API SE-4 | no export primitive in `src/`; every export control now says so (#376) |
| F10 | Localisation & accessibility: EN primary, ID for suppliers, responsive, SE Asia + China access | EN/ID BUILT **(moved)**; responsive PARTIAL; China access not measured | every page and every process guide in EN and ID (ID guides draft); one rupiah formatter (#392); grid accessibility is SE-14 (the installed grid engine ships no ARIA roles, per Design 1 §8) |

## 3 · RFP Integration Scope → platform

| # | Requirement | Status | Evidence |
|---|---|---|---|
| I1 | ERP (SAP): material master, vendor master, PO/call-offs, receipts, inventory, invoice | SE-6; portal side specified | two settlement verbs; no inbound seam code; never-originate rules (C12 §2.1) and the V15 gate; the SE Handoff's OData list is unratified |
| I2 | WMS/TMS: ASN and GR status | SE-10 | `INT-TMS-01` RESERVED |
| I3 | Identity/SSO (Entra); secure supplier auth | SE-3 | OIDC RESERVED; `SubjectBinding` specified, zero code |
| I4 | Logistics tracking and carrier data | SE-10 | none |
| I5 | Email/notification gateways | SE-7 | `src/services/channel/outbound.ts` headless; no scheduler; every reminder toast now says nothing was sent |

## 4 · RFP Non-functional requirements → platform

| # | NFR | Status | Evidence |
|---|---|---|---|
| N1 | Availability ≥ 99.5% | SE-2, SE-13 | no hosting recorded |
| N2 | < 3 s P95 at 300+ users | not measured; SE-13 | no load test |
| N3 | 1,000+ orgs / 5,000 users | not measured; SE-4 | in-memory stores; pagination RESERVED |
| N4 | SSO/MFA, RBAC, audit, encryption, OWASP, pen-test | PARTIAL; SE-3, SE-13 | RBAC atom-based; audit in-memory |
| N5 | UU PDP; residency | requirements only (D9); SE-2 | no personal data held |
| N6 | Observability | ABSENT; SE-13 | — |
| N7 | Data quality & governance | PARTIAL | liveness registry, stored-field gate, governed planning registries (measures carry source, honesty and capability), C9 provenance (zero rows) |

## 5 · RFP Deliverables, SLA, vendor qualifications → who supplies them

| RFP item | Status | Note |
|---|---|---|
| D1 Charter, BRD/FRD | PARTIAL | the executable specification (this tree, C1–C12, six designs) stands in for an FRD; no BRD |
| D2 Architecture & integration design, security model | PARTIAL | D3; C5/C12; D9 |
| D3 Configured platform with all modules and RBAC | PARTIAL **(moved)** | module activation built (16 modules, switchable, attributed); see §2 |
| D4 Data migration and onboarding toolkit | ABSENT; SE-15 | — |
| D5 Integration connectors, APIs | SE-4 to SE-10 | C1 is the API surface; no HTTP API |
| D6 Test plans: SIT, UAT, performance, pen-test | PARTIAL | the vitest floor and gate suite; no SIT/UAT/perf/pen-test artefacts; Design 6 gives acceptance commands per batch for SE-16 |
| D7 Training, EN & ID manuals, admin runbook | PARTIAL **(moved)** | process guides for all 28 flows in EN (authoritative) and ID (draft), on `/buyer/process-flows`; glossary; no admin runbook; co-pilot SE-20 |
| D8 Go-live, cutover, hypercare | ABSENT | — |
| D9 Operations handbook, SLA/OLA | ABSENT; SE-13 | — |
| SLA | ABSENT | no support organisation |
| Vendor qualifications | not applicable to an internal build | the matrix says the TCO must still be produced |

## 6 · RFP Appendix 2 — data required from supplier and SCH

| # | Must-have | Status | Evidence |
|---|---|---|---|
| A2.1 | Supplier provides SOH with quantity, batch, expiry | BUILT-E2E | `InventoryDeclaration` lines carry `batchNumber` and `expiryDate?`; `t_inventorydeclaration_declare` |
| A2.2 | Incoming shipment schedules with quantity, ETA, airway bill | BUILT-E2E | `incomingShipment` (report / ship / arrive / cancel) |
| A2.3 | Root cause L1 and L2 on fulfilment issues (forecast and call-off) | forecast side BUILT-E2E; call-off side ABSENT (SE-19) **(moved — now measured)** | `RootCause { level1, level2? }` on `RequirementResponse` (`sdc/types.ts:428-430`, `:530`); `t_delivery_confirm` takes no payload (`MockDeliveryService.ts:220-224`) |
| A2.4 | SCH provides call-off quantity; supplier feeds back quantity and date | **buyer half BUILT-E2E; supplier half ABSENT** **(moved — correction of the 25 September issue)** | `t_delivery_release` is the buyer's; `t_delivery_confirm` is also the buyer's (procurement), not the supplier's; the supplier's feedback is `t_delivery_acknowledge` (Design 2 §6), not built — SE-19 |
| A2.5 | Real-time tracking from the supplier's AWB | SE-10 | AWB captured; no tracking |
| A2.6 | Real-time notifications: delay, shortage, regulation, updated demand, N-day reminder | UI-ONLY / ABSENT; SE-7, SE-19 | chase reducers compute lateness at read; the publication stamps a response deadline and OVERDUE is derived at read; no transport, no scheduler |
| Nice-to-have | Supplier performance incl. SOH and incoming vs demand | UI-ONLY | `/supplier/performance` on fixtures; the `consolidation` planning view and `sdc/consolidation.ts` are the nearest real derivation |

## 7 · Vision & Capabilities v1 "target capabilities" → platform

| Vision capability | Vision marker | State on `main` | Status |
|---|---|---|---|
| Identity layer | REAL | extended with seat roles, custom roles, sample persons | BUILT (session); IdP SE-3 |
| Data-layer foundation | FOUNDATION | 71 methods pinned (C1), incl. planning and module reads | BUILT |
| Action layer ("`IActionService`") | TARGET | the command dispatcher + `CommandTarget`s: 127 verbs, 22 targets; dead-control residue 0 | BUILT-E2E, different shape |
| Flow Builder + flow-override engine | TARGET | ABSENT; specified in full as Design 6 | SE-16 (and SE-11) |
| Learn / Co-pilot | TARGET | process guides for all 28 flows, EN + ID (ID draft), machine-readable; no co-pilot | guides BUILT **(moved)**; co-pilot SE-20 |
| Customizable Roles | TARGET | one namespace; custom roles `{ parent, adds }` | BUILT (session) |
| Module Activation | TARGET | 16-module registry, attributed append-only ledger, `MODULE_INACTIVE`, OFF routes read-only, roadmap board and admin page (#388–#389) | BUILT **(moved)**; durable ledger SE-4 |
| Bilingual EN/ID | TARGET | built | BUILT |
| Compliance enforcement (ladder, auto-block, hard deadline) | TARGET | document lane BUILT-E2E; registry unwired; operator ruling: design policy handled offline | PARTIAL; OD-2 |
| WhatsApp / EDI / PEPPOL / AI layer | TARGET | ABSENT | SE-7, SE-12, SE-20 |
| Product catalogs (direct and indirect) | — (raised in the dispatch of 2026-10-01) | the RFQ picker over a frozen master; storefront catalog is component state | SE-21 |
| Test-ratcheted floor | REAL | `scripts/floor.json`, `npm run gates`, CI daily | BUILT |

## 8 · What remains NOT MEASURED after this pass

- The five spreadsheet screenshots (RFP pages 9–13) were not transcribed; the RM/PM template formats were not compared with the planning views or with any template (SE-15).
- Scale (500+ suppliers, 5,000 users), P95 latency, mobile rendering, China access.
- Whether the Indonesian guides are accurate (they are drafts awaiting locale review).
- The Coverage Matrix's ownership column was not re-adjudicated; only its status column was checked (D8 §9).
