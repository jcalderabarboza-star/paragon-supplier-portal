import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { useVerbAvailability, useVerbAvailabilities } from './useVerbAvailability';
import type { TransitionRole } from '../services/transitions/schema';

// ────────────────────────────────────────────────────────────────────────────
// The hook answers the SAME question `availabilityOfAtom` answers, from the
// seat in context rather than from an argument a caller had to remember.
//
// ⚠️ **BOTH DIRECTIONS, ON EVERY ARM.** A gate is habitually probed only for
// the thing it should REFUSE, which ships a gate that is wrong about what it
// should ACCEPT looking like a working gate. So every case below asserts the
// held seat AND the withheld seat over the same atom, and the `unowned` arm is
// exercised against a real machine-owned atom rather than a fabricated one.
// ────────────────────────────────────────────────────────────────────────────

const PROCUREMENT: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
const REQUISITIONER: CurrentIdentity = { ...BUYER, businessRoles: ['requisitioner'] };

const Probe: React.FC<{ atom: TransitionRole }> = ({ atom }) => {
  const a = useVerbAvailability(atom);
  return (
    <span data-testid="probe">
      {a.kind}
      {a.kind === 'withheld' ? `:${a.owners.join('+')}` : ''}
    </span>
  );
};

const read = () => screen.getByTestId('probe').textContent;

describe('useVerbAvailability — the seat, from context', () => {
  it('HELD: a procurement seat holds `pr:approve`', () => {
    renderWithProviders(<Probe atom="pr:approve" />, { identity: PROCUREMENT });
    expect(read()).toBe('held');
  });

  it('WITHHELD: the same atom, a requisitioner seat — and the OWNER is named', () => {
    renderWithProviders(<Probe atom="pr:approve" />, { identity: REQUISITIONER });
    expect(read()).toBe('withheld:procurement');
  });

  it('and the mirror image, so neither arm is believed alone', () => {
    renderWithProviders(<Probe atom="pr:submit" />, { identity: REQUISITIONER });
    expect(read()).toBe('held');
  });

  it('WITHHELD names the requisitioner when procurement asks for `pr:submit`', () => {
    renderWithProviders(<Probe atom="pr:submit" />, { identity: PROCUREMENT });
    expect(read()).toBe('withheld:requisitioner');
  });

  it('the full buyer seat holds every buyer atom this page uses', () => {
    renderWithProviders(<Probe atom="pr:create" />, { identity: BUYER });
    expect(read()).toBe('held');
  });

  it('a supplier seat holds its own atom', () => {
    renderWithProviders(<Probe atom="po:confirm" />, { identity: SUPPLIER });
    expect(read()).toBe('held');
  });

  it('⚠️ UNOWNED is a real arm over a real atom — `pr:convert` is a cascade act no role holds', () => {
    // Derived, not invented: `pr:convert` carries `trigger: 'cascade'` and sits
    // in no assignable bundle. If a bundle ever gains it, this flips to
    // `withheld` and the test says so — which is the correct alarm, because an
    // `unowned` verb becoming ownable is a real change to who may act.
    renderWithProviders(<Probe atom="pr:convert" />, { identity: BUYER });
    expect(read()).toBe('unowned');
  });
});

const Multi: React.FC = () => {
  const a = useVerbAvailabilities({
    approve: 'pr:approve',
    submit: 'pr:submit',
  } as const);
  return <span data-testid="probe">{`${a.approve.kind}/${a.submit.kind}`}</span>;
};

describe('useVerbAvailabilities — several atoms, keyed by the caller name', () => {
  it('resolves each key independently against ONE seat', () => {
    renderWithProviders(<Multi />, { identity: PROCUREMENT });
    expect(read()).toBe('held/withheld');
  });

  it('and the opposite seat inverts BOTH — the keys are not transposed', () => {
    // The failure this catches is a positional one: a builder that returned an
    // array and let the caller index it would pass the test above by accident.
    renderWithProviders(<Multi />, { identity: REQUISITIONER });
    expect(read()).toBe('withheld/held');
  });
});
