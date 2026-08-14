// ─────────────────────────────────────────────────────────────────────────────
// GL-0 · THE GLOSSARY, ASSEMBLED. **Rendered since GL-1** by
// `pages-v2/Glossary.tsx`, which is the only consumer; the appearance and
// relation derivations that page shows live in `pages-v2/glossary/
// appearances.ts`, NOT here — this module keeps its type-only dependencies.
//
// ⚠️ **SCOPE IS AUTHORED, AND SAYING SO IS THE HONEST PART.** The tree holds
// 143 closed string-literal unions / 580 members (derived — see
// `glossary.coverage.test.ts`). Most are UI mechanics: `ToastVariant`,
// `TimelineEventStatus`, `EdgeRoute`, `CHART_SERIES` (hex colours). Those are
// not vocabulary and a definition for them would be a summary of the
// implementation, which is the failure mode PF-2 tested for and passed.
//
// So GL-0 registers a NAMED SCOPE — the REFUSAL and GOVERNANCE vocabularies,
// the terms a procurement reviewer would actually correct — and does NOT claim
// a mechanical eligibility rule it does not have. What IS mechanical:
//   · every registered union is exhaustive, enforced by `tsc` via `satisfies`;
//   · the scope list is pinned BILATERALLY by the coverage test, so a scoped
//     union that vanishes goes red and a registry with no scope row goes red;
//   · the full derived population is reported, so GL-0b has a worklist rather
//     than a rediscovery.
//
// ── ⚠️ FLOW STATES AND TRANSITIONS ARE DELIBERATELY NOT HERE ────────────────
//   The dispatch listed them, and they already have this exact thing:
//   `services/transitions/annotations.ts` holds an authored purpose per flow and
//   per transition, keyed by derived identity, with the prose in
//   `lib/i18n/processFlowPurpose.ts` (EN + ID) and `annotations.test.ts` pinning
//   the two bilaterally. **Re-authoring them here would create the second copy
//   that file's own header forbids** — and a second copy is the half that goes
//   wrong silently. The glossary DEFERS to it. **GL-1 kept that fence:** a term
//   whose word occurs in a machine gets a LINK to Process Flows and a derived
//   list of where it occurs — never a sentence about what that machine is for.
// ─────────────────────────────────────────────────────────────────────────────
export type { GlossaryEntry, GlossaryOf } from './types';

export {
  COMMAND_REFUSAL_GLOSSARY,
  DATA_ERROR_GLOSSARY,
  SETTLE_FAULT_GLOSSARY,
  FX_REFUSAL_GLOSSARY,
  QTY_REFUSAL_GLOSSARY,
  HALAL_REFUSAL_GLOSSARY,
  BPOM_REFUSAL_GLOSSARY,
  HALAL_NOT_SATISFIED_GLOSSARY,
} from './refusals.glossary';

export {
  ENFORCEMENT_MODE_GLOSSARY,
  GOVERNED_CHECK_GLOSSARY,
  GOVERNED_VERDICT_GLOSSARY,
  OVERRIDE_REASON_GLOSSARY,
  UNATTRIBUTED_REASON_GLOSSARY,
  ENFORCEMENT_MODE_SOURCE_GLOSSARY,
  COMPLIANCE_DISPLAY_GLOSSARY,
  CERT_TYPE_GLOSSARY,
  HALAL_APPLICABILITY_GLOSSARY,
  BPOM_APPLICABILITY_GLOSSARY,
} from './governance.glossary';

import {
  COMMAND_REFUSAL_GLOSSARY,
  DATA_ERROR_GLOSSARY,
  SETTLE_FAULT_GLOSSARY,
  FX_REFUSAL_GLOSSARY,
  QTY_REFUSAL_GLOSSARY,
  HALAL_REFUSAL_GLOSSARY,
  BPOM_REFUSAL_GLOSSARY,
  HALAL_NOT_SATISFIED_GLOSSARY,
} from './refusals.glossary';
import {
  ENFORCEMENT_MODE_GLOSSARY,
  GOVERNED_CHECK_GLOSSARY,
  GOVERNED_VERDICT_GLOSSARY,
  OVERRIDE_REASON_GLOSSARY,
  UNATTRIBUTED_REASON_GLOSSARY,
  ENFORCEMENT_MODE_SOURCE_GLOSSARY,
  COMPLIANCE_DISPLAY_GLOSSARY,
  CERT_TYPE_GLOSSARY,
  HALAL_APPLICABILITY_GLOSSARY,
  BPOM_APPLICABILITY_GLOSSARY,
} from './governance.glossary';
import type { GlossaryEntry } from './types';

/** The shape of one registry row. Checked by `satisfies`, never widened onto
 *  the exported const — see `GlossaryRef` below for why the literals matter. */
export interface GlossaryRegistry {
  readonly sourceType: string;
  readonly sourceFile: string;
  readonly entries: Readonly<Record<string, GlossaryEntry>>;
}

