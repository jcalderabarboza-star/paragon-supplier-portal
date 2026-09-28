import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import i18n from '../lib/i18n';
import { rolesHolding } from '../services/transitions/businessRoles';
import BuyerChannelTriage from './BuyerChannelTriage';
import BuyerCollaboration from './BuyerCollaboration';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import IntakeReview from './IntakeReview';

// ────────────────────────────────────────────────────────────────────────────
// §74 — THE ROW-LEVEL GROUP. Nine verbs across five surfaces, same hook, same
// pattern, no widening.
//
// ⚠️ **EVERY CASE IS BILATERAL, AND THE HELD SEAT IS THE HALF THAT MATTERS.**
// A guard that removes an affordance ALWAYS is not a guard, it is a deletion —
// and it passes every withheld-side assertion. So each surface asserts the
// holding seat keeps its control and gets NO notice, before the withheld seat
// is believed.
// ────────────────────────────────────────────────────────────────────────────

const PLANNING: CurrentIdentity = { ...BUYER, businessRoles: ['planning'] };
const REQUISITIONER: CurrentIdentity = { ...BUYER, businessRoles: ['requisitioner'] };
const FINANCE: CurrentIdentity = { ...BUYER, businessRoles: ['finance'] };
const RECEIVING_ONLY: CurrentIdentity = { ...BUYER, businessRoles: ['receiving'] };

// ⚠️ THE CONFIRM CONTROL IS NOT ON THE PAGE UNTIL A MESSAGE IS PARSED, SO A
// BARE "it is absent" ASSERTION PASSES FOR EVERY SEAT AND PROVES NOTHING. The
// first cut of this pair did exactly that and went green; it was caught by
// asking whether the HOLDING seat could reach the control at all (it could not,
// without the interaction). Both cases now drive the parse first.
async function reachConfirmStage() {
  const select = screen.getByTestId('triage-supplier') as HTMLSelectElement;
  await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
  fireEvent.change(select, { target: { value: 'sup-007' } });
  fireEvent.change(screen.getByTestId('triage-message'), {
    target: { value: 'STOK PK-PETB-8810 2400 KG' },
  });
  fireEvent.click(screen.getByTestId('triage-parse'));
  const mat = (await screen.findByTestId('triage-mat-0')) as HTMLSelectElement;
  await waitFor(() => expect(within(mat).getAllByRole('option').length).toBeGreaterThan(1));
  fireEvent.change(mat, { target: { value: 'PK-PETB-8810' } });
}

describe('§74 · BuyerChannelTriage — inventorydeclaration:record', () => {
  it('HELD: a planning seat reaches the confirm control, and gets NO notice', async () => {
    renderWithProviders(<BuyerChannelTriage />, { identity: PLANNING });
    await screen.findAllByText(/Triage/i);
    await reachConfirmStage();
    expect(screen.getByTestId('triage-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-triage-record')).not.toBeInTheDocument();
  });

  it('WITHHELD: a finance seat reaches the same stage and reads the owner instead', async () => {
    renderWithProviders(<BuyerChannelTriage />, { identity: FINANCE });
    await screen.findAllByText(/Triage/i);
    await reachConfirmStage();
    expect(screen.queryByTestId('triage-confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-triage-record')).toHaveTextContent('Awaiting Planning');
  });
});

describe('§74 · BuyerCollaboration — requirementresponse:dispute', () => {
  it('HELD: a planning seat KEEPS the resolve CTA and sees no handoff', async () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration', identity: PLANNING });
    await screen.findAllByText(/Supplier Collaboration/i);
    // The positive half: without it, deleting the CTA outright would pass the
    // withheld case below and this one too.
    expect(await screen.findAllByTestId('sdc-resolve-cta')).not.toHaveLength(0);
    expect(screen.queryByTestId('handoff-sdc-resolve')).not.toBeInTheDocument();
  });

  it('WITHHELD: a finance seat reads the owner ONCE and gets no resolve CTA', async () => {
    renderWithProviders(<BuyerCollaboration />, { route: '/buyer/collaboration', identity: FINANCE });
    await screen.findAllByText(/Supplier Collaboration/i);
    // ⚠️ WAIT FOR THE DISPUTES SECTION TO BE POPULATED BEFORE ASSERTING AN
    // ABSENCE IN IT. The notice renders synchronously and the ROWS do not, so
    // the first cut checked "no CTA" over an empty list and passed for the
    // wrong reason — the mutation probe is what exposed it: turning the guard
    // always-on did NOT kill this case, which is the signature of an assertion
    // that was never looking at anything.
    const section = screen.getByTestId('sdc-disputes');
    await waitFor(() =>
      expect(within(section).getAllByRole('listitem').length).toBeGreaterThan(0),
    );
    const notices = screen.getAllByTestId('handoff-sdc-resolve');
    // ONE notice for the section, never one per dispute row — the atom does not
    // vary by row and a repeated owner down a list is noise, not help.
    expect(notices).toHaveLength(1);
    expect(notices[0]).toHaveTextContent('Awaiting Planning');
    expect(screen.queryAllByTestId('sdc-resolve-cta')).toHaveLength(0);
  });
});

