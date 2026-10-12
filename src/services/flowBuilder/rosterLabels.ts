// FB-2 · THE NAMES A LABEL OR AN INSTRUCTION MAY NOT CONTAIN (rule R07): every
// sample person as a reader sees them, in both languages. Their ids are in the
// world already (`liveWorld`); the labels need a language, so a surface adds
// them.
//
// ⚠️ ONE WORLD, EVERYWHERE. `liveWorld()` carries these labels itself, so the
// composer, the Changes list, the checks that guard proposing and activating,
// and the dispatcher's overlay all judge a version by the same names. Two
// worlds disagreed here once (the composer knew the labels, the list only the
// ids): found on review, not by a spec.
import i18n from '../../lib/i18n';
import { ROLE_LABEL_KEY } from '../../services/transitions/handoff';
import { SAMPLE_PEOPLE } from '../../services/identity/sampleRoster';

export function rosterLabels(): readonly string[] {
  return (['en', 'id'] as const).flatMap((lng) => {
    const t = i18n.getFixedT(lng);
    return SAMPLE_PEOPLE.map((p) => `${t(ROLE_LABEL_KEY[p.role])} ${p.ordinal}`);
  });
}
