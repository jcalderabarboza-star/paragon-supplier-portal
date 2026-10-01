---
entity: supplierDocument
locale: en
title: Supplier document (certificate)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_supplierdoc_request
  - t_supplierdoc_declare
  - t_supplierdoc_submit
  - t_supplierdoc_verify
  - t_supplierdoc_reject
---

<!-- section:summary -->
## 1 · What this process is

The paperwork Paragon must hold on a supplier — certificates, licences, bank details — and where each one stands.

A **supplier document** is one row on a supplier's documents page: a halal certificate, a BPOM notification, a tax registration, an ISO certificate, a contract, or something else. It starts one of two ways. Paragon's compliance officer **asks** a supplier for a specific kind of document, which opens a slot on that supplier's page (*Awaiting Upload*); or the supplier **declares** a certificate nobody asked for, which goes straight to review (*Under Review*). A supplier answers an open slot — or re-answers after a refusal — by **declaring** the certificate's details: the scheme, the number, who granted it, when, until when, and what it covers in the supplier's own words. Compliance then **confirms** it (*Valid*) or **refuses** it with a written reason (*Rejected*), and a refused document can be declared again. This is the one compliance process in the portal; the separate compliance machine that once modelled the same idea is being retired.

Who touches it: the **buyer's compliance lane** requests, confirms and refuses; the **supplier's back-office lane** declares and answers. Nobody uploads anything: **no file is sent to Paragon** — the portal records what the supplier states, and compliance checks it against the certificate through the usual channel. Compliance assigns Paragon's material codes at confirmation; the supplier is never asked to guess them.

Honest markers. Every seeded row is authored sample data on sample suppliers, and the capability reads **Sample** — the verbs are wired and dispatch for real, but there are no real supplier identities behind them yet. Every act is recorded against the seat (`UNATTRIBUTED: NO_PERSON_IN_SESSION`) unless a sample identity is adopted, and the screens say so. *Expiring* and *Expired* are never stored: a *Valid* document's expiry state is computed from its expiry date at read (within 180 days → expiring). The BPJPH halal mandate date, 17 Oct 2026, is a constant in the tree; both pages carry a banner about the transition.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:1-48; src/services/data/types.ts:394-447,484-527; src/lib/i18n/processFlowPurpose.ts:259-271; src/lib/i18n/supplierDocuments.ts:95-100; src/services/liveness/registry.ts:152,300-303; src/services/data/dayProjection.ts:134,201-214; src/services/data/complianceProjection.ts:50; src/services/data/mock/fixtures/supplierDocuments.ts:19-25 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1a | ∅ → Awaiting Upload | operator action (creation): Paragon asks for a document | buyer · compliance | `t_supplierdoc_request` |
| 1b | ∅ → Under Review | operator action (creation): the supplier volunteers a certificate | supplier · back_office | `t_supplierdoc_declare` |
| 2 | Awaiting Upload, Rejected → Under Review | operator action: the supplier states the certificate's details against an open slot, or again after a refusal | supplier · back_office | `t_supplierdoc_submit` |
| 3a | Under Review → Valid | operator action: compliance confirms | buyer · compliance | `t_supplierdoc_verify` |
| 3b | Under Review → Rejected | operator action: compliance refuses with a reason | buyer · compliance | `t_supplierdoc_reject` |

`Valid` is terminal. `Rejected` is deliberately not: the supplier can declare again.

**Forks**

- **At the start (∅):** `t_supplierdoc_request` — compliance — when Paragon knows a document is needed and wants the gap on somebody's list; `t_supplierdoc_declare` — supplier back office — when the supplier holds a certificate Paragon did not know to ask for.
- **At Under Review:** `t_supplierdoc_verify` — compliance — when the stated details match a genuine, current certificate; `t_supplierdoc_reject` — compliance — when they do not (wrong document, out of date, wrong scope, unreadable).
- **At Rejected:** `t_supplierdoc_submit` — supplier back office — when the supplier has the corrected details; the only exit.
- **At Awaiting Upload:** `t_supplierdoc_submit` — supplier back office — the only exit.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:79-159 -->

<!-- section:steps -->
## 3 · Step by step

### t_supplierdoc_request — Ask for a document <!-- transition:t_supplierdoc_request -->

