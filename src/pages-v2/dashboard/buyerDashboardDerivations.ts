// ─────────────────────────────────────────────────────────────────────────────
// BUYER DASHBOARD DERIVATIONS — every figure /buyer/dashboard renders.
//
// ⚠️ **THE PAGE HOLDS NO ARITHMETIC AND NO LITERAL IN A VALUE POSITION.** Every
// number, ratio and bucket on the dashboard is produced here, from rows the
// BUYER READ actually returns, at an instant the caller injects. The page's job
// is to render what this module returns and to say where it came from.
//
// ── ⚠️ THE READING INSTANT IS `P`, NOT THE WALL CLOCK ───────────────────────
// Every clock-relative function below takes `nowIso` and the page passes
// `PRESENT_ISO`. The dashboard used to take `new Date()` (`BuyerDashboard.tsx`
// and three widgets), which is why `anchoredSurfaces.guard.test.tsx` excluded
// it from the clock-independent population by name. That exclusion is spent:
// with no wall-clock read left, the surface renders identically at any instant,
// and it joins that guard in this batch.
//
// ── ⚠️ WHAT IS DELIBERATELY ABSENT, AND WHY ITS ABSENCE IS THE POINT ────────
// **There is no clock-relative PO, RFQ, quotation or ASN figure in this file.**
// Those four families are NOT anchored (`clockDrift`'s table names the anchored
// set; they are not in it), so a day-count over them is saturated — every row
// reads late at any instant, and the number says something about the calendar
// rather than about the work. `unacknowledgedOver48h` and `awardOverdue` were
// exactly that, and the tiles that rendered them are retired rather than
// re-pointed. The CLOCK-FREE ratios on those families — how many invited
// suppliers answered, how many POs left the not-acknowledged prefix — are
// honest at any instant and are kept.
// ─────────────────────────────────────────────────────────────────────────────

import { POStatus } from '../../services/data/types';
import type {
  BuyerInvoice,
  Contract,
  ComplianceRegistryEntry,
  GoodsReceipt,
  InvoiceStatus,
  PurchaseOrder,
} from '../../services/data/types';
import type { ContractObligation } from '../../data/mockObligations';
import type { RFQ } from '../../data/mockRfqs';
import type { RequirementResponse } from '../../services/sdc/types';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';
import { computeStatus } from '../../services/data/complianceProjection';
import { isHalalCertType } from '../../services/data/halalVerification';
import { obligationDisplay } from '../../services/data/obligationProjection';
import {
  contractDisplayStatus,
  inRenewalHorizon,
} from '../../services/data/contractExpiry';
import {
  grNeedingAction,
  grVariance,
} from '../widgets/buyerDerivations';

/** The reading instant every figure on this page is derived at. */
export const PRESENT_ISO = `${DECLARED_PRESENT}T00:00:00.000Z`;

/**
 * ⚠️ **THE ONE ROUNDING RULE, STATED ONCE.** Every percentage on this page is a
 * whole number produced here. A tile that rounded its own would be a second
 * rule, and two rules are one drift apart.
 *
 * A zero denominator returns 0 rather than `NaN`: "none of nothing" is 0% on a
 * bar, and `NaN` would render as the string "NaN%" in a value position.
 */
