import { describe, it, expect } from 'vitest';
import {
  ALL_CAPABILITIES,
  feedProvenance,
  dispatchesCommands,
  isLive,
  liveness,
  capabilityBacking,
  type Capability,
} from './registry';

// ─────────────────────────────────────────────────────────────────────────────
// D-CENSUS-8 — the FEED axis.
//
// The census found seven routes a single marker cannot describe honestly: the
// verb genuinely dispatches while the data on screen is a frozen fixture. These
// tests pin the two axes as INDEPENDENT, and pin the one fact that makes the
// FIXTURE claim safe to state globally today — that nothing on main has a live
// feed at all.
// ─────────────────────────────────────────────────────────────────────────────

describe('feed provenance — the second axis', () => {
  it('every capability is covered (no capability can be added without a feed answer)', () => {
    // Record<Capability, …> makes this a compile-time guarantee too; the runtime
    // assertion is what catches a hand-edit that widens the union without the map.
    for (const cap of ALL_CAPABILITIES) {
      expect(feedProvenance(cap)).toBeDefined();
    }
  });

  it('NOTHING on main reads a live feed — the backend is greenfield', () => {
    // The load-bearing fact behind every "Sample data" marker this batch adds.
    // When the F1 httpDataService swap lands and a capability starts reading a
    // real upstream, THIS TEST FAILS FIRST — which is the point: a stale FIXTURE
    // marker sitting under live data is the same honesty failure as a stale LIVE
    // marker sitting over fixtures, just in the flattering direction.
    const live = ALL_CAPABILITIES.filter((c) => feedProvenance(c) === 'LIVE');
    expect(live).toEqual([]);
  });

  it('the two axes are independent — a FIXTURE feed can still dispatch commands', () => {
    // The partly-real class, stated as an executable fact rather than prose.
    // If this ever comes back empty, the two-axis marker has no reason to exist
    // and should be retired rather than left rendering a distinction that died.
    const partlyReal = ALL_CAPABILITIES.filter(
      (c) => feedProvenance(c) === 'FIXTURE' && dispatchesCommands(c),
    );
    expect(partlyReal.length).toBeGreaterThan(0);
    expect(new Set(partlyReal)).toEqual(
      new Set<Capability>([
        'purchaseOrders',
        'advanceShipNotices',
        'goodsReceipts',
        'invoices',
        'rfqs',
        'purchaseRequisitions',
        'forecastPublications',
        'inventory',
      // B2 — the supplierApplication target was wired at B1 and its READ SURFACE
      // lands here, so the lane now dispatches over a fixture-provenance feed.
      // It is the partly-real class exactly: a compliance officer really does
      // move an application through the machine, and every row on the page was
      // grown by a seed rather than submitted by anybody outside.
      'supplierApplications',
        // S82 - supplierDocuments joins the partly-real class and is the
        // sharpest member of it: a supplier can now DECLARE a certificate
        // through a wired verb while every row the page shows was authored as a
        // sample. Verbs real, feed fixture - which is exactly the distinction
        // this two-axis marker exists to render.
        'supplierDocuments',
      ]),
    );
  });

  it('the verb axis is DERIVED from wiring, not hand-authored', () => {
    // Same honest-by-construction property gate-1 has: unwire the target and the
    // "commands dispatch" claim disappears with no edit in the registry.
    for (const cap of ALL_CAPABILITIES) {
      expect(dispatchesCommands(cap)).toBe(liveness(cap) === 'LIVE');
    }
  });

  it('a null-backed capability can never claim its commands dispatch', () => {
    // The eight domains D-CENSUS-8 added are all null-backed. None of them may
    // render the verb axis — a supplier-master page has no verbs to be honest about.
    for (const cap of ALL_CAPABILITIES) {
      if (capabilityBacking[cap] === null) {
        expect(dispatchesCommands(cap)).toBe(false);
      }
    }
  });

  it('the nine D-CENSUS-8 domains are SIMULATED, fixture-fed, and verbless', () => {
    const lateMarked: Capability[] = [
      'suppliers',
      'supplierDiscovery',
      'supplierRegistration',
      'contracts',
      'shipments',
      'scorecards',
      'analytics',
      'messaging',
      'dashboard',
    ];
    for (const cap of lateMarked) {
      expect(capabilityBacking[cap]).toBeNull();
      expect(liveness(cap)).toBe('SIMULATED');
      expect(isLive(cap)).toBe(false);
      expect(feedProvenance(cap)).toBe('FIXTURE');
      expect(dispatchesCommands(cap)).toBe(false);
    }
  });
});
