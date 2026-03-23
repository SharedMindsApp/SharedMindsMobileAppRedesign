import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Trash2, Clock, Archive, Search, Filter, ExternalLink, Pencil, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveProject } from '../../contexts/ActiveProjectContext';
import { ChatSurfaceService } from '../../lib/guardrails/ai/aiChatSurfaceService';
import { conversationService } from '../../lib/guardrails/ai/conversationService';
import type { ConversationListItem } from '../../lib/aiChatWidgetTypes';
import { getTimeUntilExpiry, isConversationExpiringSoon } from '../../lib/aiChatWidgetTypes';
import { getMasterProjects } from '../../lib/guardrails';
import type { MasterProject } from '../../lib/guardrailsTypes';

interface GroupedConversations {
  personal: ConversationListItem[];
  currentProject: ConversationListItem[];
  otherProjects: Array<{
    projectId: string;
    projectName: string;
    conversations: ConversationListItem[];
  }>;
}

export function GuardrailsAIChatsPage() {
  const { user } = useAuth();
  const { activeProject } = useActiveProject();
  const [conversations, setConversations] = useState<GroupedConversations>({
    personal: [],
    currentProject: [],
    otherProjects: [],
  });
  const [projects, setProjects] = useState<MasterProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'saved' | 'ephemeral'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [user, activeProject?.id]);

  async function loadData() {
    if (!user) return;

    try {
      setLoading(true);
      const [allConversations, allProjects] = await Promise.all([
        conversationService.listConversations({ user_id: user.id }, user.id),
        getMasterProjects(),
      ]);

      setProjects(allProjects);

      const grouped: GroupedConversations = {
        personal: [],
        currentProject: [],
        otherProjects: [],
      };

      const projectMap = new Map<string, ConversationListItem[]>();

      allConversations.forEach((conv) => {
        const convItem = conv as ConversationListItem;

        if (!convItem.master_project_id) {
          grouped.personal.push(convItem);
        } else if (convItem.master_project_id === activeProject?.id) {
          grouped.currentProject.push(convItem);
        } else {
          if (!projectMap.has(convItem.master_project_id)) {
            projectMap.set(convItem.master_project_id, []);
          }
          projectMap.get(convItem.master_project_id)!.push(convItem);
        }
      });

      projectMap.forEach((conversations, projectId) => {
        const project = allProjects.find((p) => p.id === projectId);
        if (project) {
          grouped.otherProjects.push({
            projectId,
            projectName: project.name,
            conversations,
          });
        }
      });

      setConversations(grouped);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConversation(id: string) {
    if (!user) return;

    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return;
    }

    try {
      await ChatSurfaceService.deleteConversation(id, user.id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation');
    }
  }

  async function handleRenameConversation(id: string, newTitle: string) {
    if (!user) return;

    try {
      await conversationService.manualRenameConversation(id, newTitle, user.id);
      await loadData();
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      alert(error instanceof Error ? error.message : 'Failed to rename conversation');
    }
  }

  async function handleSaveConversation(id: string) {
    if (!user) return;

    try {
      const result = await ChatSurfaceService.saveEphemeralConversation(id, user.id);
      if (result.success) {
        await loadData();
      } else {
        alert(result.error || 'Failed to save conversation. You may have reached the limit of 10 saved chats for this space.');
      }
    } catch (error) {
      console.error('Failed to save conversation:', error);
      alert('Failed to save conversation');
    }
  }

  function handleOpenConversation(conv: ConversationListItem) {
    window.dispatchEvent(
      new CustomEvent('open-ai-chat', {
        detail: {
          conversationId: conv.id,
          surfaceType: conv.master_project_id ? 'project' : 'personal',
          masterProjectId: conv.master_project_id,
        },
      })
    );
  }

  function filterConversations(convs: ConversationListItem[]): ConversationListItem[] {
    let filtered = convs;

    if (filter === 'saved') {
      filtered = filtered.filter((c) => !c.is_ephemeral);
    } else if (filter === 'ephemeral') {
      filtered = filtered.filter((c) => c.is_ephemeral);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.title.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  const filteredPersonal = filterConversations(conversations.personal);
  const filteredCurrentProject = filterConversations(conversations.currentProject);
  const filteredOtherProjects = conversations.otherProjects
    .map((group) => ({
      ...group,
      conversations: filterConversations(group.conversations),
    }))
    .filter((group) => group.conversations.length > 0);

  const totalCount = conversations.personal.length + conversations.currentProject.length +
    conversations.otherProjects.reduce((sum, g) => sum + g.conversations.length, 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-gray-500">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <MessageSquare className="w-7 h-7 text-blue-600" />
                AI Conversations
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your AI chat history across all projects
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{totalCount}</span> total conversations
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('saved')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  filter === 'saved'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Saved
              </button>
              <button
                onClick={() => setFilter('ephemeral')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  filter === 'ephemeral'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Temporary
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {activeProject && filteredCurrentProject.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                  <h2 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Current Project: {activeProject.name}
                  </h2>
                  <p className="text-xs text-blue-700 mt-1">
                    {filteredCurrentProject.length} conversation{filteredCurrentProject.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredCurrentProject.map((conv) => (
                    <ConversationRow
                      key={conv.id}
                      conversation={conv}
                      onOpen={() => handleOpenConversation(conv)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                      onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                      onSave={conv.is_ephemeral ? () => handleSaveConversation(conv.id) : undefined}
                      userId={user.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredPersonal.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Personal Conversations
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    {filteredPersonal.length} conversation{filteredPersonal.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredPersonal.map((conv) => (
                    <ConversationRow
                      key={conv.id}
                      conversation={conv}
                      onOpen={() => handleOpenConversation(conv)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                      onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                      onSave={conv.is_ephemeral ? () => handleSaveConversation(conv.id) : undefined}
                      userId={user.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredOtherProjects.map((group) => (
              <div key={group.projectId} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {group.projectName}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    {group.conversations.length} conversation{group.conversations.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.conversations.map((conv) => (
                    <ConversationRow
                      key={conv.id}
                      conversation={conv}
                      onOpen={() => handleOpenConversation(conv)}
                      onDelete={() => handleDeleteConversation(conv.id)}
                      onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                      onSave={conv.is_ephemeral ? () => handleSaveConversation(conv.id) : undefined}
                      userId={user.id}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filteredPersonal.length === 0 &&
              filteredCurrentProject.length === 0 &&
              filteredOtherProjects.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || filter !== 'all' ? 'No matching conversations' : 'No conversations yet'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {searchQuery || filter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Start a conversation using the AI Chat widget'}
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConversationRowProps {
  conversation: ConversationListItem;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  onSave?: () => void;
  userId: string;
}

function ConversationRow({ conversation, onOpen, onDelete, onRename, onSave, userId }: ConversationRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeRemaining = conversation.is_ephemeral ? getTimeUntilExpiry(conversation.expires_at) : null;
  const expiringSoon = conversation.is_ephemeral ? isConversationExpiringSoon(conversation.expires_at) : false;

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
    <div className={`px-6 py-4 transition-colors group ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="mb-2">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={200}
                placeholder="Conversation title"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {conversation.title || 'Untitled Conversation'}
              </h3>
              {conversation.is_ephemeral && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    expiringSoon
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Temporary
                </span>
              )}
            </div>
          )}

          {!isEditing && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {conversation.created_at && (
                <span>
                  Created {new Date(conversation.created_at).toLocaleDateString()}
                </span>
              )}
              {conversation.last_message_at && (
                <span>
                  Last message {new Date(conversation.last_message_at).toLocaleDateString()}
                </span>
              )}
              {conversation.is_ephemeral && timeRemaining && (
                <span className={expiringSoon ? 'text-red-600 font-medium' : ''}>
                  Deletes {timeRemaining}
                </span>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2">
            {conversation.is_ephemeral && onSave && (
              <button
                onClick={onSave}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Save this chat so it doesn't expire"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleEditClick}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Rename conversation"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onOpen}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5"
              title="Open conversation"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Delete conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
