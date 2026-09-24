// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// PSL P4 · THE SANCTIONED SUPPLIER READ — THE DATA-LEVEL HALF OF THE GUARD.
//
// `pslNoSupplierRead.test.ts` walks IMPORT CLOSURES and its claim is unchanged
// by P4: no supplier surface reaches any PSL module. That claim is about CODE.
// It says nothing about what a service hands a supplier, and P4 creates the
// first read that hands them anything — so this file is the other half.
//
// ── ⚠️ THE POPULATION IS DERIVED ABOVE THE PREDICATE UNDER TEST (§86) ──────
//   `ownerlessScope.test.ts` first derived "which targets are owner-less?" by
//   asking the dispatcher — the very predicate it was probing — so mutating
//   that predicate collapsed the POPULATION to empty and the suite went red on
//   its own control while the assertion never executed. A counter watching
//   pass/fail scores that as a kill.
//
//   So every population here comes from `pslStore.all()` and `mockSuppliers`,
//   which sit ABOVE `getMyPslListings` and are identical under the shipped code
//   and under every mutant. The expectations are NAMED IDS, never counts: a
//   count is satisfied by the wrong match.
//
// ── ⚠️ AND THE TWO FILTERS ARE PROBED SEPARATELY, BECAUSE THEY ARE TWO ─────
//   Tenancy and publication are independent statements in the service. A row
//   that is another supplier's AND unpublished would be excluded by either one,
//   so a test built only on such a row cannot tell which filter is working.
//   The controls below are chosen so each is refuted by exactly one filter:
//     · `psl-002` is sup-002's OWN row and is UNPUBLISHED → only publication.
//     · `psl-004` is sup-005's PUBLISHED row → only tenancy.
//   Their existence with those exact properties is asserted first; if the
//   corpus ever stops carrying them, this file says so instead of passing
//   vacuously (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';

import { mockSuppliers } from '../../data/mockSuppliers';
import { MockProcurementService } from './mock/MockProcurementService';
import { seedPslListings } from './mock/pslSeed';
import { pslStore } from './mock/stores/pslStore';
import { DECLARED_PRESENT } from './fixturePresent';
import { isPublished, type PslListing } from './pslListing';
import { pslDisplayStatus, pslScopeCodes } from './pslProjection';
import { toSupplierPslView } from './pslSupplierView';
import type { QueryScope } from './types';

const svc = new MockProcurementService();

const supplierScope = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
});

const BUYER_SCOPE: QueryScope = { personaType: 'buyer', supplierId: null };

/** Every listing in the store — the population, read ABOVE the service. */
const rows = (): readonly PslListing[] => pslStore.all();

