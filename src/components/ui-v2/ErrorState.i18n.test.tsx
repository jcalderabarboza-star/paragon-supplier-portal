// ────────────────────────────────────────────────────────────────────────────
// ErrorState — the read path's failure surface, in both languages.
//
// ⚠️ **WHY THE 28 EXISTING SPECS ARE NOT EVIDENCE FOR THIS BATCH, AND WHY THEY
// WERE STILL NOT TOUCHED.** 28 files assert `'Unable to load this page'` as a
// literal. Measured: after this change **all 28 still pass, untouched**, because
// the EN arm reproduces the old copy byte for byte and i18n defaults to `en`.
// That is the right outcome — a batch should not rewrite specs it does not own
// — but it makes those specs **blind to the thing that changed**: a literal and
// a resolved key are indistinguishable to them. They are liveness probes ("the
// page reached its error state"), and they remain exactly that.
//
// This file is the evidence. It asserts the half no existing spec can reach:
// the **ID arm**, the **glossary route**, and — the property that made it safe
// to apply this to 31 pages at once — the **null-exit fallbacks**, which must
// render byte-identically to before.
//
// ⚠️ **EVERY ASSERTION WALKS TO THE STATE, and two of them walk a REAL PAGE
// there.** The lesson has now cost five batches: a test that passes without
// reaching its subject proves nothing. Mounting `<ErrorState>` directly does
// reach it — the component IS the subject — but it cannot show that the 31
// consumers actually route a thrown read failure into it, so the last describe
// drives a buyer page and a supplier page into their error branch through the
// real chaos service and reads the result.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import { mockDataService } from '../../services/data/mock/mockDataService';
import { withChaos } from '../../services/data/mock/withChaos';
import { DataError, type DataErrorCode } from '../../services/data/types';
import { DATA_ERROR_GLOSSARY } from '../../lib/glossary';
import i18n from '../../lib/i18n';
import ErrorState from './ErrorState';
import BuyerOrders from '../../pages-v2/BuyerOrders';
import SupplierOrders from '../../pages-v2/SupplierOrders';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });

/** Every member of the closed union, derived rather than listed. */
const CODES: readonly DataErrorCode[] = [
  'NOT_FOUND',
  'SCOPE_DENIED',
  'UPSTREAM',
  'CHAOS',
  'UNKNOWN',
];

