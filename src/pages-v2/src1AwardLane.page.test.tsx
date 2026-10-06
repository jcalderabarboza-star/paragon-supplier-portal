// ────────────────────────────────────────────────────────────────────────────
// SRC-1 · THE AWARD LANE, AS THE BUYER AND THE SUPPLIER READ IT (EN and ID).
//
// The machine half is `services/data/mock/src1AwardLane.test.ts`. This file is
// the surface half: what the board counts, where the award commits, what the
// second ask says, what a cancelled event's supplier reads.
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, BUYER_NAMED, SUPPLIER } from '../test/test-utils';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { SAMPLE_ACTORS } from '../services/identity/sampleActors';
import { NO_PERSON } from '../context/noPerson';
import { formatDate } from '../lib/format';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';
import i18n from '../lib/i18n';
import BuyerSourcing from './BuyerSourcing';
import SupplierRFQs from './SupplierRFQs';
import { useToast } from '../hooks/useToast';

/** Surfaces the toast queue into the DOM — `ToastProvider` renders only its
 *  children, so without this a toast is invisible to a spec. */
function ToastSpy() {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((t) => (
        <li key={t.id}>
          {t.title} {t.description}
        </li>
      ))}
    </ul>
  );
}
const Sourcing = () => (
  <>
    <BuyerSourcing />
    <ToastSpy />
  </>
);

const svc = new MockCommandService();
const named: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: SAMPLE_ACTORS.procurement1,
};
const RECEIVING: CurrentIdentity = { ...BUYER, businessRoles: ['receiving'] };

const today = () => new Date().toISOString().slice(0, 10);
const statuses = (rfqId: string) => quotationStore.forRfq(rfqId).map((q) => q.status);

const openRfq = async (rfqNumber: string) => {
  fireEvent.click(await screen.findByText(rfqNumber));
  await screen.findByRole('dialog');
};
const pick = (nth: number) => fireEvent.click(screen.getAllByRole('radio', { name: /Award|Menangkan/ })[nth]);
const rowOf = async (rfqNumber: string) => (await screen.findByText(rfqNumber)).closest('tr')!;

