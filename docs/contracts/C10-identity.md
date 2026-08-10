# C10 — Identity, authority and approval

**The identity contract.** Who a person is, what they may do, on whose behalf, and how an
approval is recorded — for a platform that today **contains no persons at all**.

**Status:** CONTRACT · **FIRST ISSUE, 2026-08-10** · generated from code-truth at `main`
`df585c5` · **MODEL AND PRECONDITIONS ONLY. ZERO CODE. ZERO TYPES. ZERO FIXTURE PERSONS.**

Nothing in this document is implemented. It is issued **before** the first line of identity code
deliberately, because four of its clauses (§6) are **unfixable after the first attributed record
is written** and are free today.

> ## ⚠️ HOW TO CITE THIS CONTRACT — a working tree is not a version
>
> **Adopted from C9 (A-13/A-14), unchanged, and adopted BEFORE the failure rather than after it.**
> C9 learned this by shipping four issues under one filename to a counterparty reading a
> mid-edit working tree. This contract starts where that one arrived.
>
> **This contract is ratifiable only at a COMMIT.** Any issue of it ships:
>
> | What ships | Why |
> |---|---|
> | **The pinned SHA** | The version. A filename is not one |
> | **The path** — `docs/contracts/C10-identity.md` | What was read |
> | **The hash of every path cited**, with **which bytes were hashed** | `core.autocrlf` makes a bare `sha256` unverifiable across platforms — send the **git blob id** as well, and say which is which |
>
> **ANY LATER AMENDMENT IS A NEW SHA AND A NEW RATIFICATION.** A description of this document is
> not this document (C9 §7.11), and an artifact described as enclosed is not enclosed (C9 §3.6).

---

## What the team is asked to ratify

Seven items. **Five are PROVISIONAL rulings already taken** — strategist-ruled on best practice
and recorded as decisions TAKEN, on the `OVERRIDE_REASONS` precedent, so that ratifying is
**agreeing with something written down** rather than discovering what the model quietly assumed.
Each carries its **disposal condition**: the fact that would replace it.

| # | Item | Where | Substance |
|---|---|---|---|
| **R-1** | **The governing rule** | **§1** | **AUTHENTICATION IS BOUGHT. AUTHORISATION IS OURS.** The person record is ours to shape and F1's to populate |
| **R-2** | **The model — six new objects, three survivors** | **§3** | `PersonaType` demoted to tenancy · `Person` × subject binding · `BusinessRole` · four append-only ledgers · **`TransitionRole` is the permission atom and no parallel vocabulary is invented** |
| **R-3** | **Approval is a LEDGER + a POLICY over the EXISTING machine** | **§4** | Not a new machine. States-per-approver explodes the alphabet, turns a threshold change into a schema migration, and makes escalation **a clock-fired transition — a compile error in this tree** |
| **R-4** | **D-ID-1 · `personId` is portal-minted and permanent** | **§5.1** | **THE ONE IRREVERSIBLE DECISION.** Never the IdP subject; subjects bind `1..n` and are swappable |
| **R-5** | **D-ID-3 · NO TYPED-NAME ATTRIBUTION** | **§5.2** | A standing rule over ALL attribution until session-resolved identity exists. A typed name is **forgeable and worse than nothing because it looks like attribution** |
| **R-6** | **D-ID-7 · the stamp carries `personId` ONLY** | **§5.5** | UU PDP. **This OVERRIDES the ratified Seat-3 `Person` shape and contradicts shipped code** (§8.2). `displayName` resolves at read, never copied into a permanent record |
| **R-7** | **The four preconditions** | **§6** | What must exist before the FIRST attributed record. Each is **unfixable later**, and all four are free today |

**Open, and deliberately not resolved here:** **D-ID-2** (supplier-side identity provider) and
**D-ID-5** (registration-review scope) — §7.

---

## 0. Scope

**In scope.** The shape of a person; how a person binds to an authenticated subject; how
authority is granted, bundled, delegated and routed; how an approval requirement is expressed and
how an approval act is recorded; and what must be true before the first record in this platform
names a human.

**Out of scope, explicitly.** **Authentication** — the mechanism by which a subject proves it is
itself (§1). **Any person record.** No fixture person, no `sim-usr-*` value, no seeded role
assignment is published with this contract and none may be inferred from it. **Session
plumbing** — the seam flip in §6.2 is stated as a precondition, not designed here. **The
supplier-side identity provider** (D-ID-2, §7.1) and **registration-review scope** (D-ID-5,
§7.2).

---

## 1. THE GOVERNING RULE — authentication is bought, authorisation is ours

> **AUTHENTICATION IS A COMMODITY AND WE BUY IT. AUTHORISATION IS THE PRODUCT AND WE BUILD IT.**
>
> **THE PERSON RECORD IS OURS TO SHAPE AND F1'S TO POPULATE.**

The distinction is not a preference about vendors. It is a statement about **which of the two
carries procurement semantics**. "Is this subject who it claims to be" is a solved,
interchangeable problem with a certified market. "May this person approve a purchase requisition
of this value for this plant this week, and did they, and on whose behalf" is **the platform**.
Buying the second means buying somebody else's model of your business.

**Who owns which identity — stated because three different systems own three different things
and the platform has silently conflated them:**

