# C6 — Planning doctrine

The contract that freezes **PLANNED-as-axis** before any grid engine exists, so the
G0.2 engine choice (FORK-G1) is evaluated **against** this doctrine and can never bend it.

**Status:** CONTRACT · authored G0.1 (FORK-3, machine-harvest from code-truth + thin prose)
· additive, docs-only · generated at `main` (Canon True-Up, #66). No product code — the
grid engine and the `PlanGrid` primitive are G0.2/G1, gated on **FORK-G1 (OPEN)**.

**Grounding:** `docs/Stage_G_Grid_Planning_Layer_Plan_v1.md` §2 (the adjudicated keystone) +
`docs/Grid_Planning_Layer_Investigation_2026-07-14.md`. Every seam this contract binds to is
cited `file:line` from the shipped tree — real code, not intended code.

**Load-bearing rule (the whole contract in one line):** *"Planned" is orthogonal to
"live."* A grid cell carries **two independent markers** — its **source tier**
(LIVE/SIMULATED/SPEC, registry-derived) and its **plan state** (committed / PLANNED). These
never conflate; no new liveness tier is added for planning.

---

## Tier vocabulary — two axes, do NOT collapse

This document uses **two** distinct tier vocabularies. They measure different things and
must never be read as one.

| Vocabulary | Values | What it measures | Authority |
|---|---|---|---|
| **Contract tier** (this package) | LIVE / RESERVED / SPEC | Does the *seam* exist in code today? | README legend |
| **Source tier** (the planning grid, per cell) | LIVE / SIMULATED / SPEC | Is the *data under a cell* real? | `liveness()` — `src/services/liveness/registry.ts:137` |

The honesty matrix (§5) is built on the **source tier** (runtime `liveness()`), because a
grid cell renders a per-cell data marker. Contract-tier RESERVED (a named-but-unbuilt seam)
is a *different* concept from runtime SIMULATED (a real-shaped but unwired data source) — do
not substitute one for the other.

---

## 1. PlanDraft shape — the client-side plan document

A **PlanDraft** is the proposed-values document a user composes over live seam data before
committing. It is held in a dedicated client-side plan store and is, by contract:

- **NEVER written through `IDataService`** (`src/services/data/types.ts:1205` — the read/write
  service seam). A plan is not persisted state; it is a pre-commit working set.
- **NEVER placed in the TanStack Query cache.** The query cache holds seam reads only
  (`useServiceQuery`, `src/services/query/useServiceQuery.ts:22-38`); the plan overlay is a
  separate concern the grid renders *on top of* those reads.
- **NEVER persisted to localStorage.** The codebase deliberately deleted its localStorage
  overlays; that pattern stays dead. A PlanDraft is session-scoped and disappears on reload.

**Where it lives — the harvested neighbor pattern.** The plan store follows the house
client-state pattern of `CurrentIdentityContext` (`src/context/CurrentIdentityContext.tsx`):
`createContext` + a `Provider` holding state in `useState`/`useReducer` (:35-56) + a `useX()`
hook that throws outside its provider (:58-65). It lives beside `CurrentIdentityContext` and
`AdaptiveContext` — **but differs in one deliberate way**: `CurrentIdentity` carries an
injectable `IdentitySource.save()` that *does* persist (:16-19, :43-49); the PlanDraft store
**drops all persistence** — no `save`, no `source`, no localStorage. Same provider/hook
shape, zero durability.

### Row model

```
PlanDraftRow {
  seamRef:        <stable id of the seam row this overlay is anchored to>   // REQUIRED
  plannedFields:  Record<field, proposedValue>    // the edited cells, overlay-only
  planState:      'PLANNED' | 'PUSHING' | 'FAILED'
  failureReason?: string                          // set when a push leaves the row PLANNED/FAILED
}
```

### `seamRef` is the STRUCTURAL anti-`extraRfqs` guarantee

`seamRef` is **required** and must point at a real seam row. This is the *mechanism*, not a
convention: **a PlanDraft entry cannot exist without anchoring to a seam row**, so it can
never be minted as a standalone fabricated peer and spread into a seam-backed list.

This structurally outlaws the named anti-pattern — the now-**RETIRED** `extraRfqs`
client-fabrication that once lived in `src/pages-v2/BuyerSourcing.tsx`:

```ts
// HISTORICAL — retired in PR #77; kept here only to name the shape the invariant bans.
const [extraRfqs, setExtraRfqs] = useState<RFQ[]>([]);   // client-fabricated rows
id: `rfq-new-${Date.now()}`, …                           // a peer minted with no seam identity
const rfqs = useMemo(() => [...extraRfqs, ...baseRfqs], …); // spread INTO the seam list
```

`extraRfqs` were programmatically indistinguishable from seam-backed `baseRfqs` once spread.
A PlanDraft row cannot do this: it has no independent identity of its own — only a `seamRef`
pointer plus overlay fields — so there is nothing to spread into the seam list. **This is
resolved:** RFQ creation now rides `t_rfq_create` on the dispatcher (PR #77), the board reads
the seam alone, and `extraRfqs` is deleted. The `seamRef` mechanism keeps the door shut.

---

## 2. Overlay rule — `seamRow + plannedOverlay`, never merged

The grid renders **`seamRow + plannedOverlay`**. A planned value is ALWAYS both:

- **visually distinct** — a PLANNED cell is marked (never rendered identically to a committed
  seam value), and
- **programmatically distinct** — the overlay is held in a **`seamRef`-keyed map**, separate
  from the seam-backed arrays the read hooks return. It is **never merged into** those arrays.

**The structural test (assertable at G1):** the seam list the grid reads
(`useServiceQuery` output, `useServiceQuery.ts:33-37`) is never mutated to carry planned
values; a planned value is only ever reachable by looking up `plannedOverlay[seamRef]`. If a
planned value can be found *inside* a seam array, the invariant is broken. This is the
inverse of the retired `extraRfqs` `[...extraRfqs, ...baseRfqs]` merge (BuyerSourcing, PR #77).

---

## 3. Push pipeline — the ONLY exit from PLANNED

Committing a plan iterates its rows into real command dispatches. There is **no other exit
from PLANNED**: a planned value becomes committed only when the seam itself agrees, after a
successful dispatch + invalidation re-read.

### The pipeline

For each PLANNED row, in order:

1. **Dispatch** through the write seam
   (`ICommandService.dispatch`, `src/services/data/types.ts:1078-1080`):
   ```ts
   await svc.commands.dispatch(scope, { transitionId, entity, entityId, payload })
   ```
   The dispatcher applies the FULL validation chain unchanged
   (`src/services/transitions/dispatcher.ts:4-14`): transition-exists + CommandTarget →
   `QueryScope` (scope enforced on every command exactly as reads) → `requiredRole` →
   legality (`from` includes currentState) → `requiredFields` → `policyHooks` → apply +
   emit one `TransitionEvent` (DR-10 audit). **The grid gets no validation shortcut** — it is
   the same seam `usePurchaseOrderConfirm` / `useRfqAward` already use
   (`src/services/query/commandHooks.ts:50-67, :139-156`).
2. **On non-failed outcome** → invalidate the current scope's reads
   (`useInvalidateProcurement`, `commandHooks.ts:29-38`: predicate-invalidation keyed by
   `scopeKey`) → the seam re-reads → **the overlay clears for that row because the seam now
   agrees.** The planned value is gone precisely because it is no longer *planned* — it is
   committed seam truth.
3. **On failure** → the row **stays PLANNED with `failureReason` attached** (see §3.1).

### 3.1 Both failure channels are BINDING

The dispatcher reports failure through **two distinct channels**
(`dispatcher.ts:16-18`) and the pipeline MUST handle both:

| Channel | Source | How it surfaces |
|---|---|---|
| **Thrown `DataError`** | Hard authorization failure — `SCOPE_DENIED` / `NOT_FOUND` (`dispatcher.ts:197, :208, :211`) | The `await dispatch(...)` **rejects** — the pipeline must `catch`. |
| **`result.status === 'failed'`** | Domain rejection — `ILLEGAL_TRANSITION`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`, `POLICY_REJECTED` (`dispatcher.ts:217, :222, :228, :243`) | Resolves normally with `status:'failed'` + `reason` — the pipeline must **test the status**. |

**Contract:** a row stays **PLANNED with reason attached regardless of which channel the
failure arrives through.** The pipeline catches throws AND tests `result.status`; it never
treats a resolved promise as success without checking status (mirrors the house guard
`if (result.status !== 'failed') invalidate(scope)`, `commandHooks.ts:64`). Carried as an
assertable invariant in §6.

### 3.2 No optimistic writes

**No `onMutate`, no optimistic cache writes.** The overlay clears only *after* the seam
re-read confirms the commit — never before. This is already the house rule: no mutation hook
in `commandHooks.ts` uses `onMutate`; every one invalidates in `onSuccess` only. The grid
inherits it, it does not introduce it.

---

## 4. Causation-grouped audit — one push, one correlation (INTENT)

A plan push is semantically ONE act of intent that fans out into N row-dispatches. The
durable audit-of-why should group those N events under **one `causationId`**, with the plan
rationale carried in the dispatch payloads — the same grouping the RFQ-award cascade already
produces (`events.ts:23-31`; `dispatcher.ts:170-179, :276-297`: a cascaded transition carries
the source's `correlationId` as its `causationId`, grouping the fan-out **without** collapsing
each transition's own 1:1 `correlationId` / settle-ability).

### G0.1-FIND-01 — OPEN. The public seam cannot group a plan push today.

This clause states **intent**, not an existing capability. Harvested truth:

- `causationId` is set **only inside the dispatcher's private cascade path** — the internal
  `dispatch(scope, input, causationId)` third argument (`dispatcher.ts:170`). It is **not**
  on the public seam: `ICommandService.dispatch(scope, input)`
  (`src/services/data/types.ts:1080`) accepts **no** caller-supplied correlation.
- Therefore N independent `svc.commands.dispatch(...)` calls from a plan push each mint their
  own unrelated `correlationId` (`dispatcher.ts:151`) and **cannot be grouped** under one
  causation today.

**Deferral (the seam extension is a G1/G2 dependency), the honest options:**
1. **Caller-supplied correlation** — extend `ICommandService` so a caller passes a group id
   the dispatcher stamps as `causationId` on each event. Additive to the seam.
2. **Model-push-as-cascade-source** — a single `t_plan_push` source transition whose cascade
   resolver (`dispatcher.ts:115`, `CascadeContext`) fans out the row-commands, reusing the
   existing causation grouping with zero seam change.

The **G2 `Plan` canonical entity** (Stage G plan §4) is the durable-audit end state: pushes
grouped under one plan correlation persisted through `IDataService`, not a client overlay.

**This contract does NOT write the grouping as if it exists on the public seam.** The clause
is marked intent-plus-deferral; G0.1-FIND-01 stays OPEN in §7. The contract honestly marks
its own not-yet-buildable clause — that is the guard working.

---

## 5. Honesty matrix — source tier × plan state

Two **independent** axes (LIVENESS-DATASOURCE-01). The **source tier** is the runtime
`liveness()` value for the cell's capability (`registry.ts:137`, `Tier = LIVE|SIMULATED|SPEC`
at `registry.ts:45`); the **plan state** is committed vs PLANNED. The required cell marker is
the **conjunction** — neither axis is allowed to mask the other.

| Source tier ↓ / Plan state → | **committed** (seam value) | **PLANNED** (overlay value) |
|---|---|---|
| **LIVE** (real wired source; `isLive` two-gate green, `registry.ts:178`) | Live committed value — no marker beyond the normal LIVE affordance. | **PLANNED marker** over a live base — "proposed, not yet committed." |
| **SIMULATED** (real-shaped, unwired/fixture, or harvest-pending) | **SIMULATED marker** (`<LivenessPill>` reads the registry). | **BOTH markers** — SIMULATED (data isn't real) **and** PLANNED (value isn't committed). Neither is dropped. |
| **SPEC** (zero backend; `registry.ts:43`) | **SPEC marker** — even further from truth than SIMULATED; no seeded capability is SPEC yet, but the cell must render SPEC, not SIMULATED. | **SPEC + PLANNED** — a proposed value over a data domain with no backend at all. The strongest honesty warning. |

**Binding cells:**

- **Real command over SIMULATED data still renders SIMULATED.** A grid that dispatches real,
  fully-validated commands (§3) over a SIMULATED-tier capability does **not** flip to LIVE.
  Liveness is gate-1 (wiring) AND gate-2 (real data landed) — `isLive` (`registry.ts:178`);
  executing a command is neither gate. The two-gate discipline holds inside the grid.
- **SPEC × PLANNED is NOT collapsed into SIMULATED × PLANNED.** SPEC = zero backend is a
  distinct, stronger warning than SIMULATED = real-shaped-but-unwired. The grid renders three
  source tiers, never two.
- **No client-minted derived value is ever presented as platform truth.** A score,
  should-cost, projection, or what-if total computed in the grid is a client artifact — it is
  marked as such (client-computed), never rendered as a committed seam value. (Consistent with
  F0.3-FIND-01: quote scores stay SIMULATED until the scoring primitive lands; the grid does
  not fabricate them.)

---

## 6. Invariants — assertable statements for G1 test-wiring

Each is written so a G1 vitest can bind to it directly.

1. **overlay-never-merged (seamRef-keyed).** A planned value is reachable only via
   `plannedOverlay[seamRef]`; it is never present inside the seam array returned by the read
   hook. (Inverse of the retired `extraRfqs` merge in BuyerSourcing, PR #77.)
2. **push-only-exit.** A row leaves PLANNED **only** via a successful `svc.commands.dispatch`
   + invalidation re-read (§3). No code path clears PLANNED without a non-failed command
   outcome for that row.
3. **both-failure-channels-stay-PLANNED.** A row stays PLANNED with `failureReason` set
   whether the failure arrives as a thrown `DataError` **or** a `status:'failed'` result
   (§3.1). A test drives each channel and asserts the row is still PLANNED afterward.
4. **no-fabricated-derived-value.** No client-computed score/total/projection is rendered as a
   committed seam value; every such value carries a client-computed marker (§5).
5. **two-gate-holds.** A cell's source-tier marker is the registry's `liveness()`/`isLive`
   value (`registry.ts:137, :178`) — never a value derived from the fact that a command
   dispatched. Real command over SIMULATED data still renders SIMULATED.
6. **reason-gated-override (C6-LOCK §8.3).** An override (accepted ≠ suggested) with an empty
   reason CANNOT dispatch — `overrideBlocked` true ⇒ no push. A test drives an empty-reason
   override and asserts no command fires (the load-bearing gate).
7. **computed-columns-locked (C6-LOCK §8.1-8.2).** No computed / derived value (score,
   what-if, estimated value) is editable; the accepted quantity is the sole editable field.
   A test asserts the governed surface exposes exactly one editable field per row.
8. **override-decision-audited (C6-LOCK §8.3).** A committed override's `t_pr_create` DR-10
   event carries the opaque `decision` (suggestedQty→acceptedQty + reason + wasAdjusted)
   VERBATIM, alongside the actor + ts already on the event.

---

## 7. Decision register (C6)

| ID | Decision | Status |
|---|---|---|
| G-KEYSTONE | PLANNED = orthogonal axis, not a registry tier; overlay never merged; push-only exit | ADJUDICATED (Stage G plan §2) |
| C6-PLANDRAFT | PlanDraft outside `IDataService` / query cache / localStorage; `seamRef`-anchored (structural anti-`extraRfqs`) | CONTRACT (§1) |
| C6-PUSH | Push-to-execute is the only exit; both failure channels leave the row PLANNED-with-reason; no optimistic writes | CONTRACT (§3) |
| C6-HONESTY | Three source tiers × two plan states; SPEC×PLANNED explicit; real-command-over-SIMULATED renders SIMULATED | CONTRACT (§5) |
| **G0.1-FIND-01** | One-`causationId`-per-push is INTENT; the public `ICommandService` seam accepts no caller correlation today. Seam extension (caller-supplied correlation OR model-push-as-cascade-source) is a **G1/G2 dependency**. | **OPEN** (§4) |
| FORK-G1 | Grid engine + license posture + formulas IN/OUT | OPEN — resolved by the G0.2 scorecard (lean: AG Grid Enterprise, formulas OUT) |
| **C6-LOCK** | Formulas locked; accepted qty the single editable field; every override reason-gated + authored, commits via `t_pr_create`, DR-10 `decision` opaque/verbatim | **CONTRACT** (§8, G1.2b) |

---

## 8. Locked-override rule (C6-LOCK)

Recorded and first-implemented together at G1.2b (doctrine + code land in one PR, provably
consistent). The plan grid lets a human touch exactly ONE value; everything else the platform
authored is read-only, and the one editable value is a GOVERNED decision. Three sub-rules, which
the SE Team inherits as a **HARD rule** (not a preference). Roles, not names.

**8.1 Formulas are locked.** Every computed / derived value — the AI composite, a what-if
scenario score, any platform-computed total — is READ-ONLY, always, by every path. No user
edits a formula or a computed result. The what-if overlay re-weights for VIEWING only and never
merges (§2). This forecloses the "user-authored math presented as platform truth" failure: there
is no writable computed value to author.

**8.2 Accepted quantity is the single editable field.** On an intake line a human may adjust the
accepted quantity up or down from the suggested quantity. That is the ONLY write a human makes to
a requirement's substance. Producer-authored context (material, lane, segment, estimated value)
stays read-only.

**8.3 Every override is reason-gated and authored.** An override (accepted ≠ suggested) is a
GOVERNED DECISION:

- a non-empty **reason** is required BEFORE it can commit — no reason, no dispatch
  (`overrideBlocked` true ⇒ no push; the load-bearing gate, invariant 6);
- it commits by dispatching **`t_pr_create`** — there is **no "adjust" verb**, so the override
  rides the single push (one mutation path; the push is the only exit from PLANNED, §3). An
  independent adjust-event would need a forbidden new verb;
- the DR-10 **`TransitionEvent`** records **actor + timestamp** (already on the event) **+
  suggestedQty→acceptedQty + reason + wasAdjusted**, carried in an optional **`decision`** field
  the dispatcher forwards **VERBATIM** — opaque, never interpreted or validated, exactly as
  `causationId` is (`events.ts:23-31`). This is **reuse of the DR-10 audit, NOT a new event
  type**, and it is orthogonal to G0.1-FIND-01 (that clause is about causation *grouping*; this
  is one event's provenance).

Accept-as-suggested is not an override (accepted === suggested): it needs no reason and carries
no `decision`. A `source:'SOMO'` line whose accepted qty a human adjusts is still a SIMULATED ×
PLANNED render (LIVENESS-DATASOURCE-01) — the human adjusted a **sample** requirement; pushing it
mints a Draft that stays simulated, **never a live procurement instruction**.

**As-built (G1.2b):** the gate + payload + decision are pure functions
(`src/pages-v2/plan-grid/planGridModel.ts` — `overrideBlocked` / `buildQtyDecision` /
`buildPrCreatePayload` / `applyPushResult`); the governed surface is **plain DOM** so the
reason-gate is headless-provable (`plan-grid/IntakePushPanel.tsx`); the push is
`usePurchaseRequisitionCreate` (`services/query/commandHooks.ts`) through the G1.1
`purchaseRequisition` target; and the opaque carrier is `CommandDecision`
(`services/data/types.ts`) forwarded by `dispatcher.ts:143-166` onto the `TransitionEvent`
(`transitions/events.ts`).

---

## Provenance

Generated FORK-3 (machine-harvest from code-truth + thin connecting prose) at `main` #66.
Every seam cited traces to a `file:line` in the shipped tree:
`src/services/data/types.ts` (`ICommandService` :1078-1090, `IDataService` :1205),
`src/services/transitions/dispatcher.ts` (validation chain :4-14, failure channels + causation
:151-297), `src/services/transitions/events.ts` (`TransitionEvent` / causation :14-46),
`src/services/query/commandHooks.ts` (dispatch+invalidate pattern :29-156),
`src/services/query/useServiceQuery.ts` (`scopeKey` read pattern :19-38),
`src/services/liveness/registry.ts` (`liveness`/`isLive`/`Tier` :45-184),
`src/context/CurrentIdentityContext.tsx` (client-state provider pattern :35-65),
`src/pages-v2/BuyerSourcing.tsx` (the `extraRfqs` anti-pattern — RETIRED in PR #77; RFQ
creation now rides `t_rfq_create` on the dispatcher). §1-7 were
authored pre-grid (FORK-3 harvest); §8 (C6-LOCK) is recorded at **G1.2b** alongside its first
implementation — the grid product code now exists (`src/pages-v2/PlanGrid.tsx` +
`plan-grid/*`, G1.2a/b), and §8's as-built block cites it directly.
