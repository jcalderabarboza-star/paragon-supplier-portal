# DESIGN 6 v2 · The Flow Builder — add steps to a process, have the platform refuse what breaks its rules, approve the change, and run it

**Seat 3, consultant, Ops Project #11 · 2026-10-12 · design refresh for a build that starts now (this was SE-16). Read-only session; nothing written in the repository.**
**Pinned tree:** `main` @ `0af62ddd9ca85c59a822896770d8cead736bfaff` (PG-1, 2026-10-11), read from a `git archive` export. `git cat-file -e` accepts it and rejects a made-up SHA; it equals `git ls-remote origin refs/heads/main`. Every figure below was derived at that commit by a script that imports the transitions barrel (so the registry is populated) and carries a both-ways control: `t_gr_post` is found, `t_bogus_x` is not.
**Replaces, for the build:** `docs/designs/DESIGN_6_FLOW_BUILDER.md` (pinned to `de101c67`, 2026-09-28). That document stays the specification for the part that remains SE work (§9).
**Companion files:** `FB_BUILD_PLAN.md` (the batches) and `FB_OPEN_DECISIONS.md` (what the operator must rule on).

---

## 0 · The one-page version

1. **The operator's four requirements change one decision of Design 6 and keep most of the rest.** Design 6 recommended that an approved change become generated code in a pull request, with no runtime override. The operator now requires that an approved change *overrides the default and is in effect*. That reverses Design 6 decision D1 and the handover's decision-register row "no runtime override".
2. **What makes a runtime override safe is narrowing what a change may be.** A process change at runtime is a set of **additions** to a process that already runs: a step in front of an existing act, a check on an existing act, a fork that decides which steps apply. It never removes a state, an act, a check, a required field or a lane. So the rule the whole design rests on is one sentence, and it is tested: **an active version can add a refusal; it can never remove one.**
3. **An added step is a gate in front of an existing act, not a new stored state.** The document keeps the states every page already understands. Measured at the pin: 280 comparisons against a state literal in 53 surface files, and 37 branches on the destination state in the command targets. A document resting in a state none of those know would render wrong on most pages and skip the target's side effects. A gate avoids all of it: the act is refused, by name, until the step is done.
4. **The elements are six:** approval, confirmation, data capture, scan (steps a person completes); check (a rule the platform evaluates); fork (a condition on the document that decides which steps apply). §3.
5. **The validation library refuses a change that breaks the rules of the process**, before it can be proposed, again at approval and again at activation. Its rules are a table (§4). It is not the lifting job Design 6 described; that job belongs to structural changes, which stay code.
6. **A change moves Draft → In Review → Approved → Active → Retired, or is Rejected.** Proposing, approving, activating, retiring and restoring each need a named person and a stated reason. The approver may not be the proposer. A Super Admin passes that one check with a recorded reason, on the mechanism ADM-1 already built. §5.
7. **Activation is a separate act from approval, and rollback is the same switch thrown back.** Retiring the active version returns the process to the shipped default at once. An earlier version can be restored. §6.
8. **Everything is versioned and recorded.** Each version has a label (`2.1` = the first change to shipped version 2), each act on it is an event with who and why, each completed step is a ledger row, and every event the dispatcher emits says which version of the process produced it. §6.
9. **What stays SE work:** durable storage and real sign-in; any change that alters the shape of a machine (a new stored state, a re-routed or removed act, a different lane on an existing act, a new document type); camera scanning; notifications. §9.
10. **Seven batches**, each with a before and after the operator can see. `FB_BUILD_PLAN.md`.

---

## 1 · What moved since Design 6 was written

### 1.1 The tree

| | Design 6 (`de101c67`) | Now (`0af62dd`) |
|---|---|---|
| Flows | 25 | 30 |
| (flow, state) pairs · distinct state names · names shared by more than one flow | 103 · 64 · 16 | 118 · 70 · 18 |
| Acts (transitions) | 115 | 141 |
| Flows a command can write through | 19 | 24 |
| Flows with no command target | 6 | the same 6 (`goodsReceiptLine`, `invoiceMatch`, `shipment`, `contract`, `obligation`, `compliance`) |
| Registered checks (policy hooks), all in use | 60 | 153 |
| Cascade sources · links | 5 · 6 | 12 · 13 |
| Permissions (atoms) required · held only by the automation grant | 80 · 12 | 94 · 14 |
| Distinct required-field names | 66 | 82 |
| States with no path to a declared ending | 7, in 2 flows | the same 7 (`advanceShipNotice`'s five, `invoiceMatch`'s two) |
| Test floor | 5,947 in 397 files | 8,961 in 494 files |

