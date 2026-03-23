import { useState } from 'react';
import { FileText, Calendar, MoreVertical, Eye, Edit2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { AIDraft } from '../../../lib/guardrails/ai/aiTypes';
import {
  getDraftStatusColor,
  getDraftStatusLabel,
  getDraftTypeLabel,
  isApplicableDraft,
  canEditDraft,
  isDraftOutdated,
} from '../../../hooks/useDraftStatus';

interface DraftCardProps {
  draft: AIDraft;
  onApply?: (draft: AIDraft) => void;
  onEdit?: (draft: AIDraft) => void;
  onDiscard?: (draft: AIDraft) => void;
  onViewDetails?: (draft: AIDraft) => void;
  onViewProvenance?: (draft: AIDraft) => void;
  compact?: boolean;
}

export function DraftCard({
  draft,
  onApply,
  onEdit,
  onDiscard,
  onViewDetails,
  onViewProvenance,
  compact = false,
}: DraftCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isApplicable = isApplicableDraft(draft);
  const canEdit = canEditDraft(draft);
  const isOutdated = isDraftOutdated(draft);

  const getSourceContext = () => {
    const metadata = draft.provenance_metadata as any;
    if (!metadata) return 'Unknown context';

    const snapshot = metadata.contextSnapshot || {};
    if (snapshot.projectName) return snapshot.projectName;
    if (snapshot.trackName) return snapshot.trackName;
    if (snapshot.itemTitle) return snapshot.itemTitle;

    return 'Unknown context';
  };

  const getIntentLabel = () => {
    return draft.context_scope || 'General';
  };

  const getConfidenceColor = () => {
    const metadata = draft.provenance_metadata as any;
    const confidence = metadata?.confidenceLevel || 'medium';

    switch (confidence) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (compact) {
    return (
      <div className="p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getDraftStatusColor(draft.status)}`}>
                {getDraftStatusLabel(draft.status)}
              </span>
              <span className="text-xs text-gray-500">{getDraftTypeLabel(draft.draft_type)}</span>
            </div>
            <h4 className="font-medium text-sm text-gray-900 truncate">{draft.title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(draft.created_at)}</p>
          </div>

          {isApplicable && onApply && (
            <button
              onClick={() => onApply(draft)}
              className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full ${getDraftStatusColor(draft.status)}`}>
              {getDraftStatusLabel(draft.status)}
            </span>
            <span className="text-xs text-gray-600 font-medium">{getDraftTypeLabel(draft.draft_type)}</span>
            {isOutdated && (
              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                May be outdated
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{draft.title}</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {getSourceContext()}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatTimestamp(draft.created_at)}
            </span>
            <span className={getConfidenceColor()}>
              {(draft.provenance_metadata as any)?.confidenceLevel || 'medium'} confidence
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
                {onViewDetails && (
                  <button
                    onClick={() => {
                      onViewDetails(draft);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                )}
                {onViewProvenance && (
                  <button
                    onClick={() => {
                      onViewProvenance(draft);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    View Provenance
                  </button>
                )}
                {canEdit && onEdit && (
                  <button
                    onClick={() => {
                      onEdit(draft);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Draft
                  </button>
                )}
                {onDiscard && (
                  <button
                    onClick={() => {
                      onDiscard(draft);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2 border-t"
                  >
                    <Trash2 className="w-4 h-4" />
                    Discard
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-600 line-clamp-2">
          {typeof draft.content === 'object' && 'reasoning' in draft.content
            ? draft.content.reasoning
            : 'AI-generated content ready for review'}
        </p>
      </div>

      {isApplicable && (
        <div className="flex items-center gap-2">
          {onApply && (
            <button
              onClick={() => onApply(draft)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Apply Draft
            </button>
          )}
          {onDiscard && (
            <button
              onClick={() => onDiscard(draft)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Discard
            </button>
          )}
        </div>
      )}

      {draft.status === 'accepted' && (
        <div className="text-sm text-green-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          This draft has been applied
        </div>
      )}

      {draft.status === 'discarded' && (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          This draft has been discarded
        </div>
      )}

      {draft.status === 'partially_applied' && (
        <div className="text-sm text-purple-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Partially applied - some elements were selected
        </div>
      )}
    </div>
  );
}
