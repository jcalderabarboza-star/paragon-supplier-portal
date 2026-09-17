import ts from 'typescript';

/**
 * ONE comment-aware source scan, shared by every instrument in this tree that
 * strips comments out of source text before matching against it.
 *
 * ⚠️ **THE DEFECT THIS REPLACES, MEASURED RATHER THAN SUPPOSED.** The convention
 * it supersedes was two regexes — the BLOCK form first, the LINE form second.
 * A LINE comment that contains the characters `/*` opens a false block that runs
 * to the next `*\/` anywhere below it, blanking real code in between. The
 * specimen is `SupplierDeliveryAgreements.tsx:61` — `// every other #/supplier/*
 * page.` — which cost lines 61→92, `onRetry={() => query.refetch()}` among them.
 * Eight of this tree's nine stripper variants lost that region.
 *
 * ⚠️ **AND THE DIRECTION IS THE DANGEROUS ONE.** Losing code reads as "no act
 * found", and "no act found" is what several of these instruments ACCUSE on:
 * `SILENT-PESSIMISM-TERMINATES-THE-INVESTIGATION-01`. The second cause measured
 * in the same sweep runs the other way — `//` inside a string (a URL) truncates
 * the line, which is why `SupplierDocuments.tsx:791` and
 * `SupplierRegistration.tsx:536` lost code under the un-guarded variants.
 *
 * ⚠️ **WHY THIS IS THE PARSER AND NOT A CHARACTER SCANNER.** A left-to-right
 * character scan fixes the specimen and still gets five constructed cases wrong,
 * measured against TypeScript's own ranges: a regex literal containing `//`
 * (`/https?:\/\//`), a regex character class containing `//`, and JSX text
 * containing `//` each eat the rest of their line; and an apostrophe in JSX text
 * (`don't`) opens a phantom string that swallows every comment after it, so
 * comments survive unstripped. TypeScript's parser decides what a comment is, so
 * regex literals, JSX text, template substitutions and strings are excluded BY
 * CONSTRUCTION rather than by a rule written here and probed by its author.
 */
export type StripMode = 'blank' | 'delete' | 'space';

const scriptKind = (fileName: string): ts.ScriptKind =>
  /\.tsx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

/** Every comment range TypeScript found: sorted, non-overlapping, outermost. */
export function commentRanges(text: string, fileName = 'source.tsx'): ts.CommentRange[] {
  const sf = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(fileName),
  );
  const found: ts.CommentRange[] = [];
  const seen = new Set<string>();
  const add = (rs: ts.CommentRange[] | undefined): void => {
    for (const c of rs ?? []) {
      const key = `${c.pos}:${c.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(c);
    }
  };
  // Every comment is trivia in front of (or behind) some token, so visiting
  // every token reaches every comment.
  const walk = (n: ts.Node): void => {
    add(ts.getLeadingCommentRanges(text, n.getFullStart()));
    add(ts.getTrailingCommentRanges(text, n.getEnd()));
    n.getChildren(sf).forEach(walk);
  };
  walk(sf);
  found.sort((a, b) => a.pos - b.pos);
  const flat: ts.CommentRange[] = [];
  for (const r of found) {
    if (flat.length && r.pos < flat[flat.length - 1].end) continue;
    flat.push(r);
  }
  return flat;
}

const cache = new Map<string, Map<string, ts.CommentRange[]>>();
let cached = 0;

/**
 * Instruments read the same file many times in one run — `documentDisplayState`
 * nine times, and three whole-tree walkers once per spec. Without this the
 * parser re-runs per read and four suites exceed the 5s timeout.
 *
 * ⚠️ **THE CAP MUST CLEAR `src/` — A SMALLER ONE IS WORSE THAN NONE.** At 400
 * entries against this tree's ~770 source files a whole-tree walk evicted its
 * own earlier entries on every pass, so the cache thrashed and bought nothing
 * while still paying for itself. Keyed two levels deep so no key string is
 * built: the caller's own text is reused by reference.
 */
function cachedRanges(text: string, fileName: string): ts.CommentRange[] {
  let perFile = cache.get(fileName);
  if (!perFile) {
    perFile = new Map();
    cache.set(fileName, perFile);
  }
  const hit = perFile.get(text);
  if (hit) return hit;
  const ranges = commentRanges(text, fileName);
  if (cached > 4000) {
    cache.clear();
    cached = 0;
    cache.set(fileName, (perFile = new Map()));
  }
  perFile.set(text, ranges);
  cached++;
  return ranges;
}

/**
 * `blank`  — SAME LENGTH, same newline positions: every comment character
 *            becomes a space. This is what an instrument needs when an AST is
 *            parsed over the RAW source and addresses offsets in the stripped
 *            one, and what a per-line reader needs to keep line numbers.
 * `delete` — the comment is removed outright.
 * `space`  — the comment collapses to a single space, so the tokens either
 *            side of it stay separated.
 */
export function stripSourceComments(
  text: string,
  mode: StripMode,
  fileName = 'source.tsx',
): string {
  const ranges = cachedRanges(text, fileName);
  if (mode === 'blank') {
    const out = text.split('');
    for (const r of ranges) {
      for (let i = r.pos; i < r.end; i++) if (out[i] !== '\n') out[i] = ' ';
    }
    return out.join('');
  }
  let res = '';
  let last = 0;
  for (const r of ranges) {
    res += text.slice(last, r.pos);
    if (mode === 'space') res += ' ';
    last = r.end;
  }
  return res + text.slice(last);
}
