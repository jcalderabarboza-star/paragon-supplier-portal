// ────────────────────────────────────────────────────────────────────────────
// G1 · THE GUIDE TABS ON `/buyer/process-flows`, HELD (Design 5 §B.2).
//
//   · Overview opens first and still carries the catalogue's own content — so
//     nothing on the page moved out of view;
//   · every tab renders its section, and every step block carries its stable
//     citation key (SE-20);
//   · the Status history is READ from the audit sink: a seeded document says it
//     has no events, and a document a seat acts on shows that act, by `subject`;
//   · a fixture id links to the route that lists it;
//   · a flow whose guide is pending says so, and its history still works;
//   · Indonesian chrome reads the Indonesian guide.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import ProcessFlows from '../ProcessFlows';
import { MockCommandService, commandAuditSink } from '../../services/data/mock/MockCommandService';
import { purchaseOrderStore } from '../../services/data/mock/stores/purchaseOrderStore';
import { NO_PERSON } from '../../context/noPerson';
import { getGuide } from '../../guides';
import { parseMarkdown, parseInline, firstParagraphText } from '../../guides/markdown';
import { historyFor, documentsWithEvents } from './statusHistory';
import type { TransitionEvent } from '../../services/transitions/events';

const open = async (entity = 'purchaseOrder') => {
  renderWithProviders(<ProcessFlows />);
  await screen.findByRole('heading', { level: 1 });
  fireEvent.click(screen.getByTestId(`pf-flow-${entity}`));
};
const tab = (key: string) => fireEvent.click(screen.getByTestId(`pf-guide-tab-${key}`));

beforeEach(() => {
  commandAuditSink.clear();
  purchaseOrderStore.reset();
});
afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe('guide tabs — Overview first, nothing removed', () => {
  it('opens on Overview with the guide summary AND the catalogue’s transitions table', async () => {
    await open();
    expect(screen.getByTestId('pf-guide-tab-overview')).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByTestId('pf-guide-panel-overview');
    expect(within(panel).getByTestId('pf-guide-summary')).toHaveTextContent(/commitment to buy/);
    expect(within(panel).getByText('Transitions')).toBeInTheDocument();
    expect(within(panel).getByTestId('pf-purpose-t_po_confirm')).toBeInTheDocument();
    // The lifecycle walk stays under the diagram, outside the tabs.
    expect(screen.getByRole('heading', { name: 'Lifecycle walk' })).toBeInTheDocument();
  });

  it('the catalogue card carries the guide’s first paragraph; a pending flow says so', async () => {
    await open();
    expect(screen.getByTestId('pf-flow-guide-purchaseOrder')).toHaveTextContent(/commitment to buy/);
    expect(screen.getByTestId('pf-flow-guide-pending-rfq')).toHaveTextContent('Guide pending');
  });
});

