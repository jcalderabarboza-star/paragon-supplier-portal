import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import {
  DRAWDOWN_PRESET_CASE_B,
  DRAWDOWN_PRESET_CASE_C,
} from '../../services/delivery';
import PolicyEditor from './PolicyEditor';

// ────────────────────────────────────────────────────────────────────────────
// PolicyEditor — the editor's FIRST spec file (CP-0 · W1 · 2f-d).
//
// 2f-FIND-05, and the most interesting result in the batch: this was not a
// misread, it was an EXPRESSIBILITY FAILURE. The input was `type="number"`, so
// an id-ID user typing "2,5" — THE ONLY correct way to write two-and-a-half in
// the platform's default locale — had the token eaten by the browser
// (`.value === ''`), landed on `pctInvalid`, and got a disabled Save with NO
// MESSAGE ANYWHERE, because `pctInvalid` fed only `canSave`.
//
// Same family as 4b-FIND-01 (this codebase cannot test its own default locale),
// but where every prior member produced a WRONG VALUE, this produced an
// IMPOSSIBLE INPUT: nothing was misread because nothing could be entered.
// ────────────────────────────────────────────────────────────────────────────

const noop = () => {};

const renderEditor = (active = DRAWDOWN_PRESET_CASE_B) =>
  renderWithProviders(
    <PolicyEditor
      active={active}
      contractDefault={DRAWDOWN_PRESET_CASE_B}
      deviation={false}
      pending={false}
      onSave={noop}
      onReset={noop}
      onCancel={noop}
    />,
  );

describe('PolicyEditor — the tolerance input is text, so the default locale can express a decimal', () => {
  it('THE LOCK — the tolerance input is not type="number" (Ruling 6.2)', () => {
    renderEditor();
    const pct = screen.getByLabelText('Tolerance');
    expect(pct).toHaveAttribute('type', 'text');
    expect(pct).toHaveAttribute('inputmode', 'decimal');
    // `min={0}` never bound the parse; a negative is NOT_NUMERIC, and
    // `setActivePolicy` refuses a negative fraction independently (2f-d).
    expect(pct).not.toHaveAttribute('min');
  });

  it('seeds the stored fraction as canonical percent digits (Case B 0.1 → "10")', () => {
    renderEditor();
    expect(screen.getByLabelText('Tolerance')).toHaveValue('10');
    expect(screen.queryByTestId('policy-pct-refusal')).not.toBeInTheDocument();
  });

  it('THE HEADLINE — "2,5" is ACCEPTED, where it used to vanish in silence', () => {
    // The capability gain. In jsdom the token survives either way, so what this
    // spec really proves is that the PARSER now accepts it and the surface
    // raises no refusal — the `type="text"` lock above is what stops the browser
    // eating it in a real id-ID session.
    renderEditor();
    const pct = screen.getByLabelText('Tolerance');
    fireEvent.change(pct, { target: { value: '2,5' } });
    expect(screen.queryByTestId('policy-pct-refusal')).not.toBeInTheDocument();
    expect(pct).toHaveAttribute('aria-invalid', 'false');
  });

  it('THE SILENCE, BROKEN — a refused tolerance now says why instead of only disabling Save', () => {
    // The defect in one spec: `pctInvalid` fed only `canSave`, so this element
    // did not exist. A buyer saw a dead button and no reason.
    renderEditor();
    fireEvent.change(screen.getByLabelText('Tolerance'), {
      target: { value: '1.500' },
    });
    const refusal = screen.getByTestId('policy-pct-refusal');
    expect(refusal).toHaveAttribute('role', 'alert');
    expect(refusal.textContent).toMatch(/can be read two ways/i);
  });

  it('a cleared tolerance refuses by name and points at the Unlimited alternative', () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText('Tolerance'), { target: { value: '' } });
    expect(screen.getByTestId('policy-pct-refusal').textContent).toMatch(
      /tick Unlimited/i,
    );
  });

  it('an unreadable tolerance refuses, naming "2,5" as a legal form', () => {
    // The copy carries the fix for the expressibility defect: it tells an
    // Indonesian buyer that their own decimal form is accepted.
    renderEditor();
    fireEvent.change(screen.getByLabelText('Tolerance'), {
      target: { value: 'ten percent' },
    });
    expect(screen.getByTestId('policy-pct-refusal').textContent).toMatch(/2,5/);
  });

  it('SAVE is blocked while the tolerance refuses, and unblocked when it reads', () => {
    // A reason is independently required (honesty guard 4), so it is supplied
    // here to isolate the tolerance gate.
    renderEditor();
    fireEvent.change(screen.getByLabelText('Reason (required)'), {
      target: { value: 'widen after amendment' },
    });
    const save = screen.getByRole('button', { name: 'Save tolerance' });

    fireEvent.change(screen.getByLabelText('Tolerance'), { target: { value: '1.500' } });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Tolerance'), { target: { value: '2,5' } });
    expect(save).not.toBeDisabled();
  });

  it('SAVE commits the FRACTION, not the percent — "2,5" → 0.025', () => {
    const saves: unknown[] = [];
    renderWithProviders(
      <PolicyEditor
        active={DRAWDOWN_PRESET_CASE_B}
        contractDefault={DRAWDOWN_PRESET_CASE_B}
        deviation={false}
        pending={false}
        onSave={(patch) => saves.push(patch)}
        onReset={noop}
        onCancel={noop}
      />,
    );
    fireEvent.change(screen.getByLabelText('Reason (required)'), {
      target: { value: 'tighten to 2.5%' },
    });
    fireEvent.change(screen.getByLabelText('Tolerance'), { target: { value: '2,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save tolerance' }));
    expect(saves).toHaveLength(1);
    expect(saves[0]).toMatchObject({ tolerancePct: 0.025, enforcement: 'flag' });
  });

  it('the preset labels carry the exact percent — no rounding, no float artefact', () => {
    // Was `${frac * 100}%`. 2f-d routes it through the same tidy the seed uses,
    // so a preset label, the seeded box and the governed chip cannot disagree.
    renderEditor();
    expect(screen.getByRole('button', { name: /Soft envelope/ })).toBeInTheDocument();
    expect(screen.getByText(/Contract default: 10% · Flag/)).toBeInTheDocument();
  });

  it('UNLIMITED (Case C) seeds blank and raises no refusal — null is a policy, not an absence', () => {
    renderEditor(DRAWDOWN_PRESET_CASE_C);
    expect(screen.getByLabelText('Tolerance')).toHaveValue('');
    // The blank is legal here because `unlimited` is ticked, so the tolerance is
    // not being asked for — a guard is only askable of a value that exists.
    expect(screen.queryByTestId('policy-pct-refusal')).not.toBeInTheDocument();
  });
});
