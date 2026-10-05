import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import type { CellProps } from 'react-datasheet-grid';
import { renderWithProviders } from '../../test/test-utils';
import PlanGrid from '../PlanGrid';
import { IntakeTriageProvider, intakeReviewColumns } from './IntakeReviewView';
import { useIntakeReview } from '../../services/query/hooks';
import type { IntakeLine } from '../../services/data/types';
import { isLive } from '../../services/liveness';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { intakeLineStore } from '../../services/data/mock/stores/intakeLineStore';
import i18n from '../../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// The intake-review VIEW (PLN-3 · Design 1 D8) — where the Intake Review PAGE
// went. Every spec the page carried is carried here, against the view.
//
//  · honest render — the registry-derived SIMULATED pill; green unreachable.
//  · the seam read — rows arrive via `getIntakeLines` (both producers), each
//    carrying the FORK-D `deficit` rationale and the machine's recorded triage.
//  · Accept commits the PRODUCER's DELIVERED quantity and the cascade mints one
//    requisition, while the tier stays SIMULATED.
//  · dismiss is a RECORDED ACT: the row never leaves the document, Restore is
//    its exact inverse, and both survive a reload.
//
// ⚠️ **A ROW IS RENDERED THROUGH THE VIEW'S OWN COLUMNS (`intakeReviewColumns`),
// NOT THROUGH THE ENGINE.** The DSG virtualises its body and lays out no rows
// under jsdom, so the page's plain-DOM assertions would have nothing to find.
// Rendering every column's REAL cell for one line keeps them about the
// shipped cells rather than about a test double.
//
// ⚠️ **TWO ASSERTIONS HERE REVERSED AT A2, AND THEY STAY REVERSED.** The page
// used to be checked for *"nothing is persisted or rejected upstream"* and
// *"Dismissed — this session only · not persisted"* — labels on a defect. The
// specs assert the recorded triage AND that the old promise is gone.
// ────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  purchaseRequisitionStore.reset();
  intakeLineStore.reset();
});

const renderView = () =>
  renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid?view=intake-review' });

/** One line's row, through the view's real columns, under the view's triage. */
const Row: React.FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation();
  const line = useIntakeReview().data?.items.find((l) => l.id === id);
  if (!line) return null;
  const cols = intakeReviewColumns(t, () => {});
  return (
    <div data-testid={`row-${id}`}>
      {cols.map((c, i) => {
        const Cell = c.component as React.FC<CellProps<IntakeLine>>;
        return <Cell key={i} {...({ rowData: line } as unknown as CellProps<IntakeLine>)} />;
      })}
    </div>
  );
};
const renderRows = (...ids: string[]) =>
  renderWithProviders(
    <IntakeTriageProvider>
      {ids.map((id) => (
        <Row key={id} id={id} />
      ))}
    </IntakeTriageProvider>,
  );

describe('intake-review view — honest render (SIMULATED × PLANNED, green unreachable)', () => {
  // ⚠️ PLN-5 · BACK ON VITEST'S DEFAULT TIMEOUT. PLN-4 gave this test an explicit
  // 15 s by ruling: it is the file's FIRST render over the whole 15,416-line
  // intake population, and under full-suite load it ran 3.3–5.1 s. The product
  // fix landed in PLN-5 — the population asked the SDC clock for the horizon
  // once PER LINE (`somoHorizon`, ~16,000 times, 1.8 s of the build) and now asks
  // once per grain (47 ms) — so the explicit timeout is gone. Assertions unchanged.
  it('renders the SIMULATED page pill from the registry — never Live', async () => {
    expect(isLive('purchaseRequisitions')).toBe(false);
    renderView();
    expect(await screen.findByText(/awaiting live PR producer/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/)).not.toBeInTheDocument();
  });

  it('renders the recommend-first honesty banner — simulated push, RECORDED triage', async () => {
    renderView();
    expect(await screen.findByText(/Recommend-first triage/i)).toBeInTheDocument();
    expect(screen.getByText(/never a live procurement instruction/i)).toBeInTheDocument();
    expect(screen.getByText(/survives a reload and is visible to your colleagues/i)).toBeInTheDocument();
    expect(screen.queryByText(/not persisted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/this session only/i)).not.toBeInTheDocument();
    await screen.findByTestId('intake-summary');
  });
});

