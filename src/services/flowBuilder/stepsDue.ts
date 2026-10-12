// ────────────────────────────────────────────────────────────────────────────
// FB-4 · WHICH VERSION OF A PROCESS IS IN FORCE, AND WHICH STEP IS DUE — the
// READ half of the overlay (Design 6 v2 §7), and the only half a surface needs.
//
// ⚠️ THIS MODULE IMPORTS NO COMMAND SERVICE AND NO POLICY. It is read by the
// line that says who acts next, which stands on supplier pages too, so what it
// pulls into a page's import graph is kept to the version store, the step
// ledger and the rules library. The world a version is judged by is HANDED IN
// (`provideWorld`), by the module that owns it; asked before one was handed in,
// it throws rather than judge a version by nothing.
//
// ⚠️ EVERYTHING IS DERIVED AT READ, NOTHING IS STORED. A step is due when the
// version that defines it is in force, the steps ordered before it are done,
// and it has no unspent completion.
//
// ⚠️ A VERSION WHOSE PROCESS MOVED IS SET ASIDE, BY NAME (§6.5). An active
// version that no longer obeys the rules is not in force: the process runs on
// the shipped default and the surface says which version was set aside.
//
// ⚠️ DECISION 1 (operator ruling): an act obeys the version in force WHEN THE
// ACT IS TAKEN. A completion is counted for the version it was taken under.
// ────────────────────────────────────────────────────────────────────────────

import { atomsForSeat } from '../transitions/customRoles';
import { SYSTEM_ROLES, type BusinessRoleId, type SystemRoleId } from '../transitions/businessRoles';
import { getFlow } from '../transitions/registry';
import { shippedLabel, versionStamp, type AddedStep, type FlowVersion } from './flowVersion';
import { flowVersionStore } from './flowVersionStore';
import { stepLedger, type StepRow } from './stepLedger';
import { errorsOf, validateVersion, type Finding, type ValidationWorld } from './validateVersion';

let worldNow: (() => ValidationWorld) | null = null;

/** Hand in the world a version in force is judged by. Called once, by the overlay. */
export function provideWorld(world: () => ValidationWorld): void {
  worldNow = world;
}

// ── THE FIXTURE IS GROWN AS THE PROCESSES SHIPPED ───────────────────────────
//
// Before the first paint the app grows some sample documents THROUGH THE REAL
// ACTS (an approved requisition, a reviewed application). Those acts are the
// fixture's history, taken before anybody sat down: a change that somebody put
// in force in this browser must not stop them, or a reload would open on a
// fixture with documents missing and an error in the console.
//
// ⚠️ THIS IS THE ONE PLACE THE OVERLAY STANDS DOWN, AND IT IS NOT A DOOR A
// SURFACE HOLDS. `main.tsx` calls it around the boot seeds and nowhere else
// does (`fb4Overlay.test.ts` scans for the call). While it is on, an event
// says the shipped version, which is the version those acts were taken under.
let seeding = false;
export function fixtureSeeding(on: boolean): void {
  seeding = on;
}

// ── WHICH VERSION IS IN FORCE ───────────────────────────────────────────────

export interface InForce {
  /** The version the process obeys now, or `null`: the shipped default. */
  readonly version: FlowVersion | null;
  /** An active version that is NOT obeyed, with the rules it breaks today. */
  readonly setAside: { readonly version: FlowVersion; readonly findings: readonly Finding[] } | null;
}

const DEFAULT: InForce = Object.freeze({ version: null, setAside: null });

export function inForce(entity: string): InForce {
  if (seeding) return DEFAULT;
  const active = flowVersionStore.forEntity(entity).filter((v) => v.state === 'Active');
  // At most one is active per process: activating or restoring another retires
  // it by cascade. Should two ever stand, the later one is the one in force.
  const version = active[active.length - 1];
  if (!version) return DEFAULT;
  if (!worldNow) throw new Error('stepsDue: a version is active and no world was provided to judge it by');
  const findings = errorsOf(validateVersion(version.content, worldNow()));
  return findings.length > 0 ? { version: null, setAside: { version, findings } } : { version, setAside: null };
}

/** The stamp every event carries: `purchaseRequisition@2`, `purchaseRequisition@2.1`. */
export function versionStampFor(entity: string): string {
  const version = inForce(entity).version;
  return versionStamp(entity, version ? version.label : shippedLabel(getFlow(entity)?.version ?? 0));
}

// ── ONE STEP ON ONE DOCUMENT ────────────────────────────────────────────────

