import { describe, it, expect, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerRisk from './BuyerRisk';
import BuyerShipments from './BuyerShipments';
import BuyerCompliance from './BuyerCompliance';
import SupplierDashboard from './SupplierDashboard';

// Batch 4 acceptance: with the UI in Indonesian, each page's extracted chrome
// renders in ID and the prior hardcoded English header is gone. Deferred prose,
// mock/sample data, and centrally-localized chips are out of scope (asserted
// only on translated chrome).
const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Batch 4 — bilingual render (no chrome EN leak)', () => {
  it('BuyerRisk: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerRisk />);
    expect(await screen.findByText('Intelijen Risiko Pasokan & Skenario')).toBeInTheDocument();
    expect(screen.queryByText('Supply Risk & Scenario Intelligence')).not.toBeInTheDocument();
  });

  it('BuyerShipments: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerShipments />);
    expect(await screen.findByText('Pengiriman & ASN')).toBeInTheDocument();
    expect(screen.queryByText('Shipments & ASN')).not.toBeInTheDocument();
  });

  it('BuyerCompliance: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerCompliance />);
    expect(await screen.findByText('Pelacak Kepatuhan')).toBeInTheDocument();
    expect(screen.queryByText('Compliance Tracker')).not.toBeInTheDocument();
  });

  it('SupplierDashboard: ID chrome, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    expect(await screen.findByText('Ringkasan hari ini')).toBeInTheDocument();
    expect(screen.queryByText("Today's briefing")).not.toBeInTheDocument();
  });
});
