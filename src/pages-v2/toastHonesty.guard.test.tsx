// ─────────────────────────────────────────────────────────────────────────────
// R1 · THE UNBACKED-TOAST HONESTY GUARD — the class, gated.
//
// ⚠️ **THE CLASS THIS EXISTS FOR: THE PAGES DISCLAIM THEIR DATA AND ASSERT THEIR
// ACTS.** `BuyerRisk` says EVERY FIGURE IS ILLUSTRATIVE, then offers an "Export
// Report" that produces a toast. Every honest-marking arc this portal has run
// covered DATA — D-CENSUS-8 marked what a page SAYS. NOTHING marked what a page
// CLAIMS TO HAVE DONE, and a claim about an act is the one a user acts on.
//
// ── THE RULE, AND IT IS BILATERAL BY CONSTRUCTION ──────────────────────────
//   IF an affordance's handler performs NO REAL ACT, its toast MUST ADMIT that.
//
//   Both halves derive; neither is a list:
//     · THE POPULATION derives from the page sources — every `toast(` whose
//       BRANCH contains none of the call shapes in `PERFORMS_REAL_ACT`. Add an
//       unbacked affordance tomorrow and it is IN, without anybody editing this
//       file (`CENSUS-MUST-DERIVE-01`).
//     · THE VERDICT derives from the SHIPPED i18n bundle (`resources`), not from
//       a regex over the fragment files — the guard judges the string a user
//       actually sees, in BOTH locales.
//
//   ⚠️ **THERE IS NO EXEMPTION LIST, DELIBERATELY.** An exemption list is the
//   thing that rots (`C9-STALE-BY-FIX-01`): wire the affordance and the row
//   outlives its subject. Here, wiring an affordance removes it from the
//   population automatically, because the branch then contains a real act.
//   The only way to pass is to be honest or to be real.
//
// ── THE UNIT WAS THE HANDLER BODY, AND THAT IS HOW #352's DEFECT ESCAPED ────
//
// ⚠️ **A CLAIM IS MADE BY A BRANCH. UNTIL THIS CHANGE THE ACQUITTAL WAS DECIDED
// BY THE WHOLE HANDLER BODY, SO ONE REAL ACT IN ONE BRANCH ACQUITTED EVERY OTHER
// BRANCH IN THE SAME HANDLER.** The sentence that stood here said the population
// was every toast "whose affordance handler's OWN BODY TEXT" lacked a real act,
// and the mismatch between the unit that ACTS and the unit that CLAIMS is the
// whole defect.
//
// **MEASURED ON THE TREE, NOT ARGUED.** `BuyerInvoices.handleFooterAction` is a
// chain of `if (…) { …; return; }` clauses. Two of them perform real acts
// (`setPanelMode('confirming')`, `setPanelMode('remittance')`); two only fire a
// toast. Under the body unit the two setters acquitted the whole handler, so the
// `Overdue` clause announced *"{{invoiceNumber}} escalated / Routed to Finance
// Controller for urgent action"* — a claim about an act that does not occur —
// **with this guard green the entire time.** It was found by hand and fixed at
// #352; nothing here could have found it, and that is what this unit changes.
//
// ── WHAT A BRANCH IS, DERIVED BY PROPERTY RATHER THAN LISTED ────────────────
//
// **A BRANCH IS THE CODE THAT CO-EXECUTES WITH THE TOAST: the handler body with
// (a) every CONDITIONALLY-EXECUTED REGION that does not contain the toast
// blanked, and (b) everything after the toast's own path terminates blanked.**
//
// A conditionally-executed region is any region whose execution is NOT implied
// by reaching the statement enclosing it. That property — not a list of
// keywords — is what `conditionalRegions` below enumerates, so a construct this
// tree does not use today is handled on the day it appears:
//   · `if` — the then-branch and the else-branch, each separately
//   · `switch` — each `case` / `default` clause's statements
//   · `try` / `catch` — the CATCH block (the try block is entered
//     unconditionally, so it is NOT a region; blanking it would accuse a
//     handler of nothing more than having error handling)
//   · a ternary's two arms
//   · the right-hand side of `&&`, `||`, `??`
//   · a `for` / `for…of` / `for…in` / `while` body (may run zero times)
// **Half (b) is not optional and is the half the defect needed.** The shape is
// `if (a) { toast({…}); return; } … dispatch(…)`: the dispatch is not inside any
// conditional region, so (a) alone keeps it, and a clause that returns would go
// on being acquitted by code it can never reach. Derived today across
// `src/pages-v2/*.tsx`: the constructs that actually enclose a `toast(` are
// `if`, `try` and `catch` — the rest are carried because the rule is a property.
//
// **THE CLAIM IS SCOPED TO THE SAME UNIT, AND THAT CLOSED A SECOND LEAK OF THE
// SAME DEFECT.** Keys and literals used to be collected from the whole body too,
// so a sibling branch whose copy DID admit satisfied `claims.some(admits)` for a
// branch whose copy did not. One unit now decides both.
//
// ── AND A BRANCH IS ONLY A BRANCH OF THE HANDLER IT IS ACTUALLY INSIDE ─────
//
// ⚠️ **THE DERIVATION ATTRIBUTED A TOAST TO THE LAST `AFFORDANCE` MATCH BEFORE
// IT AND NEVER CHECKED THAT THE TOAST LAY INSIDE THAT HANDLER'S BODY.** So a
// toast in a react-query `onSuccess`, or in a helper this matcher does not name,
// was handed the branch text of whatever affordance happened to be declared
// above it — a different function entirely.
//
// **MEASURED THE DAY THE PRECONDITION LANDED: 11 of 58 members were outside the
// body they were attributed to.** Nine of them read their claims off the wrong
// branch and passed the admission test VACUOUSLY through `claims.length === 0`
// — an `it.each` case per locale that asserted nothing. **The other two were
// fully backed real acts**: `SupplierOrders`' acknowledge-success, fired from
// `acknowledgeMutation.mutate`'s `onSuccess`, and `SupplierRFQs`' quote-submit
// success, fired after `await submitMutation.mutateAsync(…)` resolved. Both say
// so truthfully and both render `variant: 'success'` correctly; a variant rule
// laid over the old population would have CONVICTED them and flipped two
// completed acts to `info`, on the supplier's two primary write paths.
//
// **THE PRECONDITION: `hStart ≤ idx < bodyEnd`, using this file's own
// `balancedEnd`.** The walk goes back to the nearest ENCLOSING handler rather
// than stopping at the nearest PRECEDING one. Derived today, the two agree on
// every site in this tree — and saying so is the point: they stop agreeing the
// first time one affordance handler is nested inside another, and the walk is
// the one that is still right then.
//
// ⚠️ **WHAT IS NOT ATTRIBUTED IS RECORDED, NOT DROPPED — `UNATTRIBUTED` BELOW.**
// A `continue` is invisible; a set that is derived, given a reason per member and
// asserted is not. The reach limit it names is honest (this guard has nothing to
// say about a toast outside every affordance handler body) but the FACT of it is
// not something the guard gets to be quiet about.
//
// ── THE ONE EXCLUSION: THE REFUSAL CLASS, AND IT IS STRUCTURAL ──────────────
//
// **A BRANCH IS A REFUSAL WHEN IT IS A GUARD CLAUSE STANDING IN FRONT OF THE
// HANDLER'S OWN ACT:**
//   1. the toast's branch TERMINATES — a `return` or `throw` is reached from
//      the statement holding the toast; AND
//   2. a real act appears in the handler body AFTER that `if` statement ends;
//      AND
//   3. **the `if` condition and that act READ AT LEAST ONE IDENTIFIER IN
//      COMMON.**
//
// **(3) IS THE WHOLE PROPERTY; (1) AND (2) ONLY ESTABLISH THE SHAPE.** Sharing
// an identifier is what makes the clause a precondition of the act rather than a
// coincidence of ordering: it tests the very input the act consumes, so it fires
// exactly when the act cannot run. Such a toast REPORTS A PRECONDITION — it
// claims no act, and asking it for an ADMISSION asks it the wrong question.
// Derived today: `if (!answer.trim()) { toast(…); return; }` in front of
// `resolveMutation.mutate({ resolutionReason: answer.trim() }, …)`.
//
// ⚠️ **IT IS STRUCTURAL BECAUSE THE COPY-BASED ALTERNATIVE WAS MEASURED AND
// REJECTED, NOT BECAUSE STRUCTURE WAS EASIER.** A DEFERRAL — a branch that
// truthfully says the act happens elsewhere — is NOT excluded by this class and
// cannot be, because `BuyerInvoices`' `Pending Match` clause and the `Overdue`
// clause #352 repaired are **the same branch shape**: same handler, same
// `if (selected.status === …) { toast({variant:'info', …}); return; }`, same
// terminal position after every act the handler performs, neither guarding
// anything. Only their COPY differs, and a copy classifier was measured
// disqualified on both routes:
//   · per locale — Indonesian `di-` marks the PASSIVE VOICE, not completion, so
//     *dapat dibaca* ("can be read") and *diposting* ("is posted") are
//     morphologically identical to *dieskalasi* ("was escalated"). 3 of 3 false
//     convictions.
//   · EN-only — a `-ed` suffix test separates the four subjects correctly and
//     then **silently stops checking 8 members whose EN copy carries no `-ed`
//     word**, every one of them currently honest ("will open in a future
//     release", "nothing was sent to SAP"). Buying 3 exclusions by un-checking 8
//     is this guard's own defect one layer up.
// **So a deferral must earn its pass at the admission test like anything else,
// which is what `invoice.match.deferred` now does.**
//
// ── WHAT THIS GUARD DOES NOT REACH ─────────────────────────────────────────
//   It reads TEXT, in one handler, and follows nothing:
//     · no call is followed. A handler that dispatches THROUGH A HELPER is
//       invisible to the acquittal and lands in the population.
//       **THE RESIDUE IS MEASURED, NOT GUESSED: five members call a local
//       helper** — `SupplierDashboard.dismiss` (×1), `SupplierOrders.
//       openOrderPanel` (×4).
//
//       ⚠️ **AND FOLLOWING THEM WOULD MAKE THIS GUARD WORSE, WHICH IS WHY IT DOES
//       NOT.** Both helpers are PURE STATE SETTERS — `dismiss` calls
//       `setDismissedActions`; `openOrderPanel` calls seven setters and nothing
//       else. A setter already counts as an act, so a one-hop resolver would
//       ACQUIT all five and silently delete five CORRECT members. The reach is
//       one body deep BY RULING, and the claim above now says so rather than
//       implying a dispatch analysis this file does not perform.
//     · the body is bounded at 8000 chars by `balancedEnd`.
//     · a React state setter counts as an act — the under-reach argued on
//       `PERFORMS_REAL_ACT` below.
//
// ── WHY A CLOSED ADMISSION VOCABULARY ──────────────────────────────────────
//   `ADMISSIONS` is a closed set of phrases already shipping in the tree — the
//   register `shipments.toast.reminder` and `carrierAlerted` established. It is
//   NOT free text: a blanket "not implemented" would satisfy a checker while
//   telling a user nothing, which is the failure mode this guard exists to
//   prevent. The honest strings name THE ACT, say it did not happen, and say
//   what is missing.
// ─────────────────────────────────────────────────────────────────────────────
//
// ═══ PIN REACH ═════════════════════════════════════════════════════════════
// Stated in the convention `docs/contracts/*` use for their pins, and for the
// same reason: **a reader who assumes this guard covers a claim it does not
// reach is the failure the block is built against.**
//
// **GUARDED — these assertions, and nothing else:**
//   · the derivation examined something — a non-empty population
//   · the refusal class excluded something — an exclusion that excludes nothing
//     is never exercised, and would read green for the same reason
//   · an unbacked affordance admits it in EN
//   · an unbacked affordance admits it in ID
//   · every user-visible toast string is externalised (no hardcoded copy)
//   · the retired #352 claim admits nothing
//   · the Overdue branch is convicted by the branch unit, acquitted by the body
//     unit, and NOT excluded by the refusal class
//
// ⚠️ **NOT GUARDED — AND THIS HALF IS WHY THE BLOCK EXISTS, BECAUSE A LIST OF
// GUARDED THINGS READS AS COMPLETENESS.**
//   · **"THE SIDE EFFECT MATCHES THE CLAIM."** This guard judges "no side effect
//     at all". A branch that does something SMALLER than it claims is acquitted
//     — `SupplierDashboard`'s briefing card dismissing itself while announcing
//     "workflow initiated" was found by a human at R1, not by this rule.
//   · **AN EXCLUDED REFUSAL IS NOT CHECKED AT ALL — ITS COPY IS UNGUARDED.** A
//     refusal that MISSTATES WHY IT REFUSED ("needs an answer" when what is
//     missing is a supplier id) passes, because the class removes it from the
//     population before any copy is read. The exclusion buys silence about a
//     wrong question; it does not buy a right answer.
//   · **AND THE SAME HOLE TAKES A CLAIM, NOT ONLY A WRONG REASON — MEASURED,
//     NOT FEARED.** A guard clause whose copy asserts the act OCCURRED
//     ("Resolution sent to the supplier.") is excluded and therefore ACQUITTED,
//     because this class reads structure and structure cannot see a lie. It is
//     probed in exactly that direction (P3) and the probe's finding is this
//     bullet. Closing it needs the copy dimension that was measured
//     disqualified above — so it is a STATED REACH LIMIT, not an oversight.
//   · **AN INCIDENTAL SHARED IDENTIFIER EXCLUDES.** Condition (3) counts any
//     identifier, so a method name is enough: `answer.trim()` in the condition
//     and `answer.trim()` in the act share BOTH `answer` and `trim`, and a
//     clause that merely happened to call `.trim()` on something unrelated
//     would be excluded on `trim` alone. The property is deliberately not
//     narrowed to the receiver, because narrowing it is a judgement about which
//     identifier "really" matters and this file has no way to check such a
//     judgement.
//   · **A NON-GUARDING TERMINATING BRANCH IS CHECKED ONLY THROUGH THE ADMISSION
//     TEST.** That is the `:410` / specimen shape — the class does not reach it
//     by design, so the whole verdict rests on `ADMISSIONS`, and a claim phrased
//     outside that closed register passes.
//   · **THE SPECIMEN CONTROL PROVES THE CLASS DOES NOT ACQUIT #352's RETIRED
//     COPY. IT DOES NOT PROVE THE CLASS IS MINIMAL.** Nothing here shows that
//     no narrower class would also have excluded the two refusals.
//   · **DEFERRED EXECUTION IS NOT BRANCHING.** A callback passed to `setTimeout`
//     or `.forEach` is NOT blanked: it is not conditional, it is later, and the
//     act it performs is real. Treating it as a branch would manufacture
//     accusations against working code (derivation rule 2).
//   · **NO CALL IS FOLLOWED** — see the residue measured above.
//   · **A REGION STRADDLING `balancedEnd`'s BOUND IS NOT BLANKED.** The body
//     span is the existing bracket-balanced one, capped at 8000 chars; a
//     conditional region only partly inside it is left intact, which errs toward
//     ACQUITTAL and therefore toward silence, never toward a false accusation.
//   · **COPY COMPUTED OUTSIDE THE BRANCH.** Claims are read from the branch; a
//     description assembled before the handler's first conditional is seen, one
//     assembled in a sibling branch is not — correctly, but a key built by
//     concatenation is invisible to both.
//   · **THIS BLOCK IS PROSE AND IS NOT ITSELF ASSERTED.** The contract pins are
//     self-pinned against their `describe` titles; this one is not, and saying
//     so is the difference between a stated reason and an enforced one.
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { resources } from '../lib/i18n';
import { stripSourceComments } from '../lib/sourceScan/stripComments';

