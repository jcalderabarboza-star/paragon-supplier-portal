---
entity: moduleActivation
locale: en
title: Module activation
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_module_set
---

<!-- section:summary -->
## 1 · What this process is

Which parts of the platform are switched on — and a record of who switched each one, when, and why. A **module** is the smallest set of pages, processes and reads a person would switch on together (Supplier network, Purchase orders, Goods receipt & inspection, Invoices & payment, and so on). Some modules carry **parts** that can be switched separately (for example *Quality hold* inside Goods receipt & inspection), and the **supplier side** as a whole can be switched off. Switching is kept as an append-only **ledger of acts**, never as a value somebody edits: what is in force is derived at read from the latest act per module or side, and where no act exists the registry default applies — every module in phase *Active* and on, every part on, both sides on.

One buyer lane touches it. **Compliance** holds the only atom, `module:set`, beside the platform's other governance atoms, for the reason the tree gives: the same party cannot both set the bar and be governed by it — switching a module decides what every lane may do. The **Platform** module (PLT: dashboards, roles, process flows, the glossary and the two module screens themselves) is **always on** and cannot be switched, and the **buyer side** cannot be switched off while PLT is on, because the admin page lives there. Every seat can read the roadmap board; only a seat holding `module:set` with an identified person can switch anything.

Switching a module **off** never hides a document. Its pages stay readable but become **read-only**: a banner names the module and who can switch it back on, every guarded action on the page is replaced by a notice, its menu entries leave the navigation, and the dispatcher refuses every action in that module, part or side for every seat, whatever its role (`MODULE_INACTIVE`). Switching **on** respects dependencies: a module cannot go on while a module it *needs* is off, and cannot go off while a module that *needs* it is on. A module that only *reads* another degrades honestly instead of blocking.

Honest markers. The ledger opens **empty** by ruling — a seeded row would claim somebody switched something who never did — so today every module reads its registry default and is labelled *Never switched — registry default*. The ledger lives in the in-memory mock behind the service, not in the browser: a reload returns the registry defaults. An act must be **attributed to a person**: an unattributed seat is refused, so in the demo you adopt a SAMPLE user first; on a production deployment (no environment badge) a sample person is refused too, and until sign-in exists nobody else can act there. Four-eyes approval waits for sign-in.
<!-- src: src/lib/i18n/processFlowPurpose.ts:254-257; src/services/modules/registry.ts:1-40,50-74,122-133; src/services/modules/activation.ts:78-112; src/services/data/mock/stores/moduleActivationStore.ts:1-48; src/services/transitions/flows/moduleActivation.flow.ts:1-34; src/services/transitions/businessRoles.ts:290,343-349; src/services/data/mock/moduleActivationTarget.ts:85-95,163-176; src/services/modules/deployment.ts:1-52; src/context/ModuleActivationContext.tsx:60-80; src/lib/i18n/modules.ts:113-115,132,140 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 0 | ∅ → Governed | a module or side exists by being in the registry (no creation verb; an unknown code is `NOT_FOUND`) | — | — |
| 1 | Governed → same state | records a fact (state-preserving): one switching act is appended to the ledger | buyer · compliance | `t_module_set` |

The step repeats every time a module, a part or the supplier side is switched; the admin page sends one act per changed row, so one **Save changes** can produce several in a row.

**Forks**

No state has two exits. The decisions that matter sit in the payload and the hooks:

- **On or off (at Governed):** `t_module_set` with an *on* phase (Active, Activating) and `enabled: true` — compliance — when the module should be usable; every module it *needs* must already be on. `t_module_set` with an *off* phase (Planned, Backlog) and `enabled: false` — compliance — when it should become read-only; every module that *needs* it must already be off.
- **Module, part or side (at Governed):** the entity id is a module code (with phase, on/off and optionally parts) or the supplier side (on/off only, no phase, no parts).
<!-- src: src/services/transitions/flows/moduleActivation.flow.ts:39-78; src/services/modules/registry.ts:59-74; src/services/data/mock/moduleActivationTarget.ts:51-71; src/pages-v2/modules/adminModel.ts:95-134 -->

<!-- section:steps -->
## 3 · Step by step

### t_module_set — Switch a module on or off <!-- transition:t_module_set -->

