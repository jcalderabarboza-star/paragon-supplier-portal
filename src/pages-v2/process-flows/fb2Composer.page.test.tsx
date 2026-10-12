// ────────────────────────────────────────────────────────────────────────────
// FB-2 · COMPOSE A CHANGE — the rendered composer, through the real dispatcher
// and the real store.
//
//   · the picker offers the acts a step can stand in front of, and says why
//     the others are not offered;
//   · a step is written, the rules answer as it is written, and a save keeps
//     exactly what was composed — across a reload;
//   · a warning is acknowledged in place and the acknowledgement is recorded;
//   · the composer writes nothing but its own draft, holds one solid button in
//     every state, and the live page never draws a draft's elements.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { screen, within, fireEvent, act, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import { REPO_ROOT } from '../../lib/treeMutationGate/derive';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import { getFlow } from '../../services/transitions';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { SAMPLE_PEOPLE } from '../../services/identity/sampleRoster';
import { emptyContent, findingKey, versionLabel, type FlowVersionContent } from '../../services/flowBuilder/flowVersion';
import { flowVersionStore } from '../../services/flowBuilder/flowVersionStore';
import { liveWorld, readFlowVersions } from '../../services/flowBuilder/liveWorld';
import { validateVersion } from '../../services/flowBuilder/validateVersion';
import { flowBuilderEn } from '../../lib/i18n/flowBuilder';
import Toaster from '../../components/ui-v2/Toaster';
import ProcessFlows from '../ProcessFlows';
import { actOptions, addStep, updateStep } from './composerModel';

const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

const COMPLIANCE = SAMPLE_PEOPLE.find((p) => p.role === 'compliance')!.personId;
const NAMED: CurrentIdentity = { ...BUYER, businessRoles: ['compliance'], actor: { kind: 'RESOLVED', person: { personId: COMPLIANCE } } };
const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
const PR = 'purchaseRequisition';
const flow = getFlow(PR)!;
const svc = new MockCommandService();
const scope = { personaType: 'buyer' as const, supplierId: null, businessRoles: ['compliance'], actor: NAMED.actor };

/** A draft, made through the real act. */
const draft = async (content?: FlowVersionContent): Promise<string> => {
  const made = await svc.dispatch(scope, { transitionId: 't_flowversion_create', entity: 'flowVersion', payload: { flow: PR, title: 'Finance approval' } });
  if (content) {
    await svc.dispatch(scope, { transitionId: 't_flowversion_save', entity: 'flowVersion', entityId: made.entityId!, payload: { content } });
  }
  return made.entityId!;
};
const finished = (base: FlowVersionContent, stepId: string): FlowVersionContent =>
  updateStep(base, stepId, {
    lane: 'finance',
    label: { en: 'Finance approval', id: 'Persetujuan Keuangan' },
    instruction: { en: 'Check the budget line.', id: 'Periksa pos anggaran.' },
  });

const open = (route = '/buyer/process-flows?view=changes', identity: CurrentIdentity = NAMED) =>
  renderWithProviders(
    <>
      <ProcessFlows />
      <Toaster />
    </>,
    { identity, route },
  );
const compose = async (id: string): Promise<HTMLElement> => {
  fireEvent.click(await screen.findByTestId(`fb-compose-${id}`));
  return screen.findByTestId('fb-composer');
};
const type = (el: HTMLElement, value: string): void => {
  fireEvent.change(el, { target: { value } });
};
const findings = (dlg: HTMLElement): string[] =>
  within(dlg)
    .queryAllByTestId(/^fb-finding-R\d\d$/)
    .map((n) => n.textContent ?? '');
const solid = (root: ParentNode): (string | null)[] =>
  [...root.querySelectorAll('[data-solid]')].map((b) => b.getAttribute('data-testid'));

beforeEach(() => {
  flowVersionStore.reset();
});
afterEach(async () => {
  await setLang('en');
});

describe('FB-2 · the act picker', () => {
  it('offers exactly the acts a step can stand in front of, and says why each other act is not offered', async () => {
    const id = await draft();
    open();
    const dlg = await compose(id);
    const picker = within(dlg).getByTestId('fb-act-picker') as HTMLSelectElement;
    const { offered, withheld } = actOptions(flow);
    expect([...picker.options].map((o) => o.value)).toEqual(offered.map((d) => d.id));
    expect([...picker.options].map((o) => o.value)).toContain('t_pr_approve');
    expect([...picker.options].map((o) => o.value)).not.toContain('t_pr_create');
    // Each withheld act is listed, with its reason in the reader's words.
    expect(withheld.map((w) => w.def.id)).toContain('t_pr_create');
    for (const w of withheld) {
      expect(within(dlg).getByTestId(`fb-act-withheld-${w.def.id}`).textContent, w.def.id).toContain(
        flowBuilderEn[`flowBuilder.withheld.${w.because}`],
      );
    }
    // The same acts — and only those — can be picked on the diagram.
    const onDiagram = [...dlg.querySelectorAll('[data-testid^="fb-edge-"]')].map((n) => n.getAttribute('title'));
    expect([...new Set(onDiagram)].sort()).toEqual(offered.map((d) => d.id).sort());
  });
});

