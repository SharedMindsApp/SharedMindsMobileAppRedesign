/**
 * Task Sharing Service (Placeholder)
 * 
 * Placeholder for future task sharing functionality.
 * Currently returns empty arrays - task sharing not yet implemented.
 * 
 * When task sharing is implemented, this will mirror calendarSharingService.ts
 * structure for consistency.
 */

// Placeholder types - will be implemented when task sharing is added
export interface TaskShare {
  id: string;
  owner_user_id: string;
  viewer_user_id: string;
  permission: 'read' | 'write';
  status: 'pending' | 'active' | 'revoked';
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Populated when fetching with user details
  owner_name?: string;
  owner_email?: string;
  viewer_name?: string;
  viewer_email?: string;
}

/**
 * Get all task shares received by a user (shares they can view)
 * 
 * @PLACEHOLDER: Returns empty array until task sharing is implemented
 */
export async function getReceivedTaskShares(userId: string): Promise<TaskShare[]> {
  // TODO: Implement when task sharing is added
  return [];
}
