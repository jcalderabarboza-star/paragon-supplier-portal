// ────────────────────────────────────────────────────────────────────────────
// SDC-4 · NOTHING A SUPPLIER ENTERS IS DROPPED (R-SDC P1 ×3).
//
// Measured in R-SDC browser QA on `main` @ 4f29bf2:
//  · e15 — a stock batch with a quantity and an expiry but no batch number was
//    dropped before the Σ check, so two batches of 1 200 against a 2 400 total
//    were refused as "your batches sum to 1,200";
//  · e16 — a three-line reply in the supplier's Channel Inbox proposed ONE row
//    (90% confidence), and confirming said "the supplier reply was recorded"
//    while two quantities sat unread;
//  · e15-04 — `/supplier/inventory` never showed the stock declared on
//    Forecasts → Stock (SOH).
// Every case below was red there (or, for the pure parts, absent).
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import CommHubInbound from './CommHubInbound';
import SupplierForecasts from './SupplierForecasts';
import SupplierInventory from './SupplierInventory';
import i18n from '../lib/i18n';
import { useToast } from '../hooks/useToast';
import { inventoryDeclarationStore } from '../services/data/mock/stores/inventoryDeclarationStore';
import { channelProvenanceStore } from '../services/channel/provenanceStore';
import { parseChannelReply } from '../services/channel/replyParser';
import { normalizeInventoryDeclarationDraft } from '../services/sdc';

/** Surfaces the toast queue into the DOM — the provider renders only children
 *  (the `BuyerInvoices.test.tsx` probe, copied). */
const ToastSpy: React.FC = () => {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((t) => (
        <li key={t.id}>{`${t.title} ${t.description ?? ''}`}</li>
      ))}
    </ul>
  );
};

const REPLY ='Stock update:\nPK-PETB-8810 45000 pcs\nPK-CAPF-8820 12000 pcs\nGlass jar 50ml 3000 pcs';
const KNOWN = ['PK-PETB-8810', 'PK-CAPF-8820', 'AI-NIAC-6601'];
const countFor = (material: string) =>
  inventoryDeclarationStore.all().filter((d) => d.supplierId === 'sup-007' && d.materialCode === material).length;

