// ─────────────────────────────────────────────────────────────────────────────
// BUYER DASHBOARD DERIVATIONS — the gate on the module every figure on
// /buyer/dashboard is read from.
//
// ⚠️ **EVERY ASSERTION HERE IS A PROPERTY OF THE SHIPPED DATA, NOT A PINNED
// NUMBER.** The fixture corpora grow — arc 1's operator-editable certificate
// registry makes `COMPLIANCE_REGISTRY` grow BY DESIGN — so a spec that pinned
// `expect(halal.expiring).toBe(3)` would redden on a legitimate row and train
// somebody to edit the number (`FLOOR-IN-PROSE-01`, CP-3a). Each figure is
// therefore re-derived here by an INDEPENDENT route and compared, which is the
// assertion that survives a growing corpus.
//
// ⚠️ **AND THE PINS THAT DO EXIST ARE NAMED MEMBERS, NEVER COUNTS**
// (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`). A count-based control
// is exactly the control a corpus replacement walks through, because a
// replacement usually preserves the count by construction.
//
// The Seat-3 census figures are recorded in the batch report as a CROSS-CHECK
// and are deliberately not asserted here.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { COMPLIANCE_REGISTRY } from '../../services/data/mock/fixtures/complianceRegistry';
import { computeStatus } from '../../services/data/complianceProjection';
import { isHalalCertType } from '../../services/data/halalVerification';
import { toBuyerLabel } from '../../services/data/invoiceProjection';
import { obligationDisplay } from '../../services/data/obligationProjection';
import {
  contractDisplayStatus,
  inRenewalHorizon,
} from '../../services/data/contractExpiry';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';
import { POStatus } from '../../services/data/types';
import type {
  ASN,
  BuyerInvoice,
  GoodsReceipt,
  PurchaseOrder,
  Contract,
  ComplianceRegistryEntry,
  SupplierDocument,
} from '../../services/data/types';
import type { ContractObligation } from '../../data/mockObligations';
import type { RFQ } from '../../data/mockRfqs';
import { mockDataService } from '../../services/data/mock/mockDataService';
import { pslStore } from '../../services/data/mock/stores/pslStore';
import type { QueryScope } from '../../services/data/types';
import type { RequirementResponse } from '../../services/sdc/types';
import {
  PERSONA_SYSTEM_ROLES,
  SEEDED_SEAT_ROLES,
  SUPERSET_ROLES,
  TENANCY_ANCHORS,
  rolesHolding,
} from '../../services/transitions/businessRoles';

import { invoiceTier, grTier } from '../widgets/buyerDerivations';

import {
  ALERT_GROUP_IDS,
  alertGroups,
  buyerLaneIds,
  QUEUE_ROW_ATOMS,
  queueRows,
  PRESENT_ISO,
  LOW_VOLUME_MIN_DENOMINATOR,
  wholePercent,
  NOT_ACKNOWLEDGED_PO_STATUSES,
  AP_OPEN_GROUPS,
  matchRate,
  rfqResponseRate,
  poAcknowledgedRate,
  goodsReceiptVarianceRate,
  onTimePaymentRate,
  accountsPayableOpen,
  halalCertificateStatus,
  overdueInvoiceGroup,
  openDisputeGroup,
  obligationGroup,
  contractGroup,
  receiptGroup,
  obligationsByMonth,
  monthSpan,
} from './buyerDashboardDerivations';

const BUYER_SCOPE: QueryScope = { personaType: 'buyer', supplierId: null };
const P = PRESENT_ISO;

// The shipped buyer reads, once. Every figure below is derived from exactly the
// rows the PAGE will hold — never from a store the page cannot see.
const proc = mockDataService.procurement;
const invoices: BuyerInvoice[] = (await proc.getBuyerInvoices(BUYER_SCOPE)).items;
const pos: PurchaseOrder[] = (await proc.getPurchaseOrders(BUYER_SCOPE)).items;
const rfqs: RFQ[] = (await proc.getRFQs(BUYER_SCOPE)).items;
const receipts: GoodsReceipt[] = (await proc.getGoodsReceipts(BUYER_SCOPE)).items;
const contracts: Contract[] = (await proc.getContracts(BUYER_SCOPE)).items;
const obligations: ContractObligation[] = (await proc.getObligations(BUYER_SCOPE)).items;
const asns: ASN[] = (await proc.getASNs(BUYER_SCOPE)).items;
const documents: SupplierDocument[] = (await proc.getDocuments(BUYER_SCOPE)).items;
const responses: RequirementResponse[] = (
  await mockDataService.collaboration.getOwnRequirementResponses(BUYER_SCOPE)
).items;

