// ─────────────────────────────────────────────────────────────────────────────
// HALAL-XPERSONA-01 — cross-persona halal cert-story invariant (crown audit).
//
// A supplier's halal certification story — certified?, issuer/scheme, expiry —
// MUST agree across every persona surface that presents it. The invariant is
// keyed on supplierId, NEVER on display name: that name-vs-id split is the exact
// defect HALAL-XPERSONA-01 registers. The buyer compliance aggregate keys by
// NAME; the supplier-side surfaces key by ID; with no linkage the same real
// supplier can present contradictory compliance state across personas.
//
// Surfaces reconciled (all read through the service seam EXCEPT the registered
// buyer-compliance carve-out, so the invariant OUTLIVES the fixtures — at R2.2
// the compliance read repoints from COMPLIANCE_ITEMS to svc and the assertion
// below is unchanged):
//   • Supplier master   — svc.suppliers.list            (id-keyed: halalCertified, certExpiryDate)
//   • Storefront profile — svc.procurement.getStorefrontCerts (id-keyed: halal cert status/expiry)
//   • Buyer compliance   — COMPLIANCE_ITEMS (Halal rows) (NAME-keyed carve-out; mapped name→id here)
//
// Ruling (operator, final): registered contradictions are WHITELISTED by
// finding-id and reported as KNOWN — not failed. Any NEW contradiction (a
// supplier NOT on the whitelist presenting disagreement) FAILS the gate. The
// whitelist is the ALLOWED set: found ⊆ allowed. When R2.2 reconciles a
// supplier it drops out of `found` and the test stays green.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockDataService as svc } from './mock/mockDataService';
import type { QueryScope } from './types';
import { COMPLIANCE_ITEMS } from './mock/fixtures/buyerCompliance';

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null };

// Registered cross-persona contradictions — KNOWN, whitelisted by finding-id.
// Every entry is an instance of the SAME structural gap (absent name↔id
// reconciliation) that HALAL-XPERSONA-01 registers.
const KNOWN: Record<string, string> = {
  'sup-007': 'HALAL-XPERSONA-01', // compliance 'Valid' vs master/storefront not-certified
  'sup-003': 'HALAL-XPERSONA-01', // compliance expiry 2027-09-01 vs master 2026-11-01
};

type Certified = 'yes' | 'no' | 'unknown';
interface Claim {
  surface: string;
  certified: Certified;
  issuer: string | null;
  expiry: string | null;
}

const schemeOf = (s: string): string | null => {
  const u = s.toUpperCase();
  if (u.includes('BPJPH')) return 'BPJPH';
  if (u.includes('MUI')) return 'MUI';
  return null;
};

// Normalize each surface's honest-state vocabulary onto a shared certified axis.
const fromComplianceStatus = (s: string): Certified =>
  s === 'Valid' || s === 'Expiring' ? 'yes' : s === 'Expired' || s === 'Missing' ? 'no' : 'unknown';
const fromProfileStatus = (s: string): Certified =>
  s === 'valid' || s === 'expiring' ? 'yes' : s === 'expired' || s === 'missing' ? 'no' : 'unknown';

