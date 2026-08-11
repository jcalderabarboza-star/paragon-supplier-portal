import {
  CurrentIdentity,
  IdentitySource,
  PersonaType,
} from './CurrentIdentityContext';

const IDENTITY_KEY = 'paragon.identity';
const LEGACY_PERSONA_KEY = 'paragon.persona';

const SEEDED_SUPPLIER_ID = 'sup-007';
const SEEDED_SUPPLIER_NAME = 'PT Sample Packaging Indonesia';

const identityForPersona = (persona: PersonaType): CurrentIdentity =>
  persona === 'supplier'
    ? {
        personaType: 'supplier',
        supplierId: SEEDED_SUPPLIER_ID,
        supplierName: SEEDED_SUPPLIER_NAME,
      }
    : { personaType: 'buyer', supplierId: null, supplierName: null };

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

    try {
      const raw = window.localStorage.getItem(IDENTITY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isCurrentIdentity(parsed)) storedPersona = parsed.personaType;
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
    return identityForPersona(effective);
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
