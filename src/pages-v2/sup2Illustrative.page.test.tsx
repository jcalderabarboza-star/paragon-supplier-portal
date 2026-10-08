// ────────────────────────────────────────────────────────────────────────────
// SUP-2 · "ILLUSTRATIVE — NOT MEASURED", AND THE SMALL TRUTH FIXES.
//
// The review found pages whose figures nothing backs, and a supplier briefing
// that printed one fixed order to every supplier. The ruling: say so with a
// banner and a marker beside each figure, patch no figure, and build the
// briefing from the supplier's own orders.
//
// Held here, in both languages where a reader meets words:
//   1. the banner and the per-figure markers on the five pages;
//   2. the Analytics period chips change no figure, and the page says so;
//   3. the Risk row whose date has passed no longer reads "Valid";
//   4. the briefing names the reader's own order, or no order at all;
//   5. the channel demo's outcome is labelled as a script;
//   6. two sentences that were false are no longer said.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { POStatus } from '../services/data/types';
import { formatDate, formatIDR } from '../lib/format';
import i18n from '../lib/i18n';
import BuyerAnalytics from './BuyerAnalytics';
import BuyerScorecard from './BuyerScorecard';
import BuyerRisk from './BuyerRisk';
import BuyerDashboard from './BuyerDashboard';
import SupplierPerformance from './SupplierPerformance';
import SupplierMyStorefront from './SupplierMyStorefront';
import SupplierDashboard from './SupplierDashboard';
import SupplierWhatsApp from './SupplierWhatsApp';

const LOCALES = ['en', 'id'] as const;
const MARK = 'illustrative-mark';
const tr = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as string;

beforeEach(async () => {
  purchaseOrderStore.reset();
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

/** The five pages the ruling names, each with its own second sentence. */
const PAGES: ReadonlyArray<{
  name: string;
  ui: React.ReactElement;
  identity: CurrentIdentity;
  bodyKey: string;
}> = [
  { name: 'Analytics', ui: <BuyerAnalytics />, identity: BUYER, bodyKey: 'buyerAnalytics.illustrative.body' },
  { name: 'Scorecard', ui: <BuyerScorecard />, identity: BUYER, bodyKey: 'buyerScorecard.illustrative.body' },
  { name: 'Risk', ui: <BuyerRisk />, identity: BUYER, bodyKey: 'risk.illustrative.body' },
  {
    name: 'Supplier performance',
    ui: <SupplierPerformance />,
    identity: SUPPLIER,
    bodyKey: 'supplierPerformance.illustrative.body',
  },
  {
    name: 'My Storefront',
    ui: <SupplierMyStorefront />,
    identity: SUPPLIER,
    bodyKey: 'supplierMyStorefront.illustrative.body',
  },
];

describe('SUP-2 · the copy exists in both languages and differs', () => {
  const keys = [
    'illustrative.banner.title',
    'illustrative.mark',
    'illustrative.mark.title',
    'buyerAnalytics.period.note',
    'supplierWhatsApp.demo.scripted',
    'buyerDashboard.header.derived',
    'roles.page.createOk',
    ...PAGES.map((p) => p.bodyKey),
  ];
  it.each(keys)('%s', (key) => {
    const en = i18n.getFixedT('en')(key, { id: 'x' });
    const id = i18n.getFixedT('id')(key, { id: 'x' });
    expect(en).not.toBe(key);
    expect(id).not.toBe(key);
    expect(en).not.toBe(id);
  });
  it('the banner title says the two things the ruling asked for', () => {
    expect(i18n.getFixedT('en')('illustrative.banner.title')).toBe('Illustrative — not measured.');
  });
});

describe.each(LOCALES)('SUP-2 · the banner, in %s', (lng) => {
  it.each(PAGES)('$name carries it, with its own sentence', async ({ ui, identity, bodyKey }) => {
    await i18n.changeLanguage(lng);
    renderWithProviders(ui, { identity });
    const banner = await screen.findByTestId('illustrative-banner');
    expect(banner).toHaveTextContent(tr('illustrative.banner.title'));
    expect(banner).toHaveTextContent(tr(bodyKey));
    // Risk marks its figures with its own older line (`risk.kpi.illustrative`)
    // and region frames, so it carries the banner and none of these.
    for (const mark of screen.queryAllByTestId(MARK)) expect(mark).toHaveTextContent(tr('illustrative.mark'));
  });
});

describe('SUP-2 · a marker beside each figure', () => {
  const unmarked = (headings: HTMLElement[]) =>
    headings.filter((h) => within(h).queryByTestId(MARK) === null).map((h) => h.textContent);

  it('Analytics — every summary tile and every section', async () => {
    renderWithProviders(<BuyerAnalytics />);
    await screen.findByTestId('illustrative-banner');
    const main = document.querySelector('main')!;
    const sections = [...main.querySelectorAll('h2')] as HTMLElement[];
    expect(sections.length).toBeGreaterThan(3);
    expect(unmarked(sections)).toEqual([]);
    // The four tiles: the marks outside any heading.
    const inTiles = screen.getAllByTestId(MARK).filter((m) => m.closest('h2') === null);
    expect(inTiles).toHaveLength(4);
  });

  it('Scorecard — the grade and score, and every section', async () => {
    renderWithProviders(<BuyerScorecard />);
    await screen.findByTestId('illustrative-banner');
    const sections = [...document.querySelector('main')!.querySelectorAll('h2')] as HTMLElement[];
    expect(sections.length).toBeGreaterThan(3);
    expect(unmarked(sections)).toEqual([]);
    const scores = screen.getAllByText(/^\d+\/100$/);
    expect(scores.filter((e) => within(e.parentElement!).queryByTestId(MARK) !== null)).toHaveLength(1);
  });

  it("Supplier performance — the supplier's own grade and score, and the authored sections", async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    await screen.findByTestId('illustrative-banner');
    const score = screen.getAllByText(/^\d+\/100$/)[0];
    expect(within(score.parentElement!).getByTestId(MARK)).toBeInTheDocument();
    // Two sections are DERIVED and stay unmarked: the preferred-supplier
    // listings, and the count of this supplier's own orders. A marker there
    // would call a real figure illustrative.
    const sections = [...document.querySelector('main')!.querySelectorAll('h2')] as HTMLElement[];
    const plain = unmarked(sections);
    expect(plain).toHaveLength(2);
    expect(plain).toContain(tr('psl.supplier.title'));
    expect(sections.length - plain.length).toBeGreaterThan(2);
  });

  it('My Storefront — the four statistics and the completeness figure', async () => {
    renderWithProviders(<SupplierMyStorefront />, { identity: SUPPLIER });
    await screen.findByTestId('illustrative-banner');
    for (const key of ['profileViews', 'rfqInvitations', 'winRate', 'categoryRank']) {
      const tile = screen.getByText(tr(`supplierMyStorefront.stat.${key}`)).parentElement!;
      expect(within(tile).getByTestId(MARK), key).toBeInTheDocument();
    }
    expect(screen.getAllByTestId(MARK)).toHaveLength(5);
  });

  it("the supplier's dashboard — the grade and score card", async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    const grade = await screen.findByText(tr('supplierDashboard.identity.grade'));
    expect(within(grade.parentElement!).getByTestId(MARK)).toBeInTheDocument();
    const target = screen.getByText(tr('supplierDashboard.identity.target'));
    expect(within(target.parentElement!).getByTestId(MARK)).toBeInTheDocument();
    // And the OTIF tile: the same authored figure, shown a second time.
    const otif = screen.getByText(tr('supplierDashboard.kpi.otif.subtitle'), { exact: false });
    expect(within(otif).getByTestId(MARK)).toBeInTheDocument();
    expect(screen.getAllByTestId(MARK)).toHaveLength(3);
  });
});

