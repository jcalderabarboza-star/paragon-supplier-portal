// ────────────────────────────────────────────────────────────────────────────
// RFx-1 · the seeded stage responses — the answers on the ONE seeded event that
// has stages, `rfq-018` (started at RFI, now at RFP).
//
// All three sample suppliers answered its RFI; the buyer carried two of them to
// the RFP and left one out, with a reason; one of the two has answered the RFP
// and the other has not yet. So each sample supplier seat opens on a different
// fact: "not shortlisted", "interest recorded", "record interest".
//
// The literals are authored as of `SOURCING_ANCHOR` and re-timed with the `rfq`
// family, as the events are: an answer dated before its event was published is
// not a story the board can tell.
// ────────────────────────────────────────────────────────────────────────────

import { shiftIso } from '../services/data/fixturePresent';
import type { StageResponse } from './rfqStage';

const STAGE_RESPONSES_RAW: StageResponse[] = [
  {
    id: 'rsp-001',
    rfqId: 'rfq-018',
    stage: 'RFI',
    supplierId: 'sup-002',
    note: 'Interested. We would source the bottles through a partner.',
    respondedAt: '2026-05-04',
  },
  {
    id: 'rsp-002',
    rfqId: 'rfq-018',
    stage: 'RFI',
    supplierId: 'sup-005',
    note: 'Interested. We distribute this format for two principals.',
    respondedAt: '2026-05-05',
  },
  {
    id: 'rsp-003',
    rfqId: 'rfq-018',
    stage: 'RFI',
    supplierId: 'sup-007',
    respondedAt: '2026-05-06',
  },
  {
    id: 'rsp-004',
    rfqId: 'rfq-018',
    stage: 'RFP',
    supplierId: 'sup-005',
    note: 'We will propose two bottle formats.',
    respondedAt: '2026-05-14',
  },
];

export const mockStageResponses: StageResponse[] = STAGE_RESPONSES_RAW.map((r) => ({
  ...r,
  respondedAt: shiftIso(r.respondedAt, 'rfq'),
}));
