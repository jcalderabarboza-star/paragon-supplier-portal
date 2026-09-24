// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ NO READER EVER SEES A `personId`.
//
// **THE PROBE INPUT IS A DEFECT THIS TREE REALLY SHIPPED, WHICH IS THE ONLY
// KIND THAT PROVES ANYTHING** (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`). Browser
// QA on the sample-identity batch read this off the screen, verbatim:
//
//   "…(materialrequest_decider_not_requester:the requester
//    (sim-usr-procurement-1) may not also decide this request — raising a
//    material request and ruling on it are two authorities)"
//
// A synthetic subject agrees with its matcher by construction. This one does
// not: the reason below is produced by the SHIPPED dispatcher running the
// SHIPPED hook against a SHIPPED roster person, and the assertions are made
// against whatever string that produces.
//
// ── ⚠️ THE FIRST ASSERTION IS THAT THE LEAK IS STILL REAL ──────────────────
//   `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`: a clean reading taken after a
//   repair is a report about the repair. So this file asserts, in the same run,
//   that the raw service reason STILL CARRIES THE ID — it is the developer
//   trail and `materialRequestCommand.test.ts` pins it — and that the RENDERED
//   copy does not. Without the first half, the second passes the day the id
//   stops being produced at all and the guard silently stops guarding.
//
// ── ⚠️ AND IT ASSERTS WHICH LINK REMOVES IT ────────────────────────────────
//   `describeRefusal` — the chain that shipped the defect — is run beside the
//   new one and must STILL leak. That is what makes "the translator is what
//   fixed it" a measurement rather than a story: if both chains came back
//   clean, something else had changed and this guard would be pointing at the
//   wrong mechanism.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from '../data/mock/MockCommandService';
import { materialRequestStore } from '../data/mock/stores/materialRequestStore';
import { rfqStore } from '../data/mock/stores/rfqStore';
import { describeRefusal } from '../transitions/refusalMessage';
import { personNamingRefusalKey } from '../../pages-v2/personNamingRefusal';
import { personLabel } from './personLabel';
import { SAMPLE_PEOPLE, SAMPLE_PERSON_PREFIX } from './sampleRoster';
import { SAMPLE_ACTORS } from './sampleActors';
import { identityEn, identityId } from '../../lib/i18n/identity';
import { ROLE_LABEL_KEY } from '../transitions/handoff';
import type { QueryScope } from '../data/types';

/**
 * The i18n layer, reduced to what a render needs: look the key up in the
 * locale's own table and fill `{{…}}`. Deliberately NOT a stub that returns the
 * key — a stub would make every assertion below pass over a string that no
 * reader could ever see (`EMPTY-INPUT-REPORTS-CLEAN-01`).
 */
const translator = (table: Record<string, string>) =>
  (key: string, opts?: Record<string, unknown>): string => {
    const raw = table[key];
    if (raw === undefined) return key;
    return raw.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(opts?.[name] ?? `{{${name}}}`));
  };

const EN = translator(identityEn);
const ID = translator(identityId);

const SAMPLE = SAMPLE_ACTORS.procurement1;
const SAMPLE_ID = SAMPLE.kind === 'RESOLVED' ? SAMPLE.person.personId : '';

const scopeOf = (roles: string[]): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles as QueryScope['businessRoles'],
  actor: SAMPLE,
});

let svc: MockCommandService;

beforeEach(() => {
  materialRequestStore.reset();
  rfqStore.reset();
  svc = new MockCommandService();
});

