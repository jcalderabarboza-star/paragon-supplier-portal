// ────────────────────────────────────────────────────────────────────────────
// InventoryDeclaration read-derivations (SDC-3a — R-4 Finding 1, ruling (a)).
//
// Granularity is DERIVED AT READ, never stored (the SCORE-AT-READ discipline):
// a declaration either carries batch-grain detail or it doesn't — storing a
// flag alongside would be a second source of truth that can drift.
//
//  · 'batch-grain' — batches[] present: full detail, expiry-aware.
//  · 'total-only'  — the honest minimal (chat-channel) form: token + total.
//    EXPIRY-BLIND: consumers (P2 supplier-coverage) must MARK that expiry
//    bridgeability cannot be assessed — never assume no-expiry-risk.
// ────────────────────────────────────────────────────────────────────────────

import type { InventoryDeclaration } from './types';

export type DeclarationGranularity = 'total-only' | 'batch-grain';

/** The declaration's granularity, derived from whether batch detail exists. */
export function declarationGranularity(
  declaration: InventoryDeclaration,
): DeclarationGranularity {
  return declaration.batches && declaration.batches.length > 0
    ? 'batch-grain'
    : 'total-only';
}
