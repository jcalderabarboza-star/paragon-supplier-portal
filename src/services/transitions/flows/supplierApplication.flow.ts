// ────────────────────────────────────────────────────────────────────────────
// Supplier-application flow (B1). **WIRED IN THE SAME PR AS THIS FILE.**
//
// The machine behind becoming a supplier. Paragon records that somebody has
// applied, somebody picks the application up, and somebody decides it.
//
// ── ⚠️ WHY THIS MACHINE EXISTS, AND IT IS NOT "THE WIZARD NEEDED A BACKEND" ──
//
// `SupplierRegistration.tsx` minted `String(10000 + Math.floor(Math.random() *
// 90000))` and rendered it as `APP-2026-{n}`, beside a next-steps list.
// **An external party was told a numbered application exists.** Nothing
// anywhere recorded that it did. A `ProvenanceMarker` cannot un-tell a forged
// document number, and that one faced OUTWARD — at a party with no seat, no
// login and no way to check.
//
// This file is the record that makes a number true, and **B3 closed the loop
// from both ends**: `/buyer/supplier-applications` raises real applications
// through `t_application_submit`, and `/register`'s mint is deleted rather than
// re-pointed. It was never the door — `middleware.js` matches `'/(.*)'`, so
// that page has only ever been shown to holders of Paragon's own credential.
// Line references are deliberately NOT restated here: the two this paragraph
// carried (`:1289`, `:1203`) both moved within one batch of being written.
//
// ── ⚠️ NO `Draft` STATE, AND THAT IS A RULING RATHER THAN AN OMISSION ────────
//
// The wizard IS the draft. It holds five steps of `useState` that nothing may
// read, because a half-filled form is not a fact about the world — and a
// `Draft` state here would be a row in a store claiming otherwise, reviewable
// by a buyer who would be reading somebody's abandoned typing. The entity is
// born at the moment somebody commits to it: one birth edge, empty `from`.
//
// ── ⚠️ BUYER-SIDE ONLY, AND THE MECHANISM IS THE ATOM, NOT A COMMENT ─────────
//
// All three atoms sit in BUYER lanes (`businessRoles.ts`), so no supplier seat
// can hold one; `surfaceable.test.ts` re-derives that every run. An applicant
// is not a tenant — it has no `supplierId`, so it cannot be scoped by the
// mechanism every other entity uses, and the seeded supplier seat is somebody
// else entirely. **An existing supplier applying to become one is not a thing
// this models.**
//
// ── ⚠️ BOTH ENDINGS ARE TERMINAL, AND THE CONTRAST WITH `supplierDocument`
//     IS DELIBERATE RATHER THAN AN INCONSISTENCY ────────────────────────────
//
// `supplierDocument` keeps its refusal NON-terminal on the express ground that
// a terminal one would be *"the dead-end shape authored on purpose, one state
// after the platform finally told the supplier what was wrong"* — and it is
// right, because there a REQUESTED SLOT persists and the supplier holds a verb
// that refills it.
//
// **Neither half of that argument survives here, which is why the answer flips
// rather than being copied.** There is no slot: an application is a submission,
// not a container. And there is no re-submitter: the applicant holds NO VERB AT
// ALL on this machine — every atom is buyer-side — so an edge out of the
// refusal would be a Paragon person editing a decision Paragon already made,
// on the record of the decision. A second attempt is a second application, born
// through the same birth edge, and the refused one stays exactly as it was
// decided. That is a record, not a dead end.
//
// ── ⚠️ THE FOUR DECLARED DOCUMENTS ARE DATA HERE AND VERIFIED NOWHERE HERE ───
//
// npwp / nib / halal / iso are `supplierDocument`'s subject matter and that
// lane is wired (derived: `supplierDocument` ∈ `WIRED_COMMAND_TARGETS`). The
// application carries what the applicant SAYS it holds — a claim with a
// reference string — and this machine has **no verification vocabulary of any
// kind**: no status, no verified flag, no expiry. Minting one would be a sixth
// fragmented compliance vocabulary on a tree that spent I3.1 collapsing five.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

/**
 * The three shapes a request takes, as the wizard already names them.
 *
 * ⚠️ **CLOSED, AND THE VERB PROVES MEMBERSHIP RATHER THAN TRUSTING IT.**
 * `requiredFields` proves PRESENCE only, so an off-list token would reach
 * `create` and be stored as a request type nothing recognises — the
 * `QUOTATION_SUBMIT_CURRENCY_PERMITTED` lesson, one lane over.
 */
export const APPLICATION_REQUEST_TYPES = Object.freeze([
  'External SR',
  'Internal SR',
  'KOL',
] as const);

export type ApplicationRequestType = (typeof APPLICATION_REQUEST_TYPES)[number];

/** True when `v` is one of the three permitted request types. */
export function isApplicationRequestType(v: unknown): v is ApplicationRequestType {
  return (
    typeof v === 'string' &&
    (APPLICATION_REQUEST_TYPES as readonly string[]).includes(v)
  );
}

/**
 * The request type that names an EXISTING vendor, and therefore the only one
 * whose `s4Vendor` must resolve against the roster.
 *
 * Named once, here, because two places read it — the policy hook that enforces
 * the resolution and the target that performs it — and a second literal would
 * be the copy that drifts.
 */
