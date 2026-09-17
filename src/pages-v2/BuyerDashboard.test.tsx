// ─────────────────────────────────────────────────────────────────────────────
// THE BUYER COMMAND CENTER — the render gate.
//
// ⚠️ **EVERY FIGURE ASSERTED HERE IS RE-DERIVED FROM THE SERVICE IN THIS FILE,
// never typed as a literal.** A pinned "54%" would pass for the wrong reason the
// day a fixture row is added, and would have to be edited by hand — the
// `FLOOR-IN-PROSE-01` shape, inside a render test. So the assertion is always
// *the page says what the derivation says*, which is the property the batch is
// actually claiming.
//
// ⚠️ **AND THE PROBE THAT MAKES IT MEAN SOMETHING IS NOT IN THIS FILE.** These
// assertions pass against the page as written, so on their own they prove only
// that the page renders. What proves they can FAIL is the mutation table in the
// batch report: a literal re-inserted into a value position, `new Date()`
// re-introduced into a dashboard derivation, and the match rate taught to count
// `Pending` as matched are each convicted by a named test here or in
// `dashboard/buyerDashboardDerivations.test.ts`.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import i18n from '../lib/i18n';
import { formatIDR } from '../lib/format';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { IDataService, QueryScope } from '../services/data/types';
import BuyerDashboard from './BuyerDashboard';
import { isLive } from '../services/liveness/registry';
import type { Capability } from '../services/liveness/registry';
import {
  PRESENT_ISO,
  accountsPayableOpen,
  alertGroups,
  goodsReceiptVarianceRate,
  halalCertificateStatus,
  matchRate,
  onTimePaymentRate,
  poAcknowledgedRate,
  queueRows,
  rfqResponseRate,
} from './dashboard/buyerDashboardDerivations';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

/** A service whose every LIST read is empty — the only honest way to reach the
 *  empty state now that the page reads ten buyer corpora rather than two
 *  buyer-only aggregates. The old probe switched persona, which today returns a
 *  SCOPED non-empty read and so stopped testing the empty state at all. */
const emptyService: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get: (target, prop: string) =>
      prop.startsWith('get')
        ? async () => ({ items: [] })
        : (target as unknown as Record<string, unknown>)[prop],
  }),
  risk: new Proxy(mockDataService.risk, {
    get: (target, prop: string) =>
      prop.startsWith('get')
        ? async () => ({ items: [] })
        : (target as unknown as Record<string, unknown>)[prop],
  }),
  collaboration: new Proxy(mockDataService.collaboration, {
    get: (target, prop: string) =>
      prop.startsWith('get')
        ? async () => ({ items: [] })
        : (target as unknown as Record<string, unknown>)[prop],
  }),
};

const SCOPE: QueryScope = { personaType: 'buyer', supplierId: null };
const proc = mockDataService.procurement;

const derived = async () => {
  const invoices = (await proc.getBuyerInvoices(SCOPE)).items;
  const pos = (await proc.getPurchaseOrders(SCOPE)).items;
  const rfqs = (await proc.getRFQs(SCOPE)).items;
  const receipts = (await proc.getGoodsReceipts(SCOPE)).items;
  const asns = (await proc.getASNs(SCOPE)).items;
  const contracts = (await proc.getContracts(SCOPE)).items;
  const obligations = (await proc.getObligations(SCOPE)).items;
  const documents = (await proc.getDocuments(SCOPE)).items;
  const registry = (await mockDataService.risk.getComplianceRegistry(SCOPE)).items;
  const responses = (await mockDataService.collaboration.getOwnRequirementResponses(SCOPE))
    .items;
  return { invoices, pos, rfqs, receipts, asns, contracts, obligations, documents, registry, responses };
};

