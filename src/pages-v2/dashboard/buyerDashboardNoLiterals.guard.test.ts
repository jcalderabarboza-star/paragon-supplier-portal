// ─────────────────────────────────────────────────────────────────────────────
// NO AUTHORED FIGURE ON THE BUYER DASHBOARD — the source-level ratchet.
//
// ⚠️ **THE RENDER TEST CANNOT CATCH THIS ONE.** `BuyerDashboard.test.tsx`
// asserts that what the page shows equals what the derivation returns — but a
// literal typed beside a derived figure is still on screen, and a render test
// that does not know to look for it passes. This walks the SOURCE instead, so
// the defect is caught where it is written rather than where it is displayed.
//
// ── ⚠️ WHAT "A VALUE POSITION" MEANS HERE, STATED SO IT IS NOT RE-DERIVED
//    WRONGLY ────────────────────────────────────────────────────────────────
// A literal is in a VALUE POSITION iff it reaches the reader as content:
//
//   (a) JSX TEXT — `<StatusPill>2 lines at risk</StatusPill>`
//   (b) a JSX EXPRESSION CHILD — `<span>{'75%'}</span>`
//   (c) a CONTENT ATTRIBUTE — `value=`, `title=`, `subtitle=`, `eyebrow=`,
//       `label=`, `children=`
//
// Everything else is PRESENTATION and is deliberately untouched: `className`,
// `style`, and the chart geometry recharts requires (`margin={{ top: 8 }}`,
// `radius={[4, 4, 0, 0]}`, `fontSize: 11`). A gate that condemned those would
// be un-satisfiable, and an un-satisfiable gate gets disabled.
//
// ⚠️ **AND IT IS PROBED BOTH WAYS, ON THE SAME WALKER, IN THE SAME RUN.** A
// known-BAD source must be convicted and a known-GOOD one must pass — the real
// page is the known-good, and the three literals this batch actually removed
// are the known-bad. A one-directional probe would ship a walker that condemns
// everything or nothing and look identical either way.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { describe, it, expect } from 'vitest';

const PAGE = path.join(process.cwd(), 'src', 'pages-v2', 'BuyerDashboard.tsx');

/** Attributes whose value reaches the reader as content. */
const CONTENT_ATTRS = new Set([
  'value',
  'title',
  'subtitle',
  'eyebrow',
  'label',
  'children',
  'flagLabel',
  'actionLabel',
]);

const HAS_DIGIT = /\d/;

interface Finding {
  readonly text: string;
  readonly line: number;
  readonly why: 'jsx-text' | 'jsx-child' | 'content-attr';
}

/**
 * Literals in a value position. Returns the findings AND how many JSX elements
 * were visited, so a walker that stopped walking cannot report "clean".
 */
