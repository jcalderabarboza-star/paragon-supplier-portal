import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { buildRepoProgram } from '../lib/storedFieldGate/derive';

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
//   PROPERTY. Measured, it was wrong in BOTH directions.
//
// ── ⚠️ REWRITTEN AGAIN (2026-09-03a) — THE THIRD POPULATION ─────────────────
//   `RAW_HEX_TOKEN_CONST` required `TOKEN_[A-Z_]+`, so `BuyerRisk.tsx`'s four
//   page-local hex consts — feeding SIXTEEN paint positions — were invisible.
//   **A matcher narrower than its own subject.** Retired for the structural
//   rule below, together with its `tokenConstPages()` population, which was the
//   same naming convention wearing a different hat.
//
// ── ⚠️ AND AGAIN (2026-09-03b) — THE GATE WAS ACCUSING NON-PAINT ────────────
//   The previous matcher was `/\b(fill|stroke)\s*[=:]\s*…/`. The `:` alternative
//   exists to catch `style={{ fill: '#abc' }}`, which is a real paint. **It could
//   not tell that from an object property NAMED `stroke` inside a typed domain
//   record**, and three `GRADE_TONE: Record<Grade, …>` ramps are exactly that —
//   consumed as CSS `border` / `color` / `backgroundColor`, never as SVG paint.
//   `SupplierDashboard.tsx` contains ZERO SVG paint attributes; so does
//   `chartPalette.ts`.
//
//   ⚠️ **EIGHT OF THOSE MATCHES HAD BEEN PINNED AS RATIFIED EXEMPTIONS.** The
//   `grade-ramp` reason was a REAL DP-2 ruling recruited to excuse a MATCHER
//   ARTIFACT — `FALSE-MECHANISM-MUST-NOT-BE-FILED-01`, shipped. Quoted rather
//   than deleted, on the #302 precedent:
//
//     > type Reason = 'grade-ramp';
//     > const RESIDUE: Readonly<Record<string, Reason>> = {
//     >   "BuyerScorecard.tsx::stroke: '#107E3E": 'grade-ramp',
//     >   … eight rows …
//     > };
//     > //   `grade-ramp`  ruled a SEPARATE AXIS, verbatim in `CLAUDE.md` DP-2:
//     > //                 *"Grade A–D ramps are a separate axis, not yet
//     > //                 unified here."*
//
//   ⚠️ **THE DP-2 RULING IS UNTOUCHED AND STILL TRUE** — grade ramps really are a
//   separate axis, and `SEMANTIC_STATE` really does disagree with them on grade
//   B. What is retired is the claim that they sat in a PAINT POSITION. The fix
//   is to narrow the matcher, not to restate the gate's subject as "unsourced
//   raw hex colour" — that would WIDEN the gate in order to keep eight wrong
//   rows correct.
//
//   ⚠️ **THE RESIDUE IS NOW EMPTY, AND THAT IS A RESULT, NOT AN OMISSION.** With
//   the matcher narrowed there is no exemption left to carry, so the bilateral
//   set-equality machinery went with it. What replaces it is stronger: every
//   assertion below is an unconditional zero.
//
// ── THE SHAPE NOW ───────────────────────────────────────────────────────────
//   ONE derived population (every non-test source file that PAINTS) and TWO
//   structural rules over it — a literal hex in a real paint position, and a
//   hex-valued binding a paint position consumes. Both RE-DECIDE THEMSELVES:
//   a file that starts painting is governed, and a const becomes a defect the
//   day something paints with it — with nobody editing this file.
//
//   ⚠️ **`chartPalette.ts` IS NOT EXCLUDED. IT IS SCANNED AND ACQUITTED.** A
//   definition is not a use: the palette declares `TARGET_STATUS.meeting.fill`
//   and never paints with it, so a matcher that recognises only USES sees
//   nothing there. That is a structural acquittal, asserted below — strictly
//   stronger than a path check or an allowlist row, both of which would have to
//   be maintained and neither of which could tell a definition from a use.
// ─────────────────────────────────────────────────────────────────────────────

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..');

/** Every non-test source file under `src/`, recursively — the widest honest net. */
const allSourceFiles = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) {
        out.push(relative(SRC, p).replace(/\\/g, '/'));
      }
    }
  };
  walk(SRC);
  return out.sort();
};

