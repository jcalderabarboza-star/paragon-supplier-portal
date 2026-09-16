// ────────────────────────────────────────────────────────────────────────────
// THE READING INSTANT, DERIVED FROM THE TREE — not declared in a list.
//
// ⚠️ **WHAT QUESTION THIS ANSWERS, AND WHY IT REPLACED THE OLD ONE.**
// `clockDrift` used to bind its population to *"does a reader still see a
// STORED clock-state?"* (`DISPLAY_STATES` rows in group `stored-in-fixtures`).
// Law 0.5 says no clock state is stored, so that population is EMPTY tree-wide
// and the detector fired for no family at any date — measured out to P+1219.
// It was not honest emptiness; it was a question nothing could answer YES to.
//
// The question that can drift is different: **is a family's clock-projected
// label computed against the WALL CLOCK?** A family read at `DECLARED_PRESENT`
// cannot drift — its labels are the same on every calendar day. A family read
// at `new Date()` drifts by definition, and the `origin = anchor + drift`
// arithmetic is exactly the geometry of that read.
//
// ── WHY AN AST INSTRUMENT AND NOT A GREP ────────────────────────────────────
// The `now` argument is frequently an identifier (`TODAY`, `INVOICE_NOW`,
// `nowIso`) whose provenance is a declaration somewhere else, sometimes inside
// a template literal. A textual matcher cannot follow that, and a matcher that
// keys on the literal `DECLARED_PRESENT` appearing in the same file reports on
// the file, not on the call. So the classifier resolves each argument through
// the checker's symbol table and follows initializers.
//
// ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────
// It never hard-codes which family is read where. Both halves are derived:
// families come from `FAMILY_ANCHORS`, the entity TYPE of each family comes
// from that family's own `shiftFields(...)` call, and the projection functions
// come from a property (an exported function with a now-ish parameter). A
// hand-written expectation exists ONLY in the test beside this file, as the
// bilateral pin the derivation must equal.
// ────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';

/** How a call site obtains the instant it projects against. */
export type NowProvenance =
  /** `DECLARED_PRESENT`, directly or through a const that resolves to it. */
  | 'P'
  /** A zero-argument wall-clock read (`new Date()` / `Date.now()`). */
  | 'WALL'
  /**
   * The `now` is the ENCLOSING function's own parameter — the instant is
   * decided by whoever calls it, not here. A forwarding site establishes no
   * instant, so it never contributes to a family's aggregate; the caller that
   * supplies a concrete value is classified instead.
   */
  | 'FORWARDED'
  /** A `now` the classifier could not follow to any of the above. */
  | 'UNRESOLVED';

/** A family's aggregate reading instant, over every call site attributed to it. */
export type FamilyInstant =
  | 'P'
  | 'WALL'
  | 'MIXED'
  | 'UNRESOLVED'
  /** The family reaches no projection call site at all. */
  | 'NO-CALL-SITES';

export interface CallSite {
  readonly fn: string;
  readonly file: string;
  readonly line: number;
  readonly provenance: NowProvenance;
  /** The argument text, for the report. */
  readonly nowText: string;
}

export interface FamilyReading {
  readonly family: string;
  readonly entityType: string | null;
  readonly sites: readonly CallSite[];
  readonly instant: FamilyInstant;
}

const norm = (p: string): string => p.split('\\').join('/');
const rel = (f: string): string => {
  const n = norm(f);
  const i = n.indexOf('/src/');
  return i >= 0 ? n.slice(i + 1) : n;
};
const isTestFile = (f: string): boolean => /\.test\.tsx?$/.test(norm(f));
const inSrc = (f: string): boolean =>
  norm(f).includes('/src/') && !norm(f).includes('node_modules');

/**
 * A parameter name that means "the instant to project against".
 *
 * ⚠️ This is the one NAME-based property in the instrument, and it is a
 * property of the PARAMETER, not of the function — so a new projection
 * function joins the population by naming its parameter the way every existing
 * one does, with no edit here. The test asserts the derived function set
 * contains known members and rejects a known non-member.
 */
const NOW_PARAM = /^(now|nowIso|todayIso|today|asOf|asOfIso)$/;

/**
 * The nominal type a printed type string names.
 *
 * ⚠️ `shiftFields` is sometimes handed a mapped type — `inventory`'s corpus
 * prints as `Omit<InventoryRecord, "stockStatus">` because the stored status
 * was removed at #318. Matching on the printed string would attribute NOTHING
 * to that family and report a confident `NO-CALL-SITES` for the wrong reason,
 * which is a blind spot wearing a verdict's clothes.
 */
function baseTypeName(printed: string): string {
  const s = printed.replace(/\[\]$/, '').trim();
  const m = /^(?:Omit|Pick|Readonly|Partial|Required)<\s*([A-Za-z_$][\w$]*)/.exec(s);
  return m ? m[1] : s;
}

