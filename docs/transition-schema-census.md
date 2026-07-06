# Transition-Schema Census — Paper-Fit (v2.2 Step 3.2)

**Basis:** Build Plan v2.2 Step 3.2 · schema authored at Step 3.1
(`src/services/transitions/`). **No code in this step** — this is the paper fit
of the Step 3.1 schema against all 15 machines from the Critical Review v2
Scope-B census. Output: the fit table + the schema gaps to close **before** the
dispatcher (Step 3.4) is built. DR-7 (invoice vocabulary) is adjudicated
chat-side from §5 below.

## The schema being fit (Step 3.1 recap)

A `FlowDefinition` = `{ entity, states[], initial, transitions[], version }`.
A `TransitionDef` = `{ id (t_<entity>_<verb>), from[], to, trigger, requiredRole
(namespaced), requiredFields[], policyHooks[] (registered names), version }`.

- `trigger ∈ {user, system, cascade, creation}`. **`clock` is a compile error**
  (law 0.5 — verified: injecting `clock` fails `tsc` at `schema.ts` the
  `AssertNever` guard). Clock-derived display states are read-time projections,
  never transition members.
- `creation` transitions have empty `from`; all others require ≥1 `from`.
- `states[]` lists **transition-states only**. Expiring / Expired / Overdue /
  Upcoming / Delayed and similar are NOT states here — they are projections.
- Loader: `getKnownFlows()` (seeded with the PO machine at 3.1).

## Reading the fit table

- **Creation-shape** — does the machine need a `creation` transition (entity is
  born inside the portal) vs. arriving already-created from upstream?
- **Cascade** — does a transition here fire from another machine's completion
  (cross-entity fan-out), needing the `cascade` trigger / dispatcher fan-out?
- **Projection** — does the machine carry clock-derived or rollup display states
  that must be COMPUTED at read time, outside the transition table (law 0.5)?
- **Fit** — ✅ fits the schema as-is · ◑ fits with a companion projection/rollup
  (schema unchanged, sibling concern) · ⚠ needs a ruling before build.

---

## Fit table — 15 machines

