import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/test-utils';
import BuyerCommHub from './BuyerCommHub';
import { useUnifiedChase } from '../services/query/chaseHooks';
import { useConsolidationRows } from '../services/query/sdcBuyerHooks';
import { useSuppliers } from '../services/query/hooks';
import { outboundRequestStore, channelProvenanceStore } from '../services/channel';
import { makeProvenanceRef } from '../services/channel/types';
import { openSubmissionSession } from '../services/sdc';
import type { SupplierChaseView } from '../services/chase';

// The three data hooks are mocked so the outbound-queue derivation runs over
// crafted inputs (deterministic status + worst-first ordering). The real-fixture
// mount is covered by allRoutes.smoke. outboundRequestStore keeps its SIMULATED
// seed (sup-005 whatsapp @ 08-18, sup-007 email @ 08-19).
vi.mock('../services/query/chaseHooks', () => ({ useUnifiedChase: vi.fn() }));
// useConsolidationRows drives the outbound fold; useInventoryRecord is the C4d
// triage panel's write hook — stubbed here (its REAL dispatch is covered in
// BuyerChannelTriage.test.tsx), so this page test stays focused on the reads.
vi.mock('../services/query/sdcBuyerHooks', () => ({
  useConsolidationRows: vi.fn(),
  useInventoryRecord: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ status: 'done', entityId: 'inv-x', correlationId: 'c' }),
    isPending: false,
  })),
}));
vi.mock('../services/query/hooks', () => ({ useSuppliers: vi.fn() }));

const view = (
  supplierId: string,
  overallSeverity: SupplierChaseView['overallSeverity'],
): SupplierChaseView => ({
  supplierId,
  dataReasons: [],
  commitmentEntries: [],
  overallSeverity,
  chaseCount: 1,
});

// A minimal consolidation row carrying only what foldReplies reads
// (line.supplierId + state.response.submittedAt). The array is cast to the hook's
// return type at the call site, so this plain shape is sufficient.
const reply = (supplierId: string, submittedAt: string) => ({
  id: `${supplierId}-row`,
  line: { supplierId },
  state: { kind: 'confirmed-full', response: { submittedAt }, carriedForward: false },
});

const chaseResult = (data: SupplierChaseView[], over: Partial<{ isPending: boolean; isError: boolean }> = {}) =>
  ({ data, isPending: false, isError: false, error: null, refetch: vi.fn(), ...over }) as unknown as ReturnType<
    typeof useUnifiedChase
  >;

beforeEach(() => {
  outboundRequestStore.reset();
  channelProvenanceStore.reset();
  vi.mocked(useSuppliers).mockReturnValue({
    data: {
      items: [
        { id: 'sup-002', name: 'PT Alpha' },
        { id: 'sup-005', name: 'PT Beta' },
        { id: 'sup-007', name: 'PT Sample Packaging Indonesia' },
      ],
    },
  } as unknown as ReturnType<typeof useSuppliers>);
  vi.mocked(useConsolidationRows).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useConsolidationRows>);
  vi.mocked(useUnifiedChase).mockReturnValue(chaseResult([]));
});

afterEach(() => {
  outboundRequestStore.reset();
  channelProvenanceStore.reset();
  vi.clearAllMocks();
});

