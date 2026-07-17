import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
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

  it('renders the read-only honesty banner (nothing edits, dispatches, or publishes)', () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    expect(screen.getByText(/Consolidation view — read-only/i)).toBeInTheDocument();
    expect(
      screen.getByText(/nothing here edits, dispatches, or publishes/i),
    ).toBeInTheDocument();
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
  it('lists the overdue suppliers past the pinned due date and the supplier rollup', () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration' });
    const chase = screen.getByTestId('sdc-chase');
    // As of 2026-08-25 (> dueAt 2026-08-22) the two suppliers with awaiting
    // lines (sup-002 partial, sup-007 silent) are both OVERDUE; sup-005
    // answered everything (short + stale still count as answered) — not chased.
    expect(chase.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getAllByText(/^Overdue$/)).toHaveLength(2);
    // Rollup: 1 responded (sup-005) · 1 partial (sup-002) · 1 silent (sup-007).
    expect(chase).toHaveTextContent('Responded: 1');
    expect(chase).toHaveTextContent('Partial: 1');
    expect(chase).toHaveTextContent('Silent: 1');
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
