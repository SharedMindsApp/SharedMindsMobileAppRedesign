/**
 * Workspace Reference Preview
 * 
 * Component for displaying preview of referenced items
 */

import { useState, useEffect } from 'react';
import { ExternalLink, Calendar, CheckSquare, Target, FileText, Link as LinkIcon, Loader2, AlertCircle } from 'lucide-react';
import type { WorkspaceReferenceType, ReferenceUnitContent } from '../../../lib/workspace/types';
import { resolveReference, getReferenceRoute, type ReferencePreview } from '../../../lib/workspace/referenceService';
import { useNavigate } from 'react-router-dom';

interface WorkspaceReferencePreviewProps {
  content: ReferenceUnitContent;
  onNavigate?: () => void;
}

export function WorkspaceReferencePreview({ content, onNavigate }: WorkspaceReferencePreviewProps) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ReferencePreview>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreview();
  }, [content.reference_type, content.reference_id, content.reference_url]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const resolved = await resolveReference(
        content.reference_type,
        content.reference_id,
        content.reference_url
      );
      setPreview(resolved);
    } catch (err) {
      console.error('Failed to load reference preview:', err);
      setError('Failed to load reference');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = () => {
    let route = getReferenceRoute(
      content.reference_type,
      content.reference_id,
      content.reference_url
    );

    // For page references, construct the full route using space_id from preview
    if ((content.reference_type === 'page' || content.reference_type === 'workspace') && preview && 'space_id' in preview) {
      route = `/spaces/${preview.space_id}/pages/${content.reference_id}`;
    }

    if (route) {
      if (content.reference_type === 'url' || route.startsWith('http')) {
        window.open(route, '_blank', 'noopener,noreferrer');
      } else {
        navigate(route);
      }
      if (onNavigate) {
        onNavigate();
      }
    }
  };

  const getTypeIcon = () => {
    switch (content.reference_type) {
      case 'planner_event':
        return <Calendar size={16} className="text-blue-600" />;
      case 'guardrails_task':
        return <CheckSquare size={16} className="text-purple-600" />;
      case 'guardrails_roadmap':
        return <Target size={16} className="text-indigo-600" />;
      case 'goal':
        return <Target size={16} className="text-green-600" />;
      case 'workspace': // Legacy
      case 'page':
        return <FileText size={16} className="text-slate-600" />;
      case 'widget':
        return <FileText size={16} className="text-amber-600" />;
      case 'url':
        return <LinkIcon size={16} className="text-gray-600" />;
      default:
        return <LinkIcon size={16} className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading reference...</span>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
        <AlertCircle size={14} />
        <span>{error || 'Reference not found'}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleNavigate}
      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getTypeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 group-hover:text-slate-700">
              {content.display_text || (preview as any).title || 'Untitled'}
            </span>
            <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
          </div>
          {preview && 'description' in preview && preview.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{preview.description}</p>
          )}
          {preview && 'date' in preview && preview.date && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(preview.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
          {preview && 'status' in preview && preview.status && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
              {preview.status}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
