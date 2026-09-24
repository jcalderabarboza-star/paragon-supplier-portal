import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { stripSourceComments, commentRanges } from './stripComments';

const SRC = join(process.cwd(), 'src');
const SELF = 'lib/sourceScan/stripComments.test.ts';

const sourceFiles = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
};
const rel = (f: string): string => relative(SRC, f).split('\\').join('/');

/**
 * ⚠️ **EVERY CASE BELOW IS ONE THE CHARACTER SCANNER GOT WRONG, OR ONE THE TWO
 * REGEXES GOT WRONG. NONE IS HYPOTHETICAL.** The five marked ⛔ are the five
 * that a left-to-right character scan — the form this tree shipped in
 * `deadAffordance.guard.test.tsx` — returns the wrong answer for, measured
 * against TypeScript's own ranges before this module was written.
 */
const Q = String.fromCharCode(39);
const CASES: readonly (readonly [string, string, string])[] = [
  ['a "//" inside a string', `const url = "https://x.example/a";\nconst keep = 1;\n`, 'x.tsx'],
  ['a "//" inside a string with no colon before it', `const p = "//cdn.example/a";\nconst k = 2;\n`, 'x.tsx'],
  ['a "/*" inside a string', `const g = "a/*b";\nconst k = 3;\nconst z = "*/";\nconst k2 = 4;\n`, 'x.tsx'],
  // THE specimen: SupplierDeliveryAgreements.tsx:61 in prose form.
  ['a "/*" inside a LINE comment — THE specimen', `// see #/supplier/* page\nconst k = 5;\nconst q = a /* real */ + b;\nconst k2 = 6;\n`, 'x.tsx'],
  ['a "//" inside a BLOCK comment', `/* see // here */\nconst k = 7;\n`, 'x.tsx'],
  ['nested templates whose ${} holds a string and a comment marker', 'const t = `a ${ obj["//x"] } b ${ `in ${1}` } c`;\nconst k = 8;\n', 'x.tsx'],
  ['an escaped quote inside a string', `const s = ${Q}it\\${Q}s //x${Q};\nconst k = 9;\n`, 'x.tsx'],
  ['a regex literal containing "/*"', `const re = /\\/\\*/;\nconst k = 10;\n`, 'x.ts'],
  ['⛔ a regex literal containing "//"', `const re = /https?:\\/\\//;\nconst k = 11;\n`, 'x.ts'],
  ['⛔ a regex character class containing "//"', `const re = /[//]/;\nconst k = 12;\n`, 'x.ts'],
  ['⛔ JSX text containing "//"', `const A = () => <p>rate a//b here</p>;\nconst k = 13;\n`, 'x.tsx'],
  ['⛔ an apostrophe in JSX text, then a real LINE comment', `const A = () => <p>don${Q}t</p>;\n// strip me\nconst k = 14;\n`, 'x.tsx'],
  ['⛔ an apostrophe in JSX text, then a real BLOCK comment', `const A = () => <p>it${Q}s</p>;\nconst k = 1 /* strip me */ + 2;\n`, 'x.tsx'],
  ['a division operator followed by "*"', `const v = a / b * c;\nconst k = 16;\n`, 'x.ts'],
  ['two division operators on one line', `const v = n / 2; const w = m / 2;\nconst k = 17;\n`, 'x.ts'],
];

/**
 * The ORACLE is TypeScript's own comment ranges, applied independently of the
 * module under test — so a case asserts what a comment IS, never what this
 * module happens to do with it.
 */
const oracle = (text: string, fileName: string): string => {
  const sf = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    /\.tsx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out = text.split('');
  const seen = new Set<string>();
  const blank = (rs: ts.CommentRange[] | undefined): void => {
    for (const c of rs ?? []) {
      const k = `${c.pos}:${c.end}`;
      if (seen.has(k)) continue;
      seen.add(k);
      for (let i = c.pos; i < c.end; i++) if (out[i] !== '\n') out[i] = ' ';
    }
  };
  const walk = (n: ts.Node): void => {
    blank(ts.getLeadingCommentRanges(text, n.getFullStart()));
    blank(ts.getTrailingCommentRanges(text, n.getEnd()));
    n.getChildren(sf).forEach(walk);
  };
  walk(sf);
  return out.join('');
};

