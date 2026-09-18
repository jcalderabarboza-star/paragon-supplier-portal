// ─────────────────────────────────────────────────────────────────────────────
// THE DIRECTORY'S PSL COLUMN — three cells, a filter, and a real row anchor.
//
// ⚠️ **THE THREE CELLS ARE ASSERTED AS DIFFERENT FROM EACH OTHER, NOT MERELY AS
// PRESENT.** The defect this column exists to avoid is rendering "never
// qualified" and "qualified, and the qualification lapsed" the same way, and a
// spec that only checked each appeared somewhere would pass on a column that
// printed one word for both.
// ─────────────────────────────────────────────────────────────────────────────
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerSuppliers from './BuyerSuppliers';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { PSL_LISTINGS } from '../services/data/mock/fixtures/pslListings';
import { pslStatusFor } from '../services/data/pslSourcingSeam';

/** The row for a supplier, found through its own name cell. */
const rowFor = async (name: string): Promise<HTMLElement> => {
  const cell = await screen.findByText(name);
  const row = cell.closest('tr');
  if (!row) throw new Error(`no row for ${name}`);
  return row;
};

describe('REACH — the fixture reaches all three Directory cells', () => {
  it('sup-002 is IN_FORCE, sup-007 is LAPSED and sup-001 is NOT_LISTED', () => {
    // Asserted against the SEAM, so the render specs below cannot be vacuous in
    // a way the page alone would hide.
    expect(pslStatusFor('sup-002', null, DECLARED_PRESENT).kind).toBe('IN_FORCE');
    expect(pslStatusFor('sup-007', null, DECLARED_PRESENT).kind).toBe('LAPSED');
    expect(pslStatusFor('sup-001', null, DECLARED_PRESENT).kind).toBe('NOT_LISTED');
    expect(PSL_LISTINGS.length).toBeGreaterThan(5);
  });
});

describe('BuyerSuppliers — the PSL column (EN)', () => {
  it('renders the column header', async () => {
    renderWithProviders(<BuyerSuppliers />);
    expect(await screen.findByText('PSL')).toBeInTheDocument();
  });

  it('⚠️ the three cells are VISIBLY DIFFERENT — not listed ≠ expired ≠ in force', async () => {
    renderWithProviders(<BuyerSuppliers />);
    await screen.findByText('PT Sample Specialty Fats');

    const inForce = within(await rowFor('PT Sample Specialty Fats')).getByTestId(
      'psl-cell-status',
    );
    const lapsed = within(await rowFor('PT Sample Packaging Indonesia')).getByTestId(
      'psl-cell-lapsed',
    );
    const none = within(await rowFor('PT Sample Oleochemicals')).getByTestId(
      'psl-cell-not-listed',
    );

    expect(inForce.textContent).toContain('Sole Source');
    expect(lapsed.textContent).toContain('Expired');
    expect(none.textContent).toContain('Not Listed');
    // The property, stated directly: no two of the three read the same.
    const texts = [inForce, lapsed, none].map((e) => e.textContent);
    expect(new Set(texts).size).toBe(3);
  });

  it('the most restrictive LIVE designation wins on a multi-listing supplier', async () => {
    renderWithProviders(<BuyerSuppliers />);
    const row = await rowFor('PT Sample Specialty Fats');
    // sup-002 holds an EXPIRED Mandatory (psl-003) and a live Sole Source.
    // Stage 1 discards the expired one, so the cell must not read Mandatory.
    expect(within(row).getByTestId('psl-cell-status').textContent).toContain('Sole Source');
    expect(within(row).queryByText('Mandatory')).toBeNull();
  });

  it('the scope summary names a real material code, verbatim', async () => {
    renderWithProviders(<BuyerSuppliers />);
    const row = await rowFor('PT Sample Specialty Fats');
    // Codes are DATA (C9 §3 — contractually opaque) and render verbatim.
    expect(within(row).getByTestId('psl-cell-summary').textContent).toMatch(/RM-/);
  });

  it('⚠️ the PSL filter narrows the table, and clears back', async () => {
    renderWithProviders(<BuyerSuppliers />);
    await screen.findByText('PT Sample Oleochemicals');

    fireEvent.click(screen.getByRole('radio', { name: /Not listed/i }));
    expect(screen.queryByText('PT Sample Specialty Fats')).toBeNull();
    expect(screen.getByText('PT Sample Oleochemicals')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /In force/i }));
    expect(screen.getByText('PT Sample Specialty Fats')).toBeInTheDocument();
    expect(screen.queryByText('PT Sample Oleochemicals')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: /Any PSL/i }));
    expect(screen.getByText('PT Sample Specialty Fats')).toBeInTheDocument();
    expect(screen.getByText('PT Sample Oleochemicals')).toBeInTheDocument();
  });

  it('⚠️ THE ROW IS A REAL ANCHOR, not a `<tr onClick>`', async () => {
    renderWithProviders(<BuyerSuppliers />);
    const link = await screen.findByRole('link', {
      name: /PT Sample Specialty Fats/i,
    });
    expect(link.getAttribute('href')).toBe('/buyer/suppliers/sup-002');
    // The row must be positioned, or the stretched anchor covers the page.
    expect(link.closest('tr')?.className).toContain('relative');
  });
});

describe('BuyerSuppliers — the PSL column (ID)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('⚠️ renders in Indonesian, with NO English left in the PSL column', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerSuppliers />);
    await screen.findByText('PT Sample Specialty Fats');

    const inForce = within(await rowFor('PT Sample Specialty Fats')).getByTestId(
      'psl-cell-status',
    );
    const lapsed = within(await rowFor('PT Sample Packaging Indonesia')).getByTestId(
      'psl-cell-lapsed',
    );
    const none = within(await rowFor('PT Sample Oleochemicals')).getByTestId(
      'psl-cell-not-listed',
    );

    // The status words come from the CENTRAL map, so this also proves the
    // three new entries landed in `statusLabel.ts` and not only in the tone map.
    expect(inForce.textContent).toContain('Sumber Tunggal');
    expect(lapsed.textContent).toContain('Kedaluwarsa');
    expect(none.textContent).toContain('Tidak Terdaftar');

    // ⚠️ NO EN LITERAL SURVIVES. The canonical English must be absent, which is
    // the assertion a "does the ID string appear?" check cannot make — a pill
    // rendering both would pass that one.
    expect(inForce.textContent).not.toContain('Sole Source');
    expect(lapsed.textContent).not.toContain('Expired');
    expect(none.textContent).not.toContain('Not Listed');
    expect(new Set([inForce, lapsed, none].map((e) => e.textContent)).size).toBe(3);
  });

  it('the filter chips localise', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerSuppliers />);
    await screen.findByText('PT Sample Specialty Fats');
    expect(screen.getByRole('radio', { name: /Semua PSL/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Berlaku/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /^In force/i })).toBeNull();
  });
});
