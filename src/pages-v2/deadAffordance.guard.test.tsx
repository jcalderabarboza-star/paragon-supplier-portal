// ─────────────────────────────────────────────────────────────────────────────
// THE DEAD-AFFORDANCE CENSUS — `DEAD-AFFORDANCE-01`, gated as a RATCHET.
//
// ⚠️ **THE CLASS, AND WHY NO EXISTING GATE REACHES IT.** `toastHonesty.guard`
// covers the affordance that LIES about what it did. This covers the one that
// SAYS NOTHING AT ALL — a labelled control with no handler, which a reader
// cannot tell from a working one: same variant, same icon, same hover, same
// cursor, and (measured on `BuyerSourcing`'s retired footer button) the same
// `disabled` → `enabled` transition at the moment the user finishes the work it
// names.
//
// **THE TWO GUARDS CANNOT SEE EACH OTHER'S POPULATION, AND THAT IS STRUCTURAL
// RATHER THAN AN OVERSIGHT.** `toastHonesty`'s population is TOAST-ANCHORED: it
// derives *"every `toast(` whose BRANCH contains none of the call shapes in
// `PERFORMS_REAL_ACT`"*. **A control with no handler fires no toast**, so it is
// outside that guard by construction — which is exactly why 31 of these shipped
// under a green suite.
//
// ── WHAT IS SHARED, AND THE ONE PREDICATE THAT HAD TO CHANGE ────────────────
//
// `PERFORMS_REAL_ACT`, `NON_SETTER_ACT`, the length-preserving comment stripper
// and the self-dismissal walk are LIFTED from `toastHonesty.guard.test.tsx`
// rather than re-derived, so the two agree on what an act is.
//
// ⚠️ **ONE DIVERGENCE, STATED BECAUSE IT INVERTS THAT GUARD'S RULING: CALLS ARE
// FOLLOWED HERE.** `toastHonesty` follows none, and argues correctly that
// following one would ACQUIT members it is right to convict (its five helper
// cases are all pure setters). **This instrument asks the opposite question**,
// where NOT following a call CONVICTS working code: `onClick={() => openRfq(r)}`
// is not a no-op. Measured on the first run of this matcher — nine live controls
// on `BuyerSourcing` alone were reported dead before calls were followed
// (derivation rule 2, a narrow matcher manufacturing accusations). Resolution is
// bounded at depth 3, and a callee this file cannot see is reported UNRESOLVED,
// never inferred absent.
//
// ⚠️ **AND A SECOND: A SETTER IS A SELF-DISMISSAL ONLY IF IT WRITES A CLOSING
// LITERAL.** `toastHonesty`'s predicate asks only whether the setter's variable
// gates the surface. That is right for a toast-anchored population and wrong
// here: `setPinDraft({ ...pinDraft, rate })` writes the state that gates its own
// dialog and is an EDIT, not a dismissal. Without the literal test this file
// convicted four live FX inputs.
//
// ── THE RATCHET, AND WHY IT IS NOT A ZERO ──────────────────────────────────
//
// **The honest number today is not zero and pretending otherwise would mean
// either lying or dispatching a ten-page sweep to get this file green.** So the
// DEAD set is pinned EQUAL to `RESIDUE` — a named list — **in both directions**:
//   · a NEW dead control is red until somebody names it here;
//   · a FIXED one is red until somebody removes it from here.
// The second direction is the half that makes it a ratchet rather than an
// allowlist, and it is the half an exemption list never has.
//
// ⚠️ **IT IS A RESIDUE LIST, NOT AN EXEMPTION LIST, AND THE DIFFERENCE IS
// ENFORCED: every row carries `ruling` — a §-reference or the word `UNRULED`.**
// An exemption list says *"this is fine"*. This says *"this is a known defect,
// and here is who has ruled on it."* `C9-STALE-BY-FIX-01` is the failure mode it
// is built against: a row that outlives its subject. It cannot here, because
// fixing the control reddens the row.
//
// ── KEYS ARE LINE-INDEPENDENT, WHICH IS THE WHOLE COST OF ENTRY ─────────────
//
// A residue keyed by `file:line` would redden on every unrelated edit above it
// and train people to re-number the list — CP-3a's *"trains people to edit the
// number"* defect, imported into a ratchet. So a member is keyed by
// **file + a stable label key**, resolved in this order: the `t('…')` key in the
// control's own children; then in its `aria-label` / `title`; then its
// `data-testid`; then a DYNAMIC `t(expr)` as `dyn:<expr>`; then the literal
// text. Keys are asserted UNIQUE per file — a collision would silently merge two
// members and under-report the population, which is the vacuity this file would
// not otherwise notice.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { stripSourceComments } from '../lib/sourceScan/stripComments';

const SRC = join(__dirname, '..');

/**
 * Length-preserving comment strip.
 *
 * ⚠️ **THIS IS A SCANNER, NOT THE TWO-REGEX `codeOnly` EVERY OTHER INSTRUMENT IN
 * THIS TREE COPIES, AND THE REASON IS A DEFECT MEASURED ON THIS BRANCH RATHER
 * THAN A PREFERENCE.** The convention — block form first, then line form — is
 * defeated by a LINE comment that contains the characters `/*`. The block regex
 * finds that `/*`, scans forward for the next `*​/`, and **blanks every line in
 * between, real code included.**
 *
 * **The specimen is in this repository, and it produced a false conviction on
 * the first run of this guard.** `SupplierDeliveryAgreements.tsx:61` reads
 * `// every other #/supplier/​* page.` — so the strip ate lines 61–92, and
 * line 65's `onRetry={() => query.refetch()}` arrived here as 21 spaces. A
 * handler that has been deleted by its own instrument is indistinguishable from
 * a handler that was never written: the control was reported DEAD.
 *
 * ⚠️ **AND THE DIRECTION IS THE DANGEROUS ONE — the strip LOSES code, losing
 * code reads as "no act found", and "no act found" is this file's accusation.**
 * `SILENT-PESSIMISM-TERMINATES-THE-INVESTIGATION-01`: the instrument was
 * manufacturing exactly the shape its reader is hunting for.
 *
 * So the scan goes left to right and knows what it is inside: a line comment
 * ends at the newline and never opens a block; a block ends only at `*​/`;
 * neither opens inside a string or template literal. Every replaced character
 * becomes a space and every newline survives, so byte offsets and LINE NUMBERS
 * are unchanged — which is what lets an AST parsed over the RAW source address
 * offsets in the stripped source.
 *
 * ⚠️ **THE SAME TWO-REGEX FORM IS LIVE IN `toastHonesty.guard.test.tsx` AND
 * THREE OTHER INSTRUMENTS. IT IS NOT CHANGED HERE** — that is a separate batch
 * with its own population measurement — but `SupplierDeliveryAgreements.tsx` is
 * the one production file in the tree that trips it today, so this is recorded
 * where the next reader of a stripper will see it.
 */