describe('the shared source scan — the cases that broke its predecessors', () => {
  it.each(CASES)('%s', (_name, src, fileName) => {
    expect(stripSourceComments(src, 'blank', fileName)).toBe(oracle(src, fileName));
  });

  it('⚠️ AND THE CASES ARE NOT VACUOUS — each one is a real positive or a real negative', () => {
    // Rule 1 and rule 4 together: a case list whose inputs held no marker would
    // pass every assertion above, and a list of only positives would never show
    // that the scan LEAVES non-comments alone. So each case is classified and
    // then required to behave like its class.
    let positives = 0;
    let negatives = 0;
    for (const [name, src, fileName] of CASES) {
      // backslashes dropped first: a regex-literal case carries its marker as
      // `/\*`, and a naive includes('/*') misses it and calls a real case vacuous.
      const bare = src.split('\\').join('');
      const hasMarker = bare.includes('//') || bare.includes('/*');
      const stripped = stripSourceComments(src, 'blank', fileName);
      if (hasMarker) {
        positives++;
      } else {
        negatives++;
        // no marker at all — the scan must be a no-op, not merely "correct"
        expect(stripped, name).toBe(src);
      }
    }
    expect(positives).toBeGreaterThan(10);
    expect(negatives).toBeGreaterThan(0);
    expect(positives + negatives).toBe(CASES.length);
  });

  it('⚠️ AND A MARKER ALONE IS NOT A COMMENT — the cases that must survive intact', () => {
    // The whole point of the parser: these carry `//` or `/*` and NONE of them
    // is a comment, so a correct scan changes nothing.
    for (const [name, src, fileName] of CASES.filter(([n]) => n.includes('inside a string'))) {
      expect(stripSourceComments(src, 'blank', fileName), name).toBe(src);
    }
  });

  it('⚠️ KNOWN-GOOD BEFORE KNOWN-BAD — a comment really is removed, and code really survives', () => {
    const s = 'const a = 1; // gone\n/* also gone */\nconst b = 2;\n';
    const out = stripSourceComments(s, 'blank');
    expect(out).not.toContain('gone');
    expect(out).toContain('const a = 1;');
    expect(out).toContain('const b = 2;');
  });
});

describe('the three replacement modes', () => {
  const s = "const a = 1; // c\nconst u = 'https://h//p';\n";
  it("'blank' keeps length and newline positions", () => {
    const out = stripSourceComments(s, 'blank');
    expect(out).toHaveLength(s.length);
    expect(out).toContain('https://h//p');
    expect(out).not.toContain('// c');
  });
  it("'delete' removes the comment outright", () => {
    expect(stripSourceComments(s, 'delete')).toBe("const a = 1; \nconst u = 'https://h//p';\n");
  });
  it("'space' collapses the comment to one space", () => {
    expect(stripSourceComments(s, 'space')).toBe("const a = 1;  \nconst u = 'https://h//p';\n");
  });
});

