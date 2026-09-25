# Paragon Supplier Portal

A procurement-collaboration portal for **Paragon Corp**, built as **Ops Project #11** of the
Odyssey Digital Transformation Program. Buyers and suppliers work the same documents — requisitions,
sourcing events, purchase orders, ship notices, goods receipts, invoices, compliance certificates —
from two sides of one record.

---

## What this repository is, and what it is not

**It is a fixture-only executable specification for a supplier portal over SAP S/4HANA.**
Every screen runs, every state machine is real, every refusal is real — and all of it runs against
in-memory sample data. There is no server, no database and no S/4 connection in this repository.
That is deliberate, not unfinished: the portal is a **collaboration and orchestration layer over
S/4HANA, never a system of record.** It owns the collaboration record — the conversation, the
confirmation, the document a supplier uploads, the trail of who was asked what and when — and it
never owns the S/4 document itself.

**What "executable specification" buys the team implementing the backend.** Acts the portal refuses
to originate are declared as DATA on the transition rather than left to prose: the `surfaceable`
field on each transition carries the reason and, for an external fact, the system that owns it
(`ExternalFactOwner` in `src/services/transitions/schema.ts`). Every one of them is rendered with
its owner at `/buyer/process-flows`, so the boundary is a page you can open rather than a paragraph
you have to trust.

**What it is not.** Not an EDI-capable system of record, and not integrated with anything. The
non-portal channels (WhatsApp, API, EDI) are *designed* and explicitly marked not-connected in
`src/data/communicationProfiles.ts`. No Ariba integration exists or is scheduled here.

---

## Quick start

Requires **Node 24** (`.nvmrc` and the `engines` field in `package.json` both say so; CI runs the
same major). Nothing else — no database, no environment file, no credentials.

```bash
npm ci                 # install exactly what package-lock.json pins
npm run dev            # dev server, http://localhost:5173/
```

The app opens on the buyer dashboard. It is a `HashRouter`, so every URL carries a `#`:
`http://localhost:5173/#/buyer/dashboard`.

To see what actually ships — the production bundle, which is what the deployed site serves:

```bash
npm run build          # tsc, then vite build -> dist/
npm run preview        # serve dist/ (vite prints the port; 4173 when free)
```

And to prove the tree is green before you change anything:

```bash
npm run gates          # the four gates, run and asserted (see below)
```

`npm run gates` takes several minutes, most of it the test suite. That is the command CI runs, and
it is the one that decides whether a change is mergeable.

### Getting around the app

| | |
|---|---|
| **Switching seat** | The avatar in the top bar opens the identity panel. It states the seat's role, the scope that role grants, and is the only place roles are changed. |
| **Switching language** | The same top bar. English and Bahasa Indonesia are both complete. |
| **Seeing the machines** | `/buyer/process-flows` renders every lifecycle machine in the tree, each transition badged with whether it is wired to a surface or authored-and-unwired. Start here. |
| **Seeing the vocabulary** | `/glossary` — the closed term unions the surfaces refuse against, reachable from the refusal sites themselves. |
| **Logging in** | `/login` exists with demo-mode buttons for the buyer and supplier seats. It is not a gate: the app is reachable without it. |

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173, HMR. |
| `npm run build` | `tsc && vite build`. Typechecks the app surface, then bundles to `dist/`. |
| `npm run preview` | Serves the built `dist/`. Run `build` first. |
| `npm test` | Vitest in watch mode. |
| `npm run test:run` | Vitest once. |
| `npm run test:gate` | The access-gate suite (`gate/`, plain `node --test`, outside the vitest tree). |
| `npm run gates` | **The four gates, run in order and then asserted.** This is CI. |
| `npm run drift` | The clock-drift reader — the one assertion here that reads the real wall clock. |

There is **no lint script and no ESLint config**, on purpose. `tsc` under `strict`, plus
`noUnusedLocals` and `noUnusedParameters`, does the work a linter would; running `npx eslint` fails
on a missing config, which is not a defect in the code.

---

## Gates and the floor

**The gates are four**, and `npm run gates` (`scripts/gates.mjs`) runs exactly those four in order:
`npm run build` (typecheck + bundle) · `tsc -p tsconfig.vitest.json --noEmit` (typechecks the *spec*
surface, which the app tsconfig excludes) · `npx vitest run` (the suite) · `npm run test:gate` (the
access-gate suite). It then asserts that each one **did something**: that the build emitted a
bundle, and that the run collected at least the recorded number of tests across at least the
recorded number of files. A suite that silently stops collecting cannot pass a gate that only
checks for the absence of failures, which is why the assertion exists.

**Those recorded numbers live in `scripts/floor.json`, and they are a FLOOR, not an equality.**
Below it the gate fails; above it the gate passes and prints a note asking you to bump the file —
so a legitimate test-adding change is never red, and nobody is trained to edit a number to go
green. The floor moves **both ways**: a change that genuinely retires tests should lower it, and
the honest discriminator is whether the diff *deletes assertions* or merely *stops running them*.
Writing tests to clear a floor you have just lowered is the one move this model exists to prevent.
CI runs `npm run gates` and nothing else — on every pull request, on every push to `main`, and
daily on `main` with no commit involved, which is the half that catches a break nobody caused.

---

## Repository map

