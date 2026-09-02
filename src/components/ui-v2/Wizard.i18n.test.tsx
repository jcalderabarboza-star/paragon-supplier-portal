// ────────────────────────────────────────────────────────────────────────────
// Wizard — the shared multi-step footer, in both languages.
//
// ⚠️ **THIS DEFECT WAS OUTSIDE EVERY INSTRUMENT THIS TREE HAS, AND THAT IS THE
// FINDING.** `Cancel` / `Back` / `Next` sat as English literals INSIDE the
// component body. The module-scope-literal gate deliberately does not look
// there — `t()` reaches a component body, so a literal there is not its class —
// and an EN-only spec passes on an English literal by construction. So the
// footer shipped English on an Indonesian page through FIVE consumers with
// every gate green. Nothing was broken; nothing was watching.
//
// ⚠️ **NO EN ASSERTION BELOW IS EVIDENCE FOR THIS BATCH.** The EN arm reproduces
// the old copy byte for byte, deliberately, so no existing spec had to change —
// which means every existing spec passes exactly as it did before, blind to
// whether the string came from a key or a hardcode. The ID arm is the half that
// could not pass before.
//
// ⚠️ **AND `Back` IS RENDERED BUT DISABLED ON STEP 0, NOT ABSENT.** A walk that
// only ever sees the first step reads a disabled button and can still assert its
// text; what it cannot see is `Next` becoming the completion label on the last
// step. Both positions are exercised here.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import Wizard, { type WizardStep } from './Wizard';

const KEYS = ['wizard.cancel', 'wizard.back', 'wizard.next'] as const;

/** The literals that stood at these sites before this batch. */
const RETIRED_EN: Record<(typeof KEYS)[number], string> = {
  'wizard.cancel': 'Cancel',
  'wizard.back': 'Back',
  'wizard.next': 'Next',
};

const STEPS: WizardStep[] = [
  { id: 'one', title: 'Step one', content: <p>first</p> },
  { id: 'two', title: 'Step two', content: <p>second</p> },
];

const renderAt = (currentStep: number) =>
  renderWithProviders(
    <Wizard
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={vi.fn()}
      onCancel={vi.fn()}
      onComplete={vi.fn()}
      completeLabel="COMPLETE-SENTINEL"
    />,
  );

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Wizard footer · CONTROLS — nothing below means anything without these', () => {
  it('⚠️ CONTROL — the two locales DIVERGE on every key this footer renders', async () => {
    // A probe aimed at a term spelled identically in both locales produces an
    // assertion that passes whether or not the fix exists. That has already
    // shipped once in this register, so it is asserted here rather than assumed.
    for (const key of KEYS) {
      await i18n.changeLanguage('en');
      const en = i18n.t(key);
      await i18n.changeLanguage('id');
      const id = i18n.t(key);
      expect(en, `${key} EN must not be the key itself`).not.toBe(key);
      expect(id, `${key} ID must not be the key itself`).not.toBe(key);
      expect(id, `${key}: ID is spelled identically to EN — this probe cannot fail`).not.toBe(en);
    }
  });

  it('CONTROL — the EN arm reproduces the retired literal byte for byte', async () => {
    await i18n.changeLanguage('en');
    for (const key of KEYS) expect(i18n.t(key)).toBe(RETIRED_EN[key]);
  });

  it('CONTROL — the ID copy is the vocabulary the tree already uses', async () => {
    // Derived from the existing fragments, not coined here: a shared component
    // that invents its own word for Cancel teaches the reader that its buttons
    // are a different kind of button.
    await i18n.changeLanguage('id');
    expect(i18n.t('wizard.cancel')).toBe('Batal');
    expect(i18n.t('wizard.back')).toBe('Kembali');
    expect(i18n.t('wizard.next')).toBe('Berikutnya');
  });
});

describe('Wizard footer · the chrome renders in the reader’s language', () => {
  it('EN — the three footer controls (no evidence for this batch; the control below is)', async () => {
    await i18n.changeLanguage('en');
    renderAt(0);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('⚠️ ID — the half that could not pass before this batch', async () => {
    await i18n.changeLanguage('id');
    renderAt(0);
    expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kembali' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeInTheDocument();
    // and the English is GONE, not merely joined — a fallback would render both.
    for (const gone of Object.values(RETIRED_EN)) {
      expect(screen.queryByRole('button', { name: gone })).toBeNull();
    }
  });

  it('Back is RENDERED-BUT-DISABLED on step 0, and enabled after it', async () => {
    await i18n.changeLanguage('id');
    const { unmount } = renderAt(0);
    expect(screen.getByRole('button', { name: 'Kembali' })).toBeDisabled();
    unmount();
    renderAt(1);
    expect(screen.getByRole('button', { name: 'Kembali' })).toBeEnabled();
  });

  it('on the LAST step the primary becomes completeLabel — the caller’s string, not ours', async () => {
    await i18n.changeLanguage('id');
    renderAt(STEPS.length - 1);
    expect(screen.getByRole('button', { name: 'COMPLETE-SENTINEL' })).toBeInTheDocument();
    // `Next` must be gone: it is the non-last label, and a footer showing both
    // would mean the last-step branch never fired.
    expect(screen.queryByRole('button', { name: 'Berikutnya' })).toBeNull();
  });
});
