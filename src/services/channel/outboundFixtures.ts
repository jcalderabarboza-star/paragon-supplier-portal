// ─────────────────────────────────────────────────────────────────────────────
// C3 — the SIMULATED outbound-request seed (the store's initial ask events).
//
// These are DEMO asks recorded on the shared simulated timeline (before the
// SDC_SIMULATED_NOW of 2026-08-25), so the outbound queue has a concrete
// staleness case to derive against a live chase view. `correlationAnchor` is null
// — no real dispatch links them (no transport exists); every record renders
// "composed — not sent" via the LivenessRegistry (LAW 5). `sentAt` is a literal
// timeline date, exactly as the delivery/SDC fixtures are dated literals.
//
// ── ⚠️ CORRECTED AT 2B-5a — BOTH SUBJECT REFS RESOLVED TO NOTHING ───────────
//   Found by the 2B-5 investigation, and it is a DEFECT FIX, not an adoption.
//   As authored, each record contradicted the object it named on THREE axES:
//
//     obr-0001 · chased sup-005 · about sa-0002, which belongs to SUP-007
//              · at itemSeq 1, which that agreement does not have (10 and 20)
//              · for MAT-10234, where the item carries PK-PETB-8810
//     obr-0002 · chased sup-007 · about sa-1001, which belongs to SUP-001
//              · at itemSeq 1 (real: 10)
//              · for MAT-20500, where the item carries RM-EMUL-3310
//
//   SIX MISMATCHES, and not one pin in the tree could see them: the chase lane
//   and the agreement lane were only ever read separately. `MAT-10234` and
//   `MAT-20500` STATE NO MEANING ANYWHERE, so they could not collide with
//   anything either — which is why the meaning-scope derivation could not be
//   the whole proof that the third space was resolved (R-A, amended at 2B-5a).
//
//   ⚠️ `supplierId` IS AUTHORITATIVE and the refs moved to match it, not the
//   other way round: identity scoping is enforced on `supplierId`
//   (`applySupplierScope`), so a chase addressed to one tenant about another
//   tenant's commitment is wrong in the direction that matters. Each record now
//   names an agreement its own addressee OWNS, at a real item sequence, for
//   that item's own material code, on a real release date — every value READ
//   FROM the agreement fixture rather than chosen for it, and re-derived on
//   every run by `subjectRefIntegrity.test.ts`.
//
//   ⚠️ THE TWO `MAT-*` CODES ARE NOT RETIRED HERE AND WERE NEVER THE CHASE
//   LANE'S VOCABULARY. They were two wrong answers to a question the agreement
//   had already answered. The SEVEN ASN-lane codes are the real third-space
//   population and they are 2B-5b's, with a live regulatory blast radius.
// ─────────────────────────────────────────────────────────────────────────────

import type { OutboundRequestRecord } from './outbound';

export const OUTBOUND_REQUEST_SEED: readonly OutboundRequestRecord[] = [
  {
    id: 'obr-0001',
    supplierId: 'sup-005',
    // sa-1002 IS sup-005's own agreement (Sample Personal Care / ctr-004) — the LATE case in the
    // scale fleet. Release seq 2 fell due 2026-07-01 and the ask went out
    // 2026-08-18, which is what a chase is: overdue, still open.
    subjectRefs: [
      { agreementId: 'sa-1002', itemSeq: 10, releaseSeq: 2, dueAt: '2026-07-01', materialCode: 'AI-NIAC-6601' },
    ],
    channel: 'whatsapp',
    sentAt: '2026-08-18T09:00:00.000Z',
    correlationAnchor: null,
  },
  {
    id: 'obr-0002',
    supplierId: 'sup-007',
    // sa-0002 IS sup-007's own agreement (PT Sample Packaging / ctr-013) — the surface
    // demo. Item 10's release seq 5 fell due 2026-08-01 and is the MISSED line
    // over the 2026-08-25 clock, so an ask stamped 2026-08-19 is chasing a real
    // miss rather than an invented one.
    subjectRefs: [
      { agreementId: 'sa-0002', itemSeq: 10, releaseSeq: 5, dueAt: '2026-08-01', materialCode: 'PK-PETB-8810' },
    ],
    channel: 'email',
    sentAt: '2026-08-19T09:00:00.000Z',
    correlationAnchor: null,
  },
];