describe('FB-2 · writing a step', () => {
  it('a step is added in front of the picked act, the rules answer as it is written, and the save keeps what was composed', async () => {
    const id = await draft();
    open();
    const dlg = await compose(id);
    type(within(dlg).getByTestId('fb-act-picker'), 't_pr_approve');
    expect(within(dlg).getByTestId('fb-compose-none')).toBeInTheDocument();
    expect(within(dlg).getByTestId('fb-findings-none')).toBeInTheDocument();

    fireEvent.click(within(dlg).getByTestId('fb-kind-approval'));
    fireEvent.click(within(dlg).getByTestId('fb-step-add'));
    // Born unfinished: no lane, no words. The rules name the step.
    expect(findings(dlg).some((f) => f.includes('R06') && f.includes('s_approval_1'))).toBe(true);
    expect(findings(dlg).filter((f) => f.includes('R07')).length).toBeGreaterThan(0);
    expect(within(dlg).getByTestId('fb-compose-dirty').textContent).toBe('Unsaved changes.');

    type(within(dlg).getByTestId('fb-step-lane'), 'finance');
    type(within(dlg).getByTestId('fb-step-label-en'), 'Finance approval');
    type(within(dlg).getByTestId('fb-step-instruction-en'), 'Check the budget line.');
    type(within(dlg).getByTestId('fb-step-instruction-id'), 'Periksa pos anggaran.');
    // ⚠ A LABEL IN ONE LANGUAGE: R07 names the step, the part and the language.
    const r07 = findings(dlg).filter((f) => f.includes('R07'));
    expect(r07).toHaveLength(1);
    expect(r07[0]).toContain('s_approval_1');
    expect(r07[0]).toContain('Missing: the label, in Indonesian.');
    expect(findings(dlg).some((f) => f.includes('R06'))).toBe(false);

    // Saved as it stands, it is KEPT and it is NOT VALID: the list names the rule.
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    await waitFor(() => expect(flowVersionStore.byId(id)!.content.steps).toHaveLength(1));
    expect(await screen.findByText(`Version ${versionLabel(flow.version, 1)} saved as a draft.`)).toBeInTheDocument();
    expect(readFlowVersions().flagged.map((f) => f.findings.map((x) => `${x.code} ${x.element}`))).toEqual([['R07 s_approval_1']]);
    expect(within(dlg).getByTestId('fb-compose-dirty').textContent).toBe('Everything is saved.');

    // The other language written: the error clears, and the saved draft is valid.
    type(within(dlg).getByTestId('fb-step-label-id'), 'Persetujuan Keuangan');
    expect(findings(dlg).some((f) => f.includes('R07'))).toBe(false);
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    await waitFor(() => expect(flowVersionStore.byId(id)!.content.steps[0].label.id).toBe('Persetujuan Keuangan'));
    expect(readFlowVersions().flagged).toEqual([]);
    expect(flowVersionStore.byId(id)!.content).toEqual(
      finished(addStep(emptyContent(PR, flow.version), 't_pr_approve', 'approval'), 's_approval_1'),
    );
    expect(flowVersionStore.byId(id)!.savedBy).toEqual(NAMED.actor);
  });

  it('a personal name in an instruction is refused — by the label a reader sees, in either language', async () => {
    const id = await draft(finished(addStep(emptyContent(PR, flow.version), 't_pr_approve', 'approval'), 's_approval_1'));
    open();
    const dlg = await compose(id);
    type(within(dlg).getByTestId('fb-act-picker'), 't_pr_approve');
    fireEvent.click(within(within(dlg).getByTestId('fb-step-s_approval_1')).getAllByRole('button')[0]);
    expect(findings(dlg).some((f) => f.includes('R07'))).toBe(false);
    const names = SAMPLE_PEOPLE.filter((p) => p.role === 'finance').map((p) => p.ordinal);
    expect(names.length).toBeGreaterThan(0);
    type(within(dlg).getByTestId('fb-step-instruction-en'), `Ask Finance ${names[0]} to check the budget line.`);
    expect(findings(dlg).filter((f) => f.includes('R07'))[0]).toContain('Names a person: the instruction, in English.');
    type(within(dlg).getByTestId('fb-step-instruction-en'), 'Check the budget line.');
    type(within(dlg).getByTestId('fb-step-instruction-id'), `Tanyakan Keuangan ${names[0]}.`);
    expect(findings(dlg).filter((f) => f.includes('R07'))[0]).toContain('Names a person: the instruction, in Indonesian.');
    // ⚠ ONE WORLD: saved as it stands, the LIST names the same rule the composer does.
    expect(screen.queryByTestId('fb-store-flagged')).toBeNull();
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    await waitFor(() => expect(screen.getByTestId('fb-store-flagged').textContent).toContain('R07: s_approval_1'));
    // KNOWN-GOOD: the role alone is not a person — and saved so, the list names nothing.
    type(within(dlg).getByTestId('fb-step-instruction-id'), 'Tanyakan Keuangan.');
    expect(findings(dlg).some((f) => f.includes('R07'))).toBe(false);
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    await waitFor(() => expect(screen.queryByTestId('fb-store-flagged')).toBeNull());
  });

  it('the saved draft survives a reload and reads back equal — in the store and in the form', async () => {
    const content = finished(addStep(emptyContent(PR, flow.version), 't_pr_approve', 'capture'), 's_capture_1');
    const id = await draft();
    const first = open();
    let dlg = await compose(id);
    type(within(dlg).getByTestId('fb-act-picker'), 't_pr_approve');
    fireEvent.click(within(dlg).getByTestId('fb-kind-capture'));
    fireEvent.click(within(dlg).getByTestId('fb-step-add'));
    type(within(dlg).getByTestId('fb-step-lane'), 'finance');
    type(within(dlg).getByTestId('fb-step-label-en'), content.steps[0].label.en);
    type(within(dlg).getByTestId('fb-step-label-id'), content.steps[0].label.id);
    type(within(dlg).getByTestId('fb-step-instruction-en'), content.steps[0].instruction.en);
    type(within(dlg).getByTestId('fb-step-instruction-id'), content.steps[0].instruction.id);
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    await waitFor(() => expect(flowVersionStore.byId(id)!.savedAt).not.toBeNull());
    const before = flowVersionStore.byId(id)!;
    expect(before.content).toEqual(content);

    first.unmount();
    flowVersionStore.rehydrate();
    expect(flowVersionStore.byId(id)).toEqual(before);
    open();
    expect((await screen.findByTestId(`fb-version-${id}`)).textContent).toContain('1 element');
    dlg = await compose(id);
    type(within(dlg).getByTestId('fb-act-picker'), 't_pr_approve');
    fireEvent.click(within(within(dlg).getByTestId('fb-step-s_capture_1')).getAllByRole('button')[0]);
    expect((within(dlg).getByTestId('fb-step-lane') as HTMLSelectElement).value).toBe('finance');
    expect((within(dlg).getByTestId('fb-step-label-id') as HTMLInputElement).value).toBe('Persetujuan Keuangan');
    expect(within(dlg).getByTestId('fb-compose-dirty').textContent).toBe('Everything is saved.');
  });

  it('a step is removed with its button, and a seat that names nobody is refused the save in words', async () => {
    const id = await draft(finished(addStep(emptyContent(PR, flow.version), 't_pr_approve', 'approval'), 's_approval_1'));
    open('/buyer/process-flows?view=changes', { ...NAMED, actor: BUYER.actor });
    const dlg = await compose(id);
    type(within(dlg).getByTestId('fb-act-picker'), 't_pr_approve');
    fireEvent.click(within(dlg).getByTestId('fb-step-remove-s_approval_1'));
    expect(within(dlg).getByTestId('fb-compose-none')).toBeInTheDocument();
    expect(within(dlg).getByTestId('fb-compose-actor').textContent).toBe(i18n.t('identity.preAct.namedRequired'));
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    expect(await screen.findByText(i18n.t('identity.refused.namedRequired'))).toBeInTheDocument();
    // Nothing was written: the saved draft still holds its step.
    expect(flowVersionStore.byId(id)!.content.steps.map((s) => s.id)).toEqual(['s_approval_1']);
  });
});