describe('THE PROPERTY, over every file in src/', () => {
  const files = sourceFiles(SRC);

  it('the population is real and includes the file the specimen came from', () => {
    // §42b: an empty walk reports clean either way.
    expect(files.length).toBeGreaterThan(400);
    expect(files.map(rel)).toContain('pages-v2/SupplierDeliveryAgreements.tsx');
  });

  // ⚠️ **ONE `expect` PER FILE, NOT ONE PER NEWLINE — THE CLAIM IS UNCHANGED
  // AND THE COST IS NOT.** This walk used to call `expect()` INSIDE the
  // character loop, so it ran roughly three hundred thousand times over ~10.5
  // MB of source, building the `@ ${i}` message EAGERLY on every iteration —
  // including the overwhelming majority that pass. Measured at PSL P4: 10.3 s,
  // 11.9 s, 10.8 s in isolation against a 30 s budget, about 2.6x headroom, on
  // a whole-tree walk this file's own siblings already proved insufficient at
  // 4.5x (`pageWidth.guard` timed out in a full-suite run at that ratio). It
  // duly timed out under `npm run gates`, which runs a build and two `tsc`
  // passes before the suite.
  //
  // ⚠️ **THE CAUSE IS REMOVED RATHER THAN BUDGETED, WHICH IS THE ORDER #369
  // SET** when it gave `chaosAmbience` a necessary-condition pre-filter instead
  // of a larger timeout: a budget buys silence, removing the work buys
  // headroom, and only the second helps the next seat who adds a file.
  //
  // ⚠️ **THE PROPERTY IS THE SAME PROPERTY, STATED AS A SET.** Before: for
  // every index `i` where `text[i]` is a newline, `out[i]` is a newline.
  // After: the set of those indices where `out` DISAGREES is empty. Identical
  // claim, and the message now names the first offending offsets rather than
  // dying on one of them.
  it("'blank' preserves length and every newline position, on every file", () => {
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      const out = stripSourceComments(text, 'blank', f);
      expect(out, rel(f)).toHaveLength(text.length);
      const moved: number[] = [];
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n' && out[i] !== '\n') moved.push(i);
      }
      expect(
        moved,
        `${rel(f)} — newline moved at ${moved.slice(0, 5).join(', ')}`,
      ).toEqual([]);
    }
  }, 30000);

  it('⚠️ AND IT REALLY STRIPS — the tree carries comments, so a no-op would pass the line test', () => {
    // `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`'s cousin: length preservation is
    // satisfied perfectly by a function that returns its input.
    const changed = files.filter((f) => {
      const t = readFileSync(f, 'utf8');
      return stripSourceComments(t, 'blank', f) !== t;
    });
    expect(changed.length).toBeGreaterThan(300);
  }, 30000);

  it('⚠️ THE SPECIMEN, ON THE REAL FILE — the act the two regexes deleted survives', () => {
    // `SupplierDeliveryAgreements.tsx:61` reads `// … #/supplier/* page.`, which
    // opened a false block that ran to the next `*/` and blanked lines 61→92.
    const f = join(SRC, 'pages-v2', 'SupplierDeliveryAgreements.tsx');
    const text = readFileSync(f, 'utf8');
    const kept = stripSourceComments(text, 'blank', f);

    // the line comment that starts the trap is really there
    expect(text).toContain('#/supplier/*');
    // the act really is there, and SURVIVES the strip
    expect(text).toContain('onRetry={() => query.refetch()}');
    expect(kept).toContain('onRetry={() => query.refetch()}');

    // and the retired form really loses it — the probe fires at a defect the
    // tree really carried, not at a synthetic subject built to be found.
    const twoRegex = text
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])(\/\/[^\n]*)/g, (_m, p: string, c: string) => p + c.replace(/[^\n]/g, ' '));
    expect(twoRegex).not.toContain('onRetry={() => query.refetch()}');
  });

  it('⚠️ THE SECOND CAUSE, ON A REAL FILE — a URL no longer truncates its line', () => {
    const f = join(SRC, 'pages-v2', 'SupplierDocuments.tsx');
    const text = readFileSync(f, 'utf8');
    expect(text).toContain('https://halal.go.id');
    expect(stripSourceComments(text, 'space', f)).toContain('https://halal.go.id');
    // the un-guarded retired form ate the rest of that line
    const retired = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
    expect(retired).not.toContain('https://halal.go.id');
  });

  it('⚠️ THE REGEX `pageWidth` DROPPED WAS INERT — proven over the tree, not argued', () => {
    // It ran AFTER a strip that had already removed every `/* … */`, so the
    // literal `{/*` it needs could only survive inside a string or a template.
    // Asserted both ways: it changes NO stripped file except the one string in
    // pageWidth's own source, and that instrument never reads itself.
    const JSX_COMMENT = /\{\/\*[\s\S]*?\*\/\}/g;
    const moved = files.filter((f) => {
      if (rel(f) === SELF) return false; // this spec quotes the shape on purpose
      const stripped = stripSourceComments(readFileSync(f, 'utf8'), 'delete', f);
      return stripped.replace(JSX_COMMENT, '') !== stripped;
    });
    expect(moved.map(rel)).toEqual(['router/pageWidth.guard.test.ts']);
    // KNOWN-GOOD control: the pattern is not simply broken — it matches when a
    // real `{/* … */}` is put in front of it.
    expect('a {/* x */} b'.replace(JSX_COMMENT, '')).toBe('a  b');
    // and the surviving occurrence really is inside a string literal
    expect(readFileSync(join(SRC, 'router', 'pageWidth.guard.test.ts'), 'utf8')).toContain(
      '{/* was <div className="p-6 max-w-6xl"> until §70 */}',
    );
  }, 30000);

  it('commentRanges are sorted and never overlap', () => {
    for (const f of files.slice(0, 120)) {
      const rs = commentRanges(readFileSync(f, 'utf8'), f);
      for (let i = 1; i < rs.length; i++) {
        expect(rs[i].pos, rel(f)).toBeGreaterThanOrEqual(rs[i - 1].end);
      }
    }
  }, 30000);
});