const PAGES_DIR = __dirname;

/**
 * A real act. If a BRANCH does ANY of these, its toast is OUT of this guard's
 * population.
 *
 * ⚠️ **THE LIMIT, STATED: THIS GUARD JUDGES "NO SIDE EFFECT AT ALL", NEVER
 * "THE SIDE EFFECT MATCHES THE CLAIM."** A React state setter counts as a real
 * act here because for a UI affordance it usually IS one — expanding a dock
 * panel, loading parsed XLSX rows into a grid. That is deliberate under-reach:
 * without it the guard accuses a working import of lying, which would train
 * people to weaken it. The residue it cannot see — a handler that does
 * something SMALLER than it claims, like `SupplierDashboard`'s briefing card
 * dismissing itself while announcing "workflow initiated" — is a HUMAN review
 * question, and that one was found and fixed by hand at R1, not by this rule.
 */
/**
 * ⚠️ **COMMENTS ARE BLANKED BEFORE ANYTHING IS READ, AND UNTIL THIS EXISTED A
 * COMMENT COULD REMOVE A MEMBER FROM THE POPULATION.** Every claim below is made
 * about CODE. Two independent mechanisms turned prose into evidence, and the
 * second is the one that actually fired:
 *
 *   1. `PERFORMS_REAL_ACT` ran against raw text, so a comment MENTIONING a call
 *      shape acquitted the handler.
 *   2. `balancedEnd` counts brackets, and **a comment's brackets counted too** —
 *      so `// TODO: dispatch(t_alt_activate)` opened and closed a paren, ended
 *      the body at the comment, and the `body.includes('toast')` guard dropped
 *      the member before the acquittal test was ever reached.
 *
 * **MEASURED, NOT ARGUED, AND THE FIRST FIX WAS WRONG.** Stripping only before
 * the acquittal test left (2) live: adding that one line inside
 * `BuyerRisk.tsx:612`'s `onClick` still moved the population 56 → 55, dropped
 * that member, and **the suite stayed GREEN** (114 → 112 collected). `it.each`
 * had one fewer case, and 112 still clears the floor, so neither this guard nor
 * `scripts/floor.json` could see it. Stripping at READ closes both.
 *
 * ⚠️ **IT IS LENGTH-PRESERVING ON PURPOSE.** A comment becomes the SAME NUMBER
 * of spaces and every newline survives, so byte offsets and LINE NUMBERS are
 * unchanged — `balancedEnd` slices the same span, each member keeps the
 * `file:line` name it is reported under, **and the TypeScript positions used by
 * `coExecutingRegion` index the same characters**, which is what lets an AST
 * parsed over the RAW source address offsets found in the stripped source.
 *
 * ⚠️ **THIRD INSTRUMENT IN THIS TREE TO NEED THIS, FIFTH TO WRITE ITS OWN
 * STRIPPER.** `chaosAmbience.test.ts` states the class exactly — *"a mutant that
 * had DELETED the gate and kept the comment: the assertion was satisfied by prose
 * describing the mechanism rather than by the mechanism"* — and `fixturePresent`,
 * `registrationHonesty`, `contractRaisedElsewhere` and
 * `SupplierCertsExpiringWidget` each carry a private copy. **There is no shared
 * helper and no convention that a code claim is made against stripped source**,
 * which is why each instrument re-learns this by being burned. Filed, not fixed
 * here: unifying them is a sweep and needs a ruling.
 *
 * The block form runs first; the line form is guarded with `(^|[^:])` so it
 * cannot eat the `//` in a `https://` URL — `chaosAmbience`'s refinement, copied
 * rather than re-derived. `SupplierCertsExpiringWidget` records why the
 * line-PREFIX form is wrong: it misses a JSX comment and produces a FALSE
 * ACCUSATION, which is rule 2 in the other direction.
 */
