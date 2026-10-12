---
entity: flowVersion
locale: en
title: Change to a process (flow version)
wired: true
owner: portal
source_sha: 0531e094d401b8c51e320fd3151da6b72963ba47
transitions:
  - t_flowversion_create
  - t_flowversion_save
---

<!-- section:summary -->
## 1 · What this process is

A change to a process is a document of its own. It names one process and lists what it would add in front of acts that process already has: steps a person completes, checks the platform evaluates, and forks that decide which steps apply. A change can add a refusal. It can never take one away, and it cannot add a state, re-route an act or move a lane.

Each change is a **version**. Its label is `<shipped version>.<n>`: the first change drafted against a process that ships as version 2 is `2.1`, the next is `2.2`. The number counts per process and is never reused. The id is `fv-<n>`. The store assigns the id, the label and every stamp; the person drafting says only which process and what the change is called.

Who touches it: the **buyer's Compliance lane** drafts a change (permission `flow:draft`). A lane cannot be the one that changes the process it is held to, so procurement, receiving, finance, planning and the requisitioner do not hold it. Admin and Super Admin hold it as they hold every buyer-side permission. Every seat can read the **Changes** tab; only the drafting is one lane's act.

Honest markers, stated plainly:

- **Nothing a version says is in force.** No version can be proposed, approved or switched on yet. Every process runs as it shipped, and the page says so.
- **Only creating a draft has a screen.** Saving a draft's content (`t_flowversion_save`) is built and has no screen yet; the composer that saves a draft arrives in the next batch (FB-2).
- **`Draft` has no way out yet.** The act that proposes a change arrives with review and approval (FB-3). Until then a draft stays a draft. This is recorded as an open edge in the loose-end census, not hidden.
- **Versions live in this browser only** (`localStorage`, key `paragon.flowVersions`). They survive a reload. They are not shared with anyone, are not on a server, and go when site data is cleared.
- **Nothing is seeded.** The list opens empty; every version in it was drafted in this browser.
- A change is recorded against the person who drafted it. There is no user directory yet, so that person is a sample identity adopted on the identity panel, and a change drafted by a sample person is a demonstration. A seat that names nobody is refused.
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:1-65; src/services/flowBuilder/flowVersion.ts:1-15,92-150; src/services/flowBuilder/flowVersionStore.ts:1-24,41; src/services/transitions/businessRoles.ts:363-366; src/services/transitions/looseEndCensus.ts:328-340; src/lib/i18n/flowBuilder.ts:17-37; src/lib/i18n/processFlowPurpose.ts:294-295 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Draft | creation (operator action) | buyer · compliance | `t_flowversion_create` |
| 2 | Draft → Draft | records a fact (state-preserving) · not active (no screen yet) | buyer · compliance | `t_flowversion_save` |

**Forks**

- **At Draft:** `t_flowversion_save` — compliance — replaces what the draft says; the draft stays a draft. There is no other act. `Draft` has no exit and the machine has no ending: proposing a change arrives with FB-3.

Both acts are refused for a seat that names no person (`flowversion_author_named`).
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:28-64; src/services/transitions/looseEndCensus.ts:328-340 -->

<!-- section:steps -->
## 3 · Step by step

### t_flowversion_create — Create draft <!-- transition:t_flowversion_create -->