/**
 * ⚠️ **THE RATCHET. WITHOUT THIS, A REVERTED COPY IS GREEN.** The scanner spec
 * above tests the SCANNER; it says nothing about whether anything uses it. This
 * derives the two-regex shape BY PROPERTY across the whole tree and requires it
 * to be extinct — so re-introducing `/\/\*[\s\S]*?\*\//` beside `/\/\/.*$/` in
 * any instrument turns this red, in the file that did it.
 */
describe('⚠️ THE TWO-REGEX COMMENT STRIP IS EXTINCT — derived, not listed', () => {
  const files = sourceFiles(SRC).filter((f) => rel(f) !== SELF);

  /** A regex SOURCE that can match a comment opener and consume a comment. */
  const literalSource = (text: string): string => {
    if (text[0] !== '/') return text;
    let i = 1;
    let inClass = false;
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) break;
    }
    return text.slice(1, i);
  };
  const norm = (s: string): string => s.split('\\/').join('/').split('\\*').join('*');
  const stripsComments = (source: string): boolean => {
    const n = norm(source);
    if (n.includes('/*') && n.includes('*/')) return true;
    // the rest-of-line gate is the discriminator: a URL and a path regex both
    // contain `//` and strip nothing.
    return n.includes('//') && /\.\*|\[\^\\n\]\*|\[\^\\r\\n\]\*/.test(n);
  };

  const offenders = (): string[] => {
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      if (!text.includes('.replace')) continue;
      const sf = ts.createSourceFile(
        f,
        text,
        ts.ScriptTarget.Latest,
        true,
        /\.tsx$/.test(f) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const visit = (n: ts.Node): void => {
        if (
          ts.isCallExpression(n) &&
          ts.isPropertyAccessExpression(n.expression) &&
          (n.expression.name.text === 'replace' || n.expression.name.text === 'replaceAll') &&
          n.arguments.length >= 1 &&
          ts.isRegularExpressionLiteral(n.arguments[0]) &&
          stripsComments(literalSource(n.arguments[0].getText(sf)))
        ) {
          const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
          hits.push(`${rel(f)}:${line}`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    return hits;
  };

  it('⚠️ THE MATCHER IS PROBED BOTH WAYS FIRST — rule 4, on the ratchet itself', () => {
    // KNOWN-BAD: every retired form is recognised.
    for (const bad of [
      '/\\/\\*[\\s\\S]*?\\*\\//g',
      '/\\/\\/.*$/gm',
      '/(^|[^:])(\\/\\/[^\\n]*)/g',
      '/\\/\\/[^\\n]*/g',
      '/^\\s*\\/\\/.*$/gm',
      '/^[ \\t]*\\/\\/.*$/gm',
      '/\\{\\/\\*[\\s\\S]*?\\*\\/\\}/g',
    ]) {
      expect(stripsComments(literalSource(bad)), bad).toBe(true);
    }
    // KNOWN-GOOD: the tree's real non-strippers are NOT accused. Widening this
    // matcher swept in every one of these on its first run.
    for (const ok of [
      '/\\//g',
      '/^.*\\/src\\//',
      '/^https?:\\/\\//',
      '/https?:\\/\\/[^\\s]+/g',
      '/\\/$/',
      '/^\\//',
      '/[^\\n]/g',
    ]) {
      expect(stripsComments(literalSource(ok)), ok).toBe(false);
    }
  });

  it('⚠️ NO FILE IN src/ STRIPS COMMENTS WITH A REGEX — they all use the shared scan', () => {
    expect(files.length).toBeGreaterThan(400);
    expect(offenders()).toEqual([]);
  }, 30000);

  it('⚠️ AND THE CONSUMERS REALLY IMPORT IT — by import, not by hope', () => {
    // Derived, never listed: every file that calls `stripSourceComments` must
    // import it, and the set must be the one this batch converted.
    const importers: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      // the module that DEFINES it is not a consumer of it
      if (rel(f) === 'lib/sourceScan/stripComments.ts') continue;
      if (!text.includes('stripSourceComments')) continue;
      const sf = ts.createSourceFile(
        f,
        text,
        ts.ScriptTarget.Latest,
        true,
        /\.tsx$/.test(f) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const imported = sf.statements.some(
        (s) =>
          ts.isImportDeclaration(s) &&
          s.getText(sf).includes('stripSourceComments') &&
          s.getText(sf).includes('sourceScan/stripComments'),
      );
      expect(imported, `${rel(f)} names stripSourceComments without importing it`).toBe(true);
      importers.push(rel(f));
    }
    expect(importers.sort()).toEqual(
      [
        // Added 2026-09-24 by the sample-identity batch. The C10 §6.3 pin needs
        // to ask "does this file MINT a fixture person id?", and a bare
        // `includes` over raw source condemned three files that only EXPLAIN the
        // namespace in prose. Its first fix was a hand-rolled two-regex strip —
        // the extinct pattern this very spec exists to catch — which is how it
        // got here.
        'context/simUsrNamespace.test.ts',
        // The sample-identity batch's two derivations: the attribution-key
        // population (parsed, comments stripped) and the person-render census.
        'services/identity/attributionKeys.test.ts',
        'services/identity/personLabelGuard.test.ts',
        'lib/projectionGate/dayCounts.ts',
        'lib/projectionGate/derive.ts',
        'pages-v2/buyerInvoicesEscalateHonesty.test.ts',
        'pages-v2/deadAffordance.guard.test.tsx',
        // PSL P3 — the refusal-key gate derives the heads its hooks emit from
        // `policies.ts`, and strips comments first so a head DISCUSSED in prose
        // (this lane's comments name several) cannot be mistaken for one emitted.
        'pages-v2/psl/pslRefusal.test.ts',
        'pages-v2/registrationHonesty.guard.test.ts',
        'pages-v2/solidButtonRetired.guard.test.ts',
        'pages-v2/toastHonesty.guard.test.tsx',
        'pages-v2/widgets/SupplierCertsExpiringWidget.test.tsx',
        'router/pageWidth.guard.test.ts',
        'services/contracts/__tests__/c3Events.contract.test.ts',
        'services/data/approvalBandAuthored.guard.test.ts',
        'services/data/documentDisplayState.test.ts',
        'services/data/fixturePresent.guard.test.ts',
        // PSL P1 — both walk source to make a claim about REACHABILITY, so both
        // must be blind to a module named in prose. This file names every PSL
        // module in its own header.
        'services/data/pslListings.fixture.test.ts',
        'services/data/pslNoSupplierRead.test.ts',
        'services/data/pslReadIsClockIndependent.test.ts',
        'services/data/mock/chaosAmbience.test.ts',
        'services/sdc/__tests__/deriveC9FieldList.ts',
        'services/transitions/businessRoles.test.ts',
      ].sort(),
    );
  }, 30000);
});
