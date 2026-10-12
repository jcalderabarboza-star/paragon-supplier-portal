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

Each change is a **version**. Its label is `<shipped version>.<n>`: the first change drafted against a process that ships as version 2 is `2.1`, the next is `2.2`. The number counts per process and is never reused. The id is `fv-<n>`. The store assigns the id, the label and every stamp; the person drafting says only which process and what the change is called, or which version to start from.

Who touches it: the **buyer's Compliance lane** drafts a change (permission `flow:draft`). A lane cannot be the one that changes the process it is held to, so procurement, receiving, finance, planning and the requisitioner do not hold it. Admin and Super Admin hold it as they hold every buyer-side permission. Every seat can read the **Changes** tab; only the drafting is one lane's act.

Honest markers, stated plainly:

- **Nothing a version says is in force.** No version can be proposed, approved or switched on yet. Every process runs as it shipped, and the page says so.
- **A draft is composed and saved on a screen.** On the **Changes** tab, **Compose** in a draft's row opens the composer. There a step is put in front of an act of the process, and **Save draft** keeps it (`t_flowversion_save`). Saving decides nothing.
- **Only three kinds of step can be composed today:** Approval, Confirmation and Data capture. Scans, checks and forks cannot be composed yet (FB-5). A version that already holds one keeps it; the composer never drops what it did not write.
- **A saved draft may break the rules.** The rules a change must obey do not refuse a save. A draft with an error is saved, kept, and named on the **Changes** tab with the rule it breaks.
- **`Draft` has no way out yet.** The act that proposes a change arrives with review and approval (FB-3). Until then a draft stays a draft. This is recorded as an open edge in the loose-end census, not hidden.
- **Versions live in this browser only** (`localStorage`, key `paragon.flowVersions`). They survive a reload. They are not shared with anyone, are not on a server, and go when site data is cleared.
- **Nothing is seeded.** The list opens empty; every version in it was drafted in this browser.
- A change is recorded against the person who drafted it, and each save against the person who saved it. There is no user directory yet, so that person is a sample identity adopted on the identity panel, and a change drafted by a sample person is a demonstration. A seat that names nobody is refused both acts.
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:1-65; src/services/flowBuilder/flowVersion.ts:1-15,92-152; src/services/flowBuilder/flowVersionStore.ts:1-24,41; src/services/transitions/businessRoles.ts:363-366; src/services/transitions/looseEndCensus.ts:328-340; src/pages-v2/process-flows/composerModel.ts:9-20; src/pages-v2/process-flows/ChangeComposer.tsx:57-69; src/lib/i18n/flowBuilder.ts:17-37; src/lib/i18n/processFlowPurpose.ts:294-295 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Draft | creation (operator action) | buyer · compliance | `t_flowversion_create` |
| 2 | Draft → Draft | records a fact (state-preserving) | buyer · compliance | `t_flowversion_save` |

**Forks**

- **At Draft:** `t_flowversion_save` — compliance — replaces what the draft says and which of its warnings are acknowledged; the draft stays a draft. There is no other act. `Draft` has no exit and the machine has no ending: proposing a change arrives with FB-3.

Both acts are refused for a seat that names no person (`flowversion_author_named`).
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:28-64; src/services/transitions/looseEndCensus.ts:328-340 -->

<!-- section:steps -->
## 3 · Step by step

### t_flowversion_create — Create draft <!-- transition:t_flowversion_create -->