// Build the per-supplier halal claim set from all three persona surfaces.
async function collectClaims(): Promise<Map<string, Claim[]>> {
  const claims = new Map<string, Claim[]>();
  const push = (id: string, c: Claim) => {
    const list = claims.get(id) ?? [];
    list.push(c);
    claims.set(id, list);
  };

  const suppliers = (await svc.suppliers.list(buyerScope)).items;
  const nameToId = new Map(suppliers.map((s) => [s.name, s.id]));

  // Surface A — supplier master (id-keyed). Every supplier states halalCertified.
  for (const s of suppliers) {
    push(s.id, {
      surface: 'master',
      certified: s.halalCertified ? 'yes' : 'no',
      issuer: null, // master carries no issuer/scheme
      expiry: s.halalCertified ? s.certExpiryDate : null,
    });
  }

  // Surface B — storefront profile certs (id-keyed): halal-named cert records.
  const certs = (await svc.procurement.getStorefrontCerts(buyerScope)).items;
  for (const c of certs) {
    if (!/halal/i.test(c.name)) continue;
    push(c.supplierId, {
      surface: 'storefront',
      certified: fromProfileStatus(c.status),
      issuer: schemeOf(c.name),
      expiry: c.expiry,
    });
  }

  // Surface C — buyer compliance (NAME-keyed carve-out): Halal-category rows,
  // mapped name→id. An unmapped name is itself a reconciliation break (asserted
  // separately below).
  for (const item of COMPLIANCE_ITEMS) {
    if (item.category !== 'Halal') continue;
    const id = nameToId.get(item.supplier);
    if (!id) continue;
    push(id, {
      surface: 'compliance',
      certified: fromComplianceStatus(item.status),
      issuer: schemeOf(item.issuedBy),
      expiry: item.expiryDate,
    });
  }

  return claims;
}

// A supplier is contradictory when its surfaces disagree on any of the three
// cert-story dimensions. Compared only among surfaces that make a definite
// claim (certified 'unknown' abstains; expiry/issuer only where a valid cert
// asserts one).
function contradiction(claims: Claim[]): string | null {
  const certifiedSet = new Set(claims.map((c) => c.certified).filter((v) => v !== 'unknown'));
  if (certifiedSet.has('yes') && certifiedSet.has('no')) return 'certified';

  const expirySet = new Set(
    claims.filter((c) => c.certified === 'yes' && c.expiry).map((c) => c.expiry),
  );
  if (expirySet.size > 1) return 'expiry';

  const issuerSet = new Set(
    claims.filter((c) => c.certified !== 'no' && c.issuer).map((c) => c.issuer),
  );
  if (issuerSet.size > 1) return 'issuer';

  return null;
}

describe('HALAL-XPERSONA-01 — cross-persona halal cert-story agreement', () => {
  it('every buyer-compliance Halal row keys onto a real supplierId (name→id resolves)', async () => {
    const suppliers = (await svc.suppliers.list(buyerScope)).items;
    const names = new Set(suppliers.map((s) => s.name));
    const unmapped = COMPLIANCE_ITEMS.filter(
      (i) => i.category === 'Halal' && !names.has(i.supplier),
    ).map((i) => i.supplier);
    expect(unmapped, `unmapped compliance supplier names: ${unmapped.join(', ')}`).toEqual([]);
  });

  it('is non-vacuous — the cross-persona join wires master+storefront+compliance', async () => {
    const claims = await collectClaims();
    // Master always claims: every supplier is present.
    expect(claims.size).toBe((await svc.suppliers.list(buyerScope)).items.length);
    // sup-007 is the seeded multi-surface supplier — it must carry a claim from
    // all three surfaces, proving the join is real (independent of whether they
    // currently agree; after R2.2 they agree but all three still appear).
    const surfaces = new Set((claims.get('sup-007') ?? []).map((c) => c.surface));
    expect(surfaces).toEqual(new Set(['master', 'storefront', 'compliance']));
  });

  it('NO NEW contradiction — every disagreement is a whitelisted KNOWN finding', async () => {
    const claims = await collectClaims();
    const found: Record<string, string> = {};
    for (const [id, list] of claims) {
      const dim = contradiction(list);
      if (dim) found[id] = dim;
    }
    // New = found but not registered. Must be empty — a new disagreement fails.
    const neu = Object.keys(found).filter((id) => !KNOWN[id]);
    const detail = neu
      .map((id) => `${id} (${found[id]}): ${JSON.stringify(claims.get(id))}`)
      .join(' | ');
    expect(neu, `NEW cross-persona contradiction(s): ${detail}`).toEqual([]);

    // KNOWN report: every found contradiction is attributed to a finding-id.
    for (const id of Object.keys(found)) {
      expect(KNOWN[id], `contradiction at ${id} lacks a finding-id`).toBeTruthy();
    }
  });
});
