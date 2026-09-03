import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// DP2-PALETTE-01 — chart colour comes from the centralized palette
// (`src/lib/chartPalette.ts`), never a raw hex literal in a paint position.
//
// ── ⚠️ WHY THIS FILE WAS REWRITTEN (2026-09-02) ─────────────────────────────
//   It was the OLDEST honesty instrument in the tree (2026-07-09) and the only
//   one with NO controls at all, while the same file already derived its third
//   population via `readdirSync` — so the hand lists were an omission, not a
//   limitation.
//
//   The claim that stood here, quoted rather than deleted:
//
//     > // Files whose charts were migrated onto chartPalette in Commit 1.
//     > const GUARDED = ['BuyerDashboard.tsx', 'BuyerInventory.tsx', 'BuyerAnalytics.tsx'];
//
//   That is PROVENANCE — *which files a batch touched* — standing in for a
//   PROPERTY. Measured, it was wrong in BOTH directions:
//     · `BuyerInventory.tsx` imports no chart library and contains no paint
//       position at all, so guarding it asserted nothing;
//     · FOUR pages render charts and were not guarded — `BuyerInvoices`,
//       `BuyerRisk`, `BuyerScorecard`, `SupplierPerformance` — between them
//       holding TEN distinct raw-hex paint values the gate could not see.
//
//   The same defect sat six lines below it: `PALETTE_SOURCED` listed
//   `SupplierWhatsApp.tsx`, which declares no `TOKEN_*` const, so that row
//   asserted nothing either.
//
// ── ⚠️ AND REWRITTEN AGAIN (2026-09-03) — THE THIRD POPULATION ──────────────
//   The 2026-09-02 rewrite derived two populations and left a THIRD asking how
//   a const was SPELLED. Its sentence, quoted rather than deleted:
//
//     > //   Both populations DERIVE, so each RE-DECIDES ITSELF: the day a page
//     > //   starts rendering a chart it is guarded, with nobody editing this file.
//
//   True of both populations it names, and blind to the matcher between them:
//   `RAW_HEX_TOKEN_CONST` required `TOKEN_[A-Z_]+`, so `BuyerRisk.tsx`'s four
//   page-local hex consts — `continent` · `continentStroke` · `accent` ·
//   `accentStroke`, feeding SIXTEEN paint positions — were invisible, and this
//   gate was green. **A matcher narrower than its own subject**, in the file
//   rewritten to stop exactly that.
//
//   ⚠️ **AND THE SECOND POPULATION WAS THE SAME CONVENTION IN A HAT.**
//   `tokenConstPages()` selected "files declaring a `const TOKEN_[A-Z_]+`", so
//   widening only the MATCHER would still not have reached a page whose colour
//   const is spelled `continent`. Both halves are retired together; what
//   replaces them keys on REACHABILITY (see the structural rule below).
//
//   ⚠️ **WIDENING THE SPELLING WOULD HAVE BEEN THE WRONG FIX** — `any-name + hex`
//   accuses six messenger-chrome consts that never touch paint. Narrowing and
//   widening are the two ways one matcher is wrong; the exit is to stop asking
//   about names.
//
// ── THE SHAPE NOW ───────────────────────────────────────────────────────────
//   ONE derived population (pages that render charts) and ONE structural rule
//   over it, so the gate RE-DECIDES ITSELF in both directions: a page that
//   starts rendering a chart is guarded, and a hex const becomes a defect the
//   day a paint position consumes it — with nobody editing this file. The
//   residue is not fixed here (each is its own ruling) — it is PINNED,
//   bilaterally, on the `storedFieldGate/allowlist.ts` precedent.
//
//   ⚠️ **BILATERAL MEANS SET EQUALITY, NOT CONTAINMENT.** Two failures, not one:
//     · an UNLISTED violation      → a new raw hex entered a chart;
//     · a LISTED key that is GONE  → **the exemption outlived its subject.**
//   So this list can only ever shrink truthfully: nobody can fix a colour and
//   leave its excuse behind, because leaving the excuse behind is a red build.
//
//   THE TRADE, RECORDED: a key is `file::match`, DEDUPED. Two CartesianGrids in
//   one file painting the same hex are one key, so fixing one of the two is
//   invisible here. Keying on a count instead would redden on any legitimate
//   refactor that merges or splits a chart, which is the worse failure — the
//   `scripts/floor.json` trade, in a different instrument.
// ─────────────────────────────────────────────────────────────────────────────

const here = dirname(fileURLToPath(import.meta.url));

