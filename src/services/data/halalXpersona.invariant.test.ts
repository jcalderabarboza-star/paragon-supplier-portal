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
// Surfaces reconciled — ALL THREE now read through the service seam:
//   • Supplier master    — svc.suppliers.list                  (id-keyed: halalCertified, certExpiryDate)
//   • Storefront profile — svc.procurement.getStorefrontCerts  (id-keyed: halal cert status/expiry)
//   • Compliance registry — svc.risk.getComplianceRegistry     (id-keyed: certType/issuer/expiryDate)
//
// ── ⚠️ THE CARVE-OUT IS GONE, AND THIS TEST WAS THE LAST THING HOLDING IT ────
//   Surface C used to be `COMPLIANCE_ITEMS` (fixtures/buyerCompliance) — the
//   NAME-keyed buyer-compliance aggregate — joined back to ids through a
//   name→id map built here. The header predicted "at R2.2 the compliance read
//   repoints from COMPLIANCE_ITEMS to svc and the assertion below is
//   unchanged". That repoint ALREADY HAPPENED at I3.2 (COMPLIANCE-CARVEOUT-01,
//   PR #62): BuyerCompliance reads `useDataService()` → the DTO-v2 registry,
//   whose `supplierId` is documented in `types.ts` as "the FK that reconciles
//   the name-vs-id split across personas (HALAL-XPERSONA-01)" — i.e. built to
//   close exactly this finding. Nobody repointed the test. It went on
//   reconciling the LIVE master and storefront against a THIRD surface no page
//   renders and nothing else imports (`DISCOVERY-REAL-SUBJECTS-01`, batch E).
//   Repointed here; `COMPLIANCE_ITEMS` deleted. The name→id map is deleted with
//   it — not ported — because the registry is id-keyed at the source and a
//   name join would re-introduce the defect the invariant exists to catch.
//
// Ruling (operator, final): registered contradictions are WHITELISTED by
// finding-id and reported as KNOWN — not failed. Any NEW contradiction (a
// supplier NOT on the whitelist presenting disagreement) FAILS the gate. The
// whitelist is the ALLOWED set: found ⊆ allowed. When a supplier is reconciled
// it drops out of `found` and the test stays green.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockDataService as svc } from './mock/mockDataService';
import type { QueryScope } from './types';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };

// Registered cross-persona contradictions — KNOWN, whitelisted by finding-id.
//
// ── THE MECHANISM CHANGED WHEN SURFACE C WAS REPOINTED (batch E) ─────────────
//   These used to be instances of the absent name↔id reconciliation. That gap is
//   CLOSED: the registry is id-keyed at the source, so there is no join to fail.
//   What remains is the disagreement the id join now makes VISIBLE — the supplier
//   master and the DTO-v2 registry were authored independently and state
//   different halal facts about the same supplier. Same finding-id, different
//   mechanism: HALAL-XPERSONA-01 is now a FIXTURE-RECONCILIATION debt, not a
//   keying defect. Reconciling the two fixtures is supplier-master work and is
//   deliberately NOT done here (batch E is deletion of unrendered residue).
//
//   sup-002 and sup-005 are NEW TO THE GATE BUT NOT NEW: the previous surface C
//   was dead fixture data that no page rendered, and it was MASKING them.
const KNOWN: Record<string, string> = {
  'sup-007': 'HALAL-XPERSONA-01', // registry Valid BPJPH (permanent) vs master not-certified
  'sup-005': 'HALAL-XPERSONA-01', // registry Valid halal cert vs master halalCertified: false
  'sup-002': 'HALAL-XPERSONA-01', // master halal expiry 2026-09-10 vs registry earliest 2026-09-15
  // 'sup-003' REMOVED — it was a contradiction only against the deleted
  // COMPLIANCE_ITEMS. The registry covers sup-002/005/007 (the three tenants),
  // so sup-003 makes no compliance claim and cannot disagree. Leaving the entry
  // would assert a live contradiction that no surface produces.
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
// The registry stores TRANSITION-states only (law 0.5) — 'Missing' | 'Under
// Review' | 'Valid'; clock decay is a read projection and never appears here,
// so there is no 'Expiring'/'Expired' case to fold in on this surface.
const fromLifecycleState = (s: string): Certified =>
  s === 'Valid' ? 'yes' : s === 'Missing' ? 'no' : 'unknown';
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

  // Surface C — compliance registry (id-keyed at the source; no name join).
  // Halal cert types only: the BPOM/ISO/OTHER rows make no halal claim.
  //
  // ── THE GRAIN CHANGED, SO THE FOLD IS NEW ───────────────────────────────────
  //   COMPLIANCE_ITEMS was one halal row per supplier, so a row WAS the surface's
  //   claim. The registry's grain is supplier × material × certificate, so one
  //   supplier holds SEVERAL halal certs at once — by design (the MUI→BPJPH
  //   transition means holding both is correct, and a portfolio legitimately
  //   mixes Valid and Missing per material). Pushing each row as its own claim
  //   makes `contradiction` compare a supplier against ITSELF and report a
  //   defect for a correctly-modelled portfolio. So the surface is folded to ONE
  //   claim per supplier before comparison:
  //     · certified — any Valid ⇒ yes; else any Missing ⇒ no; else unknown.
  //     · expiry    — the EARLIEST dated expiry among Valid halal certs: the date
  //                   the supplier's halal cover actually starts to lapse. A
  //                   permanent-basis cert (expiryDate null) contributes no date.
  //     · issuer    — ABSTAINS (null). Across a portfolio the surface makes no
  //                   single-scheme claim; holding BPJPH and MUI-legacy together
  //                   is the modelled reality, not a disagreement.
  const halalRows = (await svc.risk.getComplianceRegistry(buyerScope)).items.filter((e) =>
    e.certType.startsWith('HALAL'),
  );
  const bySupplier = new Map<string, typeof halalRows>();
  for (const e of halalRows) bySupplier.set(e.supplierId, [...(bySupplier.get(e.supplierId) ?? []), e]);
  for (const [id, rows] of bySupplier) {
    const states = rows.map((e) => fromLifecycleState(e.lifecycleState));
    const certified: Certified = states.includes('yes')
      ? 'yes'
      : states.includes('no')
        ? 'no'
        : 'unknown';
    const validExpiries = rows
      .filter((e) => fromLifecycleState(e.lifecycleState) === 'yes' && e.expiryDate)
      .map((e) => e.expiryDate as string)
      .sort();
    push(id, {
      surface: 'compliance',
      certified,
      issuer: null,
      expiry: certified === 'yes' ? (validExpiries[0] ?? null) : null,
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
  // Was: "every buyer-compliance Halal row keys onto a real supplierId (name→id
  // resolves)" — it proved the NAME JOIN landed. There is no name join now, so
  // the honest successor asserts the FK itself: every registry row's supplierId
  // must resolve to a real supplier, or the reconciliation the DTO-v2 promises
  // is not actually wired. A dangling FK is the same break, one layer down.
  it('every compliance-registry row keys onto a real supplierId (the FK resolves)', async () => {
    const ids = new Set((await svc.suppliers.list(buyerScope)).items.map((s) => s.id));
    const rows = (await svc.risk.getComplianceRegistry(buyerScope)).items;
    const dangling = rows.filter((e) => !ids.has(e.supplierId)).map((e) => `${e.id}→${e.supplierId}`);
    expect(dangling, `registry rows with an unresolvable supplierId: ${dangling.join(', ')}`).toEqual([]);
    // Non-vacuous: the registry must actually carry halal rows to reconcile.
    expect(rows.filter((e) => e.certType.startsWith('HALAL')).length).toBeGreaterThan(0);
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
