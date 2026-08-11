// CP-2 · B1 — THE ONE material-master lookup.
//
// The condition these tests pin is the one that used to have twelve answers:
// "the master does not resolve this code". Three legal outcomes now, and the
// asymmetry between a UNIT and a LABEL is the load-bearing rule.

import { describe, it, expect } from 'vitest';
import { MATERIAL_MASTER } from '../fixtures';
import type { MaterialMaster } from '../types';
import {
  isKnownMaterial,
  knownMaterialCodes,
  labelOf,
  materialEntry,
  requireUom,
  uomOf,
} from '../materialMaster';

// A master with exactly one entry — enough to prove the refusal without
// mutating the frozen real fixture.
//
// ⚠️ `bpomApplicable` / `halalApplicable` WERE MISSING, and both are REQUIRED.
//   The entry is minimal by design, but "minimal" was silently reaching past what
//   the type permits — and, as with the dropped `provenance` and the dropped
//   `supplierId` in this same batch, THE FIELDS A SPEC OMITTED WERE THE
//   COMPLIANCE-BEARING ONES. They are not read on this path, which is exactly why
//   nothing noticed. `'UNDETERMINED'` is the honest value for a substance nobody
//   has assessed — the same discipline the production seeds use.
const TINY: MaterialMaster = Object.freeze({
  'RM-TEST-0001': {
    materialCode: 'RM-TEST-0001',
    label: 'Test Substance',
    materialType: 'ROH',
    materialGroup: 'MG-99',
    canonicalUom: 'PCS',
    bpomApplicable: 'UNDETERMINED',
    halalApplicable: 'UNDETERMINED',
  },
});

describe('uomOf — the shared master lookup (D-OPS-MASTERMISS)', () => {
  it('resolves a known code to its canonical unit', () => {
    const out = uomOf('PK-PETB-8810');
    expect(out.ok).toBe(true);
    expect(out.ok && out.uom).toBe('PCS');
  });

  it('REFUSES an unknown code by name — never a fallback unit', () => {
    const out = uomOf('RM-NOT-A-REAL-CODE');
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.reason).toBe('UNKNOWN_MATERIAL');
    // A refusal that cannot say WHICH code is half a refusal.
    expect(out.ok === false && out.materialCode).toBe('RM-NOT-A-REAL-CODE');
  });

  it('never answers KG for an unknown code (the defect this replaces)', () => {
    // The old expression was `MATERIAL_MASTER[code]?.canonicalUom ?? 'KG'` at
    // seven sites. A PCS material read as KG poisons every downstream quantity
    // comparison, and nothing on the surface says a unit was invented.
    for (const bogus of ['', 'KG', 'rm-emul-3310', '10234', 'RM-EMUL-3310 ']) {
      const out = uomOf(bogus);
      expect(out.ok, `'${bogus}' must not resolve`).toBe(false);
    }
  });

  it('takes an injected master (the SDC pure-selector convention)', () => {
    expect(uomOf('RM-TEST-0001', TINY)).toEqual({ ok: true, uom: 'PCS' });
    expect(uomOf('PK-PETB-8810', TINY).ok).toBe(false);
  });

  it('is not fooled by inherited Object.prototype keys', () => {
    // `master[code]` alone would resolve 'constructor' / 'toString' to a
    // function and then read `.canonicalUom` off it as undefined.
    for (const key of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(isKnownMaterial(key), key).toBe(false);
      expect(uomOf(key).ok, key).toBe(false);
      expect(materialEntry(key), key).toBeNull();
    }
  });
});

describe('requireUom — the AUTHOR-TIME / unreachable-by-construction assertion', () => {
  it('returns the unit for a known code', () => {
    expect(requireUom('RM-EMUL-3310')).toBe('KG');
    expect(requireUom('PK-CAPF-8820')).toBe('PCS');
  });

  it('throws NAMING the missing code', () => {
    // The five crash sites already failed loud — which is the CORRECT class of
    // behaviour for a fixture over known literals. The defect was that an
    // incidental `TypeError: Cannot read properties of undefined` never said
    // WHICH code went missing.
    expect(() => requireUom('PK-GHOST-0000')).toThrow(/UNKNOWN_MATERIAL/);
    expect(() => requireUom('PK-GHOST-0000')).toThrow(/PK-GHOST-0000/);
  });
});

describe('labelOf — a unit is NOT a label', () => {
  it('resolves a known code to its label', () => {
    expect(labelOf('AI-NIAC-6601')).toBe('Niacinamide (Vitamin B3)');
  });

  it('ECHOES an unknown code instead of refusing', () => {
    // Deliberately asymmetric with uomOf. Echoing a raw code on a display miss
    // is honest — the reader sees the token the data actually carried.
    // Defaulting a UNIT fabricates a claim with arithmetic consequences.
    expect(labelOf('RM-UNKNOWN-9999')).toBe('RM-UNKNOWN-9999');
  });
});

describe('knownMaterialCodes — the membership set the parser consults', () => {
  it('is every master key, sorted', () => {
    expect(knownMaterialCodes()).toEqual([...Object.keys(MATERIAL_MASTER)].sort());
    expect(knownMaterialCodes(TINY)).toEqual(['RM-TEST-0001']);
  });

  it('agrees with isKnownMaterial for every code it returns', () => {
    for (const code of knownMaterialCodes()) expect(isKnownMaterial(code)).toBe(true);
  });
});
