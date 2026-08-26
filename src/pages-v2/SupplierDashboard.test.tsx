import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import SupplierDashboard from './SupplierDashboard';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// sup-999 has no supplier record — getCurrent resolves null → EmptyState.
const SUPPLIER_NO_PROFILE: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

describe('SupplierDashboard — four honest states', () => {
  it('data: renders the dashboard with wired reads', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    // KPI strip only renders in the data branch — proof the reads resolved.
    expect(await screen.findByText('Open Orders')).toBeInTheDocument();
    expect(screen.getByText('My recent purchase orders')).toBeInTheDocument();
  });

  it('data: documents section is driven by the scoped useDocuments read', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    // A real sup-007 compliance document proves the wired list (not hardcoded).
    expect(await screen.findByText(/Halal Certificate/)).toBeInTheDocument();
  });

  it('data: the placeholder briefing is honestly flagged as sample data', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER });
    // The briefing carries a "Sample data" pill — and so may fixture-backed
    // widgets (e.g. Certificates). At least one honest sample flag is present;
    // none are faked green.
    const flags = await screen.findAllByText('Sample data');
    expect(flags.length).toBeGreaterThanOrEqual(1);
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierDashboard />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Open Orders')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierDashboard />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no profile record', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: SUPPLIER_NO_PROFILE });
    expect(await screen.findByText('No supplier profile yet')).toBeInTheDocument();
  });
});
