import { useState } from 'react';
import { X, Filter, RefreshCw } from 'lucide-react';
import { useAIDrafts } from '../../../hooks/useAIDrafts';
import { DraftCard } from './DraftCard';
import { DraftApplyModal } from './DraftApplyModal';
import type { AIDraft, DraftStatus } from '../../../lib/guardrails/ai/aiTypes';
import { getDraftTypeLabel } from '../../../hooks/useDraftStatus';

interface DraftDrawerProps {
  userId: string;
  projectId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDraftApplied?: (draft: AIDraft) => void;
}

export function DraftDrawer({
  userId,
  projectId,
  isOpen,
  onClose,
  onDraftApplied,
}: DraftDrawerProps) {
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [selectedDraft, setSelectedDraft] = useState<AIDraft | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const statusOptions: (DraftStatus | 'all')[] = [
    'all',
    'generated',
    'edited',
    'partially_applied',
    'accepted',
    'discarded',
  ];

  const typeOptions = [
    'all',
    'roadmap_item',
    'task_list',
    'checklist',
    'timeline',
    'summary',
    'analysis',
    'risk_analysis',
  ];

  const { drafts, loading, error, refresh } = useAIDrafts({
    userId,
    projectId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    draftType: typeFilter === 'all' ? undefined : typeFilter,
  });

  const handleApply = (draft: AIDraft) => {
    setSelectedDraft(draft);
    setShowApplyModal(true);
  };

  const handleApplySuccess = () => {
    setShowApplyModal(false);
    setSelectedDraft(null);
    refresh();
    if (onDraftApplied && selectedDraft) {
      onDraftApplied(selectedDraft);
    }
  };

  const handleDiscard = async (draft: AIDraft) => {
    if (!confirm('Are you sure you want to discard this draft? This action cannot be undone.')) {
      return;
    }

    const { discardDraft } = await import('../../../lib/guardrails/ai/aiDraftService');
    const result = await discardDraft(draft.id, userId);

    if (result.success) {
      refresh();
    }
  };

  const sortedDrafts = [...drafts].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      const statusOrder: Record<string, number> = {
        generated: 0,
        edited: 1,
        partially_applied: 2,
        accepted: 3,
        discarded: 4,
      };
      return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
    }
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Drafts</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and apply AI-generated suggestions
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            <button
              onClick={refresh}
              className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DraftStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : getDraftTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('date')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  sortBy === 'date'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Date
              </button>
              <button
                onClick={() => setSortBy('status')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  sortBy === 'status'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Status
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12 text-gray-500">
              Loading drafts...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && sortedDrafts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <Filter className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No drafts found</h3>
              <p className="text-sm text-gray-600">
                {statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'AI-generated drafts will appear here'}
              </p>
            </div>
          )}

          {!loading && !error && sortedDrafts.length > 0 && (
            <div className="space-y-4">
              {sortedDrafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onApply={handleApply}
                  onDiscard={handleDiscard}
                  onViewDetails={(d) => {
                    setSelectedDraft(d);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{sortedDrafts.length} draft{sortedDrafts.length !== 1 ? 's' : ''}</span>
            <span>
              {sortedDrafts.filter((d) => d.status === 'generated' || d.status === 'edited').length} pending
            </span>
          </div>
        </div>
      </div>

      {showApplyModal && selectedDraft && (
        <DraftApplyModal
          draft={selectedDraft}
          userId={userId}
          onClose={() => {
            setShowApplyModal(false);
            setSelectedDraft(null);
          }}
          onSuccess={handleApplySuccess}
          targetProjectId={projectId || undefined}
        />
      )}
    </>
  );
}
