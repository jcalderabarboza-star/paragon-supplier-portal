# C9 — `material_master_ref`

The **material-identity crosswalk** between Paragon's material master and SOMO's material codes:
the schema both platforms build against when they need to say *"our code X and your code Y name
the same thing"* — and, more often and more importantly, when they need to say nothing at all.

**Status:** CONTRACT · **fifth issue — AMENDMENT 3, 2026-08-06** (fourth issue = amendment 2,
third issue = canon addendum, second issue = amendment 1, all 2026-08-04; first issue 2026-08-03),
generated from code-truth at `main` `2dd7f7f` · **schema + types only; ZERO ROWS, ZERO CONSUMERS.**

**Companion artifact, new at this issue:** [`C9-required-fields.md`](./C9-required-fields.md) — the
**complete required-field list, DERIVED from the types module and pinned to it** (A-9). **Send it
alongside this document, never instead of it.**

> ## ⚠️ HOW TO CITE THIS CONTRACT — **A WORKING TREE IS NOT A VERSION** (A-13)
>
> **This contract is ratifiable only at a COMMIT.** Cite all three paths at one SHA:
>
> | Artifact | Path |
> |---|---|
> | **The contract — the authority** | `docs/contracts/C9-material-master-ref.md` |
> | **The types module — the shape** | `src/services/sdc/materialMasterRef.types.ts` |
> | **The derived field list** | `docs/contracts/C9-required-fields.md` |
>
> **ANY LATER AMENDMENT IS A NEW SHA AND A NEW RATIFICATION.** That is a **feature, not friction**:
> it makes ***"which C9 did you ratify?"* an answerable question**, which it has not been until now
> — four issues have shipped under one filename. It adopts the precedent SOMO already set from the
> other side, pinning C7 at a SHA rather than by name.
>
> **Why this block exists is unflattering and is stated at the top rather than buried in §7:** for
> two exchanges **this document existed only in our working tree.** SOMO were reading a contract
> **mid-edit** — modified between every reading — and our messages described it as *enclosed* while
> carrying nothing. **Neither side noticed for two exchanges.** See §3.6.

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

> **ADDENDUM (third issue) — CANON, A WORKED EXAMPLE, AND ONE ADVANCE SIGNAL. NO SCHEMA CHANGE.**
> **SOMO has accepted all three amendments.** Written ratification follows their check 1, which is
> running. **The shape is not in question.** Four additions, none of which reaches
> `materialMasterRef.types.ts`:
>
> | # | Clause | What it adds |
> |---|---|---|
> | **ADD-1** | **§3.4** *(new)* | **Shared canon, and it is theirs: A COMMITMENT TO CHECK IS NOT A FINDING.** The general form of the error §7.9 records — A-3 corrected the instance; this states the class. |
> | **ADD-2** | **§4.2a** *(new)* | **SOMO's worked example of `routeToResolution`**, carried with attribution. It shows the field working in prose rather than in schema, and it is better than anything we would have written. |
> | **ADD-3** | **§7** preamble | **Their observation on the divergence ledger:** *a divergence log that only ever runs one direction is not being read hard enough.* |
> | **ADD-4** | **§6.1a** *(new)* | **ADVANCE SIGNAL on their check 1 — recorded as a DISCLOSURE, NOT A MEASUREMENT** (per ADD-1). Held **OPEN**. |
>
> **Nothing here touches the types module, so the floor pin does not move** (§8). Floor **2057**,
> unchanged. No rows, no master edit; **2B remains blocked on D-1 and D-COMP-BPOM** (§6).

> **AMENDMENT 2 (fourth issue) — SOMO RAN BOTH CHECKS.** **Everything in C9 stands ratified on
> their side except ONE COLLISION, which they raised correctly and which the operator has ruled in
> their favour.** Written ratification follows. Six amendments and two canon rows; **A-4 changes the
> schema, so the pin moves with it** (§8).
>
> | # | Clause | What changed |
> |---|---|---|
> | **A-4** | **§5.3** *(new)* — `ADJUDICATED_UNRESOLVED` | **THE COLLISION IS REAL, and it was ours.** §5 says absence IS unknown, so a doubtful row is simply not written. §4.2 requires `routeToResolution` on **every writable row**. **A ROW THAT IS ABSENT CANNOT CARRY A ROUTE** — the two rules pulled against each other and **the field we added at SOMO's request had nowhere to live.** A **new verdict**, distinct from absence. |
> | **A-5** | **§5.2** — retirement condition | **RESTATED AS AUTHORSHIP, NOT A COUNT.** Their check 2: they satisfy *"holds one space"* **today only VACUOUSLY**, because the counterpart space is empty. |
> | **A-6** | **§5.2, §6.3** — whose space S/4 is | **OPERATOR RULING: CANONICAL S/4 IS THE PORTAL'S SIDE OF C9.** So SOMO never need more than one `spaceId` for their own populations, and **S/4 is not a third space for them to carry.** |
> | **A-7** | **§3.1, §5.2, §6.1a** — SOMO's measured shape | **THREE corrections, all theirs, all running AGAINST their own earlier position and all measured.** Discriminators **sparse, not absent**; **three** self-authored populations, not two; opacity pass **clean with evidence**. |
> | **A-8** | **§6.1a** — the check-1 verdict | Recorded as a **DATA gap, not a schema gap**, in their words — including **their reason for not proposing the easy fix.** |
> | **A-9** | **§7.11** *(new)* + companion artifact | **THE HAZARD POINTED AT US. C9 IS NOT IN SOMO'S REPOSITORY.** Their field list came from **our prose summary** — they have been ratifying a **description of the artifact, not the artifact.** |
> | **A-10** | **§3.5** *(new)* — canon, theirs | **A STATED LIMIT DOES NOT DISCHARGE THE LIMIT.** The reader's half of A-9. |
> | **A-11** | **§3.5** *(new)* — canon, theirs | **A RECORD OF WORK DONE IS NOT A CLAIM ABOUT THE THING WORKED ON.** The generalisation that resolved A-4; SOMO are adopting it platform-wide. |
> | **A-12** | **§6.1b** *(new)* — OPEN | **The summary-delta measurement**, recorded as a **DISCLOSURE, not a finding** (§3.4). **Nobody has measured what a summary loses against its source.** |
> | **A-13** | **§3.6** *(new)* + the citation block above | **A CONTRACT THAT IS NOT PINNED CANNOT BE RATIFIED — ONLY DESCRIBED.** C9 was **dirty in our working tree every time they read it**. The C7 SHA-pinning precedent is adopted. |
> | **A-14** | **§3.6** *(new)*, **§7.12** *(new)* | **AN ARTIFACT DESCRIBED AS ENCLOSED IS NOT ENCLOSED.** **The enclosure never arrived**; the word did the work of the act and neither side noticed for two exchanges. |
>
> **SOMO have accepted the collision ruling, the retirement restatement and the S/4 ruling, and are
> re-running check 1 AGAINST THE ARTIFACT and the derived field list. NOTHING IS REOPENED.** No
> rows, no master edit; **2B remains blocked on D-1 and D-COMP-BPOM** (§6).

