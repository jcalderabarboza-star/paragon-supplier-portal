// ─────────────────────────────────────────────────────────────────────────────
// TREE-MUTATION GATE — no spec may write into the tree it is testing.
//
// ⚠️ **THE DEFECT THIS EXISTS FOR, MEASURED RATHER THAN IMAGINED.**
// `buyerDashboardNoLiterals.guard.test.ts` wrote a probe file into
// `src/pages-v2/dashboard/` and deleted it in a `finally`. That is a correct,
// bilateral probe and it was right to exist — but the directory it used is the
// SHARED SOURCE TREE, and **twelve other specs walk that tree at COLLECT time**
// and read every member they find. Between one spec's `readdirSync` (which
// admitted the probe file) and its `readFileSync` (which opened it), the other
// spec's `finally` deleted it, and the reader got `ENOENT`. Four failures in one
// run, naming a file that exists nowhere on disk.
//
// ── ⚠️ WHY THE GUARD IS ON THE **WRITER** SIDE AND NOT THE WALKER SIDE ───────
//   The walkers are the large population and the hard one: their roots are built
//   from parameters, defaults and closures, and a third of them do not resolve
//   statically at all. The writers are the small population and the easy one —
//   **one spec in this tree writes into a tracked path, and after this batch,
//   none does.** Guarding the writers fixes every walker at once, including the
//   walker nobody has written yet. Guarding the walkers would fix twelve files
//   and leave the thirteenth open.
//
// ── ⚠️ DEFAULT-DENY ON THE fs SURFACE, AND THAT IS THE LOAD-BEARING CHOICE ───
//   A hardcoded list of mutating calls (`writeFileSync`, `rmSync`, …) goes stale
//   in SILENCE the day somebody reaches for an API nobody listed, and a lost
//   match always reads as the humble answer
//   (`SILENT-PESSIMISM-TERMINATES-THE-INVESTIGATION-01`). So the READ-ONLY names
//   are enumerated and **everything else called on an `fs` binding is a
//   mutator**. A new mutator is caught by never having been acquitted.
//
// ── ⚠️ AN UNRESOLVED TARGET IS NOT A PASS ───────────────────────────────────
//   A path the evaluator cannot fold is reported as `UNRESOLVED`, and the guard
//   refuses it. Letting it through would make the gate's silence mean two
//   different things — "this writes somewhere safe" and "I could not tell" —
//   which is the exact ambiguity `EMPTY-INPUT-REPORTS-CLEAN-01` is about.
//
// ── REACH LIMITS, STATED ────────────────────────────────────────────────────
//   · Only `import` bindings are resolved. `require('fs')` and dynamic
//     `import('node:fs')` are NOT — measured today: **zero** specs use either,
//     all 53 fs-importing specs use `from 'node:fs'`. The cheap pre-filter below
//     matches all three forms anyway, so the day one appears the file still
//     enters the population and its calls are still walked.
//   · A path assembled at RUNTIME from a value this module cannot see folds to
//     `UNRESOLVED`, which the guard refuses rather than passes.
//   · `child_process` is not modelled. A spec that shells out to `rm` is outside
//     this gate, and is named here rather than left to be assumed covered.
// ─────────────────────────────────────────────────────────────────────────────
import ts from 'typescript';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── ⚠️ THE ROOT IS DERIVED FROM WHAT THE REPOSITORY DECLARES, NEVER FROM THE
//    FOLDER IT WAS CLONED INTO. ──────────────────────────────────────────────
//   This gate used to root itself at `process.cwd()` and prove that rooting by
//   asserting the path ENDED IN `paragon-supplier-portal`. Both halves were
//   wrong in the same direction, and the second hid the first: a clean clone
//   into any other directory name went red on a gate that had found no defect,
//   which is the worst reading an instrument can produce — a failure that says
//   nothing about the tree. A handover engineer clones into whatever they like.
//
//   ⚠️ **AND THE REPLACEMENT IS STRICTLY STRONGER, WHICH IS THE CONDITION FOR
//   MAKING IT.** A folder name is a label anybody can type; `name` in
//   `package.json` is the repository's own claim about its identity and travels
//   with the clone. The old check PASSED on an unrelated project sitting in a
//   folder somebody had named `paragon-supplier-portal`, and it FAILED on this
//   repository in a folder named anything else. Both directions are now right,
//   and `treeMutation.guard.test.ts` probes both of them against synthetic
//   directories rather than taking this paragraph's word for it.
//
//   The walk is upward from THIS MODULE, not from the cwd, so the root is the
//   same object however the suite is invoked. Precedent:
//   `chartPalette.guard.test.tsx` already roots itself at
//   `dirname(fileURLToPath(import.meta.url))`; what is added here is the
//   repository's own assertion at the end of the walk, so the answer cannot be
//   "three directories up, whatever that happens to be".

