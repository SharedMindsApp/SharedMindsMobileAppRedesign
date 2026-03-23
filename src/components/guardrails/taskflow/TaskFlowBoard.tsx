import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Info, ArrowUpDown, AlertTriangle } from 'lucide-react';
import type { RoadmapItem, RoadmapSection, RoadmapItemStatus } from '../../../lib/guardrailsTypes';
import { TaskFlowCard } from './TaskFlowCard';
import { ItemDrawer } from '../roadmap/ItemDrawer';
import { updateRoadmapItem } from '../../../lib/guardrails';
import { useForegroundTriggers } from '../../../contexts/ForegroundTriggersContext';

interface TaskFlowBoardProps {
  items: RoadmapItem[];
  sections: RoadmapSection[];
  onRefresh: () => void;
}

type ColumnId = 'not_started' | 'in_progress' | 'blocked' | 'completed';

const columns: Array<{
  id: ColumnId;
  title: string;
  description: string;
  color: string;
}> = [
  {
    id: 'not_started',
    title: 'Not Started',
    description: 'Tasks that are planned but not yet begun',
    color: 'bg-gray-100',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    description: 'Tasks currently being worked on',
    color: 'bg-blue-100',
  },
  {
    id: 'blocked',
    title: 'Blocked',
    description: 'Tasks that are stuck or waiting',
    color: 'bg-red-100',
  },
  {
    id: 'completed',
    title: 'Completed',
    description: 'Tasks that are finished',
    color: 'bg-green-100',
  },
];

type SortOption = 'date' | 'section';

export function TaskFlowBoard({ items, sections, onRefresh }: TaskFlowBoardProps) {
  const { emitContextEvent } = useForegroundTriggers();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showMultiInProgressWarning, setShowMultiInProgressWarning] = useState(false);
  const [showBlockedWarning, setShowBlockedWarning] = useState(false);
  const [lastDragTime, setLastDragTime] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const getSectionName = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    return section?.title || 'Unknown Section';
  };

  const sortItems = (itemsToSort: RoadmapItem[]) => {
    if (sortBy === 'date') {
      return [...itemsToSort].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
    } else {
      return [...itemsToSort].sort((a, b) => {
        const sectionA = getSectionName(a.section_id);
        const sectionB = getSectionName(b.section_id);
        return sectionA.localeCompare(sectionB);
      });
    }
  };

  const itemsByStatus = useMemo(() => {
    const grouped: Record<ColumnId, RoadmapItem[]> = {
      not_started: [],
      in_progress: [],
      blocked: [],
      completed: [],
    };

    items.forEach((item) => {
      if (item.status in grouped) {
        grouped[item.status as ColumnId].push(item);
      }
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key as ColumnId] = sortItems(grouped[key as ColumnId]);
    });

    return grouped;
  }, [items, sortBy]);

  useEffect(() => {
    const inProgressCount = itemsByStatus.in_progress.length;
    if (inProgressCount > 1) {
      setShowMultiInProgressWarning(true);
    } else {
      setShowMultiInProgressWarning(false);
    }
  }, [itemsByStatus.in_progress.length]);

  useEffect(() => {
    const blockedItems = itemsByStatus.blocked;
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const oldBlockedItems = blockedItems.filter((item) => {
      return new Date(item.updated_at) < twoDaysAgo;
    });

    setShowBlockedWarning(oldBlockedItems.length > 0);
  }, [itemsByStatus.blocked]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const itemId = active.id as string;
    const newStatus = over.id as RoadmapItemStatus;

    const item = items.find((i) => i.id === itemId);
    if (!item) {
      setActiveId(null);
      return;
    }

    if (item.status === newStatus) {
      setActiveId(null);
      return;
    }

    const now = Date.now();
    if (now - lastDragTime < 500) {
      setActiveId(null);
      return;
    }
    setLastDragTime(now);

    try {
      await updateRoadmapItem(itemId, { status: newStatus });

      if (newStatus === 'completed' && item.status !== 'completed') {
        emitContextEvent('task_completed');
      }

      onRefresh();
    } catch (error) {
      console.error('Failed to update item status:', error);
      alert('Failed to update task status. Please try again.');
    }

    setActiveId(null);
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {showMultiInProgressWarning && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-yellow-600" />
            <p className="text-sm text-yellow-900">
              Try focusing on one active task at a time. Want to pick a priority?
            </p>
          </div>
        </div>
      )}

      {showBlockedWarning && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <p className="text-sm text-red-900">
              Some tasks have been blocked for a while. Let's review them in Focus Mode.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Task Flow</h2>
        <button
          onClick={() => setSortBy(sortBy === 'date' ? 'section' : 'date')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowUpDown size={16} />
          Sort by: {sortBy === 'date' ? 'Date' : 'Section'}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="h-full flex gap-4 p-6 min-w-max">
            {columns.map((column) => (
              <SortableContext
                key={column.id}
                id={column.id}
                items={itemsByStatus[column.id].map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col w-80 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className={`${column.color} px-4 py-3 rounded-t-lg border-b border-gray-200`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900">{column.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 bg-white px-2 py-0.5 rounded-full">
                          {itemsByStatus[column.id].length}
                        </span>
                        <div className="relative group">
                          <Info size={16} className="text-gray-500 cursor-help" />
                          <div className="absolute right-0 top-6 hidden group-hover:block z-10 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg">
                            {column.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
                    {itemsByStatus[column.id].length === 0 ? (
                      <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-400">No tasks here yet.</p>
                      </div>
                    ) : (
                      itemsByStatus[column.id].map((item) => (
                        <TaskFlowCard
                          key={item.id}
                          item={item}
                          sectionName={getSectionName(item.section_id)}
                          onClick={() => setSelectedItem(item)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </SortableContext>
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeItem && (
            <div className="rotate-3">
              <TaskFlowCard
                item={activeItem}
                sectionName={getSectionName(activeItem.section_id)}
                onClick={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