const readSrc = (rel: string): string => readFileSync(join(SRC, rel), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE TWO PAINT FORMS, SEPARATED — because they fail differently.
//
//   ATTRIBUTE form  `fill="#abc"` / `stroke={'#abc'}`  — unambiguous: the `=`
//                   only ever means a JSX attribute.
//   INLINE-STYLE    `style={{ fill: '#abc' }}`         — a real paint, and the
//                   ONLY legitimate reason the `:` form was ever matched.
//
//   ⚠️ A BARE `fill:` / `stroke:` IS NOT MATCHED, DELIBERATELY. In this tree it
//   is overwhelmingly a DOMAIN RECORD field — `{ stroke: '#107E3E', soft: … }`
//   inside a `Record<Grade, …>` — which paints nothing. Requiring the enclosing
//   `style={{` is what separates the two, and `[^{}]*?` keeps the match inside
//   that one object literal so it cannot wander into the next.
// ─────────────────────────────────────────────────────────────────────────────

/** A raw hex as a JSX/SVG paint ATTRIBUTE. */
const PAINT_ATTR_HEX = /\b(fill|stroke|stopColor)\s*=\s*['"{`]*\s*(#[0-9A-Fa-f]{3,6})\b/g;

/** A raw hex inside an INLINE STYLE object literal. */
const PAINT_STYLE_HEX =
  /style\s*=\s*\{\{[^{}]*?\b(fill|stroke|stopColor)\s*:\s*['"`]?\s*(#[0-9A-Fa-f]{3,6})\b/g;

/** Both forms, as readable keys. */
const paintHexHits = (src: string): string[] => [
  ...[...src.matchAll(PAINT_ATTR_HEX)].map((m) => `${m[1]}="${m[2]}"`),
  ...[...src.matchAll(PAINT_STYLE_HEX)].map((m) => `style{{ ${m[1]}: ${m[2]} }}`),
];

/** A hex-valued binding — ANY identifier, ANY case, any scope. */
const HEX_BINDING = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"](#[0-9A-Fa-f]{3,8})['"]/g;

/** A paint position CONSUMING an identifier: `fill={X}` / `stroke={X}` / `stopColor={X}`. */
const PAINT_CONSUMES = /\b(?:fill|stroke|stopColor)\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/g;

/**
 * ⚠️ THE STRUCTURAL RULE: **a hex-valued binding is a defect IFF some paint
 * position consumes it.** Reachability, not spelling — the
 * `moduleScopeLiteralGate` discriminator applied to colour.
 *
 * ⚠️ **STATED LIMIT — A MEMBER EXPRESSION IS NOT RESOLVED, AND THIS GATE WOULD
 * NOT HAVE FOUND ScoreBadge.** `HEX_BINDING` matches `const X = '#hex'`; it does
 * NOT look inside an object literal, and `PAINT_CONSUMES` matches only a BARE
 * identifier, not `fill={T.a.b}`. So this shape is invisible to both halves:
 *
 *     const TONE = { stroke: '#0097A7' };      // hex inside an object
 *     <circle stroke={t.stroke} />             // reached by member access
 *
 * That is exactly what `ScoreBadge.tsx` held. It was found by the BROAD `:`
 * matcher this batch narrowed — the same matcher that produced eight false
 * rows — so narrowing bought precision and gave up this class. **The trade is
 * deliberate and it is not free**, and saying so here is the point: a gate whose
 * blind spots live only in a merge report is a gate nobody can widen safely.
 *
 * Closing it means resolving member expressions against object literals, which
 * is a checker-level job (`storedFieldGate` does it with the TypeScript API).
 * FILED, not built. The probe below pins the limit so it cannot be forgotten,
 * and turns RED the day the limit is closed — which is how it asks to be
 * deleted.
 */
const consumedHexBindings = (src: string): { name: string; hex: string }[] => {
  const bound = new Map<string, string>();
  for (const m of src.matchAll(HEX_BINDING)) bound.set(m[1], m[2]);
  const consumed = new Set([...src.matchAll(PAINT_CONSUMES)].map((m) => m[1]));
  return [...bound].filter(([n]) => consumed.has(n)).map(([name, hex]) => ({ name, hex }));
};

/**
 * A file PAINTS iff it holds any paint position at all — derived, never listed.
 *
 * ⚠️ **NON-GLOBAL BY NECESSITY, AND THIS IS NOT A STYLE CHOICE.** `.test()` on a
 * `/g` regex ADVANCES `lastIndex` and returns FALSE on the call after a match,
 * so a population derived that way shrinks cyclically while the gate stays
 * green — the `SILENT-PESSIMISM` shape, where a smaller population reads as
 * modesty and nothing goes red. This predicate was first written reusing the
 * `/g` `PAINT_CONSUMES`, which is that defect.
 *
 * ⚠️ **MEASURED HONESTLY, IT COST NOTHING HERE, AND THE REASON MATTERS MORE THAN
 * THE ZERO.** A non-matching file resets `lastIndex`, and no two painting files
 * are adjacent in the walk order, so the buggy form returned the same 8 files —
 * it was also `||`-ed with a non-global literal that would have masked it
 * anyway. **The zero is a property of this tree's file ordering, not of the
 * code.** Reordering the walk, or one more painting file landing beside
 * another, turns it into a real loss with no diff to blame. Fixed on the
 * mechanism rather than on the symptom, and pinned by the idempotence probe
 * below — which fails on the buggy form regardless of ordering.
 *
 * `matchAll` is unaffected: it operates on an internal clone, which is why only
 * this predicate was ever at risk.
 */
const PAINT_POSITION_ANY = /\b(fill|stroke|stopColor)\s*=\s*['"{`]/;

const paintingFiles = (): string[] =>
  allSourceFiles().filter((f) => PAINT_POSITION_ANY.test(readSrc(f)));

/** Every literal-hex paint across the WHOLE tree, as `file::key`. */
const literalViolations = (): string[] =>
  [
    ...new Set(
      allSourceFiles().flatMap((f) => paintHexHits(readSrc(f)).map((k) => `${f}::${k}`)),
    ),
  ].sort();

/** Every hex binding that reaches paint across the WHOLE tree, as `file::name`. */
const indirectViolations = (): string[] =>
  allSourceFiles()
    .flatMap((f) => consumedHexBindings(readSrc(f)).map((v) => `${f}::${v.name} = '${v.hex}'`))
    .sort();

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE MEMBER-EXPRESSION HALF (M5, closed here) — the TypeScript CHECKER,
// because no regex can do this.
//
//   #304 narrowed the `:` alternative and named what that cost: a hex sitting in
//   an OBJECT LITERAL and reached through a MEMBER EXPRESSION into a paint
//   position is invisible to both regex halves. `ScoreBadge.tsx` was exactly
//   that shape, and it was found by the BROAD matcher #304 retired.
//
// ⚠️ **AND THE OBVIOUS CHECKER MOVE DOES NOT WORK — MEASURED, NOT ASSUMED.**
//   Asking the checker for the SYMBOL behind `t.stroke` returns the DECLARED
//   TYPE's property. For `const TONE: ToneStyle = { stroke: '#0097A7' }` that is
//   `ToneStyle`'s `stroke: string` — a `PropertySignature` whose type is
//   `string`, with no literal anywhere near it. Fired at ScoreBadge's own
//   historical defect, symbol resolution flags it **zero** times: annotating an
//   object hides its value from the symbol, and ScoreBadge was annotated.
//
//   So this walks the VALUE instead — identifier → its `const` declaration →
//   through alias hops → the object literal it holds → the named property → its
//   string literal. That reaches the annotated case, which is the case that
//   mattered.
//
// ⚠️ **WHERE THE WALK STOPS — STATED, BECAUSE A GATE THAT HIDES ITS BLIND SPOTS
//   IS WORSE THAN NO GATE** (the `storedFieldGate` house rule). Each of these is
//   asserted CLEAN below, so the limit is a measurement rather than a claim:
//     · a value that only exists at RUNTIME — `fill={row.color}` from props
//     · a COMPUTED key — `stroke={MAP[k]}` where `k` is a variable
//     · a NESTED member — `T.a.b` (one property hop, by construction)
//     · a SPREAD — `{ ...BASE }` does not carry BASE's properties here
//     · a FUNCTION RETURN — `const t = f()` is not a literal
//   Closing any of those is a different instrument, not a wider regex.
//
//   REUSED from `storedFieldGate/derive.ts`: `buildRepoProgram` verbatim — the
//   same program, the same tsconfig. DECIDED here: the value-flow walk (that
//   module resolves symbols, which is the half that does not work for this),
//   and the synthetic builder below, because the precedent's
//   `buildProgramFromSources` does not enable JSX and every case here is JSX.
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = join(here, '..', '..');
const PAINT_ATTR_NAMES = new Set(['fill', 'stroke', 'stopColor']);
const HEX_LITERAL = /^#[0-9A-Fa-f]{3,8}$/;

/** Follow an identifier through `const` aliases to the object literal it holds. */
const objectLiteralBehind = (
  checker: ts.TypeChecker,
  expr: ts.Expression,
  hops = 6,
): ts.ObjectLiteralExpression | null => {
  let cur: ts.Expression = expr;
  for (let i = 0; i < hops; i++) {
    let sym = checker.getSymbolAtLocation(cur);
    if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
    const decl = sym?.getDeclarations()?.[0];
    if (!decl || !ts.isVariableDeclaration(decl) || !decl.initializer) return null;
    const init = decl.initializer;
    if (ts.isObjectLiteralExpression(init)) return init;
    if (ts.isAsExpression(init) && ts.isObjectLiteralExpression(init.expression)) {
      return init.expression;
    }
    if (ts.isIdentifier(init)) {
      cur = init;
      continue;
    }
    return null;
  }
  return null;
};

/**
 * ⚠️ ONE WALK, USED BY BOTH THE REPO GATE AND THE SYNTHETIC PROBES.
 *
 * **This was two functions and a mutation probe caught it.** Dropping the
 * property-NAME guard from the repo copy killed nothing, because every
 * bilateral probe below ran against a SEPARATE copy of the same logic — the
 * probes were proving things about code that was not the code under test
 * (§86). A gate must not validate a duplicate of itself; `label` is the only
 * thing that differs between the two callers, so it is the only thing
 * parameterised.
 */
const memberHexPaints = (
  program: ts.Program,
  label: (sf: ts.SourceFile, line: number) => string | null,
): string[] => {
  const checker = program.getTypeChecker();
  const out: string[] = [];
  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;
    const visit = (node: ts.Node): void => {
      if (
        ts.isJsxAttribute(node) &&
        ts.isIdentifier(node.name) &&
        PAINT_ATTR_NAMES.has(node.name.text)
      ) {
        const init = node.initializer;
        if (init && ts.isJsxExpression(init) && init.expression) {
          const e = init.expression;
          if (ts.isPropertyAccessExpression(e)) {
            const obj = objectLiteralBehind(checker, e.expression);
            for (const p of obj?.properties ?? []) {
              if (
                ts.isPropertyAssignment(p) &&
                p.name &&
                ts.isIdentifier(p.name) &&
                p.name.text === e.name.text &&
                p.initializer &&
                ts.isStringLiteral(p.initializer) &&
                HEX_LITERAL.test(p.initializer.text)
              ) {
                const line = sf.getLineAndCharacterOfPosition(e.getStart()).line + 1;
                const where = label(sf, line);
                if (where !== null) {
                  out.push(`${where}${e.getText()} -> '${p.initializer.text}'`);
                }
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out.sort();
};

/** Every `paint={obj.prop}` in the REPO whose prop is a raw hex, as `file:line`. */
const memberExpressionViolations = (program: ts.Program): string[] =>
  memberHexPaints(program, (sf, line) => {
    const rel = relative(REPO_ROOT, sf.fileName).replace(/\\/g, '/');
    return rel.startsWith('src/') ? `${rel}:${line}  ` : null;
  });

/** A synthetic JSX program — the only way to supply a known-BAD input. */
const synthProgram = (files: Readonly<Record<string, string>>): ts.Program => {
  const options: ts.CompilerOptions = {
    noLib: true,
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React,
  };
  const sources = new Map<string, ts.SourceFile>();
  for (const [name, text] of Object.entries(files)) {
    sources.set(name, ts.createSourceFile(name, text, ts.ScriptTarget.ES2020, true));
  }
  const host: ts.CompilerHost = {
    getSourceFile: (name) => sources.get(name),
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => undefined,
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (x) => x,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => sources.has(name),
    readFile: (name) => files[name],
  };
  return ts.createProgram([...sources.keys()], options, host);
};

/**
 * The SAME walk over a synthetic program — the only way to supply a known-BAD
 * input without planting a defect in `src/`. It differs from the repo caller in
 * the LABEL and nothing else, which is what makes the probes below evidence
 * about the shipped derivation rather than about a copy of it.
 */
const synthViolations = (src: string): string[] =>
  memberHexPaints(synthProgram({ '/probe.tsx': src }), () => '');

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE MATCHERS AND THE POPULATIONS, BEFORE ANY CLAIM ABOUT THE TREE.
// A matcher that fires on everything and one that fires on nothing both produce
// a green gate here, and an empty population produces the greenest gate of all.
// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ DP2-PALETTE-01 · THE INSTRUMENT ITSELF', () => {
  it('✅ FIRES on raw hex in a real paint position — the known-GOOD probe', () => {
    const bad = `
      <Area fill="#FF00AA" stroke={'#123'} />
      <Bar style={{ fill: '#abcdef' }} />
    `;
    expect(paintHexHits(bad)).toHaveLength(3);
  });

  it('⚠️ ACQUITS A DOMAIN RECORD NAMED `stroke` — the half the old matcher got wrong', () => {
    // The sibling the narrowing owes: a narrowing with no test for what it now
    // ACQUITS is a narrowing nobody can probe. This exact shape produced EIGHT
    // ratified exemption rows on main, for a defect that was never there.
    const record = `
      const GRADE_TONE: Record<Grade, { stroke: string; soft: string }> = {
        A: { stroke: '#107E3E', soft: '#E8F5EC' },
        B: { stroke: '#1E5BAE', soft: '#E5F0FF' },
      };
      <span style={{ border: \`4px solid \${tone.stroke}\`, color: tone.stroke }} />
    `;
    expect(paintHexHits(record)).toEqual([]);
  });

  it('⚠️ AND STILL FIRES when that same record value reaches a real paint', () => {
    // The acquittal above must be about the POSITION, not about the word
    // "Record". Move the value into a paint attribute and it is a defect again.
    expect(paintHexHits(`<circle stroke="#107E3E" />`)).toEqual(['stroke="#107E3E"']);
  });

  // ⚠️ **THE M5 BLIND-SPOT PROBE IS RETIRED — IT DID EXACTLY WHAT IT PROMISED.**
  // It was written at #304 to be green while the limit stood and RED the day
  // someone closed it, so that the limit would announce its own closure rather
  // than be forgotten. The limit is closed below, so the probe is deleted rather
  // than adapted: a probe that survives the thing it guarded is guarding
  // nothing. Quoted rather than removed silently, on the #302 precedent:
  //
  //   > it('⚠️ THE MEMBER-EXPRESSION BLIND SPOT IS REAL — pinned, not hidden', () => {
  //   >   const blind = `
  //   >     const TONE = { stroke: '#0097A7' };
  //   >     <circle stroke={t.stroke} />
  //   >   `;
  //   >   expect(paintHexHits(blind), 'literal matcher reaches into object literals now').toEqual([]);
  //   >   expect(consumedHexBindings(blind), 'structural matcher resolves members now').toEqual([]);
  //   >   expect(paintHexHits(`<circle stroke="#0097A7" />`)).toEqual(['stroke="#0097A7"']);
  //   > });
  //
  // Its two `.toEqual([])` lines are now FALSE of the tree — the regex halves
  // still cannot see that shape, but the checker half can, so the SHAPE is no
  // longer a blind spot. Keeping the probe would have asserted a gap that is
  // gone.

  it('does NOT fire on palette-sourced paint', () => {
    const good = `
      import { CHART_SERIES, CHART_GRID } from '../lib/chartPalette';
      <Area fill={CHART_SERIES[0]} stroke={CHART_GRID} />
    `;
    expect(paintHexHits(good)).toEqual([]);
    expect(consumedHexBindings(good)).toEqual([]);
  });

  it('does NOT fire on a hex that is not in a paint position', () => {
    const notPaint = `const brand = '#0070F2'; // action-blue\nbackground: '#FAFBFC'`;
    expect(paintHexHits(notPaint)).toEqual([]);
  });

  it('⚠️ THE POPULATION IS THE WHOLE TREE — by membership, never by count', () => {
    const files = allSourceFiles();
    expect(files.length).toBeGreaterThan(200);
    // known-present, three directories deep and across the pages/components split
    expect(files).toContain('lib/chartPalette.ts');
    expect(files).toContain('pages-v2/BuyerRisk.tsx');
    expect(files).toContain('components/ui-v2/ScoreBadge.tsx');
    expect(files).toContain('pages-v2/process-flows/FlowDiagram.tsx');
    // known-ABSENT: specs are excluded, and a fabrication is not present
    expect(files).not.toContain('pages-v2/chartPalette.guard.test.tsx');
    expect(files).not.toContain('pages-v2/BuyerNotAChartPage.tsx');
  });

  it('⚠️ THE PAINTING SUBSET IS STABLE ACROSS CALLS — the /g `.test()` trap', () => {
    // A `/g` regex driven by `.test()` advances `lastIndex` between calls, so a
    // population derived that way SHRINKS on every other invocation and the gate
    // still passes. Three identical calls must agree, and must agree with a
    // derivation that cannot carry state.
    const a = paintingFiles();
    const b = paintingFiles();
    const c = paintingFiles();
    expect(a).toEqual(b);
    expect(b).toEqual(c);
    const stateless = allSourceFiles().filter((f) =>
      /\b(fill|stroke|stopColor)\s*=\s*['"{`]/.test(readSrc(f)),
    );
    expect(a).toEqual(stateless);
    // and the control that makes the above non-vacuous
    expect(a.length).toBeGreaterThan(3);
  });

  it('⚠️ AND THE PAINTING SUBSET IS NON-EMPTY AND DERIVED', () => {
    const painting = paintingFiles();
    expect(painting.length).toBeGreaterThan(3);
    expect(painting).toContain('pages-v2/BuyerRisk.tsx');
    expect(painting).toContain('components/ui-v2/ScoreBadge.tsx');
    // a page with no paint of any kind must NOT be in it
    expect(painting).not.toContain('lib/chartPalette.ts');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ A DEFINITION IS NOT A USE — the structural acquittal, asserted rather than
// assumed. This is what replaces excluding the palette by path.
// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ DP2-PALETTE-01 · THE PALETTE IS SCANNED, NOT EXCLUDED', () => {
  it('chartPalette.ts is IN the scanned population', () => {
    expect(allSourceFiles()).toContain('lib/chartPalette.ts');
  });

  it('⚠️ AND CONTRIBUTES ZERO — it declares colour, it does not paint with it', () => {
    const src = readSrc('lib/chartPalette.ts');
    // the control: it really does hold the shapes the OLD matcher condemned
    expect(src, 'vacuous if TARGET_STATUS has gone').toMatch(/meeting:\s*\{\s*fill:\s*'#/);
    expect(paintHexHits(src)).toEqual([]);
    expect(consumedHexBindings(src)).toEqual([]);
  });

  it('⚠️ AND A FILE THAT DOES PAINT IS NOT ACQUITTED BY THE SAME RULE', () => {
    // Without this, "the palette contributes zero" could just mean the matcher
    // is dead. A synthetic module with the same declaration PLUS a paint use.
    const painty = `
      export const T = { meeting: { fill: '#107E3E' } };
      export const C = () => <circle fill="#107E3E" />;
    `;
    expect(paintHexHits(painty)).toEqual(['fill="#107E3E"']);
  });
});

describe('DP2-PALETTE-01 — no raw hex in any paint position, tree-wide', () => {
  it('⚠️ NO LITERAL HEX IN A PAINT POSITION — zero, with no exemptions', () => {
    const found = literalViolations();
    expect(
      found,
      'a raw hex literal sits in a paint position:\n  ' + found.join('\n  '),
    ).toEqual([]);
  });

  it('⚠️ NO HEX BINDING REACHES A PAINT POSITION — zero, with no exemptions', () => {
    const found = indirectViolations();
    expect(
      found,
      'a raw hex reaches a paint position through an identifier:\n  ' + found.join('\n  '),
    ).toEqual([]);
  });

  it("⚠️ SupplierWhatsApp's chrome consts are ACQUITTED BY CONSTRUCTION", () => {
    // Not an exemption — a measurement. They are hex, they are page-local, and
    // no paint position consumes them. If one ever does, this file says so with
    // nobody editing it.
    const chrome = readSrc('pages-v2/SupplierWhatsApp.tsx');
    expect(chrome, 'the control is vacuous if the consts have gone').toMatch(
      /const WHATSAPP_BG = '#/,
    );
    expect(consumedHexBindings(chrome)).toEqual([]);
  });

  it('⚠️ AND THE THREE GRADE RAMPS ARE ACQUITTED ON POSITION, NOT ON A REASON', () => {
    // The eight retired rows, re-derived. Each file still declares its ramp and
    // still holds raw hex; none of it sits in a paint position. If any ramp is
    // ever wired to an SVG paint, the zero above turns red on its own.
    for (const f of [
      'pages-v2/BuyerScorecard.tsx',
      'pages-v2/SupplierPerformance.tsx',
      'pages-v2/SupplierDashboard.tsx',
    ]) {
      const src = readSrc(f);
      expect(src, `${f} no longer declares a grade ramp — this probe is vacuous`).toMatch(
        /GRADE_TONE\s*:\s*Record<\s*Grade\s*,/,
      );
      expect(src, `${f} no longer holds raw hex — this probe is vacuous`).toMatch(/'#[0-9A-F]{6}'/);
      expect(paintHexHits(src), `${f} now paints with a raw hex`).toEqual([]);
    }
  });

  for (const file of paintingFiles()) {
    it(`${file} paints only from the palette`, () => {
      expect(paintHexHits(readSrc(file))).toEqual([]);
      expect(consumedHexBindings(readSrc(file))).toEqual([]);
    });
  }
});

describe('⚠️ DP2-PALETTE-01 · A HEX REACHED THROUGH A MEMBER EXPRESSION (M5)', () => {
  // One program, built once — `buildRepoProgram` parses the whole tree.
  const program = buildRepoProgram(REPO_ROOT);

  it('⚠️ THE WALK IS ALIVE ON THE REAL PROGRAM — the anchor the zero rests on', () => {
    // §71 · CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01. The tree-wide result below
    // is ZERO, and a zero is worthless without evidence the instrument can move.
    // `ScoreBadge`'s `TONE` is the object this class was named for; the walk must
    // REACH it, and find its `stroke` sourced from the palette rather than a hex.
    const checker = program.getTypeChecker();
    const badge = program
      .getSourceFiles()
      .find((f) => f.fileName.endsWith('/components/ui-v2/ScoreBadge.tsx'));
    expect(badge, 'ScoreBadge is gone — this anchor is vacuous').toBeTruthy();

    let reached: ts.ObjectLiteralExpression | null = null;
    const visit = (node: ts.Node): void => {
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === 'stroke') {
        const init = node.initializer;
        if (init && ts.isJsxExpression(init) && init.expression) {
          const e = init.expression;
          if (ts.isPropertyAccessExpression(e)) {
            reached = reached ?? objectLiteralBehind(checker, e.expression);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    if (badge) visit(badge);
    expect(reached, 'the walk no longer reaches TONE — the zero below is the instrument').toBeTruthy();
  });

  it('⚠️ NO PAINT REACHES A RAW HEX THROUGH A MEMBER EXPRESSION — tree-wide', () => {
    const found = memberExpressionViolations(program);
    expect(
      found,
      'a raw hex reaches a paint position through an object property:\n  ' + found.join('\n  '),
    ).toEqual([]);
  });

  it('✅ FIRES on the shape #304 could not see — a TYPE-ANNOTATED object', () => {
    // This is `ScoreBadge.tsx` as `main` held it before #304, reduced to its
    // essentials. The annotation is the whole difficulty: symbol resolution
    // returns `ToneStyle.stroke: string` and sees no literal at all.
    expect(
      synthViolations(`
        interface ToneStyle { text: string; stroke: string; bg: string; }
        const TONE: ToneStyle = { text: 'text-teal', stroke: '#0097A7', bg: 'bg-teal-soft' };
        export const C = () => { const t = TONE; return <circle stroke={t.stroke} />; };
      `),
    ).toEqual(["t.stroke -> '#0097A7'"]);
  });

  it('✅ AND on the un-annotated, aliased and cross-module forms', () => {
    expect(
      synthViolations(`
        const TONE = { stroke: '#0097A7' };
        export const C = () => <circle stroke={TONE.stroke} />;
      `),
    ).toEqual(["TONE.stroke -> '#0097A7'"]);
    expect(
      synthViolations(`
        const A = { stroke: '#0097A7' }; const B = A; const D = B;
        export const C = () => <circle stroke={D.stroke} />;
      `),
    ).toEqual(["D.stroke -> '#0097A7'"]);
    expect(
      synthViolations(`
        const TONE = { stroke: '#0097A7' } as const;
        export const C = () => <circle stroke={TONE.stroke} />;
      `),
    ).toEqual(["TONE.stroke -> '#0097A7'"]);
  });

  it('⚠️ AND IT RE-DECIDES ITSELF — the same object, with and without a paint use', () => {
    const decl = `const TONE = { stroke: '#0097A7' };`;
    expect(
      synthViolations(`${decl} export const C = () => <div title={TONE.stroke} />;`),
      'a non-paint use must be acquitted',
    ).toEqual([]);
    expect(
      synthViolations(`${decl} export const C = () => <circle stroke={TONE.stroke} />;`),
      'the same object, now painted, must be a defect',
    ).toEqual(["TONE.stroke -> '#0097A7'"]);
  });

  it('⚠️ ONLY THE ACCESSED PROPERTY COUNTS — a sibling hex is not this paint', () => {
    // Discriminates the property-NAME guard, which nothing else here does: a
    // mutation probe dropped that guard and killed no test, because every other
    // case has exactly one hex property. Without the guard this object would be
    // reported for `legacy` while the paint reads `stroke` — a false accusation
    // naming a value the element never renders.
    expect(
      synthViolations(`
        const PALETTE = ['#0097A7'] as const;
        const TONE = { stroke: PALETTE[0], legacy: '#B45309' };
        export const C = () => <circle stroke={TONE.stroke} />;
      `),
      'a sibling property must not be attributed to this paint',
    ).toEqual([]);
    // and the twin that makes it non-vacuous: paint the OTHER property and it
    // is a defect, so the acquittal above is about the NAME, not about failure.
    expect(
      synthViolations(`
        const PALETTE = ['#0097A7'] as const;
        const TONE = { stroke: PALETTE[0], legacy: '#B45309' };
        export const C = () => <circle stroke={TONE.legacy} />;
      `),
    ).toEqual(["TONE.legacy -> '#B45309'"]);
  });

  it('does NOT fire when the property is palette-sourced', () => {
    expect(
      synthViolations(`
        const CHART_SERIES = ['#0097A7'] as const;
        const TONE = { stroke: CHART_SERIES[0] };
        export const C = () => <circle stroke={TONE.stroke} />;
      `),
    ).toEqual([]);
  });

  it('⚠️ THE STATED LIMITS ARE MEASURED, NOT CLAIMED — each is CLEAN by design', () => {
    // A gate that hides its blind spots is worse than no gate. Every one of
    // these is a shape the walk cannot follow; if one ever starts firing, this
    // test goes red and the limit note above is what needs editing.
    expect(
      synthViolations(`export const C = ({ r }: { r: { color: string } }) => <circle fill={r.color} />;`),
      'runtime value from props',
    ).toEqual([]);
    expect(
      synthViolations(`
        const M: Record<string, string> = { a: '#0097A7' };
        export const C = ({ k }: { k: string }) => <circle stroke={M[k]} />;
      `),
      'computed key lookup',
    ).toEqual([]);
    expect(
      synthViolations(`
        const T = { a: { b: '#0097A7' } };
        export const C = () => <circle stroke={T.a.b} />;
      `),
      'nested member — one property hop by construction',
    ).toEqual([]);
    expect(
      synthViolations(`
        const BASE = { stroke: '#0097A7' }; const TONE = { ...BASE };
        export const C = () => <circle stroke={TONE.stroke} />;
      `),
      'spread',
    ).toEqual([]);
    expect(
      synthViolations(`
        const f = () => ({ stroke: '#0097A7' });
        export const C = () => { const t = f(); return <circle stroke={t.stroke} />; };
      `),
      'function return',
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DP2-BUTTON-01 (Ops #11 SEAT 2): an Export is a secondary / alternative action
// per DP-2 — it must never occupy the BulkActionsBar `primary` slot.
//
// CARVE-OUT: BuyerCompliance.tsx is the registered fixture carve-out
// (COMPLIANCE-CARVEOUT-01, docs/findings.md) landing at R2.2.
// ─────────────────────────────────────────────────────────────────────────────
const pageFiles = (): string[] =>
  readdirSync(here).filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));

const readPage = (file: string): string => readFileSync(join(here, file), 'utf8');

const EXPORT_CARVE_OUT = new Set(['BuyerCompliance.tsx']);
const exportScanned = (): string[] => pageFiles().filter((f) => !EXPORT_CARVE_OUT.has(f)).sort();

/** A BulkActionsBar `primary` slot whose label is an Export action. */
const EXPORT_IN_PRIMARY = /primary=\{\{\s*label:\s*['"][^'"]*Export/gi;

describe('DP2-BUTTON-01 — Export never occupies the primary (action-blue) slot', () => {
  it('⚠️ THE MATCHER AND THE POPULATION, before the claim', () => {
    expect(`primary={{ label: 'Export report'`.match(EXPORT_IN_PRIMARY) ?? []).toHaveLength(1);
    expect(`actions={[{ label: 'Export report' }]}`.match(EXPORT_IN_PRIMARY) ?? []).toEqual([]);
    expect(`primary={{ label: 'Sync to SAP'`.match(EXPORT_IN_PRIMARY) ?? []).toEqual([]);

    const scanned = exportScanned();
    expect(scanned.length).toBeGreaterThan(20);
    expect(scanned).toContain('BuyerAnalytics.tsx');
    expect(scanned).not.toContain('BuyerCompliance.tsx');
    expect(scanned).not.toContain('BuyerNotAChartPage.tsx');
  });

  for (const file of exportScanned()) {
    it(`${file} places no Export action in a BulkActionsBar primary slot`, () => {
      expect(readPage(file).match(EXPORT_IN_PRIMARY) ?? []).toEqual([]);
    });
  }
});
