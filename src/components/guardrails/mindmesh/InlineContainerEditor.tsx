import { useState, useRef, useEffect } from 'react';
import type { ContainerType } from '../../../lib/mindmesh-v2/containerCapabilities';

interface InlineContainerEditorProps {
  containerId: string;
  containerType: ContainerType;
  title: string;
  body: string;
  isGhost: boolean;
  canEdit: boolean;
  onSave: (title: string, body: string) => void;
}

export function InlineContainerEditor({
  containerId,
  containerType,
  title,
  body,
  isGhost,
  canEdit,
  onSave,
}: InlineContainerEditorProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedBody, setEditedBody] = useState(body);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Notes and Ideas support full inline editing (sticky note behavior)
  // Tasks support title and optional body
  // Events support title only (dates are read-only)
  // Tracks/Subtracks support title only (structural containers)
  const supportsBodyEditing = containerType === 'note' || containerType === 'idea' || containerType === 'task';
  const supportsTitleInlineEdit = true; // All container types support title editing

  useEffect(() => {
    setEditedTitle(title);
    setEditedBody(body);
  }, [containerId, title, body]);

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingBody && bodyRef.current) {
      bodyRef.current.focus();
      bodyRef.current.select();
    }
  }, [isEditingBody]);

  const handleTitleSave = () => {
    if (editedTitle.trim() !== title) {
      onSave(editedTitle.trim(), body);
    }
    setIsEditingTitle(false);
  };

  const handleBodySave = () => {
    if (editedBody.trim() !== body) {
      onSave(title, editedBody.trim());
    }
    setIsEditingBody(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditedTitle(title);
      setIsEditingTitle(false);
    }
  };

  const handleBodyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditedBody(body);
      setIsEditingBody(false);
    }
  };

  const canEditInline = canEdit && !isGhost;

  if (isEditingTitle && supportsTitleInlineEdit) {
    return (
      <div className="w-full">
        <input
          ref={titleRef}
          type="text"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={handleTitleKeyDown}
          className="w-full px-2 py-1 text-sm font-semibold bg-white border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Track title"
        />
      </div>
    );
  }

  if (isEditingBody && supportsBodyEditing) {
    return (
      <div className="w-full flex-1 flex flex-col">
        {title && (
          <div className="text-sm font-semibold mb-1 truncate text-gray-900">
            {title}
          </div>
        )}
        <textarea
          ref={bodyRef}
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          onBlur={handleBodySave}
          onKeyDown={handleBodyKeyDown}
          className="flex-1 w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder={
            containerType === 'note' ? 'Add note content...' :
            containerType === 'idea' ? 'Add idea...' :
            containerType === 'task' ? 'Add task description...' :
            'Add content...'
          }
        />
      </div>
    );
  }

  // For Notes and Ideas, prioritize body editing (sticky note behavior)
  // For Tasks, show both title and body as editable
  // For Events/Tracks/Subtracks, show title prominently
  const isContentContainer = containerType === 'note' || containerType === 'idea';

  return (
    <>
      {title && (
        <div
          className={`text-sm font-semibold mb-1 truncate ${isGhost ? 'text-gray-600' : 'text-gray-900'} ${canEditInline && supportsTitleInlineEdit ? 'cursor-text hover:bg-gray-50 px-1 -mx-1 rounded' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (canEditInline && supportsTitleInlineEdit) {
              setIsEditingTitle(true);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (canEditInline && supportsTitleInlineEdit) {
              setIsEditingTitle(true);
            }
          }}
          title={canEditInline && supportsTitleInlineEdit ? 'Click to edit title' : undefined}
        >
          {title}
        </div>
      )}

      {body && (
        <div
          className={`text-xs flex-1 overflow-y-auto whitespace-pre-wrap ${isGhost ? 'text-gray-500' : 'text-gray-700'} ${canEditInline && supportsBodyEditing ? 'cursor-text hover:bg-gray-50 px-1 -mx-1 rounded' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (canEditInline && supportsBodyEditing) {
              setIsEditingBody(true);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (canEditInline && supportsBodyEditing) {
              setIsEditingBody(true);
            }
          }}
          title={canEditInline && supportsBodyEditing ? (isContentContainer ? 'Click to edit' : 'Click to edit description') : undefined}
        >
          {body}
        </div>
      )}

      {!title && !body && (
        <div
          className={`text-xs text-gray-400 italic ${canEditInline && supportsBodyEditing ? 'cursor-text hover:bg-gray-50 px-1 -mx-1 rounded' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (canEditInline && supportsBodyEditing) {
              setIsEditingBody(true);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (canEditInline && supportsBodyEditing) {
              setIsEditingBody(true);
            }
          }}
          title={canEditInline && supportsBodyEditing ? 'Click to add content' : undefined}
        >
          {containerType === 'note' ? 'Click to add note...' :
           containerType === 'idea' ? 'Click to add idea...' :
           containerType === 'task' ? 'Click to add task description...' :
           'Empty'}
        </div>
      )}
    </>
  );
}