describe('FB-2 · a warning is acknowledged in place, and the acknowledgement is recorded', () => {
  // Derived from the library over the live world: an act whose gating raises a
  // warning. Which one it is can move with the catalogue; that there is one is asserted.
  const world = liveWorld();
  const candidates = actOptions(flow).offered.map((d) => {
    const content = finished(addStep(emptyContent(PR, flow.version), d.id, 'confirmation'), 's_confirmation_1');
    return { id: d.id, warnings: validateVersion(content, world).filter((f) => f.severity === 'warning') };
  });
  const pick = candidates.find((c) => c.warnings.length > 0);

  it('⚠ CONTROL — some act of the process raises a warning when gated, and some raises none', () => {
    expect(pick, 'no act of this process raises a warning; pick another process').toBeTruthy();
    expect(candidates.some((c) => c.warnings.length === 0)).toBe(true);
  });

  it('the warning carries a tick; ticked and saved it is on the record; it is still ticked when the draft is opened again', async () => {
    const id = await draft();
    const first = open();
    let dlg = await compose(id);
    type(within(dlg).getByTestId('fb-act-picker'), pick!.id);
    fireEvent.click(within(dlg).getByTestId('fb-kind-confirmation'));
    fireEvent.click(within(dlg).getByTestId('fb-step-add'));
    type(within(dlg).getByTestId('fb-step-lane'), 'finance');
    type(within(dlg).getByTestId('fb-step-label-en'), 'Finance approval');
    type(within(dlg).getByTestId('fb-step-label-id'), 'Persetujuan Keuangan');
    type(within(dlg).getByTestId('fb-step-instruction-en'), 'Check the budget line.');
    type(within(dlg).getByTestId('fb-step-instruction-id'), 'Periksa pos anggaran.');
    const key = findingKey(pick!.warnings[0]);
    const tick = () => within(dlg).getByTestId(`fb-ack-${key}`) as HTMLInputElement;
    expect(tick().checked).toBe(false);

    // Saved unticked, nothing is acknowledged.
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    await waitFor(() => expect(flowVersionStore.byId(id)!.content.steps).toHaveLength(1));
    expect(flowVersionStore.byId(id)!.acknowledged).toEqual([]);

    fireEvent.click(tick());
    expect(within(dlg).getByTestId('fb-compose-dirty').textContent).toBe('Unsaved changes.');
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    await waitFor(() => expect(flowVersionStore.byId(id)!.acknowledged).toEqual([key]));

    first.unmount();
    flowVersionStore.rehydrate();
    open();
    dlg = await compose(id);
    expect(tick().checked).toBe(true);
    // The warning gone, its acknowledgement is not kept.
    type(within(dlg).getByTestId('fb-act-picker'), pick!.id);
    fireEvent.click(within(dlg).getByTestId('fb-step-remove-s_confirmation_1'));
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    await waitFor(() => expect(flowVersionStore.byId(id)!.content.steps).toEqual([]));
    expect(flowVersionStore.byId(id)!.acknowledged).toEqual([]);
  });
});

