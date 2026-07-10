import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import BuyerInventoryWidget from './BuyerInventoryWidget';
import BuyerRiskWidget from './BuyerRiskWidget';
import BuyerComplianceWidget from './BuyerComplianceWidget';
import SupplierCertsExpiringWidget from './SupplierCertsExpiringWidget';

// Fixture-backed widgets are honest-by-construction: live=false, so the shell
// MUST render the amber "Sample data" pill and can NEVER render green "Live".
describe('Sample-data widgets — amber pill by construction (never green)', () => {
  it.each([
    ['Inventory — low stock', BuyerInventoryWidget],
    ['Risk alerts', BuyerRiskWidget],
    ['Compliance — expiring certs', BuyerComplianceWidget],
  ] as [string, React.ComponentType][])(
    '%s (buyer) wears "Sample data", never "Live"',
    async (title, Widget) => {
      renderWithProviders(<Widget />); // defaults to the buyer identity
      expect(await screen.findByText(title)).toBeInTheDocument();
      expect(screen.getByText('Sample data')).toBeInTheDocument();
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    },
  );

  it('Certificates — expiring (supplier) wears "Sample data", never "Live"', async () => {
    renderWithProviders(<SupplierCertsExpiringWidget />, { identity: SUPPLIER });
    expect(
      await screen.findByText('Certificates — expiring'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });
});
