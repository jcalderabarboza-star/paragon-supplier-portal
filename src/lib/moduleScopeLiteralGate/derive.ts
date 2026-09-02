// ─────────────────────────────────────────────────────────────────────────────
// THE MODULE-SCOPE LITERAL GATE — the derivation.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//   `t()` is a HOOK BINDING. It exists only while a component body is running.
//   A reader-visible English string evaluated OUTSIDE a body — in a parameter
//   default, or at module load — is therefore unreachable by the i18n layer no
//   matter how complete that layer is, and **an EN-only test suite is blind to
//   the whole class by construction**: every assertion passes because English
//   is what it asked for. The class has only ever been caught by walking the
//   built bundle in Indonesian, by hand.
//
//   This module is the instrument that makes the next one fail a build.
//
// ── THE THREE SHAPES, AND WHY EACH IS NAMED SEPARATELY ──────────────────────
//   S1  `param-default`  — `({ title = 'Loading…' })`. Evaluated when the
//                          component is CALLED, before its body runs.
//   S1b `array-default`  — `({ breadcrumb = ['LOADING'] })`. ⚠️ Named apart
//                          from S1 because it EVADED the string-literal matcher
//                          that opened this batch: the literal is not the
//                          initializer, it is a CHILD of it. A matcher reading
//                          `initializer.text` finds nothing here, and reports
//                          clean.
//   S2  `mapped-const`   — a module-scope `const` consumed by `.map()`. The
//                          rows render; the literals load before any body.
//
//   ⚠️ **AND THE PARAMETER-SHAPED TRAP UNDERNEATH S1.** A React component's
//   defaults are almost never on the `Parameter` — they are on the
//   `BindingElement`s of the destructuring pattern that IS the parameter. A
//   `ts.isParameter(n) && n.initializer` matcher returns **2 rows** against this
//   tree and BOTH are false positives; adding `ts.isBindingElement` returns 56
//   and contains every real member. Same defect as the array shape, one node up.
//
// ── THE DISCRIMINATOR IS DERIVED, NOT GUESSED ───────────────────────────────
//   The hard half is acquitting codes and proper nouns without acquitting
//   prose. A "looks like a sentence" heuristic misfires in both directions, and
//   a central allowlist rots the moment code moves away from it. So this gate
//   never judges the CONTENT of an S1 string. It asks what the tree can answer:
//
//       **is this default REACHABLE — does any call site omit the prop?**
//
//   `SearchBar.placeholder` is passed at 16 of 16 sites: that literal cannot
//   render, and keying it would add a resource key with no reader — the
//   stored-field shape this project already refuses.
//
//   ⚠️ `Wizard.completeLabel` stood beside it here as the second 5-of-5
//   example until 2026-09-02, when the batch that translated the Wizard footer
//   DELETED the default and made the prop REQUIRED — so the dead state is now
//   unrepresentable rather than merely unreached, and this gate has one fewer
//   thing to acquit. The example is RETIRED rather than restated, because a
//   worked example whose subject no longer exists is the stale pointer this
//   project keeps deleting. The 16-of-16 above was re-derived that day.
//
//   `LoadingState.title` is omitted at 37 of 37: it renders on every
//   loading screen in the portal. Reachability separates the two with no
//   judgement at all, and — the property a marker can never have — **it
//   re-decides itself.** The day someone adds a call site that omits `title`,
//   that row becomes a defect with nobody editing this file.
//
//   Two structural acquittals sit in front of it, both sound:
//     • THE EMPTY STRING — `className = ''` is not copy.
//     • A CLOSED STRING-LITERAL UNION — `variant = 'outline'` declared
//       `variant?: 'outline' | 'secondary'` is a discriminator, and a
//       discriminator is not prose. Resolved through the TypeScript CHECKER, so
//       it is the DECLARED type and not an inference from the spelling.
//
//   S2 has no reachability question — a mapped const always renders — and no
//   structural tell separating `'Aceh'` from `'Nothing here yet'`. So S2 is
//   adjudicated by a REASON STATED AT THE SITE (`// i18n-defer: <why>`), which
//   is the convention this tree already runs on and the one thing a central
//   allowlist can never be: the same bytes as the code it acquits, so it cannot
//   outlive it. The consts that predate this gate are carried in
//   `grandfathered.ts` as a BILATERAL SET that can only shrink — a key with no
//   live const fails as loudly as a live const with no key.
//
// ── THE LIMITS, STATED BECAUSE A CENSUS THAT HIDES ITS BLIND SPOTS IS WORSE
//    THAN NO CENSUS ──────────────────────────────────────────────────────────
//   1. REACHABILITY IS BY JSX TAG NAME. A component rendered under an alias
//      (`import { X as Y }`) or via `React.createElement` is not counted — so a
//      default can be called reachable when it is not (fails LOUD, harmless) or,
//      if the ONLY omitting site is aliased, unreachable when it is not (fails
//      SILENT). `aliasImportCount` reports the tripwire either way.
//   2. S2 CONSUMPTION IS `.map()` ONLY, per the shape's definition. A const
//      rendered by index (`ROWS[i].label`) is outside this population.
//   3. A STRING'S CONTENT IS NEVER READ. This gate cannot tell you a flagged
//      string is English. It tells you the string cannot reach `t()` and that
//      nothing in the tree has adjudicated it.
// ─────────────────────────────────────────────────────────────────────────────
import ts from 'typescript';