describe('BuyerCommHub — the buyer/planner Communication Hub (C4a)', () => {
  it('renders the Communication Hub header and honest framing', () => {
    renderWithProviders(<BuyerCommHub />);
    expect(screen.getAllByText('Communication Hub').length).toBeGreaterThan(0);
    expect(screen.getByText('No live channel — nothing is sent from here.')).toBeInTheDocument();
  });

  it('shows the SIMULATED liveness marker and NO fabricated channel chrome', () => {
    renderWithProviders(<BuyerCommHub />);
    // Honest amber "Sample" marker (LivenessRegistry two-gate).
    expect(screen.getAllByText('Sample').length).toBeGreaterThan(0);
    // None of the retired mock's dishonest chrome survives.
    expect(screen.queryByText(/360dialog/i)).not.toBeInTheDocument();
    expect(screen.queryByText('✓✓')).not.toBeInTheDocument();
    expect(screen.queryByText(/🟢/)).not.toBeInTheDocument();
  });

  it('derives composed / awaiting / stale and renders them worst-first', () => {
    // sup-005 (hard) has a seed ask + a fresh reply → awaiting.
    // sup-002 (hard) has no ask → composed.
    // sup-007 (soft) has a seed ask + no reply → stale.
    vi.mocked(useUnifiedChase).mockReturnValue(
      chaseResult([view('sup-005', 'hard'), view('sup-002', 'hard'), view('sup-007', 'soft')]),
    );
    vi.mocked(useConsolidationRows).mockReturnValue({
      data: [reply('sup-005', '2026-08-24T09:00:00.000Z')],
    } as unknown as ReturnType<typeof useConsolidationRows>);

    renderWithProviders(<BuyerCommHub />);

    // All three derived statuses render.
    expect(screen.getByText('Awaiting reply')).toBeInTheDocument();
    expect(screen.getByText('To compose')).toBeInTheDocument();
    expect(screen.getByText('No reply yet')).toBeInTheDocument();

    // Worst-first: hard group first (composed before awaiting by status rank),
    // soft last → PT Alpha (hard/composed), PT Beta (hard/awaiting), PT Sample Packaging (soft/stale).
    const rows = screen.getAllByTestId('commhub-outbound-row');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('PT Alpha')).toBeInTheDocument();
    expect(within(rows[1]).getByText('PT Beta')).toBeInTheDocument();
    expect(within(rows[2]).getByText('PT Sample Packaging Indonesia')).toBeInTheDocument();
  });

  it('marks every outbound request "composed — not sent" (never sent)', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(chaseResult([view('sup-005', 'hard'), view('sup-007', 'soft')]));
    renderWithProviders(<BuyerCommHub />);
    const rows = screen.getAllByTestId('commhub-outbound-row');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(within(row).getByText('Composed — not sent')).toBeInTheDocument();
    }
  });

  it('shows an honest empty state when the chase is clear', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(chaseResult([]));
    renderWithProviders(<BuyerCommHub />);
    expect(screen.getByText('No outstanding requests — the chase is clear.')).toBeInTheDocument();
  });

  it('provenance: shows an honest empty state when nothing is channel-sourced yet', () => {
    renderWithProviders(<BuyerCommHub />);
    const section = screen.getByTestId('commhub-provenance');
    expect(within(section).getByText(/No channel-sourced submissions recorded yet/)).toBeInTheDocument();
  });

  it('provenance: joins a recorded channel reply into the audit trail', () => {
    const session = openSubmissionSession('ss-cm', 'sup-007', '2026-08-25T12:00:00.000Z');
    session.attempt('InventoryDeclaration', 'inv-1', 'corr-9');
    channelProvenanceStore.append(makeProvenanceRef('cm-777', session.envelope()));

    renderWithProviders(<BuyerCommHub />);
    const rows = screen.getAllByTestId('commhub-provenance-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('cm-777')).toBeInTheDocument();
    expect(within(rows[0]).getByText('corr-9')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Recorded')).toBeInTheDocument();
  });

  it('the C4a deep-link is gone; the C4d in-place triage panel replaces it (supplier binding first)', () => {
    renderWithProviders(<BuyerCommHub />);
    // The old honest deep-link to the supplier Channel Inbox is retired.
    expect(screen.queryByRole('link', { name: /Open Channel Inbox/i })).not.toBeInTheDocument();
    // The in-place triage panel is present, gated on picking a supplier FIRST.
    const triage = screen.getByTestId('commhub-triage');
    expect(within(triage).getByTestId('triage-supplier')).toBeInTheDocument();
    // Before a supplier is picked there is no message field and no confirm action.
    expect(within(triage).queryByTestId('triage-message')).not.toBeInTheDocument();
    expect(within(triage).queryByTestId('triage-confirm')).not.toBeInTheDocument();
    // And there is NEVER a free supplierId text field — the subject is picked.
    expect(within(triage).queryByLabelText(/supplier id/i)).not.toBeInTheDocument();
  });

  it('recording via the in-place panel adds a row to the Channel-sourced submissions trail', async () => {
    renderWithProviders(<BuyerCommHub />);
    // Empty audit trail to begin.
    expect(within(screen.getByTestId('commhub-provenance')).getByText(/No channel-sourced submissions/)).toBeInTheDocument();
    // Bind the subject, paste, parse, map the material, confirm.
    fireEvent.change(screen.getByTestId('triage-supplier'), { target: { value: 'sup-007' } });
    fireEvent.change(screen.getByTestId('triage-message'), { target: { value: 'STOK PK-PETB-8810 2400 KG' } });
    fireEvent.click(screen.getByTestId('triage-parse'));
    const mat = (await screen.findByTestId('triage-mat-0')) as HTMLSelectElement;
    await waitFor(() => expect(within(mat).getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(mat, { target: { value: 'PK-PETB-8810' } });
    fireEvent.click(screen.getByTestId('triage-confirm'));
    // The onRecorded refresh re-reads the append-only store → a provenance row shows.
    await waitFor(() => expect(screen.getAllByTestId('commhub-provenance-row').length).toBe(1));
    expect(within(screen.getByTestId('commhub-provenance')).getByText('Recorded')).toBeInTheDocument();
  });

  it('renders the loading state while the chase read is pending', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(chaseResult([], { isPending: true }));
    renderWithProviders(<BuyerCommHub />);
    expect(screen.queryByText('No live channel — nothing is sent from here.')).not.toBeInTheDocument();
  });

  it('renders the error state when the chase read throws', () => {
    vi.mocked(useUnifiedChase).mockReturnValue(chaseResult([], { isError: true }));
    renderWithProviders(<BuyerCommHub />);
    expect(screen.getByText('Unable to load this page')).toBeInTheDocument();
  });
});
