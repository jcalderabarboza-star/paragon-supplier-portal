# SDC governance flags

These flags are **registered, not resolved**. They do **not** block the SDC-0
fixture-first build (all seed data is SIMULATED). They **do** gate real-supplier
visibility — the platform's standard two-gate pattern: a capability built and
demoable on SIMULATED data, with a named ratification step before it goes live.

Carried here (and as typed comments in `types.ts`/`fixtures.ts`) so they are not
lost when SDC-1/SDC-2 build the surfaces.

## FLAG-1 — ~~commitmentClass mapping is a policy default~~ **VOID (2026-08-03)**

> **THE `lock → firm` MAPPING IS VOID.** Not "pending ratification" — **withdrawn.**
> Recorded as void rather than as a position this platform holds.
> Authority: [`docs/contracts/C8-forecast-publication.md`](../../../docs/contracts/C8-forecast-publication.md) §2.

**What changed.** SOMO ruled (2026-08-03) that **SOMO emits `lockState` and
`approvalState`; the PORTAL projects `commitmentClass`.** SOMO does not emit the
class. Our shipped `lock → firm` mapping was a unilateral derivation of a
**commercial-liability statement** from a **planning state**, made without
ratification from SOMO, Paragon procurement, or Paragon finance. It is withdrawn
rather than defended, and it is **not** the starting point for the replacement.

**What replaces it — a NAMED OPEN DECISION, explicitly UNRATIFIED.** SOMO's
*proposed* projection (firm = locked · semi-firm = approved-but-unlocked ·
visibility-only = draft or submitted) is recorded in C8 §2.2 as a **proposal**,
pending **named owners in Paragon procurement and finance**. Neither platform has
standing to assert a commercial commitment: SOMO can say what its plan locked; it
cannot say what Paragon will buy.

**Code/contract divergence, knowingly held.** The void mapping and its FLAG-1
comment (`types.ts:23`) are **still present in code** — neutralising them is a
separate, booked code batch, deliberately not bundled with the contract
correction. **Until that batch lands, this file and C8 are the authority and the
code is stale.** Registered as C8-FIND-03 in `docs/findings.md`.

**Why nothing is unsafe in the interim:** FLAG-2 below is sufficient on its own.
All seed publications carry `provenance.liveness = 'SIMULATED'`, so **no real
supplier can see any `firm` badge regardless of how it was projected.**

- Still true and unaffected by the void: the ⭐ allocation fix (addendum §1) — a
  firm-period line requires an approved split (`allocation.approvedBy` /
  `approvedAt`), because the fan-out is **ours**. SOMO ratified that ownership
  (C8 §1), so this reasoning is now *stronger*, not weaker: a `firm` badge on an
  allocated number must carry who approved it, whatever the projection turns out
  to be.

## FLAG-2 — the publication visibility gate

A **SIMULATED publication must never be supplier-visible at all** — publishing to
a real supplier requires LIVE plan data. This is the platform's own two-gate
doctrine applied at the C8 seam.

- **Supplier-facing vocabulary is `commitmentClass`** (firm / semi-firm /
  visibility-only). A supplier must **never** see internal liveness terms
  (`SIMULATED×PLANNED`, `Tier`, etc.).
- All SDC-0 seed publications carry `provenance.liveness = 'SIMULATED'` → by this
  rule they are structurally never supplier-visible. The flip to LIVE rides
  SDC-1's capability registration + a live producer (the proven two-gate op).
