// ─────────────────────────────────────────────────────────────────────────────
// C1 — the CHANNEL-REPLY PARSER (headless, pure).
//
// Turns a free-text supplier reply into an INFERENCE the confirm surface (C2)
// shows before anything dispatches. It NEVER dispatches and NEVER fabricates.
//
// ── SHAPE (Seat 3 ratified) ──────────────────────────────────────────────────
//   The parser emits `GridRow[]`, and the dispatch path is
//   `GridRow → parseGrid → builder` — NOT the object builders directly. The
//   builders coerce `Number(...) || 0` (submitModel.ts:63), so a garbage qty would
//   become a legal ZERO-COMMITMENT ("cannot supply"). `parseGrid` surfaces
//   `INVALID_QTY` as honest silence instead. One governed entry point, and it IS
//   the ratified source-agnostic contract — a channel reply is the third emitter
//   of rows ("a grid emits them, an XLSX parse emits them"; ingest.ts).
//
// ── OUTPUT = an INFERENCE WRAPPER, not bare rows ─────────────────────────────
//   `{ proposedRows, specHint, diagnostics }`. LAW: the wrapper is DISPLAY /
//   PROVENANCE ONLY. On confirm (C2) it is STRIPPED and `parseGrid` receives
//   exactly `(proposedRows, context)`. NOTHING from the wrapper (specHint,
//   confidence, matchedTokens, uom) enters a payload — mirrors the XLSX mapping
//   split, where the grid stays the sole dispatch surface.
//
// ── LOCALE-AWARE QUANTITY (the binding constraint; Seat 3 caught a real bug) ──
//   `parseQty` (ingest.ts) does `raw.replace(/,/g, '')` — WRONG for Bahasa free
//   text, where '.' groups thousands and ',' is the decimal. "2.400" (=2400) would
//   read 2.4; "2,4" (=2.4) would read 24 — PLAUSIBLE WRONG NUMBERS, not failures.
//   The controlled grid never hit this; a WhatsApp message hits it immediately —
//   it is the DEFAULT case here. So C1 does its OWN grouping-validated,
//   convention-aware normalisation and emits an ALREADY-CANONICAL numeric string
//   (no separators, '.' decimal) that parseGrid's tolerance then passes through
//   cleanly. Honest silence (AMBIGUOUS_QTY) over a plausible wrong number, always.
//
// ── UN-FALSIFIABILITY ────────────────────────────────────────────────────────
//   · supplierId — the row shape has NO slot for it (only the import columns). The
//     app binds it into GridContext at confirm; a message claiming "I am sup-005"
//     is inert by construction.
//   · snapshot keys — ride the GridParseSpec arm, bound from the RENDERED object in
//     C2. A reply can never name a plan version.
//   · uom — a parsed "KG" is DIAGNOSTIC only (a C2 warn-on-mismatch hint); it is
//     NEVER a payload field (master-assigned, invariant #2).
//
// Alias / material resolution is NOT here — the material token is carried verbatim;
// C2 shows it as a confirmable suggestion, never a silent resolution.
// ─────────────────────────────────────────────────────────────────────────────

import { IMPORT_DECLARE_COLUMN, type GridParseSpec, type GridRow } from '../sdc';

// ─── Locale-aware quantity normalisation ──────────────────────────────────────

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

// ─── The reply parser ─────────────────────────────────────────────────────────

/** Inventory-declaration command keywords (ID + EN). Extended as more intents
 *  gain a spine-wired verb; today only InventoryDeclaration rides `parseGrid`. */
const INVENTORY_COMMANDS = new Set(['STOK', 'STOCK', 'SOH']);

/** A token that is only digits + separators AND carries at least one digit. */
const isQtyLike = (t: string): boolean => /^[\d.,]+$/.test(t) && /\d/.test(t);
/** A short pure-letter token — a unit-of-measure candidate (diagnostic only). */
const isUomLike = (t: string): boolean => /^[A-Za-z]{1,5}$/.test(t);
/** A code-like token: has BOTH a letter and a digit (e.g. "MAT-10234"). Excludes
 *  pure-numeric qty and pure-letter command/uom by construction. */
const isCodeLike = (t: string): boolean =>
  /[A-Za-z]/.test(t) && /\d/.test(t) && /^[A-Za-z0-9-]+$/.test(t);

export interface ChannelReplyDiagnostics {
  /** The tokens the parser recognised (command, material, qty, uom) — for display. */
  readonly matchedTokens: readonly string[];
  /** The leftover text the parser did not consume — for the C2 review pane. */
  readonly unparsedRemainder: string;
  /** A soft 0–1 display signal, NOT a gate. Confirm (C2) is always required. */
  readonly confidence: number;
  /** Present when a qty token was seen but honestly refused (no row emitted). */
  readonly qtyReason?: QtyRefusalReason;
  /** A parsed unit-of-measure — DIAGNOSTIC ONLY, never a payload field. */
  readonly uom?: string;
}

