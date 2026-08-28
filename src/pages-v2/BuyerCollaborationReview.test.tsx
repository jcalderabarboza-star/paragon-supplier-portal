// ────────────────────────────────────────────────────────────────────────────
// WAVE C — THE REVIEW LANE. `t_requirementresponse_review` · `_accept` ·
// `_dispute`: three verbs with a complete machine, a wired CommandTarget, an
// atom on the `planning` lane, and — until this batch — no caller anywhere.
//
// ⚠️ **EVERY ASSERTION GOES THROUGH THE REAL SURFACE AND THE REAL MACHINE.**
// Nothing patches the store and nothing dispatches a transition directly to
// manufacture a state the UI is then asked about. `UnderReview` is REACHED by
// clicking review, exactly as a planner reaches it. A surface test that
// dispatches its own precondition proves the renderer and nothing about whether
// the button is wired to it.
//
// ⚠️ **AND THE CONTROLS COME FIRST (rule 4), BECAUSE A GUARD THAT REMOVES A
// CONTROL ALWAYS IS NOT A GUARD.** Each held/withheld pair asserts the HOLDING
// seat keeps its affordance before the withheld seat is believed — a section
// that rendered nothing at all would pass every withheld-side assertion in this
// file.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

import { renderWithProviders, BUYER } from '../test/test-utils';
import BuyerCollaboration from './BuyerCollaboration';
import SupplierForecasts from './SupplierForecasts';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { getFlow, userVerbsFrom } from '../services/transitions';
import { rolesHolding } from '../services/transitions/businessRoles';
import { mockDataService } from '../services/data/mock/mockDataService';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

/** A seat holding the planning lane — the lane all three atoms sit in. */
const PLANNING: CurrentIdentity = { ...BUYER, businessRoles: ['planning'] };
/** The same buyer with that lane REMOVED. Not a different persona: a narrowing. */
const NO_PLANNING: CurrentIdentity = { ...BUYER, businessRoles: ['finance'] };

/** sup-002's submitted line — the seeded response this lane walks. */
const RR = 'rr-0001';

const SUP002: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Packaging',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

const OBJECTION =
  'The committed date slips past the launch window — re-plan or escalate to the principal.';

beforeEach(() => requirementResponseStore.reset());
afterEach(async () => {
  await i18n.changeLanguage('en');
});

const openBoard = async (identity: CurrentIdentity = PLANNING) => {
  renderWithProviders(<BuyerCollaboration />, { identity, route: '/buyer/collaboration' });
  await screen.findAllByText(/Supplier Collaboration|Kolaborasi Pemasok/i);
};

/** The store's state SET, which is what a state census must compare. */
const statusSet = () => new Set(requirementResponseStore.all().map((r) => r.status));
const statusOf = (id: string) => requirementResponseStore.get(id)!.status;

// ────────────────────────────────────────────────────────────────────────────

describe('wave C — the gate is the MACHINE, probed in both directions', () => {
  it('⚠ CONTROL (known-good + known-bad, ONE derivation) — each verb is offered from its own state and nowhere else', () => {
    const states = getFlow('requirementResponse')!.states;
    // Population control first: an empty state list would report every verb as
    // offered nowhere and read exactly like a passing guard.
    expect(states).toContain('Submitted');
    expect(states).toContain('UnderReview');

    const offeredFrom = (verb: string) =>
      states.filter((s) => userVerbsFrom('requirementResponse', s).some((v) => v.id === verb));

    expect(offeredFrom('t_requirementresponse_review')).toEqual(['Submitted']);
    expect(offeredFrom('t_requirementresponse_accept')).toEqual(['UnderReview']);
    expect(offeredFrom('t_requirementresponse_dispute')).toEqual(['UnderReview']);
  });

  it('⚠ THE THREE ATOMS ARE DISTINCT, and the surface must not collapse them', () => {
    const f = getFlow('requirementResponse')!;
    const atomOf = (id: string) => f.transitions.find((t) => t.id === id)!.requiredRole;
    const atoms = [
      atomOf('t_requirementresponse_review'),
      atomOf('t_requirementresponse_accept'),
      atomOf('t_requirementresponse_dispute'),
    ];
    expect(new Set(atoms).size).toBe(3);
    // They co-reside in `planning` TODAY. That is a fact about the current role
    // catalogue, not a property of the verbs — which is why the page resolves
    // three availabilities rather than one.
    for (const atom of atoms) expect(rolesHolding(atom)).toContain('planning');
  });

  it('⚠ `Accepted` IS TERMINAL — derived from the flow, not asserted in prose', () => {
    const f = getFlow('requirementResponse')!;
    expect(f.states).toContain('Accepted');
    expect(f.transitions.filter((t) => t.from.includes('Accepted'))).toHaveLength(0);
  });
});

