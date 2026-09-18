// ─────────────────────────────────────────────────────────────────────────────
// THE PROFILE'S PSL TAB — the listing detail, and the deep link that opens it.
// ─────────────────────────────────────────────────────────────────────────────
import { screen, within, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerSupplierProfile from './BuyerSupplierProfile';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { PSL_LISTINGS } from '../services/data/mock/fixtures/pslListings';
import { effectiveCap, listingsForSupplier } from '../services/data/pslProjection';

const at = (id: string, query = ''): void => {
  renderWithProviders(
    <Routes>
      <Route path="/buyer/suppliers/:id" element={<BuyerSupplierProfile />} />
    </Routes>,
    { route: `/buyer/suppliers/${id}${query}` },
  );
};

const openPslTab = async (): Promise<void> => {
  fireEvent.click(await screen.findByText('Preferred list'));
};

describe('REACH — the fixture reaches the cases this file asserts', () => {
  it('sup-002 holds several listings; sup-001 holds none; psl-004 carries a cap override', () => {
    expect(listingsForSupplier(PSL_LISTINGS, 'sup-002', DECLARED_PRESENT).length).toBeGreaterThan(2);
    expect(listingsForSupplier(PSL_LISTINGS, 'sup-001', DECLARED_PRESENT)).toEqual([]);
    const psl004 = PSL_LISTINGS.find((r) => r.id === 'psl-004')!;
    expect(effectiveCap(psl004).source).toBe('LISTING_OVERRIDE');
    expect(psl004.capJustification).not.toBeNull();
  });
});

describe('BuyerSupplierProfile — the PSL tab (EN)', () => {
  it('the tab exists and renders the section', async () => {
    at('sup-002');
    await openPslTab();
    expect(await screen.findByTestId('psl-section')).toBeInTheDocument();
    expect(screen.getByText('Preferred Supplier List')).toBeInTheDocument();
  });

  it('⚠️ it SAYS it is read-only rather than looking broken', async () => {
    at('sup-002');
    await openPslTab();
    // A section with no affordance and no explanation reads as a defect.
    expect(
      screen.getByText(/listings are raised and approved off-portal/i),
    ).toBeInTheDocument();
  });

  it('a listing renders its scope, validity, cap, justification, evidence and history', async () => {
    at('sup-002');
    await openPslTab();
    const card = await screen.findByTestId('psl-listing-psl-001');
    const body = card.textContent ?? '';
    expect(body).toContain('RM-PSTN-7150'); // scope, verbatim
    expect(body).toContain('Sole Source');
    expect(body).toMatch(/Sole regional source for pressed stearin/); // justification
    expect(body).toContain('doc-101'); // evidence reference
    expect(body).toMatch(/Exclusivity evidence accepted/); // ledger entry
    expect(body).toMatch(/Portal default/); // cap source
  });

  it('⚠️ AN OVERRIDDEN CAP SHOWS ITS JUSTIFICATION AND ITS DECIDER', async () => {
    at('sup-005');
    await openPslTab();
    const card = await screen.findByTestId('psl-listing-psl-004');
    const body = card.textContent ?? '';
    expect(body).toContain('150 days');
    expect(body).toMatch(/Override recorded for this listing/);
    expect(body).toMatch(/must be re-taken before the next campaign/);
    // ⚠️ AND THE DECIDER IS A SENTENCE, NEVER A NAME. Every actor in this tree
    // is UNATTRIBUTED; a surface that printed a name would be inventing one.
    expect(body).toMatch(/Recorded without an identified person/);
  });

  it('⚠️ the CEILING-bounded row says it was bounded, not that it was chosen', async () => {
    at('sup-005');
    await openPslTab();
    const body = (await screen.findByTestId('psl-listing-psl-005')).textContent ?? '';
    expect(body).toMatch(/Bounded by the platform ceiling/);
  });

  it('⚠️ PUBLISHED and INTERNAL are visibly distinct, on rows that differ', async () => {
    at('sup-002');
    await openPslTab();
    const published = (await screen.findByTestId('psl-listing-psl-001')).textContent ?? '';
    const internal = (await screen.findByTestId('psl-listing-psl-002')).textContent ?? '';
    expect(published).toContain('Published');
    expect(internal).toContain('Internal');
    expect(internal).not.toContain('Published');
  });

  it('⚠️ PUBLICATION AND IN-FORCE ARE INDEPENDENT ON THE SURFACE TOO', async () => {
    at('sup-002');
    await openPslTab();
    // psl-003: PUBLISHED and EXPIRED — both facts on one card.
    const body = (await screen.findByTestId('psl-listing-psl-003')).textContent ?? '';
    expect(body).toContain('Published');
    expect(body).toContain('Expired');
    // psl-002: INTERNAL and in force (Expiring) — the other diagonal.
    const other = (await screen.findByTestId('psl-listing-psl-002')).textContent ?? '';
    expect(other).toContain('Internal');
    expect(other).toContain('Expiring');
  });

  it('a supplier with no listing gets an honest empty state, not a blank panel', async () => {
    at('sup-001');
    await openPslTab();
    expect(await screen.findByTestId('psl-section-empty')).toBeInTheDocument();
    expect(screen.getByText(/compete normally on every sourcing event/i)).toBeInTheDocument();
  });
});

describe('BuyerSupplierProfile — the deep link', () => {
  it('⚠️ `?id=<listing>` OPENS THE PSL TAB on that listing', async () => {
    at('sup-002', '?id=psl-003');
    // No click: the tab must open on arrival, or the link is broken.
    const card = await screen.findByTestId('psl-listing-psl-003');
    expect(card).toBeInTheDocument();
    expect(card.className).toContain('border-action'); // highlighted
  });

  it('⚠️ an UNKNOWN id renders safely — no panel, no toast, no error', async () => {
    at('sup-002', '?id=psl-does-not-exist');
    // `recordDeepLink`'s rule: a stale link is not a failure the reader caused
    // or can fix, so the page renders normally.
    const section = await screen.findByTestId('psl-section');
    expect(section).toBeInTheDocument();
    expect(within(section).getByTestId('psl-listing-psl-001').className).not.toContain(
      'border-action',
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('BuyerSupplierProfile — the PSL tab (ID)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('⚠️ renders in Indonesian with NO English literal left in the section', async () => {
    await i18n.changeLanguage('id');
    at('sup-002');
    fireEvent.click(await screen.findByText('Daftar preferensi'));
    const section = await screen.findByTestId('psl-section');
    const body = section.textContent ?? '';

    expect(body).toContain('Daftar Pemasok Preferensi');
    expect(body).toContain('Cakupan');
    expect(body).toContain('Sumber Tunggal');
    expect(body).toContain('Dipublikasikan');
    expect(body).toContain('Tercatat tanpa identitas orang');

    // The EN chrome must be GONE — the half a "does the ID string appear?"
    // check cannot make.
    expect(body).not.toContain('Preferred Supplier List');
    expect(body).not.toContain('Scope');
    expect(body).not.toContain('Sole Source');
    expect(body).not.toContain('Recorded without an identified person');
    // ⚠️ But the DATA must survive untranslated: a material code is opaque
    // (C9 §3) and a justification is authored fixture prose, not chrome.
    expect(body).toContain('RM-PSTN-7150');
  });
});
