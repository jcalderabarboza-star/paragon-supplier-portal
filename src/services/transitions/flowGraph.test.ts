// ─────────────────────────────────────────────────────────────────────────────
// PF-0 · THE LOOSE-END GATE.
//
// ⚠️ THIS IS WHERE THE OPERATOR'S CRITERION BITES, and it lives HERE and not in
// `flowRegistry.register()` on purpose. Registration throws at import time and
// the barrel is imported by `main.tsx`, so a graph check there would BRICK THE
// APP THE DAY IT LANDS — every one of the eighteen holes below becomes a white
// screen. The floor's failure mode is the right one: **RED PR, RUNNING APP.**
//
// Two halves, and the second is the load-bearing one (see `looseEndCensus.ts`).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  analyzeAllFlows,
  analyzeFlow,
  authoredCascadeTargets,
  buildFlowGraph,
  looseEndKey,
  type LooseEnd,
} from './flowGraph';
import { getKnownFlows } from './index';
import { LOOSE_END_CENSUS } from './looseEndCensus';
import type { FlowDefinition } from './schema';
import { validateFlow } from './validate';

const derived = (): readonly LooseEnd[] => analyzeAllFlows(getKnownFlows());
const censusKeys = (): Set<string> => new Set(LOOSE_END_CENSUS.map(looseEndKey));

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE BILATERAL GATE
// ─────────────────────────────────────────────────────────────────────────────

