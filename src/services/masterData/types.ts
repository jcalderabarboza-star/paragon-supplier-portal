// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE MASTER-DATA REPLICA — the record, its stamp, and a sync run.
//
// Operator ruling (12 October 2026): SAP S/4HANA is the system of record for
// master data. The portal holds a REPLICA: it displays it, keeps it in sync and
// proposes changes. It never owns a record and never mints a key.
//
// So every record here is SAP's record under SAP's key, with a stamp that says
// where it came from and when it was read. Two things are deliberately NOT
// stored on the stamp, because each is derivable and a stored copy would be
// right only on the day it was written:
//   · freshness — computed at read against the declared present (`freshness.ts`)
//   · liveness  — follows from the source (`livenessOfStamp`)
//
// The contract an SE builds the feed against is `docs/contracts/C13-master-data.md`.
// ─────────────────────────────────────────────────────────────────────────────

import type { Tier } from '../liveness/registry';
import type { MaterialType, Uom } from '../sdc/types';

/** The reference tables the tree reads today (decision 1). */
export const REFERENCE_TABLES = [
  'unit',
  'materialType',
  'materialGroup',
  'incoterm',
  'paymentTerm',
  'currency',
  'country',
  'plant',
  'storageLocation',
  'costCentre',
  'brand',
] as const;
export type ReferenceTable = (typeof REFERENCE_TABLES)[number];

/** Every object the replica holds in this build. */
export const MASTER_OBJECTS = ['material', 'supplier', ...REFERENCE_TABLES] as const;
export type MasterObject = (typeof MASTER_OBJECTS)[number];

export const isMasterObject = (value: string): value is MasterObject =>
  (MASTER_OBJECTS as readonly string[]).includes(value);

export const isReferenceTable = (value: string): value is ReferenceTable =>
  (REFERENCE_TABLES as readonly string[]).includes(value);

/**
 * The closed unit and material-type unions, as lists a sync run can be checked
 * against. Arithmetic and refusals in the tree depend on these unions, so they
 * stay in code; an inbound value outside them is refused by name, never coerced.
 * The two `satisfies` lines and the two `Exhaustive` types hold each list equal
 * to its union: a member added to one and not the other is a `tsc` failure.
 */
export const KNOWN_UNITS = ['KG', 'PCS', 'L', 'ROLL', 'MT', 'BOX'] as const satisfies readonly Uom[];
export const KNOWN_MATERIAL_TYPES = ['ROH', 'VERP'] as const satisfies readonly MaterialType[];
type Exhaustive<Union, Listed> = Exclude<Union, Listed> extends never ? true : never;
export const UNITS_COVER_THE_UNION: Exhaustive<Uom, (typeof KNOWN_UNITS)[number]> = true;
export const TYPES_COVER_THE_UNION: Exhaustive<MaterialType, (typeof KNOWN_MATERIAL_TYPES)[number]> = true;

/** Where a replica record was read from. `SAMPLE` is never shown as SAP. */
export type ReplicaSource = 'SAP_S4' | 'SAMPLE';

/** SAP's own status for the record. */
export type SapStatus = 'ACTIVE' | 'BLOCKED' | 'FLAGGED_FOR_DELETION';

export interface ReplicaStamp {
  readonly source: ReplicaSource;
  /** ISO instant the replica last took this record from the source. */
  readonly readAt: string;
  /** SAP's own change time, when the feed carries it. */
  readonly sourceChangedAt: string | null;
  /** The run that delivered this version. */
  readonly syncRun: string;
  readonly sapStatus: SapStatus;
  /**
   * The full run that covered this object and did not carry this record, or
   * null. A record missing from a run is marked, never deleted: only SAP's own
   * deletion flag retires a record, and a dropped file must not empty the list.
   */
  readonly missingFromRun: string | null;
}

/** A material as SAP holds it. Rulings and certificates are portal annotations and are not here. */
export interface MaterialData {
  readonly description: string;
  readonly materialType: MaterialType;
  readonly materialGroup: string;
  readonly baseUnit: Uom;
}