| Identity | Owner | Consequence for this contract |
|---|---|---|
| **The VENDOR — the company** | **SAP.** The vendor master is S/4's, and so is **every document number** (PO, GR, invoice, contract) | We never mint a company identity, and a supplier's *company* identity is not a person identity. `supplierId` is a **tenancy** fact |
| **The PERSON — Paragon staff** | **The corporate IdP.** Paragon's directory authenticates its own employees | We hold a **binding**, not a credential (§3.2). F1 OIDC populates it |
| **The PERSON — supplier staff** | ⚠️ **NOBODY. UNPROCURED.** | **D-ID-2, OPEN** (§7.1). The single largest hole in this contract, and it is named rather than assumed away |
| **AUTHORISATION — roles, policy, approvals, delegation, assignment** | **The portal. Entirely.** | Everything in §3 and §4 |

**The consequence, stated plainly:** an IdP outage must be able to stop people **signing in**
without changing **what anybody is allowed to do**, and swapping the IdP must not rewrite a single
stored authorisation record. §5.1 is the ruling that makes that true, and it is the one ruling
here that cannot be revisited later.

---

## 2. WHAT EXISTS TODAY — measured, not remembered

> ## ⚠️ THE PLATFORM CONTAINS NO PERSONS.

This is not a gap in a feature. It is the absence of an **object**, and it is the deepest
structural absence an external coverage census found in the platform. Everything below is read
out of the shipped tree.

| What exists | Where | What it actually holds |
|---|---|---|
| `PersonaType` | `src/context/CurrentIdentityContext.tsx:8` | **`'buyer' \| 'supplier'`. Two values.** A SEAT, not a human |
| `CurrentIdentity` | `src/context/CurrentIdentityContext.tsx:10-14` | `{ personaType, supplierId, supplierName }`. **A persona, a tenant and a company. No human** |
| The DR-10 audit actor | `actorKey(scope)`, C3 | **`'buyer:all'`** — pinned in `enforcementSetCommand.test.ts:354` beside `not.toContain('usr-014')` |
| `PERSONA_ROLES` | `src/services/transitions/roles.ts:18-89` | **The persona IS the authorisation object.** A seat holds 60+ transition-roles because it is a seat |
| `ActingPerson` | `src/lib/enforcement.ts:339-345` | **The one shape in the tree that names a person** — and nothing can fill it |
| `ActorAttribution` | `src/lib/enforcement.ts:382-384` | `RESOLVED` \| `UNATTRIBUTED` + reason. The honest discriminated absence |
| `UNATTRIBUTED_REASONS` | `src/lib/enforcement.ts:359-368` | Two members. **No `SYSTEM` member, deliberately** (§6.4) |

### 2.1 `PersonaType` is a SEAT, and the platform has been reading it as a person

`capabilitiesFor(scope)` derives every capability from `PERSONA_ROLES[scope.personaType]` ×
the flow catalog (`roles.ts:114-123`). **The unit of authority is therefore "buyer", singular,
tenant-wide.** Every buyer employee at Paragon holds identical authority, including
`invoice:approve`, `invoice:pay` and `enforcement:set`, because there is exactly one buyer.

### 2.2 The audit trail cannot substitute for attribution — and it reads as though it can

`ENF-EVENT-ACTOR-IS-A-PERSONA-01`, already registered, is the finding this contract is built on
top of:

> The DR-10 actor is `buyer:all`, so **"the audit trail already records who did it" is FALSE, and
> false in a way that reads as true.**

An override or approval leaning on the DR-10 actor records **"a buyer did this"** in the place
where the record says **"this person accepted this risk"**.

### 2.3 ⚠️ THE WINDOW IS OPEN TODAY, AND IT CLOSES AT THE FIRST ATTRIBUTED RECORD

**Measured, and it is the reason this contract is issued now rather than at F1:**

- The enforcement setting ledger **ships empty by ruling** — `lib/enforcement.ts:83-87`.
- The E4 seed records its acts with `SEED_ACTOR = { kind: 'UNATTRIBUTED', reason:
  'NO_PERSON_IN_SESSION' }` — `enforcementSeed.ts:93-96`.
- `overrideCompletes` returns `false` for every override this tree can construct —
  `lib/enforcement.ts:778-780`.
- The only `personId` values in the repository (`usr-014` and siblings) live **in specs**, never
  in a fixture or a shipped record.

> **THEREFORE: NOT ONE `RESOLVED` ATTRIBUTION EXISTS ON ANY RECORD THIS PLATFORM HAS WRITTEN.**
>
> Every clause in §6 is **free today and permanent tomorrow.** A permanent ledger cannot be
> migrated by definition — that is what makes it a ledger — so the first attributed record fixes
> the minting rule, the attribution seam, the fixture namespace and the event shape **forever, in
> whatever state they happen to be in on that day.**

### 2.4 What waits on this — and the count's provenance is stated, not borrowed

**⚠️ The figure "ten capabilities" is the external census's, carried as a DISCLOSURE and not
re-derived here** (C9 §3.4: a disclosure and a measurement look identical in a document once
quoted, so the status travels with the number or the number is an assertion). What follows is
the subset this contract can anchor in code-truth — **VERIFIED**, by us, in this tree:

| Blocked capability | Anchor | Why identity blocks it |
|---|---|---|
| **PR approval** | `t_pr_approve` — `flows/purchaseRequisition.flow.ts:50` | Authored and dispatchable. **No `.tsx` in the tree names it.** An approval with one tenant-wide approver is a rubber stamp with a state machine attached |
| **Invoice approval** | `t_invoice_approve` — `flows/invoice.flow.ts:84` | Same shape: **dispatchable, UI-unreachable** — grep-confirmed, zero component sites |
| **Master-data maker-checker** | — | Two roles are required and the platform has one seat. **`personaCan` cannot express "not the same person"** |
| **Override attribution** | `overrideCompletes` — `lib/enforcement.ts:778` | The override lane is **fully built and unusable by design** until identity exists |
| **A meaningful audit actor** | `actorKey(scope)` | §2.2 |
| **Registration review** | — | Who reviews, and on which side of the tenancy line, is **D-ID-5 — OPEN** (§7.2) |

