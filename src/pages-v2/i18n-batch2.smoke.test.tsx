import { describe, it, expect, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerCommHub from './BuyerCommHub';
import SupplierWhatsApp from './SupplierWhatsApp';
import BuyerSourcing from './BuyerSourcing';
import SupplierRFQs from './SupplierRFQs';

// Batch 2 acceptance: with the UI in Indonesian, each page's extracted chrome
// renders in ID and the prior hardcoded English header is gone. Authentic
// channel templates are out of scope (asserted only on translated chrome).
const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Batch 2 — bilingual render (no EN leak in chrome)', () => {
  it('BuyerCommHub: ID chrome header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerCommHub />);
    expect((await screen.findAllByText('Pusat Komunikasi')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Communication Hub')).not.toBeInTheDocument();
  });

  it('SupplierWhatsApp: ID chrome header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    expect(await screen.findByText('Demo Kanal — cara Paragon menjangkau Anda')).toBeInTheDocument();
    expect(screen.queryByText('Channel Demo — how Paragon reaches you')).not.toBeInTheDocument();
  });

  it('BuyerSourcing: ID chrome header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerSourcing />);
    expect(await screen.findByText('Sumber & RFQ')).toBeInTheDocument();
    expect(screen.queryByText('Sourcing & RFQ')).not.toBeInTheDocument();
  });

  it('SupplierRFQs: ID chrome header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    expect(await screen.findByText('Acara Sourcing Saya')).toBeInTheDocument();
    expect(screen.queryByText('My Sourcing Events')).not.toBeInTheDocument();
  });
});
