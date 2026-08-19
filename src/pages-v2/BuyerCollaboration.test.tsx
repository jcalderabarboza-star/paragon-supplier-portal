import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import BuyerCollaboration from './BuyerCollaboration';
import { isLive } from '../services/liveness';
import i18n from '../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// BuyerCollaboration (SDC-1b) — the P2 consolidation surface, honest-render
// contract.
//
// The grid BODY is virtualized (react-datasheet-grid) and does not lay out rows
// under jsdom's zero-height viewport — per-row cell content (state chips,
// coverage indicator, Σ marker in cells) is covered by BROWSER QA, and the
// underlying derivations by the SDC-1a selector suite (consolidation.test.ts).
// Asserted here is what must hold on the real engine and is jsdom-reliable:
// the registry-derived Sample pill (green unreachable, SOMO-C8 waiting note),
// the read-only honesty banner, the PERIOD-level commitmentClass badges (the
// period owns the class), the plain-DOM chase list + rollup, the Σ coverage
// legend, the DSG height pin, and EN/ID localization.
// ────────────────────────────────────────────────────────────────────────────

describe('BuyerCollaboration — honest render (page-level)', () => {
  it('renders the registry-derived Sample pill with the SOMO C8 waiting note — never Live', () => {
    // precondition: the registry does not green forecastPublications
    // (null backing + HARVEST_GATED 'SOMO C8' — green structurally unreachable)
    expect(isLive('forecastPublications')).toBe(false);

    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });

    expect(screen.getByText(/awaiting SOMO C8 feed/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/)).not.toBeInTheDocument();
  });

  it('⚠ the honesty banner NAMES the one write — it no longer claims read-only end to end', () => {
    // R1b CHANGED THIS TEST, and the change is the point rather than upkeep.
    // Until this batch the page dispatched nothing and the banner said so; the
    // resolve action makes the old sentence FALSE. A banner still promising
    // "nothing here edits, dispatches, or publishes" over a surface that
    // dispatches is an unbacked affordance run backwards — the page under-
    // claiming what it does, which this project treats as the same defect class
    // as over-claiming. The assertion below is deliberately POSITIVE about the
    // exception rather than merely dropping the old string: a banner that named
    // no write at all would pass a weakened test.
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    expect(screen.getByText(/read-only except dispute resolution/i)).toBeInTheDocument();
    expect(screen.getByText(/resolving a supplier dispute/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing else here edits, dispatches, or publishes/i)).toBeInTheDocument();
  });

  it('⚠ AND THE HONESTY MARKER IS HONEST IN BOTH LOCALES — found by ID browser QA', async () => {
    // The EN banner was corrected and the ID one was not. Nothing was red: the
    // page was truthful in English and still promised "hanya-baca / tidak ada
    // yang mengubah" — read-only, nothing edits — to an Indonesian reader,
    // over a surface that now dispatches. An honesty marker translated in one
    // locale only is a false claim in the other, and it took a browser pass in
    // ID to see it, because every spec in this file rendered in EN.
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    expect(screen.getByText(/hanya-baca kecuali penyelesaian sanggahan/i)).toBeInTheDocument();
    expect(screen.getByText(/menyelesaikan sanggahan pemasok/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Tampilan konsolidasi — hanya-baca$/)).not.toBeInTheDocument();
    await i18n.changeLanguage('en');
  });

  it('⚠ CONTROL — the retired absolute claim is GONE, not merely unasserted', () => {
    // Without this, deleting the exception clause from the banner would leave
    // the test above green on the first two matchers and the page would quietly
    // go back to promising read-only.
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    expect(screen.queryByText(/^Consolidation view — read-only$/)).not.toBeInTheDocument();
  });

  it('declares the pinned sample clock on the meta line (never presented as the real clock)', () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    expect(screen.getByText(/sample clock, as of/i)).toBeInTheDocument();
  });
});

