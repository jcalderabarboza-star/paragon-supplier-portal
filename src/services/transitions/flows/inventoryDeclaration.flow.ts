// ────────────────────────────────────────────────────────────────────────────
// InventoryDeclaration flow — SDC-3a (SOH state, design v2 §2.2).
//
// A DEGENERATE SINGLE-STATE machine, deliberately: an InventoryDeclaration is
// a state SNAPSHOT (keyed material + declaredAt), not a lifecycle object — the
// SDC-0 type carries NO status field and this flow adds none. The one state
// ('Declared') exists only so the snapshot rides the SAME governed dispatch
// spine as every other verb (role + fields + scope + policy + DR-10 audit);
// `readState` answers 'Declared' for any existing id and `applyTransition` is
// a no-op. A new declaration APPENDS a new immutable snapshot — "current SOH"
// is derived at read (latest declaredAt per supplier × material), never by
// mutating a prior record.
//
// TOTAL-FIRST floor (R-4 Finding 1, ruling (a) + DEC-MAGIC-LINK-GRID):
// requiredFields = materialCode + totalQty; batches[] is OPTIONAL detail with
// Σ batch qty = totalQty enforced by policy hook (a total that disagrees with
// its own detail is a fabricated number). Granularity is derived at read.
//
// ── R-4 CHANNEL-EXPRESSIBILITY NOTE (Comm Hub Skeleton §1 R-4) ──────────────
// Minimal honest channel reply: TOKEN + TOTAL QTY — e.g. a WhatsApp template
// answering "current stock of Glycerin?" with one number ("4,000 KG as-of
// today"). Honest because totalQty IS the contract floor: nothing is
// fabricated, and the reply persists as a total-only declaration whose
// EXPIRY-BLINDNESS is marked at read (never assumed away). Batch-grain detail
// (batch numbers, expiries) is NOT channel-expressible over chat — it rides
// the MAGIC-LINK GRID / Excel round-trip (SDC-3c) or the portal. Under the
// pre-adjudication batches-mandatory floor this contract had NO honest minimal
// reply — the schema evolved BEFORE freezing (the gate working as installed).
//
// CHANNEL-AGNOSTIC (DEC-COMMS-PRIMARY): t_inventorydeclaration_declare is the
// shared write-path for portal, magic-link grid, and future channel ingestion.
// ────────────────────────────────────────────────────────────────────────────

import type { FlowDefinition } from '../schema';
import { POLICY_HOOKS } from '../policyHooks';

export const inventoryDeclarationFlow: FlowDefinition = {
  entity: 'inventoryDeclaration',
  version: 1,
  states: ['Declared'],
  initial: 'Declared',
  transitions: [
    {
      // Supplier declares its own SOH for a collaborated material. Creation-
      // shape (store-assigned id + declaredAt). WIRED (SDC-3a). The floor is
      // the material + the ONE honest number; uom is NEVER a payload field —
      // the target copies it from the material master (invariant #2).
      // Membership ((i)∪(ii) ruling) is folded into creationOwner: a
      // relationship exists OR any publication ever fanned this
      // supplier × material — "a material Paragon collaborates with you on".
      id: 't_inventorydeclaration_declare',
      from: [],
      to: 'Declared',
      trigger: 'creation',
      requiredRole: 'inventorydeclaration:declare',
      requiredFields: ['materialCode', 'totalQty'],
      // Σ batch qty must equal totalQty when batch detail is present.
      policyHooks: [POLICY_HOOKS.INV_DECLARE_BATCH_TOTAL],
      version: 1,
    },
  ],
};
