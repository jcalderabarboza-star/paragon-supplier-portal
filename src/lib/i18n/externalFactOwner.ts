// ─────────────────────────────────────────────────────────────────────────────
// EXTERNAL-FACT OWNER → i18n KEY. The ONE map, for the reason `stepKind.ts` is
// a map (§52) — stated once there, and the shape is copied here deliberately.
//
// A `Record<ExternalFactOwner, string>` is exhaustive BY TYPE: the union gains a
// member and `tsc` fails at THIS FILE until the key exists. The alternative —
// a ternary or a lookup with a fall-through — makes a fourth owner a SILENT
// MISLABEL rather than a compile error, on every surface, in both locales.
//
// ⚠️ **AND THE OWNER NAMES THEMSELVES ARE NOT TRANSLATED, WHICH IS A DECISION
// AND NOT AN OMISSION.** `S/4HANA` and `TMS` are product and protocol names —
// the same class `channelLabel.ts` already keys to identical EN/ID values
// ("API, API Push, EDI → protocol names — NOT translated"). What DOES translate
// is the FRAMING around them (`processFlows.owner.ownedBy`), so an Indonesian
// reader gets an Indonesian sentence about an English proper noun, which is how
// the rest of this tree already reads. `bank` is the exception in the other
// direction: it is a common noun, not a product, so it translates.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExternalFactOwner } from '../../services/transitions/schema';

/**
 * ⚠️ **DO NOT WIDEN THIS TO `Partial<Record<…>>` AND DO NOT ADD A DEFAULT.**
 * Both restore the silent fall-through the map exists to remove.
 */
export const EXTERNAL_FACT_OWNER_KEY: Record<ExternalFactOwner, string> = {
  s4hana: 'processFlows.owner.s4hana',
  tms: 'processFlows.owner.tms',
  bank: 'processFlows.owner.bank',
};