---

## 3. THE MODEL — six new objects, three survive

**The whole model, before the detail.** Six objects are new; three that exist keep their jobs and
one of those three is demoted.

| Object | State | Kind | What it is NOT |
|---|---|---|---|
| **`PersonaType`** | **SURVIVES — DEMOTED** | Tenancy discriminator | **NOT an authorisation object, from this contract onward** (§3.1) |
| **`supplierId` / `QueryScope`** | **SURVIVES, unchanged** | Tenancy | Not an identity. Scoping is orthogonal to authority and stays so |
| **`TransitionRole`** | **SURVIVES — PROMOTED, unchanged in shape** | **THE permission atom** | **NOT to be paralleled by a `Permission` table** (§3.3) |
| **`Person`** | **NEW** | Registry | **NOT a credential store** (§3.2) |
| **`SubjectBinding`** | **NEW** | Registry, `1..n` per person | Not the identity. The identity is the `personId` |
| **`BusinessRole`** | **NEW** | **DATA — a bundle of atoms** | Not schema, and not a permission (§3.4) |
| **`AssignmentAct`** | **NEW** | Append-only ledger | Not authority — **routing** (§3.6) |
| **`DelegationAct`** | **NEW** | Append-only ledger | Not routing — **authority** (§3.6) |
| **`ApprovalPolicyAct`** | **NEW** | Append-only ledger | Not a config value. In-force is DERIVED (§4) |
| **`ApprovalAct`** | **NEW** | Append-only ledger | Not a state (§4.1) |

**Every one of the four ledgers follows the shipped `fxPin` / `EnforcementSetting` precedent
exactly** (`lib/enforcement.ts:613-692`): a flat append-only array, **in-force derived by
`settingInForce`-shaped selection**, superseded acts preserved and readable, the instant
**store-assigned** and never payload-supplied, and the derivation **pure, taking its instant as
an argument** (law 0.5). None of this is new machinery. It is the third application of a shape
this platform has already ratified twice.

### 3.1 `PersonaType` SURVIVES AS TENANCY ONLY — and stops being an authorisation object

**It keeps exactly one job:** which side of the buyer/supplier boundary a session sits on, which
is what `QueryScope` already enforces and what the scoping contract already pins.

**It loses exactly one job:** deciding what a caller may do. `PERSONA_ROLES` becomes the
**default bundle a person on that side is assigned at onboarding**, not the authority they hold
by virtue of sitting in the seat.

⚠️ **The demotion is the point, and it must not be softened into "persona plus person".** A
persona that still grants authority is a **second authorisation path**, and a second path is the
one nobody audits. After this contract, the answer to *"why was this permitted?"* is a chain of
recorded acts ending at a `personId` — never `PERSONA_ROLES[personaType]`.

### 3.2 `Person` × subject binding — **DELIBERATELY NOT A PORTAL CREDENTIAL STORE**

> **THE PORTAL STORES WHO SOMEBODY IS. IT NEVER STORES HOW THEY PROVE IT.**

A `Person` is a **portal-minted, permanent `personId`** plus the attributes authorisation needs
(status, org side, and the tenancy it belongs to). A `SubjectBinding` is a `(issuer, subject)`
pair from an authenticating system, bound to a `personId`.

| Property | Ruling |
|---|---|
| **Cardinality** | **`1..n` bindings per person.** One human, one `personId`, many subjects over a career |
| **Swappable** | A binding may be **revoked and replaced** without touching the `personId` or a single stored act |
| **No secrets** | **No password, no hash, no token, no recovery answer, ever.** If the portal cannot authenticate, it cannot be the thing that leaks the means of authentication |
| **Absence is refusal** | A subject with **no binding** is **not a person** — it is an unbound subject, and it authorises nothing. There is no "create on first login" |

**Why the last row is a rule and not an implementation detail:** auto-provisioning a person from
an IdP claim makes **the IdP the authority on who exists in the portal**, which is the exact
inversion §1 exists to prevent. Somebody grants access. It is an act, and it is recorded
(`AssignmentAct`).

### 3.3 ⚠️ `TransitionRole` EXISTS AND **IS** THE PERMISSION ATOM

> **DO NOT INVENT A PARALLEL VOCABULARY.**

The platform already has a complete, exhaustive, machine-checked permission vocabulary: the
`requiredRole` on every transition in the catalog — **72 edges across 14 flows**, deduped by
`catalogRoles()` (`roles.ts:102-108`), which **derives its population from the registry rather
than restating it**.

**A second `Permission` table would restate the flow catalog as prose data.** That is the
`FLOOR-IN-PROSE-01` shape, exactly: a fact that is already true in code, copied into a place
where nothing fails when it stops being true. The copy would drift the moment a transition is
added, and it would drift **silently**, because no build step checks a permission table against a
flow catalog — which is precisely why `catalogRoles()` derives.

**Therefore, and this is the load-bearing consequence for every consumer:**

- A permission **is** a `requiredRole` string. `po:confirm` is a permission. There is no other
  kind.
- A capability set stays **derived** — `capabilitiesFor` keeps its shape and changes only where
  it sources roles from (persona → person).
- **A permission that does not correspond to a transition cannot exist**, because there is
  nothing for it to permit. A surface that wants one is asking for a transition.