describe('⚠️ POPULATION CONTROL — derived from the shipped reads, upstream of this module', () => {
  // `ownerlessScope`'s lesson (§86): a gate must not derive its population
  // through the code it is probing. Every population here comes from
  // `mockDataService`, which sits above every function under test — so a
  // mutation to this module cannot empty it and make the suite pass vacuously.
  it('every corpus this module reads is non-empty', () => {
    for (const [name, rows] of Object.entries({
      invoices,
      pos,
      rfqs,
      receipts,
      contracts,
      obligations,
      responses,
      registry: COMPLIANCE_REGISTRY as readonly ComplianceRegistryEntry[],
    })) {
      expect(rows.length, name).toBeGreaterThan(0);
    }
  });

  it('the reading instant is the declared present, never a wall clock', () => {
    expect(PRESENT_ISO.slice(0, 10)).toBe(DECLARED_PRESENT);
  });
});

describe('wholePercent — the one rounding rule', () => {
  it('rounds to a whole number', () => {
    expect(wholePercent(1, 3)).toBe(33);
    expect(wholePercent(2, 3)).toBe(67);
  });

  it('a zero denominator is 0, never NaN or Infinity', () => {
    expect(wholePercent(0, 0)).toBe(0);
    expect(Number.isFinite(wholePercent(3, 0))).toBe(true);
  });
});

describe('NOT_ACKNOWLEDGED_PO_STATUSES — derived from the PO model, not hand-listed', () => {
  it('is exactly the states declared BEFORE Acknowledged in POStatus', () => {
    const order = Object.values(POStatus);
    const cut = order.indexOf(POStatus.ACKNOWLEDGED);
    expect(cut).toBeGreaterThan(0);
    expect([...NOT_ACKNOWLEDGED_PO_STATUSES]).toEqual(order.slice(0, cut));
  });

  it('⚠️ KNOWN-GOOD CONTROL — Acknowledged itself is NOT in the set', () => {
    // A set that swallowed its own boundary would read as "nothing is
    // acknowledged" and the tile would be silently pessimistic.
    expect(NOT_ACKNOWLEDGED_PO_STATUSES).not.toContain(POStatus.ACKNOWLEDGED);
    expect(NOT_ACKNOWLEDGED_PO_STATUSES).toContain(POStatus.SENT);
  });
});

describe('AP_OPEN_GROUPS — the lifecycle grouping mirrors the shipped projection', () => {
  // The grouping is stated as data here, so this is the assertion that keeps it
  // honest: each group's members must project to the buyer label the group is
  // named for. Change `toBuyerLabel` and this goes red rather than drifting.
  const asInvoice = (status: string) =>
    ({
      status,
      dueDate: '2099-01-01',
      paymentDate: null,
    }) as never;

  it('the submitted group projects to Pending Match', () => {
    for (const s of AP_OPEN_GROUPS.submitted) {
      expect(toBuyerLabel(asInvoice(s), P), s).toBe('Pending Match');
    }
  });

  it('the approved-awaiting-release group projects to Approved or Payment Released', () => {
    for (const s of AP_OPEN_GROUPS.approvedAwaitingRelease) {
      expect(['Approved', 'Payment Released']).toContain(toBuyerLabel(asInvoice(s), P));
    }
  });

  it('the disputed group projects to Disputed', () => {
    for (const s of AP_OPEN_GROUPS.disputed) {
      expect(toBuyerLabel(asInvoice(s), P), s).toBe('Disputed');
    }
  });

  it('⚠️ the settled and pre-submission states are in NO group', () => {
    const grouped = new Set<string>([
      ...AP_OPEN_GROUPS.submitted,
      ...AP_OPEN_GROUPS.approvedAwaitingRelease,
      ...AP_OPEN_GROUPS.disputed,
    ]);
    for (const settled of ['Draft', 'Payment Released', 'Remittance Received']) {
      expect(grouped.has(settled), settled).toBe(false);
    }
  });
});

