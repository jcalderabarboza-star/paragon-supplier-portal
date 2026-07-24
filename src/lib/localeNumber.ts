// ─────────────────────────────────────────────────────────────────────────────
// localeNumber — the ONE legal numeric-entry parser (CP-0 · W1).
//
// A single, source-agnostic normaliser for free-text quantities and prices that
// span the two number conventions this product serves (Bahasa id · English en).
// Every numeric entry path — a WhatsApp reply, an XLSX cell, a form field, a
// bulk-grid cell — routes through `normalizeQty`. There is ONE implementation and
// ONE refusal contract; no path re-derives its own coercion.
//
// This lives in `lib/` (the lowest layer — imports nothing app-specific) so that
// `services/channel`, `services/sdc`, and the `pages-v2` submit models can all
// consume it without an import cycle. It was extracted here from the channel reply
// parser (`services/channel/replyParser.ts`), its first consumer, which now re-
// exports these symbols for back-compat.
//
// ── THE CONTRACT ─────────────────────────────────────────────────────────────
//   · A plausible WRONG number is never produced. The catastrophic misreadings
//     ("2.400" → 2.4, "2,4" → 24, "10.000" → 10) only exist under the OTHER
//     convention, so a cross-convention disagreement without a hint REFUSES
//     (AMBIGUOUS_QTY) rather than guessing. Honest silence over a wrong value —
//     the platform's core discipline applied to its own arithmetic.
//   · A refusal is never a legal zero. Callers must NOT `|| 0` / `?? 0` a refusal
//     into a number: a zero is a COMMITMENT ("cannot supply"), it must be entered,
//     never defaulted from garbage.
// ─────────────────────────────────────────────────────────────────────────────

/** The two numeric conventions this input class spans. */
export type NumberConvention = 'id' | 'en';

/** Why a quantity token was refused (honest silence — never a guessed number). */
export type QtyRefusalReason = 'EMPTY_QTY' | 'NOT_NUMERIC' | 'AMBIGUOUS_QTY';

export type QtyOutcome =
  | { readonly ok: true; readonly canonical: string; readonly value: number }
  | { readonly ok: false; readonly reason: QtyRefusalReason };

const SEP: Record<NumberConvention, { thousands: string; decimal: string }> = {
  id: { thousands: '.', decimal: ',' },
  en: { thousands: ',', decimal: '.' },
};

/**
 * Evaluate a token under ONE convention with STRICT grouping: a thousands run must
 * be exactly 3 digits (the first group 1–3), and at most one decimal part (digits
 * only). Returns the canonical value, or null when the token is malformed under
 * this convention. Strict grouping is what turns "2,4" under EN (comma = thousands,
 * only 1 trailing digit) into a null instead of a bogus 24.
 */
function evalConvention(
  token: string,
  conv: NumberConvention,
): { canonical: string; value: number } | null {
  const { thousands, decimal } = SEP[conv];

  const decParts = token.split(decimal);
  if (decParts.length > 2) return null; // more than one decimal separator
  const intRaw = decParts[0];
  const fracRaw = decParts.length === 2 ? decParts[1] : null;
  if (fracRaw !== null && !/^\d+$/.test(fracRaw)) return null; // fraction: digits only, non-empty
  if (intRaw === '') return null;

  let intDigits: string;
  if (intRaw.includes(thousands)) {
    const groups = intRaw.split(thousands);
    if (groups.length < 2) return null;
    if (!/^\d{1,3}$/.test(groups[0])) return null; // leading group 1–3 digits
    for (let i = 1; i < groups.length; i++) {
      if (!/^\d{3}$/.test(groups[i])) return null; // every later group EXACTLY 3
    }
    intDigits = groups.join('');
  } else {
    if (!/^\d+$/.test(intRaw)) return null;
    intDigits = intRaw;
  }

  const canonical = fracRaw !== null ? `${intDigits}.${fracRaw}` : intDigits;
  const value = Number(canonical);
  if (!Number.isFinite(value) || value < 0) return null;
  return { canonical, value };
}

/**
 * Normalise a free-text quantity to a canonical numeric string, honestly.
 *
 * Evaluates the token under BOTH conventions and decides:
 *   · valid under ONE only        → that value (unambiguous — e.g. "2,4" is only
 *                                    legal as ID decimal; EN comma-thousands needs
 *                                    3 digits, so it can never become 24);
 *   · valid under BOTH, equal      → that value (e.g. "2400");
 *   · valid under BOTH, different  → the `hint` convention if given, else
 *                                    AMBIGUOUS_QTY (e.g. "2.400" = 2400 or 2.4);
 *   · valid under NEITHER          → NOT_NUMERIC.
 *
 * A plausible wrong number can therefore never be produced: the catastrophic
 * readings ("2.400" → 2.4, "2,4" → 24) only exist under the OTHER convention, and
 * a cross-convention disagreement without a hint refuses rather than guesses.
 */
export function normalizeQty(raw: string, hint?: NumberConvention): QtyOutcome {
  const s = raw.trim();
  if (s === '') return { ok: false, reason: 'EMPTY_QTY' };
  if (!/^[\d.,]+$/.test(s)) return { ok: false, reason: 'NOT_NUMERIC' };

  const id = evalConvention(s, 'id');
  const en = evalConvention(s, 'en');

  if (!id && !en) return { ok: false, reason: 'NOT_NUMERIC' };
  if (id && !en) return { ok: true, canonical: id.canonical, value: id.value };
  if (en && !id) return { ok: true, canonical: en.canonical, value: en.value };
  // both valid
  if (id!.value === en!.value) return { ok: true, canonical: id!.canonical, value: id!.value };
  // both valid but genuinely different → a hint decides, else honest refusal
  if (hint === 'id') return { ok: true, canonical: id!.canonical, value: id!.value };
  if (hint === 'en') return { ok: true, canonical: en!.canonical, value: en!.value };
  return { ok: false, reason: 'AMBIGUOUS_QTY' };
}