### 3.4 `BusinessRole` — an assignable bundle, and it is **DATA, NOT SCHEMA**

A `BusinessRole` is a **named set of `TransitionRole` atoms**. Nothing more. It exists because
"procurement-agent" is the unit an operator assigns and `rfq:publish` is the unit the dispatcher
checks, and forcing either to be the other is what makes role models unusable or unauditable.

**The opening vocabulary (D-ID-6, PROVISIONAL — §5.4), taken from Ariba's model** because a
vocabulary the market already uses is one an operator can recognise:

| Side | Roles |
|---|---|
| **Buyer** | `procurement-agent` · `category-manager` · `requisitioner` · `approver` · `ap-clerk` · `receiving-clerk` · `compliance-officer` · `supplier-manager` |
| **Supplier** | `supplier-admin` · `supplier-sales` · `supplier-fulfilment` · `supplier-finance` |

> ⚠️ **`approver` IS A ROLE, NOT A PERMISSION — and this is the sentence to fight for.**
>
> **Approval authority comes from the policy ledger's THRESHOLD BANDS, never from a role that
> says "can approve anything."** The role names *which pool of people the routing may consider*.
> The policy names *what it takes to satisfy the requirement*. A bundle that carried
> "approve-anything" would put the threshold back inside the role, where it cannot be varied by
> value, plant, category or date without minting a new role per band — which is the same
> explosion §4.1 refuses, one layer up.

**Because bundles are data, adding one ships no schema and no migration** — and because their
members are atoms that must exist in the catalog, **a bundle naming an atom that no transition
requires is a checkable defect** rather than a plausible-looking string.

### 3.5 The four ledgers

| Ledger | Records | In-force derivation |
|---|---|---|
| **`AssignmentAct`** | Person **P** is granted / revoked BusinessRole **R** within tenancy **T**, by whom, at an instant | The bundle set a person holds now |
| **`DelegationAct`** | Person **P** delegates authority to person **Q**, bounded — scope, and **a bounded period** | Whether **Q** may act **as bearer of P's authority** at an instant |
| **`ApprovalPolicyAct`** | The requirement in force for an object class — threshold bands and what satisfies each | The requirement a given object faces |
| **`ApprovalAct`** | Person **P** approved / rejected object **O**, **against the policy basis P saw** (D-ID-4, §5.3) | What remains outstanding — **re-derived, never stored** |

**All four are append-only and none is ever edited.** Revocation is an appended act, not a
deletion; a policy change is an appended act, not an update. The reason is the one
`settingHistory` already carries (`lib/enforcement.ts:646-661`): **overwrite the record and the
thing the derivation ran against is gone, so the derivation becomes unauditable — you can see
that it bit and never why.**

### 3.6 ⚠️ DELEGATION AND ASSIGNMENT STAY SEPARATE — the distinction is unrecoverable after the fact

> **DELEGATION IS AUTHORITY. ASSIGNMENT IS ROUTING. They are two different questions and they
> have two different ledgers.**

| | Delegation | Assignment |
|---|---|---|
| **The question** | *"May Q act with P's authority?"* | *"Whose queue is this in?"* |
| **Who is accountable** | **P.** The authority is borrowed and the lender is on the record | **The assignee.** It is their own authority |
| **Typical cause** | P is on leave | Workload, category, plant |
| **If wrong** | An act carries authority it never had | An item sits in the wrong queue |

**Why they cannot share a ledger, stated as the irreversibility argument this platform decides
on:** collapse them and you write one act meaning *"Q is handling this"*. Six months later, when
somebody asks whether **Q had the authority** or merely **had the item**, the answer is not in the
data — and it cannot be reconstructed, because the fact that would distinguish them was never
recorded. **A merge cannot be unwound without re-adjudicating every row folded into it** (C9
§2.2, the same argument that decided material identity). Keeping them apart costs one extra
ledger and is purely additive; merging them destroys a fact.

---

## 4. APPROVAL IS A LEDGER PLUS A POLICY OVER THE EXISTING MACHINE — **not a new machine**

> **THE APPROVAL VERBS ALREADY EXIST.** `t_pr_approve`, `t_pr_reject`, `t_invoice_approve`,
> `t_gr_approve`, `t_quotation_review` — all authored, all in the catalog, all dispatchable
> today. **This contract adds nobody's state and nobody's edge.**

The shape:

1. **`ApprovalPolicyAct`** states the requirement in force for the object class — the threshold
   bands, and what satisfies each band.
2. **`ApprovalAct`** records each individual approver's act, with its **policy basis** (§5.3).
3. **The existing terminal verb fires when the derived remaining requirement is zero**, gated by
   a **policy hook** — the mechanism `policyHooks[]` already provides on every transition
   (`schema.ts`, and `POLICY_HOOKS.ENFORCEMENT_SET_GOVERNED` is the shipped precedent).

The object's **state** therefore stays what it always was — pending, approved, rejected — and
"how many approvals remain" is **derived at read from two ledgers**, exactly as the enforcement
mode in force is derived from one.

### 4.1 The machine that was NOT built, and the three costs of building it

The tempting design is a state per approver: `PendingManager → PendingFinance → PendingCFO →
Approved`. It fails three separate ways, and **the third one does not compile in this tree**:

