# Delivery Agreement + Contract-Compliance Chase — Design Note (v1)

**Version:** v1
**Date:** 2026-07-20
**Status:** DESIGN DIRECTION — canon for the Delivery-Agreement / SDC-5-adjacent pass.
Not a build task. To be turned into a full design pass when the contract /
delivery-planning module is scheduled.
**Owner:** JJ (VP SCM Digital Transformation)
**Authored by:** Claude (Strategist seat)

---

## The decision that fixes the architecture

JJ confirmed: **the delivery cadence is negotiated and fixed between Paragon and
the supplier at contract signing** (weekly / monthly / quarterly), *not* driven by
the rolling forecast each cycle.

Consequence: **delivery-planning is a CHILD of the Contract**, not a reader of the
SDC/forecast loop. The contract owns both the commercial envelope AND the release
calendar. The SDC/forecast loop becomes a *consumer* of that fixed schedule, not
its author.

*(If the cadence had been forecast-driven, the opposite would hold — the contract
would cap the total and the SDC loop would author releases. It is not; the fixed-
cadence answer is what makes delivery-planning a contract child.)*

---

## Object structure

**Contract (header) — exists today, header-level only.**
Fixtures (`src/data/mockContracts.ts`) carry the commercial envelope: `type`
(Supply / Pricing / Framework / …), `value`, `currency`, `paymentTerms`,
`incoterms`, `startDate` / `endDate`, `obligationCount`. Example: `ctr-003`
"PT Berlina PET Bottle Supply 2025-2026", `sup-007` — the same supplier used in
the SDC smoke tests.

**Delivery Agreement (child of Contract) — DOES NOT EXIST YET.**
The fixed release calendar the supplier commits to: material, cadence
(weekly / monthly / quarterly), quantity per release, drawing down an agreed total.
Signed as part of the contract. This is the SAP **scheduling agreement with
delivery schedule lines** — the piece missing from the code. Not present in the
`Contract` type or fixtures today (verified: no quantity envelope, no cadence, no
release/call-off fields).

**Drawdown ledger.**
Each release consumes from the agreed total. At any point: agreed 2M PCS, released
720k, remaining 1.28M, on-track / behind against the fixed calendar. This is where
contract compliance lives.

---

## Why this composes with the existing platform (architectural economy)

No new machinery — three existing systems pointed at one new child object:

1. **Contract module** (exists) — owns the fixed cadence + envelope.
2. **Reminder / chase engine (P3)** (exists) — enforces the calendar.
3. **Channel-agnostic command spine (DEC-COMMS-PRIMARY: WhatsApp / email / WeChat)**
   (exists) — carries the alerts.

The delivery agreement becomes a **cadence generator**: a fixed calendar means the
system knows, in advance and deterministically, *when* the next release is due,
*what quantity*, and *which supplier* — without waiting for any demand signal.

This upgrades the chase engine from **chasing DATA** ("reply to my forecast
request") to **chasing COMMITMENTS** ("honor the calendar you signed"). Materially
more valuable: it enforces contracts, not just collects updates.

---

## The pushy system — three escalating modes

Paragon's system is deliberately pushy with suppliers: full alerts, reminders,
cross-channel communication. The delivery agreement gives it a *signed obligation*
to push against. All three ride the existing channel-agnostic spine.

1. **Ahead of the release — anticipatory nudge.**
   The calendar says a release is due; remind the supplier *before* the date
   (WhatsApp / email / portal). The contract itself is the trigger — no demand
   signal needed.

2. **At non-compliance — the alert.**
   A release date passes without confirmation or shipment; drawdown falls behind
   the agreed calendar. This is a **contract exception** — escalated to buyer AND
   supplier. Not a silent "stale" flag: a missed contracted release is a
   commercial breach, surfaced actively.

3. **On drift — the compliance signal.**
   Cumulative drawdown behind schedule (released 720k when the calendar says 900k
   by now) surfaces as an at-risk contract in the buyer authority view.

**Honest-by-construction:** every alert fires against a *signed, fixed obligation*,
never an inferred one. No fabricated urgency.

---

## Where the compliance view lives

The pushy requirement answers JJ's earlier open question: **both — buyer-
authoritative with a supplier-facing mirror.**

- **Buyer authority view:** all suppliers, drawdown, on-calendar status,
  exceptions. The source of truth.
- **Supplier mirror:** their own calendar, their drawdown, their next due release.
  You cannot run a pushy system that alerts a supplier to a breach they cannot see.
- **Own-facts-only discipline (inherited from SDC):** the supplier sees their own
  contract, never another supplier's.

---

## Where SDC meets the delivery agreement

The forecast loop gains an **authority to validate against**. When SOMO publishes
a release (e.g. 40k PCS this week), it can be checked against the delivery
agreement:
- Is this release on-calendar?
- Within the per-release quantity?
- Does the cumulative drawdown still fit the envelope?

A published line that violates the fixed schedule is a **contract exception** —
surfaced honestly, not silently dispatched. Today SDC publishes demand into a
vacuum; with a delivery agreement it publishes demand *against a commitment*.

---

## Summary shape

```
Contract (header: price, agreed total, validity, incoterms)
    └── Delivery Agreement (child: fixed cadence + qty per release)   ← NEW OBJECT
            ├── generates → obligation calendar (deterministic, forward-known)
            │       └── drives → chase/alert engine (P3) across channels
            ├── tracks → drawdown ledger (agreed vs released vs remaining)
            │       └── surfaces → buyer authority view + supplier mirror
            └── validates → SDC published forecast lines (on-calendar? in-envelope?)
                    └── violation → contract exception (honest, escalated)
```

**One new child object; three existing systems (contract, chase engine, SDC
channels) pointed at it. No new spine.**

---

## Open items for the full design pass (not resolved here)

- The Delivery Agreement object model + schedule-line shape (mirror SAP scheduling
  agreement; S/4HANA is system of record — align field semantics).
- Where the drawdown ledger is computed (contract module authority vs derived seam).
- Exact escalation thresholds / timing for the three pushy modes (policy constants,
  same doctrine as `RESPONSE_DUE_DAYS` / `COVERAGE_AT_RISK_FLOOR`).
- The SDC-validates-against-contract seam — read-only check vs blocking gate.
- Sequencing relative to SDC-4 (live loop) and SDC-5 (chase rules) — this is
  SDC-5-adjacent and should not precede a live SDC loop.

---
**End v1. Design direction captured as canon. Do not forget.**