describe('wave C — the sections are derived, so they cannot offer an illegal act', () => {
  it('⚠ CONTROL — the review list holds exactly the Submitted responses, by id', async () => {
    const submitted = requirementResponseStore
      .all()
      .filter((r) => r.status === 'Submitted')
      .map((r) => r.id);
    expect(submitted.length).toBeGreaterThan(0); // the list must not be empty

    await openBoard();
    const section = screen.getByTestId('sdc-awaiting-review');
    await waitFor(() =>
      expect(within(section).getAllByRole('listitem').length).toBe(submitted.length),
    );
    for (const id of submitted) expect(within(section).getByText(id)).toBeInTheDocument();
    // known-bad on the SAME render: a Disputed response is not offered review.
    expect(within(section).queryByText('rr-0002')).not.toBeInTheDocument();
  });

  it('⚠ the under-review list is EMPTY at seed, and says so rather than rendering nothing', async () => {
    expect(statusSet().has('UnderReview')).toBe(false);
    await openBoard();
    const section = screen.getByTestId('sdc-under-review');
    expect(within(section).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(section).getByText(/Nothing is on your desk/i)).toBeInTheDocument();
  });
});

describe('wave C — held and withheld, for each of the three verbs', () => {
  /**
   * Put ONE response on the desk so the accept/dispute controls have somewhere
   * to render.
   *
   * ⚠️ **GROWN THROUGH THE DISPATCHED VERB UNDER AN HONEST SCOPE, NEVER STAMPED.**
   * Writing `UnderReview` into the store would let these assertions pass over a
   * state the machine cannot produce, and would keep passing on the day the
   * review edge is removed. This fires the same transition the button fires,
   * under a seat that genuinely holds the atom.
   */
  const growOneUnderReview = async () => {
    const res = await mockDataService.commands.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON },
      {
        transitionId: 't_requirementresponse_review',
        entity: 'requirementResponse',
        entityId: RR,
        payload: {},
      },
    );
    expect(res.status).not.toBe('failed');
    expect(statusOf(RR)).toBe('UnderReview');
  };

  it('HELD: a planning seat reaches ALL THREE controls, and gets no notice', async () => {
    // ⚠️ THE HELD HALF HAS TO REACH EACH CONTROL SEPARATELY, AND THE FIRST CUT
    // DID NOT. It asserted only the review CTA, so turning the ACCEPT or DISPUTE
    // gate permanently false killed nothing here — the signature of an assertion
    // that was never looking at those two. Found by the mutation probe, fixed by
    // walking to the state where they render.
    await growOneUnderReview();
    await openBoard(PLANNING);

    const review = screen.getByTestId('sdc-awaiting-review');
    await waitFor(() => expect(within(review).getAllByRole('listitem').length).toBeGreaterThan(0));
    expect(within(review).getAllByTestId('sdc-review-cta')).not.toHaveLength(0);

    const desk = screen.getByTestId('sdc-under-review');
    await waitFor(() => expect(within(desk).getByText(RR)).toBeInTheDocument());
    const row = within(desk).getByText(RR).closest('li')!;
    expect(within(row).getByTestId('sdc-accept-cta')).toBeInTheDocument();
    expect(within(row).getByTestId('sdc-dispute-cta')).toBeInTheDocument();

    expect(screen.queryByTestId('handoff-sdc-review')).not.toBeInTheDocument();
    expect(screen.queryByTestId('handoff-sdc-accept')).not.toBeInTheDocument();
    expect(screen.queryByTestId('handoff-sdc-dispute')).not.toBeInTheDocument();
  });

  it('WITHHELD: the same buyer without `planning` reads the OWNER, and gets no control', async () => {
    await growOneUnderReview();
    await openBoard(NO_PLANNING);

    // ⚠️ WAIT FOR BOTH LISTS TO POPULATE BEFORE ASSERTING AN ABSENCE IN THEM.
    // The notices render synchronously and the rows do not, so a bare "no CTA"
    // assertion would pass over an empty list and prove nothing — the exact
    // shape a mutation probe exposed on this page's resolve pair.
    const review = screen.getByTestId('sdc-awaiting-review');
    const desk = screen.getByTestId('sdc-under-review');
    await waitFor(() => expect(within(review).getAllByRole('listitem').length).toBeGreaterThan(0));
    await waitFor(() => expect(within(desk).getAllByRole('listitem').length).toBeGreaterThan(0));

    expect(screen.queryAllByTestId('sdc-review-cta')).toHaveLength(0);
    expect(screen.queryAllByTestId('sdc-accept-cta')).toHaveLength(0);
    expect(screen.queryAllByTestId('sdc-dispute-cta')).toHaveLength(0);

    // Pending WITH AN OWNER — never absent, never disabled. One notice per verb
    // in that verb's own slot, so a seat that lost one lane can still read which
    // of the three it is waiting on.
    expect(screen.getByTestId('handoff-sdc-review')).toHaveTextContent('Awaiting Planning');
    expect(screen.getByTestId('handoff-sdc-accept')).toHaveTextContent('Awaiting Planning');
    expect(screen.getByTestId('handoff-sdc-dispute')).toHaveTextContent('Awaiting Planning');
  });
});

