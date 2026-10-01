// ────────────────────────────────────────────────────────────────────────────
// THE TREE'S OWN PERSON NAMES — the denylist the roles-only guards share.
//
// Lifted out of `readmeNoPersonalNames.guard.test.ts` at G1 so the process
// guides' gate (`guides.test.ts`) reads the SAME population rather than a
// second copy of the matcher. The population is DERIVED from the tree's person
// data — a fixture contact joins it with nobody editing a list — which is why
// there is no word list anywhere (see the README guard's header for the
// measurement behind that).
// ────────────────────────────────────────────────────────────────────────────

/** Person-shaped fixture fields. Derived from source, never listed. */
export const PERSON_FIELD = /\b(?:contactName|contactPerson|personName|displayName|fullName)\s*:\s*'([^']+)'/g;

/** Every person name the tree itself holds, derived from its own person data. */
export function personNamesInTree(corpus: string): string[] {
  return [...new Set([...corpus.matchAll(PERSON_FIELD)].map((m) => m[1]))];
}
