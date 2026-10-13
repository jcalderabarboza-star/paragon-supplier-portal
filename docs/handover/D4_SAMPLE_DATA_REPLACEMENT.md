# Sample-data replacement list — the backend team's work list

**Status:** v3 · 2026-10-13 · written read-only from `main` @ `aac5f8588d55e851d0d530e3454ee1f4b649137c` (the merge commit of PR #439, MD-4 + MD-5; this file was first written and fact-checked at `3021f3d6…`, the merge of PR #438, and then re-pinned). v2 of this file was pinned at `166a5611…` (PR #418) and tagged `handover-v2` at `b0f9a97b` on 2026-10-09; v1 is the tag `handover-v1` (`9cc535b`). PRs #420–#439 have merged since the v2 tag (ADM-1, UI-1a to UI-1e, PG-1 to PG-3, FB-1 to FB-4, MD-1, MD-2, MD-2b, MD-4 + MD-5). `CHANGES_SINCE_V2.md` says what a reader of v2 must unlearn; `SE_BACKLOG_v3.md` holds what was left open. **What moved in this file:** the method line is unchanged. New rows: the master-data replica and its seed, the brand list, the process-change version store and the step ledger, one mock service, two command targets and three browser storage keys. Changed rows: the material master, the supplier fixture, purchase orders and ship notices. The storage-key list was re-derived at this pin with the grep in the method line; the other additions were read from the pull requests and confirmed by listing the directories named. **At the re-pin (PR #439):** three new rows — the prepared sample sync (§1), the master-data change-request store (§2, in memory) and its command target (§4); no browser storage key was added. A fact-check pass at the first pin (`3021f3d6…`) added three modules that v2's list had missed although its method covers them: `src/data/mockStageResponses.ts` (§1), `materialRulingStore.ts` with its seed (§2) and `materialRulingTarget.ts` (§4).
**Method:** every non-test `*.ts` under `src/services/data/mock/fixtures/`, `src/data/`, `src/services/data/mock/stores/`, `src/services/data/mock/*Seed.ts`, `src/services/data/mock/Mock*Service.ts`, plus `src/services/sdc/fixtures.ts`, `src/services/planning/somoFixture.ts`, `src/services/planning/somoIntake.ts`, `src/services/data/mock/publicationFeed.ts`, `src/services/data/mock/planningFacts.ts`, `src/services/delivery/demoFixtures*.ts`, `src/services/delivery/stores/`, `src/services/identity/sampleRoster.ts`, `src/services/transitions/customRoles.ts`, (added for v3) `src/services/masterData/` and `src/services/flowBuilder/`, and every `localStorage` key literal (`grep -rhoE "'paragon\.[a-zA-Z.]+'" src`, tests excluded). The "stands in for" column is taken from each module's own header; the "replaced by" and "contract" columns are this draft's mapping and Seat 2 should challenge them. The SE package that does the replacing is named (D1 §4).
**Honesty marker convention:** modules whose header says SYNTHETIC / SIMULATED / FICTIONAL are flagged ⚠. Everything in this list is sample data regardless of marker.

---

## 1 · Fixture modules (read-only sample rows)

| Module | Stands in for | Replaced by | Contract |
|---|---|---|---|
| `src/data/mockSuppliers.ts` ⚠ fictional | the vendor master (twelve fictional suppliers). *v3:* it is also what the replica's supplier records are seeded from (MD-1); most readers still import it directly, and `src/lib/masterDataGate/` names them | S/4 vendor master via the inbound seam (SE-6), arriving as replica records (C13); loaded with the procurement team | C2, C12 §2.1, C13 |
| `src/data/mockPurchaseOrders.ts` | S/4 purchase orders (canonical `PurchaseOrder`). *v2:* four order totals disagree with their own lines by more than 1% (PO-2025-00101, -00103, -00105, -00112, per PR #410); the invoice match uses the lines and the invoice drawer flags the disagreement. *v3:* the dates are an anchored fixture family since PG-3 (#432): authored as raw literals and shifted to the declared present; the numbers still read `PO-2025-…` | S/4 inbound events and detail reads (SE-6) | C2, C12 §2.1 |
| `src/data/mockGoodsReceipts.ts` | goods receipts incl. the "Posting to SAP" interim state. *v2:* six seeded receipts carry no material their purchase order holds (GR-2026-004, -006, -007, -009, -010, -011, per PR #410), so under the OPS-1 match they are worth nothing; `GR-2026-012` was corrected. No batch up to PR #416 changed them and no ruling on them is recorded; the disposition is still open (D6 §2). *Also new at this pin:* nine SAMPLE halal certificates and ten SAMPLE BPOM rulings were seeded at OPS-2b (#412), and two SAMPLE packaging certificates at OPS-2 (#411); every one is sample data to be replaced, and one pair (Sample Personal Care Emulsifiers GmbH × `RM-EMUL-9440`) and one material (`RM-COCO-8200`) are left stopped on purpose. *v3:* a receipt created since ADM-1 (#420) carries `receivedByPerson` and `receivedAt`; seeded receipts carry neither | portal-originated GRs persisted by the backend; posting settled by the SAP webhook | C2, C5 |
| `src/data/mockShipments.ts` | TMS shipment legs (`Delayed` computed at read) | TMS via `INT-TMS-01` (SE-10) | C5 |
| `src/data/mockContracts.ts` | S/4 contracts / outline agreements | S/4 (SE-6; Design 3 §3.2 makes the contract S/4's) | C2, C11 V15 |
| `src/data/mockObligations.ts` | contract obligations | backend store; the `obligation` flow is unwired | C2 |
| `src/data/mockRfqs.ts`, `src/data/mockQuotations.ts` | sourcing events and supplier quotations (quotations carry `leadTimeDays` and optional `moq`). *v2:* both are anchored fixture families since SRC-2 (authored as of 2026-05-18 and shifted to the declared present); an event carries a `stage` (RFI, RFP or RFQ), an optional questionnaire, optional weighted criteria and proposal scores; RFx-1 seeded `rfq-015` to `rfq-018`; no seeded event carries a questionnaire or criteria (the QA walk authors them) | backend stores behind `rfqStore` / `quotationStore` | C1, C2 |
| `src/data/mockStageResponses.ts` (RFx-1) | the seeded RFI and RFP answers on the one seeded event that has stages (`rfq-018`); dated with the `rfq` fixture family | backend store behind `stageResponseStore` | C1, C2 |
| `src/data/mockInventory.ts` | stock on hand, days-of-supply thresholds | S/4 MM stock plus supplier declarations | C2 |
| `src/data/communicationProfiles.ts` | country profiles and the channel catalogue (every non-portal channel "Designed … (not connected)") | transports (SE-7); the profiles stay portal data | — |
| `src/data/materialCatalogReason.ts` | the closed reason union for catalog entries with no master code | stays portal data; see SE-21 | C9 |
| `src/data/paragonBrands.ts` (new, FB-1) | the Paragon brand list: fourteen brands and their codes, in the ruled order. It seeds the `brand` reference table of the replica (MD-2) | SAP's own table if SAP holds brands; otherwise it stays portal data | C13 §2 |
| `src/services/masterData/seed.ts` (new, MD-1; second run MD-2b) ⚠ every record stamped SAMPLE | two seed runs: the authored set (built from the material and supplier fixtures and the values the forms already use, with sample codes for payment terms, plants, storage locations and cost centres), then the planning fixture's generated sample materials and suppliers (`SAMPLE-RUN-0002`) | real runs from S/4HANA, stamped `SAP_S4`, with SAP's own keys (SE-6) | C13 §9 |
| `src/services/masterData/sampleSync.ts` (new, MD-5, #439) ⚠ stamped SAMPLE | one prepared sync run, `SAMPLE-SYNC-0001`, that a person may run once on a demo or preview deployment to show SAP winning: it changes the description of `RM-EMUL-3310`, adds the incoterm `DAP`, blocks supplier `BP-10001236`, and carries one record the replica refuses by name (`RM-SAMPLE-DRUM-01`, unit `DRUM`). Applied through the sync applier; refused on production (`SAMPLE_SYNC_IN_PRODUCTION`) and after its first run (`SAMPLE_SYNC_ALREADY_RUN`) | real change events and reconciliation runs from S/4HANA (SE-6); delete with the feed | C13 §8 |
| `src/services/sdc/fixtures.ts` ⚠ simulated | `MATERIAL_MASTER` (42 codes, frozen), supplier collaboration data. **v2 said:** *"generated `SIM-*` sample materials are **not** in it; the collaboration lane resolves them through `src/services/planning/publishedMaterial.ts` (SDC-5)"*. **Overtaken:** `MATERIAL_MASTER` is now the seed of the replica's first run, the lookups read the replica, the generated samples are replica records from a second seed run, and `publishedMaterial.ts` is deleted (MD-2, MD-2b). The gate (`src/lib/masterDataGate/grandfathered.ts`, `FIXTURE_IMPORTERS`) names the three files that may import the material fixture directly: the seed, the view (`materialMasterView.ts`) and the planning fixture (`somoFixture.ts`), which hands its generated samples to the seed | the replica filled from S/4's material master (SE-6, C13); SOMO feeds (SE-5) | C7, C8, C9, C13 |
| `src/services/planning/somoFixture.ts` ⚠ simulated | the SOMO plan: generated demand, suggested and accepted quantities, plan version `PV-SIM-20261028` (seed 20261028) | SOMO feed (SE-5) | C6, C7, C8 |
| `src/services/planning/somoIntake.ts` | the generated SOMO intake proposals behind the planning grid | SOMO accepted-requirement events (SE-5) | C7 |
| `src/services/data/mock/fixtures/prIntake.ts` | four hand-authored intake lines (`PrIntakeLine`) | SOMO and the internal grid as producers | C7 |
| `src/services/data/mock/publicationFeed.ts` ⚠ simulated | SOMO plan versions a publication may be opened from (every one `SIMULATED_SOMO`) | SOMO feed (SE-5) | C8 |
| `src/services/data/mock/planningFacts.ts` | derives long-form `PlanningFact` rows from the stores and the SOMO fixture; feeds still on fixtures are forced to SIMULATED | the backend's planning read; `rop`, `safetyStock`, `projectedStock` have no producer yet | C6, Design 1 §2.3–§3 |
| `…/fixtures/buyerAnalytics.ts` | analytics tiles | Snowflake reads | C4 (SPEC) |
| `…/fixtures/buyerDashboard.ts` | dashboard KPI inputs (some authored) | derived reads over the backend | C2 |
| `…/fixtures/buyerDiscovery.ts` | discovery / marketplace recommendations | a supplier-discovery source | — |
| `…/fixtures/buyerRequisitions.ts` | seed requisitions (the machine also grows them) | backend store behind `purchaseRequisitionStore` | C7 |
| `…/fixtures/buyerRisk.ts` | risk aggregates | risk feed | — |
| `…/fixtures/buyerScorecard.ts`, `…/fixtures/supplierPerformance.ts` | scorecards and supplier-side performance (stored `otif`) | derived from GR / OTIF facts | C4 |
| `…/fixtures/commodityBaskets.ts` ⚠, `commodityHistory.ts`, `commodityMaterialMap.ts` | should-cost baskets, history, material → basket classification | price-index vendor feed; classification engine | C9 (explicitly not a crosswalk) |
| `…/fixtures/complianceRegistry.ts` ⚠ synthetic | the halal certificate registry (holdings synthetic, material codes real) | an operator-editable registry; the `compliance` flow is unwired (D6 OD-2; Design 3 §4.4 proposes retiring the machine) | C2 |
| `…/fixtures/invoices.ts` | the one canonical invoice set (DR-7). *v2:* a seeded invoice has no recorded approver, so its release is not held to the releaser-is-not-approver rule (PR #410) | backend store behind `invoiceStore`; S/4 for cleared/paid facts | C2, C5 |
| `…/fixtures/supplierDocuments.ts` | supplier documents and certificates | backend document store plus object storage (SE-8) | C2, C11 V9 |
| `…/fixtures/supplierShipments.ts` | ASN rows. *v3:* since PG-3 they share the purchase orders' anchor, so a ship notice no longer arrives a year before its order was placed (PR #432) | backend store behind `asnStore`; TMS for legs | C5 |
| `…/fixtures/supplierStorefront.ts` | the buyer-facing storefront profile and catalog (`/marketplace/supplier/:id`) | the catalog object SE-21 specifies; no verb exists today | — |
| `src/services/delivery/demoFixtures.ts`, `demoFixturesScale.ts`, `fixtures.ts` ⚠ simulated | scheduling agreements and their schedule lines | S/4 scheduling agreements inbound (SE-6) | Delivery Agreement Design Spec v1; C1 |

## 2 · Stores (mutable, in-memory; commands write here, reads resolve from here)

All in `src/services/data/mock/stores/` unless noted. Each is replaced by a durable table (or ledger) behind `httpDataService` (SE-4); identity stays store-assigned (C12 §1). Append-only ledgers must stay append-only (C10 §4, C11).

| Store | Entity / flow | Notes for the backend |
|---|---|---|
| `purchaseOrderStore.ts` | `purchaseOrder` | S/4 owns the number |
| `asnStore.ts` | `advanceShipNotice` | portal-originated |
| `goodsReceiptStore.ts` | `goodsReceipt` (+ lines) | interim SAP state; `settle` finalises |
| `invoiceStore.ts` | `invoice` (+ match) | both persona reads project from here. *v2:* stamps `approvedBy` and `releasedBy` from the session and stores the dispute reason (OPS-1) |
| `rfqStore.ts`, `quotationStore.ts` | `rfq`, `quotation` | award cascade writes both; cancel and conclude cascade `t_quotation_withdraw`. *v2:* the RFQ store writes an awardee, a rate, an advance and a conclude reason only for the verb that owns each (RFx-2); `awardedAt` is store-assigned; who has responded is derived at read (`src/data/rfqResponses.ts`), so do not persist a responder list |
| `stageResponseStore.ts` (new at RFx-1) | `stageResponse` | a supplier's answer at the RFI or RFP stage: interest and a note, questionnaire answers, a proposal per criterion and document **names** only; a `Draft` is the supplier's own and the buyer's read never holds one |
| `purchaseRequisitionStore.ts` | `purchaseRequisition` | carries `intakeLineId`, `periodBucket`, `decision` since A1/A2 |
| `intakeLineStore.ts` | `intakeLine` (A2) | the triage record is persisted in `localStorage['paragon.intakeTriage']` today; a reload keeps it. The backend owns it |
| `forecastPublicationStore.ts` | `forecastPublication` (B4a) | publications, allocations, signatures, ledger; a revision is a new row. *v2:* one current publication per grain (SDC-1); a draft may end `Discarded` (SDC-5) |
| `requirementResponseStore.ts` | `requirementResponse` | versions carry `supersedes` / `supersededFrom` since A3; never overwrite a prior version. *v2:* a revision replaces the prior answer only when it is sent, not while it is a draft (SDC-3) |
| `inventoryDeclarationStore.ts`, `incomingShipmentStore.ts` | SDC declarations and inbound legs | C8 sibling lanes |
| `supplierDocumentStore.ts` | `supplierDocument` | uploads are declarations; no file bytes are stored (SE-8) |
| `supplierApplicationStore.ts` | `supplierApplication` | buyer-raised onboarding |
| `materialRequestStore.ts` | `materialRequest` | mints no code, writes to no catalog |
| `pslStore.ts` | `psl` | |
| `pslCapSettingStore.ts` | `pslCapSetting` | **append-only ledger** |
| `enforcementSettingStore.ts` | `enforcement` | **append-only ledger**, ships empty by ruling |
| `materialRulingStore.ts` (OPS-2) | `materialRuling` | **append-only ledger** of Compliance's halal and BPOM applicability rulings per material; what is in force is derived at read (`rulingInForce`). It opens on the ten SAMPLE BPOM rulings in `src/services/data/mock/materialRulingSeed.ts` (OPS-2b); those rows are sample data to be replaced |
| `moduleActivationStore.ts` | `moduleActivation` (M1) | **append-only ledger**, seeded empty, in memory only (no browser storage): a reload returns every module to its default |
| `src/services/delivery/stores/schedulingAgreementStore.ts` | `deliveryRelease`, `deliveryPolicy` | the delivery lane's write surface |
| `src/services/transitions/customRoles.ts` (in memory + `localStorage`) | `role` | custom roles as `{ parent, adds }`; only custom roles are persisted |
| `src/services/masterData/replicaStore.ts` (new, MD-1; in memory) | the master-data replica and its sync log | not a command store: no verb writes it. The one writer is `applySyncRun` (`syncApplier.ts`), called since MD-5 by three named modules (its own, the sample SAP answer in `masterDataRequestTarget.ts`, and `sampleSync.ts`; `replicaOneWriter.test.ts` holds the set); keep it the one writer, keep the log append-only, keep "missing is marked, never deleted" (C13 §4). Durable store SE-4 |
| `masterDataRequestStore.ts` (new, MD-4 + MD-5, #439; **in memory**, not in the browser) | `masterDataRequest` | master-data change requests: the portal's own number (`MDR-2026-0001`, minted by the store; never SAP's), the kind, the subject key, the proposed fields, the reason, the proposer, the base the request was written against, SAP's answer once recorded (`sap`), and the request's history (one row per act: who, when, the note). Seeded empty; a request made in a session is gone on reload and is not shared, and the page says so. No row of it is a master record. Durable store SE-4; the request number is the feed's idempotency key (C13 §8) |
| `src/services/flowBuilder/flowVersionStore.ts` (new, FB-1; `localStorage`) | `flowVersion` | process-change versions and each version's own history (one row per act: who, when, why, and the Super Admin `bypass` when a check stood aside). The store mints the id, the label and the stamps; a row is re-validated on read and a refused row is named and kept; a version is never edited after `Draft` and never deleted. Per browser, not shared |
| `src/services/flowBuilder/stepLedger.ts` (new, FB-3 + FB-4; in memory) | `processStep` | **append-only ledger** of step completions and declines; lost on reload with the documents |

**Not a store, and not to be replaced by browser storage:** the planning grid's PLANNED overlay (`src/pages-v2/plan-grid/PlanDraftProvider.tsx`, `planDraft.ts`) is React state; a reload drops unpushed edits and a banner says so. Design 1 §6.1 specifies a durable `plan` entity on the server instead (SE-18).

## 3 · Seeds (rows grown through the machine at boot)

These dispatch real commands at start-up so demo rows carry a true history. The backend replaces them with nothing: real rows come from users and feeds.

| Seed | What it grows |
|---|---|
| `src/services/data/mock/requisitionSeed.ts` | one approved requisition via `t_pr_submit` → `t_pr_approve` |
| `…/applicationSeed.ts` | demonstrable supplier applications |
| `…/materialRequestSeed.ts` | demonstrable material requests |
| `…/pslSeed.ts` | demonstrable PSL listings |
| `…/enforcementSeed.ts` | the opening enforcement-ledger act |
| `src/services/delivery/seedActor.ts` | the actor the delivery demo fleet is grown under |

## 4 · Mock services (the `IDataService` implementation)

| Service | Replaced by |
|---|---|
| `src/services/data/mock/mockDataService.ts` | the composition point; becomes `httpDataService` behind `DataServiceContext.tsx` |
| `MockCommandService.ts` (`TARGETS`, `WIRED_COMMAND_TARGETS`, the targets including `intakeLineTarget`) plus `publicationTarget.ts`, `moduleActivationTarget.ts`, `materialRulingTarget.ts`, and (new) `flowVersionTarget.ts`, `processStepTarget.ts`, `masterDataRequestTarget.ts` (#439; it also holds the one fixture-only path by which a sample SAP answer delivers a record through the sync applier — the real feed replaces that path, SE-6) | the server-side dispatcher with the same refusal order (`describeDispatchConformance`). *v3:* it now injects the `flowOverlay` (`src/services/flowBuilder/flowOverlay.ts`); the server-side dispatcher needs the same dependency |
| `MockProcurementService.ts` | PO / RFQ / quotation / GR / invoice / requisition / intake-line reads |
| `MockSupplierService.ts` | supplier reads; the live `SCOPE_DENIED` path |
| `MockCollaborationService.ts`, `MockChaseService.ts` | SDC reads, publications (`getPublications`, `getPublicationWorkspace`), the chase reducer composition |
| `MockPlanningService.ts` (B1) | `getPlanningFacts`; the backend's planning read over SOMO and the stores |
| `MockModuleService.ts` (M1) | `getModuleActivation`, `getModuleLedger` |
| `MockMasterDataService.ts` (new, MD-1) | `list`, `get`, `whereUsed`, `syncLog`; the backend's master-data read with the same tenancy (C13 §6) |
| `MockDeliveryService.ts` | delivery-agreement reads; its three writes orchestrate dispatches |
| `MockEnforcementService.ts` | the enforcement ledger read |
| `MockRiskService.ts`, `MockAnalyticsService.ts`, `MockDiscoveryService.ts` | risk / analytics / discovery reads; empty for the supplier persona by design |
| `src/services/data/mock/withChaos.ts` | dev-only, env-gated failure injection (`VITE_CHAOS*`); not replaced, do not ship |

## 5 · Browser storage keys

Nine keys at the pin (derived by the grep in the method line; v2: six; v1: five).

| Key | Holds | Written by | Replacement |
|---|---|---|---|
| `paragon.identity` | the current seat (persona, supplier, roles, actor) | `src/context/identitySources.ts:241` | a server session issued by the IdP (SE-3) |
| `paragon.persona` | legacy persona key, read once and migrated; never written | read at `identitySources.ts:201` | delete |
| `paragon.customRoles` | custom roles (`{ parent, adds }`) | `src/services/transitions/customRoles.ts:327` | the assignment ledger (C10 §3.5) |
| `paragon.lang` | UI language | `src/components/layout-v2/LanguageMenu.tsx:51` | stays client-side |
| `paragon.intakeTriage` | the intake line triage record (A2) | `src/services/data/mock/stores/intakeLineStore.ts:227` | the backend's `intakeLine` store (SE-4) |
| `paragon.rfiTemplates` (new at RFx-2) | RFI questionnaire templates, per browser; no machine and no attribution | `src/pages-v2/sourcing/rfiTemplates.ts` (key at `:26`) | a governed, shared template store (SE-18) |
| `paragon.flowVersions` (new at FB-1) | process-change versions and their history, per browser | `src/services/flowBuilder/flowVersionStore.ts` (key at `:46`) | a shared, durable version store behind the data service (SE-4, SE-16) |
| `paragon.planGrid.density` (new at PG-1) | the plan grid's row height, Compact or Comfortable | `src/pages-v2/plan-grid/TimePhasedGrid.tsx` (key at `:139`) | view state; may stay client-side (C6 A1-R4), or per-seat view state (SE-18) |
| `paragon.planGrid.measures` (new at PG-2) | which measures an opened material shows | `src/pages-v2/plan-grid/TimePhasedGrid.tsx` (key at `:241`) | the same |

Module activation, plan drafts, step records, the master-data replica and master-data change requests are **not** in browser storage. The line numbers in every row were re-checked at the first pin (`git grep` on `3021f3d6`) and held; PR #439 changed none of the nine files those rows cite and added no key (`git diff --stat 3021f3d6..aac5f858`; the method line's grep still returns the same nine keys at `aac5f858`).

## 6 · Identity samples

`src/services/identity/sampleRoster.ts` holds 18 sample-person rows (role plus ordinal, no names; 16 at the `handover-v2` tag, one Admin and one Super Admin added at ADM-1) and is the registry labels resolve against. Five of the eight supplier rows were added at E2E-1 (#417) so that every sourcing category offers two suppliers a tester can sit as; the same batch made the start-up seed approve its requisition as a sample procurement person and re-dated the stale exchange-rate specimen (`rfq-013`) so it is still stale on the declared present. The backend replaces it with the `Person` registry C10 §3 specifies, minting a permanent `personId` per person (D-ID-1) and binding it to an IdP subject (`SubjectBinding`) — SE-3. Nothing in the tree implements either. Keep the roster for seeds and tests (Design 4 batch B4).

## 7 · What is deliberately not in this list

Pure derivations hold no state and travel with the frontend; the backend must not persist their outputs (law 0.5, C11 V9/V10): `complianceProjection.ts`, `invoiceProjection.ts`, `shipmentDisplayState.ts`, `obligationProjection.ts`, `chase/*`, `sdc/inventory.ts`, `sdc/consolidation.ts` (including the ordered "latest" pick, `compareAnswerRecency`), `sdc/publication.ts` (deadline OVERDUE, net change, publish blockers), `src/data/rfqResponses.ts` (who has responded to a sourcing event), `src/services/data/rfqSupplierView.ts` (the supplier's allowlist projection of an event), `src/services/modules/activation.ts` (`effectiveActivation`, `routeOffReason`), (new) `src/services/masterData/freshness.ts`, `materialMasterView.ts`, `lookup.ts` and `whereUsed.ts` (freshness, liveness of a stamp and where-used are computed at read, never stored), `src/services/flowBuilder/validateVersion.ts` and `stepsDue.ts` (what the rules say of a version, and which step is due, are computed at read), and the planning registries (`src/services/planning/measures.ts`, `columns.ts`, `views.ts`, `bucket.ts`), which are governed code, not data. The process guides (`docs/guides/`) are content compiled at build, not data to migrate.
