// ────────────────────────────────────────────────────────────────────────────
// B1 · THE VIEW REGISTRY (Design 1 §4.3) — a named projection of the registry.
//
// A view names a grain, a horizon LENGTH (never a list of buckets — the buckets
// are generated from the view's anchor at read), the row kind, and which
// measures and columns it shows. A planner's saved layout (§6.2, the SE Team's)
// is a DIFF over a view, never a copy of it: a copy silently keeps yesterday's
// truth the day the registry gains a column (`customRoles.ts`' `{ parent, adds }`).
// ────────────────────────────────────────────────────────────────────────────

import { DEFAULT_HORIZON_BUCKETS, type BucketGrain } from './bucket';
import type { MeasureId } from './measures';
import type { MaterialType } from '../sdc';
import { PLANNING_GRAIN_OF_TYPE, planningTypeOfGrain } from './somoFixture';

export type ViewId = 'rm-plan' | 'pm-plan' | 'exceptions' | 'intake-review' | 'consolidation';

export interface ViewSpec {
  readonly viewId: ViewId;
  readonly labelKey: string;
  /**
   * The bucket grain. `current` = the exceptions view follows whichever grain
   * the planner is in; `none` = a view-less list where the bucket is a column.
   */
  readonly grain: BucketGrain | 'current' | 'none';
  /** Buckets in the horizon; 0 when the view has no bucket axis. */
  readonly horizonLength: number;
  readonly rowKind: 'material' | 'material+supplier';
  /**
   * PLN-2 · the material type the view lists. A plan view lists ONE type — the
   * type planned at its grain (`PLANNING_GRAIN_OF_TYPE`); `current` follows the
   * grain the planner is in, as the grain does; `any` is a view with no plan grain.
   */
  readonly materialType: MaterialType | 'current' | 'any';
  readonly measuresShown: readonly MeasureId[];
  readonly columnsShown: readonly string[];
  readonly defaultGroupBy: readonly string[];
  readonly defaultSort: readonly { readonly colId: string; readonly dir: 'asc' | 'desc' }[];
  /** A named filter the view opens with (exception-first views). */
  readonly defaultFilter?: 'exceptions' | 'pendingIntake';
}

const PLAN_MEASURES: readonly MeasureId[] = [
  'demand',
  // B3 · SOMO's proposal and the planner's accepted quantity — the one
  // editable measure — sit under demand, on the material row.
  'suggestedQty',
  'acceptedQty',
  'allocation',
  'confirmed',
  'confirmedDeficit',
  'supplierSoh',
  'incoming',
  'openPo',
  'released',
];
const PLAN_COLUMNS: readonly string[] = [
  'materialCode',
  'materialLabel',
  'materialType',
  'uom',
  'segment',
  'supplierName',
  'commitmentClass',
  'planState',
  'responseState',
  'agg:demand',
  'agg:confirmed',
  'agg:deficit',
  'agg:firstShortBucket',
  'agg:coverage',
];

const v = (spec: Omit<ViewSpec, 'labelKey'>): ViewSpec =>
  Object.freeze({ ...spec, labelKey: `planGrid.view.${spec.viewId}` });

