// ─────────────────────────────────────────────────────────────────────────────
// PF-1 · LAYOUT GATE.
//
// Layout is the part of a diagram that can be WRONG rather than merely ugly: an
// edge that lands on the wrong node, a state pushed off-canvas, two back-edges
// sharing a lane so one reads as the other. None of those is visible in a
// screenshot review — they look like a diagram. So the geometry is a pure
// function and this is what holds it.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { getKnownFlows } from '../../services/transitions';
import { buildCatalogView, buildFlowView } from '../../services/transitions/catalogView';
import type { FlowDefinition } from '../../services/transitions/schema';
import { layoutFlow, rankStates, verbOf, NODE_W, NODE_H } from './flowLayout';

const views = () => buildCatalogView(getKnownFlows()).flows;

describe('PF-1 — verbOf slices the schema’s own id', () => {
  it('drops the two fixed leading segments the id format guarantees', () => {
    expect(verbOf('t_po_confirm')).toBe('confirm');
    expect(verbOf('t_requirementresponse_promote')).toBe('promote');
    // A compound verb keeps its underscore rather than losing half its name.
    expect(verbOf('t_gr_partial_approve')).toBe('partial_approve');
    // Anything that is not the declared shape is returned whole, never truncated.
    expect(verbOf('odd')).toBe('odd');
  });

  it('every shipped transition id yields a NON-EMPTY verb', () => {
    for (const flow of getKnownFlows()) {
      for (const t of flow.transitions) {
        expect(verbOf(t.id), t.id).not.toBe('');
      }
    }
  });
});

