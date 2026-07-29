import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import BuyerSourcing from './BuyerSourcing';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Buyer-only aggregate — empty is reached by an empty RFQ result, not a persona.
const noRfqs: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getRFQs') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerSourcing — four honest states', () => {
  it('data: renders the sourcing workspace with wired reads', async () => {
    renderWithProviders(<BuyerSourcing />);
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Ready to Award')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Response')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerSourcing />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Ready to Award')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerSourcing />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no RFQs', async () => {
    renderWithProviders(<BuyerSourcing />, { service: noRfqs });
    expect(await screen.findByText('No sourcing events yet')).toBeInTheDocument();
  });
});

// ── CP-0 · W1 · 2e-b-1a — the buyer is ranking on ESTIMATES, and is told so ──
// The lead time is a REQUIRED ESTIMATE at quote stage: a supplier cannot firmly
// commit before final quantity, PO date and capacity are known, so forcing
// "firm" would buy false precision. It is still scored and still ranked on —
// the tag exists so the buyer does not read it as firmer than it is. The firm
// date is confirmed at PO (a separate arc).
//
// The tag reuses the existing honest-marker grammar on ComparisonRow rather
// than inventing a rival one; "Simulated" (no live source) and "Estimated"
// (real data, indicative at this stage) are DIFFERENT qualifiers sharing it.
describe('BuyerSourcing — the lead-time axis is labelled an estimate', () => {
  const openComparison = async () => {
    renderWithProviders(<BuyerSourcing />);
    // rfq-011 is the neutral award fixture — two quotes separable only on lead
    // time, so the comparison drawer is where the label matters most.
    fireEvent.click(await screen.findByText('RFQ-2026-011'));
    return screen.findByText(/QUOTE COMPARISON/i);
  };

  it('POSITIVE TWIN — the lead-time value is still shown, and still scored', async () => {
    await openComparison();
    // The label does not hide the number or the score; qt-011a promises 4 days.
    expect(screen.getByText(/4 days/)).toBeInTheDocument();
    expect(screen.getByText('Lead Time Score')).toBeInTheDocument();
  });

  it('tags BOTH lead-time rows Estimated — the value and the score it drives', async () => {
    await openComparison();
    // Two rows carry it: the raw promise and the axis derived from it. A score
    // presented bare would be the firmer-looking of the two.
    expect(screen.getAllByText('Estimated')).toHaveLength(2);
  });

  it('explains the tag on hover — indicative now, firm at PO, still ranked on', async () => {
    await openComparison();
    const [tag] = screen.getAllByText('Estimated');
    expect(tag).toHaveAttribute(
      'title',
      expect.stringMatching(/confirms a firm delivery date at PO/i),
    );
    // And says plainly that labelling did not weaken the math.
    expect(tag.getAttribute('title')).toMatch(/Still scored and ranked on/i);
  });

  it('does NOT tag price — an offered price IS a commitment, and must not read as soft', async () => {
    await openComparison();
    // The negation that gives the tag meaning: if everything were "Estimated",
    // nothing would be.
    expect(screen.getByText('Unit Price')).toBeInTheDocument();
    expect(screen.getAllByText('Estimated')).toHaveLength(2); // not 3, not 5
  });
});

// ── CP-0 · W1 · 2e-b-2 — the buyer can finally SEE the supplier's minimum ────
// FIND-02's consequence on this surface: the quote form collected a minimum
// order quantity and dropped it before the payload, so the comparison a buyer
// awards from could not show it at all. Where a supplier's minimum EXCEEDS the
// RFQ quantity that is a real constraint on the bid — a buyer without it can
// award a quote that cannot be ordered at the quantity being sourced.
//
// Display only this batch, by dispatch. Whether a minimum above the RFQ
// quantity should warn, flag or block the award is MOQ-FIND-01.
describe('BuyerSourcing — the minimum order quantity reaches the comparison', () => {
  beforeEach(() => {
    quotationStore.reset();
    rfqStore.reset();
  });

  const openComparison = async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-011'));
    return screen.findByText(/QUOTE COMPARISON/i);
  };

  it('THE LOCK — a minimum submitted through the real spine lands in the comparison', async () => {
    // The whole chain, end to end: the dispatcher + store the supplier's submit
    // goes through, then the buyer surface reading it back. A value preserved in
    // the payload but invisible here would still be a dropped constraint.
    await new MockCommandService().dispatch(
      { personaType: 'supplier', supplierId: 'sup-007' },
      {
        transitionId: 't_quotation_submit',
        entity: 'quotation',
        payload: {
          rfqId: 'rfq-011',
          supplierId: 'sup-007',
          unitPrice: 14_000,
          leadTimeDays: 6,
          moq: 100_000,
          validUntil: '2026-06-30',
        },
      },
    );
    await openComparison();

    expect(screen.getByText('Min. Order Qty')).toBeInTheDocument();
    // 100,000 PCS against an RFQ for 80,000 — the case JJ named: a minimum that
    // EXCEEDS what is being sourced. Shown as a fact, with no verdict attached.
    expect(screen.getByText(/100\.000 PCS/)).toBeInTheDocument();
  });

  it('a quote with no stated minimum reads as an ANSWER, not as missing data', async () => {
    // qt-011a (the incumbent) states none, like every quote minted before this
    // batch. The cell says so in words — never a dash, and never a 0, which
    // would be a commercial term nobody offered.
    await openComparison();
    expect(screen.getByText('No minimum stated')).toBeInTheDocument();
    expect(screen.queryByText(/^0 PCS$/)).not.toBeInTheDocument();
  });

  it('the row carries NO honest-marker tag — this is stated supplier fact', async () => {
    // The negation that keeps the tag vocabulary meaningful: "Estimated" belongs
    // to the lead time (indicative until PO) and "Simulated" to the axes with no
    // live source. A minimum order quantity is neither — the supplier typed it.
    await openComparison();
    expect(screen.getAllByText('Estimated')).toHaveLength(2); // lead time + its score
  });
});