function findAuthoredFigures(source: string, fileName: string): {
  findings: Finding[];
  jsxElements: number;
} {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];
  let jsxElements = 0;

  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  const record = (n: ts.Node, text: string, why: Finding['why']) => {
    findings.push({ text: text.trim(), line: lineOf(n), why });
  };

  /** A literal that carries a digit, inside an expression we already decided
   *  is rendered. Template literals count: `${x}%` is fine (no digit), but a
   *  hard-coded `Rp 14.0B` is not, wherever it is spelled. */
  const scanRendered = (node: ts.Node, why: Finding['why']): void => {
    const visit = (n: ts.Node): void => {
      // ⚠️ **DO NOT DESCEND INTO A NESTED PRESENTATION ATTRIBUTE.** A rendered
      // subtree contains whole JSX elements, and those carry `className`,
      // `style` and chart geometry of their own. The first draft of this walker
      // descended into them and produced NINETEEN findings on a page with no
      // authored figure at all — Tailwind classes (`px-3 py-1`, `h-1.5`) and
      // recharts' `radius={[4, 4, 0, 0]}` read as numbers in a value position.
      // Derivation rule 2, on this instrument: a widened matcher accuses
      // correct code as readily as a narrow one goes blind.
      if (ts.isJsxAttribute(n)) {
        if (!(ts.isIdentifier(n.name) && CONTENT_ATTRS.has(n.name.text))) return;
      }
      // ⚠️ **A LITERAL IN A CONDITION IS NOT IN A VALUE POSITION.** Second
      // over-reach on this walker, found by running it rather than by reading
      // it: `{visibleRows.length === 0 ? … : …}` is a rendered child, and the
      // `0` is an OPERAND of the test, which can never reach the screen. Only
      // the BRANCHES of a conditional are rendered, so only they are scanned.
      if (ts.isConditionalExpression(n)) {
        visit(n.whenTrue);
        visit(n.whenFalse);
        return;
      }
      if (ts.isBinaryExpression(n)) {
        const op = n.operatorToken.kind;
        // `a && <X/>` / `a || <X/>` render the RIGHT side only.
        if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken) {
          visit(n.right);
          return;
        }
        // A comparison renders nothing — both operands are the test.
        if (
          op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
          op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
          op === ts.SyntaxKind.EqualsEqualsToken ||
          op === ts.SyntaxKind.ExclamationEqualsToken ||
          op === ts.SyntaxKind.LessThanToken ||
          op === ts.SyntaxKind.LessThanEqualsToken ||
          op === ts.SyntaxKind.GreaterThanToken ||
          op === ts.SyntaxKind.GreaterThanEqualsToken
        )
          return;
      }
      if (ts.isNumericLiteral(n)) record(n, n.getText(sf), why);
      else if (ts.isStringLiteral(n) && HAS_DIGIT.test(n.text)) record(n, n.text, why);
      else if (ts.isNoSubstitutionTemplateLiteral(n) && HAS_DIGIT.test(n.text))
        record(n, n.text, why);
      else if (ts.isTemplateExpression(n)) {
        for (const span of [n.head, ...n.templateSpans.map((s) => s.literal)])
          if (HAS_DIGIT.test(span.text)) record(n, span.text, why);
        n.templateSpans.forEach((s) => visit(s.expression));
        return;
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
  };

  const walk = (n: ts.Node): void => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n))
      jsxElements += 1;

    // (a) JSX text.
    if (ts.isJsxText(n) && HAS_DIGIT.test(n.text)) record(n, n.text, 'jsx-text');

    // (b) A JSX expression that is a CHILD (its parent is an element/fragment),
    //     as opposed to one that is an attribute value.
    if (
      ts.isJsxExpression(n) &&
      n.expression &&
      n.parent &&
      (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))
    )
      scanRendered(n.expression, 'jsx-child');

    // (c) A content attribute.
    if (ts.isJsxAttribute(n) && ts.isIdentifier(n.name) && CONTENT_ATTRS.has(n.name.text)) {
      if (n.initializer) scanRendered(n.initializer, 'content-attr');
    }

    ts.forEachChild(n, walk);
  };

  walk(sf);
  return { findings, jsxElements };
}