beforeEach(() => {
  inventoryDeclarationStore.reset();
  channelProvenanceStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('SDC-4 · a stock batch row with a quantity is never an unfilled row', () => {
  it('a row with a quantity but no batch number REFUSES by name, at its position', () => {
    const r = normalizeInventoryDeclarationDraft({
      totalQty: '2400',
      batches: [
        { batchNumber: 'PET-24A', qty: '1200', expiryDate: '2027-03-31' },
        { batchNumber: '  ', qty: '1200', expiryDate: '2027-04-30' },
      ],
    });
    expect(r).toEqual({ ok: false, reason: 'MISSING_BATCH_NUMBER', field: { kind: 'batchNumber', index: 1 } });
  });

  it('an expiry alone is enough to make the row real', () => {
    const r = normalizeInventoryDeclarationDraft({ totalQty: '1200', batches: [{ batchNumber: '', qty: '', expiryDate: '2027-03-31' }] });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe('MISSING_BATCH_NUMBER');
  });

  it('KNOWN-GOOD: a wholly blank add-row is still dropped, not refused', () => {
    const r = normalizeInventoryDeclarationDraft({
      totalQty: '1200',
      batches: [{ batchNumber: 'PET-24A', qty: '1200' }, { batchNumber: ' ', qty: ' ' }],
    });
    expect(r).toEqual({ ok: true, value: { totalQty: 1200, batches: [{ batchNumber: 'PET-24A', qty: 1200 }] } });
  });

  it('the panel says WHICH row, and records nothing — never "your batches sum to 1,200"', async () => {
    renderWithProviders(
      <>
        <SupplierForecasts />
        <ToastSpy />
      </>,
      { identity: SUPPLIER, route: '/supplier/forecasts' },
    );
    fireEvent.click(await screen.findByRole('tab', { name: /Stock \(SOH\)/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Declare stock/i }));
    const panel = await screen.findByRole('dialog');
    fireEvent.change(within(panel).getByRole('combobox'), { target: { value: 'PK-PETB-8810' } });
    fireEvent.change(screen.getByLabelText(/Total quantity/), { target: { value: '2400' } });
    fireEvent.click(screen.getByRole('button', { name: /Add batch/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add batch/i }));
    fireEvent.change(screen.getByLabelText('Batch number 1'), { target: { value: 'PET-24A' } });
    fireEvent.change(screen.getByLabelText('Batch quantity 1'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText('Batch quantity 2'), { target: { value: '1200' } });
    const before = countFor('PK-PETB-8810');
    fireEvent.click(within(panel).getByRole('button', { name: /^Declare stock$/ }));
    // the inline line under the batches names the row and the reason (a toast says the same)
    const line = within(panel).getByTestId('soh-batch-sum');
    expect(line.textContent).toMatch(/^Batch row 2 cannot be recorded — This row has a quantity or an expiry date but no batch number/);
    expect(line.textContent).not.toMatch(/1,200 of 2,400/);
    // and the toast names the same row — never "Total quantity required", never a Σ accusation
    const spy = screen.getByTestId('toast-spy');
    await waitFor(() => expect(spy.textContent).toMatch(/^Batch row 2 cannot be recorded This row has a quantity/));
    expect(spy.textContent).not.toMatch(/Total quantity required|do not sum to the total/);
    expect(countFor('PK-PETB-8810')).toBe(before);
  });
});

describe('SDC-4 · a reply of several lines is several rows', () => {
  it('each body line is a row, by the single-line rules; confidence keeps the best line’s certainty', () => {
    const r = parseChannelReply(REPLY, { numberFormatHint: 'id', knownMaterials: KNOWN });
    expect(r.proposedRows.map((row) => Object.values(row))).toEqual([
      ['PK-PETB-8810', '45000'],
      ['PK-CAPF-8820', '12000'],
      ['50ml', '3000'],
    ]);
    expect(r.specHint).toEqual({ kind: 'InventoryDeclaration', mode: 'import' });
    expect(r.diagnostics.unparsedRemainder).toBe('update:\nGlass jar');
  });

  it('a line that cannot be read LOWERS the confidence by the share it represents', () => {
    const r = parseChannelReply('STOK\nPK-PETB-8810 45000 pcs\nPK-CAPF-8820 12.000,5,5 pcs', { numberFormatHint: 'id', knownMaterials: KNOWN });
    expect(r.proposedRows).toHaveLength(1);
    expect(r.diagnostics.confidence).toBeCloseTo(0.95 / 2, 5);
    expect(r.diagnostics.qtyReason).toBeDefined();
  });

  it('KNOWN-GOOD: a single-line reply takes exactly the path it always took', () => {
    expect(parseChannelReply('STOK PK-PETB-8810 2.400 KG', { numberFormatHint: 'id', knownMaterials: KNOWN })).toEqual({
      proposedRows: [{ materialCode: 'PK-PETB-8810', totalQty: '2400' }],
      specHint: { kind: 'InventoryDeclaration', mode: 'import' },
      diagnostics: {
        matchedTokens: ['STOK', 'PK-PETB-8810', '2.400', 'KG'],
        unparsedRemainder: '',
        confidence: 0.95,
        uom: 'KG',
        materialMatch: 'membership',
      },
    });
  });
});

describe('SDC-4 · the supplier Channel Inbox records every row or says why', () => {
  const renderInbox = () =>
    renderWithProviders(
      <>
        <CommHubInbound />
        <ToastSpy />
      </>,
      { identity: SUPPLIER, route: '/supplier/comm-hub' },
    );
  const parse = async (text: string) => {
    fireEvent.change(screen.getByTestId('commhub-message-input'), { target: { value: text } });
    fireEvent.click(screen.getByTestId('commhub-parse'));
    return screen.findByTestId('commhub-rows');
  };
  const pick = async (i: number, code: string) => {
    const select = (await screen.findByTestId(`commhub-mat-${i}`)) as HTMLSelectElement;
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(select, { target: { value: code } });
  };

  it('three lines → three rows; an unmapped row BLOCKS confirm and says so — it is removed by an act, never dropped', async () => {
    renderInbox();
    const rows = await parse(REPLY);
    await waitFor(() => expect(within(rows).getAllByTestId(/^commhub-mat-/)).toHaveLength(3));
    await pick(0, 'PK-PETB-8810');
    await pick(1, 'PK-CAPF-8820');
    // row 3 ("Glass jar 50ml") is not a material of this supplier — it stays unmapped
    expect(screen.getByTestId('commhub-confirm')).toBeDisabled();
    expect(screen.getByTestId('commhub-confirm-blocked').textContent).toMatch(/^Every row needs a material and a total/);
    fireEvent.click(screen.getByTestId('commhub-row-remove-2'));
    await waitFor(() => expect(screen.getByTestId('commhub-confirm')).toBeEnabled());
    expect(screen.queryByTestId('commhub-confirm-blocked')).toBeNull();
    const before = [countFor('PK-PETB-8810'), countFor('PK-CAPF-8820')];
    fireEvent.click(screen.getByTestId('commhub-confirm'));
    await waitFor(() => expect(countFor('PK-CAPF-8820')).toBe(before[1] + 1));
    expect(countFor('PK-PETB-8810')).toBe(before[0] + 1);
    expect(within(screen.getByTestId('commhub-result')).getAllByText(/Recorded|Tercatat/).length).toBeGreaterThanOrEqual(2);
  });

  it('a row the dispatch refuses is counted: "Recorded 1 of 2 rows", never "the reply was recorded"', async () => {
    renderInbox();
    await parse('STOK\nPK-PETB-8810 45000 pcs\nPK-CAPF-8820 12000 pcs');
    await pick(0, 'PK-PETB-8810');
    await pick(1, 'PK-CAPF-8820');
    fireEvent.change(screen.getByTestId('commhub-qty-1'), { target: { value: 'twelve thousand' } });
    fireEvent.click(screen.getByTestId('commhub-confirm'));
    const spy = await screen.findByTestId('toast-spy');
    await waitFor(() => expect(spy.textContent).toMatch(/Recorded 1 of 2 rows 1 row was not recorded — it says why below\./));
    expect(spy.textContent).not.toMatch(/The supplier reply was recorded as a governed declaration/);
  });

  it('ID — the blocked note and the remove control are Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderInbox();
    await parse(REPLY);
    expect((await screen.findByTestId('commhub-confirm-blocked')).textContent).toMatch(/^Setiap baris memerlukan material dan total/);
    expect(screen.getByTestId('commhub-row-remove-0').textContent).toBe('Hapus baris');
  });
});

describe('SDC-4 · /supplier/inventory shows the stock the supplier declared', () => {
  it('the seeded declaration is listed with its source — as of its date, total-only', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: '/supplier/inventory' });
    const section = await screen.findByTestId('inventory-declared');
    const row = await within(section).findByTestId('inventory-declared-PK-PETB-8810');
    expect(row.textContent).toMatch(/45,000 PCS/);
    expect(row.textContent).toMatch(/Total only — no batch detail/);
  });

  it('a declaration made on Forecasts appears here — with its batches and earliest expiry', async () => {
    renderWithProviders(<CommHubInbound />, { identity: SUPPLIER, route: '/supplier/comm-hub' });
    // declare through the governed path the Forecasts panel uses
    const { MockCommandService } = await import('../services/data/mock/MockCommandService');
    const res = await new MockCommandService().dispatch(
      { personaType: 'supplier', supplierId: 'sup-007', businessRoles: ['supplier', 'fulfilment'] },
      {
        transitionId: 't_inventorydeclaration_declare',
        entity: 'inventoryDeclaration',
        payload: {
          supplierId: 'sup-007',
          materialCode: 'PK-CAPF-8820',
          totalQty: 2400,
          batches: [
            { batchNumber: 'CAP-1', qty: 1200, expiryDate: '2027-04-30' },
            { batchNumber: 'CAP-2', qty: 1200, expiryDate: '2027-03-31' },
          ],
        },
      },
    );
    expect(res.status, res.reason).toBe('done');
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: '/supplier/inventory' });
    const row = await screen.findByTestId('inventory-declared-PK-CAPF-8820');
    expect(row.textContent).toMatch(/2,400 PCS/);
    expect(row.textContent).toMatch(/2 batches · earliest expiry 31 Mar 2027/);
  });
});
