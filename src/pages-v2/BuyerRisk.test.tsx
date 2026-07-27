import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { isLive } from '../services/liveness';
import BuyerRisk from './BuyerRisk';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerRisk — four honest states', () => {
  it('data: renders the buyer risk intelligence workspace', async () => {
    renderWithProviders(<BuyerRisk />);
    expect(
      await screen.findByText('Supply Risk & Scenario Intelligence'),
    ).toBeInTheDocument();
    // A geopolitical risk row proves the scoped data reads resolved.
    expect(await screen.findByText('Taiwan / China')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerRisk />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(
      screen.queryByText('Supply Risk & Scenario Intelligence'),
    ).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerRisk />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only view)', async () => {
    renderWithProviders(<BuyerRisk />, { identity: SUPPLIER });
    expect(await screen.findByText('No risk intelligence yet')).toBeInTheDocument();
  });
});

// The honesty lock (CP-0 · W2). This prevents the REGRESSION CLASS, not just the
// one instance: while the `risk` capability is SIMULATED, the page must render NO
// hand-rolled live/real-time affordance — only the capability-driven honest marker.
describe('BuyerRisk — honesty: no live affordance while SIMULATED', () => {
  it('registry classifies `risk` as SIMULATED (precondition)', () => {
    expect(isLive('risk')).toBe(false);
  });

  it('renders the honest capability-driven "Sample" marker, never a LIVE/Real-time claim', async () => {
    const { container } = renderWithProviders(<BuyerRisk />);
    await screen.findByText('Supply Risk & Scenario Intelligence');
    // No hand-rolled liveness claim survives anywhere on the page…
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    expect(screen.queryByText(/real-time risk monitoring/i)).not.toBeInTheDocument();
    // …and the pulsing "live" dot and its keyframes are gone.
    expect(container.querySelector('.risk-live-pulse')).toBeNull();
    // The ONLY honesty marker is the SIMULATED-derived pill (green is unreachable).
    expect(screen.getAllByText('Sample').length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// The WHOLE-SURFACE honesty lock (CP-0 · W2 extended).
//
// The page-level lock above proves the CHROME is honest. It does not stop the
// body below the KPI band from being a fabricated live-risk board — and a
// half-honest risk board is worse than a fully-simulated one, because the
// "Sample" pill on the chrome lends borrowed credibility to the invented figures
// beneath it. These tests assert the property for EVERY region, so the honesty is
// structural rather than spot-fixed: while `risk` is SIMULATED, no region of this
// page may render a liveness/freshness claim, and no region may render fabricated
// figures OUTSIDE a capability-derived illustrative enclosure.
// ────────────────────────────────────────────────────────────────────────────

// Every sub-tab, with its own honest caption and a PROBE — a fabricated figure
// or claim unique to that tab. The probe is what makes the lock non-vacuous: the
// page always carries chrome enclosures (alerts + map), so merely counting
// enclosures would pass even if a tab body were rendered bare. Asserting that the
// probe's own ancestor is an enclosure proves THAT tab's fabricated content is
// framed. A sixth tab added without an enclosure fails the moment it is listed.
const TABS = [
  {
    label: 'Geopolitical',
    caption: 'Illustrative geopolitical intelligence — no live feed',
    probe: 'Military exercises intensifying near Taiwan Strait',
  },
  {
    label: 'Supply Exposure',
    caption: 'Illustrative supply-exposure figures — no live feed',
    probe: 'Semiconductors',
  },
  {
    label: 'Scenario Modeling',
    caption: 'Illustrative scenario model — no live feed',
    probe: 'Middle East Conflict Escalation',
  },
  {
    label: 'Compliance Risks',
    caption: 'Illustrative compliance-risk records — no live feed',
    probe: 'Conflict Minerals (3TG)',
  },
  {
    label: 'Commodity Prices',
    caption: 'Illustrative commodity prices — no live feed',
    probe: 'Copper (LME)',
  },
] as const;

// Phrases that assert a live feed or a refresh cadence. None may appear anywhere
// on the page while the capability is SIMULATED. "no live feed" is the honest
// negation used by the region captions, so it is excluded from the `live feed`
// probe by matching only the claiming forms.
const LIVENESS_CLAIMS: RegExp[] = [
  /\bLIVE\b/,
  /real-time/i,
  /live alerts/i,
  /live monitoring/i,
  /last updated/i,
  /hours ago/i,
  /minutes ago/i,
  /just now/i,
];

const bodyText = () => document.body.textContent ?? '';

describe('BuyerRisk — whole-surface honesty while SIMULATED', () => {
  it('every tab body renders inside a capability-derived illustrative enclosure', async () => {
    const { container } = renderWithProviders(<BuyerRisk />);
    await screen.findByText('Supply Risk & Scenario Intelligence');

    for (const { label, caption, probe } of TABS) {
      fireEvent.click(screen.getByRole('tab', { name: label }));

      // The load-bearing assertion: this tab's OWN fabricated content sits inside
      // an enclosure. Render the body bare and the ancestor lookup returns null.
      const probeEl = screen.getAllByText(probe)[0];
      expect(
        probeEl.closest('[data-illustrative-region="risk"]'),
        `${label}: fabricated content "${probe}" renders OUTSIDE an illustrative enclosure`,
      ).not.toBeNull();

      // …and that enclosure states, in words, what it is.
      expect(screen.getByText(caption), `${label}: missing honest caption`).toBeInTheDocument();

      // Three enclosures on every tab: alerts + map (chrome) + the tab body.
      const regions = container.querySelectorAll('[data-illustrative-region="risk"]');
      expect(regions.length, `${label}: expected alerts + map + body enclosures`).toBe(3);

      // Every enclosure hosts the registry-derived marker, never a hand-rolled
      // literal — so the honesty on each region reads the ONE authority.
      for (const r of Array.from(regions)) {
        expect(within(r as HTMLElement).getAllByText('Sample').length).toBeGreaterThan(0);
      }
    }
  });

  it('no region of the page claims liveness or freshness — on any tab', async () => {
    renderWithProviders(<BuyerRisk />);
    await screen.findByText('Supply Risk & Scenario Intelligence');

    for (const { label } of TABS) {
      fireEvent.click(screen.getByRole('tab', { name: label }));
      for (const claim of LIVENESS_CLAIMS) {
        expect(bodyText(), `${label}: "${claim}" survives on the page`).not.toMatch(claim);
      }
    }
  });

  it('the subtitle frames the page as illustrative, not as a live feed', async () => {
    renderWithProviders(<BuyerRisk />);
    expect(
      await screen.findByText(/illustrative scenario intelligence/i),
    ).toBeInTheDocument();
  });

  it('the footer names the real-later capability instead of stamping a refresh time', async () => {
    renderWithProviders(<BuyerRisk />);
    await screen.findByText('Supply Risk & Scenario Intelligence');
    // Honest: the surface declares itself a specification for Stage-2 I3…
    expect(screen.getByText(/specification for supply-risk intelligence/i)).toBeInTheDocument();
    // …and carries no manufactured timestamp (the old `new Date()` footer).
    expect(bodyText()).not.toMatch(/last updated/i);
  });

  it('the KPI band is fabricated-but-labelled: every card carries the illustrative caption', async () => {
    renderWithProviders(<BuyerRisk />);
    await screen.findByText('Supply Risk & Scenario Intelligence');
    // Four KPI cards, four illustrative captions — no unlabeled headline figure.
    expect(screen.getAllByText('Illustrative — no live source')).toHaveLength(4);
  });
});
