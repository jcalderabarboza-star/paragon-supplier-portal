// FB-3 / FB-4 · ON THE PAGE — the composer asks before it discards, the review
// offers one forward act per state and asks a reason for each, and a change in
// force is announced on the document it gates and answered by that document's
// own button. Every version here was walked to its state through the real acts.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within, fireEvent, act, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import type { QueryScope } from '../../services/data/types';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { flowVersionStore } from '../../services/flowBuilder/flowVersionStore';
import { SAMPLE_PERSON_PREFIX } from '../../services/identity/sampleRoster';
import { stepLedger } from '../../services/flowBuilder/stepLedger';
import { inForce } from '../../services/flowBuilder/flowOverlay';
import Toaster from '../../components/ui-v2/Toaster';
import NextActLine from '../../components/ui-v2/NextActLine';
import ProcessFlows from '../ProcessFlows';
import BuyerRequisitions from '../BuyerRequisitions';
import { REVIEW_ACTS } from './ChangeReview';
import {
  contentWith,
  financeApproval,
  FINANCE_STEP,
  GATED_ENTITY,
  pendingRequisition,
  seatOf,
  versionAt,
  VERSION_STATES_REACHED,
} from '../../test/flowVersions';

const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });
const as = (scope: QueryScope): CurrentIdentity => ({ ...BUYER, businessRoles: [...(scope.businessRoles ?? [])], actor: scope.actor! });
const COMPLIANCE = as(seatOf('compliance'));
const ADMIN = as(seatOf('admin'));
const PROCUREMENT = as(seatOf('procurement'));
const FINANCE = as(seatOf('finance'));

const openChanges = (identity: CurrentIdentity) =>
  renderWithProviders(
    <>
      <ProcessFlows />
      <Toaster />
    </>,
    { identity, route: '/buyer/process-flows?view=changes' },
  );
const solid = (root: ParentNode): (string | null)[] =>
  [...root.querySelectorAll('[data-solid]')].map((b) => b.getAttribute('data-testid'));
const critical = (el: Element): boolean => /critical/.test(el.className);
const review = async (id: string): Promise<HTMLElement> => {
  fireEvent.click(await screen.findByTestId(`fb-review-${id}`));
  return screen.findByTestId('fb-review');
};
/** The drawer: the review's nearest pop-up. */
const drawerOf = (body: HTMLElement): HTMLElement => body.closest('[role="dialog"]') as HTMLElement;
const say = (reason: string): void => {
  fireEvent.change(screen.getByTestId('fb-ask-reason'), { target: { value: reason } });
};

beforeEach(() => {
  flowVersionStore.reset();
  stepLedger.reset();
  purchaseRequisitionStore.reset();
});
afterEach(async () => {
  await setLang('en');
});

