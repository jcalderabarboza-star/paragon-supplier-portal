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
    // LEDGER (CP-0 · 6.1 · correction 1): this read `queryByRole('spinbutton')`.
    // The property is "no selection ⇒ no editable field"; the ROLE was only ever
    // an implementation detail of `type="number"`. After the 6.2 flip no
    // spinbutton exists anywhere in the tree, so the old assertion would still
    // pass while proving nothing — vacuously true is the quietest kind of rot.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
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
  // LEDGER (CP-0 · 6.1 · correction 2): this read `getAllByRole('spinbutton')
  // .toHaveLength(1)` + `queryAllByRole('textbox')).toHaveLength(0)`. Those
  // counts invert under the 6.2 flip (the qty field becomes a textbox), so the
  // pair fails for a reason that has nothing to do with C6-LOCK. Re-expressed
  // type-agnostically AND strengthened: the original could only assert that ONE
  // editable field exists, never that it is the ACCEPTED QUANTITY. It says so now.
  it('a non-adjusted line exposes exactly ONE editable field — and it IS the accepted quantity', () => {
    renderDrawer(AS_SUGGESTED);
    const editable = screen.getAllByRole('textbox');
    expect(editable).toHaveLength(1);
    expect(editable[0]).toHaveAttribute('aria-label', `Accepted — ${AS_SUGGESTED.material}`);
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · W1 · PR-2b — the accepted quantity is PARSED, and a refusal never
// reaches the command spine.
//
// This is the highest-consequence numeric entry in the product: the typed value
// becomes an audited, store-minted PR. "Refuses visibly" is not sufficient on a
// governed-fact surface — these lock that NOTHING is dispatched and NOTHING is
// stored, which is the only guarantee an operator can rely on.
// ────────────────────────────────────────────────────────────────────────────

const setQty = (line: PrIntakeLine, value: string) =>
  fireEvent.change(screen.getByLabelText(`Accepted — ${line.material}`), {
    target: { value },
  });

describe('CP-0 · 2b — an AMBIGUOUS accepted quantity never becomes a PR', () => {
  it('pre-fills CANONICAL DIGITS, not the display grouping — the form never refuses its own default', () => {
    renderDrawer(ADJUSTED);
    // The chip renders the id-ID grouped fact ("5.000→4.500"); the EDIT field
    // carries the machine value "4500". Pre-filling "4.500" would mean the
    // untouched form refused itself — that token has no single reading.
    expect(screen.getByLabelText(`Accepted — ${ADJUSTED.material}`)).toHaveValue(
      String(ADJUSTED.acceptedQty),
    );
    expect(screen.queryByTestId('accepted-qty-refusal')).not.toBeInTheDocument();
  });

  it('retyping the quantity the CHIP displays ("4.500") REFUSES — and dispatches nothing', async () => {
    const before = purchaseRequisitionStore.all().length;
    renderDrawer(ADJUSTED);
    // The drawer shows "Adjusted · 5.000→4.500". An operator who retypes what
    // they were just shown hands back a token with two readings: 4500 (id) or
    // 4.5 (en). Guessing either would mint a real PR for a quantity nobody typed.
    setQty(ADJUSTED, '4.500');

    const refusal = screen.getByTestId('accepted-qty-refusal');
    expect(refusal).toBeInTheDocument();
    expect(refusal.textContent?.trim()).not.toBe(''); // a reason is never blank
    // The refusal REPLACES the adjusted chip — with no readable quantity there
    // is no adjustment to report (Decision 3).
    expect(screen.queryByText(/Adjusted ·/)).not.toBeInTheDocument();

    // THE LOAD-BEARING ASSERTION: nothing reached the spine.
    const pushBtn = screen.getByRole('button', { name: /push to pr/i });
    expect(pushBtn).toBeDisabled();
    fireEvent.click(pushBtn); // even forced, the click short-circuits
    await waitFor(() => expect(purchaseRequisitionStore.all()).toHaveLength(before));
    expect(screen.queryByText(/Pushed →/)).not.toBeInTheDocument();
    expect(screen.getByText(/^Planned$/i)).toBeInTheDocument();
  });

  it('a reason cannot open the gate on an unreadable quantity — the parse gate is stronger than C6-LOCK', async () => {
    const before = purchaseRequisitionStore.all().length;
    renderDrawer(ADJUSTED);
    // The reason was already filled when the qty was readable…
    fireEvent.change(screen.getByLabelText(`Reason — ${ADJUSTED.material}`), {
      target: { value: 'MRP net requirement revised down' },
    });
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeEnabled();

    // …and then the quantity becomes ambiguous. A satisfied reason-gate must not
    // carry an unreadable number through: `overrideBlocked` is never even asked.
    setQty(ADJUSTED, '4.500');
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /push to pr/i }));
    await waitFor(() => expect(purchaseRequisitionStore.all()).toHaveLength(before));
  });

  it('an UNAMBIGUOUS quantity is accepted and mints the PR at the value typed', async () => {
    renderDrawer(ADJUSTED);
    setQty(ADJUSTED, '4500');
    fireEvent.change(screen.getByLabelText(`Reason — ${ADJUSTED.material}`), {
      target: { value: 'MRP net requirement revised down' },
    });
    fireEvent.click(screen.getByRole('button', { name: /push to pr/i }));

    await waitFor(() => expect(screen.getByText(/Pushed → PR-2026-9\d+/)).toBeInTheDocument());
    const created = purchaseRequisitionStore
      .all()
      .find((p) => p.material === ADJUSTED.material && /^PR-2026-9/.test(p.prNumber));
    // 4500 — never 4.5, the value `Number("4.500")` used to hand the store.
    expect(created!.quantity).toBe(4_500);
  });

  it('a decimal typed in the UNAMBIGUOUS Indonesian form ("4,5") is honoured, not refused', () => {
    renderDrawer(AS_SUGGESTED);
    // "4,5" is legal under ID only — EN comma-thousands needs exactly 3 digits —
    // so there is no disagreement to refuse. Refusing every separator would be
    // safe-looking and wrong; the rule is honest silence, not blanket silence.
    setQty(AS_SUGGESTED, '4,5');
    expect(screen.queryByTestId('accepted-qty-refusal')).not.toBeInTheDocument();
    expect(screen.getByText(/Adjusted ·/)).toBeInTheDocument();
  });
});

