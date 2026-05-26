// ────────────────────────────────────────────────────────────────────────────
// DataServiceProvider — single entry-point through which pages read data.
//
// One Provider, one hook (useDataService). The implementation is swapped at
// Phase 3 by replacing the `service` prop with an httpDataService; pages do
// not change.
//
// Mounted in main.tsx above the router. useDataService() is available but
// no page consumes it yet — that begins in Batch 1B.2.
// ────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext } from 'react';
import type { IDataService } from './types';

const DataServiceContext = createContext<IDataService | undefined>(undefined);

interface ProviderProps {
  service: IDataService;
  children: React.ReactNode;
}

export const DataServiceProvider: React.FC<ProviderProps> = ({
  service,
  children,
}) => (
  <DataServiceContext.Provider value={service}>
    {children}
  </DataServiceContext.Provider>
);

export const useDataService = (): IDataService => {
  const svc = useContext(DataServiceContext);
  if (!svc)
    throw new Error(
      'useDataService must be used within a DataServiceProvider',
    );
  return svc;
};
