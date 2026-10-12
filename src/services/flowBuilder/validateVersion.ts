// ────────────────────────────────────────────────────────────────────────────
// FB-1 · THE VALIDATION LIBRARY — the rules a change to a process must obey.
//
// ONE PURE MODULE. It takes a version's content and a WORLD — the registered
// flows, which of them a command can write through, which have a surface that
// can show a step, the lanes, the switches — and returns findings. It refuses
// nothing itself: the composer, the propose and approve checks, and the
// activate and restore checks all call this one function, so they cannot
// disagree about what a change is.
//
// ⚠️ THE WORLD IS INJECTED, NEVER READ HERE. A rule that reached for the
// registry itself could only be tested against the tree as it is today, and a
// guard probed on one input is a guard nobody has seen refuse. `liveWorld.ts`
// builds the real one.
//
// A finding is an ERROR (blocks proposing, approving and activating), a
// WARNING (blocks them until the proposer acknowledges it) or INFORMATION.
//
// R09, R10 and R11 are not here: they judge forks, value rules and scans
// against the field catalogue, and arrive with those elements.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition, TransitionDef } from '../transitions/schema';
import type { AddedCheck, AddedFork, AddedStep, Bilingual, FlowVersionContent } from './flowVersion';

export type FindingSeverity = 'error' | 'warning' | 'info';

/**
 * THE RULE TABLE. The page's "Rules a change must obey" reference renders from
 * this, so a rule cannot be enforced and unlisted, or listed and unenforced:
 * `validateVersion.test.ts` holds the codes a finding can carry EQUAL to it.
 */
export const VERSION_RULES = [
  { code: 'R01', severity: 'error' },
  { code: 'R02', severity: 'error' },
  { code: 'R03', severity: 'error' },
  { code: 'R04', severity: 'error' },
  { code: 'R05', severity: 'error' },
  { code: 'R06', severity: 'error' },
  { code: 'R07', severity: 'error' },
  { code: 'R08', severity: 'error' },
  { code: 'R12', severity: 'error' },
  { code: 'R13', severity: 'error' },
  { code: 'R14', severity: 'error' },
  { code: 'R15', severity: 'warning' },
  { code: 'R16', severity: 'warning' },
  { code: 'R17', severity: 'warning' },
  { code: 'R18', severity: 'warning' },
  { code: 'R19', severity: 'info' },
] as const satisfies readonly { code: string; severity: FindingSeverity }[];

export type RuleCode = (typeof VERSION_RULES)[number]['code'];

const SEVERITY: Readonly<Record<RuleCode, FindingSeverity>> = Object.fromEntries(
  VERSION_RULES.map((r) => [r.code, r.severity]),
) as Record<RuleCode, FindingSeverity>;

export interface Finding {
  readonly code: RuleCode;
  readonly severity: FindingSeverity;
  /** What the finding is about, by name: an element id, an act, a state, or the process. */
  readonly element: string;
  /** The facts a sentence needs. Never prose. */
  readonly detail: Readonly<Record<string, string | number>>;
}

/** Everything the rules read. Built by `liveWorld()`; built by hand in a spec. */
export interface ValidationWorld {
  /** Every registered flow. */
  readonly flows: readonly FlowDefinition[];
  /** The flows a command can write through. */
  readonly wiredEntities: readonly string[];
  /** The flows with a surface that can show a step. */
  readonly stepSurfaces: readonly string[];
  /** The lanes that may be given a step: buyer-side, holding a permission of their own. */
  readonly stepLanes: readonly string[];
  /** Labels and ids that name a person. A label or an instruction may not contain one. */
  readonly personNames: readonly string[];
  /** Payload keys under which an actor could arrive. A capture field may not use one. */
  readonly actorKeys: readonly string[];
  /** The switch that is OFF for this act, or `null`. */
  switchedOff(transitionId: string): string | null;
  /** How many documents of this process rest in this state now; `null` when it cannot be counted. */
  resting(entity: string, state: string): number | null;
}

