# Communication Hub — Design Skeleton (DEC-COMMS-PRIMARY)

**Status:** ratified skeleton (C0). Canon for the Comm Hub arc (C1–C5).
**Date:** 2026-07-23. **Baseline:** main @ bc033e6, floor 1292.
**Supersedes:** nothing — this is the FIRST Comm Hub spec in the repo. DEC-COMMS-PRIMARY
was previously referenced (never specified) in the Delivery-Agreement spec + chase note;
those references are corrected to point here.

---

## 0. The correction up front (why this doc exists)

The two Delivery-Agreement documents assert the DEC-COMMS-PRIMARY spine "exists." That
claim is **half true, and the half-truth is load-bearing.** Ratifying the Comm Hub on the
true premise is the whole point of C0.

- **The COMMAND SPINE genuinely exists and is battle-tested.** The dispatcher, the
  transition verbs, the `SubmissionSession` envelope, and the source-agnostic
  `parseGrid` adapter are real and proven by THREE shipping surfaces — the portal
  confirm forms, the magic-link bulk-stock grid, and the XLSX import — all dispatching
  on the SAME channel-agnostic write-path (`t_requirementresponse_submit`,
  `t_inventorydeclaration_declare`, `t_incomingshipment_report`).
- **The CHANNEL TRANSPORT does NOT exist.** There is no WhatsApp / email / WeChat
  send or receive. The current `BuyerWhatsAppHub` and `SupplierWhatsApp` surfaces are
  **mockups**: `BuyerWhatsAppHub` reads a *separate* "engagement" mock model
  (`Conversation` / `ChatMessage` / `AutomationRule`) disconnected from the SDC spine;
  `SupplierWhatsApp` is a scripted simulator (`SCENARIOS` / `BOT_REPLIES`) with zero
  spine wiring. Bot actions fire toasts. The amber `WA-CONNECT-01` marker already
  admits "no live 360dialog connection."

**Never conflate the two.** "The write-path a channel *would* feed" exists. "A working
channel" does not. Everything below is designed so the Hub builds on the real spine and
stays honest about the absent transport.

---

## 1. Ingest doctrine — a channel reply is a THIRD source

The ingest primitive the Hub needs is already architected. A supplier reply is simply a
third source on the existing adapter, alongside the grid and the XLSX import:

```
reply text  →  parse  →  Draft / GridRow  →  CONFIRM (human)  →  parseGrid / builders
            →  openSubmissionSession  →  verb hook  →  svc.commands.dispatch
```

