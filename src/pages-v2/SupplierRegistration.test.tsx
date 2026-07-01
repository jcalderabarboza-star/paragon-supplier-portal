import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import SupplierRegistration from './SupplierRegistration';

describe('SupplierRegistration', () => {
  it('renders the request-type selection (standalone, no special identity)', () => {
    renderWithProviders(<SupplierRegistration />);
    expect(screen.getByText('External Supplier Request')).toBeInTheDocument();
  });
});
