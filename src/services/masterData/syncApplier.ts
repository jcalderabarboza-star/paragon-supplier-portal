// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE SYNC APPLIER — the one writer of the replica.
//
// Sync runs one way, SAP to portal, and SAP wins:
//   · an inbound record REPLACES the replica record whole — no field-level
//     merge, no "keep mine". The version it replaced goes into the sync log.
//   · a record a FULL run does not carry is MARKED, never deleted. Only SAP's
//     own deletion flag retires a record; a dropped file must not empty a list.
//   · an inbound value the tree cannot hold is REFUSED BY NAME and written into
//     the log. A unit outside the closed unit union is never coerced: a unit has
//     arithmetic consequences (the `D-OPS-MASTERMISS` argument), and a refused
//     record keeps the version the replica already had.
//   · a run applied twice changes nothing the second time. The run id is the
//     idempotency key.
//
// In the fixture the only run is the seed (`seed.ts`), applied on first read.
// The feed that calls this for real is SE-6.
// ─────────────────────────────────────────────────────────────────────────────

import { replicaRead, replicaWrite } from './replicaStore';
import { buildSeedRun } from './seed';
import {
  KNOWN_MATERIAL_TYPES,
  KNOWN_UNITS,
  isMasterObject,
  type InboundRecord,
  type InboundRun,
  type MasterDataByObject,
  type MasterObject,
  type MasterRecord,
  type MaterialData,
  type ReferenceAttribute,
  type ReferenceData,
  type SupplierData,
  type SyncRefusal,
  type SyncRefusalReason,
  type SyncRun,
} from './types';

type Checked<O extends MasterObject> =
  | { readonly ok: true; readonly data: MasterDataByObject[O] }
  | { readonly ok: false; readonly reason: SyncRefusalReason; readonly value: string };

