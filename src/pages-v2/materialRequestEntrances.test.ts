// ─────────────────────────────────────────────────────────────────────────────
// R8 · ENTRANCE-IS-THE-UNIT-01 — THE ENTRANCE IS THE UNIT, NOT (SURFACE × VERB).
//
// Two entrances by operator ruling: the RFQ wizard and the standalone page.
// Coverage is derived as **(surface × verb × ENTRANCE)**, and the question this
// file answers is not *"does each surface import the hook?"* — `SupplierOrders`
// imported the guard, rendered it, and still shipped a live commit — but
// *"does every component that calls the submit hook route its payload through
// the ONE builder?"*
//
// ── ⚠️ THE PROBE IS AIMED AT A DEFECT THIS TREE REALLY CARRIES ──────────────
//
// `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`: a synthetic subject agrees with the
// matcher by construction, so it can never say the matcher is aimed at the
// right thing. The matcher below is therefore fired ALSO at `t_pr_create`, the
// tree's other multi-entrance creation verb, where the divergence is live:
// `PrCreateVars.payload` is `Record<string, unknown>`, two of its THREE
// entrances share `buildPrCreatePayload`, and `BuyerRequisitions` builds its
// own. **It must return NAMED members there.** A run that reports zero drift
// against that population is a broken instrument, not a reassuring one.
//
// ⚠️ **AND THE PROBE PAID FOR ITSELF ON ITS FIRST RUN, AGAINST THE SEAT THAT
// WROTE IT.** The scope report said FOUR entrances; this instrument returned
// three, because the fourth was a comment that `grep -rln` had matched. The
// identifier scan was right and the prose figure was wrong — see
// `identifiersIn` below.
//
// ⚠️ **THAT DIVERGENCE IS MEASURED HERE AND FIXED NOWHERE — out of scope by
// ruling.** This file is its only current gate, and it is a gate on the
// instrument rather than on the defect.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { stripSourceComments } from '../lib/sourceScan/stripComments';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SRC = resolve(process.cwd(), 'src');

/** Every .ts/.tsx under src, excluding specs — the population, derived. */
const sourceFiles = (dir: string = SRC, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, acc);
    else if (
      (p.endsWith('.ts') || p.endsWith('.tsx')) &&
      !p.includes('.test.') &&
      !p.includes('.smoke.')
    )
      acc.push(p);
  }
  return acc;
};

const FILES = sourceFiles();

/**
 * The identifiers a file references, read from the AST — never by substring.
 *
 * ⚠️ **AN AST IDENTIFIER SCAN, AND THE DIFFERENCE FROM A TEXT SCAN IS NOT
 * COSMETIC — IT CORRECTED THIS BATCH'S OWN FIGURE.** The scope report said
 * `usePurchaseRequisitionCreate` has FOUR call sites. It has THREE. The fourth,
 * `pages-v2/intake-review/intakeReviewModel.ts`, mentions the hook only inside
 * a COMMENT (`:6` — *"the EXISTING governed push (t_pr_create via
 * usePurchaseRequisitionCreate)"*), and `grep -rln` matched the prose. **A
 * comment is not a call site** — §42's rule with a location standing in for a
 * number, and rule 1's "a derived population is reporting on its own matcher"
 * firing on the seat that wrote the derivation.
 *
 * The FINDING is unchanged and slightly sharper: three entrances, two sharing
 * `buildPrCreatePayload`, one building its own. Only the cardinality was wrong.
 *
 * Memoized because the walk is over 300+ files and every query re-ran it.
 */
const IDENT_CACHE = new Map<string, Set<string>>();
const identifiersIn = (file: string): Set<string> => {
  const hit = IDENT_CACHE.get(file);
  if (hit) return hit;
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const out = new Set<string>();
  const walk = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) out.add(n.text);
    ts.forEachChild(n, walk);
  };
  walk(sf);
  IDENT_CACHE.set(file, out);
  return out;
};

