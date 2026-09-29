// ────────────────────────────────────────────────────────────────────────────
// B1 · THE COLUMN REGISTRY (Design 1 §4.1 shape, §4.2 initial set).
//
// The specification the operator asked for: every column the planning grid can
// show, with where its value comes from, whether a person may edit it and
// through which verb, how it aggregates, and which honesty marker it carries.
//
// ⚠️ BUCKET COLUMNS ARE NOT IN THIS LIST AND MUST NEVER BE. They are GENERATED
// per horizon by `bucketColumns(horizon, measure)`, id `b:<measureId>:<bucketId>`.
// Enumerating buckets would freeze a horizon into the registry — the view
// parameter would become a constant, and the first re-published plan would find
// a grid that stops a month early.
//
// ⚠️ LABELS ARE KEYS (see `measures.ts`). EN/ID live in `planGrid.ts`.
// ────────────────────────────────────────────────────────────────────────────

import type { Capability } from '../liveness/registry';
import { parseHorizon, type BucketId, type BucketRefusalReason } from './bucket';
import {
  measureOf,
  type AggregationRule,
  type EditSpec,
  type HonestyMarker,
  type MeasureId,
} from './measures';

export type ColumnKind = 'attribute' | 'bucket' | 'aggregate';
export type ColumnSource = 'SOMO' | 'SAP' | 'SUPPLIER' | 'PLANNER' | 'PORTAL' | 'PARAGON_MASTER';
export type ColumnUnit =
  | 'materialUom'
  | 'IDR'
  | 'days'
  | 'pct'
  | 'ratio'
  | 'count'
  | 'text'
  | 'bucket'
  | 'chip'
  | 'none';
export type ColumnFilter = 'set' | 'number' | 'text' | 'date' | 'none';
export type ColumnFormat = 'qty' | 'idr' | 'pct' | 'ratio' | 'days' | 'bucket' | 'text' | 'chip' | 'pill';

export interface ColumnSpec {
  /** Stable; the colId a grid keys column state on. */
  readonly id: string;
  readonly kind: ColumnKind;
  readonly labelKey: string;
  readonly source: ColumnSource;
  readonly derivation: 'authored' | 'derived';
  readonly derivedBy?: string;
  readonly unit: ColumnUnit;
  readonly editable: false | EditSpec;
  readonly defaultVisible: boolean;
  readonly defaultPinned?: 'left' | 'right';
  readonly defaultWidth: number;
  readonly groupable: boolean;
  readonly aggregation: AggregationRule;
  readonly filter: ColumnFilter;
  readonly format: ColumnFormat;
  readonly honesty: HonestyMarker;
  /** The measure a BUCKET column renders. */
  readonly measure?: MeasureId;
  /** The bucket a BUCKET column renders. */
  readonly bucket?: BucketId;
  /** The liveness capability this column's values are read behind. */
  readonly availableWhen?: Capability;
}

type Attr = Omit<ColumnSpec, 'kind' | 'labelKey' | 'defaultWidth'> & { readonly defaultWidth?: number };

const attr = (spec: Attr): ColumnSpec =>
  Object.freeze({ defaultWidth: 140, ...spec, kind: 'attribute', labelKey: `planGrid.column.${spec.id}` });
const agg = (spec: Attr): ColumnSpec =>
  Object.freeze({
    defaultWidth: 130,
    ...spec,
    kind: 'aggregate',
    labelKey: `planGrid.column.${spec.id.replace('agg:', 'agg.')}`,
  });

