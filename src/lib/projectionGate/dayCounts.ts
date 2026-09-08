// ─────────────────────────────────────────────────────────────────────────────
// THE NUMERIC ARM — stored DAY-COUNTS, the half `displayStates.ts` is blind to.
//
// ── ⚠️ WHY THE STATE ARM COULD NEVER HAVE SEEN THESE ────────────────────────
//   `displayStates.ts` derives its population from CLOSED STRING UNIONS: a
//   display state is a union member, so the members ARE the population and a new
//   one cannot hide. **A number has no union.** `daysUntilExpiry: number` admits
//   every integer, so there is nothing to enumerate and nothing for that gate to
//   catch — it was blind to this class BY CONSTRUCTION, for the whole life of
//   the constant, which is exactly why this population grew unobserved while a
//   bilateral, mutation-probed gate sat next to it reading green.
//
//   That blindness is the finding, not an oversight: a gate built for law 0.5
//   that cannot see half of law 0.5's subject. The vocabulary below is the same
//   (`computed-at-read` / `stored-in-fixtures`), because the LAW is the same.
//
// ── ⚠️ THE DISCRIMINATOR, AND IT IS NOT "NUMBER VS STATE" ───────────────────
//   **A stored value must not be a function of the READ instant.** A difference
//   between two STORED dates is a durable fact and may be stored; a difference
//   against `now` is wrong tomorrow. That axis is what puts `daysUntilExpiry`
//   (endpoint = now) in a different class from `noticeRequiredDays` (a contract
//   term) and `daysOfSupply` (stock ÷ burn — not a date difference at all),
//   even though all three are numbers with `days` in the name.
//
// ── ⚠️ THE FOURTH GROUP, WHICH THE STATE ARM NEVER NEEDED ───────────────────
//   `mintedAtWrite` is not a group but a MARKER, and it records the worst shape
//   available: a value COMPUTED FROM THE CLOCK AND THEN STORED. It looks like
//   `computed-at-read` from the producer side (a real non-fixture file computes
//   it) and like `stored-in-fixtures` from the data side, and it is neither — it
//   is the defect wearing the fix's clothes. Today exactly one field carries it.
//   The gate asserts the named write site EXISTS, so the marker can only be
//   removed by removing the write; it cannot rot into a stale comment.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

/** Where a stored day-count sits on the law-0.5 axis. */
export type DayCountGroup =
  /** Derived at read from an INJECTED `now`. Law 0.5 honoured. */
  | 'computed-at-read'
  /** A fixture literal. A DATA DEFECT held honestly, not a design. */
  | 'stored-in-fixtures'
  /** Not a difference against `now` at all — acquitted, and it must say why. */
  | 'not-a-clock-difference';

export interface DayCountRow {
  /** The type that declares the field — the storage site, not a view model. */
  readonly owner: string;
  readonly field: string;
  readonly group: DayCountGroup;
  /**
   * The date this count is measured against. REQUIRED for the two clock groups
   * and FORBIDDEN for an acquittal: naming the other endpoint is what makes the
   * classification checkable rather than asserted.
   */
  readonly against?: string;
  /** `computed-at-read` only: the module that produces it, which must take an
   *  injected `now` — a producer with its own clock would be law 0.5's defect
   *  wearing this group's name. */
  readonly producer?: string;
  /** `not-a-clock-difference` only: why it is acquitted. */
  readonly reason?: string;
  /**
   * ⚠️ A non-fixture file that COMPUTES this from the clock and STORES it. The
   * gate asserts the file exists and writes the field; removing the write is the
   * only way to remove this marker.
   */
  readonly mintedAtWrite?: string;
  /**
   * The count is a durable FACT whenever this date is present, and a decaying
   * projection when it is not — one field with two meanings. Recorded because
   * that split is more dangerous than a uniformly wrong number: half the rows
   * are correct, so no row you spot-check reveals the other half.
   */
  readonly factWhenPresent?: string;
}

