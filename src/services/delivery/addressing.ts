// ─────────────────────────────────────────────────────────────────────────────
// ADDRESSING — how a delivery command NAMES the thing it acts on.
//
// The dispatcher addresses one entity by one `entityId` string. This lane has
// two entities and therefore two address forms, and BOTH of them already
// existed in the data before this module did — which is the point:
//
//   · a SCHEDULE LINE is addressed by its `releaseRef`, the portal join-chain
//     `contractId/agreementId/lineSeq/releaseSeq` the generator has always
//     minted (`generator.ts`). It is deliberately DISTINCT from
//     `sapReleaseNumber` (honesty guard 6 — the portal never mints a competing
//     document identity), so using it as an `entityId` mints nothing.
//   · an AGREEMENT ITEM — the thing a drawdown policy belongs to — is addressed
//     by `agreementId#lineSeq`.
//
// ⚠️ **THE ADDRESS IS PARSED, NEVER TRUSTED.** Every resolver below returns
// `null` for a string it cannot resolve to a row that exists, so the dispatcher
// answers `NOT_FOUND` rather than silently creating or mis-binding. A caller
// that invents an address gets a refusal, not a neighbour.
//
// ⚠️ **AND THE ENTITY COMMANDED CANNOT DISAGREE WITH THE ROW WRITTEN.** There
// is no `agreementId` / `releaseSeq` payload field on any delivery verb: the
// address IS the coordinates, exactly as `t_enforcement_set`'s `entityId` IS
// the `GovernedCheckId` and `t_role_grant`'s IS the parent role.
// ─────────────────────────────────────────────────────────────────────────────

import { schedulingAgreementStore } from './stores/schedulingAgreementStore';
import type { ScheduleLine, SchedulingAgreement, SchedulingAgreementItem } from './types';

/** The four coordinates a `releaseRef` carries. */
export interface ReleaseAddress {
  readonly contractId: string;
  readonly agreementId: string;
  readonly lineSeq: number;
  readonly releaseSeq: number;
}

/** A positive integer written in plain decimal — no `+1`, no `1.0`, no ` 1 `. */
function asSeq(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Parse a `releaseRef` into its coordinates, or `null`.
 *
 * Exactly four segments: neither `contractId` nor `agreementId` may contain a
 * separator, which is true of every id this tree mints (`ctr-003`, `sa-0001`)
 * and is asserted over the live corpus rather than assumed.
 */
export function parseReleaseRef(ref: string): ReleaseAddress | null {
  const parts = ref.split('/');
  if (parts.length !== 4) return null;
  const [contractId, agreementId, lineRaw, releaseRaw] = parts;
  if (!contractId || !agreementId) return null;
  const lineSeq = asSeq(lineRaw);
  const releaseSeq = asSeq(releaseRaw);
  if (lineSeq === null || releaseSeq === null) return null;
  return { contractId, agreementId, lineSeq, releaseSeq };
}

/** The address of an agreement ITEM — the drawdown policy's entity. */
export function itemKey(agreementId: string, lineSeq: number): string {
  return `${agreementId}#${lineSeq}`;
}

/** Parse an item address, or `null`. */
export function parseItemKey(key: string): { agreementId: string; lineSeq: number } | null {
  const parts = key.split('#');
  if (parts.length !== 2) return null;
  const [agreementId, lineRaw] = parts;
  if (!agreementId) return null;
  const lineSeq = asSeq(lineRaw);
  return lineSeq === null ? null : { agreementId, lineSeq };
}

/** An item resolved against the live store, with its agreement. */
export interface ResolvedItem {
  readonly agreement: SchedulingAgreement;
  readonly item: SchedulingAgreementItem;
}

/** A schedule line resolved against the live store, with its parents. */
export interface ResolvedLine extends ResolvedItem {
  readonly line: ScheduleLine;
}

/**
 * Resolve an item address against the store.
 *
 * ⚠️ **THE `agreementId` IS THE AUTHORITY AND THE `contractId` IS NOT READ
 * HERE**, because an item address carries no contract. `resolveLine` below
 * checks BOTH, so a `releaseRef` whose contract segment names a different
 * contract from the agreement's own is refused rather than quietly honoured.
 */
export function resolveItem(key: string): ResolvedItem | null {
  const addr = parseItemKey(key);
  if (!addr) return null;
  const agreement = schedulingAgreementStore.get(addr.agreementId);
  if (!agreement) return null;
  const item = agreement.items.find((i) => i.lineSeq === addr.lineSeq);
  return item ? { agreement, item } : null;
}

/**
 * Resolve a `releaseRef` against the store — agreement, item and line.
 *
 * The `contractId` segment is VERIFIED against the agreement's own
 * `contractId`. A ref that agrees with itself but not with the row is a
 * mis-address, and answering `null` makes it `NOT_FOUND` instead of an act on
 * the wrong contract's calendar.
 */
export function resolveLine(ref: string): ResolvedLine | null {
  const addr = parseReleaseRef(ref);
  if (!addr) return null;
  const agreement = schedulingAgreementStore.get(addr.agreementId);
  if (!agreement || agreement.contractId !== addr.contractId) return null;
  const item = agreement.items.find((i) => i.lineSeq === addr.lineSeq);
  if (!item) return null;
  const line = item.scheduleLines.find((l) => l.releaseSeq === addr.releaseSeq);
  return line ? { agreement, item, line } : null;
}
