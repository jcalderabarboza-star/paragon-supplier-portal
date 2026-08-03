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

  it('the opacity clause names BOTH platforms’ prefix readers', () => {
    // The clause is worthless if it only binds the counterparty. Both violators
    // must be named, including ours.
    expect(CONTRACT).toContain('OPAQUE');
    expect(CONTRACT).toContain('inferBpom');
    expect(CONTRACT).toMatch(/explosion engine/);
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