- **Step kind:** operator action (creation)
- **Role:** buyer · compliance (atom `flow:draft`; Admin and Super Admin hold it too)
- **From → to:** ∅ → Draft
- **Operator — where:** `/buyer/process-flows` → tab **Changes** → **New change** (top right of the page header) → the pop-up **New change** → **Create draft**. The pop-up is a dialog: it takes the focus, and Escape, the close button or a click outside closes it. The button stands in the header only while the **Changes** tab is open. A seat that does not hold `flow:draft` sees, in the same place, **Changing a process is a Compliance action** with an *Awaiting Compliance* hand-off notice, and no pop-up.
- **Operator — do:** choose the process and name the change, then press **Create draft**. The change is created as an empty draft against the process as it ships today. Nothing runs differently.
- **Operator — fill:** **Process** (`flow`) — the list offers only a process a command can write through, with an act a person takes on a screen, each shown by its guide title. **Title** (`title`) — what the change is for, in a few words; it cannot be blank. Nothing else is asked: the id, the label, the shipped version the change is drafted against and who drafted it are not fields.
- **Tester — expected state:** Draft
- **Tester — confirm:** toast *"Version {label} of {process} created as a draft."*; the pop-up closes; a new row in the table on the **Changes** tab with **Version** (`<shipped version>.<n>`), **Process**, **Title**, **State** *Draft*, **Adds** *0 elements*, **Drafted by** (the sample person the seat is acting as) and **Drafted**. The line *"No change has been drafted yet."* is gone. The version is in `localStorage` under `paragon.flowVersions` and is still listed after a reload. Opening a flow on the **Catalogue** tab still reads *"Shipped · version {version} — in force"* — the draft changed nothing.
- **Tester — trigger event:** `t_flowversion_create`
- **Checks that can refuse:** `flowversion_author_named` — the seat must name a person (`FLOWVERSION_AUTHOR_UNATTRIBUTED`). Above **Create draft** the pop-up says which seat this is: *"This seat names nobody, so this act will be refused. Adopt a sample user on the identity panel first."*, or *"This will be recorded against {person}."* once a sample user is adopted. The button stays live; pressed from a seat that names nobody, the toast reads *"Refused: this seat names nobody, and this act is recorded against the person who takes it. Adopt a sample user on the identity panel, then take it again."* `flowversion_process_writable` — checked in this order: the process must be registered (`FLOWVERSION_PROCESS_UNKNOWN`); it must not be `flowVersion` itself (`FLOWVERSION_PROCESS_SELF`, toast *"Refused: a change cannot be drafted against the process by which processes are changed."*); a command must be able to write through it (`FLOWVERSION_PROCESS_NOT_WRITABLE`); and the title must not be blank (`FLOWVERSION_TITLE_BLANK`, toast *"Refused: a change needs a title, so it can be found again."*). A title left empty is refused earlier, by the dispatcher, as `MISSING_FIELDS:title`. On any refusal the pop-up stays open and nothing is created.
- **Glossary:** `ROLE_NOT_PERMITTED` · `MISSING_FIELDS` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Honesty:** the pop-up says before the act where the draft lives — *"The draft is saved in this browser and survives a reload — local to this browser, not shared, not on a server."* — and what it does: *"It is created as an empty draft against the process as it ships today; nothing runs differently."* The created draft is empty and stays empty, because no screen saves content into it yet. The **Drafted** date is the portal's declared present, not the wall clock. The form cannot name an unregistered or unwritable process, or the process that changes processes; the act refuses each anyway.
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:38-50; src/services/data/mock/flowVersionTarget.ts:16-36,55-69; src/services/transitions/policies.ts:2864-2873,2949-2956; src/services/transitions/dispatcher.ts:824-837; src/services/flowBuilder/flowVersionStore.ts:246-264; src/services/query/commandHooks.ts:1383-1399; src/pages-v2/ProcessFlows.tsx:316-337,364-378,603-613; src/pages-v2/process-flows/ChangesView.tsx:105-195; src/pages-v2/process-flows/flowVersionRefusal.ts:10-28; src/lib/i18n/flowBuilder.ts:48-73; src/lib/i18n/identity.ts:80-86 -->

### t_flowversion_save — Save draft <!-- transition:t_flowversion_save -->

