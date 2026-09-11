// ─────────────────────────────────────────────────────────────────────────────
// `Quarantined` HAS AN EXIT — PROVEN BY TRAVERSAL, NOT BY DECLARATION.
//
// A flow file can declare an edge and a spec can assert the declaration back,
// and between them they prove nothing a typo would not also pass. What closes a
// trap is WALKING OUT OF IT: quarantine a line through the real dispatcher, read
// the state it actually reached, and fire the exit FROM that state.
//
// ── ⚠️ WHY THIS SPEC SUPPLIES ITS OWN `CommandTarget`, STATED BEFORE THE CODE ─
//   `goodsReceiptLine` has NO shipped target (`WIRED_COMMAND_TARGETS` omits it),
//   no store, and no creation verb — the line sub-flow is documented substrate
//   rolled up by the GR header, and `looseEndCensus` carries that as its own
//   `initial-integrity` row. So `MockCommandService.dispatch` refuses this
//   entity at `UNKNOWN_ENTITY`, before role and before legality.
//
//   ⚠️ **THAT IS A FACT ABOUT THE WIRING, NOT ABOUT THE MACHINE, AND THE TWO
//   MUST NOT BE ALLOWED TO HIDE EACH OTHER.** The verbs, their roles, their
//   required fields and their legality are what this batch changed, and they
//   are exercised here through `createDispatcher` — the SAME dispatcher the
//   shipped service builds, with the same gate stack in the same order — over
//   an in-spec store. What is NOT claimed: that a person can do this on a
//   screen today. Nothing here should be read as wiring the sub-flow.
//
//   The alternative was to assert `from`/`to` arrays back out of the flow
//   definition, which is a spec restating its subject. This walks instead.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { createDispatcher, type CommandTarget } from './dispatcher';
import { getKnownFlows, getFlow } from './registry';
import './index';
import type { QueryScope } from '../data/types';
import { NO_PERSON } from '../../context/noPerson';
import { atomsForSeat, customRoleStore } from './customRoles';
import { resolvePolicyHook } from './policies';

const LINE = 'grl-001';

/** A minimal store for ONE line, so the walk has somewhere to record itself. */
function lineTarget(state: { current: string }): CommandTarget {
  return {
    readState: (id: string) => (id === LINE ? state.current : null),
    readScopeOwner: () => null,
    readEntity: (id: string) => (id === LINE ? { id, state: state.current } : null),
    applyTransition: (_id: string, toState: string) => {
      state.current = toState;
    },
  } as unknown as CommandTarget;
}

/**
 * ⚠️ **ONLY `target` IS SUPPLIED BY THIS SPEC. EVERY GATE IS THE SHIPPED ONE.**
 * `resolveRoles` is `atomsForSeat` — the same function `MockCommandService`
 * passes, and the one `businessRoles.test.ts` pins as the sole seat-resolution
 * site — and `resolvePolicyHook` is the real registry. Stubbing either would
 * make the role control below a test of the stub rather than of the gate.
 */
function walker(state: { current: string }) {
  let seq = 0;
  return createDispatcher({
    resolveRoles: (scope: QueryScope) => atomsForSeat(scope.businessRoles ?? []),
    target: (entity: string) =>
      entity === 'goodsReceiptLine' ? lineTarget(state) : undefined,
    resolvePolicyHook,
    sink: { emit: () => undefined },
    nextCorrelationId: () => `spec_${(++seq).toString(36)}`,
    now: () => '2026-09-11T00:00:00.000Z',
  } as never);
}

/** The dock seat: holds both goods-receipt atoms, as `receiving` does. */
const dock: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['receiving'],
  actor: NO_PERSON,
};

