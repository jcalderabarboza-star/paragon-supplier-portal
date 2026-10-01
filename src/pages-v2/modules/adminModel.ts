// ────────────────────────────────────────────────────────────────────────────
// M2 · THE ADMIN PAGE'S FORM — Design 5 §A.5.2. Pure: the form, what changed,
// the order to send it in, and the payload of each act.
//
// ⚠️ **SAVE SENDS ONLY WHAT CHANGED.** `changesOf` compares the form with the
// activation IN FORCE, row by row, and a row that matches is not a command —
// `MODULE_ACTUALLY_CHANGES` would refuse it anyway, and a refusal the page
// manufactured itself would read as a failure the person caused.
//
// ⚠️ **AND IN AN ORDER THE DEPENDENCY RULES CAN ADMIT.** Switch-offs go first,
// most-dependent first (INV before ORD), so a batch that switches a chain off
// is not refused by its own first row; everything else follows, least-dependent
// first, so a chain switched on finds its dependencies on. The dispatcher still
// decides every row — the order only stops the page refusing itself.
//
// ⚠️ **PHASE AND ON/OFF CANNOT DISAGREE IN THE FORM.** Choosing a phase sets
// ON/OFF from it (`phaseIsOn`); flipping ON/OFF moves the phase to the nearest
// one of the right kind. `MODULE_PHASE_CONSISTENT` refuses a disagreement, so a
// form that could hold one would only be a way to manufacture a refusal.
// ────────────────────────────────────────────────────────────────────────────

import {
  MODULE_SIDES,
  getModule,
  getModules,
  hardDependantsOf,
  hardDependenciesOf,
  phaseIsOn,
  type ActivationSubject,
  type ModuleCode,
  type ModulePhase,
  type SideId,
} from '../../services/modules/registry';
import { defaultActivation, type ModuleActivationView } from '../../services/modules/activation';

export interface ModuleRowForm {
  readonly phase: ModulePhase;
  readonly enabled: boolean;
  readonly parts: Readonly<Record<string, boolean>>;
}

export interface AdminForm {
  readonly modules: Readonly<Record<ModuleCode, ModuleRowForm>>;
  readonly sides: Readonly<Record<SideId, boolean>>;
}

export function formFromView(view: ModuleActivationView): AdminForm {
  const modules = {} as Record<ModuleCode, ModuleRowForm>;
  for (const m of getModules()) {
    const s = view.modules[m.code];
    modules[m.code] = { phase: s.phase, enabled: s.enabled, parts: { ...s.parts } };
  }
  const sides = {} as Record<SideId, boolean>;
  for (const side of MODULE_SIDES) sides[side] = view.sides[side].enabled;
  return { modules, sides };
}

/** Reset's target: the registry defaults (§A.2), never the last saved state. */
export const defaultForm = (): AdminForm => formFromView(defaultActivation());

const withRow = (form: AdminForm, code: ModuleCode, row: ModuleRowForm): AdminForm => ({
  ...form,
  modules: { ...form.modules, [code]: row },
});

export function setPhase(form: AdminForm, code: ModuleCode, phase: ModulePhase): AdminForm {
  return withRow(form, code, { ...form.modules[code], phase, enabled: phaseIsOn(phase) });
}

export function setEnabled(form: AdminForm, code: ModuleCode, enabled: boolean): AdminForm {
  const row = form.modules[code];
  const keep = phaseIsOn(row.phase) === enabled;
  return withRow(form, code, { ...row, enabled, phase: keep ? row.phase : enabled ? 'Active' : 'Planned' });
}

export function setPart(form: AdminForm, code: ModuleCode, part: string, on: boolean): AdminForm {
  const row = form.modules[code];
  return withRow(form, code, { ...row, parts: { ...row.parts, [part]: on } });
}

export function setSide(form: AdminForm, side: SideId, on: boolean): AdminForm {
  return { ...form, sides: { ...form.sides, [side]: on } };
}

/** One act the Save button would dispatch. */
export interface ModuleChange {
  readonly subject: ActivationSubject;
  /** The payload minus the batch reason. */
  readonly payload: Readonly<Record<string, unknown>>;
  /** True when this act switches the subject OFF. */
  readonly switchesOff: boolean;
}

/** The rows whose form differs from what is in force — nothing else. */
export function changesOf(form: AdminForm, view: ModuleActivationView): ModuleChange[] {
  const out: ModuleChange[] = [];
  for (const m of getModules()) {
    if (m.alwaysOn) continue;
    const want = form.modules[m.code];
    const now = view.modules[m.code];
    const partsDiffer = m.parts.some((p) => (want.parts[p.id] ?? true) !== (now.parts[p.id] ?? true));
    if (want.phase === now.phase && want.enabled === now.enabled && !partsDiffer) continue;
    out.push({
      subject: m.code,
      payload: {
        phase: want.phase,
        enabled: want.enabled,
        ...(m.parts.length > 0 ? { parts: Object.fromEntries(m.parts.map((p) => [p.id, want.parts[p.id] ?? true])) } : {}),
      },
      switchesOff: now.enabled && !want.enabled,
    });
  }
  // The buyer side is never offered (it cannot go off while PLT is on).
  const supplier = 'side:supplier' as const;
  if (form.sides[supplier] !== view.sides[supplier].enabled) {
    out.push({ subject: supplier, payload: { enabled: form.sides[supplier] }, switchesOff: !form.sides[supplier] });
  }
  return out;
}

/** The longest hard-dependency chain under a module — 0 for one that needs nothing. */
function depth(code: ModuleCode, seen: readonly ModuleCode[] = []): number {
  const deps = hardDependenciesOf(code).filter((d) => !seen.includes(d));
  return deps.length === 0 ? 0 : 1 + Math.max(...deps.map((d) => depth(d, [...seen, code])));
}

const depthOf = (s: ActivationSubject): number => (s.startsWith('side:') ? 0 : depth(s as ModuleCode));

/** Switch-offs first, deepest first; then the rest, shallowest first. */
export function orderChanges(changes: readonly ModuleChange[]): ModuleChange[] {
  const offs = changes.filter((c) => c.switchesOff).sort((a, b) => depthOf(b.subject) - depthOf(a.subject));
  const rest = changes.filter((c) => !c.switchesOff).sort((a, b) => depthOf(a.subject) - depthOf(b.subject));
  return [...offs, ...rest];
}

/**
 * The switch-offs the FORM itself would block: a module set OFF while a hard
 * dependant stays ON in the same form. Shown before Save; the dispatcher's
 * refusal names the same dependants if Save is pressed anyway.
 */
export function blockedSwitchOffs(form: AdminForm): Partial<Record<ModuleCode, ModuleCode[]>> {
  const out: Partial<Record<ModuleCode, ModuleCode[]>> = {};
  for (const m of getModules()) {
    if (form.modules[m.code].enabled) continue;
    const on = hardDependantsOf(m.code).filter((d) => form.modules[d].enabled);
    if (on.length > 0) out[m.code] = on;
  }
  return out;
}

/** True when the form differs from the registry defaults (Reset has something to do). */
export function differsFromDefaults(form: AdminForm): boolean {
  return changesOf(form, defaultActivation()).length > 0;
}

/** The parts a module offers, in registry order — for the row's sub-toggles. */
export const partsOf = (code: ModuleCode) => getModule(code).parts;