/** Design 1 §4.2 — the initial attribute and aggregate columns. Frozen. */
export const COLUMNS: readonly ColumnSpec[] = Object.freeze([
  attr({ id: 'materialCode', source: 'PARAGON_MASTER', derivation: 'authored', unit: 'text', editable: false, defaultVisible: true, defaultPinned: 'left', groupable: true, aggregation: 'none', filter: 'text', format: 'text', honesty: 'none' }),
  attr({ id: 'materialLabel', source: 'PARAGON_MASTER', derivation: 'authored', unit: 'text', editable: false, defaultVisible: true, defaultPinned: 'left', defaultWidth: 220, groupable: false, aggregation: 'none', filter: 'text', format: 'text', honesty: 'none' }),
  attr({ id: 'materialType', source: 'PARAGON_MASTER', derivation: 'authored', unit: 'chip', editable: false, defaultVisible: true, groupable: true, aggregation: 'none', filter: 'set', format: 'chip', honesty: 'none' }),
  attr({ id: 'materialGroup', source: 'PARAGON_MASTER', derivation: 'authored', unit: 'text', editable: false, defaultVisible: false, groupable: true, aggregation: 'none', filter: 'set', format: 'text', honesty: 'none' }),
  attr({ id: 'uom', source: 'PARAGON_MASTER', derivation: 'authored', unit: 'text', editable: false, defaultVisible: true, defaultPinned: 'left', defaultWidth: 80, groupable: true, aggregation: 'none', filter: 'set', format: 'text', honesty: 'none' }),
  attr({ id: 'segment', source: 'SOMO', derivation: 'authored', unit: 'chip', editable: false, defaultVisible: true, groupable: true, aggregation: 'none', filter: 'set', format: 'chip', honesty: 'liveness', availableWhen: 'purchaseRequisitions' }),
  attr({ id: 'suggestedSource', source: 'SOMO', derivation: 'authored', unit: 'text', editable: false, defaultVisible: false, groupable: true, aggregation: 'none', filter: 'set', format: 'text', honesty: 'liveness', availableWhen: 'purchaseRequisitions' }),
  attr({ id: 'supplierId', source: 'PARAGON_MASTER', derivation: 'authored', unit: 'text', editable: false, defaultVisible: false, groupable: true, aggregation: 'none', filter: 'set', format: 'text', honesty: 'none' }),
  attr({ id: 'supplierName', source: 'PARAGON_MASTER', derivation: 'authored', unit: 'text', editable: false, defaultVisible: true, defaultPinned: 'left', defaultWidth: 200, groupable: true, aggregation: 'none', filter: 'set', format: 'text', honesty: 'none' }),
  attr({ id: 'supplierType', source: 'PARAGON_MASTER', derivation: 'authored', unit: 'chip', editable: false, defaultVisible: false, groupable: true, aggregation: 'none', filter: 'set', format: 'chip', honesty: 'none' }),
  attr({ id: 'principalLeadTimeDays', source: 'PARAGON_MASTER', derivation: 'authored', unit: 'days', editable: false, defaultVisible: false, groupable: false, aggregation: 'max', filter: 'number', format: 'days', honesty: 'none' }),
  // ⚠️ PROJECTION UNRATIFIED (C8 §2.2): the class is projected from SOMO's lock
  // and approval states by a rule C8 has not ratified, so it carries a marker.
  attr({ id: 'commitmentClass', source: 'PORTAL', derivation: 'derived', derivedBy: 'commitmentClassOf', unit: 'chip', editable: false, defaultVisible: true, groupable: true, aggregation: 'none', filter: 'set', format: 'chip', honesty: 'liveness', availableWhen: 'forecastPublications' }),
  attr({ id: 'planState', source: 'PORTAL', derivation: 'derived', derivedBy: 'planStateOf', unit: 'chip', editable: false, defaultVisible: true, groupable: true, aggregation: 'none', filter: 'set', format: 'pill', honesty: 'planState' }),
  attr({ id: 'responseState', source: 'PORTAL', derivation: 'derived', derivedBy: 'consolidationRows', unit: 'chip', editable: false, defaultVisible: true, groupable: true, aggregation: 'count', filter: 'set', format: 'pill', honesty: 'liveness', availableWhen: 'forecastPublications' }),
  attr({ id: 'intakeState', source: 'PORTAL', derivation: 'derived', derivedBy: 'projectIntakeLine', unit: 'chip', editable: false, defaultVisible: true, groupable: true, aggregation: 'count', filter: 'set', format: 'pill', honesty: 'planState', availableWhen: 'purchaseRequisitions' }),
  attr({ id: 'deficitReason', source: 'SOMO', derivation: 'authored', unit: 'text', editable: false, defaultVisible: false, defaultWidth: 240, groupable: false, aggregation: 'none', filter: 'text', format: 'text', honesty: 'liveness', availableWhen: 'purchaseRequisitions' }),
  // IDR is ASSUMED by the producer and declared nowhere (C7); declared here.
  attr({ id: 'estimatedValue', source: 'SOMO', derivation: 'authored', unit: 'IDR', editable: false, defaultVisible: false, groupable: false, aggregation: 'sum', filter: 'number', format: 'idr', honesty: 'liveness', availableWhen: 'purchaseRequisitions' }),
  // ⚠️ NOT A STANDALONE EDIT: the reason travels INSIDE the `t_intake_commit`
  // payload beside `acceptedQty`, and is only asked for when the quantity
  // departs from the producer's. It is editable as the commit's companion.
  attr({
    id: 'overrideReason',
    source: 'PLANNER',
    derivation: 'authored',
    unit: 'text',
    editable: Object.freeze({ verb: 't_intake_commit', atom: 'pr:create', payloadField: 'overrideReason' }),
    defaultVisible: true,
    defaultWidth: 220,
    groupable: false,
    aggregation: 'none',
    filter: 'text',
    format: 'text',
    honesty: 'planState',
    availableWhen: 'purchaseRequisitions',
  }),
  attr({ id: 'prNumber', source: 'PORTAL', derivation: 'derived', derivedBy: 'projectIntakeLine', unit: 'text', editable: false, defaultVisible: true, defaultPinned: 'right', groupable: false, aggregation: 'count', filter: 'text', format: 'text', honesty: 'planState', availableWhen: 'purchaseRequisitions' }),
  agg({ id: 'agg:demand', source: 'PORTAL', derivation: 'derived', derivedBy: 'sumOverHorizon', unit: 'materialUom', editable: false, defaultVisible: true, defaultPinned: 'right', groupable: false, aggregation: 'sum', filter: 'number', format: 'qty', honesty: 'model', measure: 'demand' }),
  agg({ id: 'agg:confirmed', source: 'PORTAL', derivation: 'derived', derivedBy: 'sumOverHorizon', unit: 'materialUom', editable: false, defaultVisible: true, defaultPinned: 'right', groupable: false, aggregation: 'sum', filter: 'number', format: 'qty', honesty: 'model', measure: 'confirmed' }),
  agg({ id: 'agg:deficit', source: 'PORTAL', derivation: 'derived', derivedBy: 'sumOverHorizon', unit: 'materialUom', editable: false, defaultVisible: true, defaultPinned: 'right', groupable: false, aggregation: 'sum', filter: 'number', format: 'qty', honesty: 'model', measure: 'confirmedDeficit' }),
  agg({ id: 'agg:firstShortBucket', source: 'PORTAL', derivation: 'derived', derivedBy: 'firstShortBucket', unit: 'bucket', editable: false, defaultVisible: true, defaultPinned: 'right', groupable: false, aggregation: 'min', filter: 'set', format: 'bucket', honesty: 'model', measure: 'confirmedDeficit' }),
  agg({ id: 'agg:coverage', source: 'PORTAL', derivation: 'derived', derivedBy: 'supplierCoverageEntries', unit: 'ratio', editable: false, defaultVisible: true, defaultPinned: 'right', groupable: false, aggregation: 'none', filter: 'number', format: 'ratio', honesty: 'model', measure: 'coverageRatio' }),
]);

