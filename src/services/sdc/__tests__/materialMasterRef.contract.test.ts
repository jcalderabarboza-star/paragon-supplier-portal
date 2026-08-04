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

import { deriveC9FieldListDoc, deriveInterfaces } from './deriveC9FieldList';
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

describe('C9 — AMENDMENT 2 (A-4): ADJUDICATED_UNRESOLVED is distinct from ABSENCE', () => {
  // The collision SOMO raised and the operator ruled in their favour: "absence is
  // unknown" says a doubtful row is not written; §4.2 requires a route on every
  // WRITABLE row; a row that is ABSENT CANNOT CARRY A ROUTE. The field added at
  // their request had nowhere to live. The resolution is that absence and
  // adjudicated-unresolved are DIFFERENT FACTS.

  it('the verdict exists in the vocabulary and is named in the contract', () => {
    expect(MATERIAL_REF_VERDICTS).toContain('ADJUDICATED_UNRESOLVED');
    expect(CONTRACT).toContain('ADJUDICATED_UNRESOLVED');
  });

  it('the no-UNKNOWN rule SURVIVES it — sharpened, not weakened', () => {
    // The whole risk of A-4 is that it reads as a back-door 'unknown'. It is not
    // one, and the property that says so is mechanical: no vocabulary member
    // anywhere contains UNKNOWN, so unknown remains unwritable and silence
    // remains the only way to express it.
    const all = [
      ...MATERIAL_GRAINS,
      ...MATERIAL_REF_VERDICTS,
      ...MATERIAL_REF_CONFIDENCES,
      ...ADJUDICATION_METHODS,
    ];
    expect(all.filter((v) => /UNKNOWN/i.test(v))).toEqual([]);
    // And the distinction that makes the new member honest has to be STATED, in
    // both places, or a reader meets a third verdict with no account of it.
    for (const src of [CONTRACT, TYPES_SRC]) {
      expect(src).toContain('ABSENCE MEANS NOBODY LOOKED');
      expect(src).toMatch(/LOSES THE MORE EXPENSIVE ONE/);
    }
  });

  it('an unresolved row asserts about the WORK, never about the correspondence', () => {
    // SOMO's generalisation off the reframing, adopted platform-wide on their
    // side. It is the sentence that resolved the collision, so it is carried
    // verbatim rather than paraphrased.
    for (const src of [CONTRACT, TYPES_SRC]) {
      expect(src).toContain('A RECORD OF WORK DONE IS NOT A CLAIM ABOUT THE THING WORKED ON');
    }
  });

  it('it can NEVER be joined on — unconditionally, not by confidence threshold', () => {
    // The failure this pin exists for: someone "fixes" joinability by lowering
    // minimumConfidence. That must not reach an unresolved row, because the row
    // asserts nothing to join.
    for (const src of [CONTRACT, TYPES_SRC]) {
      expect(src).toMatch(/NO (POLICY MAY EVER MAKE|CONSUMER MAY EVER JOIN)/);
    }
    expect(TYPES_SRC).toContain('unconditional');
  });
});

describe('C9 — AMENDMENT 2 (A-5/A-6): retirement is AUTHORSHIP, not a count', () => {
  // SOMO's check 2: they satisfy "holds one space" today ONLY VACUOUSLY, because
  // the counterpart space is empty — it holds precisely while the crosswalk has
  // no S/4 codes in it.

  it('their formulation is carried verbatim, because it is the reason the conclusion holds', () => {
    expect(CONTRACT).toContain(
      'A RETIREMENT CONDITION THAT HOLDS ONLY BEFORE THE CONTRACT DOES ANY WORK IS NOT A RETIREMENT CONDITION',
    );
  });

  it('the condition is stated as AUTHORSHIP in both places', () => {
    for (const src of [CONTRACT, TYPES_SRC]) {
      expect(src).toMatch(/AUTHOR EVERY SPACE THEY HOLD/);
    }
    // The count formulation is what A-5 replaced; if it comes back as the
    // operative condition the clause has silently regressed to housekeeping.
    expect(TYPES_SRC).toContain('NOT A COUNT');
  });

  it('A-6: canonical S/4 is OUR side, and is not a third space for SOMO', () => {
    for (const src of [CONTRACT, TYPES_SRC]) {
      expect(src).toMatch(/S\/4 IS NOT A THIRD SPACE/);
    }
  });
});

describe('C9 — AMENDMENT 2 (A-7/A-8): SOMO’s shape as MEASURED, not as generalised', () => {
  it('all three of their self-authored populations are named', () => {
    // Their earlier position said two. The correction runs AGAINST their earlier
    // statement and is theirs — which is why it is recorded rather than absorbed.
    for (const n of ['ROH+VERP', 'HALB', 'FERT']) {
      expect(CONTRACT, `SOMO population '${n}' is not named in C9`).toContain(n);
    }
  });

  it('disjointness is declared, not promised', () => {
    expect(CONTRACT).toContain('THEY CAN DECLARE THE COLLAPSE; THEY CANNOT PROMISE IT');
  });

  it('the discriminators are SPARSE, not absent — the earlier claim is corrected', () => {
    expect(CONTRACT).toMatch(/SPARSE AND UNSYSTEMATIC, NOT ABSENT/);
  });
});

describe('C9 — AMENDMENT 2 (A-9): the required-field list is DERIVED from the module', () => {
  // A counterparty ratifying a summary has not ratified the contract. The list is
  // generated from the types source so it cannot become a second summary.

  it('the committed list matches the rendering of the current shape', async () => {
    // Regenerate with `npx vitest run -u` when the shape changes on purpose.
    await expect(deriveC9FieldListDoc(TYPES_SRC)).toMatchFileSnapshot(
      '../../../../docs/contracts/C9-required-fields.md',
    );
  });

  it('EVERY field of EVERY interface reaches the list — derived on both sides', () => {
    // The bidirectional check. Generation alone would pass trivially if the
    // renderer dropped a field; this reads the interfaces independently and
    // requires each name in the committed file.
    const list = readFileSync(
      join(process.cwd(), 'docs', 'contracts', 'C9-required-fields.md'),
      'utf8',
    );
    const interfaces = deriveInterfaces(TYPES_SRC);
    expect(interfaces.length).toBeGreaterThanOrEqual(5);
    for (const iface of interfaces) {
      expect(list, `interface '${iface.name}' is missing from the derived list`).toContain(
        iface.name,
      );
      expect(iface.fields.length).toBeGreaterThan(0);
      for (const f of iface.fields) {
        expect(list, `${iface.name}.${f.name} is missing from the derived list`).toContain(
          `\`${f.name}\``,
        );
      }
    }
  });

  it('the list refuses to stand in for the contract', () => {
    const list = readFileSync(
      join(process.cwd(), 'docs', 'contracts', 'C9-required-fields.md'),
      'utf8',
    );
    expect(list).toContain('A COUNTERPARTY RATIFYING A SUMMARY HAS NOT RATIFIED THE CONTRACT');
    expect(list).toContain('C9-material-master-ref.md');
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
