// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · THE MASTER-DATA PAGE — what a person meets: three views of a replica,
// each record saying where it came from, and nothing that changes one.
// ─────────────────────────────────────────────────────────────────────────────
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import BuyerMasterData, { SyncRefusalNotice, SyncRunSummary } from './BuyerMasterData';
import ReplicaStampLine from '../components/ui-v2/ReplicaStampLine';
import { masterDataEn, masterDataId } from '../lib/i18n/masterData';
import { MATERIAL_MASTER } from '../services/sdc/fixtures';
import { mockSuppliers } from '../data/mockSuppliers';
import { DECLARED_PRESENT_INSTANT } from '../services/data/fixturePresent';
import { materialRecords, recordOf, supplierRecords } from '../services/masterData/replica';
import { resetReplica } from '../services/masterData/syncApplier';
import { MASTER_OBJECTS, SYNC_REFUSAL_REASONS, type MasterRecord, type SyncRun } from '../services/masterData/types';
import type { Freshness } from '../services/masterData/freshness';
import type { WhereUsedKind } from '../services/masterData/whereUsed';

const open = (route = '/buyer/master-data') => renderWithProviders(<BuyerMasterData />, { route });
const rows = (): HTMLElement[] => screen.queryAllByTestId(/^master-data-row-/);
const table = async (): Promise<HTMLElement> => screen.findByTestId('master-data-table');
const must = (record: MasterRecord | null): MasterRecord => {
  if (!record) throw new Error('control: the record is seeded');
  return record;
};

beforeEach(() => resetReplica());
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('MD-1 · the page lists the replica in three views', () => {
  it('opens on Materials: every material in the replica, one row each', async () => {
    open();
    await table();
    expect(rows()).toHaveLength(materialRecords().length);
    expect(materialRecords().length).toBeGreaterThan(Object.keys(MATERIAL_MASTER).length);
    expect(screen.getByTestId('master-data-row-SIM-RM-0001')).toHaveTextContent('Sample raw material 0001');
    expect(screen.getByTestId('master-data-row-RM-COCO-8200')).toHaveTextContent('Coconut Fatty Acid Distillate (CFAD)');
    expect(screen.getByTestId('master-data-count')).toHaveTextContent(`${materialRecords().length} materials`);
    expect(screen.getByRole('tab', { name: 'Materials' })).toHaveAttribute('aria-selected', 'true');
  });

  it('Suppliers: every supplier under its SAP number', async () => {
    open();
    await table();
    fireEvent.click(screen.getByRole('tab', { name: 'Suppliers' }));
    await waitFor(() => expect(rows()).toHaveLength(supplierRecords().length));
    expect(supplierRecords().length).toBeGreaterThan(mockSuppliers.length);
    expect(screen.getByTestId('master-data-row-BP-10001235')).toHaveTextContent('PT Sample Specialty Fats');
    expect(screen.getByTestId('master-data-count')).toHaveTextContent(`${supplierRecords().length} suppliers`);
  });

  it('Reference tables: the units first, then whichever table is chosen', async () => {
    open();
    await table();
    fireEvent.click(screen.getByRole('tab', { name: 'Reference tables' }));
    await waitFor(() => expect(rows().map((r) => r.getAttribute('data-testid'))).toEqual(
      ['KG', 'PCS', 'L', 'ROLL', 'MT', 'BOX'].map((k) => `master-data-row-${k}`),
    ));
    expect(screen.getByTestId('master-data-count')).toHaveTextContent('6 values in Units of measure');
    fireEvent.click(within(screen.getByTestId('master-data-tables')).getByRole('tab', { name: 'Incoterms' }));
    await waitFor(() => expect(screen.getByTestId('master-data-row-CIF')).toHaveTextContent('Cost, Insurance and Freight'));
    fireEvent.click(within(screen.getByTestId('master-data-tables')).getByRole('tab', { name: 'Payment terms' }));
    await waitFor(() => expect(screen.getByTestId('master-data-row-NT45')).toHaveTextContent('Days: 45'));
  });

  it('every master object has a view that lists it', async () => {
    open('/buyer/master-data?view=reference&table=costCentre');
    await table();
    expect(screen.getByTestId('master-data-row-CC-RD-001')).toBeInTheDocument();
    const chips = within(screen.getByTestId('master-data-tables')).getAllByRole('tab').map((c) => c.textContent);
    expect(chips).toHaveLength(MASTER_OBJECTS.length - 2);
  });
});

