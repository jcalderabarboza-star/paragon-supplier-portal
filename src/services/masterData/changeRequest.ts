// ─────────────────────────────────────────────────────────────────────────────
// MD-4 · A CHANGE REQUEST — the portal's proposal about SAP's record.
//
// SAP owns master data, so the portal never changes a record: it PROPOSES. A
// request names what is asked for, goes through review under four eyes, is
// handed to SAP as a package, and ends on SAP's answer. Approval in the portal
// means Paragon agreed to ask; it does not mean the record exists. The record
// changes only when a sync run delivers it (`syncApplier.ts`).
//
// This file is the document and the rules a proposal must obey, with no store
// and no dispatcher in it, so a spec can hold each rule on its own.
//
// A request NEVER carries a proposed key for a new record: the portal does not
// mint one. SAP's key arrives with SAP's answer.
// ─────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';
import { isKnownReference } from './lookup';
import { recordOf } from './replica';
import {
  KNOWN_MATERIAL_TYPES,
  KNOWN_UNITS,
  type MasterRecord,
  type MaterialData,
  type ReferenceTable,
  type SupplierData,
} from './types';

export const MDR_KINDS = ['material.create', 'material.change', 'supplier.change'] as const;
export type MdrKind = (typeof MDR_KINDS)[number];
export const isMdrKind = (value: unknown): value is MdrKind =>
  typeof value === 'string' && (MDR_KINDS as readonly string[]).includes(value);

export const MDR_STATES = [
  'Proposed',
  'In Review',
  'Approved',
  'Sent to SAP',
  'Completed in SAP',
  'Declined by SAP',
  'Rejected',
  'Withdrawn',
] as const;
export type MdrState = (typeof MDR_STATES)[number];

/** The states a request can still move from. A second request on the same subject is refused while one is open. */
export const MDR_OPEN_STATES: readonly MdrState[] = ['Proposed', 'In Review', 'Approved', 'Sent to SAP'];

/** The master object a kind is about. */
export const objectOfKind = (kind: MdrKind): 'material' | 'supplier' => (kind === 'supplier.change' ? 'supplier' : 'material');

/** The lane that reviews a kind (decision 7): materials planning, suppliers compliance. */
export const REVIEWER_LANE: Record<MdrKind, 'planning' | 'compliance'> = {
  'material.create': 'planning',
  'material.change': 'planning',
  'supplier.change': 'compliance',
};

type MaterialField = keyof MaterialData;
type SupplierField = Exclude<keyof SupplierData, 'portalSupplierId'>;

/** The fields a kind may propose. `portalSupplierId` is the portal's pointer, not SAP's field, and is never proposed. */
export const MDR_FIELDS: { readonly [K in MdrKind]: readonly string[] } = {
  'material.create': ['description', 'materialType', 'materialGroup', 'baseUnit'] satisfies readonly MaterialField[],
  'material.change': ['description', 'materialGroup', 'baseUnit'] satisfies readonly MaterialField[],
  'supplier.change': [
    'name',
    'legalName',
    'country',
    'city',
    'taxId',
    'businessRegNo',
    'paymentTerm',
    'incoterm',
    'incotermPlace',
  ] satisfies readonly SupplierField[],
};

/** A proposed field whose value must be a key of a reference table. */
const REFERENCE_OF_FIELD: Readonly<Record<string, ReferenceTable>> = {
  materialGroup: 'materialGroup',
  baseUnit: 'unit',
  materialType: 'materialType',
  country: 'country',
  paymentTerm: 'paymentTerm',
  incoterm: 'incoterm',
};

/** What the replica held when the request was written: what it is checked against before approval and hand-off. */
export interface MdrBase {
  readonly syncRun: string;
  readonly readAt: string;
  readonly sourceChangedAt: string | null;
  /** The subject's value of each proposed field at proposal time. */
  readonly values: Readonly<Record<string, string | null>>;
}

export interface MdrAct {
  readonly act: string;
  readonly at: string;
  readonly by: ActorAttribution;
  readonly note: string | null;
}