Acts by how they fire, at the pin: 86 by a person, 24 by a system, 8 by cascade, 23 create a document. **76 acts are fired by a person, shown on a surface and belong to a writable flow. Those are the acts a step can stand in front of.**

### 1.2 What was built that Design 6 assumed was missing

| Built since | What it gives the builder |
|---|---|
| Module activation (Design 5 Part A) | The pattern for a governed switch: an append-only ledger, the state in force derived at read, the dispatcher asking one injected gate, a refusal that names the switch, and a rule that a sample person may act on a demo deployment and not on production (`moduleDeployment.barsActor`). |
| Process guides (Design 5 Part B), 60 files | A label and a lane sentence for every act, in English and Indonesian. The builder reads act names from the guide registry and does not need a new label table. |
| Sample persons and the named-seat rule | A seat can name a sample person (18 on the roster, among them Compliance, Admin and Super Admin). Design 6 said approval would be unusable until sign-in exists. That is no longer true. |
| Super Admin (ADM-1) | A four-eyes check asks `exempt(head)`; a Super Admin passes it only with a one-line reason; the event carries the rule and the reason; an activity view lists them. |
| The UI standard (UI-1a to UI-1e, PG-1) | One table, one list page, one form, one card, one notice, one dialog (with a full-screen form) and one drawer; one solid button per container. |
| `NextActLine` | A shared line that says who acts next on a document, mounted on eleven surface files. It is where a step that is due is announced. |

### 1.3 What Design 6 asked for that does not exist

None of its registry additions were built: no state-label table, no check descriptions, no field-label table, no entity-label table, no validation library, no draft object, no lane column, no "who acts next" tab on the Process Flows page. This design needs none of the first four for its first build (§2 says why) and replaces the fifth and sixth.

---

## 2 · What in Design 6 still holds, what changed, and why

