// ────────────────────────────────────────────────────────────────────────────
// Transition schema — public barrel (v2.2 Step 3.1).
//
// Importing this module also SEEDS the process-wide registry with every shipped
// flow, so `getKnownFlows()` reflects the loaded machine set. Registration is a
// one-time side effect (ES module single-eval); import this barrel — not the
// bare `registry` module — when you want the seeded view.
// ────────────────────────────────────────────────────────────────────────────

export * from './schema';
export * from './validate';
export * from './registry';
export * from './policyHooks';
export * from './roles';
export * from './events';
export * from './dispatcher';
// Importing ./policies binds the policy-hook implementations (side effect).
export * from './policies';
export { purchaseOrderFlow } from './flows/purchaseOrder.flow';
export { advanceShipNoticeFlow } from './flows/advanceShipNotice.flow';

import { flowRegistry } from './registry';
import { purchaseOrderFlow } from './flows/purchaseOrder.flow';
import { advanceShipNoticeFlow } from './flows/advanceShipNotice.flow';

// Seed the shipped flows onto the singleton.
flowRegistry.register(purchaseOrderFlow); // Step 3.1 — PO
flowRegistry.register(advanceShipNoticeFlow); // Step 4 (i) — ASN