describe('wave C — the walk: Submitted → review → accept', () => {
  it('⚠ REVIEWING MOVES THE STATE AND MOVES THE ROW — through the button', async () => {
    expect(statusOf(RR)).toBe('Submitted');
    await openBoard();

    const review = screen.getByTestId('sdc-awaiting-review');
    await waitFor(() => expect(within(review).getByText(RR)).toBeInTheDocument());
    const row = within(review).getByText(RR).closest('li')!;
    fireEvent.click(within(row).getByTestId('sdc-review-cta'));

    await waitFor(() => expect(statusOf(RR)).toBe('UnderReview'));
    // The affordance retires itself, and the row appears where it now belongs.
    await waitFor(() =>
      expect(within(screen.getByTestId('sdc-awaiting-review')).queryByText(RR)).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(within(screen.getByTestId('sdc-under-review')).getByText(RR)).toBeInTheDocument(),
    );
  });

  it('⚠ ACCEPTING CLOSES THE LINE, and the row leaves BOTH lists', async () => {
    await openBoard();
    const review = screen.getByTestId('sdc-awaiting-review');
    await waitFor(() => expect(within(review).getByText(RR)).toBeInTheDocument());
    fireEvent.click(within(within(review).getByText(RR).closest('li')!).getByTestId('sdc-review-cta'));
    await waitFor(() => expect(statusOf(RR)).toBe('UnderReview'));

    const desk = screen.getByTestId('sdc-under-review');
    await waitFor(() => expect(within(desk).getByText(RR)).toBeInTheDocument());
    fireEvent.click(within(within(desk).getByText(RR).closest('li')!).getByTestId('sdc-accept-cta'));

    await waitFor(() => expect(statusOf(RR)).toBe('Accepted'));
    await waitFor(() =>
      expect(within(screen.getByTestId('sdc-under-review')).queryByText(RR)).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getByTestId('sdc-awaiting-review')).queryByText(RR),
    ).not.toBeInTheDocument();
  });
});