> ## AMENDMENT 3 (fifth issue) — **THE CONTRACT WENT STALE BY BEING FIXED**
>
> **NO SCHEMA CHANGE. NO ROWS. THE TYPES MODULE IS UNTOUCHED** — so §8's coupling is unaffected and
> the field list is unchanged. **The pin moves anyway, because the contract's own text changed**
> (A-13: any later amendment is a new SHA and a new ratification).
>
> **Why this amendment exists, stated first because it is the unflattering part.** Between the
> fourth issue and this one, our implementation **improved** — and four documents, this one
> included, went on describing the defect. C9 §7.3 said *WE PARSE IT* about a function that had
> been deleted.
>
> > **A CONTRACT CAN GO STALE BY BEING FIXED, AND THAT DIRECTION IS THE UNCHECKED ONE.**
>
> This is ADD-3 landing on us with the polarity reversed. SOMO told us *a divergence log that only
> ever runs one direction is not being read hard enough*, and we recorded it as a lesson about
> **finding defects we had understated**. The direction we were still not reading is the one where
> **a divergence closes and the ledger keeps declaring it.** A document that overstates our
> conformance is caught by anyone who reads the code; **one that understates it is caught by nobody,
> because the discrepancy is in our favour and reads as caution.** New §7.13.
>
> **Everything queued since `f492b5c` rides this one amendment**, so there is one re-ratification
> rather than six.
>
> | # | Clause | What changed |
> |---|---|---|
> | **A-15** | **§7.3** — the opacity violation | **DISCHARGED.** `inferBpom` is **deleted**. No prefix parse survives on any path a receipt can travel, asserted as a **derived tree-wide property** rather than a file list. The single longest-standing non-conformance in this ledger is closed. |
> | **A-16** | **§7.13** *(new)* — `C9-STALE-BY-FIX-01` | **The ledger row for the direction above.** Filed by us, about us, and it is the first entry in this ledger recording a divergence created **by a repair**. |
> | **A-17** | **§6.2** — D-COMP-BPOM | **MECHANISM SHIPPED, CONTENT STILL UNANSWERED — and the honest conformance statement is now BETTER than the old one.** All 42 master values are **PROVISIONAL**; **eleven rows record that nobody has ruled**, and **two of them block a receivable line at the goods-receipt surface.** The escalation is now visible to an operator instead of hidden behind a false negative. |
> | **A-18** | **§2.4, §7.4, §6.1a** — `substanceRef` | **P-3 / `LEDGER-UNCOMPOSED-01`, ANSWERED IN THE DOCUMENT THAT CAUSED IT.** §7.4 said the field is not built; §6.1a rested a live escalation on it being the axis any SOMO-sourced row is written on. **Same document, and nothing composed them.** §7.4 stays OPEN **with its reason stated**, §6.1a now carries the contradiction inline, and **D-1 is restated: it decides whether the field is BUILT, not only how it is used.** |
> | **A-19** | **§5** — Paragon's space count | **TWO ERRORS IN ONE SENTENCE, and both belong here.** It said Paragon holds the master **and** the document lane. **We held THREE identity spaces** — the third (`paragon.asn_chase_lane`) was undeclared when that sentence was written. **The count was WRONG, and it has since CHANGED**: the third space is now **RETIRED AND EMPTY**. Correcting only the present state would hide the error; correcting only the error would hide the change. |
> | **A-20** | **§6.4** — D-2, the master-absent codes | **RESTATED WITH TODAY'S MEASUREMENT AND WITH HOW IT WAS OBTAINED** (§3.3). It said *"34 distinct material codes"*; **it was 33 when written**, and the population has moved since. |
> | **A-21** | **§7.5** — "5 of the 35 codes that transact" | **The master now holds 42, and ZERO document-lane codes are master-absent.** The row is not deleted — it is restated with what remains true, which is less than it was and not nothing. |
>
> **Nothing in this amendment was found by SOMO.** All seven are ours, and six of the seven are
> corrections to statements we made about our own tree. Recorded as such, because §7.9's lesson was
> that a ledger kept by one party about itself finds the kinds of thing that party looks for.

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

**As of the fourth issue: both your checks have run, R-1…R-6 stand ratified in shape on your side,
and the one collision you raised is ruled in your favour (A-4).** What remains is the part A-9
names — **the shape you ratified came to you as our prose, so the re-check is against the ARTIFACT
and the derived field list, not against this table.**

| # | Item | Where | Substance |
|---|---|---|---|
| **R-1** | **Identity keys on SPECIFICATION** | **§2** | S/4 MATNR semantics: a MATNR is a purchasable item, not a chemical. Accepted on an **irreversibility** argument, not a preference. |
| **R-2** | **Every row carries a `grain` tag** | **§2.2** | `'substance' \| 'specification'`, with confidence and adjudication provenance. This is what survives D-1 either way. **ADDENDUM (ADD-4):** it now has a **first real-data justification** rather than only an argument from irreversibility — SOMO's preliminary reading of their own master is **SUBSTANCE-level where ours is SPECIFICATION-level** (§6.1a). |
| **R-3** | **`materialCode` is OPAQUE — permanently** | **§3** | No prefix stability, ever. **AMENDED (A-3):** the first issue said *both* platforms violate this today. Measured, **only we do** — the clause is **preventative on your side, corrective on ours** (§3.1). It is still the reason the contract exists in writing. |
| **R-4** | **Adoption is not discovery** | **§4** | Both masters self-declared SIMULATED ⇒ no row may claim a correspondence found against a real master. Enforced structurally, not by convention. **AMENDED (A-2):** provenance now also carries **`routeToResolution` — what would settle the row** (§4.1). |
| **R-5** | **An empty map is an honest map** | **§5** | Absence means UNKNOWN. The schema has no way to write "unknown" and nothing in it rewards filling it in. **AMENDED (A-4):** absence is no longer the ONLY honest way to say *not settled* — `'ADJUDICATED_UNRESOLVED'` is a verdict distinct from absence (§5.3). **The no-UNKNOWN rule is sharpened by this, not weakened**, and there is still no way to write "unknown". |
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

**AMENDED (A-18) — STILL NOT BUILT, AND NOW SAID PLAINLY RATHER THAN LEFT AS AN ALIAS.**
`SubstanceRef` is a **bare type alias** — `export type SubstanceRef = string`
(`src/services/sdc/materialMasterRef.types.ts`) — and `MaterialMasterEntry`
(`src/services/sdc/types.ts`) carries **six** fields: `materialCode`, `label`, `materialType`,
`materialGroup`, `canonicalUom`, `bpomApplicable`. **`substanceRef` is not one of them.** Five
master-authoring batches have run since the reservation was written and **not one of them
approached it**, which is the honest signal that it is not merely unscheduled.

⚠️ **AN ALIAS TO `string` RESERVES A NAME, NOT A SHAPE.** Anything an adopter writes into it would
satisfy the type, so the reservation carries no discipline of its own — the discipline is D-1's,
and D-1 has not answered. Stated because a named alias in a shipped module reads as *designed and
pending* when it is *named and undesigned*, and both platforms have already spent analysis on this
field on exactly that misreading (§7.4, and `ANSWER-ABOUT-NOTHING-01` in our register).

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
| **SOMO** | **NONE — measured, not assumed.** No material-code prefix is parsed anywhere in their production code. **Measured ACROSS ALL THREE POPULATIONS at check 2 (A-7): the opacity pass is CLEAN WITH EVIDENCE — zero prefix-reading on material, bulk or finished-good codes.** `materialClass` is a **declared ENUM read as a FIELD** at ~20 sites — already the shape this clause requires — and **their prefixes are AUTHORING CONVENTION ONLY**, carrying no read path | **A reciprocal sweep they ran and reported, widened at check 2** | **None.** A Paragon code-format change does not reach their explosion behaviour |
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

### 3.4 **ADD-1.** The second method rule — **A COMMITMENT TO CHECK IS NOT A FINDING**

**Contributed by SOMO and adopted as shared canon.** It is recorded here rather than only in our
register because it is **the general form of the error §7.9 already admits**: A-3 corrected the
instance, and an instance corrected without its class is a defect waiting to recur under a
different name.

> **A COMMITMENT TO CHECK IS NOT A FINDING.** When one platform tells the other it will look at
> something, the other records it as **OPEN**, not **CONFIRMED**, until the measurement comes back.

**Their reasoning is the part that makes it stick, and it is why the rule is about documents rather
than about care:**

> **A DISCLOSURE AND A MEASUREMENT LOOK IDENTICAL IN A DOCUMENT ONCE QUOTED.**

Once *"they are checking whether their explosion engine parses prefixes"* is carried forward one
document, it reads exactly like *"their explosion engine parses prefixes"* — same sentence
structure, same apparent authority, and **nothing in the later document records which of the two it
started as.** That is the whole mechanism of §7.9. Nobody had to be careless: the transcription was
faithful and the status was the thing that did not survive it.

**Three tiers, and it is worth naming all three because only the middle one is available to us
about SOMO** (§7.8):

