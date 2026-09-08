// ────────────────────────────────────────────────────────────────────────────
// Contract expiry projection (law 0.5) — the fourth entity projection, beside
// `complianceProjection`, `invoiceProjection` and `obligationProjection`, and
// following the same shape: a pure function of `(row, now)`, no store, no clock
// of its own.
//
// ── WHAT THIS RETIRES ───────────────────────────────────────────────────────
//   `contract/Expiring` and `contract/Expired` were `stored-in-fixtures` in
//   `projectionGate/displayStates.ts`, and the page around them carried FIVE
//   duplicated clock predicates at THREE different widths plus one predicate
//   with no clock at all. Measured on the rendered page at 2026-09-08:
//
//     KPI tile   "EXPIRING SOON 4 · Within next 90 days"
//     tab badge  "Expiring 2"          ← `contracts.filter(c => c.status === 'Expiring')`
//     tab list    FOUR rows            ← `matchesGroup`'s 0..90 band
//
//   Three numbers on one screen for one question, and two of the four listed
//   rows carried a green `Active` pill inside the tab labelled Expiring. The
//   badge is the defect: it was the one predicate on that page with no clock in
//   it, and it has been wrong since the page's first commit.
//
// ── ⚠️ WHY THE RULE IS PER-ROW AND NOT A BAND ───────────────────────────────
//   `Expiring` stops being a WIDTH and becomes a MEANING: the renewal-notice
//   deadline has arrived. `Contract.noticeRequiredDays` is already an authored
//   per-row term ({30, 60, 90} across the fixture), already collected by the
//   create wizard behind an honest refusal, already classified in
//   `projectionGate/dayCounts.ts` as `not-a-clock-difference` — *"A contract
//   TERM … No clock endpoint"*, where it serves as one of that gate's acquittal
//   CONTROLS — and already rendered to a reader: `contractView`'s
//   renewal-decision timeline step shows `endDate − noticeRequiredDays` as the
//   "notice by" date. So the pill and that step now agree BY CONSTRUCTION
//   rather than by coincidence.
//
//   **The shipped 90 was disqualified by PROVENANCE, not by preference.**
//   `git log -S` puts `daysToExpiry <= 90`, the subtitle *"Within next 90
//   days"* and the fixture's own `Active expiring within 90d` section comment
//   all at the page's first commit (`ffc086f` / `dfb09f3`, 2026-05-20) — and at
//   that commit the predicate read `c.daysUntilExpiry <= 90` against the STORED
//   `daysUntilExpiry` field since retired for being 111 days stale. It was
//   never derived from anything.
//
//   ⚠️ **AND IT IS INDISTINGUISHABLE FROM A FLAT 30 ON TODAY'S FIXTURE — SAID
//   PLAINLY, BECAUSE THAT IS WHY IT IS A RULING AND NOT A DERIVATION.** Both
//   score 0/13 against the authored labels. They diverge only on a row whose
//   notice ≠ 30 while `30 < d <= notice`, and no such row exists at
//   `DECLARED_PRESENT`. Where they WOULD diverge is dated and near:
//   `ctr-003` (notice 60) becomes Expiring 2026-11-08 under this rule and
//   2026-12-08 under a flat 30; `ctr-004` (notice 90) 2026-11-09 vs 2027-01-08.
//   The mutation probe that flips a row's `noticeRequiredDays` is what makes
//   the difference checkable — no band probe reaches it.
//
// ── ⚠️ THE `LIVE` GUARD IS LOAD-BEARING, AND ITS CONTROL IS IN THE FIXTURE ──
//   A clock may only retire a contract that is still running. `ctr-012` is
//   stored `Terminated` and sits 39 days PAST its own `endDate` at
//   `DECLARED_PRESENT` — a bare `isPast(endDate)` rule re-labels a terminated
//   agreement as expired, and the acquittal is what proves the guard is doing
//   work rather than decorating the function. `ctr-011` (Draft, 586 days out)
//   is the other direction. Both ship as assertions.
//
// ── ⚠️ NO SHARED CONSTANT, AND THE TREE ALREADY ARGUES IT ───────────────────
//   `dayProjection.ts`'s own note on `DOCUMENT_EXPIRING_WINDOW_DAYS`:
//   *"Deliberately NOT `complianceProjection`'s 90 … collapsing two windows
//   because they are both windows is how one surface silently adopts another's
//   policy."* Contracts now carry no window at all on the expiry axis — the
//   term is the contract's own — and the one horizon that remains here
//   (`CONTRACT_RENEWAL_HORIZON_DAYS`) is named, local, and answers a different
//   question. Windows differing by ruling is what this tree does.
// ────────────────────────────────────────────────────────────────────────────

