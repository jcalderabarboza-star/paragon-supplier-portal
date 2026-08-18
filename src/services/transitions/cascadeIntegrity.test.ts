// ─────────────────────────────────────────────────────────────────────────────
// THE CASCADE-MAP COVERAGE GATE — the census, written as a gate instead of a count.
//
// `cascades.ts` links a SOURCE transition to the cascade(s) it fires. Every field
// in a `CascadeLink` is a bare `string`: `targetEntity` and `targetTransitionId`
// are unvalidated, and nothing anywhere asserted that either resolves, that they
// resolve to the SAME machine, or that the target can be dispatched at all. The
// dispatcher's own answer to a bad link is `UNKNOWN_TRANSITION` / `UNKNOWN_ENTITY`
// — a `failed` event, forever, into a sink with ZERO non-test readers.
//
// ── WHY THIS FILE EXISTS, AND THE SEQUENCE IS THE POINT ──────────────────────
//   A swallowed catch (`dispatcher.ts:334`) led to a census of the cascade
//   population. The census made a WRONG CLAIM and, in the same pass, pointed at a
//   real vulnerability. The vulnerability's first statement was ALSO wrong. What
//   survived every correction is the question underneath all of them: CAN AN
//   AUTHORED CASCADE ADDRESS THE WRONG MACHINE? Today it cannot — but only
//   because two independent qualifications happen to agree, and NOTHING CHECKED
//   THAT THEY AGREE. This file is that check.
//
// ── ⚠️ THE FIRST DRAFT OF THIS GATE PASSED OVER ZERO ROWS ────────────────────
//   The derivation that produced it imported `./registry` rather than `./index`,
//   so no shipped flow had self-registered: `getKnownFlows()` returned `[]`, every
//   duplicate check ran over an empty population, and every answer came back
//   CLEAN. `EMPTY-INPUT-REPORTS-CLEAN-01`, in the instrument written to check for
//   exactly this class. The only thing that caught it was a known-GOOD assertion
//   (`expect(ids).toContain('t_gr_post')`) going red — heuristic rule 4, paying
//   for itself a second time. THAT is why the population guard below runs FIRST
//   and asserts membership programmatically rather than counting rows.
//
// The checker is a PURE function over injected inputs so the gate can be probed
// in BOTH directions on the same instrument: the shipped map must yield zero
// violations, and a synthetic map must yield exactly the violation it earns. A
// guard believed only in the direction it was written is not a guard (§39).
// Deliberately test-local — it is an assertion about authored data, not a runtime
// module, and adding a source module that only a test imports has a known cost in
// this tree (the H3 headlessness and E4 consumer censuses both read module lists).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import { getKnownFlows, CASCADES, type CascadeLink, type FlowDefinition } from './index';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';

type ViolationKind =
  /** A `CASCADES` key that names no registered transition. */
  | 'source-unregistered'
  /** A `targetTransitionId` that names no registered transition. */
  | 'target-unregistered'
  /** A `targetEntity` that names no registered flow. */
  | 'target-entity-unknown'
  /** A `targetEntity` with no `CommandTarget` — the cascade can never fire. */
  | 'target-entity-unwired'
  /**
   * ⚠️ THE COLLISION GATE. The target transition is real and the target entity is
   * real, and THEY BELONG TO DIFFERENT MACHINES — an authored cascade addressing
   * one lane's verb against another lane's entity. This is the failure that is
   * not loud: no throw, no refusal, just a write on the wrong document.
   */
  | 'target-lane-mismatch'
  /** The same (entity, transition) link authored twice under one source. */
  | 'duplicate-link'
  /** Two registered transitions sharing an id — the key is not injective. */
  | 'id-not-injective';

interface Violation {
  readonly kind: ViolationKind;
  readonly detail: string;
}

/**
 * Every way an authored cascade map can disagree with the flow catalog it
 * addresses. Pure: reads only its arguments, so it can be run against the shipped
 * inputs and against a synthetic tree with the same code.
 */