const detail = () => screen.getByTestId('error-state-detail').textContent ?? '';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ErrorState · CONTROLS — the instrument can see', () => {
  it('CONTROL — the two locales differ on every key this surface renders', async () => {
    // Without this, an ID assertion below could pass because ID fell back to EN
    // (the `fallbackLng` path), which is the invisible-untranslated-string shape
    // `fragments.test.ts` exists to prevent — asserted here for THIS fragment at
    // the point of use, not only in the key-set guard.
    for (const key of [
      'errorState.title',
      'errorState.subtitle',
      'errorState.heading',
      'errorState.retry',
      'errorState.unexpected',
    ]) {
      await i18n.changeLanguage('en');
      const en = i18n.t(key);
      await i18n.changeLanguage('id');
      const id = i18n.t(key);
      expect(en, `${key} EN`).not.toBe('');
      expect(id, `${key} ID`).not.toBe(en);
    }
  });

  it('CONTROL — the glossary owns every member of the closed DataErrorCode union, both arms', () => {
    // The whole route depends on this. If a code were missing an arm, the
    // surface would silently render an English sentence to an ID reader — the
    // exact defect, surviving the fix.
    for (const code of CODES) {
      const entry = (DATA_ERROR_GLOSSARY as Record<string, { en: string; id: string }>)[code];
      expect(entry, code).toBeDefined();
      expect(entry.en.length, `${code}.en`).toBeGreaterThan(0);
      expect(entry.id.length, `${code}.id`).toBeGreaterThan(0);
      expect(entry.id, `${code} arms must differ`).not.toBe(entry.en);
    }
    // …and the known-FALSE, same instrument, same run.
    expect(
      (DATA_ERROR_GLOSSARY as Record<string, unknown>)['NOT_A_REAL_CODE'],
    ).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ErrorState · the chrome speaks both languages', () => {
  for (const lang of ['en', 'id'] as const) {
    it(`[${lang}] every string on the surface comes from the ${lang} arm`, async () => {
      await i18n.changeLanguage(lang);
      renderWithProviders(
        <ErrorState error={new Error('boom')} breadcrumb={['X']} onRetry={() => {}} />,
      );
      for (const key of [
        'errorState.title',
        'errorState.subtitle',
        'errorState.heading',
        'errorState.retry',
      ]) {
        expect(await screen.findByText(i18n.t(key)), key).toBeInTheDocument();
      }
    });
  }

  it('⚠️ [id] and NO English chrome literal survives', async () => {
    // The direction that catches a half-converted component: one key left as a
    // hardcode would pass every positive assertion above and fail only here.
    await i18n.changeLanguage('id');
    renderWithProviders(
      <ErrorState error={new Error('boom')} breadcrumb={['X']} onRetry={() => {}} />,
    );
    for (const stale of [
      'Something went wrong',
      'The data could not be loaded.',
      'Unable to load this page',
      'Try again',
    ]) {
      expect(screen.queryByText(stale), stale).not.toBeInTheDocument();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ErrorState · a DataError is explained, not quoted', () => {
  for (const lang of ['en', 'id'] as const) {
    it(`[${lang}] a recognised code renders the glossary's prose`, async () => {
      await i18n.changeLanguage(lang);
      renderWithProviders(
        <ErrorState
          error={new DataError('SCOPE_DENIED', "purchaseRequisition 'pr-014' denied for scope")}
          breadcrumb={['X']}
        />,
      );
      expect(detail()).toBe(DATA_ERROR_GLOSSARY.SCOPE_DENIED[lang]);
    });

    it(`[${lang}] …and the raw wire value is GONE from the surface`, async () => {
      // What was on the screen before: "SCOPE_DENIED: purchaseRequisition
      // 'pr-014' denied for scope". A code is a wire value, not a sentence.
      await i18n.changeLanguage(lang);
      renderWithProviders(
        <ErrorState
          error={new DataError('SCOPE_DENIED', "purchaseRequisition 'pr-014' denied for scope")}
          breadcrumb={['X']}
        />,
      );
      expect(document.body.textContent).not.toContain('SCOPE_DENIED');
      expect(document.body.textContent).not.toContain("pr-014");
    });
  }

  it('every member of the union is explained, and none is quoted', async () => {
    // One code proves the wiring; the union proves there is no member that
    // falls through — which is what "the glossary owns all five" buys.
    await i18n.changeLanguage('id');
    for (const code of CODES) {
      const { unmount } = renderWithProviders(
        <ErrorState error={new DataError(code, 'raw wire prose')} breadcrumb={['X']} />,
      );
      expect(detail(), code).toBe(DATA_ERROR_GLOSSARY[code].id);
      expect(detail(), code).not.toContain(code);
      unmount();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ErrorState · ADDITIVITY — what this batch does NOT own is byte-identical', () => {
  // ⚠️ **THIS IS THE PROPERTY THAT MADE IT SAFE TO CHANGE 31 PAGES AT ONCE**, so
  // it is asserted rather than argued. `describeDataError` has two `null` exits,
  // and `describe()` reads `… ?? <exactly what it returned before>`.

  it('a DataError with an UNRECOGNISED code still renders `code: message`', async () => {
    // `DataErrorCode` is closed, so this cannot arise from today's producers —
    // the cast models the Phase-F1 widening, where `httpDataService` maps HTTP
    // and SAP failures onto this same code set and may add to it. If that lands
    // and the glossary has not caught up, the reader must get what they get
    // today rather than nothing.
    await i18n.changeLanguage('id');
    renderWithProviders(
      <ErrorState
        error={new DataError('GATEWAY_TIMEOUT' as DataErrorCode, 'upstream took too long')}
        breadcrumb={['X']}
      />,
    );
    expect(detail()).toBe('GATEWAY_TIMEOUT: upstream took too long');
  });

  it('a plain Error still renders its message, untranslated and unlaundered', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<ErrorState error={new Error('boom from somewhere')} breadcrumb={['X']} />);
    expect(detail()).toBe('boom from somewhere');
  });

  it('the two fallbacks render the SAME text in both locales — they are not translated', async () => {
    for (const lang of ['en', 'id'] as const) {
      await i18n.changeLanguage(lang);
      const a = renderWithProviders(
        <ErrorState error={new Error('boom from somewhere')} breadcrumb={['X']} />,
      );
      expect(detail(), lang).toBe('boom from somewhere');
      a.unmount();
    }
  });

  it('a thrown NON-Error gets the stated sentence, and THAT one is translated', async () => {
    // The one fallback that legitimately changes: it was a hardcoded English
    // literal and is now a key, which is this batch's job rather than a
    // violation of additivity.
    await i18n.changeLanguage('id');
    const a = renderWithProviders(<ErrorState error={'a bare string'} breadcrumb={['X']} />);
    expect(detail()).toBe(i18n.t('errorState.unexpected'));
    expect(detail()).not.toBe('An unexpected error occurred.');
    a.unmount();

    await i18n.changeLanguage('en');
    renderWithProviders(<ErrorState error={'a bare string'} breadcrumb={['X']} />);
    expect(detail()).toBe('An unexpected error occurred.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ErrorState · the 31 consumers actually reach it — a real page, both personas', () => {
  // ⚠️ **THE WALK.** Everything above mounts the component directly, which is a
  // fair test of the component and NO test of the wiring. These two drive a real
  // page into its error branch through the chaos service — the same route
  // `BuyerOrders.test.tsx` uses — so the assertion is about what a person sees
  // after a read fails, not about a component in isolation.
  it('[id] a BUYER page that fails to read explains it in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerOrders />, { service: alwaysFails });
    expect(await screen.findByText(i18n.t('errorState.heading'))).toBeInTheDocument();
    // `withChaos` throws `DataError('CHAOS', …)` — a code the glossary owns.
    expect(await screen.findByTestId('error-state-detail')).toHaveTextContent(
      DATA_ERROR_GLOSSARY.CHAOS.id,
    );
    expect(document.body.textContent).not.toContain('CHAOS');
    expect(screen.queryByText('Unable to load this page')).not.toBeInTheDocument();
  });

  it('[id] a SUPPLIER page that fails to read explains it in Indonesian', async () => {
    await i18n.changeLanguage('id');
    // The supplier seat is required: without a `supplierId` the page renders
    // `NoSupplierIdentity` and never reaches its error branch at all — a test
    // that would have passed on nothing. Measured, not anticipated.
    renderWithProviders(<SupplierOrders />, { service: alwaysFails, identity: SUPPLIER });
    expect(await screen.findByText(i18n.t('errorState.heading'))).toBeInTheDocument();
    expect(await screen.findByTestId('error-state-detail')).toHaveTextContent(
      DATA_ERROR_GLOSSARY.CHAOS.id,
    );
    expect(document.body.textContent).not.toContain('CHAOS');
  });

  it('[en] the same buyer page keeps the EN copy the 28 liveness specs assert', async () => {
    // The paired control on the same instrument: this is the literal those 28
    // files match, so if it moved they would go red and this batch would have
    // silently taken on 28 files it does not own.
    await i18n.changeLanguage('en');
    renderWithProviders(<BuyerOrders />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });
});
