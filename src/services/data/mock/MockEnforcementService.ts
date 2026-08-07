// ────────────────────────────────────────────────────────────────────────────
// MockEnforcementService (CP-3 · E2) — the setting ledger, behind the seam.
//
// Serves the APPEND-ONLY LEDGER and nothing else. There is deliberately no
// `getEffectiveMode(checkId)`: the mode in force is DERIVED by the caller
// (`effectiveEnforcement`), on the `effectivePin` precedent, and a service
// method could not answer without reading a clock the caller is supposed to
// supply as an argument (law 0.5).
//
// BUYER-SCOPED. A supplier persona resolves to SCOPE_DENIED rather than to an
// empty page: an empty list would say "there are no settings", which is a claim
// about the ledger, and it would become a LIE the moment a buyer records one.
// The refusal says what is true — this reader may not see this record.
//
// The `httpDataService` swap replaces this class and NOT its shape: the same
// ledger arrives from a real store, and every derivation above it is unchanged.
// ────────────────────────────────────────────────────────────────────────────

import { DataError } from '../types';
import type { IEnforcementService, Page, QueryScope } from '../types';
import type { EnforcementSetting } from '../../../lib/enforcement';
import { enforcementSettingStore } from './stores/enforcementSettingStore';

export class MockEnforcementService implements IEnforcementService {
  async getEnforcementSettings(scope: QueryScope): Promise<Page<EnforcementSetting>> {
    if (scope.personaType !== 'buyer') {
      throw new DataError(
        'SCOPE_DENIED',
        'enforcement settings are a buyer governance record',
      );
    }
    // A copy, so a reader cannot append to the ledger by mutating what it read.
    return { items: [...enforcementSettingStore.all()], cursor: null };
  }
}
