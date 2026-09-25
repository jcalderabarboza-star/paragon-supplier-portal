// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ NO SECOND WRITE PATH SURVIVES — DERIVED FROM SOURCE, NOT ASSERTED IN PROSE.
//
// The whole point of call-off step 1 is that the delivery lane's writes stopped
// being direct store mutations. That claim is worth exactly as much as the
// instrument that checks it, so this derives the population rather than
// describing it: **every call site of `schedulingAgreementStore.update(` in
// `src/`, excluding specs.** After this batch there is exactly one file, and it
// is the one that holds the two CommandTargets.
//
// ⚠️ **IT IS A MEMBERSHIP ASSERTION, NEVER A COUNT** (`EMPTY-INPUT-REPORTS-
// CLEAN-01`). A count of one is satisfied by the WRONG one. The REACH block
// below fires the matcher at a site the tree really has and requires it BY
// NAME, and a known-absent control requires it to stay absent — so a matcher
// that silently stopped matching cannot report "no bypasses" over a population
// of zero.
//
// ⚠️ **AND COMMENTS ARE STRIPPED FIRST.** `MockDeliveryService`'s header quotes
// the retired behaviour, and this file's own header names the function it
// hunts. A scan that read comments as code would accuse both.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { stripSourceComments } from '../../../lib/sourceScan/stripComments';

const SRC = resolve(process.cwd(), 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Every non-spec file whose CODE calls `<expr>.update(` on the agreement store. */
function filesCalling(needle: string): string[] {
  return walk(SRC)
    .filter((f) => {
      const code = stripSourceComments(readFileSync(f, 'utf8'), 'blank', f);
      return code.includes(needle);
    })
    .map((f) => relative(SRC, f).replace(/\\/g, '/'))
    .sort();
}

const STORE_WRITE = 'schedulingAgreementStore.update(';
const STORE_READ = 'schedulingAgreementStore.get(';

// The walk reads every `.ts`/`.tsx` under `src/` and strips each one's
// comments, which is seconds of work under full-suite contention. A default
// 5s budget makes this flaky for a reason that has nothing to do with what it
// asserts — `pageWidth.guard.test.ts` carries the same note for the same cause.
const WALK_BUDGET_MS = 30000;

describe('REACH — the matcher reads the tree it claims to read', () => {
  it('⚠️ IT FINDS A KNOWN-PRESENT SITE BY NAME, NEVER A COUNT', () => {
    // If the walker, the stripper or the needle broke, this goes red BEFORE the
    // assertion below reports a clean tree over an empty population.
    expect(filesCalling(STORE_READ)).toContain('services/delivery/addressing.ts');
  }, WALK_BUDGET_MS);

  it('⚠️ AND A KNOWN-ABSENT NEEDLE COMES BACK EMPTY — the other direction', () => {
    expect(filesCalling('schedulingAgreementStore.obliterate(')).toEqual([]);
  }, WALK_BUDGET_MS);

  it('⚠️ AND A COMMENT IS NOT A CALL SITE — the stripper does its job', () => {
    const commented = stripSourceComments(
      `// schedulingAgreementStore.update(x)\nconst y = 1;\n`,
      'blank',
      'probe.ts',
    );
    expect(commented.includes(STORE_WRITE)).toBe(false);
  });
});

describe('⚠️ THE ONLY WRITER OF THE AGREEMENT STORE IS THE COMMAND TARGET', () => {
  it('exactly one non-spec file mutates it, and it is MockCommandService', () => {
    const writers = filesCalling(STORE_WRITE);
    expect(
      writers,
      'a second write path would let a delivery act land with no atom, no policy ' +
        'hook, no actor and no TransitionEvent — which is the defect this batch closed',
    ).toEqual(['services/data/mock/MockCommandService.ts']);
  });

  it('⚠️ AND THE SERVICE SEAM NO LONGER MUTATES AT ALL', () => {
    // Named separately from the assertion above, because "the set is exactly
    // one" and "this particular former writer has stopped" are different
    // claims, and the second is the one a reader of the diff wants answered.
    const code = stripSourceComments(
      readFileSync(resolve(SRC, 'services/data/mock/MockDeliveryService.ts'), 'utf8'),
      'blank',
      'MockDeliveryService.ts',
    );
    expect(code.includes(STORE_WRITE)).toBe(false);
    // And it reaches the store only to READ — the orchestration it kept.
    expect(code.includes(STORE_READ)).toBe(true);
  });

  it('⚠️ AND EVERY DELIVERY WRITE IN THE SEAM GOES THROUGH `commands.dispatch`', () => {
    const code = stripSourceComments(
      readFileSync(resolve(SRC, 'services/data/mock/MockDeliveryService.ts'), 'utf8'),
      'blank',
      'MockDeliveryService.ts',
    );
    // One dispatch per SEAM write method: release, confirm, policy.
    const dispatches = [...code.matchAll(/this\.commands\.dispatch\(/g)];
    expect(dispatches.length).toBe(3);
    for (const id of ['t_delivery_release', 't_delivery_confirm', 't_delivery_policy_set']) {
      expect(code, `${id} is not dispatched from the seam`).toContain(`'${id}'`);
    }
  });

  it('⚠️ AND THE FOURTH VERB IS DISPATCHED FROM THE HOOK, NOT MISSING', () => {
    // `t_delivery_adjust` is deliberately NOT on the seam: the C1 method-surface
    // contract enumerates `IDeliveryService`'s methods and pins them EQUAL, so a
    // fifth method would be a contract amendment — and an adjust is one command
    // against one address with nothing to orchestrate. It is dispatched
    // directly, the `commandHooks` pattern.
    //
    // ⚠️ **THE CONTRACT IS NAMED IN WORDS RATHER THAN BY FILENAME, AND THAT IS
    // NOT COSMETIC.** `pinReach.contract.test.ts` derives "which specs pin
    // contract C?" as *"a module that mentions C's filename AND calls
    // `readFileSync`"* — and this file does both, for unrelated reasons. Writing
    // the filename here classified this spec as a C1 pin and demanded its
    // describe titles appear in C1's `## Pin reach` block. A NAME IN PROSE READ
    // AS A CITATION is the exact defect that file's own header warns about,
    // arriving from a direction it had not been aimed at.
    //
    // ⚠️ **ASSERTED RATHER THAN LEFT TO THE READER**, because "it is not in the
    // seam" and "it is not wired at all" look identical from the seam's side,
    // and the second would be a verb on `/buyer/process-flows` that nothing can
    // fire.
    const hook = stripSourceComments(
      readFileSync(resolve(SRC, 'services/query/deliveryHooks.ts'), 'utf8'),
      'blank',
      'deliveryHooks.ts',
    );
    expect(hook).toContain("'t_delivery_adjust'");
    expect(hook).toContain('svc.commands.dispatch(');
  });
});
