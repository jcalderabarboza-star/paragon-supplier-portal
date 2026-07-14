import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';
import LivenessPill from './LivenessPill';
import { isLive, type Capability } from '../../services/liveness';

// LivenessPill is the page-level honest-render marker. Same load-bearing lock as
// ExpandableWidget's private HonestyDot: it takes a `capability`, NOT a boolean,
// so green ("Live") is structurally UNREACHABLE for a SIMULATED capability — no
// caller input can fake it. i18n active (default-EN), so t('widget.honesty.*')
// resolves to "Live"/"Sample".
const renderPill = (node: React.ReactNode) =>
  render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);

// Generic SIMULATED caps render the plain "Sample". `compliance` is harvest-gated
// (I3.3) so it renders the SPECIFIC waiting-state text instead — asserted separately.
const GENERIC_SIMULATED_CAPS: Capability[] = [
  'risk',
  'inventory',
  'supplierDocuments',
];

describe('LivenessPill — honest-render (reads the LivenessRegistry)', () => {
  it('compliance is harvest-gated → renders the specific waiting-state, never "Live"', () => {
    // Guard the premise: compliance derives SIMULATED (I3.1) + harvest-gated (I3.3).
    expect(isLive('compliance')).toBe(false);
    const { container } = renderPill(<LivenessPill capability="compliance" />);
    // The SPECIFIC waiting-state text — not the generic "Sample" — names the harvest.
    expect(screen.getByText('Sample — awaiting Track-R harvest')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    // Still amber / SIMULATED — green tokens structurally absent.
    expect(container.querySelector('.text-success')).toBeNull();
    expect(container.querySelector('.bg-success')).toBeNull();
  });

  it('every generic SIMULATED capability renders amber "Sample" — green is unreachable', () => {
    for (const cap of GENERIC_SIMULATED_CAPS) {
      const { unmount, container } = renderPill(<LivenessPill capability={cap} />);
      expect(screen.getByText('Sample')).toBeInTheDocument();
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
      // The green tokens are structurally absent for a SIMULATED tier.
      expect(container.querySelector('.text-success')).toBeNull();
      expect(container.querySelector('.bg-success')).toBeNull();
      unmount();
    }
  });

  it('a LIVE capability (wired target) renders green "Live"', () => {
    // `invoices` is backed by the wired invoice CommandTarget → LIVE.
    expect(isLive('invoices')).toBe(true);
    const { container } = renderPill(<LivenessPill capability="invoices" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(container.querySelector('.text-success')).not.toBeNull();
  });
});
