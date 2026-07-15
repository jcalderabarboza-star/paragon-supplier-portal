import React, { useState } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import IntakeAdjustDrawer from './IntakeAdjustDrawer';
import { SAMPLE_INTAKE_LINES, type PrIntakeLine } from './planGridModel';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';

// ────────────────────────────────────────────────────────────────────────────
// IntakeAdjustDrawer (Stage G · G1.3.2) — the working-set override surface, in
// PLAIN DOM, tested HEADLESS.
//
// G1.3.2 moves the G1.2b governed write from an un-virtualized full panel onto a
// single SELECTED line (the working set), so browse scales via the virtualized
// DSG while the reason-gate stays in plain DOM — jsdom-provable, not browser-only.
// This is the SAME governed write (one t_pr_create, DR-10 decision audit), now
// parametrized by the selected line rather than iterating every row. The honesty
// guarantee "no commit without a reason" is asserted here on the selected line.
// ────────────────────────────────────────────────────────────────────────────

beforeEach(() => purchaseRequisitionStore.reset());

// pil-somo-002 (Niacinamide) starts ADJUSTED: accepted 4,500 ≠ suggested 5,000.
const ADJUSTED = SAMPLE_INTAKE_LINES.find((l) => l.material.includes('Niacinamide'))!;
// pil-somo-001 (Glycerin) starts accept-as-suggested: accepted === suggested.
const AS_SUGGESTED = SAMPLE_INTAKE_LINES.find((l) => l.material.includes('Glycerin'))!;

const renderDrawer = (line = ADJUSTED) =>
  renderWithProviders(<IntakeAdjustDrawer line={line} />);

describe('IntakeAdjustDrawer — empty state (no selection)', () => {
  it('with no line selected, prompts to select and exposes no push control', () => {
    renderWithProviders(<IntakeAdjustDrawer line={null} />);
    expect(screen.getByText(/select a requisition line/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /push to pr/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
});

describe('IntakeAdjustDrawer — edits exactly the SELECTED line (working-set)', () => {
  // A tiny harness that flips the selected line via a button — exactly what the
  // intake DSG's "Adjust" action column does (setSelectedLineId). This proves the
  // selection→drawer contract HEADLESS; the literal DSG-cell click is browser-QA.
  const SelectionHarness: React.FC = () => {
    const [line, setLine] = useState<PrIntakeLine | null>(null);
    return (
      <>
        <button onClick={() => setLine(ADJUSTED)}>select-adjusted</button>
        <button onClick={() => setLine(AS_SUGGESTED)}>select-as-suggested</button>
        <IntakeAdjustDrawer line={line} />
      </>
    );
  };

  it('follows the selection: the drawer edits whichever line was selected', () => {
    renderWithProviders(<SelectionHarness />);
    // nothing selected yet → empty prompt
    expect(screen.getByText(/select a requisition line/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'select-adjusted' }));
    expect(screen.getByText(ADJUSTED.material)).toBeInTheDocument();

    // Re-select a different line → the drawer swaps onto it (the working set of one).
    fireEvent.click(screen.getByRole('button', { name: 'select-as-suggested' }));
    expect(screen.getByText(AS_SUGGESTED.material)).toBeInTheDocument();
    expect(screen.queryByText(ADJUSTED.material)).not.toBeInTheDocument();
  });
});

describe('C6-LOCK reason-gate (the load-bearing guarantee) — no reason, no push', () => {
  it('an override with an EMPTY reason CANNOT be pushed — the button is disabled', () => {
    renderDrawer(ADJUSTED);
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeDisabled();
    expect(screen.getByText(/reason required/i)).toBeInTheDocument();
    // The line stays PLANNED — nothing committed.
    expect(screen.getByText(/^Planned$/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pushed →/)).not.toBeInTheDocument();
  });

  it('filling the reason opens the gate; the push commits ONE Draft PR with its assigned number', async () => {
    renderDrawer(ADJUSTED);
    fireEvent.change(screen.getByLabelText(`Reason — ${ADJUSTED.material}`), {
      target: { value: 'MRP net requirement revised down' },
    });
    const pushBtn = screen.getByRole('button', { name: /push to pr/i });
    expect(pushBtn).toBeEnabled();
    fireEvent.click(pushBtn);

    await waitFor(() =>
      expect(screen.getByText(/Pushed → PR-2026-9\d+/)).toBeInTheDocument(),
    );
    // Plan-state flips to committed; the source tier stays SIMULATED (no live
    // producer — the override is honestly non-committed, never a live instruction).
    expect(screen.getByText(/^Committed$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Simulated$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
  });
});

describe('C6-LOCK — accept-as-suggested is not an override (no reason needed)', () => {
  it('a non-adjusted line exposes no reason field and pushes immediately', async () => {
    renderDrawer(AS_SUGGESTED);
    expect(screen.queryByLabelText(`Reason — ${AS_SUGGESTED.material}`)).not.toBeInTheDocument();
    const pushBtn = screen.getByRole('button', { name: /push to pr/i });
    expect(pushBtn).toBeEnabled();
    fireEvent.click(pushBtn);
    await waitFor(() =>
      expect(screen.getByText(/Pushed → PR-2026-9\d+/)).toBeInTheDocument(),
    );
  });
});

describe('C6-LOCK — computed/derived values are locked (only accepted qty is editable)', () => {
  it('a non-adjusted line exposes exactly ONE editable field — the accepted quantity', () => {
    renderDrawer(AS_SUGGESTED);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });
});

describe('honest markers — the drawer renders SIMULATED, green is unreachable', () => {
  it('the selected line is SIMULATED; no Live is rendered', () => {
    renderDrawer(ADJUSTED);
    expect(screen.getByText(/^Simulated$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
  });
});
