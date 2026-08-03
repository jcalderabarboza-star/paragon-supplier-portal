# C8 — Forecast publication

The **forecast-publication seam**: the rolling, pre-acceptance plan Paragon shares with suppliers
for confirmation, and the supplier's confirmation flowing back for SOMO's replan. Sibling to
[C7](./C7-pr-intake.md) — same honesty vocabulary, **different grain and lifecycle**.

- **C8** — SOMO's planning horizon → our supplier-facing publication → supplier confirms →
  response written back to the commons. *Visibility and collaboration.*
- **C7** — SOMO's *accepted* decision → our PR chain → RFQ → PO. *Execution.*

A forecast line may later firm into a C7 requirement, but that is a state transition on SOMO's
side (plan → accepted), not the same seam.

**Status:** CONTRACT · **first issue, 2026-08-03**, generated from code-truth at `main` #157
(`063adca`) · additive, docs-only. Supersedes `docs/C8_Forecast_Publication_Seam_Proposal.md`
(2026-07-16), which was a **proposal, never ratified**. Carries SOMO's rulings of 2026-08-03 as
**ratified** where marked, and one item as **explicitly UNRATIFIED** (§2).

**Grounding (real sources):**
- the shipped SDC model — `src/services/sdc/types.ts` (cited `file:line`);
- the shipped fixtures + integrity suite — `src/services/sdc/fixtures.ts`,
  `src/services/sdc/__tests__/sdc.integrity.test.ts`;
- the converged design — `docs/Supplier_Data_Collaboration_Design_v2.md`;
- the schema freeze — `docs/SDC-0_Build_Freeze_Addendum.md`;
- C6 planning doctrine + C7 vocabulary — `docs/contracts/C6-planning.md`, `./C7-pr-intake.md`.

---

## Why this document exists, and why it did not before

C8 had **no contract file**. It existed only as an unratified proposal sent to SOMO on
2026-07-16, ending *"Please confirm the grain and rule on `commitmentClass` + GG-3′/7/8"*. In the
interval, **the code kept building** — and built past the proposal: a required `allocation`
object, a closed `Uom` union, a per-line `provenance`, and a shipped `commitmentClass` mapping,
none of which the document SOMO held described.

This is the **same process gap** named at the top of C7, in its sharpest form. A CP-1 audit found
eleven doc-vs-code divergences across the two seams and **every one ran the same direction: the
documents understated the implementation.** Eleven errors sharing a direction are one systematic
cause, not eleven drafting mistakes.

**The cause.** Contracts were generated once, by harvest from code at a fixed commit, and then
never re-harvested while the code moved. There is no re-run trigger and **no build step fails
when a contract statement stops being true** — the documents are not on the floor, so they cannot
regress a test. Frozen documents describing a live implementation can only drift one way: toward
understating what exists. The asymmetry is the diagnostic; a random drafting error would
overstate as often as understate, and none of these did.

**On C8 the gap took its worst form:** not a stale document, but *no document at all*, with a
shape hardening in code and a peer platform holding a proposal that had already been overtaken.
Two of the three items SOMO ruled on this week were things our code had already decided
unilaterally (§1, §2).

**The correction.** Itemised at §7. Where code and doc disagreed, **the code is truth and the doc
is corrected** — except where the divergence is a real defect, which is recorded as a defect.

---

## Honesty tiers (C-package legend, applied)

| Tier | Meaning |
|---|---|
| **LIVE** | Code exists and runs — mock / in-memory implementation shipped. |
| **RESERVED** | Named seam with a defined swap-point, no implementation. Landing it is additive. |
| **SPEC** | Build target. **Zero code today.** |

Seam tiers at a glance:

| Surface | Tier | Evidence |
|---|---|---|
| The SDC object model + fixtures + invariants | **LIVE (mock)** | `sdc/types.ts`, `sdc/fixtures.ts`, `sdc.integrity.test.ts` |
| `RequirementResponse` submit / acknowledge | **LIVE (mock)** — a wired `CommandTarget` | `MockCommandService.ts:984` |
| `forecastPublications` capability render | **SIMULATED** — gate-1 LIVE, **gate-2 shut** | `registry.ts:116` + harvest gate `:159-162` |
| **SOMO's inbound emission (the C8 producer)** | **SPEC — zero code, and NOT MODELLED** | §1.2 |
| Supplier-response feedback → Snowflake commons | **SPEC** | C4 is SPEC, zero code |

