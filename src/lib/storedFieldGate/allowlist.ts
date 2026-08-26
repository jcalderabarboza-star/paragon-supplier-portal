// ─────────────────────────────────────────────────────────────────────────────
// D-F · THE STORED-FIELD ALLOWLIST — bilateral, on the loose-end census
// precedent.
//
// ── ⚠️ BILATERAL MEANS SET EQUALITY, NOT CONTAINMENT ────────────────────────
//   The gate asserts that the keys below are EXACTLY the fields the derivation
//   flags. Two failures, not one:
//     · an UNLISTED field with no non-fixture reader  → a new `certBasis`;
//     · a LISTED field that acquired one, or that was deleted → **the exemption
//       outlived its subject.**
//   The second half is the one that matters and the one containment-style
//   allowlists never have. AN EXEMPTION MUST DIE WHEN ITS SUBJECT IS FIXED, so
//   this list can only ever shrink truthfully: nobody can fix a field and leave
//   its excuse behind, because leaving the excuse behind is a red build.
//
// ── THE REASON TOKENS, AND THE ONE THAT WAS ARGUED DOWN ─────────────────────
//   Each token carries a MECHANICAL obligation, checked by the gate. A token
//   whose only obligation is prose is a token people will reach for.
//
//     `data-in-waiting`   stored, unread, awaiting a NAMED consumer. Must name
//                         `consumer`. `issueDate` is the model.
//     `contract-surface`  the SHAPE is the deliverable; no in-repo reader is
//                         expected, ever (DNA-SEED-01 catalog-coverage
//                         precedent). Must name `contract`.
//     `substrate`         computation authored ahead of the surface that calls
//                         it (the R2 precedent — `shouldCostBacktest.ts`). Must
//                         name `surface`.
//     `unadjudicated`     ⚠️ **NOT AN EXEMPTION. COUNTED DEBT.** Flagged, and
//                         ruled on by nobody yet. D-F's fence is *fix nothing
//                         the gate finds; each residue is its own ruling*, so
//                         the honest label for a residue this seat does not
//                         hold the ruling for is exactly that — and a label
//                         that can be COUNTED beats an exemption that cannot.
//                         `unadjudicatedCount()` publishes it.
//
//   A fourth substantive token — `headless-by-ruling`, for a whole module ruled
//   unwired with a named release gate — was drafted for `HalalVerification` and
//   REJECTED. It collapses into `data-in-waiting` (a named consumer plus a
//   named gate) and differs only in GRAIN, and a token that differs only in
//   grain is a token to shop for when the honest one is uncomfortable. What it
//   was actually carrying — that a SEPARATE test pins the absence — is worth
//   more as a field than as a token, so it is `pinnedBy`, and the gate asserts
//   the file it names still exists.
// ─────────────────────────────────────────────────────────────────────────────

export type ExemptionReason = 'data-in-waiting' | 'contract-surface' | 'substrate' | 'unadjudicated';

export interface Exemption {
  /** `Owner.field`, the derivation's key. */
  readonly key: string;
  readonly reason: ExemptionReason;
  /** The stated reason. Prose, and the gate requires it be substantial — the
   *  dispatch's requirement is "an allowlisted reason WITH THAT REASON STATED",
   *  and a one-word row states nothing. */
  readonly why: string;
  /** Required by `data-in-waiting`: who will read it. */
  readonly consumer?: string;
  /** Required by `contract-surface`: the contract the shape serves. */
  readonly contract?: string;
  /** Required by `substrate`: the surface that will call it. */
  readonly surface?: string;
  /** A spec that separately pins this absence. Must exist on disk. */
  readonly pinnedBy?: string;
  /** The batch that filed the row. */
  readonly since: string;
}

const D_F = 'D-F (2026-08-12)';

/**
 * THE LIST. Every row is a field the derivation flags TODAY.
 *
 * ⚠️ **MOST ROWS ARE `unadjudicated`, AND THAT IS THE HONEST STATE, NOT A
 * SHORTFALL.** D-F's fence is explicit: census and allowlist only, each residue
 * is its own ruling, fix nothing the gate finds. Assigning a substantive token
 * IS a ruling, so a token is assigned here only where the tree ALREADY carries
 * the ruling in a header or a commit. The rest are a worklist with a build
 * behind it, which is more than any of them had this morning.
 *
 * **No count is written into this prose** (§27 / `FLOOR-IN-PROSE-01`): the
 * cardinalities are `STORED_FIELD_ALLOWLIST.length` and `unadjudicatedCount()`,
 * both derived from the rows themselves, and a number typed in a comment beside
 * a list is a number that goes wrong the first time the list moves.
 */
