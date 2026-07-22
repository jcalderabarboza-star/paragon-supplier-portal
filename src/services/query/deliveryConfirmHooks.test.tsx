import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import { schedulingAgreementStore } from '../delivery/stores/schedulingAgreementStore';
import { useDeliveryAgreements, useConfirmMatch } from './deliveryHooks';

// sup-005 owns sa-1002 (ctr-004) — a supplier who CAN see the agreement but is
// still refused the buyer-only confirm, so "refusal invalidates nothing" is a
// clean assertion (deliveredQty stays 0, not merely out-of-scope).
const SUPPLIER_005: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-005',
  supplierName: 'BASF',
};

/** A probe that reads ctr-004's agreement and can confirm seq2 of item 10. */
const Probe: React.FC = () => {
  const query = useDeliveryAgreements('ctr-004');
  const confirm = useConfirmMatch();
  const itemTen = query.data?.[0]?.items.find((iv) => iv.item.lineSeq === 10);
  const outcome = confirm.data ? (confirm.data.ok ? 'ok' : `refused:${confirm.data.reason}`) : 'idle';
  return (
    <div>
      <span data-testid="delivered">{itemTen?.ledger.deliveredQty ?? 'loading'}</span>
      <span data-testid="outcome">{outcome}</span>
      <button
        onClick={() => confirm.mutate({ agreementId: 'sa-1002', itemSeq: 10, releaseSeq: 2 })}
      >
        confirm
      </button>
    </div>
  );
};

describe('useConfirmMatch — invalidation re-derives the delivery read', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('a buyer confirm flips the read: deliveredQty climbs after invalidation', async () => {
    renderWithProviders(<Probe />); // default buyer identity
    await waitFor(() => expect(screen.getByTestId('delivered').textContent).toBe('0'));

    fireEvent.click(screen.getByText('confirm'));

    // The write invalidated ['delivery'] buyer scope → the query refetched and
    // re-derived deliveredQty up by seq2's confirmed qty (20,000).
    await waitFor(() => expect(screen.getByTestId('delivered').textContent).toBe('20000'));
  });

  it('a supplier persona confirm is refused: the read stays unchanged', async () => {
    renderWithProviders(<Probe />, { identity: SUPPLIER_005 }); // sup-005 owns sa-1002
    await waitFor(() => expect(screen.getByTestId('delivered').textContent).toBe('0'));

    fireEvent.click(screen.getByText('confirm'));

    // Buyer-only: the service refused (SCOPE_DENIED); onSuccess sees !ok and
    // invalidates nothing — the read holds at 0.
    await waitFor(() =>
      expect(screen.getByTestId('outcome').textContent).toBe('refused:SCOPE_DENIED'),
    );
    expect(screen.getByTestId('delivered').textContent).toBe('0');
  });
});
