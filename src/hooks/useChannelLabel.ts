import { useTranslation } from 'react-i18next';
import { channelLabelKey } from '../lib/channelLabel';

/**
 * Localize a communication-channel token (WhatsApp / Email / Web Portal / API …)
 * for DISPLAY, from the central channelLabel SSoT. Most channels are proper nouns
 * / protocol names and resolve to a canonical display casing identical in both
 * locales (lifting lowercase fixture variants like 'whatsapp' → 'WhatsApp'); only
 * 'Web Portal' → 'Portal Web' carries a distinct ID label. Unknown tokens render
 * verbatim.
 *
 * HONEST-BY-CONSTRUCTION: display resolver only. Keep the canonical token as the
 * stored channel value and any FilterChipsBar `id` — translate the label, not the
 * data.
 */
export function useChannelLabel(): (channel: string) => string {
  const { t } = useTranslation();
  return (channel: string) => {
    const key = channelLabelKey(channel);
    return key ? t(key) : channel;
  };
}
