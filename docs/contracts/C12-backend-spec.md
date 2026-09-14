# C12 — The backend spec: a map of what is absent

**Status:** CONTRACT · **first issue, 2026-09-10**, pinned bilaterally by
`src/services/contracts/__tests__/c12BackendSpec.contract.test.ts` against
code-truth at `main`.

**Number derived, not chosen.** `docs/contracts/` holds `C1`…`C11`, contiguous,
max `11`. `grep -c '\bC12\b'` over `docs/`, `src/` and `CLAUDE.md` returned
**0** before this file existed; the same instrument returns a non-zero count for
`C11`, which is the control that says it can see a taken number.

---

## What this document is, and why it reads as a list of gaps

C11 says what must hold. **This says what you build, what you must never build,
and what nothing in this repository has answered.**

⚠️ **THE THIRD COLUMN IS THE DELIVERABLE.** Every seam below was examined for
three things: what the tree SPECIFIES, what it ASSUMES, and what NOTHING
ANSWERS. The third column is not a confession of incompleteness — it is the
artefact. A handover that lists only what exists hands you the easy half and
lets you discover the rest in production.

⚠️ **AND IT DOES NOT DESIGN YOUR ARCHITECTURE, DELIBERATELY.** What is specified
here is what a command must GUARANTEE and what the portal must NEVER MINT. How
you reach S/4HANA, AWS or Snowflake is yours. A spec that constrains the
mechanism becomes a document nobody can deviate from when reality bites, and
then it gets ignored wholesale rather than amended — which costs more than
having written nothing.

**No count of anything outside this document appears below.** Every population
is named member by member and re-derived by the pin on each run. The corpus this
joins has had prose counts go stale at six separate sites
(`FLOOR-IN-PROSE-01`).

---

## 1 · The five seams

| Seam | The tree SPECIFIES | The tree ASSUMES | **NOTHING ANSWERS** |
|---|---|---|---|
| **Persistence** | entity shapes (C2); identity is store-assigned; ledgers are append-only | that writes are durable and that a command applies atomically | **isolation level.** `expectedState` is a compare-and-set with no stated isolation — under read-committed two callers can both pass the comparison. Nothing here tells you whether that matters for your store |
| **OIDC intake** | C10: an IdP supplies a `SubjectBinding` and nothing else; `personId` is portal-minted and permanent, **never** the IdP subject | that Paragon staff authenticate against a corporate directory | **the supplier side.** `D-ID-2` is **OPEN — UNPROCURED**: supplier staff have no identity provider and one has not been bought. Every supplier-facing act today is recorded against `UNATTRIBUTED: NO_PERSON_IN_SESSION` |
| **Scoping** | `describeScopingConformance` — a factory **you can run against your service** | — | — |
| **Dispatch** | `describeDispatchConformance` — likewise; refusal precedence is order-pinned to `COMMAND_REFUSALS` | that dispatch is synchronous within a request | **replay semantics after a refusal** (§4) |
| **Audit** | `TransitionEvent` / `AuditSink` (C3); correlation and causation grouping | that the sink is durable and ordered | **everything else.** C3 has no pin and no reader. It describes an interface with no implementation, so there is no tree half to check a claim against — the one contract in this corpus that cannot be pinned even in principle |

⚠️ **Scoping and dispatch are the two rows with an empty third column, and that
is the whole reason this document is short.** They are the hardest seams to
specify in prose and they did not need specifying: the factories carry them
across. Add a sibling of `*.mock.test.ts` that passes your service and change
nothing else.

---

## 2 · What you must never build

⚠️ **A PROHIBITION WITHOUT ITS REASON GETS ENGINEERED AROUND BY A WELL-MEANING
TEAM.** Each row states why, because every one of these looks like an obvious
feature from inside a procurement backend.

### 2.1 · Never originate these — the document is created outside Paragon

These are `creation` transitions whose surfaceability is `external-fact`. The
flow shape invites an insert; the owner says the fact is reported from
elsewhere. **Derived as the intersection, and the pin re-derives it.**