describe('the KPI ratios — each re-derived by an independent route', () => {
  it('matchRate counts matchStatus Matched over every invoice the buyer holds', () => {
    const r = matchRate(invoices);
    expect(r.denominator).toBe(invoices.length);
    expect(r.numerator).toBe(invoices.filter((i) => i.matchStatus === 'Matched').length);
    expect(r.pct).toBe(wholePercent(r.numerator, r.denominator));
  });

  it('⚠️ matchRate does NOT count Pending or Pending GR as matched', () => {
    // The mutation probe (c) flips exactly this.
    const notMatched = invoices.filter((i) => i.matchStatus !== 'Matched');
    expect(notMatched.length).toBeGreaterThan(0);
    expect(matchRate(invoices).numerator + notMatched.length).toBe(invoices.length);
  });

  it('rfqResponseRate sums responded and invited supplier ids across RFQs', () => {
    const r = rfqResponseRate(rfqs);
    expect(r.numerator).toBe(
      rfqs.reduce((s, q) => s + q.respondedSupplierIds.length, 0),
    );
    expect(r.denominator).toBe(
      rfqs.reduce((s, q) => s + q.invitedSupplierIds.length, 0),
    );
  });

  it('poAcknowledgedRate counts POs past the not-acknowledged prefix', () => {
    const r = poAcknowledgedRate(pos);
    expect(r.denominator).toBe(pos.length);
    expect(r.numerator).toBe(
      pos.filter((p) => !NOT_ACKNOWLEDGED_PO_STATUSES.includes(p.status)).length,
    );
  });

  it('goodsReceiptVarianceRate counts variance receipts over every receipt', () => {
    const r = goodsReceiptVarianceRate(receipts);
    expect(r.denominator).toBe(receipts.length);
    expect(r.numerator).toBeGreaterThan(0);
    expect(r.numerator).toBeLessThan(r.denominator);
  });

  it('onTimePaymentRate counts paid rows settled on or before their due date', () => {
    const r = onTimePaymentRate(invoices);
    const paid = invoices.filter((i) => i.paymentDate !== null);
    expect(r.denominator).toBe(paid.length);
    expect(r.numerator).toBe(
      paid.filter((i) => (i.paymentDate as string) <= i.dueDate).length,
    );
  });

  it('⚠️ LOW VOLUME — the flag follows the threshold, in BOTH directions', () => {
    // A constructed input on each side, so the rule is probed rather than
    // observed: the shipped corpus sits on one side only.
    const row = (paymentDate: string, dueDate: string) =>
      ({ paymentDate, dueDate }) as BuyerInvoice;
    const below = Array.from({ length: LOW_VOLUME_MIN_DENOMINATOR - 1 }, () =>
      row('2026-01-01', '2026-02-01'),
    );
    const at = Array.from({ length: LOW_VOLUME_MIN_DENOMINATOR }, () =>
      row('2026-01-01', '2026-02-01'),
    );
    expect(onTimePaymentRate(below).lowVolume).toBe(true);
    expect(onTimePaymentRate(at).lowVolume).toBe(false);
  });
});

describe('accountsPayableOpen — sums by lifecycle group', () => {
  it('each group sums the amounts of exactly its own lifecycle states', () => {
    const ap = accountsPayableOpen(invoices);
    const sum = (states: readonly string[]) =>
      invoices
        .filter((i) => states.includes(i.lifecycleState))
        .reduce((s, i) => s + i.amount, 0);
    expect(ap.submitted).toBe(sum(AP_OPEN_GROUPS.submitted));
    expect(ap.approvedAwaitingRelease).toBe(sum(AP_OPEN_GROUPS.approvedAwaitingRelease));
    expect(ap.disputed).toBe(sum(AP_OPEN_GROUPS.disputed));
    expect(ap.total).toBe(ap.submitted + ap.approvedAwaitingRelease + ap.disputed);
  });

  it('⚠️ a settled invoice contributes nothing', () => {
    const settled = invoices.filter((i) => i.lifecycleState === 'Payment Released');
    expect(settled.length).toBeGreaterThan(0);
    const withoutSettled = invoices.filter((i) => i.lifecycleState !== 'Payment Released');
    expect(accountsPayableOpen(withoutSettled).total).toBe(
      accountsPayableOpen(invoices).total,
    );
  });
});

