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
import { mockSuppliers } from '../data/mockSuppliers';

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

/**
 * ⚠️ **THE TENANT READ BACK FROM STORAGE — AND THE NAME IS RESOLVED, NEVER
 * TRUSTED.** `supplierId` was the one field `isCurrentIdentity` VALIDATED and
 * `load` then DISCARDED: the return re-seeded it from `identityForPersona`, so
 * a persisted tenant sat on disk being ignored while the seat silently stayed
 * `sup-007`.
 *
 * ⚠️ **THIS FIELD IS NOT DISPLAY. It is the tenancy gate AND the cache key** —
 * `scope.supplierId` is what `dispatcher.ts` refuses on (`SCOPE_DENIED`) and
 * what `scopeKey` shards every query cache by. That is why the name is
 * re-derived from the supplier master instead of read from the stored row:
 * localStorage is caller-supplied, and a row claiming
 * `{ supplierId: 'sup-002', supplierName: 'PT Sample Packaging' }` would render
 * ANOTHER TENANT'S NAME over sup-002's rows — a lie the scoping gate cannot
 * catch, because the id it enforces on is correct.
 *
 * Three outcomes, deliberately distinct — an unknown tenant must NOT collapse
 * into the seed, because "nothing stored" and "stored something that is not a
 * supplier" are different facts and only one of them is safe to guess at:
 *   · **absent / null** → `null`, and the caller seeds. The portal opens with
 *     data, which is what a cold start must do.
 *   · **names a real supplier** → that tenant, with the MASTER's name.
 *   · **names no supplier** → `{ supplierId: null }`, refused downstream by
 *     guards that already ship: 13 surfaces gate on `!supplierId`, and five
 *     gate again on `!mySupplier` (`getCurrentSupplier` returns null for an
 *     unknown id). Nothing new is rendered and nothing falls back to `sup-007`.
 */
const tenantFromStorage = (
  value: unknown,
): { supplierId: string | null; supplierName: string | null } | null => {
  if (typeof value !== 'string' || value === '') return null;
  const row = mockSuppliers.find((s) => s.id === value);
  return row
    ? { supplierId: row.id, supplierName: row.name }
    : { supplierId: null, supplierName: null };
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
    let storedSupplierId: unknown = undefined;

    try {
      const raw = window.localStorage.getItem(IDENTITY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isCurrentIdentity(parsed)) {
          storedPersona = parsed.personaType;
          storedRoles = (parsed as { businessRoles?: unknown }).businessRoles;
          storedSupplierId = parsed.supplierId;
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
    if (effective !== storedPersona) return base;

    // ⚠️ THE TENANT IS CARRIED ONLY ON THE SUPPLIER SIDE, for the same reason
    // the roles are: a buyer seat's `supplierId` is `null` BY CONSTRUCTION (it
    // reads the cross-supplier superset), so honouring a stored one there would
    // narrow a buyer to a single tenant — the opposite of the scoping contract.
    const tenant = effective === 'supplier' ? tenantFromStorage(storedSupplierId) : null;
    return {
      ...base,
      businessRoles: rolesFromStorage(effective, storedRoles),
      ...(tenant ?? {}),
    };
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
