import { useState, useRef, useEffect } from 'react';
import { GripVertical, Edit2, Trash2, Link as LinkIcon, MoreVertical } from 'lucide-react';
import { updateNode, deleteNode, createLink } from '../../../lib/guardrails/mindmesh';
import type { MindMeshNode, MindMeshNodeLink } from '../../../lib/guardrails/mindmeshTypes';

interface Props {
  node: MindMeshNode;
  isSelected: boolean;
  isDragging: boolean;
  connectionMode: { from: string; type: MindMeshNodeLink['link_type'] } | null;
  emphasis?: 'active' | 'descendant' | 'dimmed' | 'normal';
  emphasisColor?: string | null;
  onSelect: (id: string) => void;
  onUpdate: (node: MindMeshNode) => void;
  onDelete: (id: string) => void;
  onStartDrag: (id: string) => void;
  onEndDrag: () => void;
  onStartConnection: (from: string, type: MindMeshNodeLink['link_type']) => void;
  onCompleteConnection: (link: MindMeshNodeLink) => void;
}

export function MindMeshNodeComponent({
  node,
  isSelected,
  isDragging,
  connectionMode,
  emphasis = 'normal',
  emphasisColor,
  onSelect,
  onUpdate,
  onDelete,
  onStartDrag,
  onEndDrag,
  onStartConnection,
  onCompleteConnection,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setEditTitle(node.title);
  }, [node.title]);

  async function handleSaveTitle() {
    if (editTitle.trim() === '') return;

    try {
      const updated = await updateNode(node.id, { title: editTitle });
      onUpdate(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  }

  async function handleDelete() {
    try {
      await deleteNode(node.id);
      onDelete(node.id);
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  }

  async function handleCompleteConnection() {
    if (!connectionMode || connectionMode.from === node.id) return;

    try {
      const link = await createLink({
        from_node_id: connectionMode.from,
        to_node_id: node.id,
        link_type: connectionMode.type,
      });
      onCompleteConnection(link);
    } catch (error) {
      console.error('Failed to create link:', error);
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (isEditing) return;

    e.stopPropagation();
    onSelect(node.id);

    dragStartPos.current = {
      x: e.clientX - node.x_position,
      y: e.clientY - node.y_position,
    };

    onStartDrag(node.id);

    const handleMouseMove = async (moveEvent: MouseEvent) => {
      if (!dragStartPos.current) return;

      const newX = moveEvent.clientX - dragStartPos.current.x;
      const newY = moveEvent.clientY - dragStartPos.current.y;

      try {
        const updated = await updateNode(node.id, {
          x_position: newX,
          y_position: newY,
        });
        onUpdate(updated);
      } catch (error) {
        console.error('Failed to move node:', error);
      }
    };

    const handleMouseUp = () => {
      onEndDrag();
      dragStartPos.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  const nodeTypeColors = {
    idea: 'bg-yellow-100 border-yellow-300',
    task: 'bg-blue-100 border-blue-300',
    note: 'bg-gray-100 border-gray-300',
    offshoot: 'bg-purple-100 border-purple-300',
    group: 'bg-green-100 border-green-300',
  };

  const nodeColor = nodeTypeColors[node.node_type] || 'bg-gray-100 border-gray-300';
  let glowClass = node.is_offshoot ? 'shadow-lg ring-2 ring-purple-400' : '';
  let emphasisOpacity = '';
  let emphasisTransform = '';

  if (emphasis === 'active') {
    glowClass = 'shadow-2xl ring-4';
    emphasisTransform = 'scale-105';
  } else if (emphasis === 'descendant') {
    glowClass = 'ring-2';
    emphasisOpacity = 'opacity-80';
  } else if (emphasis === 'dimmed') {
    emphasisOpacity = 'opacity-35';
  }

  const ringColor = emphasis === 'active' || emphasis === 'descendant'
    ? emphasisColor || '#3B82F6'
    : undefined;

  return (
    <div
      ref={nodeRef}
      className={`absolute cursor-move select-none ${nodeColor} ${glowClass} ${emphasisOpacity} rounded-lg border-2 shadow-md transition-all duration-200 ${emphasisTransform} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isDragging ? 'opacity-50' : ''} ${
        connectionMode && connectionMode.from !== node.id ? 'cursor-pointer hover:ring-2 hover:ring-green-500' : ''
      }`}
      style={{
        left: `${node.x_position}px`,
        top: `${node.y_position}px`,
        width: `${node.width}px`,
        minHeight: `${node.height}px`,
        backgroundColor: node.color !== '#ffffff' ? node.color : undefined,
        borderColor: ringColor,
        boxShadow: ringColor && (emphasis === 'active' || emphasis === 'descendant')
          ? `0 0 0 ${emphasis === 'active' ? '4' : '2'}px ${ringColor}40`
          : undefined,
      }}
      onMouseDown={handleMouseDown}
      onClick={() => {
        if (connectionMode && connectionMode.from !== node.id) {
          handleCompleteConnection();
        } else {
          onSelect(node.id);
        }
      }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1 flex-1">
            <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-medium"
                autoFocus
              />
            ) : (
              <h3 className="font-semibold text-sm line-clamp-2">{node.title}</h3>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu(!showContextMenu);
            }}
            className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200"
          >
            <MoreVertical size={16} />
          </button>
        </div>

        {node.content && !isEditing && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-3">{node.content}</p>
        )}

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="px-2 py-0.5 bg-white rounded-full border border-gray-200">
            {node.node_type}
          </span>
          {node.is_offshoot && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
              offshoot
            </span>
          )}
        </div>
      </div>

      {showContextMenu && (
        <div
          className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setIsEditing(true);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={() => {
              onStartConnection(node.id, 'dependency');
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <LinkIcon size={14} />
            Create Link
          </button>
          <button
            onClick={() => {
              handleDelete();
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
