import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import { schedulingAgreementStore } from '../delivery/stores/schedulingAgreementStore';
import { useDeliveryAgreements, useReleaseLines } from './deliveryHooks';

/** A probe that reads ctr-003's agreement and can release seq 1 of item 10. */
const Probe: React.FC = () => {
  const query = useDeliveryAgreements('ctr-003');
  const release = useReleaseLines();
  const itemTen = query.data?.[0]?.items.find((iv) => iv.item.lineSeq === 10);
  const outcome = release.data ? (release.data.ok ? 'ok' : `refused:${release.data.reason}`) : 'idle';
  return (
    <div>
      <span data-testid="released">{itemTen?.ledger.releasedQty ?? 'loading'}</span>
      <span data-testid="outcome">{outcome}</span>
      <button
        onClick={() =>
          release.mutate({ agreementId: 'sa-0001', itemSeq: 10, selection: { releaseSeqs: [1] } })
        }
      >
        release
      </button>
    </div>
  );
};

describe('useReleaseLines — invalidation re-derives the delivery read', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('a buyer release flips the read: releasedQty climbs after invalidation', async () => {
    renderWithProviders(<Probe />); // default buyer identity
    await waitFor(() => expect(screen.getByTestId('released').textContent).toBe('0'));

    fireEvent.click(screen.getByText('release'));

    // The write invalidated ['delivery'] buyer scope → the query refetched and
    // re-derived releasedQty up by seq1's plannedQty (180,000).
    await waitFor(() => expect(screen.getByTestId('released').textContent).toBe('180000'));
  });

  it('a supplier persona release is refused: the read stays unchanged', async () => {
    renderWithProviders(<Probe />, { identity: SUPPLIER }); // sup-007 owns sa-0001
    await waitFor(() => expect(screen.getByTestId('released').textContent).toBe('0'));

    fireEvent.click(screen.getByText('release'));

    // Buyer-only: the service refused (SCOPE_DENIED); onSuccess sees !ok and
    // invalidates nothing — the read holds at 0.
    await waitFor(() =>
      expect(screen.getByTestId('outcome').textContent).toBe('refused:SCOPE_DENIED'),
    );
    expect(screen.getByTestId('released').textContent).toBe('0');
  });
});
