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

const SIMULATED_CAPS: Capability[] = [
  'risk',
  'inventory',
  'compliance',
  'supplierDocuments',
];

describe('LivenessPill — honest-render (reads the LivenessRegistry)', () => {
  it('compliance is SIMULATED → renders "Sample", never "Live"', () => {
    // Guard the premise: compliance derives SIMULATED (I3.1 repoint).
    expect(isLive('compliance')).toBe(false);
    renderPill(<LivenessPill capability="compliance" />);
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('every SIMULATED capability renders amber "Sample" — green is unreachable', () => {
    for (const cap of SIMULATED_CAPS) {
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
