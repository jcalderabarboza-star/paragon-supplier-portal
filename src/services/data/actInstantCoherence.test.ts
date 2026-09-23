// ─────────────────────────────────────────────────────────────────────────────
// A SEEDED ACT-INSTANT STAMP CANNOT NAME AN INSTANT THAT HAS NOT ARRIVED.
//
// ⚠️ **WHAT THIS GUARDS, AND WHY NOTHING GUARDED IT BEFORE.** Some stored dates
// are HORIZONS — an expiry, a due date, an ETA — and belong in the future by
// construction. Others are ACT INSTANTS: the moment a thing was done. The tree
// already knows which are which, and it knows it in one place that is not a
// list: **a shipped command mints an act instant from a clock at the moment the
// act is dispatched.** `t_supplierdoc_reject` writes `rejectedAt` that way. No
// command mints an expiry.
//
// So a seeded value of such a field is a claim that the act ALREADY HAPPENED,
// and a claim that already happened cannot sit after the declared present. When
// it does, the seeded row and every runtime one land on OPPOSITE SIDES of the
// present — which is the ordering inversion `invoiceWriteIsClockIndependent.
// test.ts` names in its own reach block and could not fix, because it is a
// property of the literal rather than of the write clock.
//
// It went unguarded because `fixturePresent.guard.test.ts`'s supplierDocument
// oracle takes its population as `DOCUMENTS.filter((d) => d.expiryDate)` — the
// rows with a horizon. `doc-012` has none, so it was not in the population at
// all, and no instrument in the tree compared an act instant against `P` for any
// family.
//
// ── THE POPULATION IS AN INTERSECTION, AND BOTH HALVES ARE DERIVED ───────────
//   1. **What the shift moves** — from each family's own
//      `shiftFields(corpus, 'family', [fields])` call. That call IS the tree's
//      statement of which dates belong to which family.
//   2. **What a command mints at the instant of the act** — from the property
//      assignments in shipped source whose initializer reaches a clock, resolved
//      through wrappers (`.toISOString()`, `.slice(…)`), through a receiver
//      (`sdcClock.now()`), and through a fallback (`x ?? DECLARED_PRESENT`).
//
// ⚠️ **NEITHER HALF READS A FIXTURE, WHICH IS THE §86 PROPERTY.** Both sit
// UPSTREAM of the literals under test, so mutating a date cannot move the
// population. A gate whose population collapses with its subject cannot tell
// *"I caught it"* from *"I have nothing to look at"*.
//
// ── TWO DISCRIMINATORS MEASURED AND REJECTED, SO THEY ARE NOT RE-DERIVED ─────
// · **"optional (`?:`) on the DTO ⇒ act instant."** Convicts correctly today and
//   is a heuristic wearing a derivation's clothes: `paymentDate` and
//   `expiryDate` are BOTH `string | null`, one an act instant and one a horizon,
//   so the syntax does not track the meaning. The day someone writes
//   `expiryDate?: string` it false-convicts every dated certificate.
// · **"a field no clock-projection reads ⇒ act instant."** MEASURED FALSE: it
//   convicts `shipment.shipDate` (three `Pending ASN` rows) and
//   `contract.startDate`, both of which the tree has already adjudicated as
//   legitimately future — `shipmentDisplayState.ts` says so at its own
//   `daysInTransit` header.
//
// ── REACH — WHAT THIS FILE DOES NOT GUARD ────────────────────────────────────
// · **Event dates no command mints.** `supplierDocument.issuedDate` is the live
//   example: it comes from a declaration PAYLOAD (`decl.issuedOn`), not from a
//   clock, so this property is blind to it — and it was the SECOND anomalous
//   field on `doc-012`, repaired by hand in the same batch as the first. There
//   is no derivation available for it: the platform accepts whatever issue date
//   a declarer states, so "issued before the present" is an authoring
//   convention here and not a contract. If one is ever wanted, it needs a rule
//   about payloads, not about clocks.
// · **Horizon fields.** `expiryDate`, `dueDate`, `endDate`, `estimatedArrival`,
//   `shipDate`, `startDate` — all legitimately after `P` on live rows, all
//   deliberately outside the population, and the second rejected discriminator
//   above is why.
// · **A CLOCK HOISTED INTO A LOCAL BINDING.** `isClockExpression` resolves
//   wrappers, receivers and fallbacks, but it reads an INITIALIZER — it does
//   not follow an identifier to its declaration. So `const at = new Date().
//   toISOString(); return { ...row, publishedAt: at }` mints an act instant
//   this half cannot see. **Measured on 2026-09-21, because PSL P3 is the first
//   code in the tree to write one that way:** every other act-instant site is
//   inline at the property (`rejectedAt: new Date().toISOString()` ·
//   `grantedAt:` · `decidedAt:` · `submittedAt:`), and the only two hoisted
//   sites are `psl`'s own `apply` and `create`. **Widening the matcher to
//   resolve the binding would change NOTHING today** — `publishedAt` and
//   `capDecidedAt` are not in any family's `shiftFields` list, so they could
//   not enter the intersection even if the mint half saw them — so it is not
//   widened here: a widening that cannot be fired at a defect the tree really
//   has is a change with no evidence behind it
//   (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`). What makes `psl`'s silence SAFE
//   rather than merely unmeasured is asserted below, not argued here.
// · **Unanchored families.** `RFQ.createdAt`, `PurchaseRequisition.createdDate`,
//   `Quotation.submittedAt` carry act instants and no anchor, so there is no
//   shifted corpus to read. They enter this gate the day they are anchored,
//   with nobody editing this file.
// · **Whether `P` still tells the authored story.** That is
//   `fixturePresent.guard.test.ts`'s question. This one asks only that no act
//   instant sits in the future.
// · **The RUNTIME stamp.** Every value read here is seeded. That a dispatched
//   act stamps the right clock is `invoiceWriteIsClockIndependent.test.ts`'s
//   axis.
// · **`stampOrigin`'s collision.** A runtime value byte-equal to a seeded one
//   would be falsely reported `SEEDED` (`stampProvenance.ts`). Unreachable
//   today and not structurally excluded; nothing here would notice.
// · **Time of day.** The comparison is by DAY, because `DECLARED_PRESENT` is a
//   `YYYY-MM-DD` literal and has no finer resolution to compare against.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import ts from 'typescript';

