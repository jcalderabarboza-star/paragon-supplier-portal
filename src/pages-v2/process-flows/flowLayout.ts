// ─────────────────────────────────────────────────────────────────────────────
// PF-1 · DIAGRAM LAYOUT — pure geometry over the derived flow view.
//
// Separated from the component ON PURPOSE. Layout is the one part of a diagram
// that can be WRONG rather than merely ugly (an edge that lands on the wrong
// node, a state placed off-canvas, two cycles sharing one lane so each reads as
// the other), and none of that is visible in a screenshot review — it looks
// like a diagram. A pure function of the view model is the only version of it a
// test can hold. The component does no arithmetic; it positions what this
// returns.
//
// ⚠️ IT ADDS NO INFORMATION. Every node here is a state the machine declares and
// every edge is one `edgesOf` produced. Layout may move a thing; it may never
// invent one, drop one, or relabel one.
//
// ── LAYERING IS BFS DEPTH, AND THAT CHOICE HAS A CONSEQUENCE WORTH STATING ──
// Rank is the SHORTEST path from a birth state, not the longest. The
// alternative (longest-path layering, what a Sugiyama renderer does) yields a
// strictly left-to-right spine with no same-rank edges — and turns every flow
// into a single row seven to nine columns long. On a purchase order that is a
// ~1.9k-pixel line for a machine that fits in a quarter of the screen when
// stacked. BFS keeps the diagram compact and pays for it with SAME-RANK edges,
// which get their own routing case below rather than being hidden.
//
// ── THE ROUTING CONVENTION, AND WHY IT IS FOUR CASES ────────────────────────
//   · BIRTH — a stub into the state a creation verb births into.
//   · DIRECT (one rank forward) — a plain curve. The common case.
//   · SIBLING (same rank) — a bracket through the gutter beside the column.
//     `Viewed → Acknowledged` is this: forward in meaning, level in depth. The
//     bottom lane would have drawn it as a cycle, which it is not.
//   · BACK (rank decreases) — its own lane below the rows. Reopen, revise and
//     resume edges are real cycles; a layered diagram that straightened them
//     would be drawing a different machine.
//
// ⚠️ THERE IS NO "SKIP" CASE, AND ITS ABSENCE IS A PROPERTY, NOT AN OVERSIGHT.
// Under BFS layering an edge can never span two ranks forward: if A→B exists
// and A is reachable, B is discovered at rank(A)+1 at the latest, so
// rank(B) ≤ rank(A)+1 always. An arc-over-the-top case would be code that can
// never run, which is a lie about what the diagram can contain. Pinned in
// `flowLayout.test.ts`.
// ─────────────────────────────────────────────────────────────────────────────

import type { FlowEdge, FlowView } from '../../services/transitions/catalogView';

export const NODE_W = 176;
export const NODE_H = 72;
const COL_GAP = 92;
const ROW_GAP = 30;
/** Room to the left of rank 0 for the creation stub (an entity is born here). */
const ORIGIN_X = 72;
const BIRTH_STUB = 56;
/** Vertical pitch of one back-edge lane below the rows. */
const LANE = 18;
/** Horizontal pitch of one sibling gutter, inside the column gap. */
const GUTTER = 14;
/** Room reserved to the right of a gutter for its verb label / reason chip. */
const GUTTER_LABEL = 72;
const EDGE_PAD = 12;

export type EdgeRoute = 'birth' | 'direct' | 'sibling' | 'back' | 'self';

export interface LaidOutNode {
  readonly name: string;
  readonly rank: number;
  readonly row: number;
  readonly x: number;
  readonly y: number;
}

export interface LaidOutEdge {
  readonly edge: FlowEdge;
  readonly route: EdgeRoute;
  /** SVG path data. Consumed verbatim by the component. */
  readonly path: string;
  /** Where the verb label sits (its own centre). */
  readonly labelX: number;
  readonly labelY: number;
}

export interface DiagramLayout {
  readonly nodes: readonly LaidOutNode[];
  readonly edges: readonly LaidOutEdge[];
  readonly width: number;
  readonly height: number;
  readonly rankCount: number;
  readonly maxRows: number;
}

/**
 * THE VERB SEGMENT of a transition id — `t_po_confirm` → `confirm`.
 *
 * Derived by dropping the two fixed leading segments the id format guarantees
 * (`t_<entity>_<verb>`, format-validated in `validate.ts`), so it is a slice of
 * the schema's own string and not a second name for the verb. A compound verb
 * keeps its underscore (`t_gr_partial_approve` → `partial_approve`).
 */
export function verbOf(transitionId: string): string {
  const parts = transitionId.split('_');
  return parts.length > 2 ? parts.slice(2).join('_') : transitionId;
}

/**
 * State → layer. BFS depth from the flow's seed states (`seededFrom`, which is
 * the birth set or `[initial]` per the analyzer's ruling 3).
 *
 * ⚠️ AN UNREACHABLE STATE GETS ITS OWN COLUMN PAST THE END, rather than being
 * dropped or folded into rank 0. It is a declared state of the machine — the
 * page must be able to show it — and placing it off the spine is the honest
 * picture of "nothing reaches this". Omitting it would put the diagram in
 * direct contradiction with the census three sections below it.
 */
