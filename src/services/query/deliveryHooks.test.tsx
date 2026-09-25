import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER, BUYER_NAMED } from '../../test/test-utils';
import { DECLARED_PRESENT } from '../data/fixturePresent';
import { schedulingAgreementStore } from '../delivery/stores/schedulingAgreementStore';
import { useDeliveryAgreements, useReleaseLines } from './deliveryHooks';

//
// ⚠️ **TWO THINGS CHANGED AT CALL-OFF STEP 1, AND THE SPEC ADOPTS BOTH RATHER
// THAN WORKING AROUND EITHER.** (1) The seat must NAME A PERSON — every
// delivery verb refuses an unattributed one (Q6), so the probe renders under
// `BUYER_NAMED` exactly as an operator adopts a sample user on the identity
// panel. (2) A BACK-DATED line cannot be released, so the probe points at a
// future-dated line of the same item instead of seq 1.

/** A probe that reads ctr-003's agreement and can release a RELEASABLE line of item 10. */
const Probe: React.FC = () => {
  const query = useDeliveryAgreements('ctr-003');
  const release = useReleaseLines();
  const itemTen = query.data?.[0]?.items.find((iv) => iv.item.lineSeq === 10);
  // The first line the back-dating guard will admit — derived, never a literal
  // seq: which one is future is a fact about the fixture and the declared
  // present, not something a probe should remember.
  const seq = itemTen?.item.scheduleLines.find(
    (l) => l.state === 'draft' && l.releaseDate >= DECLARED_PRESENT,
  )?.releaseSeq;
  const outcome = release.isError
    ? 'error'
    : release.data
      ? release.data.ok
        ? 'ok'
        : `refused:${release.data.reason}`
      : 'idle';
  return (
    <div>
      <span data-testid="released">{itemTen?.ledger.releasedQty ?? 'loading'}</span>
      <span data-testid="outcome">{outcome}</span>
      <button
        onClick={() =>
          release.mutate({ agreementId: 'sa-0001', itemSeq: 10, selection: { releaseSeqs: [seq ?? 1] } })
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
    renderWithProviders(<Probe />, { identity: BUYER_NAMED }); // a NAMED buyer seat
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

    // ⚠️ Buyer-only, and the refusal now comes from the dispatcher's SCOPE gate
    // — which THROWS rather than returning, so the mutation lands in `error`
    // instead of `data`. `onSuccess` never runs, nothing is invalidated, and the
    // read holds at 0: the claim is identical, asserted at the new mechanism.
    await waitFor(() => expect(screen.getByTestId('outcome').textContent).toBe('error'));
    expect(screen.getByTestId('released').textContent).toBe('0');
  });
});
