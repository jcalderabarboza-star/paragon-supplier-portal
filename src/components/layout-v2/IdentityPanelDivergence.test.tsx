import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';

import IdentityPanel from './IdentityPanel';
import { renderWithProviders, BUYER, SUPPLIER } from '../../test/test-utils';
import { samplePeopleFor } from '../../services/identity/sampleRoster';
import { identityEn } from '../../lib/i18n/identity';
import i18n from '../../lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE DIVERGENCE NOTICE NAMES THE RIGHT DIRECTION — AND THE FIRST BUILD DID
// NOT.
//
// R3 says the roster SEEDS a seat's roles and the toggles may narrow them
// afterwards, with the panel naming the divergence. The first implementation
// tested only THAT the two sets differ and rendered one string: *"Roles narrowed
// from Procurement 1"*. Browser QA caught it rendering that sentence on a seat
// that had just been GIVEN a second lane.
//
// **A notice naming the OPPOSITE of what happened is worse than none**: the
// reader checks it against the role list directly above it and learns the panel
// cannot be trusted. It is `label-names-wrong-verb` with a person attached, and
// no handler-based census would have seen it — the control was wired, the copy
// was wrong.
//
// Three arms, and all three are asserted, because a spec covering only the arm
// that was already right would have shipped the defect.
// ─────────────────────────────────────────────────────────────────────────────

const PROCUREMENT = samplePeopleFor('buyer').find((p) => p.role === 'procurement')!;

const openPanel = () => {
  fireEvent.click(screen.getByTestId('identity-avatar'));
};

const selectPerson = (personId: string) => {
  fireEvent.click(screen.getByTestId(`identity-person-${personId}`));
};

// The dropdown is COLLAPSED by default and `selectPerson` closes it again, so
// the trigger is clicked only when the list is not already showing. Clicking it
// unconditionally toggles it SHUT on the second call, which is what made two of
// these cases fail before the helper was made idempotent.
const toggleRole = (role: string) => {
  if (screen.queryByTestId('identity-roles-list') === null) {
    fireEvent.click(screen.getByTestId('identity-roles-trigger'));
  }
  fireEvent.click(screen.getByTestId(`identity-role-${role}`));
};

afterEach(async () => {
  window.localStorage.clear();
  await i18n.changeLanguage('en');
});

describe('POPULATION GUARD — the person this spec pins exists', () => {
  it('names a procurement sample person holding exactly one lane', () => {
    expect(PROCUREMENT, 'no procurement sample person on the roster').toBeDefined();
    // The single-lane shape is what makes all three arms reachable from one row.
    expect(PROCUREMENT.roles).toEqual(['procurement']);
  });
});

describe('⚠️ THE DIVERGENCE NOTICE — three arms, each naming its own direction', () => {
  it('NO notice while the seat holds exactly the roster row', () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    openPanel();
    selectPerson(PROCUREMENT.personId);
    // The known-GOOD control. Without it, a notice that rendered ALWAYS would
    // satisfy every case below.
    expect(screen.queryByTestId('identity-narrowed')).toBeNull();
  });

  it('⚠️ WIDENED when a lane is ADDED — the defect browser QA caught', () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    openPanel();
    selectPerson(PROCUREMENT.personId);
    toggleRole('compliance');

    const notice = screen.getByTestId('identity-narrowed');
    expect(notice.getAttribute('data-divergence')).toBe('widened');
    expect(notice.textContent).toContain(identityEn['identity.widened'].replace('{{label}}', ''). trim());
    // ⚠️ AND IT MUST NOT SAY "narrowed". This is the assertion the original
    // build would have failed, and the only one that catches the direction.
    expect(notice.textContent).not.toContain('narrowed');
  });

  // ⚠️ **NARROWED IS TESTED ON THE SUPPLIER SIDE, AND THE REASON IS A DERIVED
  // PROPERTY OF THE ROSTER RATHER THAN A CONVENIENCE.** A seat is `narrowed`
  // only when what it holds is a PROPER SUBSET of its roster row. Every BUYER
  // row holds exactly one role, and the panel refuses to drop the last one, so
  // a buyer seat can never be a proper subset of its own row — the arm is
  // unreachable on that side BY CONSTRUCTION. The supplier rows hold the whole
  // supplier seat, so dropping one lane reaches it.
  //
  // The assertion below derives that rather than assuming it, so the day a
  // multi-lane buyer row is added this stops being true and somebody is told.
  it('CONTROL — no buyer roster row can be narrowed, which is why this uses the supplier side', () => {
    expect(samplePeopleFor('buyer').every((p) => p.roles.length === 1)).toBe(true);
    expect(samplePeopleFor('supplier').every((p) => p.roles.length > 1)).toBe(true);
  });

  it('NARROWED when a lane is REMOVED from a multi-lane seat', () => {
    renderWithProviders(<IdentityPanel />, { identity: SUPPLIER });
    openPanel();
    const sup = samplePeopleFor('supplier')[0];
    selectPerson(sup.personId);
    // Drop one lane: held becomes a proper SUBSET of the roster row.
    toggleRole(sup.roles[1]);

    const notice = screen.getByTestId('identity-narrowed');
    expect(notice.getAttribute('data-divergence')).toBe('narrowed');
    expect(notice.textContent).not.toContain('widened');
  });

  it('CHANGED when the seat holds a lane the row does not, and drops one it does', () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    openPanel();
    selectPerson(PROCUREMENT.personId);
    toggleRole('compliance');
    toggleRole('procurement');

    const notice = screen.getByTestId('identity-narrowed');
    // Neither set contains the other — so neither "narrowed" nor "widened" is
    // true, and claiming either would be the same defect in a third direction.
    expect(notice.getAttribute('data-divergence')).toBe('changed');
    expect(notice.textContent).not.toContain('narrowed');
    expect(notice.textContent).not.toContain('widened');
  });

  it('⚠️ THE ACTOR IS UNCHANGED BY ANY OF IT — acts still record against that person', () => {
    // The notice DESCRIBES; it does not take the act. A seat that narrowed
    // itself is still acting as the person it selected, which is exactly what
    // the copy promises.
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    openPanel();
    selectPerson(PROCUREMENT.personId);
    toggleRole('compliance');
    expect(screen.getByTestId('identity-acting-as').textContent).toContain('(SAMPLE)');
  });
});
