// ────────────────────────────────────────────────────────────────────────────
// FB-1 · THE PROCESS FLOWS PAGE GAINS A SECOND VIEW.
//
// What only a rendered page can be wrong about:
//   · every flow says which version is in force, and the figure is the flow's;
//   · the Changes view opens empty, lists the rules from the library's own
//     table, and says where a change is kept;
//   · a seat that holds the right starts a change, a seat that names nobody is
//     refused in words, and a seat without the right reads whose act it is;
//   · a link to a view or a version this browser does not have lands on the
//     catalogue, never on a blank body.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within, fireEvent, act, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import { getFlow, getKnownFlows } from '../../services/transitions';
import { SAMPLE_PEOPLE } from '../../services/identity/sampleRoster';
import { personLabel } from '../../services/identity/personLabel';
import { versionLabel } from '../../services/flowBuilder/flowVersion';
import { FLOW_VERSIONS_KEY, flowVersionStore } from '../../services/flowBuilder/flowVersionStore';
import { MAX_ELEMENTS_PER_ACT, VERSION_RULES } from '../../services/flowBuilder/validateVersion';
import { flowBuilderEn, flowBuilderId } from '../../lib/i18n/flowBuilder';
import { getGuide } from '../../guides';
import ProcessFlows from '../ProcessFlows';
import Toaster from '../../components/ui-v2/Toaster';

const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

const COMPLIANCE_PERSON = SAMPLE_PEOPLE.find((p) => p.role === 'compliance')!.personId;
/** A Compliance seat acting as a sample person. */
const NAMED: CurrentIdentity = {
  ...BUYER,
  businessRoles: ['compliance'],
  actor: { kind: 'RESOLVED', person: { personId: COMPLIANCE_PERSON } },
};
/** The same seat naming nobody. */
const UNNAMED: CurrentIdentity = { ...BUYER, businessRoles: ['compliance'] };
/** A seat that does not hold the right. */
const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };

const open = (route: string, identity: CurrentIdentity = NAMED) =>
  // `<Toaster />` lives in the router, not in the page: mounted here so a toast is on screen.
  renderWithProviders(
    <>
      <ProcessFlows />
      <Toaster />
    </>,
    { identity, route },
  );
const title = () => screen.findByRole('heading', { level: 1, name: /Process Flows|Alur Proses/ });
const PR = 'purchaseRequisition';

beforeEach(() => {
  flowVersionStore.reset();
});
afterEach(async () => {
  await setLang('en');
});

describe('FB-1 · every flow says which version is in force', () => {
  it('each flow card and the flow header read the shipped version of that flow, in both languages', async () => {
    open('/buyer/process-flows');
    await title();
    const flows = getKnownFlows();
    expect(flows.map((f) => f.entity)).toContain(PR);
    for (const flow of flows) {
      expect(screen.getByTestId(`pf-flow-inforce-${flow.entity}`).textContent, flow.entity).toBe(
        `Shipped · version ${flow.version} — in force`,
      );
    }
    // The figure is the flow's own: a flow at another version reads another figure.
    const versions = new Set(flows.map((f) => f.version));
    expect(versions.size).toBeGreaterThan(1);
    fireEvent.click(screen.getByTestId(`pf-flow-${PR}`));
    expect(screen.getByTestId('pf-inforce').textContent).toBe(`Shipped · version ${getFlow(PR)!.version} — in force`);

    await setLang('id');
    expect(screen.getByTestId('pf-inforce').textContent).toBe(`Bawaan · versi ${getFlow(PR)!.version} — berlaku`);
    await setLang('en');
  });
});

