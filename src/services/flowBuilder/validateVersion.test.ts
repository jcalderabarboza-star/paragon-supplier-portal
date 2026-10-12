// ────────────────────────────────────────────────────────────────────────────
// FB-1 · THE VALIDATION LIBRARY, HELD.
//
// How it is kept honest (Design 6 v2 §4.3):
//   · A KNOWN-GOOD VERSION PASSES, FIRST. A guard that is wrong about what it
//     should accept looks exactly like a working guard.
//   · ONE KNOWN-BAD VERSION PER RULE, asserting the rule code AND the element
//     by name. Never a count: a count is satisfied by the wrong finding.
//   · THE WORLD IS INJECTED. The rules run over a small hand-built process
//     here, so each is seen to refuse on an input written to break it alone.
//   · R04 AND THE APPLIER ARE ALSO FIRED AT THE REAL CATALOGUE, by named member.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { getKnownFlows } from '../transitions';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';
import type { FlowDefinition } from '../transitions/schema';
import { REPO_ROOT } from '../../lib/treeMutationGate/derive';
import { SAMPLE_PEOPLE } from '../identity/sampleRoster';
import type { AddedStep, FlowVersionContent } from './flowVersion';
import { liveWorld } from './liveWorld';
import {
  applyVersion,
  errorsOf,
  isGateable,
  successEnding,
  validateVersion,
  VERSION_RULES,
  type AppliedFlow,
  type Finding,
  type ValidationWorld,
} from './validateVersion';

// ── A SMALL PROCESS, WRITTEN FOR THE RULES ──────────────────────────────────
const act = (
  id: string,
  from: readonly string[],
  to: string,
  over: Partial<FlowDefinition['transitions'][number]> = {},
): FlowDefinition['transitions'][number] => ({
  id,
  from,
  to,
  trigger: 'user',
  requiredRole: 'doc:act',
  requiredFields: [],
  policyHooks: [],
  surfaceable: { surfaced: true },
  version: 1,
  ...over,
});

const DOC: FlowDefinition = {
  entity: 'doc',
  version: 3,
  states: ['Draft', 'Review', 'Approved', 'Rejected'],
  initial: 'Draft',
  terminals: ['Approved', 'Rejected'],
  transitions: [
    act('t_doc_create', [], 'Draft', { trigger: 'creation' }),
    act('t_doc_submit', ['Draft'], 'Review'),
    act('t_doc_approve', ['Review'], 'Approved', { policyHooks: ['doc_complete'], requiredFields: ['note'] }),
    act('t_doc_reject', ['Review'], 'Rejected'),
    act('t_doc_sync', ['Review'], 'Review', {
      trigger: 'system',
      statePreserving: true,
      surfaceable: { surfaced: false, because: 'external-fact', owner: 's4hana', why: 'reported by the system of record' },
    }),
    act('t_doc_fan', ['Review'], 'Rejected', { trigger: 'cascade' }),
    act('t_doc_hidden', ['Review'], 'Review', {
      statePreserving: true,
      surfaceable: { surfaced: false, because: 'ruled-unsurfaced', why: 'a standing ruling refuses the screen' },
    }),
  ],
};

/** A sample person's id, read off the roster — never spelled here. */
const A_PERSON_ID = SAMPLE_PEOPLE.find((p) => p.role === 'finance')!.personId;

const WORLD: ValidationWorld = {
  flows: [DOC, { ...DOC, entity: 'unwired' }],
  wiredEntities: ['doc'],
  stepSurfaces: ['doc'],
  stepLanes: ['finance', 'procurement'],
  personNames: [A_PERSON_ID, 'Finance 1'],
  actorKeys: ['approvedBy'],
  switchedOff: () => null,
  resting: (_entity, state) => (state === 'Review' ? 4 : 0),
};

const step = (over: Partial<AddedStep> = {}): AddedStep => ({
  id: 's_finance',
  kind: 'approval',
  before: 't_doc_approve',
  order: 1,
  lane: 'finance',
  label: { en: 'Finance approval', id: 'Persetujuan Keuangan' },
  instruction: { en: 'Check the budget line.', id: 'Periksa pos anggaran.' },
  ...over,
});

const version = (over: Partial<FlowVersionContent> = {}): FlowVersionContent => ({
  entity: 'doc',
  baseVersion: 3,
  steps: [step()],
  forks: [],
  checks: [],
  ...over,
});

