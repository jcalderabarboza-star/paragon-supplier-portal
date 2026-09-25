import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
// ⚠️ A NAMED SEAT SINCE CALL-OFF STEP 1 — every delivery verb refuses an
// unattributed one (Q6), so the probe adopts a sample person exactly as an
// operator does on the identity panel.
import { renderWithProviders, BUYER_NAMED_COMPLIANCE } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import { schedulingAgreementStore } from '../delivery/stores/schedulingAgreementStore';
import { useDeliveryAgreements, useEditPolicy } from './deliveryHooks';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';
import { NO_PERSON } from '../../context/noPerson';

// sup-005 owns sa-1002 (ctr-004) — a supplier who CAN see the agreement but is
// still refused the buyer-only policy-edit, so "refusal invalidates nothing" is a
// clean assertion (the deviation stays false, not merely out-of-scope).
const SUPPLIER_005: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-005',
  supplierName: 'Sample Personal Care',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

/** A probe that reads ctr-004's agreement and TIGHTENS item 10's tolerance.
 *
 *  ⚠️ **IT USED TO WIDEN, AND A WIDENING IS NOW REFUSED.**
 *  `SAMPLE_ACTOR_CANNOT_LOOSEN` (C10 §6.3a) refuses a loosening recorded
 *  against a sample identity, and every identity this platform can offer is
 *  one. The claim under test is about INVALIDATION — that a successful write
 *  re-derives the read — which any legal edit exercises. */
const Probe: React.FC = () => {
  const query = useDeliveryAgreements('ctr-004');
  const edit = useEditPolicy();
  const itemTen = query.data?.[0]?.items.find((iv) => iv.item.lineSeq === 10);
  const outcome = edit.isError
    ? 'error'
    : edit.data
      ? edit.data.ok
        ? 'ok'
        : `refused:${edit.data.reason}`
      : 'idle';
  return (
    <div>
      <span data-testid="deviation">{String(itemTen?.ledger.policyDeviation ?? 'loading')}</span>
      <span data-testid="outcome">{outcome}</span>
      <button
        onClick={() =>
          edit.mutate({
            agreementId: 'sa-1002',
            itemSeq: 10,
            patch: { tolerancePct: 0.02, enforcement: 'flag', reason: 'tighten for Q3' },
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
    renderWithProviders(<Probe />, { identity: BUYER_NAMED_COMPLIANCE }); // a NAMED buyer seat
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
await waitFor(() => expect(screen.getByTestId('outcome').textContent).toBe('error'));
    expect(screen.getByTestId('deviation').textContent).toBe('false');
  });
});