| Cost | What happens |
|---|---|
| **The alphabet explodes** | States multiply by approver count **× band count × org shape**. Every flow acquires a private approval sub-alphabet, and the 72-edge catalog stops being readable as a catalog |
| **A threshold change becomes a schema migration** | "Above 500 million IDR now needs a fourth approver" is an **operational decision made on a Tuesday**. As states it is a new state, new edges, a code change, a deploy — and **in-flight objects sitting in states the new machine does not have** |
| ⚠️ **Escalation-on-elapsed-time becomes a CLOCK-FIRED TRANSITION** | *"Unapproved for 5 days → escalate"* is a transition whose trigger is the clock. **`trigger: 'clock'` is type-level impossible in this tree** — `ClockTriggerIsForbidden` (`src/services/transitions/schema.ts:37`) fails `tsc`, and `validateFlow` refuses it again at runtime for untyped callers (`validate.ts:57-61`). **It is a compile error, not a design preference** |

**The third cost is the decisive one, and it is not a coincidence.** Law 0.5 forbids clock-fired
transitions because **clock-derived state cannot be stored without going stale** — and main
carries the corpses that prove it (`daysRemaining: 873`, 483 days stale; a certificate 84 days
expired still reading `'Expiring Soon'`). An escalation ladder as states would have reproduced
that class **on approvals**, where the stale value is who is allowed to sign.

### 4.2 **ESCALATION IS A READ-TIME PROJECTION**

An escalated approval is not a different object in a different state. It is **the same
outstanding requirement, read at a later instant**, with the elapsed interval projected against
the policy in force. Same discipline as every other clock-projected state here: **the instant is
an argument, nothing is stored, and the projection is pure.**

**Two consequences worth stating because they are the payoff:**

- **Escalation policy can change with no migration** and no object moves, because no object was
  ever moved into an escalated state.
- **The projection is deterministic and testable at any instant** — including ten years past the
  due date — which is exactly the property the ratchet's suite pins today.

### 4.3 What this buys, in one line

**A threshold change is an appended act. An escalation-policy change is an appended act. An
org-shape change is an appended act.** None of the three touches a flow file, a state, an edge,
or a stored object.

---

## 5. THE RULINGS — all PROVISIONAL, each with its disposal condition

**All five are STRATEGIST-RULED ON BEST PRACTICE, PENDING TEAM RATIFICATION.** They are recorded
as decisions **taken**, on the `ENF-OVERRIDE-VOCAB-PROVISIONAL-01` precedent, so that ratifying
is an act of agreeing with something written down rather than discovering what the model quietly
assumed. Each states **the fact that would replace it** — a provisional ruling with no disposal
condition is a permanent one wearing a hedge.

### 5.1 **D-ID-1** · `personId` is PORTAL-MINTED AND PERMANENT — ⚠️ THE ONE IRREVERSIBLE DECISION

> **A `personId` IS MINTED BY THE PORTAL, IS PERMANENT, AND IS NEVER THE IdP SUBJECT.** Subjects
> bind `1..n` and are swappable; the `personId` is not.

**Why it is the irreversible one, stated first:** **every stamp captures it forever.** An
approval act, an override, an audit event, a delegation — each one records the `personId` as it
stood at the moment of the act, into a ledger that by construction cannot be rewritten. **Get
this wrong and it is wrong in every permanent record the platform will ever hold**, and no
migration exists, because migrating an append-only ledger is a contradiction in terms.

**Why portal-minted:** using the IdP subject as the primary key makes **every stored
authorisation record a hostage to the identity vendor.** An IdP migration, a tenant rename, an
email change, an SSO consolidation, an acquisition — each rewrites subjects, and each would
therefore rewrite history. Under D-ID-1 the same events **rebind and change nothing**: the
`personId` is untouched and every stamp still resolves.

**Disposal condition:** none that preserves the property. **This ruling is disposable only before
the first attributed record exists** (§2.3, §6.1) — after that it is not a ruling, it is a fact
about the data.

### 5.2 **D-ID-3** · NO TYPED-NAME ATTRIBUTION — a standing rule over ALL attribution

> **UNTIL SESSION-RESOLVED IDENTITY EXISTS, NO SURFACE MAY CAPTURE THE ACTOR AS TYPED TEXT.**
> Not for overrides, not for approvals, not for "who inspected this", not "just for the pilot".

> **A TYPED NAME IS FORGEABLE, AND IT IS WORSE THAN NOTHING BECAUSE IT LOOKS LIKE ATTRIBUTION.**

An empty attribution field is a **visible** gap that creates pressure to close it. A text box
containing `Budi` is an **invisible** one: it renders identically to a resolved identity, it
survives into permanent records, and the day real identity lands there is **no way to tell the
typed rows from the resolved rows** — they have the same shape.