**The publication a supplier sees today is a frozen fixture, not a SOMO feed.** The UI says so in
both languages: *"Sample — awaiting SOMO C8 feed"* / *"Sampel — menunggu feed data C8 SOMO"*
(`i18n/widget.ts:28,111`). Green is structurally unreachable until a live producer lands
(LIVENESS-DATASOURCE-01).

---

## 1. Fan-out — the portal owns allocation (**RATIFIED**, SOMO 2026-08-03)

**Ruling: the PORTAL owns allocation. SOMO emits a MATERIAL × PERIOD TOTAL and holds NO vendor
entity of any kind — no supplier master, no positions, no sourcing shares.**

SOMO's rationale, carried verbatim because the reason is the load-bearing part:

> A per-supplier emitter would require SOMO to invent an allocation it cannot compute, and a
> fabricated split would arrive at our intake wearing the authority of a plan.

This is the **same boundary both platforms reached independently, twice before**: SOMO emits
requirements / S4 MRP creates PRs; SOMO sets scarcity priority / aATP executes plant assignment.
The third instance is the confirming one — the line is not a negotiated compromise, it is where
the data ownership actually falls.

### 1.1 What this strikes, and what it keeps

**STRUCK — `ForecastLine.supplier` from the SOMO emission.** The 2026-07-16 proposal defined
`supplier ← the supplier/distributor this line is published to` as a field SOMO emits. **SOMO
emits no such field and holds no entity that could populate it.** Struck from the contract.

**KEPT — `Allocation.materialPeriodTotal`**, described as *the SOMO-committed total the line was
split from* (`sdc/types.ts:115`). It stays precisely because it **keeps SOMO's number auditable
through our fan-out**: every fanned line carries the total it came from, so the split can always
be checked back against what SOMO actually committed. Enforced, not merely asserted — integrity
invariant #4 requires Σ fanned `forecastQty` ≤ `materialPeriodTotal`, with the total shared
across every line in a material×period group (`sdc.integrity.test.ts:105-121`).

> **This is not a contradiction, and the distinction must survive into SOMO's build.**
> `ForecastLine.supplierId` **exists and is required** in our code (`sdc/types.ts:129`) — because
> our `ForecastLine` is a **post-fan-out** object. SOMO's **pre-fan-out emission** carries no
> supplier. Same word, two lifecycle positions. Conform to §1.2, not to `ForecastLine`.

### 1.2 The SOMO emission shape (**SPEC — and not modelled in code today**)

Stated honestly: **there is no type in the tree representing what SOMO emits.** Grep-confirmed —
no `PlanTotal`, no inbound-plan type; the only residue of SOMO's number is
`Allocation.materialPeriodTotal` (`sdc/types.ts:115`), which exists on our post-fan-out line.

The emission we ask SOMO to conform to:

```
SomoPlanEmission                (SPEC — the pre-fan-out publication)
  planVersion                   ← SOMO's plan version this snapshot came from
  publishedAt                   ← as-of timestamp
  horizon: [ periodBucket ]     ← rolling multi-period buckets
  totals: [ MaterialPeriodTotal ]

MaterialPeriodTotal             (SPEC — one material × periodBucket. NO supplier.)
  materialCode                  ← see §4 — NOT canonical S/4 today
  periodBucket                  ← bucket-native, never a resolved date (GG-3′)
  totalQty
  uom
  lockState                     ← §2 — SOMO emits state, not class
  approvalState                 ← §2
  segment?                      ← read-only planning annotation
  suggestedSource?              ← read-only recommend-first lane annotation
```

`segment` / `suggestedSource` reuse C7's names and semantics exactly (`sdc/types.ts:137-138`;
note C7's lane-field name drift, C7 D-7 — `suggestedSource` carries **lane** semantics on both
seams, consistently).

### 1.3 Our post-fan-out line (**LIVE on fixtures**) — `ForecastLine`

`src/services/sdc/types.ts:127-141`. This is ours; SOMO does not emit it.

