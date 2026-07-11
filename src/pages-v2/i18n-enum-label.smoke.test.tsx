import React from 'react';
import { describe, it, expect, afterAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import i18n from '../lib/i18n';
import StatusPill from '../components/ui-v2/StatusPill';
import { useEnumLabel } from '../hooks/useEnumLabel';

// SEAT2-I18N-ENUM-01 acceptance: the shared priority/severity/disposition vocab
// localizes centrally — via the StatusPill fallback (pill-rendered chips) and
// via the useEnumLabel hook (non-pill display sites) — with no per-page keys.
const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

const HookProbe: React.FC<{ token: string }> = ({ token }) => {
  const el = useEnumLabel();
  return <span data-testid="probe">{el(token)}</span>;
};

describe('enum-label — central localization (no per-page keys)', () => {
  it('StatusPill localizes priority/severity tokens in ID (case-insensitive)', async () => {
    await setLang('id');
    render(
      <>
        <StatusPill>Critical</StatusPill>
        <StatusPill>high</StatusPill>
        <StatusPill>Medium</StatusPill>
        <StatusPill>Quarantine</StatusPill>
      </>,
    );
    expect(await screen.findByText('Kritis')).toBeInTheDocument();
    expect(screen.getByText('Tinggi')).toBeInTheDocument(); // lowercase 'high' resolved
    expect(screen.getByText('Sedang')).toBeInTheDocument();
    expect(screen.getByText('Karantina')).toBeInTheDocument();
    expect(screen.queryByText('Critical')).not.toBeInTheDocument();
  });

  it('StatusPill leaves EN output byte-identical to the canonical token', async () => {
    await setLang('en');
    render(<StatusPill>Return to Supplier</StatusPill>);
    expect(await screen.findByText('Return to Supplier')).toBeInTheDocument();
  });

  it('useEnumLabel localizes non-pill display tokens in ID', async () => {
    await setLang('id');
    render(<HookProbe token="High" />);
    expect(await screen.findByTestId('probe')).toHaveTextContent('Tinggi');
  });

  it('useEnumLabel passes unknown tokens through verbatim', async () => {
    await setLang('id');
    render(<HookProbe token="Warehouse Supervisor" />);
    // stored-as-data roles are NOT in the map — kept canonical EN
    expect(await screen.findByTestId('probe')).toHaveTextContent('Warehouse Supervisor');
  });
});
