# Master Data module — build plan

**Seat 3, consultant, Ops Project #11 · 2026-10-12.** Pin: `main` @ `0531e094d401b8c51e320fd3151da6b72963ba47` (PG-3). Section numbers refer to `MASTER_DATA_DESIGN.md`; decision numbers to `MD_OPEN_DECISIONS.md`.

Six batches. Each is one branch and one pull request to `main`, merged with `--merge`. Each that changes a rendered surface carries a before/after walk in the visible browser. The floor at the pin is 9,014 tests in 497 files (`scripts/floor.json`); every batch raises it except where a retirement is named, and there the floor follows the deleted assertions down.

**Order and dependencies.** MD-1 → MD-2 → MD-3 are the replica and the one truth; they need decisions 1, 6, 10, 13, 16 and 18. MD-4 → MD-5 → MD-6 are the requests; they need decisions 5, 7, 8, 9, 14 and 17, and MD-6 also 19 and 20. MD-4 can start after MD-1 if the requests are wanted first; MD-6 needs MD-3 and MD-4.

| Batch | Name | Operator sees |
|---|---|---|
| MD-1 | The replica and the page | one page listing every material, supplier and reference value, each with its source and when it was read |
| MD-2 | One truth | the same lists and values on every page; no page-local dropdown lists |
| MD-3 | Supplier × material | info records and source lists in one view; a material's drawer shows who supplies it, on what terms, with which certificates |
| MD-4 | Change requests | propose, review, approve under four eyes; the material-request lane folded in |
| MD-5 | Hand-off and SAP's answer | the hand-off package; a sample sync run showing "SAP wins"; the sync log |
| MD-6 | Supplier-proposed catalogue | a supplier proposes an item from its storefront; Paragon reviews it; bulk template; handover set corrected |

---

## MD-1 · The replica and the page

**Scope**
- `MasterRecord`, `ReplicaStamp`, `freshnessOf` (design §3.1); replica stores for material, supplier and the reference tables the tree uses today (unit, material type, material group, incoterm, payment term, currency, country, plant, storage location, cost centre).
- A seed that builds the replica from today's fixtures, stamped `source: 'SAMPLE'`, `liveness: 'SIMULATED'`, read time anchored to the declared present. Incoterm strings split into term and place at the seed.
- The sync applier: the single writer of the replica stores; whole-record replace; a refusal by name for an inbound unit or material type outside the closed union; the sync log with the seeded run in it.
- `IMasterDataService` on the data seam (`list`, `get`, `reference`, `whereUsed`, `syncLog`); `masterData` in the liveness registry.
- `/buyer/master-data` with the Materials, Suppliers and Reference tables views; record drawers with fields, stamp and where-used; `ReplicaStampLine`; nav item in the Platform group; EN and ID copy; glossary terms.
- No consumer moves in this batch: `MATERIAL_MASTER` and the supplier fixture stay as they are and the replica is seeded from them, so the two cannot disagree.

**Acceptance tests (by title)**
- "every seeded material and supplier is in the replica under its own key, and nothing else is" (membership both ways, with a known member found and a made-up key absent)
- "every replica record carries a stamp, and a sample record never renders as SAP"
- "freshness is computed at the declared present and no record stores it" (shifted-clock probe: the same record turns stale with no write)
- "the replica stores have one writer" (derived from source; probed by adding a second writer and seeing it named)
- "an inbound record replaces the whole record and the sync log keeps the previous version"
- "an inbound unit outside the union is refused by name and appears in the sync log"
- "a record missing from a full run is marked not read, never deleted"
- "where used counts the documents that name a key" (one material with orders, one with none)
- "a supplier seat reads its own supplier record and no other; a refusal does not say whether the record exists"
- route smoke and nav membership for `/buyer/master-data`; the page brings its own shell
- `uiGate` and the one-solid count stay green on the new page