describe('FB-2 · what the composer is allowed to touch', () => {
  it('the dialog holds one solid button in every state it can show', async () => {
    const id = await draft();
    open();
    const dlg = await compose(id);
    const states: string[] = [];
    // FB-3 — the one solid button is the save while there is something to
    // save, and the hand-over for review once there is not.
    const check = (state: string, one = 'fb-save'): void => {
      states.push(state);
      expect(solid(dlg), state).toEqual([one]);
      // …and the page behind it keeps its own one.
      expect(solid(document).filter((t) => t !== one), state).toEqual(['fb-new-change']);
    };
    check('empty', 'fb-propose');
    for (const kind of ['approval', 'confirmation', 'capture'] as const) {
      fireEvent.click(within(dlg).getByTestId(`fb-kind-${kind}`));
      fireEvent.click(within(dlg).getByTestId('fb-step-add'));
      check(`a ${kind} step open`);
    }
    fireEvent.click(within(dlg).getByTestId('fb-field-add'));
    check('a capture field added');
    fireEvent.click(within(dlg).getByTestId('fb-save'));
    await waitFor(() => expect(flowVersionStore.byId(id)!.savedAt).not.toBeNull());
    check('after a save', 'fb-propose');
    expect(states).toHaveLength(6);
  });

  it('the composer’s only write is the version store', () => {
    const read = (file: string): string => readFileSync(join(REPO_ROOT, 'src', file), 'utf8').replace(/\r\n/g, '\n');
    const composer = ['pages-v2/process-flows/ChangeComposer.tsx', 'pages-v2/process-flows/composerModel.ts'];
    const writes = (text: string): string[] => [
      ...[...text.matchAll(/transitionId:\s*'([a-z_]+)'/g)].map((m) => m[1]),
      ...[...text.matchAll(/\buse[A-Z]\w*(?:Create|Save|Submit|Approve|Reject|Grant|Set|Dispatch)\b/g)].map((m) => m[0]),
      ...[...text.matchAll(/from '[^']*\/stores\/[^']*'/g)].map((m) => m[0]),
      ...(/\.dispatch\(|localStorage|flowRegistry/.test(text) ? ['direct'] : []),
    ];
    // ⚠ CONTROL — the same scan finds the writes it should, where they are.
    expect(writes(read('services/query/commandHooks.ts'))).toContain('t_flowversion_save');
    expect(writes(read('services/query/commandHooks.ts'))).toContain('direct');
    expect(writes(read('pages-v2/process-flows/ChangesView.tsx'))).toContain('useFlowVersionCreate');
    // The composer: one hook, the save of its own draft. The model: nothing.
    expect([...new Set(writes(read(composer[0])))]).toEqual(['useFlowVersionSave']);
    expect(writes(read(composer[1]))).toEqual([]);
    const hook = /export function useFlowVersionSave\(\)[\s\S]*?\n}\n/.exec(read('services/query/commandHooks.ts'))![0];
    expect(writes(hook).filter((w) => w.startsWith('t_'))).toEqual(['t_flowversion_save']);
  });

  it('the live process page never draws a draft’s elements', async () => {
    const id = await draft(finished(addStep(emptyContent(PR, flow.version), 't_pr_approve', 'approval'), 's_approval_1'));
    const live = open(`/buyer/process-flows?flow=${PR}`);
    await screen.findByTestId(`pf-flow-purpose-${PR}`);
    expect(document.querySelectorAll('[data-testid^="fb-edge-"]')).toHaveLength(0);
    expect(screen.queryByText('1 added')).toBeNull();
    expect(screen.getByTestId('pf-inforce').textContent).toBe(`Shipped · version ${flow.version} — in force`);
    live.unmount();
    // KNOWN-GOOD: inside the composer, the same draft IS drawn on the act it gates.
    open();
    const dlg = await compose(id);
    const marks = [...dlg.querySelectorAll('[data-testid^="fb-edge-added-"]')];
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((m) => m.textContent === '1 added')).toBe(true);
    expect(marks.every((m) => m.getAttribute('data-testid')!.includes('t_pr_approve'))).toBe(true);
  });
});