/** The generated id of a bucket column. The ONE spelling; nothing else builds it. */
export const bucketColumnId = (measureId: MeasureId, bucketId: BucketId): string =>
  `b:${measureId}:${bucketId}`;

export type BucketColumnsOutcome =
  | { readonly ok: true; readonly columns: readonly ColumnSpec[] }
  | { readonly ok: false; readonly reason: BucketRefusalReason; readonly raw: string };

/**
 * One bucket column per bucket of `horizon`, for one measure.
 *
 * The horizon is parsed through A1's `parseHorizon`, so a quarter, a date or an
 * unpadded month is REFUSED rather than rendered, and so is a horizon mixing
 * months and weeks — a telescoping view is two horizons side by side, never one.
 * Every governance field is the MEASURE's: a bucket column cannot be more
 * editable, or less marked, than the measure it renders.
 */
export function bucketColumns(horizon: readonly string[], measureId: MeasureId): BucketColumnsOutcome {
  const parsed = parseHorizon(horizon);
  if (!parsed.ok) return { ok: false, reason: parsed.reason, raw: parsed.raw };
  const measure = measureOf(measureId);
  return {
    ok: true,
    columns: Object.freeze(
      parsed.buckets.map((b) =>
        Object.freeze<ColumnSpec>({
          id: bucketColumnId(measureId, b.id),
          kind: 'bucket',
          labelKey: measure.labelKey,
          source: measure.source,
          derivation: measure.derivation,
          ...(measure.derivedBy ? { derivedBy: measure.derivedBy } : {}),
          unit: measure.unit,
          editable: measure.editable,
          defaultVisible: measure.defaultVisible,
          defaultWidth: 110,
          groupable: false,
          aggregation: measure.aggregation.overRows,
          filter: 'number',
          format: measure.unit === 'ratio' ? 'ratio' : 'qty',
          honesty: measure.honesty,
          measure: measureId,
          bucket: b.id,
          availableWhen: measure.capability,
        }),
      ),
    ),
  };
}
