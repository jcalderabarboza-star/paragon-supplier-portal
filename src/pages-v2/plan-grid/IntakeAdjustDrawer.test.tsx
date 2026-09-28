import React, { useState } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import IntakeAdjustDrawer from './IntakeAdjustDrawer';
import { selectedLine } from './planGridModel';
import { useIntakeReview } from '../../services/query/hooks';
import { projectIntakeLine } from '../../services/data/intakeLineProjection';
import { PR_INTAKE_LINES } from '../../services/data/mock/fixtures/prIntake';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { intakeLineStore } from '../../services/data/mock/stores/intakeLineStore';
import type { IntakeLine } from '../../services/data/types';

// ────────────────────────────────────────────────────────────────────────────
// IntakeAdjustDrawer (A2) — the working-set override surface, in PLAIN DOM,
// tested HEADLESS.
//
// ── ⚠️ WHAT CHANGED UNDER THIS FILE, AND WHY EVERY "PUSHED" ASSERTION MOVED ──
//
// The drawer used to dispatch `t_pr_create` and keep the outcome in its own
// `useState` — so a spec could click push and read "Pushed → PR-…" off the same
// component. It now dispatches `t_intake_commit` and is a PURE FUNCTION OF THE
// LINE IT IS HANDED: `committed` is `line.state === 'Committed'` and the PR
// number is `line.prNumber`, both from the seam.
//
// **That is the batch's point, not an inconvenience for the test.** The old
// shape is exactly how two surfaces came to hold independent answers about one
// requirement, and how a commit vanished on reload. So the specs below assert
// in the two places the truth now lives:
//   · the STORES, after a commit — which is what survives a reload; and
//   · the drawer rendered against a line that IS committed — which is what a
//     reader sees when the seam says so.
// `LiveDrawer` closes the loop by composing exactly what `PlanGrid` composes.
//
// ── ⚠️ AND THE SPECIMEN LINE CHANGED MEANING (A1-R2) ─────────────────────────
//
// `pil-somo-002` (5,000 suggested / 4,500 delivered) used to open the drawer
// ALREADY BLOCKED: the gate measured against `suggestedQty`, so the untouched
// form demanded a planner's justification for SOMO's own trim. It now opens
// clean at 4,500 and owes nothing — and a reason becomes mandatory the moment
// the planner leaves that number. Both directions are asserted, because either
// alone is satisfied by a gate that is simply broken one way.
// ────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  purchaseRequisitionStore.reset();
  intakeLineStore.reset();
});

const row = (id: string) => PR_INTAKE_LINES.find((l) => l.id === id)!;

/** A producer row projected at its untriaged default — no store, no dispatch. */
const pending = (id: string): IntakeLine => projectIntakeLine(row(id), undefined, []);

// pil-somo-002 (Niacinamide): the producer trimmed DOWN, 5,000 → 4,500.
const TRIMMED = pending('pil-somo-002');
// pil-somo-001 (Glycerin): delivered === suggested, so the producer adjusted nothing.
const AS_DELIVERED = pending('pil-somo-001');
// pil-grid-002 (Folding Carton): the producer adjusted UP, 80,000 → 90,000 — the
// other direction, so no assertion below can be satisfied by a gate that only
// handles a trim.
const RAISED_BY_PRODUCER = pending('pil-grid-002');
// pil-grid-001 (PET Bottle): a second un-adjusted line, 200,000.
const PLAIN = pending('pil-grid-001');

// ⚠️ **EVERY SPEC THAT SUCCESSFULLY COMMITS USES A DIFFERENT LINE, AND THAT
// IS A PROPERTY OF THE MACHINE RATHER THAN TEST HYGIENE.** The cascade's
// idempotency key IS the line id, and the dispatcher's ingress replay ledger is
// a module singleton that outlives a store reset — so a second spec committing
// the same line is answered with the FIRST spec's result and mints nothing.
// That is the mechanism working: **one line → at most one requisition, for the
// life of the process.** It is asserted deliberately, as the subject of a spec
// rather than as a surprise, in `intakeCommitIdempotency.test.ts`.

const renderDrawer = (line: IntakeLine = TRIMMED) =>
  renderWithProviders(<IntakeAdjustDrawer line={line} />);

/**
 * The drawer wired the way `PlanGrid` wires it — reading the SEAM, so a commit
 * re-renders it from the machine rather than from anything it remembers.
 */