- **Step kind:** operator action (creation)
- **Role:** buyer · compliance (atom `flow:draft`; Admin and Super Admin hold it too)
- **From → to:** ∅ → Draft
- **Operator — where:** two entrances, both on `/buyer/process-flows` → tab **Changes**. (1) **New change** (top right of the page header) → the pop-up **New change** → **Create draft**. The pop-up is a dialog: it takes the focus, and Escape, the close button or a click outside closes it. The button stands in the header only while the **Changes** tab is open. (2) In the row of a version, column **Actions** → **Start a draft from this version**. There is no pop-up: the act fires when the link is pressed. A seat that does not hold `flow:draft` sees, in the header, **Changing a process is a Compliance action** with an *Awaiting Compliance* hand-off notice, no pop-up, and no **Actions** column.
- **Operator — do:** (1) choose the process and name the change, then press **Create draft**. The change is created as an empty draft against the process as it ships today. (2) Or press **Start a draft from this version** in a row. The new draft is a change to the same process and holds the same steps, forks and checks as that version, against the process as it ships today. Either way nothing runs differently.
- **Operator — fill:** in the pop-up, **Process** (`flow`) — the list offers only a process a command can write through, with an act a person takes on a screen, each shown by its guide title; and **Title** (`title`) — what the change is for, in a few words; it cannot be blank. **Start a draft from this version** asks nothing: it sends the row's own process, the title *"{title} (copy)"* and the row's id (`fromVersion`, optional in the payload). The id, the label, the shipped version the change is drafted against and who drafted it are never fields.
- **Tester — expected state:** Draft
- **Tester — confirm:** from the pop-up: toast *"Version {label} of {process} created as a draft."*; the pop-up closes; a new row in the table on the **Changes** tab with **Version** (`<shipped version>.<n>`), **Process**, **Title**, **State** *Draft*, **Adds** *0 elements*, **Drafted by** (the sample person the seat is acting as), **Drafted** and **Actions**. The line *"No change has been drafted yet."* is gone. From a row: toast *"Version {label} created as a draft, from version {from}."*; a new row with its own label (the next number of that process), the title *"{title} (copy)"*, the same **Adds** count as the source, and **Drafted by** the person acting now. Opened in the composer, it shows the same steps and no warning is ticked. In both cases the version is in `localStorage` under `paragon.flowVersions` and is still listed after a reload, and opening a flow on the **Catalogue** tab still reads *"Shipped · version {version} — in force"* — the draft changed nothing.
- **Tester — trigger event:** `t_flowversion_create`
- **Checks that can refuse:** `flowversion_author_named` — the seat must name a person (`FLOWVERSION_AUTHOR_UNATTRIBUTED`). Above **Create draft** the pop-up says which seat this is: *"This seat names nobody, so this act will be refused. Adopt a sample user on the identity panel first."*, or *"This will be recorded against {person}."* once a sample user is adopted. The button stays live; pressed from a seat that names nobody, the toast reads *"Refused: this seat names nobody, and this act is recorded against the person who takes it. Adopt a sample user on the identity panel, then take it again."* The row action shows no line before the act; the same toast is its refusal. `flowversion_process_writable` — checked in this order: the process must be registered (`FLOWVERSION_PROCESS_UNKNOWN`); it must not be `flowVersion` itself (`FLOWVERSION_PROCESS_SELF`, toast *"Refused: a change cannot be drafted against the process by which processes are changed."*); a command must be able to write through it (`FLOWVERSION_PROCESS_NOT_WRITABLE`); the title must not be blank (`FLOWVERSION_TITLE_BLANK`, toast *"Refused: a change needs a title, so it can be found again."*); and, when `fromVersion` is given, it must be a version this browser holds (`FLOWVERSION_SOURCE_UNKNOWN`, toast *"Refused: this browser does not hold the version the draft was to start from."*) and a change to the same process (`FLOWVERSION_SOURCE_OTHER_PROCESS`, toast *"Refused: a draft starts from a version of the same process."*). A title left empty is refused earlier, by the dispatcher, as `MISSING_FIELDS:title`. On any refusal the pop-up stays open and nothing is created.
- **Glossary:** `ROLE_NOT_PERMITTED` · `MISSING_FIELDS` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Honesty:** the pop-up says before the act where the draft lives — *"The draft is saved in this browser and survives a reload — local to this browser, not shared, not on a server."* — and what it does: *"It is created as an empty draft against the process as it ships today; nothing runs differently."* A draft made in the pop-up is empty until it is composed and saved. A draft started from a version carries that version's elements as they are, including any that break a rule, and is checked like every other version when the list is read. Nothing else of the source travels: the new draft has its own label, no acknowledged warning and its own author, and it does not record which version it started from. The **Drafted** date is the portal's declared present, not the wall clock. The form cannot name an unregistered or unwritable process, or the process that changes processes, and the row action cannot name a version this browser does not hold or a version of another process; the act refuses each anyway.
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:38-50; src/services/data/mock/flowVersionTarget.ts:17-53,87-100; src/services/transitions/policies.ts:2864-2873,2949-2956; src/services/transitions/dispatcher.ts:824-837; src/services/flowBuilder/flowVersionStore.ts:245-276; src/services/query/commandHooks.ts:1384-1400; src/pages-v2/ProcessFlows.tsx:316-338,364-379,609-619; src/pages-v2/process-flows/ChangesView.tsx:106-197,218-238,279-297; src/pages-v2/process-flows/flowVersionRefusal.ts:10-34; src/lib/i18n/flowBuilder.ts:48-73,128-134; src/lib/i18n/identity.ts:80-86 -->

