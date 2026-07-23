import { describe, it, expect, afterEach } from 'vitest';
import { outboundRequestStore } from '../outboundStore';
import { OUTBOUND_REQUEST_SEED } from '../outboundFixtures';
import { makeOutboundRequest, type OutboundRequestRecord } from '../outbound';
import { sdcClock, SDC_SIMULATED_NOW } from '../../sdc';

afterEach(() => {
  outboundRequestStore.reset();
  sdcClock.reset();
});

describe('C3 — outboundRequestStore (seed + immutable append + reset)', () => {
  it('reads resolve from the seed', () => {
    expect(outboundRequestStore.all()).toHaveLength(OUTBOUND_REQUEST_SEED.length);
    expect(outboundRequestStore.forSupplier('sup-005')).toHaveLength(1);
  });

  it('append is IMMUTABLE — a new array; the prior snapshot is untouched', () => {
    const before = outboundRequestStore.all();
    const rec = makeOutboundRequest({
      id: 'obr-new',
      supplierId: 'sup-002',
      subjectRefs: [{ agreementId: 'sa-3001', itemSeq: 1, dueAt: '2026-08-24', materialCode: 'MAT-30100' }],
      channel: 'whatsapp',
    });
    outboundRequestStore.append(rec);
    expect(outboundRequestStore.all()).not.toBe(before); // new array reference
    expect(before).toHaveLength(OUTBOUND_REQUEST_SEED.length); // old snapshot unchanged
    expect(outboundRequestStore.all()).toHaveLength(OUTBOUND_REQUEST_SEED.length + 1);
    expect(outboundRequestStore.forSupplier('sup-002')).toHaveLength(1);
  });

  it('reset() restores the seed (test isolation)', () => {
    outboundRequestStore.append(
      makeOutboundRequest({ id: 'obr-tmp', supplierId: 'sup-002', subjectRefs: [], channel: 'email' }),
    );
    expect(outboundRequestStore.all()).toHaveLength(OUTBOUND_REQUEST_SEED.length + 1);
    outboundRequestStore.reset();
    expect(outboundRequestStore.all()).toHaveLength(OUTBOUND_REQUEST_SEED.length);
  });

  it('makeOutboundRequest stamps sentAt from the shared sdcClock (never a wall-clock)', () => {
    // Default: the SIMULATED now.
    expect(makeOutboundRequest({ id: 'a', supplierId: 'sup-005', subjectRefs: [], channel: 'whatsapp' }).sentAt).toBe(
      SDC_SIMULATED_NOW,
    );
    // Follows the injected simulated clock — deterministic, not the wall-clock.
    sdcClock.set('2026-09-01T00:00:00.000Z');
    expect(makeOutboundRequest({ id: 'b', supplierId: 'sup-005', subjectRefs: [], channel: 'whatsapp' }).sentAt).toBe(
      '2026-09-01T00:00:00.000Z',
    );
  });

  it('ANTI-DRIFT LOCK: a record has NO stored status enum (composed/queued/sent)', () => {
    const rec: OutboundRequestRecord = OUTBOUND_REQUEST_SEED[0];
    expect(rec).not.toHaveProperty('status');
    expect(rec).not.toHaveProperty('composed');
    expect(rec).not.toHaveProperty('queued');
    expect(rec).not.toHaveProperty('sent');
    // The record stores STRUCTURAL refs, never a frozen chase-view snapshot.
    expect(rec.subjectRefs[0]).not.toHaveProperty('overallSeverity');
    expect(rec.subjectRefs[0]).not.toHaveProperty('commitmentEntries');
    expect(Object.keys(rec).sort()).toEqual(
      ['channel', 'correlationAnchor', 'id', 'sentAt', 'subjectRefs', 'supplierId'].sort(),
    );
  });
});