- **Step kind:** records a fact (state-preserving) · not active (no screen yet)
- **Role:** buyer · compliance (atom `flow:draft`; Admin and Super Admin hold it too)
- **From → to:** Draft → same state
- **Operator — where:** no screen today. On `/buyer/process-flows` → tab **Changes** a draft can be created and listed; it cannot be opened or edited. The composer that saves a draft arrives in the next batch (FB-2).
- **Operator — do:** nothing yet. When the composer lands, saving replaces everything the draft says — its steps, forks and checks — with what was composed. Saving is not deciding: the draft stays a draft and nothing comes into force.
- **Operator — fill:** `content` — the whole list of steps, forks and checks, together with the process and the shipped version the change is about. Those two were fixed when the draft was created and a save cannot change them. No screen fills this today.
- **Tester — expected state:** Draft
- **Tester — confirm:** not confirmable on a screen today. Once a save has run, the row's **Adds** count reads the number of steps, forks and checks saved, and the record carries who saved it and when (`savedBy`, `savedAt`); the label, the id and who drafted it do not change.
- **Tester — trigger event:** `t_flowversion_save`
- **Checks that can refuse:** `flowversion_author_named` — the seat must name a person (`FLOWVERSION_AUTHOR_UNATTRIBUTED`). `flowversion_content_well_formed` — the content must be a list of steps, forks and checks (`FLOWVERSION_CONTENT_MALFORMED`), and must stay about the process and the shipped version the change was created against (`FLOWVERSION_CONTENT_MOVED`). An id that is not a version in this browser is `NOT_FOUND`. The rules R01–R19 on the **Changes** tab do **not** refuse a save: a draft is allowed to be unfinished.
- **Glossary:** `ROLE_NOT_PERMITTED` · `NOT_FOUND` · `MISSING_FIELDS` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Honesty:** the act is built and has **no screen**; nothing on the portal fires it today. A saved draft that breaks a rule of its process is kept and named under **Some changes no longer obey the rules of their process** — it is reported, not refused and not dropped. Whatever a draft says, none of it is in force.
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:51-63; src/services/data/mock/flowVersionTarget.ts:38-53,70-72; src/services/transitions/policies.ts:2864-2873,2949-2956; src/services/flowBuilder/flowVersion.ts:92-131,217-230; src/services/flowBuilder/flowVersionStore.ts:265-273; src/services/flowBuilder/liveWorld.ts:59-83; src/pages-v2/process-flows/ChangesView.tsx:225-233,286-310; src/lib/i18n/flowBuilder.ts:70-73 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Seat holds `flow:draft` or not (before the act).** Branch A — the seat holds it: **New change** stands in the header of the **Changes** tab. Branch B — it does not: the header reads **Changing a process is a Compliance action** with *Awaiting Compliance*, and no pop-up exists for that seat. The tab itself, the list and the rules are readable by every seat.
- **Seat names no person (exception).** `POLICY_REJECTED:flowversion_author_named` (`FLOWVERSION_AUTHOR_UNATTRIBUTED`) — **Create draft** pressed from the seat as it opens, with no sample user adopted on the identity panel. Nothing is created and nothing is stamped. Adopt a sample user, then create the draft again.
- **Blank or missing title (exception).** A title of spaces only is refused by `flowversion_process_writable` (`FLOWVERSION_TITLE_BLANK`). A title left empty is refused by the dispatcher as `MISSING_FIELDS:title`, before any check runs.
- **Process that cannot be changed (exception).** A process the platform does not have (`FLOWVERSION_PROCESS_UNKNOWN`) or one no command can write through (`FLOWVERSION_PROCESS_NOT_WRITABLE`). The form offers neither; a hand-crafted payload naming one is refused.
- **A change to the process that changes processes (exception).** A payload naming `flowVersion` itself is refused (`FLOWVERSION_PROCESS_SELF`): a change cannot be drafted against the process by which processes are changed. The **Process** list does not offer it; the act refuses it anyway.
- **Payload that names who acted, or an id or label (exception).** A payload carrying a key the platform keeps for the person acting is refused by the dispatcher (`ACTOR_IN_PAYLOAD`). An id or a label in a payload is ignored: the store assigns both.
- **Save that moves the change (exception, no screen today).** Content naming another process, or another shipped version, is refused (`FLOWVERSION_CONTENT_MOVED`); content that is not a list of steps, forks and checks is refused (`FLOWVERSION_CONTENT_MALFORMED`).
- **A version that no longer obeys its rules (derived, not an act).** Each time the list is read, every stored version is checked against the rules as they are now. One that breaks a rule of kind *Error* is kept, listed, and named with the rule it breaks. Nothing is refused and nothing is removed.
- **A stored row that is not a version (derived, not an act).** A row whose id, label, state, title or stamps do not hold together is refused when it is read, named with its reason, and still kept in storage. Its id and its label are not given out again.
- **Proposing, approving, switching on, rolling back.** Not built. There is no act and no screen for any of them.
<!-- src: src/pages-v2/ProcessFlows.tsx:364-378; src/services/data/mock/flowVersionTarget.ts:16-53; src/services/transitions/dispatcher.ts:824-837; src/services/flowBuilder/flowVersionStore.ts:96-110,163-202; src/services/flowBuilder/liveWorld.ts:59-83; src/services/transitions/looseEndCensus.ts:328-340 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| **Kept in this browser** — *"Changes are saved in this browser and survive a reload. They are not shared with anyone and are not on a server. A change drafted by a sample person is a demonstration."* | standing notice | — | always | top of the **Changes** tab |
| *"Nothing here is in force: every process runs as it shipped."* | standing statement | — | always | under **Changes to processes** on the **Changes** tab |
| *"Shipped · version {version} — in force"* | derived at read | — | always, on every process | each flow card and the flow header on the **Catalogue** tab |
| **Saved changes could not be read** | derived at read | — | `localStorage` holds data under `paragon.flowVersions` that could not be parsed; no version is listed (not the same as having none) | notice on the **Changes** tab |
| **Some saved changes were not loaded** | derived at read | — | a stored row was refused when it was read; each is listed with its reason and is still kept | notice on the **Changes** tab |
| **Some changes no longer obey the rules of their process** | derived at read | Draft | a stored version breaks a rule of kind *Error* today; each is named as *"Version {label} of {process} — {code}: {element}"* with the rule's sentence | notice on the **Changes** tab |
| Awaiting Compliance (hand-off) | derived at read | — | the seat does not hold `flow:draft` | page header, in place of **New change** |
| *"This will be recorded against {person}."* | derived at read (seat) | ∅ | the seat holds `flow:draft` and is acting as a sample user | the pop-up, above **Create draft** |
| *"This seat names nobody, so this act will be refused. Adopt a sample user on the identity panel first."* | derived at read (seat); refusal (`flowversion_author_named`) | ∅ | the seat holds `flow:draft` and names no person | the pop-up, above **Create draft**; on pressing it, the failure toast |
| Read suspended | derived at read | — | storage was read before any process was registered, so rows are neither accepted nor refused | no surface (store read state `suspended`) |
<!-- src: src/pages-v2/process-flows/ChangesView.tsx:171-175,187-195,248-311; src/services/flowBuilder/flowVersionStore.ts:45-54,117-161; src/services/flowBuilder/liveWorld.ts:63-83; src/lib/i18n/flowBuilder.ts:15-46; src/lib/i18n/identity.ts:80-86; src/lib/i18n/roles.ts:49-50 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** none is seeded. The first version drafted in a browser is `fv-1`; its label depends on the process chosen (`<shipped version>.1`).

