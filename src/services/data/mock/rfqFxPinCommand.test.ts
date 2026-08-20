// ────────────────────────────────────────────────────────────────────────────
// t_rfq_fx_pin — the buyer records the FX basis a comparison is ranked against
// (CP-0 · 2e-c-3), through the REAL dispatcher and the REAL rfqStore.
//
// Three things are proved here, and they are the three D-1 asked for:
//   • it is a DISPATCHED verb, so every pin lands in the audit trail;
//   • it PRESERVES STATE — recording a rate is not a step in the sourcing
//     machine, and pinning a Closed RFQ must not reopen it;
//   • it APPENDS — superseding a rate keeps the prior basis, because there is
//     no update path to take it away.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplier: QueryScope = { personaType: 'supplier', supplierId: 'sup-005', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

const svc = new MockCommandService();
const RFQ = 'rfq-001'; // Open

const pin = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_rfq_fx_pin',
  entity: 'rfq',
  entityId: RFQ,
  payload: {
    quote: 'USD',
    rate: 17_250,
    asOf: '2026-07-30',
    source: 'MANUAL',
    ...overrides,
  },
});

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
});

describe('t_rfq_fx_pin — recording the basis', () => {
  it('THE LOCK — a buyer records a rate and it lands on the RFQ ledger', async () => {
    const res = await svc.dispatch(buyer, pin());
    expect(res.status).toBe('done');

    const pins = rfqStore.get(RFQ)!.fxPins!;
    expect(pins).toHaveLength(1);
    expect(pins[0].quote).toBe('USD');
    expect(pins[0].rate).toBe(17_250);
    expect(pins[0].asOf).toBe('2026-07-30');
    expect(pins[0].base).toBe('IDR');
    expect(pins[0].source).toBe('MANUAL');
    // SIMULATED until a real rate feed lands — a MANUAL pin is a real human
    // decision but not a live feed, and marking it LIVE would be a two-gate
    // violation.
    expect(pins[0].liveness).toBe('SIMULATED');
  });

  it('stamps pinnedAt ITSELF — a caller cannot backdate its own audit entry', async () => {
    const before = new Date().toISOString();
    await svc.dispatch(buyer, pin({ pinnedAt: '1999-01-01T00:00:00.000Z' }));
    const [p] = rfqStore.get(RFQ)!.fxPins!;
    expect(p.pinnedAt).not.toBe('1999-01-01T00:00:00.000Z');
    expect(p.pinnedAt >= before).toBe(true);
  });

  it('STATE-PRESERVING — pinning does NOT move the RFQ', async () => {
    expect(rfqStore.get(RFQ)!.status).toBe('Open');
    await svc.dispatch(buyer, pin());
    expect(rfqStore.get(RFQ)!.status).toBe('Open');
  });

  it('THE REASON THE FLAG EXISTS — pinning a CLOSED RFQ does not reopen it', async () => {
    // `to: 'Open'` is declared because the schema needs a single target, but a
    // state-preserving verb is applied with the CURRENT state. Without that, a
    // buyer recording a rate on a Closed RFQ would silently reopen it for
    // further bids — a sourcing-process change caused by an FX data entry.
    rfqStore.update(RFQ, (r) => ({ ...r, status: 'Closed' }));
    const res = await svc.dispatch(buyer, pin());
    expect(res.status).toBe('done');
    expect(rfqStore.get(RFQ)!.status).toBe('Closed');
    expect(rfqStore.get(RFQ)!.fxPins).toHaveLength(1);
  });

  it('is a BUYER verb — a supplier cannot set the basis their own bid is judged on', async () => {
    // Refused at the ROLE gate, not the scope gate: an RFQ has no supplier owner
    // (`rfqTarget.readScopeOwner` is null — it is a buyer document invited
    // suppliers respond to), so scope has nothing to deny and the role is what
    // decides. `rfq:fx-pin` is granted to `buyer` alone.
    const res = await svc.dispatch(supplier, pin());
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('ROLE_NOT_PERMITTED:rfq:fx-pin');
    expect(rfqStore.get(RFQ)!.fxPins ?? []).toHaveLength(0);
  });

  it('is a DISTINCT authority from awarding — pinning is not granted BY award', async () => {
    // Recording the basis and choosing the winner are different acts. If the
    // verb had reused `rfq:award`, anyone who may compare could also decide.
    const { PERSONA_ROLES } = await import('../../transitions/roles');
    expect(PERSONA_ROLES.buyer).toContain('rfq:fx-pin');
    expect(PERSONA_ROLES.supplier).not.toContain('rfq:fx-pin');
  });
});

