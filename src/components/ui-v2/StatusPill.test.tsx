import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';
import StatusPill from './StatusPill';

function renderPill(node: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterEach(async () => {
  await setLang('en');
});

describe('StatusPill — central label localization (SEAT2-I18N-CHROME-01)', () => {
  it('renders the canonical English label by default (EN unchanged)', () => {
    renderPill(<StatusPill variant="success">Delivered</StatusPill>);
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('localizes a known status to ID when language flips', async () => {
    renderPill(<StatusPill variant="success">Delivered</StatusPill>);
    await setLang('id');
    expect(screen.getByText('Terkirim')).toBeInTheDocument();
    expect(screen.queryByText('Delivered')).not.toBeInTheDocument();
  });

  it('localizes a multi-word status (Payment Released → Pembayaran Dirilis)', async () => {
    renderPill(<StatusPill variant="success">Payment Released</StatusPill>);
    await setLang('id');
    expect(screen.getByText('Pembayaran Dirilis')).toBeInTheDocument();
  });

  it('renders unknown / domain-specific labels verbatim in both locales', async () => {
    renderPill(<StatusPill>Custom Domain Label</StatusPill>);
    expect(screen.getByText('Custom Domain Label')).toBeInTheDocument();
    await setLang('id');
    expect(screen.getByText('Custom Domain Label')).toBeInTheDocument();
  });
});
