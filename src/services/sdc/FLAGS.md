# SDC governance flags

These flags are **registered, not resolved**. They do **not** block the SDC-0
fixture-first build (all seed data is SIMULATED). They **do** gate real-supplier
visibility — the platform's standard two-gate pattern: a capability built and
demoable on SIMULATED data, with a named ratification step before it goes live.

Carried here (and as typed comments in `types.ts`/`fixtures.ts`) so they are not
lost when SDC-1/SDC-2 build the surfaces.

## FLAG-1 — commitmentClass mapping is a policy default pending ratification

`lock → firm ("will be taken")` derives a **commercial-liability statement** from
a **planning state**. An S&OP freeze means the plan won't change; it is not by
itself a purchase commitment. The derivation is the right mechanism, but
**procurement + finance must ratify** the `lock → firm` mapping before any real
supplier sees a `firm` badge.

- **Non-blocking now:** build on SIMULATED data.
- **Blocking gate:** real-supplier `firm` visibility waits on the sign-off.
- Reinforced by the ⭐ allocation fix (addendum §1): a firm-period line already
  requires an approved split (`allocation.approvedBy`/`approvedAt`) — the fan-out
  is ours, so a `firm` badge on an allocated number must carry who approved it.

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