beforeEach(() => {
  quotationStore.reset();
  rfqStore.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('1 · the board counts the quotations it has', () => {
  it('THE DEFECT, THEN THE FIX — a quotation submitted by the supplier moves the count', async () => {
    const first = renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(await rowOf('RFQ-2026-011')).toHaveTextContent('1 / 2');
    first.unmount();

    const res = await svc.dispatch(
      { personaType: 'supplier', supplierId: 'sup-007', businessRoles: ['supplier', 'commercial'], actor: NO_PERSON },
      {
        transitionId: 't_quotation_submit',
        entity: 'quotation',
        payload: { rfqId: 'rfq-011', supplierId: 'sup-007', unitPrice: 14_200, leadTimeDays: 10, currency: 'IDR', validUntil: '2026-12-31', paymentTermsOffered: '' },
      },
    );
    expect(res.status, res.reason).toBe('done');

    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(await rowOf('RFQ-2026-011')).toHaveTextContent('2 / 2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('2 · the award commits from Open and from Closed; a person closes bidding', () => {
  it('an Open event with a silent invitee offers the award, and says who has answered', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-001');
    const section = screen.getByTestId('rfq-award-section');
    expect(within(section).getByTestId('rfq-award-unanswered')).toHaveTextContent(
      '3 of 4 invited suppliers have answered',
    );
    expect(within(section).getByTestId('rfq-award')).toBeDisabled();
    pick(2);
    expect(within(section).getByTestId('rfq-award')).toBeEnabled();
  });

  it('a Closed event offers the award as it stands — beside Reopen, not behind it', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-004');
    expect(screen.getByTestId('rfq-award-section')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen RFQ' })).toBeInTheDocument();
    // every invitee answered here, so the "who has answered" line has nothing to say
    expect(screen.queryByTestId('rfq-award-unanswered')).not.toBeInTheDocument();
  });

  it('an event with no quotation has nothing to award', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-010');
    expect(screen.queryByTestId('rfq-award-section')).not.toBeInTheDocument();
  });

  it('Close bidding is offered on an Open event only, and closes it', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-001');
    fireEvent.click(screen.getByTestId('rfq-close'));
    await waitFor(() => expect(rfqStore.get('rfq-001')!.status).toBe('Closed'));
    expect(await screen.findByTestId('toast-spy')).toHaveTextContent('RFQ-2026-001 closed to new quotations');
    // the panel stays open on the same event: closed now, still awardable
    await waitFor(() => expect(screen.queryByTestId('rfq-close')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Reopen RFQ' })).toBeInTheDocument();
    expect(screen.getByTestId('rfq-award-section')).toBeInTheDocument();
  });

  it('a seat outside procurement reads who closes bidding, in that slot', async () => {
    renderWithProviders(<Sourcing />, { identity: RECEIVING });
    await openRfq('RFQ-2026-001');
    expect(screen.getByTestId('handoff-rfq-close')).toHaveTextContent('Awaiting Procurement');
    expect(screen.queryByTestId('rfq-close')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('3 · award and cancel ask a second time', () => {
  it('the award: the first press commits nothing and names the consequence', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-003');
    pick(0);
    fireEvent.click(screen.getByTestId('rfq-award'));
    const ask = await screen.findByTestId('rfq-award-ask');
    expect(ask).toHaveTextContent('Award RFQ-2026-003 to PT Sample Oleochemicals for Rp 534.000.000?');
    expect(ask).toHaveTextContent('This cannot be undone: the other 2 quotations are rejected');
    expect(rfqStore.get('rfq-003')!.status).toBe('Open');
    expect(statuses('rfq-003')).toEqual(['Under Review', 'Under Review', 'Under Review']);

    // "Not yet" takes the question away and still commits nothing
    fireEvent.click(screen.getByTestId('rfq-award-no'));
    expect(screen.queryByTestId('rfq-award-ask')).not.toBeInTheDocument();
    expect(rfqStore.get('rfq-003')!.status).toBe('Open');

    fireEvent.click(screen.getByTestId('rfq-award'));
    fireEvent.click(await screen.findByTestId('rfq-award-yes'));
    await waitFor(() => expect(rfqStore.get('rfq-003')!.status).toBe('Awarded'));
    expect(statuses('rfq-003')).toEqual(['Awarded', 'Rejected', 'Rejected']);
  });

  it('one other quotation reads "the other quotation", not "1 quotations"', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-004');
    pick(0);
    fireEvent.click(screen.getByTestId('rfq-award'));
    expect(await screen.findByTestId('rfq-award-ask')).toHaveTextContent(
      'the other quotation is rejected and its supplier is told',
    );
  });

  it('the only quotation on an event is not "the other 0 quotations"', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-011');
    pick(0);
    fireEvent.click(screen.getByTestId('rfq-award'));
    const ask = await screen.findByTestId('rfq-award-ask');
    expect(ask).toHaveTextContent('This cannot be undone. No other quotation was received on this event.');
    expect(ask).not.toHaveTextContent('0 quotations');
  });

  it('the cancel: the first press commits nothing and says what is withdrawn', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-002');
    fireEvent.click(screen.getByTestId('rfq-cancel'));
    const ask = await screen.findByTestId('rfq-cancel-ask');
    expect(ask).toHaveTextContent('Cancel RFQ-2026-002? This cannot be undone');
    expect(ask).toHaveTextContent('the 2 quotations on it are withdrawn');
    expect(rfqStore.get('rfq-002')!.status).toBe('Open');

    fireEvent.click(screen.getByTestId('rfq-cancel-no'));
    expect(screen.queryByTestId('rfq-cancel-ask')).not.toBeInTheDocument();
    expect(rfqStore.get('rfq-002')!.status).toBe('Open');

    fireEvent.click(screen.getByTestId('rfq-cancel'));
    fireEvent.click(await screen.findByTestId('rfq-cancel-yes'));
    await waitFor(() => expect(rfqStore.get('rfq-002')!.status).toBe('Cancelled'));
    expect(statuses('rfq-002')).toEqual(['Withdrawn', 'Withdrawn']);
  });

  it('a draft nobody answered says so, and one quotation is counted as one', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-008');
    fireEvent.click(screen.getByTestId('rfq-cancel'));
    expect(await screen.findByTestId('rfq-cancel-ask')).toHaveTextContent(
      'No quotation has been received on it.',
    );
    fireEvent.click(screen.getByTestId('rfq-cancel-no'));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await openRfq('RFQ-2026-011');
    fireEvent.click(screen.getByTestId('rfq-cancel'));
    expect(await screen.findByTestId('rfq-cancel-ask')).toHaveTextContent(
      'the 1 quotation on it is withdrawn and its supplier reads',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('4 · a mixed-currency event without a recorded rate', () => {
  it('says why before the act, and the commit is disabled with a quotation picked', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-012');
    pick(1);
    expect(screen.getByTestId('rfq-award-fx-blocked')).toHaveTextContent(
      'This event cannot be awarded yet: quotations are priced in USD and no exchange rate is recorded.',
    );
    expect(screen.getByTestId('rfq-award')).toBeDisabled();
    expect(rfqStore.get('rfq-012')!.status).toBe('Open');
  });

  it('KNOWN-GOOD — one currency throughout (rfq-009) and a recorded rate (rfq-013) are not blocked', async () => {
    const first = renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-009');
    pick(0);
    expect(screen.queryByTestId('rfq-award-fx-blocked')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfq-award')).toBeEnabled();
    first.unmount();

    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-013');
    pick(0);
    expect(screen.queryByTestId('rfq-award-fx-blocked')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfq-award')).toBeEnabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('9 · the award date is the day of the act', () => {
  it('the summary, the history row and the quarter count all read the day it was made', async () => {
    const before = renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    const kpi = async () => (await screen.findByText('Awarded (Quarter)')).closest('div')!.parentElement!;
    // SRC-2 — the two seeded awards are re-timed into the last 90 days, so the
    // count starts at 2; the award below is still what adds one.
    expect(await kpi()).toHaveTextContent(/Awarded \(Quarter\)\s*2/);
    before.unmount();

    await svc.dispatch(named, {
      transitionId: 't_rfq_award', entity: 'rfq', entityId: 'rfq-003',
      payload: { awardedQuotationId: 'qt-003a', awardedSupplierId: 'sup-001' },
    });
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    expect(await kpi()).toHaveTextContent(/Awarded \(Quarter\)\s*3/);
    await openRfq('RFQ-2026-003');
    expect(screen.getByTestId('rfq-award-date')).toHaveTextContent(formatDate(today()));
    // the deadline it used to show is still on the panel, as the deadline
    expect(screen.getByTestId('rfq-award-date')).not.toHaveTextContent('8 Sep 2026');
  });

  it('a seeded award keeps its date', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-006');
    // authored 11 Mar against the 05-18 anchor, re-timed with its event (SRC-2)
    expect(screen.getByTestId('rfq-award-date')).toHaveTextContent('24 Jun 2026');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('10 · a seat with nobody named', () => {
  it('reads the rule before the act, and a cancel is refused in its own words', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER });
    await openRfq('RFQ-2026-002');
    expect(screen.getByTestId('rfq-unattributed-note')).toHaveTextContent(
      'Publishing, advancing, concluding, cancelling and awarding are recorded against a person, and this seat carries none.',
    );
    fireEvent.click(screen.getByTestId('rfq-cancel'));
    fireEvent.click(await screen.findByTestId('rfq-cancel-yes'));
    await waitFor(() =>
      expect(screen.getByTestId('toast-spy')).toHaveTextContent(
        'Nothing was recorded. Publishing, advancing, concluding, cancelling or awarding a sourcing event is recorded against the person who decided it',
      ),
    );
    expect(rfqStore.get('rfq-002')!.status).toBe('Open');
    expect(statuses('rfq-002')).toEqual(['Under Review', 'Under Review']);
    // the developer's sentence is not what the buyer reads
    expect(screen.getByTestId('toast-spy')).not.toHaveTextContent('RFQ_ACTOR_UNATTRIBUTED');
  });

  it('an award by that seat is refused too, and nothing moves', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER });
    await openRfq('RFQ-2026-003');
    pick(0);
    fireEvent.click(screen.getByTestId('rfq-award'));
    fireEvent.click(await screen.findByTestId('rfq-award-yes'));
    await waitFor(() =>
      expect(screen.getByTestId('toast-spy')).toHaveTextContent('Nothing was recorded. Publishing, advancing, concluding, cancelling or awarding'),
    );
    expect(rfqStore.get('rfq-003')!.status).toBe('Open');
  });

  it('KNOWN-GOOD — a named seat reads no such note', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-002');
    expect(screen.queryByTestId('rfq-unattributed-note')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('8 · what the supplier of a cancelled event reads', () => {
  const cancel002 = () => svc.dispatch(named, { transitionId: 't_rfq_cancel', entity: 'rfq', entityId: 'rfq-002' });

  it('THE DEFECT, THEN THE FIX — the quotation leaves "awaiting award" and is not a loss', async () => {
    const before = renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const awaiting = async () => (await screen.findByText('Awaiting Award')).closest('div')!.parentElement!;
    expect(await awaiting()).toHaveTextContent(/Awaiting Award\s*2/);
    before.unmount();

    expect((await cancel002()).status).toBe('done');
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    expect(await awaiting()).toHaveTextContent(/Awaiting Award\s*1/);
    expect(screen.getByText(/1 quote pending evaluation/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /My Quotes/ }));
    expect(await screen.findByText('Withdrawn')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Awards & history/ }));
    const row = (await screen.findByText('RFQ-2026-002')).closest('tr')!;
    expect(row).toHaveTextContent('Event Cancelled');
    expect(row).toHaveTextContent('Paragon cancelled this event — no decision was made on your quotation');
    expect(row).not.toHaveTextContent('Not Awarded');
    // counted in neither half of the win rate
    expect(screen.getByText(/Your win rate: 0 of 0/)).toBeInTheDocument();
  });

  it('ID — the same row, in Indonesian', async () => {
    await cancel002();
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByRole('tab', { name: /Pemenangan & riwayat/ }));
    const row = (await screen.findByText('RFQ-2026-002')).closest('tr')!;
    expect(row).toHaveTextContent('Acara Dibatalkan');
    expect(row).toHaveTextContent('Paragon membatalkan acara ini — tidak ada keputusan atas penawaran Anda');
    expect(row).not.toHaveTextContent('Event Cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ID — the buyer side', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('id');
  });

  it('close bidding, the two questions and the answered line', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER_NAMED });
    await openRfq('RFQ-2026-001');
    expect(screen.getByTestId('rfq-close')).toHaveTextContent('Tutup penawaran');
    expect(screen.getByTestId('rfq-award-unanswered')).toHaveTextContent(
      '3 dari 4 pemasok yang diundang telah menjawab',
    );
    pick(2);
    fireEvent.click(screen.getByTestId('rfq-award'));
    const award = await screen.findByTestId('rfq-award-ask');
    expect(award).toHaveTextContent('Menangkan RFQ-2026-001 untuk Sample Salicylics & Niacinamide Ltd. senilai Rp 940.000.000?');
    expect(award).toHaveTextContent('2 penawaran lainnya ditolak');
    expect(screen.getByTestId('rfq-award-yes')).toHaveTextContent('Ya, menangkan');
    fireEvent.click(screen.getByTestId('rfq-award-no'));

    fireEvent.click(screen.getByTestId('rfq-cancel'));
    const cancel = await screen.findByTestId('rfq-cancel-ask');
    expect(cancel).toHaveTextContent('Batalkan RFQ-2026-001? Ini tidak dapat diurungkan');
    expect(cancel).toHaveTextContent('3 penawaran di dalamnya ditarik');
    expect(screen.getByTestId('rfq-cancel-yes')).toHaveTextContent('Ya, batalkan acara');
    expect(screen.getByTestId('rfq-cancel-no')).toHaveTextContent('Pertahankan acara');
  });

  it('the FX line and the nobody-named note', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER });
    await openRfq('RFQ-2026-012');
    expect(screen.getByTestId('rfq-award-fx-blocked')).toHaveTextContent(
      'Acara ini belum dapat dimenangkan: penawaran dihargai dalam USD dan belum ada kurs yang dicatat.',
    );
    expect(screen.getByTestId('rfq-unattributed-note')).toHaveTextContent(
      'dicatat atas nama seseorang, dan kursi ini tidak memilikinya',
    );
  });

  it('the refusal a nobody-named seat reads is Indonesian', async () => {
    renderWithProviders(<Sourcing />, { identity: BUYER });
    await openRfq('RFQ-2026-002');
    fireEvent.click(screen.getByTestId('rfq-cancel'));
    fireEvent.click(await screen.findByTestId('rfq-cancel-yes'));
    await waitFor(() =>
      expect(screen.getByTestId('toast-spy')).toHaveTextContent(
        'Tidak ada yang dicatat. Menerbitkan, melanjutkan, mengakhiri, membatalkan, atau menetapkan pemenang',
      ),
    );
    expect(rfqStore.get('rfq-002')!.status).toBe('Open');
  });
});
