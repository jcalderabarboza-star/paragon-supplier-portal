// ─────────────────────────────────────────────────────────────────────────────
// THE DISPATCH CONFORMANCE FACTORY, DRIVEN BY THE MOCK.
//
// Thin on purpose, exactly as `scoping.mock.test.ts` is. The only thing this
// file names is an implementation; every assertion lives in `./dispatch.ts`.
//
// ⚠️ Green here proves the factory RUNS. The evidence it CONSTRAINS is the leak
// probe recorded in the batch that built it — the same factory driven by a
// dispatcher that grants every atom, which killed the refusal assertions by
// name. That probe is not a shipped file: a spec whose job is to fail cannot
// also be green, and no forward promise to one is made here.
// ─────────────────────────────────────────────────────────────────────────────

import { mockDataService } from '../../data/mock/mockDataService';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { invoiceStore } from '../../data/mock/stores/invoiceStore';
import { rfqStore } from '../../data/mock/stores/rfqStore';
import { describeDispatchConformance } from './dispatch';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';

describeDispatchConformance('mockDataService', () => ({
  service: mockDataService,
  roles: {
    procurement: ['procurement'],
    finance: ['finance'],
    full: PERSONA_SYSTEM_ROLES.buyer,
  },
  // The isolation the factory requires. For the mock that is a store reset; an
  // HTTP harness re-seeds its test database. Reaching into stores is legitimate
  // HERE and nowhere inside the factory — this file is allowed to know it is
  // driving the mock, which is the whole point of keeping the caller thin.
  // OPS-2 — two sample-roster members, read off the roster, never spelled.
  people: {
    approver: { kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === 'finance')!.personId } },
    releaser: { kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === 'buyer_all')!.personId } },
  },
  reset: () => {
    invoiceStore.reset();
    rfqStore.reset();
  },
}));
