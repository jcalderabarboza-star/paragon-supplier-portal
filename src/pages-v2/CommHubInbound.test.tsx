import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import CommHubInbound from './CommHubInbound';
import { inventoryDeclarationStore } from '../services/data/mock/stores/inventoryDeclarationStore';
import { channelProvenanceStore } from '../services/channel/provenanceStore';
import { outboundRequestStore } from '../services/channel';
import i18n from '../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// Comm Hub C2 — the inbound confirm-before-commit surface. The honesty crux:
// a parsed reply is an INFERENCE until a human confirms; NOTHING dispatches
// before confirm; supplierId comes from the identity, never the message; the
// wrapper is stripped so the spine gets bare rows; honest silence on refusal.
//
// Default persona is sup-007 (PT Berlina) — it collaborates PK-PETB-8810 (uom
// PCS) + PK-CAPF-8820, so a STOK reply for those declares against a real material.
// ────────────────────────────────────────────────────────────────────────────

const MAT = 'PK-PETB-8810';

beforeEach(() => {
  inventoryDeclarationStore.reset();
  channelProvenanceStore.reset();
});

const renderPage = () =>
  renderWithProviders(<CommHubInbound />, { identity: SUPPLIER, route: '/supplier/comm-hub' });

const typeMessage = (text: string) =>
  fireEvent.change(screen.getByTestId('commhub-message-input'), { target: { value: text } });
const clickParse = () => fireEvent.click(screen.getByTestId('commhub-parse'));

// Select the confirmable material in row 0, once the picker has its options.
async function selectMaterial(code: string) {
  const select = (await screen.findByTestId('commhub-mat-0')) as HTMLSelectElement;
  await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
  fireEvent.change(select, { target: { value: code } });
}
const setQty = (v: string) =>
  fireEvent.change(screen.getByTestId('commhub-qty-0'), { target: { value: v } });

const countFor = (material: string) =>
  inventoryDeclarationStore.all().filter((d) => d.supplierId === 'sup-007' && d.materialCode === material).length;

describe('CommHubInbound — parse renders the inference', () => {
  it('shows the message echo, recognized tokens, and an editable row', async () => {
    renderPage();
    typeMessage('STOK PK-PETB-8810 2.400 KG');
    clickParse();
    await screen.findByTestId('commhub-rows');
    // Recognized tokens shown; uom parsed as a DIAGNOSTIC (never a payload field).
    const inf = screen.getByTestId('commhub-inference');
    expect(within(inf).getByText('STOK')).toBeInTheDocument();
    expect(within(inf).getByText(/reference only|rujukan saja/i)).toBeInTheDocument();
    // The quantity pre-fill is the locale-normalized 2400 (never 2.4).
    expect((screen.getByTestId('commhub-qty-0') as HTMLInputElement).value).toBe('2400');
  });

  it('unparseable text → honest diagnostics, NO row, nothing to confirm', async () => {
    renderPage();
    typeMessage('halo pak, apa kabar hari ini?');
    clickParse();
    await screen.findByText(/could not interpret|tidak dapat menafsirkan/i);
    expect(screen.queryByTestId('commhub-rows')).not.toBeInTheDocument();
    expect(screen.queryByTestId('commhub-confirm')).not.toBeInTheDocument();
  });
});

