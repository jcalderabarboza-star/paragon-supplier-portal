import { render, screen, fireEvent } from '@testing-library/react';
import { FileCheck2 } from 'lucide-react';
import GuidedLesson, { type GuidedLessonStep } from './GuidedLesson';

// GuidedLesson is a READ-ONLY guidance primitive. These tests pin the two
// load-bearing guarantees adjudicated in I3.4:
//   1. It navigates Back/Next and closes with Done — there is NO submit path and
//      NO onComplete/mutation callback in its API (structurally it cannot look
//      like a live submission).
//   2. The honest boundary (disclaimer + authoritative source link) is visible on
//      EVERY step, not revealed only on a final screen.

const STEPS: GuidedLessonStep[] = [
  { id: 'one', icon: FileCheck2, title: 'First step', body: 'Body one' },
  { id: 'two', title: 'Second step', body: 'Body two' },
  { id: 'three', title: 'Third step', body: 'Body three' },
];

const LABELS = {
  back: 'Back',
  next: 'Next',
  done: 'Done',
  step: (c: number, t: number) => `Step ${c} of ${t}`,
};

const DISCLAIMER = 'This is a guide, not an official submission.';
const SOURCE = { label: 'Official BPJPH portal (halal.go.id)', href: 'https://halal.go.id' };

const renderLesson = (onDone = () => {}) =>
  render(
    <GuidedLesson
      steps={STEPS}
      labels={LABELS}
      disclaimer={DISCLAIMER}
      source={SOURCE}
      onDone={onDone}
    />,
  );

describe('GuidedLesson — read-only stepped guidance', () => {
  it('opens on the first step with a "Step 1 of N" indicator and Back disabled', () => {
    renderLesson();
    expect(screen.getByText('First step')).toBeInTheDocument();
    expect(screen.getAllByText('Step 1 of 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('Next advances through steps and Back returns', () => {
    renderLesson();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Second step')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('First step')).toBeInTheDocument();
  });

  it('the last step shows Done (not Next/Submit) and Done closes the lesson', () => {
    const onDone = vi.fn();
    renderLesson(onDone);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Third step')).toBeInTheDocument();
    // No submission affordance exists — only Done, which just closes.
    expect(screen.queryByRole('button', { name: /submit/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('the honest boundary (disclaimer + source) shows on every step', () => {
    renderLesson();
    const source = screen.getByRole('link', { name: /BPJPH portal/i });
    // Step 1
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    expect(source).toHaveAttribute('href', 'https://halal.go.id');
    expect(source).toHaveAttribute('target', '_blank');
    // …still present after navigating deeper
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /BPJPH portal/i })).toBeInTheDocument();
  });

  it('stepper dots let a reader jump to any step (read-only, nothing gated)', () => {
    renderLesson();
    // Dot for the third step is reachable directly (no validation gate).
    fireEvent.click(screen.getByRole('button', { name: 'Third step' }));
    expect(screen.getByText('Body three')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });
});
