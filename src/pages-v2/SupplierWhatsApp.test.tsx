import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import SupplierWhatsApp from './SupplierWhatsApp';

describe('SupplierWhatsApp', () => {
  it('renders its real surface when seeded with a supplier identity', () => {
    renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    // Real content present...
    expect(screen.getByText('Communication Tools')).toBeInTheDocument();
    // ...and the no-identity guard is NOT shown.
    expect(
      screen.queryByText('No supplier identity in session'),
    ).not.toBeInTheDocument();
  });
});
