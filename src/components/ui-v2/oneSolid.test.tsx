// UI-1e · a drawer, a dialog and a wizard have ONE solid button — their final commit.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n';
import Button from './Button';
import SidePanel from './SidePanel';
import Dialog from './Dialog';
import Wizard from './Wizard';
import { oneSolidRefusal, solidButtonsOf } from './oneSolid';

const wrap = (ui: React.ReactElement): React.ReactElement => <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>;

/** React logs what an effect throws; the spec asserts the throw, so the log is noise. */
const quiet = (): void => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
};
afterEach(() => vi.restoreAllMocks());

describe('Button marks what a container counts', () => {
  it('a solid button carries the mark, and nothing else does', () => {
    render(
      <>
        <Button variant="primary">Save</Button>
        <Button variant="outline">Edit</Button>
        <Button variant="secondary">Close</Button>
        <Button variant="primary" tone="critical">Cancel event</Button>
        <Button>Default</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('data-solid');
    for (const name of ['Edit', 'Close', 'Cancel event', 'Default']) {
      expect(screen.getByRole('button', { name })).not.toHaveAttribute('data-solid');
    }
  });
});

describe('a drawer', () => {
  it('passes with its final commit solid, in the footer or in the body', () => {
    render(
      wrap(
        <SidePanel open onClose={() => {}} title="Order" footerActions={<><Button variant="secondary">Close</Button><Button variant="primary">Confirm</Button></>}>
          <Button variant="outline">Add a line</Button>
        </SidePanel>,
      ),
    );
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveAttribute('data-solid-scope');
    expect(solidButtonsOf(panel).map((b) => b.textContent)).toEqual(['Confirm']);
  });

  it('passes with none — a drawer that only reads has no commit', () => {
    render(wrap(<SidePanel open onClose={() => {}} title="Order"><Button variant="secondary">Close</Button></SidePanel>));
    expect(solidButtonsOf(screen.getByRole('dialog'))).toEqual([]);
  });

  it('⚠️ REFUSES a second solid button, naming both', () => {
    quiet();
    expect(() =>
      render(
        wrap(
          <SidePanel open onClose={() => {}} title="Order" footerActions={<Button variant="primary">Approve</Button>}>
            <Button variant="primary">Save draft</Button>
          </SidePanel>,
        ),
      ),
    ).toThrow(oneSolidRefusal('a drawer', ['Save draft', 'Approve']));
  });

  it('a destructive act beside the commit is not a second solid', () => {
    render(
      wrap(
        <SidePanel open onClose={() => {}} title="Event" footerActions={<><Button variant="primary" tone="critical">Cancel event</Button><Button variant="primary">Award</Button></>}>
          x
        </SidePanel>,
      ),
    );
    expect(solidButtonsOf(screen.getByRole('dialog')).map((b) => b.textContent)).toEqual(['Award']);
  });
});

describe('a dialog', () => {
  it('passes with one, and REFUSES two', () => {
    const { unmount } = render(wrap(<Dialog open onClose={() => {}} title="New role"><Button variant="primary">Create</Button></Dialog>));
    expect(solidButtonsOf(screen.getByRole('dialog')).map((b) => b.textContent)).toEqual(['Create']);
    unmount();
    quiet();
    expect(() =>
      render(wrap(<Dialog open onClose={() => {}} title="New role"><Button variant="primary">Create</Button><Button variant="primary">Create and open</Button></Dialog>)),
    ).toThrow(oneSolidRefusal('a dialog', ['Create', 'Create and open']));
  });

  it('a container opened inside another counts its own, not its host\'s', () => {
    render(
      wrap(
        <SidePanel open onClose={() => {}} title="Order" footerActions={<Button variant="primary">Confirm</Button>}>
          <Dialog open onClose={() => {}} title="Reason"><Button variant="primary">Record</Button></Dialog>
        </SidePanel>,
      ),
    );
    const [drawer, dialog] = screen.getAllByRole('dialog');
    expect(solidButtonsOf(drawer).map((b) => b.textContent)).toEqual(['Confirm']);
    expect(solidButtonsOf(dialog).map((b) => b.textContent)).toEqual(['Record']);
  });
});

describe('a wizard', () => {
  const steps = [
    { id: 'a', title: 'One', content: <p>one</p> },
    { id: 'b', title: 'Two', content: <p>two</p> },
  ];
  const wizard = (currentStep: number, content?: React.ReactNode): React.ReactElement =>
    wrap(
      <Wizard
        steps={content ? [steps[0], { ...steps[1], content }] : steps}
        currentStep={currentStep}
        onStepChange={() => {}}
        onCancel={() => {}}
        onComplete={() => {}}
        completeLabel="Post receipt"
      />,
    );

  it('"Next" goes somewhere and commits nothing — it is an outline', () => {
    render(wizard(0));
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).not.toHaveAttribute('data-solid');
    expect(next).toHaveClass('bg-transparent');
  });

  it('the last step\'s button is the final commit, and it is solid', () => {
    render(wizard(1));
    const done = screen.getByRole('button', { name: 'Post receipt' });
    expect(done).toHaveAttribute('data-solid');
    expect(done).toHaveClass('bg-action', 'text-white');
  });

  it('⚠️ REFUSES a step that brings a solid button of its own to the last step', () => {
    quiet();
    expect(() => render(wizard(1, <Button variant="primary">Save and exit</Button>))).toThrow(
      oneSolidRefusal('a wizard', ['Save and exit', 'Post receipt']),
    );
  });
});
