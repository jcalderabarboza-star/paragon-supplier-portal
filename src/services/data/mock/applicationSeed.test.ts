// ────────────────────────────────────────────────────────────────────────────
// B2 · THE APPLICATION SEED — grown, not written.
//
// The whole value of this seed is that the rows it produces are
// INDISTINGUISHABLE from rows a person produced, because they went through the
// same verb. So the assertions here are about PROVENANCE, not about count: a
// row with a store-minted number, a session-derived attribution, and a state
// the machine put it in.
//
// ⚠️ **THE POPULATION GUARD IS FIRST AND IT IS NOT DECORATION.** This store
// seeds EMPTY, so every "no row is malformed" assertion below passes vacuously
// over `[]` — the `EMPTY-INPUT-REPORTS-CLEAN-01` shape in its purest form.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { seedSupplierApplications } from './applicationSeed';
import { supplierApplicationStore } from './stores/supplierApplicationStore';
import { MockCommandService } from './MockCommandService';
import { NO_PERSON } from '../../../context/noPerson';
import { APPLICATION_REQUEST_TYPES } from '../../transitions/flows/supplierApplication.flow';

const commands = new MockCommandService();

beforeEach(() => supplierApplicationStore.reset());

describe('POPULATION GUARD', () => {
  it('the store starts EMPTY, so a row afterwards was produced by the seed', () => {
    expect(supplierApplicationStore.all()).toEqual([]);
  });
});

describe('the seed grows rows through the real verb', () => {
  it('every row is Submitted, store-numbered, and attributed from the session', async () => {
    const outcome = await seedSupplierApplications(commands);
    expect(outcome.status).toBe('seeded');

    const rows = supplierApplicationStore.all();
    expect(rows.length).toBeGreaterThan(1);
    for (const r of rows) {
      // The machine put it here — no seed walks it further.
      expect(r.status).toBe('Submitted');
      expect(r.reviewStartedAt).toBeNull();
      expect(r.decidedAt).toBeNull();
      expect(r.decidedBy).toBeNull();
      expect(r.rejectionReason).toBeNull();
      // Store-minted identity, never chosen by the caller.
      expect(r.id).toMatch(/^app-\d{4}$/);
      expect(r.applicationNumber).toMatch(/^APP-2026-\d{4}$/);
      // Attribution from the scope, which is the honest unattributed state.
      expect(r.submittedBy).toEqual(NO_PERSON);
      // An applicant is not a tenant.
      expect(r.supplierId).toBeNull();
    }
    expect(outcome.applicationNumbers).toEqual(rows.map((a) => a.applicationNumber).reverse());
  });

  it('⚠️ IT TOUCHES NO ROSTER — every seeded request type is vendor-free', async () => {
    // The s4Vendor roster mismatch is B3's precondition (`BP-10001234` on the
    // roster against a `1000456`-shaped field). Seeding an extension request
    // would bake one side of an unreconciled identifier space into the
    // demonstration data, so the seed uses only the two types that resolve
    // against nothing.
    await seedSupplierApplications(commands);
    for (const r of supplierApplicationStore.all()) {
      expect(APPLICATION_REQUEST_TYPES as readonly string[]).toContain(r.requestType);
      expect(r.requestType).not.toBe('Internal SR');
      expect(r.resolvedSupplierId).toBeNull();
      expect(r.s4Vendor).toBeNull();
    }
  });

  it('declarations are carried as CLAIMS, with no verification vocabulary', async () => {
    await seedSupplierApplications(commands);
    const withDocs = supplierApplicationStore
      .all()
      .filter((a) => a.declarations.length > 0);
    // Membership before the property — a filter that returned nothing would
    // make the loop below assert over an empty list.
    expect(withDocs.length).toBeGreaterThan(0);
    for (const a of withDocs) {
      for (const d of a.declarations) {
        expect(Object.keys(d).sort()).toEqual(['kind', 'reference']);
        expect(d.reference.trim()).not.toBe('');
      }
    }
  });

  it('is idempotent — a second run touches nothing', async () => {
    await seedSupplierApplications(commands);
    const before = supplierApplicationStore.all().map((a) => a.id);

    const again = await seedSupplierApplications(commands);
    expect(again.status).toBe('already-seeded');
    expect(supplierApplicationStore.all().map((a) => a.id)).toEqual(before);
  });
});