describe('t_rfq_fx_pin — the D-1 freeze is APPEND-ONLY', () => {
  it('THE FREEZE — superseding a rate KEEPS the prior basis', async () => {
    await svc.dispatch(buyer, pin({ rate: 16_000, asOf: '2026-07-20' }));
    await svc.dispatch(buyer, pin({ rate: 17_250, asOf: '2026-07-30' }));

    const pins = rfqStore.get(RFQ)!.fxPins!;
    // TWO entries, not one replaced. The basis an earlier comparison was ranked
    // on is still readable — which is the whole of D-1's "prior basis
    // preserved, never an in-place edit".
    expect(pins).toHaveLength(2);
    expect(pins.map((p) => p.rate)).toEqual([16_000, 17_250]);
  });

  it('keeps pins for different currencies side by side', async () => {
    await svc.dispatch(buyer, pin({ quote: 'USD', rate: 17_250 }));
    await svc.dispatch(buyer, pin({ quote: 'EUR', rate: 18_600 }));
    const pins = rfqStore.get(RFQ)!.fxPins!;
    expect(pins.map((p) => p.quote)).toEqual(['USD', 'EUR']);
  });

  it('an AWARD does not disturb the ledger — the basis outlives the decision', async () => {
    // The point of auditing a basis at all: after the award, "what rate was this
    // contract chosen on?" must still have an answer.
    await svc.dispatch(buyer, pin());
    await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: RFQ,
      payload: { awardedQuotationId: 'qt-001a', awardedSupplierId: 'sup-005' },
    });
    expect(rfqStore.get(RFQ)!.status).toBe('Awarded');
    expect(rfqStore.get(RFQ)!.fxPins).toHaveLength(1);
  });
});

describe('t_rfq_fx_pin — a malformed basis is REFUSED, by name', () => {
  // An ABSENT pin is safe: the engine refuses FX_UNPINNED and says so. A
  // MALFORMED one is not — it is a basis a comparison would be ranked on,
  // producing a plausible number and the wrong winner.

  it.each(['quote', 'rate', 'asOf', 'source'])(
    'requires %s — the field gate, before the policy',
    async (field) => {
      const p = pin();
      delete (p.payload as Record<string, unknown>)[field];
      const res = await svc.dispatch(buyer, { ...pin(), payload: p.payload });
      expect(res.status).toBe('failed');
      expect(res.reason).toContain('MISSING_FIELDS');
      expect(res.reason).toContain(field);
    },
  );

  it.each([
    ['CNY', 'a currency nobody may bid in'],
    ['usd', 'the right currency in the wrong case'],
    ['gold', 'not a currency'],
  ])('refuses an off-list quote currency: %s (%s)', async (quote) => {
    const res = await svc.dispatch(buyer, pin({ quote }));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain(`'${quote}'`);
    expect(res.reason).toContain('IDR, USD, EUR');
  });

  it('refuses pinning the BASE to itself — its rate is 1 by definition', async () => {
    // Not a harmless no-op: any value other than 1 would silently re-denominate
    // every domestic bid on the RFQ.
    const res = await svc.dispatch(buyer, pin({ quote: 'IDR', rate: 2 }));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('IDR is the comparison base');
  });

  it.each<[unknown, string]>([
    [0, 'zero'],
    [-17_250, 'negative — an inverted comparison'],
    [Number.NaN, 'NaN, which a typeof check would have admitted'],
    ['17250', 'a numeric string'],
  ])('refuses an unusable rate: %s (%s)', async (rate) => {
    const res = await svc.dispatch(buyer, pin({ rate }));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('rate must be a finite number greater than 0');
  });

  it('refuses an unreadable vintage — staleness is measured from it', async () => {
    const res = await svc.dispatch(buyer, pin({ asOf: 'last Tuesday' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('asOf must be a readable date');
  });

  it('refuses an unknown source — a rate nobody is accountable for', async () => {
    const res = await svc.dispatch(buyer, pin({ source: 'VIBES' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('source must be MANUAL or SAP_EXHGRATE');
  });

  it('a refused pin writes NOTHING — the ledger is untouched', async () => {
    await svc.dispatch(buyer, pin({ rate: 0 }));
    expect(rfqStore.get(RFQ)!.fxPins ?? []).toHaveLength(0);
  });

  it('carries the optional SAP rate type when given, and omits it when not', async () => {
    await svc.dispatch(buyer, pin({ source: 'SAP_EXHGRATE', rateType: 'M' }));
    expect(rfqStore.get(RFQ)!.fxPins![0].rateType).toBe('M');
    rfqStore.reset();
    await svc.dispatch(buyer, pin());
    // Absent, not invented: a MANUAL pin has no rate type, and inventing one
    // would dress a typed number as an SAP-governed rate.
    expect('rateType' in rfqStore.get(RFQ)!.fxPins![0]).toBe(false);
  });
});
