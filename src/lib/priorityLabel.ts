// ────────────────────────────────────────────────────────────────────────────
// Central enum-label map (SEAT2-I18N-ENUM-01) — the priority/severity sibling of
// statusLabel.ts.
//
// These tokens (Critical/High/Medium/Low priority + risk severity, GR
// disposition, inspection Pass/Fail/N/A) are a shared, context-INDEPENDENT
// vocabulary. statusTone.ts deliberately excludes them because their *tone* is
// context-dependent (a High priority is a caution; a High risk is critical) —
// but their *label* is not, so they localize from ONE place here, the same
// translate-once contract StatusPill already uses for canonical statuses.
//
// HONEST-BY-CONSTRUCTION: this map localizes the DISPLAYED label only. Where a
// value is SUBMITTED as mutation data — the GR wizard's `receivedBy` role and
// `warehouse` (the option label IS the stored value) — the stored value stays
// canonical EN and is NOT routed through here. Where display and data cleanly
// separate (a `<option value="High">{localized}</option>`, or a Pass/Fail radio
// whose state stays canonical), only the visible label is translated.
//
// Slugs are namespaced `enum.*` (distinct from `status.*`) so the two SSoT
// resource sets never collide, even for tokens both maps carry (Reject, Pending,
// Pass, Fail, N/A) — StatusPill consults statusLabel FIRST, so existing status
// pills stay byte-identical; the enum map is the fallback.
// ────────────────────────────────────────────────────────────────────────────

// Canonical enum token → Bahasa Indonesia. Keyed by the exact canonical string;
// resolution is case-insensitive (RiskSeverity is stored lowercase — 'high' —
// while PRPriority is 'High'; both resolve to the same label).
const ENUM_ID: Record<string, string> = {
  // priority / risk severity (one axis — the label is identical either way)
  Critical: 'Kritis',
  High: 'Tinggi',
  Medium: 'Sedang',
  Low: 'Rendah',
  // GR disposition (mockGoodsReceipts.ts `Disposition`)
  Accept: 'Terima',
  Reject: 'Tolak',
  Quarantine: 'Karantina',
  'Return to Supplier': 'Kembalikan ke Pemasok',
  Pending: 'Menunggu',
  // inspection check tokens (CheckResult / OptionalCheck)
  Pass: 'Lulus',
  Fail: 'Gagal',
  'N/A': 'T/A',
};

// The canonical set, in declaration order (the resource spread + guard test).
export const CANONICAL_ENUMS = Object.keys(ENUM_ID);

// Case-insensitive index: normalized token → canonical token.
const BY_NORM = new Map(
  CANONICAL_ENUMS.map((k) => [k.trim().toLowerCase(), k]),
);

/** Slug a canonical enum token into its i18n key: "Return to Supplier" → "enum.return_to_supplier". */
function slug(token: string): string {
  return (
    'enum.' +
    token
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

/**
 * The i18n key for an enum label, or null if the token is not part of the shared
 * enum vocabulary (the caller then renders it verbatim). Case-insensitive and
 * whitespace-trimmed, so both 'High' (priority) and 'high' (risk) resolve.
 */
export function enumLabelKey(token: string): string | null {
  const canon = BY_NORM.get(token.trim().toLowerCase());
  return canon ? slug(canon) : null;
}

/** i18n resource fragments — spread into the en/id translation namespaces. */
export const enumResourcesEn: Record<string, string> = Object.fromEntries(
  CANONICAL_ENUMS.map((s) => [slug(s), s]),
);
export const enumResourcesId: Record<string, string> = Object.fromEntries(
  CANONICAL_ENUMS.map((s) => [slug(s), ENUM_ID[s]]),
);

// Re-exported for the guard test (coverage + slug-collision checks).
export const __enumInternals = { ENUM_ID, slug };
