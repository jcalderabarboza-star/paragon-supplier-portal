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
    // gate-1 (liveness) tracks wiring alone. purchaseRequisitions joined at
    // G1.1 and forecastPublications at SDC-2a (the RequirementResponse target)
    // — but gate-2 holds isLive() false for both (see the harvest-gate suite):
    // wiring ≠ green (LIVENESS-DATASOURCE-01).
    const live = ALL_CAPABILITIES.filter((c) => liveness(c) === 'LIVE');
    expect(new Set(live)).toEqual(
      new Set<Capability>([
        'purchaseOrders',
        'advanceShipNotices',
        'goodsReceipts',
        'invoices',
        'rfqs',
        'purchaseRequisitions',
        'forecastPublications',
        // SDC-3b — the InventoryDeclaration target is wired (gate-1 LIVE); gate-2
        // still holds isLive() false (see the harvest-gate suite).
        'inventory',
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
    // commodityIntel (CI-0) joins the pure-fixture set: the Market Intelligence
    // tab reads invented category stats with no lifecycle entity behind them, so
    // backing is null → derives SIMULATED → the shared LivenessPill can only ever
    // render amber "Sample". Green is structurally unreachable.
    // (inventory left this set at SDC-3b — it is now wired-but-harvest-gated,
    // proven in the harvest-gate suite; risk + commodityIntel stay pure-fixture.)
    for (const cap of ['risk', 'commodityIntel'] as Capability[]) {
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

  it('only the five declared capabilities are harvest-gated (others: note null)', () => {
    // `supplierDiscovery` joined at DISCOVERY-REAL-SUBJECTS-01 batch C: its
    // candidate pool was DELETED rather than substituted, so the surface is gated
    // on a real feed instead of repopulated — a candidate can only ever arrive
    // FROM A SOURCE. This census test is why that addition could not be silent.
    const gated = new Set<Capability>([
      'compliance',
      'purchaseRequisitions',
      'forecastPublications',
      'inventory',
      'supplierDiscovery',
    ]);
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

  it('⭐ forecastPublications after the SDC-2a backing flip: wired (gate-1 LIVE) yet STILL never green', () => {
    // THE registry-honesty guard the SDC-1 entry pre-encoded, now proven live:
    // SDC-2a wired the RequirementResponse CommandTarget and flipped this
    // backing null → 'requirementResponse', so gate-1 derives LIVE — but the
    // publications answered are SIMULATED fixtures (no real SOMO C8 feed), so
    // gate-2 stays shut. The pill MUST keep reading "Sample — awaiting SOMO C8
    // feed"; wiring alone can never flip green (LIVENESS-DATASOURCE-01).
    expect(capabilityBacking.forecastPublications).toBe('requirementResponse');
    expect(WIRED_COMMAND_TARGETS).toContain('requirementResponse');
    expect(liveness('forecastPublications')).toBe('LIVE'); // gate-1 open (wired)
    expect(awaitsHarvest('forecastPublications')).toBe(true); // gate-2 shut (no C8 feed)
    const note = readinessNote('forecastPublications');
    expect(note?.readinessNoteKey).toBe('widget.honesty.awaitingC8Feed');
    expect(note?.source).toBe('SOMO C8');
    expect(isLive('forecastPublications')).toBe(false); // guarded → Sample render
  });

  it('⭐ inventory after the SDC-3b backing flip: wired (gate-1 LIVE) yet STILL never green', () => {
    // SDC-3b repointed inventory null → 'inventoryDeclaration' (the target the
    // declare verb dispatches through), so gate-1 derives LIVE — but the SOH is
    // SIMULATED fixtures / demo submissions until real supplier identities land
    // (F1), so gate-2 stays shut. The pill MUST keep reading "Sample — awaiting
    // live supplier feed"; wiring alone can never flip green (LIVENESS-DATASOURCE-01).
    expect(capabilityBacking.inventory).toBe('inventoryDeclaration');
    expect(WIRED_COMMAND_TARGETS).toContain('inventoryDeclaration');
    expect(liveness('inventory')).toBe('LIVE'); // gate-1 open (wired)
    expect(awaitsHarvest('inventory')).toBe(true); // gate-2 shut (no live supplier feed)
    const note = readinessNote('inventory');
    expect(note?.readinessNoteKey).toBe('widget.honesty.awaitingSupplierFeed');
    expect(note?.source).toBe('Supplier feed (F1)');
    expect(isLive('inventory')).toBe(false); // guarded → Sample render
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
