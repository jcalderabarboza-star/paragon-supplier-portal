// MD-4 — the change-request store. In memory, like the other document stores:
// a request made in a session is gone on reload, and the page says so. The
// durable store is SE-4.
import type { MasterDataRequest } from '../../../masterData/changeRequest';

let rows: MasterDataRequest[] = [];
let seq = 0;

export const masterDataRequestStore = {
  all(): readonly MasterDataRequest[] {
    return rows;
  },
  get(id: string): MasterDataRequest | undefined {
    return rows.find((r) => r.id === id);
  },
  /** The next request number. The portal's own number, never SAP's. */
  nextNumber(): { id: string; number: string } {
    seq += 1;
    const n = String(seq).padStart(4, '0');
    return { id: `mdr-${n}`, number: `MDR-2026-${n}` };
  },
  add(request: MasterDataRequest): void {
    rows = [...rows, request];
  },
  update(id: string, next: (r: MasterDataRequest) => MasterDataRequest): void {
    rows = rows.map((r) => (r.id === id ? next(r) : r));
  },
  reset(): void {
    rows = [];
    seq = 0;
  },
};
