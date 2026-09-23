// ─────────────────────────────────────────────────────────────────────────────
// THE SOURCING GATE'S SURFACE — the step-1 mirror, the allowance note, and the
// two sentences a buyer reads instead of a disabled control with no reason.
//
// ⚠️ **THE MIRROR REFUSES THE STEP AND NEVER A CHECKBOX.** That distinction is
// the whole reason this file exists beside `BuyerSourcingPsl.test.tsx`, whose
// three negative assertions (a Suspended supplier is invitable, a lapsed-PSL
// supplier is invitable, no candidate checkbox is disabled) must keep passing
// verbatim. A buyer has to be able to select and DESELECT freely to reach a
// valid set; disabling the control they need in order to comply is the false
// affordance this lane exists to avoid.
//
// ⚠️ **WHY THE EXEMPTION SENTENCE IS TESTED ON THE PANEL AND NOT IN THE WIZARD
// — AND THE REASON THAT USED TO STAND HERE IS RETIRED, NOT EDITED.** It read
// that the wizard *"writes material NAMES into `materialIds`"* so that *"every
// draft a buyer builds is UNDECIDABLE and no wizard path can produce an
// exemption today"*. That was true and is no longer: the catalog carries master
// codes on 9 of 23 entries, and a wizard draft on one of those reaches the gate
// with a real code.
//
// The sentence is still asserted on the panel, for a NARROWER reason that
// survives: **no catalog entry's code holds an in-force designation that
// suspends bidding** — derived, not assumed — so `NOT_REQUIRED` still cannot be
// produced from the wizard, while every other verdict now can. A seeded event
// remains the only place that one sentence can be seen against live data.
// ─────────────────────────────────────────────────────────────────────────────
import { screen, fireEvent, within, cleanup } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerSourcing, { MATERIAL_CATALOG } from './BuyerSourcing';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { MATERIAL_MASTER } from '../services/sdc/fixtures';
import { mockSuppliers } from '../data/mockSuppliers';
import { mockRfqs } from '../data/mockRfqs';
import { SupplierStatus } from '../types/supplier.types';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { decideSourcing, rosterStatusOf } from '../services/data/rfqSourcingGate';
import { seedPslListings } from '../services/data/mock/pslSeed';
import { pslStore } from '../services/data/mock/stores/pslStore';


// ── ⚠️ THE PSL CORPUS IS SEEDED HERE NOW, AND THE REASON IS B-S4c ───────────
//   Until PSL P3 the nine listings were LITERALS in a frozen module, so any
//   file that read them implicitly — through `pslStatusFor`'s or
//   `pslExemptionFor`'s defaulted corpus — got them for free at import.
//
//   P3 retired that fixture. The corpus is GROWN through the verbs into
//   `pslStore`, which opens EMPTY, so a spec that does not seed reads `[]` and
//   every PSL-dependent claim in it passes vacuously — the
//   `EMPTY-INPUT-REPORTS-CLEAN-01` shape, arriving through a default parameter.
//
//   The seed's own outcome is asserted rather than assumed: a half-seeded store
//   would make every assertion below a different, quieter test.

beforeAll(async () => {
  pslStore.reset();
  const pslSeeded = await seedPslListings();
  expect(pslSeeded.status, pslSeeded.reason ?? '').toBe('seeded');
});


const SUSPENDED = mockSuppliers.find((s) => s.status === SupplierStatus.SUSPENDED)!;

/** The ELIGIBLE candidates a category offers — derived, never typed out.
 *
 *  ⚠️ **TWO CATEGORIES ARE NEEDED AND THE REASON IS A MEASUREMENT.** Packaging
 *  is the only category holding the Suspended supplier, so the eligibility arm
 *  must run there — and Packaging has only TWO eligible suppliers, so the
 *  "three invitees produce no note" arm CANNOT be reached in it. Active
 *  Ingredients has three. Using one category for both would have meant a spec
 *  that silently tested two invitees while claiming to test three. */
const eligibleIn = (category: string): string[] =>
  mockSuppliers
    .filter((s) => s.category === category && s.status === SupplierStatus.ACTIVE)
    .map((s) => s.name);

const PACKAGING_OK = eligibleIn('Packaging');
const ACTIVE_ING_OK = eligibleIn('Active Ingredient');

let newRfqLabel = 'New RFQ';
let qtyLabel: RegExp = /Total quantity/i;
let nextLabel: RegExp = /^Next$/i;

