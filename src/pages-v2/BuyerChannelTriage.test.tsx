import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import BuyerChannelTriage from './BuyerChannelTriage';
import { commandAuditSink } from '../services/data/mock/MockCommandService';
import { inventoryDeclarationStore } from '../services/data/mock/stores/inventoryDeclarationStore';
import { channelProvenanceStore } from '../services/channel/provenanceStore';
import i18n from '../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// Comm Hub C4d — the buyer in-place triage confirm. Same confirm-before-commit
// honesty as C2, but the SUBJECT supplier is bound at capture and the dispatch
// is the C4c RECORDING verb (t_inventorydeclaration_record) — actor = the buyer,
// truthfully. Default identity is BUYER (renderWithProviders), so the record verb
// passes its role gate; sup-007 (PT Sample Packaging) collaborates PK-PETB-8810 (uom PCS).
//
// NB the tests render the panel against the REAL MockCommandService (through
// useInventoryRecord), so the dispatch, the store mint, and the DR-10 event are
// all real — no hook is mocked here (unlike BuyerCommHub.test, which stubs it).
// ────────────────────────────────────────────────────────────────────────────

const SUBJECT = 'sup-007';
const MAT = 'PK-PETB-8810';

beforeEach(() => {
  inventoryDeclarationStore.reset();
  channelProvenanceStore.reset();
  commandAuditSink.clear();
});
afterEach(() => {
  inventoryDeclarationStore.reset();
  channelProvenanceStore.reset();
  commandAuditSink.clear();
});

// The supplier picker is populated by an async read — wait for its options
// before selecting, else the value can't bind (the option does not exist yet).
async function pickSupplier(id: string) {
  const select = screen.getByTestId('triage-supplier') as HTMLSelectElement;
  await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
  fireEvent.change(select, { target: { value: id } });
}
const typeMessage = (text: string) =>
  fireEvent.change(screen.getByTestId('triage-message'), { target: { value: text } });
const clickParse = () => fireEvent.click(screen.getByTestId('triage-parse'));
const clickConfirm = () => fireEvent.click(screen.getByTestId('triage-confirm'));

async function selectMaterial(code: string) {
  const select = (await screen.findByTestId('triage-mat-0')) as HTMLSelectElement;
  await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
  fireEvent.change(select, { target: { value: code } });
}

const countFor = (material: string) =>
  inventoryDeclarationStore.all().filter((d) => d.supplierId === SUBJECT && d.materialCode === material).length;

// Land a confirmed record (the happy path) — reused across assertions.
async function recordOne(msg = 'STOK PK-PETB-8810 2400 KG') {
  const base = countFor(MAT);
  await pickSupplier(SUBJECT);
  typeMessage(msg);
  clickParse();
  await selectMaterial(MAT);
  clickConfirm();
  await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
}

describe('BuyerChannelTriage — the binding is first, and never a free supplierId field', () => {
  it('gates on picking a supplier; the subject is bound (a select), never a typed supplierId', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    // Before a supplier is picked there is no message field.
    expect(screen.queryByTestId('triage-message')).not.toBeInTheDocument();
    await pickSupplier(SUBJECT);
    // Now the paste field appears, bound to the chosen supplier.
    expect(screen.getByTestId('triage-message')).toBeInTheDocument();
    expect(screen.getByText(/Recording for/i)).toBeInTheDocument();
    // The subject is a SELECT (picked), and there is NEVER a free supplierId field.
    expect(screen.getByTestId('triage-supplier').tagName).toBe('SELECT');
    expect(screen.queryByLabelText(/supplier id/i)).not.toBeInTheDocument();
    // Parse then confirm-stage: still only a material select + qty input, no supplierId.
    typeMessage('STOK PK-PETB-8810 2400 KG');
    clickParse();
    await selectMaterial(MAT);
    const rows = screen.getByTestId('triage-rows');
    expect(within(rows).queryByLabelText(/supplier id/i)).not.toBeInTheDocument();
  });
});