const codeOnly = (s: string): string => stripSourceComments(s, 'blank');

const PERFORMS_REAL_ACT =
  /\b(?:\w*[Mm]utation\.mutate|\w*[Mm]utateAsync|dispatch|navigate|window\.open|createObjectURL|setSearchParams|location\.assign|fetch|set[A-Z]\w*|refetch|invalidateQueries)\s*\(/;

/**
 * The act shapes that are NEVER a self-dismissal. `PERFORMS_REAL_ACT` minus its
 * `set[A-Z]\w*` alternative — `setSearchParams` stays HERE and is matched first,
 * so a URL write is never mistaken for a component's own visibility flag.
 */
const NON_SETTER_ACT =
  /\b(?:\w*[Mm]utation\.mutate|\w*[Mm]utateAsync|dispatch|navigate|window\.open|createObjectURL|setSearchParams|location\.assign|fetch|refetch|invalidateQueries)\s*\(/;

/**
 * ⚠️ **C2 · A SETTER THAT ONLY CLOSES THE THING THE BUTTON IS SITTING IN IS NOT
 * AN ACT, AND UNTIL THIS EXISTED IT ACQUITTED THE ONE BRANCH THAT NEEDED ASKING
 * ABOUT MOST.** `PERFORMS_REAL_ACT` counts any `setX(…)` as a real act, and the
 * header argues for that deliberately: for a UI affordance a state write usually
 * IS the act — expanding a dock panel, loading parsed rows into a grid. The
 * residue it was knowingly buying is a handler that does something SMALLER than
 * it claims.
 *
 * **MEASURED: `SupplierMyStorefront`'s Save button.** Its handler is
 * `setEditProfile(false); toast({ variant: 'success', … })`, and the copy it
 * fires says *"Profile changes not saved — storefront editing is not wired to a
 * real store."* The setter is real, and what it does is **put the editor away**.
 * Nothing is saved; the only state that moved is the flag deciding whether the
 * form the button lives in is on screen at all.
 *
 * **THE PROPERTY, NOT A LIST: a setter is a SELF-DISMISSAL when its state
 * variable gates the very surface that renders the handler.** Both halves are
 * derived from the file:
 *   · the variable must actually BE state — `const [x, setX] = useState(…)`
 *     somewhere in this source. A prop or a local that merely looks like one
 *     does not qualify, which stops the predicate matching on a name alone;
 *   · and walking UP from the handler, some ancestor must SELECT this handler on
 *     a condition that READS `x` — a ternary arm, the right side of `&&` / `||`
 *     / `??`, or an `if`. That is the same "conditionally-executed region"
 *     property `conditionalRegions` uses, asked about rendering instead of about
 *     execution.
 *
 * **THE NARROWING IS ONE-SIDED AND STAYS THAT WAY: a branch is acquitted if ANY
 * of its setters is not a self-dismissal.** A handler that saves a draft AND
 * closes the drawer still performs an act. Only a branch whose ENTIRE act is to
 * hide itself falls through to the admission test.
 *
 * ⚠️ **WHAT IT DOES NOT REACH, STATED SO NOBODY INHERITS A STRONGER CLAIM:** a
 * setter that dismisses a DIFFERENT surface, one routed through a helper (no
 * call is followed here — see the header), and a gate written as a computed
 * value (`const open = mode === 'edit'`) rather than reading the state variable
 * directly. Each of those is acquitted, which is the direction that stays quiet
 * rather than the direction that accuses.
 */
const stateNameOf = (capitalised: string): string =>
  capitalised.charAt(0).toLowerCase() + capitalised.slice(1);

/** Does `name` appear in a condition that decides whether `pos` renders at all? */
function gatesTheSurface(sf: ts.SourceFile, name: string, pos: number): boolean {
  let cur: ts.Node | undefined = nodeAt(sf, pos);
  while (cur) {
    const p: ts.Node | undefined = cur.parent;
    if (p) {
      if (
        ts.isConditionalExpression(p) &&
        cur !== p.condition &&
        identifiersOf(p.condition).has(name)
      )
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
}

/**
 * THE ACQUITTAL. `PERFORMS_REAL_ACT` with the setter alternative narrowed by the
 * self-dismissal property above. `stateVars` is the file's `useState` names.
 */
function branchPerformsRealAct(
  sf: ts.SourceFile,
  branch: string,
  hStart: number,
  stateVars: ReadonlySet<string>,
): boolean {
  if (NON_SETTER_ACT.test(branch)) return true;
  const setters = [...branch.matchAll(/\bset([A-Z]\w*)\s*\(/g)].map((m) => stateNameOf(m[1]));
  if (setters.length === 0) return false;
  return setters.some((n) => !(stateVars.has(n) && gatesTheSurface(sf, n, hStart)));
}

/** Every `const [x, setX] = useState(…)` name declared in this source. */
const stateVarsOf = (src: string): Set<string> =>
  new Set(
    [...src.matchAll(/\bconst\s*\[\s*(\w+)\s*,\s*set[A-Z]\w*\s*\]\s*=\s*useState/g)].map(
      (m) => m[1],
    ),
  );

/** Sites whose branch WAS acquitted — the anti-vacuity control for the narrowing. */
const ACQUITTED: string[] = [];

/**
 * Affordance handlers. `on<Something>` — but NEVER a react-query lifecycle
 * callback: a toast inside `onSuccess` is fired BY a real dispatch and is
 * backed by construction. Treating `onSuccess` as an affordance mis-attributes
 * the body and reports the RFQ-create toast — which is fully wired — as a lie.
 */
const AFFORDANCE = new RegExp(
  [
    // inline JSX/prop handler: onClick={() => …}, onQualify={() => …}
    String.raw`\bon(?!Success|Error|Settled|Mutate)[A-Z][A-Za-z0-9]*\s*[:=]\s*\{?\s*\([^)]*\)\s*=>`,
    // NAMED handler hoisted out of the JSX: `const handleExport = () => …`.
    // Without this the guard has a hole exactly where the biggest pages put
    // their affordances — `BuyerGoodsReceipt.handleExport` sat in it.
    String.raw`\bconst\s+handle[A-Za-z0-9]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>`,
  ].join('|'),
  'g',
);

/**
 * The honest register, EN + ID. Phrases that ADMIT the act did not happen.
 * Closed on purpose — see the header.
 */
const ADMISSIONS: readonly RegExp[] = [
  /not available yet/i,
  /future release/i,
  /coming in (?:Phase|a )/i,
  /\(mock\)/i,
  /\(tiruan\)/i,
  /simulated/i,
  /simulasi/i,
  /nothing was/i,
  /not wired/i,
  /pending live/i,
  /will send once/i,
  /will open/i,
  /no .{1,40} was (?:opened|sent|created|queued)/i,
  /belum tersedia/i,
  /rilis mendatang/i,
  /akan hadir|hadir pada/i,
  /tidak ada/i,
  /belum tersambung/i,
  /menunggu kanal/i,
  /akan dikirim setelah/i,
];

const admits = (s: string) => ADMISSIONS.some((r) => r.test(s));

interface Site {
  readonly file: string;
  readonly line: number;
  readonly keys: readonly string[];
  readonly literals: readonly string[];
  readonly variants: Variants;
}

/** Balance ( { [ from `from`, returning the end index of the expression. */
function balancedEnd(src: string, from: number): number {
  let depth = 0;
  let seen = false;
  for (let i = from; i < Math.min(src.length, from + 8000); i++) {
    const c = src[i];
    if (c === '(' || c === '{' || c === '[') {
      depth++;
      seen = true;
    } else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (seen && depth <= 0) return i + 1;
      if (depth < 0) return i;
    }
  }
  return Math.min(src.length, from + 8000);
}

/**
 * The regions of `n` whose execution is NOT implied by reaching the statement
 * that encloses `n`. This is the BRANCH definition, by property.
 *
 * ⚠️ **`try` IS ABSENT ON PURPOSE AND ITS ABSENCE IS THE LOAD-BEARING PART.** A
 * try block is entered unconditionally; only the CATCH is conditional. Blanking
 * a try block would put every handler that wraps its own dispatch in error
 * handling into the population, which is derivation rule 2 — a widening that
 * manufactures accusations against working code.
 */
function conditionalRegions(n: ts.Node): ts.Node[] {
  const out: (ts.Node | undefined)[] = [];
  if (ts.isIfStatement(n)) {
    out.push(n.thenStatement, n.elseStatement);
  } else if (ts.isCaseClause(n) || ts.isDefaultClause(n)) {
    out.push(...n.statements);
  } else if (ts.isCatchClause(n)) {
    out.push(n.block);
  } else if (ts.isConditionalExpression(n)) {
    out.push(n.whenTrue, n.whenFalse);
  } else if (
    ts.isBinaryExpression(n) &&
    (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      n.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  ) {
    out.push(n.right);
  } else if (
    ts.isForStatement(n) ||
    ts.isForOfStatement(n) ||
    ts.isForInStatement(n) ||
    ts.isWhileStatement(n)
  ) {
    out.push(n.statement);
  }
  return out.filter((x): x is ts.Node => x !== undefined);
}

const TERMINATES = (s: ts.Node): boolean =>
  ts.isReturnStatement(s) ||
  ts.isThrowStatement(s) ||
  ts.isBreakStatement(s) ||
  ts.isContinueStatement(s);

/** The innermost AST node covering `pos`. */
function nodeAt(sf: ts.SourceFile, pos: number): ts.Node {
  let cur: ts.Node = sf;
  for (;;) {
    const next = cur.getChildren(sf).find((c) => pos >= c.getStart(sf) && pos < c.getEnd());
    if (!next) return cur;
    cur = next;
  }
}

/**
 * THE BRANCH. `body` is the handler span starting at `bodyStart`; `pos` is the
 * absolute offset of the `toast(` inside it. Returns the body with everything
 * that does NOT co-execute with `pos` blanked — LENGTH-PRESERVING, so the
 * caller's offsets and reported line numbers are unchanged.
 */
function coExecutingRegion(
  sf: ts.SourceFile,
  body: string,
  bodyStart: number,
  pos: number,
): string {
  const chars = body.split('');
  const bodyEnd = bodyStart + body.length;
  const blank = (from: number, to: number) => {
    for (let i = Math.max(0, from - bodyStart); i < Math.min(chars.length, to - bodyStart); i++) {
      if (chars[i] !== '\n') chars[i] = ' ';
    }
  };

  // (a) every conditional region that does not contain the toast.
  (function walk(n: ts.Node) {
    if (n.getEnd() < bodyStart || n.getStart(sf) > bodyEnd) return;
    if (n.getStart(sf) >= bodyStart && n.getEnd() <= bodyEnd) {
      for (const r of conditionalRegions(n)) {
        if (pos < r.getStart(sf) || pos >= r.getEnd()) blank(r.getStart(sf), r.getEnd());
      }
    }
    n.forEachChild(walk);
  })(sf);

  // (b) everything after the toast's own path terminates. Without this a clause
  // that returns goes on being acquitted by code it can never reach.
  let terminated = false;
  let cur: ts.Node | undefined = nodeAt(sf, pos);
  while (cur && cur.parent && cur.getStart(sf) >= bodyStart) {
    const p: ts.Node = cur.parent;
    const stmts: readonly ts.Statement[] | null = ts.isBlock(p)
      ? p.statements
      : ts.isCaseClause(p) || ts.isDefaultClause(p)
        ? p.statements
        : null;
    if (stmts) {
      const i = stmts.findIndex((s) => s === cur);
      if (i >= 0) {
        if (terminated) {
          blank(stmts[i].getEnd(), p.getEnd());
        } else {
          for (let k = i; k < stmts.length; k++) {
            if (TERMINATES(stmts[k])) {
              blank(stmts[k].getEnd(), p.getEnd());
              terminated = true;
              break;
            }
          }
        }
      }
    }
    cur = p;
  }
  return chars.join('');
}

/** Every identifier NAME read anywhere inside `n`. */
function identifiersOf(n: ts.Node): Set<string> {
  const out = new Set<string>();
  (function walk(x: ts.Node) {
    if (ts.isIdentifier(x)) out.add(x.text);
    x.forEachChild(walk);
  })(n);
  return out;
}

/** The innermost `if` between the toast and the handler's start. */
function enclosingIf(sf: ts.SourceFile, hStart: number, pos: number): ts.IfStatement | null {
  let cur: ts.Node | undefined = nodeAt(sf, pos);
  while (cur && cur.getStart(sf) >= hStart) {
    if (ts.isIfStatement(cur)) return cur;
    cur = cur.parent;
  }
  return null;
}

/** Does the statement list holding `pos` reach a return/throw at or after it? */
function terminates(sf: ts.SourceFile, hStart: number, pos: number): boolean {
  let cur: ts.Node | undefined = nodeAt(sf, pos);
  while (cur && cur.parent && cur.getStart(sf) >= hStart) {
    const p: ts.Node = cur.parent;
    if (ts.isBlock(p)) {
      const i = p.statements.findIndex((s) => s === cur);
      if (i >= 0) return p.statements.slice(i).some(TERMINATES);
    }
    cur = p;
  }
  return false;
}

/**
 * THE REFUSAL CLASS — see the header. Returns the identifiers the condition and
 * the act READ IN COMMON, or null when the branch is not a refusal.
 *
 * ⚠️ **IT RETURNS THE NAMES RATHER THAN A BOOLEAN ON PURPOSE: AN EXCLUSION THAT
 * CANNOT SAY WHY IT EXCLUDED IS INDISTINGUISHABLE FROM A SKIP**, and a skip is
 * the thing this guard's header refuses to carry.
 */
function refusalOf(
  sf: ts.SourceFile,
  src: string,
  hStart: number,
  bodyEnd: number,
  pos: number,
): string[] | null {
  if (!terminates(sf, hStart, pos)) return null;
  const gate = enclosingIf(sf, hStart, pos);
  if (!gate) return null;
  const after = src.slice(gate.getEnd(), bodyEnd);
  const act = after.match(PERFORMS_REAL_ACT);
  if (!act) return null;
  let call: ts.Node | undefined = nodeAt(sf, gate.getEnd() + (act.index ?? 0));
  while (call && !ts.isCallExpression(call)) call = call.parent;
  if (!call) return null;
  const used = identifiersOf(call);
  const shared = [...identifiersOf(gate.expression)].filter((i) => used.has(i));
  return shared.length ? shared : null;
}

/**
 * ⚠️ **C3 · A TOAST VARIANT IS ITSELF A CLAIM, AND `success` CLAIMS AN ACT
 * COMPLETED.** The admission rule judges the COPY. Nothing judged the icon and
 * the accent beside it, so a branch could say *"Nothing was synced"* in words
 * and draw a green tick — and pass, because both halves were separately honest
 * about different things.
 *
 * **THE RULE: a branch in this guard's population must not have `'success'`
 * among its possible variants.** It is ONE-DIRECTIONAL by ruling. The reverse —
 * a branch that DOES act and renders `info` — is not judged here: `info` is the
 * right variant for an in-flight SAP submission (`invoice.pay.releasing`,
 * `gr.post.posting`), and a rule that forbade it would accuse those of lying.
 * `#352` is the precedent for the replacement: `info`, not `warning`, because
 * the notice is about a MISSING CAPABILITY and not about the document needing
 * attention.
 *
 * ⚠️ **THE REFUSAL CLASS IS IN SCOPE HERE THOUGH IT IS OUT OF SCOPE FOR THE
 * ADMISSION RULE, AND THE ASYMMETRY IS THE POINT.** A validation refusal claims
 * no act, so asking its copy for an ADMISSION asks the wrong question — that is
 * why the class exists. But it terminates BEFORE the handler's act by
 * construction, so `success` is a lie there in every case, with no copy to read
 * and no judgement to make. The one question the exclusion cannot buy silence
 * on is the one this rule asks.
 *
 * **THE VARIANT IS RESOLVED STATICALLY, AND AN UNRESOLVED ONE IS A FAILURE
 * RATHER THAN AN ACQUITTAL.** A guard that shrugs at what it cannot read is a
 * guard with a hole shaped like every future clever expression. Resolved today:
 * a string literal; a literal behind `as const` or parentheses; **a ternary,
 * resolved to the UNION of its arms** — which is what `BuyerRisk`'s
 * `row.status === 'expired' ? 'warning' : 'info'` needs, and a union is the
 * honest reading because either arm can render; `??` and `||`, likewise; and an
 * ABSENT `variant`, which resolves to `{'info'}` from `useToast`'s own default
 * (`input.variant ?? 'info'`). Anything else — a spread that could carry one, an
 * identifier, a call — returns null and the site is NAMED. Measured when this
 * landed: **0 sites are unresolved**, so no allowlist exists and none is needed.
 */
type Variants = ReadonlySet<string> | null;

const union = (a: Variants, b: Variants): Variants =>
  a === null || b === null ? null : new Set([...a, ...b]);

/** Resolve an expression to the set of variant strings it can evaluate to. */
function variantsOfExpression(n: ts.Node): Variants {
  let e: ts.Node = n;
  while (ts.isAsExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return new Set([e.text]);
  if (ts.isConditionalExpression(e))
    return union(variantsOfExpression(e.whenTrue), variantsOfExpression(e.whenFalse));
  if (
    ts.isBinaryExpression(e) &&
    (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      e.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  )
    return union(variantsOfExpression(e.left), variantsOfExpression(e.right));
  return null;
}

/** The variants the `toast(` call at `pos` can render. */
function variantsAt(sf: ts.SourceFile, pos: number): Variants {
  let n: ts.Node | undefined = nodeAt(sf, pos);
  while (n && !ts.isCallExpression(n)) n = n.parent;
  if (!n || !ts.isCallExpression(n)) return null;
  const arg = n.arguments[0];
  if (!arg || !ts.isObjectLiteralExpression(arg)) return null;
  // a spread could carry a variant this reader cannot see
  if (arg.properties.some((x) => ts.isSpreadAssignment(x))) return null;
  const prop = arg.properties.find(
    (x) => x.name !== undefined && ts.isIdentifier(x.name) && x.name.text === 'variant',
  );
  // absent: useToast's own default
  if (!prop) return new Set(['info']);
  if (!ts.isPropertyAssignment(prop)) return null;
  return variantsOfExpression(prop.initializer);
}

/** Does this site claim a completed act by its variant? */
const claimsSuccess = (v: Variants): boolean => v !== null && v.has('success');

interface Excluded {
  readonly file: string;
  readonly line: number;
  readonly shared: readonly string[];
  readonly variants: Variants;
}

const EXCLUSIONS: Excluded[] = [];

/**
 * A toast this guard cannot place inside ANY affordance handler's body.
 *
 * ⚠️ **IT IS RECORDED RATHER THAN DROPPED, BECAUSE A DROP IS INVISIBLE AND A
 * RECORD IS NOT.** The derivation used to attribute a toast to the LAST
 * `AFFORDANCE` match before it and never check that the toast lay inside that
 * handler's body. Measured on this tree the day the precondition landed: **11 of
 * 58 members sat outside the body they were attributed to**, so their branch
 * text — and therefore their `keys` and `literals` — belonged to a DIFFERENT
 * handler. Two were fully backed real acts the population had no business
 * holding (`SupplierOrders`' acknowledge-success, `SupplierRFQs`' quote-submit
 * success, both truthfully `variant: 'success'`); the other nine read their
 * claims off the wrong branch and passed the admission test VACUOUSLY, through
 * `claims.length === 0`. The figures are named as the measurement that motivated
 * the change, never as a standing tally — the assertion below derives them.
 *
 * ⚠️ **THIS GUARD SAYS NOTHING ABOUT AN UNATTRIBUTED TOAST, AND THAT IS A REACH
 * LIMIT RATHER THAN A VERDICT.** Such a toast lives in a react-query lifecycle
 * callback (excluded by `AFFORDANCE` on purpose — it is fired BY a dispatch), in
 * a helper whose name is not `handle*`, or in a nested closure. Silence about it
 * is honest; silence about the FACT of it is not, which is why the set is
 * materialised and asserted rather than `continue`d away.
 */
interface Unattributed {
  readonly file: string;
  readonly line: number;
  readonly reason: string;
}

const UNATTRIBUTED: Unattributed[] = [];

/**
 * ⚠️ **THE ONE UNATTRIBUTED SHAPE THAT IS A GUARD DEFECT RATHER THAN A REACH
 * LIMIT, SEPARATED SO IT CANNOT HIDE AMONG THE OTHERS.** `balancedEnd` caps a
 * body at 8000 chars. A toast genuinely INSIDE a handler whose body was
 * TRUNCATED by that cap is indistinguishable from one genuinely outside — and it
 * would leave the population silently, which is the failure this guard exists to
 * refuse. So the cap is detected at the site and asserted empty. It is empty
 * today, and a zero taken on the day of a repair is a report about the repair
 * (`CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`), so the assertion is mutation-probed
 * by LOWERING the cap until a real handler in this tree is truncated — never by
 * trusting the zero.
 */
const CAP_TRUNCATED: string[] = [];

/** DERIVE every unbacked toast site across the shipped pages. */
function deriveUnbackedSites(): Site[] {
  const out: Site[] = [];
  const files = readdirSync(PAGES_DIR).filter(
    (f) => f.endsWith('.tsx') && !f.includes('.test.'),
  );
  for (const file of files) {
    const raw = readFileSync(join(PAGES_DIR, file), 'utf8');
    const src = codeOnly(raw);
    const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const stateVars = stateVarsOf(src);
    for (const m of src.matchAll(/\btoast\s*\(\s*\{/g)) {
      const idx = m.index ?? 0;
      const pre = src.slice(0, idx);
      const line0 = pre.split('\n').length;
      const handlers = [...pre.matchAll(AFFORDANCE)];
      const ends = handlers.map((x) => balancedEnd(src, (x.index ?? 0) + x[0].length));
      // THE ATTRIBUTION PRECONDITION. A handler owns this toast only if the
      // toast lies INSIDE its body. The walk goes back to the nearest ENCLOSING
      // handler rather than taking the nearest PRECEDING one: measured on this
      // tree the two agree on every site, and they stop agreeing the moment one
      // affordance handler is nested inside another.
      let k = -1;
      for (let j = handlers.length - 1; j >= 0; j--) {
        if (idx < ends[j]) {
          k = j;
          break;
        }
      }
      if (k < 0) {
        if (handlers.length === 0) {
          UNATTRIBUTED.push({
            file,
            line: line0,
            reason: 'no preceding affordance handler',
          });
        } else {
          const j = handlers.length - 1;
          const from = (handlers[j].index ?? 0) + handlers[j][0].length;
          const capped =
            ends[j] === Math.min(src.length, from + 8000) && from + 8000 < src.length;
          if (capped) CAP_TRUNCATED.push(`${file}:${line0}`);
          UNATTRIBUTED.push({
            file,
            line: line0,
            reason: capped
              ? "nearest preceding handler's body hit the 8000-char cap"
              : `nearest preceding handler ends at line ${
                  src.slice(0, ends[j]).split('\n').length
                }`,
          });
        }
        continue;
      }
      const h = handlers[k];
      const hStart = h.index ?? 0;
      const bodyEnd = ends[k];
      const body = src.slice(hStart, bodyEnd);
      if (!body.includes('toast')) continue;
      // THE UNIT: the branch, not the body. A real act in a SIBLING clause of
      // the same handler no longer acquits the claim made here.
      const branch = coExecutingRegion(sf, body, hStart, idx);
      if (branchPerformsRealAct(sf, branch, hStart, stateVars)) {
        ACQUITTED.push(`${file}:${line0}`);
        continue; // backed — not this guard's business
      }
      if (out.some((s) => s.file === file && s.line === line0)) continue;
      // THE ONE EXCLUSION: a guard clause in front of the handler's own act
      // claims no act, so the admission test asks it the wrong question.
      const shared = refusalOf(sf, src, hStart, bodyEnd, idx);
      if (shared) {
        EXCLUSIONS.push({ file, line: line0, shared, variants: variantsAt(sf, idx) });
        continue;
      }
      const keys = [...branch.matchAll(/t\('([^']+)'/g)].map((k) => k[1]);
      const literals = [
        ...branch.matchAll(/(?:title|description):\s*[`'"]([^`'"]{4,})[`'"]/g),
      ].map((k) => k[1]);
      out.push({ file, line: line0, keys, literals, variants: variantsAt(sf, idx) });
    }
  }
  return out;
}

const EN = (resources.en.translation ?? {}) as Record<string, string>;
const ID = (resources.id.translation ?? {}) as Record<string, string>;

const SITES = deriveUnbackedSites();

describe('unbacked-toast honesty guard (R1)', () => {
  it('derives a non-empty population — a guard over nothing guards nothing', () => {
    expect(SITES.length).toBeGreaterThan(10);
  });

  /**
   * ⚠️ **AN EXCLUSION THAT EXCLUDES NOTHING READS EXACTLY LIKE A WORKING ONE.**
   * If the refusal property stopped matching — a renamed identifier, a changed
   * act shape — every member would simply stay in the population and the suite
   * would pass, so the class would be dead code claiming to be a rule. This is
   * the anti-vacuity half; the specimen control below is the other direction.
   * It asserts MEMBERSHIP with the reason attached, never a count.
   */
  /**
   * ⚠️ **C1 · A TOAST THIS GUARD CANNOT ATTRIBUTE MUST BE REPORTED, NEVER
   * SILENTLY DROPPED.** Two directions in one test, because one of them is a
   * reach limit and the other is a defect and they arrive looking identical:
   *   · the limit is REAL — the set is non-empty, so a future refactor that
   *     accidentally attributes everything cannot read green here;
   *   · every member SAYS WHY it is out, in one of the two honest shapes. A
   *     member that cannot say why is indistinguishable from a skip.
   *   · and `CAP_TRUNCATED` must be EMPTY: a body cut short by `balancedEnd`'s
   *     8000-char cap would push a toast that IS inside a handler out of the
   *     population, which is the silent drop this whole test refuses.
   */
  it('a toast outside every affordance handler body is reported, not dropped', () => {
    expect(
      UNATTRIBUTED.length,
      'no toast is unattributed — either the tree changed shape or the walk stopped walking',
    ).toBeGreaterThan(0);
    for (const u of UNATTRIBUTED) {
      expect(
        u.reason,
        `${u.file}:${u.line} left the population without naming a reason`,
      ).toMatch(/^(no preceding affordance handler|nearest preceding handler ends at line \d+)$/);
    }
    expect(
      CAP_TRUNCATED,
      `balancedEnd's cap truncated a handler body, so these toasts left the population silently rather than because they sit outside one: ${CAP_TRUNCATED.join(', ')}`,
    ).toEqual([]);
  });

  /**
   * ⚠️ **THE NARROWING'S ANTI-VACUITY HALF.** If `branchPerformsRealAct` started
   * returning false for everything, every backed handler in the tree would join
   * the population and the admission tests would go red in a hundred places —
   * loudly. The dangerous direction is the other one: if it returned TRUE for
   * everything the population would empty and the suite would read GREEN over
   * nothing (`EMPTY-INPUT-REPORTS-CLEAN-01`). So both ends are pinned by
   * MEMBERSHIP: something was acquitted, and something was not.
   */
  it('the act predicate discriminates — it acquitted some branches and kept others', () => {
    expect(ACQUITTED.length, 'nothing was acquitted — the act predicate stopped matching').toBeGreaterThan(0);
    expect(SITES.length, 'nothing survived — the act predicate now acquits everything').toBeGreaterThan(10);
  });

  it('the refusal class excluded something, and can say why', () => {
    expect(EXCLUSIONS.length).toBeGreaterThan(0);
    for (const e of EXCLUSIONS) {
      expect(
        e.shared.length,
        `${e.file}:${e.line} was excluded without naming a shared identifier`,
      ).toBeGreaterThan(0);
    }
  });

  it.each(SITES.map((s) => [`${s.file}:${s.line}`, s] as const))(
    'an unbacked affordance admits it in EN — %s',
    (_at, site) => {
      const claims = [
        ...site.keys.map((k) => EN[k]).filter(Boolean),
        ...site.literals,
      ];
      if (claims.length === 0) return; // nothing user-visible to judge
      expect(
        claims.some(admits),
        `No claim admits the act did not happen. Claims: ${JSON.stringify(claims)}`,
      ).toBe(true);
    },
  );

  it.each(SITES.map((s) => [`${s.file}:${s.line}`, s] as const))(
    'an unbacked affordance admits it in ID — %s',
    (_at, site) => {
      const claims = site.keys.map((k) => ID[k]).filter(Boolean);
      if (claims.length === 0) return;
      expect(
        claims.some(admits),
        `ID locale asserts an act with no admission. Claims: ${JSON.stringify(claims)}`,
      ).toBe(true);
    },
  );

  /**
   * ⚠️ **C3 · THE VARIANT RULE.** The population and the refusal class together:
   * every branch that performs no act, and every branch that refuses before one.
   * Neither may render the variant that claims an act completed.
   */
  it.each(
    [...SITES, ...EXCLUSIONS].map((s) => [`${s.file}:${s.line}`, s] as const),
  )('a branch with no real act does not claim success — %s', (at, site) => {
    expect(
      site.variants,
      `${at}: the variant cannot be resolved statically, so this guard cannot say whether it claims an act. Make it a literal (or a ternary of literals) rather than leaving the question unanswerable.`,
    ).not.toBeNull();
    expect(
      claimsSuccess(site.variants),
      `${at} renders variant 'success' on a branch that performs no act. 'success' claims the act completed; the honest variant for a notice about a missing capability is 'info' (#352).`,
    ).toBe(false);
  });

  /**
   * ⚠️ **AN UNRESOLVED VARIANT MUST FAIL, NOT ACQUIT — AND THE READER HAS TO BE
   * ABLE TO RESOLVE THE SHAPES THE TREE ACTUALLY USES, OR THE RULE IS A WALL OF
   * FALSE ACCUSATIONS.** Both halves in one place: nothing is unresolved today,
   * AND the reader was exercised on more than the trivial case — at least one
   * member's variant came from somewhere other than a bare string literal
   * (an absent `variant` defaulting to `info`, or a ternary resolved to a union).
   */
  it('every variant in the population resolves statically, by more than one shape', () => {
    const unresolved = [...SITES, ...EXCLUSIONS]
      .filter((s) => s.variants === null)
      .map((s) => `${s.file}:${s.line}`);
    expect(unresolved, `unresolved variants: ${unresolved.join(', ')}`).toEqual([]);
    const multi = [...SITES, ...EXCLUSIONS].filter((s) => (s.variants?.size ?? 0) > 1);
    expect(
      multi.length,
      'no site resolved to more than one variant — the union arm of the reader never ran',
    ).toBeGreaterThan(0);
  });

  it('every user-visible toast string is externalised (no hardcoded copy)', () => {
    const hardcoded = SITES.filter((s) =>
      s.literals.some((l) => !l.startsWith('t(') && /[a-z]{4}/.test(l)),
    ).map((s) => `${s.file}:${s.line} → ${s.literals.join(' | ')}`);
    expect(hardcoded, `Hardcoded toast copy bypasses both locales:\n${hardcoded.join('\n')}`)
      .toEqual([]);
  });
});

/**
 * ⚠️ **THE PROBE FIRES AT A DEFECT THIS TREE REALLY CARRIED, NOT AT A SYNTHETIC
 * ONE** (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`). A subject built to be found
 * agrees with the matcher by construction; only the geometry the tree actually
 * occupied was aimed by something other than the seat that aimed the matcher.
 *
 * The input is #352's retired copy, re-injected into the branch it was retired
 * from. It must be CONVICTED by the branch unit and ACQUITTED by the body unit —
 * both directions in one run, because a probe that only shows the new unit
 * firing cannot show that the old unit was the thing at fault.
 */
describe('the branch unit, fired at the defect it was built for (#352)', () => {
  const SRC = join(PAGES_DIR, 'BuyerInvoices.tsx');
  const RETIRED_EN = 'Routed to Finance Controller for urgent action.';

  it('the retired claim would not have admitted anything', () => {
    expect(admits(RETIRED_EN)).toBe(false);
  });

  it('the Overdue branch is in the population, and the handler body is not', () => {
    const raw = readFileSync(SRC, 'utf8');
    const src = codeOnly(raw);
    const sf = ts.createSourceFile('BuyerInvoices.tsx', raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const idx = src.indexOf("t('buyerInvoices.toast.escalate.title'");
    expect(idx, 'the Overdue branch must still be findable').toBeGreaterThan(0);
    const pre = src.slice(0, idx);
    const handlers = [...pre.matchAll(AFFORDANCE)];
    const h = handlers[handlers.length - 1];
    const hStart = h?.index ?? 0;
    const body = src.slice(hStart, balancedEnd(src, hStart + (h?.[0].length ?? 0)));
    const branch = coExecutingRegion(sf, body, hStart, src.lastIndexOf('toast', idx));

    // The OLD unit acquits: a sibling clause calls setPanelMode.
    expect(PERFORMS_REAL_ACT.test(body), 'the handler BODY performs a real act').toBe(true);
    // The NEW unit convicts: this clause performs none.
    expect(PERFORMS_REAL_ACT.test(branch), 'the Overdue BRANCH performs none').toBe(false);
    // And the narrowing is real, not a parse that returned nothing.
    expect(branch.trim().length, 'the branch must not be empty').toBeGreaterThan(0);
    expect(branch.length).toBe(body.length); // length-preserving

    // ⚠️ AND THE ONE EXCLUSION MUST NOT REACH IT. The Overdue clause guards no
    // act — nothing follows it in the handler — so it is not a refusal, and
    // #352's defect cannot be excluded on its way past the admission test.
    const bodyEnd = hStart + body.length;
    expect(
      refusalOf(sf, src, hStart, bodyEnd, src.lastIndexOf('toast', idx)),
      'the refusal class must NOT exclude the branch #352 repaired',
    ).toBeNull();
    // Positive control on that instrument in the same run: it DOES exclude the
    // refusals it was derived from, so a null above means "not a refusal"
    // rather than "this function never returns anything".
    expect(EXCLUSIONS.length, 'refusalOf must be capable of excluding').toBeGreaterThan(0);
  });
});

/**
 * ⚠️ **C2 · THE SELF-DISMISSAL PREDICATE, PROBED IN BOTH DIRECTIONS.** A guard is
 * habitually probed one way — *"does it catch the bad thing?"* — so a predicate
 * that is wrong about what it should ACCEPT ships looking like a working one. The
 * good input is asserted FIRST, and both run against the SAME synthetic program,
 * so neither reading can be believed alone.
 *
 * The two sources differ in exactly one property: whether the state the setter
 * writes is the state the surrounding JSX tests to decide the button exists.
 */
describe('the self-dismissal narrowing, probed both ways', () => {
  const build = (gate: string) => `
    const Page = () => {
      const [editing, setEditing] = useState(false);
      const [rows, setRows] = useState([]);
      return <div>{${gate} ? (
        <button onClick={() => { setEditing(false); toast({ variant: 'success', title: 'x' }); }} />
      ) : null}</div>;
    };
  `;

  const verdict = (src: string) => {
    const sf = ts.createSourceFile('probe.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const code = codeOnly(src);
    const h = [...code.matchAll(AFFORDANCE)][0];
    expect(h, 'the probe source must contain an affordance handler').toBeTruthy();
    const hStart = h?.index ?? 0;
    const bodyEnd = balancedEnd(code, hStart + (h?.[0].length ?? 0));
    const idx = code.indexOf('toast', hStart);
    const branch = coExecutingRegion(sf, code.slice(hStart, bodyEnd), hStart, idx);
    return branchPerformsRealAct(sf, branch, hStart, stateVarsOf(code));
  };

  it('ACCEPTS a setter whose state does NOT gate the surface (the known-good)', () => {
    // identical handler; the JSX is gated on `rows.length`, so closing `editing`
    // is a write to something else and the branch is a real act.
    expect(verdict(build('rows.length > 0'))).toBe(true);
  });

  it('REJECTS a setter whose state gates the very surface it sits in', () => {
    expect(verdict(build('editing'))).toBe(false);
  });

  it('a second, non-dismissing setter re-acquits the same branch', () => {
    const src = `
      const Page = () => {
        const [editing, setEditing] = useState(false);
        const [rows, setRows] = useState([]);
        return <div>{editing ? (
          <button onClick={() => { setRows([]); setEditing(false); toast({ variant: 'success', title: 'x' }); }} />
        ) : null}</div>;
      };
    `;
    expect(verdict(src)).toBe(true);
  });

  it('the useState requirement is load-bearing — a same-named non-state gate acquits', () => {
    // `editing` here is a prop, not state: the predicate must not convict on the
    // NAME alone, which is what stops it firing on an unrelated identifier.
    const src = `
      const Page = ({ editing }) => {
        return <div>{editing ? (
          <button onClick={() => { setEditing(false); toast({ variant: 'success', title: 'x' }); }} />
        ) : null}</div>;
      };
    `;
    expect(verdict(src)).toBe(true);
  });
});

/**
 * ⚠️ **C3 · THE STANDING SPECIMEN, AND IT IS THE SAME DEFECT #352 REPAIRED SEEN
 * FROM THE OTHER SIDE** (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`). The copy is
 * #352's retired `Overdue` claim, re-injected into its own branch shape with the
 * variant this batch forbids. It is an in-test constant: no shipped file carries
 * it at rest, and it convicts on every run.
 *
 * ⚠️ **IT ASSERTS BOTH HALVES SEPARATELY, BECAUSE A COMBINED PASS CANNOT SAY
 * WHICH RULE FIRED.** The retired copy admits nothing (the admission rule's
 * subject) AND renders `success` (this rule's subject); if only one assertion
 * existed, deleting the variant rule would leave the specimen convicting anyway
 * on the admission half and the deletion would read green.
 */
describe('the variant rule, fired at #352 with the variant it now forbids', () => {
  const RETIRED_EN = 'Routed to Finance Controller for urgent action.';
  const SPECIMEN = `
    const Page = () => {
      const handleFooterAction = () => {
        if (selected.status === 'Overdue') {
          toast({
            variant: 'success',
            title: t('buyerInvoices.toast.escalate.title'),
            description: 'Routed to Finance Controller for urgent action.',
          });
          return;
        }
      };
      return <button onClick={handleFooterAction} />;
    };
  `;

  const read = (src: string) => {
    const sf = ts.createSourceFile('specimen.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const code = codeOnly(src);
    const idx = code.indexOf('toast');
    expect(idx, 'the specimen must still contain a toast').toBeGreaterThan(0);
    return variantsAt(sf, idx);
  };

  it('the retired claim admits nothing — the admission half', () => {
    expect(admits(RETIRED_EN)).toBe(false);
  });

  it('and it claims success by its VARIANT — the half this batch adds', () => {
    const v = read(SPECIMEN);
    expect(v, 'the specimen variant must resolve').not.toBeNull();
    expect(claimsSuccess(v), 'the specimen must be convicted by the variant rule').toBe(true);
  });

  it('the same specimen with the honest variant is acquitted — the known-good', () => {
    // Rule 4: assert a known-GOOD input passes before believing a known-BAD one
    // failed. This is #352's actual repair, and the rule must not convict it.
    const v = read(SPECIMEN.replace("variant: 'success'", "variant: 'info'"));
    expect(claimsSuccess(v)).toBe(false);
  });

  it('an unresolvable variant is NOT acquitted — it resolves to null', () => {
    const v = read(SPECIMEN.replace("variant: 'success'", 'variant: chooseVariant(row)'));
    expect(v, 'a call-valued variant must be unresolved, never quietly acquitted').toBeNull();
    expect(claimsSuccess(v), 'and an unresolved variant must not read as "no success"').toBe(false);
  });
});

/*
 * ═══ PIN REACH — C1 / C2 / C3 ══════════════════════════════════════════════
 * The header's block covers the admission rule. These three add rules, and each
 * adds its own silence.
 *
 * **GUARDED, and nothing else:**
 *   · a toast is attributed only to a handler whose body contains it (C1)
 *   · what cannot be attributed is recorded with a reason, and a body truncated
 *     by the 8000-char cap is a hard failure (C1)
 *   · a setter whose state gates the surface rendering the handler does not
 *     acquit the branch on its own (C2)
 *   · no branch in the population, and no refusal, has 'success' among the
 *     variants it can render (C3)
 *   · a variant this file cannot resolve statically FAILS, naming the site (C3)
 *
 * ⚠️ **NOT GUARDED — and this half is why the block exists.**
 *   · **A VARIANT CHOSEN AT RUNTIME FROM SOMETHING THIS READER CANNOT SEE** is
 *     not acquitted, but neither is it judged: the site fails and a human
 *     decides. That is the honest disposition, not a verdict about the site.
 *   · **FILES OUTSIDE `PAGES_DIR`.** `readdirSync` is not recursive, so
 *     `pages-v2/roles/` is out, and `components/`, `hooks/` and `services/`
 *     were never in. Derived when this landed: `roles/CreateRolePanel.tsx`,
 *     `components/v2-features/GRInspectionWizard.tsx` and
 *     `services/query/commandHooks.ts` carry toasts this guard never reads. All
 *     are dispatch-backed today; none is a member by property. **That is a
 *     measurement, not a guarantee, and it decays the day one of them stops
 *     dispatching.**
 *   · **WORDING VERSUS VARIANT, BEYOND 'success'.** The rule is one-directional.
 *     A branch that DOES act and renders 'info' is untouched — correctly, since
 *     'info' is right for an in-flight SAP submission — and so is a branch whose
 *     copy admits nothing happened while its variant says 'warning'. Only the
 *     completion claim is gated.
 *   · **A TOAST OUTSIDE EVERY AFFORDANCE HANDLER BODY IS NOT JUDGED AT ALL.**
 *     Its existence is asserted (`UNATTRIBUTED`); its honesty is not. The
 *     population this guard reads is toasts inside handlers `AFFORDANCE` names,
 *     and a handler called `submitQuote` or `acknowledgeOrder` is not one.
 *   · **THE SELF-DISMISSAL PREDICATE'S OWN LIMITS**, stated at its definition: a
 *     setter that dismisses a DIFFERENT surface, one reached through a helper,
 *     and a gate written as a computed value rather than reading the state
 *     variable. Each is acquitted — the quiet direction, not the accusing one.
 *   · **THE #3 NARROWING IS NOT THE WHOLE OF `PERFORMS_REAL_ACT`'s UNDER-REACH.**
 *     A handler that does something SMALLER than it claims is still acquitted;
 *     that residue is a human review question and the header already says so.
 *   · **THIS BLOCK IS PROSE AND IS NOT ITSELF ASSERTED.**
 * ═══════════════════════════════════════════════════════════════════════════
 */
