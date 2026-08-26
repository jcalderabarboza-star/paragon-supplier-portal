import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import i18n from '../lib/i18n';
import BuyerInvoices from './BuyerInvoices';
import { NO_PERSON } from '../context/noPerson';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE BINDING CONSTRAINT, ON THE SCREEN.
//
//   > EVERY CROSS-ROLE HANDOFF RENDERS THE WAIT, NOT A GAP. A verb a user's
//   > role does not hold shows as PENDING WITH AN OWNER — "Awaiting Finance" —
//   > NEVER AS AN ABSENT AFFORDANCE.
//
// **This is the thing most likely to be right in the derivation and wrong on
// the screen** (operator), and `handoff.test.ts` cannot catch that: it proves
// the machine knows finance owns `invoice:pay`, not that a procurement user
// ever SEES so. The failure mode is a green derivation over a footer that
// silently lost its button — which is exactly the defect
// `invoiceActionModel.ts` was written to prevent, arriving through the role
// layer instead of the label one.
//
// The seat here is `procurement` ALONE — the narrowest seat that still opens
// this page.
// ─────────────────────────────────────────────────────────────────────────────

const PROCUREMENT: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};

const FULL_BUYER: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};

/** The doc number of an invoice the machine says is releasable. */
function releasableDocNumber(): string {
  const approved = invoiceStore.all().find((i) => i.status === 'Approved');
  expect(approved, 'no Approved invoice in the fixtures').toBeDefined();
  return approved!.invoiceNumber;
}

beforeEach(() => {
  invoiceStore.reset();
});

describe('POPULATION GUARD', () => {
  it('the fixture this walks still exists and is releasable', () => {
    expect(releasableDocNumber()).toMatch(/^INV-/);
  });
});

describe('⚠️ A PROCUREMENT SEAT SEES THE WAIT, NOT A GAP', () => {
  it('the release button is ABSENT and "Awaiting Finance" is PRESENT', async () => {
    renderWithProviders(<BuyerInvoices />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText(releasableDocNumber()));

    // Both halves, and the second is the one that matters. Asserting only the
    // absence would pass over a footer that lost the affordance entirely —
    // which is the outcome the constraint forbids, and it looks identical to
    // this one in a test that only checks the button is gone.
    expect(screen.queryByRole('button', { name: 'Release payment' })).not.toBeInTheDocument();
    const notice = await screen.findByTestId('handoff-commit');
    expect(notice).toHaveTextContent(/Awaiting Finance/i);
    expect(notice.getAttribute('data-handoff')).toBe('withheld');
  });

  it('the notice is TEXT, not a disabled button', () => {
    // A disabled button says "you may not"; it does not say WHO MAY, and in a
    // text sweep it reads identically to an absent one. The distinction is
    // load-bearing for the QA this batch was ruled to have.
    renderWithProviders(<BuyerInvoices />, { identity: PROCUREMENT });
    return screen.findByText(releasableDocNumber()).then(async (row) => {
      fireEvent.click(row);
      const notice = await screen.findByTestId('handoff-commit');
      expect(notice.tagName).toBe('SPAN');
      expect(notice).not.toHaveAttribute('disabled');
    });
  });

  it('the DISPUTE verb hands off too — finance owns invoice:dispute', async () => {
    renderWithProviders(<BuyerInvoices />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText(releasableDocNumber()));
    const notice = await screen.findByTestId('handoff-dispute');
    expect(notice).toHaveTextContent(/Awaiting Finance/i);
  });
});

describe('⚠️ THE DISPUTED INVOICE — the footer verb that is NOT the solid commit', () => {
  // FOUND IN THE BROWSER, NOT BY THE SUITE. `handleFooterAction` dispatches the
  // solid commit when there is one and `t_invoice_resolve` when there is not, so
  // a DISPUTED invoice puts a finance-owned verb in the primary slot with
  // `commitAction === null`. The first cut of the guard keyed on the commit and
  // left that button live: present, pressable, refused at the dispatcher.
  // The list-level sweep is identical for every seat — only opening a Disputed
  // invoice shows it.
  function disputedDocNumber(): string {
    const d = invoiceStore.all().find((i) => i.status === 'Disputed');
    expect(d, 'no Disputed invoice in the fixtures').toBeDefined();
    return d!.invoiceNumber;
  }

  it('the resolve button is replaced by the wait for a procurement seat', async () => {
    renderWithProviders(<BuyerInvoices />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText(disputedDocNumber()));
    const notice = await screen.findByTestId('handoff-commit');
    expect(notice).toHaveTextContent(/Awaiting Finance/i);
    expect(screen.queryByRole('button', { name: /Resolve dispute/i })).not.toBeInTheDocument();
  });

  it('and a full seat still gets the resolve button — the known-GOOD half', async () => {
    renderWithProviders(<BuyerInvoices />, { identity: FULL_BUYER });
    fireEvent.click(await screen.findByText(disputedDocNumber()));
    expect(await screen.findByRole('button', { name: /Resolve dispute/i })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-commit')).not.toBeInTheDocument();
  });
});

describe('THE KNOWN-GOOD HALF — a seat that HOLDS it still acts (§39)', () => {
  it('a full buyer seat gets the button and NO handoff notice', async () => {
    // Without this, every assertion above is equally consistent with a page
    // that renders the notice for everybody, or with a broken footer.
    renderWithProviders(<BuyerInvoices />, { identity: FULL_BUYER });
    fireEvent.click(await screen.findByText(releasableDocNumber()));
    expect(await screen.findByRole('button', { name: 'Release payment' })).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-commit')).not.toBeInTheDocument();
  });
});

describe('THE WAIT IS TRANSLATED — the constraint holds in Indonesian', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders "Menunggu Keuangan", not an English passthrough', async () => {
    // A handoff line that only exists in English is a handoff that does not
    // reach half this portal's users — and the EN string would still satisfy
    // every assertion above.
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerInvoices />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText(releasableDocNumber()));
    const notice = await screen.findByTestId('handoff-commit');
    expect(notice).toHaveTextContent(/Menunggu/i);
    expect(notice).toHaveTextContent(/Keuangan/i);
    expect(notice).not.toHaveTextContent(/Awaiting/i);
  });
});
