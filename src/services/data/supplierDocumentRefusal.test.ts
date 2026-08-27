// ────────────────────────────────────────────────────────────────────────────
// The refused document — the state the surface exists for.
//
// ⚠️ **WHY THIS FILE ASSERTS MEMBERSHIP AND NEVER A BARE COUNT.** A count over a
// fixture is an instrument that reports clean on an empty array
// (`EMPTY-INPUT-REPORTS-CLEAN-01`), and every gate here would pass vacuously if
// `DOCUMENTS` were ever emptied. Each block therefore names a row it expects to
// FIND before it asserts anything about shape.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockDataService as svc } from './mock/mockDataService';
import type { QueryScope, SupplierDocument } from './types';
import { DOCUMENTS } from './mock/fixtures/supplierDocuments';
import { PERSONA_SYSTEM_ROLES } from '../transitions/businessRoles';

const A = 'sup-007';
const B = 'sup-002';
const C = 'sup-005';
const sup = (id: string): QueryScope => ({
  personaType: 'supplier',
  supplierId: id,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
});
const buyerScope: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
};

/** The co-presence predicate the DTO comment promises, in one place so the
 *  render and the fixture cannot drift onto two different definitions. */
const isCompleteRefusal = (d: SupplierDocument): boolean =>
  d.status === 'Rejected' &&
  typeof d.rejectionReason === 'string' &&
  d.rejectionReason.trim().length > 0 &&
  typeof d.rejectedAt === 'string' &&
  d.rejectedAt.trim().length > 0 &&
  d.rejectedBy !== undefined;

describe('the seeded refusal — exactly one, and complete', () => {
  it('population is non-vacuous before anything is asserted about it', () => {
    // The control `EMPTY-INPUT-REPORTS-CLEAN-01` demands: if this line ever
    // fails, every other expectation in this file was measuring nothing.
    expect(DOCUMENTS.length).toBeGreaterThan(1);
    expect(DOCUMENTS.map((d) => d.id)).toContain('doc-012');
  });

  it('exactly ONE row carries Rejected — one proves the render, two are furniture', () => {
    const refused = DOCUMENTS.filter((d) => d.status === 'Rejected');
    expect(refused.map((d) => d.id)).toEqual(['doc-012']);
  });

  it('the refusal carries a reason, a timestamp, and an attribution', () => {
    const row = DOCUMENTS.find((d) => d.id === 'doc-012')!;
    expect(isCompleteRefusal(row)).toBe(true);
    expect(row.rejectionReason).toMatch(/PK-PETB-8810/);
    expect(Number.isNaN(Date.parse(row.rejectedAt!))).toBe(false);
  });

  it('the attribution is UNATTRIBUTED — this tree cannot name a person', () => {
    const row = DOCUMENTS.find((d) => d.id === 'doc-012')!;
    // C10 §5.2 / D-ID-3. If a later batch resolves identity, THIS is the test
    // that must be changed deliberately rather than a surface quietly gaining
    // a name it was never given.
    expect(row.rejectedBy).toEqual({
      kind: 'UNATTRIBUTED',
      reason: 'NO_PERSON_IN_SESSION',
    });
  });

  // ⚠️ **THE GUARD IS PROBED IN BOTH DIRECTIONS.** Rule 4: a predicate that
  // rejects the bad input proves nothing until a known-GOOD input is shown to
  // pass it. Both halves run against the same shape, so neither can be believed
  // alone.
  it('co-presence: the real row PASSES and every half-populated variant FAILS', () => {
    const good = DOCUMENTS.find((d) => d.id === 'doc-012')!;
    expect(isCompleteRefusal(good)).toBe(true); // known-GOOD

    const halves: SupplierDocument[] = [
      { ...good, rejectionReason: undefined },
      { ...good, rejectedAt: undefined },
      { ...good, rejectedBy: undefined },
      { ...good, rejectionReason: '   ' },
      { ...good, status: 'Valid' },
    ];
    for (const bad of halves) expect(isCompleteRefusal(bad)).toBe(false); // known-BAD
  });

  it('no OTHER document carries refusal fields it has no state for', () => {
    const strays = DOCUMENTS.filter(
      (d) =>
        d.status !== 'Rejected' &&
        (d.rejectionReason !== undefined ||
          d.rejectedAt !== undefined ||
          d.rejectedBy !== undefined),
    );
    expect(strays.map((d) => d.id)).toEqual([]);
  });
});

describe('isolation AT THE READ — the refused row is the owner’s alone', () => {
  // ⚠️ The mechanism is `applySupplierScope` (`services/data/scoping.ts`), called
  // inside `getDocuments`, keyed on `scope.supplierId` which `useServiceQuery`
  // derives from IDENTITY and never from the URL. It fails CLOSED: a supplier
  // scope with no supplierId returns []. This block proves the read, not the verb.
  it('sup-007 reads its own refusal', async () => {
    const items = (await svc.procurement.getDocuments(sup(A))).items;
    expect(items.map((d) => d.id)).toContain('doc-012');
    expect(items.every((d) => d.supplierId === A)).toBe(true);
  });

  it('NO other supplier can reach it — and their reads are non-empty', async () => {
    for (const other of [B, C]) {
      const items = (await svc.procurement.getDocuments(sup(other))).items;
      // Non-vacuity first: an empty read would "pass" the isolation assertion
      // while proving nothing at all.
      expect(items.length).toBeGreaterThan(0);
      expect(items.map((d) => d.id)).not.toContain('doc-012');
      expect(items.some((d) => d.status === 'Rejected')).toBe(false);
    }
  });

  it('fails CLOSED — a supplier scope with no supplierId reads nothing', async () => {
    const items = (
      await svc.procurement.getDocuments({
        personaType: 'supplier',
        supplierId: null,
        businessRoles: PERSONA_SYSTEM_ROLES.supplier,
      })
    ).items;
    expect(items).toEqual([]);
  });

  it('the buyer sees it, as the cross-supplier superset', async () => {
    const items = (await svc.procurement.getDocuments(buyerScope)).items;
    expect(items.map((d) => d.id)).toContain('doc-012');
  });
});
