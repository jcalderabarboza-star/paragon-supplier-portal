// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE PSL CORPUS — ITS HONESTY, ITS SHAPE, AND ITS ANCHOR WINDOW.
//
// ⚠️ **THE WINDOW IS RE-DERIVED HERE EVERY RUN, NOT RESTATED.** `FAMILY_ANCHORS
// .psl.window` carries two dates; this file sweeps candidate anchors through the
// SHIPPED classifier and asserts that the declared edges are the real ones —
// BOTH that the window holds inside them and that it BREAKS one day outside.
// A window asserted only from the inside is a window that can silently widen.
//
// ── ⚠️ WHY `pslDisplayStatus(RAW_ROW, A')` IS THE RIGHT ORACLE ─────────────
//   `fixturePresent`'s algebra: a row authored at `d` renders at `d + (P − A)`,
//   so its day-count at `P` is `d − A`. Reading the RAW row at the candidate
//   anchor `A'` gives `d − A'` — the same number. So sweeping anchors over the
//   raw literals is exactly sweeping the rendered corpus over presents, with no
//   second implementation of the shift to disagree with the first.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripSourceComments } from '../../lib/sourceScan/stripComments';

import {
  FAMILY_ANCHORS,
  SHARED_ANCHOR_FAMILIES,
  SHARED_CONTRACT_ANCHOR,
} from './fixturePresent';
import { seedPslListings, PSL_SEEDS_RAW, pslSeedRawRows } from './mock/pslSeed';
import { pslStore } from './mock/stores/pslStore';
import { pslModulesRelative } from '../../test/pslModules';
import { MATERIAL_MASTER } from '../sdc/fixtures';
import { mockSuppliers } from '../../data/mockSuppliers';
import { DOCUMENTS } from './mock/fixtures/supplierDocuments';
import { isPslStatus, PSL_LIFECYCLES } from './pslListing';
import { pslDisplayStatus, type PslDisplayStatus } from './pslProjection';
import type { PslListing } from './pslListing';
import { isSampleActor } from '../identity/sampleRoster';

/**
 * THE CORPUS, GROWN RATHER THAN IMPORTED (PSL P3, operator ruling h). It does
 * not exist until the seed has run, which is why this is a FUNCTION.
 */
const pslRows = (): readonly PslListing[] => pslStore.all();

// ⚠️ SEEDED ONCE, THROUGH THE REAL VERBS, UNDER LANE-CORRECT SCOPES. The
// seed's own outcome is asserted: a half-seeded store would make every
// assertion in this file a different, quieter test.
beforeAll(async () => {
  pslStore.reset();
  const outcome = await seedPslListings();
  expect(outcome.status, outcome.reason ?? '').toBe('seeded');
});

const MS = 86_400_000;
const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const shift = (base: string, n: number): string => iso(Date.parse(base) + n * MS);

/**
 * THE AUTHORED INTENT, ROW BY ROW. This is the oracle — it is what the corpus
 * MEANS, and it is stated here rather than read off a `status` field because
 * the corpus deliberately carries no such field (law 0.5).
 */
const INTENT: Readonly<Record<string, PslDisplayStatus>> = {
  'psl-001': 'Listed',
  'psl-002': 'Expiring',
  'psl-003': 'Expired',
  'psl-004': 'Listed',
  'psl-005': 'Listed',
  'psl-006': 'Withdrawn',
  'psl-007': 'Rejected',
  'psl-008': 'Proposed',
  'psl-009': 'Scheduled',
  // PSL P4 — the two sup-007 rows the supplier-facing view is built on, and the
  // sup-008 row that restores the LAPSED Directory cell they took away.
  'psl-010': 'Expiring',
  'psl-011': 'Withdrawn',
  'psl-012': 'Withdrawn',
};

