import {
  CurrentIdentity,
  IdentitySource,
  PersonaType,
} from './CurrentIdentityContext';
import {
  PERSONA_SYSTEM_ROLES,
  SEEDED_SEAT_ROLES,
  isSystemRole,
} from '../services/transitions/businessRoles';
import { NO_PERSON } from './noPerson';

const IDENTITY_KEY = 'paragon.identity';
const LEGACY_PERSONA_KEY = 'paragon.persona';

const SEEDED_SUPPLIER_ID = 'sup-007';
const SEEDED_SUPPLIER_NAME = 'PT Sample Packaging Indonesia';

// ⚠️ **THE DEMO SEAT OPENS HOLDING EVERY LANE ON ITS SIDE, AND THAT IS A
// DELIBERATE DEFAULT RATHER THAN A LEFTOVER WILDCARD.** The difference is where
// the breadth lives: it is now DATA ON A SEAT that a person can narrow, not a
// property of being a buyer. Seeding a narrower demo default would delete
// affordances from a portal nobody asked to change; seeding every lane keeps
// every currently-reachable act reachable, and the role picker is what makes the
// narrowing demonstrable.
//
// ⚠️ **IT OPENS HOLDING THE LANES, NOT THE OFFER.** `SEEDED_SEAT_ROLES` is
// deliberately a PROPER SUBSET of `PERSONA_SYSTEM_ROLES`: `buyer_all` is
// offerable and unseeded, because *a role is holdable and unheld until somebody
// grants it, and that is the correct state for a manager's seat* (operator
// ruling). Reading the offer here would seed it to everyone.
const identityForPersona = (persona: PersonaType): CurrentIdentity =>
  persona === 'supplier'
    ? {
        personaType: 'supplier',
        supplierId: SEEDED_SUPPLIER_ID,
        supplierName: SEEDED_SUPPLIER_NAME,
        businessRoles: SEEDED_SEAT_ROLES.supplier,
        actor: NO_PERSON,
      }
    : {
        personaType: 'buyer',
        supplierId: null,
        supplierName: null,
        businessRoles: SEEDED_SEAT_ROLES.buyer,
        actor: NO_PERSON,
      };

/**
 * Roles read back from storage, filtered to ones this persona can actually
 * hold. **A stored role is not trusted** — localStorage is caller-supplied, and
 * an unrecognised or cross-persona id would otherwise grant atoms silently.
 * An empty result falls back rather than to nothing: a seat that can do nothing
 * is indistinguishable from a broken portal.
 *
 * ⚠️ **THE FILTER AND THE FALLBACK READ DIFFERENT CONSTANTS, AND CONFLATING
 * THEM WOULD SEED `buyer_all` THROUGH THE BACK DOOR.** What a stored row is
 * ALLOWED to say is `PERSONA_SYSTEM_ROLES` — the full offer, or a legitimately
 * granted `buyer_all` would be stripped on reload. What an ABSENT or empty row
 * falls back to is `SEEDED_SEAT_ROLES` — the seed — because "nothing stored"
 * must mean "the seat as it opens", never "everything on offer". Returning
 * `allowed` here, as this did while the two were one constant, would have handed
 * every cold-start seat the manager's role the moment it was made offerable.
 */
const rolesFromStorage = (
  persona: PersonaType,
  value: unknown,
): readonly string[] => {
  const allowed = PERSONA_SYSTEM_ROLES[persona];
  const seeded = SEEDED_SEAT_ROLES[persona];
  if (!Array.isArray(value)) return seeded;
  const kept = value.filter(
    (r): r is string =>
      typeof r === 'string' && isSystemRole(r) && (allowed as readonly string[]).includes(r),
  );
  return kept.length > 0 ? kept : seeded;
};

const personaFromHash = (): PersonaType | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (hash.startsWith('#/supplier/')) return 'supplier';
  if (hash.startsWith('#/buyer/')) return 'buyer';
  return null;
};

const isPersonaType = (v: unknown): v is PersonaType =>
  v === 'buyer' || v === 'supplier';

const isCurrentIdentity = (v: unknown): v is CurrentIdentity => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    isPersonaType(o.personaType) &&
    (o.supplierId === null || typeof o.supplierId === 'string') &&
    (o.supplierName === null || typeof o.supplierName === 'string')
  );
};

export const mockIdentitySource: IdentitySource = {
  load(): CurrentIdentity {
    if (typeof window === 'undefined') return identityForPersona('buyer');

    const hashPersona = personaFromHash();

    // Resolve effective persona: hash override > stored new key > legacy key > 'buyer'
    let storedPersona: PersonaType | null = null;
    let storedRoles: unknown = undefined;

    try {
      const raw = window.localStorage.getItem(IDENTITY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isCurrentIdentity(parsed)) {
          storedPersona = parsed.personaType;
          storedRoles = (parsed as { businessRoles?: unknown }).businessRoles;
        }
      }
    } catch {
      // ignore parse / storage errors
    }

    if (storedPersona === null) {
      try {
        const legacy = window.localStorage.getItem(LEGACY_PERSONA_KEY);
        if (isPersonaType(legacy)) storedPersona = legacy;
      } catch {
        // ignore
      }
    }

    const effective: PersonaType = hashPersona ?? storedPersona ?? 'buyer';
    const base = identityForPersona(effective);
    // Stored roles survive a reload ONLY for the persona they were stored
    // under — switching sides re-seeds, because a role bundle is per-side.
    return effective === storedPersona
      ? { ...base, businessRoles: rolesFromStorage(effective, storedRoles) }
      : base;
  },

  save(next: CurrentIdentity): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
    } catch {
      // private browsing / quota — in-session state still updates
    }
  },
};