const codeOnly = (s: string): string => stripSourceComments(s, 'blank');

/** Lifted verbatim from `toastHonesty.guard.test.tsx`. */
const NON_SETTER_ACT =
  /\b(?:\w*[Mm]utation\.mutate|\w*[Mm]utateAsync|dispatch|navigate|window\.open|createObjectURL|setSearchParams|location\.assign|fetch|refetch|invalidateQueries)\s*\(/;

const stateVarsOf = (src: string): Set<string> =>
  new Set(
    [...src.matchAll(/\bconst\s*\[\s*(\w+)\s*,\s*set[A-Z]\w*\s*\]\s*=\s*useState/g)].map((m) => m[1]),
  );
const settersOf = (src: string): Set<string> =>
  new Set(
    [...src.matchAll(/\bconst\s*\[\s*\w+\s*,\s*(set[A-Z]\w*)\s*\]\s*=\s*useState/g)].map((m) => m[1]),
  );
const stateNameOf = (c: string): string => c.charAt(0).toLowerCase() + c.slice(1);

/** A control by VOCABULARY — in the population whether or not it has a handler. */
// UI-1c-3 · the pressed components are IN the vocabulary. They are what a
// page's `<button>` became; left out, every converted control would have left
// this population on the day it was converted, with nothing going red.
const PRESSED = ['LinkButton', 'IconButton', 'ToggleChip', 'RowButton', 'CardButton'] as const;
const CONTROL_TAGS = new Set<string>(['Button', 'button', 'a', ...PRESSED]);
/** Props whose value is an array of action DESCRIPTOR objects (`BulkActionsBar`). */
const ACTION_PROPS = new Set(['actions', 'primary', 'secondary', 'rowActions', 'menuItems']);
/** react-query lifecycle callbacks are NOT affordances (toastHonesty's rule). */
const LIFECYCLE = /^on(Success|Error|Settled|Mutate)$/;
const NON_COMMAND = /^on(Change|Close|KeyDown|KeyUp|Focus|Blur|MouseEnter|MouseLeave)$/;

type Cls =
  | 'DEAD'
  | 'LIVE'
  | 'TOAST_ONLY'
  | 'SELF_DISMISSAL'
  | 'EVENT_GUARD'
  | 'PROP_THREADED'
  | 'UNRESOLVED'
  | 'SPREAD';

interface Site {
  readonly file: string;
  readonly line: number;
  readonly key: string;
  readonly tag: string;
  readonly cls: Cls;
}

const walk = (d: string, out: string[] = []): string[] => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(p) && !/\.test\.tsx$/.test(p) && !/\.smoke\.tsx$/.test(p)) out.push(p);
  }
  return out;
};

