// ────────────────────────────────────────────────────────────────────────────
// MockCommandService (v2.2 Step 3.4) — wires the framework-agnostic dispatcher
// to the mock stores, the persona→role map, the bound policy hooks, and an
// in-memory audit sink. The Phase-3 real adapter implements ICommandService the
// same way against NestJS/SAP.
//
// Importing this module also loads the transitions barrel, which registers the
// shipped flows and binds policy hooks (side effects) — so the registry and the
// hook bindings are populated before any dispatch.
// ────────────────────────────────────────────────────────────────────────────

import type { POStatus } from '../types';
import type {
  ICommandService,
  QueryScope,
  CommandInput,
  CommandResult,
  CommandStatus,
} from '../types';
import {
  createDispatcher,
  InMemoryAuditSink,
  rolesForPersona,
  resolvePolicyHook,
  type CommandTarget,
} from '../../transitions';
import { purchaseOrderStore } from './stores/purchaseOrderStore';

// — Purchase-order command target — reads/writes the mutable PO store. ————————
const purchaseOrderTarget: CommandTarget = {
  readState: (id) => purchaseOrderStore.get(id)?.status ?? null,
  readScopeOwner: (id) => purchaseOrderStore.get(id)?.supplierId ?? null,
  readEntity: (id) => purchaseOrderStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    // Immutable swap (new PO + new line items) so the invalidated query yields
    // genuinely-new references and all derivations recompute (see the store).
    const qtys = payload.confirmedQuantities;
    purchaseOrderStore.update(id, (po) => ({
      ...po,
      status: toState as POStatus,
      lineItems: Array.isArray(qtys)
        ? po.lineItems.map((li, i) =>
            typeof qtys[i] === 'number' ? { ...li, confirmedQty: qtys[i] as number } : li,
          )
        : po.lineItems,
    }));
  },
};

const TARGETS: Record<string, CommandTarget> = {
  purchaseOrder: purchaseOrderTarget,
};

// Process-wide audit sink + monotonic correlation ids (deterministic for tests).
export const commandAuditSink = new InMemoryAuditSink();
let seq = 0;

const dispatcher = createDispatcher({
  resolveRoles: (scope) => rolesForPersona(scope.personaType),
  target: (entity) => TARGETS[entity],
  resolvePolicyHook,
  sink: commandAuditSink,
  nextCorrelationId: () => `cmd_${(++seq).toString(36).padStart(4, '0')}`,
  now: () => new Date().toISOString(),
});

/** Settle a `submitted` command to `done` (Step 3.5 SAP settlement hook). */
export const settleCommand = dispatcher.settle;

export class MockCommandService implements ICommandService {
  async dispatch(scope: QueryScope, input: CommandInput): Promise<CommandResult> {
    return dispatcher.dispatch(scope, input);
  }

  async getCommandStatus(
    _scope: QueryScope,
    correlationId: string,
  ): Promise<CommandStatus | null> {
    return dispatcher.getCommandStatus(correlationId);
  }
}
