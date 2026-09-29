// ────────────────────────────────────────────────────────────────────────────
// B1 · THE GENERATED SOMO FIXTURE (Design 1 §9) — SIMULATED, SEEDED, NAMED.
//
// Nothing above four intake rows has ever rendered on `main` (R1 F6), so the
// grid has no volume to be measured against. This is that volume: 1,200
// materials, 40 suppliers, 12 monthly and 16 weekly buckets, populated for the
// SOMO-produced measures with SIMULATED provenance.
//
// ⚠️ THE 1,200 RESOLVE IN A PLANNING-SCOPED MASTER, NOT IN `MATERIAL_MASTER`.
// The one master is pinned at its 42 entries (`materialIdentity.test.ts`), and
// every consumer of it — the receipt gate, the halal registry, the document
// lane — would have silently gained 1,158 materials nobody authored. So the
// fixture carries `planningMaster()` = the 42 real entries ∪ the synthetic ones,
// and every helper that resolves a unit takes a master argument already
// (`requireUom(code, master)`). D-OPS-MASTERMISS still holds INSIDE this lane:
// a fact is only ever minted for a code this master resolves.
//
// ⚠️ SEEDED, AND VALUES ARE COMPUTED ON DEMAND. A fact is a pure function of
// (seed, material, supplier, bucket, measure), so no 1,200 × 28 × n array is
// held in memory and the same question always gets the same answer. Its
// instruments pin NAMED members and NAMED values
// (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`), never a row count.
//
// ⚠️ THE REAL 42 ARE NOT GENERATED. A real master code gets its facts from the
// real stores (`facts.ts`); the generator covers only the synthetic codes, so
// no material is ever answered by two producers.
// ────────────────────────────────────────────────────────────────────────────

import { MATERIAL_MASTER, type MaterialMaster, type MaterialMasterEntry, type Uom } from '../sdc';
import { mockSuppliers } from '../../data/mockSuppliers';

/** The seed. Changing it changes every generated value — the pins say so. */
export const SOMO_FIXTURE_SEED = 20261028;

export const PLANNING_MATERIAL_COUNT = 1200;
export const PLANNING_SUPPLIER_COUNT = 40;