beforeAll(async () => {
  const outcome = await seedPslListings();
  expect(['seeded', 'already-seeded'], outcome.reason ?? '').toContain(outcome.status);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the instrument is looking at a real corpus', () => {
  it('⚠️ THE POPULATION IS NON-EMPTY AND CARRIES BOTH PUBLICATION STATES', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: an empty store would let every assertion
    // below pass over nothing, and "no supplier saw a foreign row" is trivially
    // true when there are no rows.
    expect(rows().length).toBeGreaterThan(5);
    expect(rows().filter(isPublished).length).toBeGreaterThan(0);
    expect(rows().filter((r) => !isPublished(r)).length).toBeGreaterThan(0);
  });

  it('⚠️ THE TWO CONTROL ROWS EXIST WITH THE PROPERTIES THAT MAKE THEM CONTROLS', () => {
    const own = rows().find((r) => r.id === 'psl-002');
    expect(own, 'psl-002 must exist to control the PUBLICATION filter').toBeDefined();
    expect(own!.supplierId).toBe('sup-002');
    expect(isPublished(own!), 'psl-002 must be UNPUBLISHED').toBe(false);

    const foreign = rows().find((r) => r.id === 'psl-004');
    expect(foreign, 'psl-004 must exist to control the TENANCY filter').toBeDefined();
    expect(foreign!.supplierId).toBe('sup-005');
    expect(isPublished(foreign!), 'psl-004 must be PUBLISHED').toBe(true);
  });

  it('⚠️ THE DEFAULT SUPPLIER SEAT HOLDS PUBLISHED ROWS — the surface is not empty', () => {
    // The seat `SidebarV2` and `Login` both seed. Before P4 this was ZERO and
    // the first supplier view would have photographed an empty state and looked
    // correct doing it.
    const seat = rows().filter((r) => r.supplierId === 'sup-007' && isPublished(r));
    expect(seat.map((r) => r.id).sort()).toEqual(['psl-010', 'psl-011']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ TENANCY — a supplier reads its OWN rows and no other supplier\'s', () => {
  it('every roster supplier gets only rows it owns, over all 12', async () => {
    // The roster is DERIVED, not listed: a thirteenth supplier is covered the
    // day it is added.
    expect(mockSuppliers.length).toBeGreaterThan(10);
    for (const s of mockSuppliers) {
      const page = await svc.getMyPslListings(supplierScope(s.id));
      const expected = rows()
        .filter((r) => r.supplierId === s.id && isPublished(r))
        .map((r) => toSupplierPslView(r, DECLARED_PRESENT).viewKey)
        .sort();
      expect(page.items.map((v) => v.viewKey).sort(), s.id).toEqual(expected);
    }
  });

  it('⚠️ KNOWN-BAD — sup-005\'s PUBLISHED psl-004 never reaches sup-002', async () => {
    const page = await svc.getMyPslListings(supplierScope('sup-002'));
    const foreign = rows().find((r) => r.id === 'psl-004')!;
    const foreignKey = toSupplierPslView(foreign, DECLARED_PRESENT).viewKey;
    expect(page.items.map((v) => v.viewKey)).not.toContain(foreignKey);
  });

  it('⚠️ KNOWN-GOOD — sup-002 DOES get its own published rows, by name', async () => {
    // Without this the test above is satisfied by a read that returns nothing.
    const page = await svc.getMyPslListings(supplierScope('sup-002'));
    const expected = ['psl-001', 'psl-003'].map(
      (id) => toSupplierPslView(rows().find((r) => r.id === id)!, DECLARED_PRESENT).viewKey,
    );
    expect(page.items.map((v) => v.viewKey).sort()).toEqual([...expected].sort());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ PUBLICATION (R5) — an INTERNAL listing never reaches its subject', () => {
  it('no supplier ever receives a row that is not published', async () => {
    const unpublishedKeys = new Set(
      rows()
        .filter((r) => !isPublished(r))
        .map((r) => toSupplierPslView(r, DECLARED_PRESENT).viewKey),
    );
    expect(unpublishedKeys.size).toBeGreaterThan(0);
    for (const s of mockSuppliers) {
      const page = await svc.getMyPslListings(supplierScope(s.id));
      for (const v of page.items) {
        expect(unpublishedKeys.has(v.viewKey), `${s.id} saw an unpublished listing`).toBe(
          false,
        );
      }
    }
  });

  it('⚠️ KNOWN-BAD — sup-002\'s OWN unpublished psl-002 is absent', async () => {
    const page = await svc.getMyPslListings(supplierScope('sup-002'));
    const own = rows().find((r) => r.id === 'psl-002')!;
    const ownKey = toSupplierPslView(own, DECLARED_PRESENT).viewKey;
    expect(page.items.map((v) => v.viewKey)).not.toContain(ownKey);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ PERSONA — the read answers nobody it was not built for', () => {
  it('a BUYER scope reads []', async () => {
    const page = await svc.getMyPslListings(BUYER_SCOPE);
    expect(page.items).toEqual([]);
  });

  it('⚠️ KNOWN-GOOD CONTROL — the buyer read is NOT empty in the same run', async () => {
    // Otherwise "the buyer gets nothing" is a statement about an empty store.
    const buyer = await svc.getPslListings(BUYER_SCOPE);
    expect(buyer.items.length).toBeGreaterThan(0);
  });

  it('a supplier scope with no supplierId reads []', async () => {
    const page = await svc.getMyPslListings({ personaType: 'supplier', supplierId: null });
    expect(page.items).toEqual([]);
  });

  it('⚠️ A BUYER SCOPE CARRYING A supplierId STILL READS [] — the persona gate alone', async () => {
    // ⚠️ **THIS CASE EXISTS BECAUSE A MUTATION PROBE PROVED THE PERSONA GATE
    // WAS UNKILLABLE WITHOUT IT.** The ordinary buyer scope has
    // `supplierId: null`, so deleting step 1 left step 2 to refuse it and the
    // probe came back SURVIVED — the read stated a persona rule it was not
    // holding. A buyer scope that DOES name a supplier separates the two, and
    // it is the shape the persona gate actually defends against: a caller that
    // has a tenant id to hand and the wrong persona to use it.
    const page = await svc.getMyPslListings({ personaType: 'buyer', supplierId: 'sup-002' });
    expect(page.items).toEqual([]);
    // KNOWN-GOOD in the same run: the SAME supplier id under the right persona
    // is answered, so this is a statement about the persona and not about
    // sup-002.
    const asSupplier = await svc.getMyPslListings(supplierScope('sup-002'));
    expect(asSupplier.items.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ DISCLOSURE (R-B) — the hidden fields are absent BY VALUE', () => {
  /**
   * ⚠️ **A KEY-NAME SCAN IS NOT THIS TEST.** A hidden field embedded under an
   * innocuous key would pass a key check and leak anyway — which is exactly the
   * shape `pslNoSupplierRead.test.ts` already guards against for listing ids by
   * serialising the record. So the assertion is on the SERIALISED blob and on
   * the VALUES the corpus actually carries.
   */
  /**
   * ⚠️ **A HIDDEN VALUE THAT IS BYTE-EQUAL TO A SHOWN ONE IS NOT CHECKABLE BY A
   * SUBSTRING SCAN, AND PRETENDING OTHERWISE PRODUCES A FALSE ACCUSATION.**
   * Measured on the first run of this file: `psl-004.capDecidedAt` and
   * `psl-004.publishedAt` are the SAME INSTANT to the millisecond — both are
   * store-assigned, and the seed records the cap override and the publication
   * in the same tick. The DTO carries `publishedAt`, which R-B SHOWS; the scan
   * then reported `capDecidedAt leaked` about a payload that does not contain
   * it. That is the `stampOrigin` equality collision (`docs/findings.md`
   * §106g·4) arriving in a new instrument.
   *
   * So a hidden value is checked only where it is DISTINGUISHABLE from every
   * shown value — and the skip is counted, because a guard that silently
   * stopped checking everything would look exactly like a guard that found
   * nothing.
   */
  it('no supplier-facing payload contains any hidden value', async () => {
    let checked = 0;
    let skippedAsIndistinguishable = 0;
    for (const s of mockSuppliers) {
      const page = await svc.getMyPslListings(supplierScope(s.id));
      if (page.items.length === 0) continue;
      const blob = JSON.stringify(page.items);
      // ⚠️ THE SHOWN-SET IS THE WHOLE PAGE'S, NOT ONE ROW'S — and that scope was
      // a second false accusation on the second run of this file. `psl-011`'s
      // ledger instants collided with `psl-010`'s `publishedAt`: both rows are
      // seeded in the same tick and both land in the SAME serialised blob, so a
      // per-row shown-set declared one row's instant "hidden" while the string
      // was legitimately present as the OTHER row's shared-on date. The blob is
      // the unit of the assertion, so the shown-set has to be too.
      const shown = new Set<string>(
        page.items.flatMap((view) => [
          view.status,
          view.displayStatus,
          view.validFrom,
          view.publishedAt,
          view.viewKey,
          ...(view.effectiveUntil === null ? [] : [view.effectiveUntil]),
          ...view.scope.map((x) => x.code),
          ...view.scope.flatMap((x) => (x.label === null ? [] : [x.label])),
        ]),
      );
      for (const r of rows().filter((x) => x.supplierId === s.id && isPublished(x))) {
        const forbid = (value: string | null, what: string): void => {
          if (value === null || value === '') return;
          if (shown.has(value)) {
            skippedAsIndistinguishable += 1;
            return;
          }
          checked += 1;
          expect(blob.includes(value), `${s.id} · ${r.id}: ${what} leaked`).toBe(false);
        };

        // the id — it discloses the size of a corpus spanning every supplier
        forbid(r.id, 'id');
        // the internal prose
        forbid(r.justification, 'justification');
        // the evidence references
        for (const e of r.evidenceRefs) forbid(e, 'evidenceRef');
        // the ledger's reasons, and the instants it was written at.
        // ⚠️ ONE EXCEPTION, NAMED: the WITHDRAWAL instant is deliberately shown
        // (`withdrawnAt`) because the withdrawn sentence would otherwise state
        // a date the listing was not withdrawn on. Every OTHER ledger instant,
        // and every reason without exception, stays hidden.
        const shownWithdrawal = toSupplierPslView(r, DECLARED_PRESENT).withdrawnAt;
        for (const h of r.statusHistory) {
          forbid(h.reason, 'history reason');
          if (h.at !== shownWithdrawal) forbid(h.at, 'history instant');
        }
        // the cap fields
        forbid(r.capJustification, 'capJustification');
        forbid(r.capDecidedAt, 'capDecidedAt');
        forbid(r.capDaysOverride === null ? null : String(r.capDaysOverride), 'capDaysOverride');
        // the AUTHORED end date, wherever it is its own string
        forbid(r.validUntil, 'authored validUntil');
      }
    }
    // ⚠️ ANTI-VACUITY. The loop must have made REAL checks, not merely skipped
    // everything as indistinguishable — the failure mode this file would
    // otherwise develop silently the day a shown field grew.
    expect(checked, 'every hidden value was skipped — the guard checked nothing').toBeGreaterThan(
      20,
    );
    // And the skip path must itself be exercised, or the collision this comment
    // documents has quietly stopped happening and the reasoning above is stale.
    expect(skippedAsIndistinguishable).toBeGreaterThan(0);
  });

  it('⚠️ THE AUTHORED validUntil IS HIDDEN WHERE IT DIFFERS FROM THE EFFECTIVE ONE', async () => {
    // The pre-cap number must never read as an entitlement. Asserting it on a
    // row where the two AGREE would prove nothing, so the row is chosen for
    // disagreement and the choice is asserted.
    const capped = rows().filter(
      (r) => isPublished(r) && r.validUntil.slice(0, 10) !== r.validFrom.slice(0, 10),
    );
    const divergent = capped.filter((r) => {
      const view = toSupplierPslView(r, DECLARED_PRESENT);
      return view.effectiveUntil !== r.validUntil.slice(0, 10);
    });
    expect(
      divergent.length,
      'no published row has a capped end date — this spec would be vacuous',
    ).toBeGreaterThan(0);
    for (const r of divergent) {
      const page = await svc.getMyPslListings(supplierScope(r.supplierId));
      expect(JSON.stringify(page.items).includes(r.validUntil.slice(0, 10))).toBe(false);
    }
  });

  it('⚠️ THE WITHDRAWN DATE IS THE WITHDRAWAL, NOT THE VALIDITY END', () => {
    // ⚠️ **THE FIRST DRAFT PUT `effectiveUntil` IN THAT SENTENCE AND BROWSER QA
    // READ IT BACK AS A FUTURE DATE** — *"withdrawn on 19 Mar 2027"*, on a
    // listing already stopped. This pins the two apart: if they were equal the
    // assertion would prove nothing, so the difference is asserted first.
    const row = rows().find((r) => r.id === 'psl-011')!;
    expect(row.lifecycle).toBe('Withdrawn');
    const v = toSupplierPslView(row, DECLARED_PRESENT);
    expect(v.withdrawnAt).not.toBeNull();
    expect(v.withdrawnAt).not.toBe(v.effectiveUntil);
    // It IS the ledger's withdrawal entry, by value.
    const entry = [...row.statusHistory].reverse().find((h) => h.lifecycle === 'Withdrawn')!;
    expect(v.withdrawnAt).toBe(entry.at);
    // KNOWN-BAD control: a row that was never withdrawn carries null.
    const live = rows().find((r) => r.id === 'psl-010')!;
    expect(toSupplierPslView(live, DECLARED_PRESENT).withdrawnAt).toBeNull();
  });

  it('⚠️ AND THE SHOWN FIELDS REALLY ARE SHOWN — the hide list is not a blank page', () => {
    const r = rows().find((x) => x.id === 'psl-001')!;
    const v = toSupplierPslView(r, DECLARED_PRESENT);
    expect(v.status).toBe(r.status);
    expect(v.validFrom).toBe(r.validFrom);
    expect(v.publishedAt).toBe(r.publishedAt);
    expect(v.scope.map((x) => x.code)).toEqual([...pslScopeCodes(r)]);
    expect(v.effectiveUntil).not.toBeNull();
    expect(v.displayStatus).toBe(pslDisplayStatus(r, DECLARED_PRESENT));
  });

  it('⚠️ THE SCOPE CARRIES LABELS, AND A LABEL IS NOT THE CODE ECHOED BACK', () => {
    const r = rows().find((x) => x.id === 'psl-010')!;
    const v = toSupplierPslView(r, DECLARED_PRESENT);
    expect(v.scope.length).toBeGreaterThan(1);
    for (const item of v.scope) {
      expect(item.label, item.code).not.toBeNull();
      expect(item.label).not.toBe(item.code);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE CLOCK — the projection is decided by the INJECTED instant', () => {
  it('a row that is Expiring at P is Expired far enough past it, and Scheduled before it', () => {
    // The probe that convicted the projection's first draft: a validity has two
    // ends, and reading one of them is not reading it.
    const r = rows().find((x) => x.id === 'psl-010')!;
    expect(toSupplierPslView(r, DECLARED_PRESENT).displayStatus).toBe('Expiring');

    const past = new Date(Date.parse(r.validFrom) - 40 * 86400000).toISOString().slice(0, 10);
    expect(toSupplierPslView(r, past).displayStatus).toBe('Scheduled');

    const future = new Date(Date.parse(r.validUntil) + 40 * 86400000)
      .toISOString()
      .slice(0, 10);
    expect(toSupplierPslView(r, future).displayStatus).toBe('Expired');
  });

  it('⚠️ NOTHING CLOCK-PROJECTED IS STORED — the stored row carries no display word', () => {
    for (const r of rows()) {
      const blob = JSON.stringify(r);
      for (const word of ['Expiring', 'Expired', 'Scheduled'])
        expect(blob.includes(`"${word}"`), `${r.id} stores ${word}`).toBe(false);
    }
    // Control: a word that IS stored must be findable by the same instrument.
    expect(JSON.stringify(rows().find((r) => r.lifecycle === 'Listed')!)).toContain('"Listed"');
  });
});
