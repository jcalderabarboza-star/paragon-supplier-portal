import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import i18n from '../lib/i18n';
import { rolesHolding } from '../services/transitions/businessRoles';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import BuyerSourcing from './BuyerSourcing';

// ────────────────────────────────────────────────────────────────────────────
// §73 — THE PAGE-LEVEL CREATES. The verb that MAKES the document, which a
// document-shaped sweep never sees because it is reachable before any row
// exists (`IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01`, §72a).
//
// Both directions on every surface: the holding seat keeps its button and gets
// NO notice, the withheld seat loses the button and reads WHOSE act it is. A
// one-sided probe would ship a guard that is wrong about what it should accept.
// ────────────────────────────────────────────────────────────────────────────

const RECEIVING: CurrentIdentity = { ...BUYER, businessRoles: ['receiving'] };
const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
const FINANCE: CurrentIdentity = { ...BUYER, businessRoles: ['finance'] };

describe('BuyerGoodsReceipt — the New GR entry is guarded on the WHOLE chain', () => {
  it('HELD: a receiving seat keeps the button, no notice', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { identity: RECEIVING });
    await screen.findByText('GR-2026-001');
    expect(screen.getByRole('button', { name: /New GR/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-gr-create')).not.toBeInTheDocument();
  });

  it('WITHHELD: a finance seat loses the button and reads the owner', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { identity: FINANCE });
    await screen.findByText('GR-2026-001');
    expect(screen.queryByRole('button', { name: /New GR/i })).not.toBeInTheDocument();
    const notice = screen.getByTestId('handoff-gr-create');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    expect(notice).toHaveTextContent('Awaiting Receiving');
  });

  it('the reads beside it are never gated — Export and Lab Results survive', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { identity: FINANCE });
    await screen.findByText('GR-2026-001');
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lab Results/i })).toBeInTheDocument();
  });

  it('⚠️ THE CHAIN AGREES TODAY — and this is the pin that says so when it stops', () => {
    // One click at the wizard's end fires t_gr_create -> t_gr_start_inspection
    // -> t_gr_post. Guarding the entry on `gr:receive` alone would be honest
    // only while all three resolve to the same owner. They do — every gr:* atom
    // sits in `receiving` and nowhere else (admin is filtered by rolesHolding,
    // because a role holding everything names nothing).
    //
    // The day someone splits `gr:inspect` into a QA role, THIS test fails and
    // the entry-notice ruling gets re-taken deliberately, instead of the button
    // quietly admitting a seat the commit will refuse.
    const chain = ['gr:receive', 'gr:inspect', 'gr:post'] as const;
    const owners = chain.map((a) => rolesHolding(a).join(','));
    expect(owners).toEqual(['receiving', 'receiving', 'receiving']);
  });
});

describe('BuyerSourcing — the New RFQ entry is guarded', () => {
  it('HELD: a procurement seat keeps the button, no notice', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    await screen.findByText('RFQ-2026-001');
    expect(screen.getByRole('button', { name: /New RFQ/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-create')).not.toBeInTheDocument();
  });

  it('WITHHELD: a receiving seat loses the button and reads the owner', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await screen.findByText('RFQ-2026-001');
    expect(screen.queryByRole('button', { name: /New RFQ/i })).not.toBeInTheDocument();
    const notice = screen.getByTestId('handoff-rfq-create');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    expect(notice).toHaveTextContent('Awaiting Procurement');
  });

  it('the full buyer seat is unchanged — every demo path still works', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER });
    await screen.findByText('RFQ-2026-001');
    expect(screen.getByRole('button', { name: /New RFQ/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-create')).not.toBeInTheDocument();
  });
});

describe('§73 — ID from birth, on both new notices', () => {
  it('renders the owner in Indonesian, with no English frame left behind', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerGoodsReceipt />, { identity: FINANCE });
      await screen.findByText('GR-2026-001');
      expect(screen.getByTestId('handoff-gr-create')).toHaveTextContent('Menunggu Penerimaan');
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('and on the sourcing surface', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
      await screen.findByText('RFQ-2026-001');
      expect(screen.getByTestId('handoff-rfq-create')).toHaveTextContent('Menunggu Pengadaan');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
