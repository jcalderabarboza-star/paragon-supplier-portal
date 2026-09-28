// ─────────────────────────────────────────────────────────────────────────────
// A PLANNING BUCKET — the vocabulary C7 GG-3 and C8 GG-3′ now close on, and the
// ONE function both seams parse through.
//
// ⚠️ **A BUCKET IS NOT A DATE, AND THE DEFECT THIS EXISTS AGAINST IS A MEASURED
// ONE.** `t_pr_create` writes the intake line's `period` into a field named
// `requiredDate` (`MockCommandService.ts` — `requiredDate: str('requiredDate') ||
// str('period')`), so a date-typed, date-named field holds `'2026-Q3'`. Measured
// on the surface: a pushed `2026-Q3` line renders an em dash on the requisitions
// page, and a `2026-08` line renders `01 Aug 2026` — **a day nobody entered.**
// One of those is a missing figure and the other is a fabricated one, and the
// second is worse, because it looks like an answer.
//
// ⚠️ **QUARTERS ARE REFUSED, AND THAT IS A RULING RATHER THAN AN OMISSION**
// (operator, 2026-09-28). A month and an ISO week are grains a producer can
// commit against; a quarter is a reporting period wearing a planning grain's
// clothes, and it is the form that renders as nothing today. `'2026-Q3'` sits on
// two of the four rows of `fixtures/prIntake.ts` and the intake seam will refuse
// it when B2 lands the machine — which is the point: a refusal names the rows to
// re-express, where an unparsed free string named nothing for a year.
//
// ⚠️ **ONE GRAIN PER HORIZON.** The telescoping view a planner wants — weeks
// near, months far — is TWO horizons side by side, never one array holding both.
// A mixed-grain horizon has no bucket width, so every total drawn across it is
// an addition of unlike things, and nothing downstream can tell.
//
// ── THE BOUNDARIES ARE COMPUTED FROM THE ID, AND NEVER STORED (law 0.5) ──────
//   `startUtc`/`endUtc` are a HALF-OPEN instant pair `[startUtc, endUtc)`. Half
//   open rather than an inclusive last-day, because an inclusive end has to pick
//   a time of day and every choice is wrong somewhere: `consolidation.ts`'s
//   private `bucketEndMs` picks `Date.UTC(y, m, 0)`, which is the last day at
//   **midnight** — twenty-four hours short of the month it names. Half-open has
//   no such seam: the end of one bucket IS the start of the next, exactly.
//
// ── ⚠️ WHERE THIS DEPARTS FROM THE DESIGN DRAFT, SAID PLAINLY ────────────────
//   The draft put `UNPARSEABLE_BUCKET` and `MIXED_GRAIN_IN_HORIZON` in ONE
//   outcome union on `parseBucket`. `parseBucket` takes a single string and can
//   never return the second, so that union is wider than the function's range —
//   a caller writing an exhaustive switch would author a branch no input can
//   reach. The refusal REASONS stay one union (they are one vocabulary, and a
//   surface keys its copy on them); the two OUTCOMES are separate, so each
//   function's type states what it can actually answer.
//
//   `EMPTY_HORIZON` is the third reason and is not in the draft. An empty array
//   has no grain, so `grain` on a successful horizon outcome would have to be a
//   guess or a null — and a null grain is the mixed-grain hazard back again with
//   better manners. Refusing is the only answer that keeps `grain` a fact.
//
// ── WHAT THIS BATCH DELIBERATELY DOES NOT DO ─────────────────────────────────
//   Nothing calls this yet, and that is A1's scope (contract touches + the types
//   the contracts now demand). The consumers are named, not implied: B1's
//   measure/column/view registries and `IPlanningService`, and B2's `intakeLine`
//   machine, which is where `PrIntakeLine.period` becomes `periodBucket` in ONE
//   atomic change rather than as a second field meaning the same thing.
//
//   The refusal reasons are NOT registered in `GLOSSARY_REGISTRIES` yet. They
//   join it when a surface renders one (B1 — a cell refusal with a term chip, on
//   `QtyRefusalReason`'s precedent); registering a vocabulary no reader can meet
//   is how a glossary fills with entries nobody reaches.
// ─────────────────────────────────────────────────────────────────────────────

/** The two planning grains. Monthly for raw materials, ISO-weekly for packaging. */
export type BucketGrain = 'month' | 'week';

/**
 * A planning bucket id: `'YYYY-MM'` (month) or `'YYYY-Www'` (ISO week).
 *
 * ⚠️ **A NOMINAL ALIAS, NOT A BRAND, AND THE HONESTY IS THE POINT.** `string`
 * means `tsc` will NOT stop a caller passing an arbitrary string — only
 * `parseBucket` decides. A branded type would be stronger and would also make
 * every fixture literal a cast, which is how a brand becomes a cast convention
 * and then means nothing. The alias documents intent; the parse is the gate.
 */
export type BucketId = string;

/** Why a bucket or a horizon was refused. One vocabulary, two outcome shapes. */
export type BucketRefusalReason =
  /** Not `YYYY-MM` and not `YYYY-Www` — a quarter, a date, an unpadded month, a week the ISO year does not have. */
  | 'UNPARSEABLE_BUCKET'
  /** Some buckets parsed as months and some as weeks. A horizon holds one grain. */
  | 'MIXED_GRAIN_IN_HORIZON'
  /** No buckets at all. An empty horizon has no grain, so it has no answer. */
  | 'EMPTY_HORIZON';

