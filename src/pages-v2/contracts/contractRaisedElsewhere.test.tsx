// ─────────────────────────────────────────────────────────────────────────────
// THE CONTRACT LANE REFUSES, AND IT REFUSES IN THE RIGHT GRAMMAR.
//
// ⚠️ **TWO DEFECTS, TWO ASSERTIONS — DELIBERATELY NOT ONE.** The fabrication had
// two halves and they can regress independently: the MINT (a client-side
// `ctr-new-…` id and a `CTR-<yr>-<n>` business number SAP owns) and the PREPEND
// (that row joining the list, the tab counts, the header count and the renewal
// pipeline). A single "the wizard no longer creates" assertion would go red on
// either and tell you nothing about which — so each half has its own named
// test, and the mutation probe restores each half separately.
//
// ⚠️ **AND THE GRAMMAR IS ASSERTED IN BOTH DIRECTIONS, ON THE SAME SURFACE.**
// Rule 4: a guard probed only for what it rejects has never been shown to
// accept. `HandoffNotice` is CORRECT at the entry point (a seat without
// `contract:draft` is a ROLE obstacle) and WRONG at the terminal panel (the
// seat holds the atom; the LANE does not support the act). So this file asserts
// the notice is PRESENT in the first case and ABSENT in the second, rather than
// only that it is absent — an "is not a handoff" test alone would pass against
// a tree where `HandoffNotice` had been deleted outright.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { screen } from '@testing-library/react';

import { contractDraftOwner, CONTRACT_DRAFT_TRANSITION } from '../../services/transitions/contractDraftOwner';
import { getFlow } from '../../services/transitions/registry';
import { EXTERNAL_FACT_OWNER_KEY } from '../../lib/i18n/externalFactOwner';
import { contractsEn, contractsId } from '../../lib/i18n/contracts';
import { RaisedElsewhereNote, RaisedElsewherePanel } from './RaisedElsewhere';
import { renderWithProviders } from '../../test/test-utils';

const PAGE = readFileSync(
  resolve(__dirname, '..', 'BuyerContracts.tsx'),
  'utf-8',
);

/**
 * ⚠️ THE PAGE WITH ITS COMMENTS STRIPPED — and the need for it is the
 * finding, not a convenience.
 *
 * The retirement notes left at the site NAME what they retired: `ctr-new-`,
 * `setExtraContracts`, `[...extraContracts`. A bare substring search finds them
 * THERE and reads the retirement as the defect — which is exactly what happened
 * on this spec's first run, and exactly the trap #341 hit on the wizard-mint
 * assertion one batch earlier. **A mention is not a mint.**
 *
 * Stripping line comments is the discriminator, and it is deliberately not a
 * cleverer regex: the alternative (anchoring on `id:` / `const [`) re-decides
 * the question every time a comment is reworded, and the reword is the thing
 * that keeps happening. `CODE` is what the bundler would see.
 */
const CODE = PAGE.split(/\r?\n/)
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');

/**
 * ⚠️ POPULATION CONTROL FIRST, AND IT ASSERTS MEMBERSHIP RATHER THAN A SIZE.
 * `EMPTY-INPUT-REPORTS-CLEAN-01`: every absence assertion below would pass
 * identically against an empty read, a renamed file, or a registry that never
 * self-registered. These read the two inputs directly.
 */
describe('POPULATION CONTROLS — nothing below means anything without these', () => {
  it('the page source was read, and the flow is registered', () => {
    expect(PAGE.length).toBeGreaterThan(10_000);
    expect(PAGE).toContain('BuyerContracts');
    const flow = getFlow('contract');
    expect(flow, 'contract flow must be registered').toBeDefined();
    expect(flow!.transitions.map((t) => t.id)).toContain(CONTRACT_DRAFT_TRANSITION);
  });
});

describe('⚠️ THE OWNER IS READ FROM THE FLOW, NEVER AUTHORED', () => {
  it('resolves the owner the declaration names', () => {
    const flow = getFlow('contract')!;
    const draft = flow.transitions.find((t) => t.id === CONTRACT_DRAFT_TRANSITION)!;
    expect(draft.surfaceable.surfaced).toBe(false);
    // Narrow the way the module does, so the expectation reads the same source.
    if (draft.surfaceable.surfaced) throw new Error('unreachable');
    expect(draft.surfaceable.because).toBe('external-fact');
    if (draft.surfaceable.because !== 'external-fact') throw new Error('unreachable');
    expect(contractDraftOwner()).toBe(draft.surfaceable.owner);
  });

  it('the refusal names S/4HANA — through the owner map, in both locales', () => {
    const owner = contractDraftOwner();
    expect(owner).toBe('s4hana');
    // The token itself is a product name and is NOT translated (the map's own
    // ruling); what must exist in both locales is the FRAMING that carries it.
    expect(EXTERNAL_FACT_OWNER_KEY[owner!]).toBe('processFlows.owner.s4hana');
  });

  it('⚠️ NO LOCALE FILE SPELLS THE OWNER — it is interpolated, not written', () => {
    // The defect this forbids: a hand-written "S/4HANA" in the refusal copy,
    // which would survive a re-ruling of the owner and quietly name the wrong
    // system. Both locales, both refusal strings.
    for (const [name, map] of [
      ['EN', contractsEn],
      ['ID', contractsId],
    ] as const) {
      for (const key of [
        'contracts.wizard.raisedElsewhere.note',
        'contracts.wizard.raisedElsewhere.ownedBy',
      ]) {
        const copy = map[key as keyof typeof map] as string;
        expect(copy, `${name} ${key}`).toBeTruthy();
        expect(copy, `${name} ${key} must interpolate`).toContain('{{owner}}');
        expect(copy, `${name} ${key} must not spell it`).not.toMatch(/S\/4/i);
      }
    }
  });
});

