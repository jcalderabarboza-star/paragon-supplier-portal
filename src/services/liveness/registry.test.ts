import { describe, it, expect } from 'vitest';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';
import {
  liveness,
  isLive,
  awaitsHarvest,
  readinessNote,
  capabilityBacking,
  ALL_CAPABILITIES,
  type Capability,
} from './registry';

// The LivenessRegistry is the ONE authority for honest-render. These tests prove
// two load-bearing guarantees adjudicated in F0.6:
//   1. Liveness is DERIVED from the wiring census — it cannot drift from what the
//      command spine actually wires (honest-by-CONSTRUCTION, not by hand-authored
//      tiers checked against a list).
//   2. The honesty invariant is STRUCTURAL — a SIMULATED/SPEC capability can never
//      yield a green "Live" pill, because the only path to green is tier LIVE and
//      tier is a lookup, never a caller-supplied boolean.

describe('LivenessRegistry — derived from the wiring census (cannot drift)', () => {
  it('a capability is LIVE iff its backing entity is a wired CommandTarget', () => {
    // The definitional proof: liveness IS census membership. If TARGETS changes,
    // this equivalence carries the tier with it — there is no second source.
    for (const cap of ALL_CAPABILITIES) {
      const backing = capabilityBacking[cap];
      const wired = backing !== null && WIRED_COMMAND_TARGETS.includes(backing);
      expect(liveness(cap)).toBe(wired ? 'LIVE' : 'SIMULATED');
    }
  });

  it('the LIVE set (gate-1) is exactly the wired-backed capabilities', () => {
    // gate-1 (liveness) tracks wiring alone. purchaseRequisitions is wired as of
    // G1.1, so it joins the gate-1 LIVE set — but gate-2 holds isLive() false
    // (see the harvest-gate suite): wiring ≠ green (LIVENESS-DATASOURCE-01).
    const live = ALL_CAPABILITIES.filter((c) => liveness(c) === 'LIVE');
    expect(new Set(live)).toEqual(
      new Set<Capability>([
        'purchaseOrders',
        'advanceShipNotices',
        'goodsReceipts',
        'invoices',
        'rfqs',
        'purchaseRequisitions',
      ]),
    );
  });

  it('every LIVE capability’s backing is a real key in the wiring census', () => {
    for (const cap of ALL_CAPABILITIES) {
      if (liveness(cap) === 'LIVE') {
        expect(WIRED_COMMAND_TARGETS).toContain(capabilityBacking[cap]);
      }
    }
  });
});

describe('LivenessRegistry — honesty invariant (non-LIVE can never be green)', () => {
  it('isLive() requires BOTH gates — tier LIVE AND real data source (not harvest-gated)', () => {
    // The two-gate predicate in the LIVE registry: green iff gate-1 (wired ⇒ LIVE)
    // AND gate-2 (source landed ⇒ not awaiting harvest). A non-LIVE capability is
    // never green; a wired-but-harvest-gated one (purchaseRequisitions) is not either.
    for (const cap of ALL_CAPABILITIES) {
      expect(isLive(cap)).toBe(liveness(cap) === 'LIVE' && !awaitsHarvest(cap));
      if (liveness(cap) !== 'LIVE') expect(isLive(cap)).toBe(false);
    }
  });

  it('a registered-but-unwired flow (supplierDocument, F0.4 inert) is SIMULATED', () => {
    expect(capabilityBacking.supplierDocuments).toBe('supplierDocument');
    // The flow is registered, but it is NOT a wired CommandTarget…
    expect(WIRED_COMMAND_TARGETS).not.toContain('supplierDocument');
    // …so it derives SIMULATED and can never render green.
    expect(liveness('supplierDocuments')).toBe('SIMULATED');
    expect(isLive('supplierDocuments')).toBe(false);
  });

  it('the canonical compliance flow (I3.1 inert) is SIMULATED until Track-R harvest', () => {
    // I3.1 repointed compliance from a null backing to the now-authored flow. It
    // is registered but NOT a wired CommandTarget, so it derives SIMULATED — the
    // structural honesty guarantee: no wired target ⇒ can never render green.
    expect(capabilityBacking.compliance).toBe('compliance');
    expect(WIRED_COMMAND_TARGETS).not.toContain('compliance');
    expect(liveness('compliance')).toBe('SIMULATED');
    expect(isLive('compliance')).toBe(false);
  });

  it('a pure-fixture capability (no backing entity) is SIMULATED, never green', () => {
    for (const cap of ['inventory', 'risk'] as Capability[]) {
      expect(capabilityBacking[cap]).toBeNull();
      expect(liveness(cap)).toBe('SIMULATED');
      expect(isLive(cap)).toBe(false);
    }
  });
});

describe('LivenessRegistry — harvest gate (LIVENESS-DATASOURCE-01, gate-2)', () => {
  it('compliance is harvest-gated and carries a Track-R readiness note', () => {
    expect(awaitsHarvest('compliance')).toBe(true);
    const note = readinessNote('compliance');
    expect(note?.readinessNoteKey).toBe('widget.honesty.awaitingHarvest');
    expect(note?.source).toBe('Track-R');
  });

  it('only compliance + purchaseRequisitions are harvest-gated (others: note null)', () => {
    const gated = new Set<Capability>(['compliance', 'purchaseRequisitions']);
    for (const cap of ALL_CAPABILITIES) {
      if (gated.has(cap)) continue;
      expect(awaitsHarvest(cap)).toBe(false);
      expect(readinessNote(cap)).toBeNull();
    }
  });

  it('purchaseRequisitions is wired (gate-1 LIVE) yet harvest-gated → never green', () => {
    // C7-FIND-01a (G1.1) + DECISION-2. The PR CommandTarget is wired, so gate-1
    // derives LIVE — but no live PRODUCER exists yet (SOMO = F2/SPEC, Grid = G1.2),
    // so gate-2 holds it guarded. Wiring ALONE must never flip green
    // (LIVENESS-DATASOURCE-01); this is that guarantee proven in the LIVE registry.
    expect(capabilityBacking.purchaseRequisitions).toBe('purchaseRequisition');
    expect(WIRED_COMMAND_TARGETS).toContain('purchaseRequisition');
    expect(liveness('purchaseRequisitions')).toBe('LIVE'); // gate-1 open (wired)
    expect(awaitsHarvest('purchaseRequisitions')).toBe(true); // gate-2 shut (no producer)
    const note = readinessNote('purchaseRequisitions');
    expect(note?.readinessNoteKey).toBe('widget.honesty.awaitingProducer');
    expect(note?.source).toBe('SOMO / Grid');
    expect(isLive('purchaseRequisitions')).toBe(false); // guarded → SIMULATED render
  });

  it('gate-2 does not disturb the UNGATED wired-LIVE capabilities (real source)', () => {
    // The 5 pre-G1.1 wired capabilities are not harvest-gated, so isLive tracks tier.
    for (const cap of ALL_CAPABILITIES) {
      if (liveness(cap) === 'LIVE' && !awaitsHarvest(cap)) {
        expect(isLive(cap)).toBe(true);
      }
    }
  });
});