| Transition | Owner | Why a good team builds it anyway |
|---|---|---|
| `t_po_issue` | `s4hana` | "create a purchase order" is the most obvious endpoint in a procurement backend |
| `t_contract_draft` | `s4hana` | the contracts page has a New button; the natural reflex is to give it a POST |
| `t_shipment_create` | `tms` | shipments look like ours because we render them |

**The reason, once, for all three:** SAP owns the vendor master and every
document number; the TMS owns the shipment record. We CARRY identity, we do not
ASSIGN it. A portal-minted number is a fact about a system we do not own.

⚠️ **AND THIS REPOSITORY VIOLATES ITS OWN RULE IN ONE PLACE, WHICH YOU WILL READ
AS PERMISSION IF NOBODY TELLS YOU.** `BuyerContracts.tsx` mints
`CTR-${year}-${n}` client-side (`CTR-FABRICATION-01`, filed, unscheduled). It is
a defect, not a pattern. C11 V15 records it on the invariant it contradicts.

### 2.2 · Never assert an external fact from portal input

Every transition whose surfaceability is `external-fact` carries an `owner` from
a closed union. Those acts advance when their owner reports them — never because
a person or a portal service decided they had happened.

The members are derived by the pin from the registry rather than listed here,
because the set grows: it is every transition with `because: 'external-fact'`.
**The owners are `s4hana`, `tms`, `bank`** — the `ExternalFactOwner` union,
which is a TYPE, so an act naming a fourth system does not compile.

### 2.3 · Never resolve a SAP-boundary verb locally

| Transition | What it must do |
|---|---|
| `t_gr_post` | return `submitted`, sit at an interim state with **no document**, and advance only when `settleFinalize` reports the real material document |
| `t_invoice_release_payment` | return `submitted`, interim, and assign the real FI document, payment reference and date **only on settle** |

**The reason:** a synchronous "done" is a claim that SAP posted, made before SAP
posted. Law 0.6 — no "paid" claim before it is true.

### 2.4 · Never widen a scope, fabricate an actor, or store a projection

- A command scope with **no `businessRoles` is refused**, never widened to the
  persona. The fallback IS the wildcard this platform retired.
- No code path constructs a RESOLVED actor while no person is authenticated.
- No clock-derived state and no date difference is ever stored. A stored
  difference is correct for exactly one day.

---

## 3 · The invariants you inherit as work

C11 classifies every invariant by what enforces it. **A `GATE` row is enforced
over OUR tree — it keeps passing when `httpDataService` lands, because it reads
our files.** Those are yours to assert, and this is what each would take on your
side. The pin asserts this list equals C11's non-`FACTORY` rows, so it cannot
drift from the document that classifies them.

| C11 | Invariant | What enforcing it on YOUR side takes |
|---|---|---|
| **V6** | refusal precedence is ordered | an integration test per refusal kind, asserting a caller without the atom cannot distinguish states |
| **V7** | settlement is scope-gated | assert a foreign scope advances nothing, mints no reference **and records no audit act** — all three; your settle is a webhook, which is a wider door than our function call |
| **V8** | creation is owner-gated | assert an unresolvable owner is DENIED, not admitted for want of anything to compare |
| **V9** | no clock-projected state stored | a schema review: no column holds a state a clock decides |
| **V10** | no stored difference | **the one most likely to be violated by accident** — a column is the obvious place for a number a query already computed |
| **V11** | every stored field has a reader | a DTO review; ours is a bilateral allowlist that can only shrink |
| **V12** | the actor is never fabricated | assert `personId` is portal-minted and never equal to an IdP subject — buildable the day D-ID-2 lands |
| **V13** | `DataError`'s shape is fixed | **a serialisation question we have never had to answer.** Ours is an in-process `Error`; yours crosses a wire |
| **V14** | external facts name their owner | **nothing.** It is a TYPE — you inherit it by compiling |
| **V15** | never mint a document identity | a source gate over identifier construction. Ours does not exist; §2.1 records the violation |
| **V16** | authentication bought, authorisation ours | assert an IdP supplies a binding and never a second authorisation path |
| **V17** | a refusal is a result, not an exception | **checkable only on your side.** We have no transport. Over HTTP it is one line: a business refusal is a 200 carrying a refusal body, never a 4xx/5xx |