### t_flowversion_save — Save draft <!-- transition:t_flowversion_save -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · compliance (atom `flow:draft`; Admin and Super Admin hold it too)
- **From → to:** Draft → same state
- **Operator — where:** `/buyer/process-flows` → tab **Changes** → in the draft's row, column **Actions** → **Compose** → the full-screen pop-up **Version {label} · {process}** (the composer) → **Save draft**. The **Actions** column stands only for a seat that holds `flow:draft`; every other seat reads the list and is offered no act on a row. The composer is a dialog: Escape, the close button or **Close** closes it.
- **Operator — do:** pick the act the step must come before, in **Act** or on the diagram of the process. Under **Add a step** choose **Approval**, **Confirmation** or **Data capture**, then press **Add {kind}**. The step is added last under **In front of “{act}”** and its form opens. Fill the form. Use the arrows on a step's row to move it earlier or later, and the bin to remove it. Read **What the rules say about this draft**; it answers as you type. For a warning that is meant, tick **Acknowledged: this is meant**. Press **Save draft**. Saving replaces everything the draft says with what is on the screen, and keeps which warnings are ticked. It decides nothing: the draft stays a draft and nothing comes into force. **Close** does not save and does not ask; what was composed since the last save is gone.
- **Operator — fill:** per step: **Lane that completes it** (one buyer-side lane); **Label — English** and **Label — Indonesian**; **Instruction — English** and **Instruction — Indonesian** (what the lane is asked to do; roles only, never a person). For **Data capture**, under **Fields the lane fills in**: **Add field**, then **Field name**, the field's label in English and in Indonesian, **Type** (Text, Number, Quantity, Money, Date, Yes / no, One of a list) and **Required**. Under **Keeping people apart**: **A different person from whoever completed “{step}”** — offered for each step that comes earlier in front of the same act — and **Whoever completes this step may not then take the act**. The payload is `content` (required: the whole list of steps, forks and checks, with the process and the shipped version, which a save cannot change) and `acknowledged` (optional: a list of `<rule code>:<element>`).
- **Tester — expected state:** Draft
- **Tester — confirm:** toast *"Version {label} saved as a draft."*; the composer stays open and the line beside the buttons changes from *"Unsaved changes."* to *"Everything is saved."*. On the **Changes** tab the row's **Adds** count reads the number of steps, forks and checks saved. The record carries who saved it and when (`savedBy`, `savedAt`) and the ticked warnings (`acknowledged`); the label, the id and who drafted it do not change. After a reload, **Compose** opens on what was saved, ticks included. A draft saved with an error is listed under **Some changes no longer obey the rules of their process** with its rule code and the step's id. The **Catalogue** tab draws none of it and still reads *"Shipped · version {version} — in force"*.
- **Tester — trigger event:** `t_flowversion_save`
- **Checks that can refuse:** `flowversion_author_named` — the seat must name a person (`FLOWVERSION_AUTHOR_UNATTRIBUTED`). Beside **Save draft** the composer shows the same line as the pop-up that creates a draft: *"This seat names nobody, so this act will be refused. Adopt a sample user on the identity panel first."*, or *"This will be recorded against {person}."*. Pressed from a seat that names nobody, the toast reads *"Refused: this seat names nobody, and this act is recorded against the person who takes it. Adopt a sample user on the identity panel, then take it again."* and nothing is written. `flowversion_content_well_formed` — checked in this order: the content must be a list of steps, forks and checks (`FLOWVERSION_CONTENT_MALFORMED`, toast *"Refused: what was saved is not a list of steps, forks and checks."*); it must stay about the process and the shipped version the change was created against (`FLOWVERSION_CONTENT_MOVED`, toast *"Refused: a change stays about the process and the shipped version it was created against."*); and `acknowledged`, when given, must be a list in which every entry names a rule and what it is about (`FLOWVERSION_ACKNOWLEDGED_MALFORMED`, toast *"Refused: an acknowledgement names a rule and what it is about."*). A payload with no `content` is refused earlier, by the dispatcher, as `MISSING_FIELDS:content`. An id that is not a version in this browser is `NOT_FOUND`. The composer cannot send any of the three malformed shapes; a hand-crafted payload can. The rules R01–R19 do **not** refuse a save: a draft is allowed to be unfinished.
- **Glossary:** `ROLE_NOT_PERMITTED` · `NOT_FOUND` · `MISSING_FIELDS` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Honesty:** the composer says at its foot *"A saved draft is kept in this browser. It changes no process: nothing a draft says is in force."* The save is the composer's only write. A new step is born with no lane, no label and no instruction, so the rules report it at once (R06, R07) until it is filled in. A draft saved with an error — a step with a label in only one language, for example — is kept and named under **Some changes no longer obey the rules of their process**: reported, not refused and not dropped. A name of a person in a label or an instruction is a finding (R07), not a refusal. The composer and the **Changes** tab check for the same names: the ones a reader sees for the sample persons, in both languages, and their ids. A draft saved with such a name shows the error in the composer and is named in that notice. The composer sends only the ticks of warnings the draft still raises, so an acknowledgement of a warning that has gone is not kept. Only the three kinds of step can be composed; scans, checks and forks arrive with FB-5. The **Catalogue** tab never draws a draft's steps; inside the composer the diagram marks each act that has something in front of it with *"{n} added"*.
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:51-63; src/services/data/mock/flowVersionTarget.ts:55-79,101-108; src/services/transitions/policies.ts:2864-2873,2949-2956; src/services/transitions/dispatcher.ts:824-837; src/services/flowBuilder/flowVersion.ts:48-68,92-137,147-149,226-240; src/services/flowBuilder/flowVersionStore.ts:277-290; src/services/flowBuilder/liveWorld.ts:28-58,76-83; src/services/flowBuilder/validateVersion.ts:33-50,90-95,133-136,188-212; src/services/query/commandHooks.ts:1402-1423; src/pages-v2/ProcessFlows.tsx:324,410-417,552; src/pages-v2/process-flows/ChangesView.tsx:215-217,279-299,339-363,387-394; src/pages-v2/process-flows/ChangeComposer.tsx:71-98,102-239,241-513; src/pages-v2/process-flows/composerModel.ts:18-45,66-142; src/pages-v2/process-flows/FlowDiagram.tsx:25-29,93-104,239-262; src/pages-v2/process-flows/flowVersionRefusal.ts:10-34; src/lib/i18n/flowBuilder.ts:70-73,126-213; src/lib/i18n/identity.ts:80-86 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Seat holds `flow:draft` or not (before the act).** Branch A — the seat holds it: **New change** stands in the header of the **Changes** tab, and each row carries **Compose** and **Start a draft from this version** under **Actions**. Branch B — it does not: the header reads **Changing a process is a Compliance action** with *Awaiting Compliance*, there is no pop-up and no **Actions** column for that seat. The tab itself, the list and the rules are readable by every seat.
- **Empty draft or a draft from a version (at creation).** Branch A — **New change**: an empty draft of the process chosen. Branch B — **Start a draft from this version**: a draft of the same process with the same elements, its own label and no acknowledged warning.
- **Seat names no person (exception).** `POLICY_REJECTED:flowversion_author_named` (`FLOWVERSION_AUTHOR_UNATTRIBUTED`) — **Create draft**, **Start a draft from this version** or **Save draft** pressed from the seat as it opens, with no sample user adopted on the identity panel. Nothing is created, nothing is saved and nothing is stamped. Adopt a sample user, then take the act again.
- **Blank or missing title (exception).** A title of spaces only is refused by `flowversion_process_writable` (`FLOWVERSION_TITLE_BLANK`). A title left empty is refused by the dispatcher as `MISSING_FIELDS:title`, before any check runs.
- **Process that cannot be changed (exception).** A process the platform does not have (`FLOWVERSION_PROCESS_UNKNOWN`) or one no command can write through (`FLOWVERSION_PROCESS_NOT_WRITABLE`). The form offers neither; a hand-crafted payload naming one is refused.
- **A change to the process that changes processes (exception).** A payload naming `flowVersion` itself is refused (`FLOWVERSION_PROCESS_SELF`): a change cannot be drafted against the process by which processes are changed. The **Process** list does not offer it; the act refuses it anyway.
- **A source that cannot be started from (exception).** A `fromVersion` this browser does not hold is refused (`FLOWVERSION_SOURCE_UNKNOWN`); one that is a change to another process is refused (`FLOWVERSION_SOURCE_OTHER_PROCESS`). The row action sends the row's own id and process, so only a hand-crafted payload meets either.
- **Payload that names who acted, or an id or label (exception).** A payload carrying a key the platform keeps for the person acting is refused by the dispatcher (`ACTOR_IN_PAYLOAD`). An id or a label in a payload is ignored: the store assigns both.
- **Save that is not a change, or moves it (exception).** Content that is not a list of steps, forks and checks is refused (`FLOWVERSION_CONTENT_MALFORMED`); content naming another process, or another shipped version, is refused (`FLOWVERSION_CONTENT_MOVED`); an `acknowledged` that is not a list of `<rule code>:<element>` is refused (`FLOWVERSION_ACKNOWLEDGED_MALFORMED`). The composer sends none of these.
- **An act a step cannot stand in front of (in the composer).** **Act** offers only an act a person takes on a screen. Every other act of the process is listed under **Acts a step cannot stand in front of** with its reason: *"a system fires it, not a person"*, *"another act fires it"*, *"it creates the document, so there is no document yet for a step to be due on"* or *"no screen offers it"*.
- **A finding in the composer (derived, not an act).** An error, a warning or information is shown as the draft is written. None of them stops **Save draft**. A warning carries the tick **Acknowledged: this is meant**; the tick is kept with the save.
- **A version that no longer obeys its rules (derived, not an act).** Each time the list is read, every stored version is checked against the rules as they are now. One that breaks a rule of kind *Error* is kept, listed, and named with the rule it breaks. A draft saved unfinished is named there too. Nothing is refused and nothing is removed.
- **A stored row that is not a version (derived, not an act).** A row whose id, label, state, title or stamps do not hold together is refused when it is read, named with its reason, and still kept in storage. Its id and its label are not given out again.
- **Proposing, approving, switching on, rolling back.** Not built. There is no act and no screen for any of them.
<!-- src: src/pages-v2/ProcessFlows.tsx:364-379; src/pages-v2/process-flows/ChangesView.tsx:218-238,279-297; src/pages-v2/process-flows/ChangeComposer.tsx:354-367,457-492; src/pages-v2/process-flows/composerModel.ts:18-45; src/services/data/mock/flowVersionTarget.ts:17-79; src/services/transitions/dispatcher.ts:824-837; src/services/flowBuilder/flowVersionStore.ts:98-113,166-204; src/services/flowBuilder/liveWorld.ts:59-83; src/services/transitions/looseEndCensus.ts:328-340; src/lib/i18n/flowBuilder.ts:142-146 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| **Kept in this browser** — *"Changes are saved in this browser and survive a reload. They are not shared with anyone and are not on a server. A change drafted by a sample person is a demonstration."* | standing notice | — | always | top of the **Changes** tab |
| *"Nothing here is in force: every process runs as it shipped."* | standing statement | — | always | under **Changes to processes** on the **Changes** tab |
| *"Shipped · version {version} — in force"* | derived at read | — | always, on every process | each flow card and the flow header on the **Catalogue** tab |
| **Saved changes could not be read** | derived at read | — | `localStorage` holds data under `paragon.flowVersions` that could not be parsed; no version is listed (not the same as having none) | notice on the **Changes** tab |
| **Some saved changes were not loaded** | derived at read | — | a stored row was refused when it was read; each is listed with its reason and is still kept | notice on the **Changes** tab |
| **Some changes no longer obey the rules of their process** | derived at read | Draft | a stored version breaks a rule of kind *Error* today — a draft saved unfinished included; each is named as *"Version {label} of {process} — {code}: {element}"* with the rule's sentence | notice on the **Changes** tab |
| Awaiting Compliance (hand-off) | derived at read | — | the seat does not hold `flow:draft` | page header, in place of **New change** |
| *"This will be recorded against {person}."* | derived at read (seat) | ∅ · Draft | the seat holds `flow:draft` and is acting as a sample user | the pop-up, above **Create draft**; the composer, beside **Save draft** |
| *"This seat names nobody, so this act will be refused. Adopt a sample user on the identity panel first."* | derived at read (seat); refusal (`flowversion_author_named`) | ∅ · Draft | the seat holds `flow:draft` and names no person | the pop-up, above **Create draft**; the composer, beside **Save draft**; on pressing either, the failure toast |
| A finding: rule code · *Error*, *Warning* or *Information* · the element it is about, with the rule's sentence | derived as the draft is written | Draft | the draft on the screen breaks a rule, or a rule has something to report; with nothing to report the line reads *"Nothing to report: the draft adds nothing yet."* | the composer, under **What the rules say about this draft** |
| **Acknowledged: this is meant** (a tick) | recorded with the save | Draft | on each finding of kind *Warning* | the composer, inside the warning |
| *"Unsaved changes."* / *"Everything is saved."* | derived at read | Draft | the draft on the screen differs, or does not differ, from what was last saved | the composer, beside **Save draft** |
| *"{n} added"* | derived at read | Draft | the draft puts something in front of that act | the diagram inside the composer; never on the **Catalogue** tab |
| **Acts a step cannot stand in front of** | derived at read | Draft | the process has an act a system or another act fires, an act that creates the document, or an act no screen offers | the composer, under the diagram |
| *"Step with no label yet"* | derived at read | Draft | a step has no label in the reader's language | the step's row in the composer |
| *"A saved draft is kept in this browser. It changes no process: nothing a draft says is in force."* | standing statement | Draft | always | foot of the composer |
| Read suspended | derived at read | — | storage was read before any process was registered, so rows are neither accepted nor refused | no surface (store read state `suspended`) |
<!-- src: src/pages-v2/process-flows/ChangesView.tsx:170-177,188-197,301-364; src/pages-v2/process-flows/ChangeComposer.tsx:270-274,354-367,387,457-510; src/pages-v2/process-flows/FlowDiagram.tsx:258-262; src/services/flowBuilder/flowVersionStore.ts:45-54,120-164; src/services/flowBuilder/liveWorld.ts:63-83; src/lib/i18n/flowBuilder.ts:15-46,142-152,190-199; src/lib/i18n/identity.ts:80-86; src/lib/i18n/roles.ts:49-50 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** none is seeded. The first version drafted in a browser is `fv-1`; its label depends on the process chosen (`<shipped version>.1`).