export interface MdrSapAnswer {
  /** SAP's own change-request number. */
  readonly sapRequestNumber: string;
  /** The key of the record SAP created or changed; null when SAP declined. */
  readonly resultKey: string | null;
  /** SAP's reason, when it declined. */
  readonly reason: string | null;
  /** A sample answer was recorded on a demo deployment: SAP was not asked. */
  readonly sample: boolean;
}

export interface MasterDataRequest {
  readonly id: string;
  /** The portal's request number: SAP's external reference and the feed's idempotency key. */
  readonly number: string;
  readonly kind: MdrKind;
  /** SAP's key of the record the request is about; null for a create. */
  readonly subjectKey: string | null;
  readonly proposed: Readonly<Record<string, string>>;
  readonly reason: string;
  readonly state: MdrState;
  readonly proposedBy: ActorAttribution;
  readonly proposedAt: string;
  readonly base: MdrBase | null;
  readonly sap: MdrSapAnswer | null;
  /** Append-only: every act taken on the request, oldest first. */
  readonly history: readonly MdrAct[];
}

export type MdrRefusal =
  | 'MDR_KIND_UNKNOWN'
  | 'MDR_REASON_BLANK'
  | 'MDR_CREATE_CARRIES_KEY'
  | 'MDR_SUBJECT_UNKNOWN'
  | 'MDR_FIELD_NOT_PROPOSABLE'
  | 'MDR_FIELD_MISSING'
  | 'MDR_VALUE_NOT_IN_TABLE'
  | 'MDR_NOTHING_CHANGES';