import { buildRepoProgram } from '../../lib/readingInstantGate/derive';
import { DECLARED_PRESENT } from './fixturePresent';
import { DOCUMENTS } from './mock/fixtures/supplierDocuments';
import { INVOICES } from './mock/fixtures/invoices';
import { mockShipments } from '../../data/mockShipments';
import { mockGoodsReceipts } from '../../data/mockGoodsReceipts';
import { mockInventory } from '../../data/mockInventory';
import { mockObligations } from '../../data/mockObligations';
import { mockContracts } from '../../data/mockContracts';
import { PSL_ANCHORED_VALIDITY, PSL_SEEDS_RAW } from './mock/pslSeed';

const BACKSLASH = String.fromCharCode(92);
const norm = (p: string): string => p.split(BACKSLASH).join('/');
const inSrc = (f: string): boolean => norm(f).includes('/src/');
const isTestFile = (f: string): boolean => /\.(test|spec)\.tsx?$/.test(norm(f));

/** `YYYY-MM-DD…` → the UTC day, so the comparison never depends on an offset. */
const day = (s: string): number => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);

// ─────────────────────────────────────────────────────────────────────────────
// HALF 1 — what the shift moves, from each family's own call.
// ─────────────────────────────────────────────────────────────────────────────

function deriveShiftedFields(program: ts.Program): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const sf of program.getSourceFiles()) {
    if (!inSrc(sf.fileName) || isTestFile(sf.fileName)) continue;
    const visit = (n: ts.Node): void => {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        n.expression.text === 'shiftFields' &&
        n.arguments.length >= 3 &&
        ts.isStringLiteralLike(n.arguments[1]) &&
        ts.isArrayLiteralExpression(n.arguments[2])
      ) {
        const family = (n.arguments[1] as ts.StringLiteralLike).text;
        const set = out.get(family) ?? new Set<string>();
        for (const e of n.arguments[2].elements) {
          if (ts.isStringLiteralLike(e)) set.add(e.text);
        }
        out.set(family, set);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// HALF 2 — what a command mints at the instant of the act.
//
// ⚠️ **AST, NOT TEXT, AND RECEIVER-AWARE.** The instant is reached through
// wrappers far more often than bare: `new Date().toISOString()`,
// `new Date().toISOString().slice(0, 10)`, `sdcClock.now()`,
// `inv.paymentDate ?? DECLARED_PRESENT`. A matcher keyed on the bare form finds
// almost nothing and reports a confident, empty answer.
// ─────────────────────────────────────────────────────────────────────────────

/** Where a stamp is written, for the report. */
interface WriteSite {
  readonly field: string;
  readonly file: string;
  readonly line: number;
}

function isClockExpression(e: ts.Node): boolean {
  // `new Date()` — the zero-argument form only. `new Date(someLiteral)` is a
  // parse, not a clock read, and counting it would sweep in every re-anchored
  // fixture date in the tree.
  if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'Date') {
    return !e.arguments || e.arguments.length === 0;
  }
  // `DECLARED_PRESENT` — the declared present IS this tree's act instant for the
  // commands that were moved off the wall clock; it is still "the moment of the
  // act" as this platform reckons one.
  if (ts.isIdentifier(e) && e.text === 'DECLARED_PRESENT') return true;
  if (ts.isCallExpression(e)) {
    const callee = e.expression;
    if (ts.isPropertyAccessExpression(callee)) {
      // `Date.now()`, and any `<receiver>Clock.now()` — receiver-aware rather
      // than a name match, so a clock reached through a module object counts.
      if (callee.name.text === 'now') {
        const recv = callee.expression;
        if (ts.isIdentifier(recv) && (recv.text === 'Date' || /Clock$/.test(recv.text))) {
          return true;
        }
      }
      // A WRAPPER — `.toISOString()`, `.slice(…)`, `.trim()`. The instant is the
      // receiver; walk to it.
      return isClockExpression(callee.expression);
    }
  }
  // A FALLBACK or a branch: `x ?? DECLARED_PRESENT`, `cond ? now : stored`.
  // Either side reaching a clock makes the field one a command can mint.
  if (ts.isBinaryExpression(e)) {
    const op = e.operatorToken.kind;
    if (
      op === ts.SyntaxKind.QuestionQuestionToken ||
      op === ts.SyntaxKind.BarBarToken
    ) {
      return isClockExpression(e.left) || isClockExpression(e.right);
    }
  }
  if (ts.isConditionalExpression(e)) {
    return isClockExpression(e.whenTrue) || isClockExpression(e.whenFalse);
  }
  if (ts.isParenthesizedExpression(e)) return isClockExpression(e.expression);
  return false;
}

function deriveActInstantFields(program: ts.Program): Map<string, WriteSite[]> {
  const out = new Map<string, WriteSite[]>();
  for (const sf of program.getSourceFiles()) {
    if (!inSrc(sf.fileName) || isTestFile(sf.fileName)) continue;
    const visit = (n: ts.Node): void => {
      if (ts.isPropertyAssignment(n)) {
        const nameNode = n.name;
        const field =
          ts.isIdentifier(nameNode) || ts.isStringLiteralLike(nameNode)
            ? nameNode.text
            : null;
        if (field && isClockExpression(n.initializer)) {
          const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
          const f = norm(sf.fileName);
          out.set(field, [
            ...(out.get(field) ?? []),
            { field, file: f.slice(f.indexOf('/src/') + 1), line },
          ]);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE CORPORA. A hand-written binding, pinned BILATERALLY against the derived
// family set below — the same shape `readingInstantGate` uses, and for the same
// reason: `mockContracts` applies `shiftFields` inside a `.map()`, so the
// exported const is not the call's result and no derivation reaches it. The pin
// is what keeps the list honest: a family added to a `shiftFields` call is RED
// here until it is named.
// ─────────────────────────────────────────────────────────────────────────────
const CORPORA: Readonly<Record<string, readonly Record<string, unknown>[]>> = {
  supplierDocument: DOCUMENTS as unknown as Record<string, unknown>[],
  invoice: INVOICES as unknown as Record<string, unknown>[],
  shipment: mockShipments as unknown as Record<string, unknown>[],
  goodsReceipt: mockGoodsReceipts as unknown as Record<string, unknown>[],
  inventory: mockInventory as unknown as Record<string, unknown>[],
  obligation: mockObligations as unknown as Record<string, unknown>[],
  contract: mockContracts as unknown as Record<string, unknown>[],
  // ⚠️ **`psl` IS THE FIRST FAMILY WITH NO STATIC CORPUS TO BIND, AND THE
  // BINDING SAYS SO RATHER THAN PRETENDING OTHERWISE.** Every row above is an
  // exported fixture array. PSL P3's ruling (h) retired `pslListings.ts` and
  // seeds the store `[]` — the rows are GROWN through the verbs — so at module
  // load this family has no rows anywhere. What the shift moved is
  // `PSL_ANCHORED_VALIDITY`, so that is what is bound: the two authored days,
  // re-timed, which are the only two fields `shiftFields(…, 'psl', …)` names
  // and the only two anything here would read.
  psl: PSL_ANCHORED_VALIDITY as unknown as Record<string, unknown>[],
};

/**
 * ⚠️ **THE EXPECTATION, AND IT IS A PIN RATHER THAN A FILTER.** It is asserted
 * EQUAL to the derivation in both directions, so a newly clock-minted field on a
 * shifted family goes red here until somebody names it — which is the point. It
 * is never consulted when deciding what to check.
 */
const EXPECTED_POPULATION = ['invoice.paymentDate', 'supplierDocument.rejectedAt'];

const program = buildRepoProgram(norm(process.cwd()));
const shifted = deriveShiftedFields(program);
const minted = deriveActInstantFields(program);

/** family.field for every shifted field some command mints at the act instant. */
const population = [...shifted]
  .flatMap(([family, fields]) =>
    [...fields].filter((f) => minted.has(f)).map((f) => `${family}.${f}`),
  )
  .sort();

describe('ANTI-VACUITY — nothing below means anything without these', () => {
  it('both halves of the intersection are non-empty and were read from source', () => {
    expect(shifted.size, 'no family declared a shiftFields call').toBeGreaterThan(0);
    expect(minted.size, 'no clock-minted field found — the AST walk saw nothing').toBeGreaterThan(
      0,
    );
    // KNOWN-GOOD MEMBERS, one per half, so a matcher that silently stopped
    // matching cannot pass this file by returning an empty set.
    expect([...shifted.keys()], 'the shift half').toContain('supplierDocument');
    expect([...minted.keys()], 'the mint half').toContain('rejectedAt');
  });

  it('⚠️ KNOWN-BAD CONTROL — the mint half does NOT sweep in the horizon fields', () => {
    // Derivation rule 2: a widened matcher accuses working code. Each of these
    // is legitimately after `P` on live rows, and admitting any one of them
    // would turn this gate into a false-conviction machine.
    for (const horizon of ['expiryDate', 'dueDate', 'endDate', 'estimatedArrival', 'shipDate']) {
      expect([...minted.keys()], `${horizon} must not read as clock-minted`).not.toContain(
        horizon,
      );
    }
  });

  it('every family that declares a shifted corpus has one bound here', () => {
    expect([...shifted.keys()].sort()).toEqual(Object.keys(CORPORA).sort());
    for (const [family, rows] of Object.entries(CORPORA)) {
      expect(rows.length, `${family} corpus is empty`).toBeGreaterThan(0);
    }
  });
});

describe('⚠️ THE POPULATION — a shifted field a command mints at the act instant', () => {
  it('is EXACTLY what the tree yields, in both directions', () => {
    // Both directions, so a new member is red until named and a retired one
    // cannot sit here unbacked.
    expect(population).toEqual(EXPECTED_POPULATION);
  });

  it('⚠️ `psl` CONTRIBUTES NOTHING, AND IT IS STRUCTURALLY UNABLE TO', () => {
    // ⚠️ **WHY THIS ASSERTION EXISTS AT ALL.** `psl` is bound as a corpus and
    // yields no population member, which is the same OUTPUT a family would
    // produce if the mint half had quietly stopped seeing its fields — and the
    // reach note above records that this family's act instants ARE invisible to
    // that half, because PSL P3 hoists its clock into a local binding. So the
    // one reading this file could not otherwise distinguish is exactly the one
    // it has to make: *is `psl` silent because it has nothing to say, or
    // because nobody is listening?*
    //
    // It has nothing to say, and the guarantee is a TYPE rather than a habit:
    // `PslSeedRow` has no field for an act instant. `publishedAt`,
    // `capDecidedAt` and every `statusHistory.at` are assigned by the store at
    // the instant of the act, so a seeded PSL row cannot carry an authored one
    // to be wrong about. This asserts that property over the seed rows, so the
    // day somebody adds such a field the claim goes red instead of staying
    // quietly true.
    const seedKeys = new Set(PSL_SEEDS_RAW.flatMap((r) => Object.keys(r)));
    expect([...seedKeys].filter((k) => minted.has(k)), 'an authored act instant').toEqual([]);
    // ⚠️ BILATERAL CONTROL — without it the line above passes just as happily
    // when `minted` is EMPTY, which is the failure this whole file is built
    // around. The shift half must still reach this family's own fields.
    expect([...(shifted.get('psl') ?? [])].sort()).toEqual(['validFrom', 'validUntil']);
    expect(seedKeys.has('validFrom') && seedKeys.has('validUntil')).toBe(true);
  });

  it('every member has at least one non-null seeded value to test', () => {
    // Without this, "no value sits after P" is satisfiable by a field no row
    // carries — `EMPTY-INPUT-REPORTS-CLEAN-01` one level in from the population.
    for (const member of population) {
      const [family, field] = member.split('.');
      const present = CORPORA[family].filter((r) => r[field]);
      expect(present.length, `${member} has no seeded value anywhere`).toBeGreaterThan(0);
    }
  });
});

describe('⚠️ NO SEEDED ACT INSTANT SITS AFTER THE DECLARED PRESENT', () => {
  it('holds for every row of every population member', () => {
    const P = day(DECLARED_PRESENT);
    const offenders: string[] = [];
    let examined = 0;
    for (const member of population) {
      const [family, field] = member.split('.');
      for (const row of CORPORA[family]) {
        const v = row[field];
        if (typeof v !== 'string' || !v) continue;
        examined += 1;
        if (day(v) > P) {
          offenders.push(`${family} ${String(row.id)} ${field}=${v}`);
        }
      }
    }
    // The count is reported, never asserted against a number: a figure here
    // would be a floor in prose, and the rows it counts grow when the product
    // works.
    expect(examined, 'no seeded value was examined at all').toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
