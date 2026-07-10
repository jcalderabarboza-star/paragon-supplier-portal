import { describe, it, expect, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import SupplierRegistration from './SupplierRegistration';
import BuyerContracts from './BuyerContracts';

// Batch 1 acceptance: with the UI in Indonesian, the extracted chrome renders in
// ID and the previous hardcoded English is gone. Proves keys resolve end-to-end
// (fragment → i18n.ts → page t()) — the programmatic stand-in for the bilingual
// walkthrough. Language is restored to EN afterwards so no other suite is affected.
const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Batch 1 — bilingual render (no EN leak in ID)', () => {
  it('SupplierRegistration renders ID chrome, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierRegistration />);
    expect(screen.getByText('Permintaan Pemasok Eksternal')).toBeInTheDocument();
    expect(screen.queryByText('External Supplier Request')).not.toBeInTheDocument();
  });

  it('BuyerContracts renders ID chrome, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerContracts />);
    expect(await screen.findByText('Kontrak Aktif')).toBeInTheDocument();
    expect(screen.getByText('Kewajiban Jatuh Tempo')).toBeInTheDocument();
    expect(screen.queryByText('Active Contracts')).not.toBeInTheDocument();
    expect(screen.queryByText('Overdue Obligations')).not.toBeInTheDocument();
  });
});
