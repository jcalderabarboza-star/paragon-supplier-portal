// ─────────────────────────────────────────────────────────────────────────────
// PF-1 · THE FLOW-CATALOG VIEW MODEL — everything the Process Flows page draws.
//
// ⚠️ **THERE IS NO SECOND COPY OF THE MACHINE, AND THAT IS THE WHOLE POINT.**
// Every state, transition, branch, role, count and flag this module returns is
// READ OFF `getKnownFlows()` (passed in — see below) and the four sibling
// authorities it already ships with:
//
//   · `flowGraph`        — reachability, exits, birth states, loose ends (PF-0)
//   · `looseEndCensus`   — the REASON a loose end is exempt (PF-0)
//   · `cascades`         — cross-entity fan-out links
//   · `roles`            — PERSONA_ROLES, the persona × transition-role mapping
//   · `liveness`         — the two honest-render axes, per capability
//
// Because the page renders THIS and nothing else, the module cannot show a
// state the machine does not have: there is nowhere else a state could come
// from. A hand-authored diagram would be a second copy that drifts silently,
// and the drift would be invisible — a picture is never type-checked.
//
// ⚠️ **NO PROSE IS AUTHORED HERE.** Purpose annotations ride PF-2, keyed by
// transition id and bilaterally pinned. What this module derives is SHAPE
// (kind, fork, fact-vs-move, boundary, cascade) — never meaning.
//
// ── THE FLOWS ARE AN ARGUMENT, LIKE THE ANALYZER'S ─────────────────────────
// `flowGraph` takes `getKnownFlows()` as a parameter so it stays a pure
// function of its input and a leaf in the import graph. This module keeps that
// discipline for the same reason: the population is ALWAYS the registry's
// (`CENSUS-MUST-DERIVE-01`), and a nineteenth flow registered tomorrow is drawn
// without anybody editing here.
// ─────────────────────────────────────────────────────────────────────────────

import type { PersonaType } from '../../context/CurrentIdentityContext';
import {
  capabilityForEntity,
  dispatchesCommands,
  feedProvenance,
  type Capability,
  type FeedProvenance,
} from '../liveness';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';
import { CASCADES, type CascadeLink } from './cascades';
import {
  analyzeFlow,
  authoredCascadeTargets,
  buildFlowGraph,
  looseEndKey,
  type LooseEnd,
} from './flowGraph';
import { LOOSE_END_CENSUS, type CensusEntry, type LooseEndReason } from './looseEndCensus';
import { PERSONA_ROLES } from './roles';
import type { FlowDefinition, TransitionDef } from './schema';

/**
 * WHAT DRIVES A STEP — derived from `trigger`, never authored.
 *
 * ⚠️ **`creation` IS ITS OWN KIND, DELIBERATELY.** The dispatch named two
 * (`user` → operator, `system`/`cascade` → system-driven) and the trigger union
 * has FOUR members. A creation verb is neither: `t_po_issue` is a buyer act and
 * `t_invoicematch_open` would be a rollup, so folding creation into either
 * bucket would assert something the schema does not say. It gets its own token
 * and the reader decides — see PF1-CREATION-KIND-01 in docs/findings.md.
 */
export type StepKind = 'operator-action' | 'system-driven' | 'creation';

/** A derived loose end, annotated with its census row (PF-0's exemption list). */
export interface AnnotatedLooseEnd extends LooseEnd {
  /**
   * The recorded reason this hole ships. **`null` means UNCENSUSED** — a
   * derived defect with no exemption, which is a RED floor (`flowGraph.test.ts`)
   * and is rendered as such rather than quietly dropped. The page never invents
   * a reason for a row the census does not have.
   */
  readonly reason: LooseEndReason | null;
  /** The census note, verbatim. Source text — never translated, never edited. */
  readonly note: string | null;
}

/** One drawable edge. A multi-`from` transition yields ONE EDGE PER SOURCE. */
export interface FlowEdge {
  /** Unique within the flow: transition id + its source (+ settlement suffix). */
  readonly id: string;
  readonly transitionId: string;
  /** The source state, or `null` for a creation edge (an entity is born here). */
  readonly from: string | null;
  readonly to: string;
  readonly kind: StepKind;
  /** True for the `settlesTo` advance a `sapBoundary` verb contracts (D-2). */
  readonly settlement: boolean;
  /** True when the transition's own trigger is `cascade` (fired from elsewhere). */
  readonly cascade: boolean;
}

export interface TransitionView {
  readonly def: TransitionDef;
  readonly kind: StepKind;
  /** Personas whose role set contains `requiredRole`. May be empty (unmapped). */
  readonly personas: readonly PersonaType[];
  /** Records a fact and leaves the entity where it is (`statePreserving`). */
  readonly recordsFact: boolean;
  /** Crosses the SAP boundary — settles asynchronously (Option B). */
  readonly sapBoundary: boolean;
  /** Where settlement lands the entity; non-null exactly when `sapBoundary`. */
  readonly settlesTo: string | null;
  /** Cross-entity cascades this transition FIRES, as a source (`cascades.ts`). */
  readonly fansOutTo: readonly CascadeLink[];
  /** Source transition ids that fire THIS one. Empty ⇒ nothing fires it. */
  readonly firedBy: readonly string[];
  readonly looseEnds: readonly AnnotatedLooseEnd[];
}

