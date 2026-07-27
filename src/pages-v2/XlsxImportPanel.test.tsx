import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import XlsxImportPanel from './XlsxImportPanel';
import i18n from '../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · W1 · PR-2d — the XLSX import's refusal REPORT (ruling D3, option b).
//
// The import is the path with the least claim to know a number's convention:
// the file was typed by someone else, in an unknown place, with no channel and
// no UI language to lean on. So an ambiguous cell refuses (CP-0 §5a) and
// imports blank — but a silently blanked cell would tell the supplier they left
// a field empty when they did not, which is the blame-moving move the fabricated
// Σ-mismatch made in 2c. The count, the row, the raw text and the reason are
// therefore shown BEFORE the import, while the column mapping is still
// editable: a sheet full of unreadable quantities is usually a mis-mapped
// column, and that is fixable here.
//
// The fixture is the REAL `single-sheet.xlsx` already in the repo, whose third
// row carries `Quantity: '1,050'` — 1050 under en, 1.05 under id.
// ────────────────────────────────────────────────────────────────────────────

const fixtureBytes = (name: string): Buffer =>
  readFileSync(join(__dirname, '..', 'services', 'sdc', '__tests__', 'fixtures', name));

const uploadSingleSheet = async () => {
  const input = screen.getByTestId('sdcsup-import-file') as HTMLInputElement;
  const bytes = fixtureBytes('single-sheet.xlsx');
  const file = new File([new Uint8Array(bytes)], 'single-sheet.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  // jsdom's File does not implement arrayBuffer() from a Node Buffer reliably.
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  fireEvent.change(input, { target: { files: [file] } });
  // The mapping step appears once the workbook parses.
  await screen.findByTestId('sdcsup-map-qty');
};

const renderPanel = (onImport = vi.fn()) => {
  renderWithProviders(<XlsxImportPanel onImport={onImport} onCancel={vi.fn()} />, {
    identity: SUPPLIER,
    route: '/supplier/forecasts',
  });
  return onImport;
};

describe('XlsxImportPanel — unreadable quantities are named, not silently blanked (CP-0 · 2d)', () => {
  // POSITIVE FIRST: the report element must be seen to RENDER before any test
  // below asserts what it does not contain, or those assertions prove nothing.
  it('names the refused cell: which row, what it said, and why', async () => {
    renderPanel();
    await uploadSingleSheet();
    const report = await screen.findByTestId('sdcsup-import-unreadable');
    expect(report).toHaveTextContent('Row 3');
    expect(report).toHaveTextContent('1,050');
    expect(report).toHaveTextContent(/could mean two different numbers/i);
    expect(report).toHaveTextContent(/import blank/i);
  });

  it('the report appears BEFORE confirming — the mapping is still editable', async () => {
    renderPanel();
    await uploadSingleSheet();
    await screen.findByTestId('sdcsup-import-unreadable');
    // Nothing has been imported yet: the confirm button is still the next step.
    expect(screen.getByTestId('sdcsup-import-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('sdcsup-map-qty')).toBeInTheDocument();
  });

  it('the refused cell imports BLANK — never a guessed 1050, never a silent 0', async () => {
    const onImport = renderPanel();
    await uploadSingleSheet();
    await screen.findByTestId('sdcsup-import-unreadable');
    fireEvent.click(screen.getByTestId('sdcsup-import-confirm'));
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const rows = onImport.mock.calls[0][0];
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ batchNumber: 'GLY-24A', qty: 1800 });
    expect(rows[1]).toMatchObject({ batchNumber: 'GLY-24B', qty: 2200 });
    expect(rows[2]).toMatchObject({ batchNumber: 'GLY-24C', qty: null }); // was 1050
  });

  it('reports in Indonesian too', async () => {
    await i18n.changeLanguage('id');
    try {
      renderPanel();
      await uploadSingleSheet();
      const report = await screen.findByTestId('sdcsup-import-unreadable');
      expect(report).toHaveTextContent(/tidak dapat dibaca/i);
      expect(report).toHaveTextContent(/dua angka berbeda/i);
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
