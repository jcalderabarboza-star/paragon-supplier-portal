// FB-2 · THE NAMES A LABEL OR AN INSTRUCTION MAY NOT CONTAIN (rule R07): every
// sample person as a reader sees them, in both languages. Their ids are in the
// world already (`liveWorld`); the labels need a language, so a surface adds
// them.
//
// ⚠️ ONE WORLD FOR THE PAGE. The composer and the Changes list are handed the
// SAME world, built once with these labels — so a draft the composer reports
// as naming a person is reported by the list too. Two worlds disagreed here
// before the batch that wrote this file shipped: found on review, not by a spec.
import i18n from '../../lib/i18n';
import { ROLE_LABEL_KEY } from '../../services/transitions/handoff';
import { SAMPLE_PEOPLE } from '../../services/identity/sampleRoster';

export function rosterLabels(): readonly string[] {
  return (['en', 'id'] as const).flatMap((lng) => {
    const t = i18n.getFixedT(lng);
    return SAMPLE_PEOPLE.map((p) => `${t(ROLE_LABEL_KEY[p.role])} ${p.ordinal}`);
  });
}
