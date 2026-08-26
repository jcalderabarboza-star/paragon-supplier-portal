// ────────────────────────────────────────────────────────────────────────────
// R1b — THE SUPPLIER READS THE BUYER'S WORDS. The mirror of R1a, completed.
//
// R1a rendered the supplier's OWN explanation back to them (`rootCause`) and
// put "Awaiting Paragon" on the row. That is a promise of review, and until this
// batch its outcome arrived as a bare status change: `Disputed` → `UnderReview`,
// with nothing said. This asserts the reverse direction — the party who did NOT
// write the text is the party who reads it.
//
// ⚠️ EVERY STATE HERE IS REACHED THROUGH THE REAL MACHINE, never by patching the
// store. If a policy hook, a required field or the ledger append breaks, `drive`
// throws before the render is asked anything — the surface can never be green
// over a spine that is red.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';

import { renderWithProviders } from '../test/test-utils';
import SupplierForecasts from './SupplierForecasts';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { MockCommandService } from '../services/data/mock/MockCommandService';
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

const DISPUTE_TEXT = 'Confirmed 6,000 KG against a 9,000 KG firm line — short by 3,000.';
const RESOLUTION_TEXT = 'Shortfall accepted; the gap is covered from the Q4 buffer.';

beforeEach(() => requirementResponseStore.reset());
afterEach(async () => {
  await i18n.changeLanguage('en');
});

/** Drive rr-0001 through the REAL machine as the buyer, texts and all. */
const drive = async (path: readonly string[]) => {
  const svc = new MockCommandService();
  for (const transitionId of path) {
    const res = await svc.dispatch(BUYER, {
      transitionId,
      entity: 'requirementResponse',
      entityId: 'rr-0001',
      payload: { disputeReason: DISPUTE_TEXT, resolutionReason: RESOLUTION_TEXT },
    } as never);
    expect(res.status).not.toBe('failed');
  }
};

const REVIEW = 't_requirementresponse_review';
const DISPUTE = 't_requirementresponse_dispute';
const RESOLVE = 't_requirementresponse_resolve';

const openResponses = async () => {
  renderWithProviders(<SupplierForecasts />, { identity: SUP002, route: '/supplier/forecasts' });
  fireEvent.click(await screen.findByText(/My responses|Respons Saya/i));
  return await screen.findByTestId('sdcsup-responses');
};

const rowFor = (list: HTMLElement, id: string) =>
  within(list).getByText(id).closest('div.bg-bg-surface') as HTMLElement;

const ledgerIn = (list: HTMLElement, id: string) =>
  within(rowFor(list, id)).queryByTestId('sdcsup-dispute-ledger');

describe('R1b — the buyer’s words reach the supplier who did not write them', () => {
  it('⚠️ CONTROL FIRST — an undisputed response renders NO ledger at all', async () => {
    // The known-good half. A component that rendered its container unconditionally
    // would pass every "the text is there" assertion below and put an empty
    // dispute block on every clean response in the portal.
    const list = await openResponses();
    expect(ledgerIn(list, 'rr-0001')).toBeNull();
  });

  it('⚠️ AND A REVIEWED-BUT-UNDISPUTED RESPONSE STILL RENDERS NOTHING', async () => {
    // `review` lands on UnderReview — the same state a RESOLUTION lands on. This
    // is the surface half of the from-state discriminator.
    await drive([REVIEW]);
    const list = await openResponses();
    expect(ledgerIn(list, 'rr-0001')).toBeNull();
  });

  it('a disputed response shows the buyer’s reason, verbatim', async () => {
    await drive([REVIEW, DISPUTE]);
    const list = await openResponses();
    const led = ledgerIn(list, 'rr-0001')!;
    expect(led).toBeTruthy();
    expect(led).toHaveTextContent('Paragon disputed this');
    expect(led).toHaveTextContent(DISPUTE_TEXT);
  });

  it('⚠️ A RESOLVED DISPUTE SHOWS BOTH — the raise is not erased by its answer', async () => {
    await drive([REVIEW, DISPUTE, RESOLVE]);
    const list = await openResponses();
    const led = ledgerIn(list, 'rr-0001')!;
    expect(led).toHaveTextContent(DISPUTE_TEXT);
    expect(led).toHaveTextContent(RESOLUTION_TEXT);
    expect(led).toHaveTextContent('Paragon resolved the dispute');
  });

  it('the raise reads BEFORE its resolution — order is the history', async () => {
    await drive([REVIEW, DISPUTE, RESOLVE]);
    const list = await openResponses();
    const text = ledgerIn(list, 'rr-0001')!.textContent ?? '';
    expect(text.indexOf(DISPUTE_TEXT)).toBeGreaterThanOrEqual(0);
    expect(text.indexOf(DISPUTE_TEXT)).toBeLessThan(text.indexOf(RESOLUTION_TEXT));
  });

  it('the ledger belongs to ITS response — a sibling row carries nothing', async () => {
    await drive([REVIEW, DISPUTE]);
    const list = await openResponses();
    // sup-002's other seeded responses must not inherit rr-0001's dispute.
    const others = within(list)
      .queryAllByTestId('sdcsup-dispute-ledger')
      .filter((el) => !rowFor(list, 'rr-0001').contains(el));
    expect(others).toEqual([]);
  });
});

describe('R1b — ID from birth (not an EN string with a key around it)', () => {
  it('renders the Indonesian labels on a resolved dispute', async () => {
    await drive([REVIEW, DISPUTE, RESOLVE]);
    await i18n.changeLanguage('id');
    const led = ledgerIn(await openResponses(), 'rr-0001')!;
    // ⚠️ EN and ID differ — a missing ID value would fall back to the EN string
    // and pass a laxer assertion. These are the ID words, not the EN ones.
    expect(led).toHaveTextContent('Paragon menyanggah tanggapan ini');
    expect(led).toHaveTextContent('Paragon menyelesaikan sanggahan');
    expect(led).not.toHaveTextContent('Paragon disputed this');
  });

  it('the buyer’s AUTHORED text is NOT translated — it is a record, not copy', async () => {
    // The labels localize; the words a human wrote are reproduced exactly. A
    // translated dispute reason would be a different claim than the one recorded.
    await drive([REVIEW, DISPUTE]);
    await i18n.changeLanguage('id');
    expect(ledgerIn(await openResponses(), 'rr-0001')!).toHaveTextContent(DISPUTE_TEXT);
  });
});
