import type { ActorAttribution } from '../lib/enforcement';
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';

export type PersonaType = 'buyer' | 'supplier';

/**
 * The business roles this seat holds. Typed as bare strings here on purpose:
 * `SystemRoleId` lives in `services/transitions/businessRoles.ts`, and the role
 * VOCABULARY is a service concern while the SEAT is a context one. Validated at
 * the boundary (`identitySources.ts`), resolved to atoms by `atomsFor`.
 */
export type SeatRoles = readonly string[];

/** Re-exported so a consumer needs one import for the whole seat. */
export type { ActorAttribution } from '../lib/enforcement';

export interface CurrentIdentity {
  personaType: PersonaType;
  supplierId: string | null;
  supplierName: string | null;
  /**
   * ⚠️ **THE AUTHORISATION HALF OF THE SEAT, AND IT IS NOT `personaType`.**
   * Before this arc a persona spanned all 48 buyer atoms unconditionally, so
   * `requiredRole` discriminated at the TENANCY boundary and nowhere else —
   * award, post-to-SAP and release-payment were one seat. The roles a seat
   * holds are now carried here and injected into the command scope; the
   * dispatcher resolves atoms from THESE, never from the persona.
   */
  businessRoles: SeatRoles;
  /**
   * ⚠️ **WHO IS ACTING — A DISCRIMINATED ATTRIBUTION, NEVER A BARE NAME**
   * (C10 §6.2 / `ENF-NO-PERSON-IN-IDENTITY-01`). An act either names a person
   * or says WHY IT CANNOT; there is deliberately no third shape and no
   * nullable `person`, because a nullable one lets an absence pass every check
   * a presence passes — which is how an anonymous unlock gets written down as
   * an override.
   *
   * **Today this is ALWAYS `UNATTRIBUTED: NO_PERSON_IN_SESSION`, and that is
   * the honest value rather than a stub.** The portal contains no persons: the
   * corporate IdP owns Paragon staff identity (F1) and supplier-side person
   * identity is unprocured (D-ID-2, OPEN). What this field changes is that the
   * SEAM now exists and is SESSION-SCOPED — a resolved actor injected here
   * flows to the dispatcher with no further plumbing, which is what §63a's
   * enforcement ceiling waits on: `rigour('OBSERVE') < rigour('BLOCK')`, so
   * EVERY mode below `BLOCK` is a loosening and every loosening needs a named
   * actor. The ramp opens the day this is `RESOLVED`, not before.
   *
   * ⚠️ **IT LIVES IN CONTEXT, NOT IN A DISPATCH-TIME CLOSURE**, so a component
   * can read it (`useCurrentIdentity()`). That is deliberate and is what keeps
   * an identity panel an additive consumer rather than a rewrite.
   */
  actor: ActorAttribution;
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