describe('PF-1 — every declared state is placed, exactly once', () => {
  it('across the whole registry: one node per state, no extras, no drops', () => {
    for (const view of views()) {
      const layout = layoutFlow(view);
      expect(layout.nodes.map((n) => n.name), view.entity).toEqual(
        view.states.map((s) => s.name),
      );
      const positions = layout.nodes.map((n) => `${n.x}:${n.y}`);
      expect(new Set(positions).size, `${view.entity}: two states share a cell`).toBe(
        positions.length,
      );
    }
  });

  it('every node sits inside the canvas the layout reports', () => {
    for (const view of views()) {
      const layout = layoutFlow(view);
      for (const node of layout.nodes) {
        expect(node.x, `${view.entity} ${node.name}`).toBeGreaterThanOrEqual(0);
        expect(node.y, `${view.entity} ${node.name}`).toBeGreaterThanOrEqual(0);
        expect(node.x + NODE_W).toBeLessThanOrEqual(layout.width);
        expect(node.y + NODE_H).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it('every edge is laid out — none is silently dropped from the drawing', () => {
    for (const view of views()) {
      const layout = layoutFlow(view);
      expect(layout.edges.map((e) => e.edge.id), view.entity).toEqual(
        view.edges.map((e) => e.id),
      );
      for (const laid of layout.edges) {
        expect(laid.path, `${view.entity} ${laid.edge.id}`).not.toBe('');
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RANKING — including the case a layered diagram is tempted to hide
// ─────────────────────────────────────────────────────────────────────────────

const bare = {
  cascades: {},
  census: [],
  personaRoles: { buyer: [], supplier: [] },
  wiredTargets: [],
} as const;

const chain: FlowDefinition = {
  entity: 'probe',
  version: 1,
  states: ['New', 'Live', 'Done', 'Orphan'],
  initial: 'New',
  terminals: ['Done', 'Orphan'],
  transitions: [
    { id: 't_probe_create', from: [], to: 'New', trigger: 'creation', requiredRole: 'po:issue', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
    { id: 't_probe_start', from: ['New'], to: 'Live', trigger: 'user', requiredRole: 'po:confirm', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
    { id: 't_probe_finish', from: ['Live'], to: 'Done', trigger: 'user', requiredRole: 'po:close', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
    { id: 't_probe_reopen', from: ['Done'], to: 'Live', trigger: 'user', requiredRole: 'rfq:reopen', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
  ],
};
const chainView = buildFlowView(chain, bare);

describe('PF-1 — ranking', () => {
  it('BFS depth from the seed states', () => {
    const rank = rankStates(chainView);
    expect(rank.get('New')).toBe(0);
    expect(rank.get('Live')).toBe(1);
    expect(rank.get('Done')).toBe(2);
  });

  it('⚠️ an UNREACHABLE state gets its own column past the end — never dropped', () => {
    // The temptation is to omit it: it has no edges, so it makes the picture
    // messier for no visible gain. It is a declared state of the machine, and a
    // diagram that hides it is a diagram in direct contradiction with the
    // census printed three sections below it on the same page.
    expect(rankStates(chainView).get('Orphan')).toBe(3);
    expect(layoutFlow(chainView).nodes.map((n) => n.name)).toContain('Orphan');
  });

  it('a flow with no creation verb still ranks — seeded from its initial', () => {
    const noBirth = buildFlowView(
      { ...chain, states: ['New', 'Live', 'Done'], terminals: ['Done'], transitions: chain.transitions.slice(1) },
      bare,
    );
    expect(rankStates(noBirth).get('New')).toBe(0);
  });
});

describe('PF-1 — routing', () => {
  it('classifies each edge by what it actually does', () => {
    const byId = new Map(layoutFlow(chainView).edges.map((e) => [e.edge.id, e]));
    expect(byId.get('t_probe_create#birth')!.route).toBe('birth');
    expect(byId.get('t_probe_start#New')!.route).toBe('direct');
    // The reopen edge goes BACKWARD, which a layered diagram must draw rather
    // than straighten: the cycle is real.
    expect(byId.get('t_probe_reopen#Done')!.route).toBe('back');
  });

  it('⚠️ a SAME-RANK edge is a sibling, not a cycle', () => {
    // `Viewed → Acknowledged` on a purchase order is exactly this: forward in
    // meaning, level in BFS depth because both are one step from `Sent`. Drawn
    // in the back lane it would read as a loop back up the flow, which is the
    // opposite of what it does.
    const withShortcut = buildFlowView(
      {
        ...chain,
        states: ['New', 'Live', 'Done'],
        terminals: ['Done'],
        transitions: [
          ...chain.transitions.slice(0, 3),
          { id: 't_probe_skip', from: ['New'], to: 'Done', trigger: 'user', requiredRole: 'po:close', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
        ],
      },
      bare,
    );
    expect(rankStates(withShortcut).get('Done')).toBe(1);
    const laid = layoutFlow(withShortcut).edges.find(
      (e) => e.edge.transitionId === 't_probe_finish',
    )!;
    expect(laid.route).toBe('sibling');
  });

  it('⚠️ NO edge can ever span two ranks forward — the property, over the whole registry', () => {
    // Under BFS layering, if A→B exists and A is reachable then B is discovered
    // at rank(A)+1 at the latest. An "arc over the top" routing case would
    // therefore be code that can never run — a lie about what the diagram can
    // contain. This is what makes its absence correct rather than missing.
    for (const view of views()) {
      const rank = rankStates(view);
      for (const edge of view.edges) {
        if (edge.from === null) continue;
        const gap = (rank.get(edge.to) ?? 0) - (rank.get(edge.from) ?? 0);
        expect(gap, `${view.entity} ${edge.id}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('back edges get DISTINCT lanes — two cycles must not draw as one', () => {
    const twoCycles = buildFlowView(
      {
        ...chain,
        states: ['New', 'Live', 'Done'],
        terminals: [],
        transitions: [
          ...chain.transitions.slice(0, 3),
          chain.transitions[3],
          { id: 't_probe_revise', from: ['Done'], to: 'New', trigger: 'user', requiredRole: 'pr:revise', requiredFields: [], policyHooks: [], surfaceable: { surfaced: true }, version: 1 },
        ],
      },
      bare,
    );
    const backs = layoutFlow(twoCycles).edges.filter((e) => e.route === 'back');
    expect(backs).toHaveLength(2);
    expect(new Set(backs.map((b) => b.labelY)).size).toBe(2);
  });

  it('sibling edges in one column get distinct gutters', () => {
    const po = views().find((v) => v.entity === 'purchaseOrder')!;
    const siblings = layoutFlow(po).edges.filter((e) => e.route === 'sibling');
    expect(siblings.length).toBeGreaterThan(1);
    expect(new Set(siblings.map((s) => s.labelX)).size).toBe(siblings.length);
  });

  it('two creation verbs into ONE state fan apart instead of stacking', () => {
    // requirementResponse is exactly this shape: submit AND draft both birth.
    const rr = views().find((v) => v.entity === 'requirementResponse')!;
    const births = layoutFlow(rr).edges.filter((e) => e.route === 'birth');
    expect(births.length).toBeGreaterThan(1);
    expect(new Set(births.map((b) => b.labelY)).size).toBe(births.length);
  });

  it('a degenerate single-state machine still lays out (enforcement)', () => {
    const enforcement = views().find((v) => v.entity === 'enforcement')!;
    const layout = layoutFlow(enforcement);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.edges).toHaveLength(0);
    expect(layout.width).toBeGreaterThan(NODE_W);
    expect(layout.height).toBeGreaterThan(NODE_H);
  });
});