- **Step kind:** operator action (creation)
- **Role:** buyer · compliance (atom `supplierdoc:request`)
- **From → to:** ∅ → Awaiting Upload
- **Operator — where:** `/buyer/compliance` → header **Ask for a document** → panel **Ask a supplier for a document** → **Check it over** → confirm step → **Open the request**. A seat without the atom sees an *Awaiting Compliance* notice in the header slot instead.
- **Operator — do:** Ask one supplier for one kind of document, and say what is needed and why. This opens a slot on that supplier's documents page — nothing is sent and no file is transferred; the supplier sees the ask the next time they look. The confirm step shows the resolved company name: the platform can tell a supplier that does not exist from one that does, but not the wrong supplier from the right one.
- **Operator — fill:** **Supplier** (chosen from the roster), **Kind of document** (one of the six categories — the only way a *Tax & Legal* or *Contract* row can ever be created, since declarations map only to Halal, BPOM, Quality and Other), and **What you need, and why** (the note; required on the screen, optional at the verb; shown to the supplier word for word).
- **Tester — expected state:** Awaiting Upload
- **Tester — confirm:** toast *Request opened — {supplier} sees it on their documents page*; on that supplier's `/supplier/documents` a new row with name `—`, the chosen category, status *Awaiting Upload*, the note, and a **Declare** button; the awaiting-upload banner count rises.
- **Tester — trigger event:** `t_supplierdoc_request`
- **Checks that can refuse:** none beyond role, legality and required fields (`supplierId`, `category`) — plus the creation-owner check: the supplier id must resolve on the roster, or the dispatcher throws `SCOPE_DENIED` rather than minting a document for a tenant that does not exist.
- **Glossary:** ROLE_NOT_PERMITTED · MISSING_FIELDS · SCOPE_DENIED · NO_PERSON_IN_SESSION
- **Honesty:** recorded against this seat, not a named person (the confirm step says so). The row is minted with `—` for name, issuer, file type, size and version — nothing has been named yet, and the store says so rather than composing a title. Sample data end to end.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:87-97; src/services/query/commandHooks.ts:1213-1230; src/services/data/mock/MockCommandService.ts:1800-1865; src/pages-v2/BuyerCompliance.tsx:240-300,1045-1160; src/lib/i18n/compliance.ts:157-186 -->

### t_supplierdoc_declare — Declare a certificate <!-- transition:t_supplierdoc_declare -->

- **Step kind:** operator action (creation)
- **Role:** supplier · back_office (atom `supplierdoc:upload`)
- **From → to:** ∅ → Under Review
- **Operator — where:** `/supplier/documents` → header **Declare a certificate** → side panel **Declare a certificate** → **Record declaration**. A seat without the atom sees the handoff notice in the panel footer.
- **Operator — do:** State the details of a certificate nobody asked for, so that a certificate Paragon did not know to ask for still reaches the people who check it. What you state is a claim until Paragon's compliance team confirms it.
- **Operator — fill:** **Certificate scheme** (Halal BPJPH / Halal MUI legacy / Halal foreign / BPOM / ISO / Other), **Certificate number**, **Granted by**, **Granted on**, **Valid until** (leave blank if it has no expiry — a BPJPH halal certificate does not) and **What it covers** (your own words: products, grades or sites). Every field except the expiry date is required.
- **Tester — expected state:** Under Review
- **Tester — confirm:** toast *Declaration recorded — awaiting review by Paragon's compliance team*; a new row on `/supplier/documents` named by the certificate number, category derived from the scheme, status *Under Review*; on `/buyer/compliance` the **Declared certificates awaiting review** queue gains the row with *Granted by*, *Valid*, *Covers*, *Stated … by the supplier (no named person)*.
- **Tester — trigger event:** `t_supplierdoc_declare`
- **Checks that can refuse:** none beyond role, legality and required fields (`supplierId`, `certType`, `certNumber`, `issuer`, `issuedOn`, `scopeText`). A supplier may declare only for itself: the dispatcher compares the payload's supplier id with the seat's.
- **Glossary:** HALAL_BPJPH · HALAL_MUI_LEGACY · HALAL_FOREIGN · BPOM · ISO · OTHER · ROLE_NOT_PERMITTED · MISSING_FIELDS · SCOPE_DENIED
- **Honesty:** *No file is sent to Paragon* — the panel says so in a titled box. Recorded against your company rather than a named person. The row's `version` is `v1` and its file type and size are `—`, which is the literal truth. Sample data.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:99-114; src/services/query/commandHooks.ts:1173-1191; src/services/data/mock/MockCommandService.ts:1867-1908; src/pages-v2/SupplierDocuments.tsx:276-290,396-425,920-945; src/lib/i18n/supplierDocuments.ts:27,84,90-121 -->