---

## 4 · The idempotency contract

`CommandInput.idempotencyKey` is **shipped and dormant**. It exists to be
pointed at; it has **no producer** until F2's Event Mesh lands, because no
inbound channel exists in this repository at all.

**The contract:**

- **The key is YOURS to carry, never to mint.** A transport that is
  at-least-once redelivers the same message; redelivery is only a meaningful
  word because the message has an identity, and that identity is the key. A
  backend that minted its own would derive it from payload content, and **two
  genuinely distinct events with equal content would collapse into one — a lost
  act, silently.** If a producer supplies no identity, that boundary cannot be
  made idempotent; do not invent one for it.
- **A replay returns the prior result, not a refusal.** A refusal is
  `status: 'failed'`, and an at-least-once transport's correct response to a
  failure is to redeliver — so refusing a replay converts one duplicate into an
  unbounded retry loop.
- **Opt-in.** Absent, nothing changes.
- **Tenant-namespaced.** Two producers may legitimately mint the same key.

### ⚠️ 4.1 · The ORDERING is part of the contract, not an implementation note

The check sits **after the role gate** and **before the state precondition**.
Both halves are forced:

- **After role** — before it, a replay would return a SUCCESS to a caller that
  the role gate would have refused. The pair *(success, `ROLE_NOT_PERMITTED`)*
  discriminates on whether a key has been used, which is an existence oracle
  built out of a refusal kind — the class closed on the write path at `#292`.
- **Before the state precondition** — the first command moved the state, so a
  replay reaching `expectedState` first is always refused `STALE_STATE` and the
  replay check becomes dead code behind it.

**Implement it in that position.** It is not where it happens to sit in our
dispatcher; it is the only position where the check is both reachable and
non-disclosing.

### ⚠️ 4.2 · What is NOT decided, and you must not read silence as a decision

**A replayed key whose first raise was REFUSED currently raises again rather
than returning the refusal.** Our ledger records only outcomes that raised an
act, on the reasoning that a failed command changed nothing and an
at-least-once transport retrying a transient failure is the transport working.

**The counter-argument is live and unresolved:** recording refusals gives a
strictly idempotent contract — same key, same answer, always — at the cost that
a transient failure becomes permanent for that event id with no way to clear it.
**This is an open ruling, not a settled contract.** Do not build either
behaviour into a dependency without raising it.

---

## 5 · The seam-code gap

`INT-TMS-01` is the one integration seam code this repository has, and it is a
four-part artefact, not an identifier:

1. a **C5 section** — ownership boundary, affected transitions, the wire phase,
   the fallback state until then, and a pointer to the register
2. a **`findings.md` row** — the defect statement and its disposition
3. a **C5 table row** — tier and swap-point
4. **in-code citations** inside the `why` strings of the acts it governs

**The gap, stated as a missing artefact of that known shape:**

| Owner | Has an `INT-` seam code? | What exists instead |
|---|---|---|
| `tms` | **yes** — `INT-TMS-01`, all four parts | — |
| `s4hana` | **no** | C5 has a SAP section, but it describes the **OUTBOUND settlement callback** (`settleFinalize` for two verbs). The **inbound** direction — the acts where S/4 reports a fact to us — has no seam of any kind |
| `bank` | **no** | nothing. One act names `bank` as its owner and no artefact describes that boundary |

⚠️ **The type forces every external fact to NAME an owner. Nothing forces that
owner to HAVE a contract.** That asymmetry is this section, and the pin holds it:
the union's members and the set of owners with a seam section are asserted
against each other, so minting `INT-SAP-01` moves a row here automatically.