export interface StateView {
  readonly name: string;
  readonly isInitial: boolean;
  /** A creation verb births instances here. */
  readonly isBirth: boolean;
  /** The flow DECLARES this an ending (`terminals`, D-2). */
  readonly isTerminal: boolean;
  readonly reachable: boolean;
  /** Transition ids that land an entity here (settlement included). */
  readonly inbound: readonly string[];
  /** Transition ids that MOVE an entity out of here (settlement included). */
  readonly outbound: readonly string[];
  /** Distinct target states leaving here. */
  readonly branchTargets: readonly string[];
  /** A DECISION FORK: two or more different verbs leave this state. */
  readonly isFork: boolean;
  /** `statePreserving` verbs legal here — facts recorded, not moves. */
  readonly facts: readonly string[];
  readonly looseEnds: readonly AnnotatedLooseEnd[];
}

export interface FlowView {
  readonly entity: string;
  readonly version: number;
  readonly initial: string;
  readonly terminals: readonly string[];
  /** What reachability was seeded from — births, or `[initial]` (PF-0 ruling 3). */
  readonly seededFrom: readonly string[];
  readonly states: readonly StateView[];
  readonly transitions: readonly TransitionView[];
  readonly edges: readonly FlowEdge[];
  readonly looseEnds: readonly AnnotatedLooseEnd[];
  /** Header counts. Derived — never a number anybody typed. */
  readonly stateCount: number;
  readonly transitionCount: number;
  readonly forkCount: number;
  /** The capability that READS this entity, or null when nothing does. */
  readonly capability: Capability | null;
  /**
   * VERB AXIS — acting on this machine really dispatches through a wired
   * CommandTarget and writes the DR-10 trail.
   *
   * ⚠️ For a capability-backed entity this is EXACTLY `dispatchesCommands(cap)`
   * and it is computed that way. For the eight flows no capability reads, the
   * same question still has an answer, and it is the SAME SET one layer down —
   * `dispatchesCommands` is `liveness()==='LIVE'` is `WIRED.has(backing)`. So
   * the fallback cannot disagree with the marker regime; it just reaches a
   * machine the capability list never named.
   */
  readonly dispatches: boolean;
  /** FEED AXIS — where the read surface's data comes from. Null ⇒ no reader. */
  readonly feed: FeedProvenance | null;
}

export interface CatalogView {
  readonly flows: readonly FlowView[];
  readonly flowCount: number;
  readonly stateCount: number;
  readonly transitionCount: number;
  readonly forkCount: number;
  readonly looseEndCount: number;
  /** Flows whose verbs really dispatch (the wired-target census, per flow). */
  readonly wiredCount: number;
}

/** The four collaborators, injectable so the derivation stays a pure function. */
export interface CatalogSources {
  readonly cascades: Record<string, readonly CascadeLink[]>;
  readonly census: readonly CensusEntry[];
  readonly personaRoles: Record<PersonaType, readonly string[]>;
  readonly wiredTargets: readonly string[];
}

const DEFAULT_SOURCES: CatalogSources = {
  cascades: CASCADES,
  census: LOOSE_END_CENSUS,
  personaRoles: PERSONA_ROLES,
  wiredTargets: WIRED_COMMAND_TARGETS,
};

/** `trigger` → what drives the step. The ONE place the mapping is stated. */
export function stepKind(t: TransitionDef): StepKind {
  if (t.trigger === 'creation') return 'creation';
  return t.trigger === 'user' ? 'operator-action' : 'system-driven';
}

/** The personas whose mapped role set permits a transition-role. */
function personasFor(
  role: string,
  personaRoles: Record<PersonaType, readonly string[]>,
): readonly PersonaType[] {
  return (Object.keys(personaRoles) as PersonaType[]).filter((p) =>
    personaRoles[p].includes(role),
  );
}

/**
 * The drawable edge set of one flow.
 *
 * Mirrors the analyzer's two rulings exactly, because a diagram that disagreed
 * with the gate would be a picture of a different machine:
 *   · a `statePreserving` verb is NOT an edge (it is a fact on a state), and
 *   · a `sapBoundary` verb's `settlesTo` IS an edge out of the interim state.
 */
