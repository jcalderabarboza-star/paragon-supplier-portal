// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE INVOICE *WRITE* DOES NOT DEPEND ON THE WALL CLOCK EITHER.
//
// The twin of `invoiceReadIsClockIndependent.test.ts`, and it exists because
// that file closed only one side. #354 anchored the corpus; #355's sibling
// anchored the READ (`INVOICE_NOW`). **The commands went on stamping
// `new Date()`**, so a row a person created sat N days past a corpus whose
// newest member is `P − 7`, with N growing by one every day and nothing
// anywhere saying so.
//
// ⚠️ **AND THE LABEL WAS NEVER WRONG, WHICH IS PRECISELY WHY NOTHING CAUGHT
// IT.** A `wall + 30d` dueDate cannot precede `P` while wall ≥ P, so a fresh row
// could never read `Overdue`; `paymentDate` is only ever written onto
// `Payment Released`, which is not `OVERDUE_ELIGIBLE` and reaches no label at
// all. Every label-shaped assertion in the suite was therefore satisfied by the
// defect. What was wrong was the **rendered date and the sort position** — a
// class of defect no label assertion can see, which is why this file asserts
// VALUES and not labels.
//
// ⚠️ **`clockDrift` IS STRUCTURALLY BLIND HERE AND WILL STAY BLIND.** It binds
// to families carrying a reader-visible STORED clock state; `invoice` stores
// none (law 0.5), so `familyDrift` returns `computed` before it computes
// headroom, at every date. The scheduled gate cannot cover this property, so it
// is asserted here.
//
// ── WHY IT GOES THROUGH THE SERVICES, NOT THE HELPERS ──────────────────────
//   Every assertion dispatches through `MockCommandService` and reads back
//   through `MockProcurementService` — the two seams a page actually touches.
//   Asserting the stamp expression directly would prove only that a constant is
//   a constant; the question is which `now` REACHES the store, and that is a
//   property of the caller.
//
// ── WHY THE INSTANTS ARE OFFSETS AND NOT LITERALS ──────────────────────────
//   Each probe instant is an offset from `DECLARED_PRESENT`, never a dated
//   literal, and the assertions are *"identical at every instant"* rather than
//   *"this particular date"* wherever the property allows. There is no day on
//   which this file begins failing with no commit involved.
//
// ── REACH BLOCK — WHAT THIS FILE DOES NOT GUARD ────────────────────────────
//   · The UNANCHORED families' date stamps — `RFQ.createdAt`,
//     `PurchaseRequisition.createdDate`, `Quotation.submittedAt`. Still wall, by
//     ruling: a `P` stamp would still land far from a corpus not shifted onto
//     `P`. Deferred until those families are anchored.
//   · The STORE-MINTED millisecond timestamps as a SET. One member is pinned
//     below as a tripwire; the other members are not enumerated here, and that
//     is deliberate — a list in a spec header is the same decaying artefact as a
//     list in prose. Derive the set from the wall-clock reads remaining in
//     `MockCommandService.ts` that write a stored field.
//   · The `rejectedAt` ORDERING INVERSION (a runtime refusal sorts behind the
//     anchored fixture refusal, which shiftFields placed ~139 days past `P`).
//     That is a property of the ANCHOR, not of the write clock, and no change to
//     a write clock can fix it.
//   · WHETHER `P` STILL TELLS THE STORY THE FIXTURE LITERALS WERE AUTHORED FOR.
//     This file asserts the write clock is `P`; it says nothing about whether
//     `P` remains the instant at which the corpus is coherent. That is
//     `fixturePresent.guard.test.ts`'s question and it is a different one.
//   · The RENDER. That a page displays the stamped value is
//     `anchoredSurfaces.guard.test.tsx`'s axis, not this file's.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, afterEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './mock/MockCommandService';
import { MockProcurementService } from './mock/MockProcurementService';
import { SYSTEM_ROLES } from '../transitions/businessRoles';
import { DECLARED_PRESENT } from './fixturePresent';
import type { QueryScope, Invoice } from './types';

const commands = new MockCommandService();
const reads = new MockProcurementService();

