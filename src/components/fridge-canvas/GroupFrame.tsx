import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { GripVertical, Trash2, Edit2 } from 'lucide-react';
import { FridgeGroup } from '../../lib/fridgeCanvasTypes';

interface GroupFrameProps {
  group: FridgeGroup;
  isSelected: boolean;
  isEditMode: boolean;
  isDragOver: boolean;
  zoom: number;
  canEdit: boolean;
  onUpdate: (updates: Partial<FridgeGroup>) => void;
  onDelete: () => void;
  onSelect: () => void;
  onEnterEditMode: () => void;
  onOpenFullscreen: () => void;
  children?: ReactNode;
}

export function GroupFrame({
  group,
  isSelected,
  isEditMode,
  isDragOver,
  zoom,
  canEdit,
  onUpdate,
  onDelete,
  onSelect,
  onEnterEditMode,
  onOpenFullscreen,
  children,
}: GroupFrameProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(group.title);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, mouseX: 0, mouseY: 0 });
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(group.title);
  }, [group.title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Drag handlers for the entire group
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canEdit) return;
      const target = e.target as HTMLElement;
      if (
        target.closest('.resize-handle') ||
        target.closest('input') ||
        target.closest('button')
      ) {
        return;
      }

      e.stopPropagation();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - group.x,
        y: e.clientY - group.y,
      });
      onSelect();
    },
    [canEdit, group.x, group.y, onSelect]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        onUpdate({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaX = (e.clientX - resizeStart.mouseX) / zoom;
        const deltaY = (e.clientY - resizeStart.mouseY) / zoom;
        const newWidth = Math.max(300, resizeStart.width + deltaX);
        const newHeight = Math.max(200, resizeStart.height + deltaY);
        onUpdate({ width: newWidth, height: newHeight });
      }
    },
    [isDragging, isResizing, dragStart, resizeStart, zoom, onUpdate]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Resize handler
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!canEdit) return;
      e.stopPropagation();
      setIsResizing(true);
      setResizeStart({
        width: group.width,
        height: group.height,
        mouseX: e.clientX,
        mouseY: e.clientY,
      });
    },
    [canEdit, group.width, group.height]
  );

  // Title editing
  const handleTitleDoubleClick = useCallback(() => {
    if (!canEdit) return;
    setIsEditingTitle(true);
  }, [canEdit]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    if (title.trim() !== group.title) {
      onUpdate({ title: title.trim() || 'Untitled Group' });
    }
  }, [title, group.title, onUpdate]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        titleInputRef.current?.blur();
      } else if (e.key === 'Escape') {
        setTitle(group.title);
        setIsEditingTitle(false);
      }
    },
    [group.title]
  );

  const colorClasses = {
    gray: 'bg-gray-50 border-gray-300',
    blue: 'bg-blue-50 border-blue-300',
    green: 'bg-green-50 border-green-300',
    yellow: 'bg-yellow-50 border-yellow-300',
    red: 'bg-red-50 border-red-300',
    purple: 'bg-purple-50 border-purple-300',
  };

  const colorClass = colorClasses[group.color as keyof typeof colorClasses] || colorClasses.gray;

  return (
    <div
      className={`group-frame absolute rounded-2xl shadow-md transition-all ${colorClass} ${
        isSelected ? 'ring-4 ring-blue-400' : ''
      } ${isDragOver ? 'ring-4 ring-green-400' : ''} ${isDragging ? 'cursor-move' : ''}`}
      style={{
        left: group.x,
        top: group.y,
        width: group.width,
        height: group.height,
        border: '2px solid',
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onClick={onSelect}
      onDoubleClick={onOpenFullscreen}
    >
      {/* Title bar */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-white/80 backdrop-blur-sm rounded-t-2xl border-b-2 border-inherit flex items-center justify-between px-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="flex-1 bg-white px-2 py-1 rounded border border-gray-300 text-sm font-semibold text-gray-900"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3
              className="text-sm font-semibold text-gray-900 truncate cursor-text"
              onDoubleClick={handleTitleDoubleClick}
            >
              {group.title}
            </h3>
          )}
          {!isEditingTitle && canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Edit title"
            >
              <Edit2 size={12} />
            </button>
          )}
        </div>
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
            title="Delete group"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Content area */}
      <div
        className="absolute top-10 left-0 right-0 bottom-0 overflow-hidden rounded-b-2xl"
        style={{ pointerEvents: isEditMode ? 'auto' : 'none' }}
      >
        {children}
      </div>

      {/* Resize handle */}
      {canEdit && isSelected && (
        <div
          className="resize-handle absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize group"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-white/80 rounded-tl-lg flex items-center justify-center shadow-sm border border-gray-400">
            <GripVertical size={14} className="text-gray-600 rotate-45" />
          </div>
        </div>
      )}

      {/* Drop zone indicator */}
      {isDragOver && (
        <div className="absolute inset-0 rounded-2xl bg-green-200/20 pointer-events-none flex items-center justify-center">
          <p className="text-green-700 font-semibold text-lg bg-white/90 px-4 py-2 rounded-lg shadow-lg">
            Drop to add to group
          </p>
        </div>
      )}

      {/* Edit mode indicator */}
      {isEditMode && (
        <div className="absolute -top-8 left-0 bg-blue-500 text-white px-3 py-1 rounded-t-lg text-xs font-semibold">
          Edit Mode
        </div>
      )}
    </div>
  );
}
