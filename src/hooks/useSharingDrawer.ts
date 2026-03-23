/**
 * useSharingDrawer Hook
 * 
 * Reusable hook for managing SharingDrawer state and adapter injection.
 * Works with any entity type via adapters.
 */

import { useState, useMemo } from 'react';
import type { ShareAdapter } from '../lib/permissions/adapter';
import { adapterRegistry } from '../lib/permissions/adapter';

export function useSharingDrawer(entityType: string, entityId: string | null) {
  const [isOpen, setIsOpen] = useState(false);

  const adapter = useMemo<ShareAdapter | null>(() => {
    if (!entityId) return null;
    return adapterRegistry.get(entityType, entityId);
  }, [entityType, entityId]);

  const openDrawer = () => {
    if (adapter) {
      setIsOpen(true);
    }
  };

  const closeDrawer = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    adapter,
    openDrawer,
    closeDrawer,
  };
}

