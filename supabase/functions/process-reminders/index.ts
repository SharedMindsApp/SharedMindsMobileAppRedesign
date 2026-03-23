/**
 * Process Reminders Edge Function
 * 
 * Scheduled function that runs periodically to:
 * 1. Check for due reminders (using get_due_reminders database function)
 * 2. Send notifications to owners and attendees (if enabled)
 * 3. Mark reminders as sent
 * 
 * This function should be scheduled to run every 1-5 minutes via Supabase Cron
 * or external scheduler (e.g., Vercel Cron, GitHub Actions, etc.)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DueReminder {
  reminder_id: string;
  entity_type: string;
  entity_id: string;
  offset_minutes: number;
  owner_user_id: string;
  notify_owner: boolean;
  notify_attendees: boolean;
  event_start_at: string | null;
  task_date: string | null;
  owner_user_auth_id: string | null;
  attendee_user_ids: string[] | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get due reminders from database (events and tasks)
    const { data: dueReminders, error: fetchError } = await supabase.rpc(
      'get_due_reminders'
    );

    if (fetchError) {
      console.error('[process-reminders] Error fetching due reminders:', fetchError);
      throw fetchError;
    }

    // Get due tracker reminders
    const { data: dueTrackerReminders, error: trackerFetchError } = await supabase.rpc(
      'get_due_tracker_reminders'
    );

    if (trackerFetchError) {
      console.error('[process-reminders] Error fetching due tracker reminders:', trackerFetchError);
      // Don't throw - continue processing event/task reminders
    }

    const totalReminders = (dueReminders?.length || 0) + (dueTrackerReminders?.length || 0);

    if (totalReminders === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No due reminders' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`[process-reminders] Processing ${dueReminders?.length || 0} event/task reminders and ${dueTrackerReminders?.length || 0} tracker reminders`);

    const processed = [];
    const errors = [];

    // Process each due reminder
    for (const reminder of dueReminders as DueReminder[]) {
      try {
        // Get event/task details for notification content
        let entityTitle = 'Event';
        let entityStartTime: string | null = null;

        if (reminder.entity_type === 'event') {
          const { data: event } = await supabase
            .from('calendar_events')
            .select('title, start_at')
            .eq('id', reminder.entity_id)
            .single();

          if (event) {
            entityTitle = event.title;
            entityStartTime = event.start_at;
          }
        } else if (reminder.entity_type === 'task') {
          const { data: task } = await supabase
            .from('event_tasks')
            .select('title, date, start_time, event_id')
            .eq('id', reminder.entity_id)
            .single();

          if (task) {
            entityTitle = task.title;
            if (task.event_id) {
              // Task linked to event - get event start time
              const { data: event } = await supabase
                .from('calendar_events')
                .select('start_at')
                .eq('id', task.event_id)
                .single();
              entityStartTime = event?.start_at || null;
            } else {
              // Standalone task - combine date and time
              if (task.date && task.start_time) {
                entityStartTime = `${task.date}T${task.start_time}:00`;
              } else if (task.date) {
                entityStartTime = `${task.date}T00:00:00`;
              }
            }
          }
        }

        // Format reminder message
        const offsetText = formatOffset(reminder.offset_minutes);
        const title = `${entityTitle} starting ${offsetText}`;
        const body = reminder.entity_type === 'event'
          ? `Your event "${entityTitle}" starts ${offsetText}`
          : `Your task "${entityTitle}" is due ${offsetText}`;

        // Send notifications
        const userIdsToNotify: string[] = [];

        // Add owner if enabled
        if (reminder.notify_owner && reminder.owner_user_auth_id) {
          userIdsToNotify.push(reminder.owner_user_auth_id);
        }

        // Add attendees if enabled
        if (reminder.notify_attendees && reminder.attendee_user_ids) {
          userIdsToNotify.push(...reminder.attendee_user_ids);
        }

        // Remove duplicates
        const uniqueUserIds = [...new Set(userIdsToNotify)];

        // Create notifications for each user
        for (const userId of uniqueUserIds) {
          try {
            // Get user's profile ID for action URL
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', userId)
              .maybeSingle();

            const actionUrl = reminder.entity_type === 'event'
              ? `/planner/calendar?event=${reminder.entity_id}`
              : `/planner/tasks?task=${reminder.entity_id}`;

            // Create notification via notifications table
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                type: reminder.entity_type === 'event' ? 'calendar' : 'planner',
                title,
                body,
                source_type: reminder.entity_type,
                source_id: reminder.entity_id,
                action_url: actionUrl,
                is_read: false,
              });

            if (notifError) {
              console.error(`[process-reminders] Error creating notification for user ${userId}:`, notifError);
              errors.push({ reminder_id: reminder.reminder_id, user_id: userId, error: notifError.message });
            }
          } catch (err) {
            console.error(`[process-reminders] Error processing notification for user ${userId}:`, err);
            errors.push({ reminder_id: reminder.reminder_id, user_id: userId, error: String(err) });
          }
        }

        // Mark reminder as sent
        const { error: markError } = await supabase.rpc('mark_reminder_sent', {
          p_reminder_id: reminder.reminder_id,
        });

        if (markError) {
          console.error(`[process-reminders] Error marking reminder ${reminder.reminder_id} as sent:`, markError);
          errors.push({ reminder_id: reminder.reminder_id, error: markError.message });
        } else {
          processed.push(reminder.reminder_id);
        }
      } catch (err) {
        console.error(`[process-reminders] Error processing reminder ${reminder.reminder_id}:`, err);
        errors.push({ reminder_id: reminder.reminder_id, error: String(err) });
      }
    }

    // Process tracker reminders
    if (dueTrackerReminders && dueTrackerReminders.length > 0) {
      for (const trackerReminder of dueTrackerReminders) {
        try {
          const title = trackerReminder.reminder_kind === 'entry_prompt'
            ? `Log today's ${trackerReminder.tracker_name}?`
            : `Add a note to ${trackerReminder.tracker_name}?`;

          const body = trackerReminder.reminder_kind === 'entry_prompt'
            ? `Want to add an entry for today?`
            : `Anything you noticed today?`;

          const actionUrl = `/tracker-studio/tracker/${trackerReminder.tracker_id}`;

          // Create notification
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: trackerReminder.owner_user_id,
              type: 'system', // Tracker reminders use system type
              title,
              body,
              source_type: 'tracker',
              source_id: trackerReminder.tracker_id,
              action_url: actionUrl,
              is_read: false,
            });

          if (notifError) {
            console.error(`[process-reminders] Error creating tracker notification:`, notifError);
            errors.push({ reminder_id: trackerReminder.reminder_id, error: notifError.message });
          } else {
            // Mark reminder as sent
            const { error: markError } = await supabase.rpc('mark_reminder_sent', {
              p_reminder_id: trackerReminder.reminder_id,
            });

            if (markError) {
              console.error(`[process-reminders] Error marking tracker reminder as sent:`, markError);
              errors.push({ reminder_id: trackerReminder.reminder_id, error: markError.message });
            } else {
              processed.push(trackerReminder.reminder_id);
            }
          }
        } catch (err) {
          console.error(`[process-reminders] Error processing tracker reminder ${trackerReminder.reminder_id}:`, err);
          errors.push({ reminder_id: trackerReminder.reminder_id, error: String(err) });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processed.length,
        errors: errors.length,
        reminder_ids: processed,
        error_details: errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[process-reminders] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Format offset minutes to human-readable string
 */
function formatOffset(minutes: number): string {
  if (minutes === 0) return 'now';
  if (minutes < 60) return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(minutes / 1440);
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}
