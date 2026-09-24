// ─────────────────────────────────────────────────────────────────────────────
// THE PROFILE'S PSL TAB — the listing detail, and the deep link that opens it.
// ─────────────────────────────────────────────────────────────────────────────
import { screen, within, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerSupplierProfile from './BuyerSupplierProfile';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { seedPslListings } from '../services/data/mock/pslSeed';
import { pslStore } from '../services/data/mock/stores/pslStore';
import { effectiveCap, listingsForSupplier } from '../services/data/pslProjection';
import {
  PSL_LIFECYCLES,
  PSL_STATUSES,
  type PslListing,
} from '../services/data/pslListing';
import PslListingsSection from '../components/v2-features/PslListingsSection';

/**
 * THE CORPUS, GROWN RATHER THAN IMPORTED.
 *
 * ⚠️ **`PSL_LISTINGS` IS GONE AND THIS IS ITS REPLACEMENT** (PSL P3, operator
 * ruling h). The nine rows are no longer `PslListing` literals in a frozen
 * fixture — they are PAYLOADS in `pslSeed.ts`, dispatched through
 * `t_psl_propose` and its siblings under LANE-CORRECT scopes. So the corpus
 * does not exist until the seed has run, which is why this is a FUNCTION and
 * not a const: a module-scope read would capture `[]`.
 *
 * ⚠️ **AND THAT IS THE `EMPTY-INPUT-REPORTS-CLEAN-01` SHAPE, WHICH IS WHY THE
 * SEED'S OWN OUTCOME IS ASSERTED BELOW AND EVERY POPULATION GUARD IN THIS FILE
 * ASSERTS MEMBERSHIP.** "No row is malformed" passes vacuously over `[]`.
 */
const pslRows = (): readonly PslListing[] => pslStore.all();

// ⚠️ SEEDED ONCE, THROUGH THE REAL VERBS. `pslStore.reset()` runs first so the
// file does not depend on whatever order vitest loaded modules in.
beforeAll(async () => {
  pslStore.reset();
  const outcome = await seedPslListings();
  // The seed's own refusal is REPORTED rather than swallowed: a half-seeded
  // store would make every assertion below a different, quieter test.
  expect(outcome.status, outcome.reason ?? '').toBe('seeded');
});


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
    expect(listingsForSupplier(pslRows(), 'sup-002', DECLARED_PRESENT).length).toBeGreaterThan(2);
    expect(listingsForSupplier(pslRows(), 'sup-001', DECLARED_PRESENT)).toEqual([]);
    const psl004 = pslRows().find((r) => r.id === 'psl-004')!;
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

  it('⚠️ THE READ-ONLY CLAIM IS GONE, AND THE VERBS THAT FALSIFIED IT ARE HERE', async () => {
    // ⚠️ **THE ASSERTION THIS REPLACES WENT FALSE AT P3, AND IT IS REPLACED BY
    // A STRONGER ONE RATHER THAN DELETED.** It read
    // `getByText(/listings are raised and approved off-portal/i)` — an honest
    // sentence for a tree with no verbs, and a lie the moment eight landed. A
    // spec asserting the false copy would have kept the false copy.
    //
    // What is asserted instead is BOTH halves: the old sentence is ABSENT (so
    // the copy really changed and was not merely added to), and the affordances
    // that make it false are PRESENT (so the subtitle is not describing a
    // screen that still has nothing on it).
    at('sup-002');
    await openPslTab();
    expect(screen.queryByText(/raised and approved off-portal/i)).toBeNull();
    expect(screen.getByText(/new listings are raised on the Preferred suppliers queue/i))
      .toBeInTheDocument();

    // The five LISTED-row verbs, on a Listed row. `psl-001` is published, so
    // the publish affordance is correctly absent and a SENTENCE stands in its
    // place — see the publication spec below.
    expect(await screen.findByTestId('psl-actions-psl-001')).toBeInTheDocument();
    expect(screen.getByTestId('psl-open-change-psl-001')).toBeInTheDocument();
    expect(screen.getByTestId('psl-open-renew-psl-001')).toBeInTheDocument();
    expect(screen.getByTestId('psl-open-withdraw-psl-001')).toBeInTheDocument();
    expect(screen.getByTestId('psl-open-cap-psl-001')).toBeInTheDocument();

    // ⚠️ AND PROPOSING IS DELIBERATELY NOT HERE (operator ruling g): raising a
    // listing and deciding one must not compose into a single panel.
    expect(screen.queryByTestId('psl-propose-open')).toBeNull();
  });

  it('⚠️ THE VERBS ARE OFFERED ONLY ON A `Listed` ROW — the mode, not the door', async () => {
    // `psl-008` is `Proposed` and `psl-006` is `Withdrawn`; neither is a
    // subject for change-status, renew, withdraw, publish or a cap override,
    // and the machine would refuse all five. An affordance the dispatcher
    // refuses is the false-affordance shape R1 swept out of this tree.
    at('sup-007');
    await openPslTab();
    await screen.findByTestId('psl-listing-psl-008');
    expect(screen.queryByTestId('psl-actions-psl-008')).toBeNull();
    expect(screen.queryByTestId('psl-actions-psl-006')).toBeNull();
    expect(screen.queryByTestId('psl-actions-psl-007')).toBeNull();
  });

  it('⚠️ AN ALREADY-PUBLISHED ROW OFFERS NO PUBLISH, AND SAYS WHY', async () => {
    // Ruling (b): `publishedAt` is write-once history. An absent button with no
    // explanation reads as a broken screen, and an "unpublish" would offer an
    // act this platform refuses to build — so the row carries a SENTENCE.
    at('sup-002');
    await openPslTab();
    await screen.findByTestId('psl-actions-psl-001');
    expect(screen.queryByTestId('psl-publish-psl-001')).toBeNull();
    expect(screen.getByTestId('psl-published-notice-psl-001').textContent).toMatch(
      /Later changes reach them without sharing again/i,
    );

    // ⚠️ KNOWN-GOOD: the UNPUBLISHED in-force row DOES offer it. Without this
    // the assertion above would pass on a tab that offered publish nowhere.
    expect(screen.getByTestId('psl-publish-psl-002')).toBeInTheDocument();
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
    // ⚠️ **THIS READ "THE DECIDER IS A SENTENCE, NEVER A NAME", AND THE SEEDED
    // CORPUS NOW NAMES ONE (R4).** The old line rested on *"Every actor in this
    // tree is UNATTRIBUTED; a surface that printed a name would be inventing
    // one."* A roster person is not invented — but it is not a REAL person
    // either, so the replacement asserts the thing that now matters: the label
    // is rendered WITH ITS SAMPLE MARKER. A decider printed as a bare name here
    // would be the one place in the portal a demo identity reads as a sign-in.
    expect(body).toMatch(/Compliance 1 \(SAMPLE\)/);
  });

  it('⚠️ THE CEILING-BOUNDED WORDING STILL RENDERS — on a SYNTHETIC row', () => {
    // ── ⚠️ THIS ARM MOVED FROM SEEDED TO SYNTHETIC AT P3 (operator ruling h),
    //    AND THE MOVE IS RECORDED RATHER THAN LEFT TO BE NOTICED ────────────
    // It read `psl-005`, which carried a 2000-day override in the retired
    // fixture precisely to exercise `CEILING_BOUNDED` from DATA.
    // `PSL_CAP_WITHIN_CEILING` now REFUSES any override above the ceiling, so
    // the machine cannot produce that row — and weakening the hook to keep a
    // fixture would be authoring a defect to keep a test green.
    //
    // The COMPUTATION is covered synthetically in `pslProjection.test.ts`.
    // This is the other half: the SURFACE still has words for the arm, so a
    // ledger written under a HIGHER ceiling that a later ruling lowers renders
    // "bounded" rather than silently reading as "chosen". The section takes its
    // listings as a prop, so a synthetic row needs no fixture and no store.
    const synthetic: PslListing = {
      id: 'psl-ceiling-synthetic',
      supplierId: 'sup-005',
      scope: { kind: 'material', materialCodes: ['AI-HYALU-6610'] },
      status: 'Validated',
      lifecycle: 'Listed',
      validFrom: DECLARED_PRESENT,
      validUntil: '2099-01-01',
      capDaysOverride: 5000,
      capJustification: 'recorded when the ceiling was higher',
      capDecidedBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
      capDecidedAt: DECLARED_PRESENT,
      justification: 'synthetic',
      evidenceRefs: [],
      proposedBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
      decidedBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
      publishedAt: null,
      publishedBy: null,
      statusHistory: [],
    };
    renderWithProviders(
      <PslListingsSection listings={[synthetic]} nowIso={DECLARED_PRESENT} />,
    );
    const body = screen.getByTestId('psl-listing-psl-ceiling-synthetic').textContent ?? '';
    expect(body).toMatch(/Bounded by the platform ceiling/);
  });

  it('⚠️ AND THE SEEDED ROW THAT USED TO CARRY IT NOW READS THE PORTAL DEFAULT', async () => {
    // The other side of the move: `psl-005` is still in the corpus, still the
    // EARLY EDGE of the anchor window, and now carries no override at all — so
    // it renders the unrecorded-default wording. Asserting it is what stops the
    // row quietly gaining an override again.
    at('sup-005');
    await openPslTab();
    const body = (await screen.findByTestId('psl-listing-psl-005')).textContent ?? '';
    expect(body).toMatch(/no cap has been set/i);
    expect(body).not.toMatch(/Bounded by the platform ceiling/);
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
    // The ID marker, and it is deliberately a DIVERGENT token: `CONTOH` is not
    // spelled the way English spells it, so this assertion can actually fail.
    expect(body).toContain('(CONTOH)');

    // The EN chrome must be GONE — the half a "does the ID string appear?"
    // check cannot make.
    expect(body).not.toContain('Preferred Supplier List');
    expect(body).not.toContain('Scope');
    expect(body).not.toContain('Sole Source');
    expect(body).not.toContain('(SAMPLE)');
    // ⚠️ But the DATA must survive untranslated: a material code is opaque
    // (C9 §3) and a justification is authored fixture prose, not chrome.
    expect(body).toContain('RM-PSTN-7150');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE RENDER-SITE HALF OF THE PR #364 SMOKE DEFECT.
//
// `statusLabel.test.ts` now proves every PSL word HAS a key in both locales.
// That is necessary and not sufficient: the status-history line rendered
// `{h.lifecycle}` RAW, outside any `StatusPill`, so it had no key at all and
// would have stayed English with the map fully populated. These specs assert
// the WORDS ON SCREEN, per site, so the two halves cannot pass independently.
//
// ⚠️ AND THE ENGLISH THAT MUST SURVIVE IS ASSERTED TOO. Authored justification
// prose and ledger reasons are fixture content, not chrome — the same call
// `SupplierDocument.rejectionReason` gets. A spec that swept all English out of
// the section would "pass" by translating data, which is the opposite defect.
// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ PSL lifecycle words localise at EVERY site (ID)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  /**
   * The pill texts of one card, its raw history lines, and — the precise one —
   * the LIFECYCLE TOKEN of each ledger line.
   *
   * The line is `<date> · <lifecycle> — <reason>`, so the token is what sits
   * between the separators. Reading it directly rather than searching the whole
   * line keeps the assertion off the authored reason prose, which is English by
   * design and must stay that way.
   */
  const readCard = (id: string) => {
    const card = screen.getByTestId(`psl-listing-${id}`);
    const history = [...card.querySelectorAll('ol li')].map((e) => e.textContent ?? '');
    return {
      pills: [...card.querySelectorAll('span.rounded-sm')].map((e) => e.textContent ?? ''),
      history,
      lifecycleTokens: history.map((l) => (l.split(' · ')[1] ?? '').split(' — ')[0].trim()),
    };
  };

  it('⚠️ the LIFECYCLE PILL and the HISTORY LINE both read Indonesian', async () => {
    await i18n.changeLanguage('id');
    at('sup-002');
    fireEvent.click(await screen.findByText('Daftar preferensi'));
    await screen.findByTestId('psl-listing-psl-001');

    const c1 = readCard('psl-001');
    // The pill row: designation · lifecycle · publication.
    expect(c1.pills).toContain('Sumber Tunggal');
    expect(c1.pills).toContain('Terdaftar');
    expect(c1.pills).not.toContain('Listed');
    expect(c1.pills).not.toContain('Sole Source');

    // THE LINE THE OPERATOR SAW. psl-001's ledger opens at `Proposed`.
    const proposedLine = c1.history.find((l) => l.includes('Diajukan'));
    expect(proposedLine, 'no history line rendered the ID word for Proposed').toBeDefined();
    expect(c1.lifecycleTokens).toContain('Diajukan');
    expect(c1.lifecycleTokens).toContain('Terdaftar');
    expect(c1.lifecycleTokens).not.toContain('Proposed');
    expect(c1.lifecycleTokens).not.toContain('Listed');
  });

  it('⚠️ NO English PSL vocabulary survives on any pill in the section', () => {
    // Derived from the vocabularies themselves rather than a hand list, so a
    // word added to either union is covered here with no edit.
    return (async () => {
      await i18n.changeLanguage('id');
      at('sup-002');
      fireEvent.click(await screen.findByText('Daftar preferensi'));
      await screen.findByTestId('psl-listing-psl-001');
      const pills = [...document.querySelectorAll('[data-testid^=psl-listing-] span.rounded-sm')]
        .map((e) => e.textContent ?? '');
      expect(pills.length).toBeGreaterThan(6);
      const english = [...PSL_STATUSES, ...PSL_LIFECYCLES, 'Scheduled', 'Expiring', 'Expired'];
      const leaked = pills.filter((p) => english.includes(p));
      expect(leaked).toEqual([]);
    })();
  });

  it('⚠️ the WITHDRAWN and REJECTED words localise too — sup-007 carries both', async () => {
    await i18n.changeLanguage('id');
    at('sup-007');
    fireEvent.click(await screen.findByText('Daftar preferensi'));
    await screen.findByTestId('psl-listing-psl-006');
    expect(readCard('psl-006').pills).toContain('Ditarik');
    expect(readCard('psl-007').pills).toContain('Ditolak');
    // and the ledger entries that carry those lifecycles
    expect(readCard('psl-006').lifecycleTokens).toContain('Ditarik');
    expect(readCard('psl-006').lifecycleTokens).not.toContain('Withdrawn');
  });

  it('⚠️ AUTHORED PROSE STAYS ENGLISH — the opposite defect is asserted too', async () => {
    await i18n.changeLanguage('id');
    at('sup-002');
    fireEvent.click(await screen.findByText('Daftar preferensi'));
    const card = await screen.findByTestId('psl-listing-psl-001');
    const body = card.textContent ?? '';
    // Justification and ledger reason are fixture DATA, not chrome.
    expect(body).toContain('Sole regional source for pressed stearin');
    expect(body).toContain('Exclusivity evidence accepted');
    // …and the material code is opaque (C9 §3), so it renders verbatim.
    expect(body).toContain('RM-PSTN-7150');
  });

  it('EN is unchanged — the lifecycle still reads its canonical English', async () => {
    at('sup-002');
    fireEvent.click(await screen.findByText('Preferred list'));
    await screen.findByTestId('psl-listing-psl-001');
    const c1 = readCard('psl-001');
    expect(c1.pills).toContain('Listed');
    expect(c1.pills).toContain('Sole Source');
    expect(c1.lifecycleTokens).toContain('Proposed');
    expect(c1.lifecycleTokens).toContain('Listed');
  });
});
