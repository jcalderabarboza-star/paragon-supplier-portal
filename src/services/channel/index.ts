// ─────────────────────────────────────────────────────────────────────────────
// channel — the Communication Hub module (DEC-COMMS-PRIMARY) barrel.
//
// C1a — shared vocabulary (types.ts); C1 — the reply parser (replyParser.ts);
// C3 — the outbound request model + store (outbound.ts / outboundStore.ts).
// Imports sdc + chase, NEVER the reverse (skeleton §5).
// ─────────────────────────────────────────────────────────────────────────────

export * from './types';
export * from './replyParser';
export * from './outbound';
export * from './outboundFixtures';
export * from './outboundStore';
export * from './provenanceStore';
