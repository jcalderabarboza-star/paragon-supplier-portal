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
import { falsifiedFamilies, formatDriftReport, driftReport } from './clockDrift';

const today = new Date().toISOString().slice(0, 10);

describe('clock drift, against the REAL wall clock', () => {
  it('prints the report — this is the instrument`s output, not its assertion', () => {
    // eslint-disable-next-line no-console
    console.log('\n' + formatDriftReport(today) + '\n');
    expect(driftReport(today).length).toBeGreaterThan(0);
  });

  it('⚠️ no reader-visible stored clock-state has been falsified by the clock', () => {
    const bad = falsifiedFamilies(today);
    // The message is the deliverable: a bare `toEqual([])` tells whoever reads
    // the scheduled failure nothing about what to do.
    expect(
      bad.map(
        (d) =>
          `${d.family}: drift ${d.driftDays}d, headroom ${d.headroomDays}d, ` +
          `states [${d.readerVisibleStates.join(', ')}] — a surface is showing ` +
          `a stored clock state that is no longer true. The remedy is an ` +
          `operator ruling on MANDATE_LEAD_DAYS, or computing that family's ` +
          `display states the way obligation's now are.`,
      ),
    ).toEqual([]);
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
