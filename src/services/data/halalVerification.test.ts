// ─────────────────────────────────────────────────────────────────────────────
// CP-3 · H3 — CERTIFICATE VERIFICATION, TESTED AGAINST SYNTHETIC ROWS.
//
// ⚠️ **EVERY REGISTRY CASE BELOW IS SYNTHETIC AND SAYS SO.** `COMPLIANCE_REGISTRY`
// is the honestly-synthetic fixture: placeholder suppliers, `SAMPLE-…` cert
// numbers, `RM-SAMPLE-…` material codes, and never a real certifying body. The
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
    certBasis: 'permanent',
    lifecycleState: 'Valid',
    requiredForHalalBrands: true,
    scopeText: 'synthetic test row',
    notes: 'Synthetic illustrative record — not a real certificate.',
    ...over,
  };
}

const R = COMPLIANCE_REGISTRY;

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
    // creg-0009 is a BPOM notification `Under Review` on RM-SAMPLE-ACT-07, and
    // creg-0008 is an `OTHER` (GMP) cert on RM-SAMPLE-OTH-01 — both sup-007,
    // both real documents about something else. A verification that folded them
    // in would answer a DIFFERENT QUESTION with a confident yes, and the
    // `UNDER_REVIEW` reason on the first would make the wrong answer look
    // considered.
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-ACT-07', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-OTH-01', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });

  it("one supplier's certificate never answers for another supplier", () => {
    // RM-SAMPLE-FRG-01 is covered by creg-0001, which belongs to sup-007.
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-FRG-01', R, BEFORE_MANDATE).verdict).toBe(
      'SATISFIED',
    );
    expect(verifyHalalAtReceipt('sup-002', 'RM-SAMPLE-FRG-01', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });

  it('the registry is an ARGUMENT — an empty registry can only ever say NO_CERT', () => {
    // The module never imports `COMPLIANCE_REGISTRY`; the caller supplies the
    // scoped rows, so this function cannot widen a QueryScope.
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-FRG-01', [], BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });
});

describe('H3 — ⚠️ THE BPJPH MANDATE FLIP, ON BOTH SIDES OF 17 OCT 2026', () => {
  // creg-0002: sup-007 × RM-SAMPLE-FRG-02, HALAL_MUI_LEGACY, expiry 2027-06-01.
  // Its OWN CLOCK is comfortably valid on both sides of the mandate, which is
  // what makes it the exemplar: the only thing that moves is the scheme.
  const mui = R.find((e) => e.id === 'creg-0002')!;

  it('the fixture row is the case it claims to be (MUI-legacy, in date across the mandate)', () => {
    expect(mui.certType).toBe('HALAL_MUI_LEGACY');
    expect(mui.supplierId).toBe('sup-007');
    expect(mui.materialCodes).toContain('RM-SAMPLE-FRG-02');
    expect(computeStatus(mui, BEFORE_MANDATE)).toBe('Valid');
    expect(computeStatus(mui, AFTER_MANDATE)).toBe('Valid');
  });

  it('BEFORE the mandate date a MUI-legacy certificate SATISFIES', () => {
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-FRG-02', R, BEFORE_MANDATE)).toEqual({
      verdict: 'SATISFIED',
      certId: 'creg-0002',
      certType: 'HALAL_MUI_LEGACY',
      expiryDate: '2027-06-01',
    });
  });

  it('ON the mandate date itself it is SCHEME_INVALID — the boundary day is inclusive', () => {
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-FRG-02', R, ON_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'SCHEME_INVALID',
    });
  });

  it('AFTER the mandate date it is SCHEME_INVALID, and NOT EXPIRED', () => {
    // The distinction is the whole finding: `EXPIRED` would send an operator to
    // chase a renewal of a certificate that has not expired. The document is
    // live; the SCHEME retired it.
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-FRG-02', R, AFTER_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'SCHEME_INVALID',
    });
  });

  it('a BPJPH certificate is unaffected by the mandate date', () => {
    // creg-0001 — the same supplier, the same day, the satisfying scheme.
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-FRG-01', R, AFTER_MANDATE).verdict).toBe(
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
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-BOT-01', R, AFTER_MANDATE).verdict).toBe(
      'SATISFIED',
    );
  });
});