export function wholePercent(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export interface Ratio {
  readonly numerator: number;
  readonly denominator: number;
  readonly pct: number;
}

const ratio = (numerator: number, denominator: number): Ratio => ({
  numerator,
  denominator,
  pct: wholePercent(numerator, denominator),
});

/**
 * ⚠️ **BELOW THIS MANY OBSERVATIONS, A RATE IS SHOWN AS A COUNT.**
 *
 * Ten, because at nine or fewer each row moves the figure by more than ten
 * percentage points, so the percentage claims a precision the sample cannot
 * support — "100%" over five rows and "100%" over five hundred are the same
 * glyph and a different fact. The count says what was actually observed.
 *
 * It is a THRESHOLD ON THE DENOMINATOR and not on the numerator: what is thin
 * is the evidence, never the result.
 */
export const LOW_VOLUME_MIN_DENOMINATOR = 10;

// ── Purchase orders ──────────────────────────────────────────────────────────

/**
 * The PO states that are NOT yet acknowledged — **derived from the model's own
 * declaration order, never hand-listed.** `POStatus` is declared in lifecycle
 * order (Sent → Viewed → Acknowledged → …), so the not-acknowledged set is the
 * prefix before `ACKNOWLEDGED`. Insert a state before it tomorrow and this set
 * gains it with nobody editing this file; that is the property a literal list
 * cannot have.
 */
export const NOT_ACKNOWLEDGED_PO_STATUSES: readonly POStatus[] = Object.freeze(
  Object.values(POStatus).slice(0, Object.values(POStatus).indexOf(POStatus.ACKNOWLEDGED)),
);

/** Share of POs that have left the not-acknowledged prefix. CLOCK-FREE. */
export function poAcknowledgedRate(rows: readonly PurchaseOrder[]): Ratio {
  return ratio(
    rows.filter((p) => !NOT_ACKNOWLEDGED_PO_STATUSES.includes(p.status)).length,
    rows.length,
  );
}

// ── RFQs ─────────────────────────────────────────────────────────────────────

/** Invited suppliers who answered, across every RFQ the buyer holds. CLOCK-FREE. */
export function rfqResponseRate(rows: readonly RFQ[]): Ratio {
  return ratio(
    rows.reduce((s, r) => s + r.respondedSupplierIds.length, 0),
    rows.reduce((s, r) => s + r.invitedSupplierIds.length, 0),
  );
}

// ── Invoices ─────────────────────────────────────────────────────────────────

/** Three-way match attainment across every invoice the buyer holds. CLOCK-FREE. */
export function matchRate(rows: readonly BuyerInvoice[]): Ratio {
  return ratio(rows.filter((i) => i.matchStatus === 'Matched').length, rows.length);
}

/**
 * Settled invoices paid on or before their due date.
 *
 * The denominator is PAID ROWS, not all rows: an unpaid invoice has not yet had
 * the chance to be late, and counting it as a miss would report the size of the
 * backlog as a timeliness failure.
 */
export function onTimePaymentRate(
  rows: readonly BuyerInvoice[],
): Ratio & { readonly lowVolume: boolean } {
  const paid = rows.filter((i) => i.paymentDate !== null);
  const onTime = paid.filter((i) => (i.paymentDate as string) <= i.dueDate);
  return {
    ...ratio(onTime.length, paid.length),
    lowVolume: paid.length < LOW_VOLUME_MIN_DENOMINATOR,
  };
}

/**
 * ⚠️ **THE OPEN-AP LIFECYCLE GROUPING, MIRRORING `toBuyerLabel`'s OWN SWITCH.**
 *
 * The groups are the canonical states the shipped buyer projection collapses
 * together, so the bars and the invoice list can never tell different stories:
 *
 *   · `submitted`               → projects to **Pending Match**
 *   · `approvedAwaitingRelease` → **Approved**, plus the SAP interim
 *     `Releasing Payment`, which has left the buyer's hands and has not settled
 *   · `disputed`                → **Disputed**
 *
 * `Draft` is supplier-private and never reaches a buyer read; `Payment Released`
 * and `Remittance Received` are settled and are not open payables. Membership is
 * asserted against `toBuyerLabel` in the spec, so a change to the projection
 * turns this red rather than letting it drift.
 */
export const AP_OPEN_GROUPS: Readonly<Record<
  'submitted' | 'approvedAwaitingRelease' | 'disputed',
  readonly InvoiceStatus[]
>> = Object.freeze({
  submitted: Object.freeze<InvoiceStatus[]>(['Submitted', 'Matched']),
  approvedAwaitingRelease: Object.freeze<InvoiceStatus[]>(['Approved', 'Releasing Payment']),
  disputed: Object.freeze<InvoiceStatus[]>(['Disputed']),
});

export interface AccountsPayableOpen {
  readonly submitted: number;
  readonly approvedAwaitingRelease: number;
  readonly disputed: number;
  readonly total: number;
}

/** Open payables by lifecycle group, in the invoices' own currency units. */
export function accountsPayableOpen(rows: readonly BuyerInvoice[]): AccountsPayableOpen {
  const sum = (states: readonly InvoiceStatus[]) =>
    rows
      .filter((i) => states.includes(i.lifecycleState))
      .reduce((s, i) => s + i.amount, 0);
  const submitted = sum(AP_OPEN_GROUPS.submitted);
  const approvedAwaitingRelease = sum(AP_OPEN_GROUPS.approvedAwaitingRelease);
  const disputed = sum(AP_OPEN_GROUPS.disputed);
  return {
    submitted,
    approvedAwaitingRelease,
    disputed,
    total: submitted + approvedAwaitingRelease + disputed,
  };
}

// ── Goods receipts ───────────────────────────────────────────────────────────

/** Share of receipts carrying a quantity or quality variance. CLOCK-FREE. */
export function goodsReceiptVarianceRate(rows: readonly GoodsReceipt[]): Ratio {
  return ratio(grVariance(rows as GoodsReceipt[]).length, rows.length);
}

// ── Compliance (halal schemes only, STATUS only) ─────────────────────────────

export interface HalalCertificateStatus {
  readonly valid: number;
  readonly expiring: number;
  readonly missing: number;
  readonly expired: number;
  readonly total: number;
}

/**
 * ⚠️ **STATUS, NEVER VALIDITY.** This counts what the registry's rows LOOK LIKE
 * at `nowIso` through the shipped projection. It is not a claim that any
 * supplier is certified, and there is deliberately no "compliant" or "certified"
 * figure here for a surface to render — the platform does not certify anybody,
 * the compliance team does, by hand.
 *
 * The population is the HALAL SCHEMES ONLY, via the shipped
 * `isHalalCertType`: a BPOM notification and an ISO certificate are real
 * documents about other things, and counting them here would answer a different
 * question with a confident number.
 */
export function halalCertificateStatus(
  registry: readonly ComplianceRegistryEntry[],
  nowIso: string,
): HalalCertificateStatus {
  const halal = registry.filter((e) => isHalalCertType(e.certType));
  const n = (status: string) =>
    halal.filter((e) => computeStatus(e, nowIso) === status).length;
  return {
    valid: n('Valid'),
    expiring: n('Expiring'),
    missing: n('Missing'),
    expired: n('Expired'),
    total: halal.length,
  };
}

// ── The alert groups ─────────────────────────────────────────────────────────

export interface OverdueInvoiceGroup {
  readonly count: number;
  readonly maxDaysOverdue: number;
}

/** Invoices the shipped projection reads as Overdue at its read instant. */
export function overdueInvoiceGroup(rows: readonly BuyerInvoice[]): OverdueInvoiceGroup {
  const overdue = rows.filter((i) => i.status === 'Overdue');
  return {
    count: overdue.length,
    maxDaysOverdue: overdue.reduce((m, i) => Math.max(m, i.daysOutstanding), 0),
  };
}

export interface OpenDisputeGroup {
  readonly invoices: number;
  readonly requirementResponses: number;
  readonly count: number;
}

/**
 * ⚠️ **ONE DERIVATION OVER BOTH DISPUTE SOURCES.** A buyer with a dispute to
 * settle does not care which ledger it sits in, and two separate counts on one
 * page are two things to keep in step. Both are CLOCK-FREE — a dispute is a
 * recorded act, never a projection of the calendar.
 */
export function openDisputeGroup(
  invoices: readonly BuyerInvoice[],
  responses: readonly RequirementResponse[],
): OpenDisputeGroup {
  const inv = invoices.filter((i) => i.status === 'Disputed').length;
  const rr = responses.filter((r) => r.status === 'Disputed').length;
  return { invoices: inv, requirementResponses: rr, count: inv + rr };
}

export interface ObligationGroup {
  readonly count: number;
  readonly upcoming: number;
}

/** Contract obligations past due at `nowIso`, with the pipeline behind them. */
export function obligationGroup(
  rows: readonly ContractObligation[],
  nowIso: string,
): ObligationGroup {
  return {
    count: rows.filter((o) => obligationDisplay(o, nowIso) === 'Overdue').length,
    upcoming: rows.filter((o) => obligationDisplay(o, nowIso) === 'Upcoming').length,
  };
}

export interface ContractGroup {
  readonly count: number;
  readonly renewalHorizon: number;
}

/** Contracts reading Expiring at `nowIso`, with the renewal pipeline behind them. */
export function contractGroup(
  rows: readonly Contract[],
  nowIso: string,
): ContractGroup {
  return {
    count: rows.filter((c) => contractDisplayStatus(c, nowIso) === 'Expiring').length,
    renewalHorizon: rows.filter((c) => inRenewalHorizon(c, nowIso)).length,
  };
}

export interface ReceiptGroup {
  readonly count: number;
  readonly variance: number;
}

/** Receipts awaiting a decision, with the variance subset that needs one most. */
export function receiptGroup(rows: readonly GoodsReceipt[]): ReceiptGroup {
  return {
    count: grNeedingAction(rows as GoodsReceipt[]).length,
    variance: grVariance(rows as GoodsReceipt[]).length,
  };
}

// ── Obligations due, by month ────────────────────────────────────────────────

export type MonthRelation = 'past' | 'present' | 'future';

export interface MonthBucket {
  readonly month: string;
  readonly count: number;
  readonly relation: MonthRelation;
}

/**
 * Obligations bucketed by due month, over exactly the months the data occupies.
 *
 * ⚠️ **NO EMPTY MONTHS ARE MANUFACTURED AND NO RANGE IS ASSUMED.** A fixed
 * twelve-month axis would draw eleven zero bars over a corpus that spans one,
 * which reads as "nothing is due" rather than "there is one month of data".
 *
 * `relation` is decided against the DECLARED PRESENT's month, so the chart's
 * before/after split is the same at any wall-clock instant.
 */
export function obligationsByMonth(
  rows: readonly ContractObligation[],
  nowIso: string,
): readonly MonthBucket[] {
  const present = nowIso.slice(0, 7);
  const counts = new Map<string, number>();
  for (const o of rows) {
    const m = o.dueDate.slice(0, 7);
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return [...counts.keys()].sort().map((month) => ({
    month,
    count: counts.get(month) as number,
    relation: (month < present ? 'past' : month === present ? 'present' : 'future') as MonthRelation,
  }));
}

// ── What the Phase B placeholders say about the data they are waiting for ────

export interface MonthSpan {
  readonly months: number;
  readonly minPerMonth: number;
  readonly maxPerMonth: number;
}

/**
 * How much history a set of dates actually carries.
 *
 * The Phase B cards interpolate these rather than asserting "too thin" in prose:
 * the day the corpus is deep enough, the placeholder's own text says so, and
 * nobody has to remember to come back and edit a sentence.
 */
export function monthSpan(dates: readonly string[]): MonthSpan {
  if (dates.length === 0) return { months: 0, minPerMonth: 0, maxPerMonth: 0 };
  const counts = new Map<string, number>();
  for (const d of dates) {
    const m = d.slice(0, 7);
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  const per = [...counts.values()];
  return {
    months: counts.size,
    minPerMonth: Math.min(...per),
    maxPerMonth: Math.max(...per),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE LANE MODEL — who the queue's rows belong to.
//
// ⚠️ **A ROW'S LANE IS DERIVED FROM THE ATOM ITS PAGE'S VERB REQUIRES, NOT
// ASSIGNED BY HAND.** `rolesHolding(atom)` is the shipped answer to *whose act
// is this?*, and it is the same authority the cross-role handoff already speaks
// through — so a lane that gains or loses an atom moves the queue row with it,
// in the same commit, with nobody editing this file.
//
// The spec asserts each representative atom is held by EXACTLY ONE lane. That
// is what makes the mapping unambiguous: an atom two lanes share would make
// "whose row is this?" a choice, and a choice is where a hand-assignment hides.
// ─────────────────────────────────────────────────────────────────────────────

import {
  PERSONA_SYSTEM_ROLES,
  SUPERSET_ROLES,
  TENANCY_ANCHORS,
  rolesHolding,
  type SystemRoleId,
} from '../../services/transitions/businessRoles';
import type { TransitionRole } from '../../services/transitions/schema';
import type { ASN, SupplierDocument } from '../../services/data/types';

/**
 * The buyer's LANES — the persona's system roles minus the tenancy anchor
 * (which holds no atom and names the side) and minus the supersets (which hold
 * everything and so own nothing). Derived, so a seventh lane joins by itself.
 */
export function buyerLaneIds(): readonly SystemRoleId[] {
  return PERSONA_SYSTEM_ROLES.buyer.filter(
    (r) => !TENANCY_ANCHORS.has(r) && !SUPERSET_ROLES.has(r),
  );
}

/** The lanes a seat actually holds, in the model's own order. */
export function heldLanes(seatRoles: readonly string[] | undefined): readonly SystemRoleId[] {
  const held = new Set(seatRoles ?? []);
  return buyerLaneIds().filter((lane) => held.has(lane));
}

/**
 * Each queue row's representative atom — the act the row's page exists for.
 * The lane is `rolesHolding(atom)`, never a literal beside the row.
 */
export const QUEUE_ROW_ATOMS: Readonly<Record<string, TransitionRole>> = Object.freeze({
  finance: 'invoice:dispute' as TransitionRole,
  receiving: 'gr:disposition' as TransitionRole,
  compliance: 'supplierdoc:verify' as TransitionRole,
  planning: 'requirementresponse:review' as TransitionRole,
  procurement: 'rfq:award' as TransitionRole,
});

/** Where each row's work is actually done. */
const QUEUE_ROW_ROUTES: Readonly<Record<string, string>> = Object.freeze({
  finance: '/buyer/invoices',
  receiving: '/buyer/goods-receipt',
  compliance: '/buyer/compliance',
  planning: '/buyer/collaboration',
  procurement: '/buyer/sourcing',
});

export interface QueueRow {
  readonly lane: SystemRoleId;
  /**
   * The counts behind the row's work description, in the order the description
   * names them — or `null` when the row is HELD.
   */
  readonly counts: readonly number[] | null;
  /**
   * ⚠️ **HELD = the figures this row would want are clock-relative over an
   * UNANCHORED family**, so they are not shown at all rather than shown wrong.
   * The row still renders and its link still navigates: the work exists, the
   * COUNT is what cannot be stated honestly yet.
   */
  readonly held: boolean;
  readonly route: string;
}

export interface QueueInput {
  readonly invoices: readonly BuyerInvoice[];
  readonly receipts: readonly GoodsReceipt[];
  readonly asns: readonly ASN[];
  readonly registry: readonly ComplianceRegistryEntry[];
  readonly documents: readonly SupplierDocument[];
  readonly responses: readonly RequirementResponse[];
  readonly nowIso: string;
}

const laneOf = (atom: TransitionRole): SystemRoleId => rolesHolding(atom)[0];

export function queueRows(input: QueueInput): readonly QueueRow[] {
  const halal = halalCertificateStatus(input.registry, input.nowIso);
  const byStatus = <T extends { status: string }>(rows: readonly T[], s: string) =>
    rows.filter((r) => r.status === s).length;

  const counts: Record<string, readonly number[] | null> = {
    finance: [
      overdueInvoiceGroup(input.invoices).count,
      openDisputeGroup(input.invoices, input.responses).invoices,
    ],
    receiving: [receiptGroup(input.receipts).count, byStatus(input.asns, 'Discrepancy')],
    compliance: [halal.expired + halal.expiring, byStatus(input.documents, 'Under Review')],
    planning: [
      byStatus(input.responses, 'Submitted'),
      byStatus(input.responses, 'Disputed'),
      byStatus(input.responses, 'Draft'),
    ],
    // Rule 3. `pendingAwardRfqs` × `awardOverdue` and `unacknowledgedOver48h`
    // are the figures this row wants, and both are day-counts over families
    // that are not anchored — saturated at any instant, so they say something
    // about the calendar rather than about the sourcing desk.
    procurement: null,
  };

  return Object.entries(QUEUE_ROW_ATOMS).map(([key, atom]) => ({
    lane: laneOf(atom),
    counts: counts[key],
    held: counts[key] === null,
    route: QUEUE_ROW_ROUTES[key],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ALERTS STRIP.
//
// ⚠️ **A GROUP WITH NOTHING IN IT IS NOT SHOWN, RATHER THAN SHOWN AS ZERO.** A
// strip of zeroes trains a reader to skim past the strip, which is the one
// behaviour an exception list cannot afford. The spec probes this on a
// CONSTRUCTED empty input, because the shipped corpus has every group populated
// and observing it would prove nothing.
//
// ── SEVERITY ────────────────────────────────────────────────────────────────
// Two groups read the SHIPPED ladder directly (`invoiceTier`, `grTier`), so
// this page and the pages those tiers already drive can never disagree.
//
// The other four have no ladder entry, so the mapping is stated here and it
// follows the ladder's own rule — *money/overdue = critical, variance/deadline
// = warning, plain in-flight counts = info*:
//
//   · halal certificates — CRITICAL while any cert is EXPIRED (past its date is
//     the ladder's own word for critical), WARNING when the group holds only
//     expiring ones, which is a deadline. It re-decides itself from the data
//     rather than being pinned, so the day the expired rows are renewed the
//     card softens with nobody editing this file.
//   · contract obligations overdue — CRITICAL. Overdue, by the ladder's word.
//   · open disputes — WARNING. Money in dispute is a variance, not yet a miss.
//   · contracts expiring — WARNING. A deadline.
// ─────────────────────────────────────────────────────────────────────────────

import { grTier, invoiceTier } from '../widgets/buyerDerivations';
import {
  pslExpiringRows,
  pslExpiredStillListedRows,
  PSL_EXPIRING_WINDOW_DAYS,
  type PslCapSetting,
} from '../../services/data/pslProjection';
import type { PslListing } from '../../services/data/pslListing';
import type { FlagSeverity } from '../../components/ui-v2/ExpandableWidget';

/** The alert-card severities, ordered. `none` never reaches a card: a group
 *  with nothing in it is omitted before severity is asked for. */
export type AlertSeverity = Exclude<FlagSeverity, 'none'>;

const SEVERITY_RANK: Readonly<Record<AlertSeverity, number>> = Object.freeze({
  critical: 0,
  warning: 1,
  info: 2,
});

/**
 * EVERY ALERT GROUP THE STRIP CAN HOLD.
 *
 * ⚠️ **THE ARRAY IS THE VOCABULARY AND THE TYPE IS DERIVED FROM IT**, the shape
 * `PSL_STATUSES` already uses. It replaces a hand-written union beside a spec
 * that asserted *"no group exceeds the six the layout admits"* — a cardinality
 * in prose, which went stale the moment P4 added a seventh
 * (`FLOOR-IN-PROSE-01`). Read off the array, that assertion re-derives itself.
 */
export const ALERT_GROUP_IDS = Object.freeze([
  'overdueInvoices',
  'halal',
  'obligations',
  'receipts',
  'disputes',
  'contracts',
  /** PSL P4 · a listing inside `PSL_EXPIRING_WINDOW_DAYS`. */
  'pslExpiring',
  /**
   * PSL P4 · a listing whose record still says `Listed` past its effective end
   * date — the only PSL signal ruled CRITICAL, because the sourcing gate
   * (`rfqSourcingGate`) reads `isPslInForce` and its answer has already changed
   * with nobody told.
   */
  'pslExpiredListed',
] as const);

export type AlertGroupId = (typeof ALERT_GROUP_IDS)[number];

export interface AlertGroup {
  readonly id: AlertGroupId;
  readonly severity: AlertSeverity;
  readonly count: number;
  /** The interpolation values the group's one-line detail needs. */
  readonly detail: Readonly<Record<string, number>>;
  readonly route: string;
}

export interface AlertInput {
  readonly invoices: readonly BuyerInvoice[];
  readonly receipts: readonly GoodsReceipt[];
  readonly registry: readonly ComplianceRegistryEntry[];
  readonly obligations: readonly ContractObligation[];
  readonly contracts: readonly Contract[];
  readonly responses: readonly RequirementResponse[];
  /**
   * PSL P4. Passed IN rather than read from `pslStore` here, because
   * `alertGroups` is pure over its input and a store read would make the
   * dashboard's figures untestable at an injected instant.
   */
  readonly listings: readonly PslListing[];
  /** The cap ledger the two PSL predicates bound their dates by. Optional
   *  because `effectiveCap` defaults to the live store when it is omitted, and
   *  every existing caller of this shape predates P4. */
  readonly capSettings?: readonly PslCapSetting[];
  readonly nowIso: string;
}

/** A tier the shipped ladder returns, narrowed for a card that is only built
 *  when its count is positive. `none` there would be a contradiction, and the
 *  fallback names which one rather than silently picking a colour. */
const carded = (tier: FlagSeverity, whenNone: AlertSeverity): AlertSeverity =>
  tier === 'none' ? whenNone : tier;

export function alertGroups(input: AlertInput): readonly AlertGroup[] {
  // ⚠️ `input.nowIso` RATHER THAN A DESTRUCTURED `const { nowIso }`, and the
  // difference is not style. `readingInstantGate` follows a forwarded instant
  // through a parameter or a variable initializer; a BINDING ELEMENT is neither,
  // so a destructured instant classifies UNRESOLVED and this file's obligation
  // and contract reads would drag two anchored families off their pin. Reading
  // the property keeps the forwarding visible to the instrument that checks it.
  const overdue = overdueInvoiceGroup(input.invoices);
  const halal = halalCertificateStatus(input.registry, input.nowIso);
  const obligations = obligationGroup(input.obligations, input.nowIso);
  const receipts = receiptGroup(input.receipts);
  const disputes = openDisputeGroup(input.invoices, input.responses);
  const contracts = contractGroup(input.contracts, input.nowIso);
  // `input.nowIso` as a PROPERTY, for the reason stated at the top of this
  // function: a destructured instant classifies UNRESOLVED to
  // `readingInstantGate` and would drag the `psl` family off its pin.
  const pslExpiring = pslExpiringRows(input.listings, input.nowIso, input.capSettings);
  const pslExpiredListed = pslExpiredStillListedRows(
    input.listings,
    input.nowIso,
    input.capSettings,
  );

  const all: readonly AlertGroup[] = [
    {
      id: 'overdueInvoices',
      severity: carded(invoiceTier(input.invoices as BuyerInvoice[]), 'critical'),
      count: overdue.count,
      detail: { days: overdue.maxDaysOverdue },
      route: '/buyer/invoices',
    },
    {
      id: 'halal',
      severity: halal.expired > 0 ? 'critical' : 'warning',
      count: halal.expired + halal.expiring,
      detail: { missing: halal.missing },
      route: '/buyer/compliance',
    },
    {
      id: 'obligations',
      severity: 'critical',
      count: obligations.count,
      detail: { upcoming: obligations.upcoming },
      route: '/buyer/contracts',
    },
    {
      id: 'receipts',
      severity: carded(grTier(input.receipts as GoodsReceipt[]), 'warning'),
      count: receipts.count,
      detail: { variance: receipts.variance },
      route: '/buyer/goods-receipt',
    },
    {
      // No route holds BOTH dispute ledgers — invoices live on /buyer/invoices
      // and forecast responses on /buyer/collaboration. The most specific
      // existing route is the invoice list: it is the larger half and the only
      // one of the two whose page carries a dispute affordance. The card's
      // detail names the split, so the reader is not told the other half is
      // there when it is not.
      id: 'disputes',
      severity: 'warning',
      count: disputes.count,
      detail: { invoices: disputes.invoices, responses: disputes.requirementResponses },
      route: '/buyer/invoices',
    },
    {
      id: 'contracts',
      severity: 'warning',
      count: contracts.count,
      detail: { horizon: contracts.renewalHorizon },
      route: '/buyer/contracts',
    },
    // ── PSL P4 · R-C ────────────────────────────────────────────
    //
    // ⚠️ **BOTH COUNTS COME FROM THE SAME EXPORTED PREDICATE THE QUEUE PAGE
    // FILTERS BY, AND THE ROUTE CARRIES THE TAB THAT APPLIES IT.** A buyer who
    // clicks a card reading "2" lands on exactly those two rows. Two
    // derivations of "which listings are expiring" would drift the first time
    // one gained the cap ledger and the other did not —
    // `COUNT-RESTATED-ACROSS-INSTRUMENTS-01` — and the drill-down is what makes
    // a disagreement VISIBLE rather than merely detectable by a test.
    {
      id: 'pslExpiring',
      severity: 'warning',
      count: pslExpiring.length,
      detail: { days: PSL_EXPIRING_WINDOW_DAYS },
      route: '/buyer/preferred-suppliers?tab=expiring',
    },
    {
      // CRITICAL, and it is the only PSL signal that is. The record still
      // claims to grant something and it no longer does — which the SOURCING
      // GATE has already acted on, silently, because `isPslInForce` went false
      // on a calendar day rather than on an act.
      id: 'pslExpiredListed',
      severity: 'critical',
      count: pslExpiredListed.length,
      // `count` rather than `suppliers`: the card resolves this through
      // `t(key, detail)`, and i18next needs the interpolation named `count`
      // to pick `detail_one` vs `detail_other`. Browser QA read the
      // unpluralised version back as "Across 1 suppliers".
      detail: { count: new Set(pslExpiredListed.map((r) => r.supplierId)).size },
      route: '/buyer/preferred-suppliers?tab=expiredListed',
    },
  ];

  return all
    .filter((g) => g.count > 0)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