| Joins to | By | Note |
|---|---|---|
| The process it changes (flow registry) | `content.entity` | read from the registry; a change never writes to it, so the shipped catalogue stays what the code declares |
| The shipped version it was drafted against | `content.baseVersion` | read from the process when the draft is created, never taken from the payload; it is the first number of the label |
| The act a step stands in front of | `before`, on each step | a transition id of the process; the composer offers only an act a person takes on a screen |
| The lane that completes a step | `lane`, on each step | one buyer-side lane that holds a permission of its own |
| The warnings acknowledged | `acknowledged` | a list of `<rule code>:<element>`, replaced by each save; empty on a new draft |
| The version a draft was started from | `fromVersion`, in the create payload only | its elements are copied; the new version keeps no link to it |
| Process name on screen | the process guide's title | the **Process** list, the **Process** column and the composer's title show the guide title in the reader's language |
| Who drafted it, who last saved it | `createdBy`, `savedBy` | the seat's person at the time of the act; shown through the one person-label resolver, so a sample person carries the sample marker |
| Browser storage | `paragon.flowVersions` | `{ v, versions, counters }`; the counters keep the per-process number from ever running backwards |
| The rules a change must obey | rule codes R01–R08, R12–R19 | listed on the **Changes** tab under **Rules a change must obey** and answered live in the composer; they produce findings, not refusals |
| A link to one version | `?view=changes&version=<id>` | opens the **Changes** tab with that row marked current; a version this browser does not hold opens the **Catalogue** tab instead |
| Audit trail | `TransitionEvent` for each act | one event per create and per save, refusals included |
| Loose-end census | `flowVersion` · `Draft` | the missing way out of `Draft` is recorded there as an edge not yet authored |