describe('guide tabs — every section renders, every step is citable', () => {
  it.each([
    ['lifecycle', /Partially Delivered/],
    ['forks', /Short-confirm versus change request/],
    ['flags', /Awaiting S\/4HANA/],
    ['linked', /po-007/],
    ['troubleshooting', /Awaiting Supplier Fulfilment/],
  ])('%s renders the guide’s section', async (key, text) => {
    await open();
    tab(key);
    expect(screen.getByTestId(`pf-guide-panel-${key}`)).toHaveTextContent(text);
    expect(screen.getByTestId(`pf-guide-panel-${key}`)).toHaveAttribute(
      'data-citation',
      `guide://purchaseOrder/en#${key}`,
    );
  });

  it('Step by step renders one card per transition, in registry order, each with its key', async () => {
    await open();
    tab('steps');
    const cards = screen.getAllByTestId(/^pf-guide-step-/);
    expect(cards.map((c) => c.getAttribute('data-testid'))).toEqual(
      getGuide('purchaseOrder', 'en')!.transitions.map((t) => `pf-guide-step-${t}`),
    );
    expect(screen.getByTestId('pf-guide-step-t_po_confirm')).toHaveAttribute(
      'data-citation',
      'guide://purchaseOrder/en#t_po_confirm',
    );
    // Operator and Tester panes, the glossary as chips into the glossary.
    expect(screen.getByTestId('pf-guide-operator-t_po_confirm')).toHaveTextContent(/\/supplier\/dashboard/);
    expect(screen.getByTestId('pf-guide-tester-t_po_confirm')).toHaveTextContent('t_po_confirm');
    expect(
      within(screen.getByTestId('pf-guide-step-t_po_confirm')).getByTestId('glossary-chip-CommandRefusal.POLICY_REJECTED'),
    ).toBeInTheDocument();
  });

  it('a verb the seat does not hold shows its handoff notice; an external fact shows none', async () => {
    await open(); // the default buyer seat holds no supplier atom
    tab('steps');
    expect(screen.getByTestId('pf-guide-handoff-t_po_acknowledge')).toHaveTextContent(/Awaiting/);
    expect(screen.queryByTestId('pf-guide-handoff-t_po_deliver')).toBeNull();
  });

  it('Exception flags carries the guide’s table AND the registry’s derived box, apart', async () => {
    await open();
    tab('flags');
    expect(screen.getByTestId('pf-guide-flags-derived')).toBeInTheDocument();
  });
});

describe('guide tabs — Status history is read from the audit sink, by document', () => {
  it('a seeded document says it has no events, beside the guide’s worked sequence', async () => {
    await open();
    tab('history');
    expect(screen.getByTestId('pf-guide-history-seeded')).toHaveTextContent(/seeded before the audit began/);
    expect(screen.getByTestId('pf-guide-history-worked')).toHaveTextContent(/T\+1/);
  });

  it('an act on a document appears in its history — the edge, the seat, the event', async () => {
    const po = purchaseOrderStore.all().find((p) => p.status === 'Sent' && p.supplierId === 'sup-007')!;
    await new MockCommandService().dispatch(
      { personaType: 'supplier', supplierId: 'sup-007', businessRoles: ['fulfilment'], actor: NO_PERSON },
      { transitionId: 't_po_acknowledge', entity: 'purchaseOrder', entityId: po.id },
    );
    await open();
    tab('history');
    fireEvent.change(screen.getByTestId('pf-guide-history-pick'), { target: { value: po.id } });
    const row = screen.getByTestId('pf-guide-history-row-t_po_acknowledge');
    expect(row).toHaveTextContent('Sent → Acknowledged');
    expect(row).toHaveTextContent('supplier:sup-007');
    expect(row).toHaveTextContent('done');
  });

  it('Refresh re-reads the sink — an act after the tab opened appears', async () => {
    await open();
    tab('history');
    const po = purchaseOrderStore.all().find((p) => p.status === 'Sent' && p.supplierId === 'sup-007')!;
    fireEvent.change(screen.getByTestId('pf-guide-history-pick'), { target: { value: po.id } });
    expect(screen.queryByTestId('pf-guide-history-row-t_po_acknowledge')).toBeNull();
    await act(async () => {
      await new MockCommandService().dispatch(
        { personaType: 'supplier', supplierId: 'sup-007', businessRoles: ['fulfilment'], actor: NO_PERSON },
        { transitionId: 't_po_acknowledge', entity: 'purchaseOrder', entityId: po.id },
      );
    });
    fireEvent.click(screen.getByTestId('pf-guide-history-refresh'));
    expect(screen.getByTestId('pf-guide-history-row-t_po_acknowledge')).toBeInTheDocument();
  });
});

describe('guide tabs — test data links to the list', () => {
  it('each fixture id links to the route that lists its documents', async () => {
    await open();
    tab('testdata');
    expect(screen.getByTestId('pf-guide-fixture-po-008')).toHaveAttribute('href', '/buyer/orders');
    expect(screen.getByTestId('pf-guide-testdata')).toHaveTextContent('PO-2025-00105, -00108');
  });
});

