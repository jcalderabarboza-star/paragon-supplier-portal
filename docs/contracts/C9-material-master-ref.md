# C9 — `material_master_ref`

The **material-identity crosswalk** between Paragon's material master and SOMO's material codes:
the schema both platforms build against when they need to say *"our code X and your code Y name
the same thing"* — and, more often and more importantly, when they need to say nothing at all.

**Status:** CONTRACT · **second issue, 2026-08-04** (first issue 2026-08-03), generated from
code-truth at `main` `3860fe4` · **schema + types only; ZERO ROWS, ZERO CONSUMERS.**

> **AMENDED BEFORE RATIFICATION.** SOMO ratified the SHAPE verbally and is running its own checks
> before replying in writing. **Their check found a defect in our text and it is corrected here, so
> that what they ratify is the corrected text rather than an erratum against it.** Three changes,
> each marked **AMENDED** at the clause:
>
> | # | Clause | What changed |
> |---|---|---|
> | **A-1** | **§5.2** — `spaceId` retirement | **The retirement condition was stated JOINTLY and the symmetry was FALSE.** Stated exactly: the joint phrasing — *"dropped when both sides hold one space each"* — was in the registered clause (`docs/findings.md`, `C9-SPACEID-REQUIRED-01`), and **the first issue of this document stated no exit condition at all**, which is the same defect one step quieter. It is now stated **per party, here, in the contract**, and the consequence — that this field does not retire on any schedule either party controls — is stated plainly rather than implied away. |
> | **A-2** | **§4.1** — `routeToResolution` | **A new REQUIRED provenance field.** An unresolved row already carried its candidate and its evidence; it did **not** carry **what would settle it**. SOMO's refinement, accepted: *an unresolved row beats a confident wrong answer only if it carries its candidate, its evidence, and its route to resolution — otherwise it is a shrug with better manners.* |
> | **A-3** | **§3.1** — the reciprocal hazard | **A claim we made about SOMO's code is now MEASURED and it was WRONG.** Their sweep found **no material-code prefix parsed in production.** The clause is **preventative on their side and corrective on ours**, and the table said otherwise. |
>
> A-2 moves the types module, so the floor pin moves with it (§8).

**This document is the AUTHORITY.** `src/services/sdc/materialMasterRef.types.ts` expresses the
same shape in a form a build can check; where the two disagree, **this document wins and the
types are the defect.** `materialMasterRef.contract.test.ts` makes that disagreement fail the
floor rather than accumulate silently (§8).

**Why it exists now.** C8 §4.1 recorded the scheduling fact both platforms need:

> **`material_master_ref` is the live external clock in BOTH directions.** SOMO's BOM codes are
> **ILLUSTRATIVE, not canonical S/4**, and their crosswalk to canonical codes is **named,
> registered and NOT BUILT — it waits on this schema.** Ours is a 5-entry SIMULATED master
> (`src/services/sdc/fixtures.ts:58-100`). **Neither side is waiting on the other. Both are
> waiting on the same freeze.**

This is that freeze.

## What SOMO is asked to ratify

Read against your BOM shape and **reply in writing**; nothing here is frozen until you do.

| # | Item | Where | Substance |
|---|---|---|---|
| **R-1** | **Identity keys on SPECIFICATION** | **§2** | S/4 MATNR semantics: a MATNR is a purchasable item, not a chemical. Accepted on an **irreversibility** argument, not a preference. |
| **R-2** | **Every row carries a `grain` tag** | **§2.2** | `'substance' \| 'specification'`, with confidence and adjudication provenance. This is what survives D-1 either way. |
| **R-3** | **`materialCode` is OPAQUE — permanently** | **§3** | No prefix stability, ever. **AMENDED (A-3):** the first issue said *both* platforms violate this today. Measured, **only we do** — the clause is **preventative on your side, corrective on ours** (§3.1). It is still the reason the contract exists in writing. |
| **R-4** | **Adoption is not discovery** | **§4** | Both masters self-declared SIMULATED ⇒ no row may claim a correspondence found against a real master. Enforced structurally, not by convention. **AMENDED (A-2):** provenance now also carries **`routeToResolution` — what would settle the row** (§4.1). |
| **R-5** | **An empty map is an honest map** | **§5** | Absence means UNKNOWN. The schema has no way to write "unknown" and nothing in it rewards filling it in. |
| **R-6** | **Your canonical-S/4 crosswalk's grain** | **§9** | The one thing we need FROM you that this document cannot decide. |

---

## 0. Scope

