import { describe, it, expect, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import NoSupplierIdentity from './NoSupplierIdentity';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import { identityEn, identityId } from '../../lib/i18n/identity';
import i18n from '../../lib/i18n';
import { SEEDED_SEAT_ROLES } from '../../services/transitions/businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import { mockSuppliers } from '../../data/mockSuppliers';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ **ONE SCREEN WAS ANSWERING TWO DIFFERENT QUESTIONS, AND WAS RIGHT ABOUT
// ONE.** A BUYER seat reaching this guard is told to switch to Supplier mode,
// correctly. A SUPPLIER seat whose stored tenant names no supplier reaches THE
// SAME `!supplierId` guard — `tenantFromStorage` maps an unknown id to
// `{ supplierId: null }` — and was told to switch to a mode it was already in.
//
// These pin BOTH arms, and pin the DISCRIMINATOR (`personaType`) rather than the
// strings, so a copy edit does not silently repoint an arm.
// ─────────────────────────────────────────────────────────────────────────────

// A supplier seat whose tenant did not resolve — the state the register calls
// the unknown-tenant path. `supplierId: null` is what `tenantFromStorage`
// produces for `sup-999`; this constructs the same seat directly.
const UNRESOLVED_SUPPLIER: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: null,
  supplierName: null,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON,
};

afterEach(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('POPULATION GUARD — the unknown-tenant seat is a real state, not a hypothesis', () => {
  it('sup-999 is genuinely absent from the supplier master, and sup-007 is genuinely present', () => {
    // Bilateral: a known-GOOD id must resolve or this proves nothing about the
    // known-BAD one (the master could simply be empty).
    expect(mockSuppliers.find((s) => s.id === 'sup-007')).toBeDefined();
    expect(mockSuppliers.find((s) => s.id === 'sup-999')).toBeUndefined();
  });
});

describe('NoSupplierIdentity — the remedy is derived from the persona', () => {
  it('a BUYER seat is told to switch persona, which is the act that helps it', async () => {
    renderWithProviders(<NoSupplierIdentity />, { identity: BUYER });
    expect(screen.getByText(identityEn['identity.noSupplier.title'])).toBeTruthy();
    expect(screen.getByText(identityEn['identity.noSupplier.heading'])).toBeTruthy();
    // and it must NOT be told the tenant is unrecognised — it never named one
    expect(screen.queryByText(identityEn['identity.unresolvedTenant.heading'])).toBeNull();
  });

  it('a SUPPLIER seat with an unresolvable tenant is NOT told to switch to Supplier mode', async () => {
    renderWithProviders(<NoSupplierIdentity />, { identity: UNRESOLVED_SUPPLIER });
    expect(screen.getByText(identityEn['identity.unresolvedTenant.title'])).toBeTruthy();
    expect(screen.getByText(identityEn['identity.unresolvedTenant.heading'])).toBeTruthy();
    // THE DEFECT, asserted as an absence: the old single string sent this seat
    // to a toggle it was already on.
    expect(screen.queryByText(identityEn['identity.noSupplier.subtitle'])).toBeNull();
    expect(screen.queryByText(/persona toggle/i)).toBeNull();
  });

  it('the unresolved arm STATES THE REASON, not only the absence', () => {
    // The honesty rule, pinned to the property rather than to the sentence: the
    // copy must say a supplier was named and could not be resolved.
    for (const locale of ['en', 'id'] as const) {
      const map = locale === 'en' ? identityEn : identityId;
      const body =
        map['identity.unresolvedTenant.title'] +
        map['identity.unresolvedTenant.subtitle'] +
        map['identity.unresolvedTenant.body'];
      expect(body.length).toBeGreaterThan(120);
      expect(body).toMatch(locale === 'en' ? /supplier/i : /pemasok/i);
    }
  });
});

describe('NoSupplierIdentity — both arms render in Indonesian', () => {
  it('the buyer arm', async () => {
    await act(async () => { await i18n.changeLanguage('id'); });
    renderWithProviders(<NoSupplierIdentity />, { identity: BUYER });
    expect(screen.getByText(identityId['identity.noSupplier.title'])).toBeTruthy();
    // the key itself must never reach the screen (a missing key renders as its key)
    expect(screen.queryByText('identity.noSupplier.title')).toBeNull();
    // and the ENGLISH string must be gone — this component shipped hardcoded EN
    expect(screen.queryByText(identityEn['identity.noSupplier.title'])).toBeNull();
  });

  it('the unresolved-tenant arm', async () => {
    await act(async () => { await i18n.changeLanguage('id'); });
    renderWithProviders(<NoSupplierIdentity />, { identity: UNRESOLVED_SUPPLIER });
    expect(screen.getByText(identityId['identity.unresolvedTenant.title'])).toBeTruthy();
    expect(screen.queryByText(identityEn['identity.unresolvedTenant.title'])).toBeNull();
  });
});