/** A supplier (business partner in the supplier role) as SAP holds it. No performance figure and no bank detail. */
export interface SupplierData {
  /** The portal's own id for this supplier — what documents and seats name. A pointer, not SAP's key. */
  readonly portalSupplierId: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly country: string;
  readonly city: string;
  readonly taxId: string | null;
  readonly businessRegNo: string | null;
  readonly paymentTerm: string | null;
  /** The term alone. SAP keeps the place in a separate field, and so does the replica. */
  readonly incoterm: string | null;
  readonly incotermPlace: string | null;
}

/** What a reference value may carry beside its text. */
export type ReferenceAttribute = 'dimension' | 'days' | 'city' | 'plant';

export interface ReferenceData {
  readonly text: string;
  readonly attributes: Readonly<Partial<Record<ReferenceAttribute, string>>>;
}

export interface MasterDataByObject extends Record<ReferenceTable, ReferenceData> {
  material: MaterialData;
  supplier: SupplierData;
}

export interface MasterRecord<O extends MasterObject = MasterObject> {
  readonly object: O;
  /** SAP's key, opaque: nothing parses it (C9 §3). */
  readonly key: string;
  /** Replicated fields only. */
  readonly data: MasterDataByObject[O];
  readonly stamp: ReplicaStamp;
}

export type MaterialRecord = MasterRecord<'material'>;
export type SupplierRecord = MasterRecord<'supplier'>;
export type ReferenceRecord = MasterRecord<ReferenceTable>;

export const isMaterialRecord = (r: MasterRecord): r is MaterialRecord => r.object === 'material';
export const isSupplierRecord = (r: MasterRecord): r is SupplierRecord => r.object === 'supplier';
export const isReferenceRecord = (r: MasterRecord): r is ReferenceRecord => isReferenceTable(r.object);

/** A sample record is SIMULATED; only a record read from SAP is LIVE. */
export const livenessOfStamp = (stamp: ReplicaStamp): Tier => (stamp.source === 'SAP_S4' ? 'LIVE' : 'SIMULATED');

// ── A sync run ───────────────────────────────────────────────────────────────

/** One record as a run delivers it. `data` is unchecked until the applier reads it. */
export interface InboundRecord {
  readonly object: string;
  readonly key: string;
  readonly data: unknown;
  readonly sapStatus?: SapStatus;
  readonly sourceChangedAt?: string | null;
}

/**
 * `FULL` carries every record of the objects it names, so a record of those
 * objects that it does not carry is marked missing. `DELTA` carries changes
 * only and marks nothing missing.
 */
export type SyncMode = 'FULL' | 'DELTA';

export interface InboundRun {
  readonly id: string;
  readonly source: ReplicaSource;
  /** ISO instant the run was read. Becomes `readAt` on every record it delivers. */
  readonly at: string;
  readonly mode: SyncMode;
  /** The objects a `FULL` run covers. */
  readonly objects: readonly MasterObject[];
  readonly records: readonly InboundRecord[];
}

/** Why an inbound record was not taken. Never a coerced value. */
export type SyncRefusalReason = 'UNKNOWN_OBJECT' | 'EMPTY_KEY' | 'UNKNOWN_UNIT' | 'UNKNOWN_MATERIAL_TYPE' | 'MALFORMED_RECORD';

export const SYNC_REFUSAL_REASONS: readonly SyncRefusalReason[] = [
  'UNKNOWN_OBJECT',
  'EMPTY_KEY',
  'UNKNOWN_UNIT',
  'UNKNOWN_MATERIAL_TYPE',
  'MALFORMED_RECORD',
];

export interface SyncRefusal {
  readonly object: string;
  readonly key: string;
  readonly reason: SyncRefusalReason;
  /** The value that was refused, as the run carried it. */
  readonly value: string;
}

/** One row of the sync log. Append-only. */
export interface SyncRun {
  readonly id: string;
  readonly source: ReplicaSource;
  readonly at: string;
  readonly mode: SyncMode;
  readonly objects: readonly MasterObject[];
  readonly created: number;
  readonly changed: number;
  readonly unchanged: number;
  readonly missing: number;
  readonly refused: readonly SyncRefusal[];
  /** The version each changed record had before this run replaced it. */
  readonly replaced: readonly MasterRecord[];
}
