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
//
// ── MEMBERSHIP IS A CLASSIFIER INPUT, NOT A RESOLVER (CP-2 · B1) ─────────────
//   `knownMaterials` does NOT resolve or rewrite anything: the token is still
//   carried verbatim and C2 still confirms it. It only decides WHICH TOKEN is
//   the material — which is a classification question, not a resolution one.
//   The distinction matters because the previous classifier answered it by SHAPE
//   ("has a letter and a digit"), and canonical S/4 MATNR is frequently NUMERIC,
//   so it handed real material codes to the QUANTITY slot. That is a FABRICATION
//   defect, not silence: it proposes a plausible wrong row. Membership-first
//   fixes it with no policy decision about what a code may look like — and per
//   Seat 3's ratified ruling, prefix-derived semantics are retired as a class:
//   materialCode is OPAQUE, membership replaces shape.
// ─────────────────────────────────────────────────────────────────────────────

import { IMPORT_DECLARE_COLUMN, type GridParseSpec, type GridRow } from '../sdc';
import { normalizeQty, type NumberConvention, type QtyRefusalReason } from '../../lib/localeNumber';

// ─── Locale-aware quantity normalisation ──────────────────────────────────────
// The parser (CP-0 · W1) now lives in `lib/localeNumber` — the ONE legal numeric
// entry point, shared by every entry path (channel reply, XLSX, form, bulk grid).
// Re-exported here for back-compat: this file was its first home and consumers
// import `normalizeQty` / the qty types from `./replyParser`.
export {
  normalizeQty,
  type NumberConvention,
  type QtyRefusalReason,
  type QtyOutcome,
} from '../../lib/localeNumber';

// ─── The reply parser ─────────────────────────────────────────────────────────

/** Inventory-declaration command keywords (ID + EN). Extended as more intents
 *  gain a spine-wired verb; today only InventoryDeclaration rides `parseGrid`. */
const INVENTORY_COMMANDS = new Set(['STOK', 'STOCK', 'SOH']);

/** A token that is only digits + separators AND carries at least one digit. */
const isQtyLike = (t: string): boolean => /^[\d.,]+$/.test(t) && /\d/.test(t);
/** A short pure-letter token — a unit-of-measure candidate (diagnostic only). */
const isUomLike = (t: string): boolean => /^[A-Za-z]{1,5}$/.test(t);
/**
 * A MIXED-ALPHANUMERIC token (e.g. "MAT-10234") — renamed from `isCodeLike`
 * (CP-2 · B1), because that name promised "code-like" and delivered
 * "mixed-alphanumeric", EXCLUDING exactly the codes most likely to be canonical.
 * Canonical S/4 MATNR is frequently PURE NUMERIC, and the old name hid that:
 * a numeric code failed this test, fell through to `isQtyLike`, and was captured
 * as the QUANTITY. This is now a FALLBACK HINT only — membership decides first.
 */
const isMixedAlnum = (t: string): boolean =>
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
  /**
   * HOW the material token was chosen (CP-2 · B1) — display/provenance only.
   * 'membership' = the token IS a known material code, so shape was irrelevant.
   * 'shape'      = no membership hit; a mixed-alphanumeric token was guessed.
   * C2 shows a shape-guessed token as exactly that: a suggestion to confirm.
   * Absent when no material token was found at all.
   */
  readonly materialMatch?: 'membership' | 'shape';
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
  /**
   * ⭐ CP-2 · B1 — THE MEMBERSHIP SET, and the fix for a FABRICATION defect.
   *
   * The material codes this reply could legitimately name — the material master,
   * or (better) the SUBJECT SUPPLIER'S collaborated set, which the confirm
   * surface already computes. Injected rather than imported: this parser is PURE
   * and does not resolve materials (see the header), and the caller alone knows
   * whose reply this is.
   *
   * WHY IT MATTERS. Before this, two independent first-match scans ran with NO
   * PRECEDENCE, and the material classifier required at least one LETTER. So in
   * "STOK 10234 500 KG" — with 10234 a perfectly canonical numeric MATNR — the
   * code failed the shape test, fell through, and was captured as the QUANTITY.
   * Add any other mixed-alphanumeric token and THAT became the material while
   * 10234 stayed the quantity: a PLAUSIBLE WRONG ROW proposed into the hub,
   * gated only by a human confirm. Not silence — FABRICATION.
   *
   * THE RULE: a token in this set is a material candidate REGARDLESS OF SHAPE,
   * and can NEVER be consumed by `isQtyLike`. Shape drops to a fallback hint.
   * This handles numeric MATNR with no policy decision at all.
   *
   * Omitted ⇒ shape-only, i.e. exactly the previous behaviour.
   */
  readonly knownMaterials?: Iterable<string>;
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

  // ── CP-2 · B1 — EXPLICIT PRECEDENCE (was: two racing first-match scans) ─────
  //   1. MEMBERSHIP wins. The first token that IS a known material code is the
  //      material, whatever its shape — this is what makes a numeric MATNR work.
  //   2. SHAPE is the fallback hint, used only when membership found nothing.
  //   3. QUANTITY is scanned LAST and skips the material index, so a token
  //      matching the master can never be consumed by `isQtyLike`.
  //  The old code ran (1)-less and scanned material and qty INDEPENDENTLY, so a
  //  numeric code lost the race to the qty classifier and both were wrong.
  const known = new Set(options.knownMaterials ?? []);
  let materialTok: string | null = null;
  let materialIdx = -1;
  let materialMatch: 'membership' | 'shape' | undefined;

  if (known.size > 0) {
    materialIdx = rest.findIndex((tok) => known.has(tok));
    if (materialIdx >= 0) {
      materialTok = rest[materialIdx];
      materialMatch = 'membership';
    }
  }
  if (materialTok === null) {
    materialIdx = rest.findIndex(isMixedAlnum);
    if (materialIdx >= 0) {
      materialTok = rest[materialIdx];
      materialMatch = 'shape';
    }
  }

  let qtyTok: string | null = null;
  const qtyIdx = rest.findIndex((tok, i) => i !== materialIdx && isQtyLike(tok));
  if (qtyIdx >= 0) qtyTok = rest[qtyIdx];
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
  const matDiag = materialMatch !== undefined ? { materialMatch } : {};
  // A MEMBERSHIP hit is strictly more certain than a shape guess: the token IS a
  // material we know, not a token that looks like one. Shape-path confidences are
  // unchanged. Still a DISPLAY signal, never a gate — C2 confirm is always required.
  const membershipHit = materialMatch === 'membership';

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
          confidence: membershipHit ? (uomTok !== null ? 0.95 : 0.85) : uomTok !== null ? 0.9 : 0.75,
          ...uomDiag,
          ...matDiag,
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
        ...matDiag,
      },
    };
  }

  // Intent recognised but a required part is missing — no row.
  return {
    proposedRows: [],
    specHint: spec,
    diagnostics: { matchedTokens, unparsedRemainder, confidence: 0.2, ...uomDiag, ...matDiag },
  };
}