export function edgesOf(flow: FlowDefinition): readonly FlowEdge[] {
  const edges: FlowEdge[] = [];
  for (const t of flow.transitions) {
    const kind = stepKind(t);
    const cascade = t.trigger === 'cascade';
    if (t.trigger === 'creation') {
      edges.push({
        id: `${t.id}#birth`,
        transitionId: t.id,
        from: null,
        to: t.to,
        kind,
        settlement: false,
        cascade,
      });
    } else if (!t.statePreserving) {
      for (const from of t.from) {
        edges.push({
          id: `${t.id}#${from}`,
          transitionId: t.id,
          from,
          to: t.to,
          kind,
          settlement: false,
          cascade,
        });
      }
    }
    if (t.sapBoundary && t.settlesTo) {
      edges.push({
        id: `${t.id}#settlement`,
        transitionId: t.id,
        from: t.to,
        to: t.settlesTo,
        kind: 'system-driven',
        settlement: true,
        cascade: false,
      });
    }
  }
  return edges;
}

/** Build the view model for ONE flow. Pure; reads only its arguments. */
export function buildFlowView(
  flow: FlowDefinition,
  sources: CatalogSources = DEFAULT_SOURCES,
): FlowView {
  const graph = buildFlowGraph(flow);
  const cascadeTargets = authoredCascadeTargets(sources.cascades);
  const censusByKey = new Map(sources.census.map((row) => [looseEndKey(row), row]));

  const annotate = (end: LooseEnd): AnnotatedLooseEnd => {
    const row = censusByKey.get(looseEndKey(end));
    return { ...end, reason: row?.reason ?? null, note: row?.note ?? null };
  };
  const looseEnds = analyzeFlow(flow, cascadeTargets).map(annotate);
  const endsFor = (subject: string): readonly AnnotatedLooseEnd[] =>
    looseEnds.filter((end) => end.subject === subject);

  const edges = edgesOf(flow);
  const terminals = new Set(flow.terminals);
  const births = new Set(graph.birthStates);

  // Which source transitions fire which target (the `cascades.ts` inverse).
  const firedBy = new Map<string, string[]>();
  for (const [source, links] of Object.entries(sources.cascades)) {
    for (const link of links) {
      const bucket = firedBy.get(link.targetTransitionId);
      if (bucket) bucket.push(source);
      else firedBy.set(link.targetTransitionId, [source]);
    }
  }

  const transitions: TransitionView[] = flow.transitions.map((def) => ({
    def,
    kind: stepKind(def),
    personas: personasFor(def.requiredRole, sources.personaRoles),
    recordsFact: def.statePreserving === true,
    sapBoundary: def.sapBoundary === true,
    settlesTo: def.settlesTo ?? null,
    fansOutTo: sources.cascades[def.id] ?? [],
    firedBy: firedBy.get(def.id) ?? [],
    looseEnds: endsFor(def.id),
  }));

  const states: StateView[] = flow.states.map((name) => {
    const outEdges = edges.filter((e) => e.from === name);
    const outbound = [...new Set(outEdges.map((e) => e.transitionId))];
    const inbound = [
      ...new Set(edges.filter((e) => e.to === name).map((e) => e.transitionId)),
    ];
    return {
      name,
      isInitial: name === flow.initial,
      isBirth: births.has(name),
      isTerminal: terminals.has(name),
      reachable: graph.reachable.has(name),
      inbound,
      outbound,
      branchTargets: [...new Set(outEdges.map((e) => e.to))],
      // A FORK is a CHOICE OF VERB, not a choice of destination: three verbs
      // that all land in `Confirmed` are still three different things a reader
      // may do from here, and two verbs to one state is the shape a "distinct
      // targets" test would silently miss.
      isFork: outbound.length > 1,
      facts: flow.transitions
        .filter((t) => t.statePreserving === true && t.from.includes(name))
        .map((t) => t.id),
      looseEnds: endsFor(name),
    };
  });

  const capability = capabilityForEntity(flow.entity);
  return {
    entity: flow.entity,
    version: flow.version,
    initial: flow.initial,
    terminals: flow.terminals,
    seededFrom: graph.seededFrom,
    states,
    transitions,
    edges,
    looseEnds,
    stateCount: flow.states.length,
    transitionCount: flow.transitions.length,
    forkCount: states.filter((s) => s.isFork).length,
    capability,
    dispatches:
      capability !== null
        ? dispatchesCommands(capability)
        : sources.wiredTargets.includes(flow.entity),
    feed: capability !== null ? feedProvenance(capability) : null,
  };
}

/**
 * The whole catalog, registration order preserved.
 *
 * ⚠️ **THE CALLER PASSES `getKnownFlows()`.** Same contract as
 * `analyzeAllFlows` and for the same reason: the population is the registry's,
 * never a list in this file.
 */
export function buildCatalogView(
  flows: readonly FlowDefinition[],
  sources: CatalogSources = DEFAULT_SOURCES,
): CatalogView {
  const views = flows.map((flow) => buildFlowView(flow, sources));
  const sum = (pick: (v: FlowView) => number): number =>
    views.reduce((total, v) => total + pick(v), 0);
  return {
    flows: views,
    flowCount: views.length,
    stateCount: sum((v) => v.stateCount),
    transitionCount: sum((v) => v.transitionCount),
    forkCount: sum((v) => v.forkCount),
    looseEndCount: sum((v) => v.looseEnds.length),
    wiredCount: views.filter((v) => v.dispatches).length,
  };
}
