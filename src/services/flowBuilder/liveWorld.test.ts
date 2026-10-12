// ────────────────────────────────────────────────────────────────────────────
// FB-1 · THE WORLD THE RULES ARE HANDED, HELD TO THE TREE.
//
// `validateVersion` trusts its world. So each member that is AUTHORED rather
// than read off its owner is derived here a second way and compared, both ways:
//   · the processes with a screen that can show a step, from the surface files;
//   · the lanes that may be given a step, from the role bundles;
//   · the rule table, against the sentences a reader is shown.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from '../../lib/treeMutationGate/derive';
import { flowBuilderEn, flowBuilderId } from '../../lib/i18n/flowBuilder';
import { getKnownFlows } from '../transitions';
import { SYSTEM_ROLES, TENANCY_ANCHORS, SUPERSET_ROLES } from '../transitions/businessRoles';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';
import { DOCUMENT_IDS } from '../data/mock/documentIds';
import { liveWorld, stepLanes } from './liveWorld';
import { STEP_SURFACES } from './stepSurfaces';
import { isGateable, VERSION_RULES } from './validateVersion';

const SRC = join(REPO_ROOT, 'src');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

describe('FB-1 · the processes with a screen that can show a step', () => {
  // Derived from source: every surface that asks the "who acts next" line about
  // a process names that process as the call's first argument.
  const asked = new Map<string, string[]>();
  for (const file of walk(SRC).filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/\buseNextAct\(\s*'([A-Za-z]+)'/g)) {
      asked.set(m[1], [...(asked.get(m[1]) ?? []), file.slice(SRC.length + 1).replace(/\\/g, '/')]);
    }
  }

  it('⚠ CONTROL — the scan finds a surface known to ask, and no call hides its process behind a variable', () => {
    expect(asked.get('purchaseRequisition')).toEqual(['pages-v2/BuyerRequisitions.tsx']);
    expect(asked.has('role')).toBe(false);
    const calls = walk(SRC)
      .filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f))
      .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\buseNextAct\(\s*([^,)\s]+)/g)].map((m) => m[1]));
    expect(calls.filter((c) => !/^'[A-Za-z]+'$/.test(c))).toEqual([]);
  });

  it('the authored list equals what the surfaces ask about, both ways', () => {
    expect([...STEP_SURFACES].sort()).toEqual([...asked.keys()].sort());
  });

  it('every one of them is a registered process', () => {
    const flows = getKnownFlows().map((f) => f.entity);
    expect(STEP_SURFACES.filter((e) => !flows.includes(e))).toEqual([]);
  });
});

describe('FB-1 · the lanes that may be given a step', () => {
  it('are the buyer-side lanes that hold a permission of their own — no anchor, no union role, no supplier lane', () => {
    expect(stepLanes()).toEqual(['procurement', 'receiving', 'finance', 'compliance', 'planning', 'requisitioner']);
    for (const lane of stepLanes()) {
      expect(SYSTEM_ROLES[lane].length, lane).toBeGreaterThan(0);
      expect(TENANCY_ANCHORS.has(lane), lane).toBe(false);
      expect(SUPERSET_ROLES.has(lane), lane).toBe(false);
    }
    expect(stepLanes()).not.toContain('commercial');
    expect(stepLanes()).not.toContain('buyer');
    expect(stepLanes()).not.toContain('admin');
  });
});

describe('FB-1 · the live world reads the tree', () => {
  const world = liveWorld();

  it('names the flows, the writable ones, and the acts a step can stand in front of', () => {
    expect(world.flows).toEqual(getKnownFlows());
    expect(world.wiredEntities).toBe(WIRED_COMMAND_TARGETS);
    const gateable = world.flows
      .filter((f) => world.wiredEntities.includes(f.entity))
      .flatMap((f) => f.transitions.filter(isGateable).map((t) => t.id));
    expect(gateable).toContain('t_pr_approve');
    expect(gateable).not.toContain('t_quotation_award'); // fired by cascade
    expect(gateable).not.toContain('t_gr_post_settled');
    expect(gateable).not.toContain('t_pr_create'); // a creation
  });

  it('counts the documents resting in a state from the process’s own store, and says when it cannot', () => {
    const pending = world.resting('purchaseRequisition', 'Pending Approval');
    expect(pending).toBeGreaterThan(0);
    expect(world.resting('purchaseRequisition', 'No Such State')).toBe(0);
    // A process with no enumerator is not counted as none.
    const uncounted = world.flows.map((f) => f.entity).find((e) => !(e in DOCUMENT_IDS))!;
    expect(uncounted).toBeTruthy();
    expect(world.resting(uncounted, 'Anything')).toBeNull();
  });

  it('nothing is switched off as the platform opens', () => {
    expect(world.switchedOff('t_pr_approve')).toBeNull();
  });
});

describe('FB-1 · every rule has its sentences, in both languages, and no sentence is left over', () => {
  it.each([
    ['en', flowBuilderEn],
    ['id', flowBuilderId],
  ] as const)('%s', (_lang, fragment) => {
    const keys = Object.keys(fragment).filter((k) => k.startsWith('flowBuilder.rule.'));
    const expected = VERSION_RULES.flatMap((r) => [`flowBuilder.rule.${r.code}.text`, `flowBuilder.rule.${r.code}.why`]);
    expect(keys.sort()).toEqual(expected.sort());
    for (const k of keys) expect(fragment[k].trim(), k).not.toBe('');
    const severities = Object.keys(fragment).filter((k) => k.startsWith('flowBuilder.severity.'));
    expect(severities.sort()).toEqual([...new Set(VERSION_RULES.map((r) => `flowBuilder.severity.${r.severity}`))].sort());
  });

  it('the two languages hold the same keys and say different things', () => {
    // Indonesian has one plural form, so a counted key has one spelling there.
    const stem = (k: string) => k.replace(/_(one|other)$/, '');
    expect([...new Set(Object.keys(flowBuilderId).map(stem))].sort()).toEqual(
      [...new Set(Object.keys(flowBuilderEn).map(stem))].sort(),
    );
    expect(flowBuilderId['flowBuilder.rule.R07.why']).not.toBe(flowBuilderEn['flowBuilder.rule.R07.why']);
  });
});
