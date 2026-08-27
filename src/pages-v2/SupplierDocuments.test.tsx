import { screen, within } from '@testing-library/react';
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

// ── The refusal, rendered ──────────────────────────────────────────────────
// ⚠️ **THIS IS THE HALF THE ARC WAS ABOUT.** A refusal the refused party cannot
// read is the dead end; these assert the party CAN read it — the reason, the
// date, and the line saying nobody can be named — and that no other supplier can.
describe('SupplierDocuments — the refused document', () => {
  const OTHER_SUPPLIER: CurrentIdentity = {
    personaType: 'supplier',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Chemicals Indonesia',
    businessRoles: PERSONA_SYSTEM_ROLES.supplier,
    actor: NO_PERSON,
  };

  it('renders the reason, the date and the unattributed line to its owner', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const block = await screen.findByTestId('doc-refusal-doc-012');
    expect(block).toHaveTextContent('Refused');
    expect(block).toHaveTextContent('18 Aug 2026');
    expect(block).toHaveTextContent(/Certificate scope does not cover PK-PETB-8810/);
    expect(block).toHaveTextContent(
      'Recorded without a named person — the portal has no user directory yet.',
    );
  });

  it('leads with the refusal banner — the page exists for this row', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    expect(await screen.findByTestId('doc-refused-banner')).toHaveTextContent(
      '1 document was refused:',
    );
  });

  it('offers NO remedy affordance on the refused row', async () => {
    // `supplierdoc:upload` is unauthored and the atom is the back-office lane's
    // by ruling, so a resubmit control here would name a verb that does not
    // exist. The refusal text carries the instruction; the platform promises
    // nothing (`FORWARD-PROMISE-HAS-NO-HANDLER-01`).
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const block = await screen.findByTestId('doc-refusal-doc-012');
    const row = block.closest('tr')!;
    expect(within(row).queryByRole('button', { name: /upload/i })).toBeNull();
    expect(within(row).getByRole('button', { name: /view/i })).toBeInTheDocument();
  });

  it('another supplier sees neither the refusal nor its banner', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: OTHER_SUPPLIER });
    // Non-vacuity: sup-002 HAS documents, so an absent refusal is isolation
    // rather than an empty render.
    expect(await screen.findByText('Total Documents')).toBeInTheDocument();
    expect(screen.queryByTestId('doc-refusal-doc-012')).toBeNull();
    expect(screen.queryByTestId('doc-refused-banner')).toBeNull();
    expect(screen.queryByText(/PK-PETB-8810/)).toBeNull();
  });
});