describe('FB-2 · a draft started from a version, and who is offered the acts', () => {
  it('"Start a draft from this version" makes a new draft with the same elements, its own label, and no acknowledgement', async () => {
    const content = finished(addStep(emptyContent(PR, flow.version), 't_pr_approve', 'approval'), 's_approval_1');
    const id = await draft(content);
    open();
    fireEvent.click(await screen.findByTestId(`fb-copy-${id}`));
    await waitFor(() => expect(flowVersionStore.all()).toHaveLength(2));
    const copy = flowVersionStore.all()[1];
    expect(copy).toMatchObject({
      label: versionLabel(flow.version, 2),
      title: 'Finance approval (copy)',
      state: 'Draft',
      content,
      acknowledged: [],
      createdBy: NAMED.actor,
      savedBy: null,
    });
    expect(copy.id).not.toBe(id);
    expect((await screen.findByTestId(`fb-version-${copy.id}`)).textContent).toContain('1 element');
    expect(
      await screen.findByText(`Version ${copy.label} created as a draft, from version ${versionLabel(flow.version, 1)}.`),
    ).toBeInTheDocument();
  });

  it('a seat that does not hold the right reads the list and is offered no act on a row', async () => {
    const id = await draft();
    open('/buyer/process-flows?view=changes', PROCUREMENT);
    expect(await screen.findByTestId(`fb-version-${id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`fb-compose-${id}`)).toBeNull();
    expect(screen.queryByTestId(`fb-copy-${id}`)).toBeNull();
    expect(screen.queryByTestId('fb-composer')).toBeNull();
  });

  it('the composer reads in Indonesian', async () => {
    const id = await draft();
    await setLang('id');
    open();
    const dlg = await compose(id);
    // WRITTEN OUT, not read from the fragment: compared with the fragment, a
    // string left in English would agree with itself.
    expect(within(dlg).getByTestId('fb-save').textContent).toBe('Simpan rancangan');
    fireEvent.click(within(dlg).getByTestId('fb-step-add'));
    expect(findings(dlg).filter((f) => f.includes('R07'))[0]).toContain('Tidak ada: label, dalam bahasa Inggris.');
    expect(within(dlg).getByTestId('fb-compose-dirty').textContent).toBe('Ada perubahan yang belum disimpan.');
    expect(within(dlg).getByTestId('fb-act-withheld-t_pr_create').textContent).toContain('tindakan ini membuat dokumen');
  });
});