/**
 * The inference wrapper. `proposedRows` are plain `GridRow`s ready for `parseGrid`;
 * `specHint` suggests which `GridParseSpec` arm C2 should bind (null when no intent
 * was recognised). `diagnostics` is display/provenance only.
 */
export interface ChannelParseResult {
  readonly proposedRows: readonly GridRow[];
  readonly specHint: GridParseSpec | null;
  readonly diagnostics: ChannelReplyDiagnostics;
}

export interface ParseChannelReplyOptions {
  /** The supplier/channel numeric convention, disambiguating both-valid qtys.
   *  Bahasa is the default channel language, so 'id' is the typical hint. */
  readonly numberFormatHint?: NumberConvention;
}

/**
 * Parse a supplier reply into a governed InventoryDeclaration inference. Pure — no
 * dispatch, no store, no clock. Honest silence throughout: an unrecognised command
 * yields zero rows + a null specHint; a recognised command with a missing or
 * refused quantity yields zero rows + the honest reason. A row is emitted ONLY when
 * a material token AND a normalisable quantity are both present.
 */
export function parseChannelReply(
  rawText: string,
  options: ParseChannelReplyOptions = {},
): ChannelParseResult {
  const hint = options.numberFormatHint;
  const trimmed = rawText.trim();
  const tokens = trimmed === '' ? [] : trimmed.split(/\s+/);

  const command = (tokens[0] ?? '').toUpperCase();
  if (!INVENTORY_COMMANDS.has(command)) {
    // No recognised intent — honest silence, nothing bound.
    return {
      proposedRows: [],
      specHint: null,
      diagnostics: { matchedTokens: [], unparsedRemainder: trimmed, confidence: 0 },
    };
  }

  // Recognised inventory intent. Scan the remaining tokens for the parts.
  const rest = tokens.slice(1);
  let materialTok: string | null = null;
  let materialIdx = -1;
  let qtyTok: string | null = null;
  let qtyIdx = -1;
  rest.forEach((tok, i) => {
    if (materialTok === null && isCodeLike(tok)) {
      materialTok = tok;
      materialIdx = i;
    }
    if (qtyTok === null && isQtyLike(tok)) {
      qtyTok = tok;
      qtyIdx = i;
    }
  });
  // uom: the first pure-letter token AFTER the qty (never the material/qty itself).
  let uomTok: string | null = null;
  let uomIdx = -1;
  rest.forEach((tok, i) => {
    if (uomTok === null && i !== materialIdx && i !== qtyIdx && qtyIdx !== -1 && i > qtyIdx && isUomLike(tok)) {
      uomTok = tok;
      uomIdx = i;
    }
  });

  const consumed = new Set([materialIdx, qtyIdx, uomIdx].filter((i) => i >= 0));
  const unparsedRemainder = rest.filter((_, i) => !consumed.has(i)).join(' ');
  const matchedTokens = [tokens[0], materialTok, qtyTok, uomTok].filter(
    (t): t is string => t !== null,
  );
  const spec: GridParseSpec = { kind: 'InventoryDeclaration', mode: 'import' };
  const uomDiag = uomTok !== null ? { uom: uomTok } : {};

  // Both parts present — try to normalise the quantity.
  if (materialTok !== null && qtyTok !== null) {
    const qty = normalizeQty(qtyTok, hint);
    if (qty.ok) {
      // The ONLY keys are the import columns — no supplierId slot exists.
      const row: GridRow = {
        [IMPORT_DECLARE_COLUMN.materialCode]: materialTok,
        [IMPORT_DECLARE_COLUMN.totalQty]: qty.canonical,
      };
      return {
        proposedRows: [row],
        specHint: spec,
        diagnostics: {
          matchedTokens,
          unparsedRemainder,
          confidence: uomTok !== null ? 0.9 : 0.75,
          ...uomDiag,
        },
      };
    }
    // Qty seen but refused — no row, carry the honest reason.
    return {
      proposedRows: [],
      specHint: spec,
      diagnostics: {
        matchedTokens,
        unparsedRemainder,
        confidence: 0.3,
        qtyReason: qty.reason,
        ...uomDiag,
      },
    };
  }

  // Intent recognised but a required part is missing — no row.
  return {
    proposedRows: [],
    specHint: spec,
    diagnostics: { matchedTokens, unparsedRemainder, confidence: 0.2, ...uomDiag },
  };
}
