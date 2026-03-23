/**
 * Tracker Relationship Suggestion Component
 * 
 * Shows when a habit has a corresponding detailed tracker,
 * explains the difference, and offers sync options.
 */

import { useState, useEffect } from 'react';
import { Link, Info, ExternalLink, Check, X as XIcon } from 'lucide-react';
import { getTrackerForHabit, getTrackerRelationshipInfo, type TrackerRelationshipInfo } from '../../lib/trackerStudio/habitTrackerMappings';
import { listTemplates } from '../../lib/trackerStudio/trackerTemplateService';
import { listTrackers } from '../../lib/trackerStudio/trackerService';
import type { TrackerTemplate, Tracker } from '../../lib/trackerStudio/types';

interface TrackerRelationshipSuggestionProps {
  habitName: string;
  onSyncToDetailed?: (trackerId: string) => void;
  className?: string;
}

export function TrackerRelationshipSuggestion({
  habitName,
  onSyncToDetailed,
  className = '',
}: TrackerRelationshipSuggestionProps) {
  const [relationshipInfo, setRelationshipInfo] = useState<TrackerRelationshipInfo | null>(null);
  const [detailedTracker, setDetailedTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  useEffect(() => {
    async function loadRelationshipInfo() {
      if (!habitName) {
        setRelationshipInfo(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get tracker template name for this habit
        const trackerTemplateName = getTrackerForHabit(habitName);
        
        if (!trackerTemplateName) {
          setRelationshipInfo(null);
          setLoading(false);
          return;
        }

        // Load all templates to find the matching one
        const templates = await listTemplates();
        const template = templates.find(t => t.name === trackerTemplateName);
        
        if (!template) {
          setRelationshipInfo(null);
          setLoading(false);
          return;
        }

        // Get relationship info
        const info = getTrackerRelationshipInfo(habitName, template);
        setRelationshipInfo(info);

        // Check if user has an instance of this tracker
        const userTrackers = await listTrackers();
        const trackerInstance = userTrackers.find(
          t => t.name.toLowerCase() === trackerTemplateName.toLowerCase()
        );
        
        setDetailedTracker(trackerInstance || null);
      } catch (err) {
        console.error('Failed to load tracker relationship:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRelationshipInfo();
  }, [habitName]);

  if (loading || !relationshipInfo || !relationshipInfo.trackerName) {
    return null;
  }

  const hasTrackerInstance = !!detailedTracker;

  return (
    <div className={`bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0 mt-0.5">
          <Info size={16} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Detailed Tracker Available: {relationshipInfo.trackerName}
            </h3>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
            >
              {expanded ? 'Less' : 'Learn More'}
            </button>
          </div>
          
          {expanded && (
            <div className="space-y-3 mt-3 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900 mb-1">Habit Tracker:</p>
                <p className="text-gray-700">{relationshipInfo.purpose.habitTracker}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Detailed Tracker:</p>
                <p className="text-gray-700">{relationshipInfo.purpose.detailedTracker}</p>
              </div>
              
              {hasTrackerInstance && relationshipInfo.syncOption && (
                <div className="bg-white rounded-lg p-3 border border-blue-200 mt-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncEnabled}
                      onChange={(e) => {
                        setSyncEnabled(e.target.checked);
                        if (e.target.checked && detailedTracker && onSyncToDetailed) {
                          onSyncToDetailed(detailedTracker.id);
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Also log to {relationshipInfo.trackerName}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Automatically sync this habit entry to your detailed tracker
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {hasTrackerInstance && (
                <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                  <Link size={14} className="text-blue-600" />
                  <a
                    href={`/tracker/${detailedTracker!.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    Open {relationshipInfo.trackerName}
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {!hasTrackerInstance && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                  <p className="text-xs text-amber-800">
                    💡 You don't have a "{relationshipInfo.trackerName}" instance yet. 
                    Create one from the Tracker Studio to get detailed insights.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
