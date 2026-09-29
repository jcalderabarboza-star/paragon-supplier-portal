// ────────────────────────────────────────────────────────────────────────────
// B1 · THE PLANNING FACT SEAM (Design 1 §2.3–§2.4, §9).
//
// The generator is a DATA population, so its instruments pin NAMED members and
// NAMED values (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`): a
// replacement that keeps the ids and changes the values walks through an
// id-only control, and a count is satisfied by the wrong corpus.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockPlanningService } from './MockPlanningService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { MATERIAL_MASTER, isKnownMaterial } from '../../sdc';
import { somoHorizon } from '../../planning/facts';
import { MEASURES, type MeasureId } from '../../planning/measures';
import {
  planningMaster,
  PLANNING_MATERIALS,
  PLANNING_SUPPLIERS,
  generatedAllocation,
  generatedDemand,
  generatedSuggested,
  suppliersFor,
} from '../../planning/somoFixture';

const BUYER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const SUP007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const svc = new MockPlanningService();
const ALL: readonly MeasureId[] = MEASURES.map((m) => m.id);

const facts = async (scope: QueryScope, horizon: readonly string[], measures: readonly MeasureId[] = ALL, materialCodes?: readonly string[]) =>
  (await svc.getPlanningFacts(scope, { horizon, measures, ...(materialCodes ? { materialCodes } : {}) })).items;

beforeEach(() => requirementResponseStore.reset());

describe('B1 · the generated SOMO fixture — named members, named values', () => {
  it('the planning master holds the real 42 AND the synthetic codes, by name — first and last', () => {
    expect(PLANNING_MATERIALS).toContain('RM-EMUL-3310');
    expect(PLANNING_MATERIALS).toContain('SIM-RM-0001');
    expect(PLANNING_MATERIALS).toContain('SIM-PM-1158');
    expect(PLANNING_MATERIALS).not.toContain('SIM-RM-1159');
    expect(PLANNING_MATERIALS).not.toContain('SIM-RM-0000');
  });

  it('every planning material resolves in the planning master (D-OPS-MASTERMISS inside the lane)', () => {
    const unresolved = PLANNING_MATERIALS.filter((c) => !isKnownMaterial(c, planningMaster()));
    expect(unresolved).toEqual([]);
  });

  it('⚠️ the ONE master is untouched — no synthetic code leaks into MATERIAL_MASTER', () => {
    expect(isKnownMaterial('SIM-RM-0001')).toBe(false);
    expect(Object.keys(MATERIAL_MASTER).filter((c) => c.startsWith('SIM-'))).toEqual([]);
  });

  it('the suppliers are the twelve real ones and the synthetic ones, by name — first and last', () => {
    expect(PLANNING_SUPPLIERS).toContain('sup-007');
    expect(PLANNING_SUPPLIERS).toContain('sup-sim-013');
    expect(PLANNING_SUPPLIERS).toContain('sup-sim-040');
    expect(PLANNING_SUPPLIERS).not.toContain('sup-sim-041');
  });

  it('the seeded values are PINNED — a replaced corpus with the same ids goes red here', () => {
    expect(generatedDemand('SIM-RM-0001', '2026-08')).toBe(10750);
    expect(generatedSuggested('SIM-RM-0001', '2026-08')).toBe(11700);
    expect(generatedDemand('SIM-PM-0002', '2026-08')).toBe(175000);
    expect(suppliersFor('SIM-RM-0001')).toEqual(['sup-sim-034']);
    expect(suppliersFor('SIM-RM-0005')).toHaveLength(2);
    const [a, b] = suppliersFor('SIM-RM-0005');
    expect([generatedAllocation('SIM-RM-0005', a, '2026-08'), generatedAllocation('SIM-RM-0005', b, '2026-08')]).toEqual([13350, 4050]);
  });

  it('"no figure" is null, never 0 — pinned on a named gap', () => {
    expect(generatedDemand('SIM-PM-0006', '2026-08')).toBeNull();
    expect(generatedSuggested('SIM-PM-0006', '2026-08')).toBeNull();
  });

  it('the fixture horizons are 12 months and 16 weeks from the SDC present, named at both ends', () => {
    const m = somoHorizon('month');
    const w = somoHorizon('week');
    expect([m[0], m[m.length - 1]]).toEqual(['2026-08', '2027-07']);
    expect([w[0], w[w.length - 1]]).toEqual(['2026-W36', '2026-W51']);
  });
});

