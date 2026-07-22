import { afterEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { schedulingAgreementStore } from '../services/delivery/stores/schedulingAgreementStore';
import BuyerContractDetail from './BuyerContractDetail';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });

// The DA tab now writes (release) — reset the shared store between tests so a
// release in one test never leaks into another's read.
afterEach(() => schedulingAgreementStore.reset());

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
    // A buyer CAN release/confirm → the honest "portal writes, simulated" marker
    // (not the read-only one) + the demo material + a derived exception state.
    expect(await screen.findByText(/Portal writes — simulated\./)).toBeInTheDocument();
    expect(await screen.findAllByText('PK-PETB-8810')).not.toHaveLength(0);
    expect(await screen.findByText('Missed')).toBeInTheDocument();
  });

  it('a buyer can release a draft line — it flips to Released (portal, not SAP)', async () => {
    at('/buyer/contracts/ctr-013');
    await screen.findByText(/CTR-2026-021/);
    fireEvent.click(screen.getByRole('tab', { name: /Delivery Agreements/ }));
    // sa-0002 item A has two DRAFT lines (seqs 1–2) → two per-line Release buttons.
    const before = await screen.findAllByRole('button', { name: 'Release' });
    expect(before).toHaveLength(2);
    fireEvent.click(before[0]);
    // The write invalidates the read → re-derive → one draft became Released, so
    // one fewer per-line Release button remains.
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Release' })).toHaveLength(1),
    );
    // The honest per-line marker is present on released rows.
    expect(screen.getAllByText(/Portal release — not yet in S\/4HANA/).length).toBeGreaterThan(0);
  });

  it('a buyer can confirm an inferred match — the proposal becomes authoritative', async () => {
    // ctr-004 (sa-1002) has TWO inferred proximity matches (seq1 late, seq2 on
    // time) → two "Confirm match" buttons. Confirming one binds it authoritatively,
    // so one fewer proposal remains (deliveredQty climbs — proven at the service).
    at('/buyer/contracts/ctr-004');
    fireEvent.click(await screen.findByRole('tab', { name: /Delivery Agreements/ }));
    const before = await screen.findAllByRole('button', { name: 'Confirm match' });
    expect(before).toHaveLength(2);
    fireEvent.click(before[0]);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Confirm match' })).toHaveLength(1),
    );
  });

  it('a buyer can edit an item drawdown tolerance — the deviation surfaces', async () => {
    // ctr-004 (sa-1002) is a single Case-B item → one "Edit tolerance" control.
    at('/buyer/contracts/ctr-004');
    fireEvent.click(await screen.findByRole('tab', { name: /Delivery Agreements/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Edit tolerance/ }));
    // The reference-only preset (Case C) + a required reason, then save.
    fireEvent.click(screen.getByRole('button', { name: /Reference only/ }));
    fireEvent.change(screen.getByPlaceholderText(/Why is this tolerance changing/), {
      target: { value: 'switch to reference-only for Q3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save tolerance' }));
    // Re-derive: the deviation detail names the IMMUTABLE contract default, and the
    // policy chip flips to the un-enforced "reference envelope" mode.
    expect(await screen.findByText(/Deviates from contract default/)).toBeInTheDocument();
    expect(screen.getByText(/Reference envelope — not enforced/)).toBeInTheDocument();
  });

  it('a supplier persona sees the DA tab read-only — no release control', async () => {
    // sup-007 owns ctr-013's agreement; viewing this buyer route as a supplier
    // must NOT expose the write (the read-only honesty marker shows instead).
    renderWithProviders(
      <Routes>
        <Route path="/buyer/contracts/:id" element={<BuyerContractDetail />} />
      </Routes>,
      { route: '/buyer/contracts/ctr-013', identity: SUPPLIER },
    );
    await screen.findByText(/CTR-2026-021/);
    fireEvent.click(screen.getByRole('tab', { name: /Delivery Agreements/ }));
    expect(await screen.findByText(/Read-only, simulated feed\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Release' })).not.toBeInTheDocument();
    // None of the three writes is exposed to a supplier — no confirm, no edit either.
    expect(screen.queryByRole('button', { name: 'Confirm match' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit tolerance/ })).not.toBeInTheDocument();
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
