import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Calendar, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WidgetWithLayout, TaskContent, SizeMode } from '../../../lib/fridgeBoardTypes';
import { supabase } from '../../../lib/supabase';
import { deriveTaskStatus, getTaskStatusDisplay } from '../../../lib/taskEventViewModel';

interface TaskWidgetProps {
  widget: WidgetWithLayout;
  sizeMode: SizeMode;
  highContrast?: boolean;
}

export function TaskWidget({ widget, sizeMode, highContrast }: TaskWidgetProps) {
  const content = widget.content as TaskContent;
  const navigate = useNavigate();
  const [guardrailsContext, setGuardrailsContext] = useState<{
    projectName: string;
    trackName: string;
    status: string;
  } | null>(null);

  const isGuardrailsLinked = widget.linked_guardrail_type === 'roadmap_item' && widget.linked_guardrail_target_id;

  useEffect(() => {
    if (!isGuardrailsLinked) {
      setGuardrailsContext(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Fetch roadmap item with track and project info
        const { data: roadmapItem, error: itemError } = await supabase
          .from('roadmap_items')
          .select(`
            id,
            status,
            track_id,
            guardrails_tracks!inner(
              id,
              name,
              master_project_id,
              master_projects!inner(
                id,
                name
              )
            )
          `)
          .eq('id', widget.linked_guardrail_target_id!)
          .maybeSingle();

        if (cancelled) return;

        if (itemError || !roadmapItem) {
          console.error('Failed to fetch roadmap item:', itemError);
          return;
        }

        const track = roadmapItem.guardrails_tracks as any;
        const project = track?.master_projects as any;

        setGuardrailsContext({
          projectName: project?.name || 'Unknown Project',
          trackName: track?.name || 'Unknown Track',
          status: roadmapItem.status || 'not_started',
        });
      } catch (err) {
        console.error('Error fetching guardrails context:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGuardrailsLinked, widget.linked_guardrail_target_id]);

  if (sizeMode === 'icon') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {content.completed ? (
          <CheckCircle size={28} className={highContrast ? 'text-white' : 'text-green-600'} />
        ) : (
          <Circle size={28} className={highContrast ? 'text-white' : 'text-gray-600'} />
        )}
      </div>
    );
  }

  if (sizeMode === 'mini') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          {content.completed ? (
            <CheckCircle size={16} className={highContrast ? 'text-white' : 'text-green-600'} />
          ) : (
            <Circle size={16} className={highContrast ? 'text-white' : 'text-gray-600'} />
          )}
          <h3
            className={`font-semibold text-xs truncate ${
              highContrast ? 'text-white' : 'text-gray-900'
            } ${content.completed ? 'line-through opacity-60' : ''}`}
          >
            {widget.title}
          </h3>
        </div>
        <p
          className={`text-xs line-clamp-3 ${
            highContrast ? 'text-gray-300' : 'text-gray-700'
          } ${content.completed ? 'line-through opacity-60' : ''}`}
        >
          {content.description}
        </p>
        {content.dueDate && (
          <div className="mt-auto pt-2">
            <div className={`text-xs flex items-center gap-1 ${
              highContrast ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Calendar size={12} />
              {new Date(content.dueDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        {content.completed ? (
          <CheckCircle size={20} className={highContrast ? 'text-white' : 'text-green-600'} />
        ) : (
          <Circle size={20} className={highContrast ? 'text-white' : 'text-gray-600'} />
        )}
        <h3
          className={`font-bold text-sm ${
            highContrast ? 'text-white' : 'text-gray-900'
          } ${content.completed ? 'line-through opacity-60' : ''}`}
        >
          {widget.title}
        </h3>
      </div>

      {/* Guardrails Context Banner */}
      {isGuardrailsLinked && guardrailsContext && (
        <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-purple-900 mb-1">
                Part of Guardrails Project
              </p>
              <div className="text-xs text-purple-700 space-y-0.5">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Project:</span>
                  <span className="truncate">{guardrailsContext.projectName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Track:</span>
                  <span className="truncate">{guardrailsContext.trackName}</span>
                </div>
              </div>
              {(() => {
                const status = deriveTaskStatus(guardrailsContext.status);
                const display = getTaskStatusDisplay(status);
                return (
                  <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${display.bgColor} ${display.color} border ${display.borderColor} mt-1`}>
                    <span>{display.icon}</span>
                    <span className="font-medium text-[10px]">{display.label}</span>
                  </div>
                );
              })()}
            </div>
            <button
              onClick={() => navigate('/guardrails/taskflow')}
              className="flex-shrink-0 p-1 hover:bg-purple-100 rounded transition-colors"
              title="View in Task Flow"
            >
              <ExternalLink size={14} className="text-purple-600" />
            </button>
          </div>
          <p className="text-xs text-purple-600 mt-2 italic">
            Read-only reference. Edit in Task Flow.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <p
          className={`text-sm leading-relaxed ${
            highContrast ? 'text-gray-300' : 'text-gray-700'
          } ${content.completed ? 'line-through opacity-60' : ''}`}
        >
          {content.description}
        </p>
      </div>
      {content.dueDate && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <div className={`text-sm flex items-center gap-2 ${
            highContrast ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Calendar size={16} />
            Due: {new Date(content.dueDate).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}