describe('BuyerChannelTriage — the confirm gate + the RECORD verb', () => {
  it('does NOT dispatch before confirm (the gate lock)', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    const base = countFor(MAT);
    await pickSupplier(SUBJECT);
    typeMessage('STOK PK-PETB-8810 2400 KG');
    clickParse();
    await selectMaterial(MAT);
    // Parsed + mapped, but not confirmed → nothing dispatched, no event emitted.
    expect(countFor(MAT)).toBe(base);
    expect(commandAuditSink.all()).toHaveLength(0);
  });

  it('on confirm it dispatches the RECORD verb (not declare) and the object lands', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await recordOne('STOK PK-PETB-8810 2.400 KG');
    // The declaration landed in the governed store, master uom, locale-correct qty.
    const minted = inventoryDeclarationStore.latestFor(SUBJECT, MAT)!;
    expect(minted.totalQty).toBe(2400);
    expect(minted.uom).toBe('PCS'); // master uom — the message's "KG" never entered
    // The RECORD verb fired — NOT the supplier declare verb.
    expect(commandAuditSink.byEvent('t_inventorydeclaration_record')).toHaveLength(1);
    expect(commandAuditSink.byEvent('t_inventorydeclaration_declare')).toHaveLength(0);
  });

  it('THE C4c CRUX AT THE SURFACE: the DR-10 actor is the BUYER, not the supplier', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await recordOne();
    const ev = commandAuditSink.byEvent('t_inventorydeclaration_record')[0];
    expect(ev.actor).toBe('buyer:all');
    expect(ev.scope.personaType).toBe('buyer');
  });

  it('records channel-side provenance after dispatch (never in the payload)', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    expect(channelProvenanceStore.all()).toHaveLength(0);
    await recordOne();
    await waitFor(() => expect(channelProvenanceStore.all()).toHaveLength(1));
    const ref = channelProvenanceStore.all()[0];
    expect(ref.channelMessageId).toMatch(/^cm-c4d-/);
    expect(ref.sessionId).toMatch(/^ss-c4d-/);
    expect(ref.causationAnchor).toBeTruthy();
  });
});

describe('BuyerChannelTriage — honesty: recorded-by-Paragon, blocks + honest silence', () => {
  it('the result reads "Recorded by Paragon", never "submitted by the supplier"', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await recordOne();
    const result = await screen.findByTestId('triage-result');
    expect(within(result).getByText(/Recorded by Paragon/i)).toBeInTheDocument();
    expect(within(result).queryByText(/submitted by the supplier/i)).not.toBeInTheDocument();
    expect(within(result).queryByText(/self-submitted/i)).not.toBeInTheDocument();
  });

  it('an unknown material (not collaborated for the subject) blocks confirm — no silent resolution', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await pickSupplier(SUBJECT);
    // RM-EMUL-3310 is code-like but is NOT one of sup-007's collaborated materials.
    typeMessage('STOK RM-EMUL-3310 1000');
    clickParse();
    const select = (await screen.findByTestId('triage-mat-0')) as HTMLSelectElement;
    // The raw token is shown for reference, but nothing silently resolved…
    expect(within(screen.getByTestId('triage-rows')).getByText('RM-EMUL-3310')).toBeInTheDocument();
    expect(select.value).toBe('');
    // …and it is not even offered in the subject's picker, so confirm stays blocked.
    expect(within(select).queryByText(/RM-EMUL-3310/)).not.toBeInTheDocument();
    expect((screen.getByTestId('triage-confirm') as HTMLButtonElement).disabled).toBe(true);
    expect(countFor('RM-EMUL-3310')).toBe(0);
  });

  it('gibberish → honest diagnostics, no confirmable row, nothing dispatched', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await pickSupplier(SUBJECT);
    typeMessage('halo pak, apa kabar hari ini?');
    clickParse();
    await screen.findByText(/could not interpret/i);
    expect(screen.queryByTestId('triage-rows')).not.toBeInTheDocument();
    expect(screen.queryByTestId('triage-confirm')).not.toBeInTheDocument();
    expect(commandAuditSink.all()).toHaveLength(0);
  });
});

describe('BuyerChannelTriage — i18n (ID)', () => {
  it('localizes the panel title and the binding prompt to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerChannelTriage />);
      expect(await screen.findByText('Triase balasan kanal')).toBeInTheDocument();
      expect(screen.getByText('Ini percakapan siapa?')).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
