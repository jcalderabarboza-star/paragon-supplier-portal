// ────────────────────────────────────────────────────────────────────────────
// Supplier-document flow (F0.4 — census #10). **WIRED at §82.**
//
// The document-lifecycle substrate shared across the compliance surfaces
// (census §4): a document is requested (creation → `Awaiting Upload`, buyer),
// the supplier declares its details (→ `Under Review`), and compliance verifies
// it (→ `Valid`) or refuses it (→ `Rejected`).
//
// ── ⚠️ §82 · THREE CHANGES, EACH WITH A REASON THAT IS NOT "IT SEEMED TIDIER"
//
// **1. `Rejected` IS NOW A DECLARED STATE, AND ITS ABSENCE WAS A REAL DEFECT.**
// `SupplierDocumentStatus` has carried `'Rejected'` since before this flow
// existed; §80 built an entire supplier-facing refusal surface on it; and this
// machine sent `t_supplierdoc_reject` to `Awaiting Upload` instead. The two had
// never been compared because the flow had no CommandTarget, so no reject could
// fire and no disagreement could surface. **Wiring the verb is exactly what
// would have made the mismatch cost something:** compliance refuses a document,
// the store writes `Awaiting Upload`, and §80's `RefusalBlock` — gated on
// `status === 'Rejected'` — renders nothing at all. The refusal reason, the
// timestamp and the banner would all vanish at the moment they were earned.
//
// **AND IT IS NOT TERMINAL, DELIBERATELY.** `t_supplierdoc_submit` accepts it as
// a `from`, so a refused document can be re-declared. A terminal `Rejected`
// would be the dead-end shape (`docs/findings.md` §48g) authored on purpose, one
// state after the platform finally told the supplier what was wrong.
//
// **2. `t_supplierdoc_declare` IS NEW, AND IT IS WHAT `supplierdoc:upload` WAS
// RULED TO PERMIT.** §79e held the atom as owned-but-unassignable: the operator
// ruled it belongs to the back office, and `businessRoles.test.ts` refuses a
// bundle naming an atom no transition requires (C10 §3.4), so the ruling could
// only be recorded in prose. This transition is the missing half. The two supply
// verbs are kept APART rather than merged because they answer different
// questions: `_submit` fills a slot the BUYER opened (`Awaiting Upload` exists
// because somebody asked for it); `_declare` is the supplier volunteering a
// certificate nobody requested. Same lane, same panel, different authority.
//
// **3. `_verify` / `_reject` ARE `user`-TRIGGERED AND SURFACED.** They carried
// `ruled-unsurfaced` with the note that `roles.ts` called them *"a verification
// pipeline rather than a screen"* — and its own header flagged that as *"the
// least settled value in the batch"*, naming Track R's operator lane as the
// ruling most likely to flip it. **That ruling has now flipped it** (operator,
// §82): a submitted document nobody can see is the dead-end shape in the other
// direction, so compliance reviews on a screen.
//
// `Valid` clock-projects to `Expiring Soon` → `Expired` (expiry < clock, law
// 0.5, census G1) — those are read-time PROJECTIONS, NOT transition-states, so
// they are deliberately absent from `states`.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

/**
 * The certificate details a supplier states about a document, and the fields
 * every supply verb must carry.
 *
 * ⚠️ **`materialCodes` IS NOT HERE, AND ITS ABSENCE IS THE FINDING §82 IS BUILT
 * AROUND.** The gate joins on `supplierId · materialCodes · certType ·
 * lifecycleState · expiryDate` (`halalVerification.ts:303` + `schemeValid`), and
 * `materialCodes` holds PARAGON'S SAP material codes at raw-material grain —
 * a vocabulary the supplier does not hold. Measured, the two sides of this tree
 * do not even agree about the same supplier: sup-007's registry rows cover
 * `AI-HYALU-6615 · AI-NIAC-6612 · FR-ROUD-4470 · PK-ALCP-2450 · PK-PETB-8804`
 * while its documents link to `PK-PETB-8801 · 8802 · 8810` — **intersection
 * empty**, both sets non-empty. Asking a supplier for those codes would be
 * asking it to guess, so the declaration carries `scopeText` — the supplier's
 * own words for what the certificate covers — and compliance assigns codes at
 * verify. **A free-text scope cannot be silently mistaken for a join key; a
 * guessed code can.**
 */
export const DECLARATION_FIELDS = Object.freeze([
  'certType',
  'certNumber',
  'issuer',
  'issuedOn',
  'scopeText',
] as const);

export const supplierDocumentFlow: FlowDefinition = {
  entity: 'supplierDocument',
  version: 2,
  states: ['Awaiting Upload', 'Under Review', 'Valid', 'Rejected'],
  initial: 'Awaiting Upload',
  /** PF-0 · D-2 — `Rejected` is NOT terminal; `_submit` leaves it. */
  terminals: ['Valid'],
  transitions: [
    {
      id: 't_supplierdoc_request',
      from: [],
      to: 'Awaiting Upload',
      trigger: 'creation',
      requiredRole: 'supplierdoc:request',
      requiredFields: ['supplierId', 'category'],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // §82 — the supplier volunteers a certificate nobody asked for. The verb
      // `supplierdoc:upload` was ruled to the back-office lane at §79 and had
      // nothing to permit until now.
      id: 't_supplierdoc_declare',
      from: [],
      to: 'Under Review',
      // `creation`, not `user`: the validator binds the two — an empty `from`
      // IS what a creation is in this schema (`t_quotation_submit` is the same
      // shape one lane over, and is also a supplier act).
      trigger: 'creation',
      requiredRole: 'supplierdoc:upload',
      requiredFields: ['supplierId', ...DECLARATION_FIELDS],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // The supplier declares against a slot the buyer opened — or re-declares
      // after a refusal.
      id: 't_supplierdoc_submit',
      from: ['Awaiting Upload', 'Rejected'],
      to: 'Under Review',
      trigger: 'user',
      requiredRole: 'supplierdoc:submit',
      requiredFields: [...DECLARATION_FIELDS],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 2,
    },
    {
      // Compliance accepts the declaration. `user`, on a screen — §82.
      id: 't_supplierdoc_verify',
      from: ['Under Review'],
      to: 'Valid',
      trigger: 'user',
      requiredRole: 'supplierdoc:verify',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 2,
    },
    {
      // ⚠️ `rejectionReason` IS REQUIRED, and that is §80's contract enforced at
      // the verb rather than trusted at the surface: the refusal trio travels
      // together or not at all, and a refusal with no reason is the dead end
      // restated in the supplier's own language.
      id: 't_supplierdoc_reject',
      from: ['Under Review'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'supplierdoc:reject',
      requiredFields: ['rejectionReason'],
      // `requiredFields` catches ABSENT; the hook catches BLANK. The dispatcher's
      // emptiness check admits a string of spaces, and this text is rendered to
      // the supplier verbatim.
      policyHooks: [POLICY_HOOKS.SUPPLIERDOC_REFUSAL_AUTHORED],
      surfaceable: { surfaced: true },
      version: 2,
    },
  ],
};