const seatWith = (roles: readonly string[]): CurrentIdentity => ({
  ...BUYER,
  businessRoles: roles,
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('BuyerDashboard — four honest states', () => {
  it('data: renders the command center once the reads resolve', async () => {
    renderWithProviders(<BuyerDashboard />);
    expect(
      await screen.findByText('Good morning — here is what needs you today'),
    ).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerDashboard />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerDashboard />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: every corpus empty reaches the empty state', async () => {
    renderWithProviders(<BuyerDashboard />, { service: emptyService });
    expect(await screen.findByText('No command-center data')).toBeInTheDocument();
  });
});

describe('⚠️ EVERY FIGURE EQUALS ITS DERIVATION', () => {
  it('the KPI row renders exactly what the derivation module returns', async () => {
    const d = await derived();
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');

    const match = matchRate(d.invoices);
    const rfq = rfqResponseRate(d.rfqs);
    const po = poAcknowledgedRate(d.pos);
    const gr = goodsReceiptVarianceRate(d.receipts);
    const onTime = onTimePaymentRate(d.invoices);
    const ap = accountsPayableOpen(d.invoices);

    expect(screen.getByText(`${match.pct}%`)).toBeInTheDocument();
    expect(
      screen.getByText(`${match.numerator} of ${match.denominator} invoices matched`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `${rfq.numerator} of ${rfq.denominator} invited suppliers answered`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${po.numerator} of ${po.denominator} orders`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${gr.numerator} of ${gr.denominator} receipts`),
    ).toBeInTheDocument();
    expect(screen.getByText(formatIDR(ap.total, { compact: true }))).toBeInTheDocument();

    // ⚠️ THE LOW-VOLUME RULE, ON THE RENDERED PAGE: the shipped corpus sits
    // BELOW the threshold, so the tile must show a count and say why — and must
    // NOT show a percentage.
    expect(onTime.lowVolume).toBe(true);
    expect(
      screen.getByText(`${onTime.numerator} / ${onTime.denominator}`),
    ).toBeInTheDocument();
    expect(screen.getByText('Low volume — shown as a count')).toBeInTheDocument();
  });

  it('every alert card renders its derived count, label and route', async () => {
    const d = await derived();
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');

    const groups = alertGroups({ ...d, nowIso: PRESENT_ISO });
    expect(groups.length).toBeGreaterThan(0);
    expect(
      screen.getByText(`Alerts · ${groups.length} exception groups`),
    ).toBeInTheDocument();

    for (const g of groups) {
      const card = screen.getByTestId(`alert-${g.id}`);
      expect(within(card).getByText(String(g.count)), g.id).toBeInTheDocument();
      // MemoryRouter in tests, HashRouter in the app: assert the ROUTE the link
      // resolves to, which is what both routers agree on.
      expect(card.getAttribute('href'), g.id).toBe(g.route);
    }
  });

  it('⚠️ A ZERO GROUP IS NOT RENDERED — no alert card exists for an absent group', async () => {
    const d = await derived();
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');

    const shown = new Set(alertGroups({ ...d, nowIso: PRESENT_ISO }).map((g) => g.id));
    for (const id of ['overdueInvoices', 'halal', 'obligations', 'receipts', 'disputes', 'contracts']) {
      if (shown.has(id as never)) continue;
      expect(screen.queryByTestId(`alert-${id}`), id).not.toBeInTheDocument();
    }
    // The control that stops the loop above passing over an empty set.
    expect(shown.size).toBeGreaterThan(0);
  });

  it('the halal card reports STATUS counts and never a validity claim', async () => {
    const d = await derived();
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');

    const h = halalCertificateStatus(d.registry, PRESENT_ISO);
    expect(
      screen.getByText(
        `${h.total} certificates on file — status only, never a claim of validity.`,
      ),
    ).toBeInTheDocument();
    for (const word of ['certified', 'compliant', 'verified halal']) {
      expect(screen.queryByText(new RegExp(word, 'i'))).not.toBeInTheDocument();
    }
  });

  it('the obligation chart footer states the derived total and month count', async () => {
    const d = await derived();
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    const months = new Set(d.obligations.map((o) => o.dueDate.slice(0, 7))).size;
    expect(
      screen.getByText(`${d.obligations.length} obligations across ${months} months`),
    ).toBeInTheDocument();
  });

  it('the Phase B placeholders interpolate a derived month count and carry NO control', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    for (const id of ['phase-b-spend', 'phase-b-trend', 'phase-c']) {
      const card = screen.getByTestId(id);
      expect(within(card).queryByRole('button'), id).not.toBeInTheDocument();
      expect(within(card).queryByRole('link'), id).not.toBeInTheDocument();
    }
    expect(screen.getByText(/Today they span \d+ months\./)).toBeInTheDocument();
  });
});

describe('⚠️ THE PAGE MAKES NO CLAIM IT CANNOT BACK', () => {
  it('⚠️ EVERY "Live" ON THE PAGE IS ONE THE REGISTRY GRANTS — and the retired subtitle is gone', async () => {
    // ⚠️ RE-POINTED, NOT LOOSENED. This asserted `queryByText('Live')` is
    // absent, which was true only because the page had no windows. The windows
    // are back by operator direction, and five of them read WIRED command
    // targets — their green pill is the registry's answer, not a claim the page
    // makes. The honest invariant is therefore: as many "Live" pills as there
    // are live capabilities on the page, and not one more.
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');

    // The page-level claim this batch retired stays retired.
    expect(screen.queryByText(/Live operational view/)).not.toBeInTheDocument();

    const onPage: Capability[] = [
      'invoices',
      'rfqs',
      'purchaseOrders',
      'goodsReceipts',
      'advanceShipNotices',
      'inventory',
      'risk',
      'compliance',
    ];
    const liveCount = onPage.filter((c) => isLive(c)).length;
    const sampleCount = onPage.length - liveCount;
    // Non-vacuity: the page really holds BOTH kinds, so neither half of the
    // assertion below is satisfied by an empty set.
    expect(liveCount).toBeGreaterThan(0);
    expect(sampleCount).toBeGreaterThan(0);

    expect(await screen.findAllByText('Live')).toHaveLength(liveCount);
    // `Sample` also names the page-level provenance marker, so the window
    // pills are the remainder above it.
    expect(screen.getAllByText(/^Sample/).length).toBeGreaterThanOrEqual(sampleCount);
  });

  it('states the reading instant and the sample provenance', async () => {
    renderWithProviders(<BuyerDashboard />);
    expect(
      await screen.findByText(/^As of .+ · declared present$/),
    ).toBeInTheDocument();
    // `ProvenanceMarker`'s own token — the page cannot author this text, which
    // is the point: no boolean a caller passes can make it say anything else.
    expect(screen.getAllByText(/Sample/).length).toBeGreaterThan(0);
    expect(screen.getByText('Every figure derived')).toBeInTheDocument();
  });

  it('⚠️ the RETIRED literals are gone', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    for (const gone of ['Rp 14.0B', '75%', '2 lines at risk', 'Today', 'This week', 'This month']) {
      expect(screen.queryByText(gone), gone).not.toBeInTheDocument();
    }
  });
});

