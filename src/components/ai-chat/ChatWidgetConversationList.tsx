import { useState, useEffect, useRef } from 'react';
import { Clock, Trash2, Pencil, Save } from 'lucide-react';
import { ChatSurfaceService } from '../../lib/guardrails/ai/aiChatSurfaceService';
import { conversationService } from '../../lib/guardrails/ai/conversationService';
import type { CurrentSurface, ConversationListItem } from '../../lib/aiChatWidgetTypes';
import { getTimeUntilExpiry, isConversationExpiringSoon } from '../../lib/aiChatWidgetTypes';

interface ChatWidgetConversationListProps {
  userId: string;
  currentSurface: CurrentSurface;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (id: string) => void;
}

export function ChatWidgetConversationList({
  userId,
  currentSurface,
  onSelectConversation,
  onCreateConversation,
}: ChatWidgetConversationListProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [currentSurface.surfaceType, currentSurface.masterProjectId]);

  async function loadConversations() {
    try {
      setLoading(true);
      const data = await ChatSurfaceService.getConversationsForSurface(
        userId,
        currentSurface.surfaceType,
        currentSurface.masterProjectId,
        true
      );
      setConversations(data as ConversationListItem[]);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }


  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();

    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return;
    }

    try {
      await ChatSurfaceService.deleteConversation(id, userId);
      await loadConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation');
    }
  }

  async function handleRenameConversation(id: string, newTitle: string) {
    try {
      await conversationService.manualRenameConversation(id, newTitle, userId);
      await loadConversations();
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      alert(error instanceof Error ? error.message : 'Failed to rename conversation');
    }
  }

  async function handleSaveConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();

    try {
      const result = await ChatSurfaceService.saveEphemeralConversation(id, userId);
      if (result.success) {
        await loadConversations();
      } else {
        alert(result.error || 'Failed to save conversation. You may have reached the limit of 10 saved chats for this space.');
      }
    } catch (error) {
      console.error('Failed to save conversation:', error);
      alert('Failed to save conversation');
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-gray-500">Loading conversations...</div>
      </div>
    );
  }

  const savedConversations = conversations.filter((c) => !c.is_ephemeral);
  const temporaryConversations = conversations.filter((c) => c.is_ephemeral);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {savedConversations.length > 0 && (
          <div className="border-b border-gray-200">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
              Saved Chats ({savedConversations.length})
            </div>
            {savedConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                onSelect={() => onSelectConversation(conv.id)}
                onDelete={(e) => handleDeleteConversation(conv.id, e)}
                onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                userId={userId}
              />
            ))}
          </div>
        )}

        {temporaryConversations.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
              Temporary Chats ({temporaryConversations.length})
            </div>
            {temporaryConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                onSelect={() => onSelectConversation(conv.id)}
                onDelete={(e) => handleDeleteConversation(conv.id, e)}
                onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                onSave={(e) => handleSaveConversation(conv.id, e)}
                userId={userId}
                isTemporary
              />
            ))}
          </div>
        )}

        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <div className="text-4xl mb-3">💬</div>
            <div className="text-sm font-medium mb-1">No conversations yet</div>
            <div className="text-xs">Click the + icon to get started</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: ConversationListItem;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onRename: (newTitle: string) => void;
  onSave?: (e: React.MouseEvent) => void;
  userId: string;
  isTemporary?: boolean;
}

function ConversationItem({ conversation, onSelect, onDelete, onRename, onSave, userId, isTemporary }: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeRemaining = isTemporary ? getTimeUntilExpiry(conversation.expires_at) : null;
  const expiringSoon = isTemporary ? isConversationExpiringSoon(conversation.expires_at) : false;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation();
    setEditValue(conversation.title || '');
    setIsEditing(true);
  }

  function handleSave() {
    const trimmed = editValue.trim();
    if (!trimmed) {
      alert('Title cannot be empty');
      return;
    }
    if (trimmed.length > 200) {
      alert('Title cannot exceed 200 characters');
      return;
    }
    if (trimmed !== conversation.title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  }

  function handleCancel() {
    setEditValue(conversation.title || '');
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }

  return (
    <div
      onClick={isEditing ? undefined : onSelect}
      className={`px-4 py-3 border-b border-gray-100 group ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50 cursor-pointer'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={200}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {conversation.title || 'Untitled'}
              </h4>
              {isTemporary && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    expiringSoon ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Clock className="w-3 h-3 inline mr-1" />
                  Temporary
                </span>
              )}
            </div>
          )}

          {!isEditing && isTemporary && timeRemaining && (
            <div className={`text-xs mt-1 ${expiringSoon ? 'text-red-600' : 'text-gray-500'}`}>
              Deletes {timeRemaining}
            </div>
          )}

          {!isEditing && conversation.last_message_at && (
            <div className="text-xs text-gray-500 mt-1">
              {new Date(conversation.last_message_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1">
            {isTemporary && onSave && (
              <button
                onClick={onSave}
                className="p-1 hover:bg-green-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Save this chat so it doesn't expire"
                title="Save this chat so it doesn't expire"
              >
                <Save className="w-4 h-4 text-green-600" />
              </button>
            )}
            <button
              onClick={handleEditClick}
              className="p-1 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Rename conversation"
              title="Rename"
            >
              <Pencil className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete conversation"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