### t_supplierdoc_submit — Declare (against an open slot, or again) <!-- transition:t_supplierdoc_submit -->

- **Step kind:** operator action
- **Role:** supplier · back_office (atom `supplierdoc:submit`)
- **From → to:** Awaiting Upload, Rejected → Under Review
- **Operator — where:** `/supplier/documents` → on a row in *Awaiting Upload*, **Declare**; on a row in *Rejected*, **Declare again** → panel **Declare — {name}** → **Record declaration**.
- **Operator — do:** State the details of what was asked for, or restate them after a refusal. From here the delay is Paragon's, not yours. On a refused row the refusal reason above the row is what to correct against.
- **Operator — fill:** the same six certificate fields as a declaration (scheme, number, granted by, granted on, valid until — optional — and what it covers).
- **Tester — expected state:** Under Review
- **Tester — confirm:** the row's name becomes the certificate number, its issuer, dates, category and *Linked* text follow the declaration, and its status reads *Under Review*; the red **Refused** block disappears (the stored refusal fields stay, but the block renders only while the status is Rejected); the buyer's review queue gains the row.
- **Tester — trigger event:** `t_supplierdoc_submit`
- **Checks that can refuse:** none beyond role, legality and required fields (`certType`, `certNumber`, `issuer`, `issuedOn`, `scopeText`). A *Valid* or *Under Review* row is refused by legality (`ILLEGAL_TRANSITION`). A supplier seat reaches only its own rows (`SCOPE_DENIED` otherwise).
- **Glossary:** ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION · MISSING_FIELDS · SCOPE_DENIED
- **Honesty:** no file crosses; recorded against the company, not a person. A re-declaration does not un-happen the earlier refusal — the record stays and only the present-tense block is withdrawn.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:116-127; src/services/query/commandHooks.ts:1233-1250; src/services/data/mock/MockCommandService.ts:1731-1764; src/pages-v2/SupplierDocuments.tsx:166-230,721-745; src/lib/i18n/supplierDocuments.ts:79,84,91,118 -->

### t_supplierdoc_verify — Confirm <!-- transition:t_supplierdoc_verify -->