Display-only: **Adds** is counted at read from the steps, forks and checks the version holds. **State** shows *Draft*. The id, the label, the sequence and the stamps are store-assigned, never fields. A step's id is given by the composer as `s_<kind>_<n>` and is not a field either.
<!-- src: src/services/flowBuilder/flowVersion.ts:48-68,92-152; src/services/flowBuilder/flowVersionStore.ts:41,207-218,245-290; src/services/data/mock/flowVersionTarget.ts:87-108; src/services/flowBuilder/validateVersion.ts:33-50; src/services/flowBuilder/liveWorld.ts:28-36; src/pages-v2/process-flows/ChangesView.tsx:54-58,243-298; src/pages-v2/process-flows/composerModel.ts:53-84; src/pages-v2/ProcessFlows.tsx:316-338; src/services/data/mock/documentIds.ts:79-80; src/guides/index.ts:73 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` (the seat, not a person), `ts`, `outcome`, one `correlationId` per command. A separate `attribution` field records who could be named. Refusals are written too, with their reason. The version itself carries `createdBy` and `createdAt`, and `savedBy` and `savedAt` once it has been saved; each save replaces the last, so only the latest is kept. There is no per-version history view; the **Changes** tab shows each version as it is now.

Worked sequence, as a tester holding Compliance would produce it in a browser with no versions yet, drafting against a process that has a screen that can show a step:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ (refused) | buyer · compliance, seat names nobody | **New change** → choose a process, write a title → **Create draft** | `t_flowversion_create`, `outcome: failed`, `POLICY_REJECTED:flowversion_author_named` |
| T+1 | ∅ → Draft | buyer · compliance, acting as a sample user | the same, after adopting a sample user on the identity panel | `t_flowversion_create` — version `fv-1`, label `<shipped version>.1` |
| T+2 | Draft → Draft | buyer · compliance, acting as a sample user | **Compose** → pick an act → **Add Approval** → choose the lane, write the label in English only and both instructions → **Save draft** | `t_flowversion_save` — saved; the **Changes** tab names `fv-1` with R07 |
| T+3 | Draft → Draft | buyer · compliance, acting as a sample user | write the label in Indonesian → **Save draft** | `t_flowversion_save` — saved; the notice is gone |
| T+4 | Draft (no change) | — | reload the page and open the **Changes** tab: the row is still listed with **Adds** *1 element*, read back from `paragon.flowVersions` and checked again | — (no event) |
| T+5 | ∅ → Draft | buyer · compliance, acting as a sample user | **Start a draft from this version** in the row of `fv-1` | `t_flowversion_create` — version `fv-2`, label `<shipped version>.2`, the same step, no acknowledged warning |

The draft stays `Draft` throughout: a save moves no state, and no step of this sequence puts anything in force.
<!-- src: src/services/transitions/events.ts:26-61,98; src/services/flowBuilder/flowVersion.ts:116-137; src/services/flowBuilder/flowVersionStore.ts:245-290; src/services/flowBuilder/liveWorld.ts:76-83 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **New change** button | the page header shows nothing on the right | the **Catalogue** tab is open | open the **Changes** tab; the button belongs to that tab |
| **Changing a process is a Compliance action** with *Awaiting Compliance* instead of the button | page header on the **Changes** tab | the seat does not hold `flow:draft` | open the avatar and select Compliance (a demo control) |
| No **Compose** link and no **Actions** column | the table on the **Changes** tab ends at **Drafted** | the seat does not hold `flow:draft` | open the avatar and select Compliance (a demo control) |
| Toast *"Refused: this seat names nobody, and this act is recorded against the person who takes it. Adopt a sample user on the identity panel, then take it again."* | `POLICY_REJECTED:flowversion_author_named` (`FLOWVERSION_AUTHOR_UNATTRIBUTED`); the line above **Create draft** or beside **Save draft** already said so | the seat names no person | adopt a sample user on the identity panel, then take the act again; nothing was created or saved |
| Toast *"Refused: a change needs a title, so it can be found again."* | `POLICY_REJECTED:flowversion_process_writable` (`FLOWVERSION_TITLE_BLANK`) | the title holds only spaces | write a title |
| A failure toast naming the title as missing | `MISSING_FIELDS:title` | the title was left empty | write a title |
| Toast *"Refused: a change cannot be drafted against the process by which processes are changed."* | `POLICY_REJECTED:flowversion_process_writable` (`FLOWVERSION_PROCESS_SELF`) | a hand-crafted payload named `flowVersion` as the process; the **Process** list does not offer it | choose another process; this one cannot be changed through a change |
| Toast *"Refused: this browser does not hold the version the draft was to start from."* | `POLICY_REJECTED:flowversion_process_writable` (`FLOWVERSION_SOURCE_UNKNOWN`) | a hand-crafted payload named a `fromVersion` this browser does not hold | start from a row of the list; the row action sends an id the browser holds |
| Toast *"Refused: a draft starts from a version of the same process."* | `POLICY_REJECTED:flowversion_process_writable` (`FLOWVERSION_SOURCE_OTHER_PROCESS`) | a hand-crafted payload named one process and a version of another | start from a version of the process wanted |
| The process wanted is not in the **Process** list | the list is shorter than the **Catalogue** tab | no command can write through that process, it has no act a person takes on a screen, or it is the process that changes processes | expected; a step there could never be met |
| The act wanted is not in **Act** and cannot be picked on the diagram | it is listed under **Acts a step cannot stand in front of** with its reason | a system or another act fires it, it creates the document, or no screen offers it | expected; put the step in front of an act a person takes on a screen |
| A step just added shows errors at once | findings R06 and R07 naming the step's id; its row reads *"Step with no label yet"* | a step is born with no lane, no label and no instruction | choose the lane and write the label and the instruction in English and in Indonesian |
| Finding *"Missing: {part}, in {language}."* | R07 in the composer, naming the step | a label, an instruction or a field's label is empty in one language | write it in that language |
| Finding *"Names a person: {part}, in {language}."* | R07 in the composer, naming the step | a label or an instruction holds the name or the id of a sample person | name the role only |
| A scan, a check or a fork cannot be added | **Add a step** offers three kinds only | not built (FB-5) | expected today |
| The draft was saved and the **Changes** tab names it under **Some changes no longer obey the rules of their process** | the row *"Version {label} of {process} — {code}: {element}"* | the rules do not refuse a save; the draft was saved with an error, such as a step with no lane (R06), words missing in one language (R07), or a process with no screen that can show a step (R05) | open **Compose**, clear the finding and save again; the draft is kept and nothing is in force either way |
| Work is gone after closing the composer | on **Compose** the draft opens as it was last saved | **Close**, Escape and the close button do not save and do not ask | compose it again and press **Save draft** before closing; the line beside the button must read *"Everything is saved."* |
| A tick on a warning is gone | the warning itself is no longer listed | the draft no longer raises that warning, so its acknowledgement is not kept | expected; if the warning returns, tick it again and save |
| A draft started from a version has no tick and a title ending *"(copy)"* | the new row and its composer | only the elements travel; the label, the author and the acknowledgements are new | expected; tick what is meant and save |
| Toast *"Refused: what was saved is not a list of steps, forks and checks."* | `POLICY_REJECTED:flowversion_content_well_formed` (`FLOWVERSION_CONTENT_MALFORMED`) | a hand-crafted payload; the composer cannot send it | send the whole content in its shape, or save from the composer |
| Toast *"Refused: a change stays about the process and the shipped version it was created against."* | `POLICY_REJECTED:flowversion_content_well_formed` (`FLOWVERSION_CONTENT_MOVED`) | a hand-crafted payload named another process or another shipped version | draft a new change against that process instead |
| Toast *"Refused: an acknowledgement names a rule and what it is about."* | `POLICY_REJECTED:flowversion_content_well_formed` (`FLOWVERSION_ACKNOWLEDGED_MALFORMED`) | a hand-crafted `acknowledged` that is not a list of `<rule code>:<element>` | tick the warning in the composer instead |
| No way to propose, approve or switch on a change | no such button anywhere | not built (FB-3 and later); `Draft` has no way out | expected today; every process runs as it shipped |
| A process still behaves as before after a draft was saved | the **Catalogue** tab reads *"Shipped · version {version} — in force"* and its diagram shows no added step | nothing a version says is in force | expected today |
| The list is empty in another browser or on another machine | *"No change has been drafted yet."* | versions live in the browser that drafted them; nothing is seeded and nothing is shared | draft it again in that browser |
| The list is empty after clearing site data | *"No change has been drafted yet."* | clearing site data removes `paragon.flowVersions` | expected; the versions are gone |
| A draft or a save is gone after a reload, with no notice | it was listed until the reload | the browser did not allow the write to storage (storage disabled or full), so it lived for that page only | allow site storage for the portal, then draft or save it again |
| Notice **Saved changes could not be read** | **Changes** tab | the data under `paragon.flowVersions` could not be parsed | drafting a change replaces what could not be read |
| Notice **Some saved changes were not loaded** | **Changes** tab, rows listed with reasons | hand-edited storage: a row is not a version, or its id, label, state, title or stamps do not hold together | fix the row in storage or leave it; it is kept, and its id and label are not reused |
| A link to a version opens the **Catalogue** tab | the address carries `?view=changes&version=<id>` | this browser does not hold that version | open the link in the browser that drafted it |
<!-- src: src/pages-v2/ProcessFlows.tsx:316-338,364-379; src/pages-v2/process-flows/ChangesView.tsx:118-152,218-238,279-297,309-383; src/pages-v2/process-flows/ChangeComposer.tsx:270-303,354-367,428-510; src/pages-v2/process-flows/composerModel.ts:18-45,66-84; src/services/data/mock/flowVersionTarget.ts:17-79; src/services/flowBuilder/flowVersionStore.ts:120-145,207-218; src/services/flowBuilder/validateVersion.ts:183-212; src/services/modules/registry.ts:125-136; src/lib/i18n/flowBuilder.ts:20-22,39-46,60-73,132-136,142-150,190-199,208-209 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Draft | — | — | no fixture — nothing is seeded and the store opens empty. Create one: take Compliance, adopt a sample user, then **Changes** → **New change** → **Create draft**. Give it content: **Compose** → pick an act → **Add a step** → fill the form → **Save draft**. The first version in a browser is `fv-1` with label `<shipped version>.1`; it lives in that browser's `localStorage` under `paragon.flowVersions` |
<!-- src: src/services/data/mock/documentIds.ts:79-80; src/services/flowBuilder/flowVersionStore.ts:41,245-290 -->
