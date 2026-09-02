// ─────────────────────────────────────────────────────────────────────────────
// THE SCOPING CONFORMANCE FACTORY, DRIVEN BY THE MOCK.
//
// This file is thin ON PURPOSE. It is the only thing that names an
// implementation; every assertion lives in `./scoping.ts` and is stated once.
// An SE team adds a sibling that passes `httpDataService` and changes nothing
// else.
//
// ⚠️ **WHAT THIS FILE PASSING MEANS, AND IT IS LESS THAN IT LOOKS.** The mock
// is the implementation those assertions were originally written against, so
// green here is `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01` by construction: it
// proves the factory RUNS, not that it CONSTRAINS.
//
// The evidence that it CONSTRAINS is a mutation probe recorded in the batch
// that built it: the same factory driven by a deliberately broken stub, which
// went red on the isolation, superset and refusal assertions. **That probe is
// not a shipped file** — a spec whose job is to fail cannot also be green, and
// no forward promise to one is made here (`FORWARD-PROMISE-HAS-NO-HANDLER-01`).
// Re-run it by driving `describeScopingConformance` with an implementation that
// ignores `scope.supplierId`; if it does not go red, the factory has closed
// over the mock and certifies nothing.
// ─────────────────────────────────────────────────────────────────────────────

import { mockDataService } from '../../data/mock/mockDataService';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { describeScopingConformance } from './scoping';

describeScopingConformance('mockDataService', () => ({
  service: mockDataService,
  // The diversified supplier-side fixtures. Three distinct tenants, chosen
  // because they satisfy the data preconditions the factory's header states.
  tenants: { a: 'sup-007', b: 'sup-002', c: 'sup-005' },
  roles: { buyer: PERSONA_SYSTEM_ROLES.buyer, supplier: PERSONA_SYSTEM_ROLES.supplier },
}));
