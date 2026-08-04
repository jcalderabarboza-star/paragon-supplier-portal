# C9 — the COMPLETE required-field list, DERIVED

> ⚠️ **GENERATED FROM `src/services/sdc/materialMasterRef.types.ts`. DO NOT EDIT BY HAND.**
> It is rendered by `src/services/sdc/__tests__/deriveC9FieldList.ts` and pinned by
> `materialMasterRef.contract.test.ts`: if a field reaches the shape without reaching this
> list, the floor fails. Regenerate with `npx vitest run -u`.

> ⚠️ **THIS IS NOT A SUMMARY OF C9 AND MUST NOT BE RATIFIED IN PLACE OF IT.**
> [`C9-material-master-ref.md`](./C9-material-master-ref.md) is the authority and carries the
> normative content — the invariants, the rulings, the open decisions and the non-conformances.
> **This file carries one thing: every field of the shape, exactly as the module declares it**, so
> that a ratification can be checked against the ARTIFACT rather than against a description of it.
> **A COUNTERPARTY RATIFYING A SUMMARY HAS NOT RATIFIED THE CONTRACT** (C9 §7.11, A-9) — and this
> document exists because that is what happened.

**Send this alongside C9, never instead of it.**

## Counts — derived, so they cannot be quoted stale

| | Derived |
| --- | --- |
| Interfaces | **5** |
| Fields, total | **22** |
| Fields, REQUIRED | **21** |
| Fields, optional | **1** |
| Closed vocabularies | **5** |

## 1. Every interface, every field

### `MaterialCodeSpace`

| Field | Required | Type |
| --- | --- | --- |
| `spaceId` | **REQUIRED** | `string` |
| `party` | **REQUIRED** | `MaterialRefParty` |
| `liveness` | **REQUIRED** | `Tier` |
| `description` | **REQUIRED** | `string` |

### `MaterialRef`

| Field | Required | Type |
| --- | --- | --- |
| `spaceId` | **REQUIRED** | `string` |
| `materialCode` | **REQUIRED** | `string` |

### `AdjudicationProvenance`

| Field | Required | Type |
| --- | --- | --- |
| `method` | **REQUIRED** | `AdjudicationMethod` |
| `evidenceLiveness` | **REQUIRED** | `Tier` |
| `decidedBy` | **REQUIRED** | `string` |
| `decidedOn` | **REQUIRED** | `string` |
| `sourceOfTruth` | **REQUIRED** | `string` |
| `routeToResolution` | **REQUIRED** | `string` |
| `note` | optional | `string` |

### `MaterialMasterRefRow`

| Field | Required | Type |
| --- | --- | --- |
| `paragon` | **REQUIRED** | `MaterialRef` |
| `somo` | **REQUIRED** | `MaterialRef` |
| `grain` | **REQUIRED** | `MaterialGrain` |
| `verdict` | **REQUIRED** | `MaterialRefVerdict` |
| `confidence` | **REQUIRED** | `MaterialRefConfidence` |
| `provenance` | **REQUIRED** | `AdjudicationProvenance` |

### `MaterialRefJoinPolicy`

| Field | Required | Type |
| --- | --- | --- |
| `joinableGrains` | **REQUIRED** | `readonly MaterialGrain[]` |
| `minimumConfidence` | **REQUIRED** | `MaterialRefConfidence` |
| `allowSimulatedEvidence` | **REQUIRED** | `boolean` |

## 2. Every closed vocabulary, every member

### `MATERIAL_REF_PARTIES` — 2 members

- `'PARAGON'`
- `'SOMO'`

### `MATERIAL_GRAINS` — 2 members

- `'substance'`
- `'specification'`

### `MATERIAL_REF_VERDICTS` — 3 members

- `'EQUIVALENT'`
- `'NOT_EQUIVALENT'`
- `'ADJUDICATED_UNRESOLVED'`

### `MATERIAL_REF_CONFIDENCES` — 3 members

- `'CERTAIN'`
- `'PROBABLE'`
- `'TENTATIVE'`

### `ADJUDICATION_METHODS` — 3 members

- `'MASTER_DATA_MATCH'`
- `'OPERATOR_ADJUDICATED'`
- `'PROPOSED_BY_INSPECTION'`


## What this list deliberately does NOT carry

**The invariants are not fields, and they are the part a field list cannot hold.** They live in C9
and in the module's docblocks, and each one is normative:

- A row whose `evidenceLiveness` is not `'LIVE'` **must not** be `'CERTAIN'` (C9 §4.1).
- A row whose verdict is `'ADJUDICATED_UNRESOLVED'` **must not** be `'CERTAIN'`, and **no policy
  may ever make it joinable** (C9 §5.3).
- A row that is not `'CERTAIN'` **must** name a real `routeToResolution`; `'NONE'` belongs only
  to a row with nothing left to settle (C9 §4.2).
- `allowSimulatedEvidence` **must** be `false` for any commercial consumer (C9 §4.1).
- A pair carries **zero, one or two** rows — never two at the same grain (C9 §5.1).
- `materialCode`, `spaceId`, `sourceOfTruth` and `routeToResolution` are **strings that may
  never be parsed for meaning by either party** (C9 §3, §3.1a).

**If you are checking a shape against this list, you have checked the shape. You have not yet
checked the contract.**
