import { useTranslation } from 'react-i18next';
import { stepRefusalText } from '../lib/stepRefusal';
import {
  describeRefusal,
  describeDataError,
} from '../services/transitions/refusalMessage';

/**
 * Localize a dispatcher refusal for DISPLAY — the `useModeLabel` shape, with the
 * prose coming from `COMMAND_REFUSAL_GLOSSARY` instead of an i18n key (the
 * glossary is where these nine are defined, and a second copy in the i18n layer
 * is the half that would rot).
 *
 * Returns `null` for a reason this vocabulary does not own, so every call site
 * reads `refusalText(r) ?? <what it rendered before>` and an unrecognised
 * refusal is untouched. See `refusalMessage.ts` for why `null` rather than a
 * default.
 */
export function useRefusalText(): (reason: string | undefined) => string | null {
  const { t, i18n } = useTranslation();
  // FB-4 — a step an active version added, or the separation it asks for, has
  // its own sentence: which step, which lane, who. Asked first; `null` for
  // every other refusal, which then reads exactly as it did.
  return (reason: string | undefined) =>
    stepRefusalText(reason, t, i18n.language) ?? describeRefusal(reason, i18n.language);
}


/**
 * The same service for a THROWN `DataError` — `SCOPE_DENIED` and its five
 * siblings, which `useRefusalText` cannot read because their message is prose
 * rather than `KIND:detail`. Same contract: `null` for a code this vocabulary
 * does not own, so every call site keeps the fallback it already had.
 */
export function useDataErrorText(): (code: string | undefined) => string | null {
  const { i18n } = useTranslation();
  return (code: string | undefined) => describeDataError(code, i18n.language);
}