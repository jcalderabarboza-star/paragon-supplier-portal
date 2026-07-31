// ────────────────────────────────────────────────────────────────────────────
//  fxPin (CP-0 · 2e-c-3) — the recorded basis a multi-currency comparison is
//  ranked against.
//
//  WHY A PIN EXISTS AT ALL. Ratio-to-best price scoring compares numbers. Feed
//  it bids in two currencies and it compares NUMERALS: an EUR 3.00 bid beside
//  IDR 15,000 bids makes 3 the set minimum, collapsing every honest rupiah quote
//  to a price score near zero (2e-c-2-FIND-01). Comparing them honestly needs a
//  rate, and a rate is a fact with a source and a vintage — not an ambient
//  constant the engine may reach for.
//
//  D-1, THE FREEZE. A pin LOCKS. Once a rate is recorded it is never edited; a
//  moved rate is recorded as a NEW pin that supersedes the old one, and the old
//  one stays. This is structural here, not a UI convention:
//
//    • `FxPin` is deeply `readonly` — there is no field to assign to.
//    • `fxPins` is an APPEND-ONLY LEDGER, not a map keyed by currency. Nothing
//      overwrites; superseding means appending, and the prior basis remains
//      readable for exactly as long as the RFQ does.
//    • The effective pin is DERIVED (`effectivePin`), never stored, so "which
//      rate is current" cannot drift from the ledger that justifies it.
//
//  There is no edit path to forget to guard, which is the only kind of lock
//  worth having.
//
//  ⚠ INTERPRETATION, FLAGGED FOR THE OPERATOR. D-1 says the pin locks "at first
//  scored render". Implemented here as locks ON RECORDING, which is strictly
//  stronger: it also covers correcting a pin before anyone has scored against
//  it. The weaker reading would require tracking whether a render had yet
//  consumed a pin — state that only a render could set, which would make
//  scoring a write. A pure engine cannot own that, and a render that mutates
//  governed data to record that it rendered is worse than the stricter rule.
//  The cost is that a buyer who fat-fingers a rate must supersede rather than
//  edit; the benefit is that every basis a comparison ever used is on the
//  record. Say the word if the weaker reading was meant.
//
//  NOT STORED ON THE QUOTATION. The comparison value is derived at read
//  (`unitPrice × rate`). An SAP rate correction must never require migrating a
//  stored fact — the pin is the fact, the converted number is a view of it.
// ────────────────────────────────────────────────────────────────────────────

import { FX_PIN_MAX_AGE_DAYS, type BidCurrency } from './currencyPolicy';

/** Where a pinned rate came from. Provenance is part of the fact, not metadata
 *  about it: "a buyer typed this" and "S/4HANA said this" are different claims,
 *  and a comparison ranked on the first must never look like the second. */
export type FxPinSource = 'MANUAL' | 'SAP_EXHGRATE';

/** Feed liveness, mirroring the should-cost engine's axis: a pin off a
 *  simulated feed is a rehearsal reference and the surface must be able to say
 *  so. Same vocabulary as `FeedLiveness` in the should-cost engine. */
export type FxPinLiveness = 'SIMULATED' | 'LIVE';

/**
 * ONE recorded exchange-rate basis, for ONE currency, on ONE RFQ.
 *
 * Deeply readonly on purpose — see the D-1 note in the module header. To change
 * a rate, append a superseding pin; there is deliberately no way to mutate one.
 */