function cascadeViolations(
  cascades: Record<string, readonly CascadeLink[]>,
  flows: readonly FlowDefinition[],
  wired: readonly string[],
): readonly Violation[] {
  const out: Violation[] = [];
  const at = (kind: ViolationKind, detail: string) => out.push({ kind, detail });

  // The catalog, indexed the way the registry indexes it: transition id → owning
  // entity. Built here rather than read from the registry so a synthetic tree
  // exercises the identical code path.
  const ownerOf = new Map<string, string>();
  const entities = new Set<string>();
  for (const flow of flows) {
    entities.add(flow.entity);
    for (const t of flow.transitions) {
      const prior = ownerOf.get(t.id);
      if (prior !== undefined) {
        at('id-not-injective', `'${t.id}' declared by both '${prior}' and '${flow.entity}'`);
      }
      ownerOf.set(t.id, flow.entity);
    }
  }

  const wiredSet = new Set(wired);
  for (const [source, links] of Object.entries(cascades)) {
    if (!ownerOf.has(source)) {
      at('source-unregistered', `cascade source '${source}' is not a registered transition`);
    }
    const seen = new Set<string>();
    for (const link of links) {
      const pair = `${link.targetEntity}:${link.targetTransitionId}`;
      if (seen.has(pair)) at('duplicate-link', `'${source}' declares ${pair} twice`);
      seen.add(pair);

      if (!entities.has(link.targetEntity)) {
        at('target-entity-unknown', `'${source}' → entity '${link.targetEntity}' is not a registered flow`);
      } else if (!wiredSet.has(link.targetEntity)) {
        at('target-entity-unwired', `'${source}' → entity '${link.targetEntity}' has no CommandTarget`);
      }

      const owner = ownerOf.get(link.targetTransitionId);
      if (owner === undefined) {
        at('target-unregistered', `'${source}' → '${link.targetTransitionId}' is not a registered transition`);
      } else if (entities.has(link.targetEntity) && owner !== link.targetEntity) {
        at(
          'target-lane-mismatch',
          `'${source}' → entity '${link.targetEntity}' but '${link.targetTransitionId}' belongs to '${owner}'`,
        );
      }
    }
  }
  return out;
}

