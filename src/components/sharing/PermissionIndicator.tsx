/**
 * Permission Indicator Component
 * 
 * Shows permission state for an entity:
 * - "Private"
 * - "Shared (overview)"
 * - "Shared (detailed)"
 * - "Read-only"
 * - "Editable"
 * 
 * Derived ONLY from PermissionFlags returned by the service.
 * Clicking opens SharingDrawer if user can_manage.
 */

import { useState } from 'react';
import { Lock, Eye, EyeOff, Edit, Users } from 'lucide-react';
import type { PermissionFlags } from '../../lib/permissions/types';
import { useSharingDrawer } from '../../hooks/useSharingDrawer';
import { SharingDrawer } from './SharingDrawer';

interface PermissionIndicatorProps {
  entityType: string;
  entityId: string;
  flags: PermissionFlags | null | undefined;
  canManage: boolean;
  className?: string;
}

export function PermissionIndicator({
  entityType,
  entityId,
  flags,
  canManage,
  className = '',
}: PermissionIndicatorProps) {
  const { isOpen, adapter, openDrawer, closeDrawer } = useSharingDrawer(entityType, entityId);

  // Default to private if no flags
  if (!flags) {
    return (
      <>
        <button
          onClick={canManage ? openDrawer : undefined}
          disabled={!canManage}
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md ${
            canManage
              ? 'text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer'
              : 'text-gray-500 bg-gray-50 cursor-default'
          } ${className}`}
          title={canManage ? 'Click to manage sharing' : 'Private'}
        >
          <Lock size={12} />
          <span>Private</span>
        </button>
        {adapter && (
          <SharingDrawer adapter={adapter} isOpen={isOpen} onClose={closeDrawer} />
        )}
      </>
    );
  }

  // Determine state
  const isShared = flags.can_view; // If can_view is true, it's shared with someone
  const isReadOnly = !flags.can_edit;
  const isDetailed = flags.detail_level === 'detailed';
  const hasChildren = flags.scope === 'include_children';

  let label: string;
  let icon: React.ReactNode;
  let colorClass: string;

  if (!isShared) {
    label = 'Private';
    icon = <Lock size={12} />;
    colorClass = 'text-gray-600 bg-gray-100';
  } else if (isReadOnly) {
    if (isDetailed) {
      label = 'Shared (read-only)';
    } else {
      label = 'Shared (overview)';
    }
    icon = <EyeOff size={12} />;
    colorClass = 'text-orange-600 bg-orange-50';
  } else {
    if (isDetailed) {
      label = hasChildren ? 'Shared (detailed + children)' : 'Shared (detailed)';
    } else {
      label = hasChildren ? 'Shared (overview + children)' : 'Shared (overview)';
    }
    icon = <Edit size={12} />;
    colorClass = 'text-blue-600 bg-blue-50';
  }

  return (
    <>
      <button
        onClick={canManage ? openDrawer : undefined}
        disabled={!canManage}
        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
          canManage
            ? `${colorClass} hover:opacity-80 cursor-pointer`
            : `${colorClass} opacity-60 cursor-default`
        } ${className}`}
        title={canManage ? 'Click to manage sharing' : label}
      >
        {icon}
        <span>{label}</span>
      </button>
      {adapter && (
        <SharingDrawer adapter={adapter} isOpen={isOpen} onClose={closeDrawer} />
      )}
    </>
  );
}

