import { describe, it, expect, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerSuppliers from './BuyerSuppliers';
import BuyerAnalytics from './BuyerAnalytics';
import BuyerScorecard from './BuyerScorecard';
import BuyerInventory from './BuyerInventory';
import Marketplace from './Marketplace';
import BuyerDashboard from './BuyerDashboard';
import SupplierMyStorefront from './SupplierMyStorefront';
import SupplierInventory from './SupplierInventory';
import SupplierPerformance from './SupplierPerformance';

// Batch 6 acceptance (tail sweep): with the UI in Indonesian, each tail page's
// extracted header renders in ID and the prior hardcoded English header is gone.
// The two useParams pages (BuyerSupplierProfile /buyer/suppliers/:id and
// SupplierStorefront /marketplace/supplier/:id) are covered by fragment parity +
// tsc + browser QA rather than here, matching the Batch 5 precedent — a bare
// render without a matched route param renders their not-found branch.
// Deferred prose, mock/sample data, and centrally-localized chips (status /
// priority / enum / mode / category / channel) are out of scope (asserted only on
// translated page chrome).
const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Batch 6 — tail-sweep bilingual render (no header EN leak)', () => {
  it('BuyerSuppliers: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerSuppliers />, { route: '/buyer/suppliers' });
    expect(await screen.findByText('Direktori Pemasok')).toBeInTheDocument();
    expect(screen.queryByText('Supplier Directory')).not.toBeInTheDocument();
  });

  it('BuyerAnalytics: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerAnalytics />, { route: '/buyer/analytics' });
    expect(
      await screen.findByText('Analitik & Intelijen Pengadaan'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Analytics & Procurement Intelligence'),
    ).not.toBeInTheDocument();
  });

  it('BuyerScorecard: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerScorecard />, { route: '/buyer/scorecard' });
    expect(await screen.findByText('Kartu Skor Pemasok')).toBeInTheDocument();
    expect(screen.queryByText('Supplier Scorecard')).not.toBeInTheDocument();
  });

  it('BuyerInventory: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerInventory />, { route: '/buyer/inventory' });
    expect(await screen.findByText('Visibilitas Inventaris')).toBeInTheDocument();
    expect(screen.queryByText('Inventory Visibility')).not.toBeInTheDocument();
  });

  it('Marketplace: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<Marketplace />, { route: '/marketplace' });
    expect(await screen.findByText('Pasar Pemasok Global')).toBeInTheDocument();
    expect(
      screen.queryByText('Global Supplier Marketplace'),
    ).not.toBeInTheDocument();
  });

  it('BuyerDashboard: ID shell header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerDashboard />, { route: '/buyer/dashboard' });
    expect(await screen.findByText('Pusat Komando Pengadaan')).toBeInTheDocument();
    expect(
      screen.queryByText('Procurement Command Center'),
    ).not.toBeInTheDocument();
  });

  it('SupplierMyStorefront: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierMyStorefront />, {
      identity: SUPPLIER,
      route: '/supplier/storefront',
    });
    expect(await screen.findByText('Katalog Saya')).toBeInTheDocument();
    expect(screen.queryByText('My Catalog')).not.toBeInTheDocument();
  });

  it('SupplierInventory: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      route: '/supplier/inventory',
    });
    expect(await screen.findByText('Inventaris Saya')).toBeInTheDocument();
    expect(screen.queryByText('My Inventory')).not.toBeInTheDocument();
  });

  it('SupplierPerformance: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      route: '/supplier/performance',
    });
    expect(await screen.findByText('Kinerja Saya')).toBeInTheDocument();
    expect(screen.queryByText('My Performance')).not.toBeInTheDocument();
  });
});