**And one artefact makes the gap concrete rather than theoretical.** The SAP
document references this platform carries — the material document, the FI
document, the payment reference — are **minted by our own stores on settle** and
name a document number **without naming the system that owns it**. A reference
like `SAP-2026-INV-004401` does not say whether S/4 or a bank is authoritative
for it. With `bank` and `s4hana` both in the owner union and neither carrying a
seam, that ambiguity has nowhere to be resolved.

---

## 6 · Build and publish

**This section exists because nothing else in this corpus says how the artefact
you are inheriting is produced or where it goes.** Every other section describes
a seam in the running system. This one describes the thing that carries it, and
it was written after a measurement nobody had taken: **no batch in this
project's history has ever ended at a URL.** The merge was treated as the
delivery.

⚠️ **NO HOST IS NAMED HERE, DELIBERATELY.** Hosting is yours to define
— on-premise or a cloud region — and a recommendation written into a handover
document reads as a constraint. What follows is what the artefact REQUIRES of a
host, derived from the tree. Anything a host must provide is stated as a
requirement; anything the tree merely happens to use today is named as such.

### 6.1 · What the build produces

`npm run build` is `tsc && vite build`. The Vite root is `app/`, the output
directory is `dist/`, and the source entry is `app/index.html` — which is
**never edited directly**; the bundler writes the shipped copy.

Measured on a clean build of this tree: **thirteen files, 2.8 MB, and exactly one
HTML entry.** The rest is hashed JS and CSS chunks under `assets/`, plus
`favicon.ico` and `robots.txt`. No file is committed — there are no build
artefacts in this repository, and `dist/` is produced from source every time.

**The application itself is a STATIC BUNDLE and needs no server to render.** The
backend is greenfield: zero server code, zero datastore clients, every store an
in-memory fixture behind `mockDataService`. That is the whole of the app's
runtime requirement, and it is the reason §6.3 is the only paragraph here with
real consequences.

### 6.2 · The fallback rewrite — a requirement, and a narrower one than it looks

One HTML entry serves every client route. The tree today expresses the fallback
as a rewrite of every path to `/index.html`.

⚠️ **AND THE REASON IS NOT THE OBVIOUS ONE, WHICH IS WHY IT IS WRITTEN
OUT RATHER THAN ASSUMED.** Routing here is a **HashRouter**, not a BrowserRouter:
a client route lives after the `#`, so **the host only ever receives `/` for
in-app navigation.** A team told *"you need SPA fallback or every route breaks"*
would be inheriting a false reason for a true requirement, and would then
mis-scope the fix when routing changes.

What the fallback actually buys today: a stray path — a typo, a stale bookmark,
a link written before hash routing landed — returns the shell instead of a host
404. **What makes it load-bearing tomorrow: the day routing moves off the hash,
every declared route becomes a real path and the fallback becomes the difference
between a working portal and a wall of 404s.** The route paths are declared in
one place (`src/router/AppRouter.tsx`) and are derived by the pin rather than
counted here.

### 6.3 · The access gate is an EDGE component, and a static bucket cannot run it

⚠️ **THIS IS THE MOST CONSEQUENTIAL HOSTING FACT IN THIS DOCUMENT, AND IT
IS THE ONE MOST EASILY LOST.** SEC-GATE-01 is not a plan. It is built, it ships,
and **it is not static.**

- `middleware.js` at the repository root is routing middleware that runs on the
  edge **BEFORE** the fallback rewrite, so it gates the app shell **and every
  `/assets/*` chunk**. The bundle is never served to an unauthenticated client.
- It validates an HMAC-SHA256 signed, HttpOnly, 7-day session cookie.
- Its credentials are **server-side, NON-`VITE_` environment variables**
  (`GATE_USER` / `GATE_PASSWORD` / `GATE_SECRET`), read at the edge and never
  bundled into the client. **Unprovisioned, the gate fails CLOSED with a 503.**

