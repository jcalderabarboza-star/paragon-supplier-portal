// ─────────────────────────────────────────────────────────────────────────────
// PF-1 · THE DERIVATION GATE.
//
// ⚠️ WHAT THIS SUITE DEFENDS IS ONE CLAIM: **the Process Flows page cannot show
// a state the machine does not have, because there is nowhere else a state
// could come from.** That claim is only true while the view model stays a pure
// function of `getKnownFlows()` — the moment anybody adds a fixture, an
// override, or a "just this one flow reads nicer if…" branch, the page becomes
// a SECOND COPY of the machine and the second copy is the one that rots.
//
// So the tests below are mostly EQUALITIES AGAINST THE SCHEMA, run over the
// WHOLE registry rather than a sample: every node is a declared state, every
// row is a declared transition, every count is a length. A drawing is never
// type-checked; this is the substitute.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  buildCatalogView,
  buildFlowView,
  edgesOf,
  stepKind,
  type CatalogSources,
} from './catalogView';
import { analyzeAllFlows, looseEndKey } from './flowGraph';
import { getKnownFlows } from './index';
import { LOOSE_END_CENSUS } from './looseEndCensus';
import { PERSONA_ROLES } from './roles';
import { CASCADES } from './cascades';
import type { FlowDefinition } from './schema';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';
import {
  capabilityBacking,
  capabilityForEntity,
  dispatchesCommands,
  feedProvenance,
  type Capability,
} from '../liveness';

const catalog = () => buildCatalogView(getKnownFlows());

// ─────────────────────────────────────────────────────────────────────────────
// 1. NOTHING IS INVENTED — the whole registry, not a sample
// ─────────────────────────────────────────────────────────────────────────────

