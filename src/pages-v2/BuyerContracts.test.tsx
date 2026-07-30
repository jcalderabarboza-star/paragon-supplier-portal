import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import BuyerContracts from './BuyerContracts';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Buyer-only aggregate — empty is reached by an empty contract result.
const noContracts: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getContracts') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerContracts — four honest states', () => {
  it('data: renders the contract workspace with wired reads', async () => {
    renderWithProviders(<BuyerContracts />);
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Overdue Obligations')).toBeInTheDocument();
    expect(screen.getByText('Active Contracts')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerContracts />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Overdue Obligations')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerContracts />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no contracts', async () => {
    renderWithProviders(<BuyerContracts />, { service: noContracts });
    expect(await screen.findByText('No contracts yet')).toBeInTheDocument();
  });
});

// ── CP-0 · W1 · 2f-b — the contract wizard's numerics, and why the TYPE is the
// test ───────────────────────────────────────────────────────────────────────
//
// 2f-FIND-02. Both numeric inputs were `type="number"`, so the BROWSER
// adjudicated the separators the parser exists to adjudicate — and that failure
// is invisible in this suite: en-US Chrome returns "1.500" verbatim and jsdom
// does no locale parsing at all (4b-FIND-01). A purely behavioural spec would
// therefore have gone green over a live production defect, which is exactly the
// trap 2e-b-4a's smoke caught.
//
// So the durable lock is the INPUT CONTRACT itself — `type="text"` + `inputMode`
// — because that is locale-independent and jsdom-visible. The behavioural specs
// stack on top and are honest about what they can prove.
//
// This page has NO second lock available: it reads via `useContracts()` and
// fabricates the created contract into local state (CTR-FABRICATION-01), so
// there is no dispatcher and no `requiredFields` behind the gate. These specs
// are guarding the only lock there is.
describe('BuyerContracts — the create wizard numerics are text, so the parser is load-bearing', () => {
  /** Drive the wizard to step 2 (Terms), where both numbers live. */
  const openTermsStep = async () => {
    const view = renderWithProviders(<BuyerContracts />);
    fireEvent.click(await screen.findByText('New Contract'));
    // Step 1 (Basics) gates on title + type + supplier + category.
    fireEvent.change(
      screen.getByPlaceholderText(
        'e.g. Halal Emulsifier Master Supply Agreement 2027',
      ),
      { target: { value: 'Emulsifier Master Supply 2027' } },
    );
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Supply' } });
    fireEvent.change(selects[1], { target: { value: 'Packaging' } });
    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.click(screen.getByText('Next'));
    return {
      view,
      value: await screen.findByLabelText('Total contract value (IDR)'),
      autoRenewal: screen.getByLabelText('Auto-renewal'),
    };
  };

  it('THE LOCK — the contract value is not type="number" (Ruling 6.2)', async () => {
    const { value } = await openTermsStep();
    expect(value).toHaveAttribute('type', 'text');
    expect(value).toHaveAttribute('inputmode', 'decimal');
    // `min="0"` was part of the number-input contract. Negativity is rejected by
    // `normalizeQty` as NOT_NUMERIC, where it is actually enforced.
    expect(value).not.toHaveAttribute('min');
  });

  it('THE LOCK — the notice period is not type="number" either', async () => {
    const { autoRenewal } = await openTermsStep();
    fireEvent.click(autoRenewal);
    const notice = await screen.findByLabelText('Notice required (days)');
    expect(notice).toHaveAttribute('type', 'text');
    expect(notice).toHaveAttribute('inputmode', 'decimal');
    expect(notice).not.toHaveAttribute('min');
  });

  it('POSITIVE TWIN — a readable value is accepted, raises no refusal, and ENABLES Next', async () => {
    // A negative assertion alone proves nothing: this confirms the gate still
    // opens on a good number, so the refusals below are refusals and not a wizard
    // that never advances.
    const { value } = await openTermsStep();
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2027-01-01' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2027-12-31' },
    });
    fireEvent.change(value, { target: { value: '4500000000' } });
    expect(screen.queryByTestId('contract-value-refusal')).not.toBeInTheDocument();
    expect(screen.getByText('Next')).not.toBeDisabled();
  });

  it('a cross-convention value REFUSES on the field and HOLDS the step', async () => {
    // The reading no gate could catch: `Number('1.500')` is 1.5, and `1.5 > 0`
    // passed. An Rp 1,500 commitment was stored as Rp 1.5 and rendered "Rp 2".
    const { value } = await openTermsStep();
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2027-01-01' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2027-12-31' },
    });
    fireEvent.change(value, { target: { value: '1.500' } });
    const refusal = screen.getByTestId('contract-value-refusal');
    expect(refusal).toHaveAttribute('role', 'alert');
    expect(refusal.textContent).toMatch(/can be read two ways/i);
    expect(value).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('an untouched blank value does NOT nag — it refuses at the gate instead', async () => {
    const { value } = await openTermsStep();
    expect(value).toHaveValue('');
    expect(screen.queryByTestId('contract-value-refusal')).not.toBeInTheDocument();
    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('the silent `> 0` gate finally SAYS SO on a typed zero', async () => {
    // No rule changed: `> 0` has always disabled Next here. It did it without
    // telling anyone, which is the same family of defect as a misread number.
    const { value } = await openTermsStep();
    fireEvent.change(value, { target: { value: '0' } });
    expect(screen.getByTestId('contract-value-zero').textContent).toMatch(
      /greater than zero/i,
    );
    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('a BLANK notice period refuses — the field that had no gate at all', async () => {
    // `Number('') || 0` used to mint a stated notice requirement of zero days.
    const { autoRenewal } = await openTermsStep();
    fireEvent.click(autoRenewal);
    const notice = await screen.findByLabelText('Notice required (days)');
    expect(notice).toHaveValue('90'); // the seed, ungrouped, and readable
    fireEvent.change(notice, { target: { value: '' } });
    expect(screen.getByTestId('contract-notice-refusal').textContent).toMatch(
      /not a notice period of zero days/i,
    );
  });

  it('A REFUSAL IS NEVER INVISIBLE — the notice input survives unchecking auto-renewal', async () => {
    // The dead-end this render rule exists to prevent: the draft keeps its value
    // when the box is unchecked, so a cleared field would otherwise hold step 2
    // behind an input the operator cannot see.
    const { autoRenewal } = await openTermsStep();
    fireEvent.click(autoRenewal);
    fireEvent.change(await screen.findByLabelText('Notice required (days)'), {
      target: { value: '' },
    });
    fireEvent.click(autoRenewal); // back off — the field's owner is gone
    expect(screen.getByLabelText('Notice required (days)')).toBeInTheDocument();
    expect(screen.getByTestId('contract-notice-refusal')).toBeInTheDocument();
  });

  it('an untouched wizard does NOT open in a refusing state (the seed round-trips)', async () => {
    // The IntakeAdjustDrawer trap: a grouped seed would be the exact token the
    // parser refuses, so the form would refuse its own default on sight.
    const { autoRenewal } = await openTermsStep();
    fireEvent.click(autoRenewal);
    await screen.findByLabelText('Notice required (days)');
    expect(screen.queryByTestId('contract-notice-refusal')).not.toBeInTheDocument();
  });
});