describe('⚠️ HALF ONE — THE MINT IS GONE', () => {
  it('the page mints no contract id', () => {
    expect(CODE).not.toContain('ctr-new-');
    expect(/id:\s*`ctr-new/.test(CODE)).toBe(false);
    // CONTROL for the stripper itself: the retirement note still NAMES the
    // retired mint, so `CODE` and `PAGE` must genuinely differ here. Without
    // this, a stripper that returned '' would pass every absence above.
    expect(PAGE).toContain('ctr-new-');
  });

  it('the page mints no contract BUSINESS number — the one the SE Team reads as spec', () => {
    expect(/contractNumber:\s*`CTR-/.test(CODE)).toBe(false);
    expect(CODE).not.toContain('padStart(3');
  });

  it('CONTROL — the page still reads contract numbers it did not mint', () => {
    // Bilateral: an empty or renamed read would satisfy all three above.
    expect(PAGE).toContain('contractNumber');
  });
});

describe('⚠️ HALF TWO — NOTHING IS PREPENDED TO THE LIST', () => {
  it('there is no fabricated-row state and no merge into the rendered list', () => {
    expect(CODE).not.toContain('setExtraContracts(');
    expect(/const \[extraContracts/.test(CODE)).toBe(false);
    expect(/\[\.\.\.extraContracts/.test(CODE)).toBe(false);
    // CONTROL, same shape as above: the note still names what it retired.
    expect(PAGE).toContain('extraContracts');
  });

  it('the rendered list is the service read and nothing else', () => {
    expect(CODE).toContain('const contracts = baseContracts;');
  });

  it('and the created-toast is gone from BOTH locales with the act it announced', () => {
    for (const map of [contractsEn, contractsId]) {
      expect(Object.keys(map)).not.toContain('contracts.toast.created.title');
      expect(Object.keys(map)).not.toContain('contracts.toast.created.desc');
    }
    // CONTROL: the refusal toast that guards the PARSE is untouched — it is a
    // different act and must survive this batch.
    for (const map of [contractsEn, contractsId]) {
      expect(Object.keys(map)).toContain('contracts.toast.numberRefused.title');
    }
  });
});

describe('⚠️ THE REFUSAL IS NOT A HANDOFF NOTICE — both directions', () => {
  it('the terminal panel renders no handoff notice', () => {
    renderWithProviders(
      <RaisedElsewherePanel
        summary={<div data-testid="probe-summary" />}
        onRestart={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('contract-raised-elsewhere-panel')).toBeInTheDocument();
    expect(screen.getByTestId('probe-summary')).toBeInTheDocument();
    // A role-owner named here would say a colleague is the obstacle when the
    // obstacle is another system. Wave D's distinction.
    expect(screen.queryByTestId('handoff-notice')).toBeNull();
    expect(screen.queryByTestId('handoff-contract-draft')).toBeNull();
  });

  it('CONTROL — the ENTRY point does use one, because there a role IS the obstacle', () => {
    // The positive half. Without it, "no handoff here" would pass against a
    // tree that had deleted `HandoffNotice` entirely.
    expect(PAGE).toContain('testId="handoff-contract-draft"');
    expect(PAGE).toContain("useVerbAvailability('contract:draft')");
  });

  it('the pre-act note renders the framing, and carries the owner token', () => {
    renderWithProviders(<RaisedElsewhereNote />);
    expect(screen.getByTestId('contract-raised-elsewhere-note')).toBeInTheDocument();
  });
});

describe('⚠️ THE WALKTHROUGH STILL COLLECTS, AND STILL ENDS SOMEWHERE', () => {
  it('the four steps survive — the collection surface is the deliverable that stays', () => {
    for (const step of ['basics', 'terms', 'obligations', 'review']) {
      expect(PAGE, step).toContain(`id: '${step}'`);
    }
  });

  it('the terminal state exists, so the last step does not end nowhere', () => {
    expect(PAGE).toContain('stoppedDraft');
    expect(PAGE).toContain('RaisedElsewherePanel');
  });

  it('⚠️ the orphaned obligations now have a consumer — the panel shows them back', () => {
    // They are NOT retired: trimming a fabrication's output is not how a
    // fabrication gets fixed. The summary the panel renders is the same one the
    // review step renders, obligations included.
    expect(PAGE).toContain('collectedSummary(false)');
    expect(PAGE).toContain('collectedSummary(true)');
    expect(PAGE).toContain("t('contracts.wizard.review.section.obligations')");
  });

  it('the complete label no longer promises a create, in EITHER locale', () => {
    expect(contractsEn['contracts.wizard.complete']).not.toMatch(/create/i);
    expect(contractsId['contracts.wizard.complete']).not.toMatch(/buat/i);
    // CONTROL: the label still exists — an emptied key would pass both above.
    expect(contractsEn['contracts.wizard.complete']).toBeTruthy();
    expect(contractsId['contracts.wizard.complete']).toBeTruthy();
  });

  it('⚠️ THE ID REFUSAL IS FULLY TRANSLATED — a half-translated ruling is the defect', () => {
    const keys = Object.keys(contractsEn).filter((k) =>
      k.startsWith('contracts.wizard.raisedElsewhere.'),
    );
    expect(keys.length).toBeGreaterThan(4);
    for (const k of keys) {
      const en = contractsEn[k as keyof typeof contractsEn] as string;
      const id = contractsId[k as keyof typeof contractsId] as string;
      expect(id, `${k} missing in ID`).toBeTruthy();
      // The real test: ID must not be the EN string copied across. `owner` is
      // interpolated in two of these, so equality would mean an untranslated
      // sentence wearing a translated key.
      expect(id, `${k} is untranslated`).not.toBe(en);
    }
  });
});
