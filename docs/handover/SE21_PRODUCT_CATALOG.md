# SE-21 · Product catalogs — requirements and open decisions

**Status:** DRAFT for Seat 2 review · 2026-10-01 · consultant seat (Seat 3), read-only, from `main` @ `6f1da15aa41c03e38538562ea8e6c250353538a1` (PR #392).
**What this is:** the specification note for SE work package 21 (D1 §4). It states requirements and the decisions they need. **It is not a design**: no screen, verb, field list or batch plan is fixed here, and nothing in it is ratified until D6 records it.
**Owner after handover:** the SE Team. Stakeholders: procurement (catalog content and approval), planning (direct materials), compliance (certified materials), the SAP master-data owner.

---

## 1 · What exists today (measured at the pin)

| Object | Where | What it is | What it is not |
|---|---|---|---|
| **Material master** | `MATERIAL_MASTER`, `src/services/sdc/fixtures.ts:135` | a frozen fixture of 42 **direct** codes (31 `ROH` raw materials, 11 `VERP` packaging), each with `label`, `canonicalUom`, `materialGroup`, `materialType` | not writable by any verb; holds no indirect material or service; carries no RFQ category (0 of 42) |
| **RFQ material catalog** | `MATERIAL_CATALOG`, `src/pages-v2/BuyerSourcing.tsx:246`; shape in `src/pages-v2/sourcing/materialCatalog.ts` | the RFQ wizard's picker, keyed by six `RFQCategory` values (`src/data/mockRfqs.ts:10-16`); 23 entries, 9 naming an existing master code and 14 declaring `CODE_LESS` with a reason from `src/data/materialCatalogReason.ts` | not a catalog anyone maintains: authored in code, mints no code, and the header calls its codes placeholders that SAP's master will replace |
| **Material-request lane** | `materialRequest.flow.ts`, `/buyer/material-requests` (`BuyerMaterialRequests.tsx`), module `MAT` | a buyer asks for a material the master lacks: `t_materialrequest_submit` (procurement) → `start_review` / `approve` / `reject` (planning, decider ≠ requester, a rejection needs a justification) | buyer-only (suppliers hold no verb); approval records a decision and **mints no code, writes nothing to the catalog or the master, changes no RFQ** (flow header `:10-17`); no edge to S/4 |
| **Supplier storefront (supplier side)** | `/supplier/storefront`, `SupplierMyStorefront.tsx` | a supplier adds or removes catalog items and edits profile and certificate visibility | component state only; the toast says honestly that nothing was sent to procurement; lost on reload |
| **Supplier storefront (buyer side)** | `/marketplace/supplier/:id`, `SupplierStorefront.tsx`, fixture `mock/fixtures/supplierStorefront.ts` | a read-only fixture view | connected to nothing: not to material requests, not to the master |
| **Crosswalk** | C9 (`docs/contracts/C9-material-master-ref.md`) | the schema for "our code X and your code Y name the same thing": keyed on specification, `grain` per row, `materialCode` opaque | zero rows, zero consumers; ratification is SOMO's |
| **Indirect materials and services** | `src/services/data/pslListing.ts:39-44` | named as **out of scope and an open operator decision**: the master holds only direct codes, so a listing for a service has no code to name; free text is refused as a second vocabulary | — |

## 2 · Requirements

**R1 · One catalog model for direct and indirect materials.** The master data must carry both direct materials (raw materials and packaging, the 42-code shape today) and indirect materials and services (MRO, consumables, marketing materials, services). Each catalog item names its class (direct / indirect / service) so planning, PSL and sourcing can each decide which classes they accept.

**R2 · Suppliers help build their own catalogs; they never publish into Paragon's master.** A supplier may **propose** items (new item, change to an item, withdrawal of an item) for its own catalog. Every proposal is **reviewed** and **approved or rejected** by Paragon before it becomes visible as a Paragon catalog item. No supplier act writes to Paragon's catalog or to the material master directly. The proposal, the review and the decision are separate, attributed acts with the reviewer distinct from the proposer, recorded in an append-only history — the shape the tree already uses for `materialRequest` and `psl`.

**R3 · Paragon keeps full access to its own catalog.** Paragon's procurement users can read, create, edit, deactivate and re-activate any item in Paragon's catalog without a supplier's involvement, and can see every supplier proposal against it, pending or decided. A supplier sees its own proposals and the approved items that name it; it never sees another supplier's catalog, prices or proposals (tenancy rule C11 V1; refusal is not an existence oracle, V2).

**R4 · SAP owns the material master and every material code.** The portal never mints a material code (C11 V15's rule extended to materials; the material-request lane already refuses to). An approved catalog item that needs a master code is a **request to the SAP master-data owner**; the code arrives from S/4 (SE-6) and is then linked to the catalog item. Until it arrives, the item is visibly code-less with a declared reason (the `CODE_LESS` convention), never a placeholder code.

**R5 · One path from "we need a material" to "it is in the catalog".** Today two disconnected paths exist: the buyer's material request (decision only) and the supplier's storefront (local only). The catalog must join them: a buyer request or a supplier proposal leads to the same review, the same decision record, and the same hand-off to SAP for a code.

**R6 · Catalog items are what downstream acts name.** RFQs, PSL listings, intake lines, publications and requisitions must reference a catalog item (and through it the master code where one exists), never a display string. The RFQ picker's history (`materialCatalog.ts` header: display strings shipped into `materialIds` made every RFQ unjoinable) is the defect this requirement prevents.

**R7 · Supplier codes map through the crosswalk.** A supplier's own item code is held as a supplier-side identifier and joined to Paragon's item through C9's crosswalk shape (specification-keyed, `grain` per row), not by renaming Paragon's code.

**R8 · Bulk entry and templates.** Per the operator ruling of 2026-09-10, catalog proposals and Paragon-side catalog maintenance need mass upload with a template derived from the proposal verb's required fields (shared with SE-15).

**R9 · Governed and honest like the rest of the platform.** Proposal, review and decision are verbs through the dispatcher, held by named lanes, with a module (`MAT` today, or a new one) so they can be switched; screens toast only what happened; the liveness registry marks the catalog SIMULATED until the SAP master feed is real; EN and ID copy; a process guide for each new flow.

**R10 · Certified materials stay linked to compliance.** An item that requires a halal or BPOM certificate must say so, and the supplier's certificate evidence (the `supplierDocument` lane) attaches to the supplier × item pair, not to the item alone.

## 3 · What changes for today's objects (direction only)

- `MATERIAL_MASTER` stops being a fixture and becomes the read model of S/4's material master (SE-6).
- The RFQ wizard's `MATERIAL_CATALOG` is replaced by the catalog read.
- The material-request lane either becomes the buyer entry to the catalog review, or is retired into it (decision C5).
- The supplier storefront's catalog editing becomes the supplier's proposal surface; its local-state append (D5 `STOREFRONT-LOCAL-APPEND`) goes away.

## 4 · Dependencies

SE-6 (the material master read and the code request to SAP), SE-4 (stores, durable history), SE-3 (named reviewers distinct from proposers), SE-8 (attachments such as specification sheets), SE-15 (bulk templates), SE-5 / C9 (crosswalk with SOMO for direct materials).

## 5 · Open decisions (for the operator and procurement)

| # | Decision | Notes |
|---|---|---|
| C1 | Are indirect materials and services in the platform's scope at all, and from when? | `pslListing.ts` records this as an open operator decision; the RFP's e-sourcing objectives assume it |
| C2 | Does SAP's material master carry indirect items, or do indirect items live only in a portal catalog with a different SAP object (for example a service master or free-text purchasing)? | decides whether R4 applies to every class |
| C3 | Who reviews and approves a supplier's catalog proposal: procurement only, or procurement plus planning (direct) and compliance (certified)? | a lane assignment; the reviewer must differ from the proposer |
| C4 | Is the catalog per supplier (each supplier's offer), per Paragon item (one item, many suppliers), or both? | decides whether price and lead time live on the supplier × item pair |
| C5 | Does the material-request lane become the buyer entry to catalog review, or stay a separate decision record? | today its approval changes nothing downstream |
| C6 | Material identity: substance or specification? | already open as C9 D-1 (escalated to procurement); the catalog inherits the answer |
| C7 | Does the supplier see proposal outcomes and reasons, and may it re-propose after a rejection? | mirrors the `psl` and `supplierDocument` lanes |
| C8 | Which supplier-side data is required at proposal time (specification sheet, certificates, MOQ, lead time, price)? | input to the template (R8) |
| C9 | Who owns the SAP request for a new code, and what is the service level? | the SAP master-data owner; outside the portal |