describe('the trap is closed — walked, not declared', () => {
  it('⚠️ quarantine a line, then LEAVE it: Inspected -> Quarantined -> Accepted', async () => {
    const state = { current: 'Inspected' };
    const svc = walker(state);

    const held = await svc.dispatch(dock, {
      transitionId: 't_grline_quarantine',
      entity: 'goodsReceiptLine',
      entityId: LINE,
      payload: { holdReason: 'Colour variance vs spec — awaiting GC-MS retest' },
    });
    expect(held.status, `quarantine refused: ${held.reason ?? ''}`).not.toBe('failed');
    // The state is READ BACK from the store, never assumed from the flow file.
    expect(state.current, 'the hold did not land').toBe('Quarantined');

    const freed = await svc.dispatch(dock, {
      transitionId: 't_grline_release',
      entity: 'goodsReceiptLine',
      entityId: LINE,
      payload: {},
    });
    expect(freed.status, `release refused: ${freed.reason ?? ''}`).not.toBe('failed');
    expect(state.current, 'THE TRAP IS STILL CLOSED — nothing left the hold').toBe('Accepted');
  });

  it('⚠️ and the FAILING outcome leaves too — a retest has two answers', async () => {
    const state = { current: 'Inspected' };
    const svc = walker(state);
    await svc.dispatch(dock, {
      transitionId: 't_grline_quarantine',
      entity: 'goodsReceiptLine',
      entityId: LINE,
      payload: { holdReason: 'held' },
    });
    expect(state.current).toBe('Quarantined');

    const refused = await svc.dispatch(dock, {
      transitionId: 't_grline_reject',
      entity: 'goodsReceiptLine',
      entityId: LINE,
      payload: { rejectionReason: 'Retest confirmed the variance' },
    });
    expect(refused.status, `reject refused: ${refused.reason ?? ''}`).not.toBe('failed');
    expect(state.current).toBe('Rejected');
  });

  it('⚠️ SEPARABLE BY CONFIGURATION — a seat that may hold but may not dispose', async () => {
    // ⚠️ **THE CONTROL PROBED BOTH WAYS, BECAUSE ONE DIRECTION PROVES NOTHING.**
    // A seat holding NO atoms is refused everything, so its refusal here would
    // say nothing about the disposition gate. This seat is the narrowing
    // `buyerAnchor.test.ts` already names — `gr:receive` + `gr:inspect` off the
    // zero-atom buyer anchor — and it must PASS the entering half before its
    // refusal on the leaving half means anything.
    //
    // Together with the `receiving` walk above this is the whole of (b): ONE
    // SEAT BY DEFAULT (`receiving` holds both atoms and walks it end to end),
    // SEPARABLE BY CONFIGURATION (this seat quarantines and cannot clear).
    customRoleStore.append({
      id: 'probe-inspector',
      parent: 'buyer',
      adds: ['gr:receive', 'gr:inspect'],
      displayName: 'Probe inspector',
      description: 'Inspects, never disposes',
      parentAtomsAtGrant: [],
      grantedBy: NO_PERSON,
      grantedAt: '2026-09-11T00:00:00.000Z',
    } as unknown as Parameters<typeof customRoleStore.append>[0]);

    const inspector: QueryScope = { ...dock, businessRoles: ['probe-inspector'] };
    expect(
      atomsForSeat(['probe-inspector']) as readonly string[],
      'the probe seat resolved to nothing — its refusal below would be vacuous',
    ).toContain('gr:inspect');

    const state = { current: 'Inspected' };
    const svc = walker(state);

    // (i) KNOWN-GOOD: this seat really can put a line on hold.
    const held = await svc.dispatch(inspector, {
      transitionId: 't_grline_quarantine',
      entity: 'goodsReceiptLine',
      entityId: LINE,
      payload: { holdReason: 'held' },
    });
    expect(held.status, `the probe seat could not even quarantine: ${held.reason ?? ''}`)
      .not.toBe('failed');
    expect(state.current).toBe('Quarantined');

    // (ii) KNOWN-BAD: and it cannot walk the line out to the cleared terminal.
    const refused = await svc.dispatch(inspector, {
      transitionId: 't_grline_release',
      entity: 'goodsReceiptLine',
      entityId: LINE,
      payload: {},
    });
    expect(refused.status).toBe('failed');
    expect(refused.reason ?? '').toContain('ROLE_NOT_PERMITTED');
    expect(state.current, 'a refused release still moved the line').toBe('Quarantined');
  });
});

describe('THE DURABLE HALF — the property that would have caught this', () => {
  const flows = getKnownFlows();

  it('population control: the catalog is real and names a known-good member', () => {
    expect(flows.length, 'empty catalog — this suite would prove nothing').toBeGreaterThan(10);
    expect(flows.map((f) => f.entity)).toContain('goodsReceiptLine');
    expect(getFlow('goodsReceiptLine')!.states).toContain('Quarantined');
  });

  it('⚠️ every NON-TERMINAL state in `goodsReceiptLine` has an outbound edge', () => {
    const f = getFlow('goodsReceiptLine')!;
    const stuck = f.states
      .filter((s) => !f.terminals.includes(s))
      .filter((s) => f.transitions.every((t) => !t.from.includes(s)));
    expect(
      stuck,
      'A NON-TERMINAL STATE WITH NO WAY OUT IS A TRAP. It is not enough that the census names it: ' +
        'a census makes a trap visible, it does not make one forbidden. Give the state an edge, or ' +
        'declare it terminal and mean it.',
    ).toEqual([]);
  });

  it('⚠️ THE MIRROR — every NON-INITIAL state in `goodsReceiptLine` has an inbound edge', () => {
    // The inbound property catches a state nothing can ENTER; the outbound one
    // above catches a state nothing can LEAVE. They are the two halves of the
    // same question and neither implies the other — `Quarantined` had an inbound
    // edge throughout and was still a dead end.
    const f = getFlow('goodsReceiptLine')!;
    const unreachable = f.states
      .filter((s) => s !== f.initial)
      .filter((s) => f.transitions.every((t) => t.to !== s));
    expect(unreachable, 'states nothing can enter').toEqual([]);
  });

  it('⚠️ the exit-less population across ALL flows is NAMED, so a new trap reddens by name', () => {
    // Derived from each flow's OWN states and transitions — never through any
    // predicate this batch changed, so a mutation cannot collapse the population
    // and take the assertion down with it (§86).
    const stuck = flows.flatMap((f) =>
      f.states
        .filter((s) => !f.terminals.includes(s))
        .filter((s) => f.transitions.every((t) => !t.from.includes(s)))
        // A SAP-boundary settlement IS an exit; it just is not a transition.
        .filter((s) =>
          f.transitions.every(
            (t) => !((t as { sapBoundary?: boolean }).sapBoundary && t.to === s),
          ),
        )
        .map((s) => `${f.entity}/${s}`),
    );
    expect(stuck.slice().sort()).toEqual([
      'invoiceMatch/Price Variance',
      'invoiceMatch/Qty Mismatch',
    ]);
    expect(
      stuck,
      'goodsReceiptLine/Quarantined is back in the exit-less set — the release edge is gone',
    ).not.toContain('goodsReceiptLine/Quarantined');
  });
});
