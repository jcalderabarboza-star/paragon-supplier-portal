// ─────────────────────────────────────────────────────────────────────────────
// THE DISPLAY-STATE GATE — bilateral, and every reason token is CHECKED.
//
// ⚠️ **POPULATION CONTROLS FIRST, AND ONE OF THEM IS NEW.** Two of these guard
// the population (an empty scan proves nothing); the third guards the MATCHER,
// and it exists because the first version of this instrument counted `=== 'X'`
// as a write. A census that answers the question NEXT TO the one asked is the
// same class as an exit code read through a pipe — so the control travels with
// the instrument rather than living in someone's memory.
//
// ⚠️ **BILATERAL MEANS SET EQUALITY, NOT CONTAINMENT** (`allowlist.ts`'s shape).
// Two failures, not one: a state whose group no longer matches the tree, AND a
// declared row the tree does not support. The second is the half that catches an
// exemption outliving its subject — the day `contract/Expiring` gains a
// projection module, its row moves group BY DERIVATION and this file goes red.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  sourceFiles,
  filesForEntity,
  writeSites,
  producedBy,
  isFixture,
} from './derive';
import { DISPLAY_STATES, DISPLAY_STATE_ENTITIES, displayStatesOf } from './displayStates';
import { WIRED_COMMAND_TARGETS } from '../../services/data/mock/MockCommandService';
import '../../services/transitions/index';
import { getFlow } from '../../services/transitions/registry';

const FILES = sourceFiles();