**THE REQUIREMENT, STATED AS A REQUIREMENT: a host that serves `dist/` as plain
objects and nothing else DROPS THIS GATE SILENTLY** — the pages still render,
the app still works, and the whole bundle is public. There is no error and no
log. A host must therefore provide a request-interception layer of some kind
(edge function, reverse proxy, load-balancer auth), or the gate must be
re-expressed in that host's own terms.

**That re-expression is cheap BY DESIGN, and the design is the useful half.**
The decision core lives in `gate/` (`gate/handler.js`, `gate/render.js`,
`gate/session.js`) and is **framework-agnostic** — it is driven both by the
shipped middleware and by a local Node harness, so what the browser tests
exercise is exactly what ships. What is host-specific is the thin adapter, not
the gate.

⚠️ **AND WHAT IT IS NOT, BECAUSE THE NAME INVITES THE WRONG INFERENCE.**
This is a **prototype access gate** over the whole deployment. It is **not** the
product's authorisation model — that is the atom/scope system described in C10
and enforced by the dispatcher, and it is untouched by this gate. Do not carry
the edge credential forward as a user identity; it authenticates nobody.

### 6.4 · Publish only what the gates have cleared

`npm run gates` runs the four — `npm run build`, the spec-surface typecheck,
`npx vitest run`, `npm run test:gate` — **and then asserts each one did
something**, against the floor in `scripts/floor.json`. CI runs that exact
command and nothing else, on every PR to `main`, on every push to `main`, and
daily on `main` with no commit involved.

**THE REQUIREMENT: a publish must carry a commit on which those four
CONCLUDED green.** Not started, not queued — concluded.

⚠️ **THIS IS WRITTEN AS A REQUIREMENT RATHER THAN AS A DESCRIPTION
BECAUSE NOTHING IN THIS REPOSITORY SEQUENCES THEM.** `.github/workflows/` holds
one workflow, `gates.yml`, and it contains no publish step of any kind. Whatever
publishes this artefact is therefore **not ordered against the gate run by
anything expressible here** — the two are independent, and a commit whose gates
fail can be published by a mechanism this repository does not control. That is a
gap, not a design, and it is named again in §6.6.

### 6.5 · UU PDP — the constraint, and what it currently attaches to

**Both halves, because only one of them is usually carried forward.**

**The constraint is real and this platform's own plan already names it.**
Indonesia's UU PDP governs personal data; the forward plan specifies **AWS
`ap-southeast-3` Jakarta** for the backend's data residency; the halal control
design describes the platform as Jakarta-resident and UU PDP-clean; and C10's
**D-ID-7** is a ruling made under UU PDP — the ledger stamp carries `personId`
only, with `displayName` resolved at read and never copied into a permanent
record. A DPO appointment and supplier consent are named as prerequisites before
real supplier data, on a roughly ten-week clock.

⚠️ **AND THE OTHER HALF, STATED PLAINLY SO IT IS NOT MISTAKEN FOR
COMPLIANCE ALREADY ACHIEVED: THIS TREE HOLDS NO PERSONAL DATA AT ALL.** There is
no datastore. Every store is an in-memory fixture, every supplier is a
`Sample … (illustrative)` row, and the resolved actor is
`UNATTRIBUTED: NO_PERSON_IN_SESSION` **platform-wide** — C10 §6.2's tripwire
fires the moment shipped code constructs a `RESOLVED` actor.

**So residency binds the F1 datastore and the systems that feed it. It does not
bind this bundle**, which contains nothing a data subject has rights over. The
distinction matters in both directions: do not treat today's hosting as a
residency decision, and do not treat a residency-compliant host as discharging
UU PDP — the obligations attach when real people's data does.

### 6.6 · What nothing answers