describe('MD-1 · search and filters narrow the list', () => {
  it('searching "glycerin" leaves the materials whose number or description holds it', async () => {
    open();
    await table();
    fireEvent.change(screen.getByLabelText('Search by material number or description'), { target: { value: 'glycerin' } });
    await waitFor(() => expect(rows().length).toBeLessThan(materialRecords().length));
    expect(rows().length).toBeGreaterThan(0);
    for (const row of rows()) expect(row.textContent?.toLowerCase()).toContain('glycerin');
    expect(screen.getByTestId('master-data-row-RM-EMUL-3310')).toBeInTheDocument();
    expect(screen.queryByTestId('master-data-row-RM-COCO-8200')).toBeNull();
  });

  it('a search by key finds the record, and a search that matches nothing says so', async () => {
    open();
    await table();
    const search = screen.getByLabelText('Search by material number or description');
    fireEvent.change(search, { target: { value: 'rm-coco-8200' } });
    await waitFor(() => expect(rows().map((r) => r.getAttribute('data-testid'))).toEqual(['master-data-row-RM-COCO-8200']));
    fireEvent.change(search, { target: { value: 'no such material' } });
    expect(await screen.findByTestId('master-data-empty')).toHaveTextContent('No record matches the search and filters.');
  });

  it('the material-type filter leaves that type only', async () => {
    open();
    await table();
    fireEvent.change(screen.getByTestId('master-data-filter-type'), { target: { value: 'VERP' } });
    const packaging = materialRecords().filter((m) => m.data.materialType === 'VERP');
    await waitFor(() => expect(rows()).toHaveLength(packaging.length));
    expect(screen.queryByTestId('master-data-row-RM-COCO-8200')).toBeNull();
  });

  it('the country filter leaves that country’s suppliers', async () => {
    open('/buyer/master-data?view=suppliers');
    await table();
    fireEvent.change(screen.getByTestId('master-data-filter-country'), { target: { value: 'DE' } });
    const german = mockSuppliers.filter((s) => s.country === 'DE');
    expect(german.length).toBeGreaterThan(0);
    await waitFor(() => expect(rows()).toHaveLength(german.length));
  });
});

