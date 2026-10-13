# Master Data module — design

**Seat 3, consultant, Ops Project #11 · 2026-10-12.** Written read-only from a `git archive` export of `main` @ `0531e094d401b8c51e320fd3151da6b72963ba47` (PG-3; equal to `git ls-remote origin refs/heads/main` on 2026-10-12; `git cat-file -e` accepts it and rejects `deadbeef…`). Nothing here is ratified until the operator rules on `MD_OPEN_DECISIONS.md`. The build is in `MD_BUILD_PLAN.md`.

**How the figures were obtained.** Counts of rows and values come from one script run inside the export against the shipped modules (controls: `t_gr_post` found, `t_bogus_x` absent; material `RM-COCO-8200` in the master, `RM-SAMPLE-TST-01` absent; atom `bogus:atom` held by no role). Counts of files are `grep` measures over non-test `src/` and are marked so. This is a design from source; nothing was walked in a browser.

---

## 0 · One page

**The ruling.** SAP S/4HANA is the system of record for master data. The portal holds a replica: it displays it, keeps it in sync, and proposes changes. It never owns a record and never mints a key.

**What the tree has today.** Master data is spread over about twenty modules and several page-local lists. A material's unit comes from one frozen fixture of 42 codes; a supplier's record from another of 12; incoterms and payment terms are written twice, in two pages; plants are three strings inside the receiving wizard; cost centre is a free-text box; four different vocabularies stand on the "category" axis. No record says where it came from or when it was last read from SAP. Two lanes already propose a change (a material request, a supplier application) and both stop at a decision that changes nothing.

**The module, in five sentences.**

1. **One replica, two kinds of field.** Every record is an SAP record under its SAP key, carrying a stamp (source, SAP key, when read, liveness). Beside it stand the portal's own annotations (halal and BPOM rulings, certificates, preferred-supplier standing, commodity basket), each with its own stamp. The two are never mixed in one field.
2. **Sync runs one way.** SAP to portal, whole record replaces whole record, SAP wins. No act in the portal writes a replicated field.
3. **One place to look.** `/buyer/master-data`: Materials, Suppliers, Supplier × material, Reference tables, Change requests, on the shared list page, table, drawer and field components.
4. **One request, one path.** A change request (create a material, change a material, create or extend a supplier, a supplier-proposed catalogue item) goes propose → review → approve under four eyes → hand-off to SAP MDG. The record appears in the portal only when it arrives from SAP.
5. **One truth for every other module.** Every module reads materials, suppliers and reference values through one service; the page-local lists and the direct fixture imports go, and a gate keeps them out.

**What is fixture now and SE later.** The replica, the stamps, the browse page, the requests and the approvals run in the fixture. The sync feed, the MDG hand-off, the durable store and sign-in are SE work (SE-6, SE-4, SE-3). On a demo deployment a clearly marked sample answer can stand in for SAP's reply (decision 9).

---

## 1 · Inventory at the pin

### 1.1 Objects that are master data