/** Open the wizard and FILL step 0, stopping while the picker is still on
 *  screen. Split out of `openInviteStep` because the code-less note lives IN
 *  the picker — it is said while the buyer can still change the pick, so a
 *  helper that walks past step 0 can never see it. */
const openMaterialStep = async (
  category = 'Packaging',
  material = 'PET Bottle 100ml',
): Promise<void> => {
  renderWithProviders(<BuyerSourcing />);
  fireEvent.click(await screen.findByText(newRfqLabel));
  // Found by option VALUE: the visible label is translated, so a name match
  // works in EN and finds nothing in ID.
  const selects = await screen.findAllByRole('combobox');
  const select = selects.find((el) =>
    Array.from((el as HTMLSelectElement).options).some((o) => o.value === category),
  )!;
  fireEvent.change(select, { target: { value: category } });
  // The title input carries neither `htmlFor` nor `aria-label`; the placeholder
  // fragment `Q3 2026` is identical in both locales, which is what lets one
  // helper drive the wizard in either.
  fireEvent.change(screen.getByPlaceholderText(/Q3 2026/), {
    target: { value: 'PSL P2 mirror smoke' },
  });
  fireEvent.click(await screen.findByText(material));
  fireEvent.change(await screen.findByLabelText(qtyLabel), { target: { value: '2400' } });
};

/** Open the wizard and reach the invite step for a category + one material. */
const openInviteStep = async (
  category = 'Packaging',
  material = 'PET Bottle 100ml',
): Promise<void> => {
  await openMaterialStep(category, material);
  fireEvent.click(screen.getByRole('button', { name: nextLabel }));
};

/** The candidate-table row for a supplier (the name also appears above it). */
const candidateRow = (matches: HTMLElement[]): HTMLElement => {
  for (const m of matches) {
    const tr = m.closest('tr');
    if (tr && tr.querySelector('input[type="checkbox"]')) return tr as HTMLElement;
  }
  throw new Error('no candidate row with a checkbox');
};

const invite = async (name: string): Promise<void> => {
  const row = candidateRow(await screen.findAllByText(name));
  fireEvent.click(within(row).getByRole('checkbox'));
};

const nextButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: nextLabel }) as HTMLButtonElement;

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the fixture reaches every arm this file renders', () => {
  it('Packaging holds the Suspended supplier and TWO eligible ones', () => {
    // Without this, "a Suspended invitee refuses the step" is vacuous — and the
    // count is what forces the second category below.
    expect(SUSPENDED.category).toBe('Packaging');
    expect(PACKAGING_OK.length).toBe(2);
  });

  it('⚠️ AND Active Ingredient holds THREE eligible ones — the only way past the floor', () => {
    // If this ever drops to two, the "no note at three" arm becomes a
    // two-invitee test wearing a three-invitee name, and it would pass.
    expect(ACTIVE_ING_OK.length).toBeGreaterThanOrEqual(3);
    expect(mockSuppliers.filter((s) => s.category === 'Active Ingredient' && s.status !== SupplierStatus.ACTIVE).length).toBeGreaterThan(0);
  });

  it('⚠️ AND A SEEDED EVENT IS GENUINELY EXEMPT — reached through the decision', () => {
    // Named through a VALUE: the row whose decision is NOT_REQUIRED, not a row
    // chosen by id and asserted to be exempt.
    const exempt = mockRfqs.filter(
      (r) => decideSourcing(r, DECLARED_PRESENT, rosterStatusOf).competition.kind === 'NOT_REQUIRED',
    );
    expect(exempt.map((r) => r.rfqNumber).sort()).toEqual(['RFQ-2026-001', 'RFQ-2026-014']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE STEP-1 MIRROR (EN) — the step refuses, the controls do not', () => {
  it('⚠️ ONE INVITEE: Next is refused AND the reason is on screen', async () => {
    await openInviteStep();
    await invite(PACKAGING_OK[0]);

    expect(nextButton().disabled).toBe(true);
    const note = await screen.findByTestId('psl-gate-under-floor');
    expect(note.textContent).toMatch(/needs at least 2 eligible suppliers/i);
    expect(note.textContent).toContain('1');
  });

  it('⚠️ AND NOT ONE CHECKBOX IS DISABLED WHILE THE STEP IS REFUSED', async () => {
    // The assertion that separates a mirror from a page gate. The buyer is
    // being refused and must still be able to reach a valid set.
    await openInviteStep();
    await invite(PACKAGING_OK[0]);
    expect(nextButton().disabled).toBe(true);
    const boxes = (await screen.findAllByRole('checkbox')) as HTMLInputElement[];
    expect(boxes.length).toBeGreaterThan(1);
    expect(boxes.filter((b) => b.disabled)).toEqual([]);
  });

  it('⚠️ TWO INVITEES: the ALLOWANCE NOTE renders and Next is permitted', async () => {
    await openInviteStep();
    await invite(PACKAGING_OK[0]);
    await invite(PACKAGING_OK[1]);

    const note = await screen.findByTestId('psl-gate-at-floor');
    expect(note.textContent).toMatch(/three is the standard/i);
    // ⚠️ AN ALLOWANCE, NOT A REFUSAL — the half no policy hook could carry.
    expect(nextButton().disabled).toBe(false);
    expect(screen.queryByTestId('psl-gate-under-floor')).toBeNull();
  });

  it('⚠️ THREE INVITEES: NO note at all', async () => {
    // Active Ingredients, because Packaging cannot reach three (see above).
    await openInviteStep('Active Ingredients', 'Niacinamide USP');
    for (const n of ACTIVE_ING_OK.slice(0, 3)) await invite(n);
    expect(nextButton().disabled).toBe(false);
    expect(screen.queryByTestId('psl-gate-at-floor')).toBeNull();
    expect(screen.queryByTestId('psl-gate-under-floor')).toBeNull();
  });

  it('⚠️ A SUSPENDED INVITEE REFUSES THE STEP, NAMING THE COMPANY AND ITS STATUS', async () => {
    await openInviteStep();
    for (const n of PACKAGING_OK.slice(0, 2)) await invite(n);
    expect(nextButton().disabled).toBe(false); // …and it was valid before
    await invite(SUSPENDED.name);

    const note = await screen.findByTestId('psl-gate-ineligible');
    expect(note.textContent).toContain(SUSPENDED.name);
    expect(note.textContent).toContain('Suspended');
    expect(nextButton().disabled).toBe(true);
    // The eligibility refusal is DISTINCT from the competition one — a buyer
    // reading one message for two causes cannot act on it.
    expect(screen.queryByTestId('psl-gate-under-floor')).toBeNull();
  });

  it('⚠️ AND DESELECTING THE SUSPENDED SUPPLIER RESTORES THE STEP', async () => {
    // The remedy the refusal names, actually working. A refusal whose stated
    // fix does nothing is the dead end this lane keeps finding.
    await openInviteStep();
    for (const n of PACKAGING_OK.slice(0, 2)) await invite(n);
    await invite(SUSPENDED.name);
    expect(nextButton().disabled).toBe(true);
    await invite(SUSPENDED.name); // toggle off
    expect(screen.queryByTestId('psl-gate-ineligible')).toBeNull();
    expect(nextButton().disabled).toBe(false);
  });

  it('⚠️ A CODE-LESS MATERIAL IS NAMED AS SUCH — honestly, and without refusing', async () => {
    // ⚠️ **THIS ASSERTION WAS INVERTED RATHER THAN DELETED, per the 2B-2
    // convention.** It used to demand `psl-gate-undecidable` naming
    // `'PET Bottle 100ml'`, because the wizard shipped that STRING as a
    // material code and the gate could not resolve it. The catalog fix removed
    // the string from the payload, so the gate now has nothing unresolvable to
    // report — `pslExemptionFor` returns UNDECIDABLE only when it HELD codes it
    // could not resolve, and a code-less pick hands it none.
    //
    // **The honesty did not move, it changed hands.** What the buyer must be
    // told is that this material has no master code, and that is now said at
    // the PICKER, where they can still act on it, rather than at a gate that
    // has correctly stopped having an opinion.
    await openMaterialStep();
    const codeless = await screen.findByTestId('catalog-codeless-note');
    expect(codeless.textContent).toContain('PET Bottle 100ml');
    fireEvent.click(screen.getByRole('button', { name: nextLabel }));
    await invite(PACKAGING_OK[0]);
    await invite(PACKAGING_OK[1]);
    // Nothing unresolvable reached the gate, so it says nothing about codes…
    expect(screen.queryByTestId('psl-gate-undecidable')).toBeNull();
    // …and the event is NOT refused for it — two invitees still pass.
    expect(nextButton().disabled).toBe(false);
  });

  it('⚠️ AND A CODED MATERIAL REACHES THE GATE WITH A REAL CODE — no note at all', async () => {
    // The other half, and the one that could not exist before this batch: an
    // ordinary buyer-raised draft whose material IS in the master. The gate has
    // a real code to judge, finds no in-force designation, and says nothing —
    // which is the correct silence rather than an absent instrument.
    await openMaterialStep('Active Ingredients', 'Sodium Hyaluronate HMW');
    expect(screen.queryByTestId('catalog-codeless-note')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: nextLabel }));
    for (const n of ACTIVE_ING_OK.slice(0, 3)) await invite(n);
    expect(screen.queryByTestId('psl-gate-undecidable')).toBeNull();
    expect(screen.queryByTestId('psl-gate-under-floor')).toBeNull();
    expect(nextButton().disabled).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE EXEMPTION SENTENCE, ON A REAL EVENT (EN)', () => {
  it('names the supplier, the designation AND the material code', async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-001'));
    const note = await screen.findByTestId('psl-gate-not-required');
    expect(note.textContent).toMatch(/not required/i);
    expect(note.textContent).toContain('Mandatory');
    expect(note.textContent).toContain('AI-NIAC-6601');
    // The company, not the id — a refusal or an allowance that names `sup-005`
    // asks the reader to do the lookup.
    expect(note.textContent).toContain(mockSuppliers.find((s) => s.id === 'sup-005')!.name);
    expect(note.textContent).not.toContain('sup-005');
  });

  it('and an event with no exemption says nothing on the panel', async () => {
    // rfq-009: two invitees, no listing on RM-HUMEC-3405 ⇒ AT_FLOOR, not exempt.
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-009'));
    await screen.findByTestId('psl-gate-panel');
    expect(screen.queryByTestId('psl-gate-not-required')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE GATE SPEAKS INDONESIAN', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
    newRfqLabel = 'New RFQ';
    qtyLabel = /Total quantity/i;
    nextLabel = /^Next$/i;
  });

  const toId = async () => {
    await i18n.changeLanguage('id');
    newRfqLabel = 'RFQ Baru';
    qtyLabel = /Total kuantitas/i;
    nextLabel = /^Berikutnya$/i;
  };

  it('the floor refusal renders in ID, with no EN literal left', async () => {
    await toId();
    await openInviteStep();
    await invite(PACKAGING_OK[0]);
    const note = await screen.findByTestId('psl-gate-under-floor');
    expect(note.textContent).toMatch(/memerlukan setidaknya 2 pemasok yang memenuhi syarat/i);
    expect(note.textContent).not.toMatch(/eligible suppliers/i);
  });

  it('the allowance note renders in ID', async () => {
    await toId();
    await openInviteStep();
    await invite(PACKAGING_OK[0]);
    await invite(PACKAGING_OK[1]);
    const note = await screen.findByTestId('psl-gate-at-floor');
    expect(note.textContent).toMatch(/Tiga adalah standar/i);
    expect(note.textContent).not.toMatch(/standard/i);
  });

  it('⚠️ the eligibility refusal renders in ID, and the STATUS WORD is translated too', async () => {
    // `Suspended` → `Ditangguhkan` comes from the CENTRAL status map, not from
    // this namespace. A copy of the word here would be the second copy that
    // goes wrong in the locale nobody is testing.
    await toId();
    await openInviteStep();
    for (const n of PACKAGING_OK.slice(0, 2)) await invite(n);
    await invite(SUSPENDED.name);
    const note = await screen.findByTestId('psl-gate-ineligible');
    expect(note.textContent).toContain(SUSPENDED.name);
    expect(note.textContent).not.toContain('Suspended');
    expect(note.textContent).toMatch(/tidak boleh diundang/i);
  });

  it('the exemption sentence renders in ID, and the material code does NOT translate', async () => {
    await toId();
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-001'));
    const note = await screen.findByTestId('psl-gate-not-required');
    expect(note.textContent).toMatch(/Tender kompetitif tidak diperlukan/i);
    expect(note.textContent).toContain('Wajib'); // Mandatory, centrally localised
    // C9 §3 — a material code is contractually opaque DATA and renders verbatim.
    expect(note.textContent).toContain('AI-NIAC-6601');
    expect(note.textContent).not.toMatch(/not required/i);
  });

  it('⚠️ THE CODE-LESS SENTENCE RENDERS IN ID, AND THE LABEL DOES NOT TRANSLATE', async () => {
    await toId();
    await openMaterialStep();
    const note = await screen.findByTestId('catalog-codeless-note');
    expect(note.textContent).toMatch(/Tidak ada di master material/i);
    expect(note.textContent).not.toMatch(/Not in the material master/i);
    // A catalog label is authored data, not a translatable string — the same
    // rule a material code renders under, and the reason the picker can be
    // driven by one helper in either locale.
    expect(note.textContent).toContain('PET Bottle 100ml');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE PICKER RENDERS THE SAME 23 LABELS IN BOTH LOCALES', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
    newRfqLabel = 'New RFQ';
    qtyLabel = /Total quantity/i;
    nextLabel = /^Next$/i;
  });

  /** Every chip face in the open picker, in render order. */
  const chipFaces = (): string[] =>
    [
      ...screen.queryAllByTestId('catalog-chip-coded'),
      ...screen.queryAllByTestId('catalog-chip-codeless'),
    ].map((b) => b.textContent ?? '');

  const openPicker = async (category: string) => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText(newRfqLabel));
    const selects = await screen.findAllByRole('combobox');
    const select = selects.find((el) =>
      Array.from((el as HTMLSelectElement).options).some((o) => o.value === category),
    )!;
    fireEvent.change(select, { target: { value: category } });
  };

  // ⚠️ DERIVED FROM THE SHIPPED CATALOG, NEVER TYPED OUT — `materialCatalog.
  // test.ts` is where the label set is PINNED as a value. Typing them again here
  // would be a second copy that can disagree, and the thing under test is that
  // the RENDER matches the data, in both locales.
  for (const category of Object.keys(MATERIAL_CATALOG)) {
    it(`${category}: EN and ID render the catalog's own labels, byte for byte`, async () => {
      const expected = MATERIAL_CATALOG[category as keyof typeof MATERIAL_CATALOG].map(
        (e) => e.label,
      );
      expect(expected.length).toBeGreaterThan(0); // anti-vacuity

      await openPicker(category);
      expect(chipFaces().sort()).toEqual([...expected].sort());
      cleanup();

      await i18n.changeLanguage('id');
      newRfqLabel = 'RFQ Baru';
      await openPicker(category);
      expect(chipFaces().sort()).toEqual([...expected].sort());
    });
  }

  it('CONTROL — the chip harness can FAIL: a fabricated label is never rendered', async () => {
    await openPicker('Emulsifiers');
    expect(chipFaces()).not.toContain('Zzz Not A Real Material');
    expect(chipFaces().length).toBe(MATERIAL_CATALOG.Emulsifiers.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ END TO END — WHAT THE WIZARD ACTUALLY MINTS', () => {
  beforeEach(() => rfqStore.reset());

  /** Walk the whole wizard: scope -> suppliers -> terms -> review -> save.
   *  The two deadlines are found by INPUT TYPE, not by label: their labels are
   *  translated and this helper has to work in either locale. */
  const raise = async (category: string, material: string, invitees: string[]) => {
    await openInviteStep(category, material);
    for (const n of invitees) await invite(n);
    fireEvent.click(screen.getByRole('button', { name: nextLabel })); // -> terms
    const dates = Array.from(
      document.querySelectorAll('input[type="date"]'),
    ) as HTMLInputElement[];
    expect(dates.length).toBeGreaterThanOrEqual(2); // anti-vacuity on the walk
    fireEvent.change(dates[0], { target: { value: '2026-10-01' } });
    fireEvent.change(dates[1], { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: nextLabel })); // -> review
    fireEvent.click(await screen.findByRole('button', { name: /Save RFQ draft/i }));
  };

  it('⚠️ A CODED PICK MINTS A MASTER CODE — the defect, inverted', async () => {
    await raise('Active Ingredients', 'Sodium Hyaluronate HMW', ACTIVE_ING_OK.slice(0, 3));
    const minted = rfqStore.all().find((r) => r.title === 'PSL P2 mirror smoke')!;
    expect(minted).toBeDefined();
    expect(minted.materialIds).toEqual(['AI-HYALU-6610']);
    // The assertion that would have failed before this batch, stated as such.
    expect(minted.materialIds.every((c) => c in MATERIAL_MASTER)).toBe(true);
    expect(JSON.stringify(minted.materialIds)).not.toContain('Sodium Hyaluronate HMW');
  });

  it('⚠️ A CODE-LESS PICK MINTS NOTHING — not the label, not a placeholder', async () => {
    await raise('Packaging', 'PET Bottle 100ml', PACKAGING_OK.slice(0, 2));
    const minted = rfqStore.all().find((r) => r.title === 'PSL P2 mirror smoke')!;
    expect(minted).toBeDefined();
    expect(minted.materialIds).toEqual([]);
    expect(JSON.stringify(minted)).not.toContain('PET Bottle 100ml');
  });
});
