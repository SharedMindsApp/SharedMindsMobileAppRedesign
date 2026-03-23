/**
 * Team Types
 * 
 * Defines types for Teams and Team Members.
 * Teams are distinct from Households - they represent work teams, clubs, hobby groups, etc.
 */

export interface Team {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  is_archived?: boolean;
}

export interface TeamMember {
  id?: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at?: string;
}
