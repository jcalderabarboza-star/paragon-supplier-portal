import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import BuyerChase from './BuyerChase';

// ─────────────────────────────────────────────────────────────────────────────
// SDC-5d — the buyer unified chase surface. Render-only over the real wired
// service (mockDataService.chase). Asserts both families render per supplier, the
// SIMULATED marker + push framing, and the buyer gate (a supplier sees nothing).
// ─────────────────────────────────────────────────────────────────────────────

import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

const BUYER = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
} as const;

describe('BuyerChase — the unified chase surface', () => {
  it('renders a worst-first list of chase cards over the real fixtures', async () => {
    renderWithProviders(<BuyerChase />, { identity: BUYER });
    await waitFor(() => expect(screen.getAllByTestId('chase-card').length).toBeGreaterThan(0));
  });

  it('surfaces BOTH families and the hard/soft split — commitment rows + a severity badge', async () => {
    renderWithProviders(<BuyerChase />, { identity: BUYER });
    await waitFor(() => expect(screen.getAllByTestId('chase-card').length).toBeGreaterThan(0));
    // sup-007's sa-0002 carries real late+missed → a "Missed / late" commitment row.
    expect(screen.getAllByText(/Missed \/ late/).length).toBeGreaterThan(0);
    // The forecast-staleness family renders its section label too.
    expect(screen.getAllByText('Delivery commitments').length).toBeGreaterThan(0);
    // The severity split reads as a badge — a firm JIT miss (sa-1007) renders
    // Urgent (hard), FRC/semi-firm + data staleness render Advisory (soft).
    expect(screen.getAllByText(/Urgent/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Advisory/).length).toBeGreaterThan(0);
  });

  it('is honest + SIMULATED — Sample marker + the push-via-WhatsApp framing (no sender)', async () => {
    renderWithProviders(<BuyerChase />, { identity: BUYER });
    await waitFor(() => expect(screen.getAllByTestId('chase-card').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Sample/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Push via WhatsApp \/ email/)).toBeTruthy();
    const firstCard = screen.getAllByTestId('chase-card')[0];
    expect(within(firstCard).getByText('Push via WhatsApp')).toBeTruthy();
  });

  it('is BUYER-GATED — a supplier persona sees an empty chase (a supplier does not chase itself)', async () => {
    renderWithProviders(<BuyerChase />, { identity: SUPPLIER });
    await waitFor(() =>
      expect(screen.getByText(/Nothing to chase/)).toBeTruthy(),
    );
    expect(screen.queryAllByTestId('chase-card')).toHaveLength(0);
  });
});
