# Delivery Agreement Module — Design Spec (v1)

**Version:** v1 (full design pass — buildable spec)
**Date:** 2026-07-20
**Predecessor:** Delivery_Agreement_and_Contract_Compliance_Chase_Design_Note_v1 (the direction note)
**Status:** DESIGN COMPLETE — buildable spec. Precedes SDC-5 (chase rules) build.
**Owner:** JJ (VP SCM Digital Transformation)
**Authored by:** Claude (Strategist seat), with JJ, in a live design pass.

> This spec turns the captured design *direction* into a buildable *specification*,
> aligned to how SAP S/4HANA scheduling agreements actually work (verified against
> SAP documentation, not assumed). It is not a build task yet — it is the spec the
> contract/delivery-planning module and SDC-5 chase rules build against.

---

## Foundational premise (verified against code)

The `Contract` object (`src/data/mockContracts.ts`) is a **pure header** today:
commercial envelope (`value`, `currency: 'IDR'`, `paymentTerms`, `incoterms`),
validity, signing, coarse `obligationCount`/`obligationsMet`. It carries **no
material, quantity, cadence, or schedule**. The Delivery Agreement is therefore a
genuinely NEW child object — nothing to retrofit.

SAP is the system of record. The design mirrors SAP's scheduling-agreement model
so the eventual S/4HANA integration is a one-to-one map, not a translation.

---

## How SAP works (verified — the model we align to)

A SAP S/4HANA scheduling agreement is a three-level document:
- **Scheduling Agreement** — header document, SAP-assigned number. Doc types:
  - **LP** — without release documentation: schedule lines are transmitted to the
    vendor the moment they're saved; rigid, not freely changeable.
  - **LPA** — WITH release documentation: schedule lines have *internal character*
    (adjustable in any way, NOT transmitted to vendor), until you **explicitly
    create a release**. **This is the model we use** — because JJ requires releases
    to be individually adjustable after generation, which is LPA-only.
- **Item** (10, 20, 30…) — one per material. = our `lineSeq`.
- **Schedule line** — dated release rows under an item. = our `releaseSeq`.
- **Goods Receipt** validates against the schedule line; GR is restricted to
  scheduled quantities per date (with over/under-delivery tolerance). With a
  confirmation control key, the ASN/shipping-notification quantities default the GR.

Release types (LPA, both supported):
- **FRC (Forecast)** — medium/long-term horizon of requirements.
- **JIT (Just-in-Time)** — short-term, hard near-term delivery dates.

Modern S/4HANA exposes the *Manage Purchase Scheduling Agreements* Fiori app +
graphical contract-consumption/compliance views — i.e. SAP already has a drawdown/
compliance view. The portal's job is a BETTER, supplier-facing, PUSHY front end
over the same LPA model (build-over-buy thesis), not a duplicate.

---

## Object model (locked — SAP LPA-shaped)

```
Contract (SAP, header — exists today)
  └── SchedulingAgreement (SAP LPA, plant-specific, SAP-assigned number)   [Decision 1: one per contract]
        └── Item (SAP item 10/20/30 = lineSeq, SAP-assigned — one per material)
              ├── materialCode, uom, agreedTotalQty (envelope), cadence, qtyPerRelease
              ├── drawdownPolicy                                            [Decision 4]
              │     ├── contractDefault { tolerancePct, enforcement }  (seeded @ signing, immutable ref)
              │     └── active          { tolerancePct, enforcement }  (operator-adjustable; change carries who/when/why)
              │        presets: Case B { 10%, flag }   ·   Case C { unlimited, ignore }
              ├── DrawdownLedger: agreed / released / delivered / remaining / exceptions[]
              │        · exception logic reads ACTIVE policy
              │        · view shows BOTH active + contractDefault; flags deviation
              │        · VIEW GUARD: policy mode always visible — a Case C total reads
              │          "reference envelope, not enforced" (honesty pill discipline)
              └── ScheduleLine[] (dated = releaseSeq, internal-character, ADJUSTABLE)  [Decisions 2,3]
                    ├── releaseRef  (chains contract→agreement→item→line; SAP-OWNED identity)
                    ├── releaseType: FRC | JIT   → maps to existing commitmentClass (semi-firm | firm)
                    ├── state: draft(internal) → released(transmitted to vendor) → fulfilled | late | missed
                    ├── releaseDate, plannedQty, actualQty?, fulfilledDate?
                    └── fulfilledBy: ASN/confirmation → GR   (hybrid match: inferred + visible override)
```

### Decision log (the reasoning behind each lock)

- **D1 — Grain:** Delivery Agreement is a CHILD of Contract holding many schedule
  lines (one document, many material items). Matches SAP; gives one per-contract
  commitments view; drawdown grouped per item. *(Cadence negotiated per-contract,
  all materials together at signing.)*
- **D2 — Calendar storage:** MATERIALIZED dated release rows (not a rule computed
  on the fly), because per-release compliance status needs a place to live and
  releases must be individually adjustable. Cadence + qtyPerRelease is the
  GENERATOR at signing; the stored truth is the dated ledger. = SAP LPA.
