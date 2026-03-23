import { useState } from 'react';
import { FileText, Eye, Check, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Draft {
  id: string;
  title: string;
  description: string | null;
  status: string;
  entity_type: string;
  created_at: string;
}

interface ChatWidgetDraftCardProps {
  draft: Draft;
  userId: string;
}

export function ChatWidgetDraftCard({ draft, userId }: ChatWidgetDraftCardProps) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  function handleViewDraft() {
    navigate(`/guardrails/drafts/${draft.id}`);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getEntityTypeLabel(entityType: string): string {
    switch (entityType) {
      case 'track':
        return 'Track';
      case 'roadmap_item':
        return 'Roadmap Item';
      case 'project':
        return 'Project';
      case 'milestone':
        return 'Milestone';
      case 'task':
        return 'Task';
      default:
        return entityType;
    }
  }

  return (
    <div className="mt-2 border border-gray-300 rounded-lg bg-white overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-gray-700">AI Draft</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(draft.status)}`}>
            {draft.status}
          </span>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Hide' : 'Show'} details
        </button>
      </div>

      <div className="px-3 py-2">
        <div className="text-sm font-medium text-gray-900">{draft.title}</div>

        {draft.description && showDetails && (
          <div className="text-xs text-gray-600 mt-1">{draft.description}</div>
        )}

        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">{getEntityTypeLabel(draft.entity_type)}</span>
          <span>•</span>
          <span>{new Date(draft.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
        <button
          onClick={handleViewDraft}
          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center justify-center gap-1 transition-colors"
        >
          <Eye className="w-3 h-3" />
          View Draft
        </button>

        {draft.status === 'pending' && (
          <>
            <button
              onClick={handleViewDraft}
              className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center justify-center gap-1 transition-colors"
              title="View draft to apply"
            >
              <Check className="w-3 h-3" />
              Apply
            </button>

            <button
              onClick={handleViewDraft}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded flex items-center justify-center transition-colors"
              title="View draft to discard"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      <div className="px-3 py-2 bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-800">
        <strong>Note:</strong> Drafts require explicit approval. AI cannot apply changes automatically.
      </div>
    </div>
  );
}
