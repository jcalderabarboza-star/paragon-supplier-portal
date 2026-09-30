// ────────────────────────────────────────────────────────────────────────────
// B4b · THE ALLOCATION ANCHOR — the seam row a supplier's allocation cell is
// anchored to (Design 1 §5.3): one supplier's share of one material-period
// total on one DRAFT publication. An overlay entry keys on it (C6 §1: a planned
// value cannot exist without a seam row), and the push reads the publication,
// the supplier, the material and the bucket back out of it — the entry never
// carries a second copy that could disagree with its own key.
// ────────────────────────────────────────────────────────────────────────────

export interface AllocationAnchor {
  readonly publicationId: string;
  readonly supplierId: string;
  readonly materialCode: string;
  readonly periodBucket: string;
}

const PREFIX = 'alloc';
const SEP = '::';

export const allocationAnchor = (a: AllocationAnchor): string =>
  [PREFIX, a.publicationId, a.supplierId, a.materialCode, a.periodBucket].join(SEP);

/** The anchor back out of its key, or null — the key is not an allocation anchor. */
export function parseAllocationAnchor(ref: string): AllocationAnchor | null {
  const parts = ref.split(SEP);
  if (parts.length !== 5 || parts[0] !== PREFIX || parts.slice(1).some((p) => p === '')) return null;
  const [, publicationId, supplierId, materialCode, periodBucket] = parts;
  return { publicationId, supplierId, materialCode, periodBucket };
}
