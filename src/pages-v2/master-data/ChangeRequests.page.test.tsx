// ─────────────────────────────────────────────────────────────────────────────
// MD-4 / MD-5 · WHAT A PERSON MEETS — proposing a change, a second person
// deciding it, handing it to SAP, a sample answer, and the sample sync.
//
// The command-level halves are in `masterDataRequestCommand.test.ts`.
// ─────────────────────────────────────────────────────────────────────────────
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, BUYER_NAMED, BUYER_NAMED_COMPLIANCE } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import BuyerMasterData from '../BuyerMasterData';
import Toaster from '../../components/ui-v2/Toaster';
import { masterDataRequestStore } from '../../services/data/mock/stores/masterDataRequestStore';
import { moduleDeployment } from '../../services/modules/deployment';
import { SAMPLE_PERSON_PREFIX } from '../../services/identity/sampleRoster';
import { recordOf, syncRuns } from '../../services/masterData/replica';
import { SAMPLE_SYNC_MATERIAL, SAMPLE_SYNC_RUN_ID, SAMPLE_SYNC_SUPPLIER, runSampleSync, sampleSyncRefusal } from '../../services/masterData/sampleSync';
import { resetReplica } from '../../services/masterData/syncApplier';
import { labelOf } from '../../services/sdc/materialMaster';
import { incotermOptions } from './referencePickers';

// Each spec renders the whole page, and the Materials view lists every material
// in the replica. That is more work than the default five seconds allows on a
// loaded machine, and a timeout is not a verdict.
vi.setConfig({ testTimeout: 60_000 });
// The same reason, for every `findBy` and `waitFor` below: the default second
// is spent re-rendering the list before the drawer opens.
configure({ asyncUtilTimeout: 15_000 });

const CODE = 'RM-COCO-8200';
// `<Toaster />` lives in the router, not in the page: mounted here so a toast is on screen.
const open = (route: string, identity: CurrentIdentity = BUYER_NAMED) =>
  renderWithProviders(
    <>
      <BuyerMasterData />
      <Toaster />
    </>,
    { route, identity },
  );
const drawer = (): Promise<HTMLElement> => screen.findByTestId('mdr-drawer');
const state = async (): Promise<string | null> => (await drawer()).getAttribute('data-state');

/** Raise a description change on RM-COCO-8200 from the material's own drawer. */
async function proposeFromTheRecord(description = 'CFAD, distilled'): Promise<void> {
  fireEvent.click(await screen.findByTestId('master-data-propose-change'));
  const dialog = await screen.findByTestId('mdr-propose-dialog');
  fireEvent.change(within(dialog).getByTestId('mdr-field-description'), { target: { value: description } });
  fireEvent.change(within(dialog).getByTestId('mdr-reason'), { target: { value: 'the supplier renamed the grade' } });
  fireEvent.click(within(dialog).getByTestId('mdr-propose-submit'));
}

beforeEach(() => {
  masterDataRequestStore.reset();
  resetReplica();
});
afterEach(async () => {
  moduleDeployment.reset();
  await i18n.changeLanguage('en');
});

