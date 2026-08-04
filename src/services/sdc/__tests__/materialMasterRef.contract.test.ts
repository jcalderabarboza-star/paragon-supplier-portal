// ─────────────────────────────────────────────────────────────────────────────
// CP-2 — `material_master_ref`: THE CONTRACT AND THE CODE ARE PINNED TOGETHER.
//
// ── WHY THIS TEST EXISTS ────────────────────────────────────────────────────
//   A CP-1 audit found ELEVEN doc-vs-code divergences across C7 and C8, and
//   every one ran the SAME DIRECTION — the documents understated the
//   implementation. Eleven errors sharing a direction are one systematic cause,
//   not eleven drafting mistakes, and the cause was named: contracts are
//   generated once by harvest and never re-harvested, and NO BUILD STEP FAILS
//   WHEN A CONTRACT STATEMENT STOPS BEING TRUE. Documents are not on the floor,
//   so they cannot regress a test.
//
//   This file puts one contract on the floor. It does not check prose — prose is
//   not mechanically checkable and pretending otherwise would be its own
//   dishonesty. It checks the part that IS the contract: THE CLOSED
//   VOCABULARIES. If someone adds a third grain, renames a verdict, or quietly
//   drops the `SIMULATED`-evidence invariant from the document, this fails.
//
// ── THE DIRECTION MATTERS (COMMENT-AS-CONTRACT-01, inverted) ────────────────
//   That class named the hazard of code comments silently AMENDING a ratified
//   contract with no review gate. Here the DOCUMENT IS AUTHORITY and the code is
//   pinned to it — the same coupling, running the safe way round. A failure here
//   means the TYPES are wrong until the document says otherwise.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ADJUDICATION_METHODS,
  MATERIAL_GRAINS,
  MATERIAL_REF_CONFIDENCES,
  MATERIAL_REF_PARTIES,
  MATERIAL_REF_VERDICTS,
} from '../materialMasterRef.types';

const CONTRACT = readFileSync(
  join(process.cwd(), 'docs', 'contracts', 'C9-material-master-ref.md'),
  'utf8',
);

const TYPES_SRC = readFileSync(
  join(process.cwd(), 'src', 'services', 'sdc', 'materialMasterRef.types.ts'),
  'utf8',
);

describe('C9 — the contract document exists and is reachable from the code', () => {
  it('the document is present and names the types module', () => {
    expect(CONTRACT.length).toBeGreaterThan(2000);
    expect(CONTRACT).toContain('src/services/sdc/materialMasterRef.types.ts');
  });

  it('the types module defers to the document as authority', () => {
    // The one-way relationship, asserted rather than assumed: if this line is
    // ever softened, the code has started claiming co-authority.
    expect(TYPES_SRC).toContain('THIS FILE IS NOT THE CONTRACT');
    expect(TYPES_SRC).toContain('THE DOCUMENT WINS');
  });
});

describe('C9 — every closed vocabulary appears in the document', () => {
  // The contract's normative content. A union member the document does not name
  // is a shape the counterparty was never shown.
  const vocabularies: readonly [string, readonly string[]][] = [
    ['grain', MATERIAL_GRAINS],
    ['verdict', MATERIAL_REF_VERDICTS],
    ['confidence', MATERIAL_REF_CONFIDENCES],
    ['adjudication method', ADJUDICATION_METHODS],
    ['party', MATERIAL_REF_PARTIES],
  ];

  for (const [name, members] of vocabularies) {
    it(`${name}: ${members.join(' | ')}`, () => {
      for (const m of members) {
        expect(CONTRACT, `${name} member '${m}' is not named in C9`).toContain(m);
      }
    });
  }

  it('grain is exactly two members — the axis D-1 rules on', () => {
    // Not a style check. A third grain would mean the substance/specification
    // dichotomy the whole irreversibility argument rests on has moved, and that
    // is a re-ratification, not a refactor.
    expect(MATERIAL_GRAINS).toEqual(['substance', 'specification']);
  });
});

describe('C9 — the honesty invariants are stated in BOTH places', () => {
  it('ABSENCE IS UNKNOWN: no UNKNOWN member exists in any vocabulary', () => {
    const all = [
      ...MATERIAL_GRAINS,
      ...MATERIAL_REF_VERDICTS,
      ...MATERIAL_REF_CONFIDENCES,
      ...ADJUDICATION_METHODS,
    ];
    // The property that lets an empty map be an honest map: unknown is not
    // writable, so silence is the only way to express it and cannot be confused
    // with an assertion.
    expect(all.filter((v) => /UNKNOWN/i.test(v))).toEqual([]);
    expect(CONTRACT).toMatch(/ABSENCE IS UNKNOWN/);
  });

  it('adoption-is-not-discovery is carried as a structural rule, not a slogan', () => {
    expect(CONTRACT).toMatch(/ADOPTION IS NOT DISCOVERY/);
    // The two invariants that make it structural rather than aspirational.
    expect(CONTRACT).toContain('MUST NOT');
    expect(CONTRACT).toContain('allowSimulatedEvidence');
    expect(TYPES_SRC).toContain('evidenceLiveness');
    expect(TYPES_SRC).toContain('sourceOfTruth');
  });

  it('the opacity clause names OUR prefix reader, and marks the counterparty’s position as MEASURED', () => {
    // The clause is worthless if it only binds the counterparty, so ours must be
    // named — that part is unchanged from the first issue.
    expect(CONTRACT).toContain('OPAQUE');
    expect(CONTRACT).toContain('inferBpom');
    // A-3. The first issue ALSO named theirs, and that claim was measured false:
    // no material-code prefix is parsed in SOMO's production. The correction has
    // to survive, because the convenient reading — "both of us do it" — is the
    // one that makes the clause comfortable to propose.
    expect(CONTRACT).toContain('No material-code prefix is parsed');
    expect(CONTRACT).toContain('PREVENTATIVE');
    expect(CONTRACT).toContain('CORRECTIVE');
  });

  it('the non-conformance ledger exists and is non-trivial', () => {
    // The anti-twelfth-divergence section. A contract document in this repo is
    // not allowed to ship without stating where the implementation falls short
    // of it — that omission is the exact defect C7/C8 were corrected for.
    expect(CONTRACT).toMatch(/WHERE OUR IMPLEMENTATION CANNOT HONOUR/);
    const section = CONTRACT.slice(CONTRACT.indexOf('WHERE OUR IMPLEMENTATION CANNOT HONOUR'));
    // Each numbered non-conformance is a table row; require the ones that are
    // load-bearing rather than counting rows loosely.
    for (const claim of ['ZERO ROWS', 'WE PARSE IT', 'substanceRef', 'policy engine']) {
      expect(section, `non-conformance '${claim}' is missing`).toContain(claim);
    }
  });
});

