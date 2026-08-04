// ─────────────────────────────────────────────────────────────────────────────
// CP-3b — THE DIVERGENCE LEDGER, PUT ON THE FLOOR.
//
// ── WHAT THIS IS NOT ────────────────────────────────────────────────────────
//   It is NOT the §7 composition check the dispatch asked for. That check —
//   "a §7 row's subject is not simultaneously claimed as true in the body" —
//   WAS BUILT AS A PROBE, MEASURED, AND REFUSED. On C9 at `f492b5c` the naive
//   text-against-text form fires 28 times and NOT ONE of them is the defect it
//   exists for (`LEDGER-UNCOMPOSED-01`): §6.1a asserts the substance rollup is
//   "the axis on which any row sourced from their master can be written at
//   all" WITHOUT EVER NAMING `substanceRef` — it cites `(§2.4)` in prose. The
//   check that would have caught it cannot see it, and the 28 sites it does see
//   are all legitimate. 28 false positives, 0 true positives. A check with that
//   ratio gets muted, and a muted check is worse than none — our own argument
//   against the CLAUDE.md floor regex, and it applies here with more force.
//   The measurement, and the C9 amendment that would make the composition check
//   buildable, are in `docs/findings.md` (`LEDGER-SUBJECT-UNTYPED-01`).
//
// ── WHAT THIS IS ────────────────────────────────────────────────────────────
//   The part of the same problem that CAN be checked with a zero false-positive
//   rate, because it is derived rather than inferred. Two properties:
//
//   1. THE LEDGER'S CODE-ANCHORED ROWS ARE STILL TRUE.
//      A ledger row asserts a NEGATIVE about our own tree — "this is not
//      built", "nothing consumes this", "we still parse it". `CENSUS-MUST-
//      DERIVE-01` says a negative is derived, never assumed, and a ledger row
//      is the biggest unassumed negative in the package. Each check below reads
//      the CLAIM out of the contract document and then measures the TREE. Both
//      halves must hold: delete the row and it fails; fix the code and it fails.
//      That second direction is the one nothing catches today — a divergence
//      that gets repaired leaves a contract still declaring a defect it no
//      longer has, which is the C7/C8 eleven-divergence shape running backwards.
//
//   2. A SUMMARY OF THE LEDGER NAMES EVERY ROW IN IT.
//      `docs/contracts/README.md` summarised C9 §7 as "(7.1–7.8) … eight
//      non-conformances" while §7 carried TWELVE. Four rows added by amendment
//      never reached the index, and the index is what a reader meets first.
//      Filed as `SUMMARY-LOSS-IS-DIRECTIONAL-01` REPRODUCING ITSELF ONE LAYER
//      IN — not as a separate README defect (operator ruling, CP-3b). The four
//      dropped were 7.9–7.12: the summary kept every row that UNDERSTATED our
//      implementation and lost the ones where we had OVERSTATED a defect in
//      SOMO's. Same direction as the measured 71%, with no boundary crossed —
//      A-9 committed by the ledger's own table of contents. Found by this
//      batch, red on arrival, fixed in the same PR.
//
// ── WHY IT LIVES HERE AND NOT BESIDE THE C9 PIN ─────────────────────────────
//   It spans C7, C8 and C9. `materialMasterRef.contract.test.ts` pins ONE
//   contract to ONE types module; this pins the package's ledger rows to the
//   tree. Keeping them separate keeps each one's failure message honest about
//   which thing broke.
//
// ── THE BYTES OF C9 ARE NOT TOUCHED BY THIS FILE ────────────────────────────
//   C9 is ratified and pinned at `f492b5c`. Everything here READS. Anything
//   that would require a C9 edit is deferred to the next amendment, which is a
//   new SHA and a new ratification.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