/** Raise a request, then try to decide it AS THE SAME PERSON. */
async function realRefusal(): Promise<string> {
  const created = await svc.dispatch(scopeOf(['procurement']), {
    transitionId: 't_materialrequest_submit',
    entity: 'materialRequest',
    payload: {
      requestedLabel: 'Amber Dropper 30ml (probe)',
      category: 'Packaging',
      need: 'A probe request — the master carries no 30ml dropper.',
    },
  });
  expect(created.status, created.reason ?? '').not.toBe('failed');
  const refused = await svc.dispatch(scopeOf(['planning']), {
    transitionId: 't_materialrequest_start_review',
    entity: 'materialRequest',
    entityId: created.entityId!,
    payload: {},
  });
  expect(refused.status, 'the four-eyes hook did not fire — the probe examined nothing').toBe(
    'failed',
  );
  return refused.reason!;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION GUARD — the actor this probe uses is a real roster person', () => {
  it('names a sample person that exists, and it is RESOLVED', () => {
    expect(SAMPLE.kind).toBe('RESOLVED');
    expect(SAMPLE_PEOPLE.map((p) => p.personId)).toContain(SAMPLE_ID);
    expect(SAMPLE_ID.startsWith(SAMPLE_PERSON_PREFIX)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE REAL REFUSAL — the id is produced, and never rendered', () => {
  it('⚠️ THE LEAK IS STILL REAL: the raw reason carries the personId', async () => {
    // The half that keeps this guard honest. If the service ever stops naming
    // the id, every assertion below would pass having proved nothing.
    const reason = await realRefusal();
    expect(reason).toContain(SAMPLE_ID);
    expect(reason).toContain('MATERIALREQUEST_DECIDER_IS_REQUESTER');
  });

  it('⚠️ AND THE CHAIN THAT SHIPPED THE DEFECT STILL LEAKS — so the fix is located', async () => {
    // `describeRefusal` appends the hook's own developer sentence verbatim.
    // That is correct for its purpose and is NOT being changed; naming it here
    // is what proves the translator is the link that removes the id.
    const reason = await realRefusal();
    expect(describeRefusal(reason, 'en')).toContain(SAMPLE_ID);
  });

  it('⚠️ THE RENDERED COPY NAMES THE ROLE AND THE SAMPLE MARKER — EN', async () => {
    const reason = await realRefusal();
    const key = personNamingRefusalKey(reason);
    expect(key, 'the refusal is not routed through the resolver').not.toBeNull();
    const rendered = EN(key!, { person: personLabel(SAMPLE_ID, EN) });

    expect(rendered).not.toContain(SAMPLE_PERSON_PREFIX);
    expect(rendered).toContain('(SAMPLE)');
    // The role label comes from the SAME vocabulary the handoff line reads, so
    // a role renamed there is renamed here.
    expect(rendered).toContain(EN(ROLE_LABEL_KEY.procurement));
    expect(rendered).toContain('may not also decide');
  });

  it('⚠️ AND IN INDONESIAN, WITH THE INDONESIAN MARKER', async () => {
    // ⚠️ The ID marker is `CONTOH`, deliberately not the English word: a probe
    // keyed on a token spelled identically in both locales is an assertion that
    // cannot fail (`i18n-probe-needs-divergent-token`).
    const reason = await realRefusal();
    const rendered = ID(personNamingRefusalKey(reason)!, {
      person: personLabel(SAMPLE_ID, ID),
    });

    expect(rendered).not.toContain(SAMPLE_PERSON_PREFIX);
    expect(rendered).toContain('(CONTOH)');
    expect(rendered).not.toContain('(SAMPLE)');
    expect(rendered).toContain('tidak boleh sekaligus');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ NO AUTHORED STRING CARRIES THE NAMESPACE', () => {
  it('no EN or ID value in the identity fragment contains the prefix', () => {
    for (const [table, name] of [
      [identityEn, 'EN'],
      [identityId, 'ID'],
    ] as const) {
      for (const [key, value] of Object.entries(table)) {
        expect(value, `${name} ${key} carries the person namespace`).not.toContain(
          SAMPLE_PERSON_PREFIX,
        );
      }
    }
  });

  it('⚠️ THE KNOWN-FALSE CONTROL — the scan really would catch one', () => {
    // Rule 4. Without this, the assertion above is indistinguishable from one
    // run over an empty table.
    const planted = { 'probe.key': `acting as ${SAMPLE_PERSON_PREFIX}procurement-1` };
    const caught = Object.values(planted).filter((v) => v.includes(SAMPLE_PERSON_PREFIX));
    expect(caught).toHaveLength(1);
    // …and the real tables are non-empty, or the loop above examined nothing.
    expect(Object.keys(identityEn).length).toBeGreaterThan(10);
    expect(Object.keys(identityId).length).toBeGreaterThan(10);
  });
});