describe('C9 — AMENDMENT 1 (A-1): spaceId retirement is stated PER PARTY', () => {
  // The defect SOMO's own check found in OUR clause. The first issue said the
  // field is dropped "when both sides hold one space each" — which reads as a
  // shared tidying task and is not one: our second space is the document lane
  // (ours to collapse, at B2b); theirs is canonical S/4, which THEY do not own
  // either. A joint exit condition only one party can reach is not a condition.

  it('the consequence is stated plainly, not implied away', () => {
    expect(CONTRACT).toContain('EXIT DEPENDS ON A SYSTEM NEITHER PARTY CONTROLS');
    expect(TYPES_SRC).toContain('NEVER RETIRES');
  });

  it('BOTH parties’ conditions are named, and they are different mechanisms', () => {
    // If either half goes missing the clause silently re-acquires the false
    // symmetry — the exact regression this pin exists for.
    for (const src of [CONTRACT, TYPES_SRC]) {
      expect(src).toMatch(/S\/4 WIRE/); // theirs — a programme neither party owns
      expect(src).toMatch(/B2b/); // ours — our own tidying, on our own schedule
    }
    expect(TYPES_SRC).toContain('RETIREMENT IS PER PARTY');
  });

  it('the field is declared PERMANENT, so nobody builds around it as scaffolding', () => {
    expect(CONTRACT).toMatch(/PERMANENT, not transitional/);
  });
});

describe('C9 — AMENDMENT 2 (A-2): an unresolved row carries its ROUTE TO RESOLUTION', () => {
  // SOMO's refinement, accepted: an unresolved row beats a confident wrong
  // answer ONLY if it carries its candidate, its evidence, AND its route to
  // resolution. The first issue carried two of three. Two of three is the shrug.

  it('the refinement is quoted in both places, not paraphrased into a slogan', () => {
    expect(CONTRACT).toContain('AN UNRESOLVED ROW BEATS A CONFIDENT WRONG ANSWER');
    expect(CONTRACT).toContain('SHRUG WITH BETTER MANNERS');
    expect(TYPES_SRC).toContain('SHRUG WITH BETTER MANNERS');
  });

  it('routeToResolution is REQUIRED — optionality is how the field would fail', () => {
    // An optional route is omitted on exactly the doubtful rows it exists for
    // and filled in on the confident ones. It follows `sourceOfTruth`: required,
    // with a truthful value permitted to be an admission.
    expect(TYPES_SRC).toMatch(/readonly routeToResolution: string;/);
    expect(TYPES_SRC).not.toMatch(/routeToResolution\?/);
    expect(CONTRACT).toContain('routeToResolution');
  });

  it('it is bounded to a resolution MECHANISM — not a second notes column', () => {
    // The dispatch's explicit constraint on this amendment.
    expect(CONTRACT).toContain('NOT A NOTES COLUMN');
    expect(TYPES_SRC).toContain('NOT A NOTES COLUMN');
    // `note` still exists and is still the optional free-text field, so the
    // boundary has somewhere to point.
    expect(TYPES_SRC).toMatch(/readonly note\?: string;/);
  });

  it('EVERY provenance field is documented in the contract — DERIVED, not hand-listed', () => {
    // CENSUS-MUST-DERIVE-01 applied to the pin itself: read the field names out
    // of the interface rather than restating them here, so a field added to the
    // shape without reaching the document fails this test by construction. A
    // hand-written list would have agreed with whoever wrote it.
    const block = TYPES_SRC.slice(
      TYPES_SRC.indexOf('export interface AdjudicationProvenance'),
    ).split('}')[0];
    const fields = [...block.matchAll(/readonly (\w+)\??:/g)].map((m) => m[1]);

    expect(fields).toContain('routeToResolution');
    expect(fields.length).toBeGreaterThanOrEqual(6);
    for (const f of fields) {
      expect(CONTRACT, `provenance field '${f}' is not documented in C9`).toContain(f);
    }
  });
});

describe('C9 — the crosswalk is EMPTY at freeze, by ruling', () => {
  it('the types module publishes no rows', async () => {
    // "An empty map is an honest map." If a future batch populates the crosswalk
    // here rather than in its own adopted, provenance-bearing fixture, this
    // catches it — populating is CP-2 · B2b's business and it is blocked.
    const mod: Record<string, unknown> = await import('../materialMasterRef.types');
    const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v));
    // The only exported arrays are the closed vocabularies above — never data.
    expect(arrays.map(([k]) => k).sort()).toEqual([
      'ADJUDICATION_METHODS',
      'MATERIAL_GRAINS',
      'MATERIAL_REF_CONFIDENCES',
      'MATERIAL_REF_PARTIES',
      'MATERIAL_REF_VERDICTS',
    ]);
  });
});
