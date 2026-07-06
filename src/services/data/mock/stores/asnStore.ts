// ────────────────────────────────────────────────────────────────────────────
// Mutable ASN store (v2.2 Step 4 batch i).
//
// Same contract as purchaseOrderStore: reads resolve from here, commands mutate
// IMMUTABLY (new object + new array — never in place), so the invalidated query
// yields new references and every derivation re-derives together. Creation ADDS
// a new ASN with a store-assigned number (no fabricated document id). Keyed by
// asnNumber (the ASN has no separate id).
// ────────────────────────────────────────────────────────────────────────────

import { MOCK_ASNS } from '../fixtures/supplierShipments';
import type { ASN } from '../../types';

function clone(a: ASN): ASN {
  return { ...a, details: { ...a.details }, lineItems: a.lineItems.map((li) => ({ ...li })) };
}

let rows: ASN[] = MOCK_ASNS.map(clone);
let seq = 0;

export const asnStore = {
  all(): readonly ASN[] {
    return rows;
  },
  get(asnNumber: string): ASN | undefined {
    return rows.find((a) => a.asnNumber === asnNumber);
  },
  /** Immutable update — swap in a new ASN + new array (see purchaseOrderStore). */
  update(asnNumber: string, next: (a: ASN) => ASN): void {
    rows = rows.map((a) => (a.asnNumber === asnNumber ? next(a) : a));
  },
  /** Add a newly-created ASN (creation). New array reference. */
  add(asn: ASN): void {
    rows = [asn, ...rows];
  },
  /** Store-assigned ASN number for a creation (the supplier's own document). */
  nextNumber(): string {
    seq += 1;
    return `ASN-2026-${900 + seq}`;
  },
  reset(): void {
    rows = MOCK_ASNS.map(clone);
    seq = 0;
  },
};