const LiveDrawer: React.FC<{ lineId: string }> = ({ lineId }) => {
  const q = useIntakeReview();
  return <IntakeAdjustDrawer line={selectedLine(q.data?.items ?? [], lineId)} />;
};

/**
 * The requisitions THIS MACHINE raised.
 *
 * ⚠️ **NOT `purchaseRequisitionStore.all().length`, AND THE DIFFERENCE IS A
 * MEASUREMENT RATHER THAN A STYLE CHOICE.** The store seeds six fixture rows,
 * so a bare length assertion is a claim about the seed plus the act, and it
 * passes or fails for reasons that have nothing to do with the act. Filtering
 * on `intakeLineId` counts exactly what a commit minted — which is also the
 * relation "one line → at most one PR" is stated over.
 */
const raised = () => purchaseRequisitionStore.all().filter((p) => p.intakeLineId !== undefined);

const setQty = (line: IntakeLine, value: string) =>
  fireEvent.change(screen.getByLabelText(`Accepted — ${line.material}`), {
    target: { value },
  });

const setReason = (line: IntakeLine, value: string) =>
  fireEvent.change(screen.getByLabelText(`Reason — ${line.material}`), {
    target: { value },
  });

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
  const SelectionHarness: React.FC = () => {
    const [line, setLine] = useState<IntakeLine | null>(null);
    return (
      <>
        <button onClick={() => setLine(TRIMMED)}>select-trimmed</button>
        <button onClick={() => setLine(AS_DELIVERED)}>select-as-delivered</button>
        <IntakeAdjustDrawer line={line} />
      </>
    );
  };

  it('follows the selection: the drawer edits whichever line was selected', () => {
    renderWithProviders(<SelectionHarness />);
    expect(screen.getByText(/select a requisition line/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'select-trimmed' }));
    expect(screen.getByText(TRIMMED.material)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'select-as-delivered' }));
    expect(screen.getByText(AS_DELIVERED.material)).toBeInTheDocument();
    expect(screen.queryByText(TRIMMED.material)).not.toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// A1-R2 — THE BASELINE IS THE PRODUCER'S DELIVERED QUANTITY
// ────────────────────────────────────────────────────────────────────────────