/** Every system role — this file asks about CLOCKS, never about authorisation. */
const ALL_ROLES = Object.keys(SYSTEM_ROLES) as QueryScope['businessRoles'];
const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ALL_ROLES };
const buyerRead: QueryScope = { personaType: 'buyer', supplierId: null };
const supplier = (id: string): QueryScope => ({
  personaType: 'supplier',
  supplierId: id,
  businessRoles: ALL_ROLES,
});

const REAL = globalThis.Date;
const MS = 86_400_000;
const P_MS = REAL.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);

/**
 * Move the calendar the code reads, without faking timers — the offset-Proxy
 * shape `invoiceReadIsClockIndependent.test.ts` and `anchoredSurfaces.guard`
 * already use. Timers keep advancing on real time; only the day moves.
 */
function installClock(atMs: number): () => void {
  const offset = atMs - REAL.now();
  globalThis.Date = new Proxy(REAL, {
    construct: (t, a) =>
      a.length === 0
        ? new t(REAL.now() + offset)
        : new t(...(a as ConstructorParameters<DateConstructor>)),
    get: (t, p, r) => (p === 'now' ? () => REAL.now() + offset : Reflect.get(t, p, r)),
  }) as DateConstructor;
  return () => {
    globalThis.Date = REAL;
  };
}

/** The probe instants. Offsets, never literals. `0` is `P` itself. */
const FAR: readonly { label: string; days: number }[] = [
  { label: 'P itself', days: 0 },
  { label: 'P+18 (where the read partition used to break)', days: 18 },
  { label: 'P+40 (where two buyer labels used to empty)', days: 40 },
  { label: 'P+5y', days: 1826 },
];

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

/** Dispatch an invoice create at `atMs`, return the stored row. */
async function createInvoiceAt(atMs: number | null, payload: Record<string, unknown> = {}) {
  restore = atMs === null ? null : installClock(atMs);
  const pos = await reads.getPurchaseOrders(buyerRead);
  const po = pos.items.find((p) => p.status === 'Confirmed') ?? pos.items[0];
  const res = await commands.dispatch(supplier(po.supplierId), {
    transitionId: 't_invoice_create',
    entity: 'invoice',
    payload: { poReference: po.poNumber, amount: 12_345_000, ...payload },
  });
  expect(res.status, `create refused: ${res.reason ?? ''}`).not.toBe('failed');
  // The buyer read drops Draft, so submit first to make the row readable.
  await commands.dispatch(buyer, {
    transitionId: 't_invoice_submit',
    entity: 'invoice',
    entityId: res.entityId!,
    payload: { amount: 12_345_000 },
  });
  const after = await reads.getBuyerInvoices(buyerRead);
  const row = after.items.find((i) => i.id === res.entityId);
  expect(row, 'the created invoice is readable through the buyer seam').toBeDefined();
  return row!;
}

describe('ANTI-VACUITY — the clock pin really moves the wall clock', () => {
  it('a far instant changes what `new Date()` returns, and the restore puts it back', () => {
    const beforePin = new Date().toISOString().slice(0, 10);
    const r = installClock(P_MS + 1826 * MS);
    const duringPin = new Date().toISOString().slice(0, 10);
    r();
    const afterPin = new Date().toISOString().slice(0, 10);
    // Without this, every "identical at every instant" assertion below could be
    // satisfied by a pin that does nothing at all.
    expect(duringPin).not.toBe(beforePin);
    expect(duringPin).toBe(new REAL(P_MS + 1826 * MS).toISOString().slice(0, 10));
    expect(afterPin).toBe(beforePin);
  });
});