describe('BuyerCollaboration — period filter bar (the PERIOD owns the class)', () => {
  it('carries the period-level commitmentClass badges — FIRM reads as a PERIOD lock', () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    const bar = screen.getByTestId('sdc-period-bar');
    // The locked badge is period-scoped text, never per-material.
    expect(bar).toHaveTextContent('2026-08 · FIRM — period locked');
    expect(bar).toHaveTextContent('2026-09 · Semi-firm');
    expect(bar).toHaveTextContent('2026-10 · Visibility only');
  });

  it('offers a filter button per horizon bucket plus all-periods', () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    const bar = screen.getByTestId('sdc-period-bar');
    // 1 × all-periods + 3 × horizon buckets
    expect(bar.querySelectorAll('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /all periods/i })).toBeInTheDocument();
  });
});

describe('BuyerCollaboration — chase list (pre-scheduler manual interim)', () => {
  it('lists the overdue suppliers past the pinned due date and the supplier rollup', async () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    // SDC-4d — the consolidation reads are now async (live buyer-scoped via the
    // service); wait for them to resolve. The NUMBERS stay deterministic under the
    // shared SIMULATED clock (as of 2026-08-25 > dueAt 2026-08-22): the two
    // suppliers with awaiting lines (sup-002 and sup-007, both partial) are
    // OVERDUE; sup-005 answered everything (short + stale still count) — not chased.
    const chase = await screen.findByTestId('sdc-chase');
    await waitFor(() => expect(chase).toHaveTextContent('Responded: 1'));
    expect(chase.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getAllByText(/^Overdue$/)).toHaveLength(2);
    // Rollup: 1 responded (sup-005) · 2 partial (sup-002; sup-007 whose
    // SDC-2b-EXT acknowledgment counts as answered) · 0 silent.
    expect(chase).toHaveTextContent('Partial: 2');
    expect(chase).toHaveTextContent('Silent: 0');
  });

  it('honesty gate — a SUPPLIER persona on the buyer view sees NO chase (buyer-gated)', async () => {
    // The buyer-scoped reads return [] for a supplier scope (SDC-4b), so a
    // supplier can never see the cross-supplier consolidation. The rollup counts
    // stay 0 and the chase list shows its empty state.
    renderWithProviders(<BuyerCollaboration />, {
      route: '/buyer/collaboration',
      identity: SUPPLIER,
    });
    const chase = await screen.findByTestId('sdc-chase');
    await waitFor(() => expect(chase).toHaveTextContent('Responded: 0'));
    expect(chase).toHaveTextContent('Partial: 0');
    expect(chase).toHaveTextContent('Silent: 0');
    expect(chase.querySelectorAll('li')).toHaveLength(0);
    expect(screen.queryByText(/^Overdue$/)).not.toBeInTheDocument();
  });
});

describe('BuyerCollaboration — coverage indicator honesty (Σ, modeled)', () => {
  it('explains the Σ-marked modeled read and the never-fabricated-zero blank', () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    expect(screen.getByText(/modeled per-supplier sufficiency read/i)).toBeInTheDocument();
    expect(screen.getByText(/never a fabricated zero/i)).toBeInTheDocument();
  });
});

describe('BuyerCollaboration — DSG container is height-pinned (anti-trembling)', () => {
  it('the consolidation grid wrapper carries plan-dsg + a fixed --plan-dsg-h', () => {
    const { container } = renderWithProviders(<BuyerCollaboration />, {
      route: '/buyer/collaboration',
    });
    const pinned = container.querySelectorAll('.plan-dsg');
    expect(pinned.length).toBe(1);
    pinned.forEach((el) => {
      expect((el as HTMLElement).style.getPropertyValue('--plan-dsg-h')).toMatch(/^\d+px$/);
    });
  });

  it('exposes the full-screen expand control', () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    expect(screen.getByRole('button', { name: /full screen/i })).toBeInTheDocument();
  });
});

describe('BuyerCollaboration — i18n', () => {
  it('localizes the header to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
      expect(screen.getAllByText(/Kolaborasi Pemasok/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/menunggu feed data C8 SOMO/i)).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