**This generalises the shipped E2 ruling from overrides to everything.** `lib/enforcement.ts`
already refuses it for one lane (*"CAPTURING A TYPED NAME IS FORGEABLE AND WORSE THAN NOTHING
BECAUSE IT LOOKS LIKE ATTRIBUTION"*, header). **The rule was never override-specific**, and
leaving it scoped to one lane is how the next surface adopts a text box in good faith.

**The honest form is already in the tree and costs nothing to reuse:** `ActorAttribution` —
`RESOLVED`, or `UNATTRIBUTED` **carrying the reason**. An explicit absence that refuses, not a
value that proceeds.

**Disposal condition:** the seam flip in §6.2. When a resolved actor comes from the session and a
payload-supplied one is refused on write, this rule stops being a prohibition and becomes an
architectural fact.

### 5.3 **D-ID-4** · in-flight approvals when the policy changes

> **RECORDED ACTS STAND.** An approval already given is a fact about what a person did, and a
> policy change does not un-happen it.
>
> **THE REMAINING REQUIREMENT RE-DERIVES** against the policy in force.
>
> **EACH ACT RECORDS THE POLICY BASIS ITS APPROVER SAW.**

The three clauses answer the question a policy change actually raises: *the CFO approved this
yesterday under a two-approver policy; today it needs three — what is true now?* Under this
ruling: the CFO's act stands, the requirement is recomputed and one approval is outstanding, and
**the record shows the CFO approved under the two-approver policy** — so nobody later reads their
signature as consent to a rule that did not exist when they gave it.

**The third clause is the one that is easy to drop and impossible to add later.** Without it, a
past approval is readable only against **today's** policy, and every historical approval silently
re-interprets itself every time the policy moves. **An approval is consent to a specific
requirement**; a signature whose meaning drifts is not a signature.

⚠️ **And it is deliberately not the tempting alternative.** Re-deriving alone (dropping the
basis) is cheaper and reads as equivalent — it is not; it loses what the approver consented to.
Invalidating recorded acts on a policy change is the other alternative, and it is worse: it
destroys facts about what people did in order to keep a derivation tidy.

**Disposal condition:** an operator ruling that approvals are consent to an **object** rather
than to a **requirement**. That would be a substantive change to what a signature means here, and
it must be taken deliberately rather than arrived at by omission.

### 5.4 **D-ID-6** · the opening `BusinessRole` vocabulary

The twelve bundles in §3.4, from Ariba's model. **They are data, not schema** — which is what
makes this the cheapest of the five rulings to be wrong about.

**Disposal condition, and it is unusually clean:** the operator's own org chart. Renaming,
splitting, merging or deleting a bundle **ships no schema change and no migration** — only new
`AssignmentAct` rows. The atoms they bundle are the catalog's, and those are not up for
negotiation here.

⚠️ **The one part of D-ID-6 that is NOT cheap to be wrong about** is the `approver` clause in
§3.4: approval authority comes from the policy ledger's threshold bands, never from a role that
grants blanket approval. That is a structural claim, not a naming one, and it survives any
rewrite of the vocabulary.

### 5.5 **D-ID-7** · UU PDP — ⚠️ THE STAMP CARRIES `personId` ONLY

> **A PERMANENT RECORD CARRIES THE `personId`. `displayName` IS RESOLVED AT READ FROM THE PERSON
> REGISTRY AND IS NEVER COPIED INTO THE RECORD.**

⚠️ **THIS OVERRIDES SEAT 3'S RATIFIED `Person` SHAPE**, which held that stamps keep their own
copy of the name at act-time. The override is recorded here **with its reason**, because a
reversal that arrives without one is indistinguishable from a mistake.

**The reason:** **a name in an append-only ledger cannot be erased, corrected, or restricted —
and UU PDP grants a data subject rights over all three.** The ledger's central property is that
it cannot be rewritten; the statute's central grant is a right to have personal data rewritten.
Copy the name in and those two are in direct conflict, permanently, on every historical row.

**`personId` resolves it without weakening anything:**

| Requirement | Under `personId`-only |
|---|---|
| **The trail stays answerable** | ✅ The act names exactly who took it. Nothing about accountability is softened |
| **A name can be corrected** | ✅ One registry row. Every historical record reads correctly from that moment |
| **A name can be erased or restricted** | ✅ The registry is the single place it lives |
| **A person who leaves does not erase who decided** | ✅ The `personId` is permanent (D-ID-1) and the act still names it |

The last row is the objection the shipped code raises against this ruling, and it is answered:
the concern was that resolving at read lets a departure blank an audit trail. **It does not — the
identity is in the record; only the label is resolved**, and a departed person's registry row is
retained for exactly this reason.

> **ADDING THE NAME LATER IS ADDITIVE. REMOVING IT FROM A PERMANENT LEDGER IS IMPOSSIBLE.**

That asymmetry is the whole argument, and it is the same argument C9 §2.2 used to key material
identity on specification: **when one direction is reversible and the other is not, the schema
takes the reversible one** — and it does not depend on the open question being resolved our way.

**PROVISIONAL pending the DPO.** It **composes with D-DPO on Track R** — one of the four open
operator inputs — and this contract must not be read as having answered that. What it does is
take the **direction that stays correctable either way** while the DPO's answer is outstanding.

**Disposal condition:** a DPO ruling that act-time name capture is required (for a statutory
record-keeping obligation that outranks the erasure right). Then names are added — additively, to
new records — and this clause is amended. **The reverse disposal does not exist**, which is
precisely why the ruling runs this way.

---

## 6. ⚠️ WHAT MUST EXIST BEFORE THE FIRST ATTRIBUTED RECORD

**These are this contract's own preconditions, and each is UNFIXABLE LATER.** They are not a
build order — they are the four things that are free while §2.3's window is open and permanent
once it shuts. **The first `RESOLVED` attribution written on a governed record closes all four.**

### 6.1 The `personId` minting rule (D-ID-1)

**Before the first stamp, not with it.** Every permanent record captures the identifier; the rule
that produces it must therefore be settled while zero records exist. What must be fixed: that it
is **portal-minted**, that it is **permanent**, that it is **not the IdP subject**, and that
**subjects bind to it rather than the reverse**.

**Why it cannot be fixed later:** rewriting an identifier across an append-only ledger is not a
migration. It is a new ledger and a claim that the old one meant something it does not say.

### 6.2 ⚠️ THE ATTRIBUTION SEAM FLIPS TO SESSION-INJECTION, and a payload-supplied RESOLVED actor is **REFUSED BY NAME ON WRITE**

**Today `setBy` is a caller-supplied payload field** — `requiredFields: ['mode', 'setBy']`
(`flows/enforcement.flow.ts:66`). That is **ATTRIBUTION BY ASSERTION**: the caller states who
acted, and the platform records the statement.

It is harmless today for one reason only — **nothing can construct a `RESOLVED` actor** (§2.3).
The moment identity exists, the same seam accepts one **from the payload**, and:

> **AFTER THE FIRST `RESOLVED` RECORD, FORGED AND GENUINE ATTRIBUTIONS ARE INDISTINGUISHABLE IN A
> PERMANENT LEDGER.** They have the same shape, the same fields, the same provenance. There is no
> forensic difference to find later, because there is no field in which the difference was
> written.

**Two halves, and the second is the one that gets forgotten:**

1. **The resolved actor comes from the SESSION** — never from a payload, on the `setAt` /
   `pinnedAt` discipline already ratified twice in this tree (*"a caller that could set it could
   backdate its own audit entry"*). The identical argument applies with more force to **who**
   than to **when**.
2. **A payload-supplied `RESOLVED` actor is REFUSED BY NAME ON WRITE** — not ignored, not
   overwritten, not silently replaced by the session's. **Refused, loudly.** An overwrite is a
   silent correction, and a silent correction of an attribution is a caller that believes it
   attributed an act and a record that says somebody else did.

⚠️ **An `UNATTRIBUTED` payload value stays legal**, and must: it is a claim about a **failure to
resolve**, which a caller is entitled to make and which the tightening rule already depends on
(`lib/enforcement.ts:109-111` — the safest act is always available to anybody).

### 6.3 A fixture-person namespace (`sim-usr-*`), pinned by test

**No fixture person may appear in a `RESOLVED` attribution on a governed record.**

The portal is fixture-first by design and will therefore acquire demo people. **A demo person and
a real person are the same shape**, and a governed record — an override, an approval, an
enforcement setting — that names a demo person is **manufactured provenance**: the exact thing
E2 refused when it declined to seed an invented `personId`, and E4 refused again when it seeded
`UNATTRIBUTED` instead (`enforcementSeed.ts:33-38, 93-96`).

**The mechanism, not the convention:** a reserved prefix (`sim-usr-*`), and **a pin that fails the
floor** when a value carrying it reaches a `RESOLVED` attribution on a governed record. The
namespace is worthless without the pin — a prefix nobody checks is a naming habit, and habits do
not survive a deadline.

⚠️ **Free exactly once.** Today the only `personId` literals in the repository live in specs
(`usr-014` and siblings) and none reaches a shipped record. Reserving the namespace before the
first fixture person exists costs one line. **Retrofitting it means auditing every stored
attribution to decide which ones were real**, against records that were written precisely because
nobody could tell the difference at read time.

### 6.4 `TransitionEvent` gains an optional attribution field **before the audit sink becomes durable**

**The seam is the sink** (`AuditSink`, DR-10 / C3). While it is in-memory, the event shape is
free. **Once it is durable, every event ever written is an event whose shape is fixed** — and the
DR-10 taxonomy explicitly has **no retrofit**: *"the sink interface is the contract"*
(`transitions/events.ts:6-7`).

**Optional, and that is a ruling rather than a hedge:**

> **ATTRIBUTION ABSENT = A MACHINE ACT. NEVER DRESSED AS UNATTRIBUTED.**

A system, cascade or creation-triggered transition **has no person to name** — the four triggers
`user | system | cascade | creation` are already the distinction (C1). Recording those as
`UNATTRIBUTED` would be a lie of a specific and expensive kind: **`UNATTRIBUTED` is a CLAIM —
"a human acted and could not be resolved, and here is why"** — and every member of
`UNATTRIBUTED_REASONS` names a **failure somebody can go and fix**
(`lib/enforcement.ts:355-368`). Flooding that vocabulary with cascade events makes the count
meaningless and the pressure it creates disappear.

> ⚠️ **`UNATTRIBUTED_REASONS` HAS NO `SYSTEM` MEMBER AND MUST NOT ACQUIRE ONE.**
>
> The shipped module already says why: *"'the system did it' is the comfortable label that makes
> an unattributed act look answered."* A `SYSTEM` member is the single change that would convert
> this entire contract's honest absence into a shrug — **it gives every unresolvable act a
> respectable place to sit**, and the absence stops being countable, which is the only reason
> anybody would ever fix it.
>
> Its absence from the frozen array **is the mechanism**, in the same way the missing fourth
> enforcement mode below `OBSERVE` is (`lib/enforcement.ts:41-51`). Adding one turns a suite red,
> which is the point of writing it down.

**The event actor field (`actor: 'buyer:all'`) is NOT what this replaces.** The persona actor is
a true fact about the scope and stays. **Attribution is a second, orthogonal field** — one
answers *which seat*, the other *which human* — and collapsing them is
`ENF-EVENT-ACTOR-IS-A-PERSONA-01` with extra steps.

---

## 7. OPEN — recorded as open, and NOT resolved here

Both are recorded because **naming a gap is not closing it** (C9 §3.5, A-10) and because a
contract that resolves an open question by omission has resolved it by accident.

### 7.1 **D-ID-2** · the supplier-side identity provider — **UNPROCURED, OPEN**

Paragon staff authenticate against the corporate IdP. **Supplier staff have no identity provider,
and one has not been bought.** The candidate answers differ in cost, security posture and who
carries the support burden, and none of them is this contract's to pick.

**What is NOT open, and must not drift while D-ID-2 sits:** whichever answer lands, it supplies a
**`SubjectBinding`** (§3.2) and nothing else. It does not mint `personId`s, it does not grant
roles, and it does not become a second authorisation path. **The model is complete without the
answer** — which is what makes it safe to leave open.

### 7.2 **D-ID-5** · registration-review scope — **OPEN, provisionally portal**

Who reviews a supplier registration, and on which side of the tenancy line the reviewer sits.
Provisionally the portal, **and that is a leaning, not a ruling** — it is recorded here so it can
be argued with rather than inherited.

⚠️ **It interacts with D-ID-2** (§7.1): a registration review performed by a supplier-side
person requires supplier-side person identity, which does not exist. **Resolving D-ID-5 toward
the supplier side is therefore blocked on D-ID-2, and resolving it toward the portal is not.**
Stated because the dependency runs one way only and is invisible from either question alone.

---

## 8. WHERE OUR IMPLEMENTATION CANNOT HONOUR THIS CONTRACT

**This document is the AUTHORITY. Where it and the code disagree, the code is the defect** — the
C9 §7 discipline, adopted with its ledger. **None of these blocks ratification of the MODEL; all
of them block any claim that identity exists.**

**And the direction is stated up front, because C9 learned it the expensive way
(`C9-STALE-BY-FIX-01`): a contract that OVERSTATES our conformance is caught by anyone who reads
the code, and one that UNDERSTATES it is caught by nobody, because the discrepancy is in our
favour and reads as caution.** Every row below is a negative about our own tree, and each is
**derived** rather than assumed (`CENSUS-MUST-DERIVE-01`).

| # | What this contract states | What we actually ship |
|---|---|---|
| **8.1** | A model of six objects, three survivors, four ledgers | **ZERO CODE. ZERO TYPES. ZERO FIXTURE PERSONS.** No `Person`, no `SubjectBinding`, no `BusinessRole`, no ledger, no minting rule. This issue is a model and its preconditions, and it must never read as a seam that exists |
| **8.2** | ⚠️ **D-ID-7: a stamp carries `personId` ONLY** (§5.5) | **`ActingPerson` REQUIRES `displayName`, and its own doc-comment states the OPPOSITE ruling** — *"Captured, never resolved at read"* (`src/lib/enforcement.ts:339-345`). **The shipped shape contradicts this contract.** It is **free to correct today and only today**: zero `RESOLVED` attributions exist (§2.3), so no stored record loses a name. The correction rides a code batch; **this contract is the authority in the interim** |
| **8.3** | Attribution comes from the SESSION and a payload-supplied `RESOLVED` actor is refused (§6.2) | **`setBy` is a payload field** — `requiredFields: ['mode', 'setBy']` (`flows/enforcement.flow.ts:66`). **Attribution by assertion.** Harmless only because nothing can construct a `RESOLVED` actor; harmful the day something can |
| **8.4** | `TransitionEvent` carries optional attribution (§6.4) | **It does not.** The event carries `actor: string` and nothing else about who acted (C3). The sink is still in-memory, which is the only reason this is still fixable |
| **8.5** | `PersonaType` is tenancy only (§3.1) | **It is the authorisation object.** `PERSONA_ROLES` grants 60+ transition-roles to a seat and `capabilitiesFor` derives every capability from it (`roles.ts:18-123`). Unchanged by this contract, which is docs-only |
| **8.6** | A `sim-usr-*` namespace, pinned by test (§6.3) | **No namespace, no pin.** The only `personId` literals are in specs (`usr-014`), which is why the precondition is still free — **and there is nothing stopping the next fixture from being `usr-020`** |
| **8.7** | Ten capabilities wait on identity (§2.4) | **The count is the external census's, carried as a DISCLOSURE and NOT re-derived by us** (C9 §3.4). Six are anchored in code-truth in §2.4; the remaining four are **not verified in this tree** and this contract does not assert them |
| **8.8** | `TransitionRole` is the sole permission atom (§3.3) | **True today and structurally unguarded.** `catalogRoles()` derives from the registry, but **nothing forbids a second permission table from being added tomorrow** — the rule is a contract clause, not yet a mechanism. Recorded so it is not read as enforced |

---

## 9. How this contract ships

**The hashes discipline (§ citation block) is not paperwork — it is the minimum unit of agreement
between two seats.** Any issue of C10 ships, in the message itself:

- **The pinned SHA on `main`** — never a branch SHA. Squash-and-delete makes a branch SHA
  unreachable by construction, so it is cited **after** merge or not at all.
- **Every path cited, with its hash, and WHICH BYTES WERE HASHED.** `core.autocrlf` makes a bare
  `sha256` of a working-tree file unverifiable on another platform; the **git blob id** travels
  with it, and each is labelled.
- **The issue number of any amendment**, because an amendment is a new SHA and a new ratification
  (C9 A-13) — **including an amendment that changes no schema**, since what is being ratified is
  the text.

**And delivery is a fact to be confirmed, not asserted** (C9 A-14). A message that says this
document is enclosed, and encloses a description of it, has shipped nothing — that failure ran
for two exchanges on C9 before either side noticed.

---

## Provenance

Every claim about the tree in §2 and §8 is anchored to a `file:line` at `main` `df585c5` and was
read there, not recalled. The count in §2.4 is the external census's and is carried as a
disclosure with its status attached. **The model in §3–§4 is Seat 3's, ratified, with one
override recorded at §5.5 and its reason stated.** Nothing in this document is implemented; the
backend remains greenfield and the portal remains fixture-first behind `mockDataService`.
