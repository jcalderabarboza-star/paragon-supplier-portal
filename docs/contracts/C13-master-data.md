# C13 — Master data: the replica of SAP S/4HANA

**Status:** CONTRACT · authored at MD-1 (2026-10-12). The fixture implements it; the feed that fills it from SAP is SE-6.
**Source of truth in the tree:** `src/services/masterData/` (types, store, sync applier, seed, freshness, where-used), `IMasterDataService` in `src/services/data/types.ts`.
**Pinned by:** `src/services/masterData/*.test.ts`, `src/services/data/mock/masterDataService.test.ts`, C1 Axis 1 (the four read methods).

## 1 · The ruling

SAP S/4HANA is the system of record for master data. The portal holds a **replica**: it displays the records, keeps them in sync and (in a later batch) proposes changes. The portal never owns a master record and never mints a key (operator ruling, 12 October 2026).

Three consequences bind every implementation:

1. **One direction.** Master records flow SAP → portal only. No portal verb, page or service writes a replicated field.
2. **SAP wins.** An inbound record replaces the replica record whole. There is no field-level merge.
3. **One writer.** The only code that writes a replica record is the sync applier (`applySyncRun`). `replicaOneWriter.test.ts` derives the writers from source and holds the set.

## 2 · Objects

`MASTER_OBJECTS` is the list. In this build:

| Object | Key (SAP's, opaque) | Replicated fields |
|---|---|---|
| `material` | material number | `description`, `materialType`, `materialGroup`, `baseUnit` |
| `supplier` | business-partner number | `portalSupplierId`, `name`, `legalName`, `country`, `city`, `taxId`, `businessRegNo`, `paymentTerm`, `incoterm`, `incotermPlace` |
| reference tables: `unit`, `materialType`, `materialGroup`, `incoterm`, `paymentTerm`, `currency`, `country`, `plant`, `storageLocation`, `costCentre`, `brand` | the code | `text`, and `attributes` from the closed set `dimension`, `days`, `city`, `plant` |

- **The key is opaque.** Nothing parses a material number or a business-partner number (C9 §3).
- **`portalSupplierId`** is the id the portal's documents and seats name. It is a pointer held on the record; SAP's key is the business-partner number.
- **The incoterm and its place are two fields**, as SAP holds them.
- **Not replicated:** performance figures, bank details, halal and BPOM rulings, certificates, preferred-supplier standing. The last four are portal-owned annotations with their own writers.
- **`brand`** is the Paragon brand list exactly as ruled (`src/data/paragonBrands.ts`), under its own codes.
- **Units and material types are closed unions in code** (`Uom`, `MaterialType`), because arithmetic and refusals depend on them. The `unit` and `materialType` tables must stay inside those unions (§5).

## 3 · The record and its stamp

```ts
interface MasterRecord<O> { object: O; key: string; data: MasterDataByObject[O]; stamp: ReplicaStamp }

interface ReplicaStamp {
  source: 'SAP_S4' | 'SAMPLE';
  readAt: string;                 // ISO instant the replica last took the record from the source
  sourceChangedAt: string | null; // SAP's own change time, when the feed carries it
  syncRun: string;                // the run that delivered this version
  sapStatus: 'ACTIVE' | 'BLOCKED' | 'FLAGGED_FOR_DELETION';
  missingFromRun: string | null;  // the full run that did not carry this record
}
```

- **Every record carries a stamp, and every surface that shows a record shows it** (`ReplicaStampLine`).
- **`SAMPLE` is never shown as SAP.** Every record in the fixture is `SAMPLE`. A record becomes `SAP_S4` only by arriving in a run whose source is SAP.
- **Freshness is computed, never stored.** `freshnessOf(stamp, object, now)` answers `FRESH`, `STALE` or `NOT_IN_LAST_RUN`. The maximum age is 24 hours for materials and suppliers and 7 days for reference tables; both figures are placeholders until the feed's cadence is known. A stale record **warns and does not refuse**.
- **Liveness is derived from the source** (`livenessOfStamp`): `SAMPLE` is SIMULATED, `SAP_S4` is LIVE. It is not a stored field.

## 4 · A sync run

```ts
interface InboundRun {
  id: string;                     // the idempotency key
  source: 'SAP_S4' | 'SAMPLE';
  at: string;                     // becomes readAt on every record the run delivers
  mode: 'FULL' | 'DELTA';
  objects: MasterObject[];        // what a FULL run covers
  records: InboundRecord[];       // { object, key, data, sapStatus?, sourceChangedAt? }
}
```

`applySyncRun(run)` returns the run's log row and obeys these rules:

| Rule | Behaviour |
|---|---|
| **Idempotent** | a run id already in the log changes nothing and returns the logged row |
| **Whole-record replace** | an inbound record that differs replaces the replica record; the previous version is kept in the log row (`replaced`) |
| **Unchanged** | an inbound record equal to the replica's keeps its `syncRun` and takes the run's `readAt` |
| **Missing is marked, never deleted** | a `FULL` run marks each record of a covered object that it did not carry (`missingFromRun`). A `DELTA` run marks nothing. Only SAP's own deletion flag retires a record |
| **A refused record is in the run** | it is not marked missing, and the replica keeps the version it had |
| **A returning record** | arriving again clears `missingFromRun` |

The log (`SyncRun`) is append-only: `id`, `source`, `at`, `mode`, `objects`, `created`, `changed`, `unchanged`, `missing`, `refused`, `replaced`.

## 5 · Refusals

An inbound record the replica cannot hold is refused **by name**, written into the run's log row with the value as the run carried it, and never coerced.

| Reason | When | Reader's sentence (EN; ID in `masterData.refusal.*`) |
|---|---|---|
| `UNKNOWN_OBJECT` | the record names an object outside `MASTER_OBJECTS` | The run names an object the replica does not hold. |
| `EMPTY_KEY` | the key is absent or blank | The record has no key. |
| `UNKNOWN_UNIT` | a material's `baseUnit`, or a `unit` table key, is outside the `Uom` union | The unit is not one the portal can calculate with. |
| `UNKNOWN_MATERIAL_TYPE` | a material's `materialType`, or a `materialType` table key, is outside the `MaterialType` union | The material type is not one the portal holds. |
| `MALFORMED_RECORD` | a required field is absent or of the wrong type | The record is missing a field the replica requires. |

A unit is refused rather than defaulted because a unit has arithmetic consequences (the `D-OPS-MASTERMISS` ruling). Widening the union is a code change, made deliberately.

## 6 · The read seam

`IMasterDataService` (C1 Axis 1), read only:

| Method | Returns |
|---|---|
| `list(scope, object)` | every record of the object the scope may read |
| `get(scope, object, key)` | the record, or `null` |
| `whereUsed(scope, object, key)` | documents and records that name the key, counted by kind; `null` when the key is not in the replica |
| `syncLog(scope)` | the log, newest run first |

**Tenancy.**

- A buyer reads everything.
- A supplier reads its **own** supplier record and the reference tables. Another supplier's key answers `null`, exactly as an absent key does: the answer is not an existence oracle (C11 V2).
- Materials, where-used and the sync log are refused `SCOPE_DENIED` to a supplier **for the whole object**, never per key.

## 7 · One truth: how the rest of the tree reads (MD-2)

- **A material resolves through one lookup, and the lookup reads the replica.** `labelOf`, `uomOf`, `requireUom`, `isKnownMaterial`, `bpomOf` and `halalOf` default their master to `materialMasterView()`: SAP's fields from the replica, with the two portal annotations (halal and BPOM applicability) beside them. A material a run delivers is known to every lookup when the run is applied. One the fixture has no annotation for reads `UNDETERMINED` on both until Compliance rules it.
- **The three outcomes are unchanged:** refuse on the write path (`UNKNOWN_MATERIAL`), a dash on display, a throw at author time.
- **Reference values have a synchronous lookup** (`services/masterData/lookup.ts`): `referenceText`, `isKnownReference`, `referenceOptions`, `supplierOf`. A key the table does not hold answers `null`; no text is invented.
- **A form's picker reads its reference table** (`pages-v2/master-data/referencePickers.ts`): incoterms, payment terms, receiving locations, cost centres. A value flagged for deletion in SAP is not offered for new work and stays on the documents that carry it. Incoterm and cost centre store the key; payment term and receiving location store the text, as the documents they write do today.
- **A gate holds it** (`src/lib/masterDataGate/`): the files that import the material or supplier fixture directly, and the option lists that still stand for a value with a reference table, are each a named list held equal to the tree. Each can only shrink.

Not yet turned round, and named in the gate: the readers of the supplier fixture, the planning fixture's generated sample materials and suppliers (still resolved by `planning/publishedMaterial.ts`), the unit lists on the requisition and sourcing forms, and the category vocabularies.

## 8 · What the fixture does, and what the SE Team builds

| Part | Fixture | SE work |
|---|---|---|
| Records | one seed run, built from the material and supplier fixtures and the values the forms already use; stamped `SAMPLE` | records from S/4HANA, stamped `SAP_S4` (SE-6) |
| Reference codes | sample codes for payment terms, plants, storage locations and cost centres | SAP's own keys |
| Sync | the seed, applied on first read | initial load, change events, a periodic full reconciliation |
| Store and log | in memory | durable (SE-4) |
| Search and paging | in the page, over the whole list | server-side when volumes are real |

Not in this contract and not built: purchasing info records and source lists, supplier × material views, indirect materials and services as a class, the supplier's own read of the materials it is party to, and change requests. Change requests and the hand-off to SAP are specified when they are built.