describe('MD-4 · proposing a change from a record', () => {
  it('the request lands in Change requests, Proposed, with what SAP holds beside what is asked — and the record has not moved', async () => {
    open(`/buyer/master-data?view=materials&id=${CODE}`);
    await proposeFromTheRecord();
    const d = await drawer();
    expect(d).toHaveAttribute('data-state', 'Proposed');
    expect(within(d).getByTestId('mdr-state')).toHaveTextContent('Proposed');
    expect(within(d).getByTestId('mdr-proposed-description')).toHaveTextContent('CFAD, distilled');
    expect(within(d).getByTestId('mdr-proposed-description')).toHaveTextContent('SAP holds: Coconut Fatty Acid Distillate (CFAD)');
    expect(within(d).getByTestId('mdr-asked')).toHaveTextContent('the supplier renamed the grade');
    expect(screen.getByRole('tab', { name: 'Change requests' })).toHaveAttribute('aria-selected', 'true');
    // Only the field that moved was proposed, and the record is SAP's still.
    expect(masterDataRequestStore.all()[0].proposed).toEqual({ description: 'CFAD, distilled' });
    expect(labelOf(CODE)).toBe('Coconut Fatty Acid Distillate (CFAD)');
  });

  it('a seat that names nobody is told before the act, and the act is refused in words', async () => {
    open(`/buyer/master-data?view=materials&id=${CODE}`, BUYER);
    fireEvent.click(await screen.findByTestId('master-data-propose-change'));
    const dialog = await screen.findByTestId('mdr-propose-dialog');
    expect(within(dialog).getByTestId('mdr-propose-actor')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByTestId('mdr-field-description'), { target: { value: 'CFAD, distilled' } });
    fireEvent.change(within(dialog).getByTestId('mdr-reason'), { target: { value: 'renamed' } });
    fireEvent.click(within(dialog).getByTestId('mdr-propose-submit'));
    expect(await screen.findByText(i18n.t('identity.refused.namedRequired'))).toBeInTheDocument();
    expect(masterDataRequestStore.all()).toEqual([]);
    expect(document.body.textContent).not.toContain(SAMPLE_PERSON_PREFIX);
  });

  it('a seat without the propose atom reads who it waits for, and has no button', async () => {
    open(`/buyer/master-data?view=materials&id=${CODE}`, { ...BUYER_NAMED, businessRoles: ['finance'] });
    await screen.findByTestId('master-data-drawer');
    expect(screen.queryByTestId('master-data-propose-change')).toBeNull();
    expect(screen.queryByTestId('master-data-new-material')).toBeNull();
    expect(screen.getByTestId('handoff-mdr-propose')).toBeInTheDocument();
    expect(screen.getByTestId('handoff-mdr-propose-header')).toBeInTheDocument();
  });

  it('a generated sample material offers no change: it has no SAP record to change', async () => {
    open('/buyer/master-data?view=materials&id=SIM-RM-0001');
    await screen.findByTestId('master-data-drawer');
    expect(screen.queryByTestId('master-data-propose-change')).toBeNull();
    expect(screen.queryByTestId('handoff-mdr-propose')).toBeNull();
  });

  it('asking for a new material carries every field and no key', async () => {
    open('/buyer/master-data');
    fireEvent.click(await screen.findByTestId('master-data-new-material'));
    const dialog = await screen.findByTestId('mdr-propose-dialog');
    fireEvent.change(within(dialog).getByTestId('mdr-field-description'), { target: { value: 'Sample squalane, plant derived' } });
    fireEvent.change(within(dialog).getByTestId('mdr-field-materialType'), { target: { value: 'ROH' } });
    fireEvent.change(within(dialog).getByTestId('mdr-field-materialGroup'), { target: { value: 'MG-02' } });
    fireEvent.change(within(dialog).getByTestId('mdr-field-baseUnit'), { target: { value: 'KG' } });
    fireEvent.change(within(dialog).getByTestId('mdr-reason'), { target: { value: 'a new launch needs it' } });
    fireEvent.click(within(dialog).getByTestId('mdr-propose-submit'));
    const d = await drawer();
    expect(within(d).getByTestId('mdr-asked')).toHaveTextContent('None yet — SAP gives the key');
    expect(masterDataRequestStore.all()[0]).toMatchObject({ kind: 'material.create', subjectKey: null });
  });
});