| Object | Where it lives | What it holds (measured) | Read how |
|---|---|---|---|
| **Material master** | `MATERIAL_MASTER`, `src/services/sdc/fixtures.ts` | 42 codes, frozen: 31 `ROH`, 11 `VERP`; unit KG 31, PCS 11; 9 material groups in use; fields `materialCode`, `label`, `materialType`, `materialGroup`, `canonicalUom`, `bpomApplicable` (20 applicable, 11 not, 11 undetermined), `halalApplicable` (42 required). Direct materials only | 12 files through the lookup (`sdc/materialMaster.ts`: `labelOf`, `uomOf`, `requireUom`, `materialEntry`, `isKnownMaterial`); 28 files name `MATERIAL_MASTER` itself (grep) |
| **Planning sample master** | `src/services/planning/somoFixture.ts`, resolved by `publishedMaterial.ts` | 1,200 codes: the 42 plus 1,158 generated `SIM-*` sample materials | a second resolver (`publishedLabelOf`, `publishedUomOf`) |
| **Material groups** | `MATERIAL_GROUPS`, `sdc/materialGroups.ts` | 13 groups on 4 axes (6 formulation, 1 upstream, 5 packaging by substrate, 1 by function) | 2 files |
| **Material code spaces** | `MATERIAL_SPACES`, `sdc/materialSpaces.ts` | 4 declared spaces (3 identity, 1 pointer) | the material census |
| **Material crosswalk (C9)** | `sdc/materialMasterRef.types.ts` | shape only: zero rows, zero consumers | — |
| **Supplier records** | `mockSuppliers`, `src/data/mockSuppliers.ts` | 12 fictional suppliers, 35 distinct fields; every one has a sample SAP business-partner number; 5 countries; 4 category values; payment terms and incoterms on 2 of 12; tax id on 2 of 12. Master fields and performance figures (OTIF, grade, rating) share one record | `ISupplierService` on the data seam; 15 files also import the fixture (grep) |
| **Planning sample suppliers** | `PLANNING_SUPPLIERS`, `somoFixture.ts` | 40 ids: the 12 plus 28 generated | `planningSupplierName` |
| **Supplier × material: relationship** | `SUPPLIER_MATERIAL_RELATIONSHIPS`, `sdc/fixtures.ts` | 4 rows (`supplierId`, `materialCode`, `supplierType`: 3 manufacturer, 1 distributor) | collaboration lane |
| **Supplier × material: catalogue** | `INITIAL_CATALOG`, `PRODUCTS_DEFAULT`, `mock/fixtures/supplierStorefront.ts` | 5 catalogue items (MOQ, lead time, unit price, currency, all as text) and 8 storefront products; 3 of 5 `sapCode` values are in the master | storefront pages; supplier edits live in component state and are lost on reload |
| **Supplier × material: preferred list** | `PSL_SEEDS_RAW`, `mock/pslSeed.ts`; `pslStore` | 12 seeded listings (supplier × material codes, validity, justification); wired flow `psl` (propose, grant, reject, change status, renew, withdraw, publish, cap override) | `/buyer/preferred-suppliers`; portal-owned by its own header |
| **Material requests** | `materialRequest.flow.ts`, `materialRequestStore` | wired: submit (procurement) → start review, approve, reject (planning). Approval records a decision; it mints no code and writes nothing to the master | `/buyer/material-requests`, module `MAT` |
| **Supplier applications** | `supplierApplication.flow.ts` | wired: submit (procurement) → review, approve, reject (compliance). Approval creates no supplier, by ruling: the vendor record is SAP's act | `/buyer/supplier-applications` |
| **Halal and BPOM rulings** | `materialRuling.flow.ts`, `sdc/materialRuling.ts`, `materialRulingStore` | an append-only ledger; 10 sample BPOM rulings; one verb, `t_material_ruling_set` (compliance) | receiving check, compliance pages |
| **Certificates** | `COMPLIANCE_REGISTRY`, `mock/fixtures/complianceRegistry.ts`; `supplierDocument` lane | 27 rows over 11 suppliers and 30 material codes, all 30 in the master; 6 certificate types; each row already carries `sapSync: 'AWAITING_SYNC'` | compliance pages, receiving check |
| **Commodity classification** | `MATERIAL_BASKET_CLASSIFICATION`, `mock/fixtures/commodityMaterialMap.ts` | 11 codes, all in the master | should-cost |
| **RFQ material picker** | `MATERIAL_CATALOG`, `src/pages-v2/BuyerSourcing.tsx`; shape in `sourcing/materialCatalog.ts` | 23 entries: 9 name a master code, 14 are code-less with a reason | the sourcing wizard only |
| **Outline agreements** | `mockContracts`, `SCHEDULING_AGREEMENTS` | 13 contracts; 1 scheduling agreement with an SAP agreement number | contracts and delivery pages. SAP documents, not master data; listed because they carry terms |

### 1.2 Reference values, and where they are hard-wired

| Value | Where | Measured |
|---|---|---|
| **Unit of measure** | `Uom` union, `sdc/types.ts`; `InventoryRecord.uom`; `uom: string` on order, requisition and catalogue lines | union of 4 (`KG`, `PCS`, `L`, `ROLL`); the inventory type adds `MT`; only KG and PCS occur in the data |
| **Material type** | `MaterialType` union | `ROH`, `VERP` |
| **Category** | `Supplier.category` (4 values); `RFQCategory` (6); `MaterialCategory` (6, spelled differently); material group (9 in use); `CATEGORY_OPTIONS` in three pages (`BuyerCompliance`, `BuyerContracts`, `SupplierMyStorefront`); `CANONICAL_CATEGORIES` label table (42) | four vocabularies on one axis, as `pslListing.ts` already records |
| **Incoterms** | `INCOTERMS_OPTIONS`, written twice (`BuyerContracts.tsx`, `BuyerSourcing.tsx`) | 5 terms; the data stores term and place as one string (`CIF Jakarta`, `FCA Tangerang`, `DDP Jakarta`): 4 distinct on sourcing events, 5 on contracts including `N/A` |
| **Payment terms** | `PAYMENT_TERMS_OPTIONS`, written twice (same two pages) | 5 options; the data uses `Net 30`, `Net 45`, `N/A` |
| **Currency** | `BID_CURRENCIES`, `BASE_CURRENCY`, `lib/currencyPolicy.ts`; `currency: string` on documents; exchange-rate pins on the sourcing event (`lib/fxPin.ts`, source `MANUAL` or `SAP_EXHGRATE`) | IDR, USD, EUR; base IDR; 9 files read the policy (grep) |
| **Country** | `COUNTRY_PROFILES`, `data/communicationProfiles.ts`; `COUNTRIES` in `SupplierRegistration.tsx` | 11 ISO-2 profiles of 21 fields each (language, channel, currency, tax label and rate, invoice fields); the registration form lists 7 country names, not codes |
| **Tax** | inside the country profiles | a label and one rate per country (Indonesia: PPN 11). No tax code object |
| **Plant, storage location** | `LOCATIONS` in `GRInspectionWizard.tsx`; `location` on inventory rows; origin and destination on shipments | 3 strings in the wizard; 9 city strings on inventory. No plant or storage object |
| **Cost centre** | `costCenter` on the requisition | free text on the form; "Set in SAP" when empty (`requisitions/prFieldDisplay.ts`). No list |
| **Bank** | `bankAccount` on invoices | one string per invoice. No bank master and no supplier bank details |
| **Brand** | `BRAND_OPTIONS` in `BuyerContracts.tsx` | 5 brand names |
| **Carrier** | `carrier` on shipments | 8 sample names plus `Awaiting`, free text |
| **Certificate type** | `CertType` union | 6 members; issuer is free text |
| **Purchasing organisation, purchasing group, company code, G/L account, tax code, HS code** | — | no occurrence in `src/` |

