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

// ─── SDC-4a — store-insertion recency (ruling c: seq-order, NOT declaredAt) ────
//
// "Which declaration is current?" must be CLOCK-INDEPENDENT. Ordering by
// declaredAt is not: a live declare is stamped with the simulated clock, but the
// SDC-0 seed fixtures are future-dated (Aug 2026), so max-by-declaredAt can
// prefer a seed over a fresh write. The store instead assigns a MONOTONIC id
// (`inv-0001..` for seeds, `inv-9001..` for live declares — a strictly larger
// suffix per insertion; see inventoryDeclarationStore). That suffix is the
// insertion-sequence token: a higher value is more recently added, always
// ranking a live declare (inv-9xxx) above a future-dated seed (inv-0xxx),
// regardless of either declaration's declaredAt.

/**
 * The store-insertion recency of a declaration, derived from its id's monotonic
 * numeric suffix. HIGHER = more recently added. Clock-independent by
 * construction; a declaration with no digits in its id sorts oldest (0).
 */
export function declarationRecency(declaration: InventoryDeclaration): number {
  const digits = declaration.id.replace(/\D+/g, '');
  return digits === '' ? 0 : Number(digits);
}

/**
 * The CURRENT declaration for each supplier × material — the most-recently-added
 * per pair by `declarationRecency` (NOT declaredAt). One entry per pair; order of
 * the returned array is unspecified (callers sort as they need). This is the ONE
 * "current SOH" reducer both the P1 own-declarations read and the P2 coverage
 * lookup share, so a fresh declare wins over a future-dated seed everywhere.
 */
export function currentDeclarations(
  declarations: readonly InventoryDeclaration[],
): InventoryDeclaration[] {
  const byPair = new Map<string, InventoryDeclaration>();
  for (const d of declarations) {
    const k = `${d.supplierId}|${d.materialCode}`;
    const prev = byPair.get(k);
    if (!prev || declarationRecency(d) > declarationRecency(prev)) byPair.set(k, d);
  }
  return [...byPair.values()];
}