describe('SUP-2 · the Analytics period chips', () => {
  it.each(LOCALES)('[%s] the page says they change the label only', async (lng) => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<BuyerAnalytics />);
    expect(await screen.findByTestId('analytics-period-note')).toHaveTextContent(
      tr('buyerAnalytics.period.note'),
    );
  });

  it('and that is true: choosing another period moves no figure', async () => {
    renderWithProviders(<BuyerAnalytics />);
    await screen.findByTestId('analytics-period-note');
    const figures = () =>
      [...document.querySelector('main')!.querySelectorAll('table td, [data-testid="illustrative-mark"]')]
        .map((e) => e.parentElement!.textContent)
        .join('|');
    const tiles = () =>
      screen
        .getAllByTestId(MARK)
        .filter((m) => m.closest('h2') === null)
        .map((m) => m.closest('div[class*="rounded"]')?.textContent);
    const before = { figures: figures(), tiles: tiles() };
    expect(before.figures.length).toBeGreaterThan(200);
    fireEvent.click(screen.getByRole('radio', { name: tr('buyerAnalytics.period.30d') }));
    await waitFor(() =>
      expect(document.querySelector('main')!.textContent).toContain(tr('buyerAnalytics.period.30d')),
    );
    expect({ figures: figures(), tiles: tiles() }).toEqual(before);
  });
});

describe('SUP-2 · Risk — a date that has passed is not "Valid"', () => {
  it('no row reads overdue beside Valid or "no action"', async () => {
    renderWithProviders(<BuyerRisk />);
    await screen.findByTestId('illustrative-banner');
    fireEvent.click(screen.getByText(tr('risk.tab.compliance')));
    const overdue = await waitFor(() => {
      const rows = [...document.querySelectorAll('main tr')].filter((r) =>
        /\d+d overdue/.test(r.textContent ?? ''),
      );
      expect(rows.length).toBeGreaterThan(0);
      return rows;
    });
    for (const row of overdue) {
      expect(row.textContent).toContain('Expired');
      expect(row.textContent).not.toContain('Valid');
      expect(row.textContent).not.toContain(tr('risk.compliance.noAction'));
    }
    // A row whose date is ahead keeps the status it stores.
    const ahead = [...document.querySelectorAll('main tr')].filter((r) => /Valid/.test(r.textContent ?? ''));
    expect(ahead.length).toBeGreaterThan(0);
    for (const row of ahead) expect(row.textContent).not.toMatch(/overdue/);
  });
});