describe('POPULATION + MATCHER CONTROLS — before any row is believed', () => {
  it('the source walk is populated, and excludes specs', () => {
    expect(FILES.length).toBeGreaterThan(50);
    expect(FILES.some((f) => f.endsWith('services/data/complianceProjection.ts'))).toBe(true);
    expect(FILES.some((f) => /\.test\./.test(f))).toBe(false);
  });

  it('KNOWN-GOOD FIRST: the two real producers are FOUND by the matcher', () => {
    // Rule 4, and in the direction that matters here: this instrument's blind
    // spots all bias toward "less produced than it is", so a missed producer
    // reads as a stored defect. Assert the finds before trusting any absence.
    const compliance = writeSites('Expiring', filesForEntity('compliance', FILES));
    expect(compliance.some((s) => s.file.includes('complianceProjection'))).toBe(true);
    const invoice = writeSites('Overdue', filesForEntity('invoice', FILES));
    expect(invoice.some((s) => s.file.includes('invoiceProjection'))).toBe(true);
  });

  it('⚠️ A COMPARISON IS NOT A WRITE — the control that the first matcher lacked', () => {
    // `BuyerContracts.tsx` compares `c.status === 'Expired'` several times and
    // writes it never. The broken matcher returned those as producers, which
    // would have classified a fixture-only state as computed.
    const cmp = writeSites('Expired', ['src/pages-v2/BuyerContracts.tsx']);
    expect(cmp, 'a comparison was counted as a write').toHaveLength(0);
    // …and the file really does contain the comparison, so the zero above is a
    // matcher result and not an empty file.
    expect(readFileSync('src/pages-v2/BuyerContracts.tsx', 'utf8')).toContain("=== 'Expired'");
  });

  it('⚠️ THE SCAN IS ENTITY-SCOPED — a shared literal is not one population', () => {
    // `'Expired'` belongs to ContractStatus AND SupplierDocumentStatus. An
    // unscoped scan returns one entity's sites under the other's name, which is
    // how the first run reported identical rows for two different entities.
    const c = filesForEntity('contract', FILES);
    const d = filesForEntity('supplierDocument', FILES);
    expect(c.length).toBeGreaterThan(0);
    expect(d.length).toBeGreaterThan(0);
    expect(c.some((f) => d.includes(f)), 'the two scopes overlap — rows would be shared').toBe(false);
  });

  it('a nonexistent state matches nothing', () => {
    expect(writeSites('__no_such_state__', FILES)).toHaveLength(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ⚠️ CRLF: THE LINE ENDING IS AN INPUT TO THIS INSTRUMENT, SO IT IS TESTED
  // LIKE ONE.
  //
  // The strip shipped as `raw.replace(/\/\/.*$/, '')` over a bare `'\n'` split.
  // `core.autocrlf` is on in this repo, `.` does not match `\r`, and `$`
  // without `m` means END OF STRING — so `.*` stopped one character short and
  // **the strip never fired on any file in this tree.** Every comment was
  // scanned as code. It changed no verdict, because the only comment in the
  // tree quoting a write pattern (`halalVerification.ts:58`) happens to sit
  // outside the scope of the entity whose state it names — LUCK, and the
  // header claimed design.
  //
  // ⚠️ **THE PAIR IS THE POINT: SAME BYTES, BOTH ENDINGS, IDENTICAL OUTPUT.**
  // A single-ending test cannot see this class at all — the broken instrument
  // passes an LF-only test perfectly. And the FIRST version of this batch's own
  // control was a synthetic string ending in a bare `\r` with no `\n`, which
  // `/\r?\n/` cannot split, so the "fixed" arm silently ran the broken
  // behaviour and both arms agreed. Hence: real files, real `\r\n`.
  // ───────────────────────────────────────────────────────────────────────────
  describe('CRLF is an input, not an accident of the checkout', () => {
    const write = (body: string, nl: string): string => {
      const p = join(mkdtempSync(join(tmpdir(), 'pgate-')), 'sample.ts');
      writeFileSync(p, body.split('\n').join(nl), 'utf8');
      return p;
    };

    // A comment quoting a write, then a REAL write, then a comparison.
    const BODY = [
      "// status: 'Ctl' — quoted in a comment, and a comment is not a write",
      "const real = { status: 'Ctl' };",
      "const cmp = real.status === 'Ctl';",
      '',
    ].join('\n');

    it('⚠️ KNOWN-GOOD FIRST: the real write IS found under BOTH line endings', () => {
      // Rule 4 in the order it demands. If the acquittal below were checked
      // first, a strip that ate the whole line would look like a working strip.
      for (const [name, nl] of [['LF', '\n'], ['CRLF', '\r\n']] as const) {
        const sites = writeSites('Ctl', [write(BODY, nl)]);
        expect(sites.map((s) => s.line), `${name}: the real write went missing`).toEqual([2]);
      }
    });

    it('⚠️ THE CASE LUCK COVERED: a comment quoting `status: X` IN SCOPE is acquitted, under both endings', () => {
      for (const [name, nl] of [['LF', '\n'], ['CRLF', '\r\n']] as const) {
        const sites = writeSites('Ctl', [write(BODY, nl)]);
        expect(
          sites.map((s) => s.line),
          `${name}: line 1 is a COMMENT and was counted as a producer`,
        ).not.toContain(1);
      }
    });

    it('the two endings agree exactly — the property, not two coincidences', () => {
      const lf = writeSites('Ctl', [write(BODY, '\n')]).map((s) => `${s.line}:${s.text}`);
      const crlf = writeSites('Ctl', [write(BODY, '\r\n')]).map((s) => `${s.line}:${s.text}`);
      expect(crlf).toEqual(lf);
      // …and the comparison on line 3 is excluded under both, so the equality
      // above is not two identically-broken runs agreeing with each other.
      expect(lf).toHaveLength(1);
    });

    // ⚠️ **A GUARD MUST NOT ASSERT A PROPERTY OF THE CHECKOUT. THE ASSERTION
    // THAT STOOD HERE DID, AND IT FAILED IN THE INVERTED DIRECTION.**
    //
    // It read:
    //
    //     it('the tree this gate actually reads is CRLF — so the pair above is
    //        not hypothetical', () => {
    //       const crlf = FILES.filter((f) => readFileSync(f, 'utf8').includes('\r\n'));
    //       expect(crlf.length, 'no CRLF file in src/ …').toBeGreaterThan(0);
    //     });
    //
    // `core.autocrlf` is on for the author and off on Linux CI, so that was
    // GREEN on the platform where the defect exists and **RED on the platform
    // where it cannot** — a guard pointing exactly backwards, and it turned a
    // correct fix into a failing gate. Line endings are a property of the
    // WORKING COPY, never of the code, and no gate may require one.
    //
    // What replaces it asserts the same thing without asking the checkout
    // anything: the strip is exercised against a REAL tree file that really
    // does quote a write pattern inside a comment. It is the case the broken
    // strip was acquitting by luck rather than by design, and it holds under
    // either line ending — which is the property the pair above proves, using
    // files it writes itself precisely so no platform can decide the outcome.
    it('the real tree file that quotes a write in a comment is acquitted', () => {
      const F = 'src/services/data/halalVerification.ts';
      const raw = readFileSync(F, 'utf8');
      // KNOWN-GOOD FIRST: the file really does contain the quoted write, or the
      // acquittal below is a report about a string that is not there.
      expect(raw, `${F} no longer quotes the state — pick a new witness`).toContain(
        "status: 'Expiring Soon'",
      );
      // …and it is inside a COMMENT, which is the whole reason it is acquitted.
      const line = raw.split(/\r?\n/).find((l) => l.includes("status: 'Expiring Soon'"));
      expect(line?.trimStart().startsWith('//'), `the witness line is not a comment: ${line}`).toBe(true);
      expect(
        writeSites('Expiring Soon', [F]),
        'a comment quoting a write was counted as a producer',
      ).toHaveLength(0);
    });
  });
});

describe('THE GROUPING IS DERIVED — declared == derived, both directions', () => {
  it('every declared row is in the group the tree puts it in', () => {
    expect(DISPLAY_STATES.length, 'population empty — nothing judged').toBeGreaterThan(0);
    for (const row of DISPLAY_STATES) {
      expect(
        producedBy(row.entity, row.state, FILES),
        `${row.entity}/${row.state} is declared '${row.group}' but the tree says otherwise`,
      ).toBe(row.group);
    }
  });

  it('⚠️ NO DECLARED GROUP IS UNKNOWN, AND THE POPULATED ONES ARE NOT VACUOUS', () => {
    // Without something here, deleting every `stored-in-fixtures` row would
    // leave the assertion above trivially true over the rows that remain.
    //
    // ⚠️ **THIS ASSERTED SET EQUALITY UNTIL `supplierDocument/Expired` WAS
    // RETIRED, AND THAT IS WHY IT NO LONGER DOES.** It demanded all three arms
    // hold a member — so removing a state that NOTHING PRODUCED, which is the
    // tree getting more honest, turned this file red. **A guard that reddens
    // when its subject improves is anchored on the defect it is watching**, and
    // the remedy is to check the property (every declared group is a real
    // `ProducedBy`; the classifier can still reach all three) rather than the
    // census (all three appear in today's rows).
    const groups = new Set(DISPLAY_STATES.map((r) => r.group));
    const KNOWN = ['computed-at-read', 'produced-by-nothing', 'stored-in-fixtures'];
    for (const g of groups) expect(KNOWN, `'${g}' is not a ProducedBy value`).toContain(g);
    // …and the arms that DO carry rows carry more than zero, which is the half
    // that keeps the derivation assertion above non-vacuous.
    expect(groups.size, 'every row landed in one group — the partition is doing no work').toBeGreaterThan(1);
  });

  it('⚠️ THE CLASSIFIER CAN STILL REACH ALL THREE ARMS — proven synthetically, not by census', () => {
    // The reachability the test above used to prove by demanding a member. A
    // synthetic input cannot go stale when the tree is repaired, which is the
    // whole point: `produced-by-nothing` must stay PROVABLE after its last real
    // member is retired, or the gate quietly stops defending the arm.
    const dir = mkdtempSync(join(tmpdir(), 'pgate-arms-'));
    mkdirSync(join(dir, 'data'));
    // `isFixture` is PATH-shaped (`/data/mock[A-Z]` or `/mock/fixtures/`), so
    // the synthetic files have to sit where a fixture really sits. The first
    // version of this test put them in the bare temp dir and the control below
    // caught it — without that control both rows would have classified the same
    // way and the "three arms" proof would silently have been a two-arm proof.
    const fixture = join(dir, 'data', 'mockSynthetic.ts').replace(/\\/g, '/');
    const module = join(dir, 'syntheticProjection.ts').replace(/\\/g, '/');
    writeFileSync(fixture, "const a = { status: 'SynthStored' };\r\n", 'utf8');
    writeFileSync(module, "const b = { status: 'SynthComputed' };\r\n", 'utf8');
    const files = [fixture, module];

    expect(isFixture(fixture), 'the synthetic fixture is not classified as one').toBe(true);
    expect(isFixture(module), 'the synthetic module was classified as a fixture').toBe(false);

    const verdict = (state: string): string => {
      const sites = writeSites(state, files);
      if (sites.some((s) => !isFixture(s.file))) return 'computed-at-read';
      return sites.length > 0 ? 'stored-in-fixtures' : 'produced-by-nothing';
    };
    expect(verdict('SynthComputed')).toBe('computed-at-read');
    expect(verdict('SynthStored')).toBe('stored-in-fixtures');
    expect(verdict('SynthNobodyWrites')).toBe('produced-by-nothing');
  });
});

describe('THE REASON TOKENS CARRY MECHANICAL OBLIGATIONS', () => {
  it('`computed-at-read` names a producer that really produces it, AND takes an injected `now`', () => {
    const rows = DISPLAY_STATES.filter((r) => r.group === 'computed-at-read');
    expect(rows.length, 'no computed rows — vacuous').toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.producer, `${row.entity}/${row.state} claims computed and names no producer`).toBeTruthy();
      const sites = writeSites(row.state, filesForEntity(row.entity, FILES)).filter((s) => !s.fixture);
      expect(
        sites.some((s) => s.file === row.producer),
        `${row.entity}/${row.state}: no non-fixture write in ${row.producer}`,
      ).toBe(true);
      // Law 0.5: derived at read from an INJECTED clock, never one of its own.
      const src = readFileSync(row.producer!, 'utf8');
      expect(src, `${row.producer} does not take an injected now`).toMatch(/nowIso\s*:\s*string/);
      expect(
        /Date\.now\(\)/.test(src),
        `${row.producer} reaches for its own clock — that is law 0.5's defect`,
      ).toBe(false);
    }
  });

  it('`stored-in-fixtures` means a fixture writes it and NOTHING else does', () => {
    const rows = DISPLAY_STATES.filter((r) => r.group === 'stored-in-fixtures');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const sites = writeSites(row.state, filesForEntity(row.entity, FILES));
      expect(sites.filter((s) => s.fixture).length, `${row.entity}/${row.state}: no fixture write`).toBeGreaterThan(0);
      expect(
        sites.filter((s) => !s.fixture).map((s) => s.file),
        `${row.entity}/${row.state}: acquired a real producer — it must leave this group`,
      ).toEqual([]);
    }
  });

  it('⚠️ `produced-by-nothing` means ZERO writes — and it fires the moment one appears', () => {
    // ⚠️ NO `toBeGreaterThan(0)` HERE, DELIBERATELY. It used to demand a member,
    // which made retiring the tree's one fabricated union member turn this red.
    // The arm's REACHABILITY is proved synthetically above; this loop is the
    // obligation on any member the group acquires, and an empty group has no
    // obligation to fail. (The `computed-at-read` and `stored-in-fixtures`
    // checks keep their non-empty assertions — those arms describe states that
    // exist, so an empty one really would mean the population collapsed.)
    const rows = DISPLAY_STATES.filter((r) => r.group === 'produced-by-nothing');
    for (const row of rows) {
      const sites = writeSites(row.state, filesForEntity(row.entity, FILES));
      expect(
        sites.map((s) => `${s.file}:${s.line}`),
        `${row.entity}/${row.state} gained a producer — it is no longer produced by nothing`,
      ).toEqual([]);
      // It IS a declared member of its DTO union — otherwise this row is about
      // a state that does not exist, which is a different (and worse) finding.
      expect(
        readFileSync('src/services/data/types.ts', 'utf8'),
        `${row.state} is not declared on any DTO union`,
      ).toContain(`'${row.state}'`);
    }
  });

  it('`noCommandTarget` is checked against the registry, not remembered', () => {
    const wired = WIRED_COMMAND_TARGETS as readonly string[];
    expect(wired.length, 'no wired targets — the assertions below are vacuous').toBeGreaterThan(0);
    for (const row of DISPLAY_STATES) {
      if (row.noCommandTarget) {
        expect(wired, `${row.entity} claims no CommandTarget but is wired`).not.toContain(row.entity);
      } else {
        // The flag's ABSENCE is a claim too: this entity IS wired, so "nothing
        // writes the state" is not explained away by "nothing can".
        expect(wired, `${row.entity} has no CommandTarget — the row should say so`).toContain(row.entity);
      }
    }
  });
});

