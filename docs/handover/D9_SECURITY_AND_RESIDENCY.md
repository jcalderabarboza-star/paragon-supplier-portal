# Security and data residency — requirements the SE Team inherits

**Status:** DRAFT for Seat 2 review · refreshed 2026-10-01 · from `main` @ `6f1da15aa41c03e38538562ea8e6c250353538a1` (PR #392).
**What this is:** a requirements list, not a readiness claim. It is the specification for **SE-2** (hosting in AWS Jakarta) and **SE-13** (security and operations), and an input to SE-3, SE-4 and SE-8. Every row says what the tree specifies, what it already does, and where it says nothing. The tree holds no personal data today: every store is an in-memory fixture, every supplier is fictional (`src/data/mockSuppliers.ts`), sample people are role-named rows, and the actor is `UNATTRIBUTED: NO_PERSON_IN_SESSION` unless a sample person is opted into. UU PDP obligations attach when real people's data does (C12 §6.5).

---

## 1 · Data residency (UU PDP, AWS Jakarta) — SE-2

| Requirement | What the tree says | Where it says nothing |
|---|---|---|
| Personal data of Indonesian data subjects is stored and processed in Indonesia | the forward plan names AWS `ap-southeast-3` (Jakarta) for the backend (C12 §6.5; Build Plan); `docs/track-r-status.md` R0.4 "X-1 AWS ap-southeast-3 account/escalation filed — NOT STARTED (2026-07-06)" | which services must be in-region (datastore, object storage for uploads (SE-8), audit sink, logs, backups, CDN edge); whether the static bundle and an edge gate, which hold no personal data, may remain outside |
| Residency binds the datastore and the systems feeding it | C12 §6.5: "residency binds the F1 datastore … It does not bind this bundle" | the S/4, SOMO and Snowflake data paths |
| Today's hosting is not a residency decision | C12 §6.5 | — |

## 2 · Personal-data classification

| Requirement | What the tree says | Where it says nothing |
|---|---|---|
| Identify every field that is personal data | C10 D-ID-7: a ledger stamp carries `personId` only; labels are never stored (`ActingPerson`, `personLabelGuard.test.ts`). Ledgers that now stamp a person: PR approvals, publication signatures (`approvedBy`), module activation (`setBy`), delivery acts. Not measured: every other ledger's stamp | no data-classification inventory. Candidate personal fields: supplier contact fields, registration form fields (never persisted today), comm-hub message bodies (simulated). Not measured field by field |
| No personal names in code, fixtures, comments or documents | operator standing rule; `src/readmeNoPersonalNames.guard.test.ts` covers the README and, since #392, code comments; `src/guides/guides.test.ts:464` covers the guides | design documents committed under `docs/designs/` are not scanned by any guard (see `HANDOVER_INDEX.md`) |
| Attribution is by stable id, resolved at read | C10 §5.5, D-ID-1 | the `Person` registry itself (C10 §8.1: zero code; SE-3) |

## 3 · Retention, deletion, consent, DPO

| Requirement | What the tree says | Where it says nothing |
|---|---|---|
| Retention periods per record class | nothing | audit-event retention; ledger retention (append-only by design, which conflicts with erasure unless the act is distinguished from the person); upload retention (SE-8) |
| Erasure / data-subject requests | nothing | the mechanism; D-ID-7 (id on the record, label in a registry) is what makes erasing the label possible without rewriting a ledger |
| Supplier consent before real data | C12 §6.5 names a DPO appointment and supplier consent as prerequisites, on a roughly ten-week clock; D-DPO is OPEN | the consent text, channel and record |
| Data Protection Officer | named as a prerequisite; D-DPO open | who, when |

## 4 · Authentication, authorisation, sessions — SE-3, SE-13

| Requirement | What the tree does today | What the SE Team builds |
|---|---|---|
| Access to the pre-release deployment | SEC-GATE-01: Vercel routing middleware (`middleware.js`) before the SPA rewrite; HMAC-SHA256 signed, HttpOnly, 7-day cookie; credentials from non-`VITE_` env (`GATE_USER`, `GATE_PASSWORD`, `GATE_SECRET`, documented in `.env.example` since #375); fails closed (503); noindex; logic in `gate/`; gate suite floor 7 | replace with real sign-in; keep noindex until launch |
| Sign-in | none. `src/pages/auth/Login.tsx` picks a persona; it collects no email and no password (A1, H3) | OIDC for Paragon staff (Entra); a supplier IdP (D-ID-2); the IdP supplies a `SubjectBinding` and nothing else (C11 V16) |
| Authorisation | atom-based, no fallback (C11 V3); module gate first (`MODULE_INACTIVE`), then role, then tenancy on every read and write (C11 V1, `describeScopingConformance`); refusal is not an existence oracle (V2) | enforce the same server-side; run both conformance factories against the real service |
| Decisions that need a named person | PR approval, publication signing, module switching, delivery acts refuse an unattributed seat; a sample person may not switch modules in production (`MODULE_SET_NOT_SAMPLE_IN_PROD`) | real persons make these real; keep the sample-person locks for non-production |
| Segregation of duties | mutual where declared (V4); two open questions (D6): one seat revising and approving a requisition; one seat allocating, signing and publishing a forecast publication | enforce once persons exist |
| Session state | `localStorage['paragon.identity']` holds the seat | server-issued session; never trust client-held roles |
| Secrets | none in the bundle; `VITE_*` is public by construction (`VITE_CHAOS*`, `VITE_QA_HARNESS`, dev-gated) | a secret manager; rotate `GATE_SECRET` at transfer; the AG Grid licence key (SE-1) is injected at build from a non-`VITE_` variable and is not a secret, but it does not live in the repository |

## 5 · Audit integrity — SE-4

| Requirement | What the tree does | What is missing |
|---|---|---|
| Every command outcome is an event | one `TransitionEvent` per dispatch, refused or accepted (C3), with `subject` since G1 | a durable, ordered sink; tamper evidence; retention |
| Events carry who acted | `actor` is a seat key; `attribution?` carries the session's person on `user`-trigger transitions (`dispatcher.ts:472`); refused when smuggled in a payload (`ACTOR_IN_PAYLOAD`) | attribution becomes meaningful only when the `Person` registry exists (SE-3) |
| Replays raise no second act | per-tenant `idempotencyKey` (C11 V18); the intake cascade keys on the line id | the inbound redelivery contracts for SAP and SOMO (SE-5, SE-6) |
| No fabricated actor or document number | C11 V12 (`simUsrNamespace.test.ts`); C11 V15 (`documentNumberGate.test.ts`) | — |

## 6 · Supply-chain and build integrity — SE-13

| Requirement | What the tree does | Gap |
|---|---|---|
| Reproducible build | `package-lock.json`; `engines` Node ≥24 <25, npm ≥11; `.nvmrc` = 24 (#375) | — |
| Gates before publish | `npm run gates` in CI on every PR, every push to `main`, and daily | C12 §6.4/§6.7: nothing orders publish after gates and nothing verifies what a host serves against the commit it was built from |
| Dependency audit | not measured (`npm audit` not run in this refresh) | run it; decide a policy; AG Grid Enterprise is a new commercial dependency (SE-1) |
| Third-party loads and CSP | Google Fonts is the only external load named in the README; no CSP is defined (not measured beyond a grep) | define a CSP |

## 7 · Ownership transfer (C12 §6.7: "nothing in this repository knows")

| Asset | Current holder (not recorded in the repo) | Action at handover |
|---|---|---|
| GitHub repository | the operator's personal GitHub account (per the remote URL) | transfer to an organisation the SE Team administers; branch protection requiring the `gates` workflow |
| Vercel project and production alias | not recorded in the repository | transfer or decommission when SE-2 lands; record the host |
| `GATE_USER` / `GATE_PASSWORD` / `GATE_SECRET` | set in the hosting environment by the operator | rotate on transfer; a redeploy is needed after changing them (env is captured at build) |
| CI (`.github/workflows/gates.yml`) | runs on the repository; a failing scheduled run opens a `gates-failure` issue | keep; add publish ordering |
| AG Grid licences | not yet bought (operator ruling 2026-09-28: two developer licences) | the Lead Engineer names the two developers (SE-1) |
| Integration accounts (SAP, SOMO, TMS, Snowflake, messaging providers) | none exist | SE-5, SE-6, SE-7, SE-10 |

## 7a · The RFP's non-functional and compliance requirements, with what the tree holds

Source: the RFP (*Supplier Collaboration Hub*, internal Paragon document), pages 6–8, referenced by name only.

| RFP requirement | Tree state | SE package |
|---|---|---|
| N1 Availability ≥ 99.5% monthly, maintenance windows | nothing; no hosting recorded | SE-2, SE-13 |
| N2 Page loads < 3 s P95 at 300+ concurrent users | not measured; no load test | SE-13 |
| N3 1,000+ supplier organisations, 5,000 named users | in-memory stores; `Page<T>` pagination RESERVED | SE-4 |
| N4 SSO/MFA, RBAC, audit logs, encryption in transit and at rest, OWASP Top 10, penetration test | RBAC atom-based; audit in-memory; nothing else | SE-3, SE-4, SE-13 |
| N5 UU PDP; residency in Indonesia preferred | §1–§3; no personal data held | SE-2, DPO |
| N6 Monitoring, logging, alerting, rate limiting, health checks | none in `src/` | SE-13 |
| N7 Data quality and governance | liveness registry, stored-field gate, C9 provenance (zero rows), governed planning registries | portal (validation) + SE-4 / SE-5 (lineage) |
| Vendor qualification: UU PDP, ISO 27001 or equivalent, SOC 2 | none; an internal build has no certification | operator decision |
| Backup / DR with RPO/RTO | none | SE-13 |
| Security / penetration-test remediation | none | SE-13 |
| SLA (Sev-1 15 min response / 24 h permanent fix; L2/L3) | no support organisation | operator decision |
| Identity: Entra for Paragon users; secure supplier authentication | OIDC RESERVED; `SubjectBinding` specified, zero code; supplier IdP unprocured | SE-3 |

## 8 · What this document does not claim

It does not claim UU PDP compliance, a threat model, penetration testing, or encryption at rest or in transit (no code or document in the tree mentions encryption). Those are SE-Team deliverables that start from this list.