**In scope.** The shape of an assertion that a Paragon material code and a SOMO material code
name the same thing; the grain at which such an assertion is made; the provenance it must carry;
and the policy layer that decides which assertions a commercial consumer may act on.

**Out of scope, explicitly.** Any actual correspondence. **No rows are published with this
schema and none may be inferred from it.** Populating the crosswalk is the master-adoption batch
(CP-2 · B2b), which is blocked (§6). Also out of scope: transport (C8 §4.5 already chose option 3
then option 2), and the BOM-explosion grain boundary (C8 §0 — SOMO owns the BOM, we procure the
RM/PM leaf).

---

## 1. A crosswalk earns its place only between spaces owned by DIFFERENT parties

**The rule, stated as canon:** *a crosswalk between two spaces you control carries no
information.* If both spaces are yours, the mapping encodes nothing except the fact that you once
had two datasets. **Retiring one produces a master; bridging them produces a permanent artifact
describing your own past disorganisation.**

**Why THIS crosswalk qualifies.** Paragon's master and SOMO's codes are owned by different
parties, maintained under different governance, and neither can unilaterally change the other.
Agreement between them is genuine information: it is the only way either side can act on the
other's identity at all.

**Why our own two spaces did NOT qualify — and what we did instead.** The portal carried a second
material space in `src/data/mock*.ts` alongside the declared master. It was **booked for
retirement, not reconciliation** (C8 §4.0), on exactly this rule. That retirement has since been
executed:

