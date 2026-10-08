import { afterEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER, BUYER_NAMED, BUYER_NAMED_COMPLIANCE } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { schedulingAgreementStore } from '../services/delivery/stores/schedulingAgreementStore';
import BuyerContractDetail from './BuyerContractDetail';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });

// The DA tab now writes (release) — reset the shared store between tests so a
// release in one test never leaks into another's read.
afterEach(() => schedulingAgreementStore.reset());

/**
 * Render the route.
 *
 * ⚠️ **`identity` IS A PARAMETER SINCE CALL-OFF STEP 1.** The default seat is
 * `BUYER`, whose actor is `UNATTRIBUTED` — the measured fact about this
 * platform. Every delivery VERB refuses such a seat by name (Q6: an act that
 * creates supplier-facing obligations is never recorded against nobody), so a
 * test that WRITES has to adopt a person, exactly as an operator does on the
 * identity panel. Tests that only READ keep the default and assert what they
 * always asserted.
 */
const at = (path: string, identity?: Parameters<typeof renderWithProviders>[1] extends
  | { identity?: infer I }
  | undefined
  ? I
  : never) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/contracts/:id" element={<BuyerContractDetail />} />
    </Routes>,
    { route: path, ...(identity ? { identity } : {}) },
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

  // ⚠️ OPS-3 — REWRITTEN ON PURPOSE, AND WHAT IT USED TO ASSERT WAS NEVER TRUE.
  // It rendered ctr-013 as an UNATTRIBUTED seat, clicked Release on a draft line
  // dated 2026-04-01, and waited for "one fewer Release button". Both of that
  // line's refusals applied — the seat names nobody, and the date has gone — so
  // nothing was ever released. The count dropped to one only while the clicked
  // button read "Releasing…", and `waitFor` caught that moment. The store was
  // never read. It is now two specs: the past-dated lines offer no Release at
  // all, and a real release is driven on a line that can take one and read back
  // from the store.
  it('a past-dated draft line offers no Release — it says the date has passed, and keeps Adjust', async () => {
    at('/buyer/contracts/ctr-013', BUYER_NAMED);
    await screen.findByText(/CTR-2026-021/);
    fireEvent.click(screen.getByRole('tab', { name: /Delivery Agreements/ }));
    // sa-0002 item A: seqs 1–2 are DRAFT and dated before the declared present.
    expect(await screen.findByTestId('delivery-past-draft-1')).toHaveTextContent(
      'Date has passed — adjust the date first',
    );
    expect(screen.getByTestId('delivery-past-draft-2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Release' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Adjust' })).toHaveLength(2);
  });

  it('⚠️ an item whose ONLY drafts are past-dated still shows its action column — that is where Adjust lives', async () => {
    // A mutation probe found this unasserted: on ctr-013 the column also shows
    // for an unrelated reason (a match awaits confirmation), so dropping the
    // past-draft clause changed nothing there. ctr-002 (sa-1005) is all-draft
    // with nothing to confirm; every date is moved into the past here, so the
    // column can only be showing because of those drafts.
    schedulingAgreementStore.update('sa-1005', (a) => ({
      ...a,
      items: a.items.map((i) => ({
        ...i,
        scheduleLines: i.scheduleLines.map((l) => ({ ...l, releaseDate: '2026-07-01' })),
      })),
    }));
    at('/buyer/contracts/ctr-002', BUYER_NAMED);
    fireEvent.click(await screen.findByRole('tab', { name: /Delivery Agreements/ }));
    expect(await screen.findAllByTestId(/^delivery-past-draft-/)).toHaveLength(4);
    expect(screen.getAllByRole('button', { name: 'Adjust' })).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Release' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm match' })).not.toBeInTheDocument();
  });

  it('a buyer can release a draft line that is not past — the STORE shows it released', async () => {
    // ctr-005 (sa-1006): seq 4 is DRAFT and due after the declared present.
    const lineOf = () =>
      schedulingAgreementStore
        .all()
        .find((a) => a.id === 'sa-1006')!
        .items[0].scheduleLines.find((l) => l.releaseSeq === 4)!;
    expect(lineOf().state).toBe('draft');
    at('/buyer/contracts/ctr-005', BUYER_NAMED);
    fireEvent.click(await screen.findByRole('tab', { name: /Delivery Agreements/ }));
    const release = await screen.findAllByRole('button', { name: 'Release' });
    expect(release).toHaveLength(1);
    fireEvent.click(release[0]);
    await waitFor(() => expect(lineOf().state).toBe('released'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Release' })).not.toBeInTheDocument(),
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
    // A NAMED seat: `t_delivery_policy_set` refuses an unattributed one.
    at('/buyer/contracts/ctr-004', BUYER_NAMED_COMPLIANCE);
    fireEvent.click(await screen.findByRole('tab', { name: /Delivery Agreements/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Edit tolerance/ }));
    // ⚠️ **IT TIGHTENS NOW, AND IT TYPES A NUMBER RATHER THAN CLICKING A
    // PRESET (call-off step 1).** This used to click `Reference only
    // (unlimited)` — the widest band and the weakest mode, a loosening on both
    // knobs — which `SAMPLE_ACTOR_CANNOT_LOOSEN` refuses for a sample identity,
    // and every identity this platform can offer is one. The other preset is
    // sa-1002's CURRENT policy, so clicking it would be refused as a no-op. So
    // the walk types a tighter percentage, which is what an operator does when
    // neither quick-pick is what they want.
    //
    // **The assertion under test is unchanged**: a saved edit re-derives the
    // deviation detail against the IMMUTABLE contract default.
    fireEvent.change(screen.getByLabelText(/Tolerance/i), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText(/Why is this tolerance changing/), {
      target: { value: 'tighten the envelope for Q3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save tolerance' }));
    // Re-derive: the deviation detail names the IMMUTABLE contract default, and
    // the policy chip states the NEW governed threshold.
    expect(await screen.findByText(/Deviates from contract default/)).toBeInTheDocument();
    expect(screen.getByText(/Governed — flag over 2%/)).toBeInTheDocument();
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