/**
 * Which components CALL a hook, as opposed to DEFINING it.
 *
 * ⚠️ **THE DEFINITION SITE IS EXCLUDED BY PATH, AND THAT IS §42's LESSON
 * APPLIED.** `commandHooks.ts` is ONE module where every hook is declared, so a
 * bare identifier scan reports it as a caller of all of them — the exact
 * mistake §86j's first matcher made, which reported every supplier surface as
 * using all sixteen owner-less hooks. The known-FALSE control below is what
 * caught it there and what keeps this honest here.
 */
const TEXT_CACHE = new Map<string, string>();
const textOf = (f: string): string => {
  const hit = TEXT_CACHE.get(f);
  if (hit !== undefined) return hit;
  const t = readFileSync(f, 'utf8');
  TEXT_CACHE.set(f, t);
  return t;
};

const callersOf = (hook: string): string[] =>
  FILES.filter(
    (f) =>
      !f.endsWith(join('services', 'query', 'commandHooks.ts')) &&
      // ⚠️ A CHEAP PRE-FILTER IN FRONT OF THE AST, SOUND IN THE ONE DIRECTION
      // THAT MATTERS. A file whose TEXT does not contain the name cannot
      // reference the identifier, so skipping it loses nothing; a file whose
      // text DOES contain it is still decided by the AST, so a mention in a
      // COMMENT is still correctly excluded. The pre-filter is an optimisation
      // and never the verdict — the `intakeReviewModel` exclusion still comes
      // from the AST, and the test below asserts that file's text DOES contain
      // the name, which is exactly what proves the pre-filter did not do the
      // excluding.
      //
      // It was added because AST-parsing all 300+ files made this the third
      // tree-scanning spec in the suite and pushed two OTHERS into timeouts
      // under full-suite load. A new spec must not make existing ones flake.
      textOf(f).includes(hook) &&
      identifiersIn(f).has(hook),
  )
    .map((f) => f.slice(SRC.length + 1).replace(/\\/g, '/'))
    .sort();

// ── REACH · the instrument is looking at the shipped tree ────────────────────
describe('REACH — the population and the matcher', () => {
  it('⚠️ THE FILE WALK FOUND THE TREE, not an empty directory', () => {
    expect(FILES.length).toBeGreaterThan(300);
  });

  it('⚠️ THE MATCHER SEES A CALL SITE AND NOT A DEFINITION SITE — bilateral', () => {
    // KNOWN-TRUE: a hook with exactly one well-known caller.
    expect(callersOf('useApplicationSubmit')).toEqual([
      'pages-v2/BuyerSupplierApplications.tsx',
    ]);
    // KNOWN-FALSE: a name nothing calls.
    expect(callersOf('useMaterialRequestSubmitZZZ')).toEqual([]);
    // AND THE DEFINITION SITE IS NOT COUNTED as a caller of anything.
    expect(callersOf('useApplicationSubmit')).not.toContain(
      'services/query/commandHooks.ts',
    );
  });
});

describe('⚠️ THE TWO ENTRANCES, DERIVED — and both route through the ONE builder', () => {
  const ENTRANCES = ['pages-v2/BuyerMaterialRequests.tsx', 'pages-v2/BuyerSourcing.tsx'];

  it('exactly two components call `useMaterialRequestSubmit`', () => {
    expect(callersOf('useMaterialRequestSubmit')).toEqual(ENTRANCES);
  });

  it('⚠️ AND EVERY ONE OF THEM REFERENCES `buildMaterialRequestPayload`', () => {
    // The load-bearing assertion. Derived from the SAME population, so a third
    // entrance added later is caught here rather than in review.
    const builders = callersOf('buildMaterialRequestPayload');
    for (const e of callersOf('useMaterialRequestSubmit')) {
      expect(builders).toContain(e);
    }
  });

  it('⚠️ AND NEITHER ENTRANCE CONSTRUCTS A PAYLOAD LITERAL OF ITS OWN', () => {
    // ENTRANCE-IS-THE-UNIT-01's real question: not "does it import the builder?" but "is there a
    // second door?" A surface can import the builder AND still hand the hook an
    // object literal on some other path — which is precisely how
    // `SupplierOrders` shipped a live commit beside a rendered guard.
    //
    // Derived: every `payload:` property inside a `useMaterialRequestSubmit`
    // mutate call must be a CALL EXPRESSION (the builder), never an object
    // literal.
    for (const rel of ENTRANCES) {
      const file = join(SRC, ...rel.split('/'));
      const sf = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      const offenders: string[] = [];
      const walk = (n: ts.Node): void => {
        if (ts.isPropertyAssignment(n) && n.name.getText() === 'payload') {
          const enclosing = n.getSourceFile().text.slice(
            Math.max(0, n.getStart() - 400),
            n.getStart(),
          );
          if (/materialRequestSubmit|submit\.mutateAsync/.test(enclosing)) {
            if (!ts.isCallExpression(n.initializer)) {
              offenders.push(`${rel}:${n.getStart()}`);
            }
          }
        }
        ts.forEachChild(n, walk);
      };
      walk(sf);
      expect(offenders).toEqual([]);
    }
  });
});

