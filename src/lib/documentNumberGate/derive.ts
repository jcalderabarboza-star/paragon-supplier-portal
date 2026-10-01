// ─────────────────────────────────────────────────────────────────────────────
// C11 V15 · THE DOCUMENT-NUMBER GATE — the portal never mints a document
// identity. S/4 owns PO, GR, invoice, contract and scheduling-agreement numbers;
// this tree CARRIES them and does not ASSIGN them.
//
// ⚠️ **THE DEFECT THIS EXISTS FOR IS ON RECORD.** `BuyerContracts.tsx` built
// `contractNumber: \`CTR-${yr}-${String(nextNum).padStart(3, '0')}\`` in a
// browser tab, prepended the row, and rendered it beside the real ones
// (`CTR-FABRICATION-01`). It was retired at `f5338c2`, and nothing stopped the
// same shape coming back: C11 V15 said so in its own cell. This is the thing
// that stops it.
//
// ── WHAT COUNTS AS A CONSTRUCTION ───────────────────────────────────────────
//   Found by walking the TypeScript AST, so a prefix in a COMMENT is never a
//   site and a prefix in a plain string (a fixture id, a copy line) is never a
//   site either — only a string that is ASSEMBLED with the prefix in front of a
//   computed part:
//     · a template literal whose static text ends in a governed prefix and is
//       followed by a substitution — `\`PO-${n}\``, `\`GR-2026-${seq}\``;
//     · a `+` whose left operand is a string literal ending in a governed prefix
//       — `'INV-' + n`.
//
// ── REACH LIMITS, STATED ────────────────────────────────────────────────────
//   · A prefix held in a VARIABLE and joined later (`[p, n].join('-')`,
//     `\`${prefix}-${n}\``) is not seen. Measured on the day this was written:
//     no such shape exists for these prefixes in shipped source.
//   · The prefixes are matched case-sensitively, as the documents print them.
//     A lowercase entity id (`ctr-new-…`) is an id, not a document number, and is
//     outside this gate.
//   · Fixtures and specs are outside the population: a fixture IS the stand-in
//     for numbers the system of record assigned, and a spec builds whatever its
//     probe needs.
// ─────────────────────────────────────────────────────────────────────────────
import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { REPO_ROOT } from '../treeMutationGate/derive';

/** The governed document-number prefixes: the documents S/4 numbers. */
export const GOVERNED_PREFIXES = ['PO', 'GR', 'INV', 'CTR', 'SA'] as const;

/** Static text ENDING in a governed prefix — the part a substitution then completes. */
const ENDS_IN_PREFIX = new RegExp(`(?:^|[^A-Za-z0-9])(?:${GOVERNED_PREFIXES.join('|')})-[A-Za-z0-9-]*$`);

/** Every document-number construction in one source text, as its source text. */
export function documentNumberConstructions(fileName: string, text: string): string[] {
  const sf = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isTemplateExpression(n)) {
      // Every static piece that is FOLLOWED by a substitution: the head, and
      // every span's literal except the last (which closes the template).
      const pieces = [n.head.text, ...n.templateSpans.slice(0, -1).map((s) => s.literal.text)];
      if (pieces.some((p) => ENDS_IN_PREFIX.test(p))) out.push(n.getText(sf).replace(/\s+/g, ' '));
    }
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.PlusToken &&
      (ts.isStringLiteral(n.left) || ts.isNoSubstitutionTemplateLiteral(n.left)) &&
      ENDS_IN_PREFIX.test(n.left.text)
    ) {
      out.push(n.getText(sf).replace(/\s+/g, ' '));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const isOutsidePopulation = (rel: string): boolean =>
  /\.test\.(ts|tsx)$/.test(rel) || rel.includes('/__tests__/') || rel.includes('/fixtures/') || rel.endsWith('.d.ts');

function shippedFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) shippedFiles(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Every construction in shipped source, keyed `path::sourceText`. */
export function shippedConstructions(): string[] {
  return shippedFiles(join(REPO_ROOT, 'src'))
    .map((f) => relative(REPO_ROOT, f).split(sep).join('/'))
    .filter((rel) => !isOutsidePopulation(rel))
    .flatMap((rel) =>
      documentNumberConstructions(rel, readFileSync(join(REPO_ROOT, rel), 'utf8')).map((c) => `${rel}::${c}`),
    );
}

/**
 * The constructions that are NOT a portal mint, each with why.
 *
 * ⚠️ BILATERAL: a key that matches no construction is red, so a site that is
 * retired must leave this list — it can only shrink truthfully.
 */
const MOCK_BACKEND =
  'THE MOCK BACKEND — the in-memory store stands in for the system of record that assigns this number; ' +
  '`httpDataService` replaces it whole, and no surface constructs the number.';
export const NOT_A_PORTAL_MINT: Readonly<Record<string, string>> = {
  'src/services/data/mock/stores/goodsReceiptStore.ts::`GR-2026-${900 + seq}`': MOCK_BACKEND,
  'src/services/data/mock/stores/invoiceStore.ts::`INV-2026-${9000 + seq}`': MOCK_BACKEND,
};
