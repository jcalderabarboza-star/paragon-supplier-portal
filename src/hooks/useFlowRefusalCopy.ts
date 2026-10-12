import { useTranslation } from 'react-i18next';
import { namedSeatRefusalKey } from '../lib/namedSeatRefusal';
import { personNamingRefusalKey, PERSON_NAMING_REFUSAL_KEYS } from '../pages-v2/personNamingRefusal';
import { flowVersionRefusalKey } from '../pages-v2/process-flows/flowVersionRefusal';
import { personLabel } from '../services/identity/personLabel';
import { isSampleActor } from '../services/identity/sampleRoster';
import { useRefusalText } from './useRefusalText';

/** The person a person-naming refusal names: the token straight after its head. */
function namedIn(reason: string): string | null {
  for (const head of Object.keys(PERSON_NAMING_REFUSAL_KEYS)) {
    const at = reason.indexOf(`${head}: `);
    if (at < 0) continue;
    const id = reason.slice(at + head.length + 2).split(' ', 1)[0];
    return isSampleActor(id) ? id : null;
  }
  return null;
}

/**
 * A REFUSAL ON A CHANGE TO A PROCESS OR ON AN ADDED STEP, in the reader's
 * language. In order: the seat names nobody; the refusal names a person (the
 * label comes from the one resolver, never from the developer sentence); the
 * refusal has its own sentence by head; the dispatcher's own sentence; and only
 * then what the dispatcher said.
 */
export function useFlowRefusalCopy(): (reason: string | undefined) => string {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  return (reason) => {
    const seat = namedSeatRefusalKey(reason);
    if (seat) return t(seat);
    const person = personNamingRefusalKey(reason);
    if (person && reason) {
      const id = namedIn(reason);
      return t(person, { person: id ? personLabel(id, t) : t('identity.actor.unknown') });
    }
    const own = flowVersionRefusalKey(reason);
    if (own) return t(own);
    return refusalText(reason) ?? t('flowBuilder.create.refused', { reason: reason ?? '' });
  };
}