- **CP-2 · B2a (`main` #162)** broke the collisions by **re-coding, not crosswalking**. Four codes
  had two meanings; four meanings had two codes. Both were resolved so that **one code means one
  thing across the tree, in both directions** — pinned in `src/data/materialIdentity.test.ts`.
- **The second direction was not in the original dispatch and is worth stating here**, because it
  is the failure mode a crosswalk would have HIDDEN: four materials carried one code in
  purchase-orders + inventory and a *different* code in goods-receipts + shipments, so **a goods
  receipt could not be reconciled to its purchase order on the material code at all.** A crosswalk
  would have made that joinable while leaving it true. Deleting a code space made it false.

**This is the rule turned on its author, and it survived.** We applied to ourselves the argument
SOMO used to close its own internal identity leg. A rule that only ever binds the other party is
not canon.

---

## 2. The shape — identity keys on SPECIFICATION

### 2.1 The key

**A material identity in this crosswalk is a SPECIFICATION**, in S/4 MATNR semantics: **a MATNR
is a purchasable item, not a chemical.** `RM-EMUL-3310` (`Glycerin USP 99.5%`) and a
hypothetical unspecified-grade glycerin are two identities, not one, because they are two things
you can order.

### 2.2 Why this is not a preference between two tastes

Both readings of material identity are defensible and they produce different masters (C8 §4.4).
That symmetry is real at the level of *meaning* and **entirely absent at the level of
consequence**:

> **KEYING ON SUBSTANCE MERGES RECORDS.** Two purchasable items become one identity, and the
> distinction between them is gone from the data. **A merge cannot be unwound without
> re-adjudicating every row that was folded into it** — the information needed to split them
> again was destroyed by the merge itself.
>
> **KEYING ON SPECIFICATION MERELY DEFERS THE ROLLUP.** Nothing is lost; a substance axis is
> **purely additive later** (§2.4).

**ONE DIRECTION IS IRREVERSIBLE AND THE OTHER IS NOT.** The schema takes the reversible one. This
is the entire argument, and it does not depend on which reading of identity turns out to be
commercially correct — which is fortunate, because that question is open (§6.1).

### 2.3 The grain tag — what makes the schema survive D-1 either way

Every row carries `grain: 'substance' | 'specification'`, plus its confidence and its
adjudication provenance.

**IMPLICATION, one direction only:** specification-equivalence **entails** substance-equivalence.
The converse does **not** hold.

This is what lets the map state a partial truth without inventing a whole one. `AI-NIAC-6601 ↔
RM-NIAC` can be recorded as **EQUIVALENT at `'substance'` grain** while **asserting nothing at
`'specification'` grain** — because **absence is unknown** (§5). No row has to claim a grade
correspondence that procurement has not ruled on, and none has to deny one either.

**Procurement's eventual answer is then a POLICY OVER THE DATA, not a constraint on it**
(`MaterialRefJoinPolicy`): which grains a commercial consumer may join on. See §6.1 for the
precise claim this lets us make to procurement.

### 2.4 The substance rollup — RESERVED, additive, NOT BUILT

The optional substance axis is a single optional field on the shipped master entry:

```ts
MaterialMasterEntry.substanceRef?: SubstanceRef      // swap-point: src/services/sdc/types.ts:83-110
```

**Optional**, so every existing entry stays valid and no fixture changes. That is the "additive
later" property §2.2 relies on, stated as a concrete edit rather than a promise.

**It is NOT landed in this batch** (`SubstanceRef` is declared in the types module; the field is
not on `MaterialMasterEntry`). A substance value is an adoption decision, and D-1 rules on
whether it carries commercial meaning at all.

---

## 3. `materialCode` IS OPAQUE — permanently, and on both sides

> **No prefix stability is promised, ever. Nothing may parse a material code. A code is an
> identifier, not a description.**

### 3.1 **AMENDED (A-3).** The clause is PREVENTATIVE on SOMO's side and CORRECTIVE on ours

**The first issue of this document stated that BOTH platforms violate this clause in shipped code.
SOMO measured their side and that is not true of them.** The correction is recorded here rather
than absorbed silently, because the erroneous claim was *ours about them* and it was the
load-bearing sentence under R-3.

| Platform | Prefix reader in production | Basis | Consequence of a code-space change |
|---|---|---|---|
| **SOMO** | **NONE — measured, not assumed.** No material-code prefix is parsed anywhere in their production code. `materialClass` is a **declared ENUM read as a FIELD** at ~20 sites — already the shape this clause requires | **A reciprocal sweep they ran and reported** | **None.** A Paragon code-format change does not reach their explosion behaviour |
| **Paragon** | `inferBpom` derives **BPOM regulatory applicability** from `AI-`/`FR-` (`src/components/v2-features/GRInspectionWizard.tsx:129-131`) and **FAILS OPEN** — an unrecognised prefix yields *"no check required"* | Read from our own shipped code | A SOMO code-format change silently switches a **compliance check OFF** |

**What the first issue got wrong, and how.** C8 §4.6 (`C8-RECIPROCAL-HAZARD`) recorded SOMO
*booking a check* on their explosion engine after we volunteered `inferBpom`. This document
carried that forward as a **finding**. It was a **hypothesis they had undertaken to test** — and
when they tested it, it was negative. **A hazard the counterparty offers to look for is not a
hazard the counterparty has.**

**So the clause binds asymmetrically, and both directions are worth having:**

- **Preventative on SOMO's side.** They already carry class as a field. The clause stops that
  regressing — including into the crosswalk itself, which is the surface most likely to tempt a
  prefix shortcut.
- **Corrective on ours.** `inferBpom` is live, unfixed, and blocked on D-COMP-BPOM (§6.2, §7.3).
  **We are the only party currently in breach of a clause we proposed.**

### 3.1a The structural cousin they DO hold — recorded as shared risk, not as a violation

Their sweep also reported what it found on the way past, which is the part worth keeping:

> **One record type carries an echelon ROLE only inside a DISPLAY STRING — with no field a reader
> could have used instead.**

That is not a material-code prefix and it does not breach this clause. **It is the same defect
one level up:** a semantic that exists in the system, is needed by readers, and is recoverable
only by parsing prose. Ours (`inferBpom`) reads a code; theirs reads a label. **The generalisable
form is `SEMANTIC-IN-A-STRING`: if a reader needs it, it is a FIELD; if it is only in a string,
every consumer becomes a parser and every rename becomes a behaviour change.**

Filed as **shared risk** in this contract because neither party could have found the other's
instance, and because the crosswalk is where a string-carried semantic would do the most damage:
`materialCode`, `spaceId` and `sourceOfTruth` are all strings, and **none of them may be parsed
for meaning by either party.**

### 3.2 What this clause obliges

- Neither party may derive class, regulatory status, ownership, or any other semantic from a code
  string. **Semantics move to FIELDS.** Membership replaces shape.
- Neither party may treat the other's code format as an interface. A reformat on either side is
  **not** a breaking change to this contract — which is exactly why parsing one is unsafe.
- **We do not claim to have discharged this.** `inferBpom` is live and unfixed; see §7.3.

### 3.3 The method rule this earned

The census that preceded this schema **enumerated material codes with a regex assuming a code
SHAPE** (a 2–6 character middle segment) and was therefore blind to `AI-PEPTIDE-8801`, reporting
30 master-absent codes where there were 31. **The census's own subject was this opacity clause,
and it violated the clause in its method while documenting it in its output**
(`CENSUS-REGEX-SHAPE-01`, elevated to the class `CENSUS-MUST-DERIVE-01`).

**AN IDENTITY CENSUS MUST DERIVE ITS POPULATION, NEVER MATCH A SHAPE.**

**ADOPTED BY BOTH PLATFORMS — and it landed on SOMO too, in the opposite direction.** It was
offered as shared canon; their own intersection then **derived their 88 codes from seed** (the
rule, correctly applied) while **reading ours from a file they had been told holds five** — and
**two of the three Paragon codes we quoted at them came from a different file entirely.** Same
failure mode, mirrored: ours mis-derived its own population by matching a shape; theirs derived
its own population correctly and then took the *counterparty's* population from whatever was to
hand. **A census can be rigorous about its own space and credulous about the other's, and the
second half is the half a crosswalk actually runs on.**

**The standing rule, now bilateral and binding on both platforms:**

> **WHENEVER EITHER PLATFORM QUOTES A FIGURE ABOUT THE OTHER'S CODE SPACE, IT STATES HOW THAT
> POPULATION WAS OBTAINED** — which file or extract, and by what method. Not because the figure is
> likely wrong, but because a population obtained by an unstated method **reports a clean
> all-clear rather than "I may have missed some."**

This is also the strongest live argument for `spaceId` (§5): the two errors above are both
**space confusions**, and a row that names its space cannot make either of them.

---

## 4. ADOPTION IS NOT DISCOVERY

**Both masters are self-declared SIMULATED.** Ours carries an honesty marker in the file — *"⚠️
HONESTY MARKER — THIS IS SIMULATED DATA, NOT PARAGON DATA … It is NOT Paragon's real material
master"* (`src/services/sdc/fixtures.ts:4-11`). SOMO's declares itself seed-illustrative and
never SKU-validated.

**Therefore every row this schema could carry today would be a fact INVENTED at agreement time,
not a correspondence FOUND against a real master.** Two invented spaces cannot yield a discovered
mapping; they can only yield an agreement to treat one invented thing as another — **a decision
dressed as a finding.**

### 4.1 Enforced structurally, not by convention

Every row carries `provenance: AdjudicationProvenance`:

| Field | Obligation |
|---|---|
| `method` | `'MASTER_DATA_MATCH'` (the only method that can be a **discovery**) · `'OPERATOR_ADJUDICATED'` · `'PROPOSED_BY_INSPECTION'` (both **adoptions**) |
| `evidenceLiveness` | Liveness of the **evidence**, not the row. Reuses the shipped `Tier` (`src/services/liveness/registry.ts:45`) |
| `decidedBy` | A **role token**, never a person's name (identity-clean, `fixtures.ts:19`) |
| `decidedOn` | **Absolute ISO date** — never a relative expression (law 0.5) |
| `sourceOfTruth` | **REQUIRED.** A truthful value may be an admission: `'NONE — both masters SIMULATED'`. A row that has no source of truth is not exempt from **stating that it has none** |
| `routeToResolution` | **REQUIRED — AMENDED (A-2).** **What would settle this row.** See §4.2 |

> **INVARIANT.** A row whose `evidenceLiveness` is not `'LIVE'` **MUST NOT** carry
> `confidence: 'CERTAIN'`. Certainty against invented data is the precise failure this rule names.

> **INVARIANT.** `MaterialRefJoinPolicy.allowSimulatedEvidence` **MUST be `false`** for any
> commercial consumer. It exists as an explicit field rather than an assumption **so that a demo
> enabling it has to say so.**

The point of recording provenance on every row is that **a future reader can tell an adoption
from a discovery without knowing the history** — which is exactly what nobody could do for
`mock*.ts`, and why it took a census to find out what its codes meant.

### 4.2 **AMENDED (A-2).** `routeToResolution` — an unresolved row must be an ANSWERABLE QUESTION

SOMO's refinement of "absence is unknown", accepted verbatim as the reason this field exists:

> **AN UNRESOLVED ROW BEATS A CONFIDENT WRONG ANSWER ONLY IF IT CARRIES ITS CANDIDATE, ITS
> EVIDENCE, AND ITS ROUTE TO RESOLUTION — OTHERWISE IT IS A SHRUG WITH BETTER MANNERS.**

Checked against the shape as first issued, one part at a time:

| What the refinement requires | Where the first issue carried it |
|---|---|
| **Its candidate** | ✅ The row itself — `paragon` + `somo` + `grain` + `verdict`. The candidate correspondence *is* the row |
| **Its evidence** | ✅ `sourceOfTruth` (what backed it) + `evidenceLiveness` (whether that thing is real) + `method` |
| **Its route to resolution** | ❌ **ABSENT.** Nothing in the shape said what would settle it. `sourceOfTruth` is **retrospective** — it names what was consulted, never what is still needed |

**Two of three is the shrug.** A row saying *"TENTATIVE, source of truth: NONE — both masters
SIMULATED"* is honest and completely inert: it tells a reader the row is doubtful and gives them
nowhere to go. **The field is what converts an unresolved row from a disclaimer into an
ANSWERABLE QUESTION.**

**What it holds — and its boundary, stated because a free-text field drifts:**

> It names the **artifact, ruling, or wire that would settle the row.** A resolution MECHANISM —
> not a description of the doubt, not a status, not a comment. Examples:
> `'D-1 ruling from Paragon procurement'` · `'a LIVE Paragon master extract'` ·
> `'SOMO BOM→canonical-S/4 crosswalk, at a declared grain (§6.3)'` · `'D-COMP-BPOM'`.
>
> **THIS IS NOT A NOTES COLUMN.** `note` already exists and is optional; this field is required
> and has exactly one job. Anything that is not a route to resolution belongs in `note`.

> **INVARIANT.** A row whose `confidence` is not `'CERTAIN'` **MUST** name a real route.
> `'NONE'` is available **only** to a row with nothing left to settle — which, by the invariant
> above, means a row with `'LIVE'` evidence. **Composed with that invariant, the consequence
> today is total: no row this schema could currently carry may be `'CERTAIN'`, therefore EVERY
> row writable today must name its route.** The field cannot be dead on arrival.

**Why required rather than optional.** Optionality would put the field exactly where it fails: an
optional route is omitted on the doubtful rows and filled in on the confident ones. It follows
`sourceOfTruth`'s ratified precedent — required, with a truthful value permitted to be an
admission — for the same reason: **a row that cannot say what would settle it is not thereby
exempt from saying so.**

---

## 5. The schema, and why an EMPTY map is an honest map

```ts
interface MaterialMasterRefRow {
  paragon:    MaterialRef;              // { spaceId, materialCode }
  somo:       MaterialRef;
  grain:      'substance' | 'specification';
  verdict:    'EQUIVALENT' | 'NOT_EQUIVALENT';
  confidence: 'CERTAIN' | 'PROBABLE' | 'TENTATIVE';
  provenance: AdjudicationProvenance;
}

type MaterialMasterRef = readonly MaterialMasterRefRow[];   // EMPTY AT FREEZE, BY RULING
```

**ABSENCE IS UNKNOWN.** There is deliberately **no `'UNKNOWN'` verdict** and no way to write one.
A row asserts something; silence asserts nothing. Consequences, all intended:

- A pair with no `'specification'` row **is unknown at specification grain**. Nothing had to
  claim it.
- **An empty map asserts nothing at all** — which is the correct content of this crosswalk today.
- **A sparse map is not an incomplete one.** Nothing in the shape rewards filling it in, and no
  consumer may treat absence as a gap to be closed.

**§5.1 — the one structural rule on the collection.** A pair may carry **zero, one or two** rows
(one per grain). Two rows at the **same** grain with **different** verdicts is a contradiction and
is invalid. This is the only well-formedness constraint the schema imposes, and it is deliberately
the only one: every other question is an adjudication, not a shape.

**`spaceId` is required on both sides and is not decoration.** Each party owns more than one space
*today*: Paragon has the authoritative master **and** the document lane (30 codes the master does
not name, §6.4); SOMO has BOM codes **and** canonical S/4, with the crosswalk between them
unbuilt. A row that cannot say which space it means is ambiguous now, not hypothetically.

### 5.2 **AMENDED (A-1).** When the field retires — **STATED PER PARTY, because the symmetry is false**

The registered clause said the field is dropped *"when both sides hold one space each"*
(`docs/findings.md`, `C9-SPACEID-REQUIRED-01`); **the first issue of this document stated no exit
condition at all.** **That sentence is wrong in a specific way: it describes a JOINT exit that only
ONE party can actually reach.** Written jointly, it reads as a shared tidying task. It is not one.
Stating it here rather than only in our register is part of the correction — **an exit condition
the counterparty cannot read is not a condition either.**

| Party | The second space | Who owns it | What collapses it |
|---|---|---|---|
| **Paragon** | The **document lane** (`src/data/mock*.ts`, 30 master-absent codes, §6.4) | **We do.** Entirely | **OUR OWN TIDYING.** CP-2 · B2b adopts those codes into the master. Blocked on D-1 and D-COMP-BPOM (§6) — **blocked on our own decisions, on our own schedule** |
| **SOMO** | **Canonical S/4** | **Neither party.** It is the system of record | **THE S/4 WIRE.** Not a tidy-up and not a document: their BOM→canonical crosswalk becomes real only when the integration exists |

**The consequence, stated plainly rather than implied away:**

> **A REQUIRED FIELD WHOSE EXIT DEPENDS ON A SYSTEM NEITHER PARTY CONTROLS IS A FIELD THAT NEVER
> RETIRES.** Paragon's half is dischargeable by work we can schedule. **SOMO's half is not
> dischargeable by SOMO at all** — it waits on the S/4 wire, which is a programme, not a task,
> and which neither signatory to this contract owns.

**Therefore: treat `spaceId` as PERMANENT, not transitional.** Both parties should build against it
as a field that will still be required when the crosswalk is operational. **This is not a
weakening of §5 — it is stronger.** The first issue's phrasing invited a reader to treat the field
as scaffolding due for removal; scaffolding gets designed around, and a field designed around is a
field that becomes wrong before it becomes unnecessary.

**And discharging Paragon's half changes nothing about the requirement.** Even with our document
lane retired, a row still needs `spaceId` on **both** sides — because SOMO still holds two spaces
and a row names both parties. **Per-party is the only correct grain for this condition:** each
party can state when *its own* contribution to the ambiguity ends, and neither can state when the
field goes away.

---

## 6. OPEN DECISIONS — declared in the document, not in correspondence

Per our own rule, held to us by SOMO: **a ruling that stays on one platform is not a ruling.**

### 6.1 D-1 · substance vs specification — **ESCALATED to Paragon procurement, explicitly NOT DEFAULTED**

**Does material identity mean the SUBSTANCE or the SPECIFICATION?** A USP-99.5% requirement is a
different purchasable item from unspecified glycerin; a 24mm cap and an unsized cap are not
interchangeable in procurement. Both readings are defensible and **the schema does not choose.**

**HOW the schema avoids foreclosing it — the mechanism, not a reassurance:**

1. The **key** takes the reversible direction (§2.2). A substance axis remains addable; a merge
   would not have remained undoable.
2. The **grain tag** lets a row assert at one grain and stay silent at the other (§2.3).
3. The **answer lands in `MaterialRefJoinPolicy.joinableGrains`** — a policy over the data:
   - ruled **SPECIFICATION** → `['specification']`
   - ruled **SUBSTANCE** → `['substance', 'specification']`

> **EITHER ANSWER LEAVES EVERY STORED ROW UNCHANGED.** Ruling later costs a policy edit, not a
> re-adjudication. That is the concrete claim, and it is the reason this schema could be frozen
> before procurement rules.

**Why it must still be answered, and why it is 2B that needs it:** the master-adoption batch
applies D-1 **~31 times**, once per master-absent code. **Answering D-1 thirty-odd times
independently will produce thirty-odd conventions.**

**A live instance, surfaced by B2a and not invented for this document:** our master states
`AI-NIAC-6601` as `Niacinamide (Vitamin B3)` with **no grade**, while the document lane states
`Niacinamide USP Grade 99.5%` — and a **separate** code `AI-NIAC-6605` exists for `Feed Grade
98%`. So the fixture convention **does** distinguish grade by code, which makes the master's
grade-silent entry ambiguous about which grade it denotes. Two more of the same shape:
`RM-EMUL-3320` (`Cetearyl Alcohol` vs `Cetearyl Alcohol — Vegetable Origin`, origin unstated),
and `RM-EMUL-3310`, whose master group `MG-03` (humectants) contradicts its own `EMUL` code
segment — a live illustration of §3.

### 6.2 D-COMP-BPOM · with compliance — **BLOCKS the master-adoption batch**

Stated plainly, in three parts that are commonly conflated:

1. **What happens today:** BPOM lot-check applicability is **derived from a string prefix**
   (`AI-`/`FR-`) and **FAILS OPEN** — an unrecognised prefix yields *"no check required"*
   (`GRInspectionWizard.tsx:129-131`).
2. **The MECHANISM is ours to fix.** It is the retired prefix-parsing class, live on a regulatory
   surface. It becomes a master FIELD (the `MaterialMasterEntry` extension point) and the
   fail-open default becomes a **refusal**.
3. **The RULE CONTENT is compliance's to state** — *which material groups require a BPOM lot
   check* is not ours to invent. Converting the mechanism first would replace an unratified
   PREFIX convention with an unratified FIELD convention: **the same unratified rule in better
   clothes, and harder to dislodge once it looks principled.**

**Why it blocks 2B specifically.** B2a could guarantee regulatory neutrality because **every
re-code preserved its first segment** — the firing set is pinned byte-identical in
`src/data/materialIdentity.test.ts`. **2B cannot make that guarantee**: adopting codes into the
master changes which codes exist, and any adoption introducing a new prefix family moves the
firing set. The pin will **detect** the change; it cannot tell anyone whether the change is
**correct**. Only compliance can.

### 6.3 SOMO's canonical-S/4 crosswalk grain — **R-6, the ask**

Your BOM→canonical-S/4 crosswalk is named, registered and not built. **At which grain will it
assert?** If it asserts at substance grain while we key on specification, the two crosswalks
compose into a substance-grain join and any specification claim built on it is unsound. This
document cannot decide that, and we are not assuming it.

### 6.4 The 30 master-absent codes exist and are NOT in the master

**Not hidden behind a tidy schema.** Paragon's document lane names **34 distinct material codes**;
the authoritative master names **5**; **30 are master-absent** (31 before B2a retired five codes
and minted four). They are real in the sense that documents transact on them, and **absent** in
the sense that the master does not declare them.

**What makes this safe to leave open rather than urgent:** CP-2 · B1's `SDC_MATERIAL_KNOWN`
refuses an unresolvable code **by name** on all five SDC creation transitions, `requireUom`
cannot fabricate a unit behind it (`src/services/sdc/materialMaster.ts:101-109`), and `labelOf`
echoes the raw code honestly on display. **A master-absent code is refused or honestly echoed
today — never silently wrong.**

**Consequence for this contract, stated because it is unflattering:** most Paragon material
identity in the tree is **not in the space this crosswalk points at.** A row naming
`paragon.sdc.material_master` addresses 5 codes. This is why `spaceId` is required (§5).

---

## 7. WHERE OUR IMPLEMENTATION CANNOT HONOUR WHAT THIS DOCUMENT STATES

**This section exists because the last audit of our contract documents found ELEVEN doc-vs-code
divergences and every one ran the same direction — the documents understated the implementation**
(C7/C8 correction records). Eleven errors sharing a direction are one systematic cause, not eleven
drafting mistakes. **This document is not permitted to start with a twelfth**, so its
non-conformances are enumerated here rather than discovered later.

| # | The contract states | What we actually ship |
|---|---|---|
| **7.1** | A crosswalk exists with a defined shape | **ZERO ROWS, ZERO CONSUMERS.** Nothing in the tree reads a crosswalk. The types module is **declared inert** and imported only by its own contract test. |
| **7.2** | `MaterialRefJoinPolicy` governs which rows a consumer may join on | **There is no policy engine.** The policy is a SHAPE, enforced by nothing at runtime. No code path consults it. |
| **7.3** | `materialCode` is opaque; nothing may parse it (§3) | **WE PARSE IT.** `inferBpom` derives a REGULATORY flag from the prefix and fails open (`GRInspectionWizard.tsx:129-131`). This is a **live contradiction between what we contract and what we run**, it is blocked on D-COMP-BPOM (§6.2), and it is not fixed here. |
| **7.4** | Identity keys on specification, with an optional substance rollup | **`substanceRef` is not on `MaterialMasterEntry`.** RESERVED with a named swap-point (`sdc/types.ts:83-110`); not built. |
| **7.5** | The crosswalk points at Paragon's material master | **That master has 5 entries.** 30 further codes transact in the document lane and are not in it (§6.4). |
| **7.6** | Confidence, provenance and liveness are recorded per row | **Never exercised.** No row has ever been written, so the invariants in §4.1–§4.2 are **asserted, not proven by use.** They are pinned as type-level facts only. **This now includes `routeToResolution` (A-2): a required field on a table with no rows is a promise, and it is recorded here as one.** |
| **7.7** | `Uom` normalization (`EA` vs `PCS`) | **Unresolved and dormant** (C8 §3.2). Every strong substance pair to date is `KG`; the divergence goes live the moment a packaging pair enters a join. This schema does not resolve it. |
| **7.8** | Both parties' spaces are named and addressable | **We cannot verify SOMO's side at all.** Their codes are illustrative and their canonical-S/4 crosswalk is unbuilt (§6.3). Every statement here about SOMO's space is *their* declaration, carried, not confirmed — **and that now cuts in the flattering direction too: §3.1's clearance of their prefix parsing is a sweep THEY ran and reported, which we can no more audit than we could the hazard it replaced.** The asymmetry to keep: a party's report about its own code is the best evidence available and is still not verification. |
| **7.9** | **AMENDED (A-3).** The first issue's §3.1 stated as fact that SOMO's explosion engine parses `RM-`/`PM-` prefixes | **IT DID NOT.** We carried a hazard they had undertaken to *look for* (C8 §4.6) as a hazard they *had*, and published it in a contract document. **This is the first C9 divergence and it ran the opposite direction to the eleven C7/C8 ones** — not understating our own implementation, but **overstating a defect in the counterparty's.** Corrected in §3.1; recorded here because a ledger that only catches the familiar direction is not a ledger. |

**None of the above blocks ratification of the SHAPE**, which is what R-1…R-6 ask for. All of it
blocks any claim that the crosswalk is *operational*, and no such claim is made.

---

## 8. Why a type in code, and not a document alone

**Argued rather than assumed, because a types-only module with no consumers is exactly the shape
of inert registry data** — and this codebase already carries a named class of that (F0.4's four
author-unwired machines). The case for it:

1. **The normative content here is a SHAPE**, and a shape stated only in prose is unfalsifiable
   by the floor. The eleven C7/C8 divergences were all shape-and-behaviour claims that prose could
   not hold, drifting one direction for years because **no build step fails when a contract
   statement stops being true.**
2. **The `grain` union is the schema's central safety property.** In prose it is a sentence; in
   code it is exhaustiveness-checked, and a third grain cannot be added without the compiler
   objecting.
3. **SOMO builds against this.** A type is the least ambiguous statement of a shape we can hand a
   peer platform to mirror.
4. **It inverts `COMMENT-AS-CONTRACT-01`.** That class named the hazard of code comments quietly
   amending a ratified contract with no review gate. Here the document is authority and the test
   pins the code to it — the same coupling, running the safe direction.

**The honest cost, stated:** this adds an unused module. It is **declared inert in its own
header**, it is one file with no importers outside its test, and **deleting it costs nothing but
the anti-drift property**. If the operator prefers the document alone, that deletion is the whole
reversal.

---

## 9. What we need from SOMO

| Ask | Why we cannot answer it |
|---|---|
| **Ratify or amend R-1…R-5** | They are the shape; a shape ratified by one party is a draft. |
| **R-6 — the grain of your canonical-S/4 crosswalk** (§6.3) | If it asserts at substance grain and we key at specification, the composition is unsound and neither side would see it from its own tree. |
| ~~**Whether your explosion engine can stop reading `RM-`/`PM-` prefixes**~~ — **ANSWERED, and the premise was ours and wrong** (§3.1) | **Withdrawn.** Your sweep measured no material-code prefix parsing in production; `materialClass` is already a field. **The remaining half of this ask is ours alone**: `inferBpom` is live, unfixed, blocked on D-COMP-BPOM. |
| **Confirm the `SEMANTIC-IN-A-STRING` cousin is out of the crosswalk's path** (§3.1a) | The echelon role carried only in a display string is yours to place; what we need is the narrower assurance that **no field this contract defines** — `materialCode`, `spaceId`, `sourceOfTruth`, `routeToResolution` — carries meaning either side is expected to parse. |
| **Ratify A-1 and A-2 specifically** (§5.2, §4.2) | They are your own corrections, but a correction adopted without written ratification is still one-sided — the exact failure §6's preamble names. |
| **Your `EA`/`PCS` normalization position** (§7.7) | Dormant on our side; it becomes load-bearing on the first packaging pair, which is likelier to arise from your BOM than our master. |

**Roughly a two-week commitment on your side once frozen**, per the CP-2 schedule. Nothing here
is frozen until you reply in writing.

---

## Provenance

**First issue** grounded in shipped code at `main` `23eac6f`; **second issue (A-1/A-2/A-3)** at
`main` `3860fe4`. Every claim about our own tree carries a `file:line`; **every claim about SOMO's
tree is now marked with how it was obtained** (§3.3), and the one that was not is §7.9. Companion
types: `src/services/sdc/materialMasterRef.types.ts` (inert, zero rows). Pinned by
`src/services/sdc/__tests__/materialMasterRef.contract.test.ts`. Predecessors and their rulings:
[C7](./C7-pr-intake.md) (PR intake), [C8](./C8-forecast-publication.md) (forecast publication —
§4.0 master declaration, §4.1 the external clock, §4.3 adoption-not-discovery, §4.4 D-1, §4.6 the
reciprocal prefix hazard). Batch record: `docs/findings.md`, CP-2 · Batch 2 census and Batch 2a.