/** How many elements may stand in front of one act before the screen stops being readable. */
export const MAX_ELEMENTS_PER_ACT = 5;

/**
 * CAN A STEP STAND IN FRONT OF THIS ACT? Only an act a person takes on a
 * surface. Automation cannot wait for a person, and the cascade fan-out
 * swallows a refusal, so a gate there would delete an act in silence.
 */
export const isGateable = (def: TransitionDef): boolean => def.trigger === 'user' && def.surfaceable.surfaced;

/**
 * THE ENDING A PROCESS IS FOR — its deepest declared ending, counted in acts
 * from where a document is born; of two equally deep, the one declared first.
 * Every OTHER declared ending is where a document is refused, cancelled or
 * withdrawn (R16). `null` when the flow declares no ending.
 */
export function successEnding(flow: FlowDefinition): string | null {
  const births = flow.transitions.filter((t) => t.trigger === 'creation').map((t) => t.to);
  const depth = new Map<string, number>();
  let frontier = births.length > 0 ? [...new Set(births)] : [flow.initial];
  for (const s of frontier) depth.set(s, 0);
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const state of frontier) {
      for (const t of flow.transitions) {
        if (!t.from.includes(state)) continue;
        for (const to of [t.to, t.settlesTo]) {
          if (to === undefined || depth.has(to)) continue;
          depth.set(to, (depth.get(state) ?? 0) + 1);
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  let best: string | null = null;
  for (const terminal of flow.terminals) {
    const d = depth.get(terminal);
    if (d === undefined) continue;
    if (best === null || d > (depth.get(best) ?? -1)) best = terminal;
  }
  return best;
}

const blank = (s: string): boolean => s.trim() === '';

function namedPerson(text: string, names: readonly string[]): string | null {
  const lower = text.toLowerCase();
  return names.find((n) => n.trim() !== '' && lower.includes(n.toLowerCase())) ?? null;
}

/** Validate a version's content against the world. Pure; never throws. */
export function validateVersion(content: FlowVersionContent, world: ValidationWorld): readonly Finding[] {
  const out: Finding[] = [];
  const at = (code: RuleCode, element: string, detail: Record<string, string | number> = {}): void => {
    out.push({ code, severity: SEVERITY[code], element, detail });
  };

  // R01 — a process with no command target cannot fire an act, so a step in
  // front of one could never be met. Nothing else can be judged without it.
  const flow = world.flows.find((f) => f.entity === content.entity);
  if (!flow || !world.wiredEntities.includes(content.entity)) {
    at('R01', content.entity);
    return out;
  }

  // R02 — composed against a process that no longer exists.
  if (content.baseVersion !== flow.version) {
    at('R02', content.entity, { base: content.baseVersion, shipped: flow.version });
  }

  const acts = new Map(flow.transitions.map((t) => [t.id, t]));
  const elements: readonly { id: string; act: string }[] = [
    ...content.steps.map((s) => ({ id: s.id, act: s.before })),
    ...content.forks.map((f) => ({ id: f.id, act: f.before })),
    ...content.checks.map((c) => ({ id: c.id, act: c.on })),
  ];

  // R03 / R04 — the act an element names must exist, and must be one a step can
  // stand in front of. An element that fails either is left out of the rules
  // below, which would only repeat the same fact in other words.
  const sound = new Set<string>();
  for (const el of elements) {
    const def = acts.get(el.act);
    if (!def) {
      at('R03', el.id, { act: el.act });
    } else if (!isGateable(def)) {
      at('R04', el.id, {
        act: el.act,
        because: def.trigger !== 'user' ? def.trigger : 'not-surfaced',
      });
    } else {
      sound.add(el.id);
    }
  }

  // R05 — a step nobody can open would stop the process for good.
  if (content.steps.length > 0 && !world.stepSurfaces.includes(content.entity)) {
    at('R05', content.entity);
  }

  // R06 — nobody could complete the step.
  for (const step of content.steps) {
    if (!world.stepLanes.includes(step.lane)) at('R06', step.id, { lane: step.lane });
  }

  // R07 — both languages from birth, and roles only.
  const words = (id: string, part: string, text: Bilingual): void => {
    for (const lang of ['en', 'id'] as const) {
      if (blank(text[lang])) {
        at('R07', id, { part, language: lang, problem: 'missing' });
        continue;
      }
      const person = namedPerson(text[lang], world.personNames);
      if (person !== null) at('R07', id, { part, language: lang, problem: 'person' });
    }
  };
  for (const step of content.steps) {
    words(step.id, 'label', step.label);
    words(step.id, 'instruction', step.instruction);
    for (const field of step.fields ?? []) words(step.id, `field:${field.name}`, field.label);
  }
  for (const fork of content.forks) words(fork.id, 'label', fork.label);
  for (const check of content.checks) {
    if (check.rule.kind === 'value') words(check.id, 'message', check.rule.message);
  }

  // R08 — one id names one element; one order names one place in front of an act.
  const seenIds = new Set<string>();
  for (const el of elements) {
    if (seenIds.has(el.id)) at('R08', el.id, { problem: 'id' });
    seenIds.add(el.id);
  }
  const seenOrders = new Set<string>();
  for (const step of content.steps) {
    const key = `${step.before}#${step.order}`;
    if (seenOrders.has(key)) at('R08', step.id, { problem: 'order', act: step.before, order: step.order });
    seenOrders.add(key);
  }

  // R12 — a separation rule compares against a step, so the step must be there
  // to read: earlier, in front of the same act.
  const stepById = new Map(content.steps.map((s) => [s.id, s]));
  for (const step of content.steps) {
    for (const other of step.differentFrom ?? []) {
      const earlier = stepById.get(other);
      if (!earlier || earlier.before !== step.before || earlier.order >= step.order) {
        at('R12', step.id, { names: other });
      }
    }
  }
  for (const check of content.checks) {
    if (check.rule.kind === 'different-person' && !stepById.has(check.rule.step)) {
      at('R12', check.id, { names: check.rule.step });
    }
  }

  // R13 — attribution comes from the session, never from a form.
  for (const step of content.steps) {
    const names = new Set<string>();
    for (const field of step.fields ?? []) {
      if (world.actorKeys.includes(field.name)) at('R13', step.id, { field: field.name, problem: 'actor' });
      if (names.has(field.name)) at('R13', step.id, { field: field.name, problem: 'duplicate' });
      names.add(field.name);
    }
  }

  // R14 — the same lane approving twice with nothing to keep the two apart is
  // the same approval twice.
  const approvals = new Map<string, AddedStep[]>();
  for (const step of content.steps) {
    if (step.kind !== 'approval') continue;
    const key = `${step.before}#${step.lane}`;
    approvals.set(key, [...(approvals.get(key) ?? []), step]);
  }
  for (const group of approvals.values()) {
    const ordered = [...group].sort((a, b) => a.order - b.order);
    for (const [i, step] of ordered.entries()) {
      if (i === 0) continue;
      const earlier = new Set(ordered.slice(0, i).map((s) => s.id));
      if (!(step.differentFrom ?? []).some((id) => earlier.has(id))) {
        at('R14', step.id, { act: step.before, lane: step.lane });
      }
    }
  }

  const gatedByStep = new Set(content.steps.filter((s) => sound.has(s.id)).map((s) => s.before));

  // R15 — every way out of a state now waits on an added step.
  for (const state of flow.states) {
    if (flow.terminals.includes(state)) continue;
    const exits = flow.transitions.filter((t) => t.from.includes(state) && !t.statePreserving);
    if (exits.length > 0 && exits.every((t) => gatedByStep.has(t.id))) at('R15', state);
  }

  // R16 — the safe direction should stay easy to reach.
  const success = successEnding(flow);
  for (const step of content.steps) {
    const def = acts.get(step.before);
    if (!def || !sound.has(step.id)) continue;
    if (flow.terminals.includes(def.to) && def.to !== success) {
      at('R16', step.id, { act: def.id, ending: def.to });
    }
  }

  // R17 — the element cannot be met until the switch is on.
  for (const el of elements) {
    if (!sound.has(el.id)) continue;
    const off = world.switchedOff(el.act);
    if (off !== null) at('R17', el.id, { act: el.act, switch: off });
  }

  // R18 — the screen stops being readable.
  const perAct = new Map<string, number>();
  for (const el of elements) perAct.set(el.act, (perAct.get(el.act) ?? 0) + 1);
  for (const [act, count] of perAct) {
    if (count > MAX_ELEMENTS_PER_ACT) at('R18', act, { count, limit: MAX_ELEMENTS_PER_ACT });
  }

  // R19 — what the change will meet. A state that cannot be counted says so
  // rather than reading as none.
  const affected = new Set<string>();
  for (const el of elements) {
    if (!sound.has(el.id)) continue;
    for (const state of acts.get(el.act)?.from ?? []) affected.add(state);
  }
  for (const state of flow.states) {
    if (!affected.has(state)) continue;
    const count = world.resting(content.entity, state);
    at('R19', state, count === null ? { counted: 'no' } : { counted: 'yes', count });
  }

  return out;
}

/** The findings that block a change outright. */
export const errorsOf = (findings: readonly Finding[]): readonly Finding[] =>
  findings.filter((f) => f.severity === 'error');

// ── THE APPLIER ─────────────────────────────────────────────────────────────

/** One act as the platform will apply it under a version. */
export interface AppliedAct {
  readonly id: string;
  readonly from: readonly string[];
  readonly to: string;
  readonly requiredRole: string;
  readonly requiredFields: readonly string[];
  readonly statePreserving: boolean;
  readonly sapBoundary: boolean;
  readonly settlesTo: string | null;
  /** The shipped checks, in the shipped order, then the added ones. */
  readonly checks: readonly string[];
  /** How many of `checks` the process shipped with. */
  readonly shippedChecks: number;
  /** The steps in front of this act, in the author's order. */
  readonly steps: readonly AddedStep[];
  readonly forks: readonly AddedFork[];
  readonly addedChecks: readonly AddedCheck[];
}

export interface AppliedFlow {
  readonly entity: string;
  readonly acts: readonly AppliedAct[];
}

/** The name an added check refuses under, in the place a hook's name stands. */
export const addedCheckName = (check: AddedCheck): string => `added_check:${check.id}`;

/**
 * THE PROCESS AS IT RUNS UNDER A VERSION. Every act the flow ships is here,
 * unchanged, with whatever the version puts in front of it. It adds; it has no
 * way to take anything away, and `validateVersion.test.ts` holds that over the
 * real catalogue rather than taking this comment's word for it.
 */
export function applyVersion(flow: FlowDefinition, content: FlowVersionContent): AppliedFlow {
  return {
    entity: flow.entity,
    acts: flow.transitions.map((def) => {
      const addedChecks = content.checks.filter((c) => c.on === def.id);
      return {
        id: def.id,
        from: def.from,
        to: def.to,
        requiredRole: def.requiredRole,
        requiredFields: def.requiredFields,
        statePreserving: def.statePreserving === true,
        sapBoundary: def.sapBoundary === true,
        settlesTo: def.settlesTo ?? null,
        checks: [...def.policyHooks, ...addedChecks.map(addedCheckName)],
        shippedChecks: def.policyHooks.length,
        steps: content.steps.filter((s) => s.before === def.id).sort((a, b) => a.order - b.order),
        forks: content.forks.filter((f) => f.before === def.id),
        addedChecks,
      };
    }),
  };
}