export function rankStates(view: FlowView): ReadonlyMap<string, number> {
  const adjacency = new Map<string, string[]>();
  for (const edge of view.edges) {
    if (edge.from === null) continue;
    const bucket = adjacency.get(edge.from);
    if (bucket) bucket.push(edge.to);
    else adjacency.set(edge.from, [edge.to]);
  }

  const rank = new Map<string, number>();
  const queue: string[] = [];
  for (const seed of view.seededFrom) {
    if (!rank.has(seed)) {
      rank.set(seed, 0);
      queue.push(seed);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const state = queue[head];
    const next = (rank.get(state) ?? 0) + 1;
    for (const target of adjacency.get(state) ?? []) {
      if (!rank.has(target)) {
        rank.set(target, next);
        queue.push(target);
      }
    }
  }

  const maxRank = rank.size > 0 ? Math.max(...rank.values()) : 0;
  for (const state of view.states) {
    if (!rank.has(state.name)) rank.set(state.name, maxRank + 1);
  }
  return rank;
}

/** An orthogonal polyline with softened corners. */
function orthogonal(points: readonly (readonly [number, number])[], radius = 9): string {
  const round = (n: number): string => (Math.round(n * 10) / 10).toString();
  let d = `M ${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const inLen = Math.hypot(cx - px, cy - py) || 1;
    const outLen = Math.hypot(nx - cx, ny - cy) || 1;
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const ax = cx + ((px - cx) / inLen) * r;
    const ay = cy + ((py - cy) / inLen) * r;
    const bx = cx + ((nx - cx) / outLen) * r;
    const by = cy + ((ny - cy) / outLen) * r;
    d += ` L ${round(ax)} ${round(ay)} Q ${round(cx)} ${round(cy)} ${round(bx)} ${round(by)}`;
  }
  const [lx, ly] = points[points.length - 1];
  return `${d} L ${round(lx)} ${round(ly)}`;
}

interface Classified {
  readonly edge: FlowEdge;
  readonly route: EdgeRoute;
  /** Duplicate-pair index — two edges between the same pair must not overlap. */
  readonly twin: number;
  /** How many edges share this pair, so the fan can be CENTRED on the true line. */
  readonly twins: number;
}

/** Symmetric offset for the n-th of `total` edges sharing one pair of states. */
const fanOffset = (twin: number, total: number, pitch: number): number =>
  total <= 1 ? 0 : (twin - (total - 1) / 2) * pitch;

/** Lay one flow out. Pure; the component performs no arithmetic of its own. */
export function layoutFlow(view: FlowView): DiagramLayout {
  const rank = rankStates(view);
  const rowOf = new Map<string, number>();
  const perRank = new Map<number, number>();
  for (const state of view.states) {
    const r = rank.get(state.name) ?? 0;
    const row = perRank.get(r) ?? 0;
    rowOf.set(state.name, row);
    perRank.set(r, row + 1);
  }

  const rankCount = perRank.size > 0 ? Math.max(...perRank.keys()) + 1 : 1;
  const maxRows = perRank.size > 0 ? Math.max(...perRank.values()) : 1;

  const nodes: LaidOutNode[] = view.states.map((state) => {
    const r = rank.get(state.name) ?? 0;
    const row = rowOf.get(state.name) ?? 0;
    return {
      name: state.name,
      rank: r,
      row,
      x: ORIGIN_X + r * (NODE_W + COL_GAP),
      y: EDGE_PAD + row * (NODE_H + ROW_GAP),
    };
  });
  const nodeAt = new Map(nodes.map((n) => [n.name, n]));

  // Classify first: the back-edge count fixes the canvas height, and a lane
  // allocated before the count is known is a lane that can fall off the bottom.
  const pairKey = (edge: FlowEdge): string => `${edge.from ?? '·'}→${edge.to}`;
  const pairTotal = new Map<string, number>();
  for (const edge of view.edges) {
    pairTotal.set(pairKey(edge), (pairTotal.get(pairKey(edge)) ?? 0) + 1);
  }
  const pairSeen = new Map<string, number>();
  const classified: Classified[] = view.edges.map((edge) => {
    const key = pairKey(edge);
    const twin = pairSeen.get(key) ?? 0;
    pairSeen.set(key, twin + 1);
    const base = { edge, twin, twins: pairTotal.get(key) ?? 1 };
    if (edge.from === null) return { ...base, route: 'birth' };
    if (edge.from === edge.to) return { ...base, route: 'self' };
    const from = rank.get(edge.from) ?? 0;
    const to = rank.get(edge.to) ?? 0;
    if (to === from) return { ...base, route: 'sibling' };
    if (to < from) return { ...base, route: 'back' };
    return { ...base, route: 'direct' };
  });

  const backCount = classified.filter((c) => c.route === 'back').length;
  const rowsBottom = EDGE_PAD + maxRows * (NODE_H + ROW_GAP) - ROW_GAP;
  const backBase = rowsBottom + EDGE_PAD + LANE;
  const height = backCount > 0 ? backBase + backCount * LANE : rowsBottom + EDGE_PAD;

  // The canvas must be as wide as the widest thing DRAWN, not as wide as the
  // last column. A sibling bracket in the final rank lives in the gutter to the
  // right of it, and a canvas measured from the nodes alone cuts it off.
  let rightMost = ORIGIN_X + rankCount * (NODE_W + COL_GAP) - COL_GAP;
  let backLane = 0;
  const gutterLane = new Map<number, number>();
  const edges: LaidOutEdge[] = classified.map(({ edge, route, twin, twins }) => {
    const target = nodeAt.get(edge.to);
    const source = edge.from === null ? undefined : nodeAt.get(edge.from);
    // Validation guarantees every edge names declared states, so a missing node
    // is impossible; the fallback keeps the type honest rather than throwing.
    if (!target || (edge.from !== null && !source)) {
      return { edge, route, path: '', labelX: 0, labelY: 0 };
    }
    const midY = (n: LaidOutNode): number => n.y + NODE_H / 2;

    if (route === 'birth') {
      const x1 = target.x - BIRTH_STUB;
      // Two creation verbs can birth into ONE state (requirementResponse both
      // submits and drafts into `Draft`). Fanning them apart is the only way
      // both stay readable; stacking would draw one verb over the other.
      const y = midY(target) + fanOffset(twin, twins, 18);
      return {
        edge,
        route,
        path: `M ${x1} ${y} L ${target.x} ${y}`,
        labelX: x1 + BIRTH_STUB / 2,
        labelY: y - 13,
      };
    }

    const from = source as LaidOutNode;
    if (route === 'self') {
      const x = from.x + NODE_W;
      const top = from.y + 16;
      const bottom = from.y + NODE_H - 16;
      rightMost = Math.max(rightMost, x + 96);
      return {
        edge,
        route,
        path: `M ${x} ${top} C ${x + 46} ${top - 14}, ${x + 46} ${bottom + 14}, ${x} ${bottom}`,
        labelX: x + 36,
        labelY: midY(from),
      };
    }
    if (route === 'direct') {
      const x1 = from.x + NODE_W;
      const y1 = midY(from);
      const x2 = target.x;
      const y2 = midY(target);
      const bow = fanOffset(twin, twins, 18);
      const dx = COL_GAP * 0.55;
      const c1y = y1 + bow;
      const c2y = y2 + bow;
      return {
        edge,
        route,
        path: `M ${x1} ${y1} C ${x1 + dx} ${c1y}, ${x2 - dx} ${c2y}, ${x2} ${y2}`,
        // The cubic's midpoint, exactly: (P0 + 3·P1 + 3·P2 + P3) / 8.
        labelX: (x1 + 3 * (x1 + dx) + 3 * (x2 - dx) + x2) / 8,
        labelY: (y1 + 3 * c1y + 3 * c2y + y2) / 8,
      };
    }
    if (route === 'sibling') {
      // A bracket out of the source's right edge, down (or up) the gutter that
      // sits inside the column gap, and back into the target's right edge. It
      // never crosses a node, and it never reads as a cycle.
      const lane = gutterLane.get(from.rank) ?? 0;
      gutterLane.set(from.rank, lane + 1);
      const x = from.x + NODE_W;
      const gutterX = x + 18 + lane * GUTTER;
      rightMost = Math.max(rightMost, gutterX + GUTTER_LABEL);
      const y1 = midY(from);
      const y2 = midY(target);
      return {
        edge,
        route,
        path: orthogonal(
          [
            [x, y1],
            [gutterX, y1],
            [gutterX, y2],
            [x, y2],
          ],
          7,
        ),
        labelX: gutterX + 4,
        // NOT the midpoint. A direct edge between the two ROWS this bracket
        // spans puts ITS label at the midpoint too, a couple of dozen pixels
        // away, and the two render on top of each other — `deliver` and `close`
        // overlapped into "deli close" on the purchase order before this.
        // Sitting a third of the way down separates them without moving the
        // label off its own line.
        labelY: y1 + (y2 - y1) * 0.32,
      };
    }
    // BACK — a real cycle, in its own lane below the rows. When the two states
    // share a column the drop and the climb would be the same line, so the exit
    // and entry points step apart along the node edges.
    const sameColumn = Math.abs(from.x - target.x) < 1;
    const sx = from.x + NODE_W / 2 + (sameColumn ? 26 : 0);
    const tx = target.x + NODE_W / 2 - (sameColumn ? 26 : 0);
    const laneY = backBase + backLane * LANE;
    backLane += 1;
    return {
      edge,
      route,
      path: orthogonal([
        [sx, from.y + NODE_H],
        [sx, laneY],
        [tx, laneY],
        [tx, target.y + NODE_H],
      ]),
      labelX: (sx + tx) / 2,
      labelY: laneY,
    };
  });

  return { nodes, edges, width: rightMost + EDGE_PAD, height, rankCount, maxRows };
}