**Before** — A material's description and unit can be seen only inside the pages that use it. There is no list of materials, no list of reference values, and no statement of where any of it came from.
**After** — Platform → Master data. Three views. Search "glycerin" and open the record: its fields, "Sample data · read today · not from SAP", and the orders, listings and certificates that name it. The Reference tables view lists units, incoterms, payment terms, countries, plants and cost centres.

---

## MD-2 · One truth

**Scope**
- Synchronous lookups read the replica store: `labelOf`, `uomOf`, `requireUom`, `isKnownMaterial` unchanged in signature and refusal; new `supplierOf`, `referenceText`, `isKnownReference`.
- The files that name `MATERIAL_MASTER` (28 by grep) and import the supplier fixture (15 by grep) move to the lookup or the service; the fixtures become the seed's private input.
- The planning fixture's 1,158 sample materials and 28 sample suppliers become replica records stamped `SAMPLE`; `publishedMaterial.ts`'s second resolver is retired (decision 16).
- Page-local lists replaced by reference reads: `INCOTERMS_OPTIONS` (two definitions), `PAYMENT_TERMS_OPTIONS` (two), `LOCATIONS` in the receiving wizard, `COUNTRIES` in registration, the cost-centre text box (a picker; "Set in SAP" kept for an empty value), `BID_CURRENCIES` as a policy over the currency table.
- Categories: a declared mapping from material group to RFQ category, to the compliance category and to the supplier category, shown as a reference table; the three `CATEGORY_OPTIONS` lists read it (decision 6). The unions themselves are not retired here.
- The supplier record splits: master fields from the replica, performance figures from the scorecard read.
- Portal-originated documents resolve supplier name and material description at read (decision 18).
- The gate: `src/lib/masterDataGate/` — the fixtures have one importer; no page declares an option list for a value that has a reference table; each list per file, shrink-only.