describe('FB-1 · the two views', () => {
  it('opens on the catalogue; Changes is a tab that owns the panel, and it opens empty', async () => {
    open('/buyer/process-flows');
    await title();
    const tabs = within(screen.getByRole('tablist', { name: 'Process Flows views' })).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Catalogue', 'Changes']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('pf-view-panel-catalogue')).toBeInTheDocument();
    expect(screen.queryByTestId('fb-changes')).toBeNull();
    // No solid button stands on the catalogue: the page's one belongs to Changes.
    expect(screen.queryByTestId('fb-new-change')).toBeNull();

    fireEvent.click(tabs[1]);
    const panel = screen.getByTestId('pf-view-panel-changes');
    expect(panel.getAttribute('aria-labelledby')).toBe('pf-view-tab-changes');
    expect(within(panel).getByTestId('fb-changes-empty').textContent).toContain('No change has been drafted yet.');
    expect(within(panel).getByTestId('fb-kept').textContent).toContain('not shared with anyone');
    expect(screen.queryByTestId(`pf-flow-${PR}`)).toBeNull();
    expect(screen.getByTestId('fb-new-change').textContent).toBe('New change');
  });

  it('the rules are the library’s own table, in its order, with a sentence each — in both languages', async () => {
    open('/buyer/process-flows?view=changes');
    await title();
    const rows = () => within(screen.getByTestId('fb-rules')).getAllByTestId(/^fb-rule-R\d\d$/);
    expect(rows().map((r) => r.getAttribute('data-testid'))).toEqual(VERSION_RULES.map((r) => `fb-rule-${r.code}`));
    const said = (fragment: Record<string, string>, code: string) =>
      fragment[`flowBuilder.rule.${code}.text`].replace('{{limit}}', String(MAX_ELEMENTS_PER_ACT));
    for (const rule of VERSION_RULES) {
      const row = screen.getByTestId(`fb-rule-${rule.code}`);
      expect(row.textContent, rule.code).toContain(said(flowBuilderEn, rule.code));
      expect(row.textContent, rule.code).toContain(flowBuilderEn[`flowBuilder.severity.${rule.severity}`]);
    }
    expect(screen.getByTestId('fb-rule-R18').textContent).toContain('More than 5 elements');
    await setLang('id');
    for (const rule of VERSION_RULES) {
      expect(screen.getByTestId(`fb-rule-${rule.code}`).textContent, rule.code).toContain(said(flowBuilderId, rule.code));
    }
    expect(screen.getByRole('heading', { name: 'Aturan yang harus dipatuhi perubahan' })).toBeInTheDocument();
    await setLang('en');
  });

  it('an unknown view or version id falls back to the catalogue and renders no blank body', async () => {
    for (const route of [
      '/buyer/process-flows?view=nonsense',
      '/buyer/process-flows?view=changes&version=fv-404',
      '/buyer/process-flows?version=fv-404',
    ]) {
      const { unmount } = open(route);
      await title();
      const panel = screen.getByTestId('pf-view-panel-catalogue');
      expect(within(panel).getByTestId(`pf-flow-${PR}`), route).toBeInTheDocument();
      expect(panel.textContent!.length, route).toBeGreaterThan(500);
      expect(screen.queryByTestId('fb-changes'), route).toBeNull();
      unmount();
    }
  });
});

describe('FB-1 · starting a change', () => {
  const start = async (process: string, name: string) => {
    fireEvent.click(screen.getByTestId('fb-new-change'));
    const dialog = await screen.findByTestId('fb-create-dialog');
    fireEvent.change(within(dialog).getByTestId('fb-create-process'), { target: { value: process } });
    fireEvent.change(within(dialog).getByTestId('fb-create-title'), { target: { value: name } });
    fireEvent.click(within(dialog).getByTestId('fb-create-submit'));
  };

  it('a named Compliance seat creates a draft: it is listed with its label, its process and who drafted it', async () => {
    open('/buyer/process-flows?view=changes');
    await title();
    await start(PR, 'Finance approval above the threshold');
    await waitFor(() => expect(flowVersionStore.all()).toHaveLength(1));
    const made = flowVersionStore.all()[0];
    expect(made.label).toBe(versionLabel(getFlow(PR)!.version, 1));
    const row = await screen.findByTestId(`fb-version-${made.id}`);
    expect(row.textContent).toContain(made.label);
    expect(row.textContent).toContain(getGuide(PR, 'en')!.title);
    expect(row.textContent).toContain('Finance approval above the threshold');
    expect(row.textContent).toContain('Draft');
    expect(row.textContent).toContain('0 elements');
    expect(row.textContent).toContain(personLabel(COMPLIANCE_PERSON, i18n.t.bind(i18n)));
    expect(row.textContent).toContain('(SAMPLE)');
    expect(screen.queryByTestId('fb-changes-empty')).toBeNull();
    // The pop-up closed, and the toast names what was made.
    await waitFor(() => expect(screen.queryByTestId('fb-create-dialog')).toBeNull());
    expect(await screen.findByText(new RegExp(`Version ${made.label.replace('.', '\\.')} of .* created as a draft`))).toBeInTheDocument();
    // It is in this browser's storage, under the store's one key.
    expect(JSON.parse(window.localStorage.getItem(FLOW_VERSIONS_KEY)!).versions).toHaveLength(1);
  });

  it('the draft is still listed after the page is opened again, and a link to it lands on Changes', async () => {
    const first = open('/buyer/process-flows?view=changes');
    await title();
    await start(PR, 'Kept across a reload');
    await waitFor(() => expect(flowVersionStore.all()).toHaveLength(1));
    const id = flowVersionStore.all()[0].id;
    first.unmount();
    flowVersionStore.rehydrate();
    open(`/buyer/process-flows?view=changes&version=${id}`);
    await title();
    const row = screen.getByTestId(`fb-version-${id}`);
    expect(row.textContent).toContain('Kept across a reload');
    expect(row.getAttribute('aria-current')).toBe('true');
  });

  it('a seat that names nobody is told so before the act and refused in words; nothing is created', async () => {
    open('/buyer/process-flows?view=changes', UNNAMED);
    await title();
    fireEvent.click(screen.getByTestId('fb-new-change'));
    const dialog = await screen.findByTestId('fb-create-dialog');
    expect(within(dialog).getByTestId('fb-create-actor').textContent).toBe(i18n.t('identity.preAct.namedRequired'));
    fireEvent.change(within(dialog).getByTestId('fb-create-title'), { target: { value: 'Unnamed' } });
    fireEvent.click(within(dialog).getByTestId('fb-create-submit'));
    expect(await screen.findByText(i18n.t('identity.refused.namedRequired'))).toBeInTheDocument();
    expect(flowVersionStore.all()).toEqual([]);
    expect(screen.getByTestId('fb-create-dialog')).toBeInTheDocument();
  });

  it('a blank title is refused with the page’s own sentence, in the reader’s language', async () => {
    await setLang('id');
    open('/buyer/process-flows?view=changes');
    await title();
    await start(PR, '   ');
    expect(await screen.findByText(flowBuilderId['flowBuilder.refusal.FLOWVERSION_TITLE_BLANK'])).toBeInTheDocument();
    expect(screen.queryByText(flowBuilderEn['flowBuilder.refusal.FLOWVERSION_TITLE_BLANK'])).toBeNull();
    expect(flowVersionStore.all()).toEqual([]);
    await setLang('en');
  });

  it('a seat that does not hold the right sees who does instead of the button, and no pop-up is mounted', async () => {
    open('/buyer/process-flows?view=changes', PROCUREMENT);
    await title();
    expect(screen.queryByTestId('fb-new-change')).toBeNull();
    const gate = screen.getByTestId('fb-create-gate');
    expect(gate.textContent).toContain('Changing a process is a Compliance action');
    expect(within(gate).getByTestId('handoff-flow-draft').textContent).toContain('Compliance');
    expect(screen.queryByTestId('fb-create-dialog')).toBeNull();
    // The view itself is read by every seat.
    expect(screen.getByTestId('fb-rules')).toBeInTheDocument();
  });

  it('the pop-up offers only processes a command can write through, with an act a step can stand in front of', async () => {
    open('/buyer/process-flows?view=changes');
    await title();
    fireEvent.click(screen.getByTestId('fb-new-change'));
    const select = within(await screen.findByTestId('fb-create-dialog')).getByTestId('fb-create-process') as HTMLSelectElement;
    const offered = [...select.options].map((o) => o.value);
    expect(offered).toContain(PR);
    expect(offered).not.toContain('compliance'); // no command can write through it
    expect(offered).not.toContain('goodsReceiptLine');
    expect(offered).not.toContain('flowVersion'); // the builder does not gate itself
    // The dialog holds exactly one solid button — its commit — and the page behind it one.
    const dialog = screen.getByTestId('fb-create-dialog');
    expect([...dialog.querySelectorAll('[data-solid]')].map((b) => b.getAttribute('data-testid'))).toEqual([
      'fb-create-submit',
    ]);
    expect(
      [...document.querySelectorAll('[data-solid]')].filter((b) => !dialog.contains(b)).map((b) => b.getAttribute('data-testid')),
    ).toEqual(['fb-new-change']);
  });
});