Derived from the tree, and pinned: `src/readmeStructure.guard.test.ts` fails if a path named here
stops existing, or if a top-level `src/` directory stops being named here. A map that can rot
quietly is how this file came to describe a tree that no longer existed.

```
app/                     Vite root. index.html loads ../src/main.tsx. Never edited directly.
public/                  Static assets served as-is (favicon, robots.txt).
gate/                    The access gate's framework-agnostic core. Outside src/, so it is
                         outside the vitest floor and runs under plain `node --test`.
middleware.js            Vercel Routing Middleware — the deploy-time entry to that gate.
scripts/                 gates.mjs (the runner), floor.json (the recorded counts), and the
                         local gate verify harness.
docs/                    Plans, investigations, the defect register, and:
docs/contracts/          THE CONTRACT PACKAGE — C1…C12. What the backend implements.

src/
├── assets/              Images imported by components.
├── components/          UI. `ui-v2/` primitives, `layout-v2/` shell, `v2-features/`
│                        cross-page features, `delivery/` the delivery lane's controls.
├── context/             React contexts: current identity, adaptive layout.
├── data/                Long-lived sample data and catalogues (suppliers, POs, materials,
│                        communication profiles).
├── hooks/               Label and toast hooks shared across pages.
├── lib/                 Cross-cutting libraries — i18n, the glossary, chart palette, and the
│                        source-derived GATES (storedFieldGate, moduleScopeLiteralGate,
│                        treeMutationGate, envGate, projectionGate, readingInstantGate).
├── pages/               Legacy. Only the login page still lives here.
├── pages-v2/            Every shipped page. Buyer and supplier surfaces both.
├── router/              AppRouter.tsx — a flat HashRouter. A page brings its own shell.
├── services/            The engine room:
│                        transitions/ the state machines, the dispatcher, roles, policies
│                        data/        IDataService, the mock implementation, fixtures, stores
│                        contracts/   the contract types and their conformance factories
│                        identity/    seats, sample people, the one person-label resolver
│                        query/       TanStack Query hooks over the data service
│                        sdc/         supplier data collaboration (material master ref)
│                        delivery/    the delivery-agreement / call-off lane
│                        channel/     the communication channels
│                        chase/       chasing an overdue act
│                        liveness/    which data sources are live and which simulated
│                        testing/     helpers the services share with their specs
├── styles/              Tailwind entry.
├── test/                Vitest setup and shared test helpers.
├── types/               Shared enums and DTO types.
└── main.tsx             React root: providers, fixture seeding, the data service.
```

---

## The sample data

**Everything you see is a fixture, and the fixtures are honest about being fixtures.**
They live in `src/services/data/mock/fixtures/` and `src/data/`, behind `mockDataService`
(`src/main.tsx` wires it). Data is multi-tenant — several supplier tenants, with a service-level
scoping contract that enforces buyer-superset reads, per-supplier isolation, and `SCOPE_DENIED`
on a cross-tenant reach. Writes go through the same command dispatcher the real backend will:
legality, then role, then required fields, then query scope, then policy.

Two consequences worth knowing before you read a screen:

- **Surfaces that are simulated say so.** A data source that is not live carries an honesty marker
  and renders it. The compliance lane is the worked example: it is marked `SIMULATED` behind a
  two-gate guard and flips to `LIVE` when its real data source lands, not before.
- **Clock-derived states are never stored.** Overdue, expiring, due-today and the like are
  computed at read from a date, so a fixture cannot quietly become a lie as the calendar moves.
  `npm run drift` is the reader that checks this still holds.

`httpDataService` is the designed swap point (`src/services/data/DataServiceContext.tsx`). Pages do
not change when it lands.

---

## Environment variables

**`.env.example` lists every one of them**, with its default and what it does — and it is derived
rather than written: `src/lib/envGate/` scans the source on every test run and fails if the code
reads a variable the file does not list, or if the file lists one nothing reads.

Nothing in it is required. `dev`, `build`, `preview` and `gates` all work with no `.env` file at
all. The two groups worth knowing: `VITE_CHAOS*` turns on a dev-only fault injector so loading and
error states can be seen without a backend, and `GATE_*` are the deployed access gate's
server-side secrets, which are never bundled into the client and make the gate fail **closed**.

---

## Deployment

Vercel only, built from source via `vercel.json` (`npm run build` → `dist/`). Nothing is copied to
the repository root and no build artifact is committed. The Vite root is `app/`, the output is
`../dist`.

The deployed site sits behind an HMAC-signed, HttpOnly session cookie enforced at the edge by
`middleware.js` *before* the SPA rewrite — so the bundle itself is never served to an
unauthenticated client. The gate fails closed if its secrets are unprovisioned, and the site ships
`noindex` three ways (meta tag, `robots.txt`, and an `X-Robots-Tag` header).

---

## Where to look next

| If you want… | Read |
|---|---|
| The contract the backend implements | `docs/contracts/README.md`, then C1 (methods) and C2 (schemas) |
| How a document moves | `/buyer/process-flows` in the running app, then `src/services/transitions/flows/` |
| Why something was built this way | `docs/findings.md` — the defect register, and the reasoning behind most of the rules in this repository |
| The working agreement for changes | `CLAUDE.md` — branch, PR, gates, and the derivation discipline |
| The forward plan | `Paragon_World_Class_Build_Plan_v1.md` |
