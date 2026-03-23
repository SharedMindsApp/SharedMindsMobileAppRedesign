import { Clock, Zap, MoreVertical, ArrowRight, Sparkles, Network, Archive } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UnifiedOffshoot {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  source_type: string;
  created_at: string;
}

interface Props {
  offshoot: UnifiedOffshoot;
  onConvertToTask: (id: string, type: string) => void;
  onConvertToSideProject: (id: string, type: string) => void;
  onArchive: (id: string, type: string) => void;
}

export function OffshootIdeaCard({ offshoot, onConvertToTask, onConvertToSideProject, onArchive }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const getSourceLabel = () => {
    switch (offshoot.source_type) {
      case 'node':
        return 'Mind Mesh Node';
      case 'roadmap_item':
        return 'Roadmap Item';
      case 'side_idea':
        return 'Side Idea';
      default:
        return 'Unknown';
    }
  };

  const getTimeSince = () => {
    const now = new Date();
    const created = new Date(offshoot.created_at);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `Drifted ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `Drifted ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `Drifted ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Drifted just now';
  };

  return (
    <div
      className="bg-white border-2 border-amber-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group relative"
      style={{
        borderLeftWidth: '6px',
        borderLeftColor: offshoot.color || '#FF7F50',
      }}
      onClick={() => navigate(`/guardrails/offshoots/${offshoot.id}`)}
    >
      <div className="absolute top-3 right-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical size={16} className="text-gray-600" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvertToTask(offshoot.id, offshoot.source_type);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <ArrowRight size={14} />
              Convert to Task
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvertToSideProject(offshoot.id, offshoot.source_type);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-purple-600"
            >
              <Sparkles size={14} />
              Move to Side Project
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(offshoot.id, offshoot.source_type);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
            >
              <Archive size={14} />
              Archive
            </button>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-start gap-2 mb-2">
          <Zap size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-8">{offshoot.title}</h3>
        </div>

        {offshoot.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{offshoot.description}</p>
        )}

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-800 border-amber-300">
            Unreviewed
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-orange-50 text-orange-800 border-orange-300">
            {getSourceLabel()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          {getTimeSince()}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConvertToTask(offshoot.id, offshoot.source_type);
          }}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-50 text-amber-700 rounded hover:bg-amber-100 text-xs font-medium"
        >
          <ArrowRight size={12} />
          To Task
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConvertToSideProject(offshoot.id, offshoot.source_type);
          }}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 text-xs font-medium"
        >
          <Sparkles size={12} />
          Side Project
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/guardrails/mindmesh');
          }}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-xs font-medium"
        >
          <Network size={12} />
          Mind Mesh
        </button>
      </div>
    </div>
  );
}
