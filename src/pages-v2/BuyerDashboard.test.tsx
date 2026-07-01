import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import BuyerDashboard from './BuyerDashboard';

describe('BuyerDashboard', () => {
  it('renders the command center heading', () => {
    renderWithProviders(<BuyerDashboard />);
    expect(screen.getByText('Procurement Command Center')).toBeInTheDocument();
  });
});