| Design 6 | Verdict | Why |
|---|---|---|
| §0.2, §4.6 — a draft never reaches the registry | **Holds, and is stronger.** | No builder module calls `flowRegistry.register`. The shipped catalogue stays what the code declares; every existing gate keeps reading it. A version is applied beside it, by the dispatcher. |
| §1.2 — not a runtime process engine | **Changed by the operator.** | The override is now required. It is bounded to additions, so the dispatcher still resolves every act through the one registry and then asks what the active version adds. |
| §1.2 — not a policy editor; §9.1 — a threshold can become data, a check cannot | **Holds, and is applied.** | A fork's value and a rule's parameters are data in the version. The comparison itself is code, written once (§3.3). Nobody authors a new kind of check in the builder. |
| §1.2 — not a second authorisation path | **Holds.** | The dispatcher decides. Where a surface must agree with a step's lane rule it calls the same exported function the hook calls. |
| §1.3, §4 — the guarantee wall and the lifting of four test suites into pure functions | **Deferred to the structural path.** | Those checks guard the shape of the catalogue (permission coverage, surface invariants, the loose-end census, cascade integrity). An additive version does not change the shape, so there is nothing for them to find. They are needed the day a draft may add a state or an act, which is SE work (§9). |
| §4.2 — terminal reachability as a warning | **Holds; not needed for the first build.** | Re-measured: the same 7 states. An additive version cannot create or remove one. |
| §2.1–§2.4 — state, check, field and entity label tables | **Not needed for the first build.** | No new state is named. Acts are named by the guides. Step fields carry their own label and type. Only the three generic rules need a sentence. |
| §2.5, D5 — no stored layout | **Holds.** | The diagram keeps its computed layout; a step is drawn on the edge it gates. |
| §3 — lane column, "who acts next" tab | **Still worth having, not on the path.** | Neither serves the four requirements. `NextActLine` already answers the question per document. Offered as an optional item in the plan. |
| §5.1 — the draft is a whole `FlowDefinition` | **Replaced.** | A version is the list of additions to one flow (§3.5). Nothing has to be diffed against the default to see what changed: the list is the change. |
| §5.3 — the store copies `customRoles.ts` | **Holds.** | Persisted, read honestly, re-validated on read, stamps minted by the store. |
| §5.4 — export and import | **Holds**, smaller. | The export is how a change reaches the SE Team. |
| §6 — approval as a ledger machine, attribution from the session, four-eyes | **Holds in shape; three things change.** | The machine has more states because activation and rollback are now acts (§5). A sample person may approve on a demo deployment (the module ruling). The Super Admin exemption applies. |
| §6.1 — the rights sit with Compliance | **Holds.** | Recommended again in `FB_OPEN_DECISIONS.md`. |
| §6.1 — promotion is not a transition | **Replaced.** | Activation is a transition, because the platform itself now performs it. |
| §7 — the generator and the pull-request path | **Unchanged, and still SE work.** | It is the path for a change that alters the shape of a machine. |
| §8 — per-document versions | **The cheap half is taken; the costly half is not needed.** | Every event is stamped with the version in force (Design 6's P-1). A multi-version registry (P-2) is unnecessary while a version cannot change states or legality. What happens to documents in flight is an open decision (§6.4). |
| §9.2 — one entrance per governed setting | **Holds.** | The builder does not become a second door to the enforcement, PSL or module settings. |
| §10 — a draft carries a nine-section guide | **Replaced.** | Each added element carries its own label and instruction in both languages, and the validation library refuses a change without them. |
| §11 — nine SE batches | **Replaced** by `FB_BUILD_PLAN.md`. | |
| §12 — D1 reversed; D3 half taken; D4 changed; D7 holds (only an existing process can be changed at runtime); D9 answered no (a lane change on an existing act is not a runtime change, §9); D2, D10 not on the path. | | |

---

## 3 · The elements

Every element is attached to **one existing act** of one existing process, chosen from the 76 acts a step can stand in front of. The author picks; nothing structural is typed.

### 3.1 Steps a person completes

| Element | What the person does | What is recorded |
|---|---|---|
| **Approval** | approves, or declines with a reason | who, when, the decision, the reason |
| **Confirmation** | confirms that something outside the platform was done (the instruction says what) | who, when |
| **Data capture** | fills the fields the author defined (text, number, quantity, money, date, yes/no, one of a list) | who, when, the values |
| **Scan** | scans or types a code, which must equal a named field of the document (its number, a material code, a batch) | who, when, the value, that it matched |

Common to all four:

- **Lane.** One buyer-side lane completes it (Procurement, Receiving, Finance, Compliance, Planning, Requisitioner). Supplier-side lanes are an open decision.
- **Order.** Steps in front of the same act are completed in the order the author gives.
- **A named person, always.** A seat that names nobody cannot complete a step.
- **Separation, optional.** "A different person from whoever completed step X", and "whoever completes this step may not then take the act". Both read the step ledger and the acting seat, nothing else. A Super Admin passes either with a recorded reason.
- **Label and instruction** in English and Indonesian. Roles only, never a person's name.
- **A scan is a text field with a matching rule.** A handheld scanner types the code and presses Enter, which works in a browser with no further build. Reading a code through the camera is SE work.

**What a step does at runtime.** While a step is due, the act behind it is refused with `STEP_PENDING` and a sentence that names the step and its lane. The document does not move and does not change state. When the act finally succeeds, the completed steps in front of it are marked used, so a document that comes round to the same act again meets the steps again.

**A step is due** when all of these hold, and this is derived at read, never stored: the version that defines it is active; the document is in a state the gated act can fire from; the fork branch it belongs to applies; the steps ordered before it are complete; and it has no unused completion.

### 3.2 Forks

A fork is a condition on the document that decides which steps apply: *when the estimated value is at least Rp 500,000,000, Finance approves before the requisition is approved.* Steps name the fork and the branch (yes or no) they belong to. Both branches end at the same act, so a fork cannot create a dead end.

- The condition is `field · operator · value`. The field comes from a short catalogue per process (§3.4). The operators are `=`, `≠`, `<`, `≤`, `>`, `≥` and "is one of", limited by the field's type. The value is typed by the author and is data in the version.
- **No condition reads the clock.** Date fields are not offered in the first build. A step that a date decides would be a clock-fired rule, which this platform forbids; a later build that wants one compares against the declared present, like every other deadline.
- This is a value rule by lane. It is not an approval ladder: it can send a document to another lane, and it cannot express seniority.

### 3.3 Checks

A check is a rule the platform evaluates when the act is attempted. It refuses, with a sentence, or lets the act continue. The first build offers three, each written once in code and configured by data:

| Rule | Refuses when | Parameters |
|---|---|---|
| **Named person** | the acting seat names nobody | none |
| **Value** | `field · operator · value` is false for the document | field, operator, value |
| **Different person** | the acting person completed a named step on this document | the step |

Checks run **after** the checks the process already has, and only if those passed. Reusing one of the 153 existing checks on another act is not offered: almost every one reads the shape of its own document, and attached elsewhere it would refuse everything or pass everything. That can be revisited per check, with a description for each (Design 6 §2.2).

### 3.4 The field catalogue

Forks, value rules and scans name a field of the document. The catalogue is one small authored table per process: field path, label in both languages, type. It is held honest by a test that reads every seeded document of that process and requires each catalogued field to exist with the stated type, and by its inverse (a row for a process that is not registered is refused). A process with no catalogue rows simply offers no fork, value rule or scan.

### 3.5 The version object

```ts
// src/services/flowBuilder/flowVersion.ts
export type StepKind = 'approval' | 'confirmation' | 'capture' | 'scan';
export type Comparison = { field: string; op: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'in'; value: string | number | boolean | readonly string[] };
export interface Bilingual { readonly en: string; readonly id: string }

export interface AddedStep {
  readonly id: string;                 // s_<slug>, unique within the version
  readonly kind: StepKind;
  readonly before: string;             // the transition id this step stands in front of
  readonly order: number;
  readonly lane: string;               // a buyer-side SystemRoleId
  readonly label: Bilingual;
  readonly instruction: Bilingual;
  readonly fields?: readonly { name: string; label: Bilingual; type: StepFieldType; required: boolean; options?: readonly string[] }[];
  readonly scan?: { readonly matches: string };          // a field-catalogue path
  readonly differentFrom?: readonly string[];            // step ids
  readonly completerMayNotAct?: boolean;
  readonly when?: { readonly fork: string; readonly branch: 'yes' | 'no' };
}
export interface AddedFork  { readonly id: string; readonly before: string; readonly condition: Comparison; readonly label: Bilingual }
export interface AddedCheck { readonly id: string; readonly on: string; readonly rule:
    | { kind: 'named-person' }
    | { kind: 'value'; condition: Comparison; message: Bilingual }
    | { kind: 'different-person'; step: string } }

export interface FlowVersionContent {
  readonly entity: string;             // a flow with a command target
  readonly baseVersion: number;        // FlowDefinition.version it was composed against
  readonly steps: readonly AddedStep[];
  readonly forks: readonly AddedFork[];
  readonly checks: readonly AddedCheck[];
}
```

The record around it (`FlowVersion`) adds a store-minted id, the label, a title, the rationale, the acknowledged warnings, the state, and the stamps: who and when for create, propose, decide, activate, retire and restore. No stamp is ever a payload field; the dispatcher already refuses an actor in a payload by key.

---

## 4 · The validation library

**Requirement:** every process has rules, and a new or modified flow must obey them; the library refuses what breaks them.

The library is one pure module, `src/services/flowBuilder/validateVersion.ts`. It takes a version's content and a world (the registered flows, the roles, the module switches, the field catalogue, the surfaces that can show a step) and returns findings. It refuses nothing itself. Three callers decide what a finding blocks, and they call the same function so they cannot disagree: the composer (shows findings as the author works), the propose and approve checks, and the activate and restore checks. A stored version is validated again each time it is read.

A finding is an **error** (blocks proposing, approving and activating) or a **warning** (blocks them until the proposer acknowledges it; the acknowledgement is recorded).

### 4.1 The rule every other rule serves

> **An active version can add a refusal. It can never remove one.**

It holds by construction, because the version object has no field that could express a removal, and it is also asserted, because a sentence is not a guard: for every act of every registered flow and any valid version, the act as the dispatcher applies it has the same from-states, destination, lane, required fields and settlement, and its checks begin with the shipped checks in the shipped order. The test is run over the real catalogue with a version that gates every gateable act, and it is probed both ways: a deliberately broken applier that drops one shipped check must turn it red, naming the act.

### 4.2 The rules

| Code | Refuses (error) or flags (warning) | Why |
|---|---|---|
| R01 | error — the process has no command target | its acts cannot fire, so a step could never be met |
| R02 | error — `baseVersion` is not the shipped version of the process | the change was composed against a process that no longer exists |
| R03 | error — an element names an act the process does not have | |
| R04 | error — the act is fired by a system, a cascade or a creation, or is not shown on a surface | automation cannot wait for a person. The cascade fan-out swallows a refusal, so a gate there would delete an act silently |
| R05 | error — the process has no surface that can show a step | derived from where `NextActLine` is mounted; a step nobody can open would stop the process for good |
| R06 | error — the lane is not a buyer-side lane, or holds no permission of its own (an anchor, the automation grant) | nobody could complete the step |
| R07 | error — a label or instruction is missing in either language, or names a person | roles only; both languages from birth |
| R08 | error — ids are not unique, or orders repeat in front of one act | |
| R09 | error — a fork, value rule or scan names a field that is not in the catalogue, uses an operator its type does not allow, or carries a value of the wrong type | |
| R10 | error — a condition names a date field | no rule reads the clock |
| R11 | error — a step names a fork that does not stand in front of the same act; a fork has no step on either branch | |
| R12 | error — a separation rule names a step that is not earlier in front of the same act, or a `different-person` check names a step that does not exist | the comparison would have nothing to read |
| R13 | error — a capture field uses a name the dispatcher treats as an actor field, or two fields share a name | attribution comes from the session, never from a form |
| R14 | error — more than one approval step with the same lane and no separation rule in front of one act | it is the same approval twice |
| R15 | warning — every way out of a state now waits on an added step | a document in that state can only move once the step is done; say so on purpose |
| R16 | warning — the act refuses, cancels or withdraws a document (its destination is a declared ending other than the process's last success state) and a step now stands in front of it | the safe direction should stay easy to reach |
| R17 | warning — the process's module, or the lane's module, is switched off | the step cannot be met until it is on |
| R18 | warning — more than five elements in front of one act | the screen stops being readable |
| R19 | information — how many documents rest in a state the change affects, now | the reviewer sees what the change will meet (§6.4) |

R16's population is derived from each flow's declared endings, not from act names. If that derivation proves too coarse on a real draft, the remedy is a ruling on which acts are protected, not a list of name patterns.

### 4.3 How the library is kept honest

- **A known-good version passes, first.** A guard that is wrong about what it should accept looks like a working guard.
- **One known-bad version per rule, asserting the rule code and the element id by name.** Never a count.
- **The world is injected.** The population the rules run over comes from the registry, the role table and the catalogue directly, never through the function under test.
- **R04's probe fires at a real member:** `t_quotation_award` is fired by cascade at the pin and must be refused by name; `t_pr_approve` must be accepted.

---

## 5 · Proposal, review, approval, activation

### 5.1 The machine

A change is a document with its own lifecycle, an ordinary registered flow with a command target, so every act on it goes through the dispatcher and leaves an event.

| Act | From → to | Who | Must state | Refused when |
|---|---|---|---|---|
| create | — → Draft | `flow:draft` | process, title | the seat names nobody; the process has no command target |
| save | Draft (stays) | `flow:draft` | content | the seat names nobody; the content is malformed |
| propose | Draft → In Review | `flow:draft` | rationale | any error; an unacknowledged warning; the base moved; the seat names nobody |
| withdraw | In Review, Approved → Draft | `flow:draft` | reason | the seat names nobody |
| return for changes | In Review → Draft | `flow:decide` | reason | the seat names nobody |
| approve | In Review → Approved | `flow:decide` | reason | any error; the base moved; the seat names nobody; **the approver is the proposer**; a sample person on production |
| reject | In Review → Rejected | `flow:decide` | reason | the seat names nobody |
| activate | Approved → Active | `flow:activate` | reason | any error; the base moved; the seat names nobody; a sample person on production |
| supersede | Active → Retired | automation | — | fired by cascade when another version of the same process is activated or restored |
| retire | Active → Retired | `flow:activate` | reason | the seat names nobody |
| restore | Retired → Active | `flow:activate` | reason | any error; the base moved; the seat names nobody; a sample person on production |

`Rejected` is the only ending. A rejected change is copied into a new draft if it is wanted again. Every other state has a way out.

### 5.2 Four eyes

- **The approver may not be the proposer.** Both are named, because proposing already refuses an unnamed seat; the comparison is never vacuous.
- **Rejecting, returning and retiring have no four-eyes rule.** They are the safe direction and stay reachable by any one named holder of the right.
- **The Super Admin exemption, as ruled at ADM-1.** The approver-is-proposer check asks `exempt('FLOWVERSION_APPROVER_IS_PROPOSER')` at the point it would refuse. For a Super Admin seat the dispatcher then requires a one-line reason, records the rule and the reason on the event, and the act appears on the Super Admin activity view. `admin` holds the same rights and is not exempt. Nothing else stands aside for a Super Admin: not a validation error, not a moved base, not a pending step.
- **Sample persons.** On a demo or preview deployment a sample person may propose, approve and activate, and every row shows the `(SAMPLE)` marker through the one label resolver. On production a sample person is refused, by the rule module switching already uses. This replaces Design 6's "approve refuses every sample person", which would make the builder impossible to demonstrate.

### 5.3 What the reviewer is shown

The reviewer does not read a diff of two machines. The change is the list of additions, so the review shows:

1. **The change in sentences**, generated from the content in the reader's language: *Before "Approve requisition": when the estimated value is at least Rp 500,000,000, Finance approves. The approver may not then take the act.*
2. **The table of elements** (kind, in front of which act, lane, rule).
3. **The validation report**, run at that moment, with the acknowledged warnings and who acknowledged them.
4. **What it will meet:** how many documents rest in each affected state now.
5. **The history:** every act on this change, who and why.
6. **The diagram** of the process with the added elements drawn on the edges they gate.

### 5.4 Activation

Activation is its own act because approving says the change is right and activating says it is in force now. Keeping them apart gives rollback a natural shape and lets a change be approved ahead of the day it should start.

At activation the dispatcher re-validates against the world as it is then. If another version of the same process is active, a cascade retires it (the pattern forecast publication already uses), so at most one version of a process is active. The confirmation names what is being replaced.

---

## 6 · Versions, rollback, and the record

### 6.1 Labels

A version is labelled `<shipped version>.<n>`: `2.1` is the first change made to shipped version 2 of that process. `n` is minted by the store, per process, and never reused. The shipped process itself is `2` and is always there.

### 6.2 Rollback

| Wanted | Act | Effect |
|---|---|---|
| Back to the shipped process | retire the active version | at once; no step of it is due any more |
| Back to an earlier change | restore it | it is validated again, the current one is retired by cascade |
| A changed copy of any version | "Start a draft from this version" | a new draft with the same elements, a new label, a new approval |

A version is never edited after it is proposed and never deleted. Its content is immutable from In Review onward; the save act is legal only in Draft.

### 6.3 What is recorded, and where it is read

| Fact | Where |
|---|---|
| Who created, proposed, returned, approved, rejected, activated, retired, restored; when; why | one event per act, with the named person; shown as the version's history |
| A four-eyes check passed on the Super Admin exemption | the event's `bypass` (rule and reason); the Super Admin activity view |
| Who completed or declined a step, when, with what values | the step ledger, one row per act; shown on the document's step dialog and in the process's status history |
| Which version of the process an act was taken under | `flowVersion` on **every** event the dispatcher emits (`purchaseRequisition@2`, `purchaseRequisition@2.1`). This is Design 6's P-1. The event shape is pinned by the C3 contract test, so the field is added there in the same batch |

### 6.4 Documents in flight

Design 6 recorded a ruling: *documents in flight finish on their original version.* It was made for changes that rename or remove a state, where a document could be left in a state the new version does not have. An additive version cannot do that.

For additive versions this design recommends: **an act taken after activation obeys the version in force when it is taken**, and the events and step rows say which version that was. A new control then applies to every document from the moment it is switched on, which is what a control is for, and a demonstration can be seen on the sample documents already on screen. The alternative (a document keeps the version it was created under) is cheap to build here, with a side record of each document's version at creation, but it means a change is visible only on documents created after it, and several processes cannot create a document in the fixture at all (a purchase order is created only by S/4). This is the first open decision.

### 6.5 When the base moves

If a deploy changes the shipped version of a process, every version composed against the older one fails R02 when it is next read. An active one is set aside: the process runs on the shipped default, and the page says so by name (`version 2.1 was set aside: the shipped process is now version 3`). It is the "refused on read, by name" behaviour custom roles already have. It is never silently kept and never silently dropped.

---

## 7 · How an active version takes effect

### 7.1 In the dispatcher

The dispatcher gains one optional injected dependency, on the pattern of the module gate. Absent, nothing changes, so every existing caller and test is untouched.

```ts
// DispatcherDeps
flowOverlay?: {
  /** What the active version adds in front of this act, for this document. */
  forAct(transitionId: string, entityId: string | undefined): ActOverlay | null;
  /** Mark the completed steps in front of this act as used. */
  consume(transitionId: string, entityId: string): void;
  /** The label stamped on the event: `<entity>@<version>`. */
  versionLabel(entity: string): string;
};
```

Order, stated because position is meaning here:

1. Everything the dispatcher does today up to and including required fields is unchanged: transition, scope, module, lane, stale state, legality, actor-in-payload, required fields.
2. **New — added steps.** If a step in front of this act is due for this document, refuse `STEP_PENDING:<step id>`. It is a new member of the closed refusal list, placed after `MISSING_FIELDS`, with its glossary sentence in both languages. It comes after the lane check so a seat without the right learns nothing about the document, and after legality so a caller is told the act is illegal before being told it is waiting.
3. The shipped checks run, unchanged, in their order.
4. **New — added checks**, in the version's order, refusing under the name `added_check` in the place a hook's name stands, so every refusal reader matches it the way it matches a hook.
5. Apply, emit. The event carries `flowVersion`. On success, `consume`.

A preview (the dispatcher's existing dry run) reports a pending step the same way and consumes nothing.

### 7.2 The step ledger

`processStep` is a registered flow on the ledger shape (one state, acts that preserve it), with a command target, so completing a step is an ordinary command.

| Act | Who | Refused when |
|---|---|---|
| complete (`t_step_complete`) | `step:complete`, held by every buyer-side lane | the step is not due; the seat's lanes do not include the step's lane; the seat names nobody; a required field is empty; the scanned value does not match; a separation rule is broken (exemption-aware) |
| decline (`t_step_decline`, approval steps) | the same | the same, and a reason is required |

The lane rule lives in a hook, which a surface's availability check cannot see. So the rule is one exported function (`stepOpenFor(step, seat)`) that both the hook and the surface call. This is the precedent the PSL gate set.

A declined approval keeps the act refused, and the refusal names the decline and its reason. The document's owner then uses the process's own acts (revise, reject, cancel), which are all still there. The step can be decided again; the latest decision counts and the earlier ones stay on the ledger.

### 7.3 On the surfaces

| Where | What changes |
|---|---|
| `NextActLine` (shared; mounted on eleven surface files) | When a step is due, the line says so first: *Added step — Finance approval. Waiting for Finance.* When the seat's lane holds it, the line carries **Open step**. |
| Step dialog (new, on the shared `Dialog`) | The step's label, instruction, fields or scan input, the earlier steps and who completed them, **Complete** (the one solid button) and, for an approval, **Decline**. |
| The page's own button for the gated act | Unchanged. Pressed while a step is due, it is refused and the toast says which step and which lane. No page is edited for this. |
| Process Flows — diagram | Elements of the active version are drawn on the edges they gate. A draft is drawn the same way inside the composer, never on the live page. |
| Process Flows — guide tabs | A tenth tab, **Versions**: the version in force, its elements in sentences, and the history. The Steps tab lists the added steps in front of each act. |

### 7.4 What does not change at runtime

The registry, the 30 flow modules, every existing check, every existing page's buttons, the guides on disk, the contract documents (except C3's one field and the catalogue counts that the two new flows move), and every gate that reads `getKnownFlows()`.

---

## 8 · What it looks like, on the shared components

**No new route.** The ruling Design 6 worked to was one page. Process Flows gains two views at the top, as tabs on the shared `Tabs`:

- **Catalogue** — the page as it is today, plus the version in force on each flow card and in the flow header.
- **Changes** — every version of every process.

Deep links: `?view=changes`, `?view=changes&version=<id>`, and the existing `?flow=<entity>`.

| Surface | Built from | Notes |
|---|---|---|
| **Changes** view | `ListPage` + `DataTable` | Columns: label (`id`), process (`text`, names the row), title (`text`), state (`status`), proposed by (`text`, through the person-label resolver), decided by, in force since (`date`), actions. Tabs across the top filter by state. The page's one solid button is **New change**. A seat without `flow:draft` sees a hand-off notice in its place naming the lane that holds it. |
| **Composer** | `Dialog fill` | Left: the process diagram; selecting an act selects the edge. Right: "In front of *Approve requisition*" — the elements already there in order (`Card`, each with `IconButton` to move or remove), then the palette as `ChoiceCard`s (Approval, Confirmation, Data capture, Scan, Check, Fork). An element's form uses `FormField`, `TextInput`, `Select`, `TextArea`, `Checkbox`; the two languages sit side by side. Below: the findings as `Notice`s — errors in the critical tone, warnings each with an acknowledge `Checkbox`. Footer: **Save draft** (outline) and **Propose for review** (the one solid button), which opens a small `Dialog` asking for the rationale. |
| **Review** | `SidePanel wide` | The six blocks of §5.3 under `SectionHeading`s, facts in `FieldList`/`Field`, history on `Timeline`. Footer by state. In Review: **Approve** (solid), **Return for changes** (outline), **Reject** (critical outline; pressed, it asks the reason and its confirm is the solid critical button, as PG-1 rules). Approved: **Activate** (solid), **Withdraw** (outline). Active: **Retire** (critical outline, then solid critical confirm). Retired: **Restore** (solid). Every act asks its reason in the same small dialog. |
| **Super Admin reason** | the existing `BypassReasonDialog` | Mounted once in the router already. An approval by a Super Admin who is also the proposer raises it. |
| **Step dialog** | `Dialog` | §7.3. |
| Honesty markers | `Notice tone="sample"`, `StatusPill` | The Changes view states that versions are kept in this browser and are not shared (until the backend exists), and that a sample person's decision is a demonstration. |

Every string is in an i18n fragment exporting both languages (`flowBuilderEn` / `flowBuilderId`), so parity is covered the moment the file exists. Type, colour, boxes, buttons, tables and controls come only from the shared components, so the UI gate needs no new exemption. `SidePanel wide` and `Dialog fill` exist at the pin; the anchored dialog and the table-width drawer are on the PG-2 branch and are not relied on.

---

## 9 · What changes at runtime in the fixture, and what is SE work

| | Runtime, built now | SE work |
|---|---|---|
| **Where versions live** | in the browser (`localStorage`, the custom-roles pattern), per person and per device | a shared, durable store behind the data service; migration of nothing, because the fixture's versions are sample decisions |
| **Who is named** | a sample person, marked; refused on production | real sign-in; then the production bar lifts by itself |
| **Step records, events** | in memory, like every document in the fixture; lost on reload with the documents they belong to | durable events and step ledger; the query "who took this act on this document" |
| **Enforcement** | the shared dispatcher, in the browser | the same dispatcher logic on the server; the overlay is an injected dependency for that reason |
| **Kinds of change** | additions in front of the 76 person-fired acts of the 24 writable flows; buyer-side lanes | supplier-side steps (if ruled, a later batch here) |
| **A new stored state, a re-routed or removed act, a removed check, a different lane or required field on an existing act** | not possible; the version object cannot express it | generated, reviewed code through the gates — Design 6 §7, unchanged, with §4's lifted checks and §8's per-document versions if coexistence is wanted |
| **A new document type** | not possible | needs a command target, a store and surfaces: an ordinary engineering batch |
| **Scan** | a typed or wedge-scanned code matched against a document field | camera or device scanning |
| **Telling a lane a step is waiting** | the line on the document and the refusal on the act | notifications (SE-7) |
| **Deadlines on a step** | none, by rule: nothing is clock-fired | if wanted, as a projection at read, never a stored state |
| **Reusing an existing check elsewhere** | no | per check, with a description and a statement of what it reads (Design 6 §2.2) |

---

## 10 · Traceability to the operator's requirements

| Requirement | Where |
|---|---|
| 1 · Modify a process by adding steps | §3.1, §7; batches FB-2 and FB-4 |
| 2 · Elements, forks, checks, scans; a flow must obey the rules; the library refuses what breaks them | §3, §4; batches FB-1, FB-2, FB-5 |
| 3 · A flow that replaces the default needs approval, then overrides and is in effect | §5, §7; batches FB-3 and FB-4 |
| 4 · Versioned and audited: who proposed, who approved, when, why | §5.1, §6; batches FB-1, FB-3, FB-6 |

---

## 11 · Confirmation

- **Pin:** `0af62ddd9ca85c59a822896770d8cead736bfaff`. Design 6 itself is unchanged at this commit (115,535 bytes).
- **How the figures were obtained:** `git archive` of the pin into a scratch directory; a census script run with `vite-node` inside that copy, importing `src/services/transitions/index` so the flows self-register, then reading `getKnownFlows()`, `CASCADES`, `getRegisteredPolicyHooks()`, `SYSTEM_ROLES`, `rolesHolding`, `WIRED_COMMAND_TARGETS`, `SAMPLE_PEOPLE` and the module registry. The two source counts (state-literal comparisons in surface files; destination-state branches in targets) are `grep` counts over non-test files, with one known member confirmed present (`status === 'Pending Approval'` in the requisitions page). They are a measure of coupling, not an exact census.
- **Not measured:** which processes have a surface that mounts `NextActLine` was read from the eleven mounting files, not resolved per process; R05 derives it in the build. Line numbers are not cited because the tree moves daily.
- **Not walked in a browser.** This is a design from source.
- **Nothing was written in the repository.** No checkout, no stash, no branch. The stale sibling copy was not touched. The three files of this delivery are the only output.
