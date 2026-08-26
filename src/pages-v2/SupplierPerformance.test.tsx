import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import SupplierPerformance from './SupplierPerformance';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A real supplier (sup-002) whose KPI snapshot is not yet published — the
// record resolves but the performance data is empty.
const SUPPLIER_NO_PERF: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sinar Meadow',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

describe('SupplierPerformance — four honest states', () => {
  it('data: renders the scorecard for the seeded supplier', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER });
    expect(await screen.findByText('My Performance')).toBeInTheDocument();
    expect(await screen.findByText('KPI Scorecard — 6 metrics')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('KPI Scorecard — 6 metrics')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no published scorecard', async () => {
    renderWithProviders(<SupplierPerformance />, { identity: SUPPLIER_NO_PERF });
    expect(await screen.findByText('No performance data yet')).toBeInTheDocument();
  });
});
