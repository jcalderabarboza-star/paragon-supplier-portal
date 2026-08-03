# C9 — `material_master_ref`

The **material-identity crosswalk** between Paragon's material master and SOMO's material codes:
the schema both platforms build against when they need to say *"our code X and your code Y name
the same thing"* — and, more often and more importantly, when they need to say nothing at all.

**Status:** CONTRACT · **first issue, 2026-08-03**, generated from code-truth at `main`
`23eac6f` (floor 2037/2037 across 174 files) · **schema + types only; ZERO ROWS, ZERO CONSUMERS.**

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
| **R-3** | **`materialCode` is OPAQUE — permanently** | **§3** | No prefix stability, ever. **Both platforms violate this in shipped code today** (§3.1). This clause is the reason the contract exists in writing. |
| **R-4** | **Adoption is not discovery** | **§4** | Both masters self-declared SIMULATED ⇒ no row may claim a correspondence found against a real master. Enforced structurally, not by convention. |
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

### 3.1 This clause exists because BOTH platforms violate it in shipped code today

Stated plainly, including against ourselves, because a contract clause nobody is currently
breaking would not need to be written down:

| Platform | The prefix reader | Consequence of a code-space change |
|---|---|---|
| **SOMO** | The explosion engine reads `RM-`/`PM-` **class semantics** from the prefix | A Paragon code-format change alters explosion behaviour |
| **Paragon** | `inferBpom` derives **BPOM regulatory applicability** from `AI-`/`FR-` (`src/components/v2-features/GRInspectionWizard.tsx:129-131`) and **FAILS OPEN** — an unrecognised prefix yields *"no check required"* | A SOMO code-format change silently switches a **compliance check OFF** |

**Neither hazard was discoverable by the other party.** Each sits inside code the other will
never read. Both surfaced only because one side volunteered a weakness with nothing obliging it
to (C8 §4.6, `C8-RECIPROCAL-HAZARD`).

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

**AN IDENTITY CENSUS MUST DERIVE ITS POPULATION, NEVER MATCH A SHAPE.** Offered to SOMO as shared
canon: any figure either platform quotes about the other's code space should say how its
population was obtained, because a shape-matched census reports a clean all-clear rather than
"I may have missed some."

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

> **INVARIANT.** A row whose `evidenceLiveness` is not `'LIVE'` **MUST NOT** carry
> `confidence: 'CERTAIN'`. Certainty against invented data is the precise failure this rule names.

> **INVARIANT.** `MaterialRefJoinPolicy.allowSimulatedEvidence` **MUST be `false`** for any
> commercial consumer. It exists as an explicit field rather than an assumption **so that a demo
> enabling it has to say so.**

The point of recording provenance on every row is that **a future reader can tell an adoption
from a discovery without knowing the history** — which is exactly what nobody could do for
`mock*.ts`, and why it took a census to find out what its codes meant.

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
| **7.6** | Confidence, provenance and liveness are recorded per row | **Never exercised.** No row has ever been written, so the invariants in §4.1 are **asserted, not proven by use.** They are pinned as type-level facts only. |
| **7.7** | `Uom` normalization (`EA` vs `PCS`) | **Unresolved and dormant** (C8 §3.2). Every strong substance pair to date is `KG`; the divergence goes live the moment a packaging pair enters a join. This schema does not resolve it. |
| **7.8** | Both parties' spaces are named and addressable | **We cannot verify SOMO's side at all.** Their codes are illustrative and their canonical-S/4 crosswalk is unbuilt (§6.3). Every statement here about SOMO's space is *their* declaration, carried, not confirmed. |

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
| **Whether your explosion engine can stop reading `RM-`/`PM-` prefixes**, and what it would need instead (§3) | It is your code. We have named ours (`inferBpom`) and its blocker rather than asking one-sided. |
| **Your `EA`/`PCS` normalization position** (§7.7) | Dormant on our side; it becomes load-bearing on the first packaging pair, which is likelier to arise from your BOM than our master. |

**Roughly a two-week commitment on your side once frozen**, per the CP-2 schedule. Nothing here
is frozen until you reply in writing.

---

## Provenance

Grounded in shipped code at `main` `23eac6f`, every claim carrying a `file:line`. Companion
types: `src/services/sdc/materialMasterRef.types.ts` (inert, zero rows). Pinned by
`src/services/sdc/__tests__/materialMasterRef.contract.test.ts`. Predecessors and their rulings:
[C7](./C7-pr-intake.md) (PR intake), [C8](./C8-forecast-publication.md) (forecast publication —
§4.0 master declaration, §4.1 the external clock, §4.3 adoption-not-discovery, §4.4 D-1, §4.6 the
reciprocal prefix hazard). Batch record: `docs/findings.md`, CP-2 · Batch 2 census and Batch 2a.