function censusOf(file: string, raw: string): Site[] {
  const src = codeOnly(raw);
  const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const stateVars = stateVarsOf(src);
  const setterNames = settersOf(src);
  const rel = file.split('\\').join('/').replace(/^.*\/src\//, 'src/');
  const textOf = (n: ts.Node): string => src.slice(n.getStart(sf), n.getEnd());
  const lineOf = (pos: number): number => sf.getLineAndCharacterOfPosition(pos).line + 1;

  const decls = new Map<string, ts.Node>();
  const collect = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer)
      decls.set(n.name.text, n.initializer);
    if (ts.isFunctionDeclaration(n) && n.name) decls.set(n.name.text, n);
    ts.forEachChild(n, collect);
  };
  collect(sf);

  const identifiersOf = (n: ts.Node): Set<string> => {
    const out = new Set<string>();
    const w = (x: ts.Node): void => {
      if (ts.isIdentifier(x)) out.add(x.text);
      ts.forEachChild(x, w);
    };
    w(n);
    return out;
  };
  const nodeAt = (pos: number): ts.Node => {
    let found: ts.Node = sf;
    const w = (n: ts.Node): void => {
      if (n.getStart(sf) <= pos && pos < n.getEnd()) {
        found = n;
        ts.forEachChild(n, w);
      }
    };
    ts.forEachChild(sf, w);
    return found;
  };
  /** toastHonesty's `gatesTheSurface`, verbatim in property. */
  const gatesTheSurface = (name: string, pos: number): boolean => {
    let cur: ts.Node | undefined = nodeAt(pos);
    while (cur) {
      const p: ts.Node | undefined = cur.parent;
      if (p) {
        if (ts.isConditionalExpression(p) && cur !== p.condition && identifiersOf(p.condition).has(name))
          return true;
        if (
          ts.isBinaryExpression(p) &&
          (p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            p.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
            p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) &&
          cur === p.right &&
          identifiersOf(p.left).has(name)
        )
          return true;
        if (ts.isIfStatement(p) && cur !== p.expression && identifiersOf(p.expression).has(name))
          return true;
      }
      cur = p;
    }
    return false;
  };

  /**
   * Handler text PLUS the bodies of locally declared callees, bounded at depth
   * 3. `unresolved` records every callee THIS FILE CANNOT SEE — a prop, an
   * import, a ref method.
   *
   * ⚠️ **THE `unresolved` SET IS LOAD-BEARING AND ITS ABSENCE PRODUCED 15 FALSE
   * ACCUSATIONS ON THE FIRST RUN OF THIS GUARD.** Without it, a handler whose
   * whole act is a call this file cannot follow —
   * `onClick={() => inputRef.current?.click()}` in `XlsxImportPanel`, or a
   * `onClick={() => onSubmitQuote(rfq)}` prop callback in `SupplierRFQs` —
   * resolves to "no act found" and is indistinguishable from a handler that
   * genuinely does nothing. **"I could not see it" is not "it is not there"**
   * (derivation rule 3, one layer down), so it gets its own class and is judged
   * nowhere rather than convicted.
   */
  const transitive = (
    text: string,
    depth = 0,
    seen = new Set<string>(),
    unresolved = new Set<string>(),
  ): { text: string; unresolved: Set<string> } => {
    if (depth > 3) return { text, unresolved };
    let acc = text;
    for (const m of text.matchAll(/\b([a-z_$][A-Za-z0-9_$]*)\s*\(/g)) {
      const c = m[1];
      if (seen.has(c)) continue;
      seen.add(c);
      if (/^(if|for|while|switch|catch|return|typeof|t)$/.test(c)) continue;
      const d = decls.get(c);
      if (d) acc += '\n' + transitive(textOf(d), depth + 1, seen, unresolved).text;
      else if (!/^(console|String|Number|Boolean|Array|Object|Math|JSON|parseInt|parseFloat)$/.test(c))
        unresolved.add(c);
    }
    // ⚠️ A HANDLER CAN BE PASSED BY REFERENCE RATHER THAN CALLED, AND THE CALL
    // MATCHER ABOVE CANNOT SEE ONE. `onRelease={canRelease ? handleRelease :
    // undefined}` names a real handler with no `(` anywhere — resolving only
    // call syntax reported `BuyerContractDetail`'s release control as dead. So
    // bare identifiers that resolve to a local declaration are followed too.
    for (const m of text.matchAll(/\b([a-z_$][A-Za-z0-9_$]*)\b(?!\s*\()/g)) {
      const c = m[1];
      if (seen.has(c)) continue;
      const d = decls.get(c);
      if (!d) continue;
      seen.add(c);
      acc += '\n' + transitive(textOf(d), depth + 1, seen, unresolved).text;
    }
    return { text: acc, unresolved };
  };

  const classify = (body: string | null, pos: number): Cls => {
    if (body === null) return 'DEAD';
    const first = body.trim();
    if (first === '' || /^\{\s*\}$/.test(first)) return 'DEAD';
    if (/^\(\s*[^)]*\)\s*=>\s*(\{\s*\}|undefined|null|void 0)\s*$/.test(first)) return 'DEAD';
    if (/^\([^)]*\)\s*=>\s*\w+\.(stopPropagation|preventDefault)\(\)\s*$/.test(first))
      return 'EVENT_GUARD';
    const { text: b, unresolved } = transitive(body);
    if (NON_SETTER_ACT.test(b)) return 'LIVE';
    const calls = [...b.matchAll(/\bset([A-Z]\w*)\s*\(\s*([^,)]{0,40})/g)].map((m) => ({
      name: stateNameOf(m[1]),
      arg: m[2].trim(),
    }));
    const closing = (a: string): boolean => /^(null|false|undefined|''|"")\s*\)?$/.test(a);
    if (calls.some((c) => !(stateVars.has(c.name) && gatesTheSurface(c.name, pos) && closing(c.arg))))
      return 'LIVE';
    if (/\btoast\s*\(/.test(b)) return 'TOAST_ONLY';
    if (calls.length > 0) return 'SELF_DISMISSAL';
    // A body that DOES something this file cannot follow is not a dead control.
    if (unresolved.size > 0) return 'UNRESOLVED';
    return 'DEAD';
  };

  const resolve = (expr: ts.Expression | undefined): { text: string | null; prop: boolean } => {
    let e: ts.Node | undefined = expr;
    if (e && ts.isJsxExpression(e)) e = e.expression;
    if (!e) return { text: null, prop: false };
    if (ts.isIdentifier(e)) {
      const d = decls.get(e.text);
      if (d) {
        const t = textOf(d).trim();
        // ⚠️ AN ALIAS IS NOT A NO-OP. `const handleViewAsBuyer = signInAsBuyer;`
        // resolves to a bare identifier this file does not declare — a hook or
        // an import. Convicting it reported `Login`'s two demo entry points as
        // dead controls. Resolve the alias one more hop, then admit the limit.
        if (/^[A-Za-z_$][\w$]*$/.test(t)) {
          const d2 = decls.get(t);
          if (d2) return { text: textOf(d2), prop: false };
          return { text: null, prop: true };
        }
        return { text: t, prop: false };
      }
      // a bare `useState` setter handed to a child IS the act
      if (setterNames.has(e.text)) return { text: `${e.text}(x)`, prop: false };
      return { text: null, prop: true };
    }
    // ⚠️ A PROPERTY ACCESS ON A RECEIVER THIS FILE CANNOT SEE IS A FORWARD, NOT
    // AN ABSENCE. `BulkActionsBar` renders `onClick={a.onClick}` over its
    // `actions` array: the bar hands on whatever each descriptor carries. The
    // defect lives at the CALL SITES that omit `onClick` — every one of which is
    // separately in this population — and convicting the bar would accuse the
    // component that every live toolbar button in the portal is built from,
    // while saying nothing about the pages that actually shipped the hole.
    if (ts.isPropertyAccessExpression(e)) {
      const root = e.expression;
      if (ts.isIdentifier(root) && !decls.has(root.text)) return { text: null, prop: true };
    }
    return { text: textOf(e), prop: false };
  };

  const keyFrom = (children: string, attrs: ts.JsxAttribute[], fallback: string): string => {
    const named = (n: string): ts.JsxAttribute | undefined =>
      attrs.find((a) => a.name.getText(sf) === n);
    const lit = (s: string): string | null => {
      const m = s.match(/t\(\s*'([^']+)'/);
      return m ? m[1] : null;
    };
    const fromChildren = lit(children);
    if (fromChildren) return fromChildren;
    for (const a of ['aria-label', 'title', 'placeholder']) {
      const at = named(a);
      if (at?.initializer) {
        const k = lit(textOf(at.initializer));
        if (k) return k;
      }
    }
    const tid = named('data-testid');
    if (tid?.initializer) {
      const m = textOf(tid.initializer).match(/"([^"]+)"|'([^']+)'/);
      if (m) return `testid:${m[1] ?? m[2]}`;
    }
    const dyn = children.match(/\{\s*t\(([^)]+)\)\s*\}/);
    if (dyn) return `dyn:${dyn[1].replace(/\s+/g, '')}`;
    const words = children.replace(/<[^>]*>/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim();
    return words ? `text:${words.slice(0, 40)}` : fallback;
  };

  const sites: Site[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
      const hasSpread = node.attributes.properties.some(ts.isJsxSpreadAttribute);
      const named = (n: string): ts.JsxAttribute | undefined =>
        attrs.find((a) => a.name.getText(sf) === n);
      const onAttrs = attrs.filter(
        (a) => /^on[A-Z]/.test(a.name.getText(sf)) && !LIFECYCLE.test(a.name.getText(sf)),
      );
      const role = named('role');
      const interactiveRole =
        role !== undefined && /"(button|link|menuitem|tab|checkbox|switch)"/.test(textOf(role));
      if (CONTROL_TAGS.has(tag) || onAttrs.length > 0 || interactiveRole) {
        const pos = node.getStart(sf);
        const parent = node.parent;
        const children =
          ts.isJsxElement(parent) && parent.openingElement === node
            ? src.slice(parent.openingElement.getEnd(), parent.closingElement.getStart(sf))
            : '';
        const key = keyFrom(children, attrs, `${tag}@${lineOf(pos)}`);

        // ── EXCLUSIONS, each by property and each with its reason ──────────
        // (1) A spread may carry the handler. `Button.tsx`'s own `{...rest}` is
        //     the specimen: convicting it would accuse the primitive that every
        //     live button in the portal is built from.
        if (hasSpread) {
          sites.push({ file: rel, line: lineOf(pos), key, tag, cls: 'SPREAD' });
          ts.forEachChild(node, visit);
          return;
        }
        // (2) An `<a>` with a real href NAVIGATES — it needs no handler. `#` and
        //     the empty string are not real hrefs and stay in the population.
        const href = named('href');
        if (tag === 'a' && href?.initializer) {
          const h = textOf(href.initializer);
          if (!/^["']#?["']$/.test(h) && !/^\{?["']#["']\}?$/.test(h)) {
            sites.push({ file: rel, line: lineOf(pos), key, tag, cls: 'LIVE' });
            ts.forEachChild(node, visit);
            return;
          }
        }
        // (3) `type="submit"` inside a form submits it. The tree's only instance
        //     is `CreateRolePanel`, whose `<form onSubmit={submit}>` is the act.
        const typeAttr = named('type');
        if (typeAttr && /submit/.test(textOf(typeAttr))) {
          sites.push({ file: rel, line: lineOf(pos), key, tag, cls: 'LIVE' });
          ts.forEachChild(node, visit);
          return;
        }

        const cmd =
          onAttrs.find((a) => a.name.getText(sf) === 'onClick') ??
          onAttrs.find((a) => !NON_COMMAND.test(a.name.getText(sf))) ??
          onAttrs[0];
        const h = cmd ? resolve(cmd.initializer) : null;
        const cls: Cls = h?.prop ? 'PROP_THREADED' : classify(h ? h.text : null, pos);
        sites.push({ file: rel, line: lineOf(pos), key, tag, cls });
      }
    }
    if (ts.isObjectLiteralExpression(node)) {
      const props = node.properties.filter(
        (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name),
      );
      if (props.some((p) => p.name.getText(sf) === 'label')) {
        let cur: ts.Node | undefined = node.parent;
        let owner = false;
        while (cur) {
          if (ts.isJsxAttribute(cur) && ACTION_PROPS.has(cur.name.getText(sf))) { owner = true; break; }
          if (ts.isPropertyAssignment(cur) && ACTION_PROPS.has(cur.name.getText(sf))) { owner = true; break; }
          cur = cur.parent;
        }
        if (owner) {
          const pos = node.getStart(sf);
          const labelP = props.find((p) => p.name.getText(sf) === 'label')!;
          const clickP = props.find((p) => p.name.getText(sf) === 'onClick');
          const h = clickP ? resolve(clickP.initializer) : null;
          const lt = textOf(labelP.initializer);
          const m = lt.match(/t\(\s*'([^']+)'/);
          const key = m ? m[1] : `text:${lt.replace(/\s+/g, ' ').slice(0, 40)}`;
          const cls: Cls = h?.prop ? 'PROP_THREADED' : classify(h ? h.text : null, pos);
          sites.push({ file: rel, line: lineOf(pos), key, tag: 'descriptor', cls });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return sites;
}

const FILES = walk(SRC);
const ALL: Site[] = FILES.flatMap((f) => censusOf(f, readFileSync(f, 'utf8')));
const DEAD = ALL.filter((s) => s.cls === 'DEAD');
const idOf = (s: { file: string; key: string }): string => `${s.file}::${s.key}`;

/**
 * ⚠️ **THE RESIDUE IS GONE, AND ITS ABSENCE IS THE ASSERTION — H3.**
 *
 * This file used to carry `RESIDUE`, a named list of 29 known-dead controls with
 * a ruling against each, pinned EQUAL to the derived DEAD set in both
 * directions. That was the right instrument for a tree that had 29 of them: it
 * refused a NEW one silently appearing, and it reddened when one was FIXED, so
 * no row could outlive its subject (`C9-STALE-BY-FIX-01`).
 *
 * ⚠️ **BUT A RATCHET THAT ADMITS A NEW MEMBER BY EDITING A LIST IS STILL A LIST,
 * AND THE POPULATION IS NOW ZERO — SO THE LIST IS DELETED RATHER THAN EMPTIED.**
 * Every one of the 29 was WIRED, given an honest notice, or removed at H3. An
 * empty `RESIDUE` kept beside an empty `DEAD` would pass two assertions that
 * each say nothing, and it would leave the door it was built as: a seat with a
 * handler-less control could ship it by adding one line here with the word
 * `UNRULED` beside it. **There is no such line to add now.** `DEAD` is asserted
 * EMPTY, by name, and the only way to make this file green again is to make the
 * control true, honest, or absent.
 *
 * ⚠️ **AND DELETING THE LIST TOOK THE INSTRUMENT'S ONLY REAL SUBJECT WITH IT,
 * WHICH IS THE PART THAT NEEDED A REPLACEMENT RATHER THAN A NOTE.** The old
 * `CONTROL+` pointed at `BuyerSourcing`'s `Export` descriptor — a member of the
 * tree — and asked "is a known-dead control convicted?". No member is left to
 * point at, so a zero from now on could equally mean *the matcher stopped
 * working*: `EMPTY-INPUT-REPORTS-CLEAN-01` arriving the day the tree is repaired.
 * `CONTROL+` therefore runs `censusOf` over SYNTHETIC source, and the pointer
 * rule below runs it over **the source this repository actually shipped** — see
 * `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01` at that site.
 */
const RESIDUE: ReadonlyArray<{ id: string; ruling: string }> = [];

/**
 * ⚠️ **BLIND SPOT 1 OF 3, AND THE ONLY ONE WITH A MEMBER THE OLD CENSUS NEVER
 * SAW: A CLICK INVITATION THAT IS NOT A CONTROL.**
 *
 * `censusOf` above finds a control by VOCABULARY — `Button`, `button`, `a`, an
 * `on[A-Z]` prop, or an interactive `role`. A `<span>` has none of those, so a
 * `<span className="text-teal-text underline cursor-pointer">` is invisible to it
 * **while looking more clickable than half the buttons in the portal**: teal,
 * underlined, and the cursor changes under the pointer.
 *
 * **The specimen is real and was found by deriving this class rather than by
 * reading the census**: `SupplierRegistration.tsx` rendered the Code of Conduct
 * and the Terms inside a `<Trans>` as exactly that pair of spans, with no
 * handler, no `href` and no document anywhere in the tree to open. A reader is
 * asked to AGREE to two things it implies they can read first.
 *
 * ── THE DISCRIMINATOR, DERIVED FROM THE MEASURED POPULATION ─────────────────
 *
 * `cursor-pointer` alone convicts 39 elements and 22 of them are `<label>`s and
 * `<button>`s that are correctly interactive. What separates the defect is that
 * **nothing anywhere inside or on the element can receive a click**: no `on*`
 * prop, no `href`, no `to`, no `role` on the element itself, AND no descendant
 * carrying one, AND no descendant control tag.
 *
 * ⚠️ **THE DESCENDANT HALF IS LOAD-BEARING AND WITHOUT IT THIS RULE CONVICTS
 * WORKING CODE — MEASURED, NOT FORESEEN (derivation rule 2).** `BuyerSuppliers`'
 * directory row is `<TableRow className="relative cursor-pointer">` with NO
 * handler of its own: its own comment explains that a `<tr onClick>` is
 * invisible to the keyboard and to "open in a new tab", so the row's act is a
 * real stretched anchor in a cell beneath it. The pointer style is on the row
 * because that is where a reader's cursor is. Convicting it would accuse the one
 * row in the tree that got accessibility RIGHT, so the rule reads inside.
 */
const POINTER_TAGS_EXEMPT = new Set<string>(['a', 'button', 'Button', 'input', 'select', 'textarea', 'label', ...PRESSED]);

interface PointerSite {
  readonly file: string;
  readonly line: number;
  readonly tag: string;
}

function pointerCensusOf(file: string, raw: string): PointerSite[] {
  const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = file.split('\\').join('/').replace(/^.*\/src\//, 'src/');
  const out: PointerSite[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText(sf);
      const attrs = n.attributes.properties.filter(ts.isJsxAttribute);
      const nameOf = (a: ts.JsxAttribute): string => a.name.getText(sf);
      const cls = attrs.find((a) => nameOf(a) === 'className');
      const clsText = cls?.initializer ? cls.initializer.getText(sf) : '';
      if (clsText.includes('cursor-pointer') && !POINTER_TAGS_EXEMPT.has(tag)) {
        const ownHandler = attrs.some(
          (a) => /^on[A-Z]/.test(nameOf(a)) || nameOf(a) === 'href' || nameOf(a) === 'to' || nameOf(a) === 'role',
        );
        const parent = n.parent;
        const inner =
          ts.isJsxElement(parent) && parent.openingElement === n
            ? raw.slice(parent.openingElement.getEnd(), parent.closingElement.getStart(sf))
            : '';
        // A descendant that can receive the click. Text-level, deliberately
        // generous: this side of the test must ACQUIT, so a false positive here
        // costs a missed defect while a false negative accuses working code.
        const innerReachable =
          /\bon[A-Z]\w*\s*=/.test(inner) ||
          /\b(?:href|to)\s*=/.test(inner) ||
          /<(?:button|a|input|select|textarea|Button)\b/.test(inner);
        if (!ownHandler && !innerReachable) {
          out.push({ file: rel, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, tag });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const DEAD_POINTERS = FILES.flatMap((f) => pointerCensusOf(f, readFileSync(f, 'utf8')));

/**
 * ⚠️ **THE DEFECT THIS REPOSITORY ACTUALLY SHIPPED, QUOTED SO THE RULE CAN BE
 * FIRED AT IT — `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`.**
 *
 * A synthetic subject agrees with its matcher by construction: the seat that
 * aimed the rule also built the target, so a synthetic probe can only show that
 * the matcher RUNS, never that it is aimed at the right thing. This is
 * `SupplierRegistration.tsx`'s agreements block as it stood at `81c9840`, the
 * commit this branch was cut from — the geometry the tree really occupied, and
 * the one thing in this file that was aimed by something other than this seat.
 *
 * It is captured today because today is the only cheap day to capture it. After
 * this batch it survives nowhere but here.
 */
const SHIPPED_DEFECT_81C9840 = `
      <FormSection eyebrow={t('a.eyebrow')} title={t('a.title')}>
        <label className="flex items-start gap-3 cursor-pointer mb-2">
          <input type="checkbox" checked={form.agreed1} onChange={(e) => setForm(e)} className="mt-1 accent-teal" />
          <span className="text-sm text-text-secondary">
            <Trans
              i18nKey="registration.review.agreement1.text"
              components={{
                coc: <span className="text-teal-text underline cursor-pointer" />,
                terms: <span className="text-teal-text underline cursor-pointer" />,
              }}
            />
          </span>
        </label>
      </FormSection>
`;

/** A handler-less `Button`, and beside it one that acts. Both synthetic. */
const SYNTHETIC_CONTROLS = `
const Synthetic = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="secondary">{t('synthetic.dead')}</Button>
      <Button variant="outline" onClick={() => setOpen(!open)}>{t('synthetic.live')}</Button>
    </div>
  );
};
`;

describe('DEAD-AFFORDANCE-01 — the census, at zero', () => {
  // ── anti-vacuity: this suite must be looking at the real tree ────────────
  it('the population is the real one, not an empty or truncated read', () => {
    expect(FILES.length).toBeGreaterThan(100);
    expect(ALL.length).toBeGreaterThan(400);
    expect(ALL.filter((s) => s.cls === 'LIVE').length).toBeGreaterThan(300);
  });

  // ── BILATERAL CONTROLS on the instrument, both directions, same run ──────
  it('CONTROL+ a known-DEAD control is FOUND and convicted — over SYNTHETIC source', () => {
    // ⚠️ **THIS CONTROL IS SYNTHETIC BECAUSE THE TREE NO LONGER HAS A SUBJECT,
    //    AND THAT IS A LOSS THAT HAS TO BE STATED RATHER THAN PAPERED OVER.** It
    //    named `sourcing.action.export` while that descriptor was dead; H3 gave it
    //    an honest notice, so pointing at it now would assert the opposite of the
    //    truth. A control whose subject was FIXED proves nothing, exactly as one
    //    whose subject was DELETED proves nothing — the note that stood here
    //    already said "re-point it rather than delete it", and there is nowhere
    //    left in `src/` to re-point it TO. So the subject is constructed, and the
    //    limit is named: this shows the matcher RUNS and convicts the shape. It
    //    cannot show the matcher is aimed at the right thing. The pointer rule
    //    below carries that half, fired at source this repository really shipped.
    const sites = censusOf('C:/synthetic/src/Synthetic.tsx', SYNTHETIC_CONTROLS);
    const dead = sites.filter((s) => s.cls === 'DEAD');
    expect(dead.map((s) => s.key), 'the handler-less Button must be convicted').toEqual([
      'synthetic.dead',
    ]);
    const live = sites.find((s) => s.key === 'synthetic.live');
    expect(live?.cls, 'and the one beside it, which acts, must not be').toBe('LIVE');
  });

  it('CONTROL- a known-LIVE control is FOUND and ACQUITTED', () => {
    // The award button this page's whole lane turns on. Convicting it would be
    // the false accusation that matters most here. Its key is the FIRST `t()` in
    // its children, which is the pending label — the button reads
    // `{isPending ? t('…submitting') : t('…submit')}` — so the key is stated as
    // the census derives it rather than as a reader would guess it.
    const live = ALL.find(
      (s) => s.file === 'src/pages-v2/BuyerSourcing.tsx' && s.key === 'sourcing.award.submitting',
    );
    expect(live, 'the live Award control must be IN the population').toBeDefined();
    expect(live!.cls, 'and it must be acquitted, not convicted').toBe('LIVE');
  });

  it('CONTROL+ a control that became a pressed component is still IN the population', () => {
    // UI-1c-3 turned 98 hand-written `<button>`s into `LinkButton`, `IconButton`,
    // `ToggleChip`, `RowButton` and `CardButton`. A census keyed on the tag would
    // have dropped every one of them on that day and stayed green. So: each
    // pressed component is found somewhere in `src/`, and a NAMED converted
    // control — the contract wizard's review "Edit" — is found, judged and live.
    const tags = new Set(ALL.map((s) => s.tag));
    for (const tag of PRESSED) expect(tags, `${tag} must be in the census`).toContain(tag);
    const edit = ALL.find(
      (s) => s.file === 'src/pages-v2/BuyerContracts.tsx' && s.tag === 'LinkButton' && s.key === 'contracts.wizard.review.edit',
    );
    expect(edit, 'the converted Edit control must be IN the population').toBeDefined();
    expect(edit!.cls, 'and it must be judged, not skipped').not.toBe('SPREAD');
    // a pressed component with no handler is convicted, as a `Button` with none is
    const dead = censusOf(
      'C:/synthetic/src/SyntheticPressed.tsx',
      "export const X = () => { const { t } = useTranslation(); return <LinkButton>{t('synthetic.pressed.dead')}</LinkButton>; };",
    ).filter((s) => s.cls === 'DEAD');
    expect(dead.map((s) => s.key)).toEqual(['synthetic.pressed.dead']);
  });

  it('CONTROL= components that are never interactive are not swept in', () => {
    // ⚠️ `KpiCard` and `TableCell` are deliberately NOT in this list, and the
    // reason is a correction to this control rather than to the population: both
    // carry a real `onClick` at ten sites in this tree (KPI tiles that filter
    // the table beneath them, a cell that stops row-click propagation). They are
    // interactive and belong. A control that demanded their absence would be
    // asserting that working code is invisible — rule 2, in a guard's own
    // anti-vacuity check.
    const noise = ALL.filter((s) => /^(Data|StatusPill|Timeline|ScoreBadge|LivenessPill)$/.test(s.tag));
    expect(noise.map((n) => `${n.file}:${n.line}`)).toEqual([]);
  });

  it('CONTROL= the exclusions actually excluded something, so none is a dead rule', () => {
    // A rule that never fires is indistinguishable from a rule that is wrong.
    expect(ALL.some((s) => s.cls === 'SPREAD'), '`Button.tsx`\'s `{...rest}`').toBe(true);
    expect(ALL.some((s) => s.tag === 'a' && s.cls === 'LIVE'), 'an <a href> that navigates').toBe(true);
  });

  it('member keys are UNIQUE per file — a collision would silently merge members', () => {
    const seen = new Map<string, number>();
    for (const s of ALL) seen.set(idOf(s), (seen.get(idOf(s)) ?? 0) + 1);
    const dupes = DEAD.filter((s) => (seen.get(idOf(s)) ?? 0) > 1).map(idOf);
    expect([...new Set(dupes)]).toEqual([]);
  });

  // ── THE FLOOR IS ZERO ───────────────────────────────────────────────────
  it('⚠️ NO dead control anywhere in src/ — zero is the floor, not a target', () => {
    expect(
      DEAD.map((s) => `${idOf(s)}  (${s.file}:${s.line})`),
      'A control with no handler was added, or one stopped being live. There is no residue list to ' +
        'name it in any more: wire it, give it an honest response in the shape the tree already uses ' +
        '(an `info` toast whose copy admits nothing happened, in BOTH locales), or remove it.',
    ).toEqual([]);
  });

  it('⚠️ and the residue list stays deleted — an empty list is the door, not the lock', () => {
    // If a seat re-introduces `RESIDUE` with a row in it, the assertion above
    // would still be the thing that has to be satisfied — but this makes the
    // attempt itself red, so the diff cannot read as "adding a known defect the
    // way this file has always allowed". It never allowed it at zero.
    expect(RESIDUE).toEqual([]);
  });

  // ── BLIND SPOT 1 · the click invitation that is not a control ────────────
  it('⚠️ NO dead pointer — a link-styled element that nothing can click', () => {
    expect(
      DEAD_POINTERS.map((p) => `${p.file}:${p.line} <${p.tag}>`),
      'This element changes the cursor to a pointer and neither it nor anything inside it can ' +
        'receive a click. Either give it the act it promises, or take the pointer styling off.',
    ).toEqual([]);
  });

  it('CONTROL+ the pointer rule convicts the source THIS REPOSITORY SHIPPED at 81c9840', () => {
    // ⚠️ `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`. Not a synthetic subject: the
    //    agreements block of `SupplierRegistration.tsx` as it stood on `main` when
    //    this branch was cut. TWO spans, both convicted, and the `<label>` and
    //    `<input>` around them — which are correctly interactive — acquitted in the
    //    same run, so this is bilateral inside one probe.
    const hits = pointerCensusOf('C:/history/src/SupplierRegistration.tsx', SHIPPED_DEFECT_81C9840);
    expect(hits.map((h) => h.tag), 'both Code-of-Conduct / Terms spans must be convicted').toEqual([
      'span',
      'span',
    ]);
  });

  it('CONTROL- the pointer rule ACQUITS the row whose act is a stretched anchor', () => {
    // ⚠️ THE FALSE ACCUSATION THIS RULE IS MOST LIKELY TO MAKE, asserted against
    //    rather than described. `BuyerSuppliers`' directory row carries
    //    `cursor-pointer` and NO handler; its act is a real `<a>` inside a cell,
    //    which is the accessible shape and the one this tree deliberately moved to.
    const row = `
      <TableRow key={s.id} className="relative cursor-pointer">
        <TableCell>
          <RecordRowLink to={'/buyer/suppliers/' + s.id} label={s.name} />
        </TableCell>
      </TableRow>
    `;
    expect(pointerCensusOf('C:/synthetic/src/Row.tsx', row)).toEqual([]);
    // and the same row with its anchor removed IS convicted, so the acquittal
    // above is the descendant rule firing and not the whole probe being inert.
    const bare = `
      <TableRow key={s.id} className="relative cursor-pointer">
        <TableCell>{s.name}</TableCell>
      </TableRow>
    `;
    expect(pointerCensusOf('C:/synthetic/src/Row.tsx', bare).map((p) => p.tag)).toEqual(['TableRow']);
  });

  // ── BLIND SPOT 2 · the descriptor with an OPTIONAL handler ───────────────
  it('⚠️ `BulkActionsBar` descriptors REQUIRE a handler — the type is the gate', () => {
    // ⚠️ **THIS IS §103h's STRUCTURAL FIX AND IT IS NOT ASSERTED HERE BECAUSE A
    //    TEST IS THE RIGHT PLACE FOR IT — IT IS ASSERTED BECAUSE THE TYPE CAN BE
    //    QUIETLY UNDONE.** Thirteen of the 29 dead controls in this file's history
    //    were `{ label, icon }` descriptors: `onClick?: () => void` type-checked
    //    them perfectly, and every page header in the portal is built from this
    //    one component. `onClick` is now REQUIRED, so a handler-less descriptor is
    //    a `tsc` failure at the call site — earlier, closer to the defect, and
    //    impossible to forget. Restoring the `?` would make thirteen holes
    //    reappear with no test going red anywhere, which is what this reads for.
    // ⚠️ READ THROUGH `codeOnly`, AND THE FIRST DRAFT DID NOT — it went red on
    //    its first run against the comment in `BulkActionsBar.tsx` that QUOTES the
    //    retired `onClick?: () => void` in order to explain why it is retired. An
    //    instrument that convicts a file for DOCUMENTING the defect it fixed is
    //    reading prose as code, which is the one thing the stripper at the top of
    //    this file exists to prevent — and it fired here, in a probe written by the
    //    same batch that wrote the comment.
    const src = codeOnly(
      readFileSync(join(SRC, 'components', 'ui-v2', 'BulkActionsBar.tsx'), 'utf8'),
    );
    expect(/\bonClick\?\s*:/.test(src), 'onClick must not be optional on either descriptor').toBe(
      false,
    );
    expect(
      (src.match(/\bonClick:\s*\(\)\s*=>\s*void/g) ?? []).length,
      'both `BulkAction` and `PrimaryAction` must require it',
    ).toBe(2);
  });

  // ── BLIND SPOT 3 · the control behind a spread, recorded and never judged ─
  it('⚠️ the SPREAD exemption is pinned to a named set, so a new one cannot hide in it', () => {
    // A control with `{...rest}` is recorded and judged NOWHERE, because the
    // spread may carry the handler — `Button.tsx`'s own `{...rest}` is the
    // specimen and convicting it would accuse the primitive every live button in
    // the portal is built from. That reasoning is sound for `Button` and is NOT a
    // licence: any other component that starts spreading props would join the
    // unjudged set in silence. Pinned, it joins this assertion instead.
    //
    // UI-1b · `DataTable` joins it BY NAME, for the same reason as `Button`: its
    // row takes `rowProps` — the test id, the aria state and the tone the page
    // hands it — and the row's click is `onRowClick`, wired in the component.
    //
    // UI-1c-3 · the pressed components join it BY NAME, and for `Button`'s reason:
    // `LinkButton`, `IconButton`, `ToggleChip`, `RowButton` and `CardButton` are
    // what a page's `<button>` became, and the page's `onClick` arrives in the
    // spread. A page that writes one of them with no handler is judged at the
    // page, as a `<Button>` with none is.
    expect([...new Set(ALL.filter((s) => s.cls === 'SPREAD').map((s) => s.file))].sort()).toEqual([
      'src/components/ui-v2/Actions.tsx',
      'src/components/ui-v2/Button.tsx',
      'src/components/ui-v2/Card.tsx',
      'src/components/ui-v2/DataTable.tsx',
    ]);
  });

  // ── THE H3 REMOVALS, BY KEY ─────────────────────────────────────────────
  it('⚠️ the controls H3 REMOVED are absent from the census, not merely acquitted', () => {
    // A removal and a fix are different outcomes and this file should be able to
    // tell them apart. These nine were judged GONE — decoration, a duplicate of
    // the surface they sat on, or a promise no plan in this repository makes —
    // so their KEYS must not appear anywhere in the population. If one comes
    // back, it comes back as a diff against this list.
    const removed = [
      'src/components/layout-v2/TopBarV2.tsx::topbar.toggleNav',
      'src/components/layout-v2/TopBarV2.tsx::topbar.notifications',
      'src/pages-v2/Marketplace.tsx::marketplace.rfq.viewAll',
      'src/pages-v2/BuyerOrders.tsx::buyerOrders.footer.viewFullDetails',
      'src/pages-v2/BuyerSupplierProfile.tsx::buyerSupplierProfile.comm.reset',
      'src/pages-v2/BuyerSupplierProfile.tsx::buyerSupplierProfile.comm.save',
      'src/pages/auth/Login.tsx::text:Forgot password?',
      'src/pages-v2/SupplierWhatsApp.tsx::text:Unsubscribe',
    ];
    const present = new Set(ALL.map(idOf));
    expect(removed.filter((r) => present.has(r))).toEqual([]);
    // The polymorphic footer label lookup went with the button it labelled.
    // ⚠️ **SCOPED TO `BuyerOrders`, AND THE FIRST DRAFT WAS NOT** — it accused
    //    `BuyerInvoices`, which carries its OWN `FOOTER_ACTION_KEY` behind a LIVE
    //    control (`dyn:commitAction?commitAction.labelKey:FOOTER_ACTION_KEY[…]`,
    //    classified LIVE at `BuyerInvoices.tsx:1131`). Two pages happened to name a
    //    constant the same thing, and a tree-wide `includes` read that as the
    //    deleted one coming back. Derivation rule 2, inside the assertion written
    //    to record a deletion.
    expect(
      ALL.filter(
        (s) => s.file === 'src/pages-v2/BuyerOrders.tsx' && s.key.includes('FOOTER_ACTION_KEY'),
      ),
    ).toEqual([]);
    expect(ALL.some((s) => s.key.includes('FOOTER_LABEL'))).toBe(false);
  });

  it('⚠️ the controls H3 made HONEST are TOAST_ONLY, not DEAD and not silently LIVE', () => {
    // Twenty controls kept their place on the surface and gained a notice that
    // admits nothing happened. `TOAST_ONLY` is the class that says so: the
    // control is no longer silent, and whether its COPY is honest is
    // `toastHonesty.guard`'s question in both locales, not this file's.
    const honest = [
      'src/pages-v2/BuyerSourcing.tsx::sourcing.action.export',
      'src/pages-v2/BuyerSourcing.tsx::sourcing.action.templates',
      'src/pages-v2/BuyerContracts.tsx::contracts.action.export',
      'src/pages-v2/BuyerContracts.tsx::contracts.action.templates',
      'src/pages-v2/BuyerOrders.tsx::buyerOrders.action.export',
      'src/pages-v2/BuyerOrders.tsx::buyerOrders.action.bulkDownload',
      'src/pages-v2/BuyerOrders.tsx::buyerOrders.action.newPo',
      'src/pages-v2/BuyerRequisitions.tsx::requisitions.action.export',
      'src/pages-v2/BuyerRequisitions.tsx::requisitions.action.bulkDownload',
      'src/pages-v2/BuyerSuppliers.tsx::buyerSuppliers.actions.bulkUpload',
      'src/pages-v2/BuyerSuppliers.tsx::buyerSuppliers.actions.bulkDownload',
      'src/pages-v2/BuyerSuppliers.tsx::buyerSuppliers.actions.export',
      'src/pages-v2/BuyerSuppliers.tsx::buyerSuppliers.actions.invite',
      'src/pages-v2/BuyerSupplierProfile.tsx::buyerSupplierProfile.actions.message',
      'src/pages-v2/BuyerSupplierProfile.tsx::buyerSupplierProfile.actions.createRfq',
      'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.header.connect',
      'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.header.requestRfq',
      'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.catalog.requestQuote',
      'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.contact.saveDraft',
      'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.contact.send',
    ];
    const byId = new Map(ALL.map((s) => [idOf(s), s.cls]));
    expect(honest.filter((h) => byId.get(h) !== 'TOAST_ONLY').map((h) => `${h} -> ${byId.get(h)}`)).toEqual(
      [],
    );
  });

  it('`Export comparison` is still classified TOAST_ONLY, not DEAD', () => {
    const s = ALL.find(
      (x) => x.file === 'src/pages-v2/BuyerSourcing.tsx' && x.key === 'sourcing.panel.exportComparison',
    );
    expect(s, 'the control must still exist').toBeDefined();
    expect(s!.cls).toBe('TOAST_ONLY');
  });
});

// ═══ PIN REACH ═════════════════════════════════════════════════════════════
// Stated in the convention `docs/contracts/*` use, and for the same reason: a
// reader who assumes this guard covers a claim it does not reach is the failure
// the block is built against.
//
// **GUARDED — these assertions and nothing else:** the DEAD set is EMPTY and the
// residue list stays deleted; no element invites a click that nothing can
// receive; `BulkActionsBar`'s two descriptors REQUIRE a handler; the SPREAD
// exemption is pinned to `Button.tsx`; the nine H3 removals are absent by key
// and the twenty H3 notices are `TOAST_ONLY` by key; keys are unique per file;
// the instrument convicts a synthetic dead control, convicts the source this
// repository shipped at `81c9840`, acquits a known-live control and acquits the
// stretched-anchor row; the exclusions each fire at least once; the population
// is non-empty.
//
// ⚠️ **NOT GUARDED — and this half is why the block exists, because a list of
// guarded things reads as completeness.**
//   · **PROP-THREADED HANDLERS** (37 sites today). A handler arriving as a prop
//     (`onEdit`, `onPin`) is classified `PROP_THREADED` and judged NOWHERE. It is
//     resolved only at the CALL SITE, which is itself in the population — so the
//     act is covered, but the inner rendering is not, and a component whose prop
//     is never supplied would be invisible here. **This is the largest unjudged
//     class left and it is NOT closed by H3**; closing it means following an
//     import, which this file deliberately does not do.
//   · **UNRESOLVED HANDLERS** (35 sites today). A body whose whole act is a call
//     this file cannot see — a ref method, an imported helper — is recorded and
//     judged nowhere, because "I could not see it" is not "it is not there".
//   · **CONTROLS RENDERED FROM RUNTIME DATA.** A control whose existence or
//     handler comes from fetched data, a config object built at runtime, or a
//     `.map()` over a service response is not visible to an AST. This file reads
//     source text and follows calls three levels deep inside ONE file; it
//     follows no import.
//   · **WHETHER A `TOAST_ONLY` CONTROL IS HONEST.** That is
//     `toastHonesty.guard.test.tsx`'s question, in both locales, and it is NOT
//     re-asked here. This guard only records that such a control is not silent.
//     All twenty H3 notices land in that guard's population, which is where their
//     copy is judged.
//   · **VALUE CLAIMS.** The specimen this block used to name — `TopBarV2`'s bell
//     rendering a hardcoded `3` — is gone, because the control it sat on was
//     removed. The LIMIT is unchanged and is the reason the removal was the right
//     disposal rather than a notice: no rule in this file can see a fabricated
//     COUNT, so the only way to stop that one was to delete it.
//   · **A DISABLED CONTROL WITH A STATED REASON** is not distinguished from a
//     live one: `disabled` is not read at all. A permanently-disabled control
//     with no explanation would pass.
//   · **"THE HANDLER MATCHES THE LABEL."** Same limit `toastHonesty` states: a
//     handler that does something SMALLER or OTHER than its label says is LIVE
//     here. `LABEL-NAMES-THE-WRONG-VERB` is a different instrument.
//   · **A CONTROL BEHIND A SPREAD** is recorded and never judged. `Button.tsx` is
//     the specimen; a NEW one is now caught by the pin above, but it is caught as
//     "somebody else started spreading", not judged on its merits.
//   · **THE POINTER RULE READS `className` AS TEXT.** A `cursor-pointer` arriving
//     from a variable, a `clsx` call this file does not evaluate, or a Tailwind
//     `group-hover` is outside it. Its descendant test is text-level and
//     deliberately GENEROUS: it errs toward acquitting, so its failures are
//     missed defects rather than accusations against working code.
//   · **THIS BLOCK IS PROSE AND IS NOT ITSELF ASSERTED.**
// ═══════════════════════════════════════════════════════════════════════════
