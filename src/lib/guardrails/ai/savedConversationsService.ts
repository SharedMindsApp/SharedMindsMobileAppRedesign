import { supabase } from '../../supabase';
import type { AIConversation } from './aiChatTypes';

export interface SavedConversation {
  id: string;
  title: string;
  master_project_id: string | null;
  project_name?: string;
  surface_type: 'personal' | 'project' | 'shared';
  last_message_at: string | null;
  created_at: string;
}

export interface GroupedConversations {
  personal: SavedConversation[];
  projectGroups: {
    projectId: string;
    projectName: string;
    conversations: SavedConversation[];
  }[];
  shared: SavedConversation[];
}

export async function getSavedConversations(userId: string): Promise<GroupedConversations> {
  const { data: conversations, error } = await supabase
    .from('ai_conversations')
    .select('id, title, master_project_id, surface_type, created_at, is_ephemeral')
    .eq('user_id', userId)
    .is('archived_at', null)
    .eq('is_ephemeral', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!conversations) return { personal: [], projectGroups: [], shared: [] };

  const conversationsWithLastMessage = await Promise.all(
    conversations.map(async (conv) => {
      const { data: lastMessage } = await supabase
        .from('ai_chat_messages')
        .select('created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...conv,
        last_message_at: lastMessage?.created_at || null,
      };
    })
  );

  const projectIds = [...new Set(
    conversationsWithLastMessage
      .filter(c => c.master_project_id)
      .map(c => c.master_project_id!)
  )];

  const { data: projects } = await supabase
    .from('master_projects')
    .select('id, name')
    .in('id', projectIds);

  const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);

  const personal: SavedConversation[] = [];
  const projectConversations: Map<string, SavedConversation[]> = new Map();
  const shared: SavedConversation[] = [];

  conversationsWithLastMessage.forEach(conv => {
    const savedConv: SavedConversation = {
      id: conv.id,
      title: conv.title,
      master_project_id: conv.master_project_id,
      surface_type: conv.surface_type as 'personal' | 'project' | 'shared',
      last_message_at: conv.last_message_at,
      created_at: conv.created_at,
    };

    if (conv.surface_type === 'personal') {
      personal.push(savedConv);
    } else if (conv.surface_type === 'project' && conv.master_project_id) {
      savedConv.project_name = projectMap.get(conv.master_project_id);
      if (!projectConversations.has(conv.master_project_id)) {
        projectConversations.set(conv.master_project_id, []);
      }
      projectConversations.get(conv.master_project_id)!.push(savedConv);
    } else if (conv.surface_type === 'shared') {
      shared.push(savedConv);
    }
  });

  const projectGroups = Array.from(projectConversations.entries()).map(([projectId, convs]) => ({
    projectId,
    projectName: projectMap.get(projectId) || 'Unknown Project',
    conversations: convs,
  }));

  return { personal, projectGroups, shared };
}

export async function getSavedConversationById(
  conversationId: string,
  userId: string
): Promise<SavedConversation | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, title, master_project_id, surface_type, created_at')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .eq('is_ephemeral', false)
    .is('archived_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: lastMessage } = await supabase
    .from('ai_chat_messages')
    .select('created_at')
    .eq('conversation_id', data.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    id: data.id,
    title: data.title,
    master_project_id: data.master_project_id,
    surface_type: data.surface_type as 'personal' | 'project' | 'shared',
    last_message_at: lastMessage?.created_at || null,
    created_at: data.created_at,
  };
}
