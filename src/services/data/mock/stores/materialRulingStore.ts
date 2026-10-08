// OPS-2 — the material applicability ruling LEDGER. Append-only; what is in
// force is derived at read (`rulingInForce`), never stored.
//
// OPS-2b — it opens on the SAMPLE BPOM rulings (`materialRulingSeed.ts`), by
// operator ruling. It opened EMPTY at OPS-2, which left every raw material the
// master had not determined unreceivable until somebody ruled it by hand. What
// a material reads with no row is still the master's answer.

import type { MaterialRuling } from '../../../sdc/materialRuling';
import { sampleMaterialRulings } from '../materialRulingSeed';

let rows: MaterialRuling[] = sampleMaterialRulings();
let seq = rows.length;

export const materialRulingStore = {
  all(): readonly MaterialRuling[] {
    return rows;
  },
  forMaterial(materialCode: string): readonly MaterialRuling[] {
    return rows.filter((r) => r.materialCode === materialCode);
  },
  nextSeq(): number {
    return ++seq;
  },
  append(row: MaterialRuling): void {
    rows = [...rows, row];
  },
  /** Back to the opening rows — the sample rulings, nothing a session added. */
  reset(): void {
    rows = sampleMaterialRulings();
    seq = rows.length;
  },
};
