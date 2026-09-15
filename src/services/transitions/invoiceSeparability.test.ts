// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE OPERATOR'S RULING, MADE CHECKABLE: ONE SEAT BY DEFAULT, SEPARABLE BY
// CONFIGURATION.
//
// `t_invoice_approve` authorises a payment and `t_invoice_release_payment`
// makes it. `finance` holds BOTH atoms, so the seat the demo opens on can do
// both — and that is the ruling, not an oversight. What the ruling promises is
// that a firm wanting four-eyes can SEPARATE them without a code change, by
// granting two custom roles over the `buyer` tenancy anchor holding one atom
// each. This file is that promise, asserted.
//
// ⚠️ **WHY A LANE SPLIT WAS REJECTED, MEASURED RATHER THAN ASSERTED.** Moving
// one atom to a new lane would have been cosmetic on the only seat that
// matters: `buyer_all` and `admin` are DERIVED unions over the lane bundles
// (`[...new Set(BUYER_LANE_IDS.flatMap(...))]`), so both halves of any split
// re-merge in the same commit, and `SEEDED_SEAT_ROLES.buyer` is every buyer
// lane, so the default seat would hold both halves too. The separability had to
// come from the ⊥ of the lattice, not from re-cutting it.
//
// ⚠️ **AND THE ANCHOR IS WHAT MAKES IT POSSIBLE — THIS IS THE FIRST CONSUMER OF
// #299.** `atomsOfCustomRole` is the UNION and is additive-only by ruling, so
// the narrowest expressible child of a parent IS the parent. Before the
// zero-atom `buyer` anchor the smallest buyer parents held three atoms each,
// and a seat that could approve an invoice necessarily carried unrelated
// authority it could never shed. Over the anchor, `adds: ['invoice:approve']`
// resolves to exactly `['invoice:approve']`.
//
// ⚠️ **RULE 4 THROUGHOUT.** Every "cannot" is paired with a "can" on the SAME
// instrument, because a seat resolving to zero atoms would satisfy every
// negative claim in this file by accident.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import {
  customRoleStore,
  atomsForSeat,
  atomsOfCustomRole,
  addableAtomRefusal,
  copyableParentRefusal,
  type CustomRoleDefinition,
} from './customRoles';
import {
  SYSTEM_ROLES,
  SEEDED_SEAT_ROLES,
  isSystemRole,
  type BusinessRoleId,
} from './businessRoles';
import { catalogRoles } from './roles';
import { availabilityOfAtom } from './handoff';
import './index';

const APPROVE = 'invoice:approve';
const PAY = 'invoice:pay';
const NOBODY = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;

const oneAtomRole = (id: string, atom: string): CustomRoleDefinition =>
  ({
    id,
    parent: 'buyer',
    displayName: id,
    description: 'One atom over the buyer anchor.',
    adds: [atom],
    parentAtomsAtGrant: [...SYSTEM_ROLES.buyer],
    grantedBy: NOBODY,
    grantedAt: '2026-09-11T00:00:00.000Z',
  }) as CustomRoleDefinition;

beforeEach(() => customRoleStore.reset());

describe('POPULATION GUARD — this suite is looking at the shipped tree', () => {
  // §42b / EMPTY-INPUT-REPORTS-CLEAN-01: every claim below reads the real
  // catalogue and the real bundles. Over an empty one they are all vacuous.
  it('the catalogue and the bundles name the atoms this file reasons about', () => {
    const catalog = catalogRoles();
    expect(catalog).toContain(APPROVE);
    expect(catalog).toContain(PAY);
    expect(catalog).not.toContain('invoice:release'); // not an atom in this tree
    expect(Object.keys(SYSTEM_ROLES)).toContain('finance');
    expect(Object.keys(SYSTEM_ROLES)).toContain('buyer');
  });

  it('the buyer anchor is the ⊥ this file depends on — it holds NOTHING', () => {
    // If the anchor ever gains an atom, every "exactly one atom" claim below
    // becomes false and this is where it is caught first.
    expect(SYSTEM_ROLES.buyer).toEqual([]);
  });
});

describe('THE DEFAULT SEAT — one seat, and it does both', () => {
  it('`finance` holds the authorising atom AND the paying atom', () => {
    expect(SYSTEM_ROLES.finance).toContain(APPROVE);
    expect(SYSTEM_ROLES.finance).toContain(PAY);
  });

  it('the seat the demo opens on holds both, through `finance`', () => {
    const seat = SEEDED_SEAT_ROLES.buyer as readonly BusinessRoleId[];
    expect(seat).toContain('finance' as BusinessRoleId);
    const atoms = atomsForSeat(seat);
    expect(atoms).toContain(APPROVE);
    expect(atoms).toContain(PAY);
    // Stated plainly so nobody reads this file as claiming four-eyes by
    // default: out of the box, ONE seat authorises and releases.
    expect(availabilityOfAtom(APPROVE, seat).kind).toBe('held');
    expect(availabilityOfAtom(PAY, seat).kind).toBe('held');
  });

  it('and the two wide roles hold both BY DERIVATION — which is why no lane split would help', () => {
    for (const wide of ['buyer_all', 'admin'] as const) {
      expect(SYSTEM_ROLES[wide]).toContain(APPROVE);
      expect(SYSTEM_ROLES[wide]).toContain(PAY);
    }
  });
});

