// ────────────────────────────────────────────────────────────────────────────
// M1 · THE BROWSER-QA HARNESS — present ONLY in a bundle built with
// `VITE_QA_HARNESS=on` (see `AppRouter.tsx`). It is the "test harness" the M1
// dispatch names for switching a module in the browser before M2 builds the
// admin page.
//
// ⚠️ **IT IS NOT A SECOND WRITE PATH.** Every call goes through the SAME
// `svc.commands.dispatch` a surface uses, under the SESSION's own scope — the
// seat, the roles and the actor the identity panel set. It adds no authority:
// a seat that could not switch a module from the admin page cannot switch one
// from here, and every refusal comes back by name.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDataService } from '../services/data/DataServiceContext';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { MODULE_ACTIVATION_KEY } from '../context/ModuleActivationContext';
import { describeRefusal } from '../services/transitions/refusalMessage';
import type { CommandInput, CommandResult, QueryScope } from '../services/data/types';

declare global {
  interface Window {
    __paragonQa?: {
      dispatch(input: CommandInput): Promise<CommandResult & { refusalText: string | null }>;
    };
  }
}

export default function QaHarness(): null {
  const svc = useDataService();
  const qc = useQueryClient();
  const { i18n } = useTranslation();
  const { identity } = useCurrentIdentity();

  useEffect(() => {
    const scope: QueryScope = {
      personaType: identity.personaType,
      supplierId: identity.supplierId,
      businessRoles: identity.businessRoles,
      actor: identity.actor,
    };
    window.__paragonQa = {
      async dispatch(input) {
        const result = await svc.commands.dispatch(scope, input);
        await qc.invalidateQueries({ queryKey: [...MODULE_ACTIVATION_KEY] });
        return { ...result, refusalText: describeRefusal(result.reason, i18n.language) };
      },
    };
    return () => {
      delete window.__paragonQa;
    };
  }, [svc, qc, i18n, identity]);

  return null;
}
