/**
 * Shared Spaces List Component
 * 
 * Displays list of Households or Teams with tabs
 */

import { Home, Users } from 'lucide-react';
import type { SpaceListItem } from '../../lib/sharedSpacesManagement';

interface SharedSpacesListProps {
  spaces: SpaceListItem[];
  activeTab: 'households' | 'teams';
  onTabChange: (tab: 'households' | 'teams') => void;
  onSpaceSelect: (space: SpaceListItem) => void;
  loading: boolean;
}

export function SharedSpacesList({
  spaces,
  activeTab,
  onTabChange,
  onSpaceSelect,
  loading,
}: SharedSpacesListProps) {
  const getRoleBadge = (role: string | null) => {
    if (!role) return null;

    const colors = {
      owner: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      member: 'bg-gray-100 text-gray-700',
      viewer: 'bg-gray-50 text-gray-600',
    };

    return (
      <span
        className={`text-xs px-2 py-0.5 rounded font-medium ${
          colors[role as keyof typeof colors] || colors.member
        }`}
      >
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Loading spaces...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4 sm:px-6">
        <button
          onClick={() => onTabChange('households')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 min-h-[44px] ${
            activeTab === 'households'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Home size={18} />
          Households
          <span className="ml-1 text-xs text-gray-500">
            ({spaces.filter(s => s.type === 'household').length})
          </span>
        </button>
        <button
          onClick={() => onTabChange('teams')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 min-h-[44px] ${
            activeTab === 'teams'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={18} />
          Teams
          <span className="ml-1 text-xs text-gray-500">
            ({spaces.filter(s => s.type === 'team').length})
          </span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {spaces.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No {activeTab === 'households' ? 'households' : 'teams'} found
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {spaces.map((space) => {
              const Icon = space.type === 'household' ? Home : Users;
              const isPending = space.currentUserStatus === 'pending';

              return (
                <button
                  key={space.id}
                  onClick={() => onSpaceSelect(space)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
                >
                  <div className={`p-2 rounded-lg ${
                    space.type === 'household' ? 'bg-blue-50' : 'bg-purple-50'
                  }`}>
                    <Icon
                      size={24}
                      className={
                        space.type === 'household' ? 'text-blue-600' : 'text-purple-600'
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{space.name}</h3>
                      {isPending && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{space.memberCount} member{space.memberCount !== 1 ? 's' : ''}</span>
                      {space.currentUserRole && getRoleBadge(space.currentUserRole)}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