const run = (content: FlowVersionContent, world: ValidationWorld = WORLD): readonly Finding[] =>
  validateVersion(content, world);
/** `CODE element` for every finding that is not information. */
const named = (findings: readonly Finding[]): string[] =>
  findings.filter((f) => f.severity !== 'info').map((f) => `${f.code} ${f.element}`);

describe('FB-1 · the rules a change must obey', () => {
  it('a known-good version passes every rule', () => {
    const findings = run(version());
    expect(named(findings)).toEqual([]);
    // …and it was really examined: the one thing it reports is what it will meet.
    expect(findings).toEqual([
      { code: 'R19', severity: 'info', element: 'Review', detail: { counted: 'yes', count: 4 } },
    ]);
  });

  it('⚠ POPULATION CONTROL — every rule in the table is fired below, and no finding carries a code outside it', () => {
    const fired = new Set<string>();
    for (const content of Object.values(BAD)) for (const f of run(content.content, content.world ?? WORLD)) fired.add(f.code);
    for (const f of run(version())) fired.add(f.code);
    expect([...fired].sort()).toEqual(VERSION_RULES.map((r) => r.code).sort());
    expect(VERSION_RULES.map((r) => r.code)).toContain('R04');
    expect(VERSION_RULES.map((r) => r.code as string)).not.toContain('R09');
  });

  it('R01 refuses a process no command can write through, by name — and one that is not registered', () => {
    expect(named(run(version({ entity: 'unwired' })))).toEqual(['R01 unwired']);
    expect(named(run(version({ entity: 'nowhere' })))).toEqual(['R01 nowhere']);
  });

  it('R02 refuses a base that is not the shipped version', () => {
    const findings = run(BAD.R02.content);
    expect(named(findings)).toEqual(['R02 doc']);
    expect(findings[0].detail).toEqual({ base: 2, shipped: 3 });
  });

  it('R03 refuses an element that names an act the process does not have', () => {
    expect(named(run(BAD.R03.content))).toEqual(['R03 s_finance']);
  });

  it('R04 refuses a step in front of an act a system, a cascade or a creation fires, or that has no screen', () => {
    const at = (before: string) => run(version({ steps: [step({ before })] }));
    expect(named(at('t_doc_sync'))).toEqual(['R04 s_finance']);
    expect(at('t_doc_sync')[0].detail.because).toBe('system');
    expect(at('t_doc_fan')[0].detail.because).toBe('cascade');
    expect(at('t_doc_create')[0].detail.because).toBe('creation');
    expect(at('t_doc_hidden')[0].detail.because).toBe('not-surfaced');
  });

  it('R04 refuses a step in front of t_quotation_award and accepts one in front of t_pr_approve', () => {
    // FIRED AT THE REAL CATALOGUE. The award of a quotation is fired by the
    // event's award, by cascade; a requisition is approved by a person.
    const world = liveWorld();
    const award = world.flows.find((f) => f.entity === 'quotation')!.transitions.find((t) => t.id === 't_quotation_award')!;
    expect(award.trigger).toBe('cascade');
    const quotation = (id: string) => world.flows.find((f) => f.transitions.some((t) => t.id === id))!;
    const before = (id: string): FlowVersionContent => ({
      entity: quotation(id).entity,
      baseVersion: quotation(id).version,
      steps: [step({ before: id })],
      forks: [],
      checks: [],
    });
    expect(named(validateVersion(before('t_quotation_award'), world)).filter((n) => n.startsWith('R04'))).toEqual([
      'R04 s_finance',
    ]);
    expect(errorsOf(validateVersion(before('t_pr_approve'), world))).toEqual([]);
    // ⚠ AND THE OTHER HALF, ON A REAL MEMBER: an act that HAS a screen and is not
    // an act a person takes on a document that exists. Raising a requisition is a
    // creation — there is no document yet for a step to be due on.
    const raise = world.flows.find((f) => f.entity === 'purchaseRequisition')!.transitions.find((t) => t.id === 't_pr_create')!;
    expect([raise.trigger, raise.surfaceable.surfaced]).toEqual(['creation', true]);
    const raised = validateVersion(before('t_pr_create'), world).filter((f) => f.code === 'R04');
    expect(raised.map((f) => [f.element, f.detail.because])).toEqual([['s_finance', 'creation']]);
  });

  it('R05 refuses a step on a process with no screen that can show one — and not a version with no step', () => {
    const noSurface = { ...WORLD, stepSurfaces: [] };
    expect(named(run(version(), noSurface))).toEqual(['R05 doc']);
    expect(
      named(run(version({ steps: [], checks: [{ id: 'c_named', on: 't_doc_approve', rule: { kind: 'named-person' } }] }), noSurface)),
    ).toEqual([]);
  });

  it('R06 refuses a lane that cannot be given a step', () => {
    const findings = run(BAD.R06.content);
    expect(named(findings)).toEqual(['R06 s_finance']);
    expect(findings[0].detail).toEqual({ lane: 'commercial' });
  });

  it('R07 refuses a label missing in one language, and names the step and the language', () => {
    const findings = run(BAD.R07.content);
    expect(named(findings)).toEqual(['R07 s_finance']);
    expect(findings[0].detail).toEqual({ part: 'label', language: 'id', problem: 'missing' });
  });

  it('R07 refuses an instruction that names a person, by label or by id', () => {
    for (const text of ['Ask Finance 1 first.', `Ask ${A_PERSON_ID} first.`]) {
      const findings = run(version({ steps: [step({ instruction: { en: text, id: 'Periksa pos anggaran.' } })] }));
      expect(named(findings), text).toEqual(['R07 s_finance']);
      expect(findings[0].detail).toEqual({ part: 'instruction', language: 'en', problem: 'person' });
    }
  });

  it('R08 refuses a repeated id and a repeated place in the order, each by the later element', () => {
    expect(named(run(BAD.R08.content))).toEqual(['R08 s_finance']);
    const sameOrder = version({ steps: [step(), step({ id: 's_second', kind: 'confirmation' })] });
    const findings = run(sameOrder);
    expect(named(findings)).toEqual(['R08 s_second']);
    expect(findings[0].detail).toEqual({ problem: 'order', act: 't_doc_approve', order: 1 });
  });

  it('R12 refuses a separation rule that names a step which is later, elsewhere or missing', () => {
    expect(named(run(BAD.R12.content))).toEqual(['R12 s_finance']);
    const elsewhere = version({
      steps: [step({ id: 's_early', before: 't_doc_submit', kind: 'confirmation' }), step({ order: 2, differentFrom: ['s_early'] })],
    });
    expect(named(run(elsewhere)).filter((n) => n.startsWith('R12'))).toEqual(['R12 s_finance']);
    const check = version({ checks: [{ id: 'c_apart', on: 't_doc_approve', rule: { kind: 'different-person', step: 's_gone' } }] });
    expect(named(run(check))).toEqual(['R12 c_apart']);
    // KNOWN-GOOD: an earlier step in front of the same act is accepted.
    const good = version({
      steps: [step({ id: 's_first', kind: 'confirmation' }), step({ order: 2, differentFrom: ['s_first'] })],
    });
    expect(named(run(good))).toEqual([]);
  });

  it('R13 refuses a capture field named for the person acting, and two fields with one name', () => {
    const findings = run(BAD.R13.content);
    expect(named(findings)).toEqual(['R13 s_finance', 'R13 s_finance']);
    expect(findings.filter((f) => f.code === 'R13').map((f) => f.detail)).toEqual([
      { field: 'approvedBy', problem: 'actor' },
      { field: 'costCentre', problem: 'duplicate' },
    ]);
  });

  it('R14 refuses a second approval by the same lane with nothing to keep the approvers apart', () => {
    expect(named(run(BAD.R14.content))).toEqual(['R14 s_again']);
    // KNOWN-GOOD: the same two steps, kept apart.
    const apart = version({ steps: [step(), step({ id: 's_again', order: 2, differentFrom: ['s_finance'] })] });
    expect(named(run(apart))).toEqual([]);
  });

  it('R15 warns, naming the state, when every way out of it waits on an added step', () => {
    const findings = run(BAD.R15.content);
    expect(named(findings)).toEqual(['R15 Draft']);
    expect(findings.find((f) => f.code === 'R15')!.severity).toBe('warning');
    // `Review` has two ways out and only one is gated in the known-good version.
    expect(named(run(version()))).toEqual([]);
  });

  it('R16 warns on a step in front of the act that refuses a document, and not on the one that approves it', () => {
    expect(successEnding(DOC)).toBe('Approved');
    const findings = run(BAD.R16.content);
    expect(named(findings)).toEqual(['R16 s_finance']);
    expect(findings[0].detail).toEqual({ act: 't_doc_reject', ending: 'Rejected' });
  });

  it('R17 warns when the part of the platform the act belongs to is switched off, and names the switch', () => {
    const findings = run(version(), BAD.R17.world);
    expect(named(findings)).toEqual(['R17 s_finance']);
    expect(findings[0].detail).toEqual({ act: 't_doc_approve', switch: 'REQ' });
  });

  it('R18 warns, naming the act, past five elements in front of it — and not at five', () => {
    expect(named(run(BAD.R18.content))).toEqual(['R18 t_doc_approve']);
    const five = version({ steps: BAD.R18.content.steps.slice(0, 5) });
    expect(named(run(five))).toEqual([]);
  });

  it('R19 says how many documents rest in an affected state, and says so when it cannot count', () => {
    const uncounted = run(version(), { ...WORLD, resting: () => null });
    expect(uncounted).toEqual([{ code: 'R19', severity: 'info', element: 'Review', detail: { counted: 'no' } }]);
  });
});

