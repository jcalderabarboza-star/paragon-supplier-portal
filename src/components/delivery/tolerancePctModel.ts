// ────────────────────────────────────────────────────────────────────────────
// tolerancePctModel (CP-0 · W1 · 2f-d) — the ONE read of the drawdown-tolerance
// percentage.
//
// 2f-FIND-05, and this row SURVIVED its body-read too: `pctInvalid` really does
// catch blank, NaN and negative, and `canSave` really does gate the save. No
// value was ever fabricated here.
//
// AN EXPRESSIBILITY FAILURE, NOT A MISREAD — the first of its kind in this arc,
// and the reason this field is the most interesting result in the batch. The
// input was `type="number"`, so an id-ID user typing "2,5" — THE ONLY correct
// way to write two-and-a-half in the platform's default locale — had the token
// EATEN by the browser before React saw it (`.value === ''`). That landed on
// `pctInvalid`, which disabled Save… and rendered nothing, anywhere, because
// `pctInvalid` fed only `canSave`. The platform's default locale could not
// express a decimal tolerance, and refused to say why.
//
// Same family as 4b-FIND-01 (this codebase cannot test its own default locale),
// but where every prior member produced a WRONG VALUE, this one produced an
// IMPOSSIBLE INPUT. Nothing was misread because nothing could be entered.
//
// So the fix is a capability GAIN, not hygiene: under `normalizeQty`, "2,5" is
// UNAMBIGUOUS — the en reading cannot take a comma as a decimal point with a
// single trailing digit group of that shape, so exactly one convention parses it
// and 2.5 is the one honest answer. The value an Indonesian buyer could not
// enter at all is now simply correct.
//
// PERCENT IN, FRACTION OUT. The surface talks percent (the label is "%", the
// presets show 10%/25%); `TolerancePolicy.tolerancePct` stores a FRACTION
// (0.1 = 10%). That conversion is the one place a rounding artefact could
// appear, so it is done here and named, not scattered.
//
// NO UPPER BOUND, deliberately and on the record: a >100% tolerance is
// conceivably meaningful (a generous drawdown envelope), and inventing a ceiling
// to close a gap nobody asked about would be severity invention. Noted as a
// non-defect; no finding filed.
//
// A TYPED ZERO is a real, strict policy (exactly on the agreed quantity, no
// slack) and is DISTINCT from `null` = unlimited. Both are legal; neither is
// "absent". The pure `setActivePolicy` carries specs for both.
//
// PURE and DOM-free.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type QtyRefusalReason } from '../../lib/localeNumber';

export type TolerancePctOutcome =
  | {
      readonly ok: true;
      /** As typed, in PERCENT (2.5 for "2,5"). */
      readonly pct: number;
      /** The stored form, as a FRACTION (0.025). */
      readonly fraction: number;
    }
  | { readonly ok: false; readonly reason: QtyRefusalReason };

/**
 * Read the tolerance percentage.
 *
 * Negative needs no branch (`normalizeQty` refuses a leading `-` as
 * NOT_NUMERIC), which is why dropping the input's `min={0}` loses nothing — and
 * `setActivePolicy` refuses a negative fraction independently anyway (2f-d).
 */
export function readTolerancePct(raw: string): TolerancePctOutcome {
  const parsed = normalizeQty(raw);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  return { ok: true, pct: parsed.value, fraction: parsed.value / 100 };
}

/**
 * Seed the raw field from a stored fraction — the inverse of the read.
 *
 * CANONICAL and ungrouped. `0.1 → "10"`, not `"10,0"` or a grouped token the
 * parser would refuse. The float-tidy (`parseFloat(toFixed(4))`) exists because
 * `0.075 * 100` is `7.500000000000001` in IEEE 754: seeding that raw would put
 * a number nobody typed into the box and, worse, make an untouched Save look
 * like a real change. Fifth site of the IntakeAdjustDrawer seeding warning, and
 * the only one so far where the hazard is float representation rather than
 * digit grouping.
 */
export function seedTolerancePct(fraction: number | null): string {
  if (fraction === null) return '';
  return String(parseFloat((fraction * 100).toFixed(4)));
}
