# C11 — The invariant pointer

**Status:** CONTRACT · **first issue, 2026-09-10**, pinned bilaterally by
`src/services/contracts/__tests__/c11Invariants.contract.test.ts` against
code-truth at `main`.

**Number derived, not chosen.** `C11` is the successor of the occupied set read
off `docs/contracts/` itself — filenames `C1`…`C10`, contiguous, max `10`. No
prose anywhere in the repo reserved `C11` (`grep -c '\bC11\b'` over `docs/`,
`src/` and `CLAUDE.md` returned **0**; the same instrument returns **181** for
`C10`, which is the control that says it can see a taken number). The
derivation is re-runnable and the pin asserts what remains TRUE after it: the
numbering is CONTIGUOUS and `11` is a member of it.

⚠️ **THE PIN ORIGINALLY ASSERTED `11` WAS THE MAXIMUM, AND C12 FIRED IT ON THE
DAY C12 LANDED.** That was a claim about the corpus staying this size, not about
this document — and it turned a correct file red for a correct reason. A
next-free-number derivation is true at issue and false the moment the corpus
grows, which is a thing this corpus exists to make easy. Contiguity is the half
that does not decay, and a gap in it means a contract was skipped or deleted.

---

## What this document is

Every other contract in this corpus describes a **surface** — methods, schemas,
events, seams. This one describes the **properties that must remain true
underneath any of them**, and for each property it names **the thing that
fails the build when it stops being true**.