/** One known-bad version per rule. `R01` and `R19` are fired inline above. */
const many = (n: number): AddedStep[] =>
  Array.from({ length: n }, (_, i) => step({ id: `s_${i}`, order: i + 1, kind: 'confirmation' }));
const BAD: Record<string, { content: FlowVersionContent; world?: ValidationWorld }> = {
  R01: { content: version({ entity: 'unwired' }) },
  R02: { content: version({ baseVersion: 2 }) },
  R03: { content: version({ steps: [step({ before: 't_doc_vanish' })] }) },
  R04: { content: version({ steps: [step({ before: 't_doc_fan' })] }) },
  R05: { content: version(), world: { ...WORLD, stepSurfaces: [] } },
  R06: { content: version({ steps: [step({ lane: 'commercial' })] }) },
  R07: { content: version({ steps: [step({ label: { en: 'Finance approval', id: '  ' } })] }) },
  R08: { content: version({ steps: [step(), step({ order: 2, kind: 'confirmation' })] }) },
  R12: { content: version({ steps: [step({ differentFrom: ['s_later'] }), step({ id: 's_later', order: 2, kind: 'confirmation' })] }) },
  R13: {
    content: version({
      steps: [
        step({
          kind: 'capture',
          fields: [
            { name: 'approvedBy', label: { en: 'Approver', id: 'Penyetuju' }, type: 'text', required: true },
            { name: 'costCentre', label: { en: 'Cost centre', id: 'Pusat biaya' }, type: 'text', required: true },
            { name: 'costCentre', label: { en: 'Cost centre', id: 'Pusat biaya' }, type: 'text', required: false },
          ],
        }),
      ],
    }),
  },
  R14: { content: version({ steps: [step(), step({ id: 's_again', order: 2 })] }) },
  R15: { content: version({ steps: [step({ before: 't_doc_submit', kind: 'confirmation' })] }) },
  R16: { content: version({ steps: [step({ before: 't_doc_reject' })] }) },
  R17: { content: version(), world: { ...WORLD, switchedOff: () => 'REQ' } },
  R18: { content: version({ steps: many(6) }) },
};

