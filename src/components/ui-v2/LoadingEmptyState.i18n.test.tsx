// ────────────────────────────────────────────────────────────────────────────
// LoadingState + EmptyState — the two remaining honest states, in both
// languages.
//
// ⚠️ **EVERY ASSERTION HERE RENDERS THE COMPONENT WITH THE PROP OMITTED, WHICH
// IS THE ONLY WAY TO REACH THE DEFECT.** The strings this batch fixed were
// PARAMETER DEFAULTS. A spec that passes `title` — as 37 of 37 real call sites
// do for `breadcrumb`, and as every convenient test would — never evaluates the
// default and proves nothing about it. The omission IS the test.
//
// ⚠️ **AND NO EN ASSERTION IS EVIDENCE FOR THIS BATCH.** The EN arm reproduces
// the old copy byte for byte, deliberately, so that no existing spec had to be
// touched — which means every existing spec passes exactly as it did before,
// blind to whether the string came from a key or a hardcode. The ID arm is the
// half that could not pass before, and it is the whole point of this file.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

const LOADING_KEYS = [
  'loadingState.crumb',
  'loadingState.title',
  'loadingState.subtitle',
  'loadingState.message',
] as const;

/** The literals that stood at these sites before this batch. */
const RETIRED_EN = [
  'Loading…',
  'Fetching the latest data.',
  'One moment.',
  'When records appear, they will show up here.',
] as const;

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('page states · CONTROLS — the instrument can see', () => {
  it('CONTROL — the two locales differ on every key these surfaces render', async () => {
    // Without this, an ID assertion below could pass because ID fell back to EN
    // (the `fallbackLng` path) — an untranslated string that is invisible
    // precisely because it renders something.
    for (const key of [...LOADING_KEYS, 'emptyState.message']) {
      await i18n.changeLanguage('en');
      const en = i18n.t(key);
      await i18n.changeLanguage('id');
      const id = i18n.t(key);
      expect(en, `${key} EN`).not.toBe('');
      expect(en, `${key} EN must not be the key itself`).not.toBe(key);
      expect(id, `${key} arms must differ`).not.toBe(en);
    }
  });

  it('CONTROL — the EN arm is byte-identical to the literals it replaced', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('loadingState.title')).toBe('Loading…');
    expect(i18n.t('loadingState.subtitle')).toBe('Fetching the latest data.');
    expect(i18n.t('loadingState.message')).toBe('One moment.');
    expect(i18n.t('emptyState.message')).toBe(
      'When records appear, they will show up here.',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('LoadingState · the default path speaks both languages', () => {
  for (const lang of ['en', 'id'] as const) {
    it(`[${lang}] every default resolves from the ${lang} arm`, async () => {
      await i18n.changeLanguage(lang);
      // No props at all — every string on screen is a default.
      renderWithProviders(<LoadingState />);
      for (const key of LOADING_KEYS) {
        expect(await screen.findByText(i18n.t(key)), key).toBeInTheDocument();
      }
    });
  }

  it('⚠️ [id] and NO English literal survives', async () => {
    // The direction that catches a half-converted component: one default left
    // in the parameter list passes every positive assertion above, and fails
    // only here.
    await i18n.changeLanguage('id');
    renderWithProviders(<LoadingState />);
    for (const stale of ['LOADING', 'Loading…', 'Fetching the latest data.', 'One moment.']) {
      expect(screen.queryByText(stale), stale).toBeNull();
    }
  });

  it('a caller-supplied breadcrumb still wins over the default', async () => {
    // The 32 sites that pass one must keep passing it — the fix must not have
    // turned an override into a hardcode.
    await i18n.changeLanguage('id');
    renderWithProviders(<LoadingState breadcrumb={['PESANAN']} />);
    expect(await screen.findByText('PESANAN')).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('loadingState.crumb'))).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('EmptyState · the message default speaks both languages', () => {
  for (const lang of ['en', 'id'] as const) {
    it(`[${lang}] the omitted message resolves from the ${lang} arm`, async () => {
      await i18n.changeLanguage(lang);
      // Exactly the shape of the two real sites that omit it: breadcrumb,
      // title and subtitle supplied and already translated, message omitted.
      renderWithProviders(
        <EmptyState breadcrumb={['X']} title="Judul" subtitle="Subjudul" />,
      );
      expect(
        await screen.findByText(i18n.t('emptyState.message')),
      ).toBeInTheDocument();
    });
  }

  it('⚠️ [id] the English message does not survive', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(
      <EmptyState breadcrumb={['X']} title="Judul" subtitle="Subjudul" />,
    );
    expect(
      screen.queryByText('When records appear, they will show up here.'),
    ).toBeNull();
  });

  it('a caller-supplied message still wins over the default', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(
      <EmptyState breadcrumb={['X']} title="Judul" subtitle="Subjudul" message="Pesan khusus" />,
    );
    expect(await screen.findByText('Pesan khusus')).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('emptyState.message'))).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('page states · the retired literals are gone from the source', () => {
  it('CONTROL — every retired literal is a real string somebody could have read', () => {
    // A negative control that asserts nothing about itself is not a control:
    // if this list were empty, or held a typo, the ID assertions above would
    // still pass and prove less than they appear to.
    expect(RETIRED_EN.length).toBe(4);
    for (const s of RETIRED_EN) {
      expect(s.length, s).toBeGreaterThan(5);
      expect(s, s).toMatch(/[a-z]/);
    }
  });
});