- **D3 — Release lifecycle + fulfillment match:** draft(internal) → released →
  fulfilled/late/missed. The `draft→released` step is SAP's LPA internal-character
  → explicit-release; **the chase engine only pushes on RELEASED lines** (you can't
  chase a commitment you haven't transmitted). Fulfillment = the existing SDC
  ASN/IncomingShipment drawing down a release. Match is HYBRID: inferred by
  material+date+qty proximity, but SHOWN and correctable (honesty gate, same as the
  XLSX column-mapping gate). Maps to SAP confirmation-control → GR.
- **D3.5 — Reference/identity + sync:** SAP OWNS identity; the portal CARRIES it.
  **Pattern B (portal-first, SAP assigns back):** Procurement drafts the agreement
  in the portal (internal-character lines — SAP supports this), posts to SAP via
  OData; SAP assigns the agreement number + item numbers (lineSeq) + returns them;
  the portal binds them; the release calendar (releaseSeq) maps to SAP schedule
  lines on the release step. `releaseRef` chains contract→agreement→item→release so
  Procurement & Finance trace any delivery→release→agreement→contract both
  directions. The SAP `draft→released` lifecycle IS the reconciliation state (a
  portal line without a SAP number is visibly a draft, never a real agreement).
- **D4 — Drawdown policy:** ONE tolerance mechanism with two knobs (tolerancePct,
  enforcement: block|flag|ignore). Case B (soft envelope, flag over tolerance) and
  Case C (reference-only, unenforced) are two PRESETS of one policy — not two code
  paths. Per-ITEM (one agreement can hold a governed + a loose material). Contract
  seeds the default per line; the ACTIVE policy is operator-adjustable along the
  way (change carries who/when/why); contractDefault stays as immutable audit
  reference. Mirrors SAP over/under-delivery tolerance + central-contract
  condition inheritance. Shares the SDC-4e tolerance-constant idiom.

---

## The pushy chase engine (3 modes × 2 release types)

The delivery agreement upgrades the existing chase engine (P3) from chasing DATA
to chasing COMMITMENTS. It reads release `state` + `releaseType`/`commitmentClass`
and pushes across the existing channel-agnostic spine (DEC-COMMS-PRIMARY:
WhatsApp / email / WeChat). It only ever pushes on **released** lines.

| Mode | FRC (semi-firm) | JIT (firm) |
|---|---|---|
| **Anticipatory nudge** (ahead of release) | gentle/early — "here's your quarter" | firm/dated — "deliver X on DATE" |
| **Non-compliance alert** (at miss) | soft "coverage gap" flag | HARD — missed date = commercial breach, escalated to buyer + supplier |
| **Drift signal** (cumulative) | primary — forecast horizon behind | rolls JIT misses into the drift rollup |

Honest-by-construction: escalate hardest on the firm (JIT) commitment; inform-not-
punish on the forecast (FRC) horizon. Maps onto the SDC `commitmentClass` that
already exists (firm / semi-firm / visibility-only) — no new taxonomy.

---

## The SDC validation seam (Decision 5)

ONE join extended — not a new subsystem. Today `supplierCoverageEntries`
(`consolidation.ts`) joins demand (forecast) ⟷ supply (declarations + shipments).
The agreement adds a THIRD input: the contracted release calendar.

**Validation 1 — Fulfillment compliance (backward, HARD, core):**
released schedule line ⟷ the ASN/GR that drew it down → was this contracted
release delivered, on time, in quantity? Drives the chase engine's drift/breach
escalation. This is the reason the agreement exists.

**Validation 2 — Forecast-vs-contract coherence (forward, CONFIGURABLE signal):**
SOMO published forecast line ⟷ contracted release envelope + cadence → is
Paragon's OWN demand on-calendar and in-envelope vs what it contracted? Catches
Paragon-side incoherence (forecasting above contract) as an honest exception.
ADVISORY or ENFORCING per item (same tolerance-policy idiom), because legitimate
over-forecast exists (planned volume increase, renegotiation pending).

---

## Compliance view placement

**Both — buyer-authoritative + supplier-facing mirror** (own-facts-only):
- Buyer authority view: all suppliers, drawdown, on-calendar status, exceptions.
- Supplier mirror: own calendar, own drawdown, own next-due release. A pushy
  system cannot alert a supplier to a breach they can't see.
- Same own-facts-only discipline as the SDC loop; supplier sees own contract only.

---

## Honesty guards (must hold in build)

1. Chase pushes only on RELEASED lines (never on internal drafts).
2. Fulfillment match is SHOWN and correctable, never silently assumed.
3. Drawdown policy MODE is always visible; a Case C total reads "reference, not
   enforced" — never looks like a governed commitment to Finance/Procurement.
4. A policy change from contractDefault is a visible deviation, attributable
   (who/when/why).
5. A portal object without a SAP number is a visible DRAFT, never a real agreement.
6. SAP owns identity; the portal never mints competing numbers.

---

## Open items for build scheduling (not resolved here)

- Concrete TypeScript interfaces (SchedulingAgreement / Item / ScheduleLine /
  DrawdownLedger / DrawdownPolicy) + fixtures, mirroring the SDC object style.
- The OData/Event Mesh contract for Pattern B post-and-bind (draft→post→SAP
  numbers returned→bind). Backend-adjacent; needs the SAP integration lane.
- Exact default tolerance presets + where the named policy constants live
  (mirror consolidation.ts RESPONSE_DUE_DAYS / COVERAGE_AT_RISK_FLOOR).
- Sequencing vs SDC-5: this spec DEFINES the chase engine's scope, so SDC-5 chase
  rules should build against THIS, not the data-only model. Delivery Agreement
  object model likely lands before/with SDC-5.
- Must not precede a live SDC loop — which now EXISTS (SDC-4 complete).

---
**End v1 design spec. Buildable. This defines the chase engine's real scope;
SDC-5 builds against it.**
