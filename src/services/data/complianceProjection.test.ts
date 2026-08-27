import { describe, it, expect } from 'vitest';
import {
  computeStatus,
  daysRemaining,
  schemeValid,
  remindEligible,
  EXPIRING_WINDOW_DAYS,
  BPJPH_MANDATE_DATE,
} from './complianceProjection';
import type { ComplianceRegistryEntry } from './types';

// A minimal entry builder — every field defaulted, override what a case needs.
function entry(over: Partial<ComplianceRegistryEntry> = {}): ComplianceRegistryEntry {
  return {
    id: 'creg-test',
    supplierId: 'sup-002',
    supplierName: 'Sample Supplier (illustrative)',
    materialCodes: ['RM-SAMPLE-01'],
    materialCategory: 'fragrance',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-0001',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2024-01-01',
    expiryDate: null,
    lifecycleState: 'Valid',
    sapSync: 'AWAITING_SYNC',
    scopeText: 'test',
    notes: 'synthetic',
    ...over,
  };
}

const NOW = '2026-07-13T00:00:00.000Z';

describe('complianceProjection — computeStatus (law 0.5, computed-at-read)', () => {
  it('a non-Valid lifecycle state shows as-is (Missing / Under Review)', () => {
    expect(computeStatus(entry({ lifecycleState: 'Missing' }), NOW)).toBe('Missing');
    expect(computeStatus(entry({ lifecycleState: 'Under Review' }), NOW)).toBe('Under Review');
  });

  it('a Valid cert with no expiry (permanent basis) stays Valid', () => {
    expect(computeStatus(entry({ expiryDate: null }), NOW)).toBe('Valid');
  });

  it('a Valid cert well before expiry is Valid', () => {
    expect(computeStatus(entry({ expiryDate: '2027-12-31' }), NOW)).toBe('Valid');
  });

  it('a Valid cert within the expiring window is Expiring', () => {
    // 60 days from NOW → inside the 90-day window.
    expect(computeStatus(entry({ expiryDate: '2026-09-11' }), NOW)).toBe('Expiring');
  });

  it('the expiring window boundary is inclusive', () => {
    const remaining = daysRemaining(entry({ expiryDate: '2026-10-11' }), NOW);
    expect(remaining).toBe(EXPIRING_WINDOW_DAYS);
    expect(computeStatus(entry({ expiryDate: '2026-10-11' }), NOW)).toBe('Expiring');
  });

  it('a Valid cert past expiry is Expired', () => {
    expect(computeStatus(entry({ expiryDate: '2025-04-30' }), NOW)).toBe('Expired');
  });

  it('is deterministic — same (entry, now) yields the same status (no clock read)', () => {
    const e = entry({ expiryDate: '2026-09-11' });
    expect(computeStatus(e, NOW)).toBe(computeStatus(e, NOW));
  });
});

describe('complianceProjection — daysRemaining', () => {
  it('is null when there is no expiry (unknown or permanent — never guessed)', () => {
    expect(daysRemaining(entry({ expiryDate: null }), NOW)).toBeNull();
  });

  it('is negative past expiry, positive before', () => {
    expect(daysRemaining(entry({ expiryDate: '2025-04-30' }), NOW)!).toBeLessThan(0);
    expect(daysRemaining(entry({ expiryDate: '2027-12-31' }), NOW)!).toBeGreaterThan(0);
  });
});

describe('complianceProjection — schemeValid (HALAL-ISSUER-BLIND mechanism, SIMULATED)', () => {
  const beforeMandate = '2026-01-01T00:00:00.000Z';
  const afterMandate = '2026-12-01T00:00:00.000Z';

  it('a MUI-legacy cert whose dates say Valid is NON-compliant from the mandate date', () => {
    const mui = entry({ certType: 'HALAL_MUI_LEGACY', expiryDate: '2027-06-01' });
    // Its own clock status is Valid both sides of the mandate…
    expect(computeStatus(mui, beforeMandate)).toBe('Valid');
    expect(computeStatus(mui, afterMandate)).toBe('Valid');
    // …but scheme-validity flips at the mandate: this is the axis the old
    // status==='Valid' check was blind to.
    expect(schemeValid(mui, beforeMandate)).toBe(true);
    expect(schemeValid(mui, afterMandate)).toBe(false);
  });

  it('the mandate boundary date itself is non-compliant for MUI-legacy', () => {
    const mui = entry({ certType: 'HALAL_MUI_LEGACY', expiryDate: '2027-06-01' });
    expect(schemeValid(mui, `${BPJPH_MANDATE_DATE}T00:00:00.000Z`)).toBe(false);
  });

  it('a BPJPH cert is scheme-valid across the mandate', () => {
    const bpjph = entry({ certType: 'HALAL_BPJPH', expiryDate: null });
    expect(schemeValid(bpjph, afterMandate)).toBe(true);
  });

  it('an Expired / Missing / Under Review cert is never scheme-valid', () => {
    expect(schemeValid(entry({ expiryDate: '2025-01-01' }), NOW)).toBe(false); // Expired
    expect(schemeValid(entry({ lifecycleState: 'Missing' }), NOW)).toBe(false);
    expect(schemeValid(entry({ lifecycleState: 'Under Review' }), NOW)).toBe(false);
  });
});

describe('complianceProjection — remindEligible (HALAL-UNDERREVIEW semantics)', () => {
  it('only an actually-held (Valid) cert is remind-eligible', () => {
    expect(remindEligible(entry({ lifecycleState: 'Valid' }))).toBe(true);
  });

  it('Under Review and Missing are explicitly NOT remind-eligible', () => {
    expect(remindEligible(entry({ lifecycleState: 'Under Review' }))).toBe(false);
    expect(remindEligible(entry({ lifecycleState: 'Missing' }))).toBe(false);
  });
});