describe('PF-1 — the view model invents nothing', () => {
  it('every flow in the catalog is a registered flow, and none is missing', () => {
    expect(catalog().flows.map((v) => v.entity)).toEqual(
      getKnownFlows().map((f) => f.entity),
    );
  });

  it('every state on a flow view is a state the flow DECLARES — and all of them are', () => {
    for (const flow of getKnownFlows()) {
      const view = buildFlowView(flow);
      expect(view.states.map((s) => s.name), flow.entity).toEqual([...flow.states]);
    }
  });

  it('every transition row is a declared transition, in schema order', () => {
    for (const flow of getKnownFlows()) {
      const view = buildFlowView(flow);
      expect(view.transitions.map((t) => t.def.id), flow.entity).toEqual(
        flow.transitions.map((t) => t.id),
      );
    }
  });

  it('every edge names ONLY declared states — a drawn arrow cannot invent a node', () => {
    for (const flow of getKnownFlows()) {
      const declared = new Set(flow.states);
      for (const edge of edgesOf(flow)) {
        expect(declared.has(edge.to), `${flow.entity} ${edge.id} → ${edge.to}`).toBe(true);
        if (edge.from !== null) {
          expect(declared.has(edge.from), `${flow.entity} ${edge.id} ← ${edge.from}`).toBe(true);
        }
      }
    }
  });

  it('every header count is a LENGTH, never a number anybody typed', () => {
    const view = catalog();
    for (const flow of view.flows) {
      const definition = getKnownFlows().find((f) => f.entity === flow.entity)!;
      expect(flow.stateCount).toBe(definition.states.length);
      expect(flow.transitionCount).toBe(definition.transitions.length);
    }
    expect(view.flowCount).toBe(getKnownFlows().length);
    expect(view.stateCount).toBe(
      getKnownFlows().reduce((n, f) => n + f.states.length, 0),
    );
    expect(view.transitionCount).toBe(
      getKnownFlows().reduce((n, f) => n + f.transitions.length, 0),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE DERIVED AXES — each one changes what a reader concludes
// ─────────────────────────────────────────────────────────────────────────────

const probe: FlowDefinition = {
  entity: 'probe',
  version: 3,
  states: ['New', 'Live', 'Posting', 'Posted', 'Done'],
  initial: 'New',
  terminals: ['Done', 'Posted'],
  transitions: [
    { id: 't_probe_create', from: [], to: 'New', trigger: 'creation', requiredRole: 'po:issue', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
    { id: 't_probe_start', from: ['New'], to: 'Live', trigger: 'user', requiredRole: 'po:confirm', requiredFields: ['qty'], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
    { id: 't_probe_finish', from: ['New', 'Live'], to: 'Done', trigger: 'system', requiredRole: 'po:close', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
    { id: 't_probe_pin', from: ['Live'], to: 'Live', trigger: 'user', statePreserving: true, requiredRole: 'rfq:fx-pin', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
    { id: 't_probe_post', from: ['Live'], to: 'Posting', trigger: 'system', requiredRole: 'gr:post', requiredFields: [], policyHooks: [], sapBoundary: true, settlesTo: 'Posted', surfaceable: { surfaced: true }, version: 1 },
  ],
};

const sources: CatalogSources = {
  cascades: {},
  census: [],
  personaRoles: PERSONA_ROLES,
  wiredTargets: [],
};

describe('PF-1 — step kind is DERIVED from trigger, never authored', () => {
  it('user → operator action; system and cascade → system-driven', () => {
    expect(stepKind(probe.transitions[1])).toBe('operator-action');
    expect(stepKind(probe.transitions[2])).toBe('system-driven');
    expect(
      stepKind({ ...probe.transitions[2], trigger: 'cascade' }),
    ).toBe('system-driven');
  });

  it('⚠️ creation is its OWN kind — the union has four members, not three', () => {
    // Folding a creation verb into either bucket would assert something the
    // schema does not say: `t_po_issue` is a buyer act and a rollup birth is
    // not. See PF1-CREATION-KIND-01 in docs/findings.md.
    expect(stepKind(probe.transitions[0])).toBe('creation');
    const kinds = new Set(
      getKnownFlows().flatMap((f) => f.transitions.map(stepKind)),
    );
    expect(kinds.has('creation')).toBe(true);
  });
});

describe('PF-1 — the diagram obeys the analyzer’s two rulings', () => {
  it('a statePreserving verb is a FACT ON A STATE, never an edge', () => {
    const edges = edgesOf(probe);
    expect(edges.map((e) => e.transitionId)).not.toContain('t_probe_pin');
    const live = buildFlowView(probe, sources).states.find((s) => s.name === 'Live')!;
    expect(live.facts).toEqual(['t_probe_pin']);
    // …and it is therefore NOT an exit, so `Live` is not made to look like it
    // has a way out of itself.
    expect(live.outbound).not.toContain('t_probe_pin');
  });

  it('a sapBoundary verb’s settlement IS an edge, out of the interim state', () => {
    const settlement = edgesOf(probe).find((e) => e.settlement)!;
    expect(settlement.from).toBe('Posting');
    expect(settlement.to).toBe('Posted');
    // Without it, `Posted` would be drawn unreachable and `Posting` exit-less —
    // both readings correct about the declaration and wrong about the system.
    const view = buildFlowView(probe, sources);
    expect(view.states.find((s) => s.name === 'Posting')!.outbound).toContain('t_probe_post');
    expect(view.states.find((s) => s.name === 'Posted')!.inbound).toContain('t_probe_post');
  });

  it('a multi-`from` transition yields ONE EDGE PER SOURCE', () => {
    const finish = edgesOf(probe).filter((e) => e.transitionId === 't_probe_finish');
    expect(finish.map((e) => e.from).sort()).toEqual(['Live', 'New']);
  });
});

describe('PF-1 — a decision fork is a CHOICE OF VERB', () => {
  it('two verbs out of one state is a fork, even when both land in one place', () => {
    const forked = buildFlowView(
      {
        ...probe,
        transitions: [
          ...probe.transitions,
          { id: 't_probe_shortcut', from: ['New'], to: 'Done', trigger: 'user', requiredRole: 'po:close', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
        ],
      },
      sources,
    );
    const start = forked.states.find((s) => s.name === 'New')!;
    // Three verbs leave `New`; two of them land in `Done`. A "distinct targets"
    // rule would have called that two branches and missed a real choice.
    expect(start.outbound).toHaveLength(3);
    expect(start.branchTargets).toHaveLength(2);
    expect(start.isFork).toBe(true);
  });

  it('the shipped catalog has decision points, and the count is a filter', () => {
    const view = catalog();
    expect(view.forkCount).toBe(
      view.flows.reduce((n, f) => n + f.states.filter((s) => s.isFork).length, 0),
    );
    expect(view.forkCount).toBeGreaterThan(0);
  });
});

describe('PF-1 — roles resolve to personas through PERSONA_ROLES', () => {
  it('a role a persona holds shows that persona; an unmapped role shows none', () => {
    const view = buildFlowView(probe, sources);
    const byId = new Map(view.transitions.map((t) => [t.def.id, t]));
    expect(byId.get('t_probe_start')!.personas).toEqual(['supplier']); // po:confirm
    expect(byId.get('t_probe_post')!.personas).toEqual(['buyer']); // gr:post
    const unmapped = buildFlowView(
      { ...probe, transitions: [{ ...probe.transitions[1], requiredRole: 'probe:nobody' }] },
      sources,
    );
    expect(unmapped.transitions[0].personas).toEqual([]);
  });

  it('every persona shown is derived — no flow view names a role the map lacks', () => {
    for (const flow of catalog().flows) {
      for (const t of flow.transitions) {
        for (const persona of t.personas) {
          expect(PERSONA_ROLES[persona]).toContain(t.def.requiredRole);
        }
      }
    }
  });
});

describe('PF-1 — cross-entity links come from cascades.ts, in both directions', () => {
  it('a source transition names what it fans out to', () => {
    const rfq = catalog().flows.find((f) => f.entity === 'rfq')!;
    const award = rfq.transitions.find((t) => t.def.id === 't_rfq_award')!;
    expect(award.fansOutTo.map((l) => l.targetTransitionId).sort()).toEqual([
      't_quotation_award',
      't_quotation_reject',
    ]);
  });

  it('a cascade TARGET names what fires it — and names nothing when nothing does', () => {
    const view = catalog();
    const quotation = view.flows.find((f) => f.entity === 'quotation')!;
    expect(
      quotation.transitions.find((t) => t.def.id === 't_quotation_award')!.firedBy,
    ).toEqual(['t_rfq_award']);
    const pr = view.flows.find((f) => f.entity === 'purchaseRequisition')!;
    expect(pr.transitions.find((t) => t.def.id === 't_pr_source')!.firedBy).toEqual([]);
  });

  it('the links are read from the registry, not listed here', () => {
    const declared = new Set(
      Object.values(CASCADES).flatMap((links) => links.map((l) => l.targetTransitionId)),
    );
    const shown = new Set(
      catalog().flows.flatMap((f) =>
        f.transitions.filter((t) => t.firedBy.length > 0).map((t) => t.def.id),
      ),
    );
    expect([...shown].sort()).toEqual([...declared].sort());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE CENSUS IS READ, NOT RESTATED
// ─────────────────────────────────────────────────────────────────────────────

describe('PF-1 — loose ends are derived first and annotated second', () => {
  it('the page’s loose ends ARE the analyzer’s, key for key', () => {
    const shown = catalog()
      .flows.flatMap((f) => f.looseEnds)
      .map(looseEndKey)
      .sort();
    expect(shown).toEqual(analyzeAllFlows(getKnownFlows()).map(looseEndKey).sort());
  });

  it('every shown loose end carries its census REASON and NOTE', () => {
    const byKey = new Map(LOOSE_END_CENSUS.map((row) => [looseEndKey(row), row]));
    const ends = catalog().flows.flatMap((f) => f.looseEnds);
    expect(ends.length).toBe(LOOSE_END_CENSUS.length);
    for (const end of ends) {
      const row = byKey.get(looseEndKey(end));
      expect(row, `uncensused: ${looseEndKey(end)}`).toBeDefined();
      expect(end.reason).toBe(row!.reason);
      expect(end.note).toBe(row!.note);
    }
  });

  it('⚠️ an UNCENSUSED loose end renders as one — the page never invents a reason', () => {
    // The bilateral gate makes this state impossible on main; it is reachable
    // in a PR that opens a hole, and the surface must say "no recorded reason"
    // rather than quietly showing nothing, which would read as "no defect".
    const orphaned = buildFlowView(
      { ...probe, states: [...probe.states, 'Nowhere'], terminals: probe.terminals },
      sources,
    );
    const end = orphaned.looseEnds.find((e) => e.subject === 'Nowhere')!;
    expect(end.reason).toBeNull();
    expect(end.note).toBeNull();
  });

  it('a loose end is anchored to the STATE or TRANSITION it concerns', () => {
    for (const flow of catalog().flows) {
      for (const end of flow.looseEnds) {
        const onState = flow.states.some((s) => s.looseEnds.includes(end));
        const onTransition = flow.transitions.some((t) => t.looseEnds.includes(end));
        expect(onState || onTransition, `${looseEndKey(end)} is anchored nowhere`).toBe(true);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE TWO HONEST-RENDER AXES
// ─────────────────────────────────────────────────────────────────────────────

describe('PF-1 — the per-flow marker is looked up, never asserted', () => {
  it('capabilityForEntity is the exact inverse of the ONE authored backing map', () => {
    for (const [capability, backing] of Object.entries(capabilityBacking)) {
      if (backing === null) continue;
      // 1:1 today, so the inverse round-trips; a future many-to-one would keep
      // the first-declared answer, which is stable rather than accidental.
      expect(capabilityForEntity(backing)).toBe(capability as Capability);
    }
    expect(capabilityForEntity('noSuchEntity')).toBeNull();
  });

  it('a capability-backed flow reports exactly what dispatchesCommands says', () => {
    for (const flow of catalog().flows) {
      if (flow.capability === null) continue;
      expect(flow.dispatches, flow.entity).toBe(dispatchesCommands(flow.capability));
      expect(flow.feed, flow.entity).toBe(feedProvenance(flow.capability));
    }
  });

  it('⚠️ a flow NO capability reads still answers the verb question, from the same set', () => {
    // `quotation` is a wired CommandTarget with no capability naming it. A
    // capability-only lookup would have rendered it "unwired", which is false;
    // inventing a capability for it would be INVENTORY-REFERENT-01 on purpose.
    const quotation = catalog().flows.find((f) => f.entity === 'quotation')!;
    expect(quotation.capability).toBeNull();
    expect(quotation.feed).toBeNull();
    expect(quotation.dispatches).toBe(true);
    expect(WIRED_COMMAND_TARGETS).toContain('quotation');

    // …and an author-unwired machine says so.
    const contract = catalog().flows.find((f) => f.entity === 'contract')!;
    expect(contract.dispatches).toBe(false);
  });

  it('NO flow claims a live feed — the backend is greenfield and the page says so', () => {
    for (const flow of catalog().flows) {
      expect(flow.feed === null || flow.feed === 'FIXTURE', flow.entity).toBe(true);
    }
  });

  it('the wired count is a filter over the derived views', () => {
    const view = catalog();
    expect(view.wiredCount).toBe(view.flows.filter((f) => f.dispatches).length);
  });
});
