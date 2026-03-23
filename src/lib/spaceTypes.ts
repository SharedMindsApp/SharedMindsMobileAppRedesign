/**
 * Space Types
 * 
 * Defines types for Spaces with context-based ownership.
 * Spaces can be owned by: personal (user), household, or team.
 */

export type SpaceContextType = 'personal' | 'household' | 'team';

export interface Space {
  id: string;
  name: string;
  contextType: SpaceContextType;
  contextId: string | null;
  // Legacy fields (kept for backward compatibility during migration)
  space_type?: 'personal' | 'shared' | 'household';
  billing_owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Re-export Team types for convenience
export type { Team, TeamMember } from './teamTypes';