describe('SEPARABILITY — two custom roles over the anchor, one atom each', () => {
  it('a one-atom custom role is CONSTRUCTIBLE over the buyer anchor', () => {
    // The three gates a grant passes, each answering `null` for "allowed".
    expect(copyableParentRefusal('buyer')).toBeNull();
    const catalog = catalogRoles();
    expect(addableAtomRefusal('buyer', APPROVE, catalog)).toBeNull();
    expect(addableAtomRefusal('buyer', PAY, catalog)).toBeNull();
    // …and the controls that prove those gates are not simply answering `null`
    // to everything: a supplier atom and a machine-only atom are both refused.
    expect(addableAtomRefusal('buyer', 'po:confirm', catalog)).toMatch(/may not span tenancies/);
    expect(addableAtomRefusal('buyer', 'invoice:match', catalog)).toMatch(/automation grant/);
  });

  it('it resolves to EXACTLY that atom — the anchor contributes nothing', () => {
    expect(atomsOfCustomRole(oneAtomRole('invoice-approver', APPROVE))).toEqual([APPROVE]);
    expect(atomsOfCustomRole(oneAtomRole('invoice-releaser', PAY))).toEqual([PAY]);
  });

  it('THE APPROVER can approve and CANNOT release', () => {
    customRoleStore.append(oneAtomRole('invoice-approver', APPROVE));
    const seat = ['invoice-approver'] as readonly BusinessRoleId[];
    expect(atomsForSeat(seat)).toEqual([APPROVE]);
    expect(availabilityOfAtom(APPROVE, seat).kind).toBe('held');
    const onPay = availabilityOfAtom(PAY, seat);
    expect(onPay.kind).toBe('withheld');
    // The refusal NAMES an owner — a withheld verb renders as a wait with a
    // lane on it, never as a vanished button (§74).
    expect(onPay.kind === 'withheld' && onPay.owners).toContain('finance');
  });

  it('THE RELEASER can release and CANNOT approve', () => {
    customRoleStore.append(oneAtomRole('invoice-releaser', PAY));
    const seat = ['invoice-releaser'] as readonly BusinessRoleId[];
    expect(atomsForSeat(seat)).toEqual([PAY]);
    expect(availabilityOfAtom(PAY, seat).kind).toBe('held');
    const onApprove = availabilityOfAtom(APPROVE, seat);
    expect(onApprove.kind).toBe('withheld');
    expect(onApprove.kind === 'withheld' && onApprove.owners).toContain('finance');
  });

  it('⚠️ THE RULING ITSELF — no seat built this way holds BOTH', () => {
    // This is the assertion the whole batch exists to make. A mutation that
    // merges the two atoms into one grantable role must fail HERE.
    customRoleStore.append(oneAtomRole('invoice-approver', APPROVE));
    customRoleStore.append(oneAtomRole('invoice-releaser', PAY));
    for (const id of ['invoice-approver', 'invoice-releaser']) {
      const atoms = atomsForSeat([id] as readonly BusinessRoleId[]);
      expect(atoms).toHaveLength(1);
      expect(atoms.includes(APPROVE) && atoms.includes(PAY)).toBe(false);
    }
  });

  it('…and the separation is a CHOICE, not a property of custom roles — one seat CAN re-merge them', () => {
    // ⚠️ **THE HONEST OTHER HALF, AND IT IS WHY THIS FILE DOES NOT CLAIM
    // ENFORCEMENT.** Nothing refuses a seat that holds both custom roles, and
    // nothing refuses `adds: [APPROVE, PAY]` on ONE role. Separability here
    // means *expressible*, never *enforced*: an administrator who grants both
    // has un-separated them, exactly as one who grants `finance` has.
    customRoleStore.append(oneAtomRole('invoice-approver', APPROVE));
    customRoleStore.append(oneAtomRole('invoice-releaser', PAY));
    const both = atomsForSeat(['invoice-approver', 'invoice-releaser'] as readonly BusinessRoleId[]);
    expect(both).toContain(APPROVE);
    expect(both).toContain(PAY);
  });
});

describe('⚠️ THE BOUNDARY — separability is SESSION-DEEP, and a reload re-widens the seat', () => {
  it('a custom role id does not survive `rolesFromStorage` — §66k, on the money path', () => {
    // ⚠️ **MEASURED WHILE BUILDING THIS FILE, AND IT BOUNDS THE RULING RATHER
    // THAN CONTRADICTING IT.** `atomsForSeat` resolves custom roles correctly,
    // so a seat narrowed to one atom behaves for the whole session. But
    // `identitySources.ts`'s `rolesFromStorage` keeps only ids passing
    // `isSystemRole`, and falls back to `SEEDED_SEAT_ROLES` when nothing
    // survives — so a seat holding ONLY `invoice-approver` comes back from a
    // reload holding all six lanes, which is `finance`, which is BOTH atoms.
    //
    // **THE RE-WIDENING FAILS OPEN, ON THE PAYMENT PATH**, which is the reason
    // this is asserted rather than left as a comment: it is the precondition of
    // the operator's ruling being exercisable outside one session, and the day
    // seat-assignment is built (§66k names it as that batch's first fix) this
    // test is where the change must show up.
    //
    // Asserted through the SAME predicate the loader filters on, so this cannot
    // drift from the real behaviour.
    expect(isSystemRole('finance' as BusinessRoleId)).toBe(true); // control: a system id survives
    expect(isSystemRole('invoice-approver' as BusinessRoleId)).toBe(false); // …a custom one does not
    // And what the seat falls back to still holds both.
    const fallback = atomsForSeat(SEEDED_SEAT_ROLES.buyer as readonly BusinessRoleId[]);
    expect(fallback).toContain(APPROVE);
    expect(fallback).toContain(PAY);
  });
});
