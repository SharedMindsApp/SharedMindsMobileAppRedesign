/**
 * App List Browser Component
 * 
 * Displays list of installed apps from the phone, allowing users
 * to select and configure monitoring/blocking rules.
 */

import { useState } from 'react';
import { Search, Check, X as XIcon, Plus, Smartphone } from 'lucide-react';
import type { InstalledApp } from '../ScreenTimeAppView';
import type { TrackedApp } from '../../../lib/trackerStudio/screenTimeTrackingService';

interface AppListBrowserProps {
  installedApps: InstalledApp[];
  trackedApps: TrackedApp[];
  onSelectApps: (apps: InstalledApp[]) => void;
  onStopTracking: (appId: string) => void;
  loading: boolean;
  showAppSelector: boolean;
  onCloseSelector: () => void;
}

export function AppListBrowser({
  installedApps,
  trackedApps,
  onSelectApps,
  onStopTracking,
  loading,
  showAppSelector,
  onCloseSelector,
}: AppListBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());

  const filteredApps = installedApps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAppTracked = (appId: string): boolean => {
    return trackedApps.some(t => t.appId === appId && t.isTracking);
  };

  const handleToggleApp = (appId: string) => {
    setSelectedAppIds(prev => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const handleStartTracking = () => {
    const selectedApps = installedApps.filter(app => selectedAppIds.has(app.id));
    if (selectedApps.length > 0) {
      onSelectApps(selectedApps);
      setSelectedAppIds(new Set());
    }
  };

  const categoryColors: Record<string, string> = {
    social: 'bg-blue-100 text-blue-700',
    entertainment: 'bg-purple-100 text-purple-700',
    games: 'bg-pink-100 text-pink-700',
    productivity: 'bg-green-100 text-green-700',
    shopping: 'bg-orange-100 text-orange-700',
    news: 'bg-red-100 text-red-700',
    other: 'bg-gray-100 text-gray-700',
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Loading installed apps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tracked Apps Section */}
      {trackedApps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Currently Tracking</h2>
          <div className="space-y-2">
            {trackedApps
              .filter(t => t.isTracking)
              .map(tracked => {
                const app = installedApps.find(a => a.id === tracked.appId);
                if (!app) return null;

                return (
                  <TrackedAppCard
                    key={tracked.appId}
                    app={app}
                    trackedApp={tracked}
                    onStopTracking={() => onStopTracking(tracked.appId)}
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* Add Apps to Track */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Select Apps to Track</h2>
          {showAppSelector && selectedAppIds.size > 0 && (
            <button
              onClick={handleStartTracking}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Track {selectedAppIds.size} App{selectedAppIds.size !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {showAppSelector ? (
          <>
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* App Selection List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredApps
                .filter(app => !isAppTracked(app.id))
                .map(app => {
                  const isSelected = selectedAppIds.has(app.id);
                  return (
                    <AppSelectionCard
                      key={app.id}
                      app={app}
                      isSelected={isSelected}
                      onToggle={() => handleToggleApp(app.id)}
                    />
                  );
                })}
            </div>

            {filteredApps.filter(app => !isAppTracked(app.id)).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>All apps are already being tracked</p>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => onCloseSelector()}
            className="w-full p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3"
          >
            <Plus size={24} className="text-indigo-600" />
            <span className="text-indigo-600 font-semibold">Add Apps to Track</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface TrackedAppCardProps {
  app: InstalledApp;
  trackedApp: TrackedApp;
  onStopTracking: () => void;
}

function TrackedAppCard({ app, trackedApp, onStopTracking }: TrackedAppCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 border-2 border-green-200 hover:border-green-300 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {app.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{app.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                <Check size={12} />
                Tracking
              </span>
              {trackedApp.startTrackingDate && (
                <span className="text-xs text-gray-500">
                  Since {new Date(trackedApp.startTrackingDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStopTracking();
          }}
          className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Stop tracking"
        >
          <XIcon size={18} />
        </button>
      </div>
    </div>
  );
}

interface AppSelectionCardProps {
  app: InstalledApp;
  isSelected: boolean;
  onToggle: () => void;
}

function AppSelectionCard({ app, isSelected, onToggle }: AppSelectionCardProps) {
  const categoryColors: Record<string, string> = {
    social: 'bg-blue-100 text-blue-700',
    entertainment: 'bg-purple-100 text-purple-700',
    games: 'bg-pink-100 text-pink-700',
    productivity: 'bg-green-100 text-green-700',
    shopping: 'bg-orange-100 text-orange-700',
    news: 'bg-red-100 text-red-700',
    other: 'bg-gray-100 text-gray-700',
  };

  return (
    <div
      onClick={onToggle}
      className={`bg-white rounded-xl p-4 border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all ${
          isSelected
            ? 'bg-indigo-600 border-indigo-600'
            : 'bg-gray-100 border-gray-300'
        }`}>
          {isSelected ? (
            <Check size={20} className="text-white" />
          ) : (
            <div className="w-4 h-4 rounded border-2 border-gray-400" />
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {app.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{app.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[app.category] || categoryColors.other}`}>
            {app.category}
          </span>
        </div>
      </div>
    </div>
  );
}