| Joins to | By | Note |
|---|---|---|
| The process it changes (flow registry) | `content.entity` | read from the registry; a change never writes to it, so the shipped catalogue stays what the code declares |
| The shipped version it was drafted against | `content.baseVersion` | read from the process when the draft is created, never taken from the payload; it is the first number of the label |
| Process name on screen | the process guide's title | the **Process** list and the **Process** column show the guide title in the reader's language |
| Who drafted it, who last saved it | `createdBy`, `savedBy` | the seat's person at the time of the act; shown through the one person-label resolver, so a sample person carries the sample marker |
| Browser storage | `paragon.flowVersions` | `{ v, versions, counters }`; the counters keep the per-process number from ever running backwards |
| The rules a change must obey | rule codes R01–R08, R12–R19 | listed on the **Changes** tab under **Rules a change must obey**; they produce findings, not refusals |
| A link to one version | `?view=changes&version=<id>` | opens the **Changes** tab with that row marked current; a version this browser does not hold opens the **Catalogue** tab instead |
| Audit trail | `TransitionEvent` for each act | one event per create and per save, refusals included |
| Loose-end census | `flowVersion` · `Draft` | the missing way out of `Draft` is recorded there as an edge not yet authored |

Display-only: **Adds** is counted at read from the steps, forks and checks the version holds. **State** shows *Draft*. The id, the label, the sequence and the stamps are store-assigned, never fields.
<!-- src: src/services/flowBuilder/flowVersion.ts:92-150; src/services/flowBuilder/flowVersionStore.ts:41,204-215,246-264; src/services/data/mock/flowVersionTarget.ts:61-69; src/services/flowBuilder/validateVersion.ts:33-50; src/pages-v2/process-flows/ChangesView.tsx:52-56,210-246; src/pages-v2/ProcessFlows.tsx:316-337; src/services/data/mock/documentIds.ts:79-80; src/guides/index.ts:73 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` (the seat, not a person), `ts`, `outcome`, one `correlationId` per command. A separate `attribution` field records who could be named. Refusals are written too, with their reason. The version itself carries `createdBy` and `createdAt`, and `savedBy` and `savedAt` once it has been saved. There is no per-version history view; the **Changes** tab shows each version as it is now.

Worked sequence, as a tester holding Compliance would produce it in a browser with no versions yet:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ (refused) | buyer · compliance, seat names nobody | **New change** → choose a process, write a title → **Create draft** | `t_flowversion_create`, `outcome: failed`, `POLICY_REJECTED:flowversion_author_named` |
| T+1 | ∅ → Draft | buyer · compliance, acting as a sample user | the same, after adopting a sample user on the identity panel | `t_flowversion_create` — version `fv-1`, label `<shipped version>.1` |
| T+2 | Draft (no change) | — | reload the page and open the **Changes** tab: the row is still listed, read back from `paragon.flowVersions` and checked again | — (no event) |
| T+3 | ∅ → Draft | buyer · compliance, acting as a sample user | a second draft against the same process | `t_flowversion_create` — version `fv-2`, label `<shipped version>.2` |

No step of this sequence saves a draft: `t_flowversion_save` has no screen today.
<!-- src: src/services/transitions/events.ts:26-61,98; src/services/flowBuilder/flowVersion.ts:116-131; src/services/flowBuilder/flowVersionStore.ts:246-273 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **New change** button | the page header shows nothing on the right | the **Catalogue** tab is open | open the **Changes** tab; the button belongs to that tab |
| **Changing a process is a Compliance action** with *Awaiting Compliance* instead of the button | page header on the **Changes** tab | the seat does not hold `flow:draft` | open the avatar and select Compliance (a demo control) |
| Toast *"Refused: this seat names nobody, and this act is recorded against the person who takes it. Adopt a sample user on the identity panel, then take it again."* | `POLICY_REJECTED:flowversion_author_named` (`FLOWVERSION_AUTHOR_UNATTRIBUTED`); the line above **Create draft** already said so | the seat names no person | adopt a sample user on the identity panel, then press **Create draft** again; nothing was created |
| Toast *"Refused: a change needs a title, so it can be found again."* | `POLICY_REJECTED:flowversion_process_writable` (`FLOWVERSION_TITLE_BLANK`) | the title holds only spaces | write a title |
| A failure toast naming the title as missing | `MISSING_FIELDS:title` | the title was left empty | write a title |
| Toast *"Refused: a change cannot be drafted against the process by which processes are changed."* | `POLICY_REJECTED:flowversion_process_writable` (`FLOWVERSION_PROCESS_SELF`) | a hand-crafted payload named `flowVersion` as the process; the **Process** list does not offer it | choose another process; this one cannot be changed through a change |
| The process wanted is not in the **Process** list | the list is shorter than the **Catalogue** tab | no command can write through that process, it has no act a person takes on a screen, or it is the process that changes processes | expected; a step there could never be met |
| The draft cannot be opened, edited or given steps | the row on the **Changes** tab is not a link and **Adds** reads *0 elements* | saving a draft has no screen yet (FB-2) | expected today |
| No way to propose, approve or switch on a change | no such button anywhere | not built (FB-3 and later); `Draft` has no way out | expected today; every process runs as it shipped |
| A process still behaves as before after a draft was created | the **Catalogue** tab reads *"Shipped · version {version} — in force"* | nothing a version says is in force | expected today |
| The list is empty in another browser or on another machine | *"No change has been drafted yet."* | versions live in the browser that drafted them; nothing is seeded and nothing is shared | draft it again in that browser |
| The list is empty after clearing site data | *"No change has been drafted yet."* | clearing site data removes `paragon.flowVersions` | expected; the versions are gone |
| A draft is gone after a reload, with no notice | it was listed until the reload | the browser did not allow the write to storage (storage disabled or full), so the draft lived for that page only | allow site storage for the portal, then draft it again |
| Notice **Saved changes could not be read** | **Changes** tab | the data under `paragon.flowVersions` could not be parsed | drafting a change replaces what could not be read |
| Notice **Some saved changes were not loaded** | **Changes** tab, rows listed with reasons | hand-edited storage: a row is not a version, or its id, label, state, title or stamps do not hold together | fix the row in storage or leave it; it is kept, and its id and label are not reused |
| Notice **Some changes no longer obey the rules of their process** | **Changes** tab, each named with a rule code | the process moved underneath the change, or saved content breaks a rule of kind *Error* | read the rule under **Rules a change must obey**; the version is kept and nothing is in force either way |
| A link to a version opens the **Catalogue** tab | the address carries `?view=changes&version=<id>` | this browser does not hold that version | open the link in the browser that drafted it |
<!-- src: src/pages-v2/ProcessFlows.tsx:316-337,364-378; src/pages-v2/process-flows/ChangesView.tsx:119-150,256-329; src/services/data/mock/flowVersionTarget.ts:16-53; src/services/flowBuilder/flowVersionStore.ts:117-142,204-215; src/services/modules/registry.ts:125-136; src/lib/i18n/flowBuilder.ts:20-22,39-46,60-73 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Draft | — | — | no fixture — nothing is seeded and the store opens empty. Create one: take Compliance, adopt a sample user, then **Changes** → **New change** → **Create draft**. The first version in a browser is `fv-1` with label `<shipped version>.1`; it lives in that browser's `localStorage` under `paragon.flowVersions` |
<!-- src: src/services/data/mock/documentIds.ts:79-80; src/services/flowBuilder/flowVersionStore.ts:41,246-264 -->