/**
 * THE REGISTERED SCOPE. `sourceType` is the union each registry is pinned to,
 * and `sourceFile` is where that union lives — both checked by the coverage
 * test, so a row cannot point at a union that no longer exists.
 *
 * ⚠️ **DECLARED `as const`, AND THE LITERALS ARE LOAD-BEARING (GL-1).** The
 * previous annotation widened `sourceType` to `string` and `entries` to
 * `Record<string, …>`, which was harmless while nothing consumed it. GL-1's
 * term chips need a REF a caller cannot get wrong — `sourceType:
 * 'QtyRefusalReason'` with `term: 'FX_STALE'` must not compile — and the only
 * honest way to have that is to DERIVE the ref type from this list rather than
 * spell a second one beside it. Widening here silently disarms `GlossaryRef`.
 */
const REGISTRIES = [
  { sourceType: 'CommandRefusal', sourceFile: 'src/services/transitions/refusals.ts', entries: COMMAND_REFUSAL_GLOSSARY },
  { sourceType: 'DataErrorCode', sourceFile: 'src/services/data/types.ts', entries: DATA_ERROR_GLOSSARY },
  { sourceType: 'SettleFault', sourceFile: 'src/services/transitions/settleFaults.ts', entries: SETTLE_FAULT_GLOSSARY },
  { sourceType: 'FxRefusalReason', sourceFile: 'src/lib/fxPin.ts', entries: FX_REFUSAL_GLOSSARY },
  { sourceType: 'QtyRefusalReason', sourceFile: 'src/lib/localeNumber.ts', entries: QTY_REFUSAL_GLOSSARY },
  { sourceType: 'HalalRefusalReason', sourceFile: 'src/services/sdc/halal.ts', entries: HALAL_REFUSAL_GLOSSARY },
  { sourceType: 'BpomRefusalReason', sourceFile: 'src/services/sdc/bpom.ts', entries: BPOM_REFUSAL_GLOSSARY },
  { sourceType: 'HalalNotSatisfiedReason', sourceFile: 'src/services/data/halalVerification.ts', entries: HALAL_NOT_SATISFIED_GLOSSARY },
  { sourceType: 'EnforcementMode', sourceFile: 'src/lib/enforcement.ts', entries: ENFORCEMENT_MODE_GLOSSARY },
  { sourceType: 'GovernedCheckId', sourceFile: 'src/lib/enforcement.ts', entries: GOVERNED_CHECK_GLOSSARY },
  { sourceType: 'GovernedVerdict', sourceFile: 'src/lib/enforcement.ts', entries: GOVERNED_VERDICT_GLOSSARY },
  { sourceType: 'OverrideReason', sourceFile: 'src/lib/enforcement.ts', entries: OVERRIDE_REASON_GLOSSARY },
  { sourceType: 'UnattributedReason', sourceFile: 'src/lib/enforcement.ts', entries: UNATTRIBUTED_REASON_GLOSSARY },
  { sourceType: 'EnforcementModeSource', sourceFile: 'src/lib/enforcement.ts', entries: ENFORCEMENT_MODE_SOURCE_GLOSSARY },
  { sourceType: 'ComplianceDisplayStatus', sourceFile: 'src/services/data/types.ts', entries: COMPLIANCE_DISPLAY_GLOSSARY },
  { sourceType: 'CertType', sourceFile: 'src/services/data/types.ts', entries: CERT_TYPE_GLOSSARY },
  { sourceType: 'HalalApplicability', sourceFile: 'src/services/sdc/types.ts', entries: HALAL_APPLICABILITY_GLOSSARY },
  { sourceType: 'BpomApplicability', sourceFile: 'src/services/sdc/types.ts', entries: BPOM_APPLICABILITY_GLOSSARY },
] as const satisfies readonly GlossaryRegistry[];

export const GLOSSARY_REGISTRIES: typeof REGISTRIES = Object.freeze(REGISTRIES);

/**
 * A POINTER TO ONE DEFINED TERM — the type a glossary chip takes.
 *
 * ⚠️ **DERIVED FROM `REGISTRIES`, NEVER SPELLED.** This is a discriminated union
 * with one arm per registry, and each arm's `term` is `keyof` that registry's
 * own entries — which are `satisfies`-pinned to the source union. So the chain
 * runs source union → registry → ref → chip with no hand-written copy anywhere
 * along it: a member added to `QtyRefusalReason` becomes a legal chip term with
 * no edit here, and a member deleted stops compiling at every site that named
 * it. A hand-listed `type GlossaryTerm = 'EMPTY_QTY' | …` would have been the
 * second copy, and the second copy is the half that rots.
 */
export type GlossaryRef = (typeof REGISTRIES)[number] extends infer R
  ? R extends { readonly sourceType: infer S; readonly entries: infer E }
    ? { readonly sourceType: S; readonly term: Extract<keyof E, string> }
    : never
  : never;

/** The anchor a term is addressed by, on the page and in a chip's href. */
export function glossaryAnchor(ref: { sourceType: string; term: string }): string {
  return `${ref.sourceType}.${ref.term}`;
}

/** Every defined term, flattened. The coverage test's population; the PAGE
 *  builds its own view (`pages-v2/glossary/appearances.ts`) because it needs the
 *  registry derivations this module deliberately cannot reach. */
export const ALL_GLOSSARY_TERMS: readonly (GlossaryEntry & {
  readonly term: string;
  readonly sourceType: string;
})[] = Object.freeze(
  GLOSSARY_REGISTRIES.flatMap((r) =>
    Object.entries(r.entries).map(([term, e]) => ({ ...e, term, sourceType: r.sourceType })),
  ),
);
