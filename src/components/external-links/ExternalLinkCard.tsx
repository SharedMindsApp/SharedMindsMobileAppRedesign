import { useState } from 'react';
import { ExternalLink, Video, FileText, MessageCircle, BookOpen, UtensilsCrossed, Link2, Trash2, Edit3, Tag, AlertTriangle } from 'lucide-react';
import { ExternalLinkWithTags } from '../../lib/externalLinksTypes';
import { checkLinkValidity } from '../../lib/externalLinksService';

interface ExternalLinkCardProps {
  link: ExternalLinkWithTags;
  onEdit?: (link: ExternalLinkWithTags) => void;
  onDelete?: (linkId: string) => void;
  onRemoveFromCollection?: (linkId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  showDeadLinkCheck?: boolean;
}

const contentTypeIcons = {
  video: Video,
  article: FileText,
  social: MessageCircle,
  documentation: BookOpen,
  recipe: UtensilsCrossed,
  other: Link2,
};

export function ExternalLinkCard({
  link,
  onEdit,
  onDelete,
  onRemoveFromCollection,
  showActions = true,
  compact = false,
  showDeadLinkCheck = false,
}: ExternalLinkCardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const ContentIcon = link.content_type ? contentTypeIcons[link.content_type] : Link2;

  const handleCheckValidity = async () => {
    setIsChecking(true);
    try {
      const isValid = await checkLinkValidity(link.url);
      setIsDead(!isValid);
      setHasChecked(true);
    } catch {
      setIsDead(true);
      setHasChecked(true);
    } finally {
      setIsChecking(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <ContentIcon size={18} className="text-blue-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-900 hover:text-blue-600 text-sm line-clamp-1 flex items-center gap-1.5"
          >
            {link.title}
            <ExternalLink size={12} className="flex-shrink-0" />
          </a>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{link.domain}</span>
            {link.tags && link.tags.length > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <Tag size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{link.tags.length}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(link)}
                className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                title="Edit"
              >
                <Edit3 size={14} />
              </button>
            )}
            {onRemoveFromCollection && (
              <button
                onClick={() => onRemoveFromCollection(link.id)}
                className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                title="Remove from collection"
              >
                <Trash2 size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(link.id)}
                className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                title="Delete link"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-xl hover:shadow-md transition-all group overflow-hidden ${isDead && hasChecked ? 'border-red-300' : 'border-gray-200 hover:border-blue-300'}`}>
      {isDead && hasChecked && (
        <div className="bg-red-50 border-b border-red-200 px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
          <span className="text-xs text-red-700 font-medium">This link may be expired or unavailable</span>
        </div>
      )}
      {link.thumbnail_url ? (
        <div className="aspect-video bg-gray-100 overflow-hidden relative">
          <img
            src={link.thumbnail_url}
            alt={link.title}
            className="w-full h-full object-cover"
          />
          {isDead && hasChecked && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Dead Link
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center relative">
          <ContentIcon size={48} className="text-blue-300" />
          {isDead && hasChecked && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Dead Link
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-shrink-0 mt-0.5">
            <ContentIcon size={16} className="text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 flex items-start gap-1.5 transition-colors"
            >
              <span className="flex-1">{link.title}</span>
              <ExternalLink size={14} className="flex-shrink-0 mt-0.5" />
            </a>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-2">{link.domain}</div>

        {link.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {link.description}
          </p>
        )}

        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {link.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
              >
                <Tag size={10} />
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            {showDeadLinkCheck && !hasChecked && (
              <button
                onClick={handleCheckValidity}
                disabled={isChecking}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isChecking ? 'Checking...' : 'Check Link'}
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(link)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit3 size={12} />
                Edit
              </button>
            )}
            {onRemoveFromCollection && (
              <button
                onClick={() => onRemoveFromCollection(link.id)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={12} />
                Remove
              </button>
            )}
            {onDelete && !onRemoveFromCollection && (
              <button
                onClick={() => onDelete(link.id)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