export const STORED_FIELD_ALLOWLIST: readonly Exemption[] = Object.freeze([
  // ── data-in-waiting ────────────────────────────────────────────────────────
  {
    key: 'ComplianceRegistryEntry.issueDate',
    reason: 'data-in-waiting',
    why:
      'The D-A deletion preserved the statutory fact as knowledge rather than as a field: a legacy ' +
      'GR-39 cert term is ISSUANCE PLUS FOUR YEARS BY STATUTE, regardless of what the document prints, ' +
      'so anything computing a legacy expiry must derive it from issueDate and must never trust ' +
      'expiryDate. That computation does not exist yet; the input it will need is stored and documented.',
    consumer:
      'the legacy-term expiry derivation in services/data/complianceProjection.ts, whose header ' +
      'already names issueDate as its input (added by D-A, PR #219)',
    since: D_F,
  },
  // ── ⚠️ THE FIVE `HalalVerification.*` ROWS ARE GONE — H4 LANDED ───────────
  //   Every one of them was `data-in-waiting` naming the SAME consumer: *"H4 —
  //   the GR receiving surface, gated on D-COMP-HALAL-4 and R0.1"*. H4 shipped
  //   the certificate notice at the GR quality step, so `verdict`, `reason`,
  //   `certType`, `certNumber`, `issuer`, `expiryDate` and `supplierName` all
  //   have non-fixture readers and the gate's STALE half now demands the rows
  //   go: *an excuse left behind after the thing it excused was fixed is how a
  //   list stops being able to shrink.*
  //
  //   ⚠️ `certId` IS NOT AMONG THEM AND WAS NOT ALLOWLISTED AGAIN — **it was
  //   DELETED.** H4 was its named consumer and H4 did not consume it; a clerk
  //   quotes a certificate number, never a registry row id. Re-listing it would
  //   have meant inventing a second future consumer for a field whose first one
  //   had just declined it, which is the `certBasis` shape this gate exists to
  //   catch. See `halalVerification.ts`.
  //
  //   THE LIST SHRANK BY FIVE. That is the only direction this list is supposed
  //   to move, and it had never moved in it before.

  // ── unadjudicated — counted debt, one ruling each, none of them this seat's ─
  {
    key: 'ComplianceRegistryEntry.materialCategory',
    reason: 'unadjudicated',
    why:
      'SEAT 3 FOUND THIS BY HAND AND IT IS THE INSTRUMENT CAVEAT\'S OWN EXAMPLE: eight name hits in the ' +
      'tree, every one of them the RFQ entities\' same-named field, ZERO compliance-side readers. The ' +
      'raw-material grouping the Spine says cert grain runs at, stored on every registry row and ' +
      'consulted by no projection, no page and no machine.',
    since: D_F,
  },
  {
    key: 'ComplianceRegistryEntry.scopeText',
    reason: 'unadjudicated',
    why:
      'The other suspect Seat 3 named. What the certificate actually covers, in prose — the field a ' +
      'compliance clerk would most want on screen when deciding whether a cert backs a given receipt. ' +
      'Stored on every row, rendered nowhere, and its name occurs at NO other declaration in the tree, ' +
      'so it is unread on any reading.',
    since: D_F,
  },
  {
    key: 'ComplianceRegistryEntry.notes',
    reason: 'unadjudicated',
    why:
      'Free-text notes on a registry row, stored and never surfaced. Distinct from scopeText in that it ' +
      'has no contract at all — nothing states what a note is FOR, which is the shape that made ' +
      'certBasis carry four incompatible readings before anyone noticed.',
    since: D_F,
  },
  {
    key: 'MaterialMasterEntry.materialCode',
    reason: 'unadjudicated',
    why:
      'The master\'s own SAP code: 17 reads, every one in a spec. The tree reads materialCode ' +
      'constantly, but at OTHER declarations (line drafts, drawdown items, collaboration rows) — this ' +
      'DTO is joined to by code and never read for it. C9 §3 forbids deriving semantics from the code, ' +
      'which may be the whole reason, and that is a ruling, not a derivation.',
    since: D_F,
  },
  {
    key: 'MaterialMasterEntry.materialGroup',
    reason: 'unadjudicated',
    why:
      'The 2B-1 registry group. 34 reads and not one outside a spec — the largest test-only read count ' +
      'in the population, which makes it the clearest case that a suite can exercise a field thoroughly ' +
      'while no product surface ever asks for it.',
    since: D_F,
  },
  {
    key: 'MaterialMasterEntry.materialType',
    reason: 'unadjudicated',
    why:
      'Master material type, read in four specs and nowhere else. Sits beside halalApplicable and ' +
      'bpomApplicable — both of which ARE read in production — on the same DTO, so the DTO is live and ' +
      'this field is not.',
    since: D_F,
  },
  // ⚠️ §68 — `ActorAttribution.person` WAS HERE AND ITS EXEMPTION OUTLIVED ITS
  // SUBJECT, WHICH IS THE GATE DOING THE ONE THING A ONE-DIRECTIONAL LIST
  // CANNOT. The row read: unreachable by construction, nothing can produce a
  // RESOLVED arm and nothing reads one. The second half stopped being true the
  // moment `BuyerRequisitions` rendered an approval's attribution — the surface
  // handles BOTH arms of the union, because one that handles a single arm is
  // one that renders `[object Object]` the day the other appears. The bilateral
  // assertion went red on its own, unprompted, and named the file and the line.
  //
  // The FIRST half is still true and stays true: nothing CONSTRUCTS a RESOLVED
  // actor (C10 §2.3, pinned by the `simUsrNamespace` tripwire). A reader for a
  // value that cannot exist yet is not a contradiction — it is the arm being
  // ready before the value is, which is the opposite failure from the one this
  // list exists to catch.
  {
    key: 'EnforcementOverride.reason',
    reason: 'unadjudicated',
    why:
      'Why a person overrode a governed check — the closed vocabulary OVERRIDE_REASONS exists to make ' +
      'countable. Stored on the override, read by nothing: the count it was built to enable is not ' +
      'taken anywhere.',
    since: D_F,
  },
  {
    key: 'EnforcementOverride.overriddenVerdict',
    reason: 'unadjudicated',
    why:
      'Exactly what was overridden, bound by the distributive conditional so an ADVERSE stamp cannot ' +
      'carry an override naming UNANSWERED. The TYPE-level guarantee is live and enforced by tsc; the ' +
      'stored value is read by one spec and no surface.',
    since: D_F,
  },
  {
    key: 'EnforcementOverride.overriddenAt',
    reason: 'unadjudicated',
    why:
      'When the override was taken. Read by nothing, and its name occurs at no other declaration, so ' +
      'there is no audit view, no ordering and no retention rule consuming it.',
    since: D_F,
  },
  {
    key: 'EnforcementSetting.setBy',
    reason: 'unadjudicated',
    why:
      'Who set an enforcement mode — the attribution half of the setting, read in specs only. The mode ' +
      'itself is read throughout; the accountability field beside it is not.',
    since: D_F,
  },
  {
    key: 'GovernedCheckStampBase.checkId',
    reason: 'unadjudicated',
    why:
      'Which governed check a stamp records. Zero reads at any of the four types that expose it ' +
      '(GovernedCheckStampBase, StampFor, GovernedCheckStamp, StampPerVerdict) — a stamp is written ' +
      'at every mode, and nothing yet reads back which check it belongs to.',
    since: D_F,
  },
  {
    key: 'StampFor.verdict',
    reason: 'unadjudicated',
    why:
      'What the governed check answered. The discriminant of the stamp union, so tsc reads it ' +
      'constantly at the type level; at run time one spec reads it and no surface does.',
    since: D_F,
  },
  {
    key: 'EffectiveEnforcement.source',
    reason: 'unadjudicated',
    why:
      'Whether the mode in force was as-set or tightened by a lapsed review — the field that lets a ' +
      'block explain itself. 13 reads, all in specs. Its sibling `mode` is read in production, so this ' +
      'is a live DTO with a dark field, not a dead type.',
    since: D_F,
  },
  {
    key: 'EnforcementSeedOutcome.checkId',
    reason: 'unadjudicated',
    why:
      'Which check a seeded enforcement row was for. One spec read, and none in the seed module ' +
      'itself. The seed IS classified as a fixture by the path predicate, which changes nothing here ' +
      'because it reads its own outcome nowhere — but the classification is a judgement call and is ' +
      'recorded as one.',
    since: D_F,
  },
  {
    key: 'EnforcementSeedOutcome.reason',
    reason: 'unadjudicated',
    why:
      'Why a seed row was skipped or rewritten. Zero reads: the seed reports an outcome nobody inspects, ' +
      'which means a silent seeding failure would look exactly like a successful one.',
    since: D_F,
  },
  {
    key: 'ChannelReplyDiagnostics.materialMatch',
    reason: 'unadjudicated',
    why:
      'How a supplier reply\'s material token was matched. Five spec reads and no surface read, on a ' +
      'diagnostics type whose whole purpose is to be shown to a triaging human — the Comm Hub renders ' +
      'the qty diagnosis and not this one.',
    since: D_F,
  },
  {
    key: 'ScoringOutcome.basis',
    reason: 'unadjudicated',
    why:
      'The FX basis a quote was scored on. 13 spec reads, none in production, on the axis the 2e-c FX ' +
      'arc existed to make explicit — a score whose basis is stored but never displayed is a comparison ' +
      'the buyer cannot audit.',
    since: D_F,
  },
  {
    key: 'TolerancePctOutcome.pct',
    reason: 'unadjudicated',
    why:
      'The parsed tolerance percentage. Four spec reads; PolicyEditor consumes the outcome without ever ' +
      'reading the parsed value off it, which is worth a look on its own.',
    since: D_F,
  },
  {
    key: 'PoConfirmQtysOutcome.line',
    reason: 'unadjudicated',
    why:
      'Which PO line a confirm-quantities refusal belongs to. One spec read. A refusal that cannot say ' +
      'which line it is about is the dead-end shape HALAL-REFUSAL-DEAD-ENDS-01 records, in a different ' +
      'lane — the datum exists and the surface does not use it.',
    since: D_F,
  },
  {
    key: 'PoConfirmQtysOutcome.reason',
    reason: 'unadjudicated',
    why:
      'The refusal vocabulary member for a PO confirm. One spec read. GL-1 attached a glossary chip at ' +
      'the refusal SITES; this outcome field is a separate carrier that no site reads.',
    since: D_F,
  },
  {
    key: 'DraftOutcome.field',
    reason: 'unadjudicated',
    why:
      'Which field of an SDC draft submission was refused. Zero reads. Same shape as ' +
      'PoConfirmQtysOutcome.line: the refusal knows where it happened and nothing asks.',
    since: D_F,
  },
  {
    key: 'RefusedImportRow.batchNumber',
    reason: 'unadjudicated',
    why:
      'The batch number on a refused xlsx import row, stored so a rejected row can be identified by the ' +
      'importer. Zero reads — the import refusal surface identifies rows some other way.',
    since: D_F,
  },
  // ⚠️ `DataError.cause` STOOD HERE, AND ITS DELETION IS THIS LIST'S FIRST
  // SHRINK. The row said the field discarded "every underlying cause the data
  // layer captures"; deriving the call sites showed ZERO OF SEVEN pass a cause
  // at all, so nothing was captured and nothing was discarded — the row's prose
  // asserted a capture that does not happen. The real defect was that the field
  // was ENUMERABLE where the platform's `Error.cause` is not. Field deleted, and
  // the requirement preserved in `services/data/types.ts` beside `DataErrorCode`
  // (§41). **The gate went red BEFORE this row was removed** — `AN EXEMPTION
  // OUTLIVED ITS SUBJECT · DataError.cause — the field no longer exists` — which
  // is the whole point of the bilateral half and its first exercise.
]);

/** Rows still awaiting a ruling. Published by the gate so the debt is a number
 *  somebody can watch fall, rather than a shape somebody has to go and count. */
export function unadjudicatedCount(): number {
  return STORED_FIELD_ALLOWLIST.filter((e) => e.reason === 'unadjudicated').length;
}