describe('A1-R2 — the producer’s delta is shown, never charged to the planner', () => {
  it('pins the specimen, so the reversal is measured rather than asserted', () => {
    expect([TRIMMED.suggestedQty, TRIMMED.acceptedQty]).toEqual([5_000, 4_500]);
    expect(TRIMMED.producerAdjusted).toBe(true);
  });

  it('pre-fills the DELIVERED quantity and states whose adjustment the delta was', () => {
    renderDrawer(TRIMMED);
    expect(screen.getByLabelText(`Accepted — ${TRIMMED.material}`)).toHaveValue('4500');
    // SOMO's act, named and read-only.
    expect(screen.getByTestId(`producer-adjusted-${TRIMMED.id}`)).toHaveTextContent(/5.000/);
    expect(screen.getByTestId(`producer-adjusted-${TRIMMED.id}`)).toHaveTextContent(/4.500/);
  });

  it('opens UNBLOCKED with no reason field — the untouched form owes nothing', () => {
    renderDrawer(TRIMMED);
    // The defect this replaces: the same untouched form used to be DISABLED,
    // demanding a justification for a trim the planner did not make.
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeEnabled();
    expect(screen.queryByLabelText(`Reason — ${TRIMMED.material}`)).not.toBeInTheDocument();
    expect(screen.queryByText(/reason required/i)).not.toBeInTheDocument();
  });

  it('but the PLANNER leaving that number is blocked until they say why', () => {
    renderDrawer(TRIMMED);
    setQty(TRIMMED, '4200');
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeDisabled();
    expect(screen.getByText(/reason required/i)).toBeInTheDocument();
    setReason(TRIMMED, 'line yield revised');
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeEnabled();
  });

  it('and typing the producer’s SUGGESTION back in is itself an override', () => {
    renderDrawer(TRIMMED);
    setQty(TRIMMED, '5000');
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeDisabled();
    expect(screen.getByLabelText(`Reason — ${TRIMMED.material}`)).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// THE COMMIT — what reaches the stores, and what a reader is shown
// ────────────────────────────────────────────────────────────────────────────

describe('the commit — one requisition, with the override on the document', () => {
  it('an accept-as-delivered commit mints ONE PR at the delivered qty, with no decision', async () => {
    renderWithProviders(<LiveDrawer lineId={TRIMMED.id} />);
    await screen.findByText(TRIMMED.material);
    fireEvent.click(screen.getByRole('button', { name: /push to pr/i }));

    await waitFor(() => expect(raised()).toHaveLength(1));
    const pr = raised()[0];
    expect(pr.quantity).toBe(4_500);
    // Nothing was overridden, so the document records no decision. An absent
    // `decision` means nobody overrode anything — never "unexplained override".
    expect(pr.decision).toBeUndefined();
    // The provenance A1-R3 put on the entity and A1 left unwritten.
    expect(pr.intakeLineId).toBe(TRIMMED.id);
    expect(pr.periodBucket).toBe('2026-08');
    // ⚠️ AND NO FABRICATED DAY. The bucket used to fall through into this
    // date-named field, where a month rendered as `01 Aug 2026`.
    expect(pr.requiredDate).toBe('');
  });

  it('a PLANNER override records the decision on the document, derived not authored', async () => {
    // The producer raised this one 80,000 → 90,000, so the baseline is ABOVE the
    // suggestion. A gate that quietly assumed a trim would record 80,000 here.
    const line = RAISED_BY_PRODUCER;
    renderWithProviders(<LiveDrawer lineId={line.id} />);
    await screen.findByText(line.material);
    setQty(line, '85000');
    setReason(line, 'line yield revised');
    fireEvent.click(screen.getByRole('button', { name: /push to pr/i }));

    await waitFor(() => expect(raised()).toHaveLength(1));
    const pr = raised()[0];
    expect(pr.quantity).toBe(85_000);
    expect(pr.decision).toEqual({
      field: 'acceptedQty',
      // ⚠️ THE PRODUCER'S 90,000 — not the 80,000 this used to record, which
      // would have been a faithful derivation over the wrong operand.
      from: 90_000,
      to: 85_000,
      reason: 'line yield revised',
      // Derived at dispatch. No caller has this key (A1-R2a).
      wasAdjusted: true,
    });
    expect(pr.decision!.from).not.toBe(line.suggestedQty);
  });

  it('the commit survives a reload — the triage is a recorded fact, not a session', async () => {
    const line = AS_DELIVERED;
    renderWithProviders(<LiveDrawer lineId={line.id} />);
    await screen.findByText(line.material);
    fireEvent.click(screen.getByRole('button', { name: /push to pr/i }));
    await waitFor(() => expect(raised()).toHaveLength(1));

    // Drop the in-memory copy WITHOUT touching storage — what a reload does.
    // This is the one assertion the old `useState` triage could never pass, and
    // it is the whole of F2's remedy.
    intakeLineStore.rehydrate();
    expect(intakeLineStore.stateOf(line.id)).toBe('Committed');
    expect(intakeLineStore.get(line.id)?.committedQty).toBe(12_000);
  });

  // ⚠️ **FOUND IN BROWSER QA, NOT BY ANY SPEC, AND PINNED HERE SO IT CANNOT
  // REGRESS.** The triage persists to `localStorage`; the requisition store is
  // an in-memory singleton that a reload re-seeds. So a line committed before a
  // reload is `Committed` with NO requisition naming it back — a real state,
  // and the first copy for it read *"no requisition was raised"*, which is a
  // FALSE statement about the world: one was, and this session no longer holds
  // it. The label names the STORE's boundary, which is the only thing the
  // surface can know.
  it('a committed line with no requisition names the SESSION, never claims none was raised', () => {
    const orphaned = projectIntakeLine(
      row('pil-somo-002'),
      {
        lineId: 'pil-somo-002',
        state: 'Committed',
        committedQty: 4_500,
        committedAt: '2026-09-28T00:00:00.000Z',
      },
      [], // the reload: no requisition in this session names the line
    );
    expect(orphaned.prNumber).toBeUndefined();
    renderDrawer(orphaned);
    expect(screen.getByText(/not in this session/i)).toBeInTheDocument();
    // The retired claim must be GONE, not merely contradicted elsewhere.
    expect(screen.queryByText(/no requisition was raised/i)).not.toBeInTheDocument();
    // And it is still committed: the act happened, whatever the store lost.
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeDisabled();
  });

  it('a committed line renders its requisition and refuses a second commit', () => {
    // Rendered against a line the seam says is Committed — which is what a
    // reader sees, and is the assertion that survived the move off `useState`.
    const committed = projectIntakeLine(
      row('pil-somo-002'),
      {
        lineId: 'pil-somo-002',
        state: 'Committed',
        committedQty: 4_500,
        committedAt: '2026-09-28T00:00:00.000Z',
      },
      [
        {
          ...purchaseRequisitionStore.all()[0],
          id: 'PR-2026-901',
          prNumber: 'PR-2026-901',
          intakeLineId: 'pil-somo-002',
        },
      ],
    );
    renderDrawer(committed);
    expect(screen.getByText(/Pushed → PR-2026-901/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeDisabled();
    expect(screen.getByLabelText(`Accepted — ${committed.material}`)).toBeDisabled();
    // The plan-state marker follows the machine; the source tier stays SIMULATED
    // (no live producer — a committed line is honestly not a live instruction).
    expect(screen.getByText(/^Committed$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Simulated$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
  });
});

describe('C6-LOCK — computed/derived values are locked (only accepted qty is editable)', () => {
  // LEDGER (CP-0 · 6.1 · correction 2): this read `getAllByRole('spinbutton')
  // .toHaveLength(1)` + `queryAllByRole('textbox')).toHaveLength(0)`. Those
  // counts invert under the 6.2 flip (the qty field becomes a textbox), so the
  // pair fails for a reason that has nothing to do with C6-LOCK. Re-expressed
  // type-agnostically AND strengthened: the original could only assert that ONE
  // editable field exists, never that it is the ACCEPTED QUANTITY. It says so now.
  it('an un-overridden line exposes exactly ONE editable field — and it IS the accepted quantity', () => {
    renderDrawer(AS_DELIVERED);
    const editable = screen.getAllByRole('textbox');
    expect(editable).toHaveLength(1);
    expect(editable[0]).toHaveAttribute('aria-label', `Accepted — ${AS_DELIVERED.material}`);
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

describe('CP-0 · 2b — an AMBIGUOUS accepted quantity never becomes a PR', () => {
  it('pre-fills CANONICAL DIGITS, not the display grouping — the form never refuses its own default', () => {
    renderDrawer(TRIMMED);
    // The producer chip renders the id-ID grouped fact ("5.000 → 4.500"); the
    // EDIT field carries the machine value "4500". Pre-filling "4.500" would
    // mean the untouched form refused itself — that token has no single reading.
    expect(screen.getByLabelText(`Accepted — ${TRIMMED.material}`)).toHaveValue('4500');
    expect(screen.queryByTestId('accepted-qty-refusal')).not.toBeInTheDocument();
  });

  it('retyping the quantity the CHIP displays ("4.500") REFUSES — and dispatches nothing', async () => {
    renderWithProviders(<LiveDrawer lineId={TRIMMED.id} />);
    await screen.findByText(TRIMMED.material);
    // An operator who retypes what they were just shown hands back a token with
    // two readings: 4500 (id) or 4.5 (en). Guessing either would mint a real PR
    // for a quantity nobody typed.
    setQty(TRIMMED, '4.500');

    const refusal = screen.getByTestId('accepted-qty-refusal');
    expect(refusal).toBeInTheDocument();
    expect(refusal.textContent?.trim()).not.toBe(''); // a reason is never blank

    // THE LOAD-BEARING ASSERTION: nothing reached the spine.
    const pushBtn = screen.getByRole('button', { name: /push to pr/i });
    expect(pushBtn).toBeDisabled();
    fireEvent.click(pushBtn); // even forced, the click short-circuits
    await waitFor(() => expect(raised()).toHaveLength(0));
    expect(intakeLineStore.stateOf(TRIMMED.id)).toBe('Pending');
  });

  it('a reason cannot open the gate on an unreadable quantity — the parse gate is stronger than C6-LOCK', async () => {
    renderWithProviders(<LiveDrawer lineId={TRIMMED.id} />);
    await screen.findByText(TRIMMED.material);
    setQty(TRIMMED, '4200');
    setReason(TRIMMED, 'MRP net requirement revised down');
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeEnabled();

    // …and then the quantity becomes ambiguous. A satisfied reason-gate must not
    // carry an unreadable number through: `overrideBlocked` is never even asked.
    setQty(TRIMMED, '4.500');
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /push to pr/i }));
    await waitFor(() => expect(raised()).toHaveLength(0));
  });

  it('an UNAMBIGUOUS quantity is accepted and mints the PR at the value typed', async () => {
    const line = PLAIN;
    renderWithProviders(<LiveDrawer lineId={line.id} />);
    await screen.findByText(line.material);
    setQty(line, '190000');
    setReason(line, 'MRP net requirement revised down');
    fireEvent.click(screen.getByRole('button', { name: /push to pr/i }));

    await waitFor(() => expect(raised()).toHaveLength(1));
    // 190000 — never 190, the value `Number("190.000")` used to hand the store.
    expect(raised()[0].quantity).toBe(190_000);
  });

  it('a decimal typed in the UNAMBIGUOUS Indonesian form ("4,5") is honoured, not refused', () => {
    renderDrawer(AS_DELIVERED);
    // "4,5" is legal under ID only — EN comma-thousands needs exactly 3 digits —
    // so there is no disagreement to refuse. Refusing every separator would be
    // safe-looking and wrong; the rule is honest silence, not blanket silence.
    setQty(AS_DELIVERED, '4,5');
    expect(screen.queryByTestId('accepted-qty-refusal')).not.toBeInTheDocument();
    expect(screen.getByLabelText(`Reason — ${AS_DELIVERED.material}`)).toBeInTheDocument();
  });
});

describe('CP-0 · 2b — ZERO-COMMITMENT: a cleared field is not a zero', () => {
  it('clearing the accepted quantity REFUSES — it never pushes a PR for 0', async () => {
    renderWithProviders(<LiveDrawer lineId={TRIMMED.id} />);
    await screen.findByText(TRIMMED.material);
    // The reason is filled FIRST, while the quantity is still readable — the
    // worst case, an otherwise push-ready override.
    setQty(TRIMMED, '4200');
    setReason(TRIMMED, 'cleared by mistake');
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeEnabled();

    // `Number('')` is 0. That made a cleared field an adjusted-to-zero line: with
    // the reason already filled it pushed `quantity: 0` — and a zero on a
    // requisition is a COMMITMENT ("procure none"), typed, never defaulted.
    setQty(TRIMMED, '');
    expect(screen.getByTestId('accepted-qty-refusal')).toBeInTheDocument();
    // The reason field goes with the adjusted chip: with no readable quantity
    // there is no override to explain (Decision 3 — nothing is evaluated).
    expect(screen.queryByLabelText(`Reason — ${TRIMMED.material}`)).not.toBeInTheDocument();

    const pushBtn = screen.getByRole('button', { name: /push to pr/i });
    expect(pushBtn).toBeDisabled();
    fireEvent.click(pushBtn);
    await waitFor(() => expect(raised()).toHaveLength(0));
  });

  // ⚠️ **THIS SPEC REVERSED, AND THE REVERSAL IS A RULING RATHER THAN A
  // REGRESSION.** It read *"an ENTERED zero is still legal — only the DEFAULTED
  // zero dies"*, and it was right about the SURFACE: the parser reads '0'
  // happily, so the drawer has nothing to refuse. The SPINE now does:
  // `INTAKE_QTY_FLOOR` refuses `acceptedQty <= 0` by name, because a
  // requisition for nothing is a commitment to nothing, and no surface in this
  // product offers "procure none" as an act. So the click is no longer
  // short-circuited by the form — it is REFUSED, on the record, with a reason.
  it('an entered zero now reaches the spine and is REFUSED there, by name', async () => {
    renderWithProviders(<LiveDrawer lineId={TRIMMED.id} />);
    await screen.findByText(TRIMMED.material);
    setQty(TRIMMED, '0');
    setReason(TRIMMED, 'demand withdrawn');
    expect(screen.queryByTestId('accepted-qty-refusal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /push to pr/i }));

    await waitFor(() =>
      expect(screen.getByText(/INTAKE_QTY_FLOOR|POLICY_REJECTED/)).toBeInTheDocument(),
    );
    expect(raised()).toHaveLength(0);
    expect(intakeLineStore.stateOf(TRIMMED.id)).toBe('Pending');
  });

  it('an unreadable quantity REFUSES rather than resolving to anything', () => {
    renderDrawer(TRIMMED);
    setQty(TRIMMED, 'plenty');
    expect(screen.getByTestId('accepted-qty-refusal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /push to pr/i })).toBeDisabled();
  });
});

describe('honest markers — the drawer renders SIMULATED, green is unreachable', () => {
  it('the selected line is SIMULATED; no Live is rendered', () => {
    renderDrawer(TRIMMED);
    expect(screen.getByText(/^Simulated$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
  });
});
