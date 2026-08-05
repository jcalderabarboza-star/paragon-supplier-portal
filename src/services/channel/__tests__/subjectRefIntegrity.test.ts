// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-5a — THE REFERENTIAL-INTEGRITY LEG.
//
// ── WHY THIS EXISTS, AND WHY THE MEANING SCOPE COULD NOT BE THE WHOLE PROOF ──
//   R-A folds the meaning-scope derivation inside 2B-5 as the PROOF that the
//   third space was resolved. That proof has a hole, and 2B-5a's investigation
//   found it: `MAT-10234` and `MAT-20500` STATE NO MEANING ANYWHERE, under any
//   field-name rule. No widening of what counts as a meaning reaches them — and
//   yet both CONTRADICT THE OBJECT THEY NAME, on three axes each.
//
//   That is a different KIND of identity defect from a collision. A collision is
//   two statements disagreeing about one thing. This is a statement about a
//   thing THAT IS NOT THE THING IT NAMES — and a mute code cannot collide with
//   anything, so a census built entirely on meanings reports it clean.
//
//     A REFERENCE THAT RESOLVES TO NOTHING ASSERTS NOTHING, AND IS THEREFORE
//     INVISIBLE TO EVERY CHECK THAT LOOKS FOR CONTRADICTIONS.
//
// ── WHAT WAS WRONG BEFORE THIS BATCH (six axes, both records) ───────────────
//   `obr-0001` addressed sup-005 and named `sa-0002` — which belongs to sup-007
//   — at `itemSeq: 1`, an item sequence that agreement does not have (its items
//   are 10 and 20), for `MAT-10234`, a code the agreement's item does not carry
//   (`PK-PETB-8810`). `obr-0002` did the same to `sa-1001` (sup-001,
//   `RM-EMUL-3310`). SIX MISMATCHES, none of them detectable by any pin in the
//   tree, because the chase lane and the agreement lane were only ever read
//   separately.
//
// ── THE FIX IS A DEFECT FIX, NOT AN ADOPTION ────────────────────────────────
//   `supplierId` is AUTHORITATIVE and the refs moved to match it: identity
//   scoping is enforced on `supplierId` (`applySupplierScope`), so a chase
//   addressed to a supplier about another supplier's agreement is wrong in the
//   direction that matters. Each record now names an agreement its own
//   addressee owns, at a real item sequence, for that item's own material code,
//   on a real release date. NOTHING WAS ADOPTED: no code changed meaning, no
//   master row moved, and every value below is READ FROM the agreement fixture
//   rather than chosen for it.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { OUTBOUND_REQUEST_SEED } from '../outboundFixtures';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import { axis } from '../../testing/referentialIntegrity';

const AGREEMENTS = schedulingAgreementStore.all();

const REFS = OUTBOUND_REQUEST_SEED.flatMap((r) => r.subjectRefs.map((ref) => ({ r, ref })));

/**
 * ⚠️ THE GUARD THIS FILE NEEDED ON ITS FIRST RUN, AND THE REASON IS WORTH
 * KEEPING. Axes 4 and 5 below both filter on the referenced ITEM being found.
 * On the broken fixture the item was NOT found — `itemSeq: 1` does not exist —
 * so both axes examined ZERO refs and **passed green while the data was wrong.**
 * Axis 3 caught the real defect; axes 4 and 5 reported an all-clear about
 * nothing, in the batch whose whole subject is checks that pass because they
 * found nothing to do. THIRD APPEARANCE OF THE SHAPE, and this time in the
 * check being written to catch it.
 *
 * So every axis states how many refs it EXAMINED, and the count is asserted.
 *
 * ⚠️ 2B-5b-i — AND A GUARD YOU HAVE TO REMEMBER TO WRITE IS THE GUARD THAT WAS
 * MISSING. When the identical defect shape turned up in a SECOND lane (ASN →
 * purchase order), the answer was not a second copy of this function: the count
 * moved INTO the result type (`services/testing/referentialIntegrity.ts`), so
 * an axis cannot report disagreements without also reporting how many
 * references it resolved. `itemAxis` below is this lane's adoption of it; the
 * hand-written `examinedItems` is kept beside it deliberately, as the thing the
 * harness replaces, and the two are asserted to agree.
 */
