import { supabase } from '../../supabase';
import type {
  ChatSurfaceType,
  ChatSurface,
  SurfaceLimitStatus,
  CreateConversationOptions,
  ConversationWithSurface,
  SurfaceValidationError,
} from './aiChatSurfaceTypes';
import {
  CHAT_LIMITS,
  EPHEMERAL_EXPIRY_HOURS,
  validateSurfaceConstraints,
  canSurfaceAccessEntity,
} from './aiChatSurfaceTypes';

export class ChatSurfaceService {
  static async validateSurface(surface: ChatSurface): Promise<{ valid: boolean; error?: SurfaceValidationError }> {
    const error = validateSurfaceConstraints(surface);
    if (error) {
      return { valid: false, error };
    }

    if (surface.surfaceType === 'project' && surface.masterProjectId) {
      const projectExists = await this.validateProjectExists(surface.masterProjectId);
      if (!projectExists) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PROJECT',
            message: 'Master project does not exist',
            surfaceType: surface.surfaceType,
            masterProjectId: surface.masterProjectId,
          },
        };
      }
    }

    return { valid: true };
  }

  static async validateProjectExists(projectId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('master_projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();

    return !error && !!data;
  }

  static async getSurfaceLimitStatus(
    userId: string,
    surfaceType: ChatSurfaceType,
    masterProjectId?: string | null
  ): Promise<SurfaceLimitStatus> {
    const { data: countData } = await supabase.rpc('count_saved_conversations_for_surface', {
      p_user_id: userId,
      p_surface_type: surfaceType,
      p_master_project_id: masterProjectId || null,
    });

    const currentCount = countData || 0;
    const canCreateSaved = currentCount < CHAT_LIMITS.maxPerSurface;

    return {
      surfaceType,
      masterProjectId,
      currentCount,
      maxCount: CHAT_LIMITS.maxPerSurface,
      canCreateSaved,
      canCreateEphemeral: true,
    };
  }

  static async canCreateSavedConversation(
    userId: string,
    surfaceType: ChatSurfaceType,
    masterProjectId?: string | null
  ): Promise<boolean> {
    const { data } = await supabase.rpc('can_create_saved_conversation', {
      p_user_id: userId,
      p_surface_type: surfaceType,
      p_master_project_id: masterProjectId || null,
    });

    return data === true;
  }

  static async createConversation(
    options: CreateConversationOptions
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    const surface: ChatSurface = {
      surfaceType: options.surfaceType,
      masterProjectId: options.masterProjectId,
    };

    const validation = await this.validateSurface(surface);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error?.message || 'Invalid surface configuration',
      };
    }

    const isEphemeral = options.isEphemeral ?? false;

    if (!isEphemeral) {
      const canCreate = await this.canCreateSavedConversation(
        options.userId,
        options.surfaceType,
        options.masterProjectId
      );

      if (!canCreate) {
        return {
          success: false,
          error: `Maximum saved conversations limit reached for this surface (${CHAT_LIMITS.maxPerSurface})`,
        };
      }
    }

    const expiresAt = isEphemeral
      ? new Date(Date.now() + EPHEMERAL_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: options.userId,
        surface_type: options.surfaceType,
        master_project_id: options.masterProjectId || null,
        is_ephemeral: isEphemeral,
        expires_at: expiresAt,
        title: options.title,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      conversationId: data.id,
    };
  }

  static async getConversationsForSurface(
    userId: string,
    surfaceType: ChatSurfaceType,
    masterProjectId?: string | null,
    includeEphemeral: boolean = true
  ): Promise<ConversationWithSurface[]> {
    let query = supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('surface_type', surfaceType)
      .order('created_at', { ascending: false });

    if (surfaceType === 'project' && masterProjectId) {
      query = query.eq('master_project_id', masterProjectId);
    } else if (surfaceType !== 'project') {
      query = query.is('master_project_id', null);
    }

    if (!includeEphemeral) {
      query = query.eq('is_ephemeral', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch conversations:', error);
      return [];
    }

    return data as ConversationWithSurface[];
  }

  static async getAllSavedConversations(userId: string): Promise<ConversationWithSurface[]> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_ephemeral', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch saved conversations:', error);
      return [];
    }

    return data as ConversationWithSurface[];
  }

  static async saveEphemeralConversation(
    conversationId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data } = await supabase.rpc('save_ephemeral_conversation', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    if (data === true) {
      return { success: true };
    } else {
      return {
        success: false,
        error: 'Cannot save conversation. Either it does not exist, is already saved, or the limit has been reached.',
      };
    }
  }

  static async expireOldEphemeralChats(): Promise<number> {
    const { data } = await supabase.rpc('expire_old_ephemeral_chats');
    return data || 0;
  }

  static async deleteConversation(conversationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  }

  static validateEntityAccess(
    surfaceType: ChatSurfaceType,
    surfaceProjectId: string | null,
    entityType: string,
    entityProjectId?: string | null
  ): { allowed: boolean; reason?: string } {
    const allowed = canSurfaceAccessEntity(surfaceType, surfaceProjectId, entityType, entityProjectId);

    if (!allowed) {
      let reason = `${surfaceType} surface cannot access ${entityType}`;
      if (surfaceType === 'project' && entityProjectId && entityProjectId !== surfaceProjectId) {
        reason = `Project surface can only access entities from its own project`;
      }
      return { allowed: false, reason };
    }

    return { allowed: true };
  }

  static async getUserSurfacesCount(userId: string): Promise<number> {
    const { data: projectSurfaces } = await supabase
      .from('ai_conversations')
      .select('master_project_id')
      .eq('user_id', userId)
      .eq('surface_type', 'project')
      .eq('is_ephemeral', false);

    const uniqueProjects = new Set(
      (projectSurfaces || []).map((s) => s.master_project_id).filter(Boolean)
    );

    const { data: personalSurface } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('surface_type', 'personal')
      .eq('is_ephemeral', false)
      .limit(1)
      .maybeSingle();

    const { data: sharedSurface } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('surface_type', 'shared')
      .eq('is_ephemeral', false)
      .limit(1)
      .maybeSingle();

    let count = uniqueProjects.size;
    if (personalSurface) count++;
    if (sharedSurface) count++;

    return count;
  }

  static async canCreateNewSurface(userId: string): Promise<{ canCreate: boolean; reason?: string }> {
    const currentCount = await this.getUserSurfacesCount(userId);

    if (currentCount >= CHAT_LIMITS.maxSurfaces) {
      return {
        canCreate: false,
        reason: `Maximum surfaces limit reached (${CHAT_LIMITS.maxSurfaces})`,
      };
    }

    return { canCreate: true };
  }
}