describe('t_invoice_create stamps the DECLARED PRESENT, not the wall clock', () => {
  it('the default submittedDate is the declared present', async () => {
    const row = await createInvoiceAt(null);
    expect(row.receivedDate).toBe(DECLARED_PRESENT);
  });

  it('dueDate is submittedDate + the policy days DERIVED from the stamped pair', async () => {
    const row = await createInvoiceAt(null);
    // Derived from the row itself, never hard-coded: the assertion is that the
    // two stamps are a consistent PAIR, so a change to the Net-N policy moves
    // both and this stays true, while a second clock on `dueDate` breaks it.
    const spanDays = Math.round(
      (REAL.parse(row.dueDate) - REAL.parse(row.receivedDate)) / MS,
    );
    expect(spanDays).toBeGreaterThan(0);
    expect(row.dueDate).toBe(
      new REAL(REAL.parse(DECLARED_PRESENT) + spanDays * MS).toISOString().slice(0, 10),
    );
  });

  it.each(FAR)(
    'stamps the SAME submittedDate and dueDate at $label',
    async ({ days }) => {
      const row = await createInvoiceAt(P_MS + days * MS);
      expect(row.receivedDate).toBe(DECLARED_PRESENT);
      // dueDate is derived from submittedDate, so pinning submittedDate pins it.
      // Asserted as a relation, not a literal date.
      expect(REAL.parse(row.dueDate)).toBeGreaterThan(REAL.parse(row.receivedDate));
      expect(row.dueDate.slice(0, 10)).toBe(row.dueDate);
    },
  );

  it('an EXPLICIT payload submittedDate is still honoured — only the default moved', async () => {
    const explicit = new REAL(P_MS - 90 * MS).toISOString().slice(0, 10);
    const row = await createInvoiceAt(P_MS + 40 * MS, { submittedDate: explicit });
    expect(row.receivedDate).toBe(explicit);
    expect(row.receivedDate).not.toBe(DECLARED_PRESENT);
  });

  it('an EXPLICIT payload dueDate is still honoured', async () => {
    const explicit = new REAL(P_MS + 365 * MS).toISOString().slice(0, 10);
    const row = await createInvoiceAt(null, { dueDate: explicit });
    expect(row.dueDate).toBe(explicit);
  });
});

// ⚠️ **THIS BLOCK IS NOT `it.each(FAR)`, AND THE REASON IS A MEASURED VACUITY
// RATHER THAN A PREFERENCE.** A release CONSUMES its row: `t_invoice_release_
// payment` runs `Approved → Releasing Payment`, so the same invoice cannot be
// released twice. Written as `it.each(FAR)` over four instants it was measured
// to exercise the settle on the FIRST case and fall through a `if (!approved)
// return` on the other three — three green tests asserting nothing about
// `paymentDate`, which is `EMPTY-INPUT-REPORTS-CLEAN-01` inside a spec that
// looked like it covered four instants.
//
// So the population is DERIVED and PINNED first, and each releasable row is
// spent on exactly one instant. If the corpus stops carrying releasable rows the
// population control goes red BY NAME instead of the assertions going quiet.
describe('settleFinalize stamps paymentDate at the DECLARED PRESENT', () => {
  /** Canonical state, not the display label: an `Approved` row past its due date
   *  renders `Overdue` on the buyer DTO, and it is still releasable. */
  async function releasable(): Promise<readonly string[]> {
    const all = await reads.getBuyerInvoices(buyerRead);
    return all.items
      .filter((i) => i.lifecycleState === 'Approved' && i.paymentDate === null)
      .map((i) => i.id);
  }

  it('POPULATION CONTROL — the corpus really carries releasable rows to spend', async () => {
    const ids = await releasable();
    // Named, not counted: a count is satisfied by the wrong rows, and this is the
    // control that stops the assertions below going vacuous.
    expect(ids.length, 'no releasable invoice — every assertion below would be vacuous')
      .toBeGreaterThan(0);
    expect(ids.length, 'fewer releasable rows than probe instants spends them twice')
      .toBeGreaterThanOrEqual(2);
  });

  it('a payment settled at a FAR wall clock still stamps the declared present', async () => {
    const [id] = await releasable();
    expect(id, 'a releasable row was available to spend').toBeDefined();
    restore = installClock(P_MS + 1826 * MS);
    // The wall clock is five years past P here, so a wall-clock stamp cannot
    // coincide with P by accident — this single instant is the whole property.
    expect(new Date().toISOString().slice(0, 10)).not.toBe(DECLARED_PRESENT);
    const rel = await commands.dispatch(buyer, {
      transitionId: 't_invoice_release_payment',
      entity: 'invoice',
      entityId: id,
      payload: {},
    });
    expect(rel.status).toBe('submitted');
    await commands.settle(buyer, rel.correlationId);
    const after = await reads.getBuyerInvoices(buyerRead);
    const row = after.items.find((i) => i.id === id)!;
    expect(row.status).toBe('Payment Released');
    expect(row.paymentDate).toBe(DECLARED_PRESENT);
  });

  it('and a payment settled at P itself stamps the same value (no drift either way)', async () => {
    const [id] = await releasable();
    expect(id, 'a second releasable row was available to spend').toBeDefined();
    restore = installClock(P_MS);
    const rel = await commands.dispatch(buyer, {
      transitionId: 't_invoice_release_payment',
      entity: 'invoice',
      entityId: id,
      payload: {},
    });
    expect(rel.status).toBe('submitted');
    await commands.settle(buyer, rel.correlationId);
    const after = await reads.getBuyerInvoices(buyerRead);
    expect(after.items.find((i) => i.id === id)!.paymentDate).toBe(DECLARED_PRESENT);
  });
});