/**
 * ⚠️ **DECLARED. The gate pins this EQUAL to the derivation, both directions.**
 * A new `…days…: number` in the storage scope must appear here or the gate is
 * red; a row here that the tree no longer declares is equally red.
 */
export const DAY_COUNTS: readonly DayCountRow[] = [
  // ── computed at read, law 0.5 honoured ────────────────────────────────────
  {
    owner: 'BuyerInvoice',
    field: 'daysOutstanding',
    group: 'computed-at-read',
    against: 'dueDate',
    producer: 'src/services/data/invoiceProjection.ts',
  },

  // ── ⚠️ TWO ROWS LEFT THIS TABLE BY BEING RETIRED, NOT BY BEING EXCUSED ────
  //   `Contract.daysUntilExpiry` and `ComplianceRow.daysLeft` were both here as
  //   `stored-in-fixtures`, and `daysUntilExpiry` carried the only
  //   `mintedAtWrite` marker in the tree. Both fields no longer EXIST, so they
  //   leave the population entirely — that is the bilateral assertion doing its
  //   job, not a gap. Re-declare either as `…: number` on a DTO and this gate
  //   goes red until somebody classifies it again.
  //
  // ── stored clock differences — the convicted class ────────────────────────
  //   ⚠️ THE FOUR THAT REMAIN ARE DELIBERATE. Each back-solves to the SAME
  //   authoring date as the fixture around it (shipments 2026-05-20, POs their
  //   own), so computing them at read would publish FIXTURE AGE as operational
  //   lateness — a shipment "in transit 116 days", a PO "496 days late". The
  //   disposal is the DATA, and the fixture refresh is its own batch; retiring
  //   the field first would ship a true number about a false world.
  {
    owner: 'Shipment',
    field: 'daysInTransit',
    group: 'stored-in-fixtures',
    against: 'shipDate',
    factWhenPresent: 'actualArrival',
  },
  {
    owner: 'Shipment',
    field: 'delayDays',
    group: 'stored-in-fixtures',
    against: 'estimatedArrival',
    factWhenPresent: 'actualArrival',
  },
  {
    owner: 'PurchaseOrder',
    field: 'daysOverdue',
    group: 'stored-in-fixtures',
    against: 'requestedDeliveryDate',
    factWhenPresent: 'confirmedDeliveryDate',
  },
  {
    owner: 'POSummary',
    field: 'daysOverdue',
    group: 'stored-in-fixtures',
    against: 'requestedDeliveryDate',
    factWhenPresent: 'confirmedDeliveryDate',
  },

  // ── acquitted — NOT differences against `now` ─────────────────────────────
  // ⚠️ These are the CONTROLS. A gate probed only against the fields it
  // convicts has never been shown to acquit, and every one of these has `days`
  // in its name — so a name-shaped matcher that quietly started condemning them
  // would go red here rather than in review.
  {
    owner: 'Contract',
    field: 'noticeRequiredDays',
    group: 'not-a-clock-difference',
    reason: 'A contract TERM — how much notice the agreement requires. No clock endpoint.',
  },
  {
    owner: 'Quotation',
    field: 'leadTimeDays',
    group: 'not-a-clock-difference',
    reason: 'A quoted DURATION the supplier commits to. Not measured from today.',
  },
  {
    owner: 'ProductionLineRow',
    field: 'coverDays',
    group: 'not-a-clock-difference',
    reason: 'Stock ÷ consumption rate. Decays because stock does, never because the clock moves.',
  },
  {
    owner: 'InventoryRecord',
    field: 'daysOfSupply',
    group: 'not-a-clock-difference',
    reason: 'Stock ÷ consumption rate — the same ratio as coverDays, on a different row shape.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// THE DERIVATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ **THE STORAGE SCOPE, AND IT IS A CLAIM WORTH STATING.** A field is STORED
 * only where an entity DTO or a fixture declares it. A page-local view model
 * (`OpenRFQ.daysRemaining`) is rebuilt on every render from data it does not
 * own — it is a projection output, and counting it as storage would condemn the
 * correct pattern alongside the defect.
 */
export const STORAGE_SCOPE: readonly string[] = [
  'src/data',
  'src/services/data/types.ts',
  'src/types',
];

/**
 * Day-count field DECLARATIONS in the storage scope.
 *
 * ⚠️ **THE MATCHER IS NARROWED TO `days`/`Days` ON PURPOSE, AND THE SCARS ARE
 * THE REASON.** A first pass matched `[Dd]ays|[Aa]ge|[Tt]ransit|…` and returned
 * `transitionId` (on *transit*), `message`, `stage` and `packageCount` (on
 * *age*) — four false accusations from one widening. A second matched
 * `:\s*number` and caught the ASSIGNMENT `noticeRequiredDays: numbers.notice…`
 * because `numbers.` begins with `number`. Both are pinned as negative controls
 * in the gate.
 *
 * ⚠️ **THE LIMIT, STATED RATHER THAN IMPLIED:** a clock difference named in
 * another unit (`hoursOverdue`, `weeksLate`) is INVISIBLE here. `PurchaseOrder.
 * acknowledgmentTimeHours` is exactly that shape and is acquitted by hand, not
 * by this matcher. A census that hides its blind spots is worse than a narrow one.
 */
export function declaredDayCountFields(
  read: (f: string) => string = (f) => readFileSync(f, 'utf8'),
  files: readonly string[] = [],
): { file: string; field: string }[] {
  const decl = /^\s*(?:readonly\s+)?(\w*[Dd]ays\w*)\??:\s*number(?:\s*\|\s*null)?\s*;/;
  const out: { file: string; field: string }[] = [];
  for (const f of files) {
    // Split on /\r?\n/: `core.autocrlf` is on in this repo, so a bare '\n'
    // split leaves a '\r' on every line and the `;` anchor never matches.
    for (const raw of read(f).split(/\r?\n/)) {
      const m = decl.exec(raw);
      if (m) out.push({ file: f, field: m[1] });
    }
  }
  return out;
}

/** Does `file` inject its clock rather than read one? The property that
 *  separates a real `computed-at-read` producer from law 0.5's defect. */
export function takesInjectedNow(
  file: string,
  read: (f: string) => string = (f) => readFileSync(f, 'utf8'),
): boolean {
  return /\b(nowIso|now)\s*:\s*(string|Date)/.test(read(file));
}

/**
 * Does `file` write `field` — as `field: <expr>` or as ES6 shorthand `field,`?
 *
 * ⚠️ **TWO SHAPES ARE LOAD-BEARING AND BOTH WERE MISSED ON THE FIRST PASS.**
 *   · **Shorthand.** `BuyerContracts` mints `daysUntilExpiry` with ES6
 *     shorthand, so a `field:`-only matcher reports the sole `mintedAtWrite`
 *     site in the tree as ABSENT — a clean-looking gate over a real defect.
 *   · **Mid-line.** `buyerRisk.ts` writes whole rows on ONE line
 *     (`{ supplier: '…', expires: '…', daysLeft: -24, … }`), so a `^\s*`-anchored
 *     matcher finds no writer for `ComplianceRow.daysLeft` and the row reads as
 *     `produced-by-nothing`. Anchoring on `{` / `,` instead is what sees it.
 *
 * A DECLARATION (`field: number;`) is excluded by the `number` lookahead: a type
 * is not a write, and counting it as one would acquit every stored field on the
 * strength of its own interface.
 */
export function writesField(
  file: string,
  field: string,
  read: (f: string) => string = (f) => readFileSync(f, 'utf8'),
): boolean {
  const head = `(?:^\\s*|[{,]\\s*)`;
  const assign = new RegExp(`${head}${field}\\s*:\\s*(?!number\\b)\\S`);
  const shorthand = new RegExp(`${head}${field}\\s*,`);
  return read(file)
    .split(/\r?\n/)
    .some((raw) => {
      const code = raw.replace(/\/\/.*$/, '');
      return assign.test(code) || shorthand.test(code);
    });
}