describe('FB-3 · the composer asks before it discards unsaved work', () => {
  it('closing a changed draft asks; "Keep editing" keeps it, "Discard changes" loses it — and a clean draft closes at once', async () => {
    const v = await versionAt('Draft');
    openChanges(COMPLIANCE);
    fireEvent.click(await screen.findByTestId(`fb-compose-${v.id}`));
    let dlg = await screen.findByTestId('fb-composer');

    // CLEAN: one solid button — handing the saved draft over — and it closes unasked.
    expect(solid(dlg)).toEqual(['fb-propose']);
    fireEvent.click(within(dlg).getByTestId('fb-compose-close'));
    await waitFor(() => expect(screen.queryByTestId('fb-composer')).not.toBeInTheDocument());

    // CHANGED: every way out asks.
    fireEvent.click(screen.getByTestId(`fb-compose-${v.id}`));
    dlg = await screen.findByTestId('fb-composer');
    fireEvent.click(within(dlg).getByTestId('fb-kind-confirmation'));
    fireEvent.click(within(dlg).getByTestId('fb-step-add'));
    expect(solid(dlg)).toEqual(['fb-save']);
    expect((within(dlg).getByTestId('fb-propose') as HTMLButtonElement).disabled).toBe(true);
    for (const leave of [
      () => fireEvent.click(within(dlg).getByTestId('fb-compose-close')),
      () => fireEvent.keyDown(document, { key: 'Escape' }),
    ]) {
      leave();
      const ask = await within(dlg).findByTestId('fb-discard-ask');
      expect(ask.textContent).toContain(`Version ${v.label} has changes that are not saved.`);
      // The destructive confirm is the pop-up's one solid button, and it is the critical one.
      expect(solid(dlg)).toEqual(['fb-discard-confirm']);
      expect(critical(within(dlg).getByTestId('fb-discard-confirm'))).toBe(true);
      expect(within(dlg).queryByTestId('fb-save')).not.toBeInTheDocument();
      fireEvent.click(within(dlg).getByTestId('fb-discard-keep'));
      expect(within(dlg).queryByTestId('fb-discard-ask')).not.toBeInTheDocument();
      expect(screen.getByTestId('fb-composer')).toBeInTheDocument();
    }
    fireEvent.click(within(dlg).getByTestId('fb-compose-close'));
    fireEvent.click(await within(dlg).findByTestId('fb-discard-confirm'));
    await waitFor(() => expect(screen.queryByTestId('fb-composer')).not.toBeInTheDocument());
    // Discarded means discarded: the store holds the one step it held.
    expect(flowVersionStore.byId(v.id)!.content.steps.map((s) => s.id)).toEqual([FINANCE_STEP]);
  });

  it('"Propose for review" hands the saved draft to the review, which asks why before anything moves', async () => {
    const v = await versionAt('Draft');
    openChanges(COMPLIANCE);
    fireEvent.click(await screen.findByTestId(`fb-compose-${v.id}`));
    fireEvent.click(within(await screen.findByTestId('fb-composer')).getByTestId('fb-propose'));
    const body = await screen.findByTestId('fb-review');
    expect(screen.queryByTestId('fb-composer')).not.toBeInTheDocument();
    expect(within(body).getByTestId('fb-ask').textContent).toContain(`Propose version ${v.label} for review`);
    expect(flowVersionStore.byId(v.id)!.state).toBe('Draft');
    // No reason, no act.
    expect((screen.getByTestId('fb-ask-confirm') as HTMLButtonElement).disabled).toBe(true);
    say('Finance asked for a second look above the threshold');
    fireEvent.click(screen.getByTestId('fb-ask-confirm'));
    await waitFor(() => expect(flowVersionStore.byId(v.id)!.state).toBe('In Review'));
    expect(await screen.findByText(`Version ${v.label} is in review.`)).toBeInTheDocument();
    // A proposed change is no longer composed.
    expect(screen.queryByTestId(`fb-compose-${v.id}`)).not.toBeInTheDocument();
  });
});

