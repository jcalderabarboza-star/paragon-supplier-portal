import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { schedulingAgreementStore } from '../services/delivery/stores/schedulingAgreementStore';
import { mockDataService } from '../services/data/mock/mockDataService';
import type { QueryScope } from '../services/data/types';
import SupplierDeliveryAgreements from './SupplierDeliveryAgreements';
import { shapeObligations } from '../services/chase';
import { deriveAgreementView } from '../services/delivery';
import { SCHEDULING_AGREEMENT_DEMO, DELIVERY_DEMO_SHIPMENTS } from '../services/delivery/demoFixtures';
import { SCHEDULING_AGREEMENT_CTR003 } from '../services/delivery/fixtures';
import { SDC_SIMULATED_NOW } from '../services/sdc';

// The supplier's own-facts-only delivery mirror. Reads sup-007's OWN agreements
// (sa-0001 pristine + sa-0002 rich) via the identity-scoped hook — own-only by
// construction. Read-only: no release / confirm / policy-edit control renders.

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null };

describe('SupplierDeliveryAgreements — own-facts-only read-only mirror', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it("renders the supplier's own agreements (sa-0001 pristine + sa-0002 rich)", async () => {
    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    // sup-007 owns both — the material codes of sa-0001 / sa-0002 render.
    await waitFor(() => expect(screen.getAllByText('PK-PETB-8810').length).toBeGreaterThan(0));
    expect(screen.getAllByText('PK-CAPF-8820').length).toBeGreaterThan(0);
    // The pristine anchor's honest all-draft note.
    expect(screen.getAllByText(/Drafted — no releases transmitted yet/).length).toBeGreaterThan(0);
  });

  it('is READ-ONLY — no Edit tolerance / Release / Confirm control anywhere', async () => {
    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    await waitFor(() => expect(screen.getAllByText('PK-PETB-8810').length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: /Edit tolerance/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Release$/ })).toBeNull();
    expect(screen.queryByText(/Transmit releases/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Confirm match/ })).toBeNull();
  });

  it('shows the Sample marker + the read-only callout (honest chrome)', async () => {
    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    await waitFor(() => expect(screen.getAllByText('PK-PETB-8810').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Sample/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Releasing schedules and confirming deliveries are Paragon's actions/),
    ).toBeTruthy();
  });

  it('uses the supplier-facing proposed gloss on an inferred match (never the buyer wording)', async () => {
    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    await waitFor(() => expect(screen.getAllByText('PK-PETB-8810').length).toBeGreaterThan(0));
    // sa-0002 item B carries an inferred over-delivery — the supplier sees the
    // "awaiting Paragon confirmation" gloss, NEVER the buyer's "matched by proximity".
    expect(
      screen.getAllByText(/proposed — awaiting Paragon confirmation/).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/matched by proximity/)).toBeNull();
  });

  it('shows the tolerance MODE chip but HIDES the buyer-internal deviation history', async () => {
    // Seed a genuine deviation the production way — a buyer re-points sa-0002 item
    // 10's active tolerance (25% ≠ the 10% contract default). The supplier must see
    // the resulting MODE, never the contract-default / date / reason behind it.
    const res = await mockDataService.delivery.editPolicy(buyerScope, 'sa-0002', 10, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: 'buyer Q3 widen',
    });
    expect(res.ok).toBe(true);

    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    await waitFor(() => expect(screen.getAllByText('PK-PETB-8810').length).toBeGreaterThan(0));
    // The MODE chip stays — the supplier sees the tolerance that applies to them.
    expect(screen.getAllByText(/Governed — flag over 25%/).length).toBeGreaterThan(0);
    // The deviation marker + detail (contract default / date / reason) are hidden.
    expect(screen.queryByText(/Active policy changed from contract default/)).toBeNull();
    expect(screen.queryByText(/Deviates from contract default/)).toBeNull();
    expect(screen.queryByText(/buyer Q3 widen/)).toBeNull();
  });

  // ── CP-0 · W1 · 2f-d — the governed chip must state the ACTUAL threshold ────
  //
  // The chip was `Math.round(pct * 100)`, so a 2.5% tolerance rendered "3%" — a
  // governed threshold that is not the governed threshold, on the supplier's own
  // view of the rule that binds them. Pre-existing, but 2f-d is what made a
  // fractional tolerance enterable in the platform's DEFAULT locale (the id-ID
  // "2,5" that `type="number"` used to eat), so leaving it would have shipped
  // this batch's capability gain alongside a wrong number on screen.
  it('states a FRACTIONAL tolerance exactly — 2.5%, never rounded to 3%', async () => {
    const res = await mockDataService.delivery.editPolicy(buyerScope, 'sa-0002', 10, {
      tolerancePct: 0.025,
      enforcement: 'flag',
      reason: 'tighten to 2.5% for Q4',
    });
    expect(res.ok).toBe(true);

    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    await waitFor(() => expect(screen.getAllByText('PK-PETB-8810').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Governed — flag over 2\.5%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Governed — flag over 3%/)).toBeNull();
  });

  it('states a float-artefact tolerance cleanly — 7%, never 7.000000000000001%', async () => {
    // The other half of the same tidy: `0.07 * 100` is 7.000000000000001 in
    // IEEE 754, so an unrounded `${frac * 100}` would leak the artefact onto the
    // chip. Rounding fixed that and broke 2.5%; the 4-dp tidy fixes both.
    const res = await mockDataService.delivery.editPolicy(buyerScope, 'sa-0002', 10, {
      tolerancePct: 0.07,
      enforcement: 'flag',
      reason: 'seven percent',
    });
    expect(res.ok).toBe(true);

    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    await waitFor(() => expect(screen.getAllByText('PK-PETB-8810').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Governed — flag over 7%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/7\.0000/)).toBeNull();
  });

  it('a buyer (no supplier identity) gets the NoSupplierIdentity guard', async () => {
    renderWithProviders(<SupplierDeliveryAgreements />); // default buyer identity
    await waitFor(() => expect(screen.getByText(/No supplier identity in session/)).toBeTruthy());
  });
});

