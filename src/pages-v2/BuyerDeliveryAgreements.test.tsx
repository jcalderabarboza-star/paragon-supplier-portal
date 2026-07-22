import { afterEach, describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { schedulingAgreementStore } from '../services/delivery/stores/schedulingAgreementStore';
import BuyerDeliveryAgreements from './BuyerDeliveryAgreements';

// The dense, exception-first roll-up. Reads the buyer superset (default identity),
// one row per agreement-item, sorted worst-first, filterable, read-only.

const rowsText = (): string[] =>
  Array.from(document.querySelectorAll('tbody tr')).map((tr) => tr.textContent ?? '');

describe('BuyerDeliveryAgreements — at-scale exception-first roll-up', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('renders one dense row per agreement-item across the whole superset', async () => {
    renderWithProviders(<BuyerDeliveryAgreements />);
    // sa-0001 (2 items) + sa-0002 (2 items) + 7 single-item scale agreements = 11 rows.
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(11));
    // A missed exception, an on-track, and the pristine draft anchor are all present.
    expect(screen.getAllByText('ctr-010').length).toBeGreaterThan(0); // sa-1001 missed
    expect(screen.getAllByText('ctr-006').length).toBeGreaterThan(0); // sa-1003 on-track
    expect(screen.getAllByText('ctr-003').length).toBeGreaterThan(0); // pristine anchor
  });

  it('defaults to worst-first: a missed row precedes an on-track row', async () => {
    renderWithProviders(<BuyerDeliveryAgreements />);
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(11));
    const rows = rowsText();
    const missedIdx = rows.findIndex((r) => r.includes('ctr-010'));
    const onTrackIdx = rows.findIndex((r) => r.includes('ctr-006'));
    expect(missedIdx).toBeGreaterThanOrEqual(0);
    expect(missedIdx).toBeLessThan(onTrackIdx);
    // The very first row is a missed exception.
    expect(rows[0]).toContain('Missed');
  });

  it('a state tab narrows to that bucket (Missed hides the on-track row)', async () => {
    renderWithProviders(<BuyerDeliveryAgreements />);
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(11));
    fireEvent.click(screen.getByRole('tab', { name: /Missed/ }));
    await waitFor(() => expect(screen.queryByText('ctr-006')).toBeNull()); // on-track gone
    expect(screen.getAllByText('ctr-010').length).toBeGreaterThan(0); // missed stays
  });

  it('search narrows by contract / material', async () => {
    renderWithProviders(<BuyerDeliveryAgreements />);
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(11));
    fireEvent.change(screen.getByPlaceholderText(/Search supplier/), {
      target: { value: 'ctr-006' },
    });
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(1));
    expect(screen.getByText('ctr-006')).toBeTruthy();
    expect(screen.queryByText('ctr-010')).toBeNull();
  });

  it('a row opens the read-only calendar SidePanel + a deep-link to the contract', async () => {
    renderWithProviders(<BuyerDeliveryAgreements />);
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(11));
    // Click the missed row's <tr> (the contract Link stops propagation; the panel
    // opens from the row's own onClick).
    const row = Array.from(document.querySelectorAll('tbody tr')).find((tr) =>
      tr.textContent?.includes('ctr-010'),
    )!;
    fireEvent.click(row);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Release calendar')).toBeTruthy();
    expect(within(dialog).getByText('Open contract to release')).toBeTruthy();
    // Read-only: no release control (no horizon toolbar, no per-line Release button).
    expect(within(dialog).queryByText(/Transmit releases/)).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /^Release$/ })).toBeNull();
  });

  it('the roll-up SidePanel shows an inferred proposal but NO confirm control (read-only)', async () => {
    renderWithProviders(<BuyerDeliveryAgreements />);
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(11));
    // ctr-004 (sa-1002) carries inferred proximity matches — the proposal is
    // VISIBLE in the read-only quick-look, but the confirm action lives only in
    // the contract DA tab, never here.
    const row = Array.from(document.querySelectorAll('tbody tr')).find((tr) =>
      tr.textContent?.includes('ctr-004'),
    )!;
    fireEvent.click(row);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText(/proposed — matched by proximity/).length).toBeGreaterThan(0);
    expect(within(dialog).queryByRole('button', { name: /Confirm match/ })).toBeNull();
    // The governance write (edit tolerance) is likewise contract-DA-tab only.
    expect(within(dialog).queryByRole('button', { name: /Edit tolerance/ })).toBeNull();
  });

  it('is READ-ONLY: no release toolbar or per-line release control anywhere', async () => {
    renderWithProviders(<BuyerDeliveryAgreements />);
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(11));
    expect(screen.queryByText(/Transmit releases/)).toBeNull();
    expect(screen.queryByText(/Release through/)).toBeNull();
  });

  it('the pristine ctr-003 anchor reads as Draft (never a fake performance status)', async () => {
    renderWithProviders(<BuyerDeliveryAgreements />);
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(11));
    const ctr003Rows = rowsText().filter((r) => r.includes('ctr-003'));
    expect(ctr003Rows.length).toBe(2); // both items of sa-0001
    for (const row of ctr003Rows) {
      expect(row).toContain('Draft');
      expect(row).toContain('0%'); // nothing released
    }
  });
});