/** The five registry-shipped views. Frozen. */
export const VIEWS: readonly ViewSpec[] = Object.freeze([
  v({
    viewId: 'rm-plan',
    grain: 'month',
    materialType: 'ROH',
    horizonLength: DEFAULT_HORIZON_BUCKETS.month,
    rowKind: 'material+supplier',
    measuresShown: PLAN_MEASURES,
    columnsShown: PLAN_COLUMNS,
    defaultGroupBy: ['materialCode'],
    defaultSort: [{ colId: 'materialCode', dir: 'asc' }],
  }),
  v({
    viewId: 'pm-plan',
    grain: 'week',
    materialType: 'VERP',
    horizonLength: DEFAULT_HORIZON_BUCKETS.week,
    rowKind: 'material+supplier',
    measuresShown: PLAN_MEASURES,
    columnsShown: PLAN_COLUMNS,
    defaultGroupBy: ['materialCode'],
    defaultSort: [{ colId: 'materialCode', dir: 'asc' }],
  }),
  v({
    viewId: 'exceptions',
    grain: 'current',
    materialType: 'current',
    horizonLength: DEFAULT_HORIZON_BUCKETS.month,
    rowKind: 'material+supplier',
    // ⚠️ PLN-1 · `allocation` IS HERE BECAUSE THE EXCEPTION RULE READS IT. An
    // "awaiting" exception is an allocation a supplier has not confirmed, and
    // this list used to omit allocation rows — so the Exceptions tab could not
    // see that class at all and showed 75 exceptions where the plan view's own
    // toggle showed 130 (R-PLN P0 #3, measured). `exceptionsView.test.ts` holds
    // the two equal, per grain, over the real seam.
    measuresShown: ['demand', 'allocation', 'confirmed', 'confirmedDeficit'],
    columnsShown: ['materialCode', 'materialLabel', 'supplierName', 'responseState', 'intakeState', 'agg:deficit', 'agg:firstShortBucket'],
    defaultGroupBy: [],
    defaultSort: [{ colId: 'agg:firstShortBucket', dir: 'asc' }],
    defaultFilter: 'exceptions',
  }),
  v({
    viewId: 'intake-review',
    grain: 'none',
    materialType: 'any',
    horizonLength: 0,
    rowKind: 'material',
    measuresShown: ['suggestedQty', 'acceptedQty'],
    columnsShown: ['materialCode', 'materialLabel', 'uom', 'segment', 'suggestedSource', 'intakeState', 'deficitReason', 'estimatedValue', 'overrideReason', 'prNumber'],
    defaultGroupBy: [],
    defaultSort: [{ colId: 'intakeState', dir: 'asc' }],
    defaultFilter: 'pendingIntake',
  }),
  v({
    viewId: 'consolidation',
    grain: 'month',
    materialType: 'any',
    horizonLength: 6,
    rowKind: 'material+supplier',
    measuresShown: ['allocation', 'confirmed', 'confirmedDeficit'],
    columnsShown: ['supplierName', 'materialCode', 'materialLabel', 'commitmentClass', 'responseState', 'agg:deficit', 'agg:coverage'],
    defaultGroupBy: ['supplierName'],
    defaultSort: [{ colId: 'supplierName', dir: 'asc' }],
  }),
]);

/**
 * PLN-1 · the grain and horizon a view renders at. A `current`-grain view (the
 * exceptions list) follows the plan tab the planner was last in — it was fixed
 * at the monthly grain, so weekly exceptions had no list of their own — and its
 * horizon is that grain's registry default, never the monthly length applied to
 * weeks.
 */
export function viewGrainAndHorizon(
  view: ViewSpec,
  current: BucketGrain,
): { readonly grain: BucketGrain; readonly horizonLength: number; readonly materialType: MaterialType | null } {
  const grain: BucketGrain = view.grain === 'current' ? current : view.grain === 'week' ? 'week' : 'month';
  const horizonLength = view.grain === 'current' ? DEFAULT_HORIZON_BUCKETS[current] : view.horizonLength;
  // PLN-2 · a `current` view lists the type planned at the grain it follows.
  const materialType =
    view.materialType === 'any' ? null : view.materialType === 'current' ? planningTypeOfGrain(grain) : view.materialType;
  return { grain, horizonLength, materialType };
}

/**
 * PLN-2 · does a view's declared type agree with the lane table? A plan view
 * listing raw materials at a weekly grain would be the two-grain defect again,
 * entered through the registry instead of the generator.
 */
export const viewTypeAgreesWithGrain = (view: ViewSpec): boolean =>
  view.materialType === 'any' ||
  view.materialType === 'current' ||
  (view.grain !== 'current' && view.grain !== 'none' && PLANNING_GRAIN_OF_TYPE[view.materialType] === view.grain);
