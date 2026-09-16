// ────────────────────────────────────────────────────────────────────────────
// THE ONLY ASSERTION IN THIS TREE THAT READS THE REAL CLOCK ON PURPOSE.
//
// ⚠️ **EXCLUDED FROM THE DEFAULT RUN** (`vitest.config.ts` → `test.exclude`),
// so `npx vitest run` — gate 3, and every PR — never collects it. It is run by
// `npm run drift`, and by CI on the SCHEDULE trigger only.
//
// ── WHY IT IS EXCLUDED RATHER THAN SKIPPED ──────────────────────────────────
//   `npm run gates` refuses a suite containing skipped or todo tests, for good
//   reasons that are not this file's to argue with. An `it.skipIf` would trip
//   that; an exclusion keeps the default suite honest — the test is not
//   "disabled", it is not part of that run at all, and the count in
//   `scripts/floor.json` reflects a suite it was never in.
//
// ── WHY IT MUST NOT BE IN THE PR GATE ───────────────────────────────────────
//   It goes red on a CALENDAR DAY, with nobody touching a file. In the PR gate
//   that reddens every unrelated pull request, and the remedy — moving
//   `MANDATE_LEAD_DAYS`, which re-times every fixture in the tree — is an
//   operator RULING that no PR author can take. CP-3a already ruled on this
//   shape for the floor: a threshold people must routinely edit to get green is
//   not a threshold. The scheduled half of `gates.yml` is the right consumer:
//   it exists for exactly this (a break with no commit involved) and it files
//   an issue rather than blocking anyone.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  falsifiedFamilies,
  unresolvedFamilies,
  formatDriftReport,
  driftReport,
  wallReadFamilies,
  type ReadingInstants,
} from './clockDrift';
import { FAMILY_ANCHORS, type FixtureFamily } from './fixturePresent';
import {
  buildRepoProgram,
  deriveReadingInstants,
} from '../../lib/readingInstantGate/derive';

const today = new Date().toISOString().slice(0, 10);

// ⚠️ **THE INSTANTS ARE DERIVED HERE, IN THE RUN THAT ASSERTS ON THEM.** Not
// imported from a fixture, not pinned: the whole point is that the scheduled
// run reads the tree AS IT IS ON THE DAY. The derivation costs one TypeScript
// program (~5s) and needs no browser — the scheduled step is `ubuntu-latest` +
// `npm ci` and nothing else, which is why the instrument is a checker walk and
// not a render.
const families = Object.keys(FAMILY_ANCHORS) as FixtureFamily[];
const readings = deriveReadingInstants(buildRepoProgram(process.cwd()), families);
const instants = Object.fromEntries(
  readings.map((r) => [r.family, r.instant]),
) as ReadingInstants;

describe('clock drift, against the REAL wall clock', () => {
  it('prints the report — this is the instrument`s output, not its assertion', () => {
    // eslint-disable-next-line no-console
    console.log('\n' + formatDriftReport(today, instants) + '\n');
    expect(driftReport(today, instants).length).toBeGreaterThan(0);
  });

  it('⚠️ POPULATION — every family resolved to an instant, none UNRESOLVED', () => {
    // ⚠️ **THIS IS THE ASSERTION THAT KEEPS THE NEXT ONE HONEST.** An empty
    // `falsifiedFamilies` means nothing if the instrument silently failed to
    // classify anybody: that is the old defect with a new mechanism. A family
    // whose `now` cannot be followed is NOT certified safe — it is a hole in
    // the instrument, and it fails here rather than passing quietly there.
    const unresolved = unresolvedFamilies(today, instants);
    expect(
      unresolved.map(
        (d) =>
          `${d.family}: the reading instant could not be derived. ` +
          `readingInstantGate could not follow this family's \`now\` to ` +
          `DECLARED_PRESENT or to a wall-clock read, so whether it drifts is ` +
          `UNKNOWN. Fix the classifier or the call site; do not assume it is safe.`,
      ),
    ).toEqual([]);
  });

  it('⚠️ no family read against the wall clock has been falsified by it', () => {
    const bad = falsifiedFamilies(today, instants);
    // The message is the deliverable: a bare `toEqual([])` tells whoever reads
    // the scheduled failure nothing about what to do.
    expect(
      bad.map(
        (d) =>
          `${d.family}: drift ${d.driftDays}d, headroom ${d.headroomDays}d, ` +
          `read at ${d.instant} — a surface computes this family's labels ` +
          `against the wall clock, and the clock has now left the family's ` +
          `coherent window, so a reader is seeing a false label TODAY. The ` +
          `remedy is to anchor that read at DECLARED_PRESENT (the way every ` +
          `other anchored family is read), or an operator ruling on ` +
          `MANDATE_LEAD_DAYS.`,
      ),
    ).toEqual([]);
  });

  it('⚠️ AND WHY IT IS EMPTY, STATED — blind emptiness is what this replaced', () => {
    // ⚠️ A green run must say WHICH of the two reasons it is green for. The
    // instrument this rebind replaced returned `[]` at every date because its
    // population could not be non-empty by construction (law 0.5 forbids the
    // stored clock-state its question asked about), and 43 consecutive
    // scheduled runs reported success while watching nothing.
    //
    // So: either some family IS wall-read and survived the comparison, or none
    // is and the report says so in its own footer. Both are honest; silence
    // between them is not.
    const wall = wallReadFamilies(today, instants);
    const report = formatDriftReport(today, instants);
    if (wall.length === 0) {
      expect(report).toContain('WAITING, not retired');
      // …and the reason is a FACT ABOUT THE TREE, re-derived here from the
      // instants rather than restated: every anchored family that has a window
      // is read at the declared present or is not projected at all.
      const windowed = families.filter((f) => FAMILY_ANCHORS[f].window !== null);
      for (const f of windowed) {
        expect(['P', 'NO-CALL-SITES'], f).toContain(instants[f]);
      }
    } else {
      expect(report).not.toContain('WAITING, not retired');
    }
  });

  it('the exclusion covers exactly this file — a second one would run unseen', () => {
    // ⚠️ `test.exclude` is a GLOB, so it silently swallows any future
    // `*.live.test.ts`. That is a suite that shrinks without the floor noticing
    // — CP-3a names that trade explicitly. Bilateral: the excluded set is
    // derived from disk and pinned, so a second live spec is red HERE, in the
    // one run that collects it.
    // Walked from `src/`, not from this directory: a live spec added anywhere
    // else is exactly the one this assertion has to catch, and scoping the walk
    // to the folder the known file sits in would be the matcher reporting on
    // itself.
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((e) => {
        const p = join(dir, e);
        return statSync(p).isDirectory() ? walk(p) : [p.replace(/\\/g, '/')];
      });
    const live = walk('src').filter((f) => f.endsWith('.live.test.ts'));
    expect(live).toEqual(['src/services/data/clockDrift.live.test.ts']);
  });
});