describe('halalCertificateStatus — status only, halal schemes only, at P', () => {
  it('counts the shipped projection over exactly the halal-class rows', () => {
    const s = halalCertificateStatus(COMPLIANCE_REGISTRY, P);
    const halal = COMPLIANCE_REGISTRY.filter((e) => isHalalCertType(e.certType));
    expect(s.total).toBe(halal.length);
    expect(s.valid + s.expiring + s.missing + s.expired).toBe(s.total);
    for (const [key, status] of [
      ['valid', 'Valid'],
      ['expiring', 'Expiring'],
      ['missing', 'Missing'],
      ['expired', 'Expired'],
    ] as const) {
      expect(s[key], key).toBe(
        halal.filter((e) => computeStatus(e, P) === status).length,
      );
    }
  });

  it('⚠️ NON-HALAL SCHEMES ARE EXCLUDED — a named member, reached through a value', () => {
    // The corpus carries BPOM/ISO rows. If the filter were dropped the totals
    // would silently include documents about other things.
    const nonHalal = COMPLIANCE_REGISTRY.filter((e) => !isHalalCertType(e.certType));
    expect(nonHalal.map((e) => e.certType)).toContain('BPOM');
    expect(halalCertificateStatus(COMPLIANCE_REGISTRY, P).total).toBe(
      COMPLIANCE_REGISTRY.length - nonHalal.length,
    );
  });

  it('⚠️ there is no "certified" or "compliant" count — only the four statuses', () => {
    expect(Object.keys(halalCertificateStatus(COMPLIANCE_REGISTRY, P)).sort()).toEqual(
      ['expired', 'expiring', 'missing', 'total', 'valid'],
    );
  });
});

describe('the alert groups — each derived at P, each with its detail', () => {
  it('overdueInvoiceGroup counts overdue rows and reports the worst', () => {
    const g = overdueInvoiceGroup(invoices);
    const overdue = invoices.filter((i) => i.status === 'Overdue');
    expect(g.count).toBe(overdue.length);
    expect(g.maxDaysOverdue).toBe(
      overdue.reduce((m, i) => Math.max(m, i.daysOutstanding), 0),
    );
  });

  it('openDisputeGroup is ONE derivation over both dispute sources', () => {
    const g = openDisputeGroup(invoices, responses);
    expect(g.invoices).toBe(invoices.filter((i) => i.status === 'Disputed').length);
    expect(g.requirementResponses).toBe(
      responses.filter((r) => r.status === 'Disputed').length,
    );
    expect(g.count).toBe(g.invoices + g.requirementResponses);
    expect(g.invoices).toBeGreaterThan(0);
    expect(g.requirementResponses).toBeGreaterThan(0);
  });

  it('obligationGroup reads obligationDisplay at P', () => {
    const g = obligationGroup(obligations, P);
    expect(g.count).toBe(
      obligations.filter((o) => obligationDisplay(o, P) === 'Overdue').length,
    );
    expect(g.upcoming).toBe(
      obligations.filter((o) => obligationDisplay(o, P) === 'Upcoming').length,
    );
  });

  it('contractGroup reads contractDisplayStatus and the renewal horizon at P', () => {
    const g = contractGroup(contracts, P);
    expect(g.count).toBe(
      contracts.filter((c) => contractDisplayStatus(c, P) === 'Expiring').length,
    );
    expect(g.renewalHorizon).toBe(
      contracts.filter((c) => inRenewalHorizon(c, P)).length,
    );
  });

  it('receiptGroup counts receipts needing action and the variance subset', () => {
    const g = receiptGroup(receipts);
    expect(g.count).toBeGreaterThan(0);
    expect(g.variance).toBeGreaterThan(0);
    expect(g.variance).toBeLessThanOrEqual(g.count);
  });
});

describe('obligationsByMonth — buckets over the months present in the data', () => {
  const buckets = obligationsByMonth(obligations, P);

  it('covers every month that has an obligation, and only those', () => {
    const months = new Set(obligations.map((o) => o.dueDate.slice(0, 7)));
    expect(buckets.map((b) => b.month)).toEqual([...months].sort());
  });

  it('the counts sum to the whole corpus', () => {
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(obligations.length);
  });

  it('relation is decided against the declared-present month, never a wall clock', () => {
    const present = P.slice(0, 7);
    for (const b of buckets) {
      const expected =
        b.month < present ? 'past' : b.month === present ? 'present' : 'future';
      expect(b.relation, b.month).toBe(expected);
    }
  });

  it('⚠️ exactly one bucket is the present month, and it is a NAMED month', () => {
    const present = buckets.filter((b) => b.relation === 'present');
    expect(present.map((b) => b.month)).toEqual([P.slice(0, 7)]);
  });
});

