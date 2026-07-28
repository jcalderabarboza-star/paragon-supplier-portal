import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import SupplierRFQs from './SupplierRFQs';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Valid supplier (sup-007) with no invited RFQs and no quotations → empty.
const nothing: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getRFQs' || prop === 'getQuotations')
        return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('SupplierRFQs — four honest states + wired reads', () => {
  it('data: real quotations drive My-Quotes and prune already-quoted RFQs from Open (Task 3b)', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Open Events')).toBeInTheDocument();
    // sup-007 is invited to the Open RFQ-2026-002 AND already has a real quote on
    // it (qt-002a) — so it is HONESTLY pruned from Open (no longer awaiting a
    // quote) and surfaces in My-Quotes instead. This proves both wired reads.
    expect(screen.queryByText('RFQ-2026-002')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /My Quotes/ }));
    expect(await screen.findByText('RFQ-2026-002')).toBeInTheDocument();
    // Own facts + status only — never a fabricated competitive score/rank (3b-C).
    expect(screen.queryByText(/of 4 quotes/)).not.toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierRFQs />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Open Events')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierRFQs />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no invited RFQs or quotes', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER, service: nothing });
    expect(await screen.findByText('No sourcing events yet')).toBeInTheDocument();
  });
});

// ── CP-0 · W1 · 2e-a — the bid-price gate, at the surface ────────────────────
// The pure refusal contract lives in rfqs/quotationPrice.test.ts and the ranking
// blast radius in rfqs/quotationPriceRanking.test.ts. What these add is the part
// only the DOM can answer: that the supplier is actually TOLD, on the field, and
// that the submit button does not quietly send anyway.
//
// This is only testable at all because ruling 6.2 flipped the field off
// `type="number"` — jsdom implements the number-input sanitization algorithm
// faithfully, so "15.000,50" and "1.500" used to arrive as "" and the refusal
// under test was literally untypeable.
describe('SupplierRFQs — the bid price is read once, and refused out loud', () => {
  const openQuotePanel = async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    // rfq-010 is the one Open RFQ sup-007 is invited to and has not quoted.
    expect(await screen.findByText('RFQ-2026-010')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Submit Quote/i })[0]);
    return screen.getByLabelText('Unit price');
  };

  /** Submit, then assert the governed outcome: nothing minted, panel still open. */
  const expectBlocked = async (before: number) => {
    fireEvent.click(screen.getByRole('button', { name: 'Submit quotation' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit quotation' })).toBeInTheDocument(),
    );
    // The load-bearing assertion: no quotation exists, so nothing entered the
    // ranking. The toast is chrome; this is the fact.
    expect(quotationStore.forRfq('rfq-010')).toHaveLength(before);
  };

  it('an ambiguous price is refused on the field and mints nothing', async () => {
    const price = await openQuotePanel();
    const before = quotationStore.forRfq('rfq-010').length;
    fireEvent.change(price, { target: { value: '1.500' } });

    expect(screen.getByTestId('quote-price-refusal')).toHaveTextContent(
      /can be read two ways/i,
    );
    expect(price).toHaveAttribute('aria-invalid', 'true');
    // The total never renders a product of a price nobody can read.
    expect(screen.queryByText(/180,000/)).not.toBeInTheDocument();

    await expectBlocked(before);
  });

  it('a zero price is refused BY NAME — not as "unreadable", not as "missing"', async () => {
    const price = await openQuotePanel();
    const before = quotationStore.forRfq('rfq-010').length;
    fireEvent.change(price, { target: { value: '0' } });

    expect(screen.getByTestId('quote-price-refusal')).toHaveTextContent(
      /Zero is not a valid price/i,
    );
    await expectBlocked(before);
  });

  it('an untouched blank does not nag, but submitting one mints nothing', async () => {
    const price = await openQuotePanel();
    const before = quotationStore.forRfq('rfq-010').length;
    expect(screen.queryByTestId('quote-price-refusal')).not.toBeInTheDocument();
    expect(price).toHaveAttribute('aria-invalid', 'false');

    await expectBlocked(before);
  });

  it('POSITIVE TWIN — a clean price clears the field refusal and previews the true total', async () => {
    const price = await openQuotePanel();
    fireEvent.change(price, { target: { value: '1.500' } });
    expect(screen.getByTestId('quote-price-refusal')).toBeInTheDocument();

    // The same intent, typed unambiguously.
    fireEvent.change(price, { target: { value: '1500' } });
    expect(screen.queryByTestId('quote-price-refusal')).not.toBeInTheDocument();
    expect(price).toHaveAttribute('aria-invalid', 'false');
    // 1,500 × 120,000 (rfq-010 totalQty) — the honest product, not 1.5 × qty.
    expect(screen.getByText(/180,000,000/)).toBeInTheDocument();
  });

  it('POSITIVE TWIN — a fully-formatted ID price is READ, not eaten', async () => {
    const price = await openQuotePanel();
    // The token the old number field deleted outright before anyone saw it.
    fireEvent.change(price, { target: { value: '15.000,50' } });
    expect(screen.queryByTestId('quote-price-refusal')).not.toBeInTheDocument();
    expect(screen.getByText(/1,800,060,000/)).toBeInTheDocument();
  });
});
