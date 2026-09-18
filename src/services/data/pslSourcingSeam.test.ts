// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE P2 SEAM — CALLABLE FROM A POLICY HOOK, AND BLIND TO PUBLICATION.
//
// ⚠️ **THE POINT OF THIS FILE IS THE `@vitest-environment node` LINE ABOVE AND
// THE ABSENCE OF EVERY PROVIDER BELOW.** There is no `renderWithProviders`, no
// QueryClient, no React, no `useDataService`. If `pslStatusFor` ever acquires a
// react-query dependency this file stops compiling or stops running — which is
// the only way to hold a "usable from a policy hook" claim, because a hook has
// none of those things and cannot be given them.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import { DECLARED_PRESENT } from './fixturePresent';
import { PSL_LISTINGS } from './mock/fixtures/pslListings';
import { pslStatusFor, suspendsCompetitiveBidding } from './pslSourcingSeam';
import type { PslListing } from './pslListing';

const MS = 86_400_000;
const at = (n: number): string =>
  new Date(Date.parse(DECLARED_PRESENT) + n * MS).toISOString();

const byId = (id: string): PslListing => PSL_LISTINGS.find((r) => r.id === id)!;

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the seam has a real corpus and reaches all three verdicts', () => {
  it('the default corpus is the shipped one and is non-empty', () => {
    expect(PSL_LISTINGS.length).toBeGreaterThan(5);
  });

  it('⚠️ all three `kind`s are reached by NAMED suppliers at the declared present', () => {
    expect(pslStatusFor('sup-002', null, DECLARED_PRESENT).kind).toBe('IN_FORCE');
    // sup-007 holds three listings and not one is in force (Withdrawn /
    // Rejected / Proposed) — the case a boolean seam could not express.
    expect(pslStatusFor('sup-007', null, DECLARED_PRESENT).kind).toBe('LAPSED');
    // sup-001 is a real roster member that holds nothing.
    expect(pslStatusFor('sup-001', null, DECLARED_PRESENT).kind).toBe('NOT_LISTED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE SHAPE A POLICY HOOK NEEDS', () => {
  it('⚠️ it is callable with NOTHING but plain values — no context, no await', () => {
    // This is the assertion written in the shape a `PolicyHookFn` would use it.
    // A hook receives one ctx of plain data and returns synchronously; nothing
    // below is async, and no provider is in scope in this file.
    const ctx = {
      entityId: 'RFQ-2026-0001',
      payload: { supplierId: 'sup-002', materialCode: 'RM-PSTN-7150' } as Record<
        string,
        unknown
      >,
    };
    const supplierId = String(ctx.payload.supplierId);
    const materialCode = String(ctx.payload.materialCode);
    const standing = pslStatusFor(supplierId, { materialCode }, DECLARED_PRESENT);
    const verdict = suspendsCompetitiveBidding(standing)
      ? { ok: false, reason: 'PSL_SUSPENDS_BIDDING' }
      : { ok: true };

    expect(standing.kind).toBe('IN_FORCE');
    expect(verdict).toEqual({ ok: false, reason: 'PSL_SUSPENDS_BIDDING' });
    // and it really is synchronous — not a promise wearing a value's clothes.
    expect(standing).not.toBeInstanceOf(Promise);
  });

  it('the corpus is a DEFAULTED PARAMETER — a caller may pass its own rows', () => {
    const synthetic: PslListing[] = [{ ...byId('psl-001'), supplierId: 'sup-999' }];
    expect(pslStatusFor('sup-999', null, DECLARED_PRESENT).kind).toBe('NOT_LISTED');
    expect(pslStatusFor('sup-999', null, DECLARED_PRESENT, synthetic).kind).toBe('IN_FORCE');
  });

  it('the instant is INJECTED — the same query answers differently across time', () => {
    expect(pslStatusFor('sup-002', null, DECLARED_PRESENT).kind).toBe('IN_FORCE');
    // Far enough forward that every sup-002 listing has lapsed.
    expect(pslStatusFor('sup-002', null, at(2000)).kind).toBe('LAPSED');
    // and far enough back that nothing has started.
    expect(pslStatusFor('sup-002', null, at(-4000)).kind).toBe('LAPSED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('SCOPE NARROWING', () => {
  it('a material code narrows to the listings that cover it', () => {
    const covered = pslStatusFor(
      'sup-002',
      { materialCode: 'RM-PSTN-7150' },
      DECLARED_PRESENT,
    );
    expect(covered.kind).toBe('IN_FORCE');
    if (covered.kind === 'IN_FORCE') expect(covered.status).toBe('Sole Source');
  });

  it('⚠️ a code the supplier is listed for, but NOT under its Sole Source row', () => {
    // sup-002's Validated row covers RM-MYRST-7310. Narrowed, the answer must
    // be `Validated` — NOT the `Sole Source` the unnarrowed query returns.
    // Without this, a scope argument that silently did nothing would pass.
    const narrowed = pslStatusFor(
      'sup-002',
      { materialCode: 'RM-MYRST-7310' },
      DECLARED_PRESENT,
    );
    expect(narrowed.kind).toBe('IN_FORCE');
    if (narrowed.kind === 'IN_FORCE') expect(narrowed.status).toBe('Validated');
  });

  it('a code nobody is listed for is NOT_LISTED, not LAPSED', () => {
    expect(
      pslStatusFor('sup-002', { materialCode: 'PK-CART-9901' }, DECLARED_PRESENT).kind,
    ).toBe('NOT_LISTED');
  });

  it('⚠️ a non-material scope is EXCLUDED from a narrowed query, never widened', () => {
    // `group` / `category` have no producer in P1. A build that cannot
    // interpret a listing's scope must not let it grant anything — silently
    // widening is the direction that costs.
    const groupScoped: PslListing[] = [
      { ...byId('psl-001'), scope: { kind: 'group', group: 'MG-02' } },
    ];
    expect(
      pslStatusFor('sup-002', { materialCode: 'RM-PSTN-7150' }, DECLARED_PRESENT, groupScoped)
        .kind,
    ).toBe('NOT_LISTED');
    // and unnarrowed it is still visible — excluded from MATCHING, not deleted.
    expect(pslStatusFor('sup-002', null, DECLARED_PRESENT, groupScoped).kind).toBe('IN_FORCE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE SEAM IGNORES PUBLICATION — P2 must not inherit the wrong premise', () => {
  it('the SAME row, published and unpublished, gives the SAME verdict', () => {
    const base = byId('psl-001');
    const internal: PslListing = { ...base, publishedAt: null, publishedBy: null };
    const published: PslListing = {
      ...base,
      publishedAt: at(-5),
      publishedBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
    };
    const a = pslStatusFor(base.supplierId, null, DECLARED_PRESENT, [internal]);
    const b = pslStatusFor(base.supplierId, null, DECLARED_PRESENT, [published]);
    expect(a.kind).toBe('IN_FORCE');
    expect(b.kind).toBe('IN_FORCE');
    expect(a).toEqual({ ...b, listings: a.kind === 'IN_FORCE' ? a.listings : [] });
    expect(suspendsCompetitiveBidding(a)).toBe(suspendsCompetitiveBidding(b));
  });

  it('⚠️ AN UNPUBLISHED IN-FORCE LISTING STILL SUSPENDS BIDDING', () => {
    // The expensive direction of the conflation, asserted by name: if the gate
    // ever required publication, a Sole Source supplier nobody had pressed
    // publish on would be quietly opened to a competitive event.
    const unpublished: PslListing = {
      ...byId('psl-001'),
      publishedAt: null,
      publishedBy: null,
    };
    expect(unpublished.publishedAt).toBeNull();
    const standing = pslStatusFor('sup-002', null, DECLARED_PRESENT, [unpublished]);
    expect(suspendsCompetitiveBidding(standing)).toBe(true);
  });

  it('a published but EXPIRED listing suspends nothing — the other axis still bites', () => {
    const expiredPublished = byId('psl-003');
    expect(expiredPublished.publishedAt).not.toBeNull();
    const standing = pslStatusFor('sup-002', null, DECLARED_PRESENT, [expiredPublished]);
    expect(standing.kind).toBe('LAPSED');
    expect(suspendsCompetitiveBidding(standing)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('suspendsCompetitiveBidding — the policy`s own split', () => {
  it('Sole Source and Mandatory suspend it; Validated does not', () => {
    const live = { validFrom: at(-10), validUntil: at(400) };
    const mk = (status: PslListing['status']): PslListing[] => [
      { ...byId('psl-001'), status, ...live, supplierId: 'sup-x' },
    ];
    for (const [status, expected] of [
      ['Sole Source', true],
      ['Mandatory', true],
      ['Validated', false],
    ] as const) {
      const s = pslStatusFor('sup-x', null, DECLARED_PRESENT, mk(status));
      expect(suspendsCompetitiveBidding(s), status).toBe(expected);
    }
  });

  it('LAPSED and NOT_LISTED never suspend it', () => {
    expect(
      suspendsCompetitiveBidding(pslStatusFor('sup-007', null, DECLARED_PRESENT)),
    ).toBe(false);
    expect(
      suspendsCompetitiveBidding(pslStatusFor('sup-001', null, DECLARED_PRESENT)),
    ).toBe(false);
  });
});
