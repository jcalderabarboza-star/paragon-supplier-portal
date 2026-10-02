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
  generatedConfirmed,
  generatedDemand,
  generatedSuggested,
  generatedTroubleOf,
  suppliersFor,
} from '../../planning/somoFixture';
import { generatedIntakeLine, somoIntakeLineId } from '../../planning/somoIntake';
import { intakeLineStore } from './stores/intakeLineStore';
import { MockCommandService } from './MockCommandService';

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
    // ⚠️ PLN-2 · ONE MATERIAL, ONE GRAIN. This pin read `175000` for a PACKAGING
    // material in a MONTH — the generator emitted every material at both grains,
    // which is how SIM-PM-0068 was committed in 2026-11 and in a week of it
    // (R-PLN P0 #2). A packaging material is planned weekly only: its weekly
    // figure is the pin now, and the monthly one is pinned ABSENT.
    expect(generatedDemand('SIM-PM-0002', '2026-W36')).toBe(178000);
    expect(generatedDemand('SIM-PM-0002', '2026-08')).toBeNull();
    expect(generatedDemand('SIM-RM-0001', '2026-W36')).toBeNull();
    expect(suppliersFor('SIM-RM-0001')).toEqual(['sup-sim-034']);
    expect(suppliersFor('SIM-RM-0005')).toHaveLength(2);
    const [a, b] = suppliersFor('SIM-RM-0005');
    expect([generatedAllocation('SIM-RM-0005', a, '2026-08'), generatedAllocation('SIM-RM-0005', b, '2026-08')]).toEqual([13350, 4050]);
  });

  // ⚠️ B3 · STEP 0 — THE PINNED CONFIRMATION VALUES CHANGED DELIBERATELY
  // (operator ruling: a realistic mix, ~10–15% exceptions). B1 confirmed only
  // the first three buckets of every material at 60–100%, so every material was
  // awaiting AND short. Now a covered material is confirmed in full across the
  // horizon, and a seeded minority is short (every bucket, below allocation) or
  // awaiting (near term only). Named members, named values — not a count.
  it('B3 · the trouble a material carries is seeded and named: short, awaiting, covered', () => {
    expect(generatedTroubleOf('SIM-RM-0019')).toBe('short');
    expect(generatedTroubleOf('SIM-PM-0004')).toBe('awaiting');
    expect(generatedTroubleOf('SIM-RM-0001')).toBeNull();
    // a real master code is never generated, so it carries no generated trouble
    expect(generatedTroubleOf('RM-EMUL-3310')).toBeNull();
  });

  it('B3 · the confirmation values are PINNED per kind', () => {
    const m = somoHorizon('month');
    // covered: every bucket confirmed in FULL, far past the old three-bucket cut
    expect([0, 1, 2, 3, 4].map((i) => generatedConfirmed('SIM-RM-0001', 'sup-sim-034', m[i], i))).toEqual([10750, 11150, 11800, 14650, 14400]);
    // short: answered everywhere, below the allocation
    expect(generatedAllocation('SIM-RM-0019', 'sup-sim-037', m[0])).toBe(900);
    expect(generatedConfirmed('SIM-RM-0019', 'sup-sim-037', m[0], 0)).toBe(630);
    expect(generatedConfirmed('SIM-RM-0019', 'sup-sim-037', m[4], 4)).toBe(6470);
    // awaiting: the near term answered in full, the rest not yet — null, never 0.
    // PLN-2 · SIM-PM-0004 is packaging, so it is pinned over its WEEKS (it read
    // `m[i]` and pinned a monthly answer the generator no longer emits).
    const w = somoHorizon('week');
    expect([0, 1, 2, 3, 4].map((i) => generatedConfirmed('SIM-PM-0004', 'sup-sim-027', w[i], i))).toEqual([23500, 60500, 156500, null, null]);
    expect(generatedConfirmed('SIM-PM-0004', 'sup-sim-027', m[0], 0)).toBeNull();
  });

  it('"no figure" is null, never 0 — pinned on a named gap', () => {
    // ⚠️ PLN-2 · the gap moved INTO the material's own grain. `SIM-PM-0006 @
    // 2026-08` is null now because packaging is not planned monthly at all — a
    // pin that holds for a different reason than the one it names, so it would
    // have kept passing with the gap rule deleted. A weekly gap of a packaging
    // material and a monthly gap of a raw one are the named gaps, each beside a
    // neighbouring bucket that DOES carry a figure.
    expect(generatedDemand('SIM-PM-0006', '2026-W39')).toBeNull();
    expect(generatedSuggested('SIM-PM-0006', '2026-W39')).toBeNull();
    expect(generatedDemand('SIM-PM-0006', '2026-W38')).not.toBeNull();
    expect(generatedDemand('SIM-RM-0003', '2026-11')).toBeNull();
    expect(generatedDemand('SIM-RM-0003', '2026-10')).not.toBeNull();
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
    const fs = await facts(BUYER, somoHorizon('month'), ['demand'], ['RM-EMUL-3310', 'SIM-RM-0001']);
    expect(fs.find((f) => f.materialCode === 'RM-EMUL-3310')?.uom).toBe(MATERIAL_MASTER['RM-EMUL-3310'].canonicalUom);
    expect(fs.find((f) => f.materialCode === 'SIM-RM-0001')?.uom).toBe('KG');
    // PLN-2 · the PCS half moved to the packaging material's own grain (it was
    // read off a monthly SIM-PM-0002 fact the generator no longer emits).
    const weekly = await facts(BUYER, somoHorizon('week'), ['demand'], ['SIM-PM-0002']);
    expect(weekly.find((f) => f.materialCode === 'SIM-PM-0002')?.uom).toBe('PCS');
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

describe('B3 · the generated SOMO intake lines — what a grid cell commits against', () => {
  const BUYER_CMD = new MockCommandService();
  beforeEach(() => intakeLineStore.reset());

  it('a proposal IS an intake line, with named values — the producer delivers what it proposed', () => {
    expect(generatedIntakeLine(somoIntakeLineId('SIM-RM-0001', '2026-08'))).toEqual({
      id: 'pil-somo-SIM-RM-0001@2026-08',
      material: 'Sample raw material 0001',
      suggestedSource: null,
      segment: null,
      suggestedQty: 11700,
      acceptedQty: 11700,
      uom: 'KG',
      periodBucket: '2026-08',
      estimatedValue: 2_123_550_000,
      // PLN-1 · the price travels with the line: 11,700 × 181,500 = the total above.
      unitPrice: 181_500,
      source: 'SOMO',
      // PLN-3 · the producer's "why", now that the line is in the intake queue:
      // the demand it proposed from (10,750) and the proposal (11,700).
      deficit: 'Planned demand 10750 KG in 2026-08; SOMO proposes 11700',
    });
    expect(generatedIntakeLine(somoIntakeLineId('SIM-PM-0002', '2026-W36'))?.acceptedQty).toBe(190850);
  });

  it('KNOWN-BAD: an id SOMO never emitted resolves to nothing', () => {
    for (const id of [
      somoIntakeLineId('RM-EMUL-3310', '2026-08'), // a real code is not generated
      somoIntakeLineId('SIM-RM-0001', '2030-01'), // outside the fixture horizon
      somoIntakeLineId('SIM-PM-0006', '2026-08'), // SOMO's named gap — no proposal
      somoIntakeLineId('SIM-RM-0001', '2026-8'), // not a canonical bucket
      'pil-somo-SIM-RM-0001', // no bucket
      'pil-somo-001', // an authored line, not a generated one
    ]) {
      expect(generatedIntakeLine(id), id).toBeNull();
    }
  });

  it('the acceptedQty fact is keyed by its line: PLANNED at the producer’s figure, then COMMITTED at the committed one', async () => {
    const id = somoIntakeLineId('SIM-RM-0001', '2026-09');
    const read = async () =>
      (await facts(BUYER, somoHorizon('month'), ['acceptedQty'], ['SIM-RM-0001'])).find((f) => f.sourceRef === id)!;
    const before = await read();
    expect(before).toMatchObject({ value: generatedSuggested('SIM-RM-0001', '2026-09'), periodBucket: '2026-09' });
    expect(before.provenance).toMatchObject({ planState: 'planned', liveness: 'SIMULATED', source: 'PLANNER' });

    const r = await BUYER_CMD.dispatch(BUYER, {
      transitionId: 't_intake_commit',
      entity: 'intakeLine',
      entityId: id,
      payload: { acceptedQty: 900, acceptedQtyRaw: '900', overrideReason: 'Trimmed to storage' },
    });
    expect(r.status).not.toBe('failed');
    const after = await read();
    expect(after.value).toBe(900);
    expect(after.provenance.planState).toBe('committed');
  });
});
