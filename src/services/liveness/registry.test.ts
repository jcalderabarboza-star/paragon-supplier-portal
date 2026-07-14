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

  it('the LIVE set is exactly the wired-backed capabilities', () => {
    const live = ALL_CAPABILITIES.filter((c) => liveness(c) === 'LIVE');
    expect(new Set(live)).toEqual(
      new Set<Capability>([
        'purchaseOrders',
        'advanceShipNotices',
        'goodsReceipts',
        'invoices',
        'rfqs',
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
  it('isLive() is true ONLY for tier LIVE — no non-LIVE capability yields green', () => {
    for (const cap of ALL_CAPABILITIES) {
      expect(isLive(cap)).toBe(liveness(cap) === 'LIVE');
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

  it('no other capability is harvest-gated (note is null, gate-2 trivially open)', () => {
    for (const cap of ALL_CAPABILITIES) {
      if (cap === 'compliance') continue;
      expect(awaitsHarvest(cap)).toBe(false);
      expect(readinessNote(cap)).toBeNull();
    }
  });

  it('gate-2 does not disturb the wired-LIVE capabilities (their source is real)', () => {
    // The 5 wired capabilities are not harvest-gated, so isLive still tracks tier.
    for (const cap of ALL_CAPABILITIES) {
      if (liveness(cap) === 'LIVE') {
        expect(awaitsHarvest(cap)).toBe(false);
        expect(isLive(cap)).toBe(true);
      }
    }
  });
});
