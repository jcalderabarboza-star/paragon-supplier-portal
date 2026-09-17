import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import BuyerInventoryWidget from './BuyerInventoryWidget';
import BuyerRiskWidget from './BuyerRiskWidget';
import BuyerComplianceWidget from './BuyerComplianceWidget';
import SupplierCertsExpiringWidget from './SupplierCertsExpiringWidget';

// Fixture-backed widgets are honest-by-construction: live=false, so the shell
// MUST render the amber "Sample data" pill and can NEVER render green "Live".
describe('Sample-data widgets — amber pill by construction (never green)', () => {
  // ⚠️ **THE INVENTORY AND RISK ROWS ARE BACK, AND THE REASON THEY LEFT IS
  // WORTH KEEPING.** They were dropped when the widget grid was retired, and
  // restored with it — but in between, the claim was carried by a dashboard-
  // level assertion that counted "Live" pills against `isLive()`. That
  // assertion was SELF-REFERENTIAL: it derived its own expectation through the
  // predicate under test, so forcing `isLive('inventory')` true moved both
  // sides together and the mutation survived (§86 — a gate must not derive its
  // population through the code it is probing). These three rows do not: each
  // renders ONE widget and reads the pill off the screen.
  it.each([
    ['Inventory — low stock', BuyerInventoryWidget],
    ['Risk alerts', BuyerRiskWidget],
    ['Compliance — expiring certs', BuyerComplianceWidget],
  ] as [string, React.ComponentType][])(
    '%s (buyer) wears "Sample data", never "Live"',
    async (title, Widget) => {
      renderWithProviders(<Widget />); // defaults to the buyer identity
      expect(await screen.findByText(title)).toBeInTheDocument();
      expect(screen.getByText('Sample')).toBeInTheDocument();
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    },
  );

  it('Certificates — expiring (supplier) wears "Sample data", never "Live"', async () => {
    renderWithProviders(<SupplierCertsExpiringWidget />, { identity: SUPPLIER });
    expect(
      await screen.findByText('Certificates — expiring'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });
});
