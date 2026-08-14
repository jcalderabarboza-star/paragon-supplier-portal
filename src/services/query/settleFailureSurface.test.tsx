// ─────────────────────────────────────────────────────────────────────────────
// §43 · WHAT A USER SEES WHEN A SETTLE FAILS — rendered, in both locales.
//
// Before this batch the answer was NOTHING: `commandHooks.ts` held zero
// `onError` handlers, so a rejected settle was an unhandled mutation rejection —
// no toast, no banner, no i18n key — and the document sat in 'Posting to SAP' or
// 'Releasing Payment' with nothing ever saying why.
//
// ⚠️ **THE KNOWN-GOOD CONTROL RUNS FIRST AND IT IS NOT CEREMONY.** A probe that
// renders no toast because the toast system is unmounted looks exactly like a
// probe that renders no toast because the handler never fired. So the first test
// proves a toast CAN reach the screen through this harness before any absence
// below is believed.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { mockDataService } from '../data/mock/mockDataService';
import { DataError } from '../data/types';
import type { IDataService } from '../data/types';
import i18n from '../../lib/i18n';
import Toaster from '../../components/ui-v2/Toaster';
import { useGoodsReceiptSettle, useInvoiceSettlePayment } from './commandHooks';
import { useToast } from '../../hooks/useToast';

const CORRELATION = 'cmd_000x';

function failingService(err: unknown): IDataService {
  return {
    ...mockDataService,
    commands: {
      ...mockDataService.commands,
      settle: () => Promise.reject(err),
    },
  } as IDataService;
}

const GrProbe: React.FC = () => {
  const m = useGoodsReceiptSettle();
  return (
    <button type="button" onClick={() => m.mutate({ correlationId: CORRELATION })}>
      settle-gr
    </button>
  );
};

const InvoiceProbe: React.FC = () => {
  const m = useInvoiceSettlePayment();
  return (
    <button type="button" onClick={() => m.mutate({ correlationId: CORRELATION })}>
      settle-invoice
    </button>
  );
};

const ToastProbe: React.FC = () => {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title: 'control-toast' })}>
      raise
    </button>
  );
};

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('§43 — the settle failure surface', () => {
  it('KNOWN-GOOD FIRST: a toast reaches the screen through this harness', async () => {
    renderWithProviders(
      <>
        <ToastProbe />
        <Toaster />
      </>,
    );
    fireEvent.click(screen.getByText('raise'));
    expect(await screen.findByText('control-toast')).toBeTruthy();
  });

  it('surfaces a TRANSPORT fault on the GR path, with the retry named as safe', async () => {
    renderWithProviders(
      <>
        <GrProbe />
        <Toaster />
      </>,
      { service: failingService(new DataError('UPSTREAM', 'gateway said nothing')) },
    );
    fireEvent.click(screen.getByText('settle-gr'));

    expect(await screen.findByText('Settlement did not complete')).toBeTruthy();
    const body = await screen.findByText(/The settling system did not answer/);
    // The three things every branch must say: what happened, what state the
    // document is in, and whether asking again helps.
    expect(body.textContent).toContain('still awaiting settlement');
    expect(body.textContent).toContain('settling twice is safe');
    // And the reference, so an UNGOVERNED report has something to carry.
    expect(body.textContent).toContain(CORRELATION);
  });

  it('surfaces the SAME classified string on the invoice path — one vocabulary, two surfaces', async () => {
    renderWithProviders(
      <>
        <InvoiceProbe />
        <Toaster />
      </>,
      { service: failingService(new DataError('UPSTREAM', 'x')) },
    );
    fireEvent.click(screen.getByText('settle-invoice'));
    expect(await screen.findByText(/The settling system did not answer/)).toBeTruthy();
  });

  it('an UNGOVERNED fault does NOT offer a retry — the ruling, rendered', async () => {
    renderWithProviders(
      <>
        <GrProbe />
        <Toaster />
      </>,
      // The shape `registry.ts:25` raises: a bare Error, permanent, untyped.
      { service: failingService(new Error("flow 'x' is already registered")) },
    );
    fireEvent.click(screen.getByText('settle-gr'));

    const body = await screen.findByText(/unclassified fault/);
    expect(body.textContent).toContain('retrying will not clear it');
    expect(body.textContent).toContain('Report the reference');
    // ⚠️ A permanent misconfiguration must not read as a retryable blip.
    expect(body.textContent).not.toContain('twice is safe');
  });

  it('a REFUSED fault says the answer will not change', async () => {
    renderWithProviders(
      <>
        <GrProbe />
        <Toaster />
      </>,
      { service: failingService(new DataError('NOT_FOUND', 'gone')) },
    );
    fireEvent.click(screen.getByText('settle-gr'));
    const body = await screen.findByText(/A governing rule refused the settlement/);
    expect(body.textContent).toContain('the same refusal');
  });

  it('renders in Indonesian — authored from birth, not back-filled', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(
      <>
        <GrProbe />
        <Toaster />
      </>,
      { service: failingService(new DataError('UPSTREAM', 'x')) },
    );
    fireEvent.click(screen.getByText('settle-gr'));

    expect(await screen.findByText('Penyelesaian tidak tuntas')).toBeTruthy();
    const body = await screen.findByText(/Sistem penyelesai tidak menjawab/);
    expect(body.textContent).toContain('masih menunggu penyelesaian');
    expect(body.textContent).toContain('menyelesaikan dua kali tetap aman');
    expect(body.textContent).toContain(`Referensi ${CORRELATION}`);
  });

  it('the ID string is a translation, not the EN one echoed', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(
      <>
        <GrProbe />
        <Toaster />
      </>,
      { service: failingService(new Error('bare')) },
    );
    fireEvent.click(screen.getByText('settle-gr'));
    const body = await screen.findByText(/tidak terklasifikasi/);
    expect(body.textContent).not.toContain('unclassified');
  });
});