describe('FB-1 · what the store refused is on the page, not absorbed', () => {
  it('unreadable storage is said to be unreadable, and is not shown as "no change yet" alone', async () => {
    window.localStorage.setItem(FLOW_VERSIONS_KEY, '{ not json');
    flowVersionStore.rehydrate();
    open('/buyer/process-flows?view=changes');
    await title();
    expect(screen.getByTestId('fb-store-unreadable').textContent).toContain('Saved changes could not be read');
  });

  it('a refused row is named with its reason, and a version that no longer obeys its rules is named with the rule', async () => {
    const good = {
      id: 'fv-1',
      label: versionLabel(getFlow(PR)!.version + 3, 1),
      seq: 1,
      title: 'Composed against an older process',
      state: 'Draft',
      content: { entity: PR, baseVersion: getFlow(PR)!.version + 3, steps: [], forks: [], checks: [] },
      createdBy: NAMED.actor,
      createdAt: '2026-10-12T00:00:00.000Z',
      savedBy: null,
      savedAt: null,
    };
    window.localStorage.setItem(
      FLOW_VERSIONS_KEY,
      JSON.stringify({ v: 1, counters: {}, versions: [good, { ...good, id: 'fv-2', state: 'Enacted' }] }),
    );
    flowVersionStore.rehydrate();
    open('/buyer/process-flows?view=changes');
    await title();
    expect(screen.getByTestId('fb-store-rejected').textContent).toContain("fv-2 — 'Enacted' is not a state a version can be in");
    const flagged = screen.getByTestId('fb-store-flagged').textContent!;
    expect(flagged).toContain(`Version ${good.label} of ${getGuide(PR, 'en')!.title} — R02: ${PR}`);
    expect(flagged).toContain(flowBuilderEn['flowBuilder.rule.R02.text']);
    // Kept and listed, not dropped.
    expect(screen.getByTestId('fb-version-fv-1')).toBeInTheDocument();
  });
});
