import { useTranslation } from 'react-i18next';
import { describeRefusal } from '../services/transitions/refusalMessage';

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
  const { i18n } = useTranslation();
  return (reason: string | undefined) => describeRefusal(reason, i18n.language);
}