- **Un-falsifiability is INHERITED, not re-implemented.** The parser coerces reply text
  into the existing `Draft` interfaces and calls the existing payload builders
  (`submitModel.ts`, `objectSubmitModels.ts`). Therefore `uom` stays absent
  (master-assigned, integrity invariant #2), `supplierId` still comes from identity
  (never the message), and snapshot keys stay structural (copied from rendered objects).
- **Honest silence.** A reply that cannot be parsed resolves to an explicit
  `{ ok:false, reason }` — never a fabricated payload. Only `ok:true` units dispatch.
- **The confirm gate already has a precedent:** `XlsxImportPanel` — "a pre-fill SOURCE …
  never a dispatch path"; the grid stays the governance + confirmation + submit surface,
  and the human sees and edits every parsed row before Declare. The channel-reply confirm
  gate copies this pattern exactly.

The genuinely new pieces are small: (i) a **channel-reply parser** (text → Draft/GridRow,
honest-silent), (ii) a **`channelSource` provenance marker**, and (iii) the **confirm
surface** that reuses the XLSX/grid pattern.

---

## 2. The honesty invariants (pinned as canon)

These are non-negotiable for the whole arc.

- **(a) A parsed reply is an INFERENCE until a human confirms — NEVER auto-commit.**
  The XLSX import gate is the precedent: parse is a *source*, not a dispatch path. No
  reply becomes a governed object without an explicit human confirm-and-edit step.
- **(b) The Hub must NEVER imply a message was sent when no transport exists.** Outbound
  records read **"composed — not sent"**, rendered SIMULATED via
  `LIVENESS-DATASOURCE-01`'s two-gate honest render. No `✓✓` read-receipts, no
  "online 🟢", no "via 360dialog", no "message sent" toast — until a real transport lands.
- **(c) `channelSource` provenance rides CONTEXT, never a falsifiable payload key.** The
  channel enum + raw-message ref + received-at travel with the dispatch context so audit
  can trace "this object came from WhatsApp message X" — but `supplierId` still comes
  from identity and snapshot keys stay structural. The channel can never spoof identity.
- **(d) "AUTO / auto-execute" is REDEFINED as auto-route-to-review — never auto-dispatch.**
  The current mock advertises AUTO toggles and "auto-execute" flow-boxes; under this
  canon "automation" may pre-parse and route a reply to the review queue, but a human
  still confirms before commit. Automation removes typing, never the confirm gate.

---

## 3. Send doctrine — outbound request records, composed not sent

The send side is modeled without a live sender:

- An **outbound request record** is a first-class object in a `composed | queued |
  (later) sent` lifecycle, derived from the **chase engine (5a–5e)** +
  **delivery-agreement cadence**. The chase engine already produces what a send would
  push (`SupplierChaseView` = `dataReasons` + `commitmentEntries` → `overallSeverity`).
- **Absence-of-fresh-reply = staleness** falls out of two facts already in the system:
  the outbound record says "we asked on date D", and the SDC clock says "no fresh reply
  since D." The chase engine **already owns the staleness math** — the send side only
  formats and records the ask.
- No live dispatch. Until a transport lands, an outbound record's terminal state is
  `queued` and it renders "composed — not sent."

---

## 4. Real-now vs deferred

**Buildable truthfully now (this arc):**
- Channel-reply parser (headless, pure).
- `channelSource` provenance on governed submissions.
- Inbound confirm-before-commit surface → real `RequirementResponse` /
  `InventoryDeclaration` / `IncomingShipment` in the governed store.
- Outbound request model (composed/queued) derived from chase + cadence.
- Spine-wired buyer Hub replacing the engagement mock.
- Honest SIMULATED markers throughout.

**Deferred to the integration lane (Stage F):**
- Live send/receive **transport** (WhatsApp/email/WeChat).
- Inbound **webhooks** (auto-receipt of replies). Until then inbound is
  operator-entered/pasted reply text run through the same parser + confirm gate — still
  fully governed, just manually fed.
- A governed **supplier-contact registry** (phone / email / wechat per supplier) —
  faked today (`+62 812 XXXX XXXX`), needs F1 real identities. The outbound model carries
  a contact-*ref* placeholder honestly in the meantime.

---

## 5. Decomposition (C0–C5) + module boundary

| Batch | Deliverable | Reuse / seam |
|---|---|---|
| **C0** | This ratified skeleton (docs only). | — |
| **C1** | Channel-reply parser + `channelSource` provenance MODEL (headless, pure). | `submitModel` / `objectSubmitModels` / `parseGrid` shapes |
| **C2** | Inbound confirm-before-commit surface + spine wiring. | `XlsxImportPanel` gate pattern + `sdcSupplierHooks` + `session.ts` |
| **C3** | Outbound request MODEL (headless). | `SupplierChaseView` (5a–5e) + `LivenessRegistry` honest-render |
| **C4** | Buyer Hub surface, spine-wired; retire the engagement mock. | Consumes C1–C3 |
| **C5** *(2nd wave)* | Supplier own-facts-only mirror. | Mirrors C4 like 5e mirrored 5d |

Ordering: C1 and C3 are independent headless models (parallelizable). C2 depends on C1.
C4 depends on C2 + C3. C5 trails C4. Every intermediate PR keeps the floor green — C1/C3
add tested pure modules; C2/C4 add surfaces without breaking existing reads.

**Module boundary (acyclic — enforced):** all channel logic lives in a new
`src/services/channel/` module that **imports sdc + chase, never the reverse**. No
`sdc → channel` and no `chase → channel` edges. The existing discipline holds — chase
composes one level up, sdc imports neither delivery nor chase — and channel sits one
level above chase as the top consumer.

---

## 6. The two-sided split

- **Buyer Hub (first).** The DEC-COMMS-PRIMARY front door: network-wide, sends/monitors
  the cyclical requests, triages inbound replies into governed objects, and shows the
  chase-derived outbound queue. Aggregate scope — threads span the network.
- **Supplier side (second wave).** Own-facts-only mirror: the requests *Paragon asked
  me* (cyclically), *my* submission history, *my* outbound composition. Own-scoped, no
  network aggregate, no automation admin. Follows the buyer surface once proven —
  exactly how SDC-5e mirrored 5d.

---

## 7. Open adjudication items (carried into C1+)

1. Engagement mock (`Conversation` / `ChatMessage` / `AutomationRule` + 7 hooks,
   consumed only by `BuyerWhatsAppHub`): hard-delete in C4, or preserve a thin honest
   "activity log"?
2. Module name: `src/services/channel/` (this doc's default) vs `comms/`.
3. Supplier side (C5) timing within the arc.

These do not block C1 (parser + provenance), which is buildable against this skeleton.
