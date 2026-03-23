/**
 * Skill Timeline Component
 * 
 * Read-only timeline of events related to a skill.
 * Observational only - no controls, no nudges.
 */

import { useState, useEffect } from 'react';
import { Clock, Target, BookOpen, FolderKanban, Calendar, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSkillTimeline, type TimelineItem } from '../../lib/skills/skillTimelineService';

interface SkillTimelineProps {
  skillId: string;
  contextId?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  isReadOnly?: boolean; // If true, timeline is read-only (external viewer)
}

const ENTITY_ICONS = {
  habit_checkin: Target,
  goal_milestone: BookOpen,
  project_activity: FolderKanban,
  calendar_event: Calendar,
  context_change: Settings,
};

const ENTITY_LABELS: Record<TimelineItem['entity_type'], string> = {
  habit_checkin: 'Habit Check-in',
  goal_milestone: 'Goal Milestone',
  project_activity: 'Project Activity',
  calendar_event: 'Calendar Event',
  context_change: 'Context Change',
};

export function SkillTimeline({ skillId, contextId, isOpen: controlledOpen, onToggle, isReadOnly = false }: SkillTimelineProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedContextFilter, setSelectedContextFilter] = useState<string | 'all'>('all');

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleToggle = onToggle || (() => setInternalOpen(!internalOpen));

  useEffect(() => {
    if (user && skillId && isOpen) {
      loadTimeline();
    }
  }, [user, skillId, contextId, isOpen]);

  const loadTimeline = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const timelineItems = await getSkillTimeline(user.id, skillId, contextId);
      setItems(timelineItems);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique contexts for filtering
  const availableContexts = Array.from(
    new Set(items.map(item => item.context_id).filter(Boolean))
  ) as string[];

  // Filter items by context
  const filteredItems = selectedContextFilter === 'all'
    ? items
    : items.filter(item => item.context_id === selectedContextFilter);

  // Group items by date
  const groupedByDate = filteredItems.reduce((acc, item) => {
    const date = new Date(item.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, TimelineItem[]>);

  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border border-gray-200 rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Timeline</span>
          {items.length > 0 && (
            <span className="text-xs text-gray-500">({items.length} events)</span>
          )}
        </div>
        <ChevronDown size={16} className="text-gray-400" />
      </button>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Timeline</span>
          {items.length > 0 && (
            <span className="text-xs text-gray-500">({items.length} events)</span>
          )}
        </div>
        <ChevronUp size={16} className="text-gray-400" />
      </button>

      <div className="p-4">
        {loading ? (
          <div className="text-sm text-gray-500 text-center py-4">Loading timeline...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            No timeline events found
          </div>
        ) : (
          <>
            {/* Context Filter (disabled in read-only mode) */}
            {availableContexts.length > 1 && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by Context
                </label>
                <select
                  value={selectedContextFilter}
                  onChange={(e) => setSelectedContextFilter(e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isReadOnly ? 'bg-gray-50 cursor-not-allowed opacity-75' : ''
                  }`}
                >
                  <option value="all">All Contexts</option>
                  {availableContexts.map(ctxId => (
                    <option key={ctxId} value={ctxId}>
                      Context {ctxId.substring(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Timeline Items */}
            <div className="space-y-4">
              {Object.entries(groupedByDate).map(([date, dateItems]) => (
                <div key={date}>
                  <div className="text-xs font-medium text-gray-500 mb-2">{date}</div>
                  <div className="space-y-2 ml-4 border-l-2 border-gray-200 pl-4">
                    {dateItems.map(item => {
                      const Icon = ENTITY_ICONS[item.entity_type];
                      return (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 py-2 rounded-lg px-2 -ml-2 ${
                            isReadOnly ? '' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="mt-0.5">
                            <Icon size={16} className="text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900">{item.label}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {ENTITY_LABELS[item.entity_type]}
                              </span>
                              {item.context_type && (
                                <>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500 capitalize">
                                    {item.context_type}
                                  </span>
                                </>
                              )}
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {new Date(item.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {item.metadata?.notes && (
                              <p className="text-xs text-gray-600 mt-1 italic">
                                "{item.metadata.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

