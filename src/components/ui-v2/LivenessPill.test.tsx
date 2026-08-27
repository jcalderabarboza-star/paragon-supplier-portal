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

// Generic SIMULATED caps render the plain "Sample". `compliance` (I3.3) and
// `inventory` (SDC-3b) are harvest-gated, so they render the SPECIFIC
// waiting-state text instead — asserted separately.
// S82 - `supplierDocuments` LEFT this list. Its target is wired (gate-1 LIVE)
// and it is harvest-gated on F1 identities, so it now renders the SPECIFIC
// waiting-state exactly as `compliance` and `inventory` do - covered by its own
// test below rather than by this generic sweep.
const GENERIC_SIMULATED_CAPS: Capability[] = [
  'risk',
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

  it('inventory is harvest-gated (SDC-3b) → renders the specific supplier-feed waiting-state, never "Live"', () => {
    // SDC-3b flipped the backing to the wired InventoryDeclaration target (gate-1
    // LIVE) but gate-2 holds until a live supplier feed lands (F1) → still amber.
    expect(isLive('inventory')).toBe(false);
    const { container } = renderPill(<LivenessPill capability="inventory" />);
    expect(screen.getByText('Sample — awaiting live supplier feed')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
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

  it('supplierDocuments is wired yet harvest-gated (S82) - specific text, never "Live"', () => {
    // The batch that wires a lane is the batch tempted to call it live. Gate-1 is
    // LIVE here and the pill still cannot go green, because the twelve seeded
    // rows are authored samples and a declaration made today is a demo
    // submission against a demo identity.
    expect(isLive('supplierDocuments')).toBe(false);
    const { container } = renderPill(<LivenessPill capability="supplierDocuments" />);
    expect(
      screen.getByText('Sample — awaiting real supplier identities'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(container.querySelector('.text-success')).toBeNull();
    expect(container.querySelector('.bg-success')).toBeNull();
  });

  it('a LIVE capability (wired target) renders green "Live"', () => {
    // `invoices` is backed by the wired invoice CommandTarget → LIVE.
    expect(isLive('invoices')).toBe(true);
    const { container } = renderPill(<LivenessPill capability="invoices" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(container.querySelector('.text-success')).not.toBeNull();
  });
});
