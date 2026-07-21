// Delivery Agreement — Batch 1: the headless domain foundation (object model +
// generator + derived ledger + the ctr-003 SIMULATED fixture). A NEW child of
// Contract, modelled 1:1 on the SAP LPA scheduling agreement. Spine only — no
// flows, no CommandTargets, no UI, no registry touch. See types.ts.
// Batch 2 adds the release step: the pure draft→released transition (the honesty
// boundary) + the enforced draft-only freeze guard. See release.ts.
export * from './types';
export * from './generator';
export * from './ledger';
export * from './release';
export * from './fixtures';
