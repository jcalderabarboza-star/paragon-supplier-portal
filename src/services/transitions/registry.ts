// ────────────────────────────────────────────────────────────────────────────
// Flow registry / loader (v2.2 Step 3.1).
//
// The single enumerable home for every entity state machine. `getKnownFlows()`
// is the loader the dispatcher (Step 3.4) and tooling read from. Registration
// runs `assertValidFlow` and enforces GLOBAL uniqueness of both flow entity keys
// and transition ids (so `t_po_confirm` resolves to exactly one transition).
//
// Exposed as a class (`FlowRegistry`) for test isolation, plus a process-wide
// singleton (`flowRegistry`) that the shipped flows register onto in `index.ts`.
// The free functions delegate to the singleton for ergonomic imports.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition, TransitionDef } from './schema';
import { assertValidFlow } from './validate';

export class FlowRegistry {
  private readonly flows = new Map<string, FlowDefinition>();
  private readonly transitionOwner = new Map<string, string>();

  /** Validate then admit a flow. Throws on malformed or on a key/id collision. */
  register(flow: FlowDefinition): void {
    assertValidFlow(flow);
    if (this.flows.has(flow.entity)) {
      throw new Error(`flow '${flow.entity}' is already registered`);
    }
    for (const t of flow.transitions) {
      const owner = this.transitionOwner.get(t.id);
      if (owner) {
        throw new Error(`transition id '${t.id}' is already registered by flow '${owner}'`);
      }
    }
    this.flows.set(flow.entity, flow);
    for (const t of flow.transitions) this.transitionOwner.set(t.id, flow.entity);
  }

  /** Every registered flow, in registration order. */
  getKnownFlows(): readonly FlowDefinition[] {
    return [...this.flows.values()];
  }

  /** The flow for an entity key, or undefined. */
  getFlow(entity: string): FlowDefinition | undefined {
    return this.flows.get(entity);
  }

  /** Resolve a globally-unique transition id to its definition, or undefined. */
  getTransition(id: string): TransitionDef | undefined {
    const entity = this.transitionOwner.get(id);
    if (!entity) return undefined;
    return this.flows.get(entity)?.transitions.find((t) => t.id === id);
  }
}

/** Process-wide registry. Shipped flows self-register in `index.ts`. */
export const flowRegistry = new FlowRegistry();

/** Enumerate all registered flows (the loader the dispatcher reads). */
export function getKnownFlows(): readonly FlowDefinition[] {
  return flowRegistry.getKnownFlows();
}

/** Look up a flow by entity key. */
export function getFlow(entity: string): FlowDefinition | undefined {
  return flowRegistry.getFlow(entity);
}

/** Look up a transition by its globally-unique id. */
export function getTransition(id: string): TransitionDef | undefined {
  return flowRegistry.getTransition(id);
}