describe('CommHubInbound — the confirm gate (the honesty crux)', () => {
  it('does NOT dispatch before confirm (the gate lock)', async () => {
    renderPage();
    const before = inventoryDeclarationStore.all().length;
    const base = countFor(MAT);
    typeMessage('STOK PK-PETB-8810 2400 KG');
    clickParse();
    await selectMaterial(MAT);
    // Row parsed + material mapped, but no confirm yet → nothing dispatched.
    expect(inventoryDeclarationStore.all().length).toBe(before);
    expect(countFor(MAT)).toBe(base);
  });

  it('on confirm the reply lands as a governed declaration (locale 2400, master uom)', async () => {
    renderPage();
    const base = countFor(MAT);
    typeMessage('STOK PK-PETB-8810 2.400 KG');
    clickParse();
    await selectMaterial(MAT);
    fireEvent.click(screen.getByTestId('commhub-confirm'));
    await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
    const minted = inventoryDeclarationStore.latestFor('sup-007', MAT)!;
    expect(minted.supplierId).toBe('sup-007'); // from identity/context
    expect(minted.totalQty).toBe(2400); // locale-correct, never 2.4
    expect(minted.uom).toBe('PCS'); // master uom — the message's "KG" never entered the payload
  });

  it('the operator EDIT changes what dispatches', async () => {
    renderPage();
    const base = countFor(MAT);
    typeMessage('STOK PK-PETB-8810 2400 KG');
    clickParse();
    await selectMaterial(MAT);
    setQty('5000'); // operator corrects the quantity
    fireEvent.click(screen.getByTestId('commhub-confirm'));
    await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
    expect(inventoryDeclarationStore.latestFor('sup-007', MAT)!.totalQty).toBe(5000);
  });

  it('supplierId comes from the identity, never the message (spoof is inert)', async () => {
    renderPage();
    const base = countFor(MAT);
    typeMessage('STOK PK-PETB-8810 2400 supplierId=sup-999');
    clickParse();
    await selectMaterial(MAT);
    fireEvent.click(screen.getByTestId('commhub-confirm'));
    await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
    expect(inventoryDeclarationStore.latestFor('sup-007', MAT)!.supplierId).toBe('sup-007');
    expect(inventoryDeclarationStore.all().some((d) => d.supplierId === 'sup-999')).toBe(false);
  });

  it('a parseGrid refusal surfaces its reason (honest silence — no fabricated payload)', async () => {
    renderPage();
    typeMessage('STOK PK-PETB-8810 2400 KG');
    clickParse();
    await selectMaterial(MAT);
    setQty('abc'); // the operator breaks the quantity → parseGrid refuses INVALID_QTY
    const before = countFor(MAT);
    fireEvent.click(screen.getByTestId('commhub-confirm'));
    const result = await screen.findByTestId('commhub-result');
    expect(within(result).getByText(/not recorded|tidak tercatat/i)).toBeInTheDocument();
    expect(countFor(MAT)).toBe(before); // nothing dispatched
  });

  it('records provenance on the channel side after dispatch (never in the payload)', async () => {
    renderPage();
    const base = countFor(MAT);
    expect(channelProvenanceStore.all()).toHaveLength(0);
    typeMessage('STOK PK-PETB-8810 2400 KG');
    clickParse();
    await selectMaterial(MAT);
    fireEvent.click(screen.getByTestId('commhub-confirm'));
    await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
    await waitFor(() => expect(channelProvenanceStore.all()).toHaveLength(1));
    const ref = channelProvenanceStore.all()[0];
    expect(ref.channelMessageId).toMatch(/^cm-/);
    expect(ref.sessionId).toMatch(/^ss-c2-/);
    expect(ref.causationAnchor).toBeTruthy(); // the anchor of the dispatch it produced
  });
});

