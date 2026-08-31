// ────────────────────────────────────────────────────────────────────────────
// PR 2 — THE SIX TOAST SITES: a THROWN refusal, in the reader's language.
//
// PR 1 closed the READ path (`ErrorState`, 31 pages). This closes the WRITE
// path, and the two together are one ruling: no completed batch may leave a
// screen where a read failure speaks Indonesian and a write refusal does not.
// `BuyerRequisitions` is exactly that screen — it renders `<ErrorState>` AND
// holds five of the six sites.
//
// ── ⚠️ THE POPULATION, AND WHY A GREP WOULD HAVE MISSED A THIRD OF IT ───────
// Derived by SHAPE — a `catch` binding whose `.message` reaches a user-visible
// sink — never by type name:
//   · `BuyerRequisitions` ×5  `e instanceof DataError ? e.message : t(…)`
//   · `SupplierForecasts` ×1  `e instanceof Error ? e.message : String(e)`
// **The supplier-side site tests the SUPERTYPE.** `grep "instanceof DataError"`
// returns it not at all, and it is the only member of the class on that persona.
//
// NOT converted, deliberately: `IntakeReview.tsx:87` and
// `plan-grid/IntakeAdjustDrawer.tsx:146`. Both read `e.code` and feed it to
// `applyPushResult({ ok: false, reason })` — the code is a STATE TOKEN driving
// control flow, never rendered as prose. Translating it would be this batch's
// own defect pointed backwards. Asserted below rather than left to a comment.
//
// ── ⚠️ EVERY ASSERTION WALKS TO THE STATE WHERE THE TOAST RENDERS ───────────
// Fifth instance of the lesson. A refusal is only reachable by pressing the real
// control on a real document, so each test opens the panel and presses it; and
// `<Toaster />` is mounted explicitly, because it lives in `AppRouter` and a
// page rendered alone has no toast viewport at all — an assertion that would
// fail for a reason having nothing to do with the toast.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderWithProviders, BUYER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { purchaseRequisitionStore } from '../services/data/mock/stores/purchaseRequisitionStore';
import { DataError, type DataErrorCode, type IDataService } from '../services/data/types';
import { DATA_ERROR_GLOSSARY } from '../lib/glossary';
import i18n from '../lib/i18n';
import Toaster from '../components/ui-v2/Toaster';
import BuyerRequisitions from './BuyerRequisitions';

const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
const PENDING_PR = 'PR-2026-00344';

/**
 * A service whose COMMAND dispatch throws — the shape a scope refusal really
 * has. Reads are untouched, so the page still renders its data branch and the
 * walk below reaches a real document and a real button.
 */