- **Step kind:** records a fact (state-preserving) · operator action from the admin page
- **Role:** buyer · compliance (atom `module:set`)
- **From → to:** Governed → same state
- **Operator — where:** `/buyer/platform/modules` → **Manage modules** (shown only to a seat holding `module:set`; any other seat sees *Awaiting Compliance* in its place) → `/buyer/platform/modules/admin` (**Module activation**) → change a row's **Phase**, its **On / off** switch, or a switch under **Parts**, or the **Supplier side** switch → write **Reason for these changes** (and, optionally, a reason for one module) → **Save changes**.
- **Operator — do:** Decide which parts of the platform people may act in. Choosing a phase sets on/off with it (Active and Activating are on; Planned and Backlog are off), and flipping the switch moves the phase to the nearest one of the right kind, so the form never holds a contradiction. Save sends only the rows that differ from what is in force, switch-offs first (the most dependent first) and then switch-ons, so a chain switched together is not refused by its own first row. **Reset to registry defaults** only refills the form; nothing is recorded until **Save changes**.
- **Operator — fill:** **Reason for these changes** (`reason`, required — blank or spaces only is refused) and, per changed row, the new phase and on/off (`phase`, `enabled`) and the parts (`parts`, optional — omitted, the module keeps the parts it has). For the supplier side only `enabled`. Who switched comes from the session and when from the clock at the act; neither is a field, and a payload that tries to name an actor is refused.
- **Tester — expected state:** Governed (unchanged)
- **Tester — confirm:** under the changed row, *Saved.*; the row's line reads *Last updated by {person} at {time}*, where a sample person carries the *(SAMPLE)* marker; on `/buyer/platform/modules` the card has moved to the column of its new phase, and its drawer reads *In force: {phase} · {On/Off}* with the act, its reason and its author under **Activation history**. For a module switched **off**: its menu entries are gone, its pages show *{module} ({code}) is switched off* with its phase and *…until Compliance switches it on*, and any action in it is refused with `MODULE_INACTIVE` naming the switch (`SHP`, `GRC.qualityHold`, `side:supplier`). For **Activating**: its pages show *{module} ({code}) is activating* with a link to its guide.
- **Tester — trigger event:** `t_module_set`
- **Checks that can refuse:** `module_known` — the subject must be a module or a side; PLT is always on and cannot be switched; the buyer side cannot be switched while PLT is on; `enabled` must be true or false. `module_phase_consistent` — a module must carry one of the four phases and it must agree with `enabled`; a side must carry no phase. `module_parts_known` — every part named must belong to this module and be true or false; a side has no parts. `module_reason_authored` — the reason must be text with substance. `module_actually_changes` — an act that changes nothing (same phase, same on/off, same parts) is refused rather than recorded. `module_no_active_hard_dependants` — switching off is refused while a module that *needs* it is on, and the refusal names them. `module_dependencies_enabled` — switching on is refused while a module it *needs* is off, named. `module_set_attributed` — the session must name a person; an unattributed seat is told to adopt one. `module_set_not_sample_in_prod` — on a production deployment a sample person is refused. Before any of these: a supplier seat is refused at scope, an unknown code is `NOT_FOUND`, a seat without `module:set` gets `ROLE_NOT_PERMITTED`, a payload carrying an actor key gets `ACTOR_IN_PAYLOAD`, and a missing `enabled` or `reason` gets `MISSING_FIELDS`.
- **Glossary:** `MODULE_INACTIVE`, `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `ACTOR_IN_PAYLOAD`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** the page is read-only for most seats by design, in three arms checked in the dispatcher's order: a seat without `module:set` (*Switching modules is not your role.* with *Awaiting Compliance*); an unattributed seat (*Nobody is signed in, so nothing here can be switched…*), which is how the default buyer seat opens even though it holds compliance; and a sample person on a production deployment (*This is a production deployment: a sample person cannot switch modules here…*). Controls are disabled in every arm, never removed. A refusal on one row leaves the others applied. The ledger is in-memory: a reload returns every module to its registry default.
<!-- src: src/services/transitions/flows/moduleActivation.flow.ts:47-76; src/services/data/mock/moduleActivationTarget.ts:44-71,85-176; src/services/transitions/policyHooks.ts:747-769; src/services/transitions/dispatcher.ts:286-290,615-637; src/services/transitions/businessRoles.ts:343-349,487-494,748-758; src/pages-v2/ModulesBoard.tsx:75-103; src/pages-v2/ModulesAdmin.tsx:105-198,201-223,236-360; src/pages-v2/modules/adminModel.ts:66-134; src/services/query/commandHooks.ts:2078-2143; src/pages-v2/modules/ModuleDetailDrawer.tsx:52-57,131-156; src/pages-v2/modules/moduleLedger.ts:21-28; src/components/ui-v2/ModuleOffNotice.tsx:35-76; src/lib/i18n/modules.ts:74-80,95,102,108,119-154; src/lib/i18n/roles.ts:29,48 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Switch on or switch off (at Governed).** Branch A — `t_module_set` with Active or Activating — **When:** the module should be usable; Activating additionally puts a banner on its pages (*being configured, data may be sample*). Branch B — `t_module_set` with Planned or Backlog — **When:** the module should be read-only; Planned means scheduled for a later wave, Backlog not scheduled.
- **A part only (at Governed).** **When:** one piece of a module should stop while the rest stays on — e.g. *Quality hold* or *Inspection wizard* in Goods receipt & inspection, *Disputes* or *Payment release* in Invoices & payment. The module stays in its phase; only the actions (and any routes) that part governs are refused. A part's switch is disabled while its module is off.
- **The supplier side (at Governed).** **When:** no supplier contact should act at all; every action a supplier seat attempts is refused with `MODULE_INACTIVE` naming `side:supplier`, and pages under `/supplier/…` render read-only. The buyer side is never offered.
- **Blocked switch-off (exception).** **When:** a module that *needs* this one is still on (Purchase orders while Shipments & ASN or Invoices & payment are on). The admin row warns *Cannot go off while {codes} stay on* before Save; if saved anyway, the row is refused and names the dependants. Resolve by switching the dependants off in the same save — the page orders them first.
- **Blocked switch-on (exception).** **When:** a module it *needs* is off (Invoices & payment while Purchase orders or Goods receipt & inspection are off). Refused, naming the missing modules. Switch those on in the same save — the page sends switch-ons least-dependent first.
- **Nothing changed (exception).** **When:** the act would leave phase, on/off and parts as they are. Refused rather than recorded; the page never sends such a row itself.
- **Who may act (exception).** **When:** no person is named in the session, or a sample person on production — refused by name; adopt a sample user in the identity panel (**Acting as**) on a dev or preview deployment.
<!-- src: src/services/modules/registry.ts:134-269; src/services/modules/activation.ts:123-183; src/services/data/mock/moduleActivationTarget.ts:132-176; src/pages-v2/modules/adminModel.ts:95-149; src/pages-v2/ModulesAdmin.tsx:267-271,310-315; src/lib/i18n/modules.ts:87-90,143-144; src/lib/i18n/identity.ts:53 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| *{module} ({code}) is switched off* · *Phase: {phase}* · *…until Compliance switches it on* | derived at read | Governed (module, part or side off) | the page's module, part or side is off | banner at the top of every page of that module (`ModuleOffNotice`) |
| *Switched off — {name}* | derived at read | Governed (off) | an action's module or part is off | in the action's own slot, instead of the button |
| Menu entry hidden | derived at read | Governed (off) | a route's module, part or side is off | the sidebar; the route still opens read-only if reached |
| *{module} ({code}) is activating* · *Read its guide* | derived at read | Governed (phase Activating) | the module is on in phase Activating | banner on its pages |
| *Never switched — registry default* / *Never switched — the registry default is in force.* | derived at read | Governed (ledger has no act for it) | every module today | admin row; drawer **Activation history** |
| *Always on — it cannot be switched.* | registry | PLT; the buyer side | always | admin row; buyer-side card |
| *Cannot go off while {codes} stay on — switch them off first.* | derived at read (form) | Governed | the form sets a module off while a module that needs it stays on | under the admin row, before Save |
| *Awaiting Compliance* / *Switching modules is not your role.* | derived at read (seat vs. atom) | — | the seat does not hold `module:set` | board header; admin gate |
| *Nobody is signed in…* | derived at read (session) | — | the seat names no person | admin gate |
| *This is a production deployment…* | derived at read (deployment badge) | — | production deployment and a sample person | admin gate |
| *(SAMPLE)* after a person | derived at read | Governed | the act was recorded by a sample person | *Last updated by …*; drawer history |
| *…not shown to this seat.* | derived at read | — | a supplier seat opens the drawer (the ledger is a buyer governance record) | drawer **Activation history** |
<!-- src: src/components/ui-v2/ModuleOffNotice.tsx:43-76; src/components/layout-v2/AppShellV2.tsx:18-34; src/components/layout-v2/SidebarV2.tsx:191-197; src/context/ModuleActivationContext.tsx:65-80; src/pages-v2/ModulesAdmin.tsx:155-198,218,253,267-271; src/pages-v2/ModulesBoard.tsx:89-102; src/pages-v2/modules/ModuleDetailDrawer.tsx:131-137; src/services/data/mock/MockModuleService.ts:14-20; src/lib/i18n/modules.ts:74-80,113-121,129-140,143; src/lib/i18n/identity.ts:47 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `GRC` — Goods receipt & inspection. No act exists for it today; it reads its registry default (Active, on, both parts on).

| Joins to | By | Note |
|---|---|---|
| Pages | `routes` — `/buyer/goods-receipt` | Read-only while GRC is off; never hidden as a document. |
| Processes | `flows` — goods receipt, goods-receipt line, enforcement | Every action of these flows is refused with `MODULE_INACTIVE` while GRC is off. |
| Parts | `parts` — *Inspection wizard*, *Quality hold* | Each governs a named set of goods-receipt actions and can be switched alone. Halal and BPOM checks are deliberately not parts: switching a compliance check off stays the enforcement ledger's decision. |
| Modules it needs | `dependsOn` — Shipments & ASN (needs it), Compliance & documents (reads it) | GRC cannot go on while Shipments & ASN is off. |
| Modules that need it | derived — Invoices & payment needs it; Intelligence reads it | GRC cannot go off while Invoices & payment is on. |
| Ledger act | `code`, `phase`, `enabled`, `parts`, `reason`, `setBy`, `setAt`, `seq` | `parts` records every part, not a diff; `setBy` is the session's attribution (a person id, rendered through the label resolver, never a stored name), `setAt` the clock at the act, `seq` the store's arrival order — the later act wins. Append-only; no update. |
| Tenant / owner | none (`readScopeOwner` is null) | A buyer governance record: a supplier scope is refused at scope, identically for a real code and an invented one. What is on is readable by every seat; who switched it, only by buyer seats. |
<!-- src: src/services/modules/registry.ts:76-97,240-250,256,267,345-358; src/services/modules/activation.ts:45-58; src/services/data/mock/moduleActivationTarget.ts:51-71; src/services/data/mock/MockModuleService.ts:6-20; src/pages-v2/modules/moduleLedger.ts:25-28; src/lib/i18n/modules.ts:23-24,57-58,110-111 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = `t_module_set`, `actor` = `buyer:all`, `ts`, `outcome` (with `reason` when refused), its own `correlationId`, the session's person as `attribution`, and `subject` = `{ entity: 'moduleActivation', entityId: <code or side>, from: 'Governed', to: 'Governed' }`. One **Save changes** sends its rows one after another under one anchor: the first act's `correlationId` is passed as the `causationId` of every later act in the same save, so the save reads as one group while each act stays individually traceable. The ledger itself is the module's own history, oldest first, shown newest first in the drawer.

Worked sequence for `GRC`, as a tester produces it on a dev or preview deployment:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | — | the tester adopts a sample user holding compliance (**Acting as**) | no act; the admin page becomes editable | — |
| T+1 | Governed → Governed | buyer · compliance, the sample person | GRC row: *Quality hold* switched off, reason given, **Save changes** | `t_module_set` |
| T+2 | Governed → Governed (refused) | buyer · compliance | GRC set to Planned / Off while Invoices & payment stays on — `outcome: failed`, `POLICY_REJECTED:module_no_active_hard_dependants:…` | `t_module_set` |
| T+3 | Governed → Governed | buyer · compliance | one save: INV and GRC set to Planned / Off; INV is sent first; the GRC act carries the INV act's `correlationId` as `causationId` | `t_module_set` ×2 |
| T+4 | Governed → Governed | buyer · compliance | GRC set back to Active / On (Shipments & ASN is on, so it is admitted; INV stays off) | `t_module_set` |

After T+3, `/buyer/goods-receipt` shows the switched-off banner, its menu entry is gone, and any goods-receipt action returns `MODULE_INACTIVE:GRC`. After T+4 the page is usable again; invoices stay read-only until INV is switched on.
<!-- src: src/services/transitions/events.ts:26-60,85-123; src/services/query/commandHooks.ts:2078-2143; src/pages-v2/modules/adminModel.ts:121-134; src/services/data/mock/moduleActivationTarget.ts:147-161; src/services/modules/activation.ts:136-153; src/pages-v2/modules/moduleLedger.ts:21-23 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| Every control on the admin page is disabled | the gate line says *Nobody is signed in…* | the seat names no person (`NO_PERSON_IN_SESSION`) | adopt a sample user under **Acting as** in the identity panel |
| Board shows *Awaiting Compliance* instead of **Manage modules** | header of `/buyer/platform/modules` | the seat does not hold `module:set` | act from a seat holding the compliance lane |
| Controls disabled with *This is a production deployment…* | the gate line; no environment badge in the top bar | `module_set_not_sample_in_prod` — sample people cannot switch on production | switch on a dev or preview deployment; production waits for sign-in |
| A row comes back *Not switched off: {codes} still depend on it.* | `POLICY_REJECTED:module_no_active_hard_dependants` | a module that needs this one is still on | switch those off first, or in the same save |
| A row is refused naming modules that are off | `POLICY_REJECTED:module_dependencies_enabled` | a module it needs is off | switch those on first, or in the same save |
| A hand-crafted dispatch is refused *…is already {phase}, {on/off}, with these parts* | `POLICY_REJECTED:module_actually_changes` | the act changes nothing | nothing to do; the page never sends an unchanged row |
| Refused: *PLT is always on…* or *the buyer side cannot be switched…* | `POLICY_REJECTED:module_known` | an attempt on PLT or the buyer side | not switchable by design |
| Refused: *reason is blank…* | `POLICY_REJECTED:module_reason_authored` | the reason was empty or spaces | write why the platform changes |
| Refused: phase disagrees with on/off, or *a side has no phase* | `POLICY_REJECTED:module_phase_consistent` | a hand-crafted payload | Active/Activating with on, Planned/Backlog with off; no phase for a side |
| Refused: *… is not a part of …* | `POLICY_REJECTED:module_parts_known` | a part id from another module, or parts sent for a side | use the module's own parts |
| Any action elsewhere refused *This part of the platform is switched off…* | `MODULE_INACTIVE:<switch>` | the module, part or side named is off | a compliance seat switches it on on the admin page |
| Thrown `SCOPE_DENIED` | `DataError` code | a supplier scope | buyer side only |
| Thrown `NOT_FOUND` | `DataError` code | the entity id is not a module code or a side | use a registry code |
| Everything is back to defaults | every row reads *Never switched — registry default* | the page was reloaded; the ledger is in memory | expected in the demo |
<!-- src: src/services/data/mock/moduleActivationTarget.ts:85-176; src/services/transitions/dispatcher.ts:600-637,798; src/services/transitions/refusals.ts:66-78; src/services/modules/deployment.ts:24-52; src/pages-v2/ModulesAdmin.tsx:119-128,182-198; src/pages-v2/ModulesBoard.tsx:89-102; src/lib/glossary/refusals.glossary.ts:48-51; src/lib/i18n/modules.ts:129-131,140,144; src/services/data/mock/stores/moduleActivationStore.ts:4-13 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Governed | `PLT`, `SUP`, `CMP`, `PSL`, `MAT`, `REQ`, `PLN`, `SDC`, `COM`, `SRC`, `CTR`, `ORD`, `SHP`, `GRC`, `INV`, `INT` | — | every registry module code answers Governed; the two sides (side:buyer, side:supplier) answer Governed too. The ledger opens empty, so every module reads its registry default — Active, On, every part on — and both sides are on. PLT is always on and cannot be switched; the buyer side cannot be switched while PLT is on. INT has no module that needs it, so it is the simplest to switch off and back on. |
<!-- src: src/services/modules/registry.ts:50-54,70; src/services/data/mock/moduleActivationTarget.ts:39,52; src/services/data/mock/stores/moduleActivationStore.ts:11-20; src/services/modules/activation.ts:78-87 -->