// ── THE RULE EVERY OTHER RULE SERVES ────────────────────────────────────────
// AN ACTIVE VERSION CAN ADD A REFUSAL. IT CAN NEVER REMOVE ONE.

/** The acts on which an applied version took something away, by name. */
function refusalsRemoved(flow: FlowDefinition, applied: AppliedFlow): string[] {
  const removed: string[] = [];
  const byId = new Map(applied.acts.map((a) => [a.id, a]));
  for (const def of flow.transitions) {
    const a = byId.get(def.id);
    const same =
      a !== undefined &&
      JSON.stringify(a.from) === JSON.stringify(def.from) &&
      a.to === def.to &&
      a.requiredRole === def.requiredRole &&
      JSON.stringify(a.requiredFields) === JSON.stringify(def.requiredFields) &&
      a.settlesTo === (def.settlesTo ?? null) &&
      a.statePreserving === (def.statePreserving === true) &&
      JSON.stringify(a.checks.slice(0, def.policyHooks.length)) === JSON.stringify(def.policyHooks);
    if (!same) removed.push(def.id);
  }
  return removed;
}

/** A version that puts a step and a check in front of every act that can take one. */
const gateEverything = (flow: FlowDefinition): FlowVersionContent => {
  const gateable = flow.transitions.filter(isGateable);
  return {
    entity: flow.entity,
    baseVersion: flow.version,
    steps: gateable.map((t, i) => step({ id: `s_${i}`, before: t.id, kind: 'confirmation' })),
    forks: [],
    checks: gateable.map((t, i) => ({ id: `c_${i}`, on: t.id, rule: { kind: 'named-person' as const } })),
  };
};

