import { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, CheckCircle2, Clock, Target } from 'lucide-react';
import { getAssignedRoadmapItemsForPerson } from '../../../lib/guardrails/assignmentService';
import { computeDeadlineMeta } from '../../../lib/guardrails/roadmapService';
import type { Person, RoadmapItem, DeadlineMeta } from '../../../lib/guardrails';

interface PersonAssignmentsDrawerProps {
  person: Person;
  onClose: () => void;
}

interface RoadmapItemWithMeta extends RoadmapItem {
  deadlineMeta?: DeadlineMeta;
}

export function PersonAssignmentsDrawer({ person, onClose }: PersonAssignmentsDrawerProps) {
  const [items, setItems] = useState<RoadmapItemWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, [person.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  async function loadAssignments() {
    setLoading(true);
    try {
      const assignedItems = await getAssignedRoadmapItemsForPerson(person.id);

      const itemsWithMeta = await Promise.all(
        assignedItems.map(async (item) => {
          const meta = await computeDeadlineMeta(item);
          return { ...item, deadlineMeta: meta };
        })
      );

      setItems(itemsWithMeta);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50';
      case 'blocked':
        return 'text-red-600 bg-red-50';
      case 'not_started':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'blocked':
        return 'Blocked';
      case 'not_started':
        return 'Not Started';
      default:
        return status;
    }
  }

  function getDeadlineStateColor(state?: string): string {
    switch (state) {
      case 'overdue':
        return 'text-red-600';
      case 'due_soon':
        return 'text-amber-600';
      case 'on_track':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  }

  function getDeadlineStateIcon(state?: string) {
    switch (state) {
      case 'overdue':
        return <AlertCircle size={14} />;
      case 'due_soon':
        return <Clock size={14} />;
      case 'on_track':
        return <CheckCircle2 size={14} />;
      default:
        return <Calendar size={14} />;
    }
  }

  function formatDate(dateString?: string): string {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{person.name}</h2>
            <p className="text-sm text-gray-600 mt-1">Assignment Overview</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-600">Loading assignments...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Target size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No roadmap items assigned</p>
              <p className="text-sm text-gray-500 mt-2">
                This person is not currently assigned to any tasks.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Assigned Items ({items.length})
                </h3>
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        item.status
                      )}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar size={14} />
                      <span>Start: {formatDate(item.startDate)}</span>
                    </div>
                    {item.deadlineMeta && item.deadlineMeta.effectiveDeadline && (
                      <div
                        className={`flex items-center gap-1 font-medium ${getDeadlineStateColor(
                          item.deadlineMeta.deadlineState
                        )}`}
                      >
                        {getDeadlineStateIcon(item.deadlineMeta.deadlineState)}
                        <span>
                          Due: {formatDate(item.deadlineMeta.effectiveDeadline)}
                        </span>
                        {item.deadlineMeta.daysUntilDeadline !== undefined && (
                          <span className="text-xs">
                            ({item.deadlineMeta.daysUntilDeadline > 0 ? '+' : ''}
                            {item.deadlineMeta.daysUntilDeadline} days)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {item.deadlineMeta?.hasExtensions && (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <Clock size={12} />
                      <span>Deadline extended</span>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      Type: <span className="font-medium">{item.type}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