| # | Machine | States | Trigger classes | Creation-shape | Cascade | Projection | Fit |
|---|---------|:------:|-----------------|:---:|:---:|:---:|:---:|
| 1 | **PurchaseOrder** | 7 | creation, user, system | ✅ buyer issues | ◑ delivery ← GR | daysOverdue | ✅ *(seed flow)* |
| 2 | **Shipment** | 9 | creation, system | ✅ ← PO/ASN | ✅ created by PO confirm | **Delayed** (ETA<clock) | ◑ 8 event-states + `Delayed` projected |
| 3 | **ASN** | 5 | creation, user, system, cascade | ✅ supplier drafts | ✅ Discrepancy ← GR | — | ✅ |
| 4 | **GoodsReceipt** | 7 hdr **+5 +3 nested** | creation, user, system | ✅ ← Shipment/ASN | ✅ raises ASN/PO effects | **header = rollup** of line dispositions; `Posted to SAP` = async `submitted` | ◑ nested sub-flow + rollup |
| 5 | **Invoice** | **17 split** (7+5+5) | creation, user, system | ✅ supplier submits | — | Overdue (both); match-axis | ⚠ **DR-7** |
| 6 | **RFQ + Quotation** | **9 fan-out** (5+4) | creation, user, cascade | ✅ both | ✅ **Award = cascade** (winner Awarded + losers Rejected) | — | ✅ two coupled flows |
| 7 | **Contract** | 6 | creation, user | ✅ | — | **Expiring, Expired** (expiry<clock) | ◑ 4 event-states + 2 projected |
| 8 | **Obligation** | 4 | creation, user | ✅ | — | **Upcoming, Overdue** (window/due vs clock) | ◑ In Progress→Completed is the only true edge |
| 9 | **PurchaseRequisition** | 6 | creation, user, cascade | ✅ | ✅ PO Created / Sourcing Event ← PO/RFQ | — | ✅ |
| 10 | **SupplierDocument** | 5 | creation, user, system | ✅ Awaiting Upload | — | **Valid/Expiring Soon/Expired** (expiry<clock) | ◑ event substrate + clock decay |
| 11 | **Compliance:** ComplianceItem | 5 | user, system | ◑ | — | Valid/Expiring/Expired computed | ◑ *(see §4)* |
| 12 | **Compliance:** ComplianceState (risk row) | 3 | — | — | — | ok/expiring/expired **all** computed | ◑ pure projection |
| 13 | **Compliance:** ScorecardComplianceLevel | 3 | — | — | — | expired/expiring/missing computed | ◑ pure projection |
| 14 | **Compliance:** ProfileCertStatus (storefront) | 5 | user, system | ◑ | — | valid/expiring/expired computed | ◑ *(see §4)* |
| 15 | **Compliance:** SupplierDocumentStatus | 5 | user, system | ◑ | — | (= #10 vocabulary; fragmented copy) | ◑ *(see §4)* |

**State-count reconciliation:** PO 7 · Shipment 9 · ASN 5 · GR 7+5+3 · Invoice
7+5+5=17 · RFQ 5 + Quotation 4 = 9 · Contract 6 · Obligation 4 · PR 6 ·
SupplierDocument 5 · Compliance ×5 vocabularies (5/3/3/5/5). Matches the plan's
census exactly.

---

## Schema gaps found (close BEFORE the dispatcher — 3.4)

The transition **table** shape fits all 15 machines for their *event substrate*.
Every gap below is about a **companion layer**, not a change to `TransitionDef`.
Each has a recommended close so the dispatcher is built against settled ground.

### G1 — Projection layer (7 of 15 machines carry clock-derived states)

Shipment `Delayed`, Contract `Expiring/Expired`, Obligation `Upcoming/Overdue`,
SupplierDocument + all 5 Compliance `Valid/Expiring/Expired`, Invoice `Overdue`,
PO `daysOverdue`. The schema **correctly bans these as triggers** (law 0.5), but
offers no place to *declare* them. They must still be rendered.

- **Recommendation:** projections live in the **read / DTO layer**, NOT in the
  flow definition — keeps the transition schema pure and matches the
  `ComplianceRegistryEntry` DTO-v2 precedent (Step 5.5), where
  `status`/`daysRemaining` become computed-at-read. Do **not** add a
  `computedStates` field to `FlowDefinition`. Close = ratify "projections are a
  read-layer concern" (one line in the decision register).

### G2 — Nested / parallel sub-axes (GR, Invoice)

GR's header status (`Approved` / `Partially Approved` / `Rejected`) is a
**rollup** of per-line `Disposition` (5) × `CheckResult` (3), not an independently
commanded value. Invoice carries a parallel 3-way-**match** axis
(`Matched/Pending GR/Qty Mismatch/Price Variance/Pending`) orthogonal to its
lifecycle.

- **Recommendation:** model the sub-axis as its **own registered flow** (a
  line-item entity) and compute the header/parent state via a **policy-hook
  rollup**, never a hand-maintained parallel field. `Posted to SAP` becomes a
  `system`-triggered async `submitted` command (Step 3.5), which also lands the
  GR-FABRICATION-01 fix. Close = confirm the "sub-flow + rollup-hook" pattern.

### G3 — Persona projection (the acute case → DR-7, §5)

Invoice is one real economic document presented through two persona vocabularies
+ a match axis = 17 states. See §5.

### G4 — Cross-machine cascade / creation coupling

PO→Shipment, PO→ASN, ASN↔Shipment (shared `In Transit`/`Delivered`), Shipment/
ASN→GR, GR→PO delivery, RFQ→Quotation (Award), PR→PO/RFQ. The `creation` and
`cascade` triggers **cover these**, but the **dispatcher must own cross-entity
cascade** (not just intra-flow) — the RFQ Award verb (Step 4) is the proving
ground ("cascade shape, not N hook calls"). No schema change. Close = ensure the
3.4 cascade design is cross-entity from day one.

**Net:** no blocking gap in `TransitionDef`/`FlowDefinition`. Both non-obvious
triggers are validated as necessary — `creation` (9 machines) and `cascade`
(Shipment, ASN, RFQ-Award, PR). The clock ban is validated as correct: 7 of 15
machines would otherwise smuggle a clock state into the table.

---

## §4 — Compliance ×5: the fragmentation, and why it is not 5 machines

Machines 11–15 are **one real-world concept** (a supplier cert / halal-compliance
record) fragmented into 5 incompatible status enums across surfaces
(HALAL-XPERSONA-01). Their **dominant axis is entirely clock-derived**
(`valid → expiring → expired`, law 0.5). The genuine transition substrate is
**tiny and identical** across all five:

```
Missing / Awaiting Upload  ──user:submit──▶  Under Review
Under Review  ──system:verify──▶  Valid        (then clock-projects to Expiring→Expired)
Under Review  ──system:reject──▶  Missing / Awaiting Upload
```

- **Fit:** ONE canonical compliance machine (the substrate above) + a **clock
  projection** for the decay + **surface projections** for the 5 label
  vocabularies. This is exactly the `ComplianceRegistryEntry` DTO-v2 job
  (Step 5.5) and the reconciliation vehicle for HALAL-XPERSONA-01 /
  HALAL-CLOCK-STATE-01 / HALAL-ISSUER-BLIND-01. **No compliance flow is authored
  now** — it lands with the DTO at R2.2; the schema is proven to accommodate it.

---

## §5 — Invoice (DR-7 input) — the paper-fit recommendation

Invoice is 17 states because it is **one economic document** viewed two ways plus
a match sub-axis:

- **Supplier vocabulary (7):** Draft → Pending Approval → Approved → Payment
  Released → Remittance Received · + Disputed branch · + **Overdue (clock)**.
- **Buyer vocabulary (5):** Pending Match → Approved → Payment Released · +
  Disputed branch · + **Overdue (clock)**.
- **Match axis (5):** Matched / Pending GR / Qty Mismatch / Price Variance /
  Pending — **orthogonal** (a 3-way-match sub-state), not lifecycle.

The two persona vocabularies describe the **same underlying lifecycle** at
different granularity; `Overdue` is clock-derived in both (G1); the match axis is
a parallel sub-flow (G2).

**Recommendation to chat (NOT the ruling — DR-7 is chat-adjudicated at 3.3):**

> **Option A — one canonical machine + persona projections (RECOMMENDED).**
> Canonical lifecycle: `Submitted → Matched → Approved → Payment Released →
> Remittance Received` (+ `Disputed` branch). Buyer/supplier labels are
> **projections** of canonical states (persona label maps, Step 3.7 pattern);
> the match axis is a registered sub-flow (G2); `Overdue` is computed (G1).
>
> **Option B — two machines + a mapping.** Duplicates the lifecycle and forces a
> bidirectional buyer↔supplier state map that will drift (the same class of
> cross-persona contradiction HALAL-XPERSONA-01 already demonstrates for
> compliance). Rejected on that precedent.

Option A keeps a single source of lifecycle truth and reuses the same
projection machinery G1/G3/§4 already require. **Awaiting DR-7 ruling before any
invoice verb is templated (plan 3.3 → registered as DR-7, then 3.4+).**

---

## Status

- **3.1 schema:** authored, `tsc` + build + full vitest green, floor 203→224.
- **3.2 census:** this document. **Schema accommodates all 15 machines**; the 4
  gaps are companion-layer decisions (G1 read-layer projections · G2 sub-flow +
  rollup · G3/§5 DR-7 · G4 cross-entity cascade), each with a recommended close.
- **HOLD** for DR-7 adjudication (§5) before 3.4 (dispatcher) opens.
