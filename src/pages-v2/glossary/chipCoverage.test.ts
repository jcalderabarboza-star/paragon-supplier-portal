// ─────────────────────────────────────────────────────────────────────────────
// GL-1 · EVERY REFUSAL SITE HAS A DESTINATION — derived, never listed.
//
// `HALAL-REFUSAL-DEAD-ENDS-01` is about a refusal that tells a clerk only that
// they are stuck. The chips fix that at the sites that exist TODAY; this file is
// what stops site number twenty-one from shipping as a fresh dead end.
//
// ── THE DERIVATION ──────────────────────────────────────────────────────────
//   The population is NOT a list of files. It is derived, in this order:
//     1. the REGISTERED vocabularies, read from `GLOSSARY_REGISTRIES` — so a
//        vocabulary added to the glossary immediately widens this guard;
//     2. every `Record<Vocab, string>` message map declared anywhere under
//        `src/`, found by scanning source;
//     3. every USE of one of those maps;
//     4. each use split into RENDER (JSX — a chip can attach) and NON-RENDER
//        (the value is handed to a string-typed API — a chip cannot).
//   Every RENDER use must offer a glossary destination. Nothing is exempted by
//   name; a use is exempt only if the derivation can SEE that it is not JSX.
//
// ── ⚠️ WHY THE INSTRUMENT IS SANITY-CHECKED BEFORE IT IS BELIEVED ───────────
//   `CENSUS-MUST-DERIVE-01`, and the two R1 failures behind it: a matcher that
//   comes back clean is reporting on itself until proven otherwise. So the first
//   test below asserts a KNOWN-TRUE render site is found and a KNOWN-TRUE
//   string-API use is correctly excluded, and the population is asserted to be
//   neither zero nor suspiciously small — BEFORE any conclusion is drawn from it.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { GLOSSARY_REGISTRIES } from '../../lib/glossary';

const ROOT = join(__dirname, '..', '..', '..');
const SRC = join(ROOT, 'src');

/** Every `.ts`/`.tsx` under `src/`, excluding specs (a spec renders no refusal). */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(name) && !/\.(test|guard\.test)\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const REGISTERED_VOCABULARIES = GLOSSARY_REGISTRIES.map((r) => r.sourceType as string);

interface MapUse {
  readonly file: string;
  readonly line: number; // 1-indexed
  readonly mapName: string;
  readonly vocabulary: string;
  readonly isRender: boolean;
  readonly hasChip: boolean;
  /** Chip elements anywhere in the file — the proximity check's counterweight. */
  readonly chipsInFile: number;
}

/**
 * How far a chip may sit from the message it belongs to. Twenty lines, because
 * the FX refusal's interpolation object alone runs thirteen — a tighter window
 * accused a site that was correctly chipped.
 *
 * ⚠️ A window this wide can in principle be fooled by a NEIGHBOUR's chip, so it
 * is not the only check: `chips per file >= render uses per file` runs beside it
 * below, and a genuinely missing chip fails that one regardless of proximity.
 */
const CHIP_WINDOW = 20;
/** How far back to look for the string-typed API a non-render use feeds. */
const CONTEXT_WINDOW = 6;

function deriveUses(): MapUse[] {
  const uses: MapUse[] = [];
  // The generic body is captured WHOLE (`Record< … > = {`) rather than matched
  // key-first, so both halves can be tested. Matching only the key type swept in
  // `ingest.ts`'s `Record<QtyRefusalReason, ParseReason>` — a union-to-union
  // translation table in a service, with no message and no surface to chip.
  const declRe = /(?:const|let)\s+(\w+)\s*:\s*Record<([\s\S]*?)>\s*=\s*\{/g;

  for (const full of sourceFiles(SRC)) {
    const src = readFileSync(full, 'utf8');
    const file = relative(ROOT, full).split(sep).join('/');
    const maps = new Map<string, string>();
    for (const m of src.matchAll(declRe)) {
      const body = m[2];
      // `Exclude<Vocab, …>` counts: a map over a NARROWED registered vocabulary
      // is still a map over registered terms (`RFQ_BUDGET_REFUSAL_KEY` is this).
      const vocabulary = REGISTERED_VOCABULARIES.find((v) =>
        new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(body),
      );
      // …and the VALUE must be an i18n key. That is what makes it a MESSAGE map
      // — the shape whose member is already the key of a user-facing sentence.
      if (vocabulary && /,\s*string\s*$/.test(body.trim())) maps.set(m[1], vocabulary);
    }
    if (maps.size === 0) continue;

    const lines = src.split(/\r?\n/);
    const chipsInFile = (src.match(/<GlossaryTermChip\b/g) ?? []).length;
    for (let i = 0; i < lines.length; i += 1) {
      for (const [mapName, vocabulary] of maps) {
        // A USE, not the declaration: the map name followed by a `[` index.
        if (!new RegExp(`\\b${mapName}\\s*\\[`).test(lines[i])) continue;
        if (/:\s*Record</.test(lines[i])) continue;

        const back = lines.slice(Math.max(0, i - CONTEXT_WINDOW), i + 1).join('\n');
        // NON-RENDER: the message is being handed to a string-typed API — a
        // toast `description`, or a helper that returns a bare i18n key which a
        // toast then consumes. Neither can hold a React element.
        const isRender = !/\bdescription:/.test(back) && !/\)\s*:\s*string\s*=>/.test(back);
        const ahead = lines.slice(i, i + CHIP_WINDOW + 1).join('\n');
        uses.push({
          file,
          line: i + 1,
          mapName,
          vocabulary,
          isRender,
          hasChip: /<GlossaryTermChip\b/.test(ahead),
          chipsInFile,
        });
      }
    }
  }
  return uses;
}

