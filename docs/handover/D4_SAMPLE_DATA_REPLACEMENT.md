# Sample-data replacement list — the backend team's work list

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · written by the consultant seat (Seat 3), read-only, from a `git archive` export of `main` @ `166a5611303121eb509675dbe19ff78edf786899` (the merge commit of PR #418, E2E-2; equal to `git ls-remote origin refs/heads/main` on 2026-10-09). v1 of this file was written against `6f1da15a…` (PR #392) and tagged `handover-v1` at `9cc535b`. PRs #395–#418 have merged since. The final review (the end-to-end walk of 8 and 9 October) is in: D5 §J, D6 §2 and §3a, and `SE_BACKLOG_v2.md` §6a. The method below is unchanged; the store, storage-key and fixture lists were re-derived at the pin.
**Method:** every non-test `*.ts` under `src/services/data/mock/fixtures/`, `src/data/`, `src/services/data/mock/stores/`, `src/services/data/mock/*Seed.ts`, `src/services/data/mock/Mock*Service.ts`, plus `src/services/sdc/fixtures.ts`, `src/services/planning/somoFixture.ts`, `src/services/planning/somoIntake.ts`, `src/services/data/mock/publicationFeed.ts`, `src/services/data/mock/planningFacts.ts`, `src/services/delivery/demoFixtures*.ts`, `src/services/delivery/stores/`, `src/services/identity/sampleRoster.ts`, `src/services/transitions/customRoles.ts`, and every `localStorage` key literal (`grep -rhoE "'paragon\.[a-zA-Z.]+'" src`, tests excluded). The "stands in for" column is taken from each module's own header; the "replaced by" and "contract" columns are this draft's mapping and Seat 2 should challenge them. The SE package that does the replacing is named (D1 §4).
**Honesty marker convention:** modules whose header says SYNTHETIC / SIMULATED / FICTIONAL are flagged ⚠. Everything in this list is sample data regardless of marker.

---

## 1 · Fixture modules (read-only sample rows)

| Module | Stands in for | Replaced by | Contract |
|---|---|---|---|
| `src/data/mockSuppliers.ts` ⚠ fictional | the vendor master (twelve fictional suppliers) | S/4 vendor master via the inbound seam (SE-6); loaded with the procurement team | C2, C12 §2.1 |
| `src/data/mockPurchaseOrders.ts` | S/4 purchase orders (canonical `PurchaseOrder`). *v2:* four order totals disagree with their own lines by more than 1% (PO-2025-00101, -00103, -00105, -00112, per PR #410); the invoice match uses the lines and the invoice drawer flags the disagreement | S/4 inbound events and detail reads (SE-6) | C2, C12 §2.1 |
| `src/data/mockGoodsReceipts.ts` | goods receipts incl. the "Posting to SAP" interim state. *v2:* six seeded receipts carry no material their purchase order holds (GR-2026-004, -006, -007, -009, -010, -011, per PR #410), so under the OPS-1 match they are worth nothing; `GR-2026-012` was corrected. No batch up to PR #416 changed them and no ruling on them is recorded; the disposition is still open (D6 §2). *Also new at this pin:* nine SAMPLE halal certificates and ten SAMPLE BPOM rulings were seeded at OPS-2b (#412), and two SAMPLE packaging certificates at OPS-2 (#411); every one is sample data to be replaced, and one pair (Sample Personal Care Emulsifiers GmbH × `RM-EMUL-9440`) and one material (`RM-COCO-8200`) are left stopped on purpose | portal-originated GRs persisted by the backend; posting settled by the SAP webhook | C2, C5 |
| `src/data/mockShipments.ts` | TMS shipment legs (`Delayed` computed at read) | TMS via `INT-TMS-01` (SE-10) | C5 |
| `src/data/mockContracts.ts` | S/4 contracts / outline agreements | S/4 (SE-6; Design 3 §3.2 makes the contract S/4's) | C2, C11 V15 |
| `src/data/mockObligations.ts` | contract obligations | backend store; the `obligation` flow is unwired | C2 |
| `src/data/mockRfqs.ts`, `src/data/mockQuotations.ts` | sourcing events and supplier quotations (quotations carry `leadTimeDays` and optional `moq`). *v2:* both are anchored fixture families since SRC-2 (authored as of 2026-05-18 and shifted to the declared present); an event carries a `stage` (RFI, RFP or RFQ), an optional questionnaire, optional weighted criteria and proposal scores; RFx-1 seeded `rfq-015` to `rfq-018`; no seeded event carries a questionnaire or criteria (the QA walk authors them) | backend stores behind `rfqStore` / `quotationStore` | C1, C2 |
| `src/data/mockInventory.ts` | stock on hand, days-of-supply thresholds | S/4 MM stock plus supplier declarations | C2 |
| `src/data/communicationProfiles.ts` | country profiles and the channel catalogue (every non-portal channel "Designed … (not connected)") | transports (SE-7); the profiles stay portal data | — |
| `src/data/materialCatalogReason.ts` | the closed reason union for catalog entries with no master code | stays portal data; see SE-21 | C9 |
| `src/services/sdc/fixtures.ts` ⚠ simulated | `MATERIAL_MASTER` (42 codes, frozen), supplier collaboration data. *v2:* generated `SIM-*` sample materials are **not** in it; the collaboration lane resolves them through `src/services/planning/publishedMaterial.ts` (SDC-5) | S/4 material master (SE-6); SOMO feeds (SE-5) | C7, C8, C9 |
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
| `…/fixtures/supplierShipments.ts` | ASN rows | backend store behind `asnStore`; TMS for legs | C5 |
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
| `moduleActivationStore.ts` | `moduleActivation` (M1) | **append-only ledger**, seeded empty, in memory only (no browser storage): a reload returns every module to its default |
| `src/services/delivery/stores/schedulingAgreementStore.ts` | `deliveryRelease`, `deliveryPolicy` | the delivery lane's write surface |
| `src/services/transitions/customRoles.ts` (in memory + `localStorage`) | `role` | custom roles as `{ parent, adds }`; only custom roles are persisted |

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
| `MockCommandService.ts` (`TARGETS`, `WIRED_COMMAND_TARGETS`, the targets including `intakeLineTarget`) plus `publicationTarget.ts`, `moduleActivationTarget.ts` | the server-side dispatcher with the same refusal order (`describeDispatchConformance`) |
| `MockProcurementService.ts` | PO / RFQ / quotation / GR / invoice / requisition / intake-line reads |
| `MockSupplierService.ts` | supplier reads; the live `SCOPE_DENIED` path |
| `MockCollaborationService.ts`, `MockChaseService.ts` | SDC reads, publications (`getPublications`, `getPublicationWorkspace`), the chase reducer composition |
| `MockPlanningService.ts` (B1) | `getPlanningFacts`; the backend's planning read over SOMO and the stores |
| `MockModuleService.ts` (M1) | `getModuleActivation`, `getModuleLedger` |
| `MockDeliveryService.ts` | delivery-agreement reads; its three writes orchestrate dispatches |
| `MockEnforcementService.ts` | the enforcement ledger read |
| `MockRiskService.ts`, `MockAnalyticsService.ts`, `MockDiscoveryService.ts` | risk / analytics / discovery reads; empty for the supplier persona by design |
| `src/services/data/mock/withChaos.ts` | dev-only, env-gated failure injection (`VITE_CHAOS*`); not replaced, do not ship |

## 5 · Browser storage keys

Six keys at the pin (derived by the grep in the method line; v1: five).

| Key | Holds | Written by | Replacement |
|---|---|---|---|
| `paragon.identity` | the current seat (persona, supplier, roles, actor) | `src/context/identitySources.ts:241` | a server session issued by the IdP (SE-3) |
| `paragon.persona` | legacy persona key, read once and migrated; never written | read at `identitySources.ts:201` | delete |
| `paragon.customRoles` | custom roles (`{ parent, adds }`) | `src/services/transitions/customRoles.ts:327` | the assignment ledger (C10 §3.5) |
| `paragon.lang` | UI language | `src/components/layout-v2/LanguageMenu.tsx:51` | stays client-side |
| `paragon.intakeTriage` | the intake line triage record (A2) | `src/services/data/mock/stores/intakeLineStore.ts:227` | the backend's `intakeLine` store (SE-4) |
| `paragon.rfiTemplates` (new at RFx-2) | RFI questionnaire templates, per browser; no machine and no attribution | `src/pages-v2/sourcing/rfiTemplates.ts` (key at `:26`) | a governed, shared template store (SE-18) |

Module activation and plan drafts are deliberately **not** in browser storage.

## 6 · Identity samples

`src/services/identity/sampleRoster.ts` holds 18 `sim-usr-*` rows (role plus ordinal, no names; 16 at the `handover-v2` tag, one Admin and one Super Admin added at ADM-1) and is the registry labels resolve against. Five of the eight supplier rows were added at E2E-1 (#417) so that every sourcing category offers two suppliers a tester can sit as; the same batch made the start-up seed approve its requisition as a sample procurement person and re-dated the stale exchange-rate specimen (`rfq-013`) so it is still stale on the declared present. The backend replaces it with the `Person` registry C10 §3 specifies, minting a permanent `personId` per person (D-ID-1) and binding it to an IdP subject (`SubjectBinding`) — SE-3. Nothing in the tree implements either. Keep the roster for seeds and tests (Design 4 batch B4).

## 7 · What is deliberately not in this list

Pure derivations hold no state and travel with the frontend; the backend must not persist their outputs (law 0.5, C11 V9/V10): `complianceProjection.ts`, `invoiceProjection.ts`, `shipmentDisplayState.ts`, `obligationProjection.ts`, `chase/*`, `sdc/inventory.ts`, `sdc/consolidation.ts` (including the ordered "latest" pick, `compareAnswerRecency`), `sdc/publication.ts` (deadline OVERDUE, net change, publish blockers), `src/data/rfqResponses.ts` (who has responded to a sourcing event), `src/services/data/rfqSupplierView.ts` (the supplier's allowlist projection of an event), `src/services/modules/activation.ts` (`effectiveActivation`, `routeOffReason`), and the planning registries (`src/services/planning/measures.ts`, `columns.ts`, `views.ts`, `bucket.ts`), which are governed code, not data. The process guides (`docs/guides/`) are content compiled at build, not data to migrate.
