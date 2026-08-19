// ────────────────────────────────────────────────────────────────────────────
// R1b — THE BUYER CAN NOW RESOLVE A DISPUTE, and the supplier reads the answer.
//
// #239 gave `t_requirementresponse_resolve` a required, proven, stored reason
// and left it with no caller at all: the verb was complete and unreachable, and
// the entry said so in as many words — "it built both ends of the wire and left
// the switch off". This is the switch.
//
// ⚠️ EVERY ASSERTION BELOW GOES THROUGH THE REAL SURFACE AND THE REAL MACHINE.
// Nothing patches the store, and nothing dispatches a transition directly to set
// up a state the UI is then asked about — the dispute the buyer answers is the
// seeded one, the resolution is produced by clicking the button a planner
// clicks, and the supplier half is read by rendering the supplier's own page
// afterwards. A surface test that dispatches its own precondition proves the
// renderer and nothing about whether the button is wired to it.
//
// ⚠️ AND THE CONTROLS COME FIRST (rule 4). The gate here is "does this row offer
// the verb", and a gate is habitually probed only for what it REFUSES. A column
// that rendered its button unconditionally would pass every "the button works"
// assertion in this file and put a Resolve control on four rows that cannot
// legally be resolved. So the known-good and the known-bad are asserted as a
// pair, on the same render, before anything is clicked.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

import { renderWithProviders, BUYER } from '../test/test-utils';
import BuyerCollaboration from './BuyerCollaboration';
import SupplierForecasts from './SupplierForecasts';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { userVerbsFrom, getFlow } from '../services/transitions';
import { statusLabelKey } from '../lib/statusLabel';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';

/** The seeded disputed response: sup-005's short firm glycerin line. */
const RR = 'rr-0002';
const SUP005: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-005',
  supplierName: 'PT Distributor Kimia Nusantara',
};

const ANSWER = 'Accepted — the 500 KG gap is covered from the Q4 buffer, no re-plan needed.';

beforeEach(() => requirementResponseStore.reset());
afterEach(async () => {
  await i18n.changeLanguage('en');
});

const openBoard = async () => {
  renderWithProviders(<BuyerCollaboration />, {
    identity: BUYER,
    route: '/buyer/collaboration',
  });
  // The queue is fed by an async buyer-scoped read; wait for the section to
  // resolve rather than for a fixed string, so an empty read cannot pass as a
  // rendered one (the population assertions below then do the real work).
  await screen.findByTestId('sdc-disputes');
  await screen.findByText(/rr-0002|No dispute is waiting|Tidak ada sanggahan/);
};

const ctas = () => screen.queryAllByTestId('sdc-resolve-cta');

const openPanel = async () => {
  await openBoard();
  const cta = await screen.findByTestId('sdc-resolve-cta');
  fireEvent.click(cta);
  return await screen.findByTestId('sdc-resolve-input');
};

describe('R1b — the gate is the MACHINE, and it is probed both ways', () => {
  it('⚠ CONTROL (known-good + known-bad, one derivation) — only Disputed offers the verb', () => {
    // The population guard first: assert MEMBERSHIP, never a count, so an empty
    // registry can never report clean (EMPTY-INPUT-REPORTS-CLEAN-01, §42b).
    const fromDisputed = userVerbsFrom('requirementResponse', 'Disputed').map((v) => v.id);
    expect(fromDisputed).toContain('t_requirementresponse_resolve');

    for (const state of ['Draft', 'Submitted', 'UnderReview', 'Accepted']) {
      expect(userVerbsFrom('requirementResponse', state).map((v) => v.id)).not.toContain(
        't_requirementresponse_resolve',
      );
    }
  });

  it('⚠ CONTROL — exactly ONE row on the whole board offers the action', async () => {
    // The board carries seven lines and five responses. A column that rendered
    // its button unconditionally, or keyed on "has a response", would put the
    // control on four rows that cannot legally be resolved — and every
    // click-through test below would still pass.
    await openBoard();
    await waitFor(() => expect(ctas()).toHaveLength(1));
  });

  it('the offered row is the DISPUTED one, not merely some row', async () => {
    await openBoard();
    const cta = await screen.findByTestId('sdc-resolve-cta');
    // The cell lives in the row whose response is rr-0002 — proven through the
    // title, which names the line the machine says is resolvable.
    expect(cta.getAttribute('title')).toContain('RM-EMUL-3310');
    const row = cta.closest('li') as HTMLElement;
    expect(row).toHaveTextContent('rr-0002');
    expect(requirementResponseStore.get(RR)!.status).toBe('Disputed');
  });
});