/** Where an unreachable-by-`t()` literal was found. */
export type Shape = 'param-default' | 'array-default' | 'mapped-const';

/** Why a candidate is NOT a defect. `null` on a `Candidate` means it is one. */
export interface Acquittal {
  readonly kind: 'empty-string' | 'closed-union' | 'unreachable-default' | 'adjudicated';
  readonly note: string;
}

/** One string literal at a site `t()` cannot reach. */
export interface Candidate {
  readonly shape: Shape;
  readonly file: string;
  readonly line: number;
  /** The component for S1/S1b; the const name for S2. */
  readonly owner: string;
  /** The prop name for S1/S1b; the object property the string sits under for S2. */
  readonly prop: string;
  readonly text: string;
  readonly acquittal: Acquittal | null;
}

export interface Census {
  readonly candidates: readonly Candidate[];
  /** Defects — every candidate with no acquittal. */
  readonly flagged: readonly Candidate[];
  /** Distinct S2 const keys seen, `file::CONST`. Feeds the bilateral check. */
  readonly mappedConstKeys: readonly string[];
  /** Limit 1's tripwire: aliased value imports anywhere in scope. */
  readonly aliasImportCount: number;
  /** Files the census actually walked. Zero is EMPTY-INPUT-REPORTS-CLEAN-01. */
  readonly filesWalked: number;
}

export interface DeriveOptions {
  /**
   * `file::CONST` keys carried over from before this gate existed — the S2
   * worklist, and the ONLY thing standing between them and a red build.
   *
   * ⚠️ It is a SET, never a count. A ratchet on a number cannot tell
   * "one adjudicated, one added" from "nothing changed"; a set can, and the
   * bilateral assertion in the spec makes a row that no longer matches a live
   * const fail as loudly as a live const with no row. **It can only shrink.**
   */
  readonly grandfathered: ReadonlySet<string>;
}

const isFnLike = (n: ts.Node): boolean =>
  ts.isFunctionDeclaration(n) ||
  ts.isFunctionExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) ||
  ts.isConstructorDeclaration(n) ||
  ts.isGetAccessor(n) ||
  ts.isSetAccessor(n);

/** Files whose literals are not shipped copy: specs, harnesses, this gate. */
export function isOutOfScopePath(path: string): boolean {
  return (
    /\.test\.tsx?$/.test(path) ||
    /\.smoke\.tsx?$/.test(path) ||
    /\.guard\./.test(path) ||
    /(^|\/)__tests__\//.test(path) ||
    /(^|\/)src\/test\//.test(path) ||
    /(^|\/)moduleScopeLiteralGate\//.test(path)
  );
}