describe('intake-review view — consumes the getIntakeLines seam (C7 §2, two producers)', () => {
  it('renders the inbound set from BOTH producers with the deficit rationale', async () => {
    renderRows('pil-somo-001', 'pil-grid-001');
    // SOMO line + its recommend-first "why"
    expect(await screen.findByText(/Glycerin USP/)).toBeInTheDocument();
    expect(screen.getByText(/Projected net requirement below safety stock/i)).toBeInTheDocument();
    // internal-Grid line + its "why"
    expect(await screen.findByText(/PET Bottle 200ml/)).toBeInTheDocument();
    expect(screen.getByText(/Packaging plan shortfall for the Make Over launch run/i)).toBeInTheDocument();
  });
});

describe('intake-review view — Accept commits the PRODUCER’s delivered quantity (A1-R2)', () => {
  it('commits ONE requisition and shows its number; the tier stays SIMULATED', async () => {
    renderRows('pil-somo-001');
    await screen.findByText(/Glycerin USP/);

    fireEvent.click(screen.getByRole('button', { name: /Accept as delivered — Glycerin USP/i }));

    await waitFor(() => expect(screen.getByText(/Committed → PR-2026-9\d+/)).toBeInTheDocument());
    // The committed row's plan-state follows the MACHINE; the source tier
    // remains SIMULATED (no live producer — never a live instruction).
    expect(screen.getByText(/^Committed$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
    // `Committed` is terminal: no second accept and no dismissal.
    expect(screen.queryByRole('button', { name: /Accept as delivered — Glycerin USP/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dismiss Glycerin USP/i })).not.toBeInTheDocument();

    // The page commits the line's `acceptedQty` and the requisition names the line back.
    const pr = purchaseRequisitionStore.all().find((r) => r.intakeLineId === 'pil-somo-001');
    expect(pr).toBeDefined();
    expect(pr!.quantity).toBe(12_000);
  });
});

describe('intake-review view — dismiss is a RECORDED ACT, restorable, and it survives', () => {
  it('dismissing records the decision; the row never leaves the document', async () => {
    renderRows('pil-grid-001');
    await screen.findByText(/PET Bottle 200ml/);

    fireEvent.click(screen.getByRole('button', { name: /Dismiss PET Bottle 200ml/i }));
    await screen.findByText(/^Dismissed$/i);

    // Set aside, not removed.
    expect(screen.getByText(/PET Bottle 200ml/)).toBeInTheDocument();
    // Accept is withdrawn while dismissed: `t_intake_commit` is `from: ['Pending']`.
    expect(screen.queryByRole('button', { name: /Accept as delivered — PET Bottle 200ml/i })).not.toBeInTheDocument();

    // ⚠️ **AND IT IS ON DISK.**
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

describe('intake-review view — the nav (PLN-3: the page left it, the grid is the one door)', () => {
  // ⚠️ REVERSED AT PLN-3, BY RULING (Design 1 D8). The page's spec asserted the
  // sidebar carried an Intake Review entry beside Plan Grid; the page is
  // retired into this view, so the entry is gone and Plan Grid is the door.
  it('the sidebar no longer carries an Intake Review entry; Plan Grid is there', async () => {
    renderView();
    expect(screen.getByRole('button', { name: /^Plan Grid$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Intake Review$/i })).not.toBeInTheDocument();
    await screen.findByTestId('intake-summary');
  });
});

describe('intake-review view — i18n', () => {
  it('localizes the view to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderView();
      // ⚠️ PLN-5 · RE-PINNED BY RULING: "Tinjauan asupan" → "Tinjauan usulan" (the
      // planner's word for a producer's proposal); the old word is asserted gone.
      expect(screen.getAllByText(/Tinjauan usulan/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/asupan/i)).toEqual([]);
      expect(await screen.findByText(/Triase rekomendasi-dahulu/)).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('a row’s triage is Indonesian too', async () => {
    await i18n.changeLanguage('id');
    try {
      renderRows('pil-somo-001');
      expect(await screen.findByRole('button', { name: /Terima sesuai kiriman — Glycerin USP/i })).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