describe('R1b — every state this lane can reach HAS a label, in both locales', () => {
  it('⚠ all five requirementResponse states resolve through the CENTRAL map', () => {
    // Found by browser QA, not by review: resolving landed the response in
    // `UnderReview` and the lifecycle chip vanished, because the central map is
    // keyed for the DISPLAY vocabulary ('Under Review', with a space) and the
    // MACHINE spells it 'UnderReview'. The two registries agreed on three of
    // five BY COINCIDENCE. Both misses — `UnderReview` and `Accepted` — are
    // reachable only through buyer verbs, and no buyer verb had a surface until
    // this batch, which is exactly why nobody had hit it.
    const flow = getFlow('requirementResponse')!;
    expect(flow.states).toContain('UnderReview'); // population guard, not a count
    for (const state of flow.states) {
      expect(statusLabelKey(state), `no canonical label for ${state}`).not.toBeNull();
    }
  });

  it('⚠ and they differ between EN and ID — a key with no ID value is not a label', async () => {
    const flow = getFlow('requirementResponse')!;
    const en = flow.states.map((s) => i18n.t(statusLabelKey(s)!));
    await i18n.changeLanguage('id');
    const id = flow.states.map((s) => i18n.t(statusLabelKey(s)!));
    // Every state must actually translate; an EN passthrough would be a key
    // that exists with no Indonesian behind it.
    flow.states.forEach((s, i) => {
      expect(id[i], `${s} did not translate`).not.toBe(en[i]);
    });
  });
});

describe('R1b — the capture: a required field with no dismissible way past it', () => {
  it('the panel opens on the DISPUTE ITSELF — a planner answers words they can read', async () => {
    await openPanel();
    const exchange = screen.getByTestId('sdc-resolve-exchange');
    expect(exchange).toHaveTextContent('Paragon disputed this');
    expect(exchange).toHaveTextContent(/firm line against a committed launch window/);
  });

  it('⚠ and on the SUPPLIER’S OWN WORDS — the first surface that shows them to the buyer', async () => {
    // R1a rendered `rootCause` back to the supplier who wrote it. Nothing had
    // ever rendered it to the planner, who is the party being asked to judge it.
    await openPanel();
    expect(screen.getByTestId('sdc-resolve-rootcause')).toHaveTextContent(
      /Principal lead time constrains bridgeable volume/,
    );
  });

  it('⚠ THE COMMIT IS DISABLED WHILE THE ANSWER IS BLANK — and blank means whitespace too', async () => {
    // The operator ruling, and one step beyond the neighbour it copies:
    // BuyerInvoices' dispute commit is `disabled={isPending}` only and refuses a
    // blank by early-returning into a toast. Measured on the tree, not assumed.
    const input = await openPanel();
    const commit = screen.getByTestId('sdc-resolve-commit');
    expect(commit).toBeDisabled();

    fireEvent.change(input, { target: { value: '   ' } });
    expect(commit).toBeDisabled();

    fireEvent.change(input, { target: { value: ANSWER } });
    expect(commit).toBeEnabled();
  });

  it('⚠ CANCEL WRITES NOTHING, and does not keep the words for next time', async () => {
    const input = await openPanel();
    fireEvent.change(input, { target: { value: ANSWER } });
    fireEvent.click(screen.getByText('Cancel'));

    expect(requirementResponseStore.get(RR)!.status).toBe('Disputed');
    expect(requirementResponseStore.get(RR)!.disputeResponse).toHaveLength(1);

    // Reopening starts empty: a resolution is AUTHORED, and a box that remembers
    // an abandoned draft is how somebody commits a sentence they had discarded.
    fireEvent.click(await screen.findByTestId('sdc-resolve-cta'));
    expect(await screen.findByTestId('sdc-resolve-input')).toHaveValue('');
  });
});

