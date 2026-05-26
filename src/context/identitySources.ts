import {
  CurrentIdentity,
  IdentitySource,
  PersonaType,
} from './CurrentIdentityContext';

const IDENTITY_KEY = 'paragon.identity';
const LEGACY_PERSONA_KEY = 'paragon.persona';

const DEFAULT_IDENTITY: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
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
    if (typeof window === 'undefined') return DEFAULT_IDENTITY;

    const hashPersona = personaFromHash();

    try {
      const raw = window.localStorage.getItem(IDENTITY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isCurrentIdentity(parsed)) {
          return hashPersona
            ? { ...parsed, personaType: hashPersona }
            : parsed;
        }
      }
    } catch {
      // ignore parse / storage errors
    }

    try {
      const legacy = window.localStorage.getItem(LEGACY_PERSONA_KEY);
      if (isPersonaType(legacy)) {
        return {
          personaType: hashPersona ?? legacy,
          supplierId: null,
          supplierName: null,
        };
      }
    } catch {
      // ignore
    }

    return hashPersona
      ? { ...DEFAULT_IDENTITY, personaType: hashPersona }
      : DEFAULT_IDENTITY;
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