describe('MD-4 / MD-5 · a second person decides, procurement sends, and a sample answer lands through sync', () => {
  it('the proposer cannot agree; a second person can; the request then goes to SAP and comes back', async () => {
    const first = open(`/buyer/master-data?view=materials&id=${CODE}`);
    await proposeFromTheRecord();
    fireEvent.click(await screen.findByTestId('mdr-act-start-review'));
    await waitFor(async () => expect(await state()).toBe('In Review'));
    // The proposer presses Agree and is refused in words that name no person id.
    fireEvent.click(screen.getByTestId('mdr-act-approve'));
    expect(await screen.findByText('The person who proposed a request may not also decide it. A second person decides.')).toBeInTheDocument();
    expect(masterDataRequestStore.all()[0].state).toBe('In Review');
    expect(document.body.textContent).not.toContain(SAMPLE_PERSON_PREFIX);
    first.unmount();

    // A second person, on the same store.
    const id = masterDataRequestStore.all()[0].id;
    open(`/buyer/master-data/requests?request=${id}`, BUYER_NAMED_COMPLIANCE);
    fireEvent.click(await screen.findByTestId('mdr-act-approve'));
    await waitFor(async () => expect(await state()).toBe('Approved'));
    expect(screen.getByTestId('mdr-state')).toHaveTextContent('Agreed — not yet sent');
    expect(screen.getByTestId('mdr-package')).toHaveTextContent('MDR-2026-0001');
    expect(labelOf(CODE)).toBe('Coconut Fatty Acid Distillate (CFAD)');

    fireEvent.click(screen.getByTestId('mdr-act-hand-off'));
    await waitFor(async () => expect(await state()).toBe('Sent to SAP'));
    expect(labelOf(CODE)).toBe('Coconut Fatty Acid Distillate (CFAD)');

    fireEvent.click(screen.getByTestId('mdr-act-sap-complete'));
    await waitFor(async () => expect(await state()).toBe('Completed in SAP'));
    expect(screen.getByTestId('mdr-sap-answer')).toHaveTextContent('Sample answer — SAP was not asked.');
    // The record moved now, through a run of its own, and says it is sample.
    expect(labelOf(CODE)).toBe('CFAD, distilled');
    expect(recordOf('material', CODE)?.stamp).toMatchObject({ source: 'SAMPLE', syncRun: 'SAMPLE-ANSWER-MDR-2026-0001' });
    expect(screen.getByTestId('mdr-history')).toHaveTextContent('Agreed to ask SAP');
    // Six acts across two renders of the page: more than the default five seconds.
  });

  it('return, reject and withdraw wait for a note', async () => {
    open(`/buyer/master-data?view=materials&id=${CODE}`);
    await proposeFromTheRecord();
    expect(await screen.findByTestId('mdr-act-withdraw')).toBeDisabled();
    fireEvent.change(screen.getByTestId('mdr-note'), { target: { value: 'raised by mistake' } });
    expect(screen.getByTestId('mdr-act-withdraw')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('mdr-act-withdraw'));
    await waitFor(async () => expect(await state()).toBe('Withdrawn'));
    expect(screen.getByTestId('mdr-history')).toHaveTextContent('raised by mistake');
  });

  it('on production a sent request offers no sample answer and says what it waits for', async () => {
    open(`/buyer/master-data?view=materials&id=${CODE}`);
    await proposeFromTheRecord();
    const request = masterDataRequestStore.all()[0];
    masterDataRequestStore.update(request.id, (r) => ({ ...r, state: 'Sent to SAP' }));
    moduleDeployment.set(null);
    open(`/buyer/master-data/requests?request=${request.id}`);
    await waitFor(() => expect(screen.getAllByTestId('mdr-awaiting-sap').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('mdr-act-sap-complete')).toBeNull();
  });

  it('the requests route opens on the requests view, with the session notice and an honest empty list', async () => {
    open('/buyer/master-data/requests');
    expect(await screen.findByTestId('mdr-empty')).toHaveTextContent('No change request has been raised in this session');
    expect(screen.getByTestId('mdr-session-notice')).toHaveTextContent('kept for this session only');
    expect(screen.getByRole('tab', { name: 'Change requests' })).toHaveAttribute('aria-selected', 'true');
  });

  it('the request reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    open(`/buyer/master-data?view=materials&id=${CODE}`);
    await proposeFromTheRecord();
    expect(within(await drawer()).getByTestId('mdr-state')).toHaveTextContent('Diusulkan');
    expect(screen.getByRole('tab', { name: 'Permintaan perubahan' })).toBeInTheDocument();
  });
});

