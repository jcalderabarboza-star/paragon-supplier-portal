// ────────────────────────────────────────────────────────────────────────────
// B1 · THE MEASURE REGISTRY (Design 1 §3) — what a bucket cell can show.
//
// A measure is what ONE time-bucket cell holds for one row. Every entry carries
// the governance a column carries (§4): where the figure comes from, whether it
// is authored by a producer or derived by this portal, the one verb an edit may
// request, how it aggregates, and which honesty marker it renders behind.
//
// ⚠️ LABELS ARE KEYS, NEVER TEXT. EN and ID live in `src/lib/i18n/planGrid.ts`;
// a label literal here would be a module-scope string consumed by `.map()`,
// which is exactly what `moduleScopeLiteralGate` exists to refuse.
//
// ⚠️ AVAILABILITY IS NOT STORED HERE. Each entry names the liveness CAPABILITY
// it is read behind; whether that capability is LIVE, SIMULATED or SPEC is asked
// of the registry at render (`liveness()`), so the day a producer lands the
// measure's tier moves with nobody editing this file.
//
// ⚠️ THE EDITABLE SET IS {acceptedQty, allocation} — Design 1 §3's two.
// `allocation` was held off at B1 because its verb did not exist; B4a added
// `t_publication_allocate` and widened the pin in `planningRegistry.test.ts` on
// purpose, with the reason beside it.
// ────────────────────────────────────────────────────────────────────────────

import { INTAKE_TRIAGE_ATOM } from '../transitions/flows/intakeLine.flow';
import type { Capability } from '../liveness/registry';

/** The measure vocabulary (Design 1 §3, rows 1–15). A closed union. */
export type MeasureId =
  | 'demand'
  | 'suggestedQty'
  | 'acceptedQty'
  | 'allocation'
  | 'confirmed'
  | 'confirmedDeficit'
  | 'supplierSoh'
  | 'incoming'
  | 'openPo'
  | 'released'
  | 'received'
  | 'coverageRatio'
  | 'rop'
  | 'safetyStock'
  | 'projectedStock';

/** Who produces the figure. PORTAL = this platform derived it. */
export type MeasureSource = 'SOMO' | 'SAP' | 'SUPPLIER' | 'PLANNER' | 'PORTAL';

/** M = material × bucket; S = supplier × material × bucket. */
export type MeasureGrain = 'material' | 'supplier';

export type AggregationRule = 'sum' | 'min' | 'max' | 'first' | 'last' | 'count' | 'none';

/** Which marker a cell renders beside its figure (C6 §5 — never a bare value). */
export type HonestyMarker = 'liveness' | 'planState' | 'model' | 'none';

/**
 * What an edit REQUESTS. The grid never writes; it dispatches the verb named
 * here, and the dispatcher decides (role, legality, hooks).
 */
export interface EditSpec {
  readonly verb: string;
  /** The atom the seat must hold; a seat without it is shown the handoff, not a cell. */
  readonly atom: string;
  /** The payload field the new value lands in. */
  readonly payloadField: string;
  /** C6-LOCK §8.3 — a reason is owed when the value differs from the baseline. */
  readonly reasonRequiredWhen?: 'differsFromBaseline';
  /**
   * The field the override test compares against. For `acceptedQty` it is the
   * PRODUCER's delivered `acceptedQty` on the intake line (A1-R2) — never
   * `suggestedQty`, which is the baseline A2 moved away from.
   */
  readonly baselineField?: string;
}

export interface MeasureSpec {
  readonly id: MeasureId;
  readonly labelKey: string;
  readonly source: MeasureSource;
  readonly grain: MeasureGrain;
  readonly derivation: 'authored' | 'derived';
  /** The pure function a derived measure is computed by (auditable, tested). */
  readonly derivedBy?: string;
  readonly unit: 'materialUom' | 'ratio';
  readonly editable: false | EditSpec;
  readonly aggregation: { readonly overBuckets: AggregationRule; readonly overRows: AggregationRule };
  readonly defaultVisible: boolean;
  readonly honesty: HonestyMarker;
  /** The liveness capability this measure is read behind (availability at render). */
  readonly capability: Capability;
  /**
   * An AS-OF measure is not bucketed: it is rendered in the CURRENT bucket only
   * (supplier stock on hand, coverage). Every other measure is per bucket.
   */
  readonly asOf?: true;
}

const qty = { overBuckets: 'sum', overRows: 'sum' } as const;
const latest = { overBuckets: 'last', overRows: 'none' } as const;

const m = (spec: Omit<MeasureSpec, 'labelKey'>): MeasureSpec =>
  Object.freeze({ ...spec, labelKey: `planGrid.measure.${spec.id}` });