describe('R1b — the write: what a buyer can now do', () => {
  it('⚠ RESOLVING APPENDS THE BUYER’S WORDS AND MOVES THE STATE — through the button', async () => {
    const input = await openPanel();
    fireEvent.change(input, { target: { value: ANSWER } });
    fireEvent.click(screen.getByTestId('sdc-resolve-commit'));

    await waitFor(() => {
      expect(requirementResponseStore.get(RR)!.status).toBe('UnderReview');
    });
    const ledger = requirementResponseStore.get(RR)!.disputeResponse ?? [];
    expect(ledger.map((e) => e.kind)).toEqual(['raised', 'resolved']);
    expect(ledger[1].text).toBe(ANSWER);
    // The instant is store-minted, never payload-supplied (the pinnedAt rule).
    expect(Number.isFinite(Date.parse(ledger[1].at))).toBe(true);
  });

  it('⚠ THE TEXT IS SHIPPED TRIMMED BUT NOT OTHERWISE TOUCHED — a record, not copy', async () => {
    const input = await openPanel();
    fireEvent.change(input, { target: { value: `  ${ANSWER}  ` } });
    fireEvent.click(screen.getByTestId('sdc-resolve-commit'));
    await waitFor(() => {
      expect(requirementResponseStore.get(RR)!.disputeResponse).toHaveLength(2);
    });
    expect(requirementResponseStore.get(RR)!.disputeResponse![1].text).toBe(ANSWER);
  });

  it('⚠ AND THE AFFORDANCE RETIRES ITSELF — the row stops offering a resolved dispute', async () => {
    // The gate is the machine, so this needs no cleanup code: `UnderReview` does
    // not offer the verb, so the cell empties on the next render. A button keyed
    // on a status literal would need somebody to remember to remove it.
    const input = await openPanel();
    fireEvent.change(input, { target: { value: ANSWER } });
    fireEvent.click(screen.getByTestId('sdc-resolve-commit'));
    await waitFor(() => expect(ctas()).toHaveLength(0));
  });
});

describe('R1b — the other half: what a SUPPLIER can now read', () => {
  it('⚠ THE ANSWER REACHES THE PARTY WHO DID NOT WRITE IT — buyer surface in, supplier surface out', async () => {
    // The whole batch in one test, and the only one that spans both personas.
    // The resolution is produced by the buyer's button; the supplier's page is
    // then rendered fresh and asked what it shows. Neither half is stubbed.
    const input = await openPanel();
    fireEvent.change(input, { target: { value: ANSWER } });
    fireEvent.click(screen.getByTestId('sdc-resolve-commit'));
    await waitFor(() => {
      expect(requirementResponseStore.get(RR)!.disputeResponse).toHaveLength(2);
    });

    renderWithProviders(<SupplierForecasts />, {
      identity: SUP005,
      route: '/supplier/forecasts',
    });
    fireEvent.click(await screen.findByText(/My responses|Respons Saya/i));
    const list = await screen.findByTestId('sdcsup-responses');
    const row = within(list).getByText(RR).closest('div.bg-bg-surface') as HTMLElement;
    const ledger = within(row).getByTestId('sdcsup-dispute-ledger');

    expect(ledger).toHaveTextContent('Paragon resolved the dispute');
    expect(ledger).toHaveTextContent(ANSWER);
    // The raise is still there: answered is not the same as never raised.
    expect(ledger).toHaveTextContent('Paragon disputed this');
  });
});

describe('R1b — ID from birth (not an EN string with a key around it)', () => {
  it('the action, the panel and the guard all speak Indonesian', async () => {
    await i18n.changeLanguage('id');
    await openBoard();
    const cta = await screen.findByTestId('sdc-resolve-cta');
    expect(cta).toHaveTextContent('Selesaikan');

    fireEvent.click(cta);
    const input = await screen.findByTestId('sdc-resolve-input');
    // ⚠ EN and ID differ on every string asserted here — a missing ID value
    // would fall back to the EN string and pass a laxer assertion.
    expect(screen.getByText('Yang disampaikan pemasok')).toBeInTheDocument();
    expect(screen.getByText('Jawaban Anda')).toBeInTheDocument();
    expect(screen.getByTestId('sdc-resolve-commit')).toHaveTextContent('Selesaikan sanggahan');
    expect(screen.queryByText('Your answer')).not.toBeInTheDocument();

    // The guard is language-independent: the commit stays shut on a blank box.
    expect(screen.getByTestId('sdc-resolve-commit')).toBeDisabled();
    fireEvent.change(input, { target: { value: ANSWER } });
    expect(screen.getByTestId('sdc-resolve-commit')).toBeEnabled();
  });

  it('⚠ the AUTHORED words are never translated — the dispute reads the same in both locales', async () => {
    await i18n.changeLanguage('id');
    await openPanel();
    expect(screen.getByTestId('sdc-resolve-exchange')).toHaveTextContent(
      /firm line against a committed launch window/,
    );
    expect(screen.getByTestId('sdc-resolve-exchange')).toHaveTextContent(
      'Paragon menyanggah tanggapan ini',
    );
  });
});
