import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import SupplierWhatsApp from './SupplierWhatsApp';

describe('SupplierWhatsApp', () => {
  it('renders its real surface when seeded with a supplier identity', () => {
    renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    // Real content present — the C5 relabelled, unmistakably-a-demo header...
    expect(screen.getByText('Channel Demo — how Paragon reaches you')).toBeInTheDocument();
    // ...the SIMULATED demonstration marker...
    expect(
      screen.getByText(/scripted example conversations, not your real messages/i),
    ).toBeInTheDocument();
    // ...and the no-identity guard is NOT shown.
    expect(
      screen.queryByText('No supplier identity in session'),
    ).not.toBeInTheDocument();
  });
});