// ── A synthetic two-lane tree: the exact shape the ruling described ───────────
// Two independently-numbered lanes whose verbs collide on the bare suffix
// (`release`). Only the ENTITY tells them apart, which is what the gate checks.
//
// ⚠️ **THIS IS A GATE AGAINST A LANE THAT WILL EXIST — DO NOT DELETE IT AS A TEST
// FOR NOTHING.** Neither `t_delivery_release` nor `t_deliveryagreement_release` is
// in the catalog today: 91 transition ids, none containing `delivery`, because
// `services/delivery/index.ts` says of itself *"Spine only — no flows, no
// CommandTargets, no UI, no registry touch."* **TODAY.** That module is a modelled
// SAP LPA scheduling agreement whose whole trajectory is toward a flow and a
// CommandTarget, and the day it gets them this tree stops being synthetic. A gate
// authored only for shapes already present is a gate that arrives after the
// defect — and this particular shape does not announce itself when it arrives,
// because a lane mismatch throws nothing and refuses nothing. The named entities
// are deliberate: they are the ones a reader will recognise when the lane lands.
const LANE_A: FlowDefinition = {
  entity: 'delivery',
  version: 1,
  states: ['Draft', 'Released'],
  initial: 'Draft',
  terminals: ['Released'],
  transitions: [
    { id: 't_delivery_release', from: ['Draft'], to: 'Released', trigger: 'cascade', requiredRole: 'delivery:release', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
  ],
};
const LANE_B: FlowDefinition = {
  entity: 'deliveryAgreement',
  version: 1,
  states: ['Draft', 'Released'],
  initial: 'Draft',
  terminals: ['Released'],
  transitions: [
    { id: 't_deliveryagreement_release', from: ['Draft'], to: 'Released', trigger: 'cascade', requiredRole: 'deliveryagreement:release', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
  ],
};
const SOURCE: FlowDefinition = {
  entity: 'src',
  version: 1,
  states: ['Open', 'Fired'],
  initial: 'Open',
  terminals: ['Fired'],
  transitions: [
    { id: 't_src_go', from: ['Open'], to: 'Fired', trigger: 'user', requiredRole: 'src:go', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
  ],
};
const SYNTH_FLOWS = [SOURCE, LANE_A, LANE_B];
const SYNTH_WIRED = ['src', 'delivery', 'deliveryAgreement'];
const kinds = (v: readonly Violation[]) => v.map((x) => x.kind).sort();

describe('cascade-map coverage gate — the population', () => {
  it('⚠️ THE CATALOG IS LOADED — asserted by membership, not by a count', () => {
    // Runs first and fails loudest. Every assertion in this file is a loop over a
    // derived population, and an EMPTY population satisfies all of them silently.
    // This gate's own first draft shipped that bug; see the header.
    const ids = getKnownFlows().flatMap((f) => f.transitions.map((t) => t.id));
    expect(ids).toContain('t_gr_post'); // a known-TRUE member
    expect(ids).not.toContain('t_gr_teleport'); // a known-FALSE one
    expect(getKnownFlows().length).toBeGreaterThan(10);
    expect(Object.keys(CASCADES).length).toBeGreaterThan(0);
    expect(WIRED_COMMAND_TARGETS.length).toBeGreaterThan(0);
  });

  it('the shipped transition-id key is INJECTIVE across the whole catalog', () => {
    // Why a bare verb suffix is never enough on its own: the last segment of the
    // id collides many ways, and only the full id (or entity + verb) is unique.
    const ids = getKnownFlows().flatMap((f) => f.transitions.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);

    const bySuffix = new Map<string, string[]>();
    for (const id of ids) {
      const verb = id.split('_').slice(2).join('_');
      bySuffix.set(verb, [...(bySuffix.get(verb) ?? []), id]);
    }
    const colliding = [...bySuffix.entries()].filter(([, v]) => v.length > 1);
    // Stated as a fact rather than a fear: the bare verb IS ambiguous, on many
    // verbs, today. Nothing in the tree keys by it — and this file is what keeps
    // that true for cascades specifically.
    expect(colliding.length).toBeGreaterThan(0);
    expect(bySuffix.get('award')).toEqual(['t_rfq_award', 't_quotation_award']);
  });
});

describe('cascade-map coverage gate — the shipped map', () => {
  it('⚠️ KNOWN-GOOD FIRST — the shipped cascade map has ZERO violations', () => {
    const found = cascadeViolations(CASCADES, getKnownFlows(), WIRED_COMMAND_TARGETS);
    expect(found.map((v) => `${v.kind}: ${v.detail}`)).toEqual([]);
  });

  it('every authored link is entity-qualified AND the two halves agree', () => {
    // The property the gate exists for, stated directly over the shipped data:
    // the target transition is declared BY the flow the link names.
    const byEntity = new Map(getKnownFlows().map((f) => [f.entity, f]));
    const links = Object.entries(CASCADES).flatMap(([s, ls]) => ls.map((l) => [s, l] as const));
    expect(links.length).toBeGreaterThan(0);
    for (const [source, link] of links) {
      const flow = byEntity.get(link.targetEntity);
      expect(flow, `${source} → ${link.targetEntity}`).toBeDefined();
      expect(
        flow!.transitions.map((t) => t.id),
        `${source} → ${link.targetEntity}:${link.targetTransitionId}`,
      ).toContain(link.targetTransitionId);
      expect(WIRED_COMMAND_TARGETS).toContain(link.targetEntity);
    }
  });

  it('⚠️ THE STATED RESIDUAL — one authored target does not declare itself a cascade', () => {
    // `flowGraph`'s cascade-integrity check only examines transitions whose own
    // trigger is `cascade`, so an authored target with any other trigger is
    // invisible to it IN BOTH DIRECTIONS. Pinned as an EXACT SET, inverted: the
    // day somebody re-triggers it, this goes red and the residual gets rewritten
    // rather than quietly shrinking. Not a whitelist — a statement of the gap.
    const byId = new Map(
      getKnownFlows().flatMap((f) => f.transitions.map((t) => [t.id, t] as const)),
    );
    const targets = [
      ...new Set(Object.values(CASCADES).flatMap((ls) => ls.map((l) => l.targetTransitionId))),
    ];
    expect(targets.length).toBe(4);
    const notDeclaredCascade = targets.filter((id) => byId.get(id)!.trigger !== 'cascade');
    expect(notDeclaredCascade).toEqual(['t_invoice_match']);
  });
});

describe('cascade-map coverage gate — probed in the OTHER direction', () => {
  it('a clean synthetic tree yields zero violations (the control for every case below)', () => {
    const ok: Record<string, readonly CascadeLink[]> = {
      t_src_go: [{ targetEntity: 'delivery', targetTransitionId: 't_delivery_release' }],
    };
    expect(cascadeViolations(ok, SYNTH_FLOWS, SYNTH_WIRED)).toEqual([]);
  });

  it('⚠️ REDDENS ON A LANE MISMATCH — one lane\'s verb against another lane\'s entity', () => {
    // The failure this gate is named for. Both halves resolve; neither is a typo;
    // the dispatcher would refuse nothing and write nothing wrong-LOOKING. Only
    // the disagreement between the two halves reveals it.
    const collided: Record<string, readonly CascadeLink[]> = {
      t_src_go: [{ targetEntity: 'delivery', targetTransitionId: 't_deliveryagreement_release' }],
    };
    const found = cascadeViolations(collided, SYNTH_FLOWS, SYNTH_WIRED);
    expect(kinds(found)).toEqual(['target-lane-mismatch']);
    expect(found[0].detail).toContain("belongs to 'deliveryAgreement'");
  });

  it('reddens on an unregistered source, target, or entity', () => {
    expect(kinds(cascadeViolations(
      { t_src_ghost: [{ targetEntity: 'delivery', targetTransitionId: 't_delivery_release' }] },
      SYNTH_FLOWS, SYNTH_WIRED,
    ))).toEqual(['source-unregistered']);

    expect(kinds(cascadeViolations(
      { t_src_go: [{ targetEntity: 'delivery', targetTransitionId: 't_delivery_ghost' }] },
      SYNTH_FLOWS, SYNTH_WIRED,
    ))).toEqual(['target-unregistered']);

    expect(kinds(cascadeViolations(
      { t_src_go: [{ targetEntity: 'ghostEntity', targetTransitionId: 't_delivery_release' }] },
      SYNTH_FLOWS, SYNTH_WIRED,
    ))).toEqual(['target-entity-unknown']);
  });

  it('reddens on a target entity with no CommandTarget — an authored cascade that can never fire', () => {
    const found = cascadeViolations(
      { t_src_go: [{ targetEntity: 'delivery', targetTransitionId: 't_delivery_release' }] },
      SYNTH_FLOWS,
      ['src'], // `delivery` deliberately unwired
    );
    expect(kinds(found)).toEqual(['target-entity-unwired']);
  });

  it('reddens on a duplicated link and on a non-injective transition id', () => {
    const dup: Record<string, readonly CascadeLink[]> = {
      t_src_go: [
        { targetEntity: 'delivery', targetTransitionId: 't_delivery_release' },
        { targetEntity: 'delivery', targetTransitionId: 't_delivery_release' },
      ],
    };
    expect(kinds(cascadeViolations(dup, SYNTH_FLOWS, SYNTH_WIRED))).toEqual(['duplicate-link']);

    // Two lanes declaring ONE id — the collision the registry refuses at
    // registration. Asserted here too, because the checker must not depend on
    // having been fed a registry-validated tree to notice it.
    const shadow: FlowDefinition = { ...LANE_B, transitions: [{ ...LANE_A.transitions[0] }] };
    expect(kinds(cascadeViolations({}, [LANE_A, shadow], SYNTH_WIRED))).toEqual(['id-not-injective']);
  });
});
