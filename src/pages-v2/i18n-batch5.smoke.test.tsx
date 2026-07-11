import { describe, it, expect, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import i18n from '../lib/i18n';
import SupplierOrders from './SupplierOrders';
import SupplierShipments from './SupplierShipments';
import SupplierInvoices from './SupplierInvoices';
import SupplierDocuments from './SupplierDocuments';

// Batch 5 acceptance: with the UI in Indonesian, each supplier-spine page's
// extracted chrome renders in ID and the prior hardcoded English header is gone.
// Deferred prose, mock/sample data, and centrally-localized chips (status /
// priority / mode) are out of scope (asserted only on translated chrome).
const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Batch 5 — supplier spine bilingual render (no chrome EN leak)', () => {
  it('SupplierOrders: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    expect(await screen.findByText('Pesanan Saya')).toBeInTheDocument();
    expect(screen.queryByText('My Orders')).not.toBeInTheDocument();
  });

  it('SupplierShipments: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('Pengiriman & ASN')).toBeInTheDocument();
    expect(screen.queryByText('Shipments & ASN')).not.toBeInTheDocument();
  });

  it('SupplierInvoices: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    expect(await screen.findByText('Faktur Saya')).toBeInTheDocument();
    expect(screen.queryByText('My Invoices')).not.toBeInTheDocument();
  });

  it('SupplierDocuments: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    expect(await screen.findByText('Dokumen Saya')).toBeInTheDocument();
    expect(screen.queryByText('My Documents')).not.toBeInTheDocument();
  });
});
