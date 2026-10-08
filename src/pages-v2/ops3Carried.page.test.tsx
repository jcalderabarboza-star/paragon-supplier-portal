// ─────────────────────────────────────────────────────────────────────────────
// OPS-3 — the carried items, as a person sees them.
//
//   · Delivery agreements: the over-tolerance flag renders (buyer card and
//     roll-up row), the supplier is not told a delivered line is overdue.
//     The past-dated draft and the real release are in `BuyerContractDetail.test`.
//   · Sourcing: the supplier side says "event", the wizard's guide sentence has
//     a link and the page it opens selects that guide, and counted nouns on the
//     publication panel agree with their number.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, BUYER_NAMED, SUPPLIER } from '../test/test-utils';
import { schedulingAgreementStore } from '../services/delivery/stores/schedulingAgreementStore';
import i18n from '../lib/i18n';
import { formatDateTime } from '../lib/format';
import BuyerContractDetail from './BuyerContractDetail';
import BuyerDeliveryAgreements from './BuyerDeliveryAgreements';
import SupplierDeliveryAgreements from './SupplierDeliveryAgreements';
import ProcessFlows from './ProcessFlows';
import { countedUnit } from './plan-grid/PublicationPanel';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  schedulingAgreementStore.reset();
  await i18n.changeLanguage('en');
});

/** sa-1006 (ctr-005): 60,000 agreed at 10%. Release everything with line 4 at
 *  25,000 → 70,000 released, 10,000 over the agreed total, past the 66,000 ceiling. */
const pushOverTolerance = () =>
  schedulingAgreementStore.update('sa-1006', (a) => ({
    ...a,
    items: a.items.map((i) => ({
      ...i,
      scheduleLines: i.scheduleLines.map((l) => ({
        ...l,
        state: 'released' as const,
        ...(l.releaseSeq === 4 ? { plannedQty: 25000 } : {}),
      })),
    })),
  }));

const contract = (id: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/contracts/:id" element={<BuyerContractDetail />} />
    </Routes>,
    { route: `/buyer/contracts/${id}`, identity: BUYER_NAMED },
  );

describe('OPS-3 · "Governed — flag over 10%" flags', () => {
  it('within tolerance there is no flag — known-absent, beside the chip that promises one', async () => {
    contract('ctr-005');
    fireEvent.click(await screen.findByRole('tab', { name: /Delivery Agreements/ }));
    expect(await screen.findByText('Governed — flag over 10%')).toBeInTheDocument();
    expect(screen.queryByTestId('delivery-over-tolerance')).not.toBeInTheDocument();
  });

  it('⚠️ released beyond tolerance, the card states it with the quantities', async () => {
    pushOverTolerance();
    contract('ctr-005');
    fireEvent.click(await screen.findByRole('tab', { name: /Delivery Agreements/ }));
    expect(await screen.findByTestId('delivery-over-tolerance')).toHaveTextContent(
      'Over tolerance: 70,000 KG released against 60,000 KG agreed — 10,000 KG over, beyond the 10% tolerance.',
    );
  });

  it('and the roll-up row carries it; no other row does', async () => {
    pushOverTolerance();
    renderWithProviders(<BuyerDeliveryAgreements />);
    expect(await screen.findByTestId('rollup-over-tolerance-sa-1006-10')).toHaveTextContent(
      'Over tolerance by 10,000',
    );
    expect(screen.getAllByTestId(/^rollup-over-tolerance-/)).toHaveLength(1);
  });

  it('in Indonesian the flag is Indonesian', async () => {
    pushOverTolerance();
    await i18n.changeLanguage('id');
    contract('ctr-005');
    fireEvent.click(await screen.findByRole('tab', { name: /Perjanjian Pengiriman|Delivery/ }));
    expect(await screen.findByTestId('delivery-over-tolerance')).toHaveTextContent(
      /Melebihi toleransi: 70\.000 KG dirilis dari 60\.000 KG yang disepakati/,
    );
  });
});

describe('OPS-3 · the supplier is not told a delivered line is overdue', () => {
  it('sup-007 sees ONE overdue line — the missed one — where it saw two', async () => {
    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    const section = await screen.findByTestId('supplier-obligations');
    expect(within(section).getAllByText('Overdue')).toHaveLength(1);
    expect(within(section).getByText('1 overdue · 1 upcoming')).toBeInTheDocument();
  });
});

