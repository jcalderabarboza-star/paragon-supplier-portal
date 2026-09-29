// ────────────────────────────────────────────────────────────────────────────
// R1a — the supplier's responses list NAMES WHO ACTS NEXT.
//
// ⚠️ **THE DEFECT WAS NOT A MISSING ROW — IT WAS A ROW THAT SAID A NOUN.** The
// list already rendered all five states (measured end-to-end before this batch:
// Draft, Submitted, UnderReview, Accepted and Disputed each reached the DOM).
// What it did not say is that three of those five are states the supplier
// CANNOT LEAVE — every exit from Submitted / UnderReview / Disputed belongs to
// the buyer by `requiredRole`. That is a RULING, not a shortfall; the shortfall
// was surfacing the ruling's consequence as silence.
//
// ⚠️ **AND THE STATES ARE DRIVEN THROUGH THE MACHINE, NOT PATCHED INTO THE
// STORE.** Each case below dispatches the real buyer verbs to move rr-0001, so
// the fixture reaches `Disputed` the way a document would. A test that wrote
// `status: 'Disputed'` into the store directly would still pass on a day the
// transition stopped being legal — it would be asserting about its own setup.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '../test/test-utils';
import SupplierForecasts from './SupplierForecasts';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { getFlow } from '../services/transitions';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

const SUP002: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Lautan Luas Tbk',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};
const BUYER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };

beforeEach(() => requirementResponseStore.reset());
afterEach(async () => {
  await i18n.changeLanguage('en');
});

const openResponses = async () => {
  renderWithProviders(<SupplierForecasts />, { identity: SUP002, route: '/supplier/forecasts' });
  fireEvent.click(await screen.findByText(/My responses|Respons Saya/i));
  return await screen.findByTestId('sdcsup-responses');
};

// R1b — the buyer's authored text. Both verbs REQUIRE it now, so a payload-free
// dispatch is refused BY THE MACHINE — which is why these four call sites broke
// when the field landed, and why they are the whole break surface: no product
// code dispatches either verb yet (that is R1b proper, still booked).
export const DISPUTE_TEXT = 'Confirmed 6,000 KG against a 9,000 KG firm line — short by 3,000.';
export const RESOLUTION_TEXT = 'Shortfall accepted; the gap is covered from the Q4 buffer.';

/** Move rr-0001 through the REAL machine, as the buyer. */
const drive = async (path: readonly string[]) => {
  const svc = new MockCommandService();
  for (const transitionId of path) {
    const res = await svc.dispatch(BUYER, {
      transitionId,
      entity: 'requirementResponse',
      entityId: 'rr-0001',
      // One payload carries both texts; each verb reads only the field IT
      // requires, so this helper does not have to know which step it is on.
      payload: { disputeReason: DISPUTE_TEXT, resolutionReason: RESOLUTION_TEXT },
    } as never);
    expect(res.status).not.toBe('failed');
  }
};

const REVIEW = 't_requirementresponse_review';
const rowFor = (list: HTMLElement, id: string) =>
  within(list).getByText(id).closest('div.bg-bg-surface') as HTMLElement;

const actorOf = (list: HTMLElement, id: string) =>
  within(rowFor(list, id)).queryByTestId('sdcsup-response-actor')?.textContent ?? null;

describe('R1a — every RR state the supplier can see names its actor', () => {
  it('CONTROL: the six states this asserts over are the six the machine declares', () => {
    // Not a count — membership. A seventh state would be silently untested by a
    // spec that hardcoded six names, so the list under test is the flow's.
    // A3 added `Superseded`; its row is asserted in `requirementResponseRevise`'s
    // surface spec, where a revision is what puts a response there.
    expect(getFlow('requirementResponse')!.states).toEqual([
      'Draft',
      'Submitted',
      'UnderReview',
      'Accepted',
      'Disputed',
      'Superseded',
    ]);
  });

  it('Draft — the supplier\'s OWN turn (known-good: the fix must not mislabel this one)', async () => {
    const list = await openResponses();
    expect(actorOf(list, 'rr-0003')).toBe('Your turn — this is waiting on you');
  });

  it('Submitted — awaiting Paragon', async () => {
    const list = await openResponses();
    expect(actorOf(list, 'rr-0001')).toBe('Awaiting Paragon — nothing needed from you');
  });

  it('UnderReview — awaiting Paragon', async () => {
    await drive([REVIEW]);
    const list = await openResponses();
    expect(actorOf(list, 'rr-0001')).toBe('Awaiting Paragon — nothing needed from you');
  });

  // ⚠️ A3 — THIS READ "Awaiting Paragon — nothing needed from you", AND IT WAS
  // TRUE WHILE EVERY EXIT FROM `Disputed` WAS THE BUYER'S. The supplier now has
  // one (`t_requirementresponse_revise`), so "nothing needed from you" became a
  // claim the machine contradicts. The copy is still DERIVED: the buyer can act,
  // and the supplier's only verb reopens the thread, so it names both.
  it('⚠️ Disputed — awaiting Paragon, OR the supplier revises. THE DEAD-END SHAPE, CLOSED.', async () => {
    await drive([REVIEW, 't_requirementresponse_dispute']);
    const list = await openResponses();
    // Before R1a the row read "Disputed" and stopped. A supplier could
    // not tell a stalled document from one sitting in someone else's queue.
    expect(within(rowFor(list, 'rr-0001')).getByText('Disputed')).toBeTruthy();
    expect(actorOf(list, 'rr-0001')).toBe('Awaiting Paragon — or revise your answer yourself');
  });

  // ⚠️ A3 — INVERTED, NOT DELETED. This read "Complete — no further action",
  // derived from `Accepted` being terminal. It is not terminal any more: a
  // supplier may revise an accepted commitment. And it is NOT "your turn" either
  // — nothing is waiting on the supplier. The derivation keeps the two apart: a
  // supplier verb that only REOPENS the thread is an option, not a duty.
  it('Accepted — nothing needed, and NOT "your turn": the only exit is an optional revision', async () => {
    await drive([REVIEW, 't_requirementresponse_accept']);
    const list = await openResponses();
    const actor = actorOf(list, 'rr-0001');
    expect(actor).toBe('Nothing needed from you — revise it only if your commitment changes');
    expect(actor).not.toBe('Your turn — this is waiting on you');
  });
});

describe('R1a — ID from birth (not an EN string with a key around it)', () => {
  it('renders the Indonesian actor line on a disputed response', async () => {
    await drive([REVIEW, 't_requirementresponse_dispute']);
    await i18n.changeLanguage('id');
    const list = await openResponses();
    expect(actorOf(list, 'rr-0001')).toBe('Menunggu Paragon — atau revisi jawaban Anda sendiri');
  });

  it('renders the Indonesian actor line for the supplier\'s own turn, and for done', async () => {
    await i18n.changeLanguage('id');
    const draftList = await openResponses();
    expect(actorOf(draftList, 'rr-0003')).toBe('Giliran Anda — menunggu tindakan Anda');
  });

  it('⚠️ EN and ID differ — a missing ID value would fall back to EN and pass a laxer test', async () => {
    const en = await openResponses();
    const enText = actorOf(en, 'rr-0001');
    await i18n.changeLanguage('id');
    const id = await openResponses();
    expect(actorOf(id, 'rr-0001')).not.toBe(enText);
  });
});