| Question | The state of it |
|---|---|
| **Where is this published?** | **Nothing in this repository knows.** No host, endpoint, alias or domain is recorded in any file here |
| **Is a publish verified?** | **No.** Nothing compares what a host serves against the commit it was built from — and a hash-routed SPA behind a CDN is precisely the shape where a stale shell is invisible |
| **Is publication ordered after the gates?** | **Not by anything here** (§6.4). One workflow, no publish step |
| **Who owns the repository's integrations?** | **Undetermined from inside the repository**, and §6.7 is the one case where that has a visible consequence |

### 6.7 · A passing check that this repository cannot account for

Every pull request in this repository carries status contexts named **`Vercel`**
and **`Vercel Preview Comments`**, and they **report success**.

**What is determinable from inside the repository, and it is all that is claimed
here:**

- `vercel.json` exists and configures a build command, an output directory and
  the fallback rewrite.
- `@vercel/functions` is a declared dependency, imported by `middleware.js`.
- `.github/workflows/` holds **only** `gates.yml`, and it contains **no** deploy
  step, token or project reference.
- **No credential, token or project identifier for any host is stored in this
  repository.**

**What is NOT determinable from inside the repository: what posts those status
contexts.** They originate outside it. This document does not speculate about
what is installed at the account or organisation level, because that cannot be
read from here and a handover that guesses is worse than one that stops.

⚠️ **THE CONSEQUENCE, WHICH IS THE REASON THIS IS A ROW AND NOT A
FOOTNOTE: A GREEN CHECK NAMED AFTER A HOST IS READ AS "IT DEPLOYED."** It is the
same mechanism as `CLEAN` in the merge doctrine — an aggregate that cannot
distinguish *"everything passed"* from *"nothing was asked"*. Whoever inherits
this repository's settings inherits this check, and **nothing in the repository
substantiates what it means.** Resolve it at the account level before treating
it as evidence of anything.

---

## 7 · What holds this document

**Four sections are pinned bilaterally** and go red when the tree moves:

- §2.1's table is the derived intersection of `creation` and `external-fact`.
  A new such transition must appear here.
- §5's table is the `ExternalFactOwner` union against C5's seam sections, both
  directions.
- §3's table is C11's non-`FACTORY` rows, both directions.
- **Every artefact this document names in backticks is asserted to exist.**
  That check is the reason it is here: a draft of this section cited
  `sourceSystem` and `externalEventId` as shipped fields, and the tree contains
  **neither**. A handover document naming a field that does not exist is a
  forward promise with no handler, and it is the failure this corpus keeps
  repeating.

  ⚠️ **AND UNTIL §6 LANDED THAT SENTENCE WAS TRUE OF FIELDS AND ONLY
  ACCIDENTALLY TRUE OF FILES.** A backticked `BuyerContracts.tsx` satisfied the
  FIELD pattern, so the check asked whether `src/` contains the string `tsx` —
  which it always does. **Three citations were passing on their own file
  extension.** A file is now its own kind, resolved on disk, with both controls:
  a path the tree does not hold is rejected, and a glob (`*.mock.test.ts`) is
  not read as a file claim at all.

- **§6.2's and §6.3's load-bearing half is pinned, and the rest of §6 is not.**
  The fallback rewrite, the single HTML entry, the middleware's every-path
  matcher and the three credential names are properties of shipped config, so
  they are asserted rather than described — the one paragraph a host most needs
  to get right is the one an instrument holds. **§6.4's absence is pinned in the
  direction that decays:** no workflow in this repository publishes anything,
  and the day one does, that assertion goes red and §6.4 and §6.6 must be
  rewritten rather than quietly outgrown.

**The rest is irreducibly prose, and that is said plainly rather than left to be
discovered.** §1's three columns, §2's reasons, §3's "what it would take", and
§4's open ruling cannot be checked by any instrument in this repository — several
describe systems that do not exist yet. What protects them is the same discipline
C11 adopted: **they state REASONS, not NUMBERS.** Prose asserting why a boundary
exists has no truth-value to decay. Prose asserting how many things are on one
side of it has been wrong at six sites in this tree, which is why no such
sentence appears above.
