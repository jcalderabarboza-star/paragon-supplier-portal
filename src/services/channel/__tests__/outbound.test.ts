import { describe, it, expect } from 'vitest';
import {
  deriveOutboundQueue,
  subjectRefOf,
  type OutboundRequestRecord,
  type SupplierReplyFact,
} from '../outbound';
import { makeSupplierChaseView, type SupplierChaseView } from '../../chase';
import type { DeliveryChaseEntry } from '../../chase';

const NOW = '2026-08-25T12:00:00.000Z';

const commitment = (over: Partial<DeliveryChaseEntry> = {}): DeliveryChaseEntry => ({
  supplierId: 'sup-005',
  agreementId: 'sa-0002',
  itemSeq: 1,
  releaseSeq: 2,
  mode: 'non-compliance-alert',
  type: 'firm',
  severity: 'hard',
  dueDate: '2026-08-20',
  materialCode: 'MAT-10234',
  ...over,
});

const viewWith = (
  supplierId: string,
  commitmentEntries: DeliveryChaseEntry[],
  dataReasons: SupplierChaseView['dataReasons'] = [],
): SupplierChaseView => makeSupplierChaseView(supplierId, dataReasons, commitmentEntries);

const ask = (over: Partial<OutboundRequestRecord> = {}): OutboundRequestRecord => ({
  id: 'obr-x',
  supplierId: 'sup-005',
  subjectRefs: [{ agreementId: 'sa-0002', itemSeq: 1, releaseSeq: 2, dueAt: '2026-08-20', materialCode: 'MAT-10234' }],
  channel: 'whatsapp',
  sentAt: '2026-08-18T09:00:00.000Z',
  correlationAnchor: null,
  ...over,
});

describe('C3 — deriveOutboundQueue (pure over chase views + ask/reply facts)', () => {
  it('is deterministic and does not mutate its inputs', () => {
    const views = [viewWith('sup-005', [commitment()])];
    const sent: OutboundRequestRecord[] = [];
    const replies: SupplierReplyFact[] = [];
    const a = deriveOutboundQueue(views, sent, replies, NOW);
    const b = deriveOutboundQueue(views, sent, replies, NOW);
    expect(a).toEqual(b);
    expect(views).toHaveLength(1);
    expect(sent).toHaveLength(0);
  });

  it('a chase view with no prior send yields a COMPOSED entry (refs derived from the view)', () => {
    const [entry] = deriveOutboundQueue([viewWith('sup-005', [commitment()])], [], [], NOW);
    expect(entry.status).toBe('composed');
    expect(entry.lastSentAt).toBeNull();
    expect(entry.lastChannel).toBeNull();
    expect(entry.subjectRefs).toEqual([
      { agreementId: 'sa-0002', itemSeq: 1, releaseSeq: 2, dueAt: '2026-08-20', materialCode: 'MAT-10234' },
    ]);
  });

  it('an ask WITH a fresh reply since sentAt is AWAITING, not stale', () => {
    const views = [viewWith('sup-005', [commitment()])];
    const sent = [ask({ sentAt: '2026-08-18T09:00:00.000Z' })];
    const replies: SupplierReplyFact[] = [{ supplierId: 'sup-005', latestSubmittedAt: '2026-08-21T09:00:00.000Z' }];
    const [entry] = deriveOutboundQueue(views, sent, replies, NOW);
    expect(entry.status).toBe('awaiting');
    // The chase reason is STILL present (partial) — but a reply since the ask
    // proves the supplier is responsive (LAW 4 "any reply freshens").
    expect(entry.subjectRefs).toEqual(sent[0].subjectRefs);
    expect(entry.lastSentAt).toBe('2026-08-18T09:00:00.000Z');
  });

  it('an ask with NO reply since sentAt is STALE', () => {
    const views = [viewWith('sup-005', [commitment()])];
    const sent = [ask({ sentAt: '2026-08-18T09:00:00.000Z' })];
    // A reply BEFORE the ask does not freshen it.
    const replies: SupplierReplyFact[] = [{ supplierId: 'sup-005', latestSubmittedAt: '2026-08-10T09:00:00.000Z' }];
    const [entry] = deriveOutboundQueue(views, sent, replies, NOW);
    expect(entry.status).toBe('stale');
  });

  it('clamps future-dated asks and replies to the timeline (<= now)', () => {
    const views = [viewWith('sup-005', [commitment()])];
    // An ask "in the future" is not yet made → composed, not stale.
    const futureSent = [ask({ sentAt: '2026-09-01T09:00:00.000Z' })];
    expect(deriveOutboundQueue(views, futureSent, [], NOW)[0].status).toBe('composed');
    // A future reply cannot pre-freshen a real past ask → stays stale.
    const sent = [ask({ sentAt: '2026-08-18T09:00:00.000Z' })];
    const futureReply: SupplierReplyFact[] = [{ supplierId: 'sup-005', latestSubmittedAt: '2026-09-02T09:00:00.000Z' }];
    expect(deriveOutboundQueue(views, sent, futureReply, NOW)[0].status).toBe('stale');
  });

  it('carries data-only suppliers (forecast) with no structural refs', () => {
    const [entry] = deriveOutboundQueue([viewWith('sup-002', [], ['overdue'])], [], [], NOW);
    expect(entry.status).toBe('composed');
    expect(entry.subjectRefs).toEqual([]);
    expect(entry.dataReasons).toEqual(['overdue']);
    expect(entry.severity).toBe('soft'); // a data reason rolls up soft
  });

  it('orders worst-first: severity, then status, then supplierId', () => {
    const hardStale = viewWith('sup-009', [commitment({ supplierId: 'sup-009', severity: 'hard', type: 'firm' })]);
    const softComposed = viewWith('sup-001', [
      commitment({ supplierId: 'sup-001', severity: 'soft', type: 'semi-firm', mode: 'anticipatory-nudge' }),
    ]);
    const sent = [ask({ supplierId: 'sup-009', sentAt: '2026-08-18T09:00:00.000Z' })];
    const out = deriveOutboundQueue([softComposed, hardStale], sent, [], NOW);
    expect(out.map((e) => e.supplierId)).toEqual(['sup-009', 'sup-001']); // hard/stale first
    expect(out[0].status).toBe('stale');
    expect(out[1].status).toBe('composed');
  });

  it('subjectRefOf drops derived assessment (mode/severity) — a structural ref only', () => {
    const ref = subjectRefOf(commitment({ mode: 'drift', releaseSeq: undefined }));
    expect(ref).toEqual({ agreementId: 'sa-0002', itemSeq: 1, dueAt: '2026-08-20', materialCode: 'MAT-10234' });
    expect(ref).not.toHaveProperty('mode');
    expect(ref).not.toHaveProperty('severity');
    expect(ref).not.toHaveProperty('releaseSeq'); // omitted for a drift subject
  });
});