describe('H3 — the multi-material certificate (creg-0007)', () => {
  const multi = R.find((e) => e.id === 'creg-0007')!;

  it('the fixture row really does cover more than one code', () => {
    expect(multi.materialCodes.length).toBeGreaterThan(1);
    expect([...multi.materialCodes]).toEqual(['RM-SAMPLE-BOT-01', 'RM-SAMPLE-BOT-02']);
  });

  it('it answers for EVERY code it covers, naming the same certificate', () => {
    for (const code of multi.materialCodes) {
      expect(verifyHalalAtReceipt('sup-007', code, R, BEFORE_MANDATE)).toEqual({
        verdict: 'SATISFIED',
        certId: 'creg-0007',
        certType: 'HALAL_FOREIGN',
        expiryDate: '2028-03-01',
      });
    }
  });

  it('⚠️ and for NO code it does not cover — membership, never a prefix (C9 §3)', () => {
    // `RM-SAMPLE-BOT-03` shares every character of the covered codes but the
    // last two. A prefix or substring rule would satisfy it; set membership
    // does not, and materialCode is contractually opaque.
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-BOT-03', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-BOT', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
  });
});

describe('H3 — permanent-basis certificates (GR 42/2024 — no clock)', () => {
  it('a permanent-basis cert SATISFIES and reports expiryDate: null', () => {
    // `null` is a REAL ANSWER here, not a missing one: a BPJPH permanent-basis
    // certificate has no expiry clock at all.
    expect(verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-FRG-01', R, BEFORE_MANDATE)).toEqual({
      verdict: 'SATISFIED',
      certId: 'creg-0001',
      certType: 'HALAL_BPJPH',
      expiryDate: null,
    });
    expect(verifyHalalAtReceipt('sup-002', 'RM-SAMPLE-EMU-10', R, BEFORE_MANDATE)).toEqual({
      verdict: 'SATISFIED',
      certId: 'creg-0010',
      certType: 'HALAL_BPJPH',
      expiryDate: null,
    });
  });

  it('it does not decay — the same verdict a decade out', () => {
    expect(
      verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-FRG-01', R, '2036-01-01T00:00:00.000Z').verdict,
    ).toBe('SATISFIED');
  });
});

describe('H3 — Missing, Under Review, Expired', () => {
  it('a MISSING required halal certificate is NO_CERT', () => {
    // creg-0006 (sup-005) and creg-0013 (sup-002) are both rows that EXIST and
    // record that nothing is held. Same verdict as no row at all, deliberately:
    // the consequence is identical, and a `NO_ROW` reason would tell an operator
    // about the shape of our registry rather than about their supplier.
    expect(verifyHalalAtReceipt('sup-005', 'RM-SAMPLE-ACT-02', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'NO_CERT',
    });
    expect(verifyHalalAtReceipt('sup-002', 'RM-SAMPLE-ACT-13', R, BEFORE_MANDATE)).toEqual({
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
    });
  });

  it('an EXPIRED halal certificate is EXPIRED', () => {
    // creg-0016: sup-005 × RM-SAMPLE-FRG-16, HALAL_FOREIGN, expiry 2025-08-01.
    expect(verifyHalalAtReceipt('sup-005', 'RM-SAMPLE-FRG-16', R, BEFORE_MANDATE)).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'EXPIRED',
    });
  });
});

