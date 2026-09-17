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
const CONTROL_TAGS = new Set(['Button', 'button', 'a']);
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
 * ⚠️ **THE NAMED RESIDUE. A RATCHET, NOT AN ALLOWLIST.**
 *
 * Every row is a KNOWN DEFECT with the ruling that governs it, or the word
 * `UNRULED` where nothing does. Adding a row is how a new dead control is
 * admitted — deliberately visible in a diff. Removing one is how a fix is
 * recorded, and the fix REDDENS this file until the row goes, which is what
 * stops a row outliving its subject (`C9-STALE-BY-FIX-01`).
 *
 * **NOT IN THIS LIST, because this batch removed them:**
 * `sourcing.panel.exportComparison` (now an honest `info` toast) and the
 * polymorphic footer button that rendered `FOOTER_LABEL` (deleted).
 */
const RESIDUE: ReadonlyArray<{ id: string; ruling: string }> = [
  // — page header `BulkActionsBar` descriptors. §103h names the structural fix:
  //   make `onClick` required, a type change across 16 call sites. Its own arc.
  { id: 'src/pages-v2/BuyerSourcing.tsx::sourcing.action.export', ruling: '§103h' },
  { id: 'src/pages-v2/BuyerSourcing.tsx::sourcing.action.templates', ruling: '§103h' },
  { id: 'src/pages-v2/BuyerContracts.tsx::contracts.action.export', ruling: '§103h (same shape)' },
  { id: 'src/pages-v2/BuyerContracts.tsx::contracts.action.templates', ruling: '§103h (same shape)' },
  { id: 'src/pages-v2/BuyerOrders.tsx::buyerOrders.action.export', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerOrders.tsx::buyerOrders.action.bulkDownload', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerOrders.tsx::buyerOrders.action.newPo', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerRequisitions.tsx::requisitions.action.export', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerRequisitions.tsx::requisitions.action.bulkDownload', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerSuppliers.tsx::buyerSuppliers.actions.bulkUpload', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerSuppliers.tsx::buyerSuppliers.actions.bulkDownload', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerSuppliers.tsx::buyerSuppliers.actions.export', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerSuppliers.tsx::buyerSuppliers.actions.invite', ruling: 'UNRULED' },

  // — `BuyerOrders`' side-panel footer: the SAME SHAPE as the button this batch
  //   removed from `BuyerSourcing` — a per-status label lookup with no handler.
  { id: 'src/pages-v2/BuyerOrders.tsx::buyerOrders.footer.viewFullDetails', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerOrders.tsx::dyn:FOOTER_ACTION_KEY[selectedPO.status]', ruling: 'UNRULED' },

  // — the four filed at `findings.md:6286` when the class was opened.
  { id: 'src/pages-v2/BuyerSupplierProfile.tsx::buyerSupplierProfile.actions.message', ruling: 'DEAD-AFFORDANCE-01 (findings §6286)' },
  { id: 'src/pages-v2/BuyerSupplierProfile.tsx::buyerSupplierProfile.actions.createRfq', ruling: 'DEAD-AFFORDANCE-01 (findings §6286)' },
  { id: 'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.header.connect', ruling: 'DEAD-AFFORDANCE-01 (findings §6286)' },
  { id: 'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.header.requestRfq', ruling: 'DEAD-AFFORDANCE-01 (findings §6286)' },

  { id: 'src/pages-v2/BuyerSupplierProfile.tsx::buyerSupplierProfile.comm.reset', ruling: 'UNRULED' },
  { id: 'src/pages-v2/BuyerSupplierProfile.tsx::buyerSupplierProfile.comm.save', ruling: 'UNRULED' },
  { id: 'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.catalog.requestQuote', ruling: 'UNRULED' },
  { id: 'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.contact.saveDraft', ruling: 'UNRULED' },
  { id: 'src/pages-v2/SupplierStorefront.tsx::supplierStorefront.contact.send', ruling: 'UNRULED' },
  { id: 'src/pages-v2/Marketplace.tsx::marketplace.rfq.viewAll', ruling: 'UNRULED' },

  // — app chrome, on EVERY route in the portal. The bell additionally renders a
  //   hardcoded "3": a VALUE claim, which this guard does not judge (see reach).
  { id: 'src/components/layout-v2/TopBarV2.tsx::topbar.toggleNav', ruling: 'UNRULED' },
  { id: 'src/components/layout-v2/TopBarV2.tsx::topbar.notifications', ruling: 'UNRULED' },

  // — inside the rendered WhatsApp message mock, not a portal control.
  { id: 'src/pages-v2/SupplierWhatsApp.tsx::text:Unsubscribe', ruling: 'UNRULED (messenger-chrome mock)' },

  // — ⚠️ THE ONLY MEMBER IN THE TREE THAT IS DEAD BY AN EXPLICIT `() => {}`
  //   RATHER THAN BY A MISSING HANDLER, and the only one outside `pages-v2`
  //   and `components/`. A hand census scoped to the v2 pages does not see it;
  //   this guard walks all of `src/`, which is how it surfaced.
  { id: 'src/pages/auth/Login.tsx::text:Forgot password?', ruling: 'UNRULED' },
];

describe('DEAD-AFFORDANCE-01 — the census, ratcheted', () => {
  // ── anti-vacuity: this suite must be looking at the real tree ────────────
  it('the population is the real one, not an empty or truncated read', () => {
    expect(FILES.length).toBeGreaterThan(100);
    expect(ALL.length).toBeGreaterThan(400);
    expect(ALL.filter((s) => s.cls === 'LIVE').length).toBeGreaterThan(300);
  });

  // ── BILATERAL CONTROLS on the instrument, both directions, same run ──────
  it('CONTROL+ a known-DEAD control is FOUND and convicted', () => {
    // ⚠️ **RE-POINTED, AND THE REASON TRAVELS WITH IT.** This control named
    //    `sourcing.award.rejectAll` until the operator ruled the bulk reject OUT:
    //    a buyer reviews and rejects quotations ONE BY ONE, each with a stated
    //    justification, so a single control that rejects a whole set is the wrong
    //    affordance to carry — it was removed, not wired and not noticed. A
    //    control whose subject no longer exists proves nothing, so this names
    //    another missing-handler member on the SAME surface. If §103h retires the
    //    `BulkActionsBar` descriptors too, re-point it again rather than delete it.
    const known = DEAD.find((s) => idOf(s) === 'src/pages-v2/BuyerSourcing.tsx::sourcing.action.export');
    expect(known, '`Export` has no onClick (§103h) and must be convicted').toBeDefined();
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

  // ── THE RATCHET, BOTH DIRECTIONS ────────────────────────────────────────
  it('⚠️ NO UNNAMED dead control — a NEW one is red until it is named here', () => {
    const named = new Set(RESIDUE.map((r) => r.id));
    const unnamed = DEAD.filter((s) => !named.has(idOf(s))).map((s) => `${idOf(s)}  (${s.file}:${s.line})`);
    expect(
      unnamed,
      'A control with no handler was added, or one stopped being live. Wire it, give it an honest ' +
        'response, remove it — or add it to RESIDUE with its ruling.',
    ).toEqual([]);
  });

  it('⚠️ NO STALE residue row — a FIXED control is red until its row is removed', () => {
    const dead = new Set(DEAD.map(idOf));
    const stale = RESIDUE.filter((r) => !dead.has(r.id)).map((r) => r.id);
    expect(
      stale,
      'These are named as dead and are not. If they were fixed, delete the rows: a residue row that ' +
        'outlives its subject is the `C9-STALE-BY-FIX-01` failure this list exists to avoid.',
    ).toEqual([]);
  });

  it('every residue row states a ruling or says UNRULED — never a bare exemption', () => {
    const blank = RESIDUE.filter((r) => !r.ruling || !r.ruling.trim()).map((r) => r.id);
    expect(blank).toEqual([]);
  });

  it('⚠️ this batch\'s two controls are NOT in the residue — they were fixed, not named', () => {
    const ids = new Set(RESIDUE.map((r) => r.id));
    expect(ids.has('src/pages-v2/BuyerSourcing.tsx::sourcing.panel.exportComparison')).toBe(false);
    expect([...ids].some((i) => i.includes('FOOTER_LABEL'))).toBe(false);
    // and the removed button's key can no longer appear anywhere in the census
    expect(ALL.some((s) => s.key.includes('FOOTER_LABEL'))).toBe(false);
  });

  it('`Export comparison` is now classified TOAST_ONLY, not DEAD', () => {
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
// **GUARDED — these assertions and nothing else:** the DEAD set equals RESIDUE
// in both directions; every row carries a ruling; keys are unique per file; the
// instrument finds a known dead control and acquits a known live one; the
// exclusions each fire at least once; the population is non-empty.
//
// ⚠️ **NOT GUARDED — and this half is why the block exists, because a list of
// guarded things reads as completeness.**
//   · **PROP-THREADED HANDLERS.** A handler arriving as a prop (`onEdit`,
//     `onPin`) is classified `PROP_THREADED` and judged NOWHERE. It is resolved
//     only at the CALL SITE, which is itself in the population — so the act is
//     covered, but the inner rendering is not, and a component whose prop is
//     never supplied would be invisible here.
//   · **CONTROLS RENDERED FROM RUNTIME DATA.** A control whose existence or
//     handler comes from fetched data, a config object built at runtime, or a
//     `.map()` over a service response is not visible to an AST. This file reads
//     source text and follows calls three levels deep inside ONE file; it
//     follows no import.
//   · **WHETHER A `TOAST_ONLY` CONTROL IS HONEST.** That is
//     `toastHonesty.guard.test.tsx`'s question, in both locales, and it is NOT
//     re-asked here. This guard only records that such a control is not silent.
//   · **VALUE CLAIMS.** `TopBarV2`'s bell renders a hardcoded `3`. The BUTTON is
//     convicted here; the fabricated COUNT beside it is a data claim and no rule
//     in this file can see it. It is the more misleading of the two.
//   · **A DISABLED CONTROL WITH A STATED REASON** is not distinguished from a
//     live one: `disabled` is not read at all. A permanently-disabled control
//     with no explanation would pass.
//   · **"THE HANDLER MATCHES THE LABEL."** Same limit `toastHonesty` states: a
//     handler that does something SMALLER or OTHER than its label says is LIVE
//     here. `LABEL-NAMES-THE-WRONG-VERB` is a different instrument.
//   · **A CONTROL BEHIND A SPREAD** is recorded and never judged. `Button.tsx`
//     is the specimen; any future `{...props}` control joins it silently.
//   · **THIS BLOCK IS PROSE AND IS NOT ITSELF ASSERTED.**
// ═══════════════════════════════════════════════════════════════════════════
