/**
 * Phase 4B: Network Status Context
 * 
 * Provides global network connectivity state to all components.
 */

import { createContext, useContext, ReactNode } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface NetworkStatusContextType {
  isOnline: boolean;
  isOffline: boolean;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  isOffline: false,
});

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const { isOnline, isOffline } = useNetworkStatus();

  return (
    <NetworkStatusContext.Provider value={{ isOnline, isOffline }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatusContext() {
  return useContext(NetworkStatusContext);
}



