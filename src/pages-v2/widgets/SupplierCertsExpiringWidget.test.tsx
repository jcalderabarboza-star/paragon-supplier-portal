// ─────────────────────────────────────────────────────────────────────────────
// THE DIVERGENCE, ASSERTED AT THE SURFACE A PERSON ACTUALLY LOOKS AT.
//
// `dayProjection.test.ts` proves the FIXTURE contradicts its own stored status.
// This proves the WIDGET no longer repeats it — a different claim, and the one
// that matters to a supplier, because the projection could be perfectly correct
// while the widget kept reading `status`. That was the shipped state.
//
// The seat is `sup-007`, which owns three of the five diverging documents:
//   · doc-001  Halal Certificate (MUI)  stored 'Expiring Soon'  →  EXPIRED
//   · doc-005  ISO 9001                 stored 'Valid'          →  expiring
//   · doc-008  Framework Supply Agmt    stored 'Valid'          →  expiring
// Before this batch the widget listed ONE row (doc-001, labelled "Expiring
// Soon") and omitted the two that genuinely needed renewing.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import SupplierCertsExpiringWidget from './SupplierCertsExpiringWidget';
import { DOCUMENTS } from '../../services/data/mock/fixtures/supplierDocuments';

const HALAL = 'Halal Certificate — MUI No. 01011234561020';

/** Open the widget's expanded region — where the document rows render. */
const openWidget = async (): Promise<void> => {
  fireEvent.click(await screen.findByLabelText(/expand/i));
};

describe('SupplierCertsExpiringWidget — the clock is the source, not `status`', () => {
  it('the fixture still holds the subjects of this test', () => {
    // Population control: if these rows are renamed or dropped, this file must
    // fail LOUDLY as a stale test rather than quietly as a passing one.
    const mine = DOCUMENTS.filter((d) => d.supplierId === 'sup-007');
    expect(mine.some((d) => d.id === 'doc-001')).toBe(true);
    expect(mine.some((d) => d.id === 'doc-005')).toBe(true);
    expect(mine.some((d) => d.id === 'doc-008')).toBe(true);
  });

  it('⚠️ doc-001 is labelled EXPIRED — the widget used to call it "Expiring soon"', async () => {
    renderWithProviders(<SupplierCertsExpiringWidget />, { identity: SUPPLIER });
    const title = await screen.findByText('Certificates — expiring');
    // The rows live behind `ExpandableWidget`'s expand affordance. Opening it is
    // part of what a reader does, so the test does it rather than reaching past
    // the component into its props.
    await openWidget();
    const row = (await screen.findByText(HALAL)).closest('tr');
    expect(row, 'the halal certificate must be listed').not.toBeNull();
    expect(within(row!).getByText('Expired')).toBeInTheDocument();
    // The stale stored literal must NOT be what the reader sees on this row.
    expect(within(row!).queryByText('Expiring Soon')).toBeNull();
    expect(title).toBeInTheDocument();
  });

  it('⚠️ the two documents the widget used to OMIT are now listed', async () => {
    renderWithProviders(<SupplierCertsExpiringWidget />, { identity: SUPPLIER });
    await openWidget();
    expect(
      await screen.findByText('ISO 9001:2015 Quality Management Certificate'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Framework Supply Agreement — Paragon Corp 2025–2027'),
    ).toBeInTheDocument();
  });

  it('the flag reports the EXPIRED count and the severity is critical, not warning', async () => {
    renderWithProviders(<SupplierCertsExpiringWidget />, { identity: SUPPLIER });
    // `critical` was unreachable before this batch — the union member that fed
    // it was retired at #316 because nothing could produce it. A COUNT can.
    expect(await screen.findByText('1 expired')).toBeInTheDocument();
  });
});