describe('OPS-3 · Sourcing — the carried copy', () => {
  it('the supplier side says "event" where it means the event, in both languages', () => {
    const en = i18n.getFixedT('en');
    const id = i18n.getFixedT('id');
    expect(en('rfqs.awards.col.rfq')).toBe('Event #');
    expect(en('rfqs.quotes.moqNone')).toBe('Same as event qty');
    expect(en('rfqs.card.decline')).toBe('Decline event');
    expect(en('nav.supplier.rfqs')).toBe('Sourcing events');
    expect(en('widget.rfqRespond.title')).toBe('Sourcing events to respond to');
    expect(id('rfqs.awards.col.rfq')).toBe('No. acara');
    expect(id('rfqs.quotes.moqNone')).toBe('Sama dengan jml acara');
    expect(id('nav.supplier.rfqs')).toBe('Acara sourcing');
    // The STAGE is still an RFQ stage — that name is the stage's, not the event's.
    expect(
      Object.values((i18n.getResourceBundle('en', 'translation') ?? {}) as Record<string, string>).some(
        (v) => typeof v === 'string' && v.includes('This event is at its RFQ stage'),
      ),
    ).toBe(true);
  });

  it('⚠️ no supplier-side string calls the event an RFQ any more — derived over the fragment', async () => {
    const { rfqsEn, rfqsId } = await import('../lib/i18n/rfqs');
    const fragment = { en: rfqsEn, id: rfqsId };
    const offenders = (table: Record<string, string>) =>
      Object.entries(table)
        .filter(([, v]) => /\bRFQs?\b/.test(v) && !/\b(RFQ stage|tahap RFQ)\b/.test(v))
        .map(([k]) => k);
    expect(Object.keys(fragment.en).length).toBeGreaterThan(100);
    expect(offenders(fragment.en)).toEqual([]);
    expect(offenders(fragment.id)).toEqual([]);
  });

  it('⚠️ the panel’s own helper passes the count — "1 supplier line", not "1 supplier lines"', () => {
    // A mutation probe found the copy asserted and the call site not: the
    // helper could pass a fixed count and every spec below still passed.
    const t = i18n.getFixedT('en');
    expect(countedUnit(t, 'supplierLine', 1)).toBe('1 supplier line');
    expect(countedUnit(t, 'supplierLine', 7)).toBe('7 supplier lines');
    expect(countedUnit(t, 'materialPeriod', 1)).toBe('1 material-period');
    expect(countedUnit(t, 'firmAwaits', 1)).toBe('1 firm line awaits a signature');
    expect(countedUnit(t, 'firmAwaits', 1200)).toBe('1,200 firm lines await a signature');
  });

  it('counted nouns on the publication panel agree with their number', () => {
    const t = i18n.getFixedT('en');
    const unit = (kind: string, count: number) =>
      t(`planGrid.publication.unit.${kind}`, { count, n: String(count) });
    expect(unit('supplierLine', 1)).toBe('1 supplier line');
    expect(unit('supplierLine', 2)).toBe('2 supplier lines');
    expect(unit('materialPeriod', 1)).toBe('1 material-period');
    expect(unit('materialPeriod', 0)).toBe('0 material-periods');
    expect(unit('firmAwaits', 1)).toBe('1 firm line awaits a signature');
    expect(unit('firmAwaits', 3)).toBe('3 firm lines await a signature');
    expect(
      t('planGrid.publication.blocker.UNSIGNED_FIRM', { count: 1, n: '1', lines: 'X' }),
    ).toBe('Not yet: 1 firm line awaits procurement’s signature — X');
    expect(
      t('planGrid.publication.blocker.UNSIGNED_FIRM', { count: 2, n: '2', lines: 'X' }),
    ).toBe('Not yet: 2 firm lines await procurement’s signature — X');
    // Indonesian has one form.
    const id = i18n.getFixedT('id');
    expect(id('planGrid.publication.unit.supplierLine', { count: 1, n: '1' })).toBe('1 baris pemasok');
    expect(id('planGrid.publication.unit.materialPeriod', { count: 4, n: '4' })).toBe('4 periode-material');
  });

  it('the guide link the wizard gives opens the page on that guide', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows?flow=rfq' });
    expect(await screen.findByTestId('pf-flow-purpose-rfq')).toBeInTheDocument();
  });

  it('with no flow asked, or an unknown one, the page opens on its first flow as before', async () => {
    const first = renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    const opened = (await screen.findByTestId(/^pf-flow-purpose-/)).getAttribute('data-testid');
    expect(opened).not.toBe('pf-flow-purpose-rfq');
    first.unmount();
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows?flow=no-such-flow' });
    expect((await screen.findByTestId(/^pf-flow-purpose-/)).getAttribute('data-testid')).toBe(opened);
  });
});

describe('OPS-3 · formatDateTime — the time of an act', () => {
  it('renders a moment in Jakarta time and a dash for nothing', () => {
    expect(formatDateTime('2026-10-08T05:37:00.000Z')).toMatch(/^08 Oct 2026, 12:37$/);
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime('not a date')).toBe('—');
  });
});
