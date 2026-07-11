import { useTranslation } from 'react-i18next';
import { enumLabelKey } from '../lib/priorityLabel';

/**
 * Localize a shared enum token (priority / risk severity / GR disposition /
 * inspection Pass·Fail·N/A) for DISPLAY, from the central priorityLabel SSoT.
 *
 * Returns a resolver: known tokens localize (case-insensitive); anything else
 * renders verbatim, and in EN the resolved value equals the canonical string.
 *
 * HONEST-BY-CONSTRUCTION: this is a display resolver only. Never feed its output
 * back into state or a mutation — keep the canonical token as the value (e.g.
 * `<option value={p}>{el(p)}</option>`) so stored data stays English.
 */
export function useEnumLabel(): (token: string) => string {
  const { t } = useTranslation();
  return (token: string) => {
    const key = enumLabelKey(token);
    return key ? t(key) : token;
  };
}
