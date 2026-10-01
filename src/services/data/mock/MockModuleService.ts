import { DataError } from '../types';
import type { IModuleService, Page, QueryScope } from '../types';
import type { ModuleActivationSetting, ModuleActivationView } from '../../modules/activation';
import { moduleActivationStore } from './stores/moduleActivationStore';

// M1 · Design 5 §A.2 — the module activation read seam. See `IModuleService`
// for why it is two methods: what is ON is every seat's to read; who switched
// it, and why, is a buyer governance record.
export class MockModuleService implements IModuleService {
  async getModuleActivation(_scope: QueryScope): Promise<ModuleActivationView> {
    return moduleActivationStore.view();
  }

  async getModuleLedger(scope: QueryScope): Promise<Page<ModuleActivationSetting>> {
    if (scope.personaType !== 'buyer') {
      throw new DataError('SCOPE_DENIED', 'the module activation ledger is a buyer governance record');
    }
    // A copy, so a reader cannot append to the ledger by mutating what it read.
    return { items: [...moduleActivationStore.ledger()], cursor: null };
  }
}
