# DESIGN 6 · The Flow Builder — render the real machine, preview who acts, compose a draft, and promote it as reviewed code

**Seat 3, consultant, Ops Project #11 · 2026-09-28 · SPECIFICATION FOR THE SE TEAM (SE-16) · READ-ONLY session (nothing written in the repo).**
**Pinned tree:** `main` @ `de101c67799f4f338796768981fed31fc9f0a229` (PR #377, *"Every enabled control works, says honestly that it cannot, or is gone"*, 2026-09-28 10:38 +0700), read from this reviewer's own `git archive` export. Every `file:line`, every count and every derived table below is against that object. Designs 3 and 5 are pinned one commit earlier (`81c98403`); where a fact differs between the two trees this document says so at the site.
**Who builds it:** the **SE Team, as SE-16, after handover on 28 October 2026**, from this text alone. It is written to be implemented without asking us: every shape is given in TypeScript, every file path is named, every refusal string is quoted, every test is named by its `it(...)` title, and every acceptance criterion is a command whose output decides it.
**Read first (the three inputs this stands on):** `R3_STATE_MACHINE.md` §4–§5 (the measured foundation — what the registry exposes, what is configurable, what the guarantees are, and the promotion path priced), `DESIGN_3_STATE_MACHINE.md` (the machine's hand-offs and the verbs that change the catalogue under the builder's feet), `DESIGN_5_MODULE_ACTIVATION_AND_GUIDES.md` **Part B** (the process-guide registry the builder's page shares, and whose guide a draft must carry before approval).
**Standing rulings applied:** SAP owns documents and numbers (C11 V15); law 0.5 — no clock-fired transition and no stored clock state; roles, never personal names; a register entry is not a deliverable; derive a population, never restate a cardinality in prose; probe every guard both ways.

---

## 0 · The one-page version

1. **Four capabilities, in the order they must be built, and the fourth is the only one that changes the running platform.** (i) **Render** every lifecycle from the real registry with lanes and state names in both locales; (ii) **Preview** who acts next on a given state, by lane and by what kind of act it is; (iii) **Compose** a DRAFT from real building blocks — states, atoms, hooks, owners, cascade links — validate it, and export it; (iv) **Promote** an approved draft as **generated, reviewed code** that lands through the normal gates. (i) and (ii) touch nothing. (iii) writes only to a draft store. (iv) is a pull request.
2. **A draft NEVER touches the live process, and the mechanism is structural rather than procedural.** `FlowRegistry.register` is the only door into the live catalogue and it is a side effect a draft must not have (`registry.ts` — `register()` throws on a duplicate entity or transition id). The builder therefore never calls it: validation runs over the **array** `[...getKnownFlows(), draft]` through pure functions, and promotion happens by emitting a `*.flow.ts` module into a branch. **There is no code path from the composer to the registry**, and §4.6 makes that a test rather than a sentence.
3. **The registry needs five additions and exactly one of them is load-bearing: a STATE-LABEL REGISTRY keyed by `(entity, state)`, never by state name.** Derived at `de101c67`: the 25 registered flows declare **103 `(entity, state)` pairs over only 64 distinct NAMES**; **16 names are shared by more than one flow** and `Rejected` is declared by **eight** (`goodsReceipt`, `goodsReceiptLine`, `quotation`, `purchaseRequisition`, `supplierDocument`, `supplierApplication`, `materialRequest`, `psl`). A label map keyed on the bare name would give a rejected **quotation** and a rejected **supplier application** the same sentence in both locales. §2.1 carries the derivation and the gate.
4. **The validation library is the risk, and it is a lifting job rather than a writing job.** Two of the checks a draft needs are already pure functions of their argument (`validateFlow`, `analyzeFlow`); **four exist only as vitest assertions over the seeded singleton** and must be lifted into functions taking `(flows)` without weakening them; **one does not exist at all** — every state can reach a declared terminal. §4 gives the API, the lifting rule (the test calls the library; the library is the one expression), and the probe obligations.
5. **Terminal-reachability, measured before it is specified, because a new check whose live result nobody has computed is a check nobody can price.** Run against the real registry today it names **7 states in 2 flows**: `advanceShipNotice`'s five, *by construction* — that flow declares `terminals: []` and the schema says an empty array is a legal, meaningful answer — and `invoiceMatch`'s `Qty Mismatch` and `Price Variance`. So the check must ship as a **declared-exception WARNING, not a refusal** (§4.2): shipped as a refusal it would refuse two flows the tree deliberately holds, on day one.
6. **Approval is a fifth single-state ledger machine on `t_enforcement_set`'s shape** — `processDraft`, with `t_processdraft_propose` / `_approve` / `_reject`, attribution from the session, four-eyes on `PSL_DECIDER_NOT_PROPOSER`'s template, and a SAMPLE lock that refuses a fixture person **by name**. ⚠️ **It is the first approval in this tree that is UNUSABLE UNTIL AN IdP LANDS**, because two `UNATTRIBUTED` actors satisfy any four-eyes comparison and `UNATTRIBUTED: NO_PERSON_IN_SESSION` is what every seat is. That is not a defect of the design; it is the wall `overrideCompletes` already hit. **The surface says so above the button, and the verb refuses rather than pretending.** §6.
7. **Promotion is option (i) — generated, reviewed code — and the reason is that a runtime catalogue stops at the hook boundary anyway.** A policy hook is a closure bound by name (46 `bindPolicyHook` sites; 60 registered names, all 60 referenced by a transition — derived), a cascade resolver is code in the command service, a `CommandTarget` is code. Moving an edge list into a table makes none of those data. The generator emits a module and the four gates decide. The precedent for a generated artefact that a pin keeps honest is already in the tree: `docs/contracts/C9-required-fields.md`, rendered by `deriveC9FieldList.ts`, regenerated with `npx vitest run -u`. §7.
8. **Documents in flight finish on their original version, and the price is stated rather than waved at**: `readFlowVersion` on `CommandTarget` (19 implementations), a registry that holds N versions per entity instead of refusing the second, legality / `statePreserving` / `settlesTo` / cascade lookups keyed on the document's version, the surfaces reading the document's version rather than the default, and `TransitionEvent.flowVersion` landed **while the sink is still in-memory** (C10 §6.4: no retrofit). §8 also names the condition under which the whole of it is skipped.
9. **What stays code is a rule, not a backlog.** A **threshold** can become data; a **check** cannot. `enforcement` mode, the PSL cap and the drawdown tolerance are already governed data with verbs; an approval band is an authored string that nothing computes. The builder may edit a governed SETTING through its existing verb and may never invent a new check — because a hook has no parameter schema, and giving one to 60 hooks is a different project with a different risk. §9 draws the line and says what it would take to move it.
10. **Nine SE batches, an acceptance test per batch, and a hard sequencing constraint**: the validation library (S-3) precedes the composer, and the approval machine (S-5) precedes the generator (S-6), because a generator with no approval in front of it is a promotion path with no gate. §11.

---

## 1 · What the Flow Builder is, and what it is not

### 1.1 The four capabilities, as the ruling states them

| # | Capability | Touches | Built in |
|---|---|---|---|
| **(i)** | **Render** every lifecycle from the real registry, with roles and state names in EN/ID | nothing — a read | S-1, S-2 |
| **(ii)** | **Preview** who acts next, by lane and by how the act fires | nothing — a read | S-2 |
| **(iii)** | **Compose** a DRAFT from real building blocks and export it | the draft store only | S-3, S-4 |
| **(iv)** | **Promote** — an approved draft becomes generated, reviewed code replacing the default through the normal gates | a pull request | S-5, S-6, S-7 |

### 1.2 The five things it is not, each stated because each is a shape somebody will otherwise build

- **It is not a runtime process engine.** The dispatcher resolves every verb through the singleton registry (`dispatcher.ts` imports `getTransition` from `./registry`; `DispatcherDeps` injects roles, targets, hooks, sink, clock, cascade and settle — **not the registry**). There is exactly one catalogue per process, and this design does not change that. R3 §5.a priced the alternative at 3–5 batches plus a backend plus re-expressing every global gate as a runtime check, and rejected it.
- **It is not a policy editor.** A draft may REFERENCE a registered hook by name and may never author a check. §9.
- **It is not `LifecycleWalk` with buttons.** The walk is a reading aid over a diagram and dispatches nothing, and its own header says why that distinction is not cosmetic (`LifecycleWalk.tsx` — *"a reader believing they had moved a purchase order by reading about one"* is the worst class of dishonesty the page could commit). The preview (ii) inherits that rule verbatim: **it computes availability and renders it; it never dispatches.**
- **It is not a layout editor inside the schema.** Node coordinates never enter `FlowDefinition`. §2.5.
- **It is not a second authorisation path.** A lane preview shows what a lane COULD fire; the dispatcher remains the only thing that decides whether it may. A surface that trusted the preview would be the defect `PslGateNotice`'s precedent already closed — *an authorisation decision taken inside a hook is invisible to `useVerbAvailability`*, and the inverse is equally true.

### 1.3 The guarantee wall — the properties a builder must not undermine

R3 §4.4 derived these and they are restated here as the builder's acceptance surface, because a reader of this document must not have to hold two files open. The column that matters is the last one.

| Guarantee | Enforcer | Pure function of its argument? | What the builder must therefore do |
|---|---|---|---|
| Structural validity (declared states, id format, role format, `clock` forbidden, `surfaceable` complete with owner both directions, `statePreserving` shape, `sapBoundary ⇔ settlesTo`, hooks registered, positive versions, declared terminal has no exit) | `validateFlow` / `assertValidFlow` (`validate.ts`) | **yes** | call it on the draft |
| Unreachable state · exit-less non-terminal · dead transition · initial integrity · unauthored cascade | `analyzeFlow(flow, cascadeTargets)` (`flowGraph.ts`) | **yes** (cascade targets overridable) | call it with `authoredCascadeTargets({...CASCADES, ...draft.cascades})` |
| Global uniqueness of entity key and transition id | `FlowRegistry.register` throws | **no — registering is the side effect a draft must not have** | a pure `collides(draft, known)` (§4.3) |
| Every derived loose end is censused and every census row is live (bilateral) | `flowGraph.test.ts` over `getKnownFlows()` vs `LOOSE_END_CENSUS` | **no** (test) | lift to `censusDelta(flows, census)` |
| Every atom a bundle names is required by a transition; every atom is held by a lane or the automation grant; automation covers every cascade target; zero-atom bundles are exactly the anchors | `businessRoles.test.ts` | **no** (test) | lift to `atomCoverage(flows, roles, automation)` |
| Dispatched ⇒ surfaceable; every user verb maps to one persona | `surfaceable.test.ts` | **no** (test) | lift to `surfaceInvariants(flows, personaRoles)` |
| Every transition and every flow has a purpose annotation in both locales | `annotations.test.ts` | **no** (test) | **promotion-time gate only** (§4.2, the authoring rule) |
| External-fact owner closed set = union | `externalFactOwner.test.ts` | parameter + global | covered by `validateFlow` for the draft's own rows |
| Catalogue counts pinned to the C1 contract | `c1MethodSurface.contract.test.ts` | **no** (global) | the generator re-harvests C1 (§7.4) |
| No clock-projected state in any table (V9) | `projectionGate.test.ts` | source scan | the composer refuses a clock-shaped state name at entry (§5.2) |
| Refusal precedence order (V6) | dispatcher construction + `COMMAND_REFUSALS` pin | code | untouched |
| The floor (`scripts/floor.json`) | `npm run gates` | — | every batch bumps it when the note asks |

**The two sentences that order all of §4:** *(a)* validity and graph analysis are checkable on a draft **today**, because both are pure functions of their argument; *(b)* every other guarantee is a vitest over the seeded singleton, so a draft can be checked against it **only** by lifting the assertion into a function over `[...known, draft]`. **The lifting is the risk of this whole design**, and §4.4 is the rule that keeps it from becoming a weakening.

---

## 2 · Registry additions — the data the builder needs and the tree does not have

Five additions. One is load-bearing, three are ergonomics with a bilateral gate each, and one is a deliberate refusal to add anything.

### 2.1 The state-label registry — **keyed by `(entity, state)`, and the key is the whole finding**

**Why it is needed at all.** States render as the registry spells them, through `<Data>`; there is no state-label registry anywhere in the tree and only per-page status maps exist (`lib/i18n/materialRequests.ts` is the model — *"Status labels. Deliberately NOT the raw machine states"*, and its `materialRequests.status.Approved` reads **"Accepted for creation"** precisely because the raw state would read as *created*). A builder that renders a machine to a procurement reader in Indonesian cannot render raw English state ids, and Design 5's guides deliberately did **not** add this — Part B §B.2 says so and hands it here.

**Why the key is `(entity, state)`.** Derived at `de101c67` over `getKnownFlows()`:

| Derived | Value |
|---|---|
| `(entity, state)` pairs | **103** |
| distinct state NAMES | **64** |
| names declared by more than one flow | **16** |

| State name | Flows declaring it |
|---|---|
| `Rejected` | **8** — goodsReceipt · goodsReceiptLine · quotation · purchaseRequisition · supplierDocument · supplierApplication · materialRequest · psl |
| `Draft` | **7** — advanceShipNotice · invoice · rfq · contract · purchaseRequisition · requirementResponse · deliveryRelease |
| `Submitted` | **6** — advanceShipNotice · invoice · quotation · requirementResponse · supplierApplication · materialRequest |
| `Approved` | **5** — goodsReceipt · invoice · purchaseRequisition · supplierApplication · materialRequest |
| `Under Review` | **5** — quotation · supplierDocument · compliance · supplierApplication · materialRequest |
| `Delivered` · `Governed` | **3** each |
| `Closed` · `In Transit` · `Pending` · `Accepted` · `Matched` · `Disputed` · `Awarded` · `Cancelled` · `Valid` | **2** each |

**A name-keyed map would give a rejected quotation and a rejected supplier application one sentence in two locales.** They are not the same act, they are read by different lanes, and a Rejected `goodsReceiptLine` is not even a document — it is substrate. The key is therefore the pair, and the derivation above is re-run by the gate rather than quoted from this table.

**The shape.** New module `src/services/transitions/stateLabels.ts`:

```ts
import type { FlowDefinition } from './schema';

/** `<entity>.<state>` — the pair, spelled as one key so a Record can hold it. */
export type StateLabelKey = string;

export interface StateLabel {
  /** i18n key whose EN and ID values carry the reader-facing name. */
  readonly labelKey: string;
  /**
   * i18n key for ONE sentence answering "what does it mean for a document to be
   * here?". Optional — a substrate state may have nothing to say to a reader,
   * and an empty string would be a placeholder wearing a value's clothes.
   */
  readonly meaningKey?: string;
}

/** Keyed by `<entity>.<state>`. Pinned bilaterally to getKnownFlows(). */
export type StateLabels = Readonly<Record<StateLabelKey, StateLabel>>;

export function stateLabelKey(entity: string, state: string): StateLabelKey {
  return `${entity}.${state}`;
}

export const STATE_LABELS: StateLabels = Object.freeze({
  'purchaseOrder.Sent':       { labelKey: 'flowStates.purchaseOrder.Sent' },
  'purchaseOrder.Viewed':     { labelKey: 'flowStates.purchaseOrder.Viewed' },
  // … one row per (entity, state) pair the registry declares.
  'quotation.Rejected':       { labelKey: 'flowStates.quotation.Rejected' },
  'supplierApplication.Rejected': { labelKey: 'flowStates.supplierApplication.Rejected' },
});

/** The label key for a pair, or null when the registry does not declare it. */
export function stateLabelFor(entity: string, state: string): StateLabel | null {
  return STATE_LABELS[stateLabelKey(entity, state)] ?? null;
}
```

**The prose lives in its own i18n fragment,** `src/lib/i18n/flowStates.ts`, exporting `flowStatesEn` and `flowStatesId` — which is the whole definition of a fragment in this tree (`fragments.test.ts`: *"A module under `src/lib/i18n/` that exports BOTH `<name>En` and `<name>Id`"*), so EN/ID parity is covered **the moment the file exists**, with nobody editing the parity suite. That is the property to rely on and it is why this must be a fragment rather than a map inside `stateLabels.ts`.

**The gate** — `src/services/transitions/stateLabels.test.ts`:

| `it(...)` title | Asserts | The direction it does not have without it |
|---|---|---|
| `every (entity, state) pair the registry declares has a label row` | derive the pairs from `getKnownFlows()`; every one is a key of `STATE_LABELS` | a state added tomorrow renders raw |
| `every label row names a pair the registry declares` | every key splits into an entity in the registry and a state that flow declares | a row for a retired state survives forever |
| `every labelKey and meaningKey resolves in BOTH locales` | look the keys up in `resources.en` / `resources.id` | a half-translated registry |
| `the key is the PAIR — a name shared by two flows carries two rows` | for each of the derived shared names, assert **≥2** rows and that their `labelKey`s differ | **the defect this module exists to prevent**; it fires the moment somebody "simplifies" the key to the bare state name |
| `no label row is keyed on a bare state name` | no key is a member of the derived set of state names | same defect, from the other side |

⚠️ **The fourth row is this file's `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01` obligation and it is satisfiable without inventing a synthetic subject**: the tree really does declare `Rejected` eight times, so the probe fires the shipped matcher at a geometry the tree really occupies and requires **named** members (`quotation.Rejected` AND `supplierApplication.Rejected`, both present, labels different). Never a count — a count is satisfied by the wrong match.

**One surface consequence, cheap and worth taking in the same batch.** `/buyer/process-flows` renders states raw today. With `STATE_LABELS` in place the diagram and the transition table render the label with the raw id beside it in `<Data>` — **both**, never the label alone, because the raw id is what a developer greps and what every refusal string quotes. The guides' prose refers to states by the registry's spelling (Design 5 §B.2) and stays correct.

### 2.2 Hook descriptions — a name is not an explanation, and the parameter boundary is stated here once

Derived at `de101c67`: `getRegisteredPolicyHooks()` returns **60** names; the transitions reference **60** distinct hooks — so every registered hook is used by at least one transition and no hook is decorative. They are bound by name at **46** `bindPolicyHook` sites in `policies.ts` (several hooks share a binding shape). **None carries a description, a locale string, or a parameter schema.**

A composer that offers "add a check" must show a reader what the check does. Add, in `src/services/transitions/policyHooks.ts` beside `POLICY_HOOKS`:

```ts
export interface PolicyHookDoc {
  /** i18n key: ONE sentence, in the imperative of what it REFUSES. */
  readonly descriptionKey: string;
  /**
   * What the hook READS to decide. A closed union, because a builder must be
   * able to warn "this hook reads the document, and your draft's target does
   * not implement readEntity" BEFORE a reviewer discovers it at dispatch.
   */
  readonly reads: readonly ('payload' | 'entity' | 'scope' | 'store')[];
  /**
   * ⚠️ **DELIBERATELY ABSENT: `params`.** A hook is a CLOSURE BOUND BY NAME and
   * it takes one ctx (`{ entityId, currentState, toState, payload, target,
   * scope }`). Nothing in it is configurable, and giving 60 hooks a parameter
   * schema is a separate project with a separate risk — see DESIGN 6 §9. A
   * builder shows this field's absence to the reader as "this check is code".
   */
}

export const POLICY_HOOK_DOCS: Readonly<Record<string, PolicyHookDoc>> = Object.freeze({ /* one row per registered hook */ });
```

**Gate** (`policyHookDocs.test.ts`): bilateral against `getRegisteredPolicyHooks()` — a registered hook with no doc row is red, a doc row naming an unregistered hook is red, every `descriptionKey` resolves in both locales. Population derived from the registry, never listed here.

⚠️ **`reads` must be derived from the hook body, not authored, or it is a comment.** The honest form is a source scan over `policies.ts`: within each `bindPolicyHook(POLICY_HOOKS.X, ({ … }) => …)` argument list, the **destructured ctx keys** are exactly what the hook reads, plus a `store` classification when the body imports a store module. That is a derivation the tree can re-run; an authored `reads` array is the `COMMENT-AS-CONTRACT` shape this project has closed repeatedly. **If the SE team cannot derive it, ship `POLICY_HOOK_DOCS` with `descriptionKey` only** — an absent field is honest and a wrong one is not.

### 2.3 Required-field labels and types

Derived: the 115 transitions name **66 distinct** `requiredFields` identifiers; the most reused are `reason` (7 transitions), `supplierId` (6), `materialCode` (5), `rejectionReason` (4), `totalQty` (3). The registry carries **names only** — no label, no type, no hint.

```ts
// src/services/transitions/fieldLabels.ts
export type FieldType = 'text' | 'longText' | 'number' | 'quantity' | 'money' | 'date' | 'id' | 'enum' | 'boolean' | 'list';

export interface FieldLabel {
  readonly labelKey: string;
  readonly hintKey?: string;
  readonly type: FieldType;
  /** For `enum` only: the registered vocabulary name (GL-0's union register). */
  readonly vocabulary?: string;
}

export const FIELD_LABELS: Readonly<Record<string, FieldLabel>> = Object.freeze({ /* one row per distinct requiredFields name */ });
```

**Keyed on the field NAME and not on `(transition, field)` — and unlike §2.1 this is the right call, which is why the difference is argued rather than assumed.** A state's meaning is per-machine: a rejected quotation and a rejected application are different facts. A field name in this tree is a *carried identity or a value* and means the same thing wherever it appears — `supplierId` is a supplier id on all six transitions, `reason` is the actor's words on all seven. **The gate asserts that property rather than trusting it:** `fieldLabels.test.ts` derives, for each field name used by more than one transition, that no two uses disagree about type — and the day one does, the gate goes red and the key becomes the pair for that field. That is a rule that re-decides itself, which is the property §2.1's key has and a marker cannot.

### 2.4 Entity display names, grouping and order

The registry gives `entityPurposeKey(entity)` — a purpose, not a name — and flow ORDER is registration order in `flows/index.ts`. A builder's catalogue needs a name, a group and a deterministic order.

**Do not mint a third grouping vocabulary.** Design 5 §A.1.2 already assigns **every** registered flow to exactly one module (`ModuleSpec.flows`, bilateral with `getKnownFlows()` both ways). The builder's grouping **is** the module map; its order is `(module code, entity)` alphabetically. What is added is only the name:

```ts
// src/services/transitions/entityLabels.ts
export interface EntityLabel { readonly labelKey: string; readonly pluralKey: string }
export const ENTITY_LABELS: Readonly<Record<string, EntityLabel>> = Object.freeze({ /* one row per registered flow */ });
```

**Gate:** bilateral against `getKnownFlows()`; both keys resolve in both locales; **and** — the row that keeps the vocabularies from forking — `every registered flow belongs to exactly one module (Design 5 §A.1.2) and the builder reads the grouping from there`. If module activation has not landed when SE-16 starts, the builder groups by `ENTITY_LABELS` alphabetically and **the grouping gate is written anyway, skipped with its reason at the site**, so the day the module registry lands the tie is made rather than remembered.

### 2.5 Layout stays out of `FlowDefinition` — a side table, keyed by the pair

`FlowDefinition` is **data the dispatcher reads**. A node coordinate is data a *diagram* reads. Today layout is computed per render (`pages-v2/process-flows/flowLayout.ts` — `rankStates` is a BFS, `NODE_W`/`NODE_H` are constants) and nothing is stored, which is correct and must stay so for every flow the builder does not move.

If the composer lets an author drag a node — and §5.2 recommends it should not, in the first release — the coordinates live in:

```ts
// src/services/transitions/flowLayoutStore.ts  (draft-scoped, never for a live flow)
export interface StoredNode { readonly key: StateLabelKey; readonly x: number; readonly y: number }
```

keyed by `(draftId, entity, state)` in the **draft** record, never in a module the dispatcher imports. A live flow has no stored layout, ever: promotion drops the coordinates and the generated module contains none. **Stated as an assertion:** `generator.test.ts` → `the emitted module contains no coordinate and no layout import`.

### 2.6 What is deliberately NOT added

| Not added | Why |
|---|---|
| A `params` schema on a policy hook | §9 — a hook is code; parameterising 60 of them is a different project and the boundary must be visible, not blurred |
| A cascade **resolver** as data | the resolver decides WHICH entity ids and the winner/loser split; it is code in `MockCommandService.ts` and a composed cascade link without a resolver is an authored edge that fans out to nothing. The composer may author the LINK and **must** emit a resolver stub the generator marks `TODO` and the reviewer implements (§7.1) |
| A second `trigger` member | `clock` is a compile error by design (law 0.5, `ClockTriggerIsForbidden`) and the builder must never be the thing that reintroduces it. §5.2 refuses a clock-shaped state name at entry too |
| `flowVersion` on the registry keying | §8 — that is the promotion path's P-2, not a registry ergonomics item |
| A `surfaceable` default | the field is required per verb *and authored per verb, never seeded from `trigger`*, because the two disagree and seeding would manufacture the disagreements and call them derived (`schema.ts`). The composer asks; it does not guess |
---

## 3 · Render and preview — on `/buyer/process-flows`, one page

**The ruling is one page, and that is a constraint on this design rather than a preference.** `/buyer/process-flows` (`AppRouter.tsx:140` → `pages-v2/ProcessFlows.tsx`) already builds `buildCatalogView(getKnownFlows())` once per mount and renders, per flow: a `FlowDiagram` (nodes ranked by BFS from the birth set, edges from `edgesOf`, which mirrors the analyzer's two rulings — a `statePreserving` verb is not an edge, a `settlesTo` advance is), the transition table (from/to, step kind via `STEP_KIND_KEY`, external owner via `EXTERNAL_FACT_OWNER_KEY`, personas, required fields, hooks by name, and the `recordsFact` / `sapBoundary` / `fansOutTo` / `firedBy` pills), the purpose sentence per transition, the flow's loose ends with their census reason, and `LifecycleWalk`. **Capability (i) is therefore already 80% built, and this section adds columns and tabs to it rather than a new page.**

### 3.1 The page after Design 5 and Design 6 — the whole tab set, in order

Design 5 Part B adds nine guide tabs. Design 6 adds two and modifies one. **Nothing is removed.**

| # | Tab | Owner | Source |
|---|---|---|---|
| 1 | **Overview** | D5 | current page header + `sections.summary` + derived counts |
| 2 | **Diagram** *(the current body, unchanged except for §3.2's two columns)* | **D6** | `buildCatalogView` + `layoutFlow` + `STATE_LABELS` |
| 3 | **Lifecycle walk** | D5 | `LifecycleWalk` + `sections.lifecycle` |
| 4 | **Step by step** | D5 | `steps` (Operator / Tester panes) |
| 5 | **Who acts next** ⟵ **NEW** | **D6** | `nextActFor` × the lane picker (§3.3) |
| 6 | **Forks & exceptions** | D5 | `sections.forks` |
| 7 | **Exception flags** | D5 | `sections.flags` + the page's derived pills |
| 8 | **Linked objects** | D5 | `sections.linked` |
| 9 | **Status history** | D5 | the audit sink, grouped by `correlationId` / `causationId` |
| 10 | **Troubleshooting** | D5 | `sections.troubleshooting` |
| 11 | **Test data** | D5 | `testData` |
| 12 | **Builder** ⟵ **NEW** | **D6** | the draft composer (§5), gated per §3.5 |

**Ordering rule, so two designs do not fight over it:** tabs 1–11 are Design 5's order with **Diagram** inserted at 2 (it is the page that exists) and **Who acts next** at 5 (it answers the question *"Step by step"* raises). **Builder** is last, always, and is the only tab that can be absent.

### 3.2 Two columns the diagram tab gains

**(a) The LANE column.** The page shows **personas** (`buyer` / `supplier`) today, from `personasFor`. A persona is the tenancy axis and is not who acts: authorisation resolves the SEAT's business roles, and `resolveRoles` no longer widens a persona to its whole atom set. The lane resolution exists one module over and needs no new derivation — `rolesHolding(atom)` returns the `SystemRoleId[]` that hold it, and `ownerLabelKeys(owners)` turns that into i18n keys in `ROLE_ORDER`. So the transition table gains one column:

```
Lane(s)   =  ownerLabelKeys(rolesHolding(t.requiredRole)).map(k => t(k))
             or, when that array is EMPTY:  t('processFlows.lane.automation')
```

⚠️ **The empty case is not an error and must not render as a blank cell.** Derived at `de101c67`: of the **80** distinct atoms the catalogue requires, **12** are held by no business role and only by the automation grant — `po:issue`, `po:fulfil`, `po:close`, `asn:carry`, `invoice:match`, `rfq:close`, `quotation:award`, `quotation:reject`, `shipment:create`, `shipment:advance`, `pr:source`, `pr:convert`. Those are the platform acting on its own behalf (cascade fan-out and feeds), and the honest label is *"the platform (automation grant)"*. A blank cell there would read as *nobody*, which is the false reading — and the `automation` grant is deliberately **not assignable to a person**, so the cell can never be filled by a role.

**Gate** (`processFlows.lanes.test.tsx`): `every transition row renders at least one lane label or the automation label` — and the bilateral control, `the automation label appears exactly on the derived automation-only atoms` (derived in the test from `rolesHolding` + `AUTOMATION_ATOMS`, never listed).

**(b) The STATE NAME.** Every node and every from/to cell renders `t(STATE_LABELS[key].labelKey)` **with the raw id in `<Data>` beside it**. See §2.1's closing paragraph for why both.

### 3.3 The **Who acts next** tab — preview, by lane and by how

The question the ruling asks — *preview who acts next, by lane and how* — is answerable today with no new derivation. `nextActFor(entity, state, seatRoles)` returns a closed union and the tab renders one row per state:

| `NextAct` kind | Rendered as | The "how" |
|---|---|---|
| `mine` | **You can act** — the verb labels, from the transition's purpose sentence | operator action |
| `theirs` | **Waiting for <lane(s)>** via `ownerLabelKeys` | operator action, another lane's |
| `external` | **Waiting for <system>** via `EXTERNAL_FACT_OWNER_KEY` (`s4hana` · `tms` · `bank`) | external fact |
| `settling` | **Settling at the SAP boundary** — names the boundary verb and `settlesTo` | asynchronous settlement (Option B) |
| `computed` | **The platform decides this** | computed / cascade |
| `ended` | **This is an ending** (declared terminal) | — |
| `silent` + `because` | **No exit** / **Ruled unsurfaced** / **No lane holds it** — the three are different facts and are rendered as three | the honest gap |

**The lane picker.** A dropdown above the table with three modes, and the third is the one that makes this a *preview* rather than a mirror of the current seat:

1. **This seat** (default) — `identity.businessRoles`, so the tab agrees with every other surface and with `useVerbAvailability`.
2. **One lane** — each `SystemRoleId` from `SYSTEM_ROLES`, so a reader can ask *"what does Receiving see on a goods receipt in Quality Hold?"* without adopting a role.
3. **Every lane** (matrix) — states down, lanes across, each cell the `NextAct` kind as a chip. **This is the view that makes a segregation defect visible**, and there is a live one to see: Design 3 §D and `SEGREGATION-CROSSED-IN-ONE-DRAWER-01` (§76d) record that the default buyer seat holds all six buyer bundles, so `pr:revise` → `pr:submit` → `pr:approve` are all `mine` on one document. **The matrix renders that as three `mine` cells in one row, which is what a per-transition dispatcher cannot show**, because segregation is a property of the SEQUENCE.

⚠️ **THE HONESTY RULE, ABOVE THE CONTROL AND NOT IN A FOOTNOTE:** *"This preview computes who may act. It performs nothing."* Copy it from `LifecycleWalk`'s register, which already carries exactly this rule for exactly this reason. **The tab contains no `dispatch` call and a test says so:** `processFlows.preview.test.tsx` → `the preview module never imports a command hook` (source scan of the component's own imports — the `deadAffordance.guard` precedent).

⚠️ **AND THE PREVIEW IS NOT AN AUTHORISATION PATH.** It calls `nextActFor`, which composes `availabilityOfAtom` → `atomsForSeat` → `rolesHolding`: the same functions the dispatcher's role gate reads. It does **not** run policy hooks, so a verb that is `mine` in the preview can still be refused at dispatch by a policy (four-eyes, a segregation check, a governed setting). **Say that on the surface**, one line under the lane picker: *"A lane holding the permission is not the same as the act being allowed — a policy check can still refuse it."* The alternative — running hooks in a preview — would execute governance logic against a document the reader has not acted on, and `PslGateNotice`'s precedent is the right one: where a surface must agree with a hook, it calls **the same exported function** (`services/data/pslLeadCheck.ts`), never a copy. If a future release wants policy-aware preview, it consults those exported predicates and nothing else.

### 3.4 Cascades, rendered as the chain they are

The page already shows `fansOutTo` and `firedBy` pills per transition. The builder tab needs the same at the CATALOGUE level, because a composer author must see what their draft would join. Derived at `de101c67`: **5 source transitions author 6 cascade links** (`CASCADES`), and `authoredCascadeTargets()` is the set the analyzer checks a `cascade` trigger against. Render a small cross-flow graph above the catalogue: source flow → target flow, one edge per link, each labelled with both transition ids. **No new data**; `CASCADES` plus `ENTITY_LABELS`.

### 3.5 Where the Builder tab lives, and who sees it

- **The page stays UNGATED for reading.** `/buyer/process-flows` is a read surface and no page in this platform has ever gated on role (the `/buyer/roles` catalogue ruling, C10 §3.3 — no atom could express it). Tabs 1–11 are visible to every buyer seat, exactly as today.
- **The Builder tab is gated on the atom, not on the page**, and the gate is the one this tree already uses for a control: `useVerbAvailability('processdraft:propose')`. Held ⇒ the tab renders. Withheld ⇒ **the tab still renders, and its body is a `HandoffNotice` naming the lane that holds it** — `ENTRANCE-IS-THE-UNIT-01` says gate the MODE rather than the door, and a seat narrowed while the tab is open is reachable, not a dead branch (`SupplierShipments` is the precedent to copy). Unowned ⇒ the honest third arm.
- **Deep link.** `/buyer/process-flows?flow=<entity>&tab=<tabId>` so the guides, the module drawer (Design 5 §A.5.1) and a refusal message can all point at a specific tab. `allRoutes.smoke`'s coverage guard derives from the router source, so no new route is added and nothing there changes; the tab id is a query parameter and is validated against the derived tab list, falling back to Overview rather than rendering blank.

---

## 4 · The validation library — the gates, lifted into pure functions

**This is the batch that decides whether the Flow Builder is trustworthy, and its risk has one name: a check lifted out of a test can be lifted out weaker than it was.** §4.4 is the rule that prevents it and it is not advisory.

### 4.1 The full check table — what exists, and in what form

| # | Check | Exists today as | Form | Lift needed |
|---|---|---|---|---|
| 1 | Structural validity (the whole `validate.ts` list) | `validateFlow(flow)` | **pure function** | none — call it |
| 2 | Unreachable state · exit-less non-terminal · dead transition · initial integrity · unauthored cascade | `analyzeFlow(flow, cascadeTargets)` | **pure function** | none — pass the merged cascade targets |
| 3 | Referenced policy hook is registered | inside `validateFlow` → `isRegisteredPolicyHook` | **pure** | none |
| 4 | External-fact owner from the closed set; no owner on a non-external arm | inside `validateFlow`; `externalFactOwner.test.ts` globally | **pure** for the draft's own rows | none |
| 5 | **Entity key and transition id do not collide with the live catalogue** | `FlowRegistry.register` **throws** | **side-effecting — unusable** | **new pure `collides(draft, known)`** |
| 6 | **Every atom is held by a lane or the automation grant; every bundle atom is required by a transition; automation covers every cascade target; zero-atom bundles are exactly the anchors** | `businessRoles.test.ts` | **vitest over the singleton** | **lift to `atomCoverage(...)`** |
| 7 | **Dispatched ⇒ surfaceable; every user verb maps to exactly one persona** | `surfaceable.test.ts` | **vitest** | **lift to `surfaceInvariants(...)`** |
| 8 | **Every derived loose end is censused; every census row is live** | `flowGraph.test.ts` | **vitest** | **lift to `censusDelta(...)`** |
| 9 | **Every cascade target exists and is wired** | split: authored half in `analyzeFlow`, wired half in `businessRoles.test.ts` | half and half | **fold into `cascadeIntegrity(...)`** |
| 10 | **Every state can reach a declared terminal** | **nowhere** | — | **new derivation** (§4.2) |
| 11 | No clock-projected state (V9) | `projectionGate.test.ts` (source scan) | source scan | **composer-time refusal** (§5.2), not a draft check |
| 12 | Purpose annotation in both locales | `annotations.test.ts` | vitest | **promotion-time only** — a draft cannot have authored prose on the day it is composed, and demanding it would turn a truthful work-in-progress into a red draft. It is an **approval precondition** (§6.3) and a **PR gate** (§7.3) |

### 4.2 Check 10 — terminal reachability, **measured before it is specified**

**The derivation.** For each state of each flow, breadth-first over movement edges (`trigger !== 'creation' && !statePreserving`) plus the settlement edge a `sapBoundary` verb declares (`to → settlesTo`) — i.e. exactly the edge set `buildFlowGraph` already uses for `exits`, so the two cannot disagree about what "a way out" means. A state passes if it is itself declared terminal or can reach one.

**Run against the live registry at `de101c67`:**

| Flow | `terminals` | States with no path to a terminal |
|---|---|---|
| `advanceShipNotice` | **`[]`** | **5 / 5** — Draft · Submitted · In Transit · Delivered · Discrepancy |
| `invoiceMatch` | `['Matched']` | **2 / 5** — Qty Mismatch · Price Variance |
| *(every other flow)* | — | **0** |
| **Total** | | **7 states, 2 flows** |

**So the ruling is forced by the measurement, not chosen: check 10 ships as a declared-exception WARNING, never as a refusal.** Shipped as a refusal it would refuse `advanceShipNotice` **by construction** — the schema says an empty `terminals` is *"a legal, meaningful answer"* and states plainly that it is true of the ASN flow today and worth being able to read — and it would refuse `invoiceMatch`, which is substrate rolled up by its parent. A check that refuses two of the tree's own flows on day one is a check the first author will disable.

**The mechanism, which is the tree's own and not a new one.** Reuse the loose-end census shape exactly:

- A new `LooseEndKind` member, `'no-terminal-path'`, added to `flowGraph.ts`'s union — which makes `analyzeFlow` the one place this is computed and gives it the census's bilateral discipline for free.
- A new `LooseEndReason` member, `'terminal-by-design'`, for a state whose flow declares no ending on purpose.
- Rows in `LOOSE_END_CENSUS` for the 7 derived subjects, each with its `note`.
- `flowGraph.test.ts`'s existing bilateral assertion then covers it in both directions with **no new test**: a derived hole with no census row is red, and a census row with no derived hole is red. **That is the whole reason to implement check 10 inside `analyzeFlow` rather than as a standalone function.**
- For a **DRAFT**, the builder renders the same findings as **warnings the proposer must acknowledge**, and the acknowledgement is stored on the draft (§5.1 `acknowledged: readonly string[]`, holding `looseEndKey(...)` values). An unacknowledged warning blocks **approval**, not composition.

⚠️ **The census addition changes `looseEndCount` on `/buyer/process-flows` and adds rows to a file whose header the register has already corrected once for carrying the word *"NINE"*.** Design 3's B0 deletes that word; if B0 has not landed when S-3 does, **S-3 deletes it** — a cardinality in a header beside a list that is about to grow is the `FLOOR-IN-PROSE-01` shape, and the fix is deletion in favour of the derivation, never a fresher number.

### 4.3 The library — one module, one API

```ts
// src/services/transitions/draftValidation.ts
//
// THE ONE EXPRESSION of every global invariant a draft must satisfy. The shipped
// vitest suites CALL these functions; they do not re-implement them. See §4.4.

import type { FlowDefinition } from './schema';
import type { CascadeLink } from './cascades';
import type { CensusEntry } from './looseEndCensus';
import type { LooseEnd } from './flowGraph';

export type FindingSeverity = 'error' | 'warning';

export interface Finding {
  readonly severity: FindingSeverity;
  /** Stable, prose-independent identity: `<check>#<entity>#<subject>`. */
  readonly key: string;
  /** Which check produced it — a closed union, one member per §4.1 row. */
  readonly check:
    | 'structure' | 'graph' | 'id-collision' | 'atom-coverage'
    | 'surface-invariants' | 'census-delta' | 'cascade-integrity'
    | 'no-terminal-path' | 'annotation';
  readonly entity: string;
  readonly subject: string;
  /** i18n key for the reader; `detail` is the developer's string. */
  readonly messageKey: string;
  readonly detail: string;
}

/** Everything the global checks need, injected — so the library is pure. */
export interface ValidationWorld {
  readonly known: readonly FlowDefinition[];
  readonly cascades: Record<string, readonly CascadeLink[]>;
  readonly census: readonly CensusEntry[];
  readonly systemRoles: Readonly<Record<string, readonly string[]>>;
  readonly automationAtoms: readonly string[];
  readonly personaRoles: Record<string, readonly string[]>;
  readonly wiredTargets: readonly string[];
  readonly registeredHooks: readonly string[];
}

// ── the seven liftable checks, each a pure function of its world ────────────
export function collides(draft: FlowDefinition, known: readonly FlowDefinition[]): readonly Finding[];
export function atomCoverage(flows: readonly FlowDefinition[], w: ValidationWorld): readonly Finding[];
export function surfaceInvariants(flows: readonly FlowDefinition[], w: ValidationWorld): readonly Finding[];
export function censusDelta(flows: readonly FlowDefinition[], w: ValidationWorld): readonly Finding[];
export function cascadeIntegrity(flows: readonly FlowDefinition[], w: ValidationWorld): readonly Finding[];
export function noTerminalPath(flow: FlowDefinition): readonly LooseEnd[]; // re-exported from flowGraph

/**
 * THE ONE ENTRY POINT the composer and the approval hook both call.
 *
 * ⚠️ **IT VALIDATES THE WHOLE WORLD WITH THE DRAFT IN IT — `[...known, draft]` —
 * NEVER THE DRAFT ALONE.** Checks 6–9 are properties of the CATALOGUE: a draft
 * whose atom no lane holds is only discoverable against the lattice, and a draft
 * that steals a transition id is only discoverable against the other 115.
 */
export function validateDraft(
  draft: FlowDefinition,
  world: ValidationWorld,
): readonly Finding[];

/** The default world, read from the shipped singletons. Test code overrides it. */
export function liveWorld(): ValidationWorld;
```

**`validateDraft` returns findings and refuses nothing** — the same ruling `analyzeFlow`'s header already makes (*"Returns findings; refuses nothing"*), for the same reason: a refusal here would run at import time in some future caller and take the app down with it. The **composer** decides what blocks Save, the **approval hook** decides what blocks approval, and §6.3 fixes that boundary: `severity: 'error'` blocks approval; `'warning'` blocks approval only while unacknowledged.

### 4.4 The lifting rule — and it is the load-bearing paragraph of this section

> ⚠️ **AFTER A CHECK IS LIFTED, THE SHIPPED VITEST SUITE MUST CALL THE LIBRARY AND ASSERT ON ITS RESULT. IT MUST NOT KEEP ITS OWN COPY OF THE LOGIC.**

Two implementations of one rule can disagree, and the disagreement is invisible because each side is internally consistent — `flowGraph.ts` says exactly this about `exitsOf` and it is why that function is *"THE ONE EXPRESSION of 'has a way out'"*. A lifted check with the old assertion left in place beside it is that defect, deliberately introduced, four times over.

**Concretely, per lifted check:**

| Suite | After the lift |
|---|---|
| `businessRoles.test.ts` | keeps its `it(...)` titles; each body becomes `expect(atomCoverage(getKnownFlows(), liveWorld())).toEqual([])` **plus the named-member probe below** |
| `surfaceable.test.ts` | same shape, `surfaceInvariants` |
| `flowGraph.test.ts` | same shape, `censusDelta`; keeps its bilateral titles |
| `cascadeIntegrity.test.ts` | same shape, `cascadeIntegrity` |

⚠️ **AND `toEqual([])` ALONE IS NOT ENOUGH, BECAUSE AN EMPTY RESULT IS WHAT A BROKEN FUNCTION ALSO RETURNS.** This is `EMPTY-INPUT-REPORTS-CLEAN-01` aimed at the lift itself: a `atomCoverage` that returns `[]` because it iterated an empty population passes every one of those four suites. **Each lifted check therefore ships with a KNOWN-BAD control in the same file, over the same world:**

| Lifted check | The known-bad input | Must produce, by NAME |
|---|---|---|
| `atomCoverage` | the live world plus a synthetic flow requiring `nonsense:verb` | a finding whose `subject` is `nonsense:verb` |
| `surfaceInvariants` | a synthetic transition that is `surfaced: false` and is in `wiredTargets`' dispatched set | a finding naming that transition id |
| `censusDelta` | the live flows with one census row removed | a finding naming that exact `looseEndKey` |
| `cascadeIntegrity` | a draft authoring a link to `t_does_not_exist` | a finding naming `t_does_not_exist` |
| `collides` | a draft whose entity is `purchaseOrder` | two findings: the entity, and every colliding transition id |
| `noTerminalPath` | the live registry | **the 7 derived subjects by name** — `advanceShipNotice`'s five and `invoiceMatch`'s two (§4.2) |

The last row is this section's `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01` discharge and it needs no synthetic subject at all: the geometry is one the tree really occupies. **Require named members, never a count** — a count is satisfied by the wrong match.

### 4.5 Two failure modes the SE team should expect, named so they are not diagnosed twice

- **A population derived through the code under test proves nothing.** `ownerlessScope.test.ts` is the specimen (§86): it first derived *"which targets are owner-less?"* by asking the dispatcher — the predicate under test — so mutating the predicate collapsed the population to empty and the suite went red on its own population control **while the assertion it exists to make never executed**. `atomCoverage`'s population must come from `getKnownFlows()` and `SYSTEM_ROLES` directly, **never** from `atomsForSeat` or `rolesHolding`, which are the things it is checking.
- **A clean run taken right after the fix is a report about the fix.** If S-3 lands in the same batch as a repair to any of the four suites, the green reading says the repair landed and says **nothing** about whether the lifted check can fire. Fire it at the defect the repair removed, in the same run, and report both readings separately (`CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`).

### 4.6 The structural proof that a draft cannot reach the registry

One test, in `draftValidation.test.ts`, and it is a source scan rather than a behaviour:

| `it(...)` title | Asserts |
|---|---|
| `no builder module imports the registry's register door` | over the derived set of files under `src/pages-v2/process-flows/builder/**` and `src/services/transitions/draft*`: none imports `flowRegistry`, and none contains the identifier `register(` |
| `the composer's only write is the draft store` | the same file set imports no store other than `processDraftStore` and no command hook other than the three `processDraft` verbs |
| `and the control: the scan SEES an import it should see` | the same matcher, run over `flows/index.ts`, **finds** `flowRegistry.register` — so a matcher that matches nothing cannot pass as a clean result |

The third row is the bilateral half and is the only reason the first two mean anything.
---

## 5 · The draft — object, composer, store, export

### 5.1 `ProcessDraft` — the object

A draft is **a candidate `FlowDefinition` plus everything promotion needs that the definition does not carry**. Splitting it that way is deliberate: `draft.flow` is byte-for-byte the shape the generator emits and the validator consumes, so nothing has to be unwrapped or re-assembled at either end.

```ts
// src/services/transitions/processDraft.ts
import type { FlowDefinition } from './schema';
import type { CascadeLink } from './cascades';
import type { CensusEntry } from './looseEndCensus';
import type { ActorAttribution } from '../../lib/enforcement';

export type DraftIntent = 'new-flow' | 'replace-default';
export type DraftState = 'Proposed' | 'Approved' | 'Rejected';

export interface DraftAnnotation {
  readonly transitionId: string;   // or the entity key, for the flow-level one
  readonly purposeEn: string;
  readonly purposeId: string;
}

export interface DraftStateLabel {
  readonly state: string;
  readonly labelEn: string;
  readonly labelId: string;
  readonly meaningEn?: string;
  readonly meaningId?: string;
}

export interface ProcessDraft {
  /** `pd-<entity>-<nnn>`, store-minted. NEVER caller-supplied (§5.3). */
  readonly id: string;
  readonly intent: DraftIntent;
  /** The candidate machine — the exact shape the generator emits. */
  readonly flow: FlowDefinition;
  /**
   * The version of the LIVE flow this draft was composed against, when
   * `intent === 'replace-default'`. Null for a new flow.
   *
   * ⚠️ **THIS IS THE STALENESS PRECONDITION AND IT IS NOT `expectedState`.** The
   * dispatcher's compare-and-set compares a STATE; this compares the CONTENT the
   * author read. If the live flow's `version` has moved since, the draft was
   * composed against a machine that no longer exists and approval is refused
   * (`PROCESSDRAFT_BASE_MOVED`, §6.3). No addressable entity in this tree carries
   * a revision, which is exactly why this one has to.
   */
  readonly baseVersion: number | null;
  /** Cascade links the draft AUTHORS, as a source. The resolver is code (§7.1). */
  readonly cascades: readonly CascadeLink[];
  /** EN/ID purpose prose — one per transition plus one for the flow. */
  readonly annotations: readonly DraftAnnotation[];
  /** EN/ID state labels — one per declared state (§2.1's shape, per draft). */
  readonly stateLabels: readonly DraftStateLabel[];
  /** Census rows the draft declares for its own derived loose ends. */
  readonly census: readonly CensusEntry[];
  /** `looseEndKey(...)` values whose WARNING the proposer has acknowledged. */
  readonly acknowledged: readonly string[];
  /**
   * The process guide. **An approval precondition, not a composition one**
   * (§10): `guideEn` and `guideId` are the markdown bodies in Design 5 Part B's
   * nine-section format, and approval is refused without both.
   */
  readonly guideEn: string | null;
  readonly guideId: string | null;
  /** Free text: what this changes and why. Required by the propose verb. */
  readonly rationale: string;
  readonly state: DraftState;
  // ── store-minted stamps. NONE of these is a payload field (§5.3) ──────────
  readonly proposedBy: ActorAttribution;
  readonly proposedAt: string;
  readonly decidedBy: ActorAttribution | null;
  readonly decidedAt: string | null;
  readonly decisionReason: string | null;
  /** The merge reference, recorded after promotion by a statePreserving verb. */
  readonly promotedRef: string | null;
  readonly promotedAt: string | null;
}
```

### 5.2 The composer — building blocks only, and four refusals at entry

**The rule that shapes the whole UI:** *every value a composer offers is picked from the live registry; the author types prose, ids and numbers, never a structural term.*

| Block | Picked from | Author may type |
|---|---|---|
| **States** | free text for a NEW state; existing states offered when replacing a default | the state id (validated, see below) |
| **`initial`** | the draft's own declared states | — |
| **`terminals`** | the draft's own declared states, multi-select, **`[]` permitted and labelled** *"this machine declares no ending"* | — |
| **`trigger`** | the closed union `user` / `system` / `cascade` / `creation` — **four radio buttons, and `clock` is not one of them** | — |
| **`surfaceable`** | `surfaced: true`, or `false` + one of the three `because` values; `external-fact` then requires an owner from `s4hana` / `tms` / `bank` | the `why` (≥40 chars, the validator's own floor) |
| **`requiredRole`** | **the 80 atoms the catalogue already requires**, each shown with the lanes that hold it (`rolesHolding`) or the automation label | a NEW atom, `<ns>:<verb>`, **with a warning that it must join a bundle (§6.3, `atomCoverage`)** |
| **`requiredFields`** | the 66 field names already in use, with their `FIELD_LABELS` type (§2.3) | a new field name + its label and type |
| **`policyHooks`** | **the 60 registered hooks**, each with its `POLICY_HOOK_DOCS` sentence and its `reads` set | nothing — a hook cannot be authored (§9) |
| **`sapBoundary` / `settlesTo`** | a checkbox, then a state from the draft's own set; the validator enforces `settlesTo ≠ to` | — |
| **`statePreserving`** | a checkbox; the composer then **forces `to` into `from`** rather than letting the validator refuse it later | — |
| **`version`** | derived: `baseVersion + 1`, or `1` for a new flow | — |
| **Cascade links** | source transition from the whole catalogue; target from the draft (or vice versa) | — |
| **Purpose prose, state labels, guide** | — | EN and ID text |

**Four refusals at entry, each with the reason rendered, because each is cheaper to refuse here than to explain later:**

1. **A clock-shaped state name.** The composer refuses a state whose name matches the projection vocabulary (`Expiring`, `Expired`, `Overdue`, `Upcoming`, `Due`, and the tree's `projectionGate` population) with the copy *"A state a clock decides is computed at read, never stored (law 0.5). Model the date, not the state."* This is V9 enforced at the door; `projectionGate.test.ts` still enforces it at the floor.
2. **A transition id that does not match `^t_[a-z0-9]+(?:_[a-z0-9]+)+$`,** or that collides with any of the 115 (`collides`, live, as the author types).
3. **An entity key already registered.** For `intent: 'replace-default'` the key is fixed and read-only.
4. **A personal name anywhere in the prose.** The guides' rule extends here unchanged — roles only, everywhere. Reuse the denylist Design 5 §B.1 specifies (the sample roster's labels and the `sim-usr-` namespace) and refuse at save.

**Layout: not in the first release, and the reason is a ranking function that already works.** `rankStates` is a BFS and produces a readable diagram for all 25 flows today; a drag-and-drop editor buys aesthetics and costs a stored side table, a coordinate migration on every state rename, and a diff nobody can review. **Recommendation D5 below: ship with the computed layout, and add stored coordinates only if a real draft is unreadable.**

### 5.3 The store

```ts
// src/services/transitions/processDraftStore.ts   (mock side)
export const PROCESS_DRAFTS_KEY = 'paragon.processDrafts';

export interface DraftReadState {
  readonly drafts: readonly ProcessDraft[];
  /** Rows refused ON READ, with the predicate that refused them. */
  readonly rejected: readonly { readonly id: string; readonly reason: string }[];
  /** Absent / corrupt / unparseable — DISTINGUISHED from empty. */
  readonly unreadable: boolean;
}
export function readState(): DraftReadState;
```

**Copy `customRoles.ts` verb for verb, and the four properties being copied are named so none is lost in translation:**

- **Persisted, not session-scoped** — the operator's ruling on custom roles applies with the same force here: *an honest statement does not repair an experience that looks like a defect*. A draft that vanishes on reload is a draft nobody composes.
- **The read fails honestly.** `unreadable` distinguishes absent, corrupt and unparseable from **empty**, and refusals are rendered rather than absorbed.
- **Every row is re-validated on read through the SAME predicates the verb calls** — `validateDraft` and the id predicate, not a second copy.
- **`id`, `proposedBy`, `proposedAt`, `decidedBy`, `decidedAt`, `promotedRef`, `promotedAt` are store-minted.** The `pinnedAt` discipline: a caller that can set a stamp can fake a check into silence, and `ACTOR_IN_PAYLOAD` already refuses the attribution keys **by key** at the dispatcher, so there is no payload value left to prefer.

**At F1 the store is behind `httpDataService`** like every other; Design 5 §A.4 draws the same line for module activation, and the reason is the same — a draft is platform state shared by everyone, the opposite of a per-user preference. **SE owns the durable implementation** (R3 §5.f).

### 5.4 The export format

One JSON document, and it is **the contract between us and the SE Team** — R3 §5.f already names `FlowDefinition` as that contract, and `schema.ts`'s header says the definitions are kept serialisable on purpose.

```jsonc
{
  "artifact": "paragon.processDraft",
  "artifactVersion": 1,            // the ENVELOPE's version, not the flow's
  "exportedAt": "2026-10-28T03:12:44.000Z",
  "sourceSha": "de101c67799f4f338796768981fed31fc9f0a229",
  "catalogueCounts": { "flows": 25, "transitions": 115, "wiredTargets": 19 },
  "draft": { /* the whole ProcessDraft, verbatim */ },
  "validation": {
    "ranAt": "2026-10-28T03:12:44.000Z",
    "findings": [ /* every Finding, errors and warnings */ ]
  }
}
```

- **`sourceSha` and `catalogueCounts` are what make a stale export detectable.** An importer re-derives the counts against its own tree and says *"this draft was composed against a catalogue of 115 transitions; this tree has N"* rather than silently validating against a different world. It is the `C9-required-fields` discipline — a counterparty checks against the artefact, never against a description of it.
- **`validation.findings` travels with the export, and the export is not evidence that it passed.** The importer re-runs `validateDraft`; a disagreement between the carried findings and the fresh ones is itself reported. **A carried clean result proves nothing about the importing tree** — which is `COUNT-RESTATED-ACROSS-INSTRUMENTS-01` at a file boundary.
- **Determinism.** Keys emitted in the order above, arrays in declaration order, two-space indent, `\n` endings, no trailing whitespace. `export.test.ts` → `the same draft exports byte-identically twice` (the only way a reviewer can diff two exports).
- **Import is a first-class path, not a nicety:** the SE Team will hand drafts back. `importDraft(json)` validates the envelope, refuses an unknown `artifactVersion`, **re-mints the id and the stamps** (an imported draft is Proposed by whoever imports it, never by the name in the file — attribution by assertion is exactly what C10 §6.2 refuses), and reports every finding.

---

## 6 · Approval — the `processDraft` ledger machine

### 6.1 The flow

```ts
// src/services/transitions/flows/processDraft.flow.ts
import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const processDraftFlow: FlowDefinition = {
  entity: 'processDraft',
  version: 1,
  states: ['Proposed', 'Approved', 'Rejected'],
  initial: 'Proposed',
  // Approved is an ending: promotion is a PULL REQUEST, not a transition (§6.2).
  terminals: ['Approved', 'Rejected'],
  transitions: [
    {
      id: 't_processdraft_propose',
      from: [],
      to: 'Proposed',
      trigger: 'creation',
      requiredRole: 'processdraft:propose',
      requiredFields: ['flow', 'intent', 'rationale'],
      policyHooks: [
        POLICY_HOOKS.PROCESSDRAFT_VALIDATES,
        POLICY_HOOKS.PROCESSDRAFT_PROPOSER_ATTRIBUTED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_processdraft_approve',
      from: ['Proposed'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'processdraft:decide',
      requiredFields: ['decisionReason'],
      policyHooks: [
        POLICY_HOOKS.PROCESSDRAFT_VALIDATES,
        POLICY_HOOKS.PROCESSDRAFT_BASE_UNMOVED,
        POLICY_HOOKS.PROCESSDRAFT_GUIDE_PRESENT,
        POLICY_HOOKS.PROCESSDRAFT_WARNINGS_ACKNOWLEDGED,
        POLICY_HOOKS.PROCESSDRAFT_APPROVER_ATTRIBUTED,
        POLICY_HOOKS.PROCESSDRAFT_APPROVER_NOT_PROPOSER,
        POLICY_HOOKS.PROCESSDRAFT_APPROVER_NOT_SAMPLE,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      id: 't_processdraft_reject',
      from: ['Proposed'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'processdraft:decide',
      requiredFields: ['decisionReason'],
      // NO four-eyes and NO sample lock: rejecting is the SAFE direction, and
      // `lib/enforcement.ts`'s precedent is that the safest act is always
      // reachable. The proposer withdrawing their own draft is a rejection.
      policyHooks: [POLICY_HOOKS.PROCESSDRAFT_DECIDER_ATTRIBUTED],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // The merge reference, recorded WITHOUT moving the draft.
      id: 't_processdraft_record_promotion',
      from: ['Approved'],
      to: 'Approved',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'processdraft:record',
      requiredFields: ['promotedRef'],
      policyHooks: [POLICY_HOOKS.PROCESSDRAFT_PROMOTION_SHAPE],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
```

⚠️ **WHY PROMOTION IS NOT A TRANSITION, AND IT IS A SCHEMA FACT RATHER THAN A PREFERENCE.** A merged pull request is a fact reported by something outside Paragon, so the honest declaration would be `surfaced: false, because: 'external-fact', owner: <our repository>` — **and `ExternalFactOwner` is a CLOSED union of `s4hana` | `tms` | `bank`.** `schema.ts` is explicit that adding a member is deliberately expensive and that the relay is not the owner, precisely so the union does not grow a member per sentence. **Our own CI is not an external system this platform integrates with**, so the correct answer is that the merge is outside the machine: `Approved` is terminal, and the reference is recorded by a `statePreserving` verb a compliance seat fires with the merge commit in hand. **That also keeps V15 intact** — the person *carries* the commit id; nothing mints one.

⚠️ **THE THREE NEW ATOMS JOIN THE `compliance` BUNDLE, AND THE ARGUMENT IS `role:grant`'s, ONE STEP SHARPER.** Whoever can edit the process can delete a policy hook from a transition — `PSL_DECIDER_NOT_PROPOSER` is four keystrokes from gone — so **procurement cannot hold these**: award and release-payment are two atoms away from anybody who can re-author the machine that guards them. Add `processdraft:propose` · `processdraft:decide` · `processdraft:record` to `SYSTEM_ROLES.compliance`; `admin` and `buyer_all` are **derived unions** of the other bundles (`businessRoles.test.ts` → *"holds THE UNION OF EVERY OTHER BUNDLE — derived, so it cannot drift"*), so they follow with no edit. `atomCoverage`'s *"every atom in the catalog is held by a bundle or the automation grant"* is what makes forgetting this a red build rather than a dead verb.

### 6.2 The target

`processDraftTarget` is `enforcementTarget` verb for verb, with one difference: the draft **is** a document with a lifecycle, so `readState` returns the stored state instead of a constant.

```ts
const processDraftTarget: CommandTarget = {
  readState: (id) => processDraftStore.get(id)?.state ?? null,
  // NULL ALWAYS — and it means "no supplier may act on this", not "nothing to
  // compare" (the purchaseRequisition / supplierApplication shape). A process
  // draft is buyer-side governance with no tenant; a supplier scope is denied at
  // SCOPE, identically for a draft that exists and one that does not.
  readScopeOwner: () => null,
  readEntity: (id) => processDraftStore.get(id),
  // (payload, toState, scope) — the schema's order; returns `{ entityId }`.
  create: (payload, toState, scope) => ({ entityId: processDraftStore.mint(payload, toState, scope) }),
  applyTransition: (id, toState, payload, scope) =>
    processDraftStore.decide(id, toState, payload, scope),
};
```

Registered in `TARGETS` in the same commit as the flow — **by ruling**, and the ruling's reason is quoted at three existing targets: the target-less set (`getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`, six members at `de101c67`) is a real population of machines whose verbs cannot fire, and a seventh — even for one merge — is a lane that LOOKS built on `/buyer/process-flows` and refuses everything.

### 6.3 The hooks, and the wall — **the table is the count**

| Hook | Refuses | Refusal head |
|---|---|---|
| `PROCESSDRAFT_VALIDATES` | any `Finding` of severity `error` from `validateDraft(draft, liveWorld())` | `PROCESSDRAFT_INVALID` — lists the finding keys, never the prose |
| `PROCESSDRAFT_BASE_UNMOVED` | `intent === 'replace-default'` and the live flow's `version ≠ draft.baseVersion` | `PROCESSDRAFT_BASE_MOVED` — names both versions |
| `PROCESSDRAFT_GUIDE_PRESENT` | `guideEn` or `guideId` absent or structurally invalid against Design 5 Part B's section markers | `PROCESSDRAFT_NO_GUIDE` |
| `PROCESSDRAFT_WARNINGS_ACKNOWLEDGED` | a `warning` finding whose key is not in `acknowledged` | `PROCESSDRAFT_UNACKNOWLEDGED` |
| `PROCESSDRAFT_PROPOSER_ATTRIBUTED` | an `UNATTRIBUTED` scope actor on **propose** | `PROCESSDRAFT_PROPOSER_UNNAMED` |
| `PROCESSDRAFT_APPROVER_ATTRIBUTED` | an `UNATTRIBUTED` scope actor on **approve** | `PROCESSDRAFT_APPROVER_UNNAMED` |
| `PROCESSDRAFT_APPROVER_NOT_PROPOSER` | both attributed and `personId` equal — `PSL_DECIDER_NOT_PROPOSER`'s body, copied not referenced | `PROCESSDRAFT_APPROVER_IS_PROPOSER` |
| `PROCESSDRAFT_APPROVER_NOT_SAMPLE` | an approver in `SAMPLE_PEOPLE` (**roster membership, never a `sim-usr-` prefix match**) | `PROCESSDRAFT_APPROVER_IS_SAMPLE` |
| `PROCESSDRAFT_DECIDER_ATTRIBUTED` | an `UNATTRIBUTED` actor on **reject** | `PROCESSDRAFT_DECIDER_UNNAMED` |
| `PROCESSDRAFT_PROMOTION_SHAPE` | a `promotedRef` that is not a 40-hex commit id or a PR reference `#<n>` | `PROCESSDRAFT_PROMOTION_REF_MALFORMED` |

**The attribution asymmetry, and it is the design decision in this section:**

| Verb | `UNATTRIBUTED` | SAMPLE person | Real person |
|---|---|---|---|
| **propose** | **refused** | **admitted, marked `(SAMPLE)` on the ledger row** | admitted |
| **approve** | **refused** | **refused BY NAME** | admitted |
| **reject** | **refused** | admitted | admitted |
| **record promotion** | **refused** | admitted | admitted |

- **Propose requires attribution so the four-eyes pair is always comparable.** If a draft could be proposed unattributed, the approval comparison — which fires *"only when both are attributed"*, exactly as the two existing templates do — would pass vacuously, and a single human could propose anonymously and approve by name. **That hole is closed at propose, not at approve**, because at approve there is nothing left to compare.
- **Propose admits a SAMPLE person and approve refuses one.** That is what makes the builder demonstrable today — compose, validate, export and propose all work with an adopted sample identity — while the act that changes the platform waits for a real one. It is the dispatch's ruling (*"approval is four-eyes by a named person, never a sample identity"*) implemented at the only point where it bites.
- ⚠️ **SO THE APPROVE VERB REFUSES EVERY SEAT THIS PLATFORM CAN CURRENTLY PRODUCE, AND THAT MUST BE SAID ON THE SURFACE RATHER THAN DISCOVERED AT THE BUTTON.** Copy the honesty the material-request lane already renders: above the Approve control, *"Approving a process change needs a real signed-in person. Paragon has no sign-in yet, so this act is unavailable — a sample identity may propose and may reject, and may not approve."* **The verb still refuses** — a surface that prevents the gesture is not a substitute for a verb that prevents the act (`role.flow.ts`'s own ruling).
- ⚠️ **AND THE LANE MUST BE PROBED, OR THE LOCK DELETES IT RATHER THAN GUARDING IT.** `processDraftCommand.test.ts` fires **approve** at a SYNTHETIC non-sample `RESOLVED` actor and requires an **admit**, beside the real-tree run requiring a refusal, and at a synthetic sample actor requiring a refusal **by name**. This is rule 4 applied to a population where the shipped seat can never satisfy the hook: without the synthetic admit, the suite would pass just as well if the hook refused unconditionally. The two existing locks carry exactly this probe and are the model.

### 6.4 The ledger surface

A drawer on the Builder tab, and a list above it:

- **Drafts list** — id, entity, intent, state chip, `Last proposed by <role> (SAMPLE) at <time>` read from the record (never a stored label; the label resolves through the ONE resolver, `services/identity/personLabel.ts`, which is what makes the `(SAMPLE)` marker structural rather than five call sites remembering it).
- **Draft drawer** — the validation findings (errors and warnings, each with its acknowledge control), the diff against the live flow when `intent === 'replace-default'` (states added/removed, transitions added/removed/changed field by field), the guide's presence, and the four verbs with their `HandoffNotice` / refusal copy.
- **Refusal rendering.** Key on the refusal **HEAD**, render your own copy, and fill `{{person}}` from `personLabel` — `pslRefusal.ts` is the pattern, and the reason is a measured defect: a surface reading `refusalText(r) ?? r` printed `sim-usr-procurement-1` into a toast, and browser QA found it where no spec did. Every head in the table above that names a person (`PROCESSDRAFT_APPROVER_IS_PROPOSER`, `PROCESSDRAFT_APPROVER_IS_SAMPLE`) must be owned by a key map, and `personNamingRefusal.test.ts` re-derives that population from `policies.ts` every run — so a new head added here without a key map is a red test, not a silent leak.
- **EN/ID from birth**, in a `processDraft.*` fragment (`src/lib/i18n/processDraft.ts`, exporting `processDraftEn` / `processDraftId` — the fragment shape, so parity is automatic).
---

## 7 · The code generator and the PR path

**The ruling:** *an approved draft becomes generated, reviewed code replacing the default through the normal gates.* R3 §5.a priced this at one batch against 3–5 plus a backend for a runtime catalogue, and recommended it for a reason worth restating because it is the reason and not a convenience: **a flow whose hooks and cascades are code is not data-driven by moving its edge list into a table.** 60 hooks are closures bound by name, the cascade resolvers are code in the command service, every `CommandTarget` is code. Generate the module, review it, let the gates decide.

### 7.1 What the generator emits — and two of the artefacts are deliberately incomplete

**The count is the table, not this sentence.**

`scripts/flowgen.mjs <draft.json> [--out .]` (a plain node script, beside `gen-sdc-xlsx-fixtures.mjs`, which is this tree's precedent for a generator that writes source-adjacent files):

| # | Artefact | Content | Note |
|---|---|---|---|
| 1 | `src/services/transitions/flows/<entity>.flow.ts` | the `FlowDefinition`, formatted; `POLICY_HOOKS.X` references rather than string literals; the generated-file header | **for `replace-default`, this OVERWRITES the existing module** — which is why the PR diff is the review artefact |
| 2 | `src/services/transitions/flows/index.ts` | one added import + `flowRegistry.register(...)` line, in alphabetical position | append-only for a new flow; untouched for a replacement |
| 3 | `src/services/transitions/cascades.ts` | the draft's `CascadeLink` rows merged into `CASCADES` | **plus, per new link, a resolver stub in `MockCommandService.ts` marked `// TODO(flowgen): resolve target entity ids` that THROWS rather than returning `[]`** |
| 4 | `src/services/transitions/annotations.ts` + `src/lib/i18n/processFlowPurpose.ts` | one `purposeKey` row per transition, one per flow; EN and ID values from the draft | `annotations.test.ts` is bilateral, so a missing row is red |
| 5 | `src/services/transitions/stateLabels.ts` + `src/lib/i18n/flowStates.ts` | one row per `(entity, state)` pair, EN and ID (§2.1) | same bilateral shape |
| 6 | `src/services/transitions/looseEndCensus.ts` | the draft's census rows, for the holes it acknowledged | a derived hole with no row is red |
| 7 | `docs/guides/<entity>.en.md` + `.id.md` | the draft's guide, verbatim (Design 5 Part B / §10) | `guides.test.ts` is bilateral against the registry |
| 8 | `MockCommandService.ts` — a `CommandTarget` stub + its `TARGETS` row, **for `intent: 'new-flow'` only** | `readState` / `readScopeOwner` / `readEntity` / `applyTransition` marked `// TODO(flowgen)` and **throwing** | see the ruling below |

⚠️ **ARTEFACT 8 EXISTS BECAUSE OF A RULING THIS TREE ALREADY MADE THREE TIMES, QUOTED AT THREE TARGETS: A FLOW SHIPS IN THE SAME COMMIT AS ITS TARGET.** The target-less set is `getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS` — six members at `de101c67` (`goodsReceiptLine`, `invoiceMatch`, `shipment`, `contract`, `obligation`, `compliance`) — and every one is a machine whose verbs cannot fire. *"A seventh — even for one merge — would be a lane that LOOKS built on `/buyer/process-flows` and refuses everything."* A composed new flow with no target is exactly that seventh. So the generator emits the stub **and** a failing test, `commandTarget.pending.test.ts` → `no wired target is the generated stub`, derived from source: the PR cannot go green until a reviewer implements the store reads. **`intent: 'replace-default'` touches no target** — the entity is already wired — which is why that intent is the cheap one and §12's D7 recommends it as the first release's only promotable kind.

⚠️ **THE RESOLVER STUB THROWS, AND THAT IS THE MOST IMPORTANT LINE IN THIS SECTION.** The cascade fan-out re-dispatches **inside a `catch {}`** under the automation grant — it is the one path in this platform where a narrowed grant or a broken resolver **deletes a reachable act in silence**. A stub returning `[]` would produce a cascade that is authored, registered, green on every gate, and does nothing, forever, with no signal. A stub that throws produces a swallowed exception on the first fan-out — still quiet, which is why it is paired with the second half: **`flowgen` also emits a failing test**, `cascadeResolver.pending.test.ts` → `every authored cascade link has a resolver that is not the generated stub`, derived from the source. The PR cannot go green until the reviewer implements it. **A generator that cannot finish a job must leave a red test, never a quiet default.**

### 7.2 The generated-file header, and the pin that keeps it honest

Every emitted file carries, verbatim:

```ts
// ⚠️ GENERATED FROM A PROCESS DRAFT. DO NOT EDIT BY HAND.
//   draft:      pd-<entity>-<nnn>
//   approved:   <ISO instant> by <role>            ← never a person's name
//   source sha: <the sha the draft was composed against>
//   regenerate: node scripts/flowgen.mjs <path to the export>
//   The draft's own record, its findings and its approval ledger are the
//   authority for WHY this shape is what it is; this file is the shape.
```

**The precedent is in the tree and should be copied rather than redesigned:** `docs/contracts/C9-required-fields.md` is generated by `src/services/sdc/__tests__/deriveC9FieldList.ts`, carries *"GENERATED … DO NOT EDIT BY HAND"*, names its regeneration command, and is **pinned by a contract test so the committed copy cannot drift from the rendering**. C11 V19 excludes a generated rendering from the pin-reach rule by deriving it from that marker rather than listing it — so the marker is load-bearing and its exact spelling matters.

⚠️ **AND THE PIN IS WHAT SEPARATES "GENERATED" FROM "ONCE GENERATED".** A generated flow module that nothing pins is a hand-editable file with a comment asking politely — and `SNAPSHOT-WITH-NO-UPDATE-PATH` is the class: true at creation, never recomputed, harder to spot because it was once right. `flowgen.test.ts` → `every generated flow module re-renders byte-identically from its draft` over the derived set of modules carrying the marker. **A flow deliberately hand-edited after generation removes the marker in the same commit**, which is a visible diff and a decision, rather than a silent divergence.

### 7.3 The PR path — which gates decide, and the two that do not exist yet

`npm run gates` is the whole of CI (`.github/workflows/gates.yml` runs that command and nothing else) and it is exactly four steps, asserted to have run:

| Gate | What it catches on a generated flow |
|---|---|
| `npm run build` (`tsc && vite build`) | a malformed definition, an unknown `POLICY_HOOKS` member, a `clock` trigger (`ClockTriggerIsForbidden`), a `surfaceable` arm that does not type |
| `tsc -p tsconfig.vitest.json --noEmit` | the generated spec surface |
| `npx vitest run` | **`assertValidFlow` at registration** (the barrel registers at first import, so an invalid flow fails every suite that imports the tree), plus `flowGraph.test.ts`, `businessRoles.test.ts`, `surfaceable.test.ts`, `annotations.test.ts`, `c1MethodSurface.contract.test.ts`, `stateLabels.test.ts`, `guides.test.ts`, `projectionGate.test.ts`, the floor |
| `npm run test:gate` | untouched (the SEC-GATE-01 session suite) |

**Read the check LIST by name on the PR, and say plainly when a gate is ABSENT.** `mergeStateStatus: CLEAN` answers *"is anything blocking?"*, and *"no check was required"* is one of the ways nothing blocks — three PRs of a five-PR stack once carried Vercel checks only while `build · floor · test:gate` was simply not there. A generated-flow PR is exactly the kind whose author is inclined to trust an aggregate.

**Two things CI cannot decide, stated so nobody assumes it can:**
1. **The floor moves.** A generated flow adds `it.each`-style rows to four bilateral suites; `npm run gates` will pass with the note asking for a `scripts/floor.json` bump (at `de101c67` the floor is `tests: 5947`, `files: 397`, `gate.tests: 7`). **Bump it in the same PR**, and never write tests to clear a floor.
2. **Nothing in CI reads the DRAFT.** The PR proves the emitted code is valid; the **approval ledger** proves somebody authorised it. Those are two different facts and the PR description must carry the draft id and the approval instant so a reviewer can check the second. `flowgen` writes them into the header (§7.2) for exactly that reason.

### 7.4 C1 re-harvest and the other contract touches

| Contract | Touch | Instrument |
|---|---|---|
| **C1 — Method Surface** | the transition-catalogue axis and the wired-target axis both move; C1's prose carries concrete figures **and is allowed to, because `c1MethodSurface.contract.test.ts` re-derives every one of them from the AST and the registry on every run**. Re-harvest in the same PR — the pin is what makes a stale C1 red | `c1MethodSurface.contract.test.ts` |
| **C11 — Invariants** | one new row, **V20**: *"A process definition reaches the live catalogue only as generated, reviewed code, approved by a named person who is not its proposer."* Class `GATE`; enforcer `src/services/transitions/draftValidation.test.ts`; assertion `no builder module imports the registry's register door`. **And V19's pin-reach block must name it** | `pinReach.contract.test.ts` |
| **C3 — Events** | `TransitionEvent` gains OPTIONAL `flowVersion` **if and only if §8's P-1 is taken**. ⚠️ **The window is now:** C10 §6.4 says the event shape is free only while the sink is in-memory, *"no retrofit"* — the same window as attribution | `events.ts` + the C3 pin |
| **C12 — Backend spec** | one row: the durable home of the draft store and the approval ledger, and the process-version storage if §8's P-2 is taken | C12's own pin |
| **C6 / C7 / C8** | untouched. A planning or intake flow composed in the builder is still governed by its own contract, and the builder does not relax one | — |

### 7.5 Two approvals, and why that is honest rather than bureaucratic

The operator approves the **draft** (§6) and a reviewer approves the **pull request** (§7.3). That is deliberate: a malformed flow definition **white-screens the application** — `flowGraph.ts`'s header says the graph gate is not run at import time for precisely that reason, and `assertValidFlow` throwing at registration means a bad flow takes down every page, not one. A process change is a governance act AND a code change, and it is reviewed as both.

---

## 8 · Per-document flow versions — the rule, and what it actually costs

**The rule, as ruled:** *documents in flight finish on their original version.*

### 8.1 What exists

`FlowDefinition.version` and `TransitionDef.version` exist (positive integers, enforced by `validate.ts`) and have exactly two consumers: validation, and `catalogView.ts` for display. **No event, DTO, store row or ledger carries a flow version** — `TransitionEvent` has `event, actor, scope, correlationId, causationId?, outcome, reason?, ts, decision?, attribution?` and nothing else. `FlowRegistry` keys by `entity` and **throws on a second registration**, so "the old version is kept and restorable" is a registry change, not a data change.

### 8.2 The changes, priced — **the table is the count**

| # | Change | Reach | Note |
|---|---|---|---|
| **1** | `CommandTarget.readFlowVersion?(entityId): number \| null` | **19 implementations** | optional, defaulting to the registry's current version, so no existing target is forced to change in the same batch — the `expectedState` precedent: *adding the field must never alter an existing caller* |
| **2** | `FlowRegistry` holds N versions per entity; `getFlow(entity, version?)`, `getTransition(id, version?)` | `registry.ts` + the barrel | the current `register` throw becomes *"already registered at this version"* |
| **3** | legality, `statePreserving`, `settlesTo` and cascade lookups keyed on the document's version | `dispatcher.ts`, `legality.ts`, `settleFaults.ts`, the cascade fan-out | this is the spine, and it is why P-2 is the risky half |
| **4** | the surfaces read the DOCUMENT's version, not the default | `useVerbAvailability`, `nextActFor`, `catalogView`, the Design 5 guide tabs | a renamed state on a new version is **invisible** to an old-version document, because it never reads the new flow — which is the rule working, and must be visible on the surface as *"this document follows process version N"* |
| **5** | `TransitionEvent.flowVersion`, stamped by the dispatcher | `events.ts`, `dispatcher.ts` | **time-boxed by the durable-sink window (C10 §6.4)** and cheap today |

### 8.3 What is in flight, measured

R3 §5.c ran the same seed chain `main.tsx` runs and derived the occupancy of every store: **202 documents across 15 stores would be in flight at a swap**, every one of them resting in a state its flow declares (the instrument prints a `⚠️ store holds status NOT in flow` row and none printed). So the rule has real subjects, and the alternative — migrating documents forward — needs a state map per version pair and is the SE Team's migration item.

### 8.4 The ordering, and the condition under which the whole of §8 is skipped

**P-1 (change 5) is cheap, is time-boxed, and should be taken regardless** — an event that cannot say which version of the process produced it is an audit trail with a hole, and the hole becomes permanent when the sink becomes durable.

**P-2 (changes 1–4) is taken only if versioned COEXISTENCE is actually wanted before Stage F.** If the SE Team migrates in-flight documents at cut-over — a deploy-time script over 15 stores with a state map — **the whole of P-2 is skipped**, and the rule *"documents in flight finish on their original version"* is satisfied by there being no in-flight document on the old version once the migration has run. **That is a real choice with a real trade** (a migration is a one-time script; coexistence is a permanent change to the spine), and it is decision D3 below.

---

## 9 · Configurable governed settings versus what stays code

### 9.1 The line, in one sentence

> **A THRESHOLD can become data. A CHECK cannot.**

A threshold is a value a comparison reads. A check is the comparison. Every governed setting that exists in this tree is the first kind, and every policy hook is the second.

### 9.2 What is configurable today, and through what

| Setting | Verb / store | Surface today | Lane |
|---|---|---|---|
| Enforcement mode per governed check (`OBSERVE` … `BLOCK`) | `t_enforcement_set`, append-only `enforcementSettingStore` | **none** — `ruled-unsurfaced`, seeded once | procurement (`enforcement:set`) |
| PSL default validity cap (days) | `t_psl_cap_set`, append-only `pslCapSettingStore` | **none** — no caller | compliance |
| PSL per-listing cap override | `t_psl_cap_override` (`statePreserving`) | `PslListingsSection` | compliance |
| Drawdown tolerance per scheduling-agreement item | `t_delivery_policy_set` | `BuyerContractDetail` via `useEditPolicy` | compliance |
| Custom roles (`{parent, adds}`) | `t_role_grant` → `customRoleStore` (persisted) | `CreateRolePanel` | compliance (`role:grant`) |
| Module activation *(Design 5)* | `t_module_set` | the admin page | compliance (`module:set`) |

**So: one has a surface, two have a verb and no door, and two more arrive with Designs 5 and 6.** Design 3's B5 already proposes the missing door as **one settings page for the governed ledgers**, and that is where it belongs — **not in the Flow Builder.** The builder renders which settings a flow's hooks consult; it does not become a second entrance to them. One entrance per governed act, or the segregation argument that put these atoms in `compliance` is decided twice in two places.

### 9.3 What stays code, and the two that are not what they look like

| Stays code | Why |
|---|---|
| **Policy hooks** | a closure bound by name; one ctx in, `{ok}` out; **no parameter schema on any of the 60** (§2.2). A configurator cannot change what a hook checks without a code change, and that is the property, not the gap |
| **Cascade resolvers** | they decide WHICH entity ids and the winner/loser split; they run inside the fan-out's `catch {}` (§7.1) |
| **`CommandTarget`s** | store reads and writes, `creationOwner`, `readScopeOwner` — code, per entity |
| **Approval bands** | ⚠️ **NOT configurable and NOT computed.** `approvalLevel` is an **authored string**; the surface says so (`lib/i18n/requisitions.ts`, key `approvalLevel.authored`) and `approvalBandAuthored.guard.test.ts` re-derives every run that nothing reads `estimatedValue` relationally. **Do not let the builder pretend to configure it** |
| **Invoice match tolerance** | `MATCH_TOLERANCE = 0.01`, a constant read in one place (`invoiceRollup.ts`) |

⚠️ **AND DO NOT INHERIT "THE POLICY HOOK CANNOT SEE THE DOCUMENT" — IT IS FALSE AND IT HAS ALREADY STOPPED ONE BATCH.** `PolicyHookFn` takes one ctx carrying `target`, `CommandTarget.readEntity` is documented *"Full entity for policy hooks to inspect"*, and four shipped hooks read a document through it. **What a threshold lacks is the RIGHT-HAND SIDE of the comparison, not the left.** A role-gated VALUE policy — value from `readEntity`, lane from `scope.businessRoles`, threshold from a governed setting — is buildable today and is **not** the approval ladder (that needs seniority roles C11 §3.4 forbids minting, and the `ApprovalPolicyAct` × `ApprovalAct` ledgers C10 §3.5 defers).

### 9.4 The one extension worth specifying, and the reason it is bounded

**A GOVERNED THRESHOLD a hook reads.** Add, to `PolicyHookDoc` (§2.2), an OPTIONAL reference — not a parameter:

```ts
  /**
   * The governed SETTING this hook reads its right-hand side from, when it has
   * one. A REFERENCE to an existing setting id, resolved at dispatch through
   * that setting's own store and its own verb — never a value stored here, and
   * never a value a draft carries.
   */
  readonly readsSetting?: string;   // e.g. 'psl.default_cap_days'
```

**What this buys:** the builder can say *"this check refuses when the value exceeds `psl.default_cap_days`, currently 180, set by Compliance on <date>"* and link to the settings page. **What it deliberately does not buy:** the ability to add a threshold to a hook that has none. That would be a parameter, and a parameter needs a schema, a validator, a migration and a surface per hook — 60 times. **If the SE Team wants parameterised hooks, it is its own design with its own ruling**; the boundary is visible here rather than blurred, which is the whole point of writing this section.

---

## 10 · A draft carries its process guide before approval

Design 5 Part B builds the guide registry: one markdown file per flow and locale, nine fixed sections by HTML-comment marker, one block per transition, parsed at build into `guides.json`, and **bilateral gates that refuse a guide naming a transition the tree lacks and a transition the guides do not explain.**

**The consequence for this design is mechanical, and it is the reason the two designs interlock rather than merely coexist:** the moment a generated flow lands, `guides.test.ts` requires a guide for it in EN and ID whose front-matter transition list equals the flow's ids in order. **A flow promoted without a guide is a red build.** So the guide cannot be an afterthought, and the honest place to require it is the approval act, not the PR:

| Where | What is required | Enforcer |
|---|---|---|
| **Composition** | nothing — a draft may be saved, validated and exported with no guide | — |
| **Approval** | `guideEn` and `guideId` present, and both parse against Design 5's nine section markers with one `<!-- transition:ID -->` block per transition id, once | `PROCESSDRAFT_GUIDE_PRESENT` (§6.3) |
| **The PR** | the guide files emitted to `docs/guides/`, and `guides.test.ts` green | the floor |

**The composer therefore carries a guide editor**, pre-filled from the draft: the section skeleton, one transition block per transition with its id, purpose prose and lane already filled from the draft's own data, and the author writing the operator and tester lines. That is not a new authoring burden invented here — it is the same nine sections Design 5 authored 50 files against, with the mechanical half generated.

⚠️ **The ID guide is required, not optional, and is marked `locale: id` as a draft until the locale pass ratifies it** — Design 5's rule, unchanged. A one-locale platform is not what this is.
---

## 11 · The SE batch plan (SE-16), with an acceptance command per batch

**Nine batches. Two hard sequencing constraints, and both are consequences rather than preferences:** S-3 (the validation library) precedes S-4 (the composer), because a composer with no validator is a form that produces invalid flows; and S-5 (approval) precedes S-6 (the generator), because a generator with no approval in front of it is a promotion path with no gate.

| # | Batch | Delivers | Depends on | Size |
|---|---|---|---|---|
| **S-1** | **State labels** | `stateLabels.ts` + the `flowStates` i18n fragment (EN/ID) + the five gates of §2.1 + the diagram and table rendering labels beside raw ids | — | 1 |
| **S-2** | **Render and preview** | the lane column and the automation label (§3.2); the **Who acts next** tab with the three-mode lane picker and the every-lane matrix (§3.3); the cascade chain view (§3.4); `ENTITY_LABELS`; the deep link | S-1 | 1 |
| **S-3** | **The validation library** | `draftValidation.ts`; the four lifted checks with the four suites rewritten to CALL them; `collides`; check 10 (`'no-terminal-path'` in `analyzeFlow` + `'terminal-by-design'` census rows for the 7 derived subjects); the six known-bad controls; §4.6's three structural tests | — (parallel with S-1/S-2) | **2** |
| **S-4** | **The composer and the draft store** | `ProcessDraft`; `processDraftStore` on `customRoles.ts`'s shape; the composer with the block pickers and the four entry refusals; live validation; the diff view against the live flow | S-3 | **2** |
| **S-5** | **The approval machine** | `processDraft.flow.ts`; the target + `TARGETS` row; the ten hooks; the three new `compliance` atoms; the drafts list and drawer; the refusal key maps; the `processDraft` i18n fragment; the honest *"approval needs a signed-in person"* copy; the synthetic-actor probes | S-4 | 1.5 |
| **S-6** | **Export / import** | the envelope (§5.4), determinism, `importDraft` with re-minted stamps, the stale-catalogue report | S-4 | 0.5 |
| **S-7** | **The generator** | `scripts/flowgen.mjs` and its eight artefacts; the generated-file header; `flowgen.test.ts`'s re-render pin; the two pending-stub tests; the PR template naming the draft id and approval instant | S-5, S-6 | 1.5 |
| **S-8** | **Contract touches** | C1 re-harvest path documented and exercised on one real generated flow; C11 **V20** + its pin-reach row; C12's storage rows; C3's `flowVersion` **if D3 takes P-1** | S-7 | 0.5 |
| **S-9** | **Per-document versions** — **CONDITIONAL, see D3** | P-1 (`TransitionEvent.flowVersion`, stamped) always; P-2 (`readFlowVersion`, the multi-version registry, the spine keying, the surfaces) only if coexistence is wanted | S-8 | P-1: 0.5 · P-2: **2–3** |

**Every batch, without exception:** EN and ID from birth; the floor bumped when `npm run gates` asks; **browser QA in both seats and both locales whose output reaches the strategist — run it even when the dispatch omits it, because the omission is the finding.** Before reading any browser baseline, assert `Date.name === 'Date'` and that `Date` is native: a `ShiftedDate` override has survived from one session into the next in this project and made a "baseline" that was already shifted.

### 11.1 The test inventory, by `it(...)` title

**S-1 — `stateLabels.test.ts`**
- `every (entity, state) pair the registry declares has a label row`
- `every label row names a pair the registry declares`
- `every labelKey and meaningKey resolves in BOTH locales`
- `the key is the PAIR — a name shared by two flows carries two rows` *(fires at `Rejected`'s eight, by name)*
- `no label row is keyed on a bare state name`

**S-2 — `processFlows.lanes.test.tsx`, `processFlows.preview.test.tsx`**
- `every transition row renders at least one lane label or the automation label`
- `the automation label appears exactly on the derived automation-only atoms`
- `the preview module never imports a command hook`
- `the every-lane matrix names three MINE cells on a requisition for the default buyer seat` *(the segregation view, `SEGREGATION-CROSSED-IN-ONE-DRAWER-01` made visible — and a working control for the matrix: a seat holding one bundle shows fewer)*
- `an unknown tab id falls back to Overview and renders no blank body`

**S-3 — `draftValidation.test.ts` (+ the four rewritten suites)**
- `a KNOWN-GOOD draft passes every check` ⟵ **first, and the reason is rule 4: a guard that is wrong about what it should ACCEPT ships looking like a working guard**
- one `it` per §4.4 known-bad row, each asserting a **named** subject
- `noTerminalPath names the 7 states the live registry really strands, by name`
- `the census is bilateral over the new kind — a derived hole with no row is red, a row with no hole is red`
- `no builder module imports the registry's register door` + `the composer's only write is the draft store` + `and the control: the scan SEES an import it should see`
- `atomCoverage derives its population from getKnownFlows and SYSTEM_ROLES, not from atomsForSeat` *(a mutation probe: break `atomsForSeat` and this suite must still report the same population — §4.5)*

**S-4 — `processDraftStore.test.ts`, `composer.test.tsx`**
- `absent, corrupt and unparseable are distinguished from empty`
- `a stored row that fails the CURRENT predicates is refused ON READ and reported, not absorbed`
- `id, proposedBy, proposedAt are store-minted — a payload value is ignored`
- `the composer refuses a clock-shaped state name, naming law 0.5`
- `the composer refuses a transition id that collides with the live catalogue`
- `the composer refuses a personal name in the prose`
- `statePreserving forces `to` into `from` at the form, not at the validator`

**S-5 — `processDraftCommand.test.ts`**
- `propose refuses an UNATTRIBUTED actor by name`
- `propose ADMITS a sample actor and the ledger row carries the SAMPLE marker`
- `approve refuses an UNATTRIBUTED actor by name`
- `approve refuses a SAMPLE actor by name — roster membership, not a prefix match`
- `approve ADMITS a synthetic non-sample RESOLVED actor` ⟵ **without this the lock deletes the lane instead of guarding it**
- `approve refuses when approver and proposer are the same person`
- `approve refuses a draft whose base version has moved`
- `approve refuses a draft with no guide in both locales`
- `approve refuses an unacknowledged warning, naming its key`
- `reject ADMITS a sample actor — the safe direction is always reachable`
- `record promotion refuses a malformed reference and does not move the draft`
- `every refusal head that names a person is owned by a key map` *(delegated to `personNamingRefusal.test.ts`, which re-derives the population)*

**S-7 — `flowgen.test.ts`**
- `the same draft generates byte-identically twice`
- `every generated flow module re-renders byte-identically from its draft`
- `the emitted module contains no coordinate and no layout import`
- `a new-flow draft emits a target stub AND a failing pending test`
- `a cascade link emits a resolver stub that THROWS, and a failing pending test`
- `the generated header names the draft id, the approval instant and the source sha, and no person`

### 11.2 Acceptance — one command per batch, and its expected output

| Batch | Command | Accepted when |
|---|---|---|
| S-1 | `npx vitest run src/services/transitions/stateLabels.test.ts` | 5 passing; and `npx vitest run -t "the key is the PAIR"` fails after the key is mutated to the bare state name |
| S-2 | `npm run gates` + browser QA at `/buyer/process-flows?flow=purchaseRequisition&tab=next-act` in EN and ID | the matrix renders; three `mine` cells on the requisition row for the default seat; screenshots delivered |
| S-3 | `npx vitest run src/services/transitions/draftValidation.test.ts flowGraph businessRoles surfaceable cascadeIntegrity` | all green **and** the known-good probe present; then, per §4.4, six mutation runs each reddening one **named** test |
| S-4 | browser QA: compose a replacement for `materialRequest` adding one state and one verb; save; reload | the draft survives reload; validation renders the findings; the diff names the added state and verb |
| S-5 | browser QA as a sample identity | propose succeeds and the row reads *"(SAMPLE)"*; approve is refused with the honest sentence; reject succeeds |
| S-6 | `node -e` round trip: export → import → export | the two exports are byte-identical; the importer re-mints the id and stamps |
| S-7 | `node scripts/flowgen.mjs <export> && npm run gates` | build green; the two pending tests **RED** for a new-flow draft; green for a replace-default draft with no new cascade |
| S-8 | `npx vitest run c1MethodSurface pinReach` | C1's three axes re-derived and equal to the document; V20 present and named in V19's pin-reach block |
| S-9 | `npx vitest run staleState dispatcher legality settleFaults` + the §8.3 seed census re-run | every in-flight document still resolves; the event carries `flowVersion` |

---

## 12 · Decisions the operator must make (recommendation first)

| # | Decision | Recommendation |
|---|---|---|
| **D1** | **Promotion mode:** (i) generated, reviewed code, or (ii) a runtime data-driven catalogue | **(i).** A hook is code, a cascade resolver is code, a target is code; moving an edge list into a table makes none of them data, and every guarantee this tree is trusted for lives in vitest over source. R3 §5.a priced (ii) at 3–5 batches plus a backend plus re-expressing every global gate. Revisit when Stage F gives the registry a durable home **and** the policy layer has a parameter schema — both, not either. |
| **D2** | **Terminal-reachability:** a refusal, or a declared-exception warning | **Warning, via the census.** Measured: as a refusal it refuses `advanceShipNotice` (5/5, by construction — the schema says `terminals: []` is a legal, meaningful answer) and `invoiceMatch` (2/5, substrate) **on day one**. A check that refuses two of the tree's own flows immediately is a check the first author disables. §4.2. |
| **D3** | **Per-document flow versions before Stage F:** P-1 only, P-1+P-2, or neither | **P-1 now, P-2 not yet.** `TransitionEvent.flowVersion` is cheap and the window closes when the sink becomes durable (C10 §6.4, *no retrofit*). P-2 changes the spine — 19 targets, the registry's key, four lookups and every surface — and is **unnecessary if the SE Team migrates in-flight documents at cut-over** (202 documents across 15 stores, §8.3). Decide the migration, and P-2 follows or disappears. |
| **D4** | **Sample identities:** the propose/approve asymmetry, or one rule for both | **The asymmetry: propose admits a sample person (marked), approve refuses one by name, reject admits one.** It makes the builder demonstrable today while the act that changes the platform waits for a real person, and *"the safest act is always reachable"* is already this tree's rule for the enforcement lane. One rule for both means either a demo that cannot be shown or an approval a fixture person can grant. §6.3. |
| **D5** | **Stored node coordinates for the composer** | **No, not in the first release.** `rankStates` produces a readable diagram for all 25 flows; coordinates cost a side table, a migration on every state rename, and a diff nobody can review. Add them if a real draft is unreadable — that is evidence, and today there is none. §2.5, §5.2. |
| **D6** | **Where the builder lives:** a tab on `/buyer/process-flows` (as ruled) or its own route | **The tab, as ruled.** The page already renders the catalogue, and a second route would duplicate `buildCatalogView` and drift from it. The tab body — not the tab — is gated on `processdraft:propose`, with a `HandoffNotice` otherwise, because `ENTRANCE-IS-THE-UNIT-01` says gate the mode rather than the door. §3.5. |
| **D7** | **Which intents may be PROMOTED in the first release:** `replace-default` only, or `new-flow` too | **`replace-default` only for promotion; `new-flow` composable and exportable from day one.** A new flow needs a `CommandTarget`, which is code, and the tree's standing ruling is that a flow ships in the same commit as its target — so `new-flow` promotion is a generator stub plus a reviewer writing the store reads, which works but is not a self-service path. Compose and export it; land it as an ordinary SE batch. §7.1 artefact 8. |
| **D8** | **Where the three `processdraft:*` atoms sit** | **`compliance`**, beside `role:grant`, `module:set`, `psl:cap-set` and `delivery:policy-set`. Whoever can re-author the machine can delete the hook that guards it, so procurement cannot hold them; `admin` and `buyer_all` are derived unions and follow. §6.1. |
| **D9** | **May a draft change an existing transition's `requiredRole`?** | **Yes, and the diff must name it as a governance change in its own section.** `atomCoverage` already refuses an atom no lane holds, so the dangerous case is not an *invalid* atom but a *valid* one that silently re-authorises an act — moving `invoice:pay` off `finance` would pass every gate. The remedy is not a refusal (a legitimate re-lane is real work) but **visibility**: the drawer renders *"this changes who may act"* with the before and after lanes, and the approval hook refuses unless `decisionReason` is non-empty on such a draft. |
| **D10** | **`POLICY_HOOK_DOCS.reads`:** derived from the hook bodies, or authored | **Derived, or omitted.** An authored `reads` is a comment that will be wrong within two batches (`COMMENT-AS-CONTRACT`). If the source scan over `bindPolicyHook`'s destructured ctx keys is more than the batch can carry, ship `descriptionKey` alone — an absent field is honest and a wrong one is not. §2.2. |

---

## 13 · Traceability

| Source item | Where it lands here |
|---|---|
| R3 §4.1 — the page renders (i) already, minus lanes | §3.1, §3.2 |
| R3 §4.2 — what is configurable at runtime, and the hook parameter gap | §9.2, §9.3, §9.4 |
| R3 §4.3 — the exposure table's four **no** rows (state labels, field labels, layout, grouping/name) | §2.1, §2.3, §2.5, §2.4 |
| R3 §4.4 — the guarantee wall, and which enforcers are parameters vs tests | §1.3, §4.1, §4.4 |
| R3 §4.5 — sizing (i)/(ii)/(iii) | S-1, S-2, S-3, S-4 |
| R3 §5.a — promotion (i) vs (ii) | D1, §7 |
| R3 §5.b — versioning: nothing carries a flow version; `FlowRegistry` refuses a second registration | §8.1, §8.2 |
| R3 §5.c — 202 in-flight documents, every one in a declared state | §8.3, D3 |
| R3 §5.d — the validation table: two pure, four tests, one missing | §4.1, §4.2, §4.3 |
| R3 §5.e — approval: the four existing mechanisms and the IdP wall | §6.1, §6.3 |
| R3 §5.f — SE owns storage and migration; the portal specifies the shape | §5.3, §8.2, §8.4 |
| R3 §5.g — P-1…P-5 | S-3 (=P-5), S-5 (=P-3), S-7 (=P-4), S-9 (=P-1/P-2) |
| R3 §6 decision 6 — promotion mode and whether P-1/P-2 are wanted | D1, D3 |
| Design 3 §5 — the R-A / R-B instruments and the V15 gate | untouched; a draft is validated by §4's library, and §5.2's composer refuses a client-minted identity pattern in a `requiredFields` name the same way V15's gate will refuse it in source |
| Design 3 B0 — the census header's stale *"NINE"* | §4.2 (S-3 deletes it if B0 has not) |
| Design 3 §7 — every hand-off design changes the catalogue the builder renders | no conflict: the builder reads `getKnownFlows()`, so every flow Design 3 adds appears with no edit here. **The one interaction: Design 3 retires `compliance` as a machine (D2, RULED), which removes a flow, a census row and C1 counts. If that lands after S-1, the state-label rows for `compliance.*` go with it — the bilateral gate is what makes that a red build rather than an orphan** |
| Design 5 Part B — the guide registry and the nine sections | §10, and §3.1's shared tab set |
| Design 5 §A.1.2 — every flow belongs to exactly one module | §2.4 (the builder's grouping **is** the module map) |
| Design 5 §A.4 — the governed-ledger pattern for a platform-wide setting | §6.1, §6.2 (the same `t_enforcement_set` shape) |
| C1 · C3 · C11 · C12 | §7.4 |
| C11 V15 (no client-minted document identity) | §6.1's promotion ruling — the person carries the commit reference; nothing mints one |
| C11 V19 (a pin states its reach) | §7.2, §7.4 (V20 must be named in V19's block) |
| C10 §6.2 / §6.3 / §6.4 | §5.3 (no attribution in a payload), §6.3 (roster membership, never a prefix), §7.4 (the event-shape window) |
| RFP | this is platform governance rather than a functional row; it serves the *configurable process* requirement the TMS pattern demonstrates, and it is the mechanism by which every later functional change to a lifecycle becomes reviewable rather than a code diff nobody outside engineering can read |

---

## 14 · Confirmation

**Pinned SHA:** `de101c67799f4f338796768981fed31fc9f0a229` (`main`, 2026-09-28 10:38 +0700). The previous drafts in this folder are pinned to `81c98403a83a674df80959f7d2290898ddd822fa`; this one is re-pinned one commit forward, and §0/§2 say which facts were re-measured because of it.

**How every derived figure in this document was obtained**, so each is re-runnable rather than quotable:
- `git archive de101c67… | tar -x` into the reviewer's scratchpad; `node_modules` reached by a **junction** to the working copy's, so nothing was installed and nothing in the repository was written.
- Two census scripts run with `vite-node` **inside that export** (`_census.ts`, `_census2.ts`, both in the scratchpad, neither in the repository): they import `src/services/transitions/index` so the registry self-registers, then derive from `getKnownFlows()`, `CASCADES`, `getRegisteredPolicyHooks()`, `SYSTEM_ROLES`, `AUTOMATION_ATOMS`, `rolesHolding`, `TENANCY_ANCHORS`, `TRANSITION_PURPOSE`, `WIRED_COMMAND_TARGETS` and `analyzeAllFlows`.
- **The cross-instrument control:** the census's transition total (**115**) and wired-target total (**19**) agree with `docs/contracts/C1-methods.md`'s pinned figures, which are derived by a different instrument (`c1MethodSurface.contract.test.ts`, over the AST). Two instruments, same answer.
- ⚠️ **AND THE FIRST INSTRUMENT WAS WRONG AND IS REPORTED RATHER THAN QUIETLY REPLACED.** A regex parse of the 25 `*.flow.ts` files was written first and **failed on three files**, because `purchaseOrder.flow.ts` declares its states as `POStatus` **enum members** rather than string literals — so a literal-scanning parser sees a flow with no `initial`. It was abandoned for the runtime derivation above. This is `RESOLVE-NON-LITERAL-IDS-01` in its own house: a scan that matches literals reports on its matcher, and had it merely *under-counted* instead of crashing, every figure in §2.1 would have been wrong in the flattering direction.
- The terminal-reachability table (§4.2) uses the same edge set `buildFlowGraph` uses for `exits` (movement edges plus the `settlesTo` advance), so the specified check and the shipped analyzer cannot disagree about what a way out is.
- V15's re-measurement for the Design 3 ruling: `grep` for governed-number template construction in `src/` outside fixtures and tests returns **comments only** for `CTR-`, and **nothing at all** for `PO-` / `GR-` / `INV-` / `SA-` (the bilateral control).

**Nothing was written in the repository.** Reads came from the `git archive` export; the only commands that touched the working copy were `git rev-parse`, `git log` and `git archive` (all read-only), plus a `node_modules` **junction created in the scratchpad pointing INTO** the working copy — a link in the scratchpad, not a write in the repo. No `git checkout`, no `git stash`, no branch, no commit, no file written under `~/paragon-supplier-portal`. The stale sibling `~/projects/paragon-supplier-portal` was never touched. Everything authored today is in `C:\Users\<operator>\review-drafts\`.

*Source file: `C:\Users\<operator>\review-drafts\DESIGN_6_FLOW_BUILDER.md` (2026-09-28).*
