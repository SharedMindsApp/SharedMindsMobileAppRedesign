import { Calendar, Circle, CheckCircle, AlertCircle, PauseCircle } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';
import type { RoadmapItem } from '../../../lib/guardrailsTypes';
import { formatDateRange } from '../../../lib/ganttUtils';
import { supabase } from '../../../lib/supabase';
import {
  deriveTaskStatus,
  deriveEventStatus,
  getTaskStatusDisplay,
  getEventStatusDisplay,
  getTypeDisplay,
  getSourceLabel,
} from '../../../lib/taskEventViewModel';

interface TaskFlowCardProps {
  item: RoadmapItem;
  sectionName: string;
  onClick: () => void;
  trackName?: string | null;
  subtrackName?: string | null;
}

const statusIcons = {
  not_started: Circle,
  in_progress: PauseCircle,
  blocked: AlertCircle,
  completed: CheckCircle,
};

const statusColors = {
  not_started: 'text-gray-400',
  in_progress: 'text-blue-500',
  blocked: 'text-red-500',
  completed: 'text-green-500',
};

export function TaskFlowCard({ item, sectionName, onClick, trackName, subtrackName }: TaskFlowCardProps) {
  const [sideProjectName, setSideProjectName] = useState<string | null>(null);
  const [createdInMindMesh, setCreatedInMindMesh] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  useEffect(() => {
    if (item.side_project_id) {
      supabase
        .from('side_projects')
        .select('title')
        .eq('id', item.side_project_id)
        .single()
        .then(({ data }) => {
          if (data) setSideProjectName(data.title);
        });
    }
  }, [item.side_project_id]);

  useEffect(() => {
    // Check if this item was created in Mind Mesh
    supabase
      .from('mindmesh_containers')
      .select('id')
      .eq('entity_type', 'roadmap_item')
      .eq('entity_id', item.id)
      .maybeSingle()
      .then(({ data }) => {
        setCreatedInMindMesh(!!data);
      });
  }, [item.id]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeftColor: item.color || '#3b82f6',
    borderLeftWidth: '4px',
  };

  const StatusIcon = statusIcons[item.status];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border-2 p-3 shadow-sm hover:shadow-md transition-all cursor-move relative ${
        isDragging ? 'shadow-lg' : ''
      }`}
      onClick={(e) => {
        if (!isDragging) {
          onClick();
        }
      }}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {item.side_project_id && (
          <div className="group relative">
            <div className="w-3 h-3 bg-purple-500 rounded-full cursor-help"></div>
            <div className="absolute right-0 top-6 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
              Side Project: {sideProjectName || 'Loading...'}
            </div>
          </div>
        )}
        {item.is_offshoot && (
          <div className="group relative">
            <div className="w-3 h-3 bg-amber-500 rounded-full cursor-help"></div>
            <div className="absolute right-0 top-6 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
              Offshoot Idea
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 mb-2 pr-8">
        <div className="flex-1">
          {/* Type & Source Badge */}
          <div className="flex items-center gap-1.5 mb-1">
            {item.type === 'task' ? (
              <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                <span>✓</span>
                <span>Task</span>
              </span>
            ) : item.type === 'event' ? (
              <span className="text-xs text-orange-600 font-medium flex items-center gap-0.5">
                <span>📅</span>
                <span>Event</span>
              </span>
            ) : null}
            {createdInMindMesh && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-purple-600 font-medium">
                  {getSourceLabel(true)}
                </span>
              </>
            )}
          </div>
          <h4 className="font-semibold text-sm text-gray-900 leading-tight">
            {item.title}
          </h4>
        </div>
        {/* Use consistent status display */}
        {item.type === 'task' ? (() => {
          const status = deriveTaskStatus(item.status);
          const display = getTaskStatusDisplay(status);
          return (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${display.bgColor} ${display.color} border ${display.borderColor} flex-shrink-0`}>
              <span>{display.icon}</span>
              <span className="font-medium text-[10px]">{display.label}</span>
            </div>
          );
        })() : item.type === 'event' && item.metadata?.startsAt ? (() => {
          const status = deriveEventStatus(
            item.metadata.startsAt,
            item.metadata.endsAt || item.end_date
          );
          const display = getEventStatusDisplay(status);
          return (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${display.bgColor} ${display.color} border ${display.borderColor} flex-shrink-0`}>
              <span>{display.icon}</span>
              <span className="font-medium text-[10px]">{display.label}</span>
            </div>
          );
        })() : (
          <StatusIcon size={16} className={statusColors[item.status]} />
        )}
      </div>

      {item.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {trackName && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${item.color || '#3b82f6'}20`,
                color: item.color || '#3b82f6',
              }}
            >
              {trackName}
            </span>
            {subtrackName && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                {subtrackName}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Section:</span>
          <span className="text-xs text-gray-700">{sectionName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar size={12} />
          <span>{formatDateRange(item.start_date, item.end_date)}</span>
        </div>
      </div>
    </div>
  );
}
