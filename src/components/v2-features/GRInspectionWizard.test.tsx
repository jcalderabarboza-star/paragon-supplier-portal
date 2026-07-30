import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { mockShipments } from '../../data/mockShipments';
import { asnStore } from '../../services/data/mock/stores/asnStore';
import GRInspectionWizard from './GRInspectionWizard';

// ────────────────────────────────────────────────────────────────────────────
// GRInspectionWizard (CP-0 · W1 · 2f-a) — the FIRST spec this wizard has ever
// had. It posts goods receipts, and it was previously uncovered entirely, which
// is how a bare `Number(e.target.value)` on the quantity closest to inventory
// truth survived the whole locale cutover.
//
// THE DURABLE LOCK IS THE INPUT CONTRACT (the 4b lesson, 4b-FIND-01). A
// behavioural spec typing "1.500" would pass over a broken surface, because
// jsdom does no locale parsing and en-US `type="number"` returns some tokens
// verbatim. `type="text"` + `inputMode` is the property whose absence caused the
// defect, and it is locale-independent and jsdom-visible. The behavioural specs
// stack on top of it.
// ────────────────────────────────────────────────────────────────────────────

// A shipment the wizard actually offers: only 'At Dock' / 'Unloading' are
// eligible GR sources (ELIGIBLE_STATUSES), and it must carry a line to inspect.
const RECEIVABLE = mockShipments.find(
  (s) =>
    (s.status === 'At Dock' || s.status === 'Unloading') && s.lineItems.length > 0,
)!;

const renderWizard = () => {
  asnStore.reset();
  return renderWithProviders(
    <GRInspectionWizard
      onClose={() => {}}
      onComplete={() => {}}
      shipments={mockShipments}
      asns={[...asnStore.all()]}
    />,
  );
};

/** Reach step 2 (the inspection lines) by picking the first dock source. */
const openLines = async () => {
  renderWizard();
  fireEvent.click(await screen.findByText(RECEIVABLE.asnNumber));
  fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  const code = RECEIVABLE.lineItems[0].materialCode;
  return {
    received: await screen.findByLabelText(`Received quantity for ${code}`),
    accepted: screen.getByLabelText(`Accepted quantity for ${code}`),
  };
};

describe('GRInspectionWizard — the quantity inputs are text, so the parser is load-bearing', () => {
  it('THE LOCK — neither quantity input is type="number" (Ruling 6.2)', async () => {
    const { received, accepted } = await openLines();
    expect(received).toHaveAttribute('type', 'text');
    expect(accepted).toHaveAttribute('type', 'text');
    expect(received).toHaveAttribute('inputmode', 'decimal');
    expect(accepted).toHaveAttribute('inputmode', 'decimal');
    // `min`/`max` went with the number-input contract; `received >= 0` and
    // `accepted <= received` are enforced in `receiptValid`, where they are
    // actually checked. An attribute that vanishes with the type was never the
    // guarantee (the 2e-b-4b precedent).
    expect(received).not.toHaveAttribute('min');
    expect(accepted).not.toHaveAttribute('max');
  });

  it('POSITIVE TWIN — the form opens on its seeded values with NO refusal', async () => {
    // The IntakeAdjustDrawer trap: a grouped seed would make the form refuse its
    // own untouched default. Nothing is refused before anyone types.
    const { received } = await openLines();
    expect(received).toHaveValue(String(RECEIVABLE.lineItems[0].qty));
    expect(screen.queryByTestId('gr-received-refusal-0')).not.toBeInTheDocument();
    expect(received).toHaveAttribute('aria-invalid', 'false');
  });

  it('a CLEARED received quantity refuses, and says to type 0 instead', async () => {
    const { received } = await openLines();
    fireEvent.change(received, { target: { value: '' } });

    const refusal = screen.getByTestId('gr-received-refusal-0');
    expect(refusal).toHaveAttribute('role', 'alert');
    // The whole finding: this used to become 0 and satisfy every guard.
    expect(refusal.textContent).toMatch(/enter 0/i);
    expect(received).toHaveAttribute('aria-invalid', 'true');
  });

  it('a cross-convention quantity refuses, naming the ambiguity', async () => {
    const { received } = await openLines();
    fireEvent.change(received, { target: { value: '1.500' } });
    expect(screen.getByTestId('gr-received-refusal-0').textContent).toMatch(
      /can be read two ways/i,
    );
  });

  it('the ACCEPTED half refuses independently of the received half', async () => {
    const { accepted } = await openLines();
    fireEvent.change(accepted, { target: { value: 'abc' } });
    expect(screen.getByTestId('gr-accepted-refusal-0').textContent).toMatch(
      /not a quantity/i,
    );
    // The received half is untouched and must not be blamed for it.
    expect(screen.queryByTestId('gr-received-refusal-0')).not.toBeInTheDocument();
  });

  it('a TYPED zero is accepted — nothing arrived, and it is a real assertion', async () => {
    const { received, accepted } = await openLines();
    fireEvent.change(received, { target: { value: '0' } });
    fireEvent.change(accepted, { target: { value: '0' } });
    expect(screen.queryByTestId('gr-received-refusal-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gr-accepted-refusal-0')).not.toBeInTheDocument();
    expect(received).toHaveAttribute('aria-invalid', 'false');
  });

  it('under a refusal the rejected figure is UNASKABLE — an em dash, not a product of a guess', async () => {
    const { received } = await openLines();
    fireEvent.change(received, { target: { value: '1.500' } });
    // The derived cell shows nothing rather than deriving from a value that does
    // not exist. Same principle as the receipt guard, applied to the surface.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
  // ── THE LOAD-BEARING ASSERTION ────────────────────────────────────────────
  // The field message is chrome; THIS is the fact. `receiptValid` gates step 2
  // (`stepValid(1)`), so a refusing line must make the wizard unadvanceable —
  // otherwise the refusal is decoration and a false receipt still posts.
  it('THE LOCK — a refusing line BLOCKS the wizard: Next is disabled', async () => {
    const { received } = await openLines();
    const next = () => screen.getByRole('button', { name: /Next/i });
    // POSITIVE TWIN FIRST: the seeded, readable form advances. A gate that
    // blocked everything would pass the negative below on its own.
    expect(next()).toBeEnabled();

    fireEvent.change(received, { target: { value: '' } });
    expect(next()).toBeDisabled();

    // And a TYPED zero un-blocks it — the distinction, enforced at the gate and
    // not merely at the message.
    fireEvent.change(received, { target: { value: '0' } });
    fireEvent.change(
      screen.getByLabelText(`Accepted quantity for ${RECEIVABLE.lineItems[0].materialCode}`),
      { target: { value: '0' } },
    );
    expect(next()).toBeEnabled();
  });
});