export interface FxPin {
  /** The bid currency this pin converts FROM. */
  readonly quote: BidCurrency;
  /** The currency it converts TO — the comparison basis. */
  readonly base: BidCurrency;
  /**
   * Units of `base` per ONE unit of `quote` (e.g. 17_250 IDR per 1 USD). The
   * direction is stated because an inverted rate is silent: it produces a
   * plausible number and the wrong winner.
   */
  readonly rate: number;
  /** The RATE's own vintage (ISO date) — when the rate was true, not when it
   *  was pinned. This is what staleness measures. */
  readonly asOf: string;
  /** When the buyer recorded this pin (ISO timestamp). Audit, not staleness:
   *  it says when the decision was made, which is a different fact from how old
   *  the rate is. Also orders the ledger when two pins share an `asOf`. */
  readonly pinnedAt: string;
  readonly source: FxPinSource;
  /** The SAP rate type (e.g. 'M', 'B', 'G') when the source distinguishes them.
   *  Optional: a MANUAL pin has no rate type, and inventing one would dress a
   *  typed number as an SAP-governed rate. */
  readonly rateType?: string;
  readonly liveness: FxPinLiveness;
}

/** Why a set cannot be ranked. Never a fallback number — a comparison the
 *  engine cannot make honestly is refused, in the caller's own words. */
export type FxRefusalReason = 'FX_UNPINNED' | 'FX_STALE';

const MS_PER_DAY = 86_400_000;

/**
 * The pin currently in force for `currency` — the LAST recorded one, which is
 * what "supersedes" means on an append-only ledger. Derived, never stored.
 *
 * Ordered by `pinnedAt`, with later array position breaking a tie: two pins
 * recorded in the same millisecond are ordered by the sequence they were
 * appended in, which is the only ordering that exists at that resolution.
 */
export function effectivePin(
  pins: readonly FxPin[] | undefined,
  currency: BidCurrency,
): FxPin | undefined {
  if (!pins) return undefined;
  let winner: FxPin | undefined;
  for (const pin of pins) {
    if (pin.quote !== currency) continue;
    if (!winner || pin.pinnedAt >= winner.pinnedAt) winner = pin;
  }
  return winner;
}

/** Every pin ever recorded for `currency`, oldest first — the superseded basis
 *  D-1 requires be preserved. Nothing else in the app needs this; it exists so
 *  that "the prior basis is kept" is a readable fact rather than a claim. */
export function pinHistory(
  pins: readonly FxPin[] | undefined,
  currency: BidCurrency,
): readonly FxPin[] {
  return (pins ?? []).filter((p) => p.quote === currency);
}

/**
 * Is this pin's RATE too old to rank on? Measured from `asOf` (the rate's
 * vintage), evaluated with the clock AT READ.
 *
 * Clock-at-read is correct and is NOT the law-0.5 violation it resembles: law
 * 0.5 bans clock-derived states from TRANSITION TABLES — a machine may not
 * transition because time passed. Nothing transitions here. Staleness is a
 * derived property of a stored fact, computed when someone looks, exactly like
 * every other clock-projected display state in this codebase.
 */
export function isStalePin(pin: FxPin, now: Date = new Date()): boolean {
  const asOf = new Date(pin.asOf).getTime();
  // An unparseable vintage is treated as stale rather than fresh: an unreadable
  // date is not evidence that a rate is current, and defaulting to fresh would
  // rank on it.
  if (!Number.isFinite(asOf)) return true;
  return (now.getTime() - asOf) / MS_PER_DAY > FX_PIN_MAX_AGE_DAYS;
}

/** A pin's age in whole days from its vintage — for the surface to state, so a
 *  refusal can say HOW stale rather than merely that it is. */
export function pinAgeDays(pin: FxPin, now: Date = new Date()): number | null {
  const asOf = new Date(pin.asOf).getTime();
  if (!Number.isFinite(asOf)) return null;
  return Math.floor((now.getTime() - asOf) / MS_PER_DAY);
}

/** Is this a usable pin record at all? The shape gate the policy hook and the
 *  engine share, so a stored pin and a dispatched one are held to one standard. */
export function isUsableRate(rate: unknown): rate is number {
  // `> 0` and finite: a zero or negative rate is not a slightly-wrong rate, it
  // is a division that produces nonsense or an inverted comparison. NaN passes
  // `typeof === 'number'`, which is the 4a-FIND-01 class, so `isFinite` is the
  // guard rather than `typeof`.
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
}
