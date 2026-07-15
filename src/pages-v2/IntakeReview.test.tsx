import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import IntakeReview from './IntakeReview';
import { isLive } from '../services/liveness';
import { purchaseRequisitionStore } from '../services/data/mock/stores/purchaseRequisitionStore';
import i18n from '../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// IntakeReview (Phase A/1) — the recommend-first TRIAGE surface, plain DOM.
//
// The FORK-C=(c2) guarantees are asserted here at page level:
//  · honest render — the registry-derived SIMULATED pill; green unreachable.
//  · the seam read — rows arrive via getPrIntake (both producers), each carrying
//    the FORK-D `deficit` rationale (the "why" the triage is FOR).
//  · accept-as-suggested ROUTES to the EXISTING push — the same t_pr_create the
//    plan-grid drawer dispatches — and the commit shows the store-assigned PR
//    number while the tier stays SIMULATED.
//  · dismiss is EPHEMERAL and honestly labeled "not persisted": the row never
//    leaves the document, and Restore brings its actions straight back.
// ────────────────────────────────────────────────────────────────────────────

beforeEach(() => purchaseRequisitionStore.reset());

const renderPage = () =>
  renderWithProviders(<IntakeReview />, { route: '/buyer/intake-review' });

describe('IntakeReview — honest render (SIMULATED × PLANNED, green unreachable)', () => {
  it('renders the SIMULATED page pill from the registry — never Live', async () => {
    expect(isLive('purchaseRequisitions')).toBe(false);
    renderPage();
    expect(await screen.findByText(/awaiting live PR producer/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/)).not.toBeInTheDocument();
  });

  it('renders the recommend-first honesty banner — push simulated, dismiss not persisted', async () => {
    renderPage();
    expect(screen.getByText(/Recommend-first triage/i)).toBeInTheDocument();
    expect(screen.getByText(/never a live procurement instruction/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing is persisted or rejected upstream/i)).toBeInTheDocument();
    await screen.findByText(/Glycerin USP/); // flush the seam read (act hygiene)
  });
});

describe('IntakeReview — consumes the getPrIntake seam (C7 §2, two producers)', () => {
  it('renders the inbound set from BOTH producers with the deficit rationale', async () => {
    renderPage();
    // SOMO line + its recommend-first "why"
    expect(await screen.findByText(/Glycerin USP/)).toBeInTheDocument();
    expect(
      screen.getByText(/Projected net requirement below safety stock/i),
    ).toBeInTheDocument();
    // internal-Grid line + its "why"
    expect(screen.getByText(/PET Bottle 200ml/)).toBeInTheDocument();
    expect(
      screen.getByText(/Packaging plan shortfall for the Make Over launch run/i),
    ).toBeInTheDocument();
  });
});

describe('IntakeReview — accept-as-suggested routes to the EXISTING push (one mutation path)', () => {
  it('accepting a line commits ONE Draft PR with its store-assigned number; tier stays SIMULATED', async () => {
    renderPage();
    await screen.findByText(/Glycerin USP/);

    fireEvent.click(
      screen.getByRole('button', { name: /Accept as suggested — Glycerin USP/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Pushed → PR-2026-9\d+/)).toBeInTheDocument(),
    );
    // The accepted row flips to committed; the source tier remains SIMULATED.
    expect(screen.getByText(/^Committed$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
    // Its triage actions are spent — no second accept for the same line.
    expect(
      screen.queryByRole('button', { name: /Accept as suggested — Glycerin USP/i }),
    ).not.toBeInTheDocument();
  });
});

describe('IntakeReview — dismiss is EPHEMERAL, honestly labeled, restorable', () => {
  it('dismissing shows the "not persisted" label; the row never leaves the document', async () => {
    renderPage();
    await screen.findByText(/PET Bottle 200ml/);

    fireEvent.click(screen.getByRole('button', { name: /Dismiss PET Bottle 200ml/i }));

    // Honest label — session-only, cannot read as a committed rejection.
    expect(
      screen.getByText(/Dismissed — this session only · not persisted/i),
    ).toBeInTheDocument();
    // The row is set aside, not removed — the seam was never touched.
    expect(screen.getByText(/PET Bottle 200ml/)).toBeInTheDocument();
    // Accept is withdrawn while dismissed.
    expect(
      screen.queryByRole('button', { name: /Accept as suggested — PET Bottle 200ml/i }),
    ).not.toBeInTheDocument();

    // Restore is the exact inverse: actions come straight back.
    fireEvent.click(screen.getByRole('button', { name: /Restore PET Bottle 200ml/i }));
    expect(
      screen.queryByText(/Dismissed — this session only · not persisted/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Accept as suggested — PET Bottle 200ml/i }),
    ).toBeInTheDocument();
  });
});

describe('IntakeReview — ACQUIRE nav entry (review precedes push)', () => {
  it('the sidebar exposes the Intake Review entry alongside Plan Grid', async () => {
    renderPage();
    expect(screen.getByRole('button', { name: /^Intake Review$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Plan Grid$/i })).toBeInTheDocument();
    await screen.findByText(/Glycerin USP/); // flush the seam read (act hygiene)
  });
});

describe('IntakeReview — i18n', () => {
  it('localizes the header to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderPage();
      expect(screen.getAllByText(/Tinjauan Asupan/i).length).toBeGreaterThan(0);
      expect(
        await screen.findByRole('button', { name: /Terima sesuai saran — Glycerin USP/i }),
      ).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
