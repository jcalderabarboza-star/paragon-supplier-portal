// ─────────────────────────────────────────────────────────────────────────────
// THE DISPLAY-STATE DERIVATION — who actually writes a state the machine does
// not know?
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//   `PROJECTIONS_EXCLUDED` — in TWO copies, one per flow spec — grouped display
//   states under the comment *"Clock-derived values that MUST NOT be transition-
//   states"*. Its ASSERTION was true of every member: none is a declared state
//   and no transition targets one. Its NAME was true of a minority. The rest are
//   written by a fixture and by nothing else, and one is written by nothing at
//   all. (No tally here — `DISPLAY_STATES` is the population.)
//
//   ⚠️ **AND THE SPLIT ADDED A MEMBER NEITHER COPY EVER HELD: `invoice/Overdue`.**
//   It is genuinely computed — `invoiceProjection.isOverdue(inv, nowIso)` — and
//   no flow knows it, so it met the constants' own criterion the whole time and
//   was simply never listed. That is the cost of a hand-written grouping, and
//   it is the reason this one is pinned to a derivation instead: the omission
//   was invisible precisely because nothing derived the set.
//
//   **The label is why they hid.** The test the constant feeds passes
//   identically whether a state is computed at read or hand-stamped into a
//   fixture, so nothing in the suite could tell the two apart, and the name
//   asserted the answer the test never checked.
//
// ── ⚠️ WHAT COUNTS AS A WRITE, AND THE CONTROL THAT TRAVELS WITH IT ─────────
//   The first version of this matcher counted `=== 'X'` as a write, because
//   `=\s*'X'` matches the tail of a comparison. Every comparison in the tree
//   read as a producer. It was ALSO not entity-scoped, so two different
//   entities returned identical rows — the shared literal `'Expired'` belongs
//   to `contract` AND `supplierDocument`, and a name-keyed census cannot tell
//   them apart. Both halves are fixed here, and a comparison-is-not-a-write
//   control is asserted in the gate BEFORE any row is read: an instrument that
//   answers the question next to the one asked is the same class as a piped
//   exit code, and it is checked rather than remembered.
//
// ── THE LIMITS, STATED BECAUSE A CENSUS THAT HIDES ITS BLIND SPOTS IS WORSE
//    THAN NO CENSUS ────────────────────────────────────────────────────────
//   Writes this cannot see, and would therefore misclassify as absent:
//     1. a value reached through a variable (`status: someVar`) or spread;
//     2. a value built by concatenation or a template literal;
//     3. a write in a `.test.` file — deliberately excluded, because a spec
//        stamping a state is not the product producing it.
//   Each would make a state look LESS produced than it is, which biases toward
//   `stored`/`produced-by-nothing` — the pessimistic direction, and therefore
//   the one that terminates an investigation (§86g). So the gate asserts the
//   two known producers are FOUND, not merely that nothing unexpected appears.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** How a display state comes to exist, derived from its write sites. */
export type ProducedBy = 'computed-at-read' | 'stored-in-fixtures' | 'produced-by-nothing';

export interface WriteSite {
  readonly file: string;
  readonly line: number;
  readonly text: string;
  readonly fixture: boolean;
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every `.ts`/`.tsx` under `src/`, specs excluded — a spec is not the product. */
export function sourceFiles(root = 'src'): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e) && !/\.test\.|\.smoke\./.test(e)) out.push(p.replace(/\\/g, '/'));
    }
  };
  walk(root);
  return out;
}

/**
 * Is this file a FIXTURE — sample data — rather than product logic?
 *
 * Deliberately narrow and path-shaped: `src/data/mockX.ts` and anything under
 * `mock/fixtures/`. A store is NOT a fixture; if a store ever writes one of
 * these states, that is a real producer and the gate must see it as one.
 */
export function isFixture(file: string): boolean {
  return /\/data\/mock[A-Z]|\/mock\/fixtures\//.test(file);
}

/**
 * Files that plausibly OWN an entity. ⚠️ **REQUIRED, NOT AN OPTIMISATION.**
 * `'Expired'` is a member of both `ContractStatus` and `SupplierDocumentStatus`;
 * an unscoped scan returns one entity's write sites under the other's name.
 */
const OWNED_BY: Record<string, RegExp> = {
  contract: /mockContracts|contractStore|\/contracts\//,
  supplierDocument: /supplierDocuments|supplierDocumentStore|SupplierDocuments/,
  shipment: /mockShipments|shipmentStore|Shipments/,
  obligation: /mockObligations|obligationStore/,
  compliance: /complianceRegistry|complianceProjection|Compliance/,
  invoice: /fixtures\/invoices|invoiceStore|invoiceProjection|Invoices/,
};

export function filesForEntity(entity: string, files: string[]): string[] {
  const re = OWNED_BY[entity];
  if (!re) throw new Error(`no ownership pattern for entity '${entity}'`);
  return files.filter((f) => re.test(f));
}

/**
 * WRITE sites for a state literal — set, never compared.
 *
 * `status: 'X'` · `return 'X'` · `= 'X'` where the preceding character is not
 * one of `= ! < >` (which would make it a comparison). Comment-only lines are
 * dropped before matching: a comment quoting a state is not a write, and
 * `halalVerification.ts` contains exactly that.
 */
export function writeSites(state: string, files: string[]): WriteSite[] {
  const q = escape(state);
  const write = new RegExp(`(status\\s*:\\s*'${q}')|(return\\s+'${q}')|([^=!<>]=\\s*'${q}')`);
  const compare = new RegExp(`[=!]==?\\s*'${q}'`);
  const hits: WriteSite[] = [];
  for (const f of files) {
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((raw, i) => {
        const code = raw.replace(/\/\/.*$/, '').trim();
        if (!code || compare.test(code) || !write.test(code)) return;
        hits.push({ file: f, line: i + 1, text: code.slice(0, 100), fixture: isFixture(f) });
      });
  }
  return hits;
}

/**
 * ⚠️ **THE CLASSIFICATION, AND IT RE-DECIDES ITSELF EVERY RUN.** A state that
 * gains a producer LEAVES `stored-in-fixtures` on its own; one whose producer
 * is deleted JOINS it. Neither requires anyone to remember, which is the
 * property a list with a comment cannot have.
 */
export function producedBy(entity: string, state: string, files: string[]): ProducedBy {
  const sites = writeSites(state, filesForEntity(entity, files));
  if (sites.some((s) => !s.fixture)) return 'computed-at-read';
  return sites.length > 0 ? 'stored-in-fixtures' : 'produced-by-nothing';
}
