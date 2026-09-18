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
// ⚠️ **AND WHY THE EXEMPTION SENTENCE IS TESTED ON THE PANEL AND NOT IN THE
// WIZARD.** The wizard writes material NAMES into `materialIds`
// (`MATERIAL_CATALOG` is display prose and its intersection with the code
// vocabulary is EMPTY — measured, and queued as its own fix), so every draft a
// buyer builds is UNDECIDABLE and no wizard path can produce an exemption
// today. The code path is correct and reachable — `rfqSourcingGate.test.ts`
// drives it directly — but the only place it can be SEEN against live data is a
// seeded event, so that is where it is asserted.
// ─────────────────────────────────────────────────────────────────────────────
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerSourcing from './BuyerSourcing';
import { mockSuppliers } from '../data/mockSuppliers';
import { mockRfqs } from '../data/mockRfqs';
import { SupplierStatus } from '../types/supplier.types';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { decideSourcing, rosterStatusOf } from '../services/data/rfqSourcingGate';

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

/** Open the wizard and reach the invite step for a category + one material. */
const openInviteStep = async (
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

  it('⚠️ THE WIZARD REPORTS THE STANDING AS UNCHECKABLE — honestly, and without refusing', async () => {
    // The live face of the queued MATERIAL_CATALOG defect: a wizard draft
    // carries material NAMES, so the exemption question cannot be asked. The
    // event is NOT refused for it — two invitees still pass.
    await openInviteStep();
    await invite(PACKAGING_OK[0]);
    await invite(PACKAGING_OK[1]);
    const note = await screen.findByTestId('psl-gate-undecidable');
    expect(note.textContent).toContain('PET Bottle 100ml');
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
});