/**
 * Repo-relative path.
 *
 * ⚠️ The leading-slash strip is not tidiness. The synthetic harness names its
 * files `/src/Bad.tsx` against a root of `/`, and a naive
 * `file.replace(root + '/', '')` leaves `/src/Bad.tsx` — which fails the
 * `startsWith('src/')` scope test, derives an EMPTY population, and reports a
 * spotlessly clean tree. That is `EMPTY-INPUT-REPORTS-CLEAN-01` reached through
 * a path separator, and it is exactly how D-F's first harness failed (§40e).
 */
const rel = (root: string, file: string): string => {
  const f = file.replace(/\\/g, '/');
  const r = root.replace(/\\/g, '/').replace(/\/$/, '');
  return (r && f.startsWith(`${r}/`) ? f.slice(r.length + 1) : f).replace(/^\//, '');
};

/** Every string literal under `node` that is a VALUE — never an object key. */
function stringValuesUnder(node: ts.Node): ts.StringLiteralLike[] {
  const out: ts.StringLiteralLike[] = [];
  const walk = (n: ts.Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent;
      const isKey =
        (ts.isPropertyAssignment(p) && p.name === n) ||
        (ts.isPropertySignature(p) && p.name === n) ||
        ts.isImportDeclaration(p) ||
        ts.isExportDeclaration(p);
      if (!isKey) out.push(n);
    }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return out;
}

/** The object property a literal sits under; `''` when it is a bare element. */
function propertyOf(lit: ts.Node, sf: ts.SourceFile): string {
  const p = lit.parent;
  if (ts.isPropertyAssignment(p)) return p.name.getText(sf);
  if (ts.isArrayLiteralExpression(p) && ts.isPropertyAssignment(p.parent)) {
    return `${p.parent.name.getText(sf)}[]`;
  }
  return '';
}

/**
 * The reason stated in an `i18n-defer:` comment attached to `node`, or `null`.
 *
 * ⚠️ **THIS IS THE DISCRIMINATOR THE TREE ALREADY RATIFIED**, not one this gate
 * invented: `i18n-defer` is in use at ~30 sites today, and both of the consts
 * this batch was dispatched to fix (`TRACK_RECORD`, `MSG_LOG`) are already
 * adjudicated by name under it. What it buys over a central allowlist is that it
 * CANNOT GO STALE — it is the same bytes as the code it acquits, so it moves
 * when the code moves and dies when the code dies.
 *
 * ⚠️ **AND WHAT IT DOES NOT BUY, STATED PLAINLY: IT IS UNVERIFIED.** Anybody can
 * silence this gate by typing the comment, and nothing checks that the reason is
 * true. It buys a stated reason at the site and a diff that shows one being
 * added — visibility, not enforcement. That trade is the same one
 * `storedFieldGate`'s allowlist makes; the improvement here is locality.
 *
 * A reason is REQUIRED: the bare token acquits nothing, because `// i18n-defer`
 * with no argument is indistinguishable from a rubber stamp.
 */
function deferReason(node: ts.Node, sf: ts.SourceFile): string | null {
  const ranges = ts.getLeadingCommentRanges(sf.text, node.getFullStart()) ?? [];
  for (const r of ranges) {
    const text = sf.text.slice(r.pos, r.end);
    const m = /i18n-defer:\s*(\S.*)/.exec(text);
    if (m) return m[1].replace(/\s*\*\/\s*$/, '').trim();
  }
  return null;
}

/** True when `type`, minus `undefined`, is entirely string-literal types. */
function isClosedStringUnion(type: ts.Type): boolean {
  const parts = type.isUnion() ? type.types : [type];
  const meaningful = parts.filter((p) => (p.flags & ts.TypeFlags.Undefined) === 0);
  return meaningful.length > 0 && meaningful.every((p) => p.isStringLiteral());
}

/** The component a default belongs to — the name JSX would use. */
function owningComponentName(node: ts.Node, sf: ts.SourceFile): string {
  let n: ts.Node | undefined = node;
  while (n && !isFnLike(n)) n = n.parent;
  if (!n) return '';
  if (ts.isFunctionDeclaration(n) && n.name) return n.name.getText(sf);
  const p = n.parent;
  if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.getText(sf);
  return '';
}

interface CallSiteCensus {
  /** component → number of JSX sites. */
  readonly sites: Map<string, number>;
  /** `component::prop` → number of sites passing it. */
  readonly passed: Map<string, number>;
  readonly aliasImportCount: number;
}

/** Which props every JSX tag in the tree is actually passed, and how often. */
function censusCallSites(
  sourceFiles: readonly ts.SourceFile[],
  root: string,
): CallSiteCensus {
  const sites = new Map<string, number>();
  const passed = new Map<string, number>();
  let aliasImportCount = 0;
  for (const sf of sourceFiles) {
    if (isOutOfScopePath(rel(root, sf.fileName))) continue;
    const walk = (n: ts.Node): void => {
      // Limit 1's tripwire — `import { X as Y }` on a value binding.
      // Only a VALUE alias can hide a render site; `import type { A as B }`
      // cannot, and 13 of this tree's 13 aliases are type-only. A tripwire that
      // counts those is a tripwire nobody looks at.
      if (
        ts.isImportSpecifier(n) &&
        n.propertyName &&
        !n.isTypeOnly &&
        !n.parent.parent.isTypeOnly
      ) {
        aliasImportCount++;
      }
      if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
        const tag = n.tagName.getText(sf);
        sites.set(tag, (sites.get(tag) ?? 0) + 1);
        for (const a of n.attributes.properties) {
          if (!ts.isJsxAttribute(a)) continue;
          const k = `${tag}::${a.name.getText(sf)}`;
          passed.set(k, (passed.get(k) ?? 0) + 1);
        }
      }
      ts.forEachChild(n, walk);
    };
    walk(sf);
  }
  return { sites, passed, aliasImportCount };
}