/** FNV-1a over a string, then a mulberry32 step — a deterministic [0, 1). */
export function seededUnit(key: string, seed: number = SOMO_FIXTURE_SEED): number {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let t = (h + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');

/** The real master codes, in the master's own order. */
const REAL_CODES: readonly string[] = Object.keys(MATERIAL_MASTER);

/**
 * The synthetic entries. Odd index = raw material (monthly lane, KG); even =
 * packaging (weekly lane, PCS). Codes carry a `SIM-` prefix so they can never
 * collide with an S/4 code — the prefix is a namespace, not a semantic.
 */
const SYNTHETIC: Readonly<Record<string, MaterialMasterEntry>> = Object.freeze(
  Object.fromEntries(
    Array.from({ length: PLANNING_MATERIAL_COUNT - REAL_CODES.length }, (_, i) => {
      const n = i + 1;
      const raw = n % 2 === 1;
      const code = raw ? `SIM-RM-${pad(n, 4)}` : `SIM-PM-${pad(n, 4)}`;
      const entry: MaterialMasterEntry = Object.freeze({
        materialCode: code,
        label: raw ? `Sample raw material ${pad(n, 4)}` : `Sample packaging ${pad(n, 4)}`,
        materialType: raw ? 'ROH' : 'VERP',
        materialGroup: raw ? 'SIM-RAW' : 'SIM-PACK',
        canonicalUom: (raw ? 'KG' : 'PCS') as Uom,
        bpomApplicable: 'UNDETERMINED',
        halalApplicable: 'UNDETERMINED',
      });
      return [code, entry];
    }),
  ),
);

/** The planning lane's master: the real 42 ∪ the synthetic codes. Frozen. */
const PLANNING_MASTER_RECORD: MaterialMaster = Object.freeze({ ...MATERIAL_MASTER, ...SYNTHETIC });

/**
 * The planning master, behind an ACCESSOR rather than an exported object.
 *
 * ⚠️ THIS IS NOT COSMETIC. The material-identity censuses
 * (`materialMasterAuthoring`, `materialMasterAdoption`, `materialIdentity`) walk
 * every exported value in `src/` for a `materialCode` and skip `MATERIAL_MASTER`
 * BY REFERENCE, so they can answer "which modules NAME this code". An exported
 * container re-carrying the master's own entry objects was read as a NEW SOURCE
 * for all 42 codes — measured: five populations collapsed to empty on the first
 * run. It is not a source; it names nothing the master does not. The synthetic
 * entries, which ARE this module's, carry no stated meaning and never reach the
 * censuses either way (they are not exported as values).
 */
export const planningMaster = (): MaterialMaster => PLANNING_MASTER_RECORD;

/** Every planning material, real first. */
export const PLANNING_MATERIALS: readonly string[] = Object.freeze(Object.keys(PLANNING_MASTER_RECORD));

/** Is this code one the generator answers for (a synthetic code)? */
export const isGeneratedMaterial = (code: string): boolean => code in SYNTHETIC;

/** The 40 suppliers: the 12 real ones, then synthetic `sup-sim-NNN`. */
export const PLANNING_SUPPLIERS: readonly string[] = Object.freeze([
  ...mockSuppliers.map((s) => s.id),
  ...Array.from(
    { length: PLANNING_SUPPLIER_COUNT - mockSuppliers.length },
    (_, i) => `sup-sim-${pad(mockSuppliers.length + i + 1, 3)}`,
  ),
]);

/**
 * The suppliers a generated material is sourced from: one, and a second for
 * roughly a third of materials. Deterministic.
 */
export function suppliersFor(materialCode: string): readonly string[] {
  const primary = PLANNING_SUPPLIERS[Math.floor(seededUnit(`sup1|${materialCode}`) * PLANNING_SUPPLIERS.length)];
  if (seededUnit(`dual|${materialCode}`) >= 0.33) return [primary];
  const secondary =
    PLANNING_SUPPLIERS[Math.floor(seededUnit(`sup2|${materialCode}`) * PLANNING_SUPPLIERS.length)];
  return secondary === primary ? [primary] : [primary, secondary];
}

/** Round to a planner-looking figure. */
const roundTo = (v: number, step: number) => Math.max(step, Math.round(v / step) * step);

/**
 * SOMO's demand for a generated material in a bucket, or `null` — "SOMO emitted
 * no figure for this bucket", which renders as a dash and is never a zero.
 */
export function generatedDemand(materialCode: string, bucketId: string): number | null {
  if (!isGeneratedMaterial(materialCode)) return null;
  if (seededUnit(`gap|${materialCode}|${bucketId}`) < 0.05) return null;
  const entry = SYNTHETIC[materialCode];
  const u = seededUnit(`dem|${materialCode}|${bucketId}`);
  return entry.canonicalUom === 'KG' ? roundTo(500 + u * 19500, 50) : roundTo(1000 + u * 199000, 500);
}

/** SOMO's suggested requisition quantity: demand nudged, or `null` with it. */
export function generatedSuggested(materialCode: string, bucketId: string): number | null {
  const d = generatedDemand(materialCode, bucketId);
  if (d === null) return null;
  const nudge = 0.8 + seededUnit(`sug|${materialCode}|${bucketId}`) * 0.4;
  return roundTo(d * nudge, d >= 1000 ? 50 : 10);
}

/** The planner's split of demand across a material's suppliers (sums to demand). */
export function generatedAllocation(materialCode: string, supplierId: string, bucketId: string): number | null {
  const d = generatedDemand(materialCode, bucketId);
  const sups = suppliersFor(materialCode);
  if (d === null || !sups.includes(supplierId)) return null;
  if (sups.length === 1) return d;
  const share = 0.5 + seededUnit(`split|${materialCode}`) * 0.3;
  const first = roundTo(d * share, 10);
  return supplierId === sups[0] ? first : d - first;
}

/**
 * ⚠️ B3 · STEP 0 (operator ruling) — THE MIX IS REALISTIC, AND IT WAS NOT.
 *
 * The B1 generator confirmed only the first three buckets of EVERY material and
 * confirmed each at 60–100% of its allocation, so every material was both
 * awaiting and short: measured at B2, 1,162 of 1,163 materials were exceptions
 * and the "Exceptions only" toggle narrowed nothing. A plan where everything is
 * an exception teaches a planner to ignore the flag.
 *
 * Now a supplier has answered the whole horizon in full for most materials, and
 * a seeded minority carries ONE kind of trouble:
 *  · `short`    — every bucket answered, below the allocation (a shortfall);
 *  · `awaiting` — the near term answered in full, the rest not yet answered.
 * `EXCEPTION_SHARE` is the target share of the generated materials; the
 * realised share is pinned by named members and by a band in
 * `planningFacts.test.ts`, never restated here as a count.
 */
export const EXCEPTION_SHARE = 0.12;
/** The buckets an `awaiting` material's supplier has already answered. */
export const CONFIRMED_BUCKETS = 3;

export type GeneratedTrouble = 'short' | 'awaiting';

/** Which trouble, if any, a generated material carries. Deterministic. */
export function generatedTroubleOf(materialCode: string): GeneratedTrouble | null {
  if (!isGeneratedMaterial(materialCode)) return null;
  const u = seededUnit(`trouble|${materialCode}`);
  if (u < EXCEPTION_SHARE / 2) return 'short';
  if (u < EXCEPTION_SHARE) return 'awaiting';
  return null;
}

/**
 * The supplier's confirmation of its allocation, or `null` — "not yet
 * answered", which is exactly the state the chase exists for (never a zero).
 */
export function generatedConfirmed(
  materialCode: string,
  supplierId: string,
  bucketId: string,
  bucketIndex: number,
): number | null {
  const a = generatedAllocation(materialCode, supplierId, bucketId);
  if (a === null) return null;
  const trouble = generatedTroubleOf(materialCode);
  if (trouble === null) return a;
  if (trouble === 'awaiting') return bucketIndex < CONFIRMED_BUCKETS ? a : null;
  // `short`: 60–90% of the allocation, rounded DOWN to the planner step so a
  // short answer can never round back up to a full one.
  const factor = 0.6 + seededUnit(`conf|${materialCode}|${supplierId}|${bucketId}`) * 0.3;
  return Math.max(0, Math.floor((a * factor) / 10) * 10);
}

/**
 * A seeded unit price in IDR — SIMULATED like every value in this module — so a
 * generated intake line carries a LINE-TOTAL `estimatedValue` (C7 §2.3) instead
 * of a stated zero, which would be a claim that the goods cost nothing.
 */
export function generatedUnitPrice(materialCode: string): number {
  const u = seededUnit(`price|${materialCode}`);
  return SYNTHETIC[materialCode]?.canonicalUom === 'KG'
    ? roundTo(20_000 + u * 180_000, 500)
    : roundTo(500 + u * 4_500, 50);
}