describe('⚠️ BILATERAL PROBE — the walker is exercised on a known-bad source first', () => {
  // The three literals this batch removed, put back in the three shapes they
  // occupied. If the walker cannot convict these it cannot guard the page.
  const KNOWN_BAD = [
    `export const A = () => <KpiCard eyebrow={t('k')} value="Rp 14.0B" />;`,
    `export const B = () => <KpiCard eyebrow={t('k')} value="75%" />;`,
    `export const C = () => <StatusPill variant="warning">2 lines at risk</StatusPill>;`,
    `export const D = () => <span>{'Rp 14.0B'}</span>;`,
    // ⚠️ AND THE BRANCH OF A CONDITIONAL IS STILL SCANNED. The narrowing that
    // stopped a CONDITION being convicted must not stop its OUTPUT being
    // convicted — that is the direction a narrowing goes blind in, and these
    // two are what stop this walker taking the narrowing too far.
    `export const E = () => <div>{rows.length === 0 ? <span>75%</span> : <Y />}</div>;`,
    `export const F = () => <div>{n > 0 && <span>Rp 14.0B</span>}</div>;`,
  ];

  it.each(KNOWN_BAD)('convicts: %s', (src) => {
    const { findings, jsxElements } = findAuthoredFigures(src, 'src/probe.tsx');
    expect(jsxElements).toBeGreaterThan(0);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('⚠️ KNOWN-GOOD — presentation literals are NOT convicted', () => {
    // If these were condemned the gate would be un-satisfiable on any page that
    // draws a chart, and an un-satisfiable gate gets switched off.
    const good = [
      `export const A = () => <div className="mt-2 h-1.5 gap-x-3" />;`,
      `export const B = () => <Bar radius={[4, 4, 0, 0]} />;`,
      `export const C = () => <XAxis tick={{ fontSize: 11 }} height={52} />;`,
      `export const D = () => <div style={{ width: '50%' }} />;`,
      `export const E = () => <span>{t('key', { count: n })}</span>;`,
      // The two shapes the SECOND over-reach produced, kept as regressions: a
      // literal that is part of a TEST rather than of the output.
      `export const F = () => <div>{rows.length === 0 ? <X /> : <Y />}</div>;`,
      `export const G = () => <div>{n > 0 && <X />}</div>;`,
    ].join('\n');
    const { findings, jsxElements } = findAuthoredFigures(good, 'src/probe.tsx');
    expect(jsxElements).toBeGreaterThan(0);
    expect(findings).toEqual([]);
  });
});

describe('BuyerDashboard.tsx authors no figure', () => {
  const source = fs.readFileSync(PAGE, 'utf8');
  const { findings, jsxElements } = findAuthoredFigures(source, PAGE);

  it('⚠️ POPULATION CONTROL — the walker really reached this page`s JSX', () => {
    // Without this, a path typo or a parse failure would return zero findings
    // over zero elements and read exactly like a clean page
    // (`EMPTY-INPUT-REPORTS-CLEAN-01`).
    expect(source.length).toBeGreaterThan(1000);
    expect(jsxElements).toBeGreaterThan(40);
  });

  it('carries no authored figure in any value position', () => {
    expect(
      findings.map((f) => `${f.why} @ line ${f.line}: ${JSON.stringify(f.text)}`),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AND NO WALL CLOCK — the source-level half, added because BOTH render-level
// and call-site-level instruments were MEASURED blind to one shape of it.
//
// ⚠️ **THIS EXISTS BECAUSE A PROBE SURVIVED, NOT BECAUSE A RULE SAID SO.**
// Mutation probe b2 put `new Date()` inside `obligationsByMonth`'s body, where
// it decides each bar's PAST/PRESENT/FUTURE colour. Both shipped instruments
// let it through, for different reasons and neither of them a bug:
//
//   · `anchoredSurfaces.guard.test.tsx` diffs `container.textContent` at two
//     instants. A bar's FILL is not text, so the diff cannot see it — the
//     single-bit limit that file already files against itself.
//   · `readingInstantGate` classifies the ARGUMENT at each call site. The
//     caller still passes `PRESENT_ISO`, so the site is still `P`; a clock
//     constructed INSIDE the callee is not at a call site at all.
//
// A clock read in this module is cheap to forbid outright and impossible to
// need: every function here takes its instant as a parameter. So the rule is
// the absence of the construct, checked on the source.
// ─────────────────────────────────────────────────────────────────────────────

describe('the dashboard derivations construct no clock of their own', () => {
  const MODULE = path.join(process.cwd(), 'src', 'pages-v2', 'dashboard', 'buyerDashboardDerivations.ts');

  /** Clock constructs, found on the AST so a mention in a COMMENT — and this
   *  module's header discusses `new Date()` at length — is not a false hit. */
  const clockReads = (file: string): string[] => {
    const src = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const hits: string[] = [];
    const visit = (n: ts.Node): void => {
      if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Date')
        hits.push(`line ${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}: new Date(…)`);
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        ts.isIdentifier(n.expression.expression) &&
        n.expression.expression.text === 'Date' &&
        n.expression.name.text === 'now'
      )
        hits.push(`line ${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}: Date.now()`);
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return hits;
  };

  it('⚠️ BILATERAL — the scanner finds a clock read when there is one', () => {
    // Known-BAD and known-GOOD on the SAME scanner, so neither reading can be
    // believed alone. The known-bad is written to a temp file rather than
    // asserted in prose, because a scanner nobody fired is not a scanner.
    const probeFile = path.join(process.cwd(), 'src', 'pages-v2', 'dashboard', '__clock-probe__.ts');
    fs.writeFileSync(
      probeFile,
      [
        '// A comment mentioning new Date() must NOT be counted.',
        'export const wall = () => new Date().toISOString();',
        'export const alsoWall = () => Date.now();',
        "export const fine = (nowIso: string) => nowIso.slice(0, 7);",
      ].join('\n'),
      'utf8',
    );
    try {
      expect(clockReads(probeFile)).toHaveLength(2);
    } finally {
      fs.unlinkSync(probeFile);
    }
  });

  it('buyerDashboardDerivations.ts constructs no Date and calls no Date.now', () => {
    expect(clockReads(MODULE)).toEqual([]);
  });

  it('BuyerDashboard.tsx constructs no Date and calls no Date.now', () => {
    expect(clockReads(PAGE)).toEqual([]);
  });
});

// ── REACH BLOCK — what this gate does NOT guard ─────────────────────────────
//
//  1. **A figure authored somewhere else and imported.** The walk is one file.
//     A const in `buyerDashboardDerivations.ts` that returned a hard-coded 75
//     would render, and this gate would not see it — that is the derivation
//     spec's job, and it re-derives every figure by an independent route.
//  2. **A WORD that is wrong.** `HAS_DIGIT` is the discriminator, so a literal
//     claim with no digit in it ("Live operational view", "all suppliers
//     certified") passes here. `BuyerDashboard.test.tsx` asserts the absence of
//     the specific claims this batch retired; nothing asserts the absence of a
//     claim nobody has written yet.
//  3. **Presentation that is really content.** A `className` naming a number
//     would be invisible, by design — see the value-position definition above.
//  4. **Other pages.** This is a ratchet on ONE surface. It is deliberately not
//     swept across `pages-v2/`: most pages legitimately render fixture-derived
//     literals in chart geometry and column widths, and a sweep would turn an
//     improving tree red (`ANCHOR-POPULATION-GUARD-OFF-BATCH`).
