import { useTranslation } from 'react-i18next';
import { categoryLabelKey } from '../lib/categoryLabel';

/**
 * Localize a category token (Fragrance / Active Ingredient / Halal Compliance /
 * BPOM Regulatory …) for DISPLAY, from the central categoryLabel SSoT. Mapped
 * tokens localize; anything else (out-of-scope sample residue) renders verbatim,
 * and in EN the resolved value equals the canonical string.
 *
 * HONEST-BY-CONSTRUCTION: display resolver only. Keep the canonical token as the
 * stored `category` value and the FilterChipsBar `id` — translate the label, not
 * the data.
 */
export function useCategoryLabel(): (category: string) => string {
  const { t } = useTranslation();
  return (category: string) => {
    const key = categoryLabelKey(category);
    return key ? t(key) : category;
  };
}