/** Build the program the repo gate reads. Mirrors `storedFieldGate/derive.ts`. */
export function buildRepoProgram(root: string, tsconfig = 'tsconfig.vitest.json'): ts.Program {
  const normalized = norm(root);
  const configPath = `${normalized}/${tsconfig}`;
  const raw = ts.readConfigFile(configPath, ts.sys.readFile);
  if (raw.error) throw new Error(`cannot read ${tsconfig}`);
  const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, normalized);
  return ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
}

/**
 * Exported functions that take an instant — DERIVED, never listed.
 * Returns fn name → the index of its now-ish parameter.
 */
export function deriveProjectionFunctions(program: ts.Program): Map<string, number> {
  const out = new Map<string, number>();
  const record = (name: string, params: ts.NodeArray<ts.ParameterDeclaration>): void => {
    const i = params.findIndex((p) => ts.isIdentifier(p.name) && NOW_PARAM.test(p.name.text));
    if (i >= 0) out.set(name, i);
  };
  for (const sf of program.getSourceFiles()) {
    if (!inSrc(sf.fileName) || isTestFile(sf.fileName)) continue;
    ts.forEachChild(sf, (n) => {
      const exported = ts.canHaveModifiers(n)
        ? ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        : false;
      if (!exported) return;
      // `export function f(…, nowIso) {}`
      if (ts.isFunctionDeclaration(n) && n.name) record(n.name.text, n.parameters);
      // ⚠️ **AND `export const f = (…, now) => …`, WHICH THE FIRST DRAFT MISSED.**
      // Walking only `FunctionDeclaration` returned 39 functions and silently
      // excluded every arrow-function projection — among them the PO and RFQ
      // wall-clock readers (`buyerDerivations.ts`), which are precisely the
      // known-WALL sites the anti-vacuity control needs. A matcher narrow
      // enough to miss its own control is derivation rule 2.
      if (ts.isVariableStatement(n)) {
        for (const d of n.declarationList.declarations) {
          if (
            ts.isIdentifier(d.name) &&
            d.initializer &&
            (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))
          ) {
            record(d.name.text, d.initializer.parameters);
          }
        }
      }
    });
  }
  return out;
}

/**
 * family → the element TYPE NAME of the corpus that family re-times.
 * Derived from each family's own `shiftFields(corpus, 'family', [...])` call,
 * which is the tree's existing statement of "these rows belong to this family".
 */
export function deriveFamilyEntityTypes(program: ts.Program): Map<string, string> {
  const checker = program.getTypeChecker();
  const out = new Map<string, string>();
  for (const sf of program.getSourceFiles()) {
    if (!inSrc(sf.fileName) || isTestFile(sf.fileName)) continue;
    const visit = (n: ts.Node): void => {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        n.expression.text === 'shiftFields' &&
        n.arguments.length >= 2 &&
        ts.isStringLiteralLike(n.arguments[1])
      ) {
        const family = (n.arguments[1] as ts.StringLiteralLike).text;
        if (!out.has(family)) {
          // The element type of the array the call re-times.
          const t = checker.getTypeAtLocation(n.arguments[0]);
          const elem = checker.getIndexTypeOfType(t, ts.IndexKind.Number) ?? t.getNumberIndexType();
          const name = elem ? baseTypeName(checker.typeToString(elem)) : null;
          if (name) out.set(family, name);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}

/** Follow an expression to how it obtains its instant. */
function classifyNow(node: ts.Node, checker: ts.TypeChecker, depth = 0): NowProvenance {
  if (depth > 6) return 'UNRESOLVED';

  // `new Date()` with no arguments, or `Date.now()` — the wall clock.
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Date') {
    return !node.arguments || node.arguments.length === 0 ? 'WALL' : classifyArgs(node.arguments, checker, depth);
  }
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Date' &&
    node.expression.name.text === 'now'
  ) {
    return 'WALL';
  }

  // `<expr>.toISOString().slice(0,10)` and friends — follow the receiver.
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    return classifyNow(node.expression.expression, checker, depth + 1);
  }
  if (ts.isPropertyAccessExpression(node)) {
    return classifyNow(node.expression, checker, depth + 1);
  }

  // A template literal is `P` if any of its substitutions is.
  if (ts.isTemplateExpression(node)) {
    const parts = node.templateSpans.map((s) => classifyNow(s.expression, checker, depth + 1));
    if (parts.includes('WALL')) return 'WALL';
    if (parts.includes('P')) return 'P';
    return 'UNRESOLVED';
  }

  if (ts.isIdentifier(node)) {
    if (node.text === 'DECLARED_PRESENT') return 'P';
    const sym = checker.getSymbolAtLocation(node);
    const target =
      sym && sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
    const decl = target?.declarations?.[0];
    if (decl && ts.isVariableDeclaration(decl) && decl.initializer) {
      return classifyNow(decl.initializer, checker, depth + 1);
    }
    // A parameter: the instant arrives from the caller, so this site
    // establishes none. Reported, never aggregated.
    if (decl && ts.isParameter(decl)) return 'FORWARDED';
    return 'UNRESOLVED';
  }

  return 'UNRESOLVED';
}

