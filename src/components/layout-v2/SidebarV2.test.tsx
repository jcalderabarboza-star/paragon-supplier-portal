import { screen, fireEvent } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import SidebarV2 from './SidebarV2';

// Surfaces the current route so we can assert the toggle navigates (NAV-01).
const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
};

describe('SidebarV2 — persona toggle navigates (NAV-01)', () => {
  it('switching to Supplier navigates to the supplier dashboard', () => {
    renderWithProviders(
      <>
        <SidebarV2 />
        <LocationProbe />
      </>,
      { route: '/buyer/dashboard' },
    );
    expect(screen.getByTestId('loc')).toHaveTextContent('/buyer/dashboard');
    fireEvent.click(screen.getByRole('button', { name: 'Supplier' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/supplier/dashboard');
  });

  it('switching to Buyer navigates to the buyer dashboard', () => {
    renderWithProviders(
      <>
        <SidebarV2 />
        <LocationProbe />
      </>,
      { identity: SUPPLIER, route: '/supplier/dashboard' },
    );
    expect(screen.getByTestId('loc')).toHaveTextContent('/supplier/dashboard');
    fireEvent.click(screen.getByRole('button', { name: 'Buyer' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/buyer/dashboard');
  });
});
