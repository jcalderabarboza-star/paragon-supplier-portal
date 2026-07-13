# C4 — Snowflake (clean-data layer)

> ## ⚠️ TIER: **SPEC** — zero code today
>
> This component describes **target architecture the SE-Team realizes**. There is **no
> Snowflake code, client, connection, or schema in the repository** — grep-confirmed
> (`snowflake` / `Snowflake`: zero matches across `src/`). It appears in this package **only as a
> pointer** to what gets built. **Do not read any part of this file as an existing seam.** This is
> the moat claim; it must not read LIVE.

Source of forward intent: the benchmarking report (`docs/Benchmarking the 2026 Procurement
Platform Frontier…`) and the Strategic Spine (`docs/Paragon_Platform_Strategic_Spine_v1.md`);
Stage-F sequencing = **F3 (Snowflake + data-quality prerequisites)**, after F1 (real backend
core) and F2 (S/4HANA event seam).

---

## Why it is the moat (the claim)

Per the benchmarking report, the durable advantage is not any single screen — it is a **governed,
clean data layer** that every downstream capability (Stage-I intelligence: spend classification,
should-cost, risk/compliance, 3-way match; Stage-A agents) reads from. The portal's job in Stage
F is to become a **truthful event source** feeding that layer; Snowflake is where those events and
entities land, are conformed, and are made query-ready for analytics and ML.

The claim is credible **only because** the contract already enforces the disciplines a clean data
layer requires — but those disciplines living in code today is **C2/C3 (LIVE)**, not this file.
C4 is what consumes them.

---

## What already feeds it (LIVE upstream → SPEC sink)

The SE-Team does not start from raw fixtures. Three **LIVE** contract properties are the clean
inputs the SPEC Snowflake layer conforms:

1. **One canonical event shape (C3, DR-10).** `TransitionEvent` is emitted on every outcome with
   `correlationId` / `causationId` grouping. This is the natural **event stream** into a
   warehouse — a durable `AuditSink` (RESERVED, C3) is the seam that would tee events to it.
2. **Computed-never-stored clock values (C2, law 0.5).** Clock-derived states are read-time
   projections, so warehouse rows carry the honest **event-state + dates**, not drifting stored
   literals — the data quality a warehouse depends on is a contract invariant, not a cleanup job.
   *(Caveat: F0.4-FIND-01 fixtures still store clock literals — OPEN; the DTO-v2 layer closes it
   before it would pollute the warehouse.)*
3. **One canonical entity per document (C2, DR-7).** The invoice is ONE row projected per persona,
   not two hand-maintained copies — no cross-persona contradiction reaches the warehouse.

---

## Target architecture (SPEC — SE-Team realizes)

The following is **build intent**, sequenced at **Stage-F F3**. None of it exists in code.

- **Ingestion seam** — the durable `AuditSink` (C3, RESERVED) tees the `TransitionEvent` stream to
  the warehouse alongside the Phase-F2 S/4HANA Event Mesh + OData feeds. Portal-side and SAP-side
  events conform to one taxonomy.
- **Conformed entity layer** — the DTO-v2 read projections (C2) define the conformed shapes;
  Snowflake materializes them as query-ready tables/views.
- **Data-quality prerequisites** — the law-0.5 / DR-7 invariants become warehouse-side tests
  (the in-floor vitest contracts — scoping, honest-state, cross-persona invariant — are the
  design precedent the warehouse suite mirrors).
- **Downstream consumers** — Stage-I intelligence and Stage-A agents read from the conformed
  layer, never from the transactional portal store.

---

## Contract status summary

| Element | Tier |
|---|---|
| Snowflake client / connection / schema | **SPEC** — zero code |
| Ingestion seam (durable `AuditSink` → warehouse) | `AuditSink` interface is **RESERVED** (C3); the warehouse tee is **SPEC** |
| Conformed entity layer (DTO-v2 materialized) | **SPEC** (invoice projection pattern is LIVE, C2; warehouse materialization is SPEC) |
| Data-quality suite | **SPEC** (in-floor vitest invariants are the LIVE design precedent) |

The SE-Team builds C4. The contract's job (C1–C3, C5) is to make sure that when they do, the
inputs are already clean by construction — so the moat is realizable, not aspirational. But
**realizable ≠ built.** Today: SPEC.