// ─── SDC-5e — the supplier's own obligations section ──────────────────────────

describe('shapeObligations (SDC-5e) — own-facing, drift-omitted', () => {
  const demoView = () =>
    deriveAgreementView(SCHEDULING_AGREEMENT_DEMO, DELIVERY_DEMO_SHIPMENTS, SDC_SIMULATED_NOW, 'PT Berlina');

  it('maps sa-0002 into own-facing overdue + upcoming, OVERDUE-first, drift dropped', () => {
    const obligations = shapeObligations([demoView()], SDC_SIMULATED_NOW);
    // sa-0002 item A: seq4 late + seq5 missed → 2 overdue; seq6 pending (in window) → 1 upcoming.
    const overdue = obligations.filter((o) => o.kind === 'overdue');
    const upcoming = obligations.filter((o) => o.kind === 'upcoming');
    expect(overdue).toHaveLength(2);
    expect(upcoming).toHaveLength(1);
    // Overdue sorts before upcoming.
    expect(obligations[0].kind).toBe('overdue');
    expect(obligations[obligations.length - 1].kind).toBe('upcoming');
    // Drift is never an obligation kind (buyer-side pattern judgment omitted).
    expect(obligations.every((o) => o.kind === 'overdue' || o.kind === 'upcoming')).toBe(true);
  });

  it('an all-draft agreement (ctr-003) yields NO obligations (the honest all-clear)', () => {
    const view = deriveAgreementView(SCHEDULING_AGREEMENT_CTR003, [], SDC_SIMULATED_NOW, 'PT Berlina');
    expect(shapeObligations([view], SDC_SIMULATED_NOW)).toEqual([]);
  });
});

describe('SupplierDeliveryAgreements — the obligations section (render)', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('renders own overdue + upcoming deliveries in own-facing tone', async () => {
    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    const section = await screen.findByTestId('supplier-obligations');
    expect(within(section).getAllByText('Overdue').length).toBeGreaterThan(0);
    expect(within(section).getAllByText('Upcoming').length).toBeGreaterThan(0);
    // The own-facing gloss (never "you are being chased").
    expect(within(section).getAllByText(/Paragon is waiting on this delivery/).length).toBeGreaterThan(0);
    expect(within(section).getByText(/Paragon is expecting this delivery/)).toBeTruthy();
  });

  it('NO buyer chase vocabulary leaks onto the supplier surface', async () => {
    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    await screen.findByTestId('supplier-obligations');
    // None of the buyer chase words may appear anywhere on the supplier page.
    for (const word of [/\bchase\b/i, /\bnudge\b/i, /non-compliance/i, /\bdrift\b/i, /\bUrgent\b/, /\bAdvisory\b/]) {
      expect(screen.queryByText(word)).toBeNull();
    }
  });

  it('the obligations are own-only — never another supplier’s material (isolation)', async () => {
    renderWithProviders(<SupplierDeliveryAgreements />, { identity: SUPPLIER });
    const section = await screen.findByTestId('supplier-obligations');
    // sup-007's obligations are its own (PK-PETB-8810); another supplier's codes
    // (sa-1002 sup-005 AI-NIAC-6601, sa-1007 sup-006 RM-EMUL-3310) never appear.
    expect(within(section).getAllByText('PK-PETB-8810').length).toBeGreaterThan(0);
    expect(within(section).queryByText('AI-NIAC-6601')).toBeNull();
    expect(within(section).queryByText('RM-EMUL-3310')).toBeNull();
  });
});