describe('MD-1 · every record says where it came from', () => {
  it('every row carries the sample mark, and none claims SAP', async () => {
    open();
    await table();
    const cells = screen.getAllByTestId('replica-stamp-cell');
    expect(cells).toHaveLength(rows().length);
    for (const cell of cells) {
      expect(cell).toHaveAttribute('data-source', 'SAMPLE');
      expect(cell).toHaveTextContent('Sample');
    }
    expect(screen.getByTestId('master-data-sample-notice')).toHaveTextContent('Sample data — not read from SAP');
    expect(screen.getByTestId('master-data-last-run')).toHaveTextContent('Last sync run SAMPLE-RUN-0002');
    expect(screen.queryByTestId('master-data-refused')).toBeNull();
  });

  it('a record’s drawer shows its fields, its stamp and where it is used', async () => {
    open();
    await table();
    fireEvent.click(screen.getByTestId('master-data-row-RM-COCO-8200'));
    const drawer = await screen.findByTestId('master-data-drawer');
    expect(drawer).toHaveAttribute('data-key', 'RM-COCO-8200');
    expect(within(drawer).getByTestId('replica-stamp')).toHaveTextContent('Sample data·read today·not from SAP');
    const fields = within(drawer).getByTestId('master-data-fields');
    expect(fields).toHaveTextContent('Coconut Fatty Acid Distillate (CFAD)');
    expect(fields).toHaveTextContent('ROH · Raw material');
    expect(fields).toHaveTextContent('KG · Kilogram');
    expect(fields).toHaveTextContent('MG-10');
    expect(within(drawer).getByTestId('master-data-stamp-fields')).toHaveTextContent('SAMPLE-RUN-0001');
    await waitFor(() => expect(within(drawer).getByTestId('master-data-where-used-purchaseOrder')).toBeInTheDocument());
    expect(within(drawer).getByTestId('master-data-where-used-total')).toHaveTextContent(/Named by \d+ documents? /);
    // Nothing in the drawer changes the record: no field is a control.
    expect(within(drawer).queryAllByRole('textbox')).toEqual([]);
    expect(within(drawer).queryAllByRole('combobox')).toEqual([]);
  });

  it('a link to a record opens it whatever the list is filtered to', async () => {
    open('/buyer/master-data?view=materials&type=VERP&id=RM-COCO-8200');
    const drawer = await screen.findByTestId('master-data-drawer');
    expect(drawer).toHaveAttribute('data-key', 'RM-COCO-8200');
    expect(screen.queryByTestId('master-data-row-RM-COCO-8200')).toBeNull();
  });

  it('a supplier’s drawer says what the replica does not hold, and never invents it', async () => {
    const bare = mockSuppliers.find((s) => !s.paymentTerms && !s.taxId);
    if (!bare) throw new Error('control: a supplier without terms is in the fixture');
    open(`/buyer/master-data?view=suppliers&id=${bare.sapBpNumber}`);
    const fields = within(await screen.findByTestId('master-data-drawer')).getByTestId('master-data-fields');
    expect(fields).toHaveTextContent(bare.name);
    expect(fields).toHaveTextContent('Not held in the replica');
  });
});

describe('MD-1 · the stamp line', () => {
  const sample = (): MasterRecord => must(recordOf('material', 'RM-COCO-8200'));
  const stamp = (record: MasterRecord, now = DECLARED_PRESENT_INSTANT) => {
    const { unmount } = renderWithProviders(<ReplicaStampLine record={record} now={now} />);
    const text = screen.getByTestId('replica-stamp').textContent ?? '';
    const freshness = screen.getByTestId('replica-stamp').getAttribute('data-freshness') as Freshness;
    unmount();
    return { text, freshness };
  };

  it('a sample record never renders as SAP', () => {
    const { text } = stamp(sample());
    expect(text).toContain('Sample data');
    expect(text).toContain('not from SAP');
    expect(text).not.toContain('SAP S/4HANA');
  });

  it('⚠ the other way: a record read from SAP says SAP and carries no sample words', () => {
    const fromSap: MasterRecord = { ...sample(), stamp: { ...sample().stamp, source: 'SAP_S4' } };
    const { text } = stamp(fromSap);
    expect(text).toContain('SAP S/4HANA');
    expect(text).not.toContain('Sample');
    expect(text).not.toContain('not from SAP');
  });

  it('the same record reads stale two days on, with nothing written', () => {
    const twoDaysOn = new Date(Date.parse(DECLARED_PRESENT_INSTANT) + 49 * 3_600_000).toISOString();
    expect(stamp(sample()).freshness).toBe('FRESH');
    const later = stamp(sample(), twoDaysOn);
    expect(later.freshness).toBe('STALE');
    expect(later.text).toContain('read 2 days ago');
    expect(later.text).toContain('Stale — older than 24 hours');
  });

  it('a record a full run did not carry says which run', () => {
    const missing: MasterRecord = { ...sample(), stamp: { ...sample().stamp, missingFromRun: 'RUN-7' } };
    expect(stamp(missing).text).toContain('Not in the last full run (RUN-7)');
  });
});

