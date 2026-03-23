/**
 * Shared Spaces Management Panel
 * 
 * Unified management interface for Households and Teams
 */

import { useState, useEffect } from 'react';
import { X, Home, Users, Plus } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { SharedSpacesList } from './SharedSpacesList';
import { SpaceDetailsView } from './SpaceDetailsView';
import { getUserSpaces, type SpaceListItem } from '../../lib/sharedSpacesManagement';

interface SharedSpacesManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateHousehold?: () => void;
  onCreateTeam?: () => void;
}

type View = 'list' | 'details';
type Tab = 'households' | 'teams';

export function SharedSpacesManagementPanel({
  isOpen,
  onClose,
  onCreateHousehold,
  onCreateTeam,
}: SharedSpacesManagementPanelProps) {
  const [view, setView] = useState<View>('list');
  const [selectedSpace, setSelectedSpace] = useState<SpaceListItem | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('households');
  const [spaces, setSpaces] = useState<SpaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSpaces();
      setView('list');
      setSelectedSpace(null);
    }
  }, [isOpen]);

  const loadSpaces = async () => {
    setLoading(true);
    try {
      const allSpaces = await getUserSpaces();
      setSpaces(allSpaces);
    } catch (error) {
      console.error('Error loading spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpaceSelect = (space: SpaceListItem) => {
    setSelectedSpace(space);
    setView('details');
  };

  const handleBack = () => {
    setView('list');
    setSelectedSpace(null);
  };

  const filteredSpaces = spaces.filter(space => {
    if (activeTab === 'households') {
      return space.type === 'household';
    } else {
      return space.type === 'team';
    }
  });

  // Mobile: Use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={view === 'list' ? 'Manage Shared Spaces' : selectedSpace?.name || 'Space Details'}
        maxHeight="100vh"
        showCloseButton={true}
      >
        {view === 'list' ? (
          <>
            <SharedSpacesList
              spaces={filteredSpaces}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSpaceSelect={handleSpaceSelect}
              loading={loading}
            />
            {/* Create buttons for mobile */}
            {(onCreateHousehold || onCreateTeam) && (
              <div className="p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex gap-2">
                  {onCreateHousehold && (
                    <button
                      onClick={onCreateHousehold}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium min-h-[44px]"
                    >
                      <Plus size={18} />
                      <Home size={18} />
                      <span>Create Household</span>
                    </button>
                  )}
                  {onCreateTeam && (
                    <button
                      onClick={onCreateTeam}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium min-h-[44px]"
                    >
                      <Plus size={18} />
                      <Users size={18} />
                      <span>Create Team</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : selectedSpace ? (
          <SpaceDetailsView
            spaceId={selectedSpace.id}
            onBack={handleBack}
            onSpaceUpdated={loadSpaces}
          />
        ) : null}
      </BottomSheet>
    );
  }

  // Desktop: Full page overlay
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center safe-top safe-bottom">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">
            {view === 'list' ? 'Manage Shared Spaces' : selectedSpace?.name || 'Space Details'}
          </h2>
          <div className="flex items-center gap-2">
            {(onCreateHousehold || onCreateTeam) && view === 'list' && (
              <div className="flex gap-2 mr-2">
                {onCreateHousehold && (
                  <button
                    onClick={onCreateHousehold}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium min-h-[44px]"
                    title="Create Household"
                  >
                    <Plus size={16} />
                    <Home size={16} />
                  </button>
                )}
                {onCreateTeam && (
                  <button
                    onClick={onCreateTeam}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium min-h-[44px]"
                    title="Create Team"
                  >
                    <Plus size={16} />
                    <Users size={16} />
                  </button>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {view === 'list' ? (
            <SharedSpacesList
              spaces={filteredSpaces}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSpaceSelect={handleSpaceSelect}
              loading={loading}
            />
          ) : selectedSpace ? (
            <SpaceDetailsView
              spaceId={selectedSpace.id}
              onBack={handleBack}
              onSpaceUpdated={loadSpaces}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