describe('⚠️ THE TWO SAMPLE SECTIONS THE OPERATOR KEPT', () => {
  it('the production-line pill equals its derivation, and is not a literal', async () => {
    const lines = (await proc.getProductionLines(SCOPE)).items;
    // "At risk" is every level the page does not paint with the success tone.
    // Derived here by the same rule the page states, not copied from it.
    const atRisk = lines.filter((l) => l.risk !== 'low').length;
    expect(lines.length).toBeGreaterThan(0);
    expect(atRisk).toBeGreaterThan(0);

    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    expect(await screen.findByText(`${atRisk} lines at risk`)).toBeInTheDocument();
    // ⚠️ The retired literal said TWO. Measured against the shipped rows that
    // was wrong under every reading — one line is `high`, three are `high` or
    // `medium` — so this asserts the old number is NOT what renders.
    expect(atRisk).not.toBe(2);
    expect(screen.queryByText('2 lines at risk')).not.toBeInTheDocument();
  });

  it('the supplier-health chart says its scores are illustrative', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    expect(
      await screen.findByText(/Scores are illustrative until a scoring engine exists/),
    ).toBeInTheDocument();
  });

  it('⚠️ NEITHER SECTION OFFERS A CLICK IT CANNOT HONOUR', async () => {
    // No production-line page exists, and a health row carries no supplier id
    // (measured: 0 of 6 names match a supplier master record), so neither may
    // render a link. This asserts the absence where a reader would expect one.
    const lines = (await proc.getProductionLines(SCOPE)).items;
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    for (const l of lines) {
      const cell = await screen.findByText(l.line);
      expect(cell.closest('a'), l.line).toBeNull();
    }
  });
});

