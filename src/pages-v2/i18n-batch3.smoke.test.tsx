import { describe, it, expect, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerRequisitions from './BuyerRequisitions';
import BuyerOrders from './BuyerOrders';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import BuyerDiscovery from './BuyerDiscovery';

// Batch 3 acceptance: with the UI in Indonesian, each buyer-spine page's chrome
// renders in ID and the prior hardcoded English header is gone. Mock/sample data
// and enum literals are out of scope (asserted only on translated chrome).
const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Batch 3 — bilingual render (no chrome EN leak)', () => {
  it('BuyerRequisitions: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerRequisitions />);
    expect(await screen.findByText('Permintaan Pembelian')).toBeInTheDocument();
    expect(screen.queryByText('Purchase Requisitions')).not.toBeInTheDocument();
  });

  it('BuyerOrders: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerOrders />);
    expect(await screen.findByText('Pesanan Pembelian')).toBeInTheDocument();
    expect(screen.queryByText('Purchase Orders')).not.toBeInTheDocument();
  });

  it('BuyerGoodsReceipt: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerGoodsReceipt />);
    expect(await screen.findByText('Penerimaan Barang & Kontrol Kualitas')).toBeInTheDocument();
    expect(screen.queryByText('Goods Receipt & Quality Control')).not.toBeInTheDocument();
  });

  it('BuyerDiscovery: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerDiscovery />);
    expect(await screen.findByText('Penemuan Pemasok')).toBeInTheDocument();
    expect(screen.queryByText('Supplier Discovery')).not.toBeInTheDocument();
  });
});
