// OPS-2 — the material applicability ruling LEDGER. Append-only; what is in
// force is derived at read (`rulingInForce`), never stored.
//
// It opens EMPTY: a seeded row would claim Compliance ruled something nobody
// ruled. What a material reads with no row is the master's answer.

import type { MaterialRuling } from '../../../sdc/materialRuling';

let rows: MaterialRuling[] = [];
let seq = 0;

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
  reset(): void {
    rows = [];
    seq = 0;
  },
};
