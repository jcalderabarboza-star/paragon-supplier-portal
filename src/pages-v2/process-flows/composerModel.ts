// ────────────────────────────────────────────────────────────────────────────
// FB-2 · THE COMPOSER'S MODEL — every edit a person can make to a draft, as a
// pure function from one content to the next.
//
// The composer holds a draft in memory and writes it with ONE act: save. So
// nothing here touches a store, a registry or the dispatcher; each function
// returns a new content and the page decides when to keep it.
//
// ⚠️ WHAT MAY BE ADDED IS THREE KINDS OF STEP. Scans, checks and forks arrive
// with their rules (FB-5); the content type can already hold them, and this
// model never drops one it did not write.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition, TransitionDef } from '../../services/transitions/schema';
import type { AddedStep, FlowVersionContent, StepField, StepKind } from '../../services/flowBuilder/flowVersion';
import { isGateable } from '../../services/flowBuilder/validateVersion';

/** The kinds of step this build composes. */
export const COMPOSABLE_KINDS = ['approval', 'confirmation', 'capture'] as const satisfies readonly StepKind[];
export type ComposableKind = (typeof COMPOSABLE_KINDS)[number];

/** Why an act is not offered. The same four answers rule R04 gives. */
export type WithheldBecause = 'system' | 'cascade' | 'creation' | 'not-surfaced';

export interface ActOptions {
  /** The acts a step can stand in front of, in the flow's own order. */
  readonly offered: readonly TransitionDef[];
  /** Every other act of the process, with the reason it is not offered. */
  readonly withheld: readonly { readonly def: TransitionDef; readonly because: WithheldBecause }[];
}

/**
 * WHICH ACTS THE PICKER OFFERS. Decided by `isGateable` — the predicate rule
 * R04 judges by — so the picker cannot offer an act the library would refuse,
 * and cannot withhold one it would accept.
 */
export function actOptions(flow: FlowDefinition): ActOptions {
  const offered: TransitionDef[] = [];
  const withheld: { def: TransitionDef; because: WithheldBecause }[] = [];
  for (const def of flow.transitions) {
    if (isGateable(def)) offered.push(def);
    else withheld.push({ def, because: def.trigger !== 'user' ? def.trigger : 'not-surfaced' });
  }
  return { offered, withheld };
}

/** The steps in front of one act, in the author's order. */
export const stepsBefore = (content: FlowVersionContent, actId: string): readonly AddedStep[] =>
  content.steps.filter((s) => s.before === actId).sort((a, b) => a.order - b.order);

const BLANK = { en: '', id: '' } as const;

/** A step id nothing in the version uses yet: `s_<kind>_<n>`. */
function mintStepId(content: FlowVersionContent, kind: StepKind): string {
  const taken = new Set([
    ...content.steps.map((s) => s.id),
    ...content.forks.map((f) => f.id),
    ...content.checks.map((c) => c.id),
  ]);
  for (let n = 1; ; n++) {
    const id = `s_${kind}_${n}`;
    if (!taken.has(id)) return id;
  }
}

/**
 * ADD A STEP, last in front of the act. It is born with no lane, no label and
 * no instruction: the findings say so at once, which is the point — a step is
 * not finished until both languages and a lane are written.
 */
export function addStep(content: FlowVersionContent, actId: string, kind: ComposableKind): FlowVersionContent {
  const existing = stepsBefore(content, actId);
  const step: AddedStep = {
    id: mintStepId(content, kind),
    kind,
    before: actId,
    order: existing.length === 0 ? 1 : existing[existing.length - 1].order + 1,
    lane: '',
    label: BLANK,
    instruction: BLANK,
    ...(kind === 'capture' ? { fields: [] } : {}),
  };
  return { ...content, steps: [...content.steps, step] };
}

/** Replace one step by a changed copy of itself. Its id and its act do not move. */
export function updateStep(
  content: FlowVersionContent,
  stepId: string,
  change: Partial<Omit<AddedStep, 'id' | 'before' | 'kind' | 'order'>>,
): FlowVersionContent {
  return { ...content, steps: content.steps.map((s) => (s.id === stepId ? { ...s, ...change } : s)) };
}

/**
 * REMOVE A STEP. Whatever named it — another step's "a different person from",
 * a check on the same person — stops naming it, so a removal never leaves a
 * rule comparing against a step that is gone.
 */
export function removeStep(content: FlowVersionContent, stepId: string): FlowVersionContent {
  return {
    ...content,
    steps: content.steps
      .filter((s) => s.id !== stepId)
      .map((s) =>
        s.differentFrom?.includes(stepId) ? { ...s, differentFrom: s.differentFrom.filter((id) => id !== stepId) } : s,
      ),
    checks: content.checks.filter((c) => !(c.rule.kind === 'different-person' && c.rule.step === stepId)),
  };
}

/**
 * MOVE A STEP one place earlier or later in front of its act: the two steps
 * exchange their places. A step moved earlier than one it must differ from
 * stops naming it — the comparison needs the other step to come first.
 */
export function moveStep(content: FlowVersionContent, stepId: string, direction: 'earlier' | 'later'): FlowVersionContent {
  const step = content.steps.find((s) => s.id === stepId);
  if (!step) return content;
  const ordered = stepsBefore(content, step.before);
  const at = ordered.findIndex((s) => s.id === stepId);
  const other = ordered[direction === 'earlier' ? at - 1 : at + 1];
  if (!other) return content;
  const [first, second] = direction === 'earlier' ? [step, other] : [other, step];
  return {
    ...content,
    steps: content.steps.map((s) => {
      if (s.id === first.id) {
        return { ...s, order: second.order, differentFrom: (s.differentFrom ?? []).filter((id) => id !== second.id) };
      }
      if (s.id === second.id) return { ...s, order: first.order };
      return s;
    }),
  };
}

/** The steps a step may be told to differ from: earlier, in front of the same act. */
export function earlierSteps(content: FlowVersionContent, stepId: string): readonly AddedStep[] {
  const step = content.steps.find((s) => s.id === stepId);
  if (!step) return [];
  return stepsBefore(content, step.before).filter((s) => s.order < step.order);
}

/** A capture step's fields, with one added, changed or removed. */
export function setFields(content: FlowVersionContent, stepId: string, fields: readonly StepField[]): FlowVersionContent {
  return updateStep(content, stepId, { fields });
}

export const blankField = (): StepField => ({ name: '', label: BLANK, type: 'text', required: true });

/** How many elements a version puts in front of each act. */
export function elementsPerAct(content: FlowVersionContent): ReadonlyMap<string, number> {
  const count = new Map<string, number>();
  const add = (act: string): void => void count.set(act, (count.get(act) ?? 0) + 1);
  content.steps.forEach((s) => add(s.before));
  content.forks.forEach((f) => add(f.before));
  content.checks.forEach((c) => add(c.on));
  return count;
}

/** Have the two contents the same elements? What "unsaved" means. */
export const sameContent = (a: FlowVersionContent, b: FlowVersionContent): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