| Field | Type | Opt | `file:line` |
|---|---|---|---|
| `materialCode` | `string` | req | `:128` |
| `supplierId` | `string` | req | `:129` — **added by our fan-out** |
| `periodBucket` | `string` | req | `:130` |
| `forecastQty` | `number` | req | `:131` |
| `uom` | `Uom` = `'KG' \| 'PCS' \| 'L' \| 'ROLL'` | req | `:133`, `:71` |
| `commitmentClass` | `'firm' \| 'semi-firm' \| 'visibility-only'` | req | `:134`, `:101` — **projected by us**, §2 |
| `allocation` | `Allocation` | **req** | `:135` |
| `segment` | `string` | opt | `:137` |
| `suggestedSource` | `string` | opt | `:138` |
| `provenance` | `Provenance` | req | `:140` |

**`Allocation`** (`:113-120`) — required, and absent from the proposal SOMO received:

| Field | Type | Opt | Note |
|---|---|---|---|
| `materialPeriodTotal` | `number` | req | the SOMO-committed total this line was split from |
| `basis` | `'planner-split' \| 'quota' \| 'award-history'` | req | **how** the split derived |
| `approvedBy` | `string` | opt in type | **required in practice for firm lines** — invariant #3 |
| `approvedAt` | `string` | opt in type | idem (`sdc.integrity.test.ts:95-99`) |

`allocation` is the direct structural consequence of §1: because the fan-out is ours, a `firm`
badge on an allocated number claims more than SOMO's lock supports **unless** it carries how the
split derived and who approved it.

**`ForecastPublication`** (`:148-156`): `publicationId`, `planVersion`, `publishedAt`,
`horizon: readonly string[]`, `lines`, `provenance`.
**`Provenance`** (`:60-66`): `source: 'SOMO' | 'SUPPLIER'`, `liveness: Tier`, `planState`.

---

## 2. `commitmentClass` — SOMO emits state, the portal projects the class

**RATIFIED (SOMO 2026-08-03): SOMO emits `lockState` and `approvalState`. THE PORTAL PROJECTS
THE CLASS.** SOMO does not emit `commitmentClass`; it emits the planning states from which a
class can be derived, and the derivation — which is a commercial statement, not a planning one —
is ours to make and ours to own.

### 2.1 Our shipped `locked → firm` mapping is **VOID**, effective now

The portal shipped a `lock → firm` mapping as a policy default (`sdc/FLAGS.md`, FLAG-1;
`sdc/types.ts:23`). **It is recorded here as VOID, not as a position we hold.** It was a
unilateral derivation of a commercial-liability statement from a planning state, made without
ratification from SOMO, Paragon procurement, or Paragon finance. It is withdrawn rather than
defended, and it is not the starting point for the decision below.

`sdc/FLAGS.md` is neutralised accordingly in this PR (docs only). **The code comment it describes
(`sdc/types.ts:23`) and any mapping logic are NOT touched here** — that is a separate, booked
code batch. Until that batch lands, the mapping remains present in code while void in contract;
this document is the authority, and the divergence is registered §7.

### 2.2 The projection — a **NAMED OPEN DECISION, explicitly UNRATIFIED**

SOMO's proposed projection, recorded as a proposal and **not** as agreed:

| `commitmentClass` | proposed projection from SOMO's states |
|---|---|
| `firm` | `lockState` = locked |
| `semi-firm` | approved but unlocked |
| `visibility-only` | draft or submitted |

**STATUS: UNRATIFIED. Pending named owners in Paragon procurement and Paragon finance.**

**Neither platform has standing to assert a commercial commitment.** SOMO can say what its plan
locked; it cannot say what Paragon will buy. The portal can render a badge; it cannot decide what
the badge obligates. `firm` is the field on which a supplier builds stock and on which dead-stock
liability disputes are decided — so the mapping is a **business ratification**, and it stays open
until named humans in procurement and finance own it. Recording SOMO's proposal here is how the
decision stays visible; adopting it silently is how the first mapping became void.

**Until ratification:** FLAG-2 holds unchanged and is sufficient — a SIMULATED publication is
**never supplier-visible** (`sdc/FLAGS.md`, FLAG-2), and all seed publications carry
`provenance.liveness = 'SIMULATED'`, so no real supplier can see any `firm` badge regardless of
how it was projected. The build proceeds on SIMULATED data; the gate is on real-supplier
visibility, not on the work.

**Supplier-facing vocabulary is `commitmentClass` only.** A supplier must never see internal
liveness terms (`SIMULATED×PLANNED`, `Tier`) — FLAG-2.

