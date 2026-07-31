// ────────────────────────────────────────────────────────────────────────────
// fxRateInput (CP-0 · 2e-c-4) — the ONE read of a typed exchange rate, and of
// the vintage that makes it a fact.
//
// This is the CP-0 signature defect arriving at a new field, and arriving at
// the worst possible one. "17.250" is 17,250 rupiah per dollar to an Indonesian
// buyer and 17.25 to an English-convention parser — a 1000× error, not on one
// quote but on the BASIS the whole comparison is ranked against. Every foreign
// bid on the RFQ would be re-denominated by it, and the resulting ranking would
// look entirely plausible.
//
// So the rate goes through `normalizeQty` — the ONE legal numeric parser — with
// NO convention hint. A buyer's own form carries no origin convention, and per
// 2c the UI language is not one either, so a token legal under both readings
// REFUSES rather than being guessed. Same discipline as `readBidPrice`, for the
// same reason one level up: a misread bid loses one supplier the award, a
// misread rate decides the award.
//
// PURE and DOM-free, so every refusal branch is confirmable headlessly.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

/**
 * Why a typed rate was refused. Extends the parser's vocabulary with the one
 * refusal that is a DOMAIN rule rather than a reading failure.
 *
 * `ZERO_RATE`: perfectly readable, and not a rate. Zero would make every
 * foreign bid worth nothing; a negative is unreachable here because
 * `normalizeQty` only admits `[\d.,]`, so a typed minus is already NOT_NUMERIC.
 */
export type FxRateRefusalReason = QtyRefusalReason | 'ZERO_RATE';

export type FxRateOutcome =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: FxRateRefusalReason };

/** Read a typed exchange rate, honestly. */
export function readFxRate(raw: string): FxRateOutcome {
  const parsed = normalizeQty(raw);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  if (parsed.value === 0) return { ok: false, reason: 'ZERO_RATE' };
  return { ok: true, value: parsed.value };
}

/**
 * Why a typed vintage was refused.
 *
 * `FUTURE_VINTAGE` is the rule worth having: `asOf` states when a rate WAS
 * true, and a rate cannot have been true tomorrow. Beyond being incoherent, a
 * future vintage would defeat the staleness gate outright — a rate dated next
 * month never ages past `FX_PIN_MAX_AGE_DAYS`, so it would rank forever without
 * ever asking to be superseded.
 */
export type FxVintageRefusalReason = 'EMPTY_VINTAGE' | 'UNREADABLE_VINTAGE' | 'FUTURE_VINTAGE';

export type FxVintageOutcome =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: FxVintageRefusalReason };

/**
 * Read a typed rate vintage (an ISO `yyyy-mm-dd` from a date input).
 *
 * `now` is injected so the future check is deterministic in specs. Compared at
 * DAY granularity: a rate stated as of today is not in the future merely
 * because the clock has advanced past midnight UTC in some other timezone.
 */
export function readFxVintage(raw: string, now: Date = new Date()): FxVintageOutcome {
  const s = raw.trim();
  if (s === '') return { ok: false, reason: 'EMPTY_VINTAGE' };
  const parsed = new Date(s);
  if (!Number.isFinite(parsed.getTime())) return { ok: false, reason: 'UNREADABLE_VINTAGE' };
  const today = now.toISOString().slice(0, 10);
  if (s > today) return { ok: false, reason: 'FUTURE_VINTAGE' };
  return { ok: true, value: s };
}