/**
 * Derive every literal at a `t()`-unreachable site, with its acquittal or none.
 *
 * ⚠️ `filesWalked` is on the result deliberately. A derivation that examined
 * NOTHING reports a clean tree (`EMPTY-INPUT-REPORTS-CLEAN-01`) and that
 * failure looks exactly like a right answer. The caller asserts it before it
 * ever reads `flagged`.
 */
export function deriveCensus(
  program: ts.Program,
  root: string,
  opts: DeriveOptions,
): Census {
  const checker = program.getTypeChecker();
  const all = program
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile && !/node_modules/.test(sf.fileName));
  const inScope = all.filter((sf) => {
    const r = rel(root, sf.fileName);
    return r.startsWith('src/') && /\.tsx$/.test(r) && !isOutOfScopePath(r);
  });
  const { sites, passed, aliasImportCount } = censusCallSites(all, root);

  const candidates: Candidate[] = [];
  const mappedConstKeys = new Set<string>();

  for (const sf of inScope) {
    const file = rel(root, sf.fileName);
    const lineOf = (n: ts.Node): number =>
      sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

    // ── S1 / S1b — parameter and binding-element defaults ──────────────────
    const walkDefaults = (n: ts.Node): void => {
      if ((ts.isParameter(n) || ts.isBindingElement(n)) && n.initializer) {
        const shape: Shape = ts.isArrayLiteralExpression(n.initializer)
          ? 'array-default'
          : 'param-default';
        const prop = n.name.getText(sf);
        const owner = owningComponentName(n, sf);
        const siteCount = sites.get(owner) ?? 0;
        const omitted = siteCount - (passed.get(`${owner}::${prop}`) ?? 0);
        const siteDefer = deferReason(n, sf);
        let unionAcquitted = false;
        try {
          unionAcquitted = isClosedStringUnion(checker.getTypeAtLocation(n.name));
        } catch {
          unionAcquitted = false;
        }
        for (const lit of stringValuesUnder(n.initializer)) {
          const line = lineOf(lit);
          let acquittal: Acquittal | null = null;
          if (lit.text === '') {
            acquittal = { kind: 'empty-string', note: 'the empty string is not copy' };
          } else if (unionAcquitted) {
            acquittal = {
              kind: 'closed-union',
              note: 'declared type is a closed string-literal union — a discriminator, not prose',
            };
          } else if (siteCount > 0 && omitted <= 0) {
            acquittal = {
              kind: 'unreachable-default',
              note: `passed at all ${siteCount} JSX call sites — the default cannot render`,
            };
          } else if (siteDefer) {
            acquittal = { kind: 'adjudicated', note: siteDefer };
          }
          candidates.push({ shape, file, line, owner, prop, text: lit.text, acquittal });
        }
      }
      ts.forEachChild(n, walkDefaults);
    };
    walkDefaults(sf);

    // ── S2 — module-scope consts consumed by `.map()` ──────────────────────
    const mapped = new Set<string>();
    const findMaps = (n: ts.Node): void => {
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        n.expression.name.text === 'map'
      ) {
        let base: ts.Expression = n.expression.expression;
        for (let i = 0; i < 8; i++) {
          if (ts.isCallExpression(base)) {
            base = base.expression;
            continue;
          }
          if (ts.isPropertyAccessExpression(base)) {
            base = base.expression;
            continue;
          }
          if (ts.isElementAccessExpression(base)) {
            base = base.expression;
            continue;
          }
          break;
        }
        if (ts.isIdentifier(base)) mapped.add(base.text);
      }
      ts.forEachChild(n, findMaps);
    };
    findMaps(sf);

    for (const st of sf.statements) {
      if (!ts.isVariableStatement(st)) continue;
      for (const d of st.declarationList.declarations) {
        if (!d.initializer || !ts.isIdentifier(d.name)) continue;
        const name = d.name.getText(sf);
        if (!mapped.has(name)) continue;
        const literals = stringValuesUnder(d.initializer);
        if (literals.length === 0) continue;
        const key = `${file}::${name}`;
        mappedConstKeys.add(key);
        const stated = deferReason(st, sf);
        const reason = stated
          ? stated
          : opts.grandfathered.has(key)
            ? 'GRANDFATHERED — carried over from before this gate; awaiting adjudication'
            : null;
        for (const lit of literals) {
          candidates.push({
            shape: 'mapped-const',
            file,
            line: lineOf(lit),
            owner: name,
            prop: propertyOf(lit, sf),
            text: lit.text,
            acquittal: reason ? { kind: 'adjudicated', note: reason } : null,
          });
        }
      }
    }
  }

  return {
    candidates,
    flagged: candidates.filter((c) => c.acquittal === null),
    mappedConstKeys: [...mappedConstKeys].sort(),
    aliasImportCount,
    filesWalked: inScope.length,
  };
}

