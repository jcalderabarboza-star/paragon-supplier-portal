import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';
import ProvenanceMarker from './ProvenanceMarker';
import {
  dispatchesCommands,
  feedProvenance,
  isLive,
} from '../../services/liveness';

// ProvenanceMarker is the TWO-AXIS marker for the partly-real routes (D-CENSUS-8).
// Same structural lock as LivenessPill — the only input is `capability`, so
// neither axis can be asserted by a caller — plus one extra guarantee this
// component alone carries: it must NEVER render green, because the feed is
// fixture even where the verb is real.
const renderMarker = (node: React.ReactNode) =>
  render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);

describe('ProvenanceMarker — two axes, neither caller-supplied', () => {
  it('a partly-real capability renders BOTH axes', () => {
    // Guard the premise: purchaseOrders dispatches (wired) over a fixture feed.
    expect(dispatchesCommands('purchaseOrders')).toBe(true);
    expect(feedProvenance('purchaseOrders')).toBe('FIXTURE');

    renderMarker(<ProvenanceMarker capability="purchaseOrders" />);
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(
      screen.getByText('Commands dispatch — in-memory ledger'),
    ).toBeInTheDocument();
  });

  it('refuses green even where the REGISTRY says green — the feed axis overrules', () => {
    // The load-bearing rule, and the sharpest statement of what this batch found.
    //
    // `isLive('purchaseOrders')` is TRUE today: the target is wired (gate-1) and
    // nobody ever gave it a harvest gate (gate-2), so the registry authorises a
    // green "Live" — over `mockPurchaseOrders`, a frozen fixture array. That is
    // LIVENESS-GATE-ASYMMETRY-01: five capabilities (purchaseOrders,
    // advanceShipNotices, goodsReceipts, invoices, rfqs) are wired-and-ungated and
    // render green, while inventory / purchaseRequisitions / forecastPublications
    // read equally-synthetic stores and ARE gated. The operator ruled that
    // asymmetry report-only for this batch — so it stays true, and is asserted
    // here rather than quietly worked around.
    expect(isLive('purchaseOrders')).toBe(true);
    // ProvenanceMarker does not read `isLive` at all. It reads the FEED, which is
    // FIXTURE, and therefore cannot emit a success token no matter what gate-2
    // failed to say. When the asymmetry is fixed, this test keeps passing; if
    // someone "simplifies" the marker onto isLive, it fails — which is the guard.
    expect(feedProvenance('purchaseOrders')).toBe('FIXTURE');
    const { container } = renderMarker(
      <ProvenanceMarker capability="purchaseOrders" />,
    );
    expect(container.querySelector('.text-success')).toBeNull();
    expect(container.querySelector('.bg-success')).toBeNull();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('a verbless capability renders the feed axis ONLY', () => {
    // The eight D-CENSUS-8 domains are null-backed: a supplier-master page has no
    // verbs, so it must not display a "commands dispatch" claim it cannot honour.
    expect(dispatchesCommands('suppliers')).toBe(false);
    renderMarker(<ProvenanceMarker capability="suppliers" />);
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(
      screen.queryByText('Commands dispatch — in-memory ledger'),
    ).not.toBeInTheDocument();
  });

  it('a harvest-gated capability keeps its SPECIFIC waiting-state on the feed axis', () => {
    // I3.3 established one authority for that text; the second axis must not
    // flatten it back to a generic "Sample".
    renderMarker(<ProvenanceMarker capability="purchaseRequisitions" />);
    expect(
      screen.getByText('Sample — awaiting live PR producer (SOMO / Grid)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Commands dispatch — in-memory ledger'),
    ).toBeInTheDocument();
  });
});
