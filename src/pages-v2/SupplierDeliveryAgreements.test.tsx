import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { schedulingAgreementStore } from '../services/delivery/stores/schedulingAgreementStore';
import { mockDataService } from '../services/data/mock/mockDataService';
import type { QueryScope } from '../services/data/types';
import SupplierDeliveryAgreements from './SupplierDeliveryAgreements';

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

  it('a buyer (no supplier identity) gets the NoSupplierIdentity guard', async () => {
    renderWithProviders(<SupplierDeliveryAgreements />); // default buyer identity
    await waitFor(() => expect(screen.getByText(/No supplier identity in session/)).toBeTruthy());
  });
});
