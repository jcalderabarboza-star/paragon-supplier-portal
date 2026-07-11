import { useTranslation } from 'react-i18next';
import { modeLabelKey } from '../lib/modeLabel';

/**
 * Localize a shipment-mode token (Sea / Air / Road) for DISPLAY, from the
 * central modeLabel SSoT. Known modes localize; anything else renders verbatim,
 * and in EN the resolved value equals the canonical string.
 *
 * HONEST-BY-CONSTRUCTION: display resolver only. Keep the canonical token as the
 * stored `s.mode` value and the FilterChipsBar `id` — translate the label, not
 * the data.
 */
export function useModeLabel(): (mode: string) => string {
  const { t } = useTranslation();
  return (mode: string) => {
    const key = modeLabelKey(mode);
    return key ? t(key) : mode;
  };
}