describe('THE ORIGINAL CLAIM SURVIVES — no flow knows any of these states', () => {
  it('every display state is absent from its flow, as a state AND as a target', () => {
    // Verbatim what `PROJECTIONS_EXCLUDED` asserted. It was true then and it is
    // true now; only the label changed. Asserted here as well as in the two flow
    // specs so the claim does not rest on their import surviving a refactor.
    for (const row of DISPLAY_STATES) {
      const flow = getFlow(row.entity);
      expect(flow, `${row.entity} has no registered flow`).toBeTruthy();
      expect(flow!.states, `${row.entity}/${row.state}`).not.toContain(row.state);
      for (const t of flow!.transitions) expect(t.to).not.toBe(row.state);
    }
  });

  it('`displayStatesOf` answers [] for an entity with none — purchaseRequisition is the case', () => {
    // The old constant carried `purchaseRequisition: []` with the comment "all 6
    // states are real". That claim is preserved by the ABSENCE of a row, and
    // asserted here so the absence is deliberate rather than an omission.
    expect(displayStatesOf('purchaseRequisition')).toEqual([]);
    expect(DISPLAY_STATE_ENTITIES).not.toContain('purchaseRequisition');
    expect(getFlow('purchaseRequisition')!.states.length).toBeGreaterThan(0);
    // …and a known-true entity does answer, so the [] above is not vacuous.
    expect(displayStatesOf('contract')).toContain('Expiring');
  });
});

describe('isFixture — the classifier the whole partition turns on', () => {
  it('a fixture is a fixture and a store is not', () => {
    expect(isFixture('src/data/mockContracts.ts')).toBe(true);
    expect(isFixture('src/services/data/mock/fixtures/invoices.ts')).toBe(true);
    // ⚠️ A STORE IS NOT A FIXTURE. If a store ever writes one of these states
    // that is a real producer, and misclassifying it would launder a write path
    // into a data defect.
    expect(isFixture('src/services/data/mock/stores/invoiceStore.ts')).toBe(false);
    expect(isFixture('src/services/data/complianceProjection.ts')).toBe(false);
  });
});
