// ─────────────────────────────────────────────────────────────────────────────
// PF-1 · CLOSED-VOCABULARY → i18n KEY, as exhaustive Records.
//
// ⚠️ **THE `Record<Union, string>` IS THE POINT, NOT THE STRING MAP.** Both
// vocabularies below are CLOSED and deliberately have no catch-all member
// (`looseEndCensus.ts` argues why: one `OTHER` turns a closed vocabulary into
// free text wearing an enum's clothes). A lookup written as a function with a
// default would silently render the raw token for a sixth reason nobody
// translated. Written as an exhaustive Record, adding a member to either union
// is a COMPILE ERROR here until its key exists — which is the build gate saying
// "you added a vocabulary word, now say it in both languages".
//
// The same discipline as the guidance layer's glossary-from-closed-unions
// ruling, one surface along.
// ─────────────────────────────────────────────────────────────────────────────

import type { LooseEndKind } from '../../services/transitions/flowGraph';
import type { LooseEndReason } from '../../services/transitions/looseEndCensus';

const REASON_KEY: Record<LooseEndReason, string> = {
  'deferred-edge': 'processFlows.reason.deferredEdge',
  'authored-unwired': 'processFlows.reason.authoredUnwired',
  'substrate-only': 'processFlows.reason.substrateOnly',
  'born-state': 'processFlows.reason.bornState',
};

const KIND_KEY: Record<LooseEndKind, string> = {
  'unreachable-state': 'processFlows.looseEnd.unreachableState',
  'exit-less-state': 'processFlows.looseEnd.exitLessState',
  'dead-transition': 'processFlows.looseEnd.deadTransition',
  'initial-integrity': 'processFlows.looseEnd.initialIntegrity',
  'unauthored-cascade': 'processFlows.looseEnd.unauthoredCascade',
};

/** The i18n key for a census REASON token (`deferred-edge`, `born-state`, …). */
export const reasonKey = (reason: LooseEndReason): string => REASON_KEY[reason];

/** The i18n key for a derived loose-end KIND (what the analyzer found). */
export const looseEndKindKey = (kind: LooseEndKind): string => KIND_KEY[kind];

/** Every reason token, for the reading key on the page. Derived from the map. */
export const ALL_REASONS = Object.keys(REASON_KEY) as LooseEndReason[];
