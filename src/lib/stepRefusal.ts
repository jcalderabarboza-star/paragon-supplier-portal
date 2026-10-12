// FB-4 · WHAT A PAGE'S OWN BUTTON ANSWERS WHILE A CHANGE IS IN FORCE, in the
// reader's language — the two refusals an active version adds to an act that
// already had a button.
//
// It lives behind `useRefusalText`, which every surface that reads a refusal
// already calls, so NO PAGE IS EDITED for it: a requisition's Approve button
// says which step is waiting and for which lane the day a version gates it.
//
// `null` for any reason this does not own, so every caller's fallback survives.
import type { TFunction } from 'i18next';
import { personNamingRefusalKey } from '../pages-v2/personNamingRefusal';
import { parsePendingDetail, parseStepKey } from '../services/flowBuilder/stepsDue';
import { stepLedger } from '../services/flowBuilder/stepLedger';
import { flowVersionStore } from '../services/flowBuilder/flowVersionStore';
import type { AddedStep, Bilingual } from '../services/flowBuilder/flowVersion';
import { personLabel } from '../services/identity/personLabel';
import { isSampleActor } from '../services/identity/sampleRoster';
import { ADDED_CHECK } from '../services/transitions/dispatcher';
import { ROLE_LABEL_KEY } from '../services/transitions/handoff';
import type { SystemRoleId } from '../services/transitions/businessRoles';
import { isAttributed } from './enforcement';

/** A label or an instruction, in the reader's language. */
export const inLanguage = (text: Bilingual, language: string | undefined): string =>
  (language ?? '').toLowerCase().startsWith('id') ? text.id : text.en;

export const laneLabel = (step: Pick<AddedStep, 'lane'>, t: TFunction): string => {
  const key = ROLE_LABEL_KEY[step.lane as SystemRoleId];
  return key ? t(key) : step.lane;
};

/** The step a key names, whichever version defined it — for a sentence about it. */
function stepOf(key: string): AddedStep | null {
  const parsed = parseStepKey(key);
  if (!parsed) return null;
  for (const v of [...flowVersionStore.forEntity(parsed.entity)].reverse()) {
    const step = v.content.steps.find((s) => s.id === parsed.stepId);
    if (v.state === 'Active' && step) return step;
  }
  return null;
}

export function stepRefusalText(reason: string | undefined, t: TFunction, language: string | undefined): string | null {
  if (!reason) return null;
  if (reason.startsWith('STEP_PENDING:')) {
    const { key, declined } = parsePendingDetail(reason.slice('STEP_PENDING:'.length));
    const step = stepOf(key);
    if (!step) return null;
    const values = { step: inLanguage(step.label, language), lane: laneLabel(step, t) };
    // The decline itself, read off the ledger: the latest unspent row of this step.
    const at = parseStepKey(key);
    const row = declined && at
      ? [...stepLedger.forDocument(at.entity, at.docId)].reverse().find((r) => !r.used && r.stepId === at.stepId && r.decision === 'declined')
      : null;
    if (row) {
      return t('flowBuilder.step.refusedDeclined', {
        ...values,
        person: isAttributed(row.by) ? personLabel(row.by.person.personId, t) : t('identity.actor.unknown'),
        reason: row.reason,
      });
    }
    return t('flowBuilder.step.refusedPending', values);
  }
  if (reason.startsWith(`POLICY_REJECTED:${ADDED_CHECK}:`)) {
    const personKey = personNamingRefusalKey(reason);
    if (!personKey) return null;
    // The person is the token straight after the head — read by POSITION, and
    // believed only if the roster holds it.
    const id = reason.slice(`POLICY_REJECTED:${ADDED_CHECK}:`.length).split(': ', 2)[1]?.split(' ', 1)[0];
    return t(personKey, { person: id && isSampleActor(id) ? personLabel(id, t) : t('identity.actor.unknown') });
  }
  return null;
}