// ── THE PROBE, FIRED AT A DEFECT THE TREE REALLY HAS ────────────────────────
describe('⚠️ PROBE — the same matcher at `t_pr_create`, where the drift is LIVE', () => {
  it('⚠️ IT RETURNS NAMED MEMBERS, or this instrument is broken', () => {
    // ⚠️ **THREE call sites, and the scope report said four — THIS ASSERTION IS
    // WHAT CORRECTED IT.** `intake-review/intakeReviewModel.ts` names the hook
    // only in a comment, which `grep -rln` matched and an identifier scan does
    // not. Pinned as a LIST rather than a count so the next wrong figure is
    // caught by name; if it collapses to one or zero the matcher is reporting on
    // itself rather than on the tree.
    const callers = callersOf('usePurchaseRequisitionCreate');
    expect(callers).toEqual([
      'pages-v2/BuyerRequisitions.tsx',
      'pages-v2/IntakeReview.tsx',
      'pages-v2/plan-grid/IntakeAdjustDrawer.tsx',
    ]);
    // And the excluded file is excluded for the RIGHT reason — it really does
    // mention the hook, just not as code. Without this the exclusion could be a
    // matcher that simply misses that path.
    expect(
      readFileSync(join(SRC, 'pages-v2', 'intake-review', 'intakeReviewModel.ts'), 'utf8'),
    ).toContain('usePurchaseRequisitionCreate');

    // ⚠️ **THE DRIFT THIS PROBE WAS AIMED AT IS NOW CLOSED, AND THE ASSERTION
    // IS INVERTED RATHER THAN DELETED.** It used to read
    // `expect(drifting).toContain('pages-v2/BuyerRequisitions.tsx')` — a
    // NAMED member, correct on the day it was written, and the reason this
    // instrument earned its place. `BuyerRequisitions` built its payload inline,
    // supplied no `estimatedValue`, and the target's `num()` answered 0.
    //
    // Deleting the assertion would delete the only thing watching the lane. So
    // it now says the opposite thing about the same population: EVERY entrance
    // goes through a builder in the one payload module. The day a fourth
    // entrance is added inline, this goes red by name.
    const sharedBuilder = new Set([
      ...callersOf('buildPrCreatePayload'),
      ...callersOf('buildAcceptPush'),
      ...callersOf('buildNewPrPayload'),
    ]);
    const drifting = callers.filter((c) => !sharedBuilder.has(c));
    expect(drifting).toEqual([]);

    // ⚠️ AND THE MATCHER IS NOT VACUOUS. An empty result is what a broken
    // `callersOf` also returns (rule 1), so a known-true member is asserted
    // present in the builder set in the same run.
    expect(sharedBuilder.has('pages-v2/BuyerRequisitions.tsx')).toBe(true);
  });

  it('⚠️ AND THE FIELD SETS NO LONGER DIVERGE SILENTLY — the consequence', () => {
    // ⚠️ **WHAT THIS ASSERTED BEFORE, AND WHY IT IS REWRITTEN RATHER THAN
    // RELAXED.** It measured that the two entrances supplied DIFFERENT field
    // sets — `expect(planGrid).toContain('estimatedValue: line.estimatedValue')`
    // beside `expect(requisitions).toContain('priority: form.priority')` — and
    // closed by proving `BuyerRequisitions` sent no `estimatedValue` at all, so
    // the target's `num()` stored 0.
    //
    // The field sets STILL differ, and always will: a pushed plan line knows a
    // value and a person filling a form does not. What changed is that the
    // difference is now carried by ONE TYPE, so an absence reaches the target as
    // an absence instead of as a default it invents. So the claim moves up a
    // level: both entrances build through the one module, and the fields that
    // used to be defaulted are OPTIONAL there.
    const read = (rel: string) => readFileSync(join(SRC, ...rel.split('/')), 'utf8');
    const payload = read('pages-v2/requisitions/prCreatePayload.ts');
    const requisitions = read('pages-v2/BuyerRequisitions.tsx');
    const target = read('services/data/mock/MockCommandService.ts');

    // one module, both builders
    expect(payload).toContain('export function buildPrCreatePayload');
    expect(payload).toContain('export function buildNewPrPayload');
    expect(payload).toContain('estimatedValue?: number');
    expect(payload).toContain('priority?: PRPriority');

    // the entrance no longer assembles a literal of its own
    expect(requisitions).toContain('buildNewPrPayload(form, parsedQty.value)');
    expect(requisitions).not.toContain('priority: form.priority');

    // ⚠️ AND THE DEFAULTS ARE GONE AT THE TARGET, which is where they were
    // actually applied. `num('estimatedValue')` was the line that turned an
    // absence into a stated zero.
    //
    // ⚠️ **COMMENTS ARE STRIPPED FIRST, AND THIS FILE'S OWN HEADER IS WHY.**
    // The first draft asserted over raw source and went red on the RFQ create
    // path's COMMENT explaining why IT does not use `num('estimatedValue')` —
    // "a comment is not a call site", the rule this file corrected its own
    // cardinality with, firing on the seat that wrote it again.
    const code = stripSourceComments(target, 'blank', 'MockCommandService.ts');
    expect(code).not.toContain("num('estimatedValue')");
    expect(code).toContain("typeof payload.estimatedValue === 'number'");
    // the known-true control: `num()` still exists and is still used, so the
    // absence above is a statement about ONE key rather than about the helper
    expect(code).toContain("num('quantity')");
  });

  it('⚠️ AND BOTH LANES ARE NOW TYPED — `PrCreateVars` caught up', () => {
    // ⚠️ **THIS ASSERTED THE DEFECT AND NOW ASSERTS ITS ABSENCE.** It read
    // `expect(hooks).toMatch(/interface PrCreateVars \{[\s\S]*?payload: Record<string, unknown>/)`
    // — naming the untyped payload as the MECHANISM of the drift, which it was.
    // The remedy is the one this file already described: an interface, so an
    // entrance omitting a required field is a `tsc` failure.
    const hooks = readFileSync(
      join(SRC, 'services', 'query', 'commandHooks.ts'),
      'utf8',
    );
    expect(hooks).toMatch(/interface PrCreateVars \{[\s\S]*?payload: PrCreatePayload/);
    expect(hooks).toMatch(
      /interface MaterialRequestSubmitVars \{[\s\S]*?payload: MaterialRequestSubmitPayload/,
    );
    // ⚠️ KNOWN-FALSE, SCOPED TO THE LANE THIS BATCH RULED ON. A first draft
    // asserted it over every `\w*CreateVars` in the file and accused hooks this
    // batch never examined — rule 2, a widening that manufactures findings. The
    // claim here is about `PrCreateVars` and stops there.
    expect(hooks).not.toMatch(/interface PrCreateVars \{[\s\S]{0,400}?payload: Record<string, unknown>/);
  });
});