describe('MD-5 · the sample sync shows SAP winning', () => {
  it('⚠ CONTROL — before the run the three subjects are as seeded', () => {
    expect(recordOf('material', SAMPLE_SYNC_MATERIAL)?.data.description).toBe('Glycerin USP 99.5%');
    expect(recordOf('supplier', SAMPLE_SYNC_SUPPLIER)?.stamp.sapStatus).toBe('ACTIVE');
    expect(incotermOptions().map((o) => o.key)).not.toContain('DAP');
    expect(sampleSyncRefusal()).toBeNull();
  });

  it('one press: a description changes, an incoterm is added, a supplier is blocked, one record is refused by name — and the log keeps what was replaced', async () => {
    open('/buyer/master-data?view=sync');
    fireEvent.click(await screen.findByTestId('sync-sample-run'));
    const row = await screen.findByTestId(`sync-run-${SAMPLE_SYNC_RUN_ID}`);
    expect(row).toHaveAttribute('data-refused', '1');
    expect(row).toHaveTextContent('RM-SAMPLE-DRUM-01');
    expect(row).toHaveTextContent('The unit "DRUM" is not one the portal can calculate with.');
    expect(labelOf(SAMPLE_SYNC_MATERIAL)).toBe('Glycerin USP 99.5% (pharma grade)');
    expect(recordOf('supplier', SAMPLE_SYNC_SUPPLIER)?.stamp.sapStatus).toBe('BLOCKED');
    expect(incotermOptions().map((o) => o.key)).toContain('DAP');
    expect(recordOf('material', 'RM-SAMPLE-DRUM-01')).toBeNull();
    const run = syncRuns().find((r) => r.id === SAMPLE_SYNC_RUN_ID);
    expect(run?.replaced.map((r) => r.key).sort()).toEqual([SAMPLE_SYNC_SUPPLIER, SAMPLE_SYNC_MATERIAL].sort());
    // It runs once: the button is gone and the notice says why.
    await waitFor(() => expect(screen.queryByTestId('sync-sample-run')).toBeNull());
    expect(screen.getByTestId('sync-sample-notice')).toHaveTextContent('has been applied in this session');
  });

  it('a request written before the run is held when the run changes its field', async () => {
    open(`/buyer/master-data?view=materials&id=${SAMPLE_SYNC_MATERIAL}`);
    await proposeFromTheRecord('Glycerin, vegetable');
    const id = masterDataRequestStore.all()[0].id;
    expect(runSampleSync().ok).toBe(true);
    open(`/buyer/master-data/requests?request=${id}`);
    await waitFor(() => expect(screen.getAllByTestId('mdr-sap-changed').length).toBeGreaterThan(0));
    expect(screen.getAllByTestId('mdr-sap-changed')[0]).toHaveTextContent('Description');
  });

  it('the sample sync is refused on production, by the function and on the page', async () => {
    moduleDeployment.set(null);
    expect(sampleSyncRefusal()).toBe('SAMPLE_SYNC_IN_PRODUCTION');
    expect(runSampleSync()).toEqual({ ok: false, refusal: 'SAMPLE_SYNC_IN_PRODUCTION' });
    open('/buyer/master-data?view=sync');
    expect(await screen.findByTestId('sync-sample-notice')).toHaveTextContent('It is not run on production.');
    expect(screen.queryByTestId('sync-sample-run')).toBeNull();
    expect(syncRuns().map((r) => r.id)).not.toContain(SAMPLE_SYNC_RUN_ID);
    // ⚠ the other way: a demo deployment runs it.
    moduleDeployment.reset();
    expect(runSampleSync().ok).toBe(true);
  });
});