| Tier | What it is | How C9 marks it |
|---|---|---|
| **DISCLOSED** | The counterparty has undertaken to look, or has given a preliminary reading | **OPEN.** Named as a disclosure, at the clause. §6.1a is the live instance |
| **REPORTED-MEASURED** | The counterparty ran the check and reported the result | Carried with **how it was obtained** (§3.3) and with the standing note that a party's report about its own code is the best evidence available and **is still not verification** (§7.8). §3.1's clearance of their prefix parsing sits here |
| **VERIFIED** | We read it ourselves | **Unavailable across this boundary in either direction**, permanently. Neither platform can audit the other's tree |

**The standing practice, binding on both platforms:** *every statement one platform makes about the
other's tree carries its status, and a status never silently upgrades.* A row of a table, a clause,
or a quoted sentence that has lost its status has lost the only thing that distinguished it from an
assertion.

**File it beside its two siblings.** `CENSUS-MUST-DERIVE-01` (a population obtained by an unstated
method reports a clean all-clear rather than *"I may have missed some"*) and `DESCRIBE-DONT-RENDER-01`
(**describing a defect can recreate it — name the mechanism, never render it**) are the same family:
none of the three is about the underlying fact being wrong. **All three are about what the act of
writing does to a fact** — a shape-matched census loses the members it never looked for, a
description reproduces its own subject, and a quotation strips a status. **The register's own
hygiene is the failure surface in each.**

### 3.5 **A-10 · A-11.** The reader's half — two canon rows, both SOMO's

**Both point at the READER rather than the writer, which nothing in our canon covered.** Every rule
in §3.3–§3.4 constrains the party *producing* a statement. These two constrain the party
*consuming* one, and the gap they close is the one the counterparty had to find because it is
invisible from the producing end.

#### A-10 — **A STATED LIMIT DOES NOT DISCHARGE THE LIMIT**

> **NAMING A GAP IS NOT CLOSING IT.** An investigation that states what it could not check has done
> its job; **the seat consuming it has not, if it proceeds as though the check were complete.**

**The instance is A-9, and it is theirs.** Their investigating seat **opened by naming exactly what
it could not check** — that its field list came from prose, not from the artifact — and **the seat
above it proceeded as though the check were complete.** The disclaimer was present, correct, and
first. It changed nothing downstream.

**File it beside §3.4's `A COMMITMENT TO CHECK IS NOT A FINDING` — same family, opposite end.** One
governs how a **disclosure is recorded** by the party receiving it; this one governs how a
**disclaimer is consumed** by the party acting on it. Between them they cover both directions of the
same transaction, and **neither is any use without the other**: a status faithfully recorded is
still discarded if the next reader treats a stated limit as a discharged one.

**Both halves of the summary failure are now filed, one from each platform** — ours at §7.11 (*a
counterparty ratifying a summary has not ratified the contract*) and theirs here. That symmetry is
not decoration: **a class filed from only one side would have read as blame rather than as
mechanism.**

#### A-11 — **A RECORD OF WORK DONE IS NOT A CLAIM ABOUT THE THING WORKED ON**

**The generalisation SOMO drew off our collision reframing (A-4), and are adopting platform-wide.**
It is recorded here with its origin because **it is the sentence that resolved
`ADJUDICATED_UNRESOLVED`**: once the two kinds of claim are separated, a row that says *"we looked
and could not close it"* stops looking like a hedged assertion about the correspondence and becomes
an exact assertion about something else.

**And it states the cost of the opposite posture, which is the part worth carrying.** An
honest-state discipline that refuses to write anything until it can write a confident answer
**is itself a loss** — it discards the analysis. **The effort is a fact worth keeping**, and it is a
fact the party that spent it is uniquely placed to record and uniquely likely to lose.

### 3.6 **A-13 · A-14.** The shipping half — **the family's third face, and it was blocking them**

§3.4–§3.5 cover **writing** a statement and **reading** one. Neither covers **shipping** one, and
that is where this contract actually failed. **Both findings are SOMO's, both are procedural, and
both are correct.**

#### A-13 — **A CONTRACT THAT IS NOT PINNED CANNOT BE RATIFIED — ONLY DESCRIBED**

> **COMMITTED-AND-CITED IS THE MINIMUM UNIT OF AGREEMENT BETWEEN TWO SYSTEMS, AND A WORKING TREE IS
> NOT A VERSION.**

**C9 was dirty every time they read it.** The contract, the types module and the field-list
generator were all modified in the working tree across the readings — **so they were reading a
document mid-edit, past the version our own prose described.** Every ratification they gave was
therefore given against **a moving artifact**, which is a stronger version of the A-9 defect: not
merely a summary instead of the artifact, but **no fixed artifact to summarise.**

**The part that stings, and it is the useful half:** **OUR OWN GENERATOR ALREADY SAYS THE HARDER
VERSION OF THIS.** [`C9-required-fields.md`](./C9-required-fields.md) opens by refusing to be
ratified in place of the contract — we wrote that rule, generated it into an artifact, and **did not
apply it one layer out.** **A DISCIPLINE STATED IN AN ARTIFACT DOES NOT PROPAGATE TO THE PROCESS
THAT SHIPS THE ARTIFACT.** It has to be applied to the shipping, deliberately, by someone.

#### A-14 — **AN ARTIFACT DESCRIBED AS ENCLOSED IS NOT ENCLOSED**

> **DELIVERY IS A FACT TO BE CONFIRMED, NOT ASSERTED.**

**THE ENCLOSURE NEVER ARRIVED.** C9 has only ever lived in our repository. Our message said
*"enclosed"* and **carried nothing**. **"Enclosed" and "delivered" came apart silently, and neither
side noticed for two exchanges** — the word did the work of the act, and nothing in either process
checked.

**Note the shape it shares with §3.4:** a disclosure and a measurement look identical in a document
once quoted; **an asserted delivery and an actual one look identical in a message.** In both cases
the failing artifact is *the sentence that stands in for the thing* — and in both cases the fix is
the same shape: **name the status, and make the confirming party the one who can see it.**

**The family now covers all three faces — WRITING, READING and SHIPPING:**

| Face | Class | Where |
|---|---|---|
| **Writing** | A commitment to check is not a finding · a census must derive · describe don't render | §3.3, §3.4 |
| **Reading** | A stated limit does not discharge the limit · a counterparty ratifying a summary has not ratified the contract | §3.5, §7.11 |
| **Shipping** | **A contract that is not pinned cannot be ratified — only described** · **an artifact described as enclosed is not enclosed** | **§3.6** |

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

### 4.2a **ADD-2.** The worked example — **SOMO's, carried with attribution**

**The example below is theirs.** It is reproduced here because it demonstrates the field working in
**prose rather than in schema**, on their own unresolved work, and it is better than anything we
would have written. The identity of the row is theirs to publish; what this document carries is its
**shape**, which is the part that is canon.

**Their crosswalk resolved NOTHING — 0 confirmed of 5 — and was published as 0 of 5.** Its
strongest unresolved row does four things in order:

1. **Names its candidate.** Not "unclear" — the specific correspondence it believes is the answer.
2. **States that the candidate was DELIBERATELY NOT TAKEN.** The row records a decision, not a gap:
   somebody considered it and declined to assert it.
3. **Gives both circumstantial supports.** What makes the candidate plausible, enumerated, so a
   reader can weigh it instead of inheriting it.
4. **Closes with the route:** *one sentence from the network team would settle it.*

**The point, stated plainly:**

> **WITHOUT THAT CLOSING CLAUSE THE ROW IS A BLANK. WITH IT, IT IS AN ANSWERABLE QUESTION WITH THE
> ANSWERER IMPLIED.**

The first three parts are the candidate and the evidence — the two-of-three the first issue of this
document already carried, and the exact configuration §4.2 calls *the shrug*. The fourth part costs
one sentence and changes what the row **is**: not a record of doubt, but **a piece of work with a
named next step and a named owner.** A reader who cannot resolve it can still route it.