describe('⚠️ THE ACTION QUEUE — lanes, filtering and handoff', () => {
  it('renders every lane row with its derived counts and a working Open link', async () => {
    const d = await derived();
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');

    const rows = queueRows({ ...d, nowIso: PRESENT_ISO });
    for (const row of rows) {
      const link = screen.getByTestId(`queue-open-${row.lane}`);
      expect(link.getAttribute('href'), row.lane).toBe(row.route);
      if (row.counts === null) continue;
      expect(screen.getByText(row.counts.join(' · ')), row.lane).toBeInTheDocument();
    }
  });

  it('⚠️ PROCUREMENT SHOWS NO COUNT — rule 3, on the rendered page', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    expect(
      screen.getByText(
        'RFQs awaiting award · unacknowledged POs — held until RFQ and PO dates are anchored',
      ),
    ).toBeInTheDocument();
    // The link still navigates; only the FIGURE is withheld.
    expect(screen.getByTestId('queue-open-procurement').getAttribute('href')).toBe(
      '/buyer/sourcing',
    );
  });

  it('a lane chip filters the queue to that lane, and All lanes restores it', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');

    const all = screen.getAllByTestId(/^queue-open-/).length;
    expect(all).toBeGreaterThan(1);

    fireEvent.click(screen.getByTestId('lane-chip-finance'));
    expect(screen.getAllByTestId(/^queue-open-/)).toHaveLength(1);
    expect(screen.getByTestId('queue-open-finance')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lane-chip-all'));
    expect(screen.getAllByTestId(/^queue-open-/)).toHaveLength(all);
  });

  it('⚠️ A LANE WITH NO ROW SAYS SO — it does not claim there is no work', async () => {
    // Requisitioner is offered as a chip (it is a buyer lane) and has no queue
    // row (the layout defines five). An empty table body would read as "nothing
    // waiting", which is a claim this page has no read to back.
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    fireEvent.click(screen.getByTestId('lane-chip-requisitioner'));
    expect(screen.queryAllByTestId(/^queue-open-/)).toHaveLength(0);
    expect(screen.getByText('This lane has no queue on this page.')).toBeInTheDocument();
    expect(screen.queryByText(/no work waiting/i)).not.toBeInTheDocument();
  });

  it('⚠️ A LANE THE SEAT DOES NOT HOLD RENDERS AS A HANDOFF, under All lanes', async () => {
    renderWithProviders(<BuyerDashboard />, { identity: seatWith(['finance']) });
    await screen.findByText('Good morning — here is what needs you today');

    // The row the seat holds carries no handoff…
    expect(screen.queryByTestId('handoff-finance')).not.toBeInTheDocument();
    // …and every other lane's row does, while still being listed.
    for (const lane of ['receiving', 'compliance', 'planning', 'procurement']) {
      expect(screen.getByTestId(`handoff-${lane}`), lane).toBeInTheDocument();
      expect(screen.getByTestId(`queue-open-${lane}`), lane).toBeInTheDocument();
    }
  });

  it('the seeded buyer seat holds every lane, so no row is a handoff', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    expect(screen.queryAllByTestId(/^handoff-/)).toHaveLength(0);
  });

  it('a receiving-only seat sees its own row un-handed-off', async () => {
    renderWithProviders(<BuyerDashboard />, { identity: seatWith(['receiving']) });
    await screen.findByText('Good morning — here is what needs you today');
    expect(screen.queryByTestId('handoff-receiving')).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-finance')).toBeInTheDocument();
  });

  it('⚠️ THE CHIPS ARE THE SEAT`S LANES — not every lane', async () => {
    // A chip for a lane the seat does not hold would offer a filter on somebody
    // else's work. The ROW is still listed under All lanes, marked as a handoff;
    // that is where the seat learns the work exists and whose it is.
    renderWithProviders(<BuyerDashboard />, { identity: seatWith(['finance']) });
    await screen.findByText('Good morning — here is what needs you today');

    // Scoped by testid: the sidebar carries nav controls with the same words,
    // and a role+name matcher would be asserting about those instead.
    expect(screen.getByTestId('lane-chip-all')).toBeInTheDocument();
    expect(screen.getByTestId('lane-chip-finance')).toBeInTheDocument();
    for (const absent of ['procurement', 'receiving', 'compliance', 'planning', 'requisitioner']) {
      expect(screen.queryByTestId(`lane-chip-${absent}`), absent).not.toBeInTheDocument();
    }
    // …but the rows are all still there, handed off.
    expect(screen.getAllByTestId(/^queue-open-/).length).toBeGreaterThan(1);
    expect(screen.getAllByTestId(/^handoff-/).length).toBe(4);
  });

  it('the seeded seat offers every lane as a chip', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText('Good morning — here is what needs you today');
    for (const lane of ['procurement', 'receiving', 'finance', 'compliance', 'planning', 'requisitioner']) {
      expect(screen.getByTestId(`lane-chip-${lane}`), lane).toBeInTheDocument();
    }
  });
});

describe('⚠️ INDONESIAN — same figures, no English left in the shell', () => {
  it('renders the ID shell with the same derived numbers', async () => {
    const d = await derived();
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDashboard />);
    expect(
      await screen.findByText('Selamat pagi — ini yang memerlukan Anda hari ini'),
    ).toBeInTheDocument();

    const match = matchRate(d.invoices);
    expect(screen.getByText(`${match.pct}%`)).toBeInTheDocument();
    expect(
      screen.getByText(`${match.numerator} dari ${match.denominator} faktur cocok`),
    ).toBeInTheDocument();

    const groups = alertGroups({ ...d, nowIso: PRESENT_ISO });
    expect(
      screen.getByText(`Peringatan · ${groups.length} kelompok pengecualian`),
    ).toBeInTheDocument();

    // The English shell strings must be gone, not merely outnumbered.
    for (const en of [
      'Good morning — here is what needs you today',
      'All lanes',
      'Action queue by lane',
      'Low volume — shown as a count',
    ]) {
      expect(screen.queryByText(en), en).not.toBeInTheDocument();
    }
  });
});