/** Does every raw row still tell its intended story if the family were anchored
 *  at `candidate`?
 *
 *  ⚠️ **THE RAW ROWS ARE NOW THE SEED'S, NOT A FIXTURE'S** — `pslSeedRawRows()`
 *  derives `(id, lifecycle, validFrom, validUntil, capDaysOverride)` from the
 *  payloads and each row's WALK, so there is still exactly one place the raw
 *  literals live and still no second implementation of the shift. The ledger
 *  instants that used to be authored are store-assigned now and are not part of
 *  this oracle, because a projection never reads one.
 *
 *  ⚠️ **AND THE CAP LEDGER IS PASSED EMPTY, DELIBERATELY.** The sweep asks what
 *  the corpus means under the PORTAL DEFAULT; a recorded default would move
 *  every uncapped row's effective end and the window with it, so leaving it to
 *  the store would make this derivation depend on a decision nobody has taken. */
const coherentAt = (candidate: string): boolean =>
  pslSeedRawRows().every(
    (r) => pslDisplayStatus(r, candidate, []) === INTENT[r.id],
  );

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the populations are real, else everything below is vacuous', () => {
  it('the corpus, the master, the roster and the document shelf are all non-empty', () => {
    // ⚠️ MEMBERSHIP FIRST. The store SEEDS EMPTY, so every assertion in this
    // file would pass vacuously over `[]` — `EMPTY-INPUT-REPORTS-CLEAN-01`.
    expect(pslRows().map((r) => r.id)).toContain('psl-001');
    expect(pslRows().length).toBe(PSL_SEEDS_RAW.length);
    expect(pslRows().length).toBeGreaterThan(5);
    expect(Object.keys(MATERIAL_MASTER).length).toBeGreaterThan(20);
    expect(mockSuppliers.length).toBeGreaterThan(5);
    expect(DOCUMENTS.length).toBeGreaterThan(5);
  });

  it('⚠️ the SEED ids are positional — psl-NNN follows the dispatch order', () => {
    // The store mints identity and the seed does not choose it, so this is the
    // assertion that keeps the deep-link ids (`?id=psl-003`) pointing at the
    // governance decision they have always pointed at.
    expect(pslRows().map((r) => r.id)).toEqual(pslSeedRawRows().map((r) => r.id));
  });

  it('⚠️ the AUTHORED days are SHIFTED and the LEDGER is STORE-ASSIGNED', () => {
    // Without the first half this file could be asserting over an unshifted
    // corpus, and every claim would be true of something nobody renders.
    expect(pslRows().map((r) => r.validUntil)).not.toEqual(
      pslSeedRawRows().map((r) => r.validUntil),
    );
    // ⚠️ THE SECOND HALF REPLACES AN ASSERTION THAT CAN NO LONGER BE MADE, AND
    // THE SUBJECT CHANGED RATHER THAN WEAKENED. It used to read *"the nested
    // ledger moved with it"* — a claim about `shiftHistory`, which existed
    // because the ledger instants were AUTHORED. They are store-assigned now
    // (the `pinnedAt` discipline), so there is nothing to shift; what must be
    // true instead is that the store really assigned them.
    const first = pslRows()[0].statusHistory[0].at;
    expect(first).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(first.slice(0, 10)).not.toBe(pslRows()[0].validFrom.slice(0, 10));
  });

  it('the INTENT oracle names every row, and only rows that exist', () => {
    expect(Object.keys(INTENT).sort()).toEqual(pslSeedRawRows().map((r) => r.id).sort());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE ANCHOR WINDOW — derived from the shipped classifier, both edges', () => {
  const A = FAMILY_ANCHORS.psl.anchor;
  const [lo, hi] = FAMILY_ANCHORS.psl.window!;

  it('the declared anchor is coherent', () => {
    expect(coherentAt(A)).toBe(true);
  });

  it('⚠️ the declared edges hold, and ONE DAY OUTSIDE EACH IT BREAKS', () => {
    expect(coherentAt(lo)).toBe(true);
    expect(coherentAt(hi)).toBe(true);
    // The half that makes it a pin rather than a claim.
    expect(coherentAt(shift(lo, -1))).toBe(false);
    expect(coherentAt(shift(hi, 1))).toBe(false);
  });

  it('every day INSIDE the window is coherent — it is a band, not two points', () => {
    for (let d = Date.parse(lo); d <= Date.parse(hi); d += MS) {
      expect(coherentAt(iso(d)), iso(d)).toBe(true);
    }
  });

  it('the named edge rows are the ones that actually break, and NO OTHER ROW DOES', () => {
    const raw = (id: string) => pslSeedRawRows().find((r) => r.id === id)!;
    // ⚠️ THE LABELS AND THE EDGE ROWS BELOW ARE MEASURED, NOT PREDICTED, AND
    // BOTH PREDICTIONS WERE WRONG ONCE — recorded because a re-fitted window is
    // exactly what this spec exists to prevent.
    //   (1) psl-003 was predicted to read `Listed` one day before `lo`; it
    //       reads `Expiring` — its effective end IS `validUntil`, so at `lo` the
    //       count is 0 (TODAY IS PAST → Expired) and one day earlier it is 1,
    //       inside the expiring window rather than outside it.
    //   (2) psl-003 was then the declared EARLY EDGE, and it stopped being one
    //       the moment the projection gained a START boundary: psl-005's
    //       `validFrom` binds later, so it strays first.
    expect(pslDisplayStatus(raw('psl-005'), shift(lo, -1), [])).toBe('Scheduled');
    // psl-004 must read Listed; one day past `hi` it has slipped into Expiring.
    expect(pslDisplayStatus(raw('psl-004'), shift(hi, 1), [])).toBe('Expiring');

    // ⚠️ AND THE HALF THAT MAKES THEM *THE* EDGE ROWS: at one day outside each
    // edge, they are the ONLY rows that have left their intent. A comment
    // naming an edge row is a claim; this is the measurement.
    const strayed = (candidate: string): string[] =>
      pslSeedRawRows()
        .filter((r) => pslDisplayStatus(r, candidate, []) !== INTENT[r.id])
        .map((r) => r.id);
    expect(strayed(shift(lo, -1))).toEqual(['psl-005']);
    expect(strayed(shift(hi, 1))).toEqual(['psl-004']);
  });

  it('⚠️ the anchor is SHARED_CONTRACT_ANCHOR by reference, and psl is NOT intersection-constrained', () => {
    expect(A).toBe(SHARED_CONTRACT_ANCHOR);
    // The distinction the entry's comment turns on: reusing the VALUE is not
    // joining the shared-intersection set, and the tolerance rule reads that
    // set. If `psl` were ever added there, its tolerance would have to be
    // re-derived from the intersection instead of its own window.
    expect((SHARED_ANCHOR_FAMILIES as readonly string[]).includes('psl')).toBe(false);
  });

  it('the declared tolerance is the distance to the NEARER edge', () => {
    const toLo = Math.round((Date.parse(A) - Date.parse(lo)) / MS);
    const toHi = Math.round((Date.parse(hi) - Date.parse(A)) / MS);
    expect(FAMILY_ANCHORS.psl.toleranceDays).toBe(Math.min(toLo, toHi));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE HONESTY LAYERS — asserted where they live', () => {
  it('every supplier named is on the platform`s own roster', () => {
    const ids = new Set(mockSuppliers.map((s) => s.id));
    for (const r of pslRows()) expect(ids.has(r.supplierId), r.id).toBe(true);
  });

  it('⚠️ every material code is a REAL master code — the seam holds', () => {
    const master = new Set(Object.keys(MATERIAL_MASTER));
    const named = pslRows().flatMap((r) =>
      r.scope.kind === 'material' ? [...r.scope.materialCodes] : [],
    );
    expect(named.length).toBeGreaterThan(5);
    expect(named.filter((c) => !master.has(c))).toEqual([]);
  });

  it('every evidence reference names a document that exists', () => {
    const docs = new Set(DOCUMENTS.map((d) => d.id));
    const refs = pslRows().flatMap((r) => [...r.evidenceRefs]);
    expect(refs.length).toBeGreaterThan(3);
    expect(refs.filter((r) => !docs.has(r))).toEqual([]);
  });

  it('⚠️ every evidence reference is a document belonging to THAT supplier', () => {
    const owner = new Map(DOCUMENTS.map((d) => [d.id, d.supplierId]));
    for (const r of pslRows()) {
      for (const ref of r.evidenceRefs) {
        expect(owner.get(ref), `${r.id} → ${ref}`).toBe(r.supplierId);
      }
    }
  });

  // ⚠️ **THE PREMISE WAS REVERSED BY RULING (R4), AND THE CLAIM IS REPLACED
  // RATHER THAN DROPPED.** This read *"NO ROW NAMES A PERSON — every actor is
  // unattributed"*. The seeded corpus now carries SAMPLE actors, which is what
  // makes both four-eyes directions reachable from it. Deleting the assertion
  // would leave the corpus with no honesty claim on its actors at all — so the
  // claim narrows instead: every named actor must be a ROSTER MEMBER, because
  // an id resolving to nobody is the manufactured provenance C10 §6.3 forbids
  // whether or not it is spelled like a fixture person.
  it('⚠️ EVERY ACTOR IS A SAMPLE PERSON — on the roster, and never anybody else', () => {
    const actors = pslRows().flatMap((r) => [
      r.proposedBy,
      r.decidedBy,
      r.capDecidedBy,
      r.publishedBy,
      ...r.statusHistory.map((h) => h.by),
    ]).filter((a) => a !== null);
    expect(actors.length).toBeGreaterThan(10);
    for (const a of actors) {
      expect(a!.kind).toBe('RESOLVED');
      expect(a!.kind === 'RESOLVED' && isSampleActor(a!.person.personId)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE RECORD`S OWN RULES, across the corpus', () => {
  it('⚠️ NO ROW STORES A COMPUTED CLOCK STATE (law 0.5)', () => {
    // A row may not carry a day-count, a computed flag, or a clock word in its
    // lifecycle. `Expired` / `Expiring` are absent from `PslLifecycle` by
    // construction; this catches a field SMUGGLED onto a row instead.
    const forbidden = /^(daysRemaining|daysUntil|isExpired|isExpiring|expired|expiring|inForce|daysLeft)$/i;
    for (const r of pslRows()) {
      for (const key of Object.keys(r)) {
        expect(forbidden.test(key), `${r.id} stores a computed clock state: ${key}`).toBe(
          false,
        );
      }
      expect((PSL_LIFECYCLES as readonly string[]).includes(r.lifecycle), r.id).toBe(true);
    }
  });

  it('every status is a member of the vocabulary', () => {
    for (const r of pslRows()) expect(isPslStatus(r.status), r.id).toBe(true);
  });

  it('⚠️ only `kind: material` has a producer — the other members are unreachable', () => {
    // The type declares three; P1 ships one. If a fixture ever produces one of
    // the other two, the surfaces that assume a material scope stop being
    // exhaustive and this is where it is noticed.
    expect(pslRows().every((r) => r.scope.kind === 'material')).toBe(true);
  });

  it('a Proposed listing has no decider; a decided one has one', () => {
    for (const r of pslRows()) {
      if (r.lifecycle === 'Proposed') expect(r.decidedBy, r.id).toBeNull();
      else expect(r.decidedBy, r.id).not.toBeNull();
    }
    expect(pslRows().some((r) => r.lifecycle === 'Proposed')).toBe(true);
  });

  it('the status ledger is non-empty, oldest-first, and ends at the stored lifecycle', () => {
    for (const r of pslRows()) {
      expect(r.statusHistory.length, r.id).toBeGreaterThan(0);
      const ats = r.statusHistory.map((h) => h.at);
      expect(ats, r.id).toEqual([...ats].sort());
      expect(r.statusHistory[r.statusHistory.length - 1].lifecycle, r.id).toBe(r.lifecycle);
      for (const h of r.statusHistory) expect(h.reason.length, r.id).toBeGreaterThan(10);
    }
  });

  it('⚠️ the publication pair travels together, and BOTH states are populated', () => {
    for (const r of pslRows()) {
      expect(
        (r.publishedAt === null) === (r.publishedBy === null),
        `${r.id}: publishedAt and publishedBy must travel together`,
      ).toBe(true);
    }
    expect(pslRows().some((r) => r.publishedAt !== null)).toBe(true);
    expect(pslRows().some((r) => r.publishedAt === null)).toBe(true);
  });

  it('⚠️ a publication date is never in the future OF THE ACT THAT RECORDED IT', () => {
    // ⚠️ **THE COMPARISON MOVED BECAUSE THE FIELD DID, AND THE CLAIM IS
    // UNCHANGED.** This read `publishedAt <= DECLARED_PRESENT` while
    // `publishedAt` was an AUTHORED day shifted onto the declared present.
    // P3 makes it STORE-ASSIGNED at the instant of the act (the `pinnedAt`
    // discipline), so it is stamped from the wall clock while the validity
    // stays anchored at `P` — two different clocks, and comparing them asks a
    // question neither answers. The property worth holding is the one that was
    // always meant: **the platform does not mint a publication date in the
    // future.** That is asserted directly, and it still fails on a target that
    // invented one.
    const now = new Date().toISOString();
    for (const r of pslRows()) {
      if (r.publishedAt === null) continue;
      expect(r.publishedAt <= now, r.id).toBe(true);
    }
    // ⚠️ AND THE HALF THAT KEEPS IT FROM BEING VACUOUS: some row IS published.
    expect(pslRows().filter((r) => r.publishedAt !== null).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE SECOND VOCABULARY IS NOT JOINED (ruling 6)', () => {
  // `Supplier.halalCertified` is a per-supplier BOOLEAN standing in for a
  // supplier × material × clock fact that `COMPLIANCE_REGISTRY` models properly.
  // The PSL must not read it: joining a coarser duplicate would hand this record
  // a third compliance vocabulary, and the tree spent I3.1 collapsing five into
  // one. Retiring the boolean is its own batch; NOT JOINING TO IT is this one's.
  // ⚠️ **DERIVED, NOT LISTED (B-S4d).** The list that stood here named six
  // paths, asserted nothing about completeness, and had already gone stale:
  // P2 shipped `PslGateNotice.tsx` and it never gained an entry. A second
  // hand-written copy lived in `pslNoSupplierRead.test.ts`. Both are replaced
  // by one derivation, and the anti-vacuity control below is what stops a
  // broken walker reading as a clean guard.
  const PSL_MODULES = pslModulesRelative();

  const codeOf = (rel: string): string => {
    const abs = resolve(process.cwd(), rel);
    return stripSourceComments(readFileSync(abs, 'utf8'), 'blank', abs);
  };

  it('⚠️ THE POPULATION IS REAL — the glob found the PSL modules', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: a walker that returned `[]` would make
    // the assertion below pass over nothing at all. Membership, never a count.
    expect(PSL_MODULES).toContain('src/services/data/pslListing.ts');
    expect(PSL_MODULES).toContain('src/services/data/pslProjection.ts');
    expect(PSL_MODULES).toContain('src/services/data/mock/stores/pslStore.ts');
    expect(PSL_MODULES).toContain('src/components/v2-features/PslGateNotice.tsx');
    // and the retired fixture is genuinely gone rather than merely unlisted.
    expect(PSL_MODULES).not.toContain('src/services/data/mock/fixtures/pslListings.ts');
  });

  it('⚠️ THE MATCHER CAN FIRE — a surface that DOES read the boolean is found', () => {
    // Without this control the assertion below passes over a matcher that
    // matches nothing, which is the shape that reads as a working guard.
    expect(/halalCertified/.test(codeOf('src/pages-v2/BuyerSuppliers.tsx'))).toBe(true);
  });

  it('not one PSL module references `halalCertified`', () => {
    const offenders = PSL_MODULES.filter((m) => /halalCertified/.test(codeOf(m)));
    expect(offenders).toEqual([]);
  });

  it('and comments do not trip it — the rule may be DISCUSSED in a PSL module', () => {
    const commented = stripSourceComments(
      '// never join to halalCertified here\nconst y = 1;\n',
      'blank',
      'probe.ts',
    );
    expect(/halalCertified/.test(commented)).toBe(false);
  });
});