### 1.3 What the inventory shows

- **No record carries a source or a read time.** The only per-row SAP statement in the tree is the certificate registry's `sapSync`, and it points the other way (the portal holds this, SAP does not).
- **Copies are stored on documents.** `supplierName` is written on documents and read in 55 files (grep). A material's description is stored on order and inventory lines; at the pin 1 of 25 order lines and 1 of 15 inventory rows disagree with the master's label. Units agree on every line.
- **Two resolvers for one question.** The 1,158 sample materials and 28 sample suppliers of the planning fixture are outside the master and the roster and are resolved by a second path.
- **Supplier × material is four objects** (relationship, catalogue, preferred list, quotation lead times) with no common key but the pair itself.
- **Indirect materials and services do not exist** in any object; `pslListing.ts` names that as an open operator decision.
- **Two proposal lanes exist and neither reaches SAP.** Their own headers say why: creating the record is SAP's act.

---

## 2 · Objects and their SAP counterparts

The portal's names are plain; the SAP object is the counterpart the replica is read from. Table and service names in the right-hand column are the usual S/4HANA ones and are to be confirmed with the SAP master-data owner before the feed is built (decision 15).

| Portal object | SAP counterpart | Key in the replica | Replicated fields (first build) |
|---|---|---|---|
| **Material** (direct: raw material, packaging) | material master, types `ROH`, `VERP` | SAP material number | description, material type, material group, base unit, alternative units, plant status, deletion flag |
| **Material** (indirect, service) | material master with a non-stock or service type, or purchasing by material group and short text with no material number (decision 2) | SAP material number where one exists; otherwise code-less with a declared reason (the existing `CODE_LESS` convention) | description, class (direct, indirect, service), material group, unit |
| **Supplier** | business partner in the supplier role: general data, company-code data, purchasing-organisation data | SAP business-partner number (the tree's `sapBpNumber`) | name, legal name, country, city, tax and registration identifiers (typed and repeatable, per `SUPPLIER-IDENTITY-BY-JURISDICTION-01`), payment terms, incoterms and place, order currency, purchasing block, deletion flag. **Not** bank details (decision 12) |
| **Purchasing info record** | info record, supplier × material (× purchasing organisation) | info-record number | supplier's material number, planned delivery time, minimum and standard quantity, net price and currency with validity, order unit |
| **Source list** | source list, material × plant | material, plant, sequence | supplier, validity, fixed or blocked source, linked agreement |
| **Reference: unit of measure** | units and ISO codes; per-material conversions | unit code | text, ISO code, dimension |
| **Reference: material group, material type** | their SAP tables | code | text; the portal's axis (formulation, upstream, packaging) stays a portal annotation |
| **Reference: incoterms** | incoterms table (term; place is a separate field) | term | text |
| **Reference: payment terms** | terms-of-payment key | key | text, days |
| **Reference: currency, exchange rate** | currency codes; exchange-rate table | code; pair and date | rate, rate type, valid from |
| **Reference: country** | country table | ISO-2 | name; the communication profile stays a portal annotation |
| **Reference: plant, storage location** | their SAP tables | plant; plant and storage location | name, city |
| **Reference: cost centre** | cost-centre master | controlling area and cost centre | name, validity, responsible lane |
| **Reference: purchasing organisation, purchasing group, company code** | their SAP tables | code | text. Needed as soon as a supplier is "extended" |
| **Reference: tax code** | tax codes | code | text, rate. Only when the invoice lane needs it (SE-12) |

**Portal-owned annotations.** These are not replicated from SAP. They hang on a replicated record by its key and keep their own writer, their own ledger and their own stamp:

| Annotation | Hangs on | Written by (today's atom holder) |
|---|---|---|
| Halal and BPOM applicability ruling | material | compliance (`material:rule`) |
| Certificates | supplier × material | supplier declares, compliance verifies (`supplierdoc:verify`) |
| Preferred-supplier standing | supplier × material | procurement proposes, compliance decides (`psl:propose`, `psl:decide`) |
| Commodity basket | material | fixture today |
| RFQ category | material or material group | fixture today; becomes a mapping from material group (decision 6) |
| Communication profile | country | fixture; portal data |
| Crosswalk to SOMO's codes (C9) | material | zero rows; unchanged by this design |
| Performance figures (OTIF, grade, rating) | supplier | derived; leave the supplier record (§6.3) |

Whether any of these should later be pushed to SAP (the ruling as a classification, the standing as a source-list entry) is decisions 3 and 4. The design keeps them in the portal.

---

## 3 · The replica model

### 3.1 The record and its stamp

```ts
type MasterObject =
  | 'material' | 'supplier' | 'infoRecord' | 'sourceList'
  | 'unit' | 'materialGroup' | 'materialType' | 'incoterm' | 'paymentTerm'
  | 'currency' | 'exchangeRate' | 'country' | 'plant' | 'storageLocation'
  | 'costCentre' | 'purchasingOrg' | 'purchasingGroup' | 'companyCode';

interface ReplicaStamp {
  readonly source: 'SAP_S4' | 'SAMPLE';     // SAMPLE = fixture or demo answer; never shown as SAP
  readonly sourceKey: string;               // the SAP key, opaque; never parsed (C9 §3)
  readonly readAt: string;                  // ISO instant the replica last took this record from the source
  readonly sourceChangedAt: string | null;  // SAP's own change time, when the feed carries it
  readonly syncRun: string;                 // the run or event that delivered it
  readonly liveness: Tier;                  // SIMULATED until the feed is real (liveness registry)
  readonly sapStatus: 'ACTIVE' | 'BLOCKED' | 'FLAGGED_FOR_DELETION';
}

interface MasterRecord<T> {
  readonly object: MasterObject;
  readonly key: string;                     // = stamp.sourceKey for a replicated record
  readonly data: T;                         // replicated fields only
  readonly stamp: ReplicaStamp;
}
```

- **Freshness is computed, never stored.** `freshnessOf(stamp, object, now)` answers `FRESH`, `STALE` or `NEVER_READ` against a maximum age per object (decision 10), at the declared present like every other deadline in the tree. A stored "stale" flag would be a clock state in a table, which the platform forbids.
- **The stamp is shown on every record.** One line under the record's title in the drawer and one narrow column in the table: source, SAP key, "read 3 hours ago", and the sample marker where the source is not SAP. A new shared component, `ReplicaStampLine`, beside `ProvenanceMarker` and `LivenessPill`.
- **A sample record never reads as SAP.** In the fixture every stamp is `source: 'SAMPLE'`, `liveness: 'SIMULATED'`, and the page says so once in its meta line.
- **The key is opaque.** Nothing parses a material number or a business-partner number. The material master already holds this rule.

### 3.2 Sync direction

| Flow | Direction | Who fires it | In the fixture |
|---|---|---|---|
| Master records | SAP → portal only | the sync feed, under the automation grant | a seeded run at boot; a sample run on demand on a demo deployment (MD-5) |
| Change requests | portal → SAP MDG only | a named person hands off an approved request | a hand-off package is produced and the request stops at "Sent to SAP" |
| SAP's answer to a request | SAP → portal | the feed, with the request number as the idempotency key | a marked sample answer on a demo deployment (decision 9) |
| Portal annotations | stay in the portal | their own verbs | unchanged |

There is no portal → SAP write of a master field, and no portal verb that writes a replicated field. A gate derives that from source: the only writer of the replica stores is the sync applier (MD-1).

### 3.3 Conflict: SAP wins

- **An inbound record replaces the replica record whole.** No field-level merge, no "keep mine". The previous version is kept in the sync log so a reader can see what changed and when.
- **A record missing from a full run is not deleted.** It is marked `NEVER_READ` in that run and shown as such; only SAP's own deletion flag retires it. A dropped file must not empty the catalogue.
- **An open change request is re-checked, not overwritten.** If SAP changed a field the request also proposes to change, the request shows "SAP changed this since it was proposed", with both values, and cannot be approved until the proposer confirms or withdraws it. The request is a proposal about SAP's record; it never had a claim on the value.
- **Annotations survive.** A ruling or a certificate hangs on the key, so a changed description does not touch it. If SAP flags the record for deletion the annotations stay and are shown under a retired record.
- **Blocked and deleted records refuse new work.** A blocked supplier or a material flagged for deletion stays visible and marked; new documents that name it are refused by name, the way an unknown material is refused today (`D-OPS-MASTERMISS`). Documents already open continue (decision 11).
- **A stale record warns; it does not refuse.** Staleness is a statement about the feed, and stopping purchasing because a nightly job failed would be the wrong cost (decision 10).

### 3.4 The sync log

Every run or event is a row: when, which objects, how many records created, changed, unchanged, missing, refused, and why a record was refused (unknown unit, unknown group). It is the answer to "why does this record look different today", and it is where a refused inbound record is visible instead of silently dropped. Append-only, like the other ledgers.

---

## 4 · One place to browse

**Route:** `/buyer/master-data`, in the Platform nav group (decision 13). One page, five views on `Tabs`.

| View | Table columns (kind) | Filters | Drawer |
|---|---|---|---|
| **Materials** | code (id), description (text), class, type, group, unit, halal, BPOM (status), SAP status (status), read (date) | class, type, group, ruling state, SAP status, freshness, "has open request" | record fields; stamp; rulings; certificates by supplier; suppliers (info records, source list, preferred standing); where used; open requests |
| **Suppliers** | SAP number (id), name (text), country, payment terms, incoterms, SAP status (status), read (date) | country, SAP status, freshness, "extended to" | record fields; stamp; identifiers; materials supplied; certificates; where used; open requests |
| **Supplier × material** | supplier, material, supplier's code (id), lead time (number), minimum quantity (number), price (money), valid until (date), source list (status), preferred (status) | supplier, material, group, "no info record", "preferred but no source" | the pair's info record, source-list rows, preferred listing, certificates, last quotations |
| **Reference tables** | a chooser of tables; each table: code (id), text, extra columns per table, read (date) | table, search | a value's fields, stamp, where used |
| **Change requests** | number (id), kind, subject (text), proposer, state (status), age (number) | kind, state, "mine", "waiting for me" | §5 |

- **Search** is one box per view over key and text; a record is linked by the query-parameter convention `recordDeepLink.ts` already gives documents, so any page can link to a material or a supplier.
- **Where used** is derived at read: the documents and listings that name the key, counted by kind, each a link. It is what tells a reviewer how much a change touches.
- **Bulk.** Each view exports what is listed; change requests can be raised from a template (operator ruling of 2026-09-10; the workbook parser in `sdc/parseWorkbook.ts` is the precedent).
- **The existing pages stay** as the business views: `/buyer/suppliers` (directory and performance), `/buyer/preferred-suppliers`, `/buyer/compliance`. Each links to the record in the master-data page and reads its master fields from it. `/buyer/material-requests` becomes the Change requests view filtered to materials (decision 5).
- **Supplier side.** A supplier has no master-data browser. It sees its own record and its own catalogue on `/supplier/storefront`, with the same stamp line, and proposes from there (§5.4).

**Shared components used:** `ListPage`, `DataTable` (column kinds as above), `Tabs`, `SubTabs` chips for saved filters, `SearchBar`, `FilterChipsBar`, `SidePanel` (`wide="table"` where the drawer holds a table), `FieldList` and `Field`, `SectionHeading`, `StatusPill`, `Notice` (`tone="sample"` for the sample statement), `LivenessPill`, `Dialog` for the reason and for the bypass reason (`BypassReasonDialog` exists), `Wizard` for a request with several steps, `HandoffNotice` where the seat lacks the atom, `NextActLine` on a request, `Timeline` for a request's history, `EmptyState`, `BulkActionsBar`. One new component: `ReplicaStampLine`. One main solid button per page ("Propose a change"); one per drawer (the affirmative act of the request's state); a rejection is the solid critical button.

---

## 5 · Change requests

### 5.1 Kinds

| Kind | Who proposes | What it asks SAP for | Replaces today |
|---|---|---|---|
| `material.create` | procurement, planning | a new material, direct or indirect | the material-request lane |
| `material.change` | procurement, planning | a change to description, group, unit conversion, status | — |
| `supplier.create` | raised by an approved supplier application (decision 17) | a new business partner in the supplier role | the application's dead end |
| `supplier.extend` | procurement | an existing supplier extended to a purchasing organisation, a company code or a plant | — |
| `supplier.change` | procurement; the supplier for its own contact and address fields | a change to the supplier record | — |
| `infoRecord.propose` | procurement; **the supplier, for its own catalogue item (SE-21)** | an info record for supplier × material: supplier's code, unit, minimum quantity, lead time, price | the storefront's local-state catalogue |
| `sourceList.propose` | procurement | a source-list row for material × plant | — |

A request carries: kind, the subject's key where one exists, the proposed fields, the reason, attachments by name (specification sheet; bytes are SE-8), and for a create the code-less reason until SAP returns a key. It never carries a proposed key: the portal does not mint one.

### 5.2 The machine

One flow, `masterDataRequest`, registered like the other thirty.

```
                 ┌─────────── return ───────────┐
                 ▼                              │
 propose ──► Proposed ──► In Review ──► Approved ──► Sent to SAP ──► Completed in SAP
                 │            │            │              │
                 │            └─► Rejected │              └─► Declined by SAP
                 └─► Withdrawn             └─► Withdrawn
```

| Act | From → to | Who | Checks |
|---|---|---|---|
| `t_mdr_propose` | (birth) → Proposed | proposer lane for the kind | named person; required fields for the kind; the subject exists (or, for a create, does not); no duplicate open request on the same subject and fields; supplier tenancy: a supplier names only itself |
| `t_mdr_start_review` | Proposed → In Review | reviewer lane for the kind | named person |
| `t_mdr_return` | In Review → Proposed | reviewer lane | reason |
| `t_mdr_approve` | In Review → Approved | reviewer lane | **approver is not the proposer**; base unchanged in SAP since proposal (§3.3); validation clean |
| `t_mdr_reject` | In Review → Rejected | reviewer lane | reason; approver is not the proposer |
| `t_mdr_withdraw` | Proposed, Approved → Withdrawn | the proposer's lane | reason |
| `t_mdr_hand_off` | Approved → Sent to SAP | procurement (decision 8) | named person; the request re-validated against the replica as it stands now |
| `t_mdr_sap_complete` | Sent to SAP → Completed in SAP | the feed (automation); a sample act on a demo deployment | carries SAP's request number and the resulting key |
| `t_mdr_sap_decline` | Sent to SAP → Declined by SAP | the feed (automation); sample on demo | carries SAP's reason |

- **Reviewer lane by kind** (decision 7): materials → planning (today's `materialrequest:decide` holder); suppliers → compliance (today's `application:decide` holder); info records and source lists → procurement, and where the proposer is also procurement the four-eyes check separates the two persons. Because the dispatcher's role gate is one atom per act, the approve, reject, return and start-review acts are declared once per lane family (`…_material`, `…_supplier`, `…_commercial`), and a check refuses an act of the wrong family for the request's kind. Atoms: `masterdata:propose`, `masterdata:decide-material`, `masterdata:decide-supplier`, `masterdata:decide-commercial`, `masterdata:handoff`; supplier side `catalog:propose`, held by the commercial lane.
- **Four eyes.** The check compares the approver's person with the proposer's, as `MATERIALREQUEST_DECIDER_NOT_REQUESTER` does today. A seat that names nobody is refused before the act, and the page says so first (`ActorPreActNotice`).
- **Super Admin bypass, stamped.** The four-eyes check asks the dispatcher `exempt(head)`, as the existing checks do since ADM-1. A Super Admin approving their own proposal must give a one-line reason (`SUPER_ADMIN_REASON_REQUIRED` without it); the event records the head and the reason and appears on the Super Admin activity view. `admin` holds the same atoms and is not exempt. The exemption reaches the person-separation check only: not validation, not a changed base, not tenancy.
- **Sample persons.** A sample person may propose and approve on a demo or preview deployment, marked `(SAMPLE)`; refused on production (decision 14). The rule module switching already follows.
- **Portal approval is not SAP's approval.** "Approved" means Paragon agreed to ask. MDG runs its own governance; the request can still come back declined, and the page words the states so nobody reads "Approved" as "exists".

### 5.3 Hand-off to SAP MDG

The hand-off is a package, not a write:

- the portal's request number, used by SAP as the external reference and by the feed as the idempotency key;
- the kind, mapped to the MDG change-request type for that object (material, supplier / business partner);
- the proposed fields in SAP's terms, the reason, who proposed and who approved (person ids, resolved by the identity provider at SE time), and attachment references;
- the replica's `sourceChangedAt` for the subject, so MDG can see what the proposal was written against.

SAP answers with its change-request number at once, and with the outcome later: completed with the key, or declined with a reason. When it completes, **the record arrives through the ordinary sync feed**, stamped `SAP_S4`; the request is then linked to it. The portal never writes the record itself on the strength of its own approval. This is the ruling both existing lanes already state, kept.

**In the fixture.** `t_mdr_hand_off` produces the package (viewable and downloadable from the request), stamps the request "Sent to SAP (sample: not connected)", and stops. On a demo or preview deployment, a marked act "Record SAP's answer (sample)" may complete or decline it; a completion adds a replica record stamped `source: 'SAMPLE'` with a sample key, so the whole path can be shown. It is refused on production (decision 9).

### 5.4 The supplier-proposed catalogue item (SE-21)

- The supplier's storefront catalogue becomes a list of its **info-record proposals and approved items**: each row is supplier × material with the supplier's own item code, unit, minimum quantity, lead time, and optionally a price (decision 19).
- "New item" opens the request wizard (`infoRecord.propose`). The supplier picks a Paragon material it is allowed to see (one it is listed, collaborated or invited on) or declares the item code-less with a reason, which turns the proposal into a pair: a `material.create` request for Paragon's review and the info-record proposal waiting on it.
- Paragon reviews in the Change requests view; the supplier sees its own proposals, their state and the reason for a rejection, and may propose again (decision 20). It never sees another supplier's items, prices or proposals; a refusal does not reveal whether a record exists (C11 V1, V2).
- Certificates stay in the `supplierDocument` lane and attach to the pair (SE-21 R10).
- The supplier's own item code is held on the info record as the supplier's material number. It is a pointer, never an identity, and joins nothing by itself (the `supplier_catalogue_pointer` space already says so).
- Bulk: a template derived from the proposal's required fields (SE-21 R8).

SE-21's ten requirements map onto this design as: R1 → §2 (class on the material); R2, R7 → §5.4; R3 → §4; R4 → §5.3; R5 → §5.1 (one request flow); R6 → §6; R8 → §4, §5.4; R9 → §5.2, §7; R10 → §2 annotations.

---

## 6 · One truth: how every other module reads

### 6.1 The read

One service on the data seam, `masterData`, beside `suppliers` and `procurement`:

```ts
interface IMasterDataService {
  list<T>(scope, object: MasterObject, query): Promise<Page<MasterRecord<T>>>;
  get<T>(scope, object: MasterObject, key: string): Promise<MasterRecord<T> | null>;
  reference(scope, table: MasterObject): Promise<readonly MasterRecord<unknown>[]>;
  pair(scope, supplierKey: string, materialKey: string): Promise<SupplierMaterialView | null>;
  whereUsed(scope, object: MasterObject, key: string): Promise<WhereUsed>;
  syncLog(scope, query): Promise<Page<SyncRun>>;
}
```

- Tenancy is the scope's, as everywhere: a buyer reads all; a supplier reads its own supplier record, the materials it is party to, and its own pairs.
- **Pure code keeps a synchronous lookup.** Policy hooks, selectors and projections cannot await. The existing `materialMaster.ts` functions (`labelOf`, `uomOf`, `requireUom`, `isKnownMaterial`) keep their signatures and their refusal semantics and read the replica store; a matching `supplierOf`, `referenceText` and `isKnownReference` are added. The three-outcome rule stays: refuse on write, dash on display, throw at author time.
- **One resolver.** The 1,158 sample materials and 28 sample suppliers of the planning fixture become replica records stamped `SAMPLE`, and `publishedMaterial.ts`'s second path is retired (decision 16).

### 6.2 What moves out of hard-wired code

| Today | Becomes | Batch |
|---|---|---|
| `MATERIAL_MASTER` named in 28 files (grep) | the replica store; read only through the lookup or the service | MD-2 |
| `mockSuppliers` imported in 15 files (grep) | the supplier replica; read through `suppliers` / `masterData` | MD-2 |
| `INCOTERMS_OPTIONS` ×2, `PAYMENT_TERMS_OPTIONS` ×2 | reference tables `incoterm`, `paymentTerm`; the incoterm and its place become two fields | MD-2 |
| `CATEGORY_OPTIONS` ×3, `RFQCategory`, `MaterialCategory`, `Supplier.category` | material group is the one classification; each other vocabulary becomes a declared mapping from it, shown as a reference table (decision 6) | MD-2 (mapping), later (retire the unions) |
| `Uom` union, `MaterialType` union | stay as closed unions in code, because arithmetic and refusals depend on them; the reference table must equal the union, and an inbound unit outside it is refused in the sync log by name | MD-1 |
| `LOCATIONS` in the receiving wizard; city strings on inventory | reference tables `plant`, `storageLocation` | MD-2 |
| Cost centre free text | a picker over `costCentre`; "Set in SAP" stays for an empty one | MD-2 |
| `COUNTRIES` (7 names) in registration | reference `country` (ISO-2); the communication profile stays an annotation | MD-2 |
| `BID_CURRENCIES` | reference `currency`, with "allowed for bids" as a portal policy over it; the rate pin's `SAP_EXHGRATE` source reads `exchangeRate` | MD-2 |
| `BRAND_OPTIONS` | not SAP master data in this design; left where it is and listed as a known hard-wired list | — |
| `MATERIAL_CATALOG` in `BuyerSourcing.tsx` | the picker reads Materials (with code-less entries shown as open `material.create` requests) | MD-4 |
| `SUPPLIER_MATERIAL_RELATIONSHIPS`, storefront `INITIAL_CATALOG`, `PRODUCTS_DEFAULT` | info records | MD-3 |
| Storefront component-state catalogue | info-record proposals | MD-6 |

### 6.3 Rules for the readers

- **A document stores the key, not a copy.** Where the portal originates the document, it stores the material and supplier keys and resolves name, description and unit at read. Where SAP issued the document (a purchase order), the text SAP issued stays on it, because that is what was ordered. At the pin one order line and one inventory row already disagree with the master; the first rule ends that for portal documents, and the second makes the difference legitimate and visible for SAP's (decision 18).
- **The supplier record splits.** Master fields come from the replica; performance figures are derived and move to the scorecard read. One record holding both is why a "supplier" today has 35 fields.
- **A gate holds it.** Derived from source every run: the replica stores have one writer; `MATERIAL_MASTER` and the supplier fixture are imported only by the master-data module's seed; no page declares an option list for a value that has a reference table. Each is a per-file list that can only shrink, on the pattern of `uiGate`.

---

## 7 · Governed like the rest

- **Module.** Reading master data cannot be switched off, because every module reads it; it belongs to the platform. Change requests ride module `MAT`, widened from "material requests" to "master-data requests" (decision 13).
- **Liveness.** A `masterData` capability in the liveness registry, SIMULATED until the feed is real; the page shows the pill, and each record its stamp.
- **Events.** Every request act emits the standard transition event; the bypass is the existing `bypass` event. Sync runs are logged in the sync log, not as transitions, because no person or flow act fires them.
- **Copy.** EN and ID for every label; a process guide for `masterDataRequest`; glossary terms for replica, system of record, info record, source list, hand-off.
- **Refusals.** New heads are rendered through the refusal maps; any that names a person fills it through `personLabel`.

---

## 8 · Fixture now, SE later

| Part | Runs in the fixture | SE work |
|---|---|---|
| Replica records and stamps | seeded from today's fixtures, stamped `SAMPLE` | records from S/4HANA, stamped `SAP_S4` (SE-6) |
| Sync | one seeded run; a sample run on a demo deployment | initial load, change events, a periodic full reconciliation, the refusal queue |
| Sync log | in memory | a durable ledger (SE-4) |
| Browse, search, filter, where used | built | server-side paging and search when volumes are real |
| Change requests, review, four eyes, bypass | built; requests kept in the browser across reloads (as custom roles are) with a notice that they are not shared | a durable store; named persons from the identity provider (SE-3) |
| Hand-off | the package, viewable; the request stops at "Sent to SAP" | the call to SAP MDG; SAP's request number back |
| SAP's answer | a marked sample act on a demo deployment only | the feed fires `t_mdr_sap_complete` / `_decline` |
| Attachments | names only | file storage (SE-8) |
| Supplier bank details | not held | a decision with security (D9) before any field exists |
| Reference tables for purchasing organisation, company code, tax code | declared, with sample rows only where a request needs them | real tables |
| Crosswalk to SOMO (C9) | unchanged: zero rows | SE-5 |

---

## 9 · What this changes in the handover set

- **SE-6** ("vendor master and material master are read, never written") stays true and gains its counterpart: change requests are handed to MDG.
- **SE-21** moves from "requirements only" to this design; its open decisions C1–C9 are carried into `MD_OPEN_DECISIONS.md`.
- **D4** (sample-data replacement): the rows for the supplier fixture, the material master, the storefront and the relationship fixture point at the replica.
- **D5** `STOREFRONT-LOCAL-APPEND` closes with MD-6.
- The two flow headers that say approval "records a decision and nothing else" stay correct in substance: the portal still creates no record. What changes is that the decision now has a consumer.

---

## 10 · Traceability to the dispatch

| Asked for | Where |
|---|---|
| Inventory of every master-data object and hard-wired value | §1 |
| Objects and SAP counterparts (material direct and indirect, vendor / business partner, info records, source lists, reference tables) | §2 |
| Replica model: sync direction, freshness and source stamp on every record, conflict = SAP wins | §3 |
| One place to browse, search, filter | §4 |
| Change requests: create material, extend supplier, supplier-proposed catalogue item (SE-21) | §5.1, §5.4 |
| Propose → review → approve (four eyes; Super Admin bypass stamped) → hand-off to SAP MDG | §5.2, §5.3 |
| How every other module reads from it; what moves out of hard-wired code | §6 |
| UI on the shared components | §4 |
| Fixture now, SE integration later | §8 |