describe('H3 — ⚠️ `receiptInstant` IS THE AXIS OF THE ANSWER (law 0.5)', () => {
  it('the SAME supplier × material flips SATISFIED → EXPIRED by the instant alone', () => {
    // creg-0016 expires 2025-08-01. A lot received in January 2025 was covered;
    // the same lot reviewed in 2026 was still covered WHEN IT ARRIVED. This is
    // the entire reason the verdict cannot be stored on the master and the
    // instant cannot be read from the ambient clock.
    expect(verifyHalalAtReceipt('sup-005', 'RM-SAMPLE-FRG-16', R, '2025-01-15T00:00:00.000Z')).toEqual(
      {
        verdict: 'SATISFIED',
        certId: 'creg-0016',
        certType: 'HALAL_FOREIGN',
        expiryDate: '2025-08-01',
      },
    );
    expect(
      verifyHalalAtReceipt('sup-005', 'RM-SAMPLE-FRG-16', R, '2026-01-15T00:00:00.000Z'),
    ).toEqual({ verdict: 'NOT_SATISFIED', reason: 'EXPIRED' });
  });

  it('is deterministic — the same arguments give the same verdict', () => {
    const once = verifyHalalAtReceipt('sup-002', 'RM-SAMPLE-EMU-01', R, AFTER_MANDATE);
    const twice = verifyHalalAtReceipt('sup-002', 'RM-SAMPLE-EMU-01', R, AFTER_MANDATE);
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
    });
  });

  it('EXPIRED outranks UNDER_REVIEW and NO_CERT', () => {
    expect(verdict([missing, underReview, expired])).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'EXPIRED',
    });
  });

  it('UNDER_REVIEW outranks NO_CERT', () => {
    expect(verdict([missing, underReview])).toEqual({
      verdict: 'NOT_SATISFIED',
      reason: 'UNDER_REVIEW',
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

describe('H3 — ⚠️ THE EMPTY INTERSECTION, MEASURED (R0.1 is NOT STARTED)', () => {
  const registryCodes = new Set(R.flatMap((e) => [...e.materialCodes]));
  const masterCodes = Object.keys(MATERIAL_MASTER);

  it('the registry names 17 codes and the master names 42, and NONE is shared', () => {
    expect(registryCodes.size).toBe(17);
    expect(masterCodes.length).toBe(42);
    expect(masterCodes.filter((c) => registryCodes.has(c))).toEqual([]);
  });

  it('every registry code is an `RM-SAMPLE-…` placeholder and no master code is', () => {
    // The honesty device, asserted. ⚠️ This is a check ON THE FIXTURE's own
    // honesty marker — NOT a rule that decides anything about a material. No
    // production path reads a code's shape (C9 §3).
    for (const code of registryCodes) expect(code.slice(0, 10)).toBe('RM-SAMPLE-');
    for (const code of masterCodes) expect(code.slice(0, 10)).not.toBe('RM-SAMPLE-');
  });

  it('⚠️ so EVERY REAL MATERIAL IN THE TREE verifies as NO_CERT today', () => {
    // The honest consequence, stated in the suite rather than discovered by a
    // consumer. THIS IS WHY H4 IS GATED: a wire today would refuse 100% of real
    // receipts. There is no honest technical mitigation — the bridge is real
    // certificate data at R0.1, which is the operator's schedule.
    for (const supplierId of ['sup-002', 'sup-005', 'sup-007']) {
      for (const code of masterCodes) {
        expect(verifyHalalAtReceipt(supplierId, code, R, BEFORE_MANDATE)).toEqual({
          verdict: 'NOT_SATISFIED',
          reason: 'NO_CERT',
        });
      }
    }
  });
});

describe('H3 — ⚠️ HEADLESS. NOTHING IS WIRED, AND THAT IS THE BATCH BOUNDARY', () => {
  const sources = () =>
    import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

  const codeLines = (text: string) =>
    text.split('\n').filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line));

  it('`verifyHalalAtReceipt` appears in CODE in exactly ONE file — the module itself', () => {
    // H4 is gated on `D-COMP-HALAL-4`. A consumer arriving without that ruling
    // turns this red, which is the entire job of the assertion. Comments are
    // exempt: `sdc/halal.ts` and the GR wizard may DISCUSS the third fact.
    const src = sources();
    const referencing = Object.entries(src)
      .filter(([, text]) => codeLines(text).some((l) => l.includes('verifyHalalAtReceipt')))
      .map(([path]) => path)
      .sort();
    expect(referencing).toEqual(['/src/services/data/halalVerification.ts']);

    // ⚠️ THE LIMIT OF THIS CHECK, STATED — the `halalApplicability.test.ts`
    // precedent. Vite's `import.meta.glob` EXCLUDES THE MODULE IT IS WRITTEN
    // IN, so this scan cannot see its own file, which is itself a caller. That
    // is why the expected list has one entry and not two. Recorded rather than
    // worked around: a check that cannot see itself must say so, or the next
    // reader takes its silence for coverage.
    expect(src['/src/services/data/halalVerification.test.ts']).toBeUndefined();
  });

  it('the GR inspection wizard does not read the compliance registry at all', () => {
    const wizard = Object.entries(sources()).find(([p]) => p.includes('GRInspectionWizard'));
    expect(wizard).toBeDefined();
    const code = codeLines(wizard![1]).join('\n');
    expect(code).not.toContain('COMPLIANCE_REGISTRY');
    expect(code).not.toContain('halalVerification');
    expect(code).not.toContain('getComplianceRegistry');
  });
});