import type { Contract, ContractStatus } from '../../data/mockContracts';
import { daysUntil, isPast } from './dayProjection';

/**
 * What a reader sees.
 *
 * ⚠️ **DELIBERATELY AN ALIAS OF `ContractStatus` RATHER THAN A NARROWED UNION,
 * WHICH IS THE OPPOSITE OF `ObligationDisplayState`'s CHOICE.** The stored
 * union still carries `Expiring` and `Expired`, so a fixture COULD re-author a
 * clock state tomorrow. Narrowing the stored type would make that a `tsc`
 * failure — and would put the defect somewhere a mutation probe cannot reach,
 * because a probe that cannot compile is a probe that never ran. The
 * duplicate-source rule is therefore held by an assertion that FIRES BY NAME
 * (`contractExpiry.test.ts` → *"no contract fixture stores a clock state"*),
 * which is a thing this project can prove it catches.
 */
export type ContractDisplayStatus = ContractStatus;

/**
 * The states a clock may retire — everything else is a machine fact the clock
 * has no standing to overrule.
 *
 * `Renewed` is IN, uniformly with the ruling. It is not exercised by today's
 * fixture (`ctr-010` sits 221 days out at `DECLARED_PRESENT` and would first
 * read `Expiring` on 2027-02-08), and that is stated rather than left for a
 * reader to discover as a surprise.
 */
export const CONTRACT_LIVE_STATES: readonly ContractStatus[] = [
  'Active',
  'Expiring',
  'Renewed',
];

/** Whether the clock may speak about this row at all. */
export function isLiveContract(status: ContractStatus): boolean {
  return CONTRACT_LIVE_STATES.includes(status);
}

/**
 * A contract's display status, COMPUTED (law 0.5).
 *
 *   Expired  := status ∈ LIVE AND isPast(daysUntil(endDate, now))
 *   Expiring := status ∈ LIVE AND daysUntil(endDate, now) <= noticeRequiredDays
 *   otherwise the stored machine status, unchanged.
 *
 * A row with no readable `endDate` keeps its stored status: absence is a real
 * answer and must not become an alarm — `documentExpiry`'s `'no-expiry'` arm is
 * the same choice under a different name.
 */
export function contractDisplayStatus(
  c: Pick<Contract, 'status' | 'endDate' | 'noticeRequiredDays'>,
  nowIso: string,
): ContractDisplayStatus {
  // One `if … return` per outcome, never a ternary — `projectionGate`'s
  // write-site matcher recognises `return 'X'` and does not see a state inside
  // a conditional expression, so a ternary here would leave both states reading
  // `stored-in-fixtures` in the gate while this file computed them.
  if (!isLiveContract(c.status)) return c.status;
  const days = daysUntil(c.endDate, nowIso);
  if (days === null) return c.status;
  if (isPast(days)) return 'Expired';
  if (days <= c.noticeRequiredDays) return 'Expiring';
  return c.status;
}

