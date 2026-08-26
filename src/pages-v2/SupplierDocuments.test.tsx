import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import SupplierDocuments from './SupplierDocuments';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier with no documents on file (sup-007/002/005 have fixtures).
const SUPPLIER_NO_DOCS: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

describe('SupplierDocuments — four honest states', () => {
  it('data: renders the scoped document table for the seeded supplier', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    expect(await screen.findByText('My Documents')).toBeInTheDocument();
    // The KPI header count is present once real data resolves.
    expect(await screen.findByText('Total Documents')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<SupplierDocuments />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Total Documents')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<SupplierDocuments />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no documents', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER_NO_DOCS });
    expect(await screen.findByText('No documents yet')).toBeInTheDocument();
  });
});