function classifyArgs(
  args: ts.NodeArray<ts.Expression>,
  checker: ts.TypeChecker,
  depth: number,
): NowProvenance {
  const parts = args.map((a) => classifyNow(a, checker, depth + 1));
  if (parts.includes('WALL')) return 'WALL';
  if (parts.includes('P')) return 'P';
  return 'UNRESOLVED';
}

/** Does any argument of this call carry `typeName` (directly or as its element)? */
function callTouchesType(
  call: ts.CallExpression,
  checker: ts.TypeChecker,
  typeName: string,
): boolean {
  for (const arg of call.arguments) {
    const seen = new Set<string>();
    const add = (t: ts.Type | undefined): void => {
      if (!t) return;
      seen.add(checker.typeToString(t).replace(/\[\]$/, ''));
      const el = t.getNumberIndexType();
      if (el) seen.add(checker.typeToString(el).replace(/\[\]$/, ''));
    };
    add(checker.getTypeAtLocation(arg));
    // A property access (`doc.expiryDate`) carries the OWNER's type, which is
    // what attributes the site to a family.
    if (ts.isPropertyAccessExpression(arg)) add(checker.getTypeAtLocation(arg.expression));
    for (const s of seen) {
      if (baseTypeName(s) === typeName) return true;
    }
  }
  return false;
}

/**
 * EVERY classified projection call site in `src/`, family or not.
 *
 * Exposed because the anti-vacuity control needs sites OUTSIDE the anchored
 * families: `buyerDerivations`' PO and RFQ readers take `now: Date` from
 * `new Date()`, so a classifier that has quietly become "return P for
 * everything" is caught by them rather than by the families it is meant to
 * describe.
 */
export function deriveAllCallSites(program: ts.Program): CallSite[] {
  const checker = program.getTypeChecker();
  return collectCalls(program).map((c) => {
    const arg = c.call.arguments[c.idx];
    return {
      fn: c.fn,
      file: c.file,
      line: c.line,
      provenance: classifyNow(arg, checker),
      nowText: arg.getText().slice(0, 40),
    };
  });
}

interface RawCall {
  call: ts.CallExpression;
  fn: string;
  idx: number;
  file: string;
  line: number;
}

function collectCalls(program: ts.Program): RawCall[] {
  const fns = deriveProjectionFunctions(program);
  const calls: RawCall[] = [];
  for (const sf of program.getSourceFiles()) {
    if (!inSrc(sf.fileName) || isTestFile(sf.fileName)) continue;
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n)) {
        const name = ts.isIdentifier(n.expression)
          ? n.expression.text
          : ts.isPropertyAccessExpression(n.expression)
            ? n.expression.name.text
            : null;
        if (name && fns.has(name)) {
          const idx = fns.get(name)!;
          if (n.arguments.length > idx) {
            const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
            calls.push({ call: n, fn: name, idx, file: rel(sf.fileName), line: line + 1 });
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return calls;
}

/** The whole derivation: every anchored family's reading instant. */
export function deriveReadingInstants(
  program: ts.Program,
  families: readonly string[],
): FamilyReading[] {
  const checker = program.getTypeChecker();
  const entityTypes = deriveFamilyEntityTypes(program);
  const calls = collectCalls(program);

  return families.map((family) => {
    const typeName = entityTypes.get(family) ?? null;
    const sites: CallSite[] = [];
    if (typeName) {
      for (const c of calls) {
        if (!callTouchesType(c.call, checker, typeName)) continue;
        const arg = c.call.arguments[c.idx];
        sites.push({
          fn: c.fn,
          file: c.file,
          line: c.line,
          provenance: classifyNow(arg, checker),
          nowText: arg.getText().slice(0, 40),
        });
      }
    }
    // A FORWARDED site establishes no instant — the caller that supplies a
    // concrete value is classified on its own. Aggregating it would let a
    // helper's signature outvote the read that actually happens.
    const deciding = sites.filter((s) => s.provenance !== 'FORWARDED');
    const provs = new Set(deciding.map((s) => s.provenance));
    const instant: FamilyInstant =
      deciding.length === 0
        ? 'NO-CALL-SITES'
        : provs.has('UNRESOLVED')
          ? 'UNRESOLVED'
          : provs.has('WALL') && provs.has('P')
            ? 'MIXED'
            : provs.has('WALL')
              ? 'WALL'
              : 'P';
    return { family, entityType: typeName, sites, instant };
  });
}