---

## 3. RM-SLS-2050 — does not exist; **do not seed it**

**RATIFIED (SOMO 2026-08-03): RM-SLS-2050 does not exist on either side. Nothing was ever run
against it.**

Portal-side verification (CP-1, exhaustive): zero occurrences in the working tree, in `docs/`, in
`src/`, and **in git history** — `git log --all -S "RM-SLS-2050"` returns no commit that ever
added or removed it. The only near-hits are unrelated: `MAT-20500`
(`channel/outboundFixtures.ts:29`) and a commodity price `2050.2` (`commodityHistory.ts:102`).
No shared first-wire acceptance test exists on our side in any form.

**DO NOT SEED IT.** Creating the material to make the test runnable would manufacture the
agreement the test was supposed to verify — a fixture invented to satisfy a citation, on both
sides, joining on a code that exists only because both sides created it. That is the failure this
whole correction exists to stop.

### 3.1 Replacement acceptance-test method (**RATIFIED**)

**Compute the intersection of the two material masters, on BOTH codes and names.**

- Inputs: the portal's `MATERIAL_MASTER` (`sdc/fixtures.ts:58-100`, 5 entries today) and SOMO's
  BOM material set.
- Match on **codes** and, independently, on **names** — because §4 tells us the codes are not
  expected to agree, so a code-only intersection would report empty for the wrong reason and a
  name-only one would miss a genuine code match.
- **An empty intersection is REPORTED AS A RESULT, not resolved.** No reaching for the nearest
  plausible match, no fuzzy join, no "these two are obviously the same substance". Empty is a
  finding about `material_master_ref` (§4), and it is the single most useful thing the test can
  tell us.

SOMO's intersection result lands this week. Ours is the master above; it is small, and the small
size is itself part of the result.

---

## 4. Material identity — `material_master_ref` is the live external clock, **both directions**

**RATIFIED (SOMO 2026-08-03): SOMO's material identity is ILLUSTRATIVE.** Their BOM codes are
**not canonical S/4**, and their crosswalk to canonical codes is **named, registered, and NOT
BUILT**. It waits on `material_master_ref`.

State the symmetry plainly, because it is the scheduling fact both platforms need:

> **`material_master_ref` is the live external clock in BOTH directions.** SOMO's codes are
> illustrative pending their crosswalk; ours are a 5-entry SIMULATED master
> (`sdc/fixtures.ts:58-100`) with C7 not even on codes yet (display strings, C7 §6.1). **Neither
> side is waiting on the other. Both are waiting on the same freeze.**

Consequences to hold onto:

- **`materialCode` is not yet a join key between the platforms**, and no C8 work should assume it
  is. `ForecastLine.materialCode` (`sdc/types.ts:128`) is a real key *within* our tree only.
- **This is the one place a crosswalk IS warranted** — between spaces owned by different parties.
  Contrast C7 §6.1, where the C7↔C8 material-space split is entirely ours and the right fix is to
  **delete one space, not bridge it**. The distinction is the whole rule: *a crosswalk between
  two spaces you control carries no information.*
- The `material_master_ref` schema freeze is **CP-2**, and it is the next thing after this PR.

---

## 5. Grain gaps (co-design)

| # | Gap | Status |
|---|---|---|
| **GG-3′** | **period bucket vs single date.** C8 is bucket-native — a supplier confirms "I can meet Aug-25", not a date. **Built that way:** `periodBucket: string` (`sdc/types.ts:130`), documented as *"the planning grain … NOT a resolved date"* (`:122-126`). | **CLOSED our side.** ⚠️ C7 resolves the SAME gap the OPPOSITE way (bucket written into `requiredDate`, C7 GG-3). **Ask stands:** confirm SOMO can emit one plan at both grains. |
| **GG-7** | **revision cadence + net-change.** Governed cadence (monthly RM / weekly PM) rather than per-revision, with flagged emergency republication; and a net-change delta so unchanged lines are not re-confirmed. | **OPEN.** No cadence or delta machinery in code. Full re-confirmation of an unchanged 200-line forecast every cycle is how supplier adoption dies. |
| **GG-8** | **horizon boundary.** How many buckets forward, and is the commitment boundary a fixed offset or plan-driven per material? | **OPEN.** Code comments a 6-bucket window as "trimmable" (`sdc/types.ts:152`); nothing enforces it. Now partly superseded by §2 — the boundary question is the projection question. |