const pageFiles = (): string[] =>
  readdirSync(here).filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));

const read = (file: string): string => readFileSync(join(here, file), 'utf8');

/** A page RENDERS A CHART iff it imports the chart library. */
const IMPORTS_RECHARTS = /from\s*['"]recharts['"]/;

/** A raw 3/6-digit hex assigned to a fill/stroke prop or style key. */
const RAW_HEX_IN_PAINT = /\b(fill|stroke)\s*[=:]\s*['"{`]*\s*#[0-9A-Fa-f]{3,6}\b/g;

/** Files whose charts this gate governs — DERIVED, never listed. */
const chartPages = (): string[] => pageFiles().filter((f) => IMPORTS_RECHARTS.test(read(f))).sort();

/** A hex-valued binding — ANY identifier, ANY case, any scope. */
const HEX_BINDING = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"](#[0-9A-Fa-f]{3,8})['"]/g;

/** A paint position CONSUMING an identifier: `fill={X}` / `stroke={X}` / `stopColor={X}`. */
const PAINT_CONSUMES = /\b(?:fill|stroke|stopColor)\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/g;

/**
 * ⚠️ THE STRUCTURAL RULE, and the reason it replaced a naming convention:
 * **a hex-valued binding is a defect IFF some paint position consumes it.**
 *
 * Reachability, not spelling — the `moduleScopeLiteralGate` discriminator applied
 * to colour. It RE-DECIDES ITSELF: the day someone writes `fill={WHATSAPP_BG}`,
 * that const becomes a defect with nobody editing this file; the day the last
 * paint use goes, it stops being one. That is the property a marker or an
 * allowlist cannot have.
 */
const consumedHexBindings = (src: string): { name: string; hex: string }[] => {
  const bound = new Map<string, string>();
  for (const m of src.matchAll(HEX_BINDING)) bound.set(m[1], m[2]);
  const consumed = new Set([...src.matchAll(PAINT_CONSUMES)].map((m) => m[1]));
  return [...bound]
    .filter(([name]) => consumed.has(name))
    .map(([name, hex]) => ({ name, hex }));
};

/** Every hex binding that reaches paint across the governed pages, as `file::name`. */
const indirectViolations = (): string[] =>
  chartPages()
    .flatMap((f) => consumedHexBindings(read(f)).map((v) => `${f}::${v.name} = '${v.hex}'`))
    .sort();

/** Every distinct raw-hex paint value across the chart pages, as `file::match`. */
const paintViolations = (): string[] => {
  const out = new Set<string>();
  for (const file of chartPages()) {
    for (const m of read(file).match(RAW_HEX_IN_PAINT) ?? []) {
      out.add(`${file}::${m.replace(/\s+/g, ' ')}`);
    }
  }
  return [...out].sort();
};

// ─────────────────────────────────────────────────────────────────────────────
// THE RESIDUE — bilateral, set-equality, each key carrying a MECHANICAL reason.
//
//   `grade-ramp`     ruled a SEPARATE AXIS, verbatim in `CLAUDE.md` DP-2:
//                    *"Grade A–D ramps are a separate axis, not yet unified
//                    here."* Not this gate's ruling to make — and the ruling is
//                    REAL, not a label: both files declare
//                    `GRADE_TONE: Record<Grade, …>` mapping A/B/C/D to these
//                    exact strokes. `SEMANTIC_STATE` in `chartPalette.ts` is the
//                    unified ramp and DISAGREES on grade B (#5B9D6B vs #1E5BAE);
//                    unifying them changes rendered colour, which is why DP-2
//                    says "not yet".
//
// ⚠️ **THE `unadjudicated` REASON IS RETIRED — THE DEBT REACHED ZERO.** It read:
//
//   > `unadjudicated`  **NOT AN EXEMPTION. COUNTED DEBT** … `unadjudicatedCount()`
//   >                  publishes it so it cannot quietly become permanent.
//
// It held two rows, and both were adjudicated onto tokens that carry the SAME
// byte value, so nothing rendered moved: `BuyerInvoices`'s grid stroke was
// `#E5E9EE`, which IS `CHART_GRID`; `BuyerRisk`'s map canvas was `#FAFBFC`,
// which IS tailwind's `bg-page`, now painted by `fill-bg-page` so the value
// lives in ONE place.
//
// ⚠️ **THE COUNTER WENT WITH IT, DELIBERATELY.** `unadjudicatedCount()` asserted
// `> 0`, so taking the debt to zero would have reddened this gate — and keeping
// it as an assert-zero would leave **a counter that can only ever read zero,
// which is a counter nobody would notice breaking.** What actually protects the
// tree is the UNLISTED assertion below: a new raw hex in chart paint is red on
// arrival. Parking one again should cost a ruling and a new reason in this
// union, not a quiet increment.
// ─────────────────────────────────────────────────────────────────────────────
type Reason = 'grade-ramp';

const RESIDUE: Readonly<Record<string, Reason>> = {
  "BuyerScorecard.tsx::stroke: '#107E3E": 'grade-ramp',
  "BuyerScorecard.tsx::stroke: '#1E5BAE": 'grade-ramp',
  "BuyerScorecard.tsx::stroke: '#B45309": 'grade-ramp',
  "BuyerScorecard.tsx::stroke: '#BB0000": 'grade-ramp',
  "SupplierPerformance.tsx::stroke: '#107E3E": 'grade-ramp',
  "SupplierPerformance.tsx::stroke: '#1E5BAE": 'grade-ramp',
  "SupplierPerformance.tsx::stroke: '#B45309": 'grade-ramp',
  "SupplierPerformance.tsx::stroke: '#BB0000": 'grade-ramp',
};

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE MATCHERS AND THE POPULATIONS, BEFORE ANY CLAIM ABOUT THE TREE.
// Nothing below this block means anything without it: a matcher that fires on
// everything and one that fires on nothing both produce a green gate here, and
// an empty population produces the greenest gate of all.
// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ DP2-PALETTE-01 · THE INSTRUMENT ITSELF', () => {
  it('✅ FIRES on raw hex in a paint position — the known-GOOD probe', () => {
    const bad = `
      <Area fill="#FF00AA" stroke={'#123'} />
      <Bar style={{ fill: '#abcdef' }} />
    `;
    expect(bad.match(RAW_HEX_IN_PAINT) ?? []).toHaveLength(3);
  });

  it('does NOT fire on palette-sourced paint — the acquittal half', () => {
    const good = `
      import { CHART_SERIES, TARGET_STATUS } from '../lib/chartPalette';
      const TOKEN_GRID = CHART_SERIES[4];
      <Area fill={CHART_SERIES[0]} stroke={TOKEN_GRID} />
      <Bar style={{ fill: TARGET_STATUS.meeting.fill }} />
    `;
    expect(good.match(RAW_HEX_IN_PAINT) ?? []).toEqual([]);
    expect(consumedHexBindings(good)).toEqual([]);
  });

  it('does NOT fire on a hex that is not in a paint position', () => {
    // A colour token defined for something other than fill/stroke, and a hex in
    // prose, must both be acquitted — otherwise the gate condemns the palette.
    const notPaint = `const brand = '#0070F2'; // action-blue\nbackground: '#FAFBFC'`;
    expect(notPaint.match(RAW_HEX_IN_PAINT) ?? []).toEqual([]);
  });

  it('⚠️ AND BOTH POPULATIONS ARE NON-EMPTY — by membership, never by count', () => {
    const charts = chartPages();
    // known-present: a page that has rendered charts since the gate was written.
    expect(charts).toContain('BuyerAnalytics.tsx');
    expect(charts).toContain('BuyerDashboard.tsx');
    // known-ABSENT: a fabricated member, and the stale hand-list row this
    // rewrite removed — `BuyerInventory.tsx` holds no chart and no paint.
    expect(charts).not.toContain('BuyerNotAChartPage.tsx');
    expect(charts).not.toContain('BuyerInventory.tsx');

    // ⚠️ THE SECOND POPULATION IS GONE, NOT WIDENED. It was `tokenConstPages()`
    // — "files declaring a `const TOKEN_[A-Z_]+`" — which is the SAME naming
    // convention as the retired matcher, wearing a different hat: a page whose
    // colour const is spelled `continent` was never even in the population, so
    // widening only the matcher would still not have reached it. The structural
    // rule runs over the CHART population, which is derived from behaviour.
    expect(charts).toContain('BuyerRisk.tsx');
  });

  it('⚠️ AND THE DERIVATION READS THE TREE, not a cached list', () => {
    // If `pageFiles()` ever returns nothing — a moved directory, a changed
    // extension — every gate below passes over an empty set. Membership, again.
    expect(pageFiles().length).toBeGreaterThan(20);
    expect(pageFiles()).toContain('BuyerAnalytics.tsx');
  });
});

