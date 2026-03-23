import { useState, useEffect } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import type { AIDraft } from '../../../lib/guardrails/ai/aiTypes';

interface PartialApplySelectorProps {
  draft: AIDraft;
  onSelectionChange: (selectedIds: string[]) => void;
  initialSelection?: string[];
}

export function PartialApplySelector({
  draft,
  onSelectionChange,
  initialSelection = [],
}: PartialApplySelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);

  useEffect(() => {
    onSelectionChange(selectedIds);
  }, [selectedIds, onSelectionChange]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allIds = getElementIds();
    setSelectedIds(allIds);
  };

  const selectNone = () => {
    setSelectedIds([]);
  };

  const getElementIds = (): string[] => {
    const content = draft.content as any;

    if (draft.draft_type === 'task_list' && content.tasks) {
      return content.tasks.map((_: any, idx: number) => String(idx));
    }

    if (draft.draft_type === 'checklist' && content.items) {
      return content.items.map((_: any, idx: number) => String(idx));
    }

    if (draft.draft_type === 'timeline' && content.phases) {
      return content.phases.map((_: any, idx: number) => String(idx));
    }

    return [];
  };

  const renderElements = () => {
    const content = draft.content as any;

    if (draft.draft_type === 'task_list' && content.tasks) {
      return (
        <div className="space-y-2">
          {content.tasks.map((task: any, idx: number) => {
            const id = String(idx);
            const isSelected = selectedIds.includes(id);

            return (
              <div
                key={id}
                onClick={() => toggleSelection(id)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {task.estimatedDuration && (
                        <span>{task.estimatedDuration}d duration</span>
                      )}
                      {task.priority && (
                        <span className={`px-2 py-0.5 rounded ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (draft.draft_type === 'checklist' && content.items) {
      return (
        <div className="space-y-2">
          {content.items.map((item: any, idx: number) => {
            const id = String(idx);
            const isSelected = selectedIds.includes(id);

            return (
              <div
                key={id}
                onClick={() => toggleSelection(id)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="flex-1 text-gray-900">{item.text}</span>
                  {item.priority && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : item.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.priority}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (draft.draft_type === 'timeline' && content.phases) {
      return (
        <div className="space-y-2">
          {content.phases.map((phase: any, idx: number) => {
            const id = String(idx);
            const isSelected = selectedIds.includes(id);

            return (
              <div
                key={id}
                onClick={() => toggleSelection(id)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{phase.title}</h4>
                    {phase.description && (
                      <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                    )}
                    {phase.duration && (
                      <p className="text-xs text-gray-500 mt-2">{phase.duration}d duration</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="text-center text-gray-500 py-8">
        This draft type does not support partial application
      </div>
    );
  };

  const allElementIds = getElementIds();
  const canSelectPartial = allElementIds.length > 0;

  if (!canSelectPartial) {
    return (
      <div className="text-center text-gray-500 py-8">
        This draft must be applied in full or discarded
      </div>
    );
  }

  const allSelected = selectedIds.length === allElementIds.length;
  const noneSelected = selectedIds.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {selectedIds.length} of {allElementIds.length} selected
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            disabled={allSelected}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            disabled={noneSelected}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>

      {renderElements()}

      {noneSelected && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Select at least one element to apply
        </div>
      )}
    </div>
  );
}