describe('wave C — the walk: UnderReview → dispute, with the words it requires', () => {
  const reachDispute = async () => {
    await openBoard();
    const review = screen.getByTestId('sdc-awaiting-review');
    await waitFor(() => expect(within(review).getByText(RR)).toBeInTheDocument());
    fireEvent.click(within(within(review).getByText(RR).closest('li')!).getByTestId('sdc-review-cta'));
    await waitFor(() => expect(statusOf(RR)).toBe('UnderReview'));
    const desk = screen.getByTestId('sdc-under-review');
    await waitFor(() => expect(within(desk).getByText(RR)).toBeInTheDocument());
    fireEvent.click(within(within(desk).getByText(RR).closest('li')!).getByTestId('sdc-dispute-cta'));
    return await screen.findByTestId('sdc-dispute-input');
  };

  it('⚠ THE COMMIT IS DISABLED WHILE THE OBJECTION IS BLANK — and blank means whitespace', async () => {
    const input = await reachDispute();
    const commit = screen.getByTestId('sdc-dispute-commit');
    expect(commit).toBeDisabled();
    // `isEmpty('   ')` is FALSE at the machine, so whitespace would otherwise
    // reach `requiredFields` and pass it. The form refuses it first; the policy
    // hook is what refuses a hand-crafted dispatch (asserted separately below).
    fireEvent.change(input, { target: { value: '   ' } });
    expect(commit).toBeDisabled();
    fireEvent.change(input, { target: { value: OBJECTION } });
    expect(commit).toBeEnabled();
  });

  it('⚠ DISPUTING APPENDS THE BUYER’S WORDS AND MOVES THE STATE', async () => {
    const input = await reachDispute();
    fireEvent.change(input, { target: { value: `  ${OBJECTION}  ` } });
    fireEvent.click(screen.getByTestId('sdc-dispute-commit'));

    await waitFor(() => expect(statusOf(RR)).toBe('Disputed'));
    const ledger = requirementResponseStore.get(RR)!.disputeResponse ?? [];
    expect(ledger).toHaveLength(1);
    expect(ledger[0].kind).toBe('raised');
    // Shipped TRIMMED but not otherwise touched — a record, not copy.
    expect(ledger[0].text).toBe(OBJECTION);
  });

  it('⚠ CANCEL WRITES NOTHING, and does not keep the words for next time', async () => {
    const input = await reachDispute();
    fireEvent.change(input, { target: { value: OBJECTION } });
    fireEvent.click(screen.getByText('Cancel'));

    expect(statusOf(RR)).toBe('UnderReview');
    expect(requirementResponseStore.get(RR)!.disputeResponse ?? []).toHaveLength(0);

    const desk = screen.getByTestId('sdc-under-review');
    fireEvent.click(within(within(desk).getByText(RR).closest('li')!).getByTestId('sdc-dispute-cta'));
    expect(await screen.findByTestId('sdc-dispute-input')).toHaveValue('');
  });

  it('⚠ AND A HAND-CRAFTED DISPATCH THAT SKIPS THE FORM IS REFUSED BY THE POLICY HOOK', async () => {
    // The one guard the form cannot be the last word on. `requiredFields` runs
    // `isEmpty`, and `isEmpty('   ')` is false — so whitespace clears that layer
    // and only `rr_dispute_text_authored` stops it.
    const scope = {
      personaType: 'buyer' as const,
      supplierId: null,
      businessRoles: ['planning'],
      actor: NO_PERSON,
    };
    await mockDataService.commands.dispatch(scope, {
      transitionId: 't_requirementresponse_review',
      entity: 'requirementResponse',
      entityId: RR,
      payload: {},
    });
    expect(statusOf(RR)).toBe('UnderReview');

    const res = await mockDataService.commands.dispatch(scope, {
      transitionId: 't_requirementresponse_dispute',
      entity: 'requirementResponse',
      entityId: RR,
      payload: { disputeReason: '   ' },
    });
    expect(res.status).toBe('failed');
    expect(statusOf(RR)).toBe('UnderReview');
  });
});

