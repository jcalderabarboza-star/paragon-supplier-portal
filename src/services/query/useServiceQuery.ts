// ────────────────────────────────────────────────────────────────────────────
// useServiceQuery — the ONE generic pages never call directly. It:
//   1. pulls the injected IDataService from context,
//   2. derives the QueryScope from the current identity,
//   3. appends scopeKey (personaType:supplierId) to every query key so the
//      buyer / supplier-A / supplier-B caches are structurally distinct and
//      can never bleed into one another (the scoping invariant as a cache key).
//
// Domain hooks in ./hooks wrap this per read method; pages call those. Errors
// are surfaced by TanStack (queryFn throws DataError -> isError) — no Result
// envelope unwrapping in pages.
// ────────────────────────────────────────────────────────────────────────────

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useDataService } from '../data/DataServiceContext';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import type { IDataService, QueryScope } from '../data/types';

export const scopeKey = (scope: QueryScope): string =>
  `${scope.personaType}:${scope.supplierId ?? 'all'}`;

export function useServiceQuery<T>(
  key: readonly unknown[],
  fetcher: (svc: IDataService, scope: QueryScope) => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>,
) {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const scope: QueryScope = {
    personaType: identity.personaType,
    supplierId: identity.supplierId,
    // Carried on the READ scope too, so `getCapabilities` answers for the SEAT
    // rather than the persona. `scopeKey` deliberately ignores it (see
    // `QueryScope.businessRoles`): two seats with different roles read the same
    // tenant's rows, so keying on roles would shard the cache on a dimension the
    // reads do not vary by. Any query that varies by ROLE must put the roles in
    // its OWN key — no such query exists today.
    businessRoles: identity.businessRoles,
    actor: identity.actor,
  };
  return useQuery<T, Error>({
    queryKey: [...key, scopeKey(scope)],
    queryFn: () => fetcher(svc, scope),
    ...options,
  });
}
