import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import IntakePushPanel from './IntakePushPanel';
import { SAMPLE_INTAKE_LINES } from './planGridModel';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';

// ────────────────────────────────────────────────────────────────────────────
// IntakePushPanel (G1.2b) — the governed-override surface, tested HEADLESS.
//
// The fork ruling put the whole reason-gate in plain DOM precisely so this — the
// honesty-critical guarantee "no commit without a reason" — is jsdom-provable,
// not browser-QA-only. These tests drive the real hook against the real mock
// command service + store (buyer persona), so a commit really mints a Draft PR.
// ────────────────────────────────────────────────────────────────────────────

// Pushing mutates the shared PR store; reset so each test starts clean and PR
// numbers restart at PR-2026-901.
beforeEach(() => purchaseRequisitionStore.reset());

const render = () => renderWithProviders(<IntakePushPanel lines={SAMPLE_INTAKE_LINES} />);

// pil-somo-002 (Niacinamide) starts ADJUSTED: accepted 4,500 ≠ suggested 5,000.
const ADJUSTED = 'Niacinamide USP';
// pil-somo-001 (Glycerin) starts accept-as-suggested: accepted === suggested.
const AS_SUGGESTED = 'Glycerin';

const rowFor = (material: RegExp | string) =>
  screen.getByLabelText(
    material instanceof RegExp ? material : `Accepted — ${material}`,
  ).closest('tr') as HTMLElement;

describe('C6-LOCK reason-gate (the load-bearing guarantee) — no reason, no push', () => {
  it('an override with an EMPTY reason CANNOT be pushed — the button is disabled', () => {
    render();
    const row = rowFor(ADJUSTED);
    expect(within(row).getByRole('button', { name: /push to pr/i })).toBeDisabled();
    expect(within(row).getByText(/reason required/i)).toBeInTheDocument();
    // The row stays PLANNED — nothing committed.
    expect(within(row).getByText(/^Planned$/i)).toBeInTheDocument();
    expect(within(row).queryByText(/Pushed →/)).not.toBeInTheDocument();
  });

  it('filling the reason opens the gate; the push commits ONE Draft PR with its assigned number', async () => {
    render();
    const row = rowFor(ADJUSTED);
    fireEvent.change(within(row).getByLabelText(`Reason — ${ADJUSTED}`), {
      target: { value: 'MRP net requirement revised down' },
    });
    const pushBtn = within(row).getByRole('button', { name: /push to pr/i });
    expect(pushBtn).toBeEnabled();
    fireEvent.click(pushBtn);

    await waitFor(() =>
      expect(screen.getByText(/Pushed → PR-2026-9\d+/)).toBeInTheDocument(),
    );
    // Plan-state flips to committed; the source tier stays SIMULATED (no live
    // producer — the override is honestly non-committed, never a live instruction).
    const committedRow = rowFor(ADJUSTED);
    expect(within(committedRow).getByText(/^Committed$/i)).toBeInTheDocument();
    expect(within(committedRow).getByText(/^Simulated$/i)).toBeInTheDocument();
    expect(within(committedRow).queryByText(/^Live$/i)).not.toBeInTheDocument();
  });
});

describe('C6-LOCK — accept-as-suggested is not an override (no reason needed)', () => {
  it('a non-adjusted row exposes no reason field and pushes immediately', async () => {
    render();
    const row = rowFor(new RegExp(`Accepted — ${AS_SUGGESTED}`));
    expect(within(row).queryByLabelText(new RegExp(`Reason — ${AS_SUGGESTED}`))).not.toBeInTheDocument();
    const pushBtn = within(row).getByRole('button', { name: /push to pr/i });
    expect(pushBtn).toBeEnabled();
    fireEvent.click(pushBtn);
    await waitFor(() =>
      expect(screen.getByText(/Pushed → PR-2026-9\d+/)).toBeInTheDocument(),
    );
  });
});

describe('C6-LOCK — computed/derived values are locked (only accepted qty is editable)', () => {
  it('a row exposes exactly ONE editable numeric field — the accepted quantity', () => {
    render();
    // A non-adjusted, uncommitted row: the ONLY input is the accepted-qty
    // spinbutton (no reason textbox, no editable score/suggested/derived field).
    const row = rowFor(new RegExp(`Accepted — ${AS_SUGGESTED}`));
    expect(within(row).getAllByRole('spinbutton')).toHaveLength(1);
    expect(within(row).queryAllByRole('textbox')).toHaveLength(0);
  });
});

describe('honest markers — the panel renders SIMULATED, green is unreachable', () => {
  it('every intake row is SIMULATED; no row renders Live', () => {
    render();
    expect(screen.getAllByText(/^Simulated$/i).length).toBe(SAMPLE_INTAKE_LINES.length);
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
  });
});
