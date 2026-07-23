// ────────────────────────────────────────────────────────────────────────────
// C4c — the buyer-recording INVALIDATION CARVE-OUT, unit-tested as a pure
// predicate (no render). A normal command never disturbs another supplier's
// cache; a buyer-recorded write is the deliberate exception because it is ABOUT a
// subject supplier. This proves the carve-out invalidates exactly the SUBJECT
// supplier's own reads + the buyer consolidation — and NO other supplier.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import { isRecordedDeclarationInvalidation } from './sdcBuyerHooks';
import { scopeKey } from './useServiceQuery';

const SUBJECT = 'sup-002';
const OTHER = 'sup-005';
const subjectKey = scopeKey({ personaType: 'supplier', supplierId: SUBJECT });
const otherKey = scopeKey({ personaType: 'supplier', supplierId: OTHER });
const buyerKey = scopeKey({ personaType: 'buyer', supplierId: null });

describe('isRecordedDeclarationInvalidation — the C4c carve-out', () => {
  it("invalidates the SUBJECT supplier's own sdc reads (else their portal SOH goes stale)", () => {
    expect(isRecordedDeclarationInvalidation(['sdc', 'ownInventoryDeclarations', subjectKey], SUBJECT)).toBe(true);
  });

  it('invalidates the buyer consolidation (the recorded SOH feeds the P2 view)', () => {
    expect(isRecordedDeclarationInvalidation(['sdc', 'consolidation', buyerKey], SUBJECT)).toBe(true);
  });

  it("does NOT disturb ANOTHER supplier's cache (the carve-out never leaks)", () => {
    expect(isRecordedDeclarationInvalidation(['sdc', 'ownInventoryDeclarations', otherKey], SUBJECT)).toBe(false);
  });

  it('does NOT touch non-sdc query families (e.g. procurement)', () => {
    expect(isRecordedDeclarationInvalidation(['procurement', 'inventory', subjectKey], SUBJECT)).toBe(false);
  });
});
