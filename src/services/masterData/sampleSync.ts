// ─────────────────────────────────────────────────────────────────────────────
// MD-5 · THE SAMPLE SYNC — a prepared run that shows "SAP wins".
//
// On a demo or preview deployment a person may run this once. It is a sync run
// like any other, applied by the applier and stamped SAMPLE: a description SAP
// "changed", a reference value SAP "added", a supplier SAP "blocked", and one
// record the replica refuses by name. It is refused on production, where the
// only runs are SAP's (SE-6).
// ─────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT_INSTANT } from '../data/fixturePresent';
import { moduleDeployment } from '../modules/deployment';
import { recordOf, syncRuns } from './replica';
import { applySyncRun } from './syncApplier';
import type { InboundRecord, SyncRun } from './types';

export const SAMPLE_SYNC_RUN_ID = 'SAMPLE-SYNC-0001';

/** The material whose description the run changes, and the supplier it blocks. */
export const SAMPLE_SYNC_MATERIAL = 'RM-EMUL-3310';
export const SAMPLE_SYNC_SUPPLIER = 'BP-10001236';

export type SampleSyncRefusal = 'SAMPLE_SYNC_IN_PRODUCTION' | 'SAMPLE_SYNC_ALREADY_RUN';

export const sampleSyncHasRun = (): boolean => syncRuns().some((r) => r.id === SAMPLE_SYNC_RUN_ID);

/** Why the sample sync cannot be run now, or null. */
export function sampleSyncRefusal(): SampleSyncRefusal | null {
  if (moduleDeployment.isProduction()) return 'SAMPLE_SYNC_IN_PRODUCTION';
  if (sampleSyncHasRun()) return 'SAMPLE_SYNC_ALREADY_RUN';
  return null;
}

function records(): InboundRecord[] {
  const material = recordOf('material', SAMPLE_SYNC_MATERIAL);
  const supplier = recordOf('supplier', SAMPLE_SYNC_SUPPLIER);
  return [
    ...(material
      ? [{ object: 'material', key: material.key, data: { ...material.data, description: `${material.data.description} (pharma grade)` }, sourceChangedAt: DECLARED_PRESENT_INSTANT }]
      : []),
    { object: 'incoterm', key: 'DAP', data: { text: 'Delivered at Place' } },
    ...(supplier ? [{ object: 'supplier', key: supplier.key, data: supplier.data, sapStatus: 'BLOCKED' as const }] : []),
    // One record the replica cannot hold: refused by name, kept in the log.
    { object: 'material', key: 'RM-SAMPLE-DRUM-01', data: { description: 'A material held in drums', materialType: 'ROH', materialGroup: 'MG-10', baseUnit: 'DRUM' } },
  ];
}

/** Run the sample sync. Returns the log row, or the reason it was not run. */
export function runSampleSync(): { ok: true; run: SyncRun } | { ok: false; refusal: SampleSyncRefusal } {
  const refusal = sampleSyncRefusal();
  if (refusal) return { ok: false, refusal };
  const run = applySyncRun({
    id: SAMPLE_SYNC_RUN_ID,
    source: 'SAMPLE',
    at: DECLARED_PRESENT_INSTANT,
    mode: 'DELTA',
    objects: [],
    records: records(),
  });
  return { ok: true, run };
}