/** The fifteen measures of Design 1 §3, in the design's order. Frozen. */
export const MEASURES: readonly MeasureSpec[] = Object.freeze([
  m({ id: 'demand', source: 'SOMO', grain: 'material', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: qty, defaultVisible: true, honesty: 'liveness', capability: 'forecastPublications' }),
  m({ id: 'suggestedQty', source: 'SOMO', grain: 'material', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: qty, defaultVisible: true, honesty: 'liveness', capability: 'purchaseRequisitions' }),
  m({
    id: 'acceptedQty',
    source: 'PLANNER',
    grain: 'material',
    derivation: 'authored',
    unit: 'materialUom',
    // THE ONE EDITABLE MEASURE TODAY. `t_intake_commit` (cascades `t_pr_create`);
    // a reason is owed when the planner departs from the producer's delivered
    // quantity — the same rule the verb's own hook enforces.
    editable: Object.freeze({
      verb: 't_intake_commit',
      atom: INTAKE_TRIAGE_ATOM, // PLN-3 · the planning lane's (R1)
      payloadField: 'acceptedQty',
      reasonRequiredWhen: 'differsFromBaseline',
      baselineField: 'acceptedQty',
    }),
    aggregation: qty,
    defaultVisible: true,
    honesty: 'planState',
    capability: 'purchaseRequisitions',
  }),
  // ⚠️ EDITABLE SINCE B4a, WHEN `t_publication_allocate` LANDED — the edit
  // commits the supplier's share of a DRAFT publication. No grid cell offers it
  // yet: `isEditableCell` needs a seam row to anchor to, and the draft panel
  // that supplies one is B4b. No reason is owed: the split IS the planner's act,
  // with no producer baseline to depart from; a firm split is SIGNED separately
  // (`t_publication_approve_firm`, procurement).
  m({
    id: 'allocation',
    source: 'PLANNER',
    grain: 'supplier',
    derivation: 'authored',
    unit: 'materialUom',
    editable: Object.freeze({
      verb: 't_publication_allocate',
      atom: 'publication:allocate',
      payloadField: 'forecastQty',
    }),
    aggregation: qty,
    defaultVisible: true,
    honesty: 'liveness',
    capability: 'forecastPublications',
  }),
  m({ id: 'confirmed', source: 'SUPPLIER', grain: 'supplier', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: qty, defaultVisible: true, honesty: 'liveness', capability: 'forecastPublications' }),
  m({ id: 'confirmedDeficit', source: 'PORTAL', grain: 'supplier', derivation: 'derived', derivedBy: 'confirmedDeficitOf', unit: 'materialUom', editable: false, aggregation: qty, defaultVisible: true, honesty: 'model', capability: 'forecastPublications' }),
  m({ id: 'supplierSoh', source: 'SUPPLIER', grain: 'supplier', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: { overBuckets: 'none', overRows: 'sum' }, defaultVisible: true, honesty: 'liveness', capability: 'inventory', asOf: true }),
  m({ id: 'incoming', source: 'SUPPLIER', grain: 'supplier', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: qty, defaultVisible: true, honesty: 'liveness', capability: 'shipments' }),
  m({ id: 'openPo', source: 'SAP', grain: 'supplier', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: qty, defaultVisible: true, honesty: 'liveness', capability: 'purchaseOrders' }),
  m({ id: 'released', source: 'SAP', grain: 'supplier', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: qty, defaultVisible: true, honesty: 'liveness', capability: 'deliveryAgreements' }),
  m({ id: 'received', source: 'SAP', grain: 'supplier', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: qty, defaultVisible: false, honesty: 'liveness', capability: 'goodsReceipts' }),
  // MODELED, permanently: rendered with the Σ marker, never the observed grammar.
  m({ id: 'coverageRatio', source: 'PORTAL', grain: 'supplier', derivation: 'derived', derivedBy: 'supplierCoverageEntries', unit: 'ratio', editable: false, aggregation: { overBuckets: 'none', overRows: 'none' }, defaultVisible: true, honesty: 'model', capability: 'inventory', asOf: true }),
  // ⚠️ SPEC — SOMO does not emit these yet. Hidden by default, and even when a
  // user shows them the cell renders the liveness pill, never a number: no
  // producer means no fact, and the service returns none for them.
  m({ id: 'rop', source: 'SOMO', grain: 'material', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: latest, defaultVisible: false, honesty: 'liveness', capability: 'somoPlanParameters' }),
  m({ id: 'safetyStock', source: 'SOMO', grain: 'material', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: latest, defaultVisible: false, honesty: 'liveness', capability: 'somoPlanParameters' }),
  m({ id: 'projectedStock', source: 'SOMO', grain: 'material', derivation: 'authored', unit: 'materialUom', editable: false, aggregation: latest, defaultVisible: false, honesty: 'liveness', capability: 'somoPlanParameters' }),
]);

/** One measure by id. Every id in the union is registered (asserted by test). */
export function measureOf(id: MeasureId): MeasureSpec {
  const found = MEASURES.find((x) => x.id === id);
  if (!found) throw new Error(`unregistered measure: ${id}`);
  return found;
}
