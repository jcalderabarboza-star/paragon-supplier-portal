// ─────────────────────────────────────────────────────────────────────────────
// MD-2 · ONE TRUTH FOR A MATERIAL — the master the lookups read is the replica.
//
// `labelOf`, `uomOf`, `requireUom`, `isKnownMaterial`, `bpomOf` and `halalOf`
// each take a master and default it. Until MD-2 the default was the frozen
// fixture. It is now this view: SAP's fields from the replica (description,
// type, group, base unit), with the portal's own annotations beside them.
//
// So a material a sync run delivers is known to every lookup the moment the run
// is applied, and a description SAP changes is the description every page shows.
//
// The two applicability fields are NOT SAP's. They are portal annotations, and
// their opening values still come from the fixture row for the same code. A
// material the replica holds and the fixture does not reads `UNDETERMINED` on
// both: an absence of determination is written down, never inferred, and
// Compliance rules it on the ruling ledger.
//
// Built once per state of the replica (`replicaVersion`), because the lookups
// are called in loops.
// ─────────────────────────────────────────────────────────────────────────────

import { MATERIAL_MASTER } from '../sdc/fixtures';
import type { MaterialMaster, MaterialMasterEntry } from '../sdc/types';
import { materialRecords } from './replica';
import { replicaVersion } from './syncApplier';

let built: { readonly version: number; readonly master: MaterialMaster } | null = null;

export function materialMasterView(): MaterialMaster {
  // Reading the records seeds the replica, so the version is read after them.
  const records = materialRecords();
  const version = replicaVersion();
  if (built && built.version === version) return built.master;
  const master: Record<string, MaterialMasterEntry> = {};
  for (const record of records) {
    const annotated = Object.prototype.hasOwnProperty.call(MATERIAL_MASTER, record.key) ? MATERIAL_MASTER[record.key] : null;
    master[record.key] = Object.freeze({
      materialCode: record.key,
      label: record.data.description,
      materialType: record.data.materialType,
      materialGroup: record.data.materialGroup,
      canonicalUom: record.data.baseUnit,
      bpomApplicable: annotated?.bpomApplicable ?? 'UNDETERMINED',
      halalApplicable: annotated?.halalApplicable ?? 'UNDETERMINED',
    });
  }
  built = { version, master: Object.freeze(master) };
  return built.master;
}
