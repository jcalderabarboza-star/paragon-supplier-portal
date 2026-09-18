// ════════════════════════════════════════════════════════════════════════════
// ⚠️  SYNTHETIC — ILLUSTRATIVE PREFERRED SUPPLIER LIST. NOT A REAL PSL.  ⚠️
// ════════════════════════════════════════════════════════════════════════════
//
// Every supplier named here is the platform's own honestly-fictional roster
// (`data/mockSuppliers.ts` — "PT Sample …"), every material code is a real
// `MATERIAL_MASTER` key, and **which supplier holds which designation is
// INVENTED.** That is the same three-layer honesty split `complianceRegistry.ts`
// settled on, and it is placed here for the same reason: a reviewer must be able
// to see which half is fabricated without leaving the file.
//
// ── ⚠️ THE ANCHOR, AND WHY IT IS THE CONTRACT ANCHOR BY REFERENCE ───────────
//   The corpus is authored against `SHARED_CONTRACT_ANCHOR` and shifted onto
//   `DECLARED_PRESENT` at module load, so every row's projected status is
//   decided by its own anchor alone (`fixturePresent.ts`'s algebra — `P`
//   cancels).
//
//   ⚠️ **THE REASON IS NOT THE ONE THE SCOPE REPORT GAVE, AND THE OLD ONE IS
//   RETIRED RATHER THAN REPEATED.** The scope report argued for sharing because
//   *"the contract-term exception means listing and contract dates would be
//   compared"* — a CROSS-FAMILY comparison, which is exactly what `P` does not
//   cancel for. **The operator then ruled that exception NOT BUILDABLE** (a
//   contract carries no material codes), so P1 compares no listing date against
//   any contract date and that argument is void.
//
//   What survives is narrower and is the actual reason: **a second date literal
//   that happens to equal the first is the drift `SHARED_CONTRACT_ANCHOR` was
//   named to prevent.** So `psl` takes that constant BY REFERENCE and is
//   deliberately NOT a member of `SHARED_ANCHOR_FAMILIES` — that set means
//   "constrained by a shared INTERSECTION", and `psl` is constrained only by its
//   own window, which is derived below from the shipped classifier.
//
// ── THE COHERENT WINDOW, DERIVED FROM THE SHIPPED CLASSIFIER ────────────────
//   `psl` stores NO clock-derived state (law 0.5), so — like `contract` and
//   `invoice` — its window is the range of anchors at which the AUTHORED
//   literals still tell the story the author meant, swept against
//   `pslDisplayStatus` itself rather than against any authored `status` field.
//   `pslListings.fixture.test.ts` re-derives it every run and pins BOTH edges,
//   so the window cannot silently widen when a row is re-dated.
//
//     early edge  psl-005  (one day sooner it has not STARTED — reads Scheduled)
//     late  edge  psl-004  (one day later it reads Expiring — it must read Listed)
//
//   ⚠️ **THE EARLY EDGE MOVED ONCE, AND IT IS RECORDED RATHER THAN RE-FITTED.**
//   It was psl-003's END until the projection gained a START boundary
//   (`Scheduled`, added because a probe convicted the first draft); psl-005's
//   `validFrom` binds later, so it strays first.
//
// ── ⚠️ WHAT THIS CORPUS IS FOR, ROW BY ROW ─────────────────────────────────
//   Every row below exists to exercise ONE thing the projection or a surface
//   must get right. None is filler, and the intent is stated per row so a later
//   edit cannot quietly delete a case while leaving a plausible row behind.
//
// ── ⚠️ NO ROW STORES A COMPUTED CLOCK STATE ────────────────────────────────
//   `lifecycle` is a transition-state a human act enters. There is no
//   `daysRemaining`, no `isExpired`, no `'Expired'` lifecycle. Expiry is
//   `pslDisplayStatus(row, nowIso)` and nothing else.
// ════════════════════════════════════════════════════════════════════════════

import { shiftFields, shiftIso } from '../../fixturePresent';
import type { PslListing, PslStatusChange } from '../../pslListing';
import type { ActorAttribution } from '../../../../lib/enforcement';

/**
 * Every actor in this tree is unattributed — `CurrentIdentity.actor` is
 * `UNATTRIBUTED: NO_PERSON_IN_SESSION` everywhere — so a fixture that named a
 * person would invent the one fact the platform cannot hold. Named once here so
 * no row can quietly differ.
 */
const NOBODY: ActorAttribution = {
  kind: 'UNATTRIBUTED',
  reason: 'NO_PERSON_IN_SESSION',
};

const history = (
  entries: readonly Omit<PslStatusChange, 'by'>[],
): readonly PslStatusChange[] => entries.map((e) => ({ ...e, by: NOBODY }));

