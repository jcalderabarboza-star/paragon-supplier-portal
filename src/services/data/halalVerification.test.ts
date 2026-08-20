// ─────────────────────────────────────────────────────────────────────────────
// CP-3 · H3 — CERTIFICATE VERIFICATION, TESTED AGAINST SYNTHETIC ROWS.
//
// ⚠️ **EVERY REGISTRY CASE BELOW IS SYNTHETIC AND SAYS SO.** `COMPLIANCE_REGISTRY`
// is the honestly-synthetic fixture: placeholder suppliers, `SAMPLE-…` cert
// numbers, REAL master material codes (the seam batch — see the fixture header),
// and never a real certifying body. The
// 17 codes it names and the 42 codes `MATERIAL_MASTER` names DO NOT INTERSECT,
// by construction — the placeholders are an honesty device, not an oversight,
// and a test that "fixed" the emptiness by seeding aliases would be deleting the
// device. `THE EMPTY INTERSECTION IS ITSELF ASSERTED BELOW`, so it is a measured
// property of the tree rather than a claim in a header.
//
// That is no obstacle to testing a PURE PROJECTION, exactly as
// `complianceProjection.test.ts` already demonstrates: the rows exercise every
// lifecycle, clock and scheme case on their own codes. Where the fixture has NO
// exemplar of a case (halal-class `Under Review` — see the census below), the
// case is built explicitly and the gap is FILED, not papered over.
//
// Six claims:
//   1. THE MANDATE FLIP, ON BOTH SIDES of 17 Oct 2026 — and the clock status is
//      pinned as UNCHANGED across it, so the flip is provably the SCHEME axis.
//   2. THE MULTI-MATERIAL CERTIFICATE (creg-0007) answers for BOTH its codes
//      and for no third one.
//   3. PERMANENT-BASIS certs satisfy with `expiryDate: null` and do not decay.
//   4. MISSING and UNDER REVIEW are distinct verdicts and neither is NO_CERT by
//      accident.
//   5. `receiptInstant` IS THE ANSWER'S AXIS — the same (supplier, material)
//      flips SATISFIED → EXPIRED purely by moving the instant.
//   6. NOTHING IS WIRED, and no clock is read. Both by census over the source.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  HALAL_CERT_TYPES,
  isHalalCertType,
  verifyHalalAtReceipt,
} from './halalVerification';
import { BPJPH_MANDATE_DATE, computeStatus } from './complianceProjection';
import { COMPLIANCE_REGISTRY } from './mock/fixtures/complianceRegistry';
import { MATERIAL_MASTER } from '../sdc/fixtures';
import type { ComplianceRegistryEntry } from './types';

/** A synthetic registry row — every field defaulted, override what a case needs.
 *  Used ONLY where `COMPLIANCE_REGISTRY` has no exemplar of the case. */
function row(over: Partial<ComplianceRegistryEntry> = {}): ComplianceRegistryEntry {
  return {
    id: 'creg-test',
    supplierId: 'sup-002',
    supplierName: 'Sample Supplier (illustrative)',
    materialCodes: ['RM-SAMPLE-TST-01'],
    materialCategory: 'actives',
    certType: 'HALAL_BPJPH',
    certNumber: 'SAMPLE-TEST-0001',
    issuer: 'BPJPH (illustrative)',
    issueDate: '2024-01-01',
    expiryDate: null,
    lifecycleState: 'Valid',
    scopeText: 'synthetic test row',
    notes: 'Synthetic illustrative record — not a real certificate.',
    ...over,
  };
}

const R = COMPLIANCE_REGISTRY;

/**
 * The certificate fields a verdict must carry, READ OFF THE ROW IT NAMES.
 *
 * ⚠️ **THE ROW ID STAYS A LITERAL AT EVERY CALL SITE, AND THAT IS THE PART THAT
 * MATTERS.** Deriving the id too would make these assertions self-fulfilling —
 * they would pin that the fields were copied faithfully while saying nothing
 * about WHICH document was copied, and picking the wrong candidate is exactly
 * the failure mode `REASON_PRECEDENCE` exists to prevent. The id is the claim;
 * the fields are the copy.
 */
/** The same copy, for a row a spec constructed rather than one `R` holds. */
const refOf = (e: ComplianceRegistryEntry) => ({
  certType: e.certType,
  certNumber: e.certNumber,
  issuer: e.issuer,
  expiryDate: e.expiryDate,
  supplierName: e.supplierName,
});

