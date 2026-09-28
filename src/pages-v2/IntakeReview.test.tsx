import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import IntakeReview from './IntakeReview';
import { isLive } from '../services/liveness';
import { purchaseRequisitionStore } from '../services/data/mock/stores/purchaseRequisitionStore';
import { intakeLineStore } from '../services/data/mock/stores/intakeLineStore';
import i18n from '../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// IntakeReview (A2) — the recommend-first TRIAGE surface, plain DOM.
//
//  · honest render — the registry-derived SIMULATED pill; green unreachable.
//  · the seam read — rows arrive via `getIntakeLines` (both producers), each
//    carrying the FORK-D `deficit` rationale (the "why" the triage is FOR) and
//    the `intakeLine` machine's recorded triage.
//  · Accept commits the PRODUCER's DELIVERED quantity and the cascade mints one
//    requisition, while the tier stays SIMULATED.
//  · dismiss is a RECORDED ACT: the row never leaves the document, Restore is
//    its exact inverse, and both survive a reload.
//
// ⚠️ **TWO ASSERTIONS HERE REVERSED, AND THE REVERSAL IS THE BATCH.** The page
// used to be checked for the strings *"nothing is persisted or rejected
// upstream"* and *"Dismissed — this session only · not persisted"*. Both were
// honest LABELS ON A DEFECT: a planner who set a line aside had decided
// something, and the next seat saw the line back in the pile. The copy changed
// because the behaviour did, so the specs assert the new claim AND that the old
// one is gone — a retired promise left findable is a promise somebody re-adds.
// ────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  purchaseRequisitionStore.reset();
  intakeLineStore.reset();
});

const renderPage = () =>
  renderWithProviders(<IntakeReview />, { route: '/buyer/intake-review' });

describe('IntakeReview — honest render (SIMULATED × PLANNED, green unreachable)', () => {
  it('renders the SIMULATED page pill from the registry — never Live', async () => {
    expect(isLive('purchaseRequisitions')).toBe(false);
    renderPage();
    expect(await screen.findByText(/awaiting live PR producer/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/)).not.toBeInTheDocument();
  });

  it('renders the recommend-first honesty banner — simulated push, RECORDED triage', async () => {
    renderPage();
    expect(screen.getByText(/Recommend-first triage/i)).toBeInTheDocument();
    // What is still true: no live producer, so the requisition is simulated.
    expect(screen.getByText(/never a live procurement instruction/i)).toBeInTheDocument();
    // What is now true, and was the opposite before A2.
    expect(screen.getByText(/survives a reload and is visible to your colleagues/i)).toBeInTheDocument();
    // And the retired promise is GONE rather than merely contradicted.
    expect(screen.queryByText(/not persisted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/this session only/i)).not.toBeInTheDocument();
    await screen.findByText(/Glycerin USP/); // flush the seam read (act hygiene)
  });
});

describe('IntakeReview — consumes the getIntakeLines seam (C7 §2, two producers)', () => {
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

describe('IntakeReview — Accept commits the PRODUCER’s delivered quantity (A1-R2)', () => {
  it('commits ONE requisition and shows its number; the tier stays SIMULATED', async () => {
    renderPage();
    await screen.findByText(/Glycerin USP/);

    fireEvent.click(
      screen.getByRole('button', { name: /Accept as delivered — Glycerin USP/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Committed → PR-2026-9\d+/)).toBeInTheDocument(),
    );
    // The committed row's plan-state follows the MACHINE; the source tier
    // remains SIMULATED (no live producer — never a live instruction).
    expect(screen.getByText(/^Committed$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
    // Its triage actions are spent — `Committed` is terminal, so there is no
    // second accept and no dismissal of a line already committed.
    expect(
      screen.queryByRole('button', { name: /Accept as delivered — Glycerin USP/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Dismiss Glycerin USP/i }),
    ).not.toBeInTheDocument();

    // ⚠️ **THE DELIVERED QUANTITY, NOT THE SUGGESTION.** On this row they
    // coincide (12,000 / 12,000), so the assertion that carries the ruling is
    // the drawer's and the model's; what this pins is that the page commits the
    // line's `acceptedQty` and the requisition names the line back.
    const pr = purchaseRequisitionStore.all().find((r) => r.intakeLineId === 'pil-somo-001');
    expect(pr).toBeDefined();
    expect(pr!.quantity).toBe(12_000);
  });
});

describe('IntakeReview — dismiss is a RECORDED ACT, restorable, and it survives', () => {
  it('dismissing records the decision; the row never leaves the document', async () => {
    renderPage();
    await screen.findByText(/PET Bottle 200ml/);

    fireEvent.click(screen.getByRole('button', { name: /Dismiss PET Bottle 200ml/i }));
    await screen.findByText(/^Dismissed$/i);

    // The row is set aside, not removed — the queue can still answer *what did
    // we decline, and is it still declined?*
    expect(screen.getByText(/PET Bottle 200ml/)).toBeInTheDocument();
    // Accept is withdrawn while dismissed: `t_intake_commit` is `from:
    // ['Pending']`, so offering it would be a control that cannot work.
    expect(
      screen.queryByRole('button', { name: /Accept as delivered — PET Bottle 200ml/i }),
    ).not.toBeInTheDocument();

    // ⚠️ **AND IT IS ON DISK.** This is the assertion the old `useState`
    // triage could never pass, and it is the whole of F2's remedy.
    expect(intakeLineStore.stateOf('pil-grid-001')).toBe('Dismissed');
    intakeLineStore.rehydrate(); // memory gone, disk intact — what a reload does
    expect(intakeLineStore.stateOf('pil-grid-001')).toBe('Dismissed');

    // Restore is the exact inverse: actions come straight back.
    fireEvent.click(screen.getByRole('button', { name: /Restore PET Bottle 200ml/i }));
    await screen.findByRole('button', { name: /Accept as delivered — PET Bottle 200ml/i });
    expect(screen.queryByText(/^Dismissed$/i)).not.toBeInTheDocument();
    expect(intakeLineStore.stateOf('pil-grid-001')).toBe('Pending');
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
        await screen.findByRole('button', { name: /Terima sesuai kiriman — Glycerin USP/i }),
      ).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