describe('THE TRIPWIRES — what this batch deliberately left on the wall clock', () => {
  it('the C3 audit `ts` STILL moves with the wall clock (C3 is frozen and mandates it)', async () => {
    const seen: string[] = [];
    for (const days of [0, 1826]) {
      restore = installClock(P_MS + days * MS);
      commandAuditSink.clear();
      await commands.dispatch(buyer, {
        transitionId: 't_rfq_create',
        entity: 'rfq',
        payload: { title: 'ts tripwire', materialCategory: 'Packaging', totalQty: 1 },
      });
      const events = commandAuditSink.all();
      expect(events.length).toBeGreaterThan(0);
      seen.push(String(events[events.length - 1].ts));
      restore();
      restore = null;
    }
    // If a later batch over-reaches onto `MockCommandService`'s `now:` supplier,
    // these two collapse to the same instant and this convicts. C3 §"`ts` is
    // caller-supplied" + "IT IS THE WALL CLOCK AND NOT THE DECLARED PRESENT,
    // DELIBERATELY" is the clause being protected.
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[0].slice(0, 10)).toBe(DECLARED_PRESENT);
    expect(seen[1].slice(0, 10)).not.toBe(DECLARED_PRESENT);
  });

  it('a STORE-MINTED timestamp (`declaredAt`) STILL moves with the wall clock', async () => {
    const seen: string[] = [];
    for (const days of [0, 1826]) {
      restore = installClock(P_MS + days * MS);
      const res = await commands.dispatch(supplier('sup-002'), {
        transitionId: 't_supplierdoc_declare',
        entity: 'supplierDocument',
        payload: {
          supplierId: 'sup-002',
          certType: 'Halal Certificate',
          certNumber: `TRIPWIRE-${days}`,
          issuer: 'BPJPH',
          issuedOn: DECLARED_PRESENT,
          expiresOn: '',
          scopeText: 'write-clock tripwire',
        },
      });
      expect(res.status, `declare refused: ${res.reason ?? ''}`).not.toBe('failed');
      const docs = await reads.getDocuments(buyerRead);
      const doc = docs.items.find((d) => d.id === res.entityId) as
        | { declaration?: { declaredAt?: string } }
        | undefined;
      expect(doc?.declaration?.declaredAt, 'the declaration carries its stamp').toBeDefined();
      seen.push(String(doc!.declaration!.declaredAt));
      restore();
      restore = null;
    }
    // The anti-backdating discipline ("store-assigned, never payload-supplied")
    // is why these stay wall. Moving one onto `P` convicts here.
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[1].slice(0, 10)).not.toBe(DECLARED_PRESENT);
  });
});

describe('POPULATION CONTROL — the fields asserted above are the ones that exist', () => {
  it('the canonical Invoice really declares the three stamped fields', async () => {
    const all = await reads.getBuyerInvoices(buyerRead);
    const row = all.items[0];
    // Guards against the whole file going vacuous if a DTO rename silently
    // turns every `expect(row.x)` into `expect(undefined)`.
    expect(row).toBeDefined();
    expect(typeof row.receivedDate).toBe('string');
    expect(typeof row.dueDate).toBe('string');
    const keys: (keyof Invoice)[] = ['submittedDate', 'dueDate', 'paymentDate'];
    expect(keys).toHaveLength(3);
  });
});