- **Step kind:** operator action
- **Role:** buyer · compliance (atom `supplierdoc:verify`)
- **From → to:** Under Review → Valid
- **Operator — where:** `/buyer/compliance` → **Declared certificates awaiting review** → on the row, **Confirm**. A seat without the atom sees *Awaiting Compliance* in that slot.
- **Operator — do:** Confirm that the stated details match a genuine, current certificate. Nothing was uploaded — check the details against the certificate itself before confirming. Only now does the document count for anything.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Valid
- **Tester — confirm:** toast *Certificate confirmed*; the row leaves the review queue; on `/supplier/documents` the status pill reads *Valid* (or *Expiring* / *Expired*, computed from the stated expiry date at read); the supplier's KPI tiles move.
- **Tester — trigger event:** `t_supplierdoc_verify`
- **Checks that can refuse:** none beyond role, legality and required fields (none). Any state other than *Under Review* is `ILLEGAL_TRANSITION`.
- **Glossary:** Valid · Expiring · Expired · ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION
- **Honesty:** confirmation records a decision, not a file; the stated details are not changed by it. Material codes are assigned by compliance at this point in the design, but the verb writes none (the stored `linkedTo` stays the supplier's own scope text). Recorded against the seat, not a person.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:129-139; src/services/query/commandHooks.ts:1253-1269; src/services/data/mock/MockCommandService.ts:1731-1738; src/pages-v2/BuyerCompliance.tsx:186-201,610-625; src/lib/i18n/compliance.ts:103-125; src/services/data/documentDisplayState.ts:64-77 -->

### t_supplierdoc_reject — Refuse <!-- transition:t_supplierdoc_reject -->

- **Step kind:** operator action
- **Role:** buyer · compliance (atom `supplierdoc:reject`)
- **From → to:** Under Review → Rejected
- **Operator — where:** `/buyer/compliance` → review queue → **Refuse** → **Why it is being refused** → **Record refusal**.
- **Operator — do:** Say why the paper does not do the job — wrong one, out of date, wrong scope, unreadable — in words the supplier will read verbatim on their own documents page, so write it to them. The supplier is then asked again.
- **Operator — fill:** **Why it is being refused** (`rejectionReason`, required; spaces do not count).
- **Tester — expected state:** Rejected
- **Tester — confirm:** toast *Refusal recorded — the supplier sees the reason and the date…*; the row leaves the review queue; on `/supplier/documents` the row shows a red **Refused {date}** block with **Reason:** your text and *Recorded without a named person…*, plus a **Declare again** button; the *refused* banner count rises.
- **Tester — trigger event:** `t_supplierdoc_reject`
- **Checks that can refuse:** `supplierdoc_refusal_authored` — the reason must have substance; a blank or all-spaces reason is refused because the supplier would read a refusal with nothing written in it. Required-field check catches an absent reason first.
- **Glossary:** ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION · MISSING_FIELDS · POLICY_REJECTED · NO_PERSON_IN_SESSION
- **Honesty:** the refusal trio — reason, timestamp, actor — is written together; the timestamp is minted by the store at the act and the actor is the seat's attribution (unattributed today). The one seeded refusal (`doc-012`) was authored, not produced by the verb; the supplier page marks a session-minted timestamp differently from a seeded one.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:141-157; src/services/transitions/policies.ts:531-545; src/services/query/commandHooks.ts:1282-1299; src/services/data/mock/MockCommandService.ts:1765-1773; src/pages-v2/BuyerCompliance.tsx:203-229,626-700; src/pages-v2/SupplierDocuments.tsx:166-230; src/lib/i18n/compliance.ts:117-128; src/lib/i18n/supplierDocuments.ts:130-136 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Who opens the document (at ∅).** Branch A — `t_supplierdoc_request` — **When:** Paragon knows what it needs; the slot carries the buyer's category and note and waits for the supplier. Branch B — `t_supplierdoc_declare` — **When:** the supplier holds a certificate Paragon has not asked for; it lands in review directly.
- **Confirm or refuse (at Under Review).** Branch A — `t_supplierdoc_verify` — **When:** the stated scheme, number, issuer, dates and scope check out against the certificate. Branch B — `t_supplierdoc_reject` — **When:** they do not; the reason travels to the supplier verbatim.
- **Refusal is not a dead end (at Rejected).** `t_supplierdoc_submit` — **When:** the supplier has corrected details. The stored refusal is kept as history; the present-tense block is withdrawn once the status changes.
- **Blank refusal reason (exception).** `POLICY_REJECTED:supplierdoc_refusal_authored` — the screen disables **Record refusal** until text is entered; the verb refuses a hand-crafted blank.
- **Unknown supplier on a request (exception).** `SCOPE_DENIED` — the id did not resolve on the roster. The wrong-but-real supplier is not caught by any check; the confirm step's company name is the safeguard.
- **Expiry (derived, not a verb).** A *Valid* document reads *Expiring* within 180 days of its expiry date and *Expired* after it; no verb moves it, and there is no renewal verb — the **Renew** button opens the halal-renewal walkthrough (read-only guidance), and the **View** button states that download is not available.
- **Not offered: withdraw, cancel, edit a confirmed document.** None exists; a confirmed document with wrong details would need a new declaration, which the tree does not gate against.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:79-159; src/services/transitions/policies.ts:531-545; src/services/data/mock/MockCommandService.ts:1800-1811; src/pages-v2/SupplierDocuments.tsx:166-230,721-770; src/services/data/dayProjection.ts:201-214; src/lib/i18n/supplierDocuments.ts:122-123 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Sample (liveness) | external | all states | always — verbs are wired (gate 1) but no real supplier identities exist (gate 2) | `ProvenanceMarker` / `LivenessPill` on `/supplier/documents` and `/buyer/compliance` |
| Awaiting Upload | stored | Awaiting Upload | a slot opened by a request and not yet answered | supplier row pill; *documents awaiting upload* banner; **Needs Action** KPI |
| Under Review | stored | Under Review | a declaration awaiting compliance | supplier row pill; buyer review queue |
| Refused (with date and reason) | operator-raised | Rejected | a refusal recorded; hidden again once the status leaves Rejected | supplier row block; *documents were refused* banner |
| Recorded without a named person | derived at read | Rejected / Under Review | the refusal or declaration carries `UNATTRIBUTED` | supplier refusal block; buyer queue *Stated … by the supplier (no named person)* |
| Session-minted stamp marker | derived at read | Rejected / Under Review | `rejectedAt` / `declaredAt` was minted in this session rather than seeded | beside the date |
| Expiring | time-driven, derived at read | Valid | expiry within 180 days of the declared present | supplier row pill; *expiring within 6 months* banner; **Expiring ≤180d** KPI; **Renew** button |
| Expired | time-driven, derived at read | Valid | expiry date passed | supplier row pill; *expired* banner; **Expired** KPI |
| No expiry | derived at read | any | `expiryDate` is null (a BPJPH certificate has permanent validity) | expiry column |
| Seeded sample row (no stated details) | derived at read | Under Review | a seeded row that reached review before declarations existed | buyer review queue note |
| BPJPH transition banner | reference | — | always; mandate date 17 Oct 2026 is a constant | both pages |
| Awaiting Compliance / Awaiting Supplier Back Office (handoff) | derived at read | any | the seat lacks the verb's atom | the verb's own slot |
<!-- src: src/pages-v2/SupplierDocuments.tsx:166-230,690-745; src/pages-v2/BuyerCompliance.tsx:540-640; src/services/data/documentDisplayState.ts:64-77; src/services/data/dayProjection.ts:134,201-214; src/services/data/complianceProjection.ts:50; src/services/liveness/registry.ts:300-303; src/lib/i18n/supplierDocuments.ts:31-52,86-88,130-136 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `doc-012` (no document number — the row is named *Halal Scope Annex — SAMPLE-MUI-SCOPE-0007B*), the one seeded *Rejected* row, supplier `sup-007` (PT Sample Packaging Indonesia).

| Joins to | By | Note |
|---|---|---|
| Supplier `sup-007` | `supplierId` | tenancy: a supplier seat reads and acts on its own rows only; a buyer seat reads all |
| Category *Halal Compliance* | `category` | on a declared row derived from the scheme (`CERT_TYPE_TO_CATEGORY`); on a requested row the buyer's choice |
| Material `PK-PETB-8810` | `linkedTo` (free text) | display-only: the fixture names a material code, but the declaration path stores the supplier's `scopeText` here, never a code list |
| Refusal record | `rejectionReason`, `rejectedAt`, `rejectedBy` | authored on this row; on a runtime refusal the store mints the timestamp and takes the actor from the seat |
| Declaration | `declaration` (absent on seeded rows) | `certType`, `certNumber`, `issuer`, `issuedOn`, `expiresOn`, `scopeText`, `declaredAt`, `declaredBy` |
| Expiry state | `expiryDate` × declared present | computed at read; `null` here — no expiry |
| Compliance registry (`/buyer/compliance` table) | none by field | a separate, read-only machine over `COMPLIANCE_REGISTRY`; being retired; not joined to document rows |

Display-only fields nothing writes at runtime: `fileType`, `fileSize` (`—` on every declared row — nothing is transmitted), `version` (`v1` on a declaration), `notes` (the buyer's request note when present), and the seeded prose names on fixture rows.
<!-- src: src/services/data/mock/fixtures/supplierDocuments.ts:60-102; src/services/data/types.ts:484-527; src/services/data/mock/MockCommandService.ts:1712-1720,1731-1764,1867-1908; src/data/mockSuppliers.ts:220-222 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` is the transition id, `actor` is `supplier:sup-007` for a supplier seat and `buyer:all` for a buyer seat, plus `ts`, `outcome` and `correlationId`; refusals are written too. The row itself keeps the latest declaration (`declaredAt`, `declaredBy`) and the latest refusal (`rejectedAt`, `rejectedBy`, `rejectionReason`); an earlier refusal is overwritten on the row when a second one is recorded, and survives only in the trail.

Worked sequence for `doc-012` (seeded as *Rejected* with an authored reason), as a supplier back-office tester and a compliance tester would produce it:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | Rejected → Under Review | supplier · back_office (`supplier:sup-007`) | **Declare again** → scheme Halal (MUI, legacy), number, granted by, granted on, covers "PK-PETB-8801 and PK-PETB-8810 grades" → **Record declaration** | `t_supplierdoc_submit` |
| T+1 | Under Review (refused) | buyer · compliance (`buyer:all`) | **Refuse** with an all-spaces reason (hand-crafted; the button is disabled on screen) | `t_supplierdoc_reject`, `outcome: failed`, `POLICY_REJECTED:supplierdoc_refusal_authored` |
| T+2 | Under Review → Valid | buyer · compliance (`buyer:all`) | **Confirm** | `t_supplierdoc_verify` |
| T+3 | Valid (no change) | — | the status pill reads *Valid* — no expiry was stated, so it never reads Expiring | — (derived at read) |

For the request half: **Ask for a document** for `sup-002` (PT Sample Specialty Fats), kind *Tax & Legal*, with a note → `t_supplierdoc_request` mints a new id in *Awaiting Upload* (T+0); that supplier's back office answers with **Declare** → `t_supplierdoc_submit` (T+1); compliance confirms → `t_supplierdoc_verify` (T+2).
<!-- src: src/services/transitions/events.ts:127-129; src/services/data/mock/MockCommandService.ts:1731-1779; src/services/data/mock/fixtures/supplierDocuments.ts:60-102; src/pages-v2/BuyerCompliance.tsx:660-700; src/data/mockSuppliers.ts:90-92 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Confirm** / **Refuse** buttons; *Awaiting Compliance* on the queue row | notice in the verb's slot | the seat does not hold `supplierdoc:verify` / `supplierdoc:reject` | adopt a seat holding compliance |
| No **Ask for a document**; *Awaiting Compliance* in the header | notice in the header slot | seat lacks `supplierdoc:request` | same |
| Supplier panel footer shows a handoff notice instead of **Record declaration** | notice in the panel footer | seat lacks `supplierdoc:upload` (new declaration) or `supplierdoc:submit` (answering a slot) | adopt the supplier back-office lane |
| Toast *Declaration not recorded* — `MISSING_FIELDS:…` | dispatcher | a required field is blank (every field except **Valid until**) | fill it; the button is disabled until complete |
| Toast *Not recorded* — "rejectionReason is blank…" | `POLICY_REJECTED:supplierdoc_refusal_authored` | a reason of spaces | write the reason |
| Toast *Not opened* — `SCOPE_DENIED` | request panel | the supplier id did not resolve on the roster (hand-crafted payload) | choose a supplier from the list |
| Request opened for the wrong supplier | the slot appears on another supplier's page | the wrong real supplier was chosen; no check can catch that | there is no withdraw verb; open the right request and tell the wrong supplier through the usual channel (not measured: no in-portal remedy) |
| `ILLEGAL_TRANSITION` on Declare | dispatcher | the row is *Valid* or *Under Review* — only *Awaiting Upload* and *Rejected* accept a declaration | none needed |
| `ILLEGAL_TRANSITION` on Confirm / Refuse | dispatcher | the row is not *Under Review* | none needed |
| A supplier seat cannot see or act on a row | `SCOPE_DENIED` / row absent | the row belongs to another supplier | expected |
| The refused block still shows after re-declaring | should not — it is gated on status | if it does, the status did not change (the dispatch failed) | read the toast |
| *Seeded sample row — it carries no stated details* in the queue | buyer review queue | `doc-010` / `doc-011` reached review before declarations existed | confirm or refuse on the row's other fields; expected |
| **View** says *Download not available yet* | supplier row | no file is ever stored | expected |
| **Renew** opens a walkthrough, not a form | supplier row | there is no renewal verb; the walkthrough is guidance | declare the renewed certificate as a new declaration |
| Status reads *Expiring* / *Expired* though the stored status is *Valid* | pill computed at read | expiry date within 180 days / past, at the declared present (31 Aug 2026) | expected; `doc-001` and `doc-202` compute *expiring* at the present |
<!-- src: src/services/transitions/policies.ts:531-545; src/services/transitions/refusals.ts:61-114; src/pages-v2/SupplierDocuments.tsx:276-290,396-425,721-770; src/pages-v2/BuyerCompliance.tsx:186-300,610-700; src/services/data/mock/MockCommandService.ts:1800-1811; src/services/data/mock/fixtures/supplierDocuments.ts:1-13; src/lib/i18n/supplierDocuments.ts:115-123 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Awaiting Upload | `doc-006` | — | COA slot for `sup-007`, issuer stated, no file (`—`); answer it with **Declare** |
| Under Review | `doc-010`, `doc-011` | — | `sup-007` halal rows seeded in review before declarations existed — the queue shows *Seeded sample row*; confirm or refuse them |
| Valid | `doc-001`, `doc-002`, `doc-003` | — | 12 valid rows in the fact pack across `sup-007`, `sup-002`, `sup-005`. `doc-001` (MUI halal, expiry stated) computes *Expiring* at the declared present, as does `doc-202`; rows with `expiryDate: null` never expire. All dates are shifted to the declared present by the family anchor. |
| Rejected | `doc-012` | — | the one seeded refusal (scope annex does not cover `PK-PETB-8810`), actor `UNATTRIBUTED`; the row to test **Declare again** |
<!-- src: src/services/data/mock/fixtures/supplierDocuments.ts:30-127; src/services/data/fixturePresent.ts:198,351-356 -->