const USES = deriveUses();

describe('GL-1 chip coverage — the instrument, before the conclusion', () => {
  it('scans the REGISTERED vocabularies, read from the glossary itself', () => {
    expect(REGISTERED_VOCABULARIES.length).toBeGreaterThan(10);
    // The four that actually reach a refusal surface today. If the glossary ever
    // drops one of these, this guard silently stops covering its sites.
    expect(REGISTERED_VOCABULARIES).toEqual(
      expect.arrayContaining([
        'QtyRefusalReason',
        'FxRefusalReason',
        'HalalRefusalReason',
        'BpomRefusalReason',
      ]),
    );
  });

  it('finds a population that is neither empty nor suspiciously small', () => {
    // Twenty-odd message-map uses across a dozen surfaces. A single-digit answer
    // here means the matcher stopped seeing the tree, not that the tree changed.
    expect(USES.length).toBeGreaterThan(15);
    expect(new Set(USES.map((u) => u.file)).size).toBeGreaterThan(8);
  });

  it('finds a KNOWN-TRUE render site — the goods-receipt halal refusal', () => {
    // The exact site HALAL-REFUSAL-DEAD-ENDS-01 was found at.
    const halal = USES.filter(
      (u) => u.file.endsWith('GRInspectionWizard.tsx') && u.vocabulary === 'HalalRefusalReason',
    );
    expect(halal.length).toBeGreaterThan(0);
    expect(halal.every((u) => u.isRender)).toBe(true);
  });

  it('classifies a KNOWN-TRUE string-API use as NON-render', () => {
    // `useToast({ description })` is typed `string`. This must come back
    // non-render, or the guard would be demanding an impossible chip.
    const toastBound = USES.filter((u) => !u.isRender);
    expect(toastBound.length).toBeGreaterThan(0);
    expect(toastBound.some((u) => u.file.endsWith('SupplierForecasts.tsx'))).toBe(true);
  });
});

describe('GL-1 chip coverage — the conclusion (HALAL-REFUSAL-DEAD-ENDS-01)', () => {
  it('EVERY rendered refusal over a registered vocabulary offers a definition', () => {
    const naked = USES.filter((u) => u.isRender && !u.hasChip).map(
      (u) => `${u.file}:${u.line} — ${u.mapName}<${u.vocabulary}> has no glossary destination`,
    );
    expect(
      naked,
      `a refusal renders with nowhere to go from:\n${naked.join('\n')}`,
    ).toEqual([]);
  });

  it('carries at least one chip PER rendered refusal in each file', () => {
    // The counterweight to a 20-line proximity window: a file with three
    // rendered refusals and two chips fails here even if all three happen to sit
    // within twenty lines of the same two.
    const short = [...new Set(USES.filter((u) => u.isRender).map((u) => u.file))]
      .map((file) => {
        const inFile = USES.filter((u) => u.file === file && u.isRender);
        return { file, need: inFile.length, have: inFile[0].chipsInFile };
      })
      .filter((r) => r.have < r.need)
      .map((r) => `${r.file} — ${r.need} rendered refusals, ${r.have} chips`);
    expect(short, `fewer chips than rendered refusals:\n${short.join('\n')}`).toEqual([]);
  });

  it('covers every surface that renders one, in both personas', () => {
    const rendering = new Set(USES.filter((u) => u.isRender).map((u) => u.file));
    // The chips are not a buyer feature: a supplier hits a refusal on their own
    // orders and forecasts, and lands on the same persona-neutral page.
    expect([...rendering].some((f) => f.includes('Supplier'))).toBe(true);
    expect([...rendering].some((f) => f.includes('Buyer'))).toBe(true);
  });

  it('records, rather than hides, the uses a chip CANNOT attach to', () => {
    // The honest half. `Toast.description` is `string`; widening it to
    // `ReactNode` to fit a chip in would be a change to a shared contract for a
    // link inside a notification that disappears in four seconds — the wrong
    // trade, and out of GL-1's fence. These uses stay chip-less BY RULING, and
    // this test exists so the ruling is visible rather than assumed.
    const cannot = USES.filter((u) => !u.isRender);
    expect(cannot.length).toBeGreaterThan(0);
    for (const u of cannot) {
      const src = readFileSync(join(ROOT, u.file), 'utf8').split(/\r?\n/);
      const back = src.slice(Math.max(0, u.line - 1 - CONTEXT_WINDOW), u.line).join('\n');
      expect(
        /\bdescription:/.test(back) || /\)\s*:\s*string\s*=>/.test(back),
        `${u.file}:${u.line} was excluded without a visible string-typed consumer`,
      ).toBe(true);
    }
  });
});