/** `<process>:<document>:<step>` — a step id never holds a colon; a document id may. */
export const stepKey = (entity: string, docId: string, stepId: string): string => `${entity}:${docId}:${stepId}`;

export function parseStepKey(key: string): { entity: string; docId: string; stepId: string } | null {
  const first = key.indexOf(':');
  const last = key.lastIndexOf(':');
  if (first <= 0 || last <= first + 1 || last === key.length - 1) return null;
  return { entity: key.slice(0, first), docId: key.slice(first + 1, last), stepId: key.slice(last + 1) };
}

const DECLINED_SUFFIX = ':declined';

/** A `STEP_PENDING` detail: the step's key, with `:declined` after it when the latest decision was a decline. */
export const pendingDetail = (key: string, declined: boolean): string => (declined ? `${key}${DECLINED_SUFFIX}` : key);

/** Read a `STEP_PENDING` detail back into the step's key and whether it was declined. */
export function parsePendingDetail(detail: string): { key: string; declined: boolean } {
  return detail.endsWith(DECLINED_SUFFIX)
    ? { key: detail.slice(0, -DECLINED_SUFFIX.length), declined: true }
    : { key: detail, declined: false };
}

/** The steps a version puts in front of one act, in the author's order. */
export const stepsInFrontOf = (version: FlowVersion, transitionId: string): readonly AddedStep[] =>
  version.content.steps.filter((s) => s.before === transitionId).sort((a, b) => a.order - b.order);

/** The latest unspent row of one step on one document, under this version. */
export function standing(version: FlowVersion, entity: string, docId: string, stepId: string): StepRow | undefined {
  return [...stepLedger.forDocument(entity, docId)]
    .reverse()
    .find((r) => !r.used && r.stepId === stepId && r.versionId === version.id);
}

export interface DueStep {
  readonly version: FlowVersion;
  readonly step: AddedStep;
  /** The act it stands in front of. */
  readonly transitionId: string;
  /** The key the step's two acts are commanded on. */
  readonly key: string;
  /** Set when the latest decision on it was a decline: the act stays refused. */
  readonly declined: StepRow | null;
  /** The steps in front of the same act that are done, with who did each. */
  readonly earlier: readonly { readonly step: AddedStep; readonly row: StepRow }[];
}

/** The step due in front of ONE act on one document, or `null`. */
export function dueStep(entity: string, docId: string, transitionId: string): DueStep | null {
  const version = inForce(entity).version;
  if (!version) return null;
  const earlier: { step: AddedStep; row: StepRow }[] = [];
  for (const step of stepsInFrontOf(version, transitionId)) {
    const row = standing(version, entity, docId, step.id);
    if (row?.decision === 'completed') {
      earlier.push({ step, row });
      continue;
    }
    return { version, step, transitionId, key: stepKey(entity, docId, step.id), declined: row ?? null, earlier };
  }
  return null;
}

/** Every step due on a document resting in `state`: one per gated act legal from there. */
export function dueStepsFor(entity: string, docId: string, state: string): readonly DueStep[] {
  const flow = getFlow(entity);
  if (!flow || !inForce(entity).version) return [];
  return flow.transitions
    .filter((t) => t.from.includes(state))
    .map((t) => dueStep(entity, docId, t.id))
    .filter((d): d is DueStep => d !== null);
}

/** The step a key names, if it is the one due on its document now. */
export function dueStepByKey(key: string): DueStep | null {
  const parsed = parseStepKey(key);
  const version = parsed ? inForce(parsed.entity).version : null;
  const step = version?.content.steps.find((s) => s.id === parsed!.stepId);
  if (!parsed || !step) return null;
  const due = dueStep(parsed.entity, parsed.docId, step.before);
  return due && due.step.id === step.id ? due : null;
}

// ── THE ONE LANE RULE ───────────────────────────────────────────────────────

/**
 * MAY THIS SEAT TAKE THIS STEP? The seat holds the step's lane when it holds
 * every permission that lane holds — so a seat adopting the lane does, a custom
 * role built on it does, and Admin and Super Admin do. THE HOOK AND THE SURFACE
 * BOTH CALL THIS, so the button a seat is shown and the answer the dispatcher
 * gives cannot disagree.
 */
export function stepOpenFor(step: Pick<AddedStep, 'lane'>, seatRoles: readonly BusinessRoleId[]): boolean {
  const lane = SYSTEM_ROLES[step.lane as SystemRoleId] as readonly string[] | undefined;
  if (!lane || lane.length === 0) return false;
  const held = new Set<string>(atomsForSeat(seatRoles));
  return lane.every((atom) => held.has(atom));
}