describe('wave C — the other half: what the SUPPLIER reads', () => {
  it('⚠ THE OBJECTION REACHES THE PARTY WHO DID NOT WRITE IT — buyer surface in, supplier surface out', async () => {
    const input = await (async () => {
      await openBoard();
      const review = screen.getByTestId('sdc-awaiting-review');
      await waitFor(() => expect(within(review).getByText(RR)).toBeInTheDocument());
      fireEvent.click(
        within(within(review).getByText(RR).closest('li')!).getByTestId('sdc-review-cta'),
      );
      await waitFor(() => expect(statusOf(RR)).toBe('UnderReview'));
      const desk = screen.getByTestId('sdc-under-review');
      await waitFor(() => expect(within(desk).getByText(RR)).toBeInTheDocument());
      fireEvent.click(
        within(within(desk).getByText(RR).closest('li')!).getByTestId('sdc-dispute-cta'),
      );
      return await screen.findByTestId('sdc-dispute-input');
    })();
    fireEvent.change(input, { target: { value: OBJECTION } });
    fireEvent.click(screen.getByTestId('sdc-dispute-commit'));
    await waitFor(() => expect(statusOf(RR)).toBe('Disputed'));

    // Now render the SUPPLIER's own page and read it there. The navigation is
    // the supplier's own — the responses tab, the row, the ledger on that row.
    renderWithProviders(<SupplierForecasts />, { identity: SUP002, route: '/supplier/forecasts' });
    fireEvent.click(await screen.findByText(/My responses|Respons Saya/i));
    const list = await screen.findByTestId('sdcsup-responses');
    const row = within(list).getByText(RR).closest('div.bg-bg-surface') as HTMLElement;
    const ledger = within(row).getByTestId('sdcsup-dispute-ledger');
    expect(ledger).toHaveTextContent('Paragon disputed this');
    expect(ledger).toHaveTextContent(OBJECTION);
  });
});

describe('wave C — ID from birth, not an EN string with a key around it', () => {
  it('the three controls speak Indonesian', async () => {
    await i18n.changeLanguage('id');
    await openBoard();
    const review = screen.getByTestId('sdc-awaiting-review');
    await waitFor(() => expect(within(review).getByText(RR)).toBeInTheDocument());
    expect(within(review).getAllByTestId('sdc-review-cta')[0]).toHaveTextContent('Mulai telaah');

    fireEvent.click(within(within(review).getByText(RR).closest('li')!).getByTestId('sdc-review-cta'));
    await waitFor(() => expect(statusOf(RR)).toBe('UnderReview'));

    const desk = screen.getByTestId('sdc-under-review');
    await waitFor(() => expect(within(desk).getByText(RR)).toBeInTheDocument());
    const row = within(desk).getByText(RR).closest('li')!;
    expect(within(row).getByTestId('sdc-accept-cta')).toHaveTextContent('Terima');
    expect(within(row).getByTestId('sdc-dispute-cta')).toHaveTextContent('Sanggah');

    fireEvent.click(within(row).getByTestId('sdc-dispute-cta'));
    await screen.findByTestId('sdc-dispute-input');
    expect(screen.getByTestId('sdc-dispute-commit')).toHaveTextContent('Ajukan sanggahan');
  });

  it('⚠ and the ID strings DIFFER from the EN ones — a key with no ID value is not a label', async () => {
    const en = i18n.getFixedT('en');
    const id = i18n.getFixedT('id');
    for (const k of [
      'sdc.review.cta',
      'sdc.review.title',
      'sdc.accept.cta',
      'sdc.dispute.cta',
      'sdc.dispute.commit',
      'sdc.underReview.title',
    ]) {
      expect(id(k), `${k} falls back to EN`).not.toBe(en(k));
    }
  });
});
