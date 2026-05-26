import { useCallback } from 'react';
import { useCurrentIdentity } from './CurrentIdentityContext';

export type Persona = 'buyer' | 'supplier';

interface PersonaContextValue {
  persona: Persona;
  setPersona: (p: Persona) => void;
}

export const usePersona = (): PersonaContextValue => {
  const { identity, setIdentity } = useCurrentIdentity();
  const setPersona = useCallback(
    (p: Persona) => setIdentity({ ...identity, personaType: p }),
    [identity, setIdentity],
  );
  return { persona: identity.personaType, setPersona };
};