**And the headline figure is not a failure — it is the ruling working.** A crosswalk that resolves
zero of five and **publishes zero of five** is §5's no-`'UNKNOWN'`-verdict principle behaving
exactly as designed: *absence is unknown*, silence asserts nothing, and **nothing in the shape
rewards filling it in.** The failure mode was never an empty crosswalk. **The failure mode was five
confident rows** — and every one of them would have looked like progress.

---

## 5. The schema, and why an EMPTY map is an honest map

```ts
interface MaterialMasterRefRow {
  paragon:    MaterialRef;              // { spaceId, materialCode }
  somo:       MaterialRef;
  grain:      'substance' | 'specification';
  verdict:    'EQUIVALENT' | 'NOT_EQUIVALENT' | 'ADJUDICATED_UNRESOLVED';   // AMENDED (A-4), §5.3
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
- **AMENDED (A-4): absence is not the only honest way to say *not settled*.** **ABSENCE MEANS
  NOBODY LOOKED.** A row carrying `'ADJUDICATED_UNRESOLVED'` means somebody looked, formed a
  candidate, and could not close it — a **different fact**, and one this map now keeps. See §5.3.

**§5.1 — the one structural rule on the collection.** A pair may carry **zero, one or two** rows
(one per grain). Two rows at the **same** grain with **different** verdicts is a contradiction and
is invalid. This is the only well-formedness constraint the schema imposes, and it is deliberately
the only one: every other question is an adjudication, not a shape. **A-4 does not add a second
constraint:** an `'ADJUDICATED_UNRESOLVED'` row is **SUPERSEDED by its resolution, never
accompanied by it** — when the route pays off, the row is replaced, and the one-row-per-grain rule
is what says so.

**`spaceId` is required on both sides and is not decoration.** The populations, each stated with how
it was obtained (§3.3):

⚠️ **AMENDED (A-19) — PARAGON'S COUNT WAS WRONG WHEN WRITTEN, AND IT HAS SINCE CHANGED. BOTH
FACTS ARE RECORDED, because correcting only the present state would hide the error and correcting
only the error would hide the change.**

This clause said Paragon holds the authoritative master **and** the document lane — **two.** There
were **three.** A third identity space existed and was undeclared: the **ASN chase lane**, a
vocabulary of `MAT-*` codes that no other lane named and no master row resolved. It was not a
subtlety — it carried a live regulatory consequence, because the prefix rule then deciding BPOM
applicability could not match any code in it, so **an entire vocabulary silently escaped a
compliance check** (our register: `BPOM-OFF-BY-SPACE-01`).

**Today, and this is the change rather than the correction:**

| Space | `spaceId` | State |
|---|---|---|
| The authoritative master | `paragon.material_master` | **42 entries** (was 5 at the first issue). |
| The document lane | `paragon.document_lane` | **33 codes, and ZERO are master-absent** (§6.4). Booked for retirement. |
| The ASN chase lane | `paragon.asn_chase_lane` | ⚠️ **DECLARED, THEN RETIRED. EMPTY.** Its codes were adjudicated and given master rows; **no dispatched ASN can carry a code from it**, because the one ASN creation path builds its lines from the parent purchase order. |
| The supplier-catalogue pointer | `paragon.supplier_catalogue_pointer` | ⚠️ **NOT AN IDENTITY SPACE.** A supplier's *assertion* of which Paragon code their catalogue item corresponds to — a claim about someone else's space, entered by the party that does not own it. **Nothing may join on it.** Two of its values name codes that do not exist, and no ruling has been taken on them. |

**The generalisable part, and it is the reason `spaceId` is required rather than a count:** we did
not discover a third space by counting. We discovered it because a **regulatory check behaved
oddly**, and the count was a consequence. A party can be wrong about how many spaces it holds while
being confident about it, which is exactly the condition a row without a `spaceId` cannot survive.

**SOMO** hold **THREE self-authored populations** under MATNR
semantics — **88 material (ROH+VERP), 17 bulk (HALB), 17 finished-good (FERT)** — **pairwise
disjoint by measurement but NOT ENFORCED**: no cross-contract uniqueness assertion exists, so
**THEY CAN DECLARE THE COLLAPSE; THEY CANNOT PROMISE IT** (A-7, their own correction, running
against their earlier statement of two). **Canonical S/4 is OURS, not a third space of theirs** (A-6, §5.2b). A
row that cannot say which space it means is ambiguous now, not hypothetically.

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
lane retired, a row still needs `spaceId` on **both** sides — because a row names both parties.
**Per-party is the only correct grain for this condition:** each party can state when *its own*
contribution to the ambiguity ends, and neither can state when the field goes away.

#### 5.2a **AMENDED (A-5).** The condition is **AUTHORSHIP, NOT A COUNT** — and A-1's conclusion survives by a better route

**SOMO's check 2 found the remaining softness in the clause, and it is in the word "holds".** They
satisfy *"holds one space"* **TODAY, and only VACUOUSLY — because the counterpart space is EMPTY.**
They hold **zero codes in canonical S/4** (measured, A-7). **The condition holds precisely while the
crosswalk has no S/4 codes in it, and FAILS THE MOMENT THE WIRE LANDS AND THE CONTRACT DOES THE WORK
IT EXISTS FOR.** Their formulation, carried verbatim because it is the reason A-1's conclusion is
right rather than merely correct:

> **A RETIREMENT CONDITION THAT HOLDS ONLY BEFORE THE CONTRACT DOES ANY WORK IS NOT A RETIREMENT CONDITION.**

**So the condition is restated, and the restatement is not a tightening of the same idea — it is a
different idea:**

> **BOTH PARTIES AUTHOR EVERY SPACE THEY HOLD.**

**A COUNT TREATS SPACE-HOLDING AS HOUSEKEEPING** — something a tidy platform gets down to one and
then the field drops. **For SOMO, one space is another organisation's master under Paragon MDG
governance, WHICH THEY CAN NO MORE COLLAPSE THAN RENAME S/4.** No amount of tidying on their side
reaches it, because the obstacle was never their untidiness.

**Composed with §1, the conclusion becomes structural rather than circumstantial.** §1 says a
crosswalk earns its place **only** between spaces owned by different parties. So the authorship
condition can only be satisfied when the row's two sides share an author — **which is exactly the
case in which this crosswalk should not exist at all.** `spaceId` therefore retires **only when the
crosswalk is deleted**, which is the strongest possible form of "never retires", and it no longer
depends on the S/4 programme's timing to be true.

#### 5.2b **AMENDED (A-6).** OPERATOR RULING — **canonical S/4 is the PORTAL's side of C9**

**Our side of this crosswalk IS S/4 material-master identity. That is what `material_master_ref`
exists for**, and the 5-entry SIMULATED master is that space's stand-in, not a different space (§6.4
is the honest statement of the distance between them).

**The consequence, stated explicitly because it changes what SOMO must build:**

> **SOMO NEVER NEED MORE THAN ONE `spaceId` FOR THEIR OWN POPULATIONS, AND S/4 IS NOT A THIRD SPACE
> FOR THEM TO CARRY.**

Their three self-authored populations (A-7) sit on **their** side of a row; canonical S/4 sits on
**ours**. What they do not author, they reference — as the counterpart half of a row, which is the
one place in this schema a foreign identity is supposed to appear.

---

## 5.3 **AMENDED (A-4).** `ADJUDICATED_UNRESOLVED` — **absence and adjudicated-unresolved are DIFFERENT FACTS**

**Raised by SOMO, ruled in their favour, and the collision was real.** It is a collision between two
of our own clauses, and neither was wrong on its own:

| The clause | What it says | Where they meet |
|---|---|---|
| **§5** | **Absence is unknown.** A doubtful row is simply **not written** | A doubtful correspondence produces **no row** |
| **§4.2** | **`routeToResolution` is REQUIRED** on every row | A route can only be carried **by a row** |

> **A ROW THAT IS ABSENT CANNOT CARRY A ROUTE.** So the field added at SOMO's own request (A-2) had
> **nowhere to live**: the only rows that could carry it were the rows §5 said not to write.

**SOMO's resolution, adopted:**

> **ABSENCE MEANS NOBODY LOOKED. AN ADJUDICATED-UNRESOLVED ROW MEANS SOMEBODY LOOKED, FORMED A
> CANDIDATE, AND COULD NOT CLOSE IT.**
>
> **A MAP THAT CANNOT DISTINGUISH THEM LOSES THE MORE EXPENSIVE ONE — THE ONE THAT COST ANALYSIS.**

### 5.3.1 Why this does NOT weaken the no-UNKNOWN rule — **it sharpens it**

**The rule was that SILENCE MUST ASSERT NOTHING, and it still does.** Nothing about absence has
changed: a pair with no row at a grain is unknown at that grain, an empty map asserts nothing at
all, and no consumer may read absence as a gap to be closed.

**The error was assuming absence was the only honest way to say "not settled".** That conflated two
claims:

- **An `'ADJUDICATED_UNRESOLVED'` row ASSERTS NOTHING ABOUT THE CORRESPONDENCE.** The no-UNKNOWN
  property is untouched — the row does not say *maybe equivalent*, and there is no reading of it
  that yields a hedged verdict.
- **It ASSERTS SOMETHING ABOUT THE WORK DONE.** That is a **different claim, and a true one** — the
  generalisation SOMO drew from it and are adopting platform-wide is §3.5's A-11: **a record of work
  done is not a claim about the thing worked on.**

**There is still NO `'unknown'` verdict and still no way to write one.** The vocabulary is pinned
against it: no member of any closed vocabulary in this schema contains the string, and the pin
checks that mechanically rather than trusting the prose above.

### 5.3.2 What the new verdict obliges

- **It carries the full three-of-three** (§4.2): **candidate** (the row), **evidence**
  (`sourceOfTruth` + `evidenceLiveness` + `method`), and **`routeToResolution`**. **This is the row
  shape that field was built for** — A-2 named the requirement and A-4 gave it somewhere to live.
- **It MUST NOT carry `'CERTAIN'`** — a separate invariant from §4.1's, and worth keeping separate:
  **§4.1's is about the EVIDENCE being invented; this one is about the CLAIM being absent.**
  Certainty about an unresolved correspondence is a contradiction, not a strong opinion.
- **NO CONSUMER MAY EVER JOIN ON IT**, at any grain, under any policy, at any confidence. **The
  exclusion is unconditional and is deliberately not a confidence threshold** — raising confidence
  must never reach it, and there is no field that switches it on.
- **It is SUPERSEDED, never accompanied** (§5.1): when the route pays off, the row is **replaced**
  by the resolved verdict.

**Recorded as §7's second counterparty-found item** — the ledger's second entry that we did not find
ourselves, and the second running the direction §7's preamble now says to look in.

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

### 6.1a **AMENDED (A-7 · A-8).** SOMO's check 1 — **the measurement landed, and it corrected the disclosure**

> **STATUS: REPORTED-MEASURED (§3.4, tier 2).** The third issue carried this as **ADD-4, an ADVANCE
> SIGNAL held OPEN** — their preliminary reading, explicitly not a finding. **Their report has now
> landed and it corrected the preliminary reading in part.** The tier machinery is left visible
> rather than tidied away, because **this is `A COMMITMENT TO CHECK IS NOT A FINDING` paying for
> itself inside one cycle**: had the advance signal been recorded as a result, C9 would now carry a
> generalisation from a sample of two as a measured fact about a peer platform's master — **which is
> precisely §7.9, repeated.**

**A-7 · WHAT THE PRELIMINARY READING GOT WRONG, in their words and against their own earlier
position. THEIR DISCRIMINATORS ARE SPARSE AND UNSYSTEMATIC, NOT ABSENT:**

| Discriminator | Present, of **88** material codes |
|---|---|
| **Grade token** | **1** |
| **Concentration** | **5** |
| **Packaging rows with structured capacity** | **12** |

**The earlier *"grade and size do not carry"* was generalised from a sample of two** —
`Glycerin` / `Flip-Top Cap`, the two examples that reached us. **Anywhere our text said they carry
none, it is corrected** (§5, §5.2b, and here). *Sparse and unsystematic* is a materially different
finding from *absent*: it means the axis exists on their side and is **not reliable**, which is a
harder problem than its absence and a much easier one to overstate in either direction.

**A-8 · THE VERDICT, RECORDED HONESTLY — a DATA gap, not a SCHEMA gap.** In their words:

> **If Paragon buys `Glycerin USP 99.5%` and `Glycerin BP 99.0%`, their master holds ONE ROW AND HAS
> NOWHERE TO PUT THE SECOND.**

**And their reason for NOT proposing the easy fix belongs in this document**, because it is our own
honest-silence discipline arriving from their side, unprompted:

> **Adding a grade column would give them a master that can EXPRESS the distinction while its data
> still does not — WHICH IS A QUIETER KIND OF WRONG.**

A schema that can express what the data does not hold **looks complete and reads as authoritative**;
the gap stops being visible at exactly the moment it stops being fixable by inspection. That is
§7's failure mode with the direction reversed, and they declined it on their own initiative.

**Also recorded, because the absence is DEFENSIBLE and would otherwise read as a shortfall:**
their master carries **no confidence and no adjudication provenance**. Those fields are authored
**AT ADJUDICATION TIME, and no adjudication has occurred.** They are **a shape SOMO can build, not
data they hold** — and **C9 does not relax for them**: the fields stay REQUIRED on every row this
schema carries, whoever writes it.

**What survives from ADD-4, now measured rather than disclosed:**

- **The finding is still a GRAIN MISMATCH, not a missing field** — sparse discriminators put most
  of their population at substance grain, not all of it. **C9 ALREADY EXPRESSES THIS; NO SCHEMA
  CHANGE IS IMPLIED**, and none was made for it. (A-4's schema change came from the collision, not
  from this.)
- **It is still the grain tag's FIRST REAL-DATA JUSTIFICATION**, and now on a measured basis:
  `grain` had rested on the irreversibility argument (§2.2), sound and entirely hypothetical.
- **It still sharpens D-1** (§6.1). If our peer platform's master is substance-level **for most of
  its population and inconsistently more precise for the rest**, the substance rollup (§2.4) is not
  an additive convenience — **it is the axis on which any row sourced from their master can be
  written at all**, and the sparse discriminators are exactly what makes per-row `grain` tagging
  unavoidable rather than uniform. Procurement should have this before ruling.

> ### ⚠️ AMENDED (A-18) — **THE SENTENCE ABOVE IS CONTRADICTED BY §7.4 OF THIS DOCUMENT, AND NOTHING COMPOSED THEM**
>
> **`substanceRef` DOES NOT EXIST.** The paragraph above calls the substance rollup *"the axis on
> which any row sourced from their master can be written at all"* and rests a live escalation to
> our procurement team on it. **§7.4 of this same document declares that the field is not built.**
> Both clauses have shipped in every issue since the fourth. Neither platform composed them.
>
> **This is worse than a missing field, and the reason is the shape rather than the size.** A
> missing field is found by whoever reaches for it. **A CLAIM CONTRADICTED BY ITS OWN DOCUMENT'S
> LEDGER IS FOUND BY NOBODY, BECAUSE BOTH HALVES READ AS DILIGENCE** — writing §7.4 down *was* the
> disclosure working, and that is precisely what stopped anyone checking this paragraph against it.
> §7 exists because a prior audit found eleven doc-vs-code divergences and ruled that a new contract
> may not start with a twelfth; **the ledger did its job perfectly and then sat inert while the body
> of the same document asserted the opposite.**
>
> **Both platforms have already paid for this once.** SOMO returned a verdict on the field —
> *"present for RM, absent for PM"* — and **the answer was about nothing.** The information needed
> to prevent that was in this document the whole time.
>
> **WHAT CHANGES FOR D-1, and procurement should receive it in this form:** the escalation as sent
> asked *how* a substance value is used. **It must also ask whether the field is BUILT AT ALL** —
> a materially larger question, because the answer *"substance carries no commercial meaning"*
> closes the escalation **and** deletes the axis this paragraph depends on. The two were never
> separable; they were only ever written apart.
>
> **NOT REPAIRED HERE, and the repair is named rather than guessed at.** We built the obvious guard
> — a check that a §7 ledger row's subject is not simultaneously claimed true in the body — ran it
> against C9, and **measured 28 firings, 0 true positives, and this defect not among them.** It
> misses because the paragraph above never names `substanceRef`; it cites `(§2.4)` in prose, so
> **the contradicting sentence and the ledger row share no token a checker can join on.** The guard
> was refused rather than shipped noisy. **This clause carries the contradiction in writing instead,
> which is the weaker fix and the honest one.**

### 6.1b **A-12.** The SUMMARY-DELTA measurement — **OPEN, a DISCLOSURE not a finding (§3.4)**

> **STATUS: OPEN.** SOMO have undertaken to report it; **per §3.4 it is recorded as a commitment,
> not as a result.** Nothing in this document depends on it.

**They are re-running check 1 against the ARTIFACT and the derived field list (A-9), and will report
THE DELTA BETWEEN OUR PROSE SUMMARY AND THE ARTIFACT** — any required field the prose named that the
artifact does not require, and **any the artifact requires that the prose never named.**

**Why it is worth a section of its own: NOBODY HAS MEASURED WHAT A SUMMARY LOSES AGAINST ITS
SOURCE.** A-9 establishes that ratifying a summary is not ratifying the contract; that is an
argument. **The delta is the first number ever put on it**, in either direction, and it is available
only because both platforms happen to hold the summary, the artifact and the ratification decision
that ran on the wrong one.

**The disposal condition, stated in advance:**

- **EMPTY ⇒ our summary was faithful and their shape-ratification was sound.** The class at §7.11
  stands as a process rule that cost nothing this time, and this section is deleted.
- **NON-EMPTY ⇒ both platforms learn what a summary costs**, field by field. Every entry is a
  ratification that ran on a shape the counterparty had not seen, and the delta becomes the register
  of exactly which ones.

### 6.2 D-COMP-BPOM · with compliance — **AMENDED (A-17): MECHANISM SHIPPED, CONTENT STILL UNANSWERED**

Stated plainly, in three parts that are commonly conflated. **Part 2 is now done and part 3 is not,
and separating them is the whole value of this clause.**

1. ~~**What happens today:** BPOM lot-check applicability is **derived from a string prefix**
   (`AI-`/`FR-`) and **FAILS OPEN** — an unrecognised prefix yields *"no check required"*.~~
   **NO LONGER TRUE.** That function is deleted (§7.3).
2. **The MECHANISM is ours to fix.** ✅ **DONE.** It is a master FIELD — `bpomApplicable` on
   `MaterialMasterEntry`, three-valued — read through one refusal-shaped lookup, and the fail-open
   default is now a **refusal by name** at the goods-receipt surface.
3. **The RULE CONTENT is compliance's to state.** ⚠️ **STILL UNANSWERED.** *Which material groups
   require a BPOM lot check* was never ours to invent, and we did not invent it.

**⚠️ ALL 42 VALUES ARE PROVISIONAL** — proposed from the material's declared GROUP, **never from
its code**, and pending compliance's ruling. Today's distribution:

| | rows |
|---|---|
| `APPLICABLE` | **20** |
| `NOT_APPLICABLE` | **11** |
| ⚠️ `UNDETERMINED` — *nobody has ruled* | **11** |

**THE HONEST CONFORMANCE STATEMENT, AND IT IS BETTER THAN THE ONE IT REPLACES.** `UNDETERMINED` is
**not** quarantine: it stores an explicit **absence** of determination and **refuses** on it,
identically to a code the master cannot resolve at all. **Two of those eleven rows are on shipments
that are receivable today, and the goods-receipt surface will not let an inspector past them.** An
operator meets this escalation as a blocked line naming the material, rather than not meeting it at
all.

> **AN UNANSWERED ESCALATION THAT BLOCKS WORK IS IN BETTER SHAPE THAN ONE THAT SILENTLY DOES NOT.**
> Before this, the same absence of a compliance ruling rendered as a confident *"no check
> required"*. The ruling is no closer; **what changed is that its absence is now visible to the
> person it protects.**

**Why the ordering mattered, recorded because it was nearly reversed.** Converting the mechanism
*before* the master could resolve the codes would have replaced an unratified PREFIX convention
with an unratified FIELD convention — **the same unratified rule in better clothes, and harder to
dislodge once it looks principled** — or, wired earlier still, would have refused essentially every
received line for a **vocabulary** reason wearing a **compliance** reason's clothes. The mechanism
shipped only once every code the receiving surface can be fed was master-resolvable.

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

**AMENDED (A-6) — what the ruling changes here, and what it does not.** **The SPACE is ours**:
canonical S/4 is the portal's side of C9 (§5.2b), and you hold zero codes in it today (A-7). **The
CROSSWALK TO IT is still yours to build, and its grain is still the open question** — the ruling
moved the ownership of the target space, not the adjudication. **What it does remove is a
distraction:** you are not being asked to carry S/4 as a third `spaceId`, and R-6 is a question
about grain alone.

### 6.4 **AMENDED (A-20).** The master-absent codes — **restated with today's measurement, and with how it was obtained**

⚠️ **THE FIGURE IN THIS CLAUSE WAS WRONG WHEN WRITTEN, AND THE POPULATION HAS MOVED SINCE.** Both
are recorded, per §3.3: **a number in a contract carries an obligation to say how it was got**, and
this one carried none — which is why nobody could tell it was off by one for four issues.

~~*Paragon's document lane names 34 distinct material codes; the master names 5; 30 are
master-absent.*~~

**It was 33, not 34.** The count was taken by inspection, and inspection is why it was wrong. It is
now taken by a **derived census** and the method is stated below rather than implied.

**TODAY:**

| | |
|---|---|
| The authoritative master | **42 entries** (5 seeded · 25 adopted · 5 authored · 7 authored). |
| The declared document lane | **33 codes** — the same 33 throughout. **The lane never shrank**; the master became able to resolve it. |
| ⚠️ Document-lane codes the master cannot resolve | **ZERO.** |
| Distinct codes anywhere in our tree | **44**, across the four spaces in §5. |
| ⚠️ Tree-wide codes the master cannot resolve | **TWO**, and **neither is a Paragon code**: both are supplier *assertions* in the catalogue-pointer surface, naming Paragon codes that do not exist. **No ruling has been taken on them.** |

**HOW IT WAS OBTAINED (§3.3), because this is the half the old figure lacked.** A census walks
**every non-test module** in `src/`, **derives** which fields carry material codes rather than
naming them in advance, and **derives** the lane set from the modules it reaches. It is pinned to
the floor, so the number cannot drift without a build failing. **One exclusion, named rather than
buried:** test modules, which deliberately carry spoof codes whose purpose is to be unresolvable —
folding them in would make every census report a tree that does not exist.

⚠️ **The population moved in BOTH directions and only one direction is flattering.** Tree-wide
master-absent went **39 → 14 → 9 → 12 → 9 → 2**. The rise from 9 to 12 came from a batch that added
no code to the tree — it **widened the census** and found codes a narrower scope could not see. **A
figure that only ever improves while its scope stays narrower than the tree is a figure improving
about itself.**

**What makes the remainder safe rather than urgent:** `SDC_MATERIAL_KNOWN` refuses an unresolvable
code **by name** on all five SDC creation transitions, `requireUom`
(`src/services/sdc/materialMaster.ts:101-109`) cannot fabricate a unit behind it, `labelOf` echoes
the raw code honestly on display, and — new since the fourth issue — the goods-receipt surface
refuses an unresolvable code outright (§6.2). **A master-absent code is refused or honestly echoed
today — never silently wrong.**

**Consequence for this contract, restated because the old one no longer holds and the new one is
better:** the fourth issue said *most Paragon material identity in the tree is not in the space this
crosswalk points at* — a row naming the master addressed **5** codes. **It now addresses 42, and
every document-lane code resolves into it.** `spaceId` is still required (§5), and **the reason has
changed**: not because the master is a minority of our identity, but because we hold a **pointer
surface** carrying supplier assertions about our space, and a row that cannot say which space it
means could join on one.

---

## 7. WHERE OUR IMPLEMENTATION CANNOT HONOUR WHAT THIS DOCUMENT STATES

**This section exists because the last audit of our contract documents found ELEVEN doc-vs-code
divergences and every one ran the same direction — the documents understated the implementation**
(C7/C8 correction records). Eleven errors sharing a direction are one systematic cause, not eleven
drafting mistakes. **This document is not permitted to start with a twelfth**, so its
non-conformances are enumerated here rather than discovered later.

**ADD-3 — SOMO's observation on this ledger, carried because it reads the eleven differently than
we did:**

> **A DIVERGENCE LOG THAT ONLY EVER RUNS ONE DIRECTION IS NOT BEING READ HARD ENOUGH.**

We treated the uniform direction as evidence about the **writing** — one systematic cause in how
contracts were harvested. **Their reading is that it is also evidence about the READING:** a ledger
that keeps producing instances of exactly one kind is being kept by someone who already knows which
kind to look for, and the instances of the other kind are not absent — **they are unsearched.**
§7.9 below is the first entry that runs the other way, and it was found **by the counterparty, not
by us**, which is the observation's own best support. Both directions are now in scope for this
ledger by rule, not by luck.

| # | The contract states | What we actually ship |
|---|---|---|
| **7.1** | A crosswalk exists with a defined shape | **ZERO ROWS, ZERO CONSUMERS.** Nothing in the tree reads a crosswalk. The types module is **declared inert** and imported only by its own contract test. |
| **7.2** | `MaterialRefJoinPolicy` governs which rows a consumer may join on | **There is no policy engine.** The policy is a SHAPE, enforced by nothing at runtime. No code path consults it. |
| **7.3** | `materialCode` is opaque; nothing may parse it (§3) | ✅ **AMENDED (A-15) — DISCHARGED. WE NO LONGER PARSE IT.** This row read *WE PARSE IT* for four issues: `inferBpom` derived a REGULATORY flag from the prefix and failed open. **It is deleted.** No prefix parse survives on any path a receipt can travel, and that is asserted as a **derived tree-wide property**, not a list of files somebody has to remember to extend. The parse survives only as **restatements inside test files that exist to prove it is retired** — kept deliberately, because deleting them would delete the before-and-after along with the defect. **This is the longest-standing entry in this ledger and the first to close.** The replacement is §6.2's master field; its **content** half is still open there, which is a different non-conformance and is not this one. |
| **7.4** | Identity keys on specification, with an optional substance rollup | ⚠️ **AMENDED (A-18) — STILL OPEN, AND NOW WITH ITS REASON STATED RATHER THAN LEFT AS A SILENT ALIAS.** `substanceRef` is not on `MaterialMasterEntry`; `SubstanceRef` is a **bare alias to `string`**, which reserves a name and no shape (§2.4). **Five master-authoring batches have run since the reservation and none approached it.** It is not unscheduled — **it is undecided**, and D-1 is what decides it. ⚠️ **AND THIS ROW IS CONTRADICTED BY §6.1a OF THIS DOCUMENT**, which rests a live escalation on the field being the axis any SOMO-sourced row is written on. Both clauses have shipped together since the fourth issue and **nothing composed them**; the contradiction is now carried inline at §6.1a. |
| **7.5** | The crosswalk points at Paragon's material master | ⚠️ **AMENDED (A-21) — RESTATED, NOT DELETED, because what remains true is less than it was and is not nothing.** This row said *that master has 5 entries* and *30 further codes transact and are not in it*. **The master now holds 42, and ZERO document-lane codes are master-absent** (§6.4). **What is still a non-conformance:** the crosswalk this contract defines has **no rows and no consumers** (§7.1), so a master that resolves everything resolves it for **nothing that reads the crosswalk** — the growth changed our own tree's honesty, not this schema's. **And two tree-wide codes still fail to resolve**: both are supplier assertions in the catalogue-pointer surface, which is **not an identity space and may not be joined on** (§5). |
| **7.6** | Confidence, provenance and liveness are recorded per row | **Never exercised.** No row has ever been written, so the invariants in §4.1–§4.2 are **asserted, not proven by use.** They are pinned as type-level facts only. **This now includes `routeToResolution` (A-2): a required field on a table with no rows is a promise, and it is recorded here as one.** |
| **7.7** | `Uom` normalization (`EA` vs `PCS`) | **Unresolved and dormant** (C8 §3.2). Every strong substance pair to date is `KG`; the divergence goes live the moment a packaging pair enters a join. This schema does not resolve it. |
| **7.8** | Both parties' spaces are named and addressable | **We cannot verify SOMO's side at all.** Their codes are illustrative and their canonical-S/4 crosswalk is unbuilt (§6.3). Every statement here about SOMO's space is *their* declaration, carried, not confirmed — **and that now cuts in the flattering direction too: §3.1's clearance of their prefix parsing is a sweep THEY ran and reported, which we can no more audit than we could the hazard it replaced.** The asymmetry to keep: a party's report about its own code is the best evidence available and is still not verification. |
| **7.9** | **AMENDED (A-3).** The first issue's §3.1 stated as fact that SOMO's explosion engine parses `RM-`/`PM-` prefixes | **IT DID NOT.** We carried a hazard they had undertaken to *look for* (C8 §4.6) as a hazard they *had*, and published it in a contract document. **This is the first C9 divergence and it ran the opposite direction to the eleven C7/C8 ones** — not understating our own implementation, but **overstating a defect in the counterparty's.** Corrected in §3.1; recorded here because a ledger that only catches the familiar direction is not a ledger. |

| **7.10** | **AMENDED (A-4).** The first three issues stated that absence was the ONLY way to express *not settled*, while §4.2 required a route on every writable row | **THE TWO CLAUSES COLLIDED AND A ROW COULD SATISFY BOTH ONLY BY NOT EXISTING.** A row that is absent cannot carry a route, so `routeToResolution` — added at SOMO's own request one issue earlier — **had nowhere to live.** **This is §7's SECOND counterparty-found item**, and the second running the direction the preamble now says to look in. Resolved in the shape (§5.3), not merely in the prose: the verdict vocabulary changed and **the pin moved with it.** |
| **7.11** | **AMENDED (A-9).** *"SOMO builds against this"* (§8) — the reason a types module exists at all | **C9 IS NOT IN SOMO'S REPOSITORY. THEY HAVE BEEN RATIFYING A DESCRIPTION OF THE ARTIFACT, NOT THE ARTIFACT** — their field list came from **our prose summary** of `materialMasterRef.types.ts`. **This is `COMMENT-AS-CONTRACT-01` aimed at ourselves, one boundary out:** §8 claims the module inverts that class by making the document the authority and pinning the code to it, and **the inversion holds inside our repository and stops at its edge.** Two things follow, and only one of them is fixed here. **FIXED:** [`C9-required-fields.md`](./C9-required-fields.md) — the complete required-field list, **DERIVED from the module and pinned to it**, to be sent alongside this document. **NOT FIXED:** every ratification given before it existed was given against prose, and **A-12 is the measurement of what that cost.** |

| **7.12** | **AMENDED (A-13/A-14).** This document has been described to SOMO across four issues as a contract they may ratify | **IT WAS NEVER DELIVERED AND NEVER PINNED.** C9 has only ever lived in our repository; our messages said *"enclosed"* and carried nothing, and the contract, the types module and the field-list generator were **modified in the working tree between their readings** — so they were reading **a document mid-edit, past the version our prose described.** **Two exchanges passed with neither side noticing.** This is the only entry in this ledger that made ratification **impossible rather than merely uninformed**, and it is fixed by the citation block at the head of this document: **all three paths, one SHA, and any later amendment is a new SHA and a new ratification.** |

| **7.13** | **AMENDED (A-16).** This ledger records where our implementation falls short of this document | ⚠️ **IT DID NOT RECORD THE OPPOSITE, AND THE OPPOSITE HAPPENED.** `C9-STALE-BY-FIX-01`. Between the fourth issue and this one **we fixed §7.3** — and this document went on declaring the defect, citing a line range in a file that no longer holds one. **THREE OTHER CONTRACT DOCUMENTS DID THE SAME** (C7 §6.1, C8 §4.6, the package README), each giving the deleted function as a live reason for a design position. **A CONTRACT CAN GO STALE BY BEING FIXED.** This is ADD-3 with the polarity reversed: their observation was that a one-directional log is under-read, and we took it as a lesson about **understating our own implementation**. The direction still unread is the one where **a divergence CLOSES and the ledger keeps declaring it** — because a document that overstates our conformance is caught by anyone who reads the code, and **one that understates it is caught by nobody, since the discrepancy is in our favour and reads as caution.** ⚠️ **ASYMMETRY, NAMED AND NOT CLOSED — BUT NOT PERMANENT EITHER, AND THE DIFFERENCE MATTERS.** Only C9's §7 is pinned to the floor; the other three were corrected by hand and **nothing will fail if they go stale again.** **A pin that would close it is buildable and is BOOKED** — see `CITATION-CONVENTION-BLOCKS-THE-PIN-01` in our register. It is blocked on a documentation chore, not on a design problem: C7 and C8 cite **bare basenames** (`types.ts`, of which our tree holds four) where C9 cites **full repo-relative paths**, so a mechanical resolver measures the citation convention instead of conformance — probed at a **47% false-positive rate, with every false positive a path ambiguity and none a document error.** ⚠️ **DO NOT READ THIS ROW AS CLOSED. It holds until that chore runs, and the chore is not booked to a batch.** |

**None of the above blocks ratification of the SHAPE**, which is what R-1…R-6 ask for. All of it
blocks any claim that the crosswalk is *operational*, and no such claim is made. **§7.12 is the one
exception and it is now discharged**: until this issue was committed and cited, there was no version
of this contract to ratify at all.

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
   peer platform to mirror. **AMENDED (A-9) — and until this issue we never handed it to them.**
   They mirrored our **prose about** the module (§7.11). The claim in this point was true about the
   artifact and false about what crossed the boundary, which is the whole of A-9. The repair is
   [`C9-required-fields.md`](./C9-required-fields.md): **generated from this module, pinned to it,
   and explicitly not a summary** — it carries every field and refuses to carry the invariants,
   pointing back here for them.
4. **It inverts `COMMENT-AS-CONTRACT-01`.** That class named the hazard of code comments quietly
   amending a ratified contract with no review gate. Here the document is authority and the test
   pins the code to it — the same coupling, running the safe direction.

**The honest cost, stated:** this adds an unused module. It is **declared inert in its own
header**, it is one file with no importers outside its test, and **deleting it costs nothing but
the anti-drift property**. If the operator prefers the document alone, that deletion is the whole
reversal. **A-9 adds a generator and a generated document, not a second inert contract surface** —
the renderer lives under `__tests__/` with the pin, so **the shipped inert surface is still exactly
one file.**

---

## 9. What we need from SOMO

| Ask | Why we cannot answer it |
|---|---|
| **Ratify or amend R-1…R-5** | They are the shape; a shape ratified by one party is a draft. |
| **R-6 — the grain of your canonical-S/4 crosswalk** (§6.3) | If it asserts at substance grain and we key at specification, the composition is unsound and neither side would see it from its own tree. |
| ~~**Whether your explosion engine can stop reading `RM-`/`PM-` prefixes**~~ — **ANSWERED, and the premise was ours and wrong** (§3.1) | **Withdrawn.** Your sweep measured no material-code prefix parsing in production; `materialClass` is already a field. ✅ **AND THE REMAINING HALF — OURS ALONE — IS NOW DONE (A-15).** `inferBpom` is deleted; §7.3 is discharged. **Neither party parses a material code.** The clause you were asked to hold preventatively is now held on both sides by construction rather than by undertaking. |
| **Confirm the `SEMANTIC-IN-A-STRING` cousin is out of the crosswalk's path** (§3.1a) | The echelon role carried only in a display string is yours to place; what we need is the narrower assurance that **no field this contract defines** — `materialCode`, `spaceId`, `sourceOfTruth`, `routeToResolution` — carries meaning either side is expected to parse. |
| **Ratify A-1…A-8 — AGAINST THE ARTIFACT, not against this document's prose** (A-9, §7.11) | **This is the ask that changed.** A-1/A-2/A-3 were accepted verbally; A-4/A-5/A-6 you have accepted since. **All of it was accepted against descriptions.** [`C9-required-fields.md`](./C9-required-fields.md) ships with this issue for exactly that reason: **check the shape you are mirroring against the derived list, and this document for everything the list refuses to carry.** |
| ~~**Your check-1 report, as a MEASUREMENT**~~ — **LANDED** (§6.1a) | **Closed.** It corrected the advance signal: your discriminators are **sparse and unsystematic, not absent**, and the verdict is a **DATA gap, not a schema gap**. Recorded with your reasoning for declining the grade-column fix, which we would have been glad to have written ourselves. |
| **The SUMMARY-DELTA report** (§6.1b, A-12) | Held **OPEN** as a commitment, not a result. **Nobody has measured what a summary loses against its source**, and only you can — you hold our prose, and now the artifact, on the other side of the boundary it crossed. |
| **Your `EA`/`PCS` normalization position** (§7.7) | Dormant on our side; it becomes load-bearing on the first packaging pair, which is likelier to arise from your BOM than our master. |

**Roughly a two-week commitment on your side once frozen**, per the CP-2 schedule. Nothing here
is frozen until you reply in writing.

---

## Provenance

**First issue** grounded in shipped code at `main` `23eac6f`; **second issue (A-1/A-2/A-3)** at
`main` `3860fe4`; **third issue — CANON ADDENDUM (ADD-1…ADD-4)** at `main` `6560fe6`, docs only;
**fourth issue — AMENDMENT 2 (A-4…A-12)** at `main` `50f2858`, **which DOES change the schema
(A-4), so the pin moved with it** (§8) and the derived field list ships with it (A-9);
**fifth issue — AMENDMENT 3 (A-15…A-21)** at `main` `2dd7f7f`, **docs only — no schema change, so
the types module and the derived field list are byte-identical to the fourth issue.** The pin moves
regardless, because this document's own text changed and A-13 makes any amendment a new SHA and a
new ratification.

⚠️ **THE PROVENANCE RATIO, RECORDED AS A MEASUREMENT RATHER THAN AN IMPRESSION: 0 of 7 found by
SOMO; 6 of 7 are corrections to statements WE MADE ABOUT OUR OWN TREE.** Every prior issue's
corrections came from the counterparty's checks. This one came entirely from re-reading our own
claims against our own code.

**And the ratio is evidence about the READING, not about the writing.** The six were not new
mistakes — a wrong space count, a number taken by inspection, a reservation nobody approached, a
ledger row contradicted by its own body — **most of them had been true-and-uncorrected for four
issues.** Nothing about the tree changed to reveal them; what changed is that somebody looked in a
direction the ledger had not been kept in. That is ADD-3's observation applied to ourselves and
then measured: **a log that keeps producing one kind of instance is being kept by someone who
already knows which kind to look for, and the other kind is not absent — it is unsearched.** §7.13
is the kind we had not been searching for. Every
claim about our own tree carries a `file:line`; **every claim about SOMO's tree is now marked with
how it was obtained** (§3.3) **and, as of ADD-1, with its STATUS — disclosed or reported-measured**
(§3.4) — the one that carried neither is §7.9. Companion
types: `src/services/sdc/materialMasterRef.types.ts` (inert, zero rows). Pinned by
`src/services/sdc/__tests__/materialMasterRef.contract.test.ts`. Companion artifact:
[`C9-required-fields.md`](./C9-required-fields.md), **generated** by
`src/services/sdc/__tests__/deriveC9FieldList.ts` and pinned to the module in the same suite. Predecessors and their rulings:
[C7](./C7-pr-intake.md) (PR intake), [C8](./C8-forecast-publication.md) (forecast publication —
§4.0 master declaration, §4.1 the external clock, §4.3 adoption-not-discovery, §4.4 D-1, §4.6 the
reciprocal prefix hazard). Batch record: `docs/findings.md`, CP-2 · Batch 2 census and Batch 2a.
