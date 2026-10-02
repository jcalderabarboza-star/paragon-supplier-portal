// ────────────────────────────────────────────────────────────────────────────
// PLN-1 · A REQUISITION IS PRICED AT THE QUANTITY COMMITTED, NEVER THE
// SUGGESTION'S (R-PLN P0 #4).
//
// ⚠️ WHAT THIS WOULD HAVE CAUGHT, MEASURED IN THE BROWSER: a planner committed
// 9,000 KG of a 10,950 KG suggestion and the Draft PR read Rp 2.0B — the value of
// 10,950 KG — and a 1,090 KG PR carried Rp 1.5B. The intake line's
// `estimatedValue` is a LINE TOTAL for `suggestedQty` (C7 §2.3), and the cascade
// copied it onto a document whose quantity was something else. Every existing
// spec committed AT the suggested quantity, where copying and rescaling agree —
// so none could tell them apart.
//
// Driven through the real dispatcher and cascade, and read back from the store:
// the value an approver opens is the subject, not the builder's return.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from '../data/mock/MockCommandService';
import { intakeLineStore } from '../data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';
import { intakeLineById } from '../data/mock/intakeLines';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import { somoHorizon } from '../planning/facts';
import { somoIntakeLineId } from '../planning/somoIntake';
import { committedValue } from '../../pages-v2/requisitions/prCreatePayload';
import type { PrIntakeLine, QueryScope } from '../data/types';

const svc = new MockCommandService();
const BUYER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };

const commit = (lineId: string, qty: number, reason?: string) =>
  svc.dispatch(BUYER, {
    transitionId: 't_intake_commit',
    entity: 'intakeLine',
    entityId: lineId,
    payload: { acceptedQty: qty, acceptedQtyRaw: String(qty), ...(reason ? { overrideReason: reason } : {}) },
  });

const prFrom = (lineId: string) => purchaseRequisitionStore.all().filter((p) => p.intakeLineId === lineId);

// One line per successful commit: the cascade's idempotency key IS the line id
// (see `intakeCascade.test.ts`), so each spec owns its own line.
const MONTH = somoHorizon('month');
const generated = (code: string, i: number): PrIntakeLine => {
  const line = intakeLineById(somoIntakeLineId(code, MONTH[i]));
  if (!line) throw new Error(`no generated line ${code}@${MONTH[i]}`);
  return line;
};

beforeEach(() => {
  intakeLineStore.reset();
  purchaseRequisitionStore.reset();
});

describe('PLN-1 · the PR value is the unit price × the quantity committed', () => {
  it('a generated line committed BELOW its suggestion is priced at the committed quantity — and not at the suggestion', async () => {
    const line = generated('SIM-RM-0001', 1);
    expect(typeof line.unitPrice).toBe('number');
    const qty = Math.round(line.suggestedQty * 0.1);
    const expected = Math.round(line.unitPrice! * qty);
    // the control that makes this spec able to fail: the two readings differ
    expect(expected).not.toBe(line.estimatedValue);

    expect((await commit(line.id, qty, 'Plant trial cut')).status).not.toBe('failed');
    const [pr] = prFrom(line.id);
    expect(pr).toMatchObject({ quantity: qty, estimatedValue: expected });
  });

  it('a generated line committed ABOVE its suggestion is priced up', async () => {
    const line = generated('SIM-RM-0003', 2);
    const qty = line.suggestedQty * 2;
    expect((await commit(line.id, qty, 'Launch build')).status).not.toBe('failed');
    expect(prFrom(line.id)[0]).toMatchObject({ quantity: qty, estimatedValue: Math.round(line.unitPrice! * qty) });
  });

  it('a generated line committed AT its suggestion is priced at its own line total', async () => {
    const line = generated('SIM-RM-0005', 3);
    expect(line.estimatedValue).toBe(line.unitPrice! * line.suggestedQty);
    expect((await commit(line.id, line.suggestedQty)).status).not.toBe('failed');
    expect(prFrom(line.id)[0]).toMatchObject({ quantity: line.suggestedQty, estimatedValue: line.estimatedValue });
  });

  it('NAMED: pil-somo-002 (SOMO trimmed 5,000 → 4,500) commits as delivered and is priced for 4,500 at 198,000/KG', async () => {
    const line = intakeLineById('pil-somo-002')!;
    expect(line).toMatchObject({ suggestedQty: 5000, acceptedQty: 4500, estimatedValue: 990_000_000, unitPrice: 198_000 });
    expect((await commit(line.id, 4500)).status).not.toBe('failed');
    expect(prFrom(line.id)[0]).toMatchObject({ quantity: 4500, estimatedValue: 891_000_000 });
  });

  it('NAMED: pil-grid-002 — its line total is the DELIVERED quantity’s, which is why a total is never rescaled', async () => {
    const line = intakeLineById('pil-grid-002')!;
    // 90,000 × 900 = 81,000,000: a rescale of the total off the SUGGESTION
    // (80,000) would have priced the delivered 90,000 at 91,125,000.
    expect(line).toMatchObject({ suggestedQty: 80_000, acceptedQty: 90_000, estimatedValue: 81_000_000, unitPrice: 900 });
    expect((await commit(line.id, 90_000)).status).not.toBe('failed');
    expect(prFrom(line.id)[0]).toMatchObject({ quantity: 90_000, estimatedValue: 81_000_000 });
  });
});

describe('PLN-1 · committedValue — the rule, both ways', () => {
  const base = { estimatedValue: 1_000_000, suggestedQty: 100, unitPrice: 10_000 } as PrIntakeLine;

  it('priced from the unit price at any quantity', () => {
    expect(committedValue(base, 50)).toBe(500_000);
    expect(committedValue(base, 100)).toBe(1_000_000);
    expect(committedValue(base, 250)).toBe(2_500_000);
  });

  it('NO unit price: the line total stands only for its own suggested quantity; any other is OMITTED, never guessed', () => {
    const noPrice = { estimatedValue: 1_000_000, suggestedQty: 100 } as PrIntakeLine;
    expect(committedValue(noPrice, 100)).toBe(1_000_000);
    expect(committedValue(noPrice, 50)).toBeUndefined();
  });

  it('a stated zero price stays zero — zero is a figure, not an absence', () => {
    expect(committedValue({ ...base, unitPrice: 0 }, 70)).toBe(0);
  });

  it('every C7 fixture line carries an authored unit price', () => {
    for (const id of ['pil-somo-001', 'pil-somo-002', 'pil-grid-001', 'pil-grid-002']) {
      expect(typeof intakeLineById(id)?.unitPrice, id).toBe('number');
    }
  });
});
