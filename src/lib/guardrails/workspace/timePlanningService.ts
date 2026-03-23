/**
 * Time Planning Service
 * 
 * Phase 3.5: Time Planning Micro-App Service Layer
 * 
 * Handles time intent management for Track & Subtrack Workspaces.
 * Wraps universal_track_info service for workspace-specific time planning needs.
 * All database access goes through this service layer.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * - ✅ All DB access through this service
 * - ✅ UI components never query Supabase directly
 * - ✅ Errors returned, not thrown blindly
 * - ✅ Uses existing universal_track_info fields
 * - ✅ Time planning belongs to Workspaces, not Roadmap
 */

import {
  getUniversalTrackInfoByTrackId,
  saveUniversalTrackInfo,
  type UniversalTrackInfo,
} from '../universalTrackInfo';

export type TimeMode = 'unscheduled' | 'target' | 'ranged' | 'ongoing';

export interface TimePlanningIntent {
  timeMode: TimeMode;
  startDate: string | null;
  endDate: string | null;
  targetDate: string | null;
  trackInfo?: UniversalTrackInfo; // Optional reference to full track info
}

export interface UpdateTimePlanningIntentInput {
  timeMode: TimeMode;
  startDate?: string | null;
  endDate?: string | null;
  targetDate?: string | null;
}

/**
 * Get time planning intent for a track
 * Note: Uses trackId (subtrackId is ignored as universal_track_info is track-level only)
 */
export async function getTimePlanningIntent(
  trackId: string,
  subtrackId?: string | null
): Promise<TimePlanningIntent> {
  // Note: universal_track_info is track-level only, subtrackId is ignored but kept for API consistency
  const trackInfo = await getUniversalTrackInfoByTrackId(trackId);

  if (!trackInfo) {
    // Return default intent if no track info exists
    return {
      timeMode: 'unscheduled',
      startDate: null,
      endDate: null,
      targetDate: null,
    };
  }

  return {
    timeMode: trackInfo.time_mode as TimeMode,
    startDate: trackInfo.start_date,
    endDate: trackInfo.end_date,
    targetDate: trackInfo.target_date,
    trackInfo,
  };
}

/**
 * Save time planning intent for a track
 * Validates rules and clears invalid fields based on time mode
 */
export async function saveTimePlanningIntent(
  trackId: string,
  projectId: string,
  subtrackId: string | undefined | null,
  updates: UpdateTimePlanningIntentInput
): Promise<TimePlanningIntent> {
  const { timeMode, startDate, endDate, targetDate } = updates;

  // Get existing track info to preserve other fields
  const existingTrackInfo = await getUniversalTrackInfoByTrackId(trackId);

  // Validate and normalize based on time mode
  let normalizedStartDate: string | null = null;
  let normalizedEndDate: string | null = null;
  let normalizedTargetDate: string | null = null;

  switch (timeMode) {
    case 'unscheduled':
      // Clear all dates
      normalizedStartDate = null;
      normalizedEndDate = null;
      normalizedTargetDate = null;
      break;

    case 'target':
      // Require target_date, clear others
      if (!targetDate) {
        throw new Error('Target date is required when time mode is "Target date"');
      }
      normalizedTargetDate = targetDate;
      normalizedStartDate = null;
      normalizedEndDate = null;
      break;

    case 'ranged':
      // Require start_date and end_date, clear target_date
      if (!startDate) {
        throw new Error('Start date is required when time mode is "Date range"');
      }
      if (!endDate) {
        throw new Error('End date is required when time mode is "Date range"');
      }
      if (endDate < startDate) {
        throw new Error('End date must be after or equal to start date');
      }
      normalizedStartDate = startDate;
      normalizedEndDate = endDate;
      normalizedTargetDate = null;
      break;

    case 'ongoing':
      // Allow optional start_date, disallow end_date and target_date
      normalizedStartDate = startDate || null;
      normalizedEndDate = null;
      normalizedTargetDate = null;
      break;

    default:
      throw new Error(`Invalid time mode: ${timeMode}`);
  }

  // Preserve other fields from existing track info
  const savedTrackInfo = await saveUniversalTrackInfo({
    master_project_id: projectId,
    track_id: trackId,
    objective: existingTrackInfo?.objective || '',
    definition_of_done: existingTrackInfo?.definition_of_done || '',
    time_mode: timeMode,
    start_date: normalizedStartDate,
    end_date: normalizedEndDate,
    target_date: normalizedTargetDate,
    track_category_id: existingTrackInfo?.track_category_id || null,
  });

  return {
    timeMode: savedTrackInfo.time_mode as TimeMode,
    startDate: savedTrackInfo.start_date,
    endDate: savedTrackInfo.end_date,
    targetDate: savedTrackInfo.target_date,
    trackInfo: savedTrackInfo,
  };
}
