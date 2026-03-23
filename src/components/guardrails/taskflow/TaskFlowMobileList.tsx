/**
 * TaskFlowMobileList - Mobile-first task execution view
 * 
 * Features:
 * - Status tabs at top (Not Started | In Progress | Blocked | Done)
 * - Single vertical scroll
 * - Tasks sorted by urgency (overdue > due today > due soon > no date)
 * - Swipe actions for quick status changes
 * - Empty states for each status
 */

import { useState, useMemo } from 'react';
import type { RoadmapItem, RoadmapSection, RoadmapItemStatus } from '../../../lib/guardrailsTypes';
import { TaskFlowMobileCard } from './TaskFlowMobileCard';
import { updateRoadmapItem } from '../../../lib/guardrails';
import { showToast } from '../../Toast';
import { ItemDrawer } from '../roadmap/ItemDrawer';

interface TaskFlowMobileListProps {
  items: RoadmapItem[];
  sections: RoadmapSection[];
  onRefresh: () => void;
}

type StatusTab = RoadmapItemStatus;

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Done' },
];

const EMPTY_STATES: Record<StatusTab, { title: string; message: string }> = {
  not_started: {
    title: 'No tasks here yet',
    message: 'Tasks you haven\'t started will appear here.',
  },
  in_progress: {
    title: 'You\'re clear',
    message: 'Start a task when ready.',
  },
  blocked: {
    title: 'No blocked tasks',
    message: 'Tasks that are blocked will appear here.',
  },
  completed: {
    title: 'Completed tasks appear here',
    message: 'Finished tasks will show up in this list.',
  },
};

interface TaskUrgency {
  level: number; // 0 = overdue, 1 = due today, 2 = due soon, 3 = no date
  daysUntilDue: number | null;
}

function calculateUrgency(item: RoadmapItem): TaskUrgency {
  if (!item.end_date) {
    return { level: 3, daysUntilDue: null };
  }

  const endDate = new Date(item.end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) {
    return { level: 0, daysUntilDue }; // Overdue
  }
  if (daysUntilDue === 0) {
    return { level: 1, daysUntilDue: 0 }; // Due today
  }
  if (daysUntilDue <= 7) {
    return { level: 2, daysUntilDue }; // Due soon
  }

  return { level: 3, daysUntilDue }; // No urgency
}

function sortByUrgency(items: RoadmapItem[]): RoadmapItem[] {
  return [...items].sort((a, b) => {
    const urgencyA = calculateUrgency(a);
    const urgencyB = calculateUrgency(b);

    // First sort by urgency level (lower = more urgent)
    if (urgencyA.level !== urgencyB.level) {
      return urgencyA.level - urgencyB.level;
    }

    // Then by days until due (lower = more urgent)
    if (urgencyA.daysUntilDue !== null && urgencyB.daysUntilDue !== null) {
      return urgencyA.daysUntilDue - urgencyB.daysUntilDue;
    }

    // Items without dates go last within the same urgency level
    if (urgencyA.daysUntilDue === null) return 1;
    if (urgencyB.daysUntilDue === null) return -1;

    // Finally, sort by start date
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });
}

export function TaskFlowMobileList({ items, sections, onRefresh }: TaskFlowMobileListProps) {
  const [selectedStatus, setSelectedStatus] = useState<StatusTab>('in_progress'); // Default to In Progress
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);

  const getSectionName = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    return section?.title || 'Unknown Section';
  };

  const itemsByStatus = useMemo(() => {
    const grouped: Record<StatusTab, RoadmapItem[]> = {
      not_started: [],
      in_progress: [],
      blocked: [],
      completed: [],
    };

    items.forEach((item) => {
      if (item.status in grouped) {
        grouped[item.status as StatusTab].push(item);
      }
    });

    // Sort each group by urgency
    Object.keys(grouped).forEach((key) => {
      grouped[key as StatusTab] = sortByUrgency(grouped[key as StatusTab]);
    });

    return grouped;
  }, [items]);

  const currentItems = itemsByStatus[selectedStatus];

  const handleStatusChange = async (itemId: string, newStatus: RoadmapItemStatus) => {
    try {
      await updateRoadmapItem(itemId, { status: newStatus });
      showToast('success', 'Task status updated');
      onRefresh();
    } catch (error) {
      console.error('Failed to update task status:', error);
      showToast('error', 'Failed to update task status');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Status Tabs - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max">
            {STATUS_TABS.map((tab) => {
              const count = itemsByStatus[tab.value].length;
              const isActive = selectedStatus === tab.value;

              return (
                <button
                  key={tab.value}
                  onClick={() => setSelectedStatus(tab.value)}
                  className={`relative px-6 py-4 text-sm font-medium transition-colors min-h-[56px] flex items-center gap-2 border-b-2 ${
                    isActive
                      ? 'text-blue-600 border-blue-600 bg-blue-50'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-4">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {EMPTY_STATES[selectedStatus].title}
              </h3>
              <p className="text-sm text-gray-600">
                {EMPTY_STATES[selectedStatus].message}
              </p>
            </div>
          </div>
        ) : (
          currentItems.map((item) => (
            <TaskFlowMobileCard
              key={item.id}
              item={item}
              sectionName={getSectionName(item.section_id)}
              onStatusChange={handleStatusChange}
              onClick={() => setSelectedItem(item)}
            />
          ))
        )}
      </div>

      {/* Item Detail Bottom Sheet */}
      {selectedItem && (
        <ItemDrawer
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={onRefresh}
        />
      )}
    </div>
  );
}

