import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import { schedulingAgreementStore } from '../delivery/stores/schedulingAgreementStore';
import { useDeliveryAgreements, useEditPolicy } from './deliveryHooks';

// sup-005 owns sa-1002 (ctr-004) — a supplier who CAN see the agreement but is
// still refused the buyer-only policy-edit, so "refusal invalidates nothing" is a
// clean assertion (the deviation stays false, not merely out-of-scope).
const SUPPLIER_005: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-005',
  supplierName: 'BASF',
};

/** A probe that reads ctr-004's agreement and can widen item 10's tolerance. */
const Probe: React.FC = () => {
  const query = useDeliveryAgreements('ctr-004');
  const edit = useEditPolicy();
  const itemTen = query.data?.[0]?.items.find((iv) => iv.item.lineSeq === 10);
  const outcome = edit.data ? (edit.data.ok ? 'ok' : `refused:${edit.data.reason}`) : 'idle';
  return (
    <div>
      <span data-testid="deviation">{String(itemTen?.ledger.policyDeviation ?? 'loading')}</span>
      <span data-testid="outcome">{outcome}</span>
      <button
        onClick={() =>
          edit.mutate({
            agreementId: 'sa-1002',
            itemSeq: 10,
            patch: { tolerancePct: 0.25, enforcement: 'flag', reason: 'widen for Q3' },
          })
        }
      >
        edit
      </button>
    </div>
  );
};

describe('useEditPolicy — invalidation re-derives the delivery read', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('a buyer edit flips the read: policyDeviation true after invalidation', async () => {
    renderWithProviders(<Probe />); // default buyer identity
    await waitFor(() => expect(screen.getByTestId('deviation').textContent).toBe('false'));

    fireEvent.click(screen.getByText('edit'));

    // The write invalidated ['delivery'] buyer scope → the query refetched and
    // re-derived the deviation (active 25% ≠ contract default 10%).
    await waitFor(() => expect(screen.getByTestId('deviation').textContent).toBe('true'));
  });

  it('a supplier persona edit is refused: the read stays unchanged', async () => {
    renderWithProviders(<Probe />, { identity: SUPPLIER_005 }); // sup-005 owns sa-1002
    await waitFor(() => expect(screen.getByTestId('deviation').textContent).toBe('false'));

    fireEvent.click(screen.getByText('edit'));

    // Buyer-only: the service refused (SCOPE_DENIED); onSuccess sees !ok and
    // invalidates nothing — the read holds at no-deviation.
    await waitFor(() =>
      expect(screen.getByTestId('outcome').textContent).toBe('refused:SCOPE_DENIED'),
    );
    expect(screen.getByTestId('deviation').textContent).toBe('false');
  });
});