export const VENDOR_BEARING_REQUEST_TYPE: ApplicationRequestType = 'Internal SR';

/**
 * The four documents an applicant may DECLARE it holds.
 *
 * ⚠️ **A CLOSED SET OF SUBJECTS, AND DELIBERATELY NOT A SET OF STATUSES.**
 * These name WHAT is being claimed. Whether any of them is genuine, current or
 * in scope is `supplierDocument`'s question and that lane is wired — this one
 * mints no verification vocabulary, which is the whole of ruling (e).
 */
export const APPLICATION_DECLARATION_KINDS = Object.freeze([
  'npwp',
  'nib',
  'halal',
  'iso',
] as const);

export type ApplicationDeclarationKind =
  (typeof APPLICATION_DECLARATION_KINDS)[number];

/**
 * True when `v` is a well-formed declaration: a known subject and a reference
 * with something written in it.
 *
 * ⚠️ **A BLANK REFERENCE IS REFUSED RATHER THAN DROPPED.** Silently discarding
 * a malformed entry would leave the applicant believing they declared four
 * documents and the record holding three, with nothing anywhere saying which
 * one went missing — the honest-silence rule inverted, because the silence
 * would be about a value somebody supplied.
 */
export function isApplicationDeclaration(
  v: unknown,
): v is { kind: ApplicationDeclarationKind; reference: string } {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as { kind?: unknown; reference?: unknown };
  return (
    typeof d.kind === 'string' &&
    (APPLICATION_DECLARATION_KINDS as readonly string[]).includes(d.kind) &&
    typeof d.reference === 'string' &&
    d.reference.trim() !== ''
  );
}

/**
 * What every birth must carry. Deliberately SHORT.
 *
 * ⚠️ **`s4Vendor` IS NOT HERE, AND ITS ABSENCE IS THE POINT.** It is required
 * for exactly one of the three request types, and `requiredFields` is a flat
 * per-verb list with no way to say *"required when"*. Putting it here would
 * refuse every External SR — the majority path — and leaving the conditional
 * requirement unstated anywhere would be worse. It lives in
 * `APPLICATION_INTERNAL_VENDOR_RESOLVED`, which is the only layer that can
 * express a conditional obligation AND check the value at once.
 */
export const APPLICATION_BIRTH_FIELDS = Object.freeze([
  'requestType',
  'companyName',
] as const);

export const supplierApplicationFlow: FlowDefinition = {
  entity: 'supplierApplication',
  version: 1,
  states: ['Submitted', 'Under Review', 'Approved', 'Rejected'],
  initial: 'Submitted',
  /** See the header — both endings are real endings, for a stated reason. */
  terminals: ['Approved', 'Rejected'],
  transitions: [
    {
      // The application comes into existence. One birth edge: there is no
      // half-application, and the wizard's own state is not a fact.
      id: 't_application_submit',
      from: [],
      to: 'Submitted',
      trigger: 'creation',
      requiredRole: 'application:submit',
      requiredFields: [...APPLICATION_BIRTH_FIELDS],
      policyHooks: [
        POLICY_HOOKS.APPLICATION_REQUEST_TYPE_KNOWN,
        POLICY_HOOKS.APPLICATION_INTERNAL_VENDOR_RESOLVED,
        POLICY_HOOKS.APPLICATION_DECLARATIONS_WELL_FORMED,
      ],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ **A SEPARATE EDGE RATHER THAN AN IMPLICIT ONE, AND IT EARNS ITS
      // STATE.** Collapsing this into the decision would make the queue
      // unanswerable: with two states, "nobody has looked at this yet" and
      // "somebody is looking at it" are the same row, and the question an
      // onboarding queue exists to answer is which applications are waiting on
      // a person who has not started.
      id: 't_application_start_review',
      from: ['Submitted'],
      to: 'Under Review',
      trigger: 'user',
      requiredRole: 'application:review',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ **APPROVAL IS TERMINAL IN v1 AND MINTS NOTHING** (ruled, B4 parked).
      // It records a DECISION, not a supplier: creating the vendor master
      // record is S/4HANA's act (C10 §1), and a cascade from here into a
      // supplier row would be this platform inventing master data it does not
      // own. The consumer is named and the edge is not built.
      id: 't_application_approve',
      from: ['Under Review'],
      to: 'Approved',
      trigger: 'user',
      requiredRole: 'application:decide',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1,
    },
    {
      // ⚠️ `rejectionReason` IS REQUIRED, and the hook is what makes "required"
      // mean somebody wrote something — the dispatcher's emptiness check admits
      // a string of spaces. Fourth instance of that guard in this tree, and the
      // one whose reader is furthest away: whoever eventually tells the
      // applicant has nothing else to tell them.
      id: 't_application_reject',
      from: ['Under Review'],
      to: 'Rejected',
      trigger: 'user',
      requiredRole: 'application:decide',
      requiredFields: ['rejectionReason'],
      policyHooks: [POLICY_HOOKS.APPLICATION_REFUSAL_AUTHORED],
      surfaceable: { surfaced: true },
      version: 1,
    },
  ],
};