// DESCRIBE-DONT-RENDER-01, live and caught by its own subject. The two "nothing
// consumes this" sweeps below scan `src/**` for a symbol — and THIS FILE names
// those symbols in order to check for them, so on first run it reported itself
// as a consumer of the module it exists to prove has none. The class says a
// description can recreate its subject; here the description was a grep and the
// subject was the grep's own text. Excluded by path, deliberately and narrowly:
// a broader exclusion (all `*.test.ts`) would blind the sweep to a real
// consumer introduced in a test, which is where inert registry data acquires
// its first fake consumer.
const SELF = 'src/services/contracts/__tests__/ledgerTruth.test.ts';

/** Every `.ts`/`.tsx` file under `src/`, repo-relative, POSIX-separated. */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry)) out.push(full.slice(ROOT.length + 1).replace(/\\/g, '/'));
    }
  };
  walk(join(ROOT, 'src'));
  return out.filter((f) => f !== SELF);
}

/** Files under `src/` whose text names `symbol` — the derived "who consumes this". */
const sitesNaming = (symbol: string): string[] =>
  sourceFiles()
    .filter((f) => read(f).includes(symbol))
    .sort();

const C7 = read('docs', 'contracts', 'C7-pr-intake.md');
const C8 = read('docs', 'contracts', 'C8-forecast-publication.md');
const C9 = read('docs', 'contracts', 'C9-material-master-ref.md');
const PACKAGE_README = read('docs', 'contracts', 'README.md');

// ─── The ledger, DERIVED from the document rather than restated here ─────────
// CENSUS-MUST-DERIVE-01, applied to this file's own population: if the row ids
// were hand-listed below, a thirteenth row would be invisible to every check
// that follows — which is precisely the README defect, reproduced in the test
// written to catch it.

/** C9 §7 spans from its heading to the next `## ` heading. */
function c9LedgerSection(): string {
  const start = C9.indexOf('## 7. WHERE OUR IMPLEMENTATION CANNOT HONOUR');
  expect(start, 'C9 §7 — the non-conformance ledger — is missing').toBeGreaterThan(-1);
  const after = C9.indexOf('\n## ', start + 1);
  return C9.slice(start, after === -1 ? undefined : after);
}

/** Every `| **7.N** | states | ships |` row in §7, in document order. */
function c9LedgerRows(): { id: string; n: number; states: string; ships: string }[] {
  const rows: { id: string; n: number; states: string; ships: string }[] = [];
  for (const line of c9LedgerSection().split(/\r?\n/)) {
    const m = line.match(/^\|\s*\*\*(7\.(\d+))\*\*\s*\|(.*?)\|(.*?)\|\s*$/);
    if (m) rows.push({ id: m[1], n: Number(m[2]), states: m[3], ships: m[4] });
  }
  return rows;
}