**Acceptance tests**
- "no module outside the master-data seed imports the material fixture or the supplier fixture" (derived; a known past importer is used as the probe)
- "every option list for incoterms, payment terms, plants, countries and cost centres is read from the reference tables" (derived from source; probed by restoring one local list)
- "a material and a sample material resolve through one lookup" (the retired resolver's cases, re-pointed)
- "the write path still refuses an unknown material by name; the display path still shows a dash" (the existing refusal specs, unchanged, must stay green)
- "a portal document shows the master's name and description; an SAP-issued order keeps the text it was issued with, and the difference is marked"
- "the reference table for units equals the unit union, both ways"
- the stored-field gate and the material census stay green with the fixtures now behind the seed

**Before** — The sourcing wizard and the contract form each carry their own incoterm and payment-term lists; the receiving wizard has three warehouse names typed into it; cost centre is a text box; one order line describes a material differently from the master.
**After** — The same pickers on every form, each reading the reference table, each option showing its code. Change a sample reference value in a sample sync run and every form shows it. Nothing else looks different, which is the point of this batch; the walk shows the pickers and the one corrected description.

---

## MD-3 · Supplier × material

**Scope**
- Replica objects `infoRecord` and `sourceList`; seeded from `SUPPLIER_MATERIAL_RELATIONSHIPS` (4 rows), the storefront catalogue (5 items, text fields parsed into unit, quantity, days and money, with a refusal where a value does not parse) and sample source-list rows.
- `pair(supplier, material)`: the info record, source-list rows, preferred-supplier listing, certificates and last quotations for one pair, each with its own stamp.
- The Supplier × material view; the Materials drawer gains "Suppliers", the Suppliers drawer gains "Materials supplied"; both link to the pair.
- Portal annotations shown on the record, read-only here: halal and BPOM rulings, certificates, preferred standing, commodity basket. Each links to the page that owns it.
- The storefront's buyer-side view (`/marketplace/supplier/:id`) reads info records instead of its own fixture.
- Filters "preferred but no source-list row" and "source-list row but not preferred" (information only; no check is added, see decision 3).

**Acceptance tests**
- "an info record names a supplier and a material that both exist in the replica" (and a seeded row that does not is refused in the sync log)
- "the pair view shows SAP's fields and the portal's annotations under separate stamps"
- "a catalogue quantity that does not parse is refused by name, never defaulted"
- "a supplier seat sees its own pairs and no other supplier's price or lead time"
- "the storefront page and the master-data page show the same item for the same pair"
- "a ruling changed on the compliance page shows on the material record without a reload of the replica"

**Before** — Who supplies a material is answered in four places that do not agree on shape: the collaboration relationship, the storefront catalogue, the preferred list and the quotations.
**After** — Open a material: its suppliers, each with lead time, minimum quantity, price validity, source-list status, preferred standing and certificate state. Open a pair: everything Paragon knows about that supplier for that material on one drawer, each block saying where it came from.

---

## MD-4 · Change requests

**Scope**
- The `masterDataRequest` flow, store (kept in the browser across reloads, with a notice) and command target; states and acts as design §5.2 up to `Approved`; kinds `material.create`, `material.change`, `supplier.create`, `supplier.extend`, `supplier.change`, `infoRecord.propose` (buyer-raised), `sourceList.propose`.
- Atoms `masterdata:propose`, `masterdata:decide-material`, `masterdata:decide-supplier`, `masterdata:decide-commercial`, `masterdata:handoff`, placed in lanes per decision 7.
- Checks: named person; approver is not proposer, asking `exempt(head)` so the Super Admin bypass with a recorded reason applies; subject exists (or does not, for a create); no duplicate open request; base unchanged since proposal; required fields per kind.
- The Change requests view; the request drawer with proposed against current values, timeline, next-act line and handoff notices; "Propose a change" on every record drawer; the request wizard for a create.
- `materialRequest` folded in: its rows become `material.create` requests, `/buyer/material-requests` opens the view filtered to materials, the sourcing wizard's "request this material" raises the new request, and the old flow, target, guide and specs are retired (decision 5). The floor follows the deleted assertions down and comes back up with the new specs.
- An approved supplier application raises a `supplier.create` request (decision 17).
- Module `MAT` widened to "master-data requests"; process guide EN and ID; refusal copy.

**Acceptance tests**
- "a request cannot be approved by the person who proposed it" and "a Super Admin can, with a reason, and the event carries the head and the reason"; "an Admin cannot"
- "a seat that names nobody is refused before the act, and the page says so first"
- "a sample person may approve on a demo deployment and is refused on production"
- "a create request never carries a key, and approving it adds no record to the replica"
- "a second open request for the same subject and field is refused by name"
- "when SAP changes a field a request proposes to change, the request cannot be approved until the proposer confirms"
- "each kind is decided by its own lane, and an act of the wrong family is refused"
- "every material request seeded at the pin is reachable as a master-data request in the same state" (named members, not a count)
- "the sourcing wizard's request lands in the Change requests view"
- "an approved supplier application raises exactly one supplier request"
- surfaceable, required-fields and guide-coverage gates green for the new flow; the retired flow is absent from `getKnownFlows()`
- one solid button per drawer in every request state (visible walk reads the console)

**Before** — A material request can be approved and nothing follows; a supplier application likewise. There is no way to ask for a change to an existing material or supplier, or to extend a supplier.
**After** — On any record: "Propose a change". The request shows what is proposed beside what SAP holds. A second person reviews and approves; the proposer cannot. A Super Admin approving their own request is asked for a reason and the activity view shows it. Approved requests wait for hand-off.

---

## MD-5 · Hand-off and SAP's answer

**Scope**
- `t_mdr_hand_off`: re-validates the request, builds the hand-off package (design §5.3), stamps "Sent to SAP (sample: not connected)". The package is viewable and downloadable from the request.
- `t_mdr_sap_complete` and `t_mdr_sap_decline` as external-fact acts under the automation grant, keyed on the request number.
- On demo and preview deployments only: "Record SAP's answer (sample)", which fires one of the two; a completion delivers a replica record through the sync applier, stamped `SAMPLE` with a sample key, and links it to the request. Refused on production (decision 9).
- On demo and preview only: "Run a sample sync", which applies a prepared set of changes (a changed description, a new reference value, a supplier blocked, a record missing from the run) so that "SAP wins" can be seen.
- The sync log view; stale and blocked markers on records and in pickers; a blocked supplier or a material flagged for deletion refuses new documents by name while open documents continue (decision 11).
- States worded so that "Approved" is never read as "exists in SAP".

**Acceptance tests**
- "hand-off produces a package naming the request, the kind, the proposed fields, proposer and approver, and the base it was written against"
- "a request sent to SAP adds no record; the record appears only through the sync applier"
- "the same SAP answer delivered twice changes nothing the second time"
- "the sample answer and the sample sync are refused on a production deployment" (the deployment rule, probed both ways)
- "after a sample sync the changed record shows SAP's value, the log keeps the previous one, and an open request on that field is held"
- "a blocked supplier is refused on a new sourcing event and a new order by name; an open order continues"
- "a stale record warns and does not refuse"
- "a declined request shows SAP's reason and may be proposed again as a new request"

**Before** — An approved request has nowhere to go, and nothing shows what happens when SAP and the portal differ.
**After** — "Send to SAP" on an approved request shows the package that will be handed over. On the demo, "Record SAP's answer (sample)" completes it and the new material appears in Materials with a sample key and "from request MDR-…". "Run a sample sync" changes a description: the record now shows SAP's value, the sync log shows what it replaced, and the request that touched that field says SAP changed it first.

---

## MD-6 · Supplier-proposed catalogue

**Scope**
- `catalog:propose` for the supplier's commercial lane; `infoRecord.propose` raised by a supplier for itself only; the paired `material.create` when the item is code-less.
- `/supplier/storefront`: the catalogue becomes approved items plus the supplier's proposals with state and rejection reason; "New item" opens the request wizard; the component-state append and its toast are deleted (closes `STOREFRONT-LOCAL-APPEND`).
- The supplier's own record on the storefront with its stamp; `supplier.change` for its own contact and address fields.
- Bulk: a template derived from the proposal's required fields, uploaded through the workbook parser; a row that fails is refused by name and the rest proceed only on confirmation.
- Paragon's review in the Change requests view, with certificates for the pair shown from the document lane.
- Handover set corrected: SE-21 points at this design; D4 rows for the supplier fixture, the material master, the storefront and the relationship fixture; D5 `STOREFRONT-LOCAL-APPEND` closed; D1 SE-6 gains the hand-off; the decisions ruled are entered in D6.

**Acceptance tests**
- "a supplier can propose only for itself; another supplier's id is refused without revealing whether it exists"
- "a supplier sees its own proposals and approved items and no other supplier's"
- "a supplier proposal is decided by a Paragon lane; no supplier seat holds a deciding atom" (derived from the role bundles)
- "nothing a supplier does writes the replica" (the one-writer gate, re-run with the supplier acts in the population)
- "a code-less item raises a material request and the info-record proposal waits on it"
- "the template's columns equal the proposal's required fields" (derived, both ways)
- "a rejected proposal shows its reason to the supplier and can be proposed again"
- "the storefront no longer appends to component state" (the dead-affordance census, with the removed handler as the probe)

**Before** — A supplier adds a catalogue item, a toast says honestly that nothing was sent, and the item disappears on reload.
**After** — The supplier's "New item" becomes a numbered proposal that survives a reload. Paragon's procurement sees it under Change requests, approves or rejects it with a reason; the supplier sees the outcome. Approved, it goes to SAP like any other request and appears in the catalogue when it comes back.

---

## What no batch here builds

The real feed from S/4HANA and the call to MDG (SE-6), the durable store (SE-4), sign-in (SE-3), file storage for attachments (SE-8), supplier bank details, the crosswalk to SOMO's codes (C9, SE-5), tax codes for the invoice lane (SE-12), and the retirement of the category unions in favour of material group.
