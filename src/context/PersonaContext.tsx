import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';

export type Persona = 'buyer' | 'supplier';

interface PersonaContextValue {
  persona: Persona;
  setPersona: (p: Persona) => void;
}

const STORAGE_KEY = 'paragon.persona';

const initPersona = (): Persona => {
  if (typeof window === 'undefined') return 'buyer';

  // URL hash first (HashRouter)
  const hash = window.location.hash;
  if (hash.startsWith('#/supplier/')) return 'supplier';
  if (hash.startsWith('#/buyer/')) return 'buyer';

  // localStorage second
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'supplier' || stored === 'buyer') return stored;
  } catch {
    // private browsing / quota — ignore
  }

  return 'buyer';
};

const PersonaContext = createContext<PersonaContextValue | undefined>(undefined);

export const PersonaProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [persona, setPersonaState] = useState<Persona>(initPersona);

  const setPersona = useCallback((p: Persona) => {
    setPersonaState(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // private browsing / quota — state still updates in-session
    }
  }, []);

  return (
    <PersonaContext.Provider value={{ persona, setPersona }}>
      {children}
    </PersonaContext.Provider>
  );
};

export const usePersona = (): PersonaContextValue => {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider');
  return ctx;
};