describe('C9 §7 — the ledger is well-formed, and its shape is derived not assumed', () => {
  it('the ledger exists and every row carries BOTH halves of a divergence', () => {
    const rows = c9LedgerRows();
    // A row with one populated cell is a claim without its counter-claim, which
    // is the shape a divergence ledger cannot have.
    expect(rows.length).toBeGreaterThanOrEqual(12);
    for (const r of rows) {
      expect(r.states.trim().length, `${r.id}: "the contract states" is empty`).toBeGreaterThan(20);
      expect(r.ships.trim().length, `${r.id}: "what we actually ship" is empty`).toBeGreaterThan(20);
    }
  });

  it('row numbers are unique and contiguous from 7.1 — a gap is a deleted disclosure', () => {
    const ns = c9LedgerRows().map((r) => r.n);
    expect(new Set(ns).size, `duplicate row numbers in C9 §7: ${ns.join(', ')}`).toBe(ns.length);
    expect(ns).toEqual(Array.from({ length: ns.length }, (_, i) => i + 1));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE CODE-ANCHORED ROWS ARE STILL TRUE
//
// Each `it` reads the CLAIM from the contract first, then measures the TREE.
// Both assertions are load-bearing and they fail for opposite reasons:
//   · the document assertion fails when a disclosure is quietly dropped;
//   · the tree assertion fails when the divergence is repaired and the
//     document is left declaring a defect that no longer exists.
// Only rows whose subject is a NAMED SYMBOL are covered. Rows 7.5/7.6/7.8 and
// 7.9–7.12 are counts, section references, statements about a tree we cannot
// read, or records of retracted claims — none of them is derivable here, and
// asserting them on prose alone would be the false-positive machine this batch
// refused. That coverage boundary is stated, not silently taken.
// ─────────────────────────────────────────────────────────────────────────────

describe('C9 §7.1 — ZERO CONSUMERS: the types module is imported only by its own pins', () => {
  it('nothing outside the module’s test and its generator imports it', () => {
    expect(c9LedgerSection()).toContain('ZERO ROWS, ZERO CONSUMERS');

    const importers = sitesNaming('materialMasterRef.types').filter(
      (f) => !f.endsWith('materialMasterRef.types.ts'),
    );

    // The two permitted importers are both pins, not consumers: the contract
    // test and the field-list generator. A third name here means the module has
    // acquired a real consumer and §7.1 has become false.
    expect(importers).toEqual([
      'src/services/sdc/__tests__/deriveC9FieldList.ts',
      'src/services/sdc/__tests__/materialMasterRef.contract.test.ts',
    ]);
  });
});

describe('C9 §7.2 — NO POLICY ENGINE: MaterialRefJoinPolicy has no runtime consumer', () => {
  it('the type is declared in the module and consulted by no code path', () => {
    expect(c9LedgerSection()).toContain('policy engine');

    // Declaring it is the contract; reading it would be an engine. §7.2 says
    // there is no engine, so the declaration site must be the only site.
    expect(sitesNaming('MaterialRefJoinPolicy')).toEqual([
      'src/services/sdc/materialMasterRef.types.ts',
    ]);
  });
});

describe('C9 §7.3 — WE PARSE IT: the opacity clause is still in breach on our side', () => {
  it('inferBpom still derives a REGULATORY flag from a code prefix, and still fails open', () => {
    expect(c9LedgerSection()).toContain('WE PARSE IT');
    expect(C9).toContain('GRInspectionWizard.tsx:129-131');

    const wizard = read('src', 'components', 'v2-features', 'GRInspectionWizard.tsx');
    // The breach, as the contract describes it: a prefix test, and an
    // unrecognised prefix yielding `false` — "no check required".
    expect(wizard).toMatch(/const inferBpom = \(materialCode: string\): boolean =>/);
    expect(wizard).toMatch(/materialCode\.startsWith\('AI-'\) \|\| materialCode\.startsWith\('FR-'\)/);

    // Read the OTHER way round on purpose: if this ever goes green because
    // somebody fixed `inferBpom`, the failure message must say the CONTRACT is
    // now stale — not that the code regressed. D-COMP-BPOM is the gate; a fix
    // landing without it would itself be the finding.
    expect(
      wizard.includes("startsWith('AI-')"),
      'inferBpom no longer parses the prefix — C9 §7.3 and D-COMP-BPOM are now STALE and must be ' +
        'corrected at the next C9 amendment. This is a contract-truth failure, not a code defect.',
    ).toBe(true);
  });
});

describe('C9 §7.4 — RESERVED, NOT BUILT: substanceRef is absent from MaterialMasterEntry', () => {
  // The row at the centre of LEDGER-UNCOMPOSED-01. The composition failure it
  // was half of is NOT caught here and no pretence is made that it is; what is
  // caught is the row silently ceasing to be true in either direction.
  it('the field is not on the entry, and SubstanceRef is still a bare alias', () => {
    expect(c9LedgerSection()).toContain('substanceRef');

    const sdcTypes = read('src', 'services', 'sdc', 'types.ts');
    const entry = sdcTypes.slice(
      sdcTypes.indexOf('export interface MaterialMasterEntry'),
      sdcTypes.indexOf('export type MaterialMaster'),
    );
    expect(entry.length).toBeGreaterThan(0);
    expect(
      entry.includes('substanceRef'),
      'substanceRef has LANDED on MaterialMasterEntry — C9 §7.4 and §2.4 are now stale, and D-1’s ' +
        'escalation premise (§6.1a) has changed. This rides a C9 amendment, not a silent edit.',
    ).toBe(false);

    // The reserved half: the alias exists, carries no structure, and is
    // therefore capable of answering nothing (`ANSWER-ABOUT-NOTHING-01`).
    const refTypes = read('src', 'services', 'sdc', 'materialMasterRef.types.ts');
    expect(refTypes).toMatch(/export type SubstanceRef = string;/);
  });
});

describe('C7-FIND-03 — RESERVED AND NOT RESERVED: shortfall is absent from PrIntakeLine', () => {
  it('the defect is declared OPEN in C7 and the field is still not on the line', () => {
    expect(C7).toContain('C7-FIND-03');
    expect(C7).toContain('shortfall');

    const dataTypes = read('src', 'services', 'data', 'types.ts');
    const line = dataTypes.slice(
      dataTypes.indexOf('export interface PrIntakeLine'),
      dataTypes.indexOf('export interface PrIntakeLine') + 900,
    );
    expect(line).toContain('readonly suggestedQty');
    expect(
      line.includes('shortfall'),
      'shortfall has landed on PrIntakeLine — C7-FIND-03 is CLOSED and C7 §2.2 plus docs/findings.md ' +
        'must say so. A closed defect left OPEN in a contract misreports our position to SOMO.',
    ).toBe(false);
  });
});

describe('C8-FIND-03 — KNOWINGLY HELD: the VOID commitmentClass mapping is still in code', () => {
  it('C8 declares the mapping void and the code still carries it', () => {
    expect(C8).toContain('C8-FIND-03');
    expect(C8).toContain('VOID');

    // The divergence C8 §2.1 holds deliberately: the contract is authority, the
    // code lags until its booked batch. If the code is cleaned up, C8-FIND-03
    // stops being true and the contract must be corrected — the same direction
    // §7.3 guards, on a different contract.
    const sdcTypes = read('src', 'services', 'sdc', 'types.ts');
    expect(
      /FLAG-1[\s\S]{0,200}lock . firm/.test(sdcTypes),
      'the VOID lock→firm mapping is gone from sdc/types.ts — C8-FIND-03 is CLOSED and C8 §2.1 must ' +
        'be corrected. A contract declaring a divergence it no longer has is stale in the flattering ' +
        'direction, which is the one nobody audits.',
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE SUMMARY NAMES EVERY ROW IT SUMMARISES
//
// The package README is where a reader meets the ledger. It carried eight of
// twelve rows for two amendments. A summary that silently drops items reads as
// complete — the exact mechanism A-9 named one boundary out, and the reason
// `C9-required-fields.md` exists at all. This is that rule applied to the index
// that ships alongside it.
// ─────────────────────────────────────────────────────────────────────────────

describe('docs/contracts/README.md — the C9 §7 summary matches the ledger it summarises', () => {
  const summaryRow = (): string => {
    const row = PACKAGE_README.split(/\r?\n/).find((l) => /^\|\s*\*\*C9 §7/.test(l));
    expect(row, 'the package README no longer carries a C9 §7 summary row').toBeTruthy();
    return row as string;
  };

  it('the stated row range is the ledger’s actual range', () => {
    const rows = c9LedgerRows();
    const last = rows[rows.length - 1].id;
    // En dash, as the README writes it. The range is the reader's first signal
    // of how much ledger there is; understating it understates the exposure.
    expect(summaryRow()).toContain(`7.1–${last}`);
  });

  it('EVERY ledger row is named in the summary — no row is dropped by amendment', () => {
    const row = summaryRow();
    const missing = c9LedgerRows()
      .map((r) => r.id)
      .filter((id) => !new RegExp(`(?<![\\d.])${id.replace('.', '\\.')}(?![\\d])`).test(row));
    expect(
      missing,
      `C9 §7 rows present in the contract and absent from the README summary: ${missing.join(', ')}. ` +
        'Amendments add ledger rows; the index is where they go missing.',
    ).toEqual([]);
  });
});