describe('CP-0 · 2b — ZERO-COMMITMENT: a cleared field is not a zero', () => {
  it('clearing the accepted quantity REFUSES — it never pushes a PR for 0', async () => {
    const before = purchaseRequisitionStore.all().length;
    renderDrawer(ADJUSTED);
    // The reason is filled FIRST, while the quantity is still readable — the
    // worst case, an otherwise push-ready override.
    fireEvent.change(screen.getByLabelText(`Reason — ${ADJUSTED.material}`), {
      target: { value: 'cleared by mistake' },
    });
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeEnabled();

    // `Number('')` is 0. That made a cleared field an adjusted-to-zero line: with
    // the reason already filled it pushed `quantity: 0` — and a zero on a
    // requisition is a COMMITMENT ("procure none"), typed, never defaulted.
    setQty(ADJUSTED, '');
    expect(screen.getByTestId('accepted-qty-refusal')).toBeInTheDocument();
    // The reason field goes with the adjusted chip: with no readable quantity
    // there is no override to explain (Decision 3 — nothing is evaluated).
    expect(screen.queryByLabelText(`Reason — ${ADJUSTED.material}`)).not.toBeInTheDocument();

    const pushBtn = screen.getByRole('button', { name: /push to pr/i });
    expect(pushBtn).toBeDisabled();
    fireEvent.click(pushBtn);
    await waitFor(() => expect(purchaseRequisitionStore.all()).toHaveLength(before));
    expect(purchaseRequisitionStore.all().some((p) => p.quantity === 0)).toBe(false);
  });

  it('an ENTERED zero is still legal — only the DEFAULTED zero dies', async () => {
    renderDrawer(ADJUSTED);
    setQty(ADJUSTED, '0');
    expect(screen.queryByTestId('accepted-qty-refusal')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(`Reason — ${ADJUSTED.material}`), {
      target: { value: 'demand withdrawn — procure none' },
    });
    fireEvent.click(screen.getByRole('button', { name: /push to pr/i }));
    await waitFor(() => expect(screen.getByText(/Pushed → PR-2026-9\d+/)).toBeInTheDocument());
    expect(
      purchaseRequisitionStore.all().some((p) => /^PR-2026-9/.test(p.prNumber) && p.quantity === 0),
    ).toBe(true);
  });

  it('an unreadable quantity REFUSES rather than resolving to anything', () => {
    renderDrawer(ADJUSTED);
    setQty(ADJUSTED, 'plenty');
    expect(screen.getByTestId('accepted-qty-refusal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeDisabled();
  });
});

describe('honest markers — the drawer renders SIMULATED, green is unreachable', () => {
  it('the selected line is SIMULATED; no Live is rendered', () => {
    renderDrawer(ADJUSTED);
    expect(screen.getByText(/^Simulated$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
  });
});