const throwingOn = (err: unknown): IDataService => ({
  ...mockDataService,
  commands: new Proxy(mockDataService.commands, {
    get(target, prop, receiver) {
      if (prop === 'dispatch') {
        return async () => {
          throw err;
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  }),
});

// The walk is LOCALE-AWARE, and that was measured rather than foreseen: the
// page heading is itself translated, so a hardcoded 'Purchase Requisitions'
// made every ID test fail before it ever reached a toast — a walk that never
// arrives at its subject, which is the exact lesson this file opens with.
const openPendingAndApprove = async () => {
  await screen.findByText(i18n.t('requisitions.header.title'));
  fireEvent.click(await screen.findByText(PENDING_PR));
  await screen.findByText(i18n.t('requisitions.panel.title', { number: PENDING_PR }));
  fireEvent.click(screen.getByTestId('pr-approve'));
};

const renderPage = (service: IDataService) =>
  renderWithProviders(
    <>
      <BuyerRequisitions />
      <Toaster />
    </>,
    { identity: PROCUREMENT, service },
  );

beforeEach(async () => {
  purchaseRequisitionStore.reset();
  await i18n.changeLanguage('en');
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PR2 · CONTROLS — the walk reaches its subject', () => {
  it('⚠️ FIRST — the fixture is decidable and the commit button is really there', async () => {
    // Every refusal assertion below is meaningless if the panel never opened or
    // the button was withheld: the toast would be absent and the test would
    // pass its `not.toBeInTheDocument` neighbours for the wrong reason.
    expect(purchaseRequisitionStore.get('pr-004')!.status).toBe('Pending Approval');
    renderPage(mockDataService);
    await screen.findByText('Purchase Requisitions');
    fireEvent.click(await screen.findByText(PENDING_PR));
    await screen.findByText(`PR ${PENDING_PR}`);
    expect(screen.getByTestId('pr-approve')).toBeInTheDocument();
  });

  it('CONTROL — the two locales differ on the glossary prose these tests match', async () => {
    // An ID assertion that passed because ID fell back to EN would be the defect
    // surviving the fix.
    expect(DATA_ERROR_GLOSSARY.SCOPE_DENIED.id).not.toBe(
      DATA_ERROR_GLOSSARY.SCOPE_DENIED.en,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PR2 · a thrown refusal is explained, in the reader’s language', () => {
  for (const lang of ['en', 'id'] as const) {
    it(`[${lang}] a recognised code renders the glossary's prose, not the wire message`, async () => {
      await i18n.changeLanguage(lang);
      renderPage(
        throwingOn(
          new DataError('SCOPE_DENIED', "purchaseRequisition 'pr-004' denied for scope"),
        ),
      );
      await openPendingAndApprove();

      expect(await screen.findByText(DATA_ERROR_GLOSSARY.SCOPE_DENIED[lang])).toBeInTheDocument();
      // What was on the screen before this batch, in both languages:
      expect(screen.queryByText(/denied for scope/)).not.toBeInTheDocument();
    });
  }

  it('⚠️ [id] and the English wire prose is GONE — the direction that matters', async () => {
    await i18n.changeLanguage('id');
    renderPage(
      throwingOn(new DataError('NOT_FOUND', "purchaseRequisition 'pr-004' not found")),
    );
    await openPendingAndApprove();
    expect(await screen.findByText(DATA_ERROR_GLOSSARY.NOT_FOUND.id)).toBeInTheDocument();
    expect(screen.queryByText(/not found/)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PR2 · ADDITIVITY — what this batch does NOT own is byte-identical', () => {
  // ⚠️ The property that made it safe to convert six sites at once, asserted
  // rather than argued — the same discipline PR 1 applied to `ErrorState`.

  it('a DataError with an UNRECOGNISED code still renders its raw message', async () => {
    // `DataErrorCode` is closed, so this cannot arise from today's producers;
    // the cast models the Phase-F1 widening (`httpDataService` maps HTTP/SAP
    // failures onto this code set and may add to it). If that lands before the
    // glossary catches up, the reader must get what they get today.
    await i18n.changeLanguage('id');
    renderPage(
      throwingOn(new DataError('GATEWAY_TIMEOUT' as DataErrorCode, 'upstream took too long')),
    );
    await openPendingAndApprove();
    expect(await screen.findByText('upstream took too long')).toBeInTheDocument();
  });

  it('a NON-DataError still renders the site’s own copy, not a laundered sentence', async () => {
    // The other `??` arm on the five buyer sites: `t('requisitions.toast.
    // actionFailed.desc')`. A plain Error is not a governed refusal and must not
    // be dressed as one.
    await i18n.changeLanguage('en');
    renderPage(throwingOn(new Error('a bare failure')));
    await openPendingAndApprove();
    expect(
      await screen.findByText(i18n.t('requisitions.toast.actionFailed.desc')),
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PR2 · the population — six converted, two deliberately NOT', () => {
  // ⚠️ **DERIVED FROM SOURCE, BOTH DIRECTIONS.** A count alone cannot say which
  // sites were converted, and the two exclusions are a RULING that a later batch
  // could undo by accident while every other test here stayed green.
  const read = (rel: string) =>
    readFileSync(path.resolve(__dirname, rel), 'utf-8');

  it('all five BuyerRequisitions sites route through the helper, and none renders `e.message` raw', () => {
    const src = read('BuyerRequisitions.tsx');
    // CONTROL — the matcher matches something, and a known-absent does not.
    expect(src).toContain('useDataErrorText');
    expect(src).not.toContain('useNonexistentErrorHook');

    expect(src.match(/describeThrown\(e, t\(/g)).toHaveLength(5);
    // The pre-batch shape must be gone from every one of them.
    expect(src).not.toMatch(/description: e instanceof DataError \? e\.message/);
  });

  it('the SupplierForecasts site keeps its SUPERTYPE test — it was not forced into the others’ shape', () => {
    const src = read('SupplierForecasts.tsx');
    expect(src).toContain('useDataErrorText');
    // A plain `Error` that is not a `DataError` must still render its message,
    // and a thrown non-`Error` must still reach `String(e)`.
    expect(src).toMatch(/\(e instanceof Error \? e\.message : String\(e\)\)/);
    expect(src).toMatch(/dataErrorText\(e instanceof DataError \? e\.code : undefined\)/);
  });

  it('⚠️ THE CONTROL-FLOW SITES ARE UNTOUCHED, and that is a ruling rather than an omission', () => {
    // `e.code` here is a STATE TOKEN fed to `applyPushResult`. Translating a
    // value that drives control flow is precisely the defect this batch exists
    // to remove, pointed backwards — a localized string would be compared
    // against an English constant and the comparison would silently stop
    // matching in Indonesian.
    for (const rel of ['IntakeReview.tsx', 'plan-grid/IntakeAdjustDrawer.tsx']) {
      const src = read(rel);
      expect(src, rel).toMatch(/const reasonCode = e instanceof DataError \? e\.code : 'ERROR';/);
      expect(src, rel).not.toContain('useDataErrorText');
      expect(src, rel).not.toContain('describeDataError');
    }
  });
});
