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
// ── ⚠️ A CLAIM THIS HEADER MADE AND THE TREE DID NOT SUPPORT — RETIRED, AND
//    QUOTED RATHER THAN DELETED ─────────────────────────────────────────────
//   The paragraph above read, in the version that merged at #315:
//
//       "Comment-only lines are dropped before matching: a comment quoting a
//        state is not a write, and `halalVerification.ts` contains exactly
//        that."
//
//   **The first clause was false on this repo's line endings and the second
//   was the case it was failing on.** `core.autocrlf` is on here, the strip
//   split on a bare `'\n'`, and a `$` without `m` means end of STRING — so on
//   every `…\r`-terminated line the strip did not fire. Nothing was dropped:
//   **every commented line in `sourceFiles()` was scanned as code** — derive
//   the figure as lines matching `/^\s*\/\//` across that walk, which is how
//   the batch measured it, rather than reading one here. (The first draft of
//   this paragraph carried the number and it was wrong by 29 on the next run
//   — `FLOOR-IN-PROSE-01`, inside the correction to a different defect.) The
//   one comment in the tree that matches a write pattern —
//   `halalVerification.ts:58`, quoting `status: 'Expiring Soon'` — was
//   acquitted only because it sits outside `supplierDocument`'s file scope.
//   **Luck, in the exact place the header claimed design.**
//
//   ⚠️ **AND THE SHAPE IS WORTH MORE THAN THE BUG: THE COMMENT NAMED THE ONE
//   CASE THAT WOULD HAVE FALSIFIED IT.** A header that cites its hardest
//   example reads as unusually well-evidenced, which is what stopped anyone
//   checking whether the example passes. Cite the case AND assert it — the
//   equivalence pair in `projectionGate.test.ts` is that assertion, and it
//   feeds the same bytes in both line endings so neither can be believed alone.
//
// ── THE LIMITS, STATED BECAUSE A CENSUS THAT HIDES ITS BLIND SPOTS IS WORSE
//    THAN NO CENSUS ────────────────────────────────────────────────────────
//   Writes this cannot see, and would therefore misclassify as absent:
//     1. a value reached through a variable (`status: someVar`) or spread;
//     2. a value built by concatenation or a template literal;
//     3. a write in a `.test.` file — deliberately excluded, because a spec
//        stamping a state is not the product producing it;
//     4. a write on a line that ALSO contains `//` inside a string literal —
//        `const u = 'https://x'` truncates at the `//`. Named because the
//        strip now genuinely runs, so this limit is real where it used to be
//        theoretical; measured to change no verdict in this tree.
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
 *
 * ⚠️ **THE SPLIT IS `/\r?\n/`, AND THAT IS THE FIX, NOT A TIDY-UP.** This
 * function shipped splitting on a bare `'\n'`, which leaves a `\r` on every
 * line of a CRLF working copy — and `core.autocrlf` is on in this repo, so
 * that is every line of every file. The comment strip below is
 * `$`-anchored WITHOUT `m`, so `$` means END OF STRING; `.` does not match
 * `\r`, so `.*` stops one character short and **the strip never fired.** Every
 * comment in the tree was scanned as code.
 *
 * The repair is made at the SPLIT rather than at the regex on purpose: it
 * removes the `\r` for every per-line matcher this function will ever hold,
 * where an `m` flag would have repaired exactly one of them. The coupling is
 * therefore load-bearing — **the strip below is correct only because no line
 * reaching it can carry a `\r`** — and it is checked rather than trusted, by a
 * CRLF/LF equivalence pair in `projectionGate.test.ts` that feeds the same
 * bytes in both line endings and demands identical output.
 */
export function writeSites(state: string, files: string[]): WriteSite[] {
  const q = escape(state);
  const write = new RegExp(`(status\\s*:\\s*'${q}')|(return\\s+'${q}')|([^=!<>]=\\s*'${q}')`);
  const compare = new RegExp(`[=!]==?\\s*'${q}'`);
  const hits: WriteSite[] = [];
  for (const f of files) {
    readFileSync(f, 'utf8')
      .split(/\r?\n/)
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
