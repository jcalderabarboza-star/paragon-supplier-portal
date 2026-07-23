// ─────────────────────────────────────────────────────────────────────────────
// C3 — the SIMULATED outbound-request seed (the store's initial ask events).
//
// These are DEMO asks recorded on the shared simulated timeline (before the
// SDC_SIMULATED_NOW of 2026-08-25), so the outbound queue has a concrete
// staleness case to derive against a live chase view. `correlationAnchor` is null
// — no real dispatch links them (no transport exists); every record renders
// "composed — not sent" via the LivenessRegistry (LAW 5). `sentAt` is a literal
// timeline date, exactly as the delivery/SDC fixtures are dated literals.
// ─────────────────────────────────────────────────────────────────────────────

import type { OutboundRequestRecord } from './outbound';

export const OUTBOUND_REQUEST_SEED: readonly OutboundRequestRecord[] = [
  {
    id: 'obr-0001',
    supplierId: 'sup-005',
    subjectRefs: [
      { agreementId: 'sa-0002', itemSeq: 1, releaseSeq: 2, dueAt: '2026-08-20', materialCode: 'MAT-10234' },
    ],
    channel: 'whatsapp',
    sentAt: '2026-08-18T09:00:00.000Z',
    correlationAnchor: null,
  },
  {
    id: 'obr-0002',
    supplierId: 'sup-007',
    subjectRefs: [
      { agreementId: 'sa-1001', itemSeq: 1, dueAt: '2026-08-22', materialCode: 'MAT-20500' },
    ],
    channel: 'email',
    sentAt: '2026-08-19T09:00:00.000Z',
    correlationAnchor: null,
  },
];
