// ────────────────────────────────────────────────────────────────────────────
// H1 · THE FIGURES THE HANDOVER STATES, PINNED.
//
// `docs/handover/D1_SE_HANDOVER.md` §1 states six populations that no test
// pinned: the router's routes, the module registry, the business roles, the
// sample roster, and the liveness capabilities with their green subset. A
// figure in a handover document is read as a fact by a team that has never
// seen this repository, so each one is pinned HERE and the documents cite
// this file rather than standing on their own.
//
// ⚠️ **A FIGURE HERE IS A PIN, NOT A FLOOR.** Each value is DERIVED from the
// tree first and then compared to the number the documents state. When the tree
// moves, this file goes red on purpose: change the document and this pin
// together, in the same batch, or the handover says something untrue.
//
// ⚠️ **WHERE A SET MATTERS, THE SET IS PINNED BY NAME, NOT BY SIZE**
// (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`): the green capabilities
// and the always-on module are named, because a count is satisfied by the
// wrong members.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripSourceComments } from './lib/sourceScan/stripComments';
import { MODULE_CODES, getModule } from './services/modules/registry';
import { defaultActivation } from './services/modules/activation';
import { SYSTEM_ROLES } from './services/transitions/businessRoles';
import { SAMPLE_PEOPLE } from './services/identity/sampleRoster';
import { ALL_CAPABILITIES, isLive, liveness } from './services/liveness/registry';

const ROOT = process.cwd();
const read = (...p: string[]): string => readFileSync(join(ROOT, ...p), 'utf8').replace(/\r\n/g, '\n');

/** Every `<Route path="…">` in the router source, comments removed. */
const ROUTES = [
  ...stripSourceComments(read('src', 'router', 'AppRouter.tsx'), 'delete', 'AppRouter.tsx').matchAll(
    /<Route\s+path="([^"]+)"/g,
  ),
].map((m) => m[1]);

describe('H1 · the populations are real before any figure is believed', () => {
  it('each population holds a known member, and not a known non-member', () => {
    expect(ROUTES).toContain('/buyer/plan-grid');
    expect(ROUTES).toContain('*');
    expect(ROUTES).not.toContain('/buyer/not-a-real-route');
    expect(MODULE_CODES).toContain('PSL');
    expect(Object.keys(SYSTEM_ROLES)).toContain('procurement');
    expect(SAMPLE_PEOPLE.map((p) => p.role)).toContain('compliance');
    expect(ALL_CAPABILITIES).toContain('somoPlanParameters');
  });

  it('no route is declared twice, so a count of declarations is a count of routes', () => {
    expect(new Set(ROUTES).size).toBe(ROUTES.length);
  });
});

describe('H1 · the figures D1 §1 states', () => {
  it('routes: 51 declared in AppRouter', () => {
    // D1 first stated 47, from `grep -c "<Route "` — which misses the four
    // declarations written across lines (`<Route` then a newline). The regex
    // here takes `\s+`, so it reads both shapes; a known multi-line member is
    // asserted in the population control above.
    expect(ROUTES.length).toBe(51);
  });

  it('modules: 16 in the registry, PLT the only always-on one, every default Active', () => {
    expect(MODULE_CODES.length).toBe(16);
    expect(MODULE_CODES.filter((c) => getModule(c).alwaysOn)).toEqual(['PLT']);
    const view = defaultActivation();
    expect(MODULE_CODES.filter((c) => view.modules[c].phase !== 'Active')).toEqual([]);
  });

  it('business roles ("system roles"): 13', () => {
    expect(Object.keys(SYSTEM_ROLES).length).toBe(13);
  });

  it('sample roster: 16 people, no person id repeated', () => {
    // The namespace itself is `simUsrNamespace.test.ts`'s to police (CLAUDE.md:
    // the `sim-usr-` prefix is read as a string in exactly one place).
    expect(SAMPLE_PEOPLE.length).toBe(16);
    expect(new Set(SAMPLE_PEOPLE.map((p) => p.personId)).size).toBe(SAMPLE_PEOPLE.length);
  });

  it('liveness: 27 capabilities; the green subset and the SPEC subset BY NAME', () => {
    expect(ALL_CAPABILITIES.length).toBe(27);
    expect(ALL_CAPABILITIES.filter((c) => isLive(c)).sort()).toEqual(
      ['advanceShipNotices', 'goodsReceipts', 'invoices', 'purchaseOrders', 'rfqs'].sort(),
    );
    expect(ALL_CAPABILITIES.filter((c) => liveness(c) === 'SPEC')).toEqual(['somoPlanParameters']);
  });
});

describe('H1 · the contracts README carries the C1 figures, and C1 is pinned to the tree', () => {
  // C1's header numbers are pinned to the tree by `c1MethodSurface.contract.test.ts`.
  // The README's "three counts" table restates them, so it is held to C1 here —
  // which pins it to the tree transitively, rather than leaving a second copy of
  // three numbers in prose with nothing watching it (`FLOOR-IN-PROSE-01`).
  const c1 = read('docs', 'contracts', 'C1-methods.md');
  const readme = read('docs', 'contracts', 'README.md');
  const header = /\*\*(\d+)\*\* \(service surface\) · \*\*(\d+)\*\* \(transition catalog\) · \*\*(\d+)\*\* \(wired\s+targets\)/.exec(
    c1,
  );

  it('C1 states the three axes in its header', () => {
    expect(header, 'C1-methods.md no longer states its three axes in the form this pin reads').not.toBeNull();
  });

  it('the README table states the same three numbers, row by row', () => {
    const row = (axis: string): string | undefined =>
      new RegExp(String.raw`\| \*\*(\d+)\*\* \| C1 Axis ${axis}\b`).exec(readme)?.[1];
    expect([row('1'), row('2'), row('3')]).toEqual([header![1], header![2], header![3]]);
  });
});