/**
 * THE RAW LITERALS — authored against `SHARED_CONTRACT_ANCHOR` (2026-05-24).
 * Kept readable in source, exactly as every other anchored family does: the
 * authoring intent a reviewer needs must never be encoded away into an offset.
 */
const PSL_LISTINGS_RAW: readonly PslListing[] = [
  // ── sup-002 · PT Sample Specialty Fats — THE MULTI-LISTING SUPPLIER ──────
  {
    // INTENT: in force, comfortably. PUBLISHED. The Directory's best-status
    // badge for sup-002 must read `Sole Source` because of this row.
    id: 'psl-001',
    supplierId: 'sup-002',
    scope: { kind: 'material', materialCodes: ['RM-PSTN-7150', 'RM-STEAR-7300'] },
    status: 'Sole Source',
    lifecycle: 'Listed',
    validFrom: '2026-02-23',
    validUntil: '2027-02-28',
    capDaysOverride: null,
    capJustification: null,
    capDecidedBy: null,
    capDecidedAt: null,
    justification:
      'Sole regional source for pressed stearin at food-grade specification; ' +
      'no qualified alternative within the lead-time window.',
    evidenceRefs: ['doc-101', 'doc-102'],
    proposedBy: NOBODY,
    decidedBy: NOBODY,
    publishedAt: '2026-02-25T09:12:00+07:00',
    publishedBy: NOBODY,
    statusHistory: history([
      {
        at: '2026-02-23T08:00:00+07:00',
        from: null,
        to: 'Sole Source',
        lifecycle: 'Proposed',
        reason: 'Raised after the single-source review flagged no alternative.',
      },
      {
        at: '2026-02-24T14:30:00+07:00',
        from: 'Sole Source',
        to: 'Sole Source',
        lifecycle: 'Listed',
        reason: 'Exclusivity evidence accepted.',
      },
    ]),
  },
  {
    // INTENT: IN FORCE BUT EXPIRING (45 days out at the anchor), and
    // deliberately UNPUBLISHED — the operator's "in force and internal" case.
    // It is also what proves publication and in-force are independent axes.
    id: 'psl-002',
    supplierId: 'sup-002',
    scope: { kind: 'material', materialCodes: ['RM-MYRST-7310'] },
    status: 'Validated',
    lifecycle: 'Listed',
    validFrom: '2026-03-25',
    validUntil: '2026-07-08',
    capDaysOverride: null,
    capJustification: null,
    capDecidedBy: null,
    capDecidedAt: null,
    justification:
      'Pre-qualified on quality and lead time; competitive bidding still applies.',
    evidenceRefs: ['doc-101'],
    proposedBy: NOBODY,
    decidedBy: NOBODY,
    publishedAt: null,
    publishedBy: null,
    statusHistory: history([
      {
        at: '2026-03-25T10:05:00+07:00',
        from: null,
        to: 'Validated',
        lifecycle: 'Listed',
        reason: 'Pre-qualification completed by the sourcing squad.',
      },
    ]),
  },
  {
    // INTENT: PUBLISHED AND SINCE EXPIRED — the operator's third fixture case,
    // and the one that proves the two axes do not move together. It must NOT
    // contribute to sup-002's best status (stage 1 discards it) even though it
    // carries the more restrictive designation.
    id: 'psl-003',
    supplierId: 'sup-002',
    scope: { kind: 'material', materialCodes: ['RM-EMUL-9410'] },
    status: 'Mandatory',
    lifecycle: 'Listed',
    validFrom: '2025-07-28',
    validUntil: '2026-04-24',
    capDaysOverride: null,
    capJustification: null,
    capDecidedBy: null,
    capDecidedAt: null,
    justification:
      'Directed spend under the approved emulsifier sourcing strategy.',
    evidenceRefs: ['doc-102'],
    proposedBy: NOBODY,
    decidedBy: NOBODY,
    publishedAt: '2025-07-30T11:00:00+07:00',
    publishedBy: NOBODY,
    statusHistory: history([
      {
        at: '2025-07-28T09:00:00+07:00',
        from: null,
        to: 'Mandatory',
        lifecycle: 'Listed',
        reason: 'Sourcing strategy approved; supply directed for the term.',
      },
    ]),
  },

  // ── sup-005 · Sample Personal Care Emulsifiers GmbH ──────────────────────
  {
    // INTENT: A PER-LISTING CAP OVERRIDE THAT BINDS. The authored `validUntil`
    // is 2026-12-10 (+200 from the anchor); the 150-day override measured from
    // `validFrom` pulls the effective end back to +120. A reader who ignored
    // the cap would show this listing running four months longer than it does.
    id: 'psl-004',
    supplierId: 'sup-005',
    scope: { kind: 'material', materialCodes: ['AI-NIAC-6601', 'AI-PANTO-6640'] },
    status: 'Mandatory',
    lifecycle: 'Listed',
    validFrom: '2026-04-24',
    validUntil: '2026-12-10',
    capDaysOverride: 150,
    capJustification:
      'Shortened against the default: the qualification rests on a single ' +
      'audit cycle and must be re-taken before the next campaign.',
    capDecidedBy: NOBODY,
    capDecidedAt: '2026-04-24T16:20:00+07:00',
    justification:
      'Directed source for actives under the approved 2026 sourcing strategy.',
    evidenceRefs: ['doc-201', 'doc-202'],
    proposedBy: NOBODY,
    decidedBy: NOBODY,
    publishedAt: '2026-04-26T08:45:00+07:00',
    publishedBy: NOBODY,
    statusHistory: history([
      {
        at: '2026-04-24T09:30:00+07:00',
        from: null,
        to: 'Mandatory',
        lifecycle: 'Listed',
        reason: 'Approved with a shortened validity, justification recorded.',
      },
    ]),
  },
  {
    // INTENT: AN OVERRIDE THAT EXCEEDS THE CEILING. 2000 days is refused down
    // to `PSL_CAP_CEILING_DAYS`, which pulls the effective end back from the
    // authored 2028-11-09 to `validFrom + ceiling`. The row exists so the
    // ceiling is exercised by DATA and not only by a synthetic test input.
    id: 'psl-005',
    supplierId: 'sup-005',
    scope: { kind: 'material', materialCodes: ['AI-HYALU-6610'] },
    status: 'Validated',
    lifecycle: 'Listed',
    validFrom: '2026-05-04',
    validUntil: '2028-11-09',
    capDaysOverride: 2000,
    capJustification:
      'Requested to run with the multi-year supply arrangement; recorded as ' +
      'asked and bounded by the platform ceiling.',
    capDecidedBy: NOBODY,
    capDecidedAt: '2026-05-04T13:10:00+07:00',
    justification: 'Pre-qualified on quality; continues to compete on price.',
    evidenceRefs: ['doc-201'],
    proposedBy: NOBODY,
    decidedBy: NOBODY,
    publishedAt: null,
    publishedBy: null,
    statusHistory: history([
      {
        at: '2026-05-04T13:10:00+07:00',
        from: null,
        to: 'Validated',
        lifecycle: 'Listed',
        reason: 'Pre-qualification accepted for the packaging campaign.',
      },
    ]),
  },

  {
    // INTENT: THE `Scheduled` ARM — granted and decided, but its validity has
    // not opened yet. It must NOT be in force and must NOT contribute to
    // sup-005's best status. ⚠️ THIS ROW EXISTS BECAUSE A PROBE CONVICTED THE
    // PROJECTION: the first draft read only the END of the validity, so a
    // listing effective next quarter suspended bidding today
    // (`pslProjection.ts`'s note). A synthetic input proves the arm runs; this
    // row proves the arm is REACHED by data a surface actually renders.
    id: 'psl-009',
    supplierId: 'sup-005',
    scope: { kind: 'material', materialCodes: ['RM-EMUL-9440'] },
    status: 'Mandatory',
    lifecycle: 'Listed',
    validFrom: '2026-07-03',
    validUntil: '2027-10-06',
    capDaysOverride: null,
    capJustification: null,
    capDecidedBy: null,
    capDecidedAt: null,
    justification:
      'Directed source from the start of the next campaign, once the current ' +
      'qualification lapses.',
    evidenceRefs: ['doc-202'],
    proposedBy: NOBODY,
    decidedBy: NOBODY,
    publishedAt: null,
    publishedBy: null,
    statusHistory: history([
      {
        at: '2026-05-10T09:00:00+07:00',
        from: null,
        to: 'Mandatory',
        lifecycle: 'Listed',
        reason: 'Approved ahead of the campaign, effective on its start date.',
      },
    ]),
  },

  // ── sup-007 · PT Sample Packaging Indonesia — THE ACQUITTAL CONTROLS ─────
  {
    // INTENT: THE `Withdrawn` ACQUITTAL. It sits PAST its own effective end
    // date, so a bare `isPast(validUntil)` classifier would call it Expired.
    // It must read `Withdrawn`: it did not run out, it was stopped.
    id: 'psl-006',
    supplierId: 'sup-007',
    scope: { kind: 'material', materialCodes: ['PK-PETB-8804'] },
    status: 'Validated',
    lifecycle: 'Withdrawn',
    validFrom: '2025-11-05',
    validUntil: '2026-05-19',
    capDaysOverride: null,
    capJustification: null,
    capDecidedBy: null,
    capDecidedAt: null,
    justification: 'Pre-qualified for PET bottle supply.',
    evidenceRefs: ['doc-001'],
    proposedBy: NOBODY,
    decidedBy: NOBODY,
    publishedAt: null,
    publishedBy: null,
    statusHistory: history([
      {
        at: '2025-11-05T09:00:00+07:00',
        from: null,
        to: 'Validated',
        lifecycle: 'Listed',
        reason: 'Pre-qualification completed.',
      },
      {
        at: '2026-03-02T15:40:00+07:00',
        from: 'Validated',
        to: 'Validated',
        lifecycle: 'Withdrawn',
        reason: 'Withdrawn after the tooling change was not re-qualified.',
      },
    ]),
  },
  {
    // INTENT: THE `Rejected` ACQUITTAL, and the opposite direction of the same
    // guard. It sits COMFORTABLY INSIDE its date range, so a classifier that
    // read dates alone would call it in force. It grants nothing.
    id: 'psl-007',
    supplierId: 'sup-007',
    scope: { kind: 'material', materialCodes: ['PK-ALCP-2450'] },
    status: 'Mandatory',
    lifecycle: 'Rejected',
    validFrom: '2025-12-25',
    validUntil: '2027-03-20',
    capDaysOverride: null,
    capJustification: null,
    capDecidedBy: null,
    capDecidedAt: null,
    justification:
      'Proposed as a directed source for aluminium closures.',
    evidenceRefs: [],
    proposedBy: NOBODY,
    decidedBy: NOBODY,
    publishedAt: null,
    publishedBy: null,
    statusHistory: history([
      {
        at: '2025-12-25T10:00:00+07:00',
        from: null,
        to: 'Mandatory',
        lifecycle: 'Proposed',
        reason: 'Raised by the category team.',
      },
      {
        at: '2026-01-14T11:25:00+07:00',
        from: 'Mandatory',
        to: 'Mandatory',
        lifecycle: 'Rejected',
        reason:
          'Refused: a second qualified closure supplier exists, so the ' +
          'monopoly ground does not hold.',
      },
    ]),
  },
  {
    // INTENT: THE `Proposed` ARM — not yet decided, so not in force, even
    // though its window has opened. `decidedBy` is null, which is what
    // `Proposed` means at the record level.
    id: 'psl-008',
    supplierId: 'sup-007',
    scope: { kind: 'material', materialCodes: ['FR-ROUD-4470'] },
    status: 'Sole Source',
    lifecycle: 'Proposed',
    validFrom: '2026-05-29',
    validUntil: '2027-05-29',
    capDaysOverride: null,
    capJustification: null,
    capDecidedBy: null,
    capDecidedAt: null,
    justification:
      'Proposed on exclusivity for the rose-oud accord; awaiting sign-off.',
    evidenceRefs: ['doc-002'],
    proposedBy: NOBODY,
    decidedBy: null,
    publishedAt: null,
    publishedBy: null,
    statusHistory: history([
      {
        at: '2026-05-29T09:15:00+07:00',
        from: null,
        to: 'Sole Source',
        lifecycle: 'Proposed',
        reason: 'Raised on a claimed exclusive formulation.',
      },
    ]),
  },
];