describe('monthSpan — what the Phase B placeholders interpolate', () => {
  it('reports the month count and the per-month row range of the dates given', () => {
    const s = monthSpan(invoices.map((i) => i.receivedDate));
    const months = new Set(invoices.map((i) => i.receivedDate.slice(0, 7)));
    expect(s.months).toBe(months.size);
    expect(s.minPerMonth).toBeGreaterThan(0);
    expect(s.maxPerMonth).toBeGreaterThanOrEqual(s.minPerMonth);
  });

  it('an empty input is zero months, not a crash', () => {
    expect(monthSpan([])).toEqual({ months: 0, minPerMonth: 0, maxPerMonth: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE LANE MODEL — the queue's rows, and which seat may act on each.
// ─────────────────────────────────────────────────────────────────────────────

describe('buyerLaneIds — derived from the persona model, never re-listed', () => {
  it('is the buyer persona roles minus the tenancy anchor and the supersets', () => {
    const expected = PERSONA_SYSTEM_ROLES.buyer.filter(
      (r) => !TENANCY_ANCHORS.has(r) && !SUPERSET_ROLES.has(r),
    );
    expect([...buyerLaneIds()]).toEqual([...expected]);
  });

  it('⚠️ KNOWN-GOOD AND KNOWN-BAD, BY NAME', () => {
    expect(buyerLaneIds()).toContain('finance');
    expect(buyerLaneIds()).not.toContain('buyer');
    expect(buyerLaneIds()).not.toContain('buyer_all');
    expect(buyerLaneIds()).not.toContain('commercial');
  });

  it('every seeded buyer seat role is a lane', () => {
    for (const r of SEEDED_SEAT_ROLES.buyer) expect(buyerLaneIds(), r).toContain(r);
  });
});

describe('QUEUE_ROW_ATOMS — each row is assigned to a lane by the atom its page needs', () => {
  it('every representative atom is held by EXACTLY ONE lane, so the mapping is unambiguous', () => {
    for (const [lane, atom] of Object.entries(QUEUE_ROW_ATOMS)) {
      expect(rolesHolding(atom), `${lane} ← ${atom}`).toEqual([lane]);
    }
  });

  it('⚠️ KNOWN-BAD CONTROL — a shared atom would NOT be usable here', () => {
    // `inventorydeclaration:record` is planning's, but the declare/record pair
    // spans two sides; the control that matters is that the test above would
    // fail on any atom more than one lane holds.
    const shared = rolesHolding('pr:approve' as never);
    expect(shared.length).toBeGreaterThan(0);
    for (const atom of Object.values(QUEUE_ROW_ATOMS)) {
      expect(rolesHolding(atom).length, atom).toBe(1);
    }
  });
});

describe('queueRows — one row per lane, counts derived, procurement held', () => {
  const rows = queueRows({
    invoices,
    receipts,
    asns,
    registry: COMPLIANCE_REGISTRY,
    documents,
    responses,
    nowIso: P,
  });

  it('names every lane in QUEUE_ROW_ATOMS and nothing else', () => {
    expect(rows.map((r) => r.lane).sort()).toEqual(Object.keys(QUEUE_ROW_ATOMS).sort());
  });

  it('finance counts overdue then disputed invoices', () => {
    const r = rows.find((x) => x.lane === 'finance');
    expect(r?.counts).toEqual([
      overdueInvoiceGroup(invoices).count,
      openDisputeGroup(invoices, responses).invoices,
    ]);
  });

  it('receiving counts receipts needing action then ASN discrepancies', () => {
    const r = rows.find((x) => x.lane === 'receiving');
    expect(r?.counts).toEqual([
      receiptGroup(receipts).count,
      asns.filter((a) => a.status === 'Discrepancy').length,
    ]);
  });

  it('compliance counts expired-or-expiring halal certs then documents under review', () => {
    const h = halalCertificateStatus(COMPLIANCE_REGISTRY, P);
    const r = rows.find((x) => x.lane === 'compliance');
    expect(r?.counts).toEqual([
      h.expired + h.expiring,
      documents.filter((d) => d.status === 'Under Review').length,
    ]);
  });

  it('planning counts submitted, disputed and draft forecast responses', () => {
    const r = rows.find((x) => x.lane === 'planning');
    expect(r?.counts).toEqual([
      responses.filter((x) => x.status === 'Submitted').length,
      responses.filter((x) => x.status === 'Disputed').length,
      responses.filter((x) => x.status === 'Draft').length,
    ]);
  });

  it('⚠️ PROCUREMENT CARRIES NO COUNT — rule 3, and it is the only held row', () => {
    const held = rows.filter((r) => r.held);
    expect(held.map((r) => r.lane)).toEqual(['procurement']);
    expect(held[0].counts).toBeNull();
  });

  it('every row names a route, and no two rows share one by accident', () => {
    for (const r of rows) expect(r.route.startsWith('/buyer/'), r.lane).toBe(true);
    expect(new Set(rows.map((r) => r.route)).size).toBe(rows.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE ALERTS STRIP — ordered by severity, a zero group OMITTED.
// ─────────────────────────────────────────────────────────────────────────────

describe('alertGroups', () => {
  const input = {
    invoices,
    receipts,
    registry: COMPLIANCE_REGISTRY,
    obligations,
    contracts,
    responses,
    // PSL P4. ⚠️ **READ AT MODULE EVALUATION, AND THE STORE SEEDS EMPTY** —
    // `seedPslListings` is async and a describe body cannot await, so this is
    // `[]` here and the two PSL groups are correctly ABSENT from `groups`
    // below. That is stated rather than quietly relied on: their populated
    // behaviour is covered in `BuyerDashboardPslAlerts.test.tsx`, against the
    // seeded store, by named ids. What this file proves about them is the
    // zero-group rule — an empty population yields no card.
    listings: pslStore.all(),
    nowIso: P,
  };
  const groups = alertGroups(input);

  it('⚠️ A ZERO GROUP IS OMITTED, NOT SHOWN AS 0 — probed on a constructed input', () => {
    // The shipped corpus has every group non-empty, so observing the live data
    // would prove nothing about the omission rule. This drives it to zero.
    const empty = alertGroups({
      ...input,
      invoices: [],
      receipts: [],
      registry: [],
      obligations: [],
      contracts: [],
      responses: [],
    });
    expect(empty).toEqual([]);
    expect(groups.length).toBeGreaterThan(0);
  });

  it('every rendered group has a positive count', () => {
    for (const g of groups) expect(g.count, g.id).toBeGreaterThan(0);
  });

  it('is ordered critical → warning → info', () => {
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    const ranks = groups.map((g) => rank[g.severity]);
    expect([...ranks]).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('every group names a route under /buyer/', () => {
    for (const g of groups) expect(g.route.startsWith('/buyer/'), g.id).toBe(true);
  });

  it('the overdue-invoice and receipt severities come from the SHIPPED ladder', () => {
    const inv = groups.find((g) => g.id === 'overdueInvoices');
    const gr = groups.find((g) => g.id === 'receipts');
    expect(inv?.severity).toBe(invoiceTier(invoices));
    expect(gr?.severity).toBe(grTier(receipts));
  });

  it('⚠️ halal severity FOLLOWS THE DATA — critical only while a cert is expired', () => {
    const halalOnly = COMPLIANCE_REGISTRY.filter((e) => isHalalCertType(e.certType));
    const expired = halalOnly.filter((e) => computeStatus(e, P) === 'Expired');
    expect(expired.length).toBeGreaterThan(0);
    expect(groups.find((g) => g.id === 'halal')?.severity).toBe('critical');

    // Same derivation with the expired rows removed drops it to warning.
    const withoutExpired = COMPLIANCE_REGISTRY.filter(
      (e) => !expired.some((x) => x.id === e.id),
    );
    const softened = alertGroups({ ...input, registry: withoutExpired });
    expect(softened.find((g) => g.id === 'halal')?.severity).toBe('warning');
  });

  it('no group exceeds the vocabulary the layout admits', () => {
    // ⚠️ DERIVED, NOT RESTATED. This read `toBeLessThanOrEqual(6)` against a
    // union of six; P4 added two and the number would have been wrong in
    // exactly the way `FLOOR-IN-PROSE-01` describes. `ALERT_GROUP_IDS` is now
    // the vocabulary and the type comes off it, so this bound cannot go stale.
    expect(groups.length).toBeLessThanOrEqual(ALERT_GROUP_IDS.length);
    // And the anti-vacuity half: the strip is not empty, so the bound is a
    // bound on something.
    expect(groups.length).toBeGreaterThan(0);
    // Every rendered id is a member of the declared vocabulary.
    for (const g of groups) expect(ALERT_GROUP_IDS).toContain(g.id);
  });
});