/**
 * The RENEWAL PIPELINE's horizon — a planning question, not a status question,
 * and the derivation that it survives this batch is worth stating because the
 * ruling asked for it either way.
 *
 * The pipeline lists contracts *grouped by month* across a forward horizon.
 * `contractDisplayStatus` cannot express that: routed through the classifier
 * the pipeline would show exactly the rows already in the Expiring tab (two, at
 * `DECLARED_PRESENT`), collapsing a two-quarter planning view into a duplicate
 * of the tab beside it. So the arm survives, and per the ruling it gets its own
 * named constant here rather than a literal on the page.
 *
 * ⚠️ **IT IS COUPLED TO PROSE, AND THE COUPLING IS ASSERTED RATHER THAN
 * TRUSTED.** `contracts.pipeline.subtitle` reads *"…in the next 6 months"* in
 * EN and ID. That string cannot see this number, so `contractExpiry.test.ts`
 * pins the constant inside the range a reader would call six months — move it
 * to 90 and the test goes red naming the subtitle, instead of the subtitle
 * quietly becoming false. This is the treatment the KPI subtitle did NOT get:
 * that one lost its number outright, because a width the ruling can move should
 * not be restated in prose at all.
 */
export const CONTRACT_RENEWAL_HORIZON_DAYS = 180;

/** Membership of the renewal pipeline: still running, not yet past, inside the
 *  horizon. Uses the same `LIVE` set as the classifier so the two cannot drift.
 *  (The predicate it replaces read `Active | Expiring`, which is `LIVE` minus
 *  `Renewed`; no fixture row is affected today — `ctr-010` sits beyond the
 *  horizon — and the union is taken so there is ONE definition of "running".) */
export function inRenewalHorizon(
  c: Pick<Contract, 'status' | 'endDate'>,
  nowIso: string,
): boolean {
  if (!isLiveContract(c.status)) return false;
  const days = daysUntil(c.endDate, nowIso);
  if (days === null) return false;
  return !isPast(days) && days <= CONTRACT_RENEWAL_HORIZON_DAYS;
}

/**
 * The tone of the EXPIRY FIGURE, keyed on the display status.
 *
 * ⚠️ **THIS REPLACES `expiryTone(days)`, WHOSE THREE CUTS WERE `< 0`, `< 30`
 * AND `< 90` — one duplicate of the zero boundary, one page-local width, and
 * one duplicate of the band this batch removes.** Keeping the 30 would have
 * reinstated a page-local width under a different name, which is the thing the
 * ruling deletes. What it costs is stated instead of absorbed: at
 * `DECLARED_PRESENT` four rows change colour — `ctr-007`/`ctr-008` from danger
 * to warning (they are expiring, not expired), `ctr-005`/`ctr-006` from warning
 * to success (they are not expiring at all under the ruled rule).
 *
 * `Draft` and `Terminated` go TERTIARY rather than keeping a semantic colour:
 * neither contract is running, so its expiry figure is a historical fact and
 * not a signal. Under the old cuts `ctr-012` (Terminated, 47 days past its end)
 * rendered RED — an alarm about an agreement nobody can act on.
 *
 * The map is total over the display union on purpose, so a status added to
 * `ContractStatus` is a `tsc` failure here rather than a silently uncoloured
 * cell.
 */
export const CONTRACT_EXPIRY_TONE: Record<ContractDisplayStatus, string> = {
  Expired: 'text-danger font-semibold',
  Expiring: 'text-warning-hover font-semibold',
  Active: 'text-success',
  Renewed: 'text-success',
  Draft: 'text-text-tertiary',
  Terminated: 'text-text-tertiary',
};

/** The renewal-pipeline chip, same axis as the tone map and derived from the
 *  same classifier — it used to carry its own `< 30` / `< 90` copy of the
 *  band. Every row the pipeline shows is live and unexpired by construction,
 *  so `Expired`/`Draft`/`Terminated` are unreachable here; they are mapped
 *  anyway because a partial map is how an unreachable branch becomes a blank
 *  chip the day the membership rule changes. */
export const CONTRACT_EXPIRY_CHIP: Record<ContractDisplayStatus, string> = {
  Expired: 'bg-danger-soft text-danger',
  Expiring: 'bg-warning-soft text-warning-hover',
  Active: 'bg-info-soft text-info',
  Renewed: 'bg-info-soft text-info',
  Draft: 'bg-bg-hover text-text-tertiary',
  Terminated: 'bg-bg-hover text-text-tertiary',
};
