// ─────────────────────────────────────────────────────────────────────────────
// PG-1 (operator ruling, 11 October 2026) · EVERY POP-UP IS THE SHARED ONE.
//
// Four pop-ups drew their own `role="dialog"`: the FX-rate confirmation, the
// full-screen section, the expanded dashboard widget and the identity panel.
// Each kept its own scrim, Escape and focus handling — or had none — and none
// was counted by `useOneSolid`, so a second solid button in one of them would
// never have been refused.
//
// The rule this holds: `role="dialog"` is written in TWO files, the drawer and
// the pop-up. The population is derived from the shipped source every run.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import i18n from '../../lib/i18n';
import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import Button from './Button';
import Dialog from './Dialog';
import ExpandableWidget from './ExpandableWidget';
import { oneSolidRefusal } from './oneSolid';
import FullScreenSection from '../../pages-v2/plan-grid/FullScreenSection';

const SRC = resolve(__dirname, '../..');
const THE_TWO = ['components/ui-v2/Dialog.tsx', 'components/ui-v2/SidePanel.tsx'];

function shippedTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) shippedTsx(full, out);
    else if (name.endsWith('.tsx') && !name.includes('.test.')) out.push(full);
  }
  return out;
}

/** Does this source DRAW a dialog — in code, not in a comment about one? */
const drawsADialog = (source: string): boolean => /role=["']dialog["']|aria-modal\b/.test(stripSourceComments(source, 'space'));

const wrap = (ui: React.ReactElement): React.ReactElement => <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>;

describe('PG-1 · the matcher, before any claim about the tree', () => {
  it('KNOWN-BAD and KNOWN-GOOD', () => {
    expect(drawsADialog('<div role="dialog" aria-label="x" />')).toBe(true);
    expect(drawsADialog("<div role='dialog' />")).toBe(true);
    expect(drawsADialog('<aside aria-modal="true" />')).toBe(true);
    expect(drawsADialog('// a SidePanel (`role="dialog" aria-modal="true"`) above')).toBe(false);
    expect(drawsADialog('<button aria-haspopup="dialog" />')).toBe(false);
    expect(drawsADialog('<Dialog open title="t" />')).toBe(false);
  });
});

describe('PG-1 · `role="dialog"` is written in two files — the drawer and the pop-up', () => {
  const files = shippedTsx(SRC).map((f) => relative(SRC, f).replace(/\\/g, '/'));

  it('⚠ POPULATION CONTROL — the scan reaches the pages, the widgets and the shell', () => {
    for (const f of [
      'pages-v2/BuyerSourcing.tsx',
      'pages-v2/plan-grid/FullScreenSection.tsx',
      'components/ui-v2/ExpandableWidget.tsx',
      'components/layout-v2/IdentityPanel.tsx',
      ...THE_TWO,
    ]) {
      expect(files, f).toContain(f);
    }
    expect(files.length).toBeGreaterThan(100);
  });

  it('nothing else draws one', () => {
    const drawers = files.filter((f) => drawsADialog(readFileSync(join(SRC, f), 'utf-8')));
    expect(drawers.sort()).toEqual([...THE_TWO].sort());
  });

  it('the four that did now mount the shared one', () => {
    for (const f of [
      'pages-v2/BuyerSourcing.tsx',
      'pages-v2/plan-grid/FullScreenSection.tsx',
      'components/ui-v2/ExpandableWidget.tsx',
      'components/layout-v2/IdentityPanel.tsx',
    ]) {
      expect(stripSourceComments(readFileSync(join(SRC, f), 'utf-8'), 'space'), f).toMatch(/<Dialog\b/);
    }
  });
});

describe('PG-1 · the shared pop-up’s full-screen form', () => {
  it('`fill` fills the screen and scrolls its body; a marker stands beside the title; the close is named', () => {
    render(
      wrap(
        <Dialog open fill onClose={() => {}} title="Open orders" titleAside={<span data-testid="aside">12</span>} closeLabel="Close full screen">
          <p>rows</p>
        </Dialog>,
      ),
    );
    const dialog = screen.getByRole('dialog', { name: 'Open orders' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.className).toMatch(/\bh-full\b/);
    expect(dialog.className).not.toMatch(/max-w-/);
    expect(dialog.parentElement).toHaveAttribute('data-fill');
    expect(dialog.querySelector('[data-dialog-body]')!.className).toMatch(/overflow-auto/);
    expect(screen.getByTestId('aside').closest('header')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Close full screen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close panel' })).toBeNull();
  });

  it('KNOWN-GOOD: without `fill` it is the centred pop-up it was, named "Close panel"', () => {
    render(wrap(<Dialog open onClose={() => {}} title="New role"><p>form</p></Dialog>));
    const dialog = screen.getByRole('dialog', { name: 'New role' });
    expect(dialog.className).toMatch(/max-w-2xl/);
    expect(dialog.className).not.toMatch(/\bh-full\b/);
    expect(dialog.parentElement).not.toHaveAttribute('data-fill');
    expect(screen.getByRole('button', { name: 'Close panel' })).toBeInTheDocument();
  });
});

describe('PG-1 · focus that falls out of a pop-up as it opens comes back to it', () => {
  /** What a re-mounting grid does: the control that was given focus leaves the DOM at once. */
  const Body: React.FC = () => {
    const [has, setHas] = React.useState(true);
    React.useEffect(() => {
      const id = setTimeout(() => setHas(false), 10);
      return () => clearTimeout(id);
    }, []);
    return (
      <div>
        {has && <button type="button">goes away</button>}
        <span>rows</span>
      </div>
    );
  };

  it('the control that was given focus unmounts → the panel takes focus, not the page', async () => {
    render(wrap(<Dialog open fill onClose={() => {}} title="Intake"><Body /></Dialog>));
    const dialog = screen.getByRole('dialog', { name: 'Intake' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'goes away' }));
    // the control really is gone — without the second look, focus would now be the page's
    await waitFor(() => expect(screen.queryByRole('button', { name: 'goes away' })).toBeNull());
    await new Promise((r) => setTimeout(r, 480));
    expect(document.activeElement).toBe(dialog);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('KNOWN-GOOD: focus that stayed inside is left where it is', async () => {
    render(
      wrap(
        <Dialog open onClose={() => {}} title="Form">
          <button type="button">first</button>
          <button type="button">second</button>
        </Dialog>,
      ),
    );
    const second = screen.getByRole('button', { name: 'second' });
    second.focus();
    await new Promise((r) => setTimeout(r, 480));
    expect(document.activeElement).toBe(second);
  });
});

describe('PG-1 · the pop-ups that moved are counted like every other', () => {
  it('a full-screen section is the shared dialog: one solid button, and a second is REFUSED', () => {
    const section = (extra: React.ReactNode) =>
      wrap(
        <FullScreenSection title="Bulk stock" normalHeight={200}>
          {({ expanded }) => (
            <div>
              {expanded ? 'open' : 'closed'}
              <Button variant="primary">Submit</Button>
              {extra}
            </div>
          )}
        </FullScreenSection>,
      );
    const { unmount } = render(section(null));
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    const dialog = screen.getByRole('dialog', { name: 'Bulk stock' });
    expect(dialog).toHaveAttribute('data-solid-scope');
    expect(dialog.parentElement).toHaveAttribute('data-fill');
    // the child is in ONE place: the dialog, not the page as well
    expect(screen.getAllByText('open')).toHaveLength(1);
    expect(screen.queryByText('closed')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByText('closed')).toHaveLength(1);
    unmount();

    render(section(<Button variant="primary">Submit and close</Button>));
    const spy = console.error;
    console.error = () => {};
    try {
      expect(() => fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))).toThrow(
        oneSolidRefusal('a dialog', ['Submit', 'Submit and close']),
      );
    } finally {
      console.error = spy;
    }
  });

  it('an expanded widget is the shared dialog, full-screen, with its count and marker beside the title', () => {
    render(
      wrap(
        <ExpandableWidget title="Invoices" count={7} capability="invoices" expandedRows={<div>the rows</div>} />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Expand Invoices' }));
    const dialog = screen.getByRole('dialog', { name: 'Invoices' });
    expect(dialog).toHaveAttribute('data-solid-scope');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement).toHaveAttribute('data-fill');
    expect(dialog.querySelector('header')!.textContent).toContain('7');
    expect(screen.getByText('the rows')).toBeInTheDocument();
    // focus went INTO it, and the close is named for what it does
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
