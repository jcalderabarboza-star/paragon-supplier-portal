// ────────────────────────────────────────────────────────────────────────────
// ErrorState — the full-page read-failure surface, shared by 31 pages.
//
// ⚠️ **WHAT WAS ON THE SCREEN.** `describe()` returned
// `` `${error.code}: ${error.message}` `` for a `DataError`, so a reader whose
// request was refused saw a dispatcher constant and an English sentence:
// *"SCOPE_DENIED: purchaseRequisition 'pr-014' denied for scope"*. Every other
// string on the surface was a hardcoded English literal — this component
// carried `useTranslation` ZERO times while being rendered by a third of the
// portal, on both personas.
//
// ⚠️ **AND IT IS THE DOOR NO CATCH-BASED CENSUS REACHES.** The instrument that
// found the sibling defect (a `catch` binding whose `.message` flows to a toast)
// is STRUCTURALLY BLIND here: this takes `error` as a PROP and sits inside no
// `catch`, so a matcher of that shape returns zero for it — and a clean zero
// over a wrong population is rule 1's exact warning. It was found by asking what
// RENDERS an error rather than what CATCHES one.
//
// ── ⚠️ THE NULL-EXIT CONTRACT IS WHAT MAKES THE TRANSLATION SAFE ────────────
// `describeDataError` returns `null` for a code the glossary does not own, and
// `describe()` reads `… ?? <exactly what it returned before>`. So the two
// branches that this batch does NOT own are unchanged, byte for byte:
//   · a `DataError` with an unrecognised code → `` `${code}: ${message}` ``
//   · a plain `Error`                         → `error.message`
// Both are asserted in `ErrorState.i18n.test.tsx` rather than assumed, because
// "it is additive" is the claim that would let this land on 31 pages unchecked.
//
// **`DataErrorCode` is a closed five and the glossary defines all five in both
// arms** (derived, not recalled), so the first fallback is unreachable through
// today's producers — it exists for `httpDataService` (Phase F1), which maps
// HTTP/SAP failures onto this same code set and could widen it.
//
// ── WHY NO PROP CHANGED ─────────────────────────────────────────────────────
// `title` was already `title?: string` with an English DEFAULT; the default now
// resolves through `t()` instead of being a literal. Derived across all 31 render
// sites: every one passes `error` + `breadcrumb` + `onRetry` and NOT ONE passes
// `title`, so the signature is untouched and no consumer moves.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import AppShellV2 from '../layout-v2/AppShellV2';
import PageHeader from './PageHeader';
import Button from './Button';
import { DataError } from '../../services/data/types';
import { describeDataError } from '../../services/transitions/refusalMessage';

interface ErrorStateProps {
  error?: unknown;
  breadcrumb?: string[];
  title?: string;
  onRetry?: () => void;
}

/**
 * What the reader is told went wrong, in their own language where the platform
 * has words for it.
 *
 * The three branches are deliberately ordered widest-knowledge-first, and only
 * the first and last changed:
 *   1. a `DataError` whose code the glossary owns → the glossary's prose, and
 *      **the raw code is not shown** — `SCOPE_DENIED` is a wire value, not a
 *      sentence, and prefixing prose with it taught readers to quote constants;
 *   2. any other `Error` → `error.message`, UNCHANGED (it may be anything at
 *      all, and laundering a foreign string into this vocabulary would make it
 *      read as governed when it is not — `describeRefusal`'s own argument);
 *   3. a thrown non-`Error` → a stated sentence, now translated.
 */
function describe(
  error: unknown,
  language: string | undefined,
  t: (key: string) => string,
): string {
  if (error instanceof DataError) {
    return describeDataError(error.code, language) ?? `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return t('errorState.unexpected');
}

// Full-page error state. Mirrors NoSupplierIdentity's shell + centered layout.
const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  // Not localized, and it is unreachable rather than overlooked: all 31 render
  // sites pass `breadcrumb` (derived from the `<ErrorState` sites). A key with
  // no reader is the stored-field shape, so this stays a literal.
  breadcrumb = ['ERROR'],
  title,
  onRetry,
}) => {
  const { t, i18n } = useTranslation();
  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={breadcrumb}
        title={title ?? t('errorState.title')}
        subtitle={t('errorState.subtitle')}
      />
      <div className="py-16 px-6 flex flex-col items-center text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-danger" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('errorState.heading')}
        </div>
        <div
          className="text-sm text-text-tertiary max-w-md mb-4"
          data-testid="error-state-detail"
        >
          {describe(error, i18n.language, t)}
        </div>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {t('errorState.retry')}
          </Button>
        )}
      </div>
    </AppShellV2>
  );
};

export default ErrorState;