export interface MdrFinding {
  readonly refusal: MdrRefusal;
  /** The field or value the refusal is about, for the sentence that names it. */
  readonly about: string;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

/** The subject's current value of a field, as text; null when the record does not hold it. */
export function currentValue(record: MasterRecord, field: string): string | null {
  const value = (record.data as unknown as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : null;
}

/** The proposed fields as trimmed text, blanks dropped. */
export function cleanProposed(proposed: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof proposed !== 'object' || proposed === null) return out;
  for (const [field, value] of Object.entries(proposed as Record<string, unknown>)) {
    const t = text(value);
    if (t !== null) out[field] = t;
  }
  return out;
}

/**
 * Is this proposal one the portal may raise? The first refusal, or null.
 *
 * A create must carry every field and no key. A change must name a record the
 * replica holds and move at least one field. A value that belongs to a
 * reference table must be in it: a proposal SAP would bounce on its face is
 * refused here by name.
 */
export function validateProposal(input: {
  kind: unknown;
  subjectKey: unknown;
  proposed: unknown;
  reason: unknown;
}): MdrFinding | null {
  if (!isMdrKind(input.kind)) return { refusal: 'MDR_KIND_UNKNOWN', about: String(input.kind) };
  const kind = input.kind;
  if (text(input.reason) === null) return { refusal: 'MDR_REASON_BLANK', about: kind };
  const proposed = cleanProposed(input.proposed);
  const allowed = MDR_FIELDS[kind];
  const stray = Object.keys(proposed).find((f) => !allowed.includes(f));
  if (stray) return { refusal: 'MDR_FIELD_NOT_PROPOSABLE', about: stray };

  const subjectKey = text(input.subjectKey);
  let subject: MasterRecord | null = null;
  if (kind === 'material.create') {
    if (subjectKey !== null) return { refusal: 'MDR_CREATE_CARRIES_KEY', about: subjectKey };
    const missing = allowed.find((f) => proposed[f] === undefined);
    if (missing) return { refusal: 'MDR_FIELD_MISSING', about: missing };
  } else {
    subject = subjectKey === null ? null : recordOf(objectOfKind(kind), subjectKey);
    if (!subject) return { refusal: 'MDR_SUBJECT_UNKNOWN', about: subjectKey ?? '' };
  }

  for (const [field, value] of Object.entries(proposed)) {
    const table = REFERENCE_OF_FIELD[field];
    if (!table) continue;
    const known =
      field === 'baseUnit'
        ? (KNOWN_UNITS as readonly string[]).includes(value) && isKnownReference(table, value)
        : field === 'materialType'
          ? (KNOWN_MATERIAL_TYPES as readonly string[]).includes(value)
          : isKnownReference(table, value);
    if (!known) return { refusal: 'MDR_VALUE_NOT_IN_TABLE', about: `${field}: ${value}` };
  }

  if (subject && !Object.entries(proposed).some(([field, value]) => currentValue(subject as MasterRecord, field) !== value)) {
    return { refusal: 'MDR_NOTHING_CHANGES', about: subject.key };
  }
  return null;
}

/** The base a request is written against: the subject's stamp and its value of each proposed field. */
export function baseOf(kind: MdrKind, subjectKey: string | null, proposed: Readonly<Record<string, string>>): MdrBase | null {
  if (subjectKey === null) return null;
  const subject = recordOf(objectOfKind(kind), subjectKey);
  if (!subject) return null;
  return {
    syncRun: subject.stamp.syncRun,
    readAt: subject.stamp.readAt,
    sourceChangedAt: subject.stamp.sourceChangedAt,
    values: Object.fromEntries(Object.keys(proposed).map((f) => [f, currentValue(subject, f)])),
  };
}

/**
 * The proposed fields SAP has changed since the request was written. A request
 * is a proposal about SAP's record and never had a claim on the value, so a
 * field SAP moved first holds the request until the proposer withdraws it.
 */
export function fieldsSapChanged(request: Pick<MasterDataRequest, 'kind' | 'subjectKey' | 'base'>): string[] {
  if (!request.base || request.subjectKey === null) return [];
  const subject = recordOf(objectOfKind(request.kind), request.subjectKey);
  if (!subject) return Object.keys(request.base.values);
  return Object.keys(request.base.values).filter((f) => currentValue(subject, f) !== request.base?.values[f]);
}

export const isOpen = (request: Pick<MasterDataRequest, 'state'>): boolean => MDR_OPEN_STATES.includes(request.state);

/** Do two proposals touch the same subject and at least one of the same fields? */
export function overlaps(
  a: Pick<MasterDataRequest, 'kind' | 'subjectKey' | 'proposed'>,
  b: { kind: MdrKind; subjectKey: string | null; proposed: Readonly<Record<string, string>> },
): boolean {
  if (objectOfKind(a.kind) !== objectOfKind(b.kind)) return false;
  if (a.subjectKey === null || b.subjectKey === null) {
    // Two creates are the same ask when they describe the same material.
    return a.subjectKey === null && b.subjectKey === null && a.proposed.description === b.proposed.description;
  }
  return a.subjectKey === b.subjectKey && Object.keys(a.proposed).some((f) => f in b.proposed);
}

/** What is handed to SAP: a package, not a write. */
export interface HandOffPackage {
  readonly externalReference: string;
  readonly kind: MdrKind;
  readonly object: 'material' | 'supplier';
  readonly subjectKey: string | null;
  readonly proposed: Readonly<Record<string, string>>;
  readonly reason: string;
  readonly proposedBy: string | null;
  readonly approvedBy: string | null;
  /** What the proposal was written against, so SAP can see it. */
  readonly base: MdrBase | null;
}

const personOf = (actor: ActorAttribution | undefined): string | null =>
  actor && actor.kind === 'RESOLVED' ? actor.person.personId : null;

export function handOffPackage(request: MasterDataRequest): HandOffPackage {
  const approval = [...request.history].reverse().find((h) => h.act === 't_mdr_approve');
  return {
    externalReference: request.number,
    kind: request.kind,
    object: objectOfKind(request.kind),
    subjectKey: request.subjectKey,
    proposed: request.proposed,
    reason: request.reason,
    proposedBy: personOf(request.proposedBy),
    approvedBy: personOf(approval?.by),
    base: request.base,
  };
}