describe('guide tabs — a pending flow, and Indonesian', () => {
  it('a flow whose guide is pending says so in its authored tabs; its history still renders', async () => {
    await open('rfq');
    tab('steps');
    expect(screen.getByTestId('pf-guide-pending')).toBeInTheDocument();
    tab('history');
    expect(screen.getByTestId('pf-guide-history-live')).toBeInTheDocument();
  });

  it('Indonesian chrome reads the Indonesian guide', async () => {
    await act(async () => {
      await i18n.changeLanguage('id');
    });
    await open();
    expect(screen.getByTestId('pf-guide-tab-steps')).toHaveTextContent('Langkah demi langkah');
    expect(screen.getByTestId('pf-guide-summary')).toHaveTextContent(/komitmen Paragon untuk membeli|Pesanan pembelian/);
    tab('steps');
    expect(screen.getByTestId('pf-guide-step-t_po_confirm')).toHaveAttribute(
      'data-citation',
      'guide://purchaseOrder/id#t_po_confirm',
    );
    expect(screen.getByTestId('pf-guide-operator-t_po_confirm')).toHaveTextContent('Di mana');
  });
});

// ── THE PURE HALVES ─────────────────────────────────────────────────────────

describe('guides/markdown — the narrow subset, and never HTML', () => {
  it('inline: code and strong, everything else verbatim', () => {
    expect(parseInline('a **b `c`** `d` <i>e</i>')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'strong', children: [{ kind: 'text', text: 'b ' }, { kind: 'code', text: 'c' }] },
      { kind: 'text', text: ' ' },
      { kind: 'code', text: 'd' },
      { kind: 'text', text: ' <i>e</i>' },
    ]);
  });

  it('a table, a nested ordered list, a paragraph', () => {
    const blocks = parseMarkdown('| A | B |\n|---|---|\n| `x` | y |\n\n- top\n  1. one\n  2. two\n\nplain\ntext');
    expect(blocks.map((b) => b.kind)).toEqual(['table', 'list', 'paragraph']);
    const list = blocks[1];
    expect(list.kind === 'list' && list.items[0].children[0].kind).toBe('list');
    expect(blocks[2].kind === 'paragraph' && blocks[2].inline).toEqual([{ kind: 'text', text: 'plain text' }]);
  });

  it('the first paragraph, as plain text', () => {
    expect(firstParagraphText('**Bold** and `code`.\n\nSecond.')).toBe('Bold and code.');
  });
});

describe('statusHistory — by subject, grouped by causation', () => {
  const ev = (over: Partial<TransitionEvent>): TransitionEvent => ({
    event: 't_x',
    actor: 'buyer:all',
    scope: { personaType: 'buyer', supplierId: null },
    correlationId: 'c1',
    outcome: 'done',
    ts: '2026-10-01T00:00:00.000Z',
    ...over,
  });
  const events = [
    ev({ correlationId: 'c1', subject: { entity: 'goodsReceipt', entityId: 'gr-1', from: 'Draft', to: 'Posted' } }),
    ev({ correlationId: 'c2', causationId: 'c1', subject: { entity: 'advanceShipNotice', entityId: 'asn-1', from: 'Shipped', to: 'Received' } }),
    ev({ correlationId: 'c3', subject: { entity: 'goodsReceipt', entityId: 'gr-2', from: 'Draft', to: 'Posted' } }),
    ev({ correlationId: 'c4' }),
  ];

  it('a document’s act and what it caused elsewhere read as one group', () => {
    const groups = historyFor(events, 'goodsReceipt', 'gr-1');
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => [r.event.correlationId, r.elsewhere])).toEqual([
      ['c1', false],
      ['c2', true],
    ]);
  });

  it('another document and a subject-less event are never pulled in', () => {
    expect(historyFor(events, 'goodsReceipt', 'gr-9')).toEqual([]);
    expect(documentsWithEvents(events, 'goodsReceipt')).toEqual(['gr-1', 'gr-2']);
  });
});