describe('MD-1 · a sync run that refused a record says so, by name', () => {
  const run: SyncRun = {
    id: 'RUN-9',
    source: 'SAP_S4',
    at: DECLARED_PRESENT_INSTANT,
    mode: 'FULL',
    objects: ['material'],
    created: 1,
    changed: 2,
    unchanged: 3,
    missing: 4,
    refused: [{ object: 'material', key: 'RM-X-1', reason: 'UNKNOWN_UNIT', value: 'MT' }],
    replaced: [],
  };

  it('the summary counts what was taken, what was missing and what was refused', () => {
    renderWithProviders(<SyncRunSummary run={run} />);
    const line = screen.getByTestId('master-data-last-run');
    expect(line).toHaveTextContent('Last sync run RUN-9');
    expect(line).toHaveTextContent('6 records taken');
    expect(line).toHaveTextContent('4 records were not in the run');
    expect(line).toHaveTextContent('1 record refused');
  });

  it('the notice names the record and the reason, in English and in Indonesian', async () => {
    const { unmount } = renderWithProviders(<SyncRefusalNotice run={run} />);
    expect(screen.getByTestId('master-data-refused')).toHaveTextContent('material · RM-X-1');
    expect(screen.getByTestId('master-data-refused')).toHaveTextContent('The unit "MT" is not one the portal can calculate with.');
    unmount();
    await i18n.changeLanguage('id');
    renderWithProviders(<SyncRefusalNotice run={run} />);
    expect(screen.getByTestId('master-data-refused')).toHaveTextContent('Satuan "MT" bukan satuan yang dapat dihitung portal.');
  });

  it('a run that refused nothing draws no notice', () => {
    renderWithProviders(<SyncRefusalNotice run={{ ...run, refused: [] }} />);
    expect(screen.queryByTestId('master-data-refused')).toBeNull();
  });
});

describe('MD-1 · the copy covers every object, reason, status and kind, in both languages', () => {
  const FRESHNESS: readonly Freshness[] = ['FRESH', 'STALE', 'NOT_IN_LAST_RUN'];
  const KINDS: readonly WhereUsedKind[] = ['purchaseOrder', 'invoice', 'contract', 'preferredListing', 'certificate', 'requisition', 'material', 'supplier'];
  const suffixes = (map: Record<string, string>, prefix: string): string[] =>
    Object.keys(map).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)).sort();

  for (const [locale, map] of [['en', masterDataEn], ['id', masterDataId]] as const) {
    it(`${locale}: the object names equal the master objects, both ways`, () => {
      expect(suffixes(map, 'masterData.object.')).toEqual([...MASTER_OBJECTS].sort());
    });
    it(`${locale}: the refusal sentences equal the refusal reasons, both ways`, () => {
      expect(suffixes(map, 'masterData.refusal.')).toEqual([...SYNC_REFUSAL_REASONS].sort());
    });
    it(`${locale}: every SAP status, freshness and where-used kind is worded`, () => {
      expect(suffixes(map, 'masterData.sapStatus.')).toEqual(['ACTIVE', 'BLOCKED', 'FLAGGED_FOR_DELETION']);
      expect(suffixes(map, 'masterData.freshness.').filter((k) => !k.startsWith('short.'))).toEqual([...FRESHNESS].sort());
      expect(suffixes(map, 'masterData.whereUsed.kind.')).toEqual([...KINDS].sort());
    });
  }

  it('the page reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    open();
    await table();
    expect(screen.getByRole('heading', { name: 'Data master' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tabel referensi' })).toBeInTheDocument();
    expect(screen.getByTestId('master-data-sample-notice')).toHaveTextContent('Data sampel — tidak dibaca dari SAP');
    expect(screen.getByTestId('master-data-count')).toHaveTextContent(`${materialRecords().length} material`);
  });
});