/** The date fields `shiftFields` re-times. */
const SHIFTED_FIELDS: readonly (keyof PslListing)[] = [
  'validFrom',
  'validUntil',
  'capDecidedAt',
  'publishedAt',
];

/**
 * ⚠️ **`shiftFields` REACHES TOP-LEVEL FIELDS ONLY, AND THE HISTORY IS NESTED.**
 * Left alone, every ledger entry would keep its authored day while the listing
 * around it moved — a listing granted "today" whose own ledger says it was
 * granted three months ago. So the nested `at` is shifted through the SAME
 * `shiftIso` on the SAME family; there is no second offset anywhere.
 */
function shiftHistory(rows: readonly PslListing[]): PslListing[] {
  return rows.map((r) => ({
    ...r,
    statusHistory: r.statusHistory.map((h) => ({
      ...h,
      at: shiftIso(h.at, 'psl'),
    })),
  }));
}

/** The corpus, re-timed onto `DECLARED_PRESENT`. */
export const PSL_LISTINGS: readonly PslListing[] = Object.freeze(
  shiftHistory(shiftFields(PSL_LISTINGS_RAW, 'psl', SHIFTED_FIELDS)),
);

/** The raw literals, for the anchor-window derivation only. Exported so the
 *  fixture test can sweep origins without re-reading the file as text. */
export const __pslRaw: readonly PslListing[] = PSL_LISTINGS_RAW;
