// ────────────────────────────────────────────────────────────────────────────
// §81 — THE SYNC STATE, AS A READER ACTUALLY MEETS IT.
//
// The contract half lives in `services/data/complianceSapSync.test.ts` (the
// value set, the reachability derivation, the gate's non-reach). This file
// asserts the only thing that half cannot: **that a person sees it**, in their
// own language, on both sides of the tenancy boundary.
//
// ── ⚠️ WHY THE FIRST TEST IS A CONTROL, ON THE `BuyerCompliance.date` PRECEDENT
//   A locale assertion is worthless if the two locales render the same bytes —
//   that file's own note records seven of twelve months where EN and ID dates are
//   byte-identical, so a parity test written against January passes while seeing
//   nothing. The same trap applies here and has to be closed the same way: prove
//   'Not yet' and 'Belum' actually differ BEFORE believing either assertion below.
//
// ── ⚠️ AND WHY A SUPPLIER SEAT IS TESTED ON A `/buyer/` ROUTE ───────────────
//   That is not a contrivance — it is the measured shape of this surface. **No
//   supplier-prefixed page reads the compliance registry**; the readers derive to
//   `BuyerCompliance`, `BuyerComplianceWidget`, `BuyerGoodsReceipt` and
//   `GRInspectionWizard`, all buyer-side. What makes the supplier view real is
//   `MockRiskService.getComplianceRegistry`, which branches on `personaType` and
//   returns only that supplier's own rows — and no page in this platform gates on
//   role, so a supplier seat reaching this route gets its own certificates. The
//   supplier's view of a confirmed certificate IS this page, scoped.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterAll } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import i18n from '../lib/i18n';
import { COMPLIANCE_REGISTRY } from '../services/data/mock/fixtures/complianceRegistry';
import BuyerCompliance from './BuyerCompliance';

const ROUTE = '/buyer/compliance';

/** Every registry row is `AWAITING_SYNC`, so this is the test id on every chip. */
const CHIP = 'sap-sync-AWAITING_SYNC';

/** sup-007 — the seeded supplier seat. `creg-0001` is one of its CONFIRMED
 *  (lifecycleState 'Valid') certificates, which is the row the ruling is about. */
const OWN = COMPLIANCE_REGISTRY.filter((e) => e.supplierId === 'sup-007');
const FOREIGN_NAME = 'PT Sample Specialty Fats'; // sup-002 — never sup-007's

describe('§81 · BuyerCompliance — the sync state reaches a reader', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('CONTROL — the two locales render DIFFERENT text, so the assertions below can see', async () => {
    await i18n.changeLanguage('en');
    const en = i18n.t('compliance.sapSync.AWAITING_SYNC');
    await i18n.changeLanguage('id');
    const id = i18n.t('compliance.sapSync.AWAITING_SYNC');
    expect(en).toBe('Not yet');
    expect(id).toBe('Belum');
    // Without this, a future copy edit making both 'Not yet' would leave the two
    // locale tests green and blind.
    expect(id).not.toBe(en);
  });

  it('CONTROL — the fixture holds CONFIRMED sup-007 rows, so the supplier test is not vacuous', () => {
    expect(OWN.length).toBeGreaterThan(0);
    expect(OWN.some((e) => e.lifecycleState === 'Valid')).toBe(true);
    expect(OWN.map((e) => e.id)).toContain('creg-0001');
  });

  it('BUYER — every row carries the marker, and the column and caption are named', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(<BuyerCompliance />, { route: ROUTE, identity: BUYER });

    // The column header, the caption, and one chip per row — the buyer sees the
    // whole registry, so the chip count is the registry length exactly.
    // ⚠️ AWAIT A CHIP, NOT THE HEADER. The column header and the caption are
    // static chrome that render before the query resolves, so `findByText('In
    // SAP')` returns instantly and every row assertion after it runs against an
    // EMPTY table. That is how the first version of this test failed — loudly,
    // but it could equally have been written to pass by asserting only chrome.
    expect(await screen.findAllByTestId(CHIP)).toHaveLength(COMPLIANCE_REGISTRY.length);
    expect(screen.getByText('In SAP')).toBeInTheDocument();
    expect(screen.getByTestId('sap-sync-note')).toHaveTextContent(
      /has been handed to S\/4HANA/i,
    );
    expect(screen.getAllByText('Not yet').length).toBe(COMPLIANCE_REGISTRY.length);
  });

  it('BUYER · ID — the marker localizes, and the English string is nowhere', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCompliance />, { route: ROUTE, identity: BUYER });

    expect(await screen.findAllByText('Belum')).toHaveLength(COMPLIANCE_REGISTRY.length);
    expect(screen.getByText('Di SAP')).toBeInTheDocument();
    expect(screen.queryByText('Not yet')).toBeNull();
    expect(screen.queryByText('In SAP')).toBeNull();
  });

  it('SUPPLIER — sees the marker on its OWN confirmed certificate, and no foreign row', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(<BuyerCompliance />, { route: ROUTE, identity: SUPPLIER });

    // Scoped: exactly its own rows, each carrying the marker.
    expect(await screen.findAllByTestId(CHIP)).toHaveLength(OWN.length);
    expect(screen.getByText('In SAP')).toBeInTheDocument();

    // ⚠️ THE TENANCY CONTROL. `OWN.length < COMPLIANCE_REGISTRY.length` is what
    // makes the count above an isolation assertion rather than a coincidence, and
    // the foreign supplier's NAME must not appear at all.
    expect(OWN.length).toBeLessThan(COMPLIANCE_REGISTRY.length);
    expect(screen.queryByText(FOREIGN_NAME)).toBeNull();
    expect(screen.getAllByText('PT Sample Packaging Indonesia').length).toBe(OWN.length);
  });

  it('SUPPLIER · ID — the same scoped view, in the reader’s own language', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCompliance />, { route: ROUTE, identity: SUPPLIER });

    expect(await screen.findAllByText('Belum')).toHaveLength(OWN.length);
    expect(screen.getByText('Di SAP')).toBeInTheDocument();
    expect(screen.queryByText(FOREIGN_NAME)).toBeNull();
  });

  it('the marker sits on the row it describes, not loose on the page', async () => {
    // A chip rendered anywhere would satisfy the counts above. This pins that the
    // marker is INSIDE a row that also carries that row's certificate number —
    // which is what makes it a statement about THAT certificate.
    await i18n.changeLanguage('en');
    renderWithProviders(<BuyerCompliance />, { route: ROUTE, identity: SUPPLIER });

    const certNumber = COMPLIANCE_REGISTRY.find((e) => e.id === 'creg-0001')!.certNumber;
    const cell = await screen.findByText(certNumber);
    const row = cell.closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByTestId(CHIP)).toBeInTheDocument();
  });
});