---

## 6. Feedback direction (portal → SOMO)

Symmetric to C7's F3 feedback seam. The supplier's confirmation — `confirmedQty`, `committedDate`,
capacity constraint, root-cause (`sdc/types.ts:169-174, 191-195`) — writes back to the
**Snowflake commons** for SOMO's replan.

- We are the SoR for the supplier response.
- It lands in Snowflake (analytical), **not** a synchronous call back to SOMO.
- **Tier: SPEC.** C4 Snowflake is SPEC with zero code; gated on our F1/F2. Non-blocking near-term
  and stated as such rather than implied to be closer than it is.

Two response kinds, discriminated structurally (integrity invariant #11, XOR): a
`forecastConfirmation` is a **commitment** against a firm/semi-firm line; an `acknowledgment`
(`sdc/types.ts:186-188`) is a **visibility response** carrying **no quantity at all**, so SOMO can
never mistake an acknowledgment for a commitment — there is no number to misread.

---

## 7. Decision register (C8)

| ID | Decision | Status |
|---|---|---|
| **C8-FANOUT** | Portal owns allocation; SOMO emits material × period totals and holds no vendor entity. `ForecastLine.supplier` struck from the emission; `Allocation.materialPeriodTotal` kept, auditable through the fan-out. | **RATIFIED** (§1) |
| **C8-CLASS-VOID** | The shipped `locked → firm` mapping is **VOID**, recorded as withdrawn rather than as a position. | **RATIFIED** (§2.1) |
| **C8-CLASS-PROJECTION** | SOMO emits `lockState` + `approvalState`; the portal projects `commitmentClass`. SOMO's proposed projection (firm=locked · semi-firm=approved-unlocked · visibility-only=draft/submitted) is recorded as a proposal. | **NAMED OPEN DECISION — explicitly UNRATIFIED.** Pending named owners in Paragon procurement + finance (§2.2) |
| **C8-RM-SLS-2050** | Does not exist on either side; never run. **Do not seed.** Replaced by a two-master intersection on codes AND names, empty reported as a result. | **RATIFIED** (§3) |
| **C8-MATERIAL-REF** | SOMO's codes are illustrative, not canonical S/4; their crosswalk is named, registered, NOT BUILT. `material_master_ref` is the live external clock **both directions**. | **RATIFIED** (§4) |
| **C8-FIND-01** | **This contract did not exist** while the code hardened past the 2026-07-16 proposal — `allocation` (required), the `Uom` union, per-line `provenance` and a `commitmentClass` mapping all landed unseen by SOMO. | **CLOSED by this document** |
| **C8-FIND-02** | The SOMO inbound emission shape is **not modelled in code** — no type exists; only `Allocation.materialPeriodTotal` residue. §1.2 is SPEC prose, not a harvested shape. | **OPEN** — lands with the F2 producer |
| **C8-FIND-03** | **Code/contract divergence, knowingly held:** the void mapping (§2.1) remains in code (`sdc/types.ts:23`, `sdc/FLAGS.md` pre-correction) until the booked code batch. Contract is authority. | **OPEN** — booked code batch |
| GG-3′ | bucket-native on C8 | **CLOSED our side**; cross-seam ask stands (§5) |
| GG-7, GG-8 | cadence + net-change · horizon boundary | **OPEN** — co-design (§5) |
| C4-FEEDBACK | Supplier response → Snowflake commons | **SPEC** — gated on F1/F2 (§6) |

---

## Provenance

Generated 2026-08-03 at `main` #157 (`063adca`), floor 1991/1991, docs-only — no code, fixtures
or tests touched. Every shape claim is cited `file:line` against that commit and was verified by
reading the tree, not from the superseded proposal.

Supersedes `docs/C8_Forecast_Publication_Seam_Proposal.md` (2026-07-16, unratified). SOMO's
rulings of 2026-08-03 are carried as ratified at §1, §2.1, §3, §4; §2.2 is carried as explicitly
**unratified** and must not be read as agreed.

**Re-harvest trigger (the process fix).** This document is re-verified against code at each
seam-touching batch and at each CP checkpoint. A contract statement that cannot be traced to a
current `file:line` is a finding, not prose. That trigger is the actual fix for the gap named at
the top — the itemised corrections are only its symptoms.
