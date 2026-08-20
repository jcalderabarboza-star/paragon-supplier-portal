import {
  CurrentIdentity,
  IdentitySource,
  PersonaType,
} from './CurrentIdentityContext';
import {
  PERSONA_SYSTEM_ROLES,
  isSystemRole,
} from '../services/transitions/businessRoles';
import { NO_PERSON } from './noPerson';

const IDENTITY_KEY = 'paragon.identity';
const LEGACY_PERSONA_KEY = 'paragon.persona';

const SEEDED_SUPPLIER_ID = 'sup-007';
const SEEDED_SUPPLIER_NAME = 'PT Sample Packaging Indonesia';

// ⚠️ **THE DEMO SEAT OPENS HOLDING EVERY ROLE ON ITS SIDE, AND THAT IS A
// DELIBERATE DEFAULT RATHER THAN A LEFTOVER WILDCARD.** The difference is where
// the breadth lives: it is now DATA ON A SEAT that a person can narrow, not a
// property of being a buyer. Seeding a narrower demo default would delete
// affordances from a portal nobody asked to change; seeding all six keeps every
// currently-reachable act reachable on the day this lands, and the role picker
// is what makes the narrowing demonstrable.
const identityForPersona = (persona: PersonaType): CurrentIdentity =>
  persona === 'supplier'
    ? {
        personaType: 'supplier',
        supplierId: SEEDED_SUPPLIER_ID,
        supplierName: SEEDED_SUPPLIER_NAME,
        businessRoles: PERSONA_SYSTEM_ROLES.supplier,
        actor: NO_PERSON,
      }
    : {
        personaType: 'buyer',
        supplierId: null,
        supplierName: null,
        businessRoles: PERSONA_SYSTEM_ROLES.buyer,
        actor: NO_PERSON,
      };

/**
 * Roles read back from storage, filtered to ones this persona can actually
 * hold. **A stored role is not trusted** — localStorage is caller-supplied, and
 * an unrecognised or cross-persona id would otherwise grant atoms silently.
 * An empty result falls back to the persona's full set rather than to nothing:
 * a seat that can do nothing is indistinguishable from a broken portal.
 */
const rolesFromStorage = (
  persona: PersonaType,
  value: unknown,
): readonly string[] => {
  const allowed = PERSONA_SYSTEM_ROLES[persona];
  if (!Array.isArray(value)) return allowed;
  const kept = value.filter(
    (r): r is string =>
      typeof r === 'string' && isSystemRole(r) && (allowed as readonly string[]).includes(r),
  );
  return kept.length > 0 ? kept : allowed;
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