⚠️ **"ENFORCED" HERE MEANS THE BUILD FAILS. IT DOES NOT MEAN SOMEONE AGREED.**
The model is `ExternalFactOwner` (#311): a boundary that had been prose became
`type ExternalFactOwner = 's4hana' | 'tms' | 'bank'`, and
`externalFactOwner.test.ts` holds the union and its uses bilateral in both
directions. Before that change the rule was true because people remembered it.
After it, an act that names an owner outside the union does not compile, and an
owner nobody uses reddens the suite. **That is the standard every row in the
ENFORCED groups below is held to, and the three rows that cannot meet it say so
on their own line.**

## How to read the table

| Class | Meaning |
|---|---|
| `FACTORY` | A **conformance factory** parametrised over an implementation. **You can run this against your backend.** Add a sibling of `*.mock.test.ts` that passes your service; change nothing else. |
| `GATE` | A gate over **this tree**. It proves the property holds *here*. It says nothing about your implementation — you must assert it yourself. |
| `TYPE` | Enforced by the TypeScript type system, so it **travels** to any consumer that compiles against these types. |
| `NOT ENFORCED` | Prose. No instrument. The row states this in its own words. |

**Assertion** cites an exact `it(...)` title. The pin asserts the file exists
and that the title is present in its bytes, so **retiring an enforcer reddens
this document** rather than leaving a promise nobody keeps.

---

## The invariants

| # | Invariant | Class | Enforcer | Assertion |
|---|---|---|---|---|
| **V1** | **Tenancy isolation.** A supplier scope reaches only its own rows; a buyer scope is a superset; a cross-tenant record read fails with `SCOPE_DENIED` rather than returning empty. | `FACTORY` | `src/services/contracts/conformance/scoping.ts` | `supplier requesting another supplier record by id throws DataError(SCOPE_DENIED)` |
| **V2** | **A refusal is not an existence oracle.** Across a tenancy boundary the refusal for a row that exists and one that does not must be indistinguishable — same kind, same message. A refusal that varies by existence is a read primitive. | `FACTORY` | `src/services/contracts/conformance/scoping.ts` | `a supplier commanding a non-existent entity is denied (no existence leak)` |
| **V3** | **Authorisation is atom-based and has no fallback.** A scope carrying no `businessRoles` is REFUSED, never widened to a persona; an unknown role grants nothing rather than everything. | `FACTORY` | `src/services/contracts/conformance/dispatch.ts` | `a scope with NO businessRoles is refused, not silently widened` |
| **V4** | **Segregation of duties is mutual.** Where two lanes are separated, the separation holds in both directions — it is not a single-sided restriction on the weaker lane. | `FACTORY` | `src/services/contracts/conformance/dispatch.ts` | `and the segregation is MUTUAL — finance cannot award an RFQ` |
| **V5** | **`expectedState` is an OPT-IN compare-and-set.** Supplied, a mismatch refuses `STALE_STATE` naming both states; omitted, nothing changes. Adding the field must never alter an existing caller. | `FACTORY` | `src/services/contracts/conformance/dispatch.ts` | `OMITTING expectedState changes nothing — the precondition is opt-in` |
| **V6** | **Refusal precedence is ordered, and the order is load-bearing.** Role is checked before state, state before legality. A caller without the atom must not learn the document's state; a stale caller must be told *why*, not merely that the act is illegal. | `GATE` | `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts` | `the pipeline’s step ORDER matches the refusal precedence the tree declares` |
| **V7** | **Settlement is scope-gated on the write door.** A foreign scope advances no entity, mints no external reference, and records no audit act. All three, not the first alone. | `GATE` | `src/services/transitions/settleScopeGate.test.ts` | `a FOREIGN settle does not advance the entity and does not mint a ref` |
| **V8** | **Creation is owner-gated where the target declares it.** A creation whose owner cannot be resolved is DENIED rather than admitted on the grounds that there is nothing to compare. | `GATE` | `src/services/transitions/creationOwnerGate.test.ts` | `DENIES a buyer creation when the owner cannot be resolved (owner null)` |
| **V9** | **No clock-projected state is ever stored** (law 0.5). A state a clock decides is derived at read and is absent from every transition table, as a state AND as a target. | `GATE` | `src/lib/projectionGate/projectionGate.test.ts` | `every display state is absent from its flow, as a state AND as a target` |
| **V10** | **No stored difference.** A value that is the difference between two dates is computed at read from an injected instant, never stamped onto a record — a stamped difference is correct for exactly one day. | `GATE` | `src/lib/projectionGate/dayCounts.test.ts` | `every DERIVED day-count field is DECLARED (no field slips in unclassified)` |
| **V11** | **Every stored field has a reader or a stated reason.** A field on a shipped DTO that nothing outside the fixtures reads is either deleted or carries its reason in a bilateral allowlist that can only shrink truthfully. | `GATE` | `src/lib/storedFieldGate/storedFieldGate.test.ts` | `⚠️ BILATERAL — the allowlist is EXACTLY the flagged set` |
| **V12** | **The actor is never fabricated.** No code path constructs a RESOLVED attribution while no person is authenticated; acts are recorded against `UNATTRIBUTED: NO_PERSON_IN_SESSION` and the surface says so. | `GATE` | `src/context/simUsrNamespace.test.ts` | `the namespace is still unused anywhere in src/` |
| **V13** | **`DataError` is the read-side failure channel and its shape is fixed** (DR-4). It is an `Error`, survives `instanceof` across the module target, and carries no `cause` — so `in` cannot report one that is not there. | `GATE` | `src/services/data/dataError.contract.test.ts` | `still is an Error, and still survives instanceof across the target` |
| **V14** | **Every external fact names its owner from a closed union.** An act reporting a fact this platform does not own declares WHICH system reports it, drawn from `ExternalFactOwner`; no non-external act carries an owner, and no member is decorative. | `TYPE` | `src/services/transitions/externalFactOwner.test.ts` | `every external-fact act names an owner from the closed set` |
| **V15** | **The portal never mints a document identity — S/4 owns it.** PO, GR, invoice and contract numbers, and the vendor master, are SAP's. We carry identity; we do not assign it. ⚠️ **THIS IS NOT ENFORCED.** No gate reads document-number construction, and the tree currently CONTRADICTS this row in one place — `BuyerContracts.tsx` mints `CTR-${year}-${n}` client-side (`CTR-FABRICATION-01`, filed, unscheduled). **What would enforce it:** a source gate over identifier construction, refusing a client-side mint of any governed document number — buildable today, and the sibling of the gate that already retired solid buttons. It is H2, not this batch. | `NOT ENFORCED` | — | — |
| **V16** | **Authentication is bought; authorisation is ours.** An identity provider supplies a `SubjectBinding` and nothing else — it never mints a `personId`, and it never becomes a second authorisation path. ⚠️ **THIS IS NOT ENFORCED.** It constrains a system that does not exist yet, so there is nothing to gate. **What would enforce it:** nothing, until an IdP lands; at that point a gate asserting `personId` is portal-minted and never equal to a subject becomes buildable. Stated in C10 §3.2 / §5.1 / §7.1 and deliberately restated here, because a reader of this table must not infer it is checked. | `NOT ENFORCED` | — | — |
| **V17** | **A refusal is a first-class result, not an exception.** A business refusal is a value the caller can branch on; exceptions are reserved for programmer error and transport failure. ⚠️ **THIS IS NOT ENFORCED** as a principle — the factories above assert individual refusals COME BACK as results, which is the behaviour, but nothing asserts that no business path throws. **What would enforce it:** a gate over the dispatcher's own source refusing a `throw` outside the argument-validation prologue. Cheap, and unbuilt. | `NOT ENFORCED` | — | — |
| **V18** | **An ingress replay raises no second act.** A command carrying an `idempotencyKey` already seen under the same tenancy returns the FIRST result — same `correlationId`, same `entityId` — rather than raising again. It is a RESULT and not a refusal, because a refusal is `status: 'failed'` and an at-least-once transport's correct response to a failure is to redeliver: refusing a replay would convert one duplicate into an unbounded retry loop. Absent, nothing changes. | `FACTORY` | `src/services/contracts/conformance/dispatch.ts` | `the SAME idempotencyKey twice returns the first result — one act, not two` |

---

## What a backend can violate that this tree cannot

This is the section the SE team needs most, and it is the reason the `FACTORY` /
`GATE` split above is not cosmetic.

**A gate over our tree proves nothing about your implementation.** Every `GATE`
row is a statement about source that exists in this repository. When
`httpDataService` replaces `mockDataService`, those gates keep passing — they
are reading our files, which did not change — while the property they describe
may be false in the running system. **They do not follow the seam.**

The five `FACTORY` rows do follow it. `describeScopingConformance` and
`describeDispatchConformance` are parametrised over an implementation and are
driven today by exactly one thin file each:

```ts
// scoping.mock.test.ts — the whole of it
describeScopingConformance('mockDataService', () => ({
  service: mockDataService,
  tenants: { a: 'sup-007', b: 'sup-002', c: 'sup-005' },
  roles: { buyer: PERSONA_SYSTEM_ROLES.buyer, supplier: PERSONA_SYSTEM_ROLES.supplier },
}));
```

**Add a sibling that passes your service. Change nothing else.** That is the
whole handover for V1–V5.

⚠️ **AND THE FACTORY'S OWN LIMIT IS STATED WHERE IT LIVES, NOT HIDDEN HERE.**
Green against the mock proves the factory RUNS, not that it CONSTRAINS — the
mock is the implementation those assertions were written against, so a clean
reading is `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01` by construction. The
evidence that it constrains is a mutation probe recorded in the batch that built
it: the same factory driven by a stub that ignores `scope.supplierId`, which
went red on isolation, superset and refusal. **Re-run that against your own
implementation before you trust a green.**

### The eight properties you must assert yourselves

V6–V13 are `GATE` rows. Each is true here and unproven there:

- **V6** — your dispatch pipeline must order role → state → legality → fields → policy. Nothing we ship can check yours.
- **V7** — your settlement endpoint must reject a foreign scope on all three axes. Ours is a function call; yours is a webhook, which is a wider door.
- **V8** — your creation path must deny an unresolvable owner.
- **V9, V10** — your persistence layer must not store a clock-derived state or a date difference. **This is the one most likely to be violated by accident**, because a column is the obvious place to put a number that a query already computed.
- **V11** — your DTOs must not grow fields nothing reads.
- **V12** — your identity layer must not fabricate an actor before an IdP answers.
- **V13** — your error channel must preserve `DataError`'s shape across the wire, which is a serialisation question we have never had to answer.

**V14 is the exception among the unreachable rows and shows what "enforced"
buys.** It is a TYPE. Any implementation that compiles against these types
inherits it — no factory, no discipline, no handover paragraph. **Where a
boundary can be made data, it should be**, and the remaining `GATE` rows are
candidates for exactly that conversion.

---

## What this document deliberately does not contain

**No counts of anything outside itself.** The corpus this joins has had prose
counts go stale at five separate sites (`FLOOR-IN-PROSE-01`), including a
stored-field allowlist described as 29 rows that measured 23 on the day this was
written. The only cardinality asserted here is the row numbering, and the pin
derives it rather than reading it.

**No restatement of what the enforcers assert.** A row names its assertion and
stops. Summarising an assertion creates a second copy that can drift from the
first, which is `COMMENT-AS-CONTRACT-01` and is how C9 came to be ratified from
a prose summary rather than from the module.

**No claim that this list is complete.** It is derived from what the tree
enforces plus what a backend could violate, and both halves grow. A property
with no enforcer and no `NOT ENFORCED` marking is a defect in this document, and
the pin refuses it.
