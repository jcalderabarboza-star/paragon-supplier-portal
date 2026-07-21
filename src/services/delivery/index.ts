// Delivery Agreement — Batch 1: the headless domain foundation (object model +
// generator + derived ledger + the ctr-003 SIMULATED fixture). A NEW child of
// Contract, modelled 1:1 on the SAP LPA scheduling agreement. Spine only — no
// flows, no CommandTargets, no UI, no registry touch. See types.ts.
// Batch 2 adds the release step: the pure draft→released transition (the honesty
// boundary) + the enforced draft-only freeze guard. See release.ts.
// Batch 3 adds the fulfillment-match derivation: match an SDC IncomingShipment to
// the released line it draws down, derive ReleaseFulfillment at read (hybrid:
// inferred + explicit-binding override). See fulfillment.ts.
// The surface batch adds the read view-model (deriveAgreementView — ledger +
// fulfillment per agreement) and the SIMULATED demo scenario the buyer surface
// renders (ctr-003 stays pristine). See views.ts / demoFixtures.ts.
export * from './types';
export * from './generator';
export * from './ledger';
export * from './release';
export * from './fulfillment';
export * from './views';
export * from './fixtures';
export * from './demoFixtures';