describe('PF-0 — the loose-end census is bilateral', () => {
  it('⚠️ every DERIVED loose end is censused — a new hole cannot ship silently', () => {
    const known = censusKeys();
    const uncensused = derived()
      .filter((end) => !known.has(looseEndKey(end)))
      .map((end) => `${looseEndKey(end)}  ::  ${end.detail}`);

    expect(
      uncensused,
      'NEW LOOSE ENDS with no census entry. Each one is a state nothing can enter, a state nothing ' +
        'can leave, a verb that can never fire, a machine that cannot create an instance, or a ' +
        'cascade nothing fires. Fix it, or add a row to `looseEndCensus.ts` saying which of the four ' +
        'reasons it is and why. Do not delete the check.',
    ).toEqual([]);
  });

  it('⚠️ every CENSUS entry is still a loose end — a fixed edge forces its exemption out', () => {
    const live = new Set(derived().map(looseEndKey));
    const stale = LOOSE_END_CENSUS.map(looseEndKey).filter((key) => !live.has(key));

    expect(
      stale,
      'CENSUS ROWS THAT ARE NO LONGER TRUE. The tree has been repaired and the exemption survived it ' +
        '— which is a document asserting a defect we no longer have, the one direction nobody audits ' +
        'because it flatters us. DELETE these rows; that is what makes the census able to shrink.',
    ).toEqual([]);
  });

  it('the census has no duplicate keys, and prose is never part of the key', () => {
    const keys = LOOSE_END_CENSUS.map(looseEndKey);
    expect(new Set(keys).size, `duplicate census keys: ${keys.join(', ')}`).toBe(keys.length);
    // `note` is deliberately absent from the key — rewording must never retire
    // an exemption, nor demand a new one.
    expect(looseEndKey({ entity: 'e', kind: 'exit-less-state', subject: 's' })).toBe(
      'e#exit-less-state#s',
    );
  });

  it('reports the census population, so the number is read rather than assumed', () => {
    const byKind = new Map<string, number>();
    for (const end of derived()) byKind.set(end.kind, (byKind.get(end.kind) ?? 0) + 1);
    // The floor asserts the shape, not the size: an exact count here would go red
    // on every legitimate repair AND on every legitimate new flow, which trains
    // people to edit the number. The population is reported in the PR and in
    // `docs/findings.md`; what is pinned is that every member is accounted for.
    expect(derived().length).toBe(LOOSE_END_CENSUS.length);
    expect([...byKind.keys()].sort()).toEqual([
      'dead-transition',
      'exit-less-state',
      'initial-integrity',
      'unauthored-cascade',
      'unreachable-state',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE ANALYZER ITSELF — each check fires on a synthetic defect, and stays
//    quiet on a clean flow. Without these, a check that silently stopped
//    detecting anything would make the gate above go green by being broken.
// ─────────────────────────────────────────────────────────────────────────────

const clean: FlowDefinition = {
  entity: 'probe',
  version: 1,
  states: ['New', 'Live', 'Done'],
  initial: 'New',
  terminals: ['Done'],
  transitions: [
    { id: 't_probe_create', from: [], to: 'New', trigger: 'creation', requiredRole: 'probe:create', requiredFields: [], policyHooks: [], version: 1 },
    { id: 't_probe_start', from: ['New'], to: 'Live', trigger: 'user', requiredRole: 'probe:start', requiredFields: [], policyHooks: [], version: 1 },
    { id: 't_probe_finish', from: ['Live'], to: 'Done', trigger: 'user', requiredRole: 'probe:finish', requiredFields: [], policyHooks: [], version: 1 },
  ],
};

const withStates = (flow: FlowDefinition, patch: Partial<FlowDefinition>): FlowDefinition => ({
  ...flow,
  ...patch,
});

describe('the analyzer detects each defect class', () => {
  it('a clean flow produces NOTHING — the check can be silent for the right reason', () => {
    expect(analyzeFlow(clean, new Set())).toEqual([]);
  });

  it('unreachable state — declared, and nothing enters it', () => {
    const flow = withStates(clean, { states: [...clean.states, 'Orphan'] });
    const ends = analyzeFlow(flow, new Set());
    // Orphan is BOTH unreachable and exit-less: two independent facts about one
    // state, and the census keys them apart because fixing one leaves the other.
    expect(ends.map(looseEndKey)).toEqual([
      'probe#exit-less-state#Orphan',
      'probe#unreachable-state#Orphan',
    ]);
  });

  it('exit-less state — no way out, and not declared terminal', () => {
    const ends = analyzeFlow(withStates(clean, { terminals: [] }), new Set());
    expect(ends.map(looseEndKey)).toEqual(['probe#exit-less-state#Done']);
  });

  it('dead transition — the whole `from` set is unreachable', () => {
    const flow = withStates(clean, {
      states: [...clean.states, 'Orphan'],
      transitions: [
        ...clean.transitions,
        { id: 't_probe_revive', from: ['Orphan'], to: 'Live', trigger: 'user', requiredRole: 'probe:revive', requiredFields: [], policyHooks: [], version: 1 },
      ],
    });
    expect(analyzeFlow(flow, new Set()).map(looseEndKey)).toContain('probe#dead-transition#t_probe_revive');
  });

  it('a PARTIALLY dead `from` set is NOT flagged — one live source is enough to fire', () => {
    const flow = withStates(clean, {
      states: [...clean.states, 'Orphan'],
      transitions: [
        ...clean.transitions,
        { id: 't_probe_revive', from: ['Orphan', 'Live'], to: 'Done', trigger: 'user', requiredRole: 'probe:revive', requiredFields: [], policyHooks: [], version: 1 },
      ],
    });
    expect(analyzeFlow(flow, new Set()).map(looseEndKey)).not.toContain(
      'probe#dead-transition#t_probe_revive',
    );
  });

  it('initial integrity — no creation verb at all', () => {
    const flow = withStates(clean, { transitions: clean.transitions.slice(1) });
    expect(analyzeFlow(flow, new Set()).map(looseEndKey)).toContain('probe#initial-integrity#New');
  });

  it('initial integrity — a creation verb that births somewhere else (the RFQ shape)', () => {
    const flow = withStates(clean, {
      initial: 'Live',
      transitions: [
        { ...clean.transitions[0], to: 'New' },
        ...clean.transitions.slice(1),
      ],
    });
    // `Live` IS reachable here (New → Live), so this must NOT fire: the check is
    // "reachable from a birth", not "is itself a birth state".
    expect(analyzeFlow(flow, new Set()).map(looseEndKey)).not.toContain(
      'probe#initial-integrity#Live',
    );
    const broken = withStates(clean, { initial: 'Done', transitions: [clean.transitions[0], clean.transitions[1]] });
    expect(analyzeFlow(broken, new Set()).map(looseEndKey)).toContain('probe#initial-integrity#Done');
  });

  it('cascade integrity — a cascade edge no source fires', () => {
    const flow = withStates(clean, {
      transitions: [
        ...clean.transitions,
        { id: 't_probe_flag', from: ['Live'], to: 'Done', trigger: 'cascade', requiredRole: 'probe:flag', requiredFields: [], policyHooks: [], version: 1 },
      ],
    });
    expect(analyzeFlow(flow, new Set()).map(looseEndKey)).toContain('probe#unauthored-cascade#t_probe_flag');
    // …and it goes quiet when a source authors it.
    expect(analyzeFlow(flow, new Set(['t_probe_flag'])).map(looseEndKey)).not.toContain(
      'probe#unauthored-cascade#t_probe_flag',
    );
  });

  it('the authored cascade targets are DERIVED from cascades.ts, not listed', () => {
    // The shipped registry authors four targets across three sources; what is
    // pinned is the derivation, so a fifth link needs no edit here.
    const targets = authoredCascadeTargets();
    expect(targets.has('t_asn_discrepancy')).toBe(true);
    expect(targets.has('t_quotation_award')).toBe(true);
    expect(targets.has('t_pr_source')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE THREE MODELLING RULINGS — each one changes an answer, so each is pinned
// ─────────────────────────────────────────────────────────────────────────────

describe('the modelling rulings the graph is built on', () => {
  it('a statePreserving verb is NEITHER an entry nor an exit', () => {
    const flow = withStates(clean, {
      terminals: ['Done'],
      transitions: [
        ...clean.transitions,
        { id: 't_probe_pin', from: ['Done'], to: 'Done', trigger: 'user', statePreserving: true, requiredRole: 'probe:pin', requiredFields: [], policyHooks: [], version: 1 },
      ],
    });
    // If the recording verb counted as an exit, `Done` could not be declared
    // terminal — and `validateFlow` would refuse the flow.
    expect(validateFlow(flow).ok).toBe(true);
    expect(buildFlowGraph(flow).exits.get('Done') ?? []).toEqual([]);
    expect(analyzeFlow(flow, new Set())).toEqual([]);
  });

  it('a statePreserving verb can still be DEAD — recording is not exemption', () => {
    const flow = withStates(clean, {
      states: [...clean.states, 'Orphan'],
      transitions: [
        ...clean.transitions,
        { id: 't_probe_pin', from: ['Orphan'], to: 'Orphan', trigger: 'user', statePreserving: true, requiredRole: 'probe:pin', requiredFields: [], policyHooks: [], version: 1 },
      ],
    });
    expect(analyzeFlow(flow, new Set()).map(looseEndKey)).toContain('probe#dead-transition#t_probe_pin');
  });

  it('⚠️ settlesTo IS an edge — without it the settled state is unreachable', () => {
    const boundary: FlowDefinition = {
      entity: 'boundary',
      version: 1,
      states: ['Ready', 'Posting', 'Posted'],
      initial: 'Ready',
      terminals: ['Posted'],
      transitions: [
        { id: 't_boundary_create', from: [], to: 'Ready', trigger: 'creation', requiredRole: 'boundary:create', requiredFields: [], policyHooks: [], version: 1 },
        { id: 't_boundary_post', from: ['Ready'], to: 'Posting', trigger: 'system', requiredRole: 'boundary:post', requiredFields: [], policyHooks: [], sapBoundary: true, settlesTo: 'Posted', version: 1 },
      ],
    };
    expect(analyzeFlow(boundary, new Set())).toEqual([]);

    // The same machine with the settlement left in a comment — which is what the
    // shipped GR and invoice flows were until D-2. BOTH readings below are
    // correct about the declaration, and wrong about the system.
    const undeclared = withStates(boundary, {
      transitions: [
        boundary.transitions[0],
        { ...boundary.transitions[1], sapBoundary: false, settlesTo: undefined },
      ],
    });
    expect(analyzeFlow(undeclared, new Set()).map(looseEndKey)).toEqual([
      'boundary#exit-less-state#Posting',
      'boundary#unreachable-state#Posted',
    ]);
  });

  it('a flow with no creation verb seeds from `initial` — one finding, not a flood', () => {
    const flow = withStates(clean, { transitions: clean.transitions.slice(1) });
    const ends = analyzeFlow(flow, new Set());
    // The real defect, reported once. Every state stays analysable, so the
    // absence of a creation verb does not manufacture three unreachable states
    // and two dead transitions that all restate it.
    expect(ends.map(looseEndKey)).toEqual(['probe#initial-integrity#New']);
    expect(buildFlowGraph(flow).seededFrom).toEqual(['New']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. D-2 — THE TWO SCHEMA ADDITIONS ARE VALIDATED DATA, NOT COMMENTS
// ─────────────────────────────────────────────────────────────────────────────

describe('D-2 — terminals', () => {
  it('a declared terminal that is left by an edge is REFUSED at registration', () => {
    const result = validateFlow(withStates(clean, { terminals: ['Live'] }));
    expect(result.ok).toBe(false);
    expect(result.errors.join()).toMatch(/'Live' is declared terminal but is left by t_probe_finish/);
  });

  it('a terminal that is not a declared state is refused', () => {
    expect(validateFlow(withStates(clean, { terminals: ['Nowhere'] })).ok).toBe(false);
  });

  it('an empty terminals array is LEGAL — a machine may honestly declare no ending', () => {
    // The ASN flow is exactly this today, and being able to read that is the
    // reason the field is required rather than optional.
    const noEnding = withStates(clean, {
      terminals: [],
      transitions: [
        ...clean.transitions,
        { id: 't_probe_reopen', from: ['Done'], to: 'Live', trigger: 'user', requiredRole: 'probe:reopen', requiredFields: [], policyHooks: [], version: 1 },
      ],
    });
    expect(validateFlow(noEnding).ok).toBe(true);
  });

  it('every shipped flow declares terminals ⊆ states', () => {
    for (const flow of getKnownFlows()) {
      const states = new Set(flow.states);
      for (const terminal of flow.terminals) {
        expect(states.has(terminal), `${flow.entity}: terminal '${terminal}' is not a state`).toBe(true);
      }
    }
  });
});

describe('D-2 — settlesTo', () => {
  const boundaryFlow = (patch: Partial<FlowDefinition['transitions'][number]>): FlowDefinition =>
    withStates(clean, {
      transitions: [
        clean.transitions[0],
        { ...clean.transitions[1], sapBoundary: true, settlesTo: 'Done', ...patch },
        clean.transitions[2],
      ],
    });

  it('is REQUIRED when sapBoundary is set', () => {
    const result = validateFlow(boundaryFlow({ settlesTo: undefined }));
    expect(result.errors.join()).toMatch(/must declare 'settlesTo'/);
  });

  it('is FORBIDDEN when sapBoundary is not set — it would describe nothing', () => {
    const result = validateFlow(boundaryFlow({ sapBoundary: false }));
    expect(result.errors.join()).toMatch(/only meaningful on a sapBoundary transition/);
  });

  it('must be a declared state, and must DIFFER from `to`', () => {
    expect(validateFlow(boundaryFlow({ settlesTo: 'Nowhere' })).errors.join()).toMatch(/is not declared/);
    // Equal values mean the field was added to satisfy the check: a settlement
    // that lands where the dispatch already put the entity is not a settlement,
    // and the interim/settled split IS Option B.
    expect(validateFlow(boundaryFlow({ settlesTo: 'Live' })).errors.join()).toMatch(/must differ from 'to'/);
  });

  it('⚠️ the two shipped boundary verbs declare what the ADAPTER actually writes', () => {
    // The adapter's `settleFinalize` still hardcodes these strings — the
    // declaration is a contract a graph can check, NOT a rule anything executes.
    // Pinned by reading the adapter source, so the two cannot drift apart while
    // both remain true separately. When the adapter is taught to read
    // `settlesTo`, this pin is what tells whoever does it that it was already
    // agreed. Precedent: `ledgerTruth.test.ts` reads source to check a claim.
    const adapter = readFileSync(
      join(process.cwd(), 'src', 'services', 'data', 'mock', 'MockCommandService.ts'),
      'utf8',
    );
    const boundaries = getKnownFlows()
      .flatMap((flow) => flow.transitions)
      .filter((t) => t.sapBoundary);

    expect(boundaries.map((t) => t.id).sort()).toEqual(['t_gr_post', 't_invoice_release_payment']);
    for (const t of boundaries) {
      expect(
        adapter.includes(`'${t.settlesTo}'`),
        `${t.id} declares settlesTo '${t.settlesTo}' and the adapter's finalize never writes it`,
      ).toBe(true);
    }
  });
});
