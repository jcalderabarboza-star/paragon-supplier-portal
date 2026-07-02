import { screen, fireEvent } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import NotFound from './NotFound';

const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
};

describe('NotFound — real 404 (NAV-02)', () => {
  it('renders a 404 surface instead of silently redirecting', () => {
    renderWithProviders(<NotFound />, { route: '/buyer/does-not-exist' });
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByText('404 — Not found')).toBeInTheDocument();
  });

  it('offers a route back to the dashboard', () => {
    renderWithProviders(
      <>
        <NotFound />
        <LocationProbe />
      </>,
      { route: '/buyer/does-not-exist' },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/buyer/dashboard');
  });
});