// ⚠️ **DISMISS CHANGED SIDES AT A2, AND THE REVERSAL IS RECORDED HERE RATHER
// THAN THE ASSERTION BEING QUIETLY REWRITTEN.** The withheld case read
// *"keeps Dismiss, loses Accept"*, on the express ground that *"Dismiss is
// local view state holding no atom — gating it would invent an authority the
// machine never asserted."*
//
// **That ground was correct and it has expired.** A2 made dismissal a
// DISPATCHED VERB (`t_intake_dismiss`, atom `pr:create`), because a planner
// setting a line aside had made a decision that no colleague could see and that
// a reload erased. The machine now asserts exactly the authority the old
// comment said it did not, so gating it invents nothing — and leaving it
// ungated would be the opposite defect: a control that dispatches a verb the
// seat cannot fire, which is a button that refuses.
//
// The surface consequence: a withheld seat loses BOTH controls and reads ONE
// notice, because all three intake verbs hold the same atom.
describe('§74 · IntakeReview — pr:create, one notice for an unbounded table', () => {
  it('HELD: a requisitioner seat gets BOTH triage controls and no notice', async () => {
    renderWithProviders(<IntakeReview />, { identity: REQUISITIONER });
    // Wait for the ROWS, not the heading — the heading renders before the read
    // resolves, and querying then finds an empty table and calls it a result.
    const accepts = await screen.findAllByRole('button', { name: /Accept as delivered/i });
    expect(accepts.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Dismiss/i }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('handoff-intake-triage')).not.toBeInTheDocument();
  });

  it('WITHHELD: a finance seat reads the owner ONCE and loses BOTH controls', async () => {
    renderWithProviders(<IntakeReview />, { identity: FINANCE });
    // The rows must be on screen before an absence means anything — otherwise
    // this passes against an empty table, which is every seat's answer.
    await screen.findByText(/Glycerin USP/);
    expect(screen.queryAllByRole('button', { name: /Accept as delivered/i })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /Dismiss/i })).toHaveLength(0);
    // ONE notice for the surface, never one per row: the atom does not vary by
    // row, and the same string repeated down a column teaches nothing after the
    // first.
    const notices = screen.getAllByTestId('handoff-intake-triage');
    expect(notices).toHaveLength(1);
    expect(notices[0]).toHaveTextContent('Awaiting Requisitioner');
  });
});