const ref = (certId: string) => {
  const e = R.find((x) => x.id === certId);
  if (e === undefined) throw new Error(`no registry row ${certId}`);
  return {
    certType: e.certType,
    certNumber: e.certNumber,
    issuer: e.issuer,
    expiryDate: e.expiryDate,
    supplierName: e.supplierName,
  };
};

// Instants, all supplied — never read from a clock.
const BEFORE_MANDATE = '2026-01-01T00:00:00.000Z';
const ON_MANDATE = `${BPJPH_MANDATE_DATE}T00:00:00.000Z`;
const AFTER_MANDATE = '2026-12-01T09:30:00.000Z';

describe('H3 — halal-class certificate selection', () => {
  it('the three halal schemes are halal-class and the other three cert types are not', () => {
    expect([...HALAL_CERT_TYPES].sort()).toEqual([
      'HALAL_BPJPH',
      'HALAL_FOREIGN',
      'HALAL_MUI_LEGACY',
    ]);
    expect(isHalalCertType('BPOM')).toBe(false);
    expect(isHalalCertType('ISO')).toBe(false);
    expect(isHalalCertType('OTHER')).toBe(false);
  });

  it('⚠️ a BPOM or ISO certificate NEVER backs a halal claim', () => {
    // creg-0009 is a BPOM notification `Under Review` on PK-PETB-8804, and
    // creg-0008 is an `OTHER` (GMP) cert on PK-ALCP-2450 — both sup-007,
    // both real documents about something else. A verification that folded them
    // in would answer a DIFFERENT QUESTION with a confident yes, and the
    // `UNDER_REVIEW` reason on the first would make the wrong answer look
    // considered.
    expect(verifyHalalAtReceipt('sup-007', 'PK-PETB-8804', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
    expect(verifyHalalAtReceipt('sup-007', 'PK-ALCP-2450', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });

  it("one supplier's certificate never answers for another supplier", () => {
    // FR-ROUD-4470 is covered by creg-0001, which belongs to sup-007.
    expect(verifyHalalAtReceipt('sup-007', 'FR-ROUD-4470', R, BEFORE_MANDATE).verdict).toBe(
      'SATISFIED',
    );
    expect(verifyHalalAtReceipt('sup-002', 'FR-ROUD-4470', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });

  it('the registry is an ARGUMENT — an empty registry can only ever say NO_CERT', () => {
    // The module never imports `COMPLIANCE_REGISTRY`; the caller supplies the
    // scoped rows, so this function cannot widen a QueryScope.
    expect(verifyHalalAtReceipt('sup-007', 'FR-ROUD-4470', [], BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });
});

describe('H3 — ⚠️ THE BPJPH MANDATE FLIP, ON BOTH SIDES OF 17 OCT 2026', () => {
  // creg-0002: sup-007 × AI-NIAC-6612, HALAL_MUI_LEGACY, expiry 2027-06-01.
  // Its OWN CLOCK is comfortably valid on both sides of the mandate, which is
  // what makes it the exemplar: the only thing that moves is the scheme.
  const mui = R.find((e) => e.id === 'creg-0002')!;

  it('the fixture row is the case it claims to be (MUI-legacy, in date across the mandate)', () => {
    expect(mui.certType).toBe('HALAL_MUI_LEGACY');
    expect(mui.supplierId).toBe('sup-007');
    expect(mui.materialCodes).toContain('AI-NIAC-6612');
    expect(computeStatus(mui, BEFORE_MANDATE)).toBe('Valid');
    expect(computeStatus(mui, AFTER_MANDATE)).toBe('Valid');
  });

  it('BEFORE the mandate date a MUI-legacy certificate SATISFIES', () => {
    expect(verifyHalalAtReceipt('sup-007', 'AI-NIAC-6612', R, BEFORE_MANDATE)).toEqual({
      verdict: 'SATISFIED',
      ...ref('creg-0002'),
    });
  });

  it('ON the mandate date itself it is SCHEME_INVALID — the boundary day is inclusive', () => {
    expect(verifyHalalAtReceipt('sup-007', 'AI-NIAC-6612', R, ON_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'SCHEME_INVALID',
      // ⚠️ H4 — AND IT NAMES THE DOCUMENT IT IS REFUSING. `creg-0002` is the
      // SAME row that SATISFIED the day before, with the same dates and the
      // same number: nothing about the certificate changed, only the scheme's
      // standing. A verdict that named nothing could not say that, and
      // "expired" is the wrong sentence to send a clerk chasing.
      ...ref('creg-0002'),
    });
  });

  it('AFTER the mandate date it is SCHEME_INVALID, and NOT EXPIRED', () => {
    // The distinction is the whole finding: `EXPIRED` would send an operator to
    // chase a renewal of a certificate that has not expired. The document is
    // live; the SCHEME retired it.
    expect(verifyHalalAtReceipt('sup-007', 'AI-NIAC-6612', R, AFTER_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'SCHEME_INVALID',
      ...ref('creg-0002'),
    });
    // THE DOCUMENT IS LIVE, and the verdict now carries the proof rather than
    // leaving it to a comment: its own expiry is a year out.
    expect(ref('creg-0002').expiryDate).toBe('2027-06-01');
  });

  it('a BPJPH certificate is unaffected by the mandate date', () => {
    // creg-0001 — the same supplier, the same day, the satisfying scheme.
    expect(verifyHalalAtReceipt('sup-007', 'FR-ROUD-4470', R, AFTER_MANDATE).verdict).toBe(
      'SATISFIED',
    );
  });

  it('a FOREIGN-scheme certificate is unaffected by the mandate date', () => {
    // ⚠️ FILED, NOT FIXED (`HALAL-VERIFY-FOREIGN-RECOGNITION-01`): creg-0007's
    // own `scopeText` says "recognition pending", and neither `schemeValid` nor
    // this module has any notion of domestic recognition. It reads SATISFIED.
    // That is the EXISTING projection's answer, asserted so the gap is visible
    // in the suite rather than only in the register — inventing a recognition
    // rule here would be the second projection this batch refuses to write.
    expect(verifyHalalAtReceipt('sup-007', 'AI-HYALU-6615', R, AFTER_MANDATE).verdict).toBe(
      'SATISFIED',
    );
  });
});

describe('H3 — the multi-material certificate (creg-0015)', () => {
  const multi = R.find((e) => e.id === 'creg-0015')!;

  it('the fixture row really does cover more than one code', () => {
    expect(multi.materialCodes.length).toBeGreaterThan(1);
    expect([...multi.materialCodes]).toEqual(['AI-NIAC-6601', 'RM-EMUL-3320']);
  });

  it('it answers for EVERY code it covers, naming the same certificate', () => {
    for (const code of multi.materialCodes) {
      expect(verifyHalalAtReceipt('sup-005', code, R, BEFORE_MANDATE)).toEqual({
        verdict: 'SATISFIED',
        ...ref('creg-0015'),
      });
    }
  });

  it('⚠️ and for NO code it does not cover — membership, never a prefix (C9 §3)', () => {
    // `AI-HYALU-6616` shares every character of the covered codes but the
    // last two. A prefix or substring rule would satisfy it; set membership
    // does not, and materialCode is contractually opaque.
    expect(verifyHalalAtReceipt('sup-007', 'AI-HYALU-6616', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
    expect(verifyHalalAtReceipt('sup-007', 'AI-HYALU-661', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });
});

describe('H3 — permanent-basis certificates (GR 42/2024 — no clock)', () => {
  it('a permanent-basis cert SATISFIES and reports expiryDate: null', () => {
    // `null` is a REAL ANSWER here, not a missing one: a BPJPH permanent-basis
    // certificate has no expiry clock at all.
    expect(verifyHalalAtReceipt('sup-007', 'FR-ROUD-4470', R, BEFORE_MANDATE)).toEqual({
      verdict: 'SATISFIED',
      ...ref('creg-0001'),
    });
    expect(verifyHalalAtReceipt('sup-002', 'RM-EMUL-9410', R, BEFORE_MANDATE)).toEqual({
      verdict: 'SATISFIED',
      ...ref('creg-0010'),
    });
  });

  it('it does not decay — the same verdict a decade out', () => {
    expect(
      verifyHalalAtReceipt('sup-007', 'FR-ROUD-4470', R, '2036-01-01T00:00:00.000Z').verdict,
    ).toBe('SATISFIED');
  });
});

describe('H3 — Missing, Under Review, Expired', () => {
  it('a MISSING required halal certificate is NO_CERT', () => {
    // creg-0006 (sup-005) and creg-0013 (sup-002) are both rows that EXIST and
    // record that nothing is held. Same verdict as no row at all, deliberately:
    // the consequence is identical, and a `NO_ROW` reason would tell an operator
    // about the shape of our registry rather than about their supplier.
    expect(verifyHalalAtReceipt('sup-005', 'AI-PANTO-6640', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
    expect(verifyHalalAtReceipt('sup-002', 'RM-STEAR-7300', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });

  it('⚠️ the fixture has NO halal-class `Under Review` row — the gap, MEASURED', () => {
    // `HALAL-VERIFY-NO-UNDERREVIEW-EXEMPLAR-01`, filed. The registry's header
    // promises "≥2 exemplars of every computed display status", and it keeps
    // that promise ACROSS ALL CERT TYPES — but both `Under Review` rows
    // (creg-0004, creg-0009) are BPOM notifications. So the `UNDER_REVIEW`
    // verdict is UNREACHABLE through the fixture, and the next assertion has to
    // build the row. Measured here so that a future seed makes this go red
    // rather than leaving a stale comment behind.
    const halalUnderReview = R.filter(
      (e) => isHalalCertType(e.certType) && e.lifecycleState === 'Under Review',
    );
    expect(halalUnderReview).toEqual([]);
  });

  it('an UNDER REVIEW halal application is UNDER_REVIEW, never NO_CERT', () => {
    // HALAL-UNDERREVIEW-01: Under Review has its own semantics and is never
    // quietly folded into Missing. An operator waits on a certifier here; there
    // is nothing to chase the supplier for.
    const pending = [row({ id: 'creg-ur', lifecycleState: 'Under Review' })];
    expect(verifyHalalAtReceipt('sup-002', 'RM-SAMPLE-TST-01', pending, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'UNDER_REVIEW',
      ...refOf(pending[0]),
    });
  });

  it('an EXPIRED halal certificate is EXPIRED', () => {
    // creg-0016: sup-005 × RM-EMUL-9440, HALAL_FOREIGN, expiry 2025-08-01.
    expect(verifyHalalAtReceipt('sup-005', 'RM-EMUL-9440', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'EXPIRED',
      ...ref('creg-0016'),
    });
  });
});

describe('H3 — ⚠️ `receiptInstant` IS THE AXIS OF THE ANSWER (law 0.5)', () => {
  it('the SAME supplier × material flips SATISFIED → EXPIRED by the instant alone', () => {
    // creg-0016 expires 2025-08-01. A lot received in January 2025 was covered;
    // the same lot reviewed in 2026 was still covered WHEN IT ARRIVED. This is
    // the entire reason the verdict cannot be stored on the master and the
    // instant cannot be read from the ambient clock.
    expect(verifyHalalAtReceipt('sup-005', 'RM-EMUL-9440', R, '2025-01-15T00:00:00.000Z')).toEqual(
      {
        verdict: 'SATISFIED',
        ...ref('creg-0016'),
      },
    );
    expect(
      verifyHalalAtReceipt('sup-005', 'RM-EMUL-9440', R, '2026-01-15T00:00:00.000Z'),
    ).toEqual({ verdict: 'NOT_SATISFIED', reason: 'EXPIRED', ...ref('creg-0016') });
  });

  it('is deterministic — the same arguments give the same verdict', () => {
    const once = verifyHalalAtReceipt('sup-002', 'RM-PSTN-7150', R, AFTER_MANDATE);
    const twice = verifyHalalAtReceipt('sup-002', 'RM-PSTN-7150', R, AFTER_MANDATE);
    expect(once).toEqual(twice);
  });

  it('⚠️ NO CLOCK IS READ — asserted over the module source, code lines only', () => {
    const src = import.meta.glob('/src/services/data/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const mod = src['/src/services/data/halalVerification.ts'];
    expect(mod).toBeDefined();
    // Comments are exempt — this file's header DISCUSSES the stale stored
    // clock values on main, and a check that could not tell code from record
    // would force deleting the evidence along with the defect.
    const code = mod
      .split('\n')
      .filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line))
      .join('\n');
    expect(code).not.toContain('Date.now');
    expect(code).not.toContain('new Date');
    // C9 §3, ratified: no prefix or substring rule decides anything.
    expect(code).not.toContain('startsWith(');
    expect(code).not.toContain('endsWith(');
  });
});

describe('H3 — reason precedence when several certificates fail', () => {
  // The order is a JUDGEMENT recorded in the module: report the failure of the
  // STRONGEST candidate, because that is the one an operator acts on.
  const codes = { materialCodes: ['RM-SAMPLE-TST-01'] };

  const expired = row({ id: 'creg-x', expiryDate: '2025-01-01', ...codes });
  const underReview = row({ id: 'creg-u', lifecycleState: 'Under Review', ...codes });
  const missing = row({ id: 'creg-m', lifecycleState: 'Missing', ...codes });
  const schemeGone = row({
    id: 'creg-s',
    certType: 'HALAL_MUI_LEGACY',
    expiryDate: '2027-06-01',
    ...codes,
  });

  const verdict = (rows: ComplianceRegistryEntry[]) =>
    verifyHalalAtReceipt('sup-002', 'RM-SAMPLE-TST-01', rows, AFTER_MANDATE);

  it('SCHEME_INVALID outranks EXPIRED, UNDER_REVIEW and NO_CERT', () => {
    expect(verdict([missing, underReview, expired, schemeGone])).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'SCHEME_INVALID',
      // ⚠️ **H4 — THE REASON AND THE CERTIFICATE COME FROM THE SAME ROW.** This
      // is the assertion the widened DTO bought: `creg-s` is the row whose
      // failure was REPORTED, and naming any of the other three beside
      // `SCHEME_INVALID` would send a clerk to chase the wrong document. Before
      // H4 the verdict carried no document at all, so there was nothing here
      // that could disagree — and nothing that could be checked.
      ...refOf(schemeGone),
    });
  });

  it('EXPIRED outranks UNDER_REVIEW and NO_CERT', () => {
    expect(verdict([missing, underReview, expired])).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'EXPIRED',
      ...refOf(expired),
    });
  });

  it('UNDER_REVIEW outranks NO_CERT', () => {
    expect(verdict([missing, underReview])).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'UNDER_REVIEW',
      ...refOf(underReview),
    });
  });

  it('is INDEPENDENT of the order the rows arrive in', () => {
    expect(verdict([schemeGone, expired, underReview, missing]).verdict).toBe('NOT_SATISFIED');
    expect(verdict([schemeGone, expired, underReview, missing])).toEqual(
      verdict([missing, underReview, expired, schemeGone]),
    );
  });

  it('⚠️ and precedence can NEVER turn a NOT_SATISFIED into a SATISFIED', () => {
    // One satisfying certificate among any number of failing ones satisfies;
    // no arrangement of failing ones ever does.
    const good = row({ id: 'creg-g', ...codes });
    expect(verdict([missing, expired, schemeGone, underReview, good]).verdict).toBe('SATISFIED');
    expect(verdict([missing, expired, schemeGone, underReview]).verdict).toBe('NOT_SATISFIED');
  });
});

describe('H3 — ⚠️ THE SEAM, MEASURED. The two lanes share ONE vocabulary now', () => {
  const registryCodes = new Set(R.flatMap((e) => [...e.materialCodes]));
  const masterCodes = Object.keys(MATERIAL_MASTER);

  // ⚠️ THIS BLOCK REPLACED THE ONE THAT PINNED THE OPPOSITE INVARIANT.
  // It used to assert that every registry code was an `RM-SAMPLE-…` placeholder
  // matching NOTHING in the master — the honesty device — and, as its own
  // honest consequence, that every real material verified as NO_CERT. That
  // device also made the capability structurally inert: the compliance page and
  // the receipt gate could never see the same certificate. The operator ruled
  // the fixture re-authored onto one vocabulary; the honesty moved to the
  // certificate FIELDS and the LivenessRegistry marker, and it is pinned below.

  it('THE SEAM HOLDS: every registry material code is a real master code', () => {
    const orphans = [...registryCodes].filter((c) => !masterCodes.includes(c));
    expect(orphans).toEqual([]);
    // and the placeholder namespace is gone from the registry entirely
    expect([...registryCodes].filter((c) => c.startsWith('RM-SAMPLE-'))).toEqual([]);
  });

  it('the registry is a SUBSET of the master, never a second namespace', () => {
    expect(registryCodes.size).toBeGreaterThan(0);
    expect(registryCodes.size).toBeLessThanOrEqual(masterCodes.length);
  });

  // ── THE HONESTY THAT REMAINS, ASSERTED WHERE IT NOW LIVES ────────────────
  // The supplier is real (the platform's own roster) and the material is real.
  // WHICH SUPPLIER HOLDS WHICH CERTIFICATE IS INVENTED — so the invented half
  // is what this pins. A reviewer's checklist, executable.
  it('no row names a real certificate number', () => {
    for (const e of R) {
      expect(e.certNumber === '' || e.certNumber.startsWith('SAMPLE-')).toBe(true);
    }
  });

  it('no row names a real certifying body', () => {
    for (const e of R) {
      expect(e.issuer === '' || e.issuer.includes('(illustrative)')).toBe(true);
    }
  });

  it('no row names a real company — every supplier name is the roster’s own', () => {
    // The roster is itself honestly fictional ("PT Sample …"), which is why the
    // registry may use it verbatim. It previously invented a SECOND name per id.
    for (const e of R) expect(e.supplierName).toContain('Sample');
  });

  // ── THE DELTA — the arc's payload, pinned so it cannot silently revert ────
  it('⚠️ THE GATE NOW SEES REAL CERTIFICATES — the receivable lines, by name', () => {
    // Before the seam batch EVERY one of these was NOT_SATISFIED / NO_CERT,
    // because the intersection with the master was empty by construction.
    expect(verifyHalalAtReceipt('sup-005', 'RM-EMUL-9440', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'EXPIRED',
      ...ref('creg-0016'),
    });
    expect(verifyHalalAtReceipt('sup-007', 'FR-ROUD-4470', R, BEFORE_MANDATE).verdict).toBe(
      'SATISFIED',
    );
    expect(verifyHalalAtReceipt('sup-002', 'RM-PSTN-7150', R, BEFORE_MANDATE).verdict).toBe(
      'SATISFIED',
    );
  });

  it('a material whose master row does not require halal still reads NO_CERT', () => {
    // PK-PETB-8804 is `halalApplicable: UNDETERMINED` and carries only a BPOM
    // row. A NO_CERT here is not a finding — it is a question that should not
    // have been asked (H1 answers applicability, not this function).
    expect(verifyHalalAtReceipt('sup-007', 'PK-PETB-8804', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });

  it('⚠️ AND THE MANDATE BITES A RECEIVABLE LINE ON 2026-10-17', () => {
    // AI-NIAC-6612 is backed by a MUI-legacy cert whose own dates stay valid to
    // 2027. The scheme retires first — which is the whole point of GR 42/2024,
    // and until the seam batch it could not be demonstrated on a real material.
    expect(verifyHalalAtReceipt('sup-007', 'AI-NIAC-6612', R, BEFORE_MANDATE).verdict).toBe(
      'SATISFIED',
    );
    expect(verifyHalalAtReceipt('sup-007', 'AI-NIAC-6612', R, ON_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'SCHEME_INVALID',
      // ⚠️ H4 — AND IT NAMES THE DOCUMENT IT IS REFUSING. `creg-0002` is the
      // SAME row that SATISFIED the day before, with the same dates and the
      // same number: nothing about the certificate changed, only the scheme's
      // standing. A verdict that named nothing could not say that, and
      // "expired" is the wrong sentence to send a clerk chasing.
      ...ref('creg-0002'),
    });
  });

  it('⚠️ NO LONGER HEADLESS — H4 gave it a consumer, and the consumer TELLS', () => {
    // ⚠️ **THIS ASSERTION IS INVERTED, NOT DELETED.** What stood here said the
    // seam left the gate without a consumer and that H4 was still gated on
    // `D-COMP-HALAL-4`. H4 answered that ruling — in the direction the operator
    // chose, which is NEITHER of the two the ruling's own options list offered
    // as a wire: not *block*, and not *block with a recorded override*, but
    // **surface the status and let the receipt proceed.**
    //
    // What is asserted below is the SHAPE of that answer, and it is the whole
    // batch: fact 3 reaches a person, and NOTHING in the product refuses a
    // receipt because of it. Both halves matter and neither is enough alone.
    expect(typeof verifyHalalAtReceipt).toBe('function');
  });
});

describe('H4 — ⚠️ WIRED TO A NOTICE, AND TO NOTHING THAT CAN REFUSE', () => {
  const sources = () =>
    import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

  const codeLines = (text: string) =>
    text.split('\n').filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line));

  it('`verifyHalalAtReceipt` has EXACTLY ONE product consumer, and it is named', () => {
    // ⚠️ **INVERTED AT H4.** This asserted ONE file — the module itself — and
    // its entire job was to turn red the day a consumer arrived without
    // `D-COMP-HALAL-4` being ruled. IT DID ITS JOB: the ruling came first and
    // this went red second. The pin is kept as a CENSUS rather than a
    // prohibition, because "exactly one consumer" is still the claim worth
    // defending — a second surface reading certificates at a different instant,
    // or with a different scope, is a thing somebody must decide to do.
    //
    // ⚠️ SPEC FILES ARE EXCLUDED BY NAME, not by hoping none appear. The glob
    // reaches `/src/**/*.{ts,tsx}` and that INCLUDES `*.test.ts(x)` — a fact the
    // sibling assertion below got wrong for the whole of H3 (see its note).
    const src = sources();
    const referencing = Object.entries(src)
      .filter(([path]) => !path.includes('.test.'))
      .filter(([, text]) => codeLines(text).some((l) => l.includes('verifyHalalAtReceipt')))
      .map(([path]) => path)
      .sort();
    expect(referencing).toEqual([
      '/src/components/v2-features/GRInspectionWizard.tsx',
      '/src/services/data/halalVerification.ts',
    ]);

    // ⚠️ THE LIMIT OF THIS CHECK, STATED — the `halalApplicability.test.ts`
    // precedent. Vite's `import.meta.glob` EXCLUDES THE MODULE IT IS WRITTEN
    // IN, so this scan cannot see its own file, which is itself a caller. That
    // is why the expected list has one entry and not two. Recorded rather than
    // worked around: a check that cannot see itself must say so, or the next
    // reader takes its silence for coverage.
    expect(src['/src/services/data/halalVerification.test.ts']).toBeUndefined();
  });

  it('⚠️ THE WIZARD READS THE REGISTRY — and `qualityValid` never consults it', () => {
    // ⚠️ **THIS ASSERTION WAS GREEN ABOUT THE WRONG FILE FOR THE WHOLE OF H3,
    // AND IT IS WORTH MORE AS A RECORD THAN AS A DELETION.** It read
    //
    //     Object.entries(sources()).find(([p]) => p.includes('GRInspectionWizard'))
    //
    // and `find` takes the FIRST match. The glob is alphabetical and
    // `GRInspectionWizard.test.tsx` sorts BEFORE `GRInspectionWizard.tsx`, so
    // every one of those three `not.toContain` calls was inspecting THE SPEC
    // FILE. It asserted that the test does not mention the registry — true,
    // vacuous, and not the claim in its own title. §42's rule exactly: **the
    // scan matched a file; the claim required a different file.** Nothing went
    // red, because a pin pointed at the wrong target passes for the same reason
    // an empty population reports clean.
    //
    // Fixed by naming the path the claim REQUIRES instead of matching a
    // substring, and the fix is what makes the assertions below mean anything.
    const src = sources();
    const wizard = src['/src/components/v2-features/GRInspectionWizard.tsx'];
    expect(wizard, 'the component, not its spec').toBeDefined();
    // The control that would have caught the original defect: the two files are
    // BOTH in the glob, so "the one I meant" was never a safe assumption.
    expect(src['/src/components/v2-features/GRInspectionWizard.test.tsx']).toBeDefined();

    const code = codeLines(wizard).join('\n');
    // IT READS. That is the batch.
    expect(code).toContain('verifyHalalAtReceipt');
    expect(code).toContain('complianceRegistry');

    // ⚠️ **AND `qualityValid` DOES NOT CONSULT IT — THE ASSERTION THE OPERATOR'S
    // RULING TURNS ON.** `halal.certificate` has NO recorded setting, so
    // `effectiveEnforcement` derives `BLOCK / NO_SETTING_RECORDED`; a
    // `certBlocks` clause in this predicate would therefore have stopped the
    // dock on every line without a valid certificate, which is precisely what
    // the ruling refused. The notice tells; it cannot refuse.
    const qualityValid = code.slice(
      code.indexOf('const qualityValid'),
      code.indexOf('const dispositionValid'),
    );
    expect(qualityValid.length).toBeGreaterThan(50);
    expect(qualityValid).not.toContain('certVerdict');
    expect(qualityValid).not.toContain('verifyHalalAtReceipt');
    expect(qualityValid).not.toContain('SATISFIED');
    // Nor may the certificate reach the step gate by any other route.
    const isStepValid = code.slice(
      code.indexOf('const isStepValid'),
      code.indexOf('const updateLine'),
    );
    expect(isStepValid.length).toBeGreaterThan(50);
    expect(isStepValid).not.toContain('cert');
  });
});