const refuse = (reason: SyncRefusalReason, value: unknown): { ok: false; reason: SyncRefusalReason; value: string } => ({
  ok: false,
  reason,
  value: typeof value === 'string' ? value : JSON.stringify(value) ?? '',
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const textOrNull = (v: unknown): v is string | null | undefined => v === null || v === undefined || typeof v === 'string';
const includes = (list: readonly string[], v: unknown): boolean => typeof v === 'string' && list.includes(v);

function checkMaterial(data: unknown): Checked<'material'> {
  if (!isRecord(data) || !isText(data.description) || !isText(data.materialGroup)) return refuse('MALFORMED_RECORD', data);
  if (!includes(KNOWN_MATERIAL_TYPES, data.materialType)) return refuse('UNKNOWN_MATERIAL_TYPE', data.materialType);
  if (!includes(KNOWN_UNITS, data.baseUnit)) return refuse('UNKNOWN_UNIT', data.baseUnit);
  return {
    ok: true,
    data: Object.freeze({
      description: data.description,
      materialType: data.materialType as MaterialData['materialType'],
      materialGroup: data.materialGroup,
      baseUnit: data.baseUnit as MaterialData['baseUnit'],
    }),
  };
}

const SUPPLIER_OPTIONAL = ['legalName', 'taxId', 'businessRegNo', 'paymentTerm', 'incoterm', 'incotermPlace'] as const;

function checkSupplier(data: unknown): Checked<'supplier'> {
  if (
    !isRecord(data) ||
    !isText(data.portalSupplierId) ||
    !isText(data.name) ||
    !isText(data.country) ||
    !isText(data.city) ||
    !SUPPLIER_OPTIONAL.every((f) => textOrNull(data[f]))
  ) {
    return refuse('MALFORMED_RECORD', data);
  }
  const optional = (f: (typeof SUPPLIER_OPTIONAL)[number]): string | null => (isText(data[f]) ? (data[f] as string) : null);
  const supplier: SupplierData = {
    portalSupplierId: data.portalSupplierId,
    name: data.name,
    legalName: optional('legalName'),
    country: data.country,
    city: data.city,
    taxId: optional('taxId'),
    businessRegNo: optional('businessRegNo'),
    paymentTerm: optional('paymentTerm'),
    incoterm: optional('incoterm'),
    incotermPlace: optional('incotermPlace'),
  };
  return { ok: true, data: Object.freeze(supplier) };
}

const REFERENCE_ATTRIBUTES: readonly ReferenceAttribute[] = ['dimension', 'days', 'city', 'plant'];

function checkReference(object: MasterObject, key: string, data: unknown): Checked<MasterObject> {
  // The unit and material-type tables must stay inside their unions: a value
  // SAP adds is refused here by name until the union is widened in code.
  if (object === 'unit' && !includes(KNOWN_UNITS, key)) return refuse('UNKNOWN_UNIT', key);
  if (object === 'materialType' && !includes(KNOWN_MATERIAL_TYPES, key)) return refuse('UNKNOWN_MATERIAL_TYPE', key);
  if (!isRecord(data) || !isText(data.text)) return refuse('MALFORMED_RECORD', data);
  const given = isRecord(data.attributes) ? data.attributes : {};
  const attributes: Partial<Record<ReferenceAttribute, string>> = {};
  for (const a of REFERENCE_ATTRIBUTES) {
    if (isText(given[a])) attributes[a] = given[a] as string;
  }
  const reference: ReferenceData = { text: data.text, attributes: Object.freeze(attributes) };
  return { ok: true, data: Object.freeze(reference) };
}

function check(object: MasterObject, inbound: InboundRecord): Checked<MasterObject> {
  if (object === 'material') return checkMaterial(inbound.data);
  if (object === 'supplier') return checkSupplier(inbound.data);
  return checkReference(object, inbound.key, inbound.data);
}

/** Two versions say the same thing when SAP's fields and SAP's status are equal. */
const sameVersion = (a: MasterRecord, b: MasterRecord): boolean =>
  JSON.stringify([a.data, a.stamp.sapStatus, a.stamp.sourceChangedAt, a.stamp.source]) ===
  JSON.stringify([b.data, b.stamp.sapStatus, b.stamp.sourceChangedAt, b.stamp.source]);

/**
 * Apply one run to the replica and return its log row. The only function in
 * the tree that writes a replica record.
 */
export function applySyncRun(run: InboundRun): SyncRun {
  const already = replicaRead.log().find((r) => r.id === run.id);
  if (already) return already;

  let created = 0;
  let changed = 0;
  let unchanged = 0;
  const refused: SyncRefusal[] = [];
  const replaced: MasterRecord[] = [];
  /** Every key the run carried, taken or refused: a refused record was in the run, so it is not missing. */
  const carried = new Map<MasterObject, Set<string>>();

  for (const inbound of run.records) {
    if (!isMasterObject(inbound.object)) {
      refused.push({ object: inbound.object, key: inbound.key, reason: 'UNKNOWN_OBJECT', value: inbound.object });
      continue;
    }
    const object = inbound.object;
    if (!isText(inbound.key)) {
      refused.push({ object, key: inbound.key, reason: 'EMPTY_KEY', value: String(inbound.key) });
      continue;
    }
    if (!carried.has(object)) carried.set(object, new Set());
    carried.get(object)?.add(inbound.key);

    const checked = check(object, inbound);
    if (!checked.ok) {
      refused.push({ object, key: inbound.key, reason: checked.reason, value: checked.value });
      continue;
    }
    const next: MasterRecord = Object.freeze({
      object,
      key: inbound.key,
      data: checked.data,
      stamp: Object.freeze({
        source: run.source,
        readAt: run.at,
        sourceChangedAt: inbound.sourceChangedAt ?? null,
        syncRun: run.id,
        sapStatus: inbound.sapStatus ?? 'ACTIVE',
        missingFromRun: null,
      }),
    });
    const previous = replicaRead.get(object, inbound.key);
    if (!previous) {
      created += 1;
      replicaWrite.put(next);
    } else if (sameVersion(previous, next)) {
      unchanged += 1;
      // Read again and found equal: the version keeps the run that delivered it.
      replicaWrite.put(Object.freeze({ ...next, stamp: Object.freeze({ ...next.stamp, syncRun: previous.stamp.syncRun }) }));
    } else {
      changed += 1;
      replaced.push(previous);
      replicaWrite.put(next);
    }
  }

  let missing = 0;
  if (run.mode === 'FULL') {
    for (const object of run.objects) {
      const seen = carried.get(object) ?? new Set<string>();
      for (const record of replicaRead.all(object)) {
        if (seen.has(record.key)) continue;
        missing += 1;
        replicaWrite.put(Object.freeze({ ...record, stamp: Object.freeze({ ...record.stamp, missingFromRun: run.id }) }));
      }
    }
  }

  const row: SyncRun = Object.freeze({
    id: run.id,
    source: run.source,
    at: run.at,
    mode: run.mode,
    objects: Object.freeze([...run.objects]),
    created,
    changed,
    unchanged,
    missing,
    refused: Object.freeze(refused),
    replaced: Object.freeze(replaced),
  });
  replicaWrite.appendRun(row);
  version += 1;
  return row;
}

// ── The seed ─────────────────────────────────────────────────────────────────

let seeded = false;
let version = 0;

/** Moves each time a run is applied or the replica is reset. What a view built from the replica is keyed on. */
export const replicaVersion = (): number => version;

/** Apply the seed run once. Every read of the replica goes through here first. */
export function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  applySyncRun(buildSeedRun());
}

/** Empty the replica and its log, so the next read seeds it again. For specs. */
export function resetReplica(): void {
  replicaWrite.reset();
  seeded = false;
  version += 1;
}
