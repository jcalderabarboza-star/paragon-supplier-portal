// ─────────────────────────────────────────────────────────────────────────────
// PF-1 · THE SURFACE GATE.
//
// The derivation is held by `catalogView.test.ts` and the geometry by
// `flowLayout.test.ts`. What is left for this suite is the part only a rendered
// page can be wrong about:
//
//   · that the page DRAWS the derivation rather than a copy of it,
//   · that a recorded exemption is VISIBLE at the state or transition it
//     concerns, rather than being a row in a file nobody opens,
//   · that the walk says what it is, and CANNOT be what it isn't, and
//   · that the honest marker never grows a green claim.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect, afterAll } from 'vitest';
import { screen, within, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import i18n from '../lib/i18n';
import { getKnownFlows } from '../services/transitions';
import { buildCatalogView } from '../services/transitions/catalogView';
import ProcessFlows from './ProcessFlows';

const catalog = buildCatalogView(getKnownFlows());
const setLang = (lng: 'en' | 'id') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

const drawnStates = (container: HTMLElement): string[] =>
  [...container.querySelectorAll('[data-testid^="pf-node-"]')].map((n) =>
    (n.getAttribute('data-testid') ?? '').replace('pf-node-', ''),
  );

// The page title also names a sidebar entry, so the heading role is what
// disambiguates it from the nav link.
const title = (): Promise<HTMLElement> =>
  screen.findByRole('heading', { level: 1, name: 'Process Flows' });
const rail = (): HTMLElement => screen.getByRole('navigation', { name: /lifecycle flows/i });
// Selection by test id, not by accessible name: `invoice` is a prefix of
// `invoiceMatch`, and a name-anchored query would silently match two flows.
const pick = (entity: string): void =>
  fireEvent.click(screen.getByTestId(`pf-flow-${entity}`));

describe('ProcessFlows — the page draws the derivation, not a copy of it', () => {
  it('renders the catalog with counts that are the schema’s own lengths', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    expect(await title()).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `${catalog.flowCount} flows · ${catalog.stateCount} states · ${catalog.transitionCount} transitions`,
        ),
      ),
    ).toBeInTheDocument();
  });

  it('the rail lists EVERY registered flow — the population is the registry’s', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    const items = within(rail()).getAllByRole('button');
    expect(items.map((b) => b.textContent?.split(/\d/)[0].trim())).toEqual(
      catalog.flows.map((f) => f.entity),
    );
  });

  it('⚠️ every node drawn is a state the selected machine DECLARES, and all of them are', async () => {
    const { container } = renderWithProviders(<ProcessFlows />, {
      route: '/buyer/process-flows',
    });
    await title();
    const first = catalog.flows[0];
    expect(drawnStates(container)).toEqual(first.states.map((s) => s.name));
  });

  it('selecting a flow redraws it — for every flow in the catalog', async () => {
    const { container } = renderWithProviders(<ProcessFlows />, {
      route: '/buyer/process-flows',
    });
    await title();
    for (const flow of catalog.flows) {
      pick(flow.entity);
      expect(drawnStates(container), flow.entity).toEqual(flow.states.map((s) => s.name));
    }
  });

  it('the transitions table lists every declared transition of the selected flow', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    for (const t of catalog.flows[0].transitions) {
      expect(screen.getAllByText(t.def.id).length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE INSTRUMENT HALF OF PF-0, MADE VISIBLE
// ─────────────────────────────────────────────────────────────────────────────

describe('ProcessFlows — a recorded exemption is visible where it applies', () => {
  const withEnds = catalog.flows.filter((f) => f.looseEnds.length > 0);

  it('precondition: the shipped catalog still carries recorded loose ends', () => {
    expect(withEnds.length).toBeGreaterThan(0);
  });

  it.each(withEnds.map((f) => [f.entity] as const))(
    '%s — every loose end shows its subject and its REASON TOKEN on the page',
    async (entity) => {
      renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
      await title();
      pick(entity);
      const flow = catalog.flows.find((f) => f.entity === entity)!;
      for (const end of flow.looseEnds) {
        // The subject — a state name or a transition id — appears verbatim…
        expect(screen.getAllByText(end.subject).length).toBeGreaterThan(0);
        // …and so does the census's own closed-vocabulary reason word, which is
        // what makes the hole read as a decision rather than an omission.
        expect(end.reason).not.toBeNull();
        expect(screen.getAllByText(end.reason as string).length).toBeGreaterThan(0);
      }
    },
  );

  it('the recorded census NOTE is shown, so the decision is readable and not just cited', async () => {
    const { container } = renderWithProviders(<ProcessFlows />, {
      route: '/buyer/process-flows',
    });
    await title();
    const flow = catalog.flows.find((f) => f.looseEnds.some((e) => e.note))!;
    pick(flow.entity);
    const note = flow.looseEnds.find((e) => e.note)!.note as string;
    expect(container.textContent).toContain(note);
  });

  it('a flow with NO loose ends shows no loose-end section — silence for the right reason', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    const clean = catalog.flows.find((f) => f.looseEnds.length === 0)!;
    pick(clean.entity);
    expect(screen.queryByText(/Recorded loose ends/)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE WALK — what it says, and what it structurally cannot do
// ─────────────────────────────────────────────────────────────────────────────

describe('ProcessFlows — the lifecycle walk is honest about what it is', () => {
  it('states the contract on the surface, in the operator’s words', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    expect(
      screen.getByText(/advancing moves a local demo cursor only/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/system steps are shown as observed, never performed/i),
    ).toBeInTheDocument();
  });

  it('⚠️ says it is NOT a guided lesson — Learn walks real records and dispatches real verbs', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    expect(screen.getByText(/it is not a guided lesson/i)).toBeInTheDocument();
  });

  it('advances a local cursor through the machine, and resets', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    // purchaseOrder: born at Sent, then a three-way fork.
    expect(screen.getByText('not started')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Advance' }));
    expect(screen.getAllByText('Sent').length).toBeGreaterThan(0);
    // Three verbs leave `Sent`; all three are offered, none is invented.
    expect(screen.getAllByRole('button', { name: 'Advance' })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Reset walk' }));
    expect(screen.getByText('not started')).toBeInTheDocument();
  });

  it('a system-driven step reads "Observe", never "Advance"', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    fireEvent.click(screen.getByRole('button', { name: 'Advance' })); // → Sent
    // Confirm is the operator verb that unlocks the system-driven fulfilment.
    const confirm = screen
      .getAllByRole('button', { name: 'Advance' })
      .find((b) => b.closest('div')?.textContent?.includes('Confirmed'))!;
    fireEvent.click(confirm);
    expect(screen.getAllByRole('button', { name: 'Observe' }).length).toBeGreaterThan(0);
  });

  it('⚠️ STRUCTURALLY cannot dispatch — the surface never touches the command spine', () => {
    // The copy says the walk dispatches nothing. This is what makes the copy a
    // fact rather than a promise: the page and its components import no
    // dispatcher, no command service and no settle path, so there is no code
    // path by which a step could reach the ledger. A future edit that adds one
    // turns this red BEFORE the copy becomes a lie.
    const dir = join(process.cwd(), 'src', 'pages-v2', 'process-flows');
    const files = [
      join(process.cwd(), 'src', 'pages-v2', 'ProcessFlows.tsx'),
      ...readdirSync(dir)
        .filter((f) => !f.includes('.test.'))
        .map((f) => join(dir, f)),
    ];
    const forbidden = /\bdispatch\s*\(|useCommand|settle\s*\(|CommandService|useMutation/;
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(forbidden.test(source), `${file} reaches the command spine`).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HONEST RENDER + BILINGUAL FROM BIRTH
// ─────────────────────────────────────────────────────────────────────────────

describe('ProcessFlows — honesty markers', () => {
  it('names both halves: the catalog is real, the walk is not', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    expect(screen.getByText(/Real: the catalog/)).toBeInTheDocument();
    expect(screen.getByText(/Not real: the lifecycle walk/)).toBeInTheDocument();
  });

  it('⚠️ never renders a green live claim — no flow feed is real', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    expect(screen.queryByText(/real-time/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Sample data/).length).toBeGreaterThan(0);
  });

  it('a wired machine no capability reads still reports its verbs honestly', async () => {
    renderWithProviders(<ProcessFlows />, { route: '/buyer/process-flows' });
    await title();
    pick('quotation');
    expect(screen.getByText('No read surface')).toBeInTheDocument();
    expect(screen.getByText('Commands dispatch')).toBeInTheDocument();
    pick('contract');
    expect(screen.getByText('Authored — unwired')).toBeInTheDocument();
  });

  it('EN+ID from birth: the page chrome renders in Indonesian, English gone', async () => {
    await setLang('id');
    const { container } = renderWithProviders(<ProcessFlows />, {
      route: '/buyer/process-flows',
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Alur Proses' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Lifecycle walk')).not.toBeInTheDocument();
    expect(screen.getByText('Penelusuran siklus hidup')).toBeInTheDocument();
    // …and the schema's own identifiers are UNTRANSLATED in both locales, which
    // is the point: a state name is a document number, not prose.
    expect(drawnStates(container)).toEqual(catalog.flows[0].states.map((s) => s.name));
    await setLang('en');
  });
});