describe('FB-3 · the review', () => {
  it('the footer holds one solid button in each state that has a forward act, a destructive act is a critical outline, and its confirm is the solid critical one', async () => {
    const seen: string[] = [];
    for (const state of VERSION_STATES_REACHED) {
      flowVersionStore.reset();
      const v = await versionAt(state);
      const view = openChanges(ADMIN);
      const drawer = drawerOf(await review(v.id));
      const specs = REVIEW_ACTS[state];
      const forward = specs.filter((s) => s.forward).map((s) => `fb-act-${s.act}`);
      expect(forward.length, state).toBeLessThanOrEqual(1);
      expect(solid(drawer), state).toEqual(forward);
      expect(specs.map((s) => s.act).every((a) => within(drawer).queryByTestId(`fb-act-${a}`)), state).toBe(true);
      for (const s of specs.filter((x) => x.destructive)) {
        const button = within(drawer).getByTestId(`fb-act-${s.act}`);
        expect(critical(button), `${state} ${s.act}`).toBe(true);
        expect(button.hasAttribute('data-solid'), `${state} ${s.act}`).toBe(false);
        fireEvent.click(button);
        // The ask stands: its confirm is the ONE solid button, critical, and no other commit is offered.
        expect(solid(drawer), `${state} ${s.act} asked`).toEqual(['fb-ask-confirm']);
        expect(critical(within(drawer).getByTestId('fb-ask-confirm')), `${state} ${s.act} asked`).toBe(true);
        expect(within(drawer).queryByTestId('fb-act-approve')).not.toBeInTheDocument();
        fireEvent.click(within(drawer).getByTestId('fb-ask-cancel'));
        seen.push(`${state}:${s.act}`);
      }
      view.unmount();
    }
    // BY NAME — the two destructive acts were both pressed.
    expect(seen).toEqual(['In Review:reject', 'Active:retire']);
  });

  it('the proposer is refused in words that name them through the label resolver, and a different person approves; the history says who, when and why', async () => {
    const v = await versionAt('In Review');
    const mine = openChanges(COMPLIANCE);
    let body = await review(v.id);
    expect(within(body).getByTestId('fb-review-sentence-' + FINANCE_STEP).textContent).toBe(
      'Before “Approve”: Finance approves — “Finance approval”.',
    );
    fireEvent.click(screen.getByTestId('fb-act-approve'));
    say('looks right to me');
    fireEvent.click(screen.getByTestId('fb-ask-confirm'));
    const refusal = await screen.findByText(/proposed this change and may not also approve it/);
    expect(refusal.textContent).toContain('Compliance 1 (SAMPLE) proposed this change');
    expect(refusal.textContent).not.toContain(SAMPLE_PERSON_PREFIX);
    expect(flowVersionStore.byId(v.id)!.state).toBe('In Review');
    mine.unmount();

    openChanges(ADMIN);
    body = await review(v.id);
    fireEvent.click(screen.getByTestId('fb-act-approve'));
    say('read against the rules');
    fireEvent.click(screen.getByTestId('fb-ask-confirm'));
    await waitFor(() => expect(flowVersionStore.byId(v.id)!.state).toBe('Approved'));
    const history = within(await screen.findByTestId('fb-review-history')).getByRole('list').textContent ?? '';
    expect(history).toContain('Drafted by Compliance 1 (SAMPLE)');
    expect(history).toContain('Proposed by Compliance 1 (SAMPLE)');
    expect(history).toContain('Approved by Admin 1 (SAMPLE)');
    expect(history).toContain('Reason: read against the rules');
    // Approved is not in force: the process still runs as it shipped.
    expect(inForce(GATED_ENTITY).version).toBeNull();
    expect(screen.getByTestId('fb-review-since').textContent).toBe('Not in force');
  });

  it('a seat that holds no right reads the change and is told which lane decides it, in each act’s own slot', async () => {
    const v = await versionAt('In Review');
    openChanges(PROCUREMENT);
    const drawer = drawerOf(await review(v.id));
    expect(solid(drawer)).toEqual([]);
    for (const a of ['approve', 'return', 'reject', 'withdraw']) {
      expect(within(drawer).queryByTestId(`fb-act-${a}`), a).not.toBeInTheDocument();
      expect(within(drawer).getByTestId(`handoff-flow-${a}`).textContent, a).toContain('Compliance');
    }
  });

  it('ID — the review, the ask and the refusal are in Indonesian', async () => {
    await setLang('id');
    const v = await versionAt('In Review');
    openChanges(COMPLIANCE);
    const body = await review(v.id);
    expect(within(body).getByTestId('fb-review-sentence-' + FINANCE_STEP).textContent).toContain('Keuangan menyetujui — “Persetujuan Keuangan”.');
    expect(screen.getByTestId('fb-act-approve').textContent).toBe('Setujui');
    expect(screen.getByTestId('fb-act-return').textContent).toBe('Kembalikan untuk diubah');
    fireEvent.click(screen.getByTestId('fb-act-reject'));
    expect(screen.getByTestId('fb-ask').textContent).toContain('tidak dapat dikembalikan');
    expect(screen.getByTestId('fb-ask-confirm').textContent).toBe('Konfirmasi penolakan');
    fireEvent.click(screen.getByTestId('fb-ask-cancel'));
    fireEvent.click(screen.getByTestId('fb-act-approve'));
    say('saya setuju');
    fireEvent.click(screen.getByTestId('fb-ask-confirm'));
    expect((await screen.findByText(/mengusulkan perubahan ini dan tidak boleh juga menyetujuinya/)).textContent).toContain(
      'Kepatuhan 1 (CONTOH)',
    );
  });
});