describe('CommHubInbound — material alias is a visible suggestion, never auto-resolved', () => {
  it('an unknown material does not pre-select and blocks confirm until mapped', async () => {
    renderPage();
    // MAT-10234 is code-like (parses as a material token) but NOT a collaborated
    // material for sup-007 — so it must never silently resolve.
    typeMessage('STOK MAT-10234 2400 KG');
    clickParse();
    const select = (await screen.findByTestId('commhub-mat-0')) as HTMLSelectElement;
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
    // The raw token is shown for reference, but nothing was silently resolved.
    expect(within(screen.getByTestId('commhub-rows')).getByText('MAT-10234')).toBeInTheDocument();
    expect(select.value).toBe('');
    expect((screen.getByTestId('commhub-confirm') as HTMLButtonElement).disabled).toBe(true);
    // Confirming the material unlocks the gate.
    fireEvent.change(select, { target: { value: MAT } });
    expect((screen.getByTestId('commhub-confirm') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('CommHubInbound — i18n (ID)', () => {
  it('localizes the header and honesty banner to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderPage();
      expect(await screen.findByText(/Kotak Masuk Kanal — triase balasan/)).toBeInTheDocument();
      expect(screen.getByText(/Kotak masuk diisi operator/)).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

// ─── Comm Hub C5 — the "what Paragon needs from you" section + honest note ─────
describe('CommHubInbound — C5 own obligations section', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders the supplier’s OWN overdue + upcoming deliveries in own-facing tone', async () => {
    renderPage();
    const section = await screen.findByTestId('commhub-needs');
    expect(within(section).getByText('What Paragon needs from you')).toBeInTheDocument();
    // sup-007's own obligations render (await the own-scoped read) with the own-facing
    // gloss — never buyer wording.
    await waitFor(() =>
      expect(within(section).getAllByTestId('commhub-needs-row').length).toBeGreaterThan(0),
    );
    expect(within(section).getAllByText(/Overdue|Upcoming/).length).toBeGreaterThan(0);
    expect(
      within(section).getAllByText(/Paragon is (waiting on|expecting) this delivery/).length,
    ).toBeGreaterThan(0);
  });

  it('is own-only — never another supplier’s material (isolation)', async () => {
    renderPage();
    const section = await screen.findByTestId('commhub-needs');
    // sup-007's own code appears (await the read); other suppliers' codes never do.
    await waitFor(() => expect(within(section).getAllByText('PK-PETB-8810').length).toBeGreaterThan(0));
    expect(within(section).queryByText('AI-NIAC-6601')).toBeNull();
    expect(within(section).queryByText('RM-EMUL-3310')).toBeNull();
  });

  it('NO buyer chase vocabulary leaks into the C5 section', async () => {
    renderPage();
    const section = await screen.findByTestId('commhub-needs');
    await waitFor(() =>
      expect(within(section).getAllByTestId('commhub-needs-row').length).toBeGreaterThan(0),
    );
    for (const word of [/\bchase\b/i, /\bnudge\b/i, /non-compliance/i, /\bdrift\b/i, /\bUrgent\b/, /\bAdvisory\b/]) {
      expect(within(section).queryByText(word)).toBeNull();
    }
  });

  it('CONTRACT: the supplier surface reads NO global channel store (no leak, no fabricated ask)', async () => {
    // The outbound ask store must never be surfaced to a supplier (every record is
    // "composed — not sent"); the global provenance list must never be read own-side
    // (its refs carry no supplierId — reading .all() would leak every supplier's).
    const outAll = vi.spyOn(outboundRequestStore, 'all');
    const outForSupplier = vi.spyOn(outboundRequestStore, 'forSupplier');
    const provAll = vi.spyOn(channelProvenanceStore, 'all');
    renderPage();
    const section = await screen.findByTestId('commhub-needs');
    await waitFor(() =>
      expect(within(section).getAllByTestId('commhub-needs-row').length).toBeGreaterThan(0),
    );
    expect(outAll).not.toHaveBeenCalled();
    expect(outForSupplier).not.toHaveBeenCalled();
    expect(provAll).not.toHaveBeenCalled();
  });

  it('shows the honest "recorded here, never sent from here" note', async () => {
    renderPage();
    const note = await screen.findByTestId('commhub-note');
    expect(within(note).getByText(/Recorded here, never sent from here/i)).toBeInTheDocument();
    expect(within(note).getByText(/nothing is auto-sent or auto-received/i)).toBeInTheDocument();
  });

  it('localizes the C5 section title to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderPage();
      const section = await screen.findByTestId('commhub-needs');
      expect(within(section).getByText('Yang Paragon butuhkan dari Anda')).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