describe('§74 · ID from birth, across the group', () => {
  it('the owner renders in Indonesian with no English frame left behind', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<IntakeReview />, { identity: FINANCE });
      // The withheld seat has no control left to wait on, so the wait anchors on
      // a ROW — the same act-hygiene point, one element over.
      await screen.findByText(/Glycerin USP/);
      expect(screen.getByTestId('handoff-intake-triage')).toHaveTextContent('Menunggu Pemohon');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

describe('§74 · the grouping premise, pinned', () => {
  it('⚠️ the six sourcing verbs share ONE owner today — the pin that says when they stop', () => {
    // BuyerSourcing groups publish/reopen/cancel into one notice and
    // review/award into another, on the ground that a withheld seat would read
    // the identical string at each site. That grouping is honest only while the
    // atoms agree. Each BUTTON is gated on its own atom, so a split leaves the
    // buttons correct — but the GROUPING would need re-taking, and this is what
    // says so.
    const sourcingVerbs = [
      'rfq:publish',
      'rfq:reopen',
      'rfq:cancel',
      'rfq:award',
      'quotation:review',
      'rfq:fx-pin',
    ] as const;
    const owners = sourcingVerbs.map((a) => rolesHolding(a).join(','));
    expect(owners).toEqual(Array(sourcingVerbs.length).fill('procurement'));
  });

  it('and the two planning verbs likewise', () => {
    expect(rolesHolding('inventorydeclaration:record')).toEqual(['planning']);
    expect(rolesHolding('requirementresponse:dispute')).toEqual(['planning']);
  });

  it('⚠️ CONTROL — a known-DIFFERENT atom does NOT report procurement', () => {
    // Without this the pins above would pass over a `rolesHolding` that
    // returned 'procurement' for everything.
    expect(rolesHolding('pr:create')).toEqual(['requisitioner']);
    expect(rolesHolding('gr:post')).toEqual(['receiving']);
  });
});

// ⚠️ §74's `BuyerSourcing` BLOCK IS RETIRED AT §76, NOT DELETED FOR CONVENIENCE.
// It asserted `handoff-rfq-actions` present and `toHaveLength(1)` — "ONE notice
// for the adjacent group, not one per verb" — which is the exact claim the
// operator's workspace ruling reverses. Its replacement is
// `handoffDrawerPerVerb.test.tsx`, which pins BOTH group ids ABSENT so the
// collapse cannot return quietly. The atom-owner pins above are unaffected and
// stay here: they are about the bundles, not about the placement.

describe('§75 · BuyerGoodsReceipt — the ROW-LEVEL verbs the entry guard did not cover', () => {
  // ⚠️ §73 GUARDED THE "New GR" ENTRY AND LEFT THREE ROW CONTROLS LIVE.
  // `Start inspection` opens the SAME wizard (so §73b's "no reachable second
  // route" was false), `Request retest` fires t_gr_request_retest, and
  // `Post to SAP` fires t_gr_post. A page can carry a notice and still ship
  // false affordances one panel down — IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01
  // for the second time, on the surface that had just been "covered".
  // ⚠️ THE ROW IS CHOSEN BY ITS STATUS, NOT BY BEING FIRST. `footerForStatus`
  // is a switch: GR-2026-001 is `Under Inspection`, whose control is a
  // DELIBERATE TOAST holding no atom, so a guard assertion there measures
  // nothing. The first cut of this block used it and failed for exactly that
  // reason — the same shape as §74b, caught here by the test going red rather
  // than green.
  const openRow = async (grNumber: string) => {
    fireEvent.click(await screen.findByText(grNumber));
    await new Promise((r) => setTimeout(r, 0));
  };
  const PENDING_INSPECTION = 'GR-2026-002'; // -> Start inspection (the chain)
  const APPROVED = 'GR-2026-003'; // -> Post to SAP (gr:post)

  it('HELD: a receiving seat gets Start inspection, and no notice', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { identity: RECEIVING_ONLY });
    await openRow(PENDING_INSPECTION);
    expect(await screen.findByRole('button', { name: /Start inspection/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-gr-start')).not.toBeInTheDocument();
  });

  it('WITHHELD: a finance seat reads the owner where Start inspection was', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { identity: FINANCE });
    await openRow(PENDING_INSPECTION);
    const n = await screen.findByTestId('handoff-gr-start');
    expect(n).toHaveTextContent('Awaiting Receiving');
    expect(screen.queryByRole('button', { name: /Start inspection/i })).not.toBeInTheDocument();
  });

  it('HELD: a receiving seat gets Post to SAP, and no notice', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { identity: RECEIVING_ONLY });
    await openRow(APPROVED);
    expect(await screen.findByRole('button', { name: /Post to SAP/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-gr-post')).not.toBeInTheDocument();
  });

  it('WITHHELD: a finance seat reads the owner where Post to SAP was', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { identity: FINANCE });
    await openRow(APPROVED);
    const n = await screen.findByTestId('handoff-gr-post');
    expect(n).toHaveTextContent('Awaiting Receiving');
    expect(screen.queryByRole('button', { name: /Post to SAP/i })).not.toBeInTheDocument();
  });

  it('⚠️ the UNGOVERNED control is untouched — Under Inspection holds no atom', async () => {
    // `Submit inspection results` is a deliberate toast (DEAD-AFFORDANCE-01).
    // It dispatches nothing, so it is not withheld from anybody; gating it
    // would invent an authority the machine never asserted.
    renderWithProviders(<BuyerGoodsReceipt />, { identity: FINANCE });
    await openRow('GR-2026-001');
    expect(await screen.findByRole('button', { name: /Submit inspection results/i })).toBeInTheDocument();
  });
});