describe("SUP-2 · the supplier briefing is built from the reader's own orders", () => {
  const seat = (supplierId: string): CurrentIdentity => ({ ...SUPPLIER, supplierId, supplierName: supplierId });
  const awaiting = (supplierId: string) =>
    purchaseOrderStore
      .all()
      .filter(
        (po) =>
          po.supplierId === supplierId &&
          (po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED),
      );
  const suppliers = () => [...new Set(purchaseOrderStore.all().map((po) => po.supplierId))];
  const briefing = async () => {
    const title = await screen.findByText(tr('supplierDashboard.briefing.title'));
    return title.closest('section')!;
  };

  it('CONTROL — the corpus has a supplier with an order to confirm, and one with none', () => {
    expect(suppliers().filter((s) => awaiting(s).length > 0).length).toBeGreaterThan(0);
    expect(suppliers().filter((s) => awaiting(s).length === 0).length).toBeGreaterThan(0);
    // The order the page used to print to everybody belongs to one supplier.
    const fixed = purchaseOrderStore.all().filter((po) => po.poNumber === 'PO-2025-00108');
    expect(fixed).toHaveLength(1);
  });

  it.each(LOCALES)('[%s] it names the first of their own, with its value and date', async (lng) => {
    await i18n.changeLanguage(lng);
    for (const supplierId of suppliers().filter((s) => awaiting(s).length > 0)) {
      const own = awaiting(supplierId);
      const view = renderWithProviders(<SupplierDashboard />, { identity: seat(supplierId) });
      const text = (await briefing()).textContent!;
      expect(text, supplierId).toContain(
        tr(
          own.length === 1
            ? 'supplierDashboard.briefing.po.title.one'
            : 'supplierDashboard.briefing.po.title.other',
          { count: own.length },
        ),
      );
      expect(text, supplierId).toContain(own[0].poNumber);
      expect(text, supplierId).toContain(formatIDR(own[0].totalValue, { compact: true }));
      expect(text, supplierId).toContain(formatDate(own[0].requestedDeliveryDate));
      // No other supplier's order number, and no invented lateness.
      for (const po of purchaseOrderStore.all().filter((p) => p.supplierId !== supplierId)) {
        expect(text, `${supplierId} sees ${po.poNumber}`).not.toContain(po.poNumber);
      }
      expect(text).not.toMatch(/overdue 96h|Rp 185jT/);
      view.unmount();
    }
  });

  it('a supplier with nothing to confirm is shown no order to confirm', async () => {
    const none = suppliers().filter((s) => awaiting(s).length === 0);
    for (const supplierId of none) {
      const view = renderWithProviders(<SupplierDashboard />, { identity: seat(supplierId) });
      const text = (await briefing()).textContent!;
      expect(text, supplierId).not.toContain(tr('supplierDashboard.briefing.po.cta'));
      expect(text, supplierId).not.toContain('PO-2025-00108');
      view.unmount();
    }
  });
});

describe('SUP-2 · the channel demo says its outcome is a script', () => {
  it.each(LOCALES)('[%s] the label comes first, the scripted line after', async (lng) => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByText(tr('supplierWhatsApp.tab.email')));
    expect(screen.queryByTestId('channel-demo-outcome')).toBeNull();
    const act = (await screen.findAllByRole('button')).find((b) =>
      /confirm/i.test(b.textContent ?? ''),
    )!;
    fireEvent.click(act);
    const outcome = await screen.findByTestId('channel-demo-outcome');
    expect(outcome.firstElementChild).toHaveTextContent(tr('supplierWhatsApp.demo.scripted'));
    expect(outcome.textContent!.length).toBeGreaterThan(tr('supplierWhatsApp.demo.scripted').length);
  });
});

describe('SUP-2 · two sentences that were false', () => {
  it('the buyer dashboard no longer says every figure is derived', async () => {
    renderWithProviders(<BuyerDashboard />);
    expect(await screen.findByText(tr('buyerDashboard.header.derived'))).toBeInTheDocument();
    expect(screen.queryByText('Every figure derived')).toBeNull();
    expect(tr('buyerDashboard.header.derived')).toMatch(/except the panels marked illustrative/);
    // The exception it names exists on the page.
    expect(document.querySelectorAll('[data-illustrative-region]').length).toBeGreaterThan(0);
  });

  it('a created role is said to be saved in this browser, in both languages', () => {
    expect(i18n.getFixedT('en')('roles.page.createOk', { id: 'x' })).toMatch(/saved in this browser/);
    expect(i18n.getFixedT('en')('roles.page.createOk', { id: 'x' })).not.toMatch(/gone on reload/);
    expect(i18n.getFixedT('id')('roles.page.createOk', { id: 'x' })).toMatch(/tersimpan di peramban ini/);
    expect(i18n.getFixedT('id')('roles.page.createOk', { id: 'x' })).not.toMatch(/hilang saat dimuat ulang/);
  });
});