/** The repository's declared identity — `name` in its own `package.json`. */
export const PROJECT_NAME = 'paragon-supplier-portal';

/**
 * `name` in `<dir>/package.json`, or null when no package.json is there.
 *
 * ABSENT and UNREADABLE are deliberately different facts: only `ENOENT` means
 * "keep walking". Anything else is re-thrown, because a root that cannot be
 * read is not the same as a root that is not here, and a gate that conflates
 * them resolves to the wrong tree in silence.
 */
function packageNameAt(dir: string): string | null {
  let text: string;
  try {
    text = readFileSync(join(dir, 'package.json'), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
  const name: unknown = (JSON.parse(text) as { name?: unknown }).name;
  return typeof name === 'string' ? name : null;
}

/**
 * The nearest ancestor of `start` (inclusive) whose package.json declares
 * `PROJECT_NAME`. Null when there is none — NEVER a fallback to `start` or to
 * the cwd, because a fallback would put this gate back where it began: looking
 * at whichever directory it happened to be handed.
 */
export function findRepoRoot(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    if (packageNameAt(dir) === PROJECT_NAME) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

export const REPO_ROOT: string = (() => {
  const from = dirname(fileURLToPath(import.meta.url));
  const root = findRepoRoot(from);
  if (root === null)
    throw new Error(
      `tree-mutation gate: walked up from ${from} and found no package.json ` +
        `declaring "name": "${PROJECT_NAME}". The gate refuses to guess a root ` +
        `rather than walk the wrong tree.`,
    );
  return root;
})();

/** Directories that are never part of the tree under test. */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.vite']);

/** Every spec in the repo, derived from disk — never a list. */
export function specFiles(dir: string = REPO_ROOT, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) specFiles(p, out);
    else if (/\.(test|spec)\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * A spec can only call `fs` if it acquires `fs`. Cheap, and SOUND in the one
 * direction that matters: no import, no binding, no call. It exists so the gate
 * parses ~53 files instead of ~364 and cannot itself become the next 5-second
 * timeout — the defect one directory over.
 */
export const MENTIONS_FS =
  /from\s+['"](?:node:)?fs(?:\/promises)?['"]|require\(\s*['"](?:node:)?fs|import\(\s*['"](?:node:)?fs/;

/** Read-only `fs` surface. EVERYTHING ELSE IS TREATED AS A MUTATOR. */
const FS_READ_ONLY = new Set([
  'readFileSync', 'readFile', 'readdirSync', 'readdir', 'statSync', 'stat',
  'lstatSync', 'lstat', 'existsSync', 'access', 'accessSync', 'realpathSync',
  'realpath', 'readlinkSync', 'readlink', 'opendirSync', 'opendir', 'globSync',
  'glob', 'createReadStream', 'watch', 'watchFile', 'openSync', 'open',
  'fstatSync', 'readSync', 'closeSync', 'constants',
]);

export type Verdict = 'TRACKED' | 'TMPDIR' | 'OUTSIDE_REPO' | 'UNRESOLVED';

export interface Mutation {
  readonly file: string;
  readonly line: number;
  readonly call: string;
  readonly target: string;
  readonly verdict: Verdict;
}

const TMP = '\u0000TMPDIR\u0000';

/** Fold a path expression far enough to classify it. Returns null when it cannot. */
function evalPath(
  n: ts.Expression | undefined,
  consts: Map<string, ts.Expression>,
  depth = 0,
): string | null {
  if (!n || depth > 8) return null;
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isIdentifier(n)) {
    const c = consts.get(n.text);
    return c && c !== n ? evalPath(c, consts, depth + 1) : null;
  }
  if (ts.isCallExpression(n)) {
    const callee = ts.isPropertyAccessExpression(n.expression)
      ? n.expression.name.text
      : ts.isIdentifier(n.expression)
        ? n.expression.text
        : '';
    if (callee === 'join' || callee === 'resolve') {
      const parts = n.arguments.map((a) => evalPath(a as ts.Expression, consts, depth + 1));
      if (parts.some((p) => p === null)) return null;
      return (parts as string[]).reduce((a, b) => (a ? join(a, b) : b), '');
    }
    // A spec's `process.cwd()` is vitest's root, which is this repository's
    // root. That is an assumption about the RUNNER, not an identity, so the
    // guard asserts it rather than leaving it implicit — if a future runner
    // changes cwd, the gate says so instead of misclassifying every path.
    if (callee === 'cwd') return REPO_ROOT;
    if (callee === 'tmpdir') return TMP;
    // `mkdtempSync(join(tmpdir(), 'x-'))` evaluates to a directory UNDER its
    // argument, so the argument's classification is the answer.
    if (callee === 'mkdtempSync' || callee === 'mkdtemp')
      return evalPath(n.arguments[0] as ts.Expression, consts, depth + 1);
    // `p.replace(/\\/g, '/')` is a separator normalisation in this tree and
    // cannot move a path out of the directory it is in. Folded through so a
    // genuinely safe tmpdir write is not reported UNRESOLVED — which the guard
    // refuses, and a false refusal is how a gate gets edited instead of obeyed.
    if (callee === 'replace' && ts.isPropertyAccessExpression(n.expression))
      return evalPath(n.expression.expression as ts.Expression, consts, depth + 1);
    return null;
  }
  return null;
}

function classify(p: string | null): { verdict: Verdict; target: string } {
  if (p === null) return { verdict: 'UNRESOLVED', target: '(unresolved)' };
  if (p.includes(TMP)) return { verdict: 'TMPDIR', target: p.split(TMP).join('<tmpdir>') };
  const abs = resolve(p);
  const rel = relative(REPO_ROOT, abs);
  if (rel.startsWith('..') || rel === '') return { verdict: 'OUTSIDE_REPO', target: abs };
  return { verdict: 'TRACKED', target: rel.split(sep).join('/') };
}

/** Every `fs` mutation a spec performs, with its target classified. */
export function treeMutations(files: readonly string[]): Mutation[] {
  const found: Mutation[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (!MENTIONS_FS.test(text)) continue;
    const sf = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const nsOf = new Map<string, string>();
    const namedOf = new Map<string, { mod: string; orig: string }>();
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const mod = st.moduleSpecifier.text.replace(/^node:/, '');
      const c = st.importClause;
      if (!c) continue;
      if (c.name) nsOf.set(c.name.text, mod);
      const b = c.namedBindings;
      if (b && ts.isNamespaceImport(b)) nsOf.set(b.name.text, mod);
      if (b && ts.isNamedImports(b))
        for (const e of b.elements)
          namedOf.set(e.name.text, { mod, orig: (e.propertyName ?? e.name).text });
    }

    // Bindings that can name a path. A PARAMETER DEFAULT is one of them: the
    // recursive walkers in this tree are written `walk(dir = SRC)`, and without
    // this the one spec that actually collided folded to UNRESOLVED.
    const consts = new Map<string, ts.Expression>();
    const collect = (n: ts.Node): void => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer)
        consts.set(n.name.text, n.initializer);
      if (ts.isParameter(n) && ts.isIdentifier(n.name) && n.initializer)
        consts.set(n.name.text, n.initializer);
      ts.forEachChild(n, collect);
    };
    collect(sf);

    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n)) {
        let method = '';
        let isFs = false;
        if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression)) {
          const mod = nsOf.get(n.expression.expression.text);
          if (mod === 'fs' || mod === 'fs/promises') {
            isFs = true;
            method = n.expression.name.text;
          }
        } else if (ts.isIdentifier(n.expression)) {
          const nm = namedOf.get(n.expression.text);
          if (nm && (nm.mod === 'fs' || nm.mod === 'fs/promises')) {
            isFs = true;
            method = nm.orig;
          }
        }
        if (isFs && !FS_READ_ONLY.has(method)) {
          const { verdict, target } = classify(evalPath(n.arguments[0] as ts.Expression, consts));
          found.push({
            file: relative(REPO_ROOT, file).split(sep).join('/'),
            line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
            call: method,
            target,
            verdict,
          });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return found;
}