describe('FB-1 · an applied version never removes a refusal', () => {
  const flows = getKnownFlows();
  const writable = flows.filter((f) => WIRED_COMMAND_TARGETS.includes(f.entity));

  it('⚠ POPULATION CONTROL — the real catalogue, with acts that carry shipped checks, and something gated', () => {
    expect(flows.map((f) => f.entity)).toContain('purchaseRequisition');
    expect(flows.flatMap((f) => f.transitions.map((t) => t.id))).toContain('t_gr_post');
    const approve = flows.flatMap((f) => f.transitions).find((t) => t.id === 't_pr_approve')!;
    expect(approve.policyHooks.length).toBeGreaterThan(0);
    const gated = applyVersion(flows.find((f) => f.entity === 'purchaseRequisition')!, gateEverything(flows.find((f) => f.entity === 'purchaseRequisition')!));
    expect(gated.acts.find((a) => a.id === 't_pr_approve')!.steps.map((s) => s.before)).toEqual(['t_pr_approve']);
  });

  it('an applied version never removes a refusal — every act keeps its from, to, lane, fields and shipped checks in order', () => {
    for (const flow of writable) {
      const applied = applyVersion(flow, gateEverything(flow));
      expect(refusalsRemoved(flow, applied), flow.entity).toEqual([]);
      expect(applied.acts.map((a) => a.id), flow.entity).toEqual(flow.transitions.map((t) => t.id));
      // What was added stands AFTER what shipped.
      for (const a of applied.acts) {
        expect(a.checks.slice(a.shippedChecks).every((c) => c.startsWith('added_check:')), a.id).toBe(true);
      }
    }
  });

  it('an applier that drops a shipped check is caught, by act', () => {
    const pr = flows.find((f) => f.entity === 'purchaseRequisition')!;
    const honest = applyVersion(pr, gateEverything(pr));
    const broken: AppliedFlow = {
      ...honest,
      acts: honest.acts.map((a) => (a.id === 't_pr_approve' ? { ...a, checks: a.checks.slice(1) } : a)),
    };
    expect(refusalsRemoved(pr, broken)).toEqual(['t_pr_approve']);
    // …and each other way of taking something away is named too.
    const moved: AppliedFlow = { ...honest, acts: honest.acts.map((a) => (a.id === 't_pr_approve' ? { ...a, requiredRole: 'pr:anyone' } : a)) };
    expect(refusalsRemoved(pr, moved)).toEqual(['t_pr_approve']);
    const fewer: AppliedFlow = { ...honest, acts: honest.acts.filter((a) => a.id !== 't_pr_reject') };
    expect(refusalsRemoved(pr, fewer)).toEqual(['t_pr_reject']);
  });
});

// ── A CHANGE NEVER REACHES THE REGISTRY ─────────────────────────────────────

const SRC = join(REPO_ROOT, 'src');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
const callsRegister = (file: string): boolean => /flowRegistry\s*\.\s*register\s*\(/.test(readFileSync(file, 'utf8'));
const rel = (file: string): string => file.slice(SRC.length + 1).replace(/\\/g, '/');

describe('FB-1 · no flow-builder module calls the registry’s register door', () => {
  const product = walk(SRC).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  const builder = product.filter(
    (f) => /[\\/]flowBuilder[\\/]/.test(f) || /flowVersion/i.test(rel(f)) || /[\\/]process-flows[\\/]/.test(f),
  );

  it('⚠ CONTROL — the same scan finds the call in the transitions barrel, and the builder population is real', () => {
    expect(product.filter(callsRegister).map(rel)).toEqual(['services/transitions/index.ts']);
    expect(builder.map(rel)).toContain('services/flowBuilder/validateVersion.ts');
    expect(builder.map(rel)).toContain('services/data/mock/flowVersionTarget.ts');
    expect(builder.map(rel)).toContain('pages-v2/process-flows/ChangesView.tsx');
  });

  it('no flow-builder module calls the registry’s register door', () => {
    expect(builder.filter(callsRegister).map(rel)).toEqual([]);
  });
});