/** One bucket, parsed. `[startUtc, endUtc)` is half-open. */
export interface ParsedBucket {
  readonly id: BucketId;
  readonly grain: BucketGrain;
  /** ISO instant — the first instant inside the bucket. */
  readonly startUtc: string;
  /** ISO instant — the first instant AFTER the bucket (exclusive). */
  readonly endUtc: string;
}

export type BucketOutcome =
  | { readonly ok: true; readonly bucket: ParsedBucket }
  | { readonly ok: false; readonly reason: 'UNPARSEABLE_BUCKET'; readonly raw: string };

export type HorizonOutcome =
  | { readonly ok: true; readonly grain: BucketGrain; readonly buckets: readonly ParsedBucket[] }
  | {
      readonly ok: false;
      readonly reason: BucketRefusalReason;
      /** The offending member for `UNPARSEABLE_BUCKET`; the whole horizon, joined, otherwise. */
      readonly raw: string;
    };

/**
 * The initial horizon depth per grain — **a registry value, not a contract
 * number** (operator ruling, 2026-09-28: C8 GG-8 gets a default here rather than
 * a figure in the contract text, because a number written into prose is wrong the
 * first time the plan changes and nothing fails when it is).
 *
 * `month` is the raw-material lane's depth and `week` the packaging lane's. The
 * grain↔lane mapping itself is B1's view registry: it needs the material
 * taxonomy, and inventing a lane union here would mint vocabulary ahead of the
 * surface that uses it. Both are trimmable per view.
 */
export const DEFAULT_HORIZON_BUCKETS: Readonly<Record<BucketGrain, number>> = {
  month: 12,
  week: 16,
};

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const WEEK_RE = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/;

const DAY_MS = 86_400_000;

const iso = (ms: number): string => new Date(ms).toISOString();

/**
 * The UTC midnight of the Monday that opens ISO week 1 of `year`.
 *
 * Derived, never tabulated: ISO week 1 is the week containing 4 January, and an
 * ISO week starts on Monday. So walk back from 4 Jan to its Monday. This is also
 * what makes the week-53 check honest — no "does this year have 53 weeks" rule is
 * written down; a candidate week is parsed and then asked which ISO year it
 * actually lands in.
 */
function isoWeek1MondayMs(year: number): number {
  const jan4 = Date.UTC(year, 0, 4);
  // getUTCDay: Sunday 0 … Saturday 6. ISO weekday: Monday 1 … Sunday 7.
  const isoWeekday = new Date(jan4).getUTCDay() || 7;
  return jan4 - (isoWeekday - 1) * DAY_MS;
}

/** The ISO week-numbering year a UTC instant belongs to. */
function isoYearOf(ms: number): number {
  const d = new Date(ms);
  const isoWeekday = d.getUTCDay() || 7;
  // The Thursday of this instant's ISO week decides the ISO year, by definition.
  const thursday = ms + (4 - isoWeekday) * DAY_MS;
  return new Date(thursday).getUTCFullYear();
}

/**
 * Parse one bucket id. The ONE discriminator — C7's intake seam and C8's
 * publication seam both go through here, so "the same function" in the contracts
 * is a fact about the tree rather than an intention.
 */
export function parseBucket(raw: string): BucketOutcome {
  const month = MONTH_RE.exec(raw);
  if (month !== null) {
    const year = Number(month[1]);
    const m = Number(month[2]);
    return {
      ok: true,
      bucket: {
        id: raw,
        grain: 'month',
        startUtc: iso(Date.UTC(year, m - 1, 1)),
        // Month 12 rolls into the next January on its own: Date.UTC normalises.
        endUtc: iso(Date.UTC(year, m, 1)),
      },
    };
  }

  const week = WEEK_RE.exec(raw);
  if (week !== null) {
    const year = Number(week[1]);
    const w = Number(week[2]);
    const startMs = isoWeek1MondayMs(year) + (w - 1) * 7 * DAY_MS;
    // ⚠️ THE WEEK MUST BELONG TO THE YEAR IT NAMES. `2026-W53` is syntactically
    // fine and does not exist: only an ISO year whose 1 January is a Thursday
    // (or a leap year starting Wednesday) has 53 weeks. Rather than encode that
    // rule, ask where the week landed — a W53 of a 52-week year lands in the
    // NEXT ISO year, and that disagreement is the refusal.
    if (isoYearOf(startMs) !== year) return { ok: false, reason: 'UNPARSEABLE_BUCKET', raw };
    return {
      ok: true,
      bucket: {
        id: raw,
        grain: 'week',
        startUtc: iso(startMs),
        endUtc: iso(startMs + 7 * DAY_MS),
      },
    };
  }

  return { ok: false, reason: 'UNPARSEABLE_BUCKET', raw };
}

/**
 * Parse a horizon: every member must parse, and every member must share one
 * grain. Order is preserved and NOT sorted — a view owns its own ordering, and
 * silently reordering a caller's horizon is the kind of helpfulness that hides a
 * generator bug.
 */
export function parseHorizon(raw: readonly string[]): HorizonOutcome {
  if (raw.length === 0) return { ok: false, reason: 'EMPTY_HORIZON', raw: '' };

  const buckets: ParsedBucket[] = [];
  for (const candidate of raw) {
    const outcome = parseBucket(candidate);
    if (!outcome.ok) return { ok: false, reason: 'UNPARSEABLE_BUCKET', raw: candidate };
    buckets.push(outcome.bucket);
  }

  const grain = buckets[0].grain;
  if (buckets.some((b) => b.grain !== grain)) {
    return { ok: false, reason: 'MIXED_GRAIN_IN_HORIZON', raw: raw.join(',') };
  }

  return { ok: true, grain, buckets };
}
