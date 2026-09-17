import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import BuyerComplianceWidget from './BuyerComplianceWidget';
import SupplierCertsExpiringWidget from './SupplierCertsExpiringWidget';

// Fixture-backed widgets are honest-by-construction: live=false, so the shell
// MUST render the amber "Sample data" pill and can NEVER render green "Live".
describe('Sample-data widgets — amber pill by construction (never green)', () => {
  // ⚠️ THE INVENTORY AND RISK ROWS ARE GONE BECAUSE THEIR WIDGETS ARE, not
  // because the claim weakened. `BuyerInventoryWidget` and `BuyerRiskWidget`
  // were rendered only by the buyer dashboard, which no longer has a widget
  // grid; the two surfaces that still model those domains are the
  // `/buyer/inventory` and `/buyer/risk` PAGES, which carry their own markers.
  // `BuyerComplianceWidget` stays because `BuyerCompliance.tsx` renders it.
  it('Compliance — expiring certs (buyer) wears "Sample data", never "Live"', async () => {
    renderWithProviders(<BuyerComplianceWidget />); // defaults to the buyer identity
    expect(await screen.findByText('Compliance — expiring certs')).toBeInTheDocument();
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('Certificates — expiring (supplier) wears "Sample data", never "Live"', async () => {
    renderWithProviders(<SupplierCertsExpiringWidget />, { identity: SUPPLIER });
    expect(
      await screen.findByText('Certificates — expiring'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });
});
