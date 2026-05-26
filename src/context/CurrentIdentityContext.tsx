import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';

export type PersonaType = 'buyer' | 'supplier';

export interface CurrentIdentity {
  personaType: PersonaType;
  supplierId: string | null;
  supplierName: string | null;
}

export interface IdentitySource {
  load(): CurrentIdentity;
  save(next: CurrentIdentity): void;
}

interface CurrentIdentityContextValue {
  identity: CurrentIdentity;
  setIdentity: (next: CurrentIdentity) => void;
}

const CurrentIdentityContext = createContext<
  CurrentIdentityContextValue | undefined
>(undefined);

interface ProviderProps {
  source: IdentitySource;
  children: React.ReactNode;
}

export const CurrentIdentityProvider: React.FC<ProviderProps> = ({
  source,
  children,
}) => {
  const [identity, setIdentityState] = useState<CurrentIdentity>(() =>
    source.load(),
  );

  const setIdentity = useCallback(
    (next: CurrentIdentity) => {
      setIdentityState(next);
      source.save(next);
    },
    [source],
  );

  return (
    <CurrentIdentityContext.Provider value={{ identity, setIdentity }}>
      {children}
    </CurrentIdentityContext.Provider>
  );
};

export const useCurrentIdentity = (): CurrentIdentityContextValue => {
  const ctx = useContext(CurrentIdentityContext);
  if (!ctx)
    throw new Error(
      'useCurrentIdentity must be used within CurrentIdentityProvider',
    );
  return ctx;
};