const examinedItems = () =>
  REFS.filter(({ ref }) =>
    AGREEMENTS.find((a) => a.id === ref.agreementId)?.items.some((i) => i.lineSeq === ref.itemSeq),
  ).length;

/** Resolve a ref to the agreement ITEM it names — the step both open axes need. */
const itemOf = ({ ref }: (typeof REFS)[number]) =>
  AGREEMENTS.find((a) => a.id === ref.agreementId)?.items.find((i) => i.lineSeq === ref.itemSeq);

describe('2B-5a — every outbound subject reference RESOLVES to the object it names', () => {
  it('the population is real (guards a vacuous pass)', () => {
    // The whole suite below is `for (const ref of …)`. An empty seed satisfies
    // every one of them — the `--passWithNoTests` shape one layer in, which
    // this repository has now met twice.
    expect(OUTBOUND_REQUEST_SEED.length).toBeGreaterThan(1);
    expect(OUTBOUND_REQUEST_SEED.flatMap((r) => r.subjectRefs).length).toBeGreaterThan(1);
    expect(AGREEMENTS.length).toBeGreaterThan(5);
  });

  it('AXIS 1 — the named agreement EXISTS', () => {
    const missing = OUTBOUND_REQUEST_SEED.flatMap((r) =>
      r.subjectRefs
        .filter((ref) => !AGREEMENTS.some((a) => a.id === ref.agreementId))
        .map((ref) => `${r.id} → ${ref.agreementId}`),
    );
    expect(missing).toEqual([]);
  });

  it('AXIS 2 — the named agreement belongs to the SUPPLIER BEING CHASED', () => {
    // ⚠️ THE AXIS THAT MATTERS MOST, because it is the one identity scoping is
    // enforced on. A chase addressed to sup-005 about sup-007's agreement is
    // not a cosmetic mismatch: it is a request for one tenant's commitment sent
    // to another tenant.
    const wrong = OUTBOUND_REQUEST_SEED.flatMap((r) =>
      r.subjectRefs
        .map((ref) => ({ ref, agreement: AGREEMENTS.find((a) => a.id === ref.agreementId) }))
        .filter(({ agreement }) => agreement && agreement.supplierId !== r.supplierId)
        .map(
          ({ ref, agreement }) =>
            `${r.id} chases ${r.supplierId} about ${ref.agreementId} (owned by ${agreement!.supplierId})`,
        ),
    );
    expect(wrong).toEqual([]);
  });

  it('AXIS 3 — the named ITEM SEQUENCE exists on that agreement', () => {
    const wrong = OUTBOUND_REQUEST_SEED.flatMap((r) =>
      r.subjectRefs
        .map((ref) => ({ ref, agreement: AGREEMENTS.find((a) => a.id === ref.agreementId) }))
        .filter(
          ({ ref, agreement }) =>
            agreement && !agreement.items.some((i) => i.lineSeq === ref.itemSeq),
        )
        .map(
          ({ ref, agreement }) =>
            `${r.id} → ${ref.agreementId} itemSeq ${ref.itemSeq}; real: ${agreement!.items
              .map((i) => i.lineSeq)
              .join(', ')}`,
        ),
    );
    expect(wrong).toEqual([]);
  });

  it('AXIS 4 — the MATERIAL CODE is the one that item actually carries', () => {
    // See `examinedItems` — this axis is silent on an unresolvable item, so it
    // must say how many it looked at before claiming anything.
    expect(examinedItems()).toBe(REFS.length);
    // The axis that put `MAT-10234` and `MAT-20500` in the census at all. A
    // subject ref does not get to name its own material: the item it points at
    // already has one, and `subjectRefOf` (`outbound.ts:133-141`) derives the
    // ref from the chase entry precisely so the two cannot diverge. These two
    // seed rows were hand-authored and diverged.
    const wrong = OUTBOUND_REQUEST_SEED.flatMap((r) =>
      r.subjectRefs
        .map((ref) => ({
          ref,
          item: AGREEMENTS.find((a) => a.id === ref.agreementId)?.items.find(
            (i) => i.lineSeq === ref.itemSeq,
          ),
        }))
        .filter(({ ref, item }) => item && item.materialCode !== ref.materialCode)
        .map(
          ({ ref, item }) =>
            `${r.id} → ${ref.agreementId}/${ref.itemSeq} says ${ref.materialCode}; item carries ${item!.materialCode}`,
        ),
    );
    expect(wrong).toEqual([]);
  });

  it('AXIS 5 — the release seq and dueAt match a REAL schedule line', () => {
    expect(examinedItems()).toBe(REFS.length);
    const wrong = OUTBOUND_REQUEST_SEED.flatMap((r) =>
      r.subjectRefs
        .map((ref) => ({
          ref,
          item: AGREEMENTS.find((a) => a.id === ref.agreementId)?.items.find(
            (i) => i.lineSeq === ref.itemSeq,
          ),
        }))
        .filter(({ ref, item }) => {
          if (!item) return false;
          const line = item.scheduleLines.find((l) => l.releaseSeq === ref.releaseSeq);
          return !line || line.releaseDate !== ref.dueAt;
        })
        .map(({ ref, item }) => {
          const line = item!.scheduleLines.find((l) => l.releaseSeq === ref.releaseSeq);
          return `${r.id} → seq ${ref.releaseSeq} dueAt ${ref.dueAt}; real: ${
            line ? line.releaseDate : 'NO SUCH SEQ'
          }`;
        }),
    );
    expect(wrong).toEqual([]);
  });

  it('2B-5b-i — both open axes re-run through the SHARED harness, and agree', () => {
    // ⚠️ THE GENERALISATION, verified rather than declared. The same two axes
    // that passed vacuously in 2B-5a now run through the module the ASN lane
    // uses (`asnRefIntegrity.test.ts`), and `resolved` comes from inside the
    // resolution rather than from a second traversal the caller wrote — which
    // is precisely where the hand-written version drifted.
    const material = axis(
      REFS,
      itemOf,
      ({ ref }, item) => item.materialCode === ref.materialCode,
      ({ r, ref }, item) =>
        `${r.id} says ${ref.materialCode}; item carries ${item.materialCode}`,
    );
    const schedule = axis(
      REFS,
      itemOf,
      ({ ref }, item) =>
        item.scheduleLines.some(
          (l) => l.releaseSeq === ref.releaseSeq && l.releaseDate === ref.dueAt,
        ),
      ({ r, ref }) => `${r.id} seq ${ref.releaseSeq} dueAt ${ref.dueAt} matches no schedule line`,
    );
    // The harness and the hand-written guard must see the same population.
    expect(material.resolved).toBe(examinedItems());
    expect(schedule.resolved).toBe(examinedItems());
    // And nothing may be silently unresolved — the vacuity number, stated.
    expect(material.resolved).toBe(material.total);
    expect(material.wrong).toEqual([]);
    expect(schedule.wrong).toEqual([]);
  });

  it('the material code a chase names is MASTER-RESOLVABLE — no third-space code survives here', () => {
    // ⚠️ THE RESULT, stated as a property rather than as two corrected literals.
    // Before 2B-5a the chase lane contributed TWO of the twelve master-absent
    // codes. It contributes NONE — not because they were deleted, but because
    // the refs now name the material their own subject carries, and every
    // agreement item derives its unit from the master via `requireUom`. THE
    // THIRD-SPACE CODES WERE NEVER THE CHASE LANE'S VOCABULARY; they were two
    // wrong answers to a question the agreement had already answered.
    const codes = [
      ...new Set(OUTBOUND_REQUEST_SEED.flatMap((r) => r.subjectRefs.map((s) => s.materialCode))),
    ].sort();
    expect(codes).toEqual(['AI-NIAC-6601', 'PK-PETB-8810']);
    expect(codes.filter((c) => c.startsWith('MAT-'))).toEqual([]);
  });
});