describe('B1 · facts DERIVED from the stores that already exist', () => {
  const find = (fs: Awaited<ReturnType<typeof facts>>, measureId: string, code: string, sup: string | null, bucket: string) =>
    fs.find((f) => f.measureId === measureId && f.materialCode === code && f.supplierId === sup && f.periodBucket === bucket);

  it('demand is the publication summed over suppliers; allocation and confirmation per supplier', async () => {
    const fs = await facts(BUYER, somoHorizon('month'), ALL, ['RM-EMUL-3310']);
    expect(find(fs, 'demand', 'RM-EMUL-3310', null, '2026-08')?.value).toBe(9500);
    expect(find(fs, 'allocation', 'RM-EMUL-3310', 'sup-005', '2026-08')?.value).toBe(3500);
    expect(find(fs, 'confirmed', 'RM-EMUL-3310', 'sup-002', '2026-08')).toMatchObject({ value: 6000, sourceRef: 'rr-0001' });
    expect(find(fs, 'confirmedDeficit', 'RM-EMUL-3310', 'sup-005', '2026-08')?.value).toBe(500);
    expect(find(fs, 'supplierSoh', 'RM-EMUL-3310', 'sup-002', '2026-08')?.value).toBe(4000);
    expect(find(fs, 'incoming', 'RM-EMUL-3310', 'sup-005', '2026-10')?.value).toBe(4000);
  });

  it('an UNANSWERED line reads null — never a zero confirmation, and no invented deficit', async () => {
    const fs = await facts(BUYER, somoHorizon('month'), ALL, ['PK-PETB-8810']);
    expect(find(fs, 'confirmed', 'PK-PETB-8810', 'sup-007', '2026-08')?.value).toBeNull();
    expect(find(fs, 'confirmedDeficit', 'PK-PETB-8810', 'sup-007', '2026-08')?.value).toBeNull();
  });

  it('a seeded fixture never claims LIVE: the record\'s own provenance wins over the capability\'s wiring', async () => {
    const fs = await facts(BUYER, somoHorizon('month'), ['confirmed', 'supplierSoh'], ['RM-EMUL-3310']);
    expect(fs.length).toBeGreaterThan(0);
    for (const f of fs) expect(f.provenance.liveness, `${f.measureId}/${f.supplierId}`).toBe('SIMULATED');
  });

  it('every fact carries the planning master\'s unit — never a payload\'s', async () => {
    const fs = await facts(BUYER, somoHorizon('month'), ['demand'], ['RM-EMUL-3310', 'SIM-PM-0002']);
    expect(fs.find((f) => f.materialCode === 'RM-EMUL-3310')?.uom).toBe(MATERIAL_MASTER['RM-EMUL-3310'].canonicalUom);
    expect(fs.find((f) => f.materialCode === 'SIM-PM-0002')?.uom).toBe('PCS');
  });

  it('SPEC measures produce NO fact — there is no number to render', async () => {
    const fs = await facts(BUYER, somoHorizon('month'), ['rop', 'safetyStock', 'projectedStock']);
    expect(fs).toEqual([]);
    // KNOWN-GOOD: the same query shape does return facts for a produced measure.
    expect((await facts(BUYER, somoHorizon('month'), ['demand'], ['SIM-RM-0001'])).length).toBeGreaterThan(0);
  });

  it('a week horizon reaches the generator and invents no week figure for the month-native publication', async () => {
    const fs = await facts(BUYER, somoHorizon('week'), ['demand'], ['SIM-PM-0002', 'RM-EMUL-3310']);
    expect(fs.find((f) => f.materialCode === 'SIM-PM-0002' && f.periodBucket === '2026-W36')?.value).toBe(178000);
    expect(fs.filter((f) => f.materialCode === 'RM-EMUL-3310')).toEqual([]);
  });
});

describe('B1 · the seam refuses a horizon it cannot answer, by name', () => {
  it('a mixed-grain horizon → empty page WITH the refusal — never "no facts"', async () => {
    const page = await svc.getPlanningFacts(BUYER, { horizon: ['2026-08', '2026-W36'], measures: ['demand'] });
    expect(page.items).toEqual([]);
    expect(page.horizonRefusal).toEqual({ reason: 'MIXED_GRAIN_IN_HORIZON', raw: '2026-08,2026-W36' });
  });

  it('KNOWN-GOOD: a valid horizon carries no refusal', async () => {
    const page = await svc.getPlanningFacts(BUYER, { horizon: ['2026-08'], measures: ['demand'] });
    expect(page.horizonRefusal).toBeUndefined();
  });
});

describe('B1 · a supplier scope never receives another supplier\'s facts', () => {
  it('CONTROL: the buyer\'s page holds facts naming OTHER suppliers and material-grain facts', async () => {
    const fs = await facts(BUYER, somoHorizon('month'));
    expect(fs.some((f) => f.supplierId === 'sup-002')).toBe(true);
    expect(fs.some((f) => f.supplierId === null)).toBe(true);
  });

  it('sup-007 reads ONLY facts naming sup-007 — none of another tenancy, none of Paragon\'s plan', async () => {
    const fs = await facts(SUP007, somoHorizon('month'));
    // Population guard by NAME: its own confirmation line and SOH are present.
    expect(fs.some((f) => f.measureId === 'supplierSoh' && f.materialCode === 'PK-PETB-8810')).toBe(true);
    expect(fs.some((f) => f.measureId === 'allocation' && f.materialCode === 'PK-CAPF-8820')).toBe(true);
    expect(fs.filter((f) => f.supplierId !== 'sup-007')).toEqual([]);
  });

  it('a supplier scope with no supplier id reads empty — the quieter answer', async () => {
    const page = await svc.getPlanningFacts(
      { personaType: 'supplier', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.supplier },
      { horizon: somoHorizon('month'), measures: ALL },
    );
    expect(page.items).toEqual([]);
  });
});
