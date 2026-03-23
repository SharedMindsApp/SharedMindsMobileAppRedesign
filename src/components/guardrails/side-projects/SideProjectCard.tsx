import { Clock, Sparkles, MoreVertical, Map, Kanban, Network, ArrowUp, Archive, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';
import type { TrackWithStats } from '../../../lib/guardrails/trackService';
import { useNavigate } from 'react-router-dom';

interface Props {
  project: TrackWithStats;
  onConvertToMaster: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (project: TrackWithStats) => void;
}

export function SideProjectCard({ project, onConvertToMaster, onArchive, onDelete, onEdit }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const statusConfig = {
    active: { label: 'Active', color: 'bg-green-100 text-green-800 border-green-300' },
    paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    archived: { label: 'Archived', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  };

  const status = project.status === 'archived' ? 'archived' : 'active';
  const statusInfo = statusConfig[status];

  return (
    <div
      className="bg-white border-2 border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group relative"
      style={{
        borderLeftWidth: '6px',
        borderLeftColor: project.color || '#A855F7',
      }}
      onClick={() => navigate(`/guardrails/side-projects/${project.id}`)}
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
                onEdit(project);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Edit size={14} />
              Edit Details
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvertToMaster(project.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <ArrowUp size={14} />
              Convert to Master Project
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(project.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-amber-600"
            >
              <Archive size={14} />
              Archive
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-start gap-2 mb-2">
          <Sparkles size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
          <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-8">{project.name}</h3>
        </div>

        {project.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{project.description}</p>
        )}

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: `${project.color}20`,
              borderColor: project.color,
              color: project.color,
            }}
          >
            Side Project
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-purple-50 rounded p-2 text-center">
          <div className="text-lg font-bold text-purple-900">{project.totalItemsCount}</div>
          <div className="text-xs text-purple-700">Total Items</div>
        </div>
        <div className="bg-purple-50 rounded p-2 text-center">
          <div className="text-lg font-bold text-purple-900">{project.roadmapItemsCount}</div>
          <div className="text-xs text-purple-700">Roadmap</div>
        </div>
        <div className="bg-purple-50 rounded p-2 text-center">
          <div className="text-lg font-bold text-purple-900">{project.nodesCount}</div>
          <div className="text-xs text-purple-700">Nodes</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          Created {new Date(project.createdAt).toLocaleDateString()}
        </div>
        <div>
          Updated {new Date(project.updatedAt).toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/guardrails/roadmap');
          }}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 text-xs font-medium"
        >
          <Map size={12} />
          Roadmap
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/guardrails/taskflow');
          }}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 text-xs font-medium"
        >
          <Kanban size={12} />
          TaskFlow
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/guardrails/mindmesh');
          }}
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 text-xs font-medium"
        >
          <Network size={12} />
          Mind Mesh
        </button>
      </div>
    </div>
  );
}
