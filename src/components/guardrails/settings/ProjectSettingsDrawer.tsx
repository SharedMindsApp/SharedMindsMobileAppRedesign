/**
 * Project Settings Drawer
 * 
 * Phase 2: Project-level settings drawer with tabs.
 * 
 * Structure:
 * - General (placeholder for future)
 * - Calendar Sync (implemented in Phase 2)
 * - Permissions (placeholder for future)
 * 
 * Mobile-safe drawer that slides in from right on desktop,
 * uses BottomSheet on mobile.
 */

import { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { BottomSheet } from '../../shared/BottomSheet';
import { ProjectCalendarSyncPanel } from './ProjectCalendarSyncPanel';

interface ProjectSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

type Tab = 'general' | 'calendar' | 'permissions';

export function ProjectSettingsDrawer({
  isOpen,
  onClose,
  projectId,
  projectName,
}: ProjectSettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');

  if (!isOpen) return null;

  // Mobile: Use BottomSheet
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Project Settings"
        maxHeight="90vh"
      >
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'calendar'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar Sync
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'permissions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Permissions
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'calendar' && (
              <ProjectCalendarSyncPanel projectId={projectId} projectName={projectName} />
            )}
            {activeTab === 'general' && (
              <div className="p-6 text-center text-gray-500">
                General settings coming soon
              </div>
            )}
            {activeTab === 'permissions' && (
              <div className="p-6 text-center text-gray-500">
                Permissions settings coming soon
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    );
  }

  // Desktop: Slide-over drawer
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Project Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'calendar'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Calendar Sync
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Permissions
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'calendar' && (
            <ProjectCalendarSyncPanel projectId={projectId} projectName={projectName} />
          )}
          {activeTab === 'general' && (
            <div className="p-6 text-center text-gray-500">
              General settings coming soon
            </div>
          )}
          {activeTab === 'permissions' && (
            <div className="p-6 text-center text-gray-500">
              Permissions settings coming soon
            </div>
          )}
        </div>
      </div>
    </>
  );
}
