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
    const po = purchaseOrderStore.get(id);
    if (!po) return;
    po.status = toState as POStatus;
    const qtys = payload.confirmedQuantities;
    if (Array.isArray(qtys)) {
      po.lineItems.forEach((li, i) => {
        if (typeof qtys[i] === 'number') li.confirmedQty = qtys[i] as number;
      });
    }
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