describe('FB-4 · a change in force, on the document it gates', () => {
  const PENDING_PR = 'PR-2026-00344';
  const openPr = async (identity: CurrentIdentity) => {
    const view = renderWithProviders(
      <>
        <BuyerRequisitions />
        <Toaster />
      </>,
      { identity },
    );
    fireEvent.click(await screen.findByText(PENDING_PR));
    await screen.findByTestId('pr-approve').catch(() => null);
    return view;
  };

  it('⚠ CONTROL — with nothing in force the requisition carries no step line', async () => {
    await versionAt('Approved');
    await openPr(PROCUREMENT);
    expect(screen.getByTestId('pr-approve')).toBeInTheDocument();
    expect(screen.queryByTestId('next-act-buyer-pr-step')).not.toBeInTheDocument();
  });

  it('the line announces the step and its lane; the page’s own button answers with the step’s sentence and the requisition does not move', async () => {
    await versionAt('Active');
    const pr = pendingRequisition();
    await openPr(PROCUREMENT);
    const line = await screen.findByTestId(`next-act-buyer-pr-step-${FINANCE_STEP}`);
    expect(line.textContent).toContain('Added step');
    expect(line.textContent).toContain('Finance approval. Waiting for Finance.');
    // Procurement does not hold the step's lane: it reads the wait and is offered nothing.
    expect(screen.queryByTestId(`next-act-buyer-pr-step-open-${FINANCE_STEP}`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pr-approve'));
    expect(
      await screen.findByText(/Not yet: the step “Finance approval” must be completed first\. It is waiting for Finance\. Nothing was changed\./),
    ).toBeInTheDocument();
    expect(purchaseRequisitionStore.get(pr)!.status).toBe('Pending Approval');
  });

  it('Finance opens the step, reads the instruction and approves it; Procurement’s approve then succeeds', async () => {
    const version = await versionAt('Active');
    const pr = pendingRequisition();
    const finance = await openPr(FINANCE);
    fireEvent.click(await screen.findByTestId(`next-act-buyer-pr-step-open-${FINANCE_STEP}`));
    const dialog = await screen.findByTestId('step-dialog');
    expect(within(dialog).getByTestId('step-dialog-instruction').textContent).toBe('Check the budget line before the requisition is approved.');
    expect(within(dialog).getByTestId('step-dialog-source').textContent).toContain(`version ${version.label}`);
    expect(solid(dialog)).toEqual(['step-complete']);
    fireEvent.click(within(dialog).getByTestId('step-complete'));
    await waitFor(() => expect(stepLedger.all().map((r) => r.decision)).toEqual(['completed']));
    // The line is gone: nothing is due.
    await waitFor(() => expect(screen.queryByTestId(`next-act-buyer-pr-step-${FINANCE_STEP}`)).not.toBeInTheDocument());
    finance.unmount();

    await openPr(PROCUREMENT);
    fireEvent.click(await screen.findByTestId('pr-approve'));
    await waitFor(() => expect(purchaseRequisitionStore.get(pr)!.status).toBe('Approved'));
    expect(stepLedger.all().map((r) => r.used)).toEqual([true]);
  });

  it('a declined approval: the pop-up’s decline asks why, its confirm is the solid critical button, and the line and the gated button both say it was declined', async () => {
    await versionAt('Active');
    const finance = await openPr(FINANCE);
    fireEvent.click(await screen.findByTestId(`next-act-buyer-pr-step-open-${FINANCE_STEP}`));
    const dialog = await screen.findByTestId('step-dialog');
    fireEvent.click(within(dialog).getByTestId('step-decline'));
    expect(solid(dialog)).toEqual(['step-decline-confirm']);
    expect(critical(within(dialog).getByTestId('step-decline-confirm'))).toBe(true);
    expect((within(dialog).getByTestId('step-decline-confirm') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialog).getByTestId('step-decline-reason'), { target: { value: 'over the budget line' } });
    fireEvent.click(within(dialog).getByTestId('step-decline-confirm'));
    await waitFor(() => expect(stepLedger.all().map((r) => r.decision)).toEqual(['declined']));
    expect((await screen.findByTestId(`next-act-buyer-pr-step-${FINANCE_STEP}`)).getAttribute('data-step-state')).toBe('declined');
    finance.unmount();

    await openPr(PROCUREMENT);
    fireEvent.click(await screen.findByTestId('pr-approve'));
    const said = await screen.findByText(/was declined by Finance 1 \(SAMPLE\) — “over the budget line”/);
    expect(said.textContent).not.toContain(SAMPLE_PERSON_PREFIX);
  });

  it('a second surface — the shared line, given a document, says the same in Indonesian; without one it is the line it always was', async () => {
    await versionAt('Active', contentWith(financeApproval({ completerMayNotAct: true })));
    const doc = { entity: GATED_ENTITY, id: pendingRequisition(), state: 'Pending Approval' };
    await setLang('id');
    const view = renderWithProviders(<NextActLine act={null} testId="line" doc={doc} />, { identity: FINANCE });
    expect((await screen.findByTestId(`line-step-${FINANCE_STEP}`)).textContent).toContain('Persetujuan Keuangan. Menunggu Keuangan.');
    expect(screen.getByTestId(`line-step-open-${FINANCE_STEP}`).textContent).toBe('Buka langkah');
    view.unmount();
    renderWithProviders(<NextActLine act={null} testId="line" />, { identity: FINANCE });
    expect(screen.queryByTestId('line-step')).not.toBeInTheDocument();
    // A document resting where the gated act cannot be taken carries no line.
    renderWithProviders(<NextActLine act={null} testId="other" doc={{ ...doc, state: 'Draft' }} />, { identity: FINANCE });
    expect(screen.queryByTestId('other-step')).not.toBeInTheDocument();
  });
});

describe('FB-4 · the Process Flows page says which version runs', () => {
  it('shipped while nothing is in force; the change by label once it is; shipped again after a retire', async () => {
    const v = await versionAt('Active');
    const view = renderWithProviders(<ProcessFlows />, { identity: ADMIN, route: `/buyer/process-flows?flow=${GATED_ENTITY}` });
    expect((await screen.findByTestId('pf-inforce')).textContent).toMatch(new RegExp(`^Version ${v.label.replace('.', '\\.')} — in force since `));
    expect(screen.getByTestId('pf-inforce-steps').textContent).toBe('Before “Approve”: Finance approves — “Finance approval”.');
    // Another process is untouched.
    expect(screen.getByTestId('pf-flow-inforce-invoice').textContent).toMatch(/^Shipped · version \d+ — in force$/);
    view.unmount();

    flowVersionStore.reset();
    await versionAt('Retired');
    renderWithProviders(<ProcessFlows />, { identity: ADMIN, route: `/buyer/process-flows?flow=${GATED_ENTITY}` });
    expect((await screen.findByTestId('pf-inforce')).textContent).toMatch(/^Shipped · version \d+ — in force$/);
    expect(screen.queryByTestId('pf-inforce-steps')).not.toBeInTheDocument();
  });
});