export function buildRepoProgram(root: string, tsconfig = 'tsconfig.vitest.json'): ts.Program {
  const normalized = root.replace(/\\/g, '/');
  const raw = ts.readConfigFile(`${normalized}/${tsconfig}`, ts.sys.readFile);
  if (raw.error) throw new Error(`cannot read ${tsconfig}`);
  const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, normalized);
  return ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
}

/**
 * Build a program from source strings — the harness the self-probe uses.
 *
 * ⚠️ The synthetic files MUST live under `/src/` and end `.tsx`: the census
 * scopes on exactly that, and D-F learned the hard way (§40e) that a harness
 * writing outside the scoped root derives an EMPTY population and then reports
 * a beautifully clean tree.
 */
export function buildProgramFromSources(files: Readonly<Record<string, string>>): ts.Program {
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React,
  };
  const sourceFiles = new Map<string, ts.SourceFile>();
  for (const [name, text] of Object.entries(files)) {
    sourceFiles.set(
      name,
      ts.createSourceFile(name, text, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX),
    );
  }
  const host: ts.CompilerHost = {
    getSourceFile: (name) => sourceFiles.get(name),
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => undefined,
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (n) => n,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => sourceFiles.has(name),
    readFile: (name) => files[name],
  };
  return ts.createProgram([...sourceFiles.keys()], options, host);
}
