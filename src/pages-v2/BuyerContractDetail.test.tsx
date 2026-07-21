import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerContractDetail from './BuyerContractDetail';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });

const at = (path: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/contracts/:id" element={<BuyerContractDetail />} />
    </Routes>,
    { route: path },
  );

describe('BuyerContractDetail — nested contract detail route', () => {
  it('resolves a real contract and shows the Overview + tab strip', async () => {
    at('/buyer/contracts/ctr-013');
    // Title carries the contract number; the three tabs render.
    expect(await screen.findByText(/CTR-2026-021/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Delivery Agreements/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Documents/ })).toBeInTheDocument();
  });

  it('the Delivery Agreements tab renders the per-contract drawdown (demo states)', async () => {
    at('/buyer/contracts/ctr-013');
    await screen.findByText(/CTR-2026-021/);
    fireEvent.click(screen.getByRole('tab', { name: /Delivery Agreements/ }));
    // The SIMULATED honesty marker + the demo material + a derived exception state.
    expect(await screen.findByText(/Read-only, simulated feed\./)).toBeInTheDocument();
    expect(await screen.findAllByText('PK-PETB-8810')).not.toHaveLength(0);
    expect(await screen.findByText('Missed')).toBeInTheDocument();
  });

  it('ctr-003 stays the pristine all-draft zero-state', async () => {
    at('/buyer/contracts/ctr-003');
    await screen.findByText(/CTR-2025-018/);
    fireEvent.click(screen.getByRole('tab', { name: /Delivery Agreements/ }));
    // All-draft ⇒ the honest "nothing transmitted" note, no fulfillment.
    expect(
      await screen.findByText(/Drafted — no releases transmitted yet\./),
    ).toBeInTheDocument();
  });

  it('an unknown contract id renders the real 404', async () => {
    at('/buyer/contracts/ctr-does-not-exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });

  it('error: a failing read surfaces the ErrorState', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/buyer/contracts/:id" element={<BuyerContractDetail />} />
      </Routes>,
      { route: '/buyer/contracts/ctr-013', service: alwaysFails },
    );
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });
});

describe('BuyerContractDetail — per-contract delivery scoping', () => {
  it('a contract with no agreement shows the empty-DA note, not the demo', async () => {
    // ctr-001 (sup-001) has no scheduling agreement — the DA tab is empty and the
    // demo (sa-0002, ctr-013) must NOT leak into it.
    at('/buyer/contracts/ctr-001');
    await screen.findByText(/CTR-2026-001/);
    fireEvent.click(screen.getByRole('tab', { name: /Delivery Agreements/ }));
    expect(
      await screen.findByText(/No delivery agreements for this contract yet\./),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('PK-PETB-8810')).not.toBeInTheDocument(),
    );
  });
});