describe('DP2-PALETTE-01 — no raw hex in chart paint props', () => {
  it('every chart page is governed, and the population is derived from source', () => {
    // The gate's subject is "pages that render charts", not "pages a 2026-07-09
    // batch happened to touch". This is the assertion that keeps it that way.
    for (const file of chartPages()) {
      expect(read(file)).toMatch(IMPORTS_RECHARTS);
    }
  });

  it('⚠️ no UNLISTED raw hex — a new one entering a chart is red', () => {
    const unlisted = paintViolations().filter((k) => !(k in RESIDUE));
    expect(
      unlisted,
      'raw hex entered a chart paint position with no ruling behind it:\n  ' +
        unlisted.join('\n  '),
    ).toEqual([]);
  });

  it('⚠️ AND NO LISTED KEY OUTLIVED ITS SUBJECT — the half containment never has', () => {
    const live = new Set(paintViolations());
    const dead = Object.keys(RESIDUE).filter((k) => !live.has(k));
    expect(
      dead,
      'these were fixed but their excuse was left behind — delete the rows:\n  ' +
        dead.join('\n  '),
    ).toEqual([]);
  });

  it('⚠️ EVERY RESIDUE ROW CARRIES A REASON WITH A RULING BEHIND IT', () => {
    // Replaces the counted-debt assertion (see the header). That one published a
    // number; this one publishes the VOCABULARY, which is the thing that must
    // not grow quietly. Adding a row with a new reason is a `tsc` failure until
    // somebody widens `Reason`, and widening `Reason` is where a ruling belongs.
    const RULED: readonly Reason[] = ['grade-ramp'];
    expect(RULED.length).toBeGreaterThan(0); // population guard
    for (const [key, reason] of Object.entries(RESIDUE)) {
      expect(RULED, `'${key}' carries an unruled reason`).toContain(reason);
    }
  });

  it('⚠️ THE `grade-ramp` REASON IS CHECKED, NOT MERELY STATED', () => {
    // The stepKind property, as close as this subject allows: the excuse must
    // still be TRUE of the file, not just written down next to it. A grade-ramp
    // exemption is only honest while the file actually declares an A–D ramp —
    // delete `GRADE_TONE` and keep the stroke, and this fires even though the
    // hex never moved.
    const ramped = Object.entries(RESIDUE)
      .filter(([, r]) => r === 'grade-ramp')
      .map(([k]) => k.split('::')[0]);
    expect(ramped.length, 'no grade-ramp rows — the probe is vacuous').toBeGreaterThan(0);
    for (const file of new Set(ramped)) {
      expect(read(file), `${file} claims grade-ramp but declares no A–D ramp`).toMatch(
        /GRADE_TONE\s*:\s*Record<\s*Grade\s*,/,
      );
    }
    // Known-BAD control, same instrument, same run: a chart page with no ramp
    // must NOT satisfy the predicate, or the sweep above proves nothing.
    expect(read('BuyerInvoices.tsx')).not.toMatch(/GRADE_TONE\s*:\s*Record<\s*Grade\s*,/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE INDIRECT HALF — a hex that reaches paint through an IDENTIFIER.
//
//   The matcher this replaced was `/const\s+TOKEN_[A-Z_]+\s*=\s*['"]#…/` — a
//   NAMING CONVENTION, and therefore silent by construction about anything that
//   does not follow it. Measured before the replacement: `BuyerRisk.tsx` held
//   FOUR page-local hex consts (`continent` · `continentStroke` · `accent` ·
//   `accentStroke`) feeding SIXTEEN paint positions, and the gate was green.
//
//   ⚠️ **A MATCHER NARROWER THAN ITS OWN SUBJECT.** The file already derived its
//   other two populations; this one asked how a const was SPELLED.
//
//   ⚠️ **AND WIDENING THE SPELLING WOULD HAVE BEEN THE WRONG FIX.** `any-name +
//   hex` accuses `SupplierWhatsApp.tsx`'s six messenger-chrome consts, which are
//   CSS chrome and never touch a paint position — false accusations, which is
//   what widening buys when narrowing was the diagnosis. They are acquitted here
//   BY CONSTRUCTION, not by an exemption row: nothing paints with them.
// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ DP2-PALETTE-01 · A HEX BINDING THAT REACHES PAINT', () => {
  it('✅ FIRES on a lowercase const consumed by a paint position', () => {
    const bad = `const continent = '#F4F6F8';\n<path fill={continent} />`;
    expect(consumedHexBindings(bad)).toEqual([{ name: 'continent', hex: '#F4F6F8' }]);
  });

  it('⚠️ AND IT RE-DECIDES ITSELF — the same const, with and without a paint use', () => {
    // The property an allowlist cannot have, proven on ONE binding by removing
    // ONLY its paint use. Nothing about the declaration changes.
    const decl = `const chrome = '#075E54';`;
    expect(consumedHexBindings(`${decl}\n<div style={{ background: chrome }} />`)).toEqual([]);
    expect(consumedHexBindings(`${decl}\n<path stroke={chrome} />`)).toEqual([
      { name: 'chrome', hex: '#075E54' },
    ]);
  });

  it('does NOT fire on a palette-sourced binding, however it is spelled', () => {
    const good = `const MAP_LAND = MAP_BASE.land;\n<path fill={MAP_LAND} />`;
    expect(consumedHexBindings(good)).toEqual([]);
  });

  it("⚠️ SupplierWhatsApp's chrome consts are ACQUITTED BY CONSTRUCTION", () => {
    // Not an exemption — a measurement. They are hex, they are page-local, and
    // no paint position consumes them. If one ever does, this file says so with
    // nobody editing it. Asserted on the real file, not a synthetic string.
    const chrome = read('SupplierWhatsApp.tsx');
    expect(chrome, 'the control is vacuous if the consts have gone').toMatch(
      /const WHATSAPP_BG = '#/,
    );
    expect(consumedHexBindings(chrome)).toEqual([]);
  });

  it('⚠️ NO HEX BINDING REACHES PAINT IN ANY GOVERNED PAGE', () => {
    const found = indirectViolations();
    expect(
      found,
      'a raw hex reaches a chart paint position through an identifier:\n  ' +
        found.join('\n  '),
    ).toEqual([]);
  });

  for (const file of chartPages()) {
    it(`${file} routes every paint identifier through the palette`, () => {
      expect(consumedHexBindings(read(file))).toEqual([]);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DP2-BUTTON-01 (Ops #11 SEAT 2): an Export is a secondary / alternative action
// per DP-2 — it must never occupy the BulkActionsBar `primary` slot, which is the
// surface's main call-to-action (Sync / Save / Submit / Create / New). Under the
// portal-wide button restyle the primary slot renders action-blue OUTLINE, and
// solid is retired entirely (§68), but the convention stands: an Export belongs
// in `actions[]`, not the primary slot.
//
// This population always derived. What it lacked was a control — see below.
//
// CARVE-OUT: BuyerCompliance.tsx is the registered fixture carve-out
// (COMPLIANCE-CARVEOUT-01, docs/findings.md) landing at R2.2; its Export-in-primary
// header is knowingly deferred out of Commit 5 and excluded here until that lands.
// ─────────────────────────────────────────────────────────────────────────────
const EXPORT_CARVE_OUT = new Set(['BuyerCompliance.tsx']);
const exportScanned = (): string[] => pageFiles().filter((f) => !EXPORT_CARVE_OUT.has(f)).sort();

/** A BulkActionsBar `primary` slot whose label is an Export action. */
const EXPORT_IN_PRIMARY = /primary=\{\{\s*label:\s*['"][^'"]*Export/gi;

describe('DP2-BUTTON-01 — Export never occupies the primary (action-blue) slot', () => {
  it('⚠️ THE MATCHER AND THE POPULATION, before the claim', () => {
    expect(`primary={{ label: 'Export report'`.match(EXPORT_IN_PRIMARY) ?? []).toHaveLength(1);
    // acquitted: an Export in `actions[]` is exactly where it belongs.
    expect(`actions={[{ label: 'Export report' }]}`.match(EXPORT_IN_PRIMARY) ?? []).toEqual([]);
    // acquitted: a primary slot that is not an Export.
    expect(`primary={{ label: 'Sync to SAP'`.match(EXPORT_IN_PRIMARY) ?? []).toEqual([]);

    const scanned = exportScanned();
    expect(scanned.length).toBeGreaterThan(20);
    expect(scanned).toContain('BuyerAnalytics.tsx');
    // the carve-out really is carved out, and a fabrication really is absent.
    expect(scanned).not.toContain('BuyerCompliance.tsx');
    expect(scanned).not.toContain('BuyerNotAChartPage.tsx');
  });

  for (const file of exportScanned()) {
    it(`${file} places no Export action in a BulkActionsBar primary slot`, () => {
      expect(read(file).match(EXPORT_IN_PRIMARY) ?? []).toEqual([]);
    });
  }
});
