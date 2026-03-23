/**
 * Phase 4: Network Resilience - Added timeout protection to critical queries
 */

// lib/fridgeCanvas.ts

import { supabase } from "./supabase";
import { getSupabaseClient } from "./supabaseClientWithToken";
import { supabaseQuery } from "./networkRequest";
import {
  FridgeWidget,
  FridgeGroup,
  WidgetWithLayout,
  WidgetLayout,
  WidgetType,
  WidgetContent,
  NoteContent,
  TaskContent,
  CalendarContent,
  PhotoContent,
  InsightContent,
  ReminderContent,
  AgreementContent,
  StackCardContent,
  TablesContent,
  CustomContent,
  TrackerContent,
  TrackerAppContent,
  TrackerQuickLinkContent,
  JournalContent,
  WorkspaceContent,
} from "./fridgeCanvasTypes";
import { createStackCardWithInitialCards } from "./stackCards";

/* ======================================================================
   UTIL: FETCH PROFILE.ID (REQUIRED FOR ALL RLS LOGIC)
   ====================================================================== */
async function getProfileId(): Promise<string> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!auth.user) throw new Error("User not authenticated");

  const userId = auth.user.id;

  const sb = await getSupabaseClient();
  const { data: profile, error: pErr } = await sb
    .from("profiles")
    .select("id")
    .eq('id', userId)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!profile) throw new Error("Profile not found");

  return profile.id; // THIS is what RLS checks against
}

/* ======================================================================
   UTIL: FETCH HOUSEHOLD_MEMBERS.ID FOR WIDGET CREATION
   ====================================================================== */
async function getMemberId(householdId: string, profileId: string): Promise<string> {
  const sb = await getSupabaseClient();
  const { data: member, error } = await sb
    .from("space_members")
    .select("id")
    .eq("space_id", householdId)
    .eq("user_id", profileId)
    .maybeSingle();

  if (error) throw error;
  if (!member) throw new Error("User is not a member of this household");

  return member.id;
}

/* ======================================================================
   CREATE DEFAULT LAYOUT FOR THIS USER
   ====================================================================== */
async function createDefaultLayout(
  widgetId: string,
  profileId: string
): Promise<WidgetLayout> {
  const randomX = Math.floor(Math.random() * 600) + 200;
  const randomY = Math.floor(Math.random() * 600) + 200;
  const randomRotation = (Math.random() - 0.5) * 6;

  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("fridge_widget_layouts")
    .insert({
      widget_id: widgetId,
      member_id: profileId, // IMPORTANT — NOT auth.uid
      position_x: randomX,
      position_y: randomY,
      size_mode: "mini",
      z_index: 1,
      rotation: randomRotation,
      is_collapsed: false,
      group_id: null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as WidgetLayout;
}

/* ======================================================================
   LOAD WIDGETS + USER LAYOUTS
   ====================================================================== */
export async function loadHouseholdWidgets(
  householdId: string
): Promise<WidgetWithLayout[]> {
  const profileId = await getProfileId();

  const sb = await getSupabaseClient();

  // Phase 4: Network Resilience - Use supabaseQuery with timeout
  // Load widgets (exclude deleted ones)
  // Note: Ordering by position_x happens after layouts are loaded and matched
  const { data: widgets, error: wErr } = await supabaseQuery(
    () => sb
      .from("fridge_widgets")
      .select("*")
      .eq("space_id", householdId)
      .is("deleted_at", null),
    {
      timeout: 10000, // 10 second timeout
      maxRetries: 2,
      context: { component: 'FridgeCanvas', action: 'loadHouseholdWidgets' },
    }
  );

  if (wErr) throw wErr;
  if (!widgets || widgets.length === 0) return [];

  const widgetIds = widgets.map((w) => w.id);

  // Phase 4: Network Resilience - Use supabaseQuery with timeout
  // Load layouts for this user
  const { data: layouts, error: layoutErr } = await supabaseQuery(
    () => sb
      .from("fridge_widget_layouts")
      .select("*")
      .eq("member_id", profileId)
      .in("widget_id", widgetIds.length ? widgetIds : ["_"]),
    {
      timeout: 10000, // 10 second timeout
      maxRetries: 2,
      context: { component: 'FridgeCanvas', action: 'loadHouseholdWidgets' },
    }
  );

  if (layoutErr) throw layoutErr;

  const layoutMap = new Map<string, WidgetLayout>(
    (layouts ?? []).map((l) => [l.widget_id, l])
  );

  const results: WidgetWithLayout[] = [];

  for (const widget of widgets as FridgeWidget[]) {
    let layout = layoutMap.get(widget.id);

    // Auto-create missing layout for this user
    if (!layout) layout = await createDefaultLayout(widget.id, profileId);

    // Defensive defaults
    if (!layout.size_mode) layout.size_mode = "mini";
    if (layout.position_x == null) layout.position_x = 200;
    if (layout.position_y == null) layout.position_y = 200;
    // Set launcher_order to MAX_SAFE_INTEGER if missing so new widgets appear at the end
    if (layout.launcher_order == null) layout.launcher_order = Number.MAX_SAFE_INTEGER;

    results.push({ ...widget, layout });
  }

  // IMPORTANT: position_x / position_y are canvas coordinates only.
  // Launcher ordering MUST use launcher_order.
  // Never mix these systems.
  // Sort by launcher_order to ensure consistent ordering (launcher_order is the canonical source of launcher order)
  // Use MAX_SAFE_INTEGER for missing/null launcher_order so new widgets appear at the end
  results.sort((a, b) => {
    const orderA = a.layout.launcher_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.layout.launcher_order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  return results;
}

/* ======================================================================
   GET SINGLE WIDGET BY ID
   ====================================================================== */
export async function getWidgetById(widgetId: string): Promise<WidgetWithLayout | null> {
  const profileId = await getProfileId();

  const sb = await getSupabaseClient();

  // Load widget
  const { data: widget, error: wErr } = await sb
    .from("fridge_widgets")
    .select("*")
    .eq("id", widgetId)
    .is("deleted_at", null)
    .maybeSingle();

  if (wErr) throw wErr;
  if (!widget) return null;

  // Load layout for this user
  const { data: layout, error: layoutErr } = await sb
    .from("fridge_widget_layouts")
    .select("*")
    .eq("widget_id", widgetId)
    .eq("member_id", profileId)
    .maybeSingle();

  if (layoutErr) throw layoutErr;

  let widgetLayout = layout;
  if (!widgetLayout) {
    widgetLayout = await createDefaultLayout(widget.id, profileId);
  }

  // Defensive defaults
  if (!widgetLayout.size_mode) widgetLayout.size_mode = "mini";
  if (widgetLayout.position_x == null) widgetLayout.position_x = 200;
  if (widgetLayout.position_y == null) widgetLayout.position_y = 200;
  // Set launcher_order to MAX_SAFE_INTEGER if missing so new widgets appear at the end
  if (widgetLayout.launcher_order == null) widgetLayout.launcher_order = Number.MAX_SAFE_INTEGER;

  return { ...widget, layout: widgetLayout };
}

/* ======================================================================
   CREATE WIDGET — NOW FIXED TO USE profile.id (NOT auth.uid)
   ====================================================================== */
// lib/fridgeCanvas.ts

export async function createWidget(
  householdId: string,
  widgetType: WidgetType,
  content: WidgetContent,
  options?: { icon?: string; color?: string; title?: string }
): Promise<WidgetWithLayout> {
  console.log("🟦 createWidget() starting…");

  // 1️⃣ Get authenticated user
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    console.error("❌ auth.getUser error:", authErr);
    throw authErr;
  }
  if (!authData.user) throw new Error("User not authenticated");

  const authUserId = authData.user.id;
  console.log("🟦 createWidget() → auth.uid():", authUserId);

  // 2️⃣ Load their profile.id
  const sb = await getSupabaseClient();
  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("id")
    .eq('id', authUserId)
    .single();

  console.log("🟩 profile lookup:", profile, profileErr);

  if (profileErr || !profile) {
    console.error("❌ No profile found for user:", authUserId);
    throw new Error("Profile not found for authenticated user.");
  }

  const profileId = profile.id;

  // 3️⃣ If creating a stack_card widget, create the stack_cards record first
  let widgetContent = content;
  if (widgetType === 'stack_card') {
    const stack = await createStackCardWithInitialCards({
      title: 'Revision Cards',
      color_scheme: 'cyan',
      space_id: householdId,
    });
    widgetContent = {
      stackId: stack.id,
      title: stack.title,
      cardCount: 6,
      colorScheme: stack.color_scheme,
    } as StackCardContent;
  }

  // Handle tracker_app and tracker_quicklink default content
  if (widgetType === 'tracker_app' && !content) {
    // tracker_app requires tracker_id, so we'll use empty content and let the UI handle it
    widgetContent = { tracker_id: '' } as TrackerAppContent;
  }
  
  if (widgetType === 'tracker_quicklink') {
    // tracker_quicklink has no content needed
    widgetContent = {} as TrackerQuickLinkContent;
  }

  if (widgetType === 'journal') {
    // journal has no content needed - space_id is passed via householdId prop
    widgetContent = {} as JournalContent;
  }

  if (widgetType === 'workspace') {
    // workspace requires workspace_id, but we'll create it on first use
    // For now, use empty workspace_id and let the widget create the workspace
    widgetContent = { workspace_id: '' } as WorkspaceContent;
  }

  // Map widget type to proper display name
  const widgetTypeNames: Record<WidgetType, string> = {
    note: 'Note',
    task: 'Task',
    reminder: 'Reminder',
    calendar: 'Calendar',
    achievements: 'Achievements',
    photo: 'Photo',
    insight: 'Insight',
    agreement: 'Agreement',
    meal_planner: 'Meal Planner',
    grocery_list: 'Grocery List',
    pantry: 'Pantry',
    stack_card: 'Stack Cards',
    files: 'Files',
    collections: 'Collections',
    tables: 'Tables',
    todos: 'Todos',
    tracker_app: 'Tracker App',
    tracker_quicklink: 'Tracker Quick Links',
    journal: 'Journal',
    workspace: 'Workspace',
    custom: 'Custom Widget',
  };

  const widgetName = widgetTypeNames[widgetType] || 'Widget';

  // 4️⃣ Build exact payload Supabase will receive
  const insertPayload = {
    space_id: householdId,
    created_by: profileId,
    widget_type: widgetType,
    title: options?.title || widgetName,
    content: widgetContent,
    color: options?.color || "yellow",
    icon: options?.icon || "StickyNote",
  };

  console.log("📦 REAL INSERT PAYLOAD:", insertPayload);

  // 5️⃣ Perform INSERT (reuse sb from above)
  const { data: widget, error: widgetErr } = await sb
    .from("fridge_widgets")
    .insert(insertPayload)
    .select("*")
    .single();

  console.log("🟥 INSERT RESPONSE:", widget, widgetErr);

  if (widgetErr) {
    console.error("❌ Widget insert failed:", widgetErr);
    throw widgetErr;
  }

  // 6️⃣ Create layout row for this profile
  const layout = await createDefaultLayout(widget.id, profileId);

  return { ...(widget as FridgeWidget), layout };
}


/* ======================================================================
   UPDATE WIDGET CONTENT (owners/editors only via RLS)
   ====================================================================== */
export async function updateWidgetContent(
  widgetId: string,
  content: WidgetContent
): Promise<void> {
  const sb = await getSupabaseClient();
  const { error } = await sb
    .from("fridge_widgets")
    .update({ content })
    .eq("id", widgetId);

  if (error) throw error;
}

/* ======================================================================
   UPDATE LAYOUT (everyone allowed via RLS)
   ====================================================================== */
export async function updateWidgetLayout(
  layoutId: string,
  updates: Partial<WidgetLayout>
): Promise<void> {
  const { id, widget_id, member_id, updated_at, ...safe } = updates;

  const sb = await getSupabaseClient();
  
  // Phase 4: Network Resilience - Use supabaseQuery with timeout
  // Select both position_x and launcher_order to verify updates for both canvas and launcher layouts
  const { data, error } = await supabaseQuery(
    () => sb
      .from("fridge_widget_layouts")
      .update(safe)
      .eq("id", layoutId)
      .select("id, position_x, launcher_order"), // Return updated fields to verify
    {
      timeout: 8000, // 8 second timeout for updates
      maxRetries: 2,
      context: { component: 'FridgeCanvas', action: 'updateWidgetLayout' },
    }
  );

  if (error) throw error;
  
  // Verify the update actually happened
  if (!data || data.length === 0) {
    throw new Error(`Failed to update layout ${layoutId} - no rows affected`);
  }
}

/* ======================================================================
   DELETE WIDGET (soft delete - moves to trash)
   ====================================================================== */
export async function deleteWidget(widgetId: string): Promise<void> {
  const sb = await getSupabaseClient();
  const { error } = await sb
    .from("fridge_widgets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", widgetId);

  if (error) throw error;
}

/* ======================================================================
   RESTORE WIDGET (undelete from trash)
   ====================================================================== */
export async function restoreWidget(widgetId: string): Promise<void> {
  const sb = await getSupabaseClient();
  const { error } = await sb
    .from("fridge_widgets")
    .update({ deleted_at: null })
    .eq("id", widgetId);

  if (error) throw error;
}

/* ======================================================================
   PERMANENTLY DELETE WIDGET (hard delete)
   ====================================================================== */
export async function permanentlyDeleteWidget(widgetId: string): Promise<void> {
  const sb = await getSupabaseClient();

  // Delete layouts first
  await sb.from("fridge_widget_layouts").delete().eq("widget_id", widgetId);

  // Then delete widget
  const { error } = await sb
    .from("fridge_widgets")
    .delete()
    .eq("id", widgetId);

  if (error) throw error;
}

/* ======================================================================
   GET DELETED WIDGETS (trash)
   ====================================================================== */
export async function getDeletedWidgets(
  householdId: string
): Promise<FridgeWidget[]> {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("fridge_widgets")
    .select("*")
    .eq("space_id", householdId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* ======================================================================
   DEFAULT WIDGET CONTENT
   ====================================================================== */
export function getDefaultWidgetContent(type: WidgetType): WidgetContent {
  switch (type) {
    case "note":
      return { text: "", fontSize: "text-base" } as NoteContent;
    case "task":
      return { description: "", completed: false } as TaskContent;
    case "calendar":
      return { eventCount: 0, events: [] } as CalendarContent;
    case "achievements":
      return { totalAchievements: 0, unlockedCount: 0, progressPercentage: 0 };
    case "photo":
      return { url: "" } as PhotoContent;
    case "insight":
      return { category: "general" } as InsightContent;
    case "reminder":
      return { title: "", message: "", priority: "medium", completed: false } as ReminderContent;
    case "agreement":
      return { rules: [], agreedBy: [] } as AgreementContent;
    case "meal_planner":
      return { weekPlan: {} };
    case "grocery_list":
      return { items: [] };
    case "pantry":
      // Pantry has no content needed - uses intelligentGrocery service
      return {};
    case "stack_card":
      return { stackId: '', title: '', cardCount: 0, colorScheme: 'cyan' } as StackCardContent;
    case "files":
      return { spaceId: null, spaceType: 'personal', fileCount: 0 };
    case "collections":
      return {};
    case "tables":
      return { tableId: '', tableName: '', rowCount: 0, columnCount: 0 } as TablesContent;
    case "tracker_app":
      // Tracker app requires tracker_id to be set when creating
      // This default should never be used, but provides type safety
      return { tracker_id: '' } as TrackerAppContent;
    case "tracker_quicklink":
      // Tracker quicklink has no content needed
      return {} as TrackerQuickLinkContent;
    case "journal":
      // Journal has no content needed - space_id is passed via householdId prop
      return {} as JournalContent;
    case "workspace":
      // Workspace requires workspace_id, but we'll create it on first use
      return { workspace_id: '' } as WorkspaceContent;
    default:
      return {} as CustomContent;
  }
}

/* ======================================================================
   GROUP MANAGEMENT FUNCTIONS
   ====================================================================== */

/* ======================================================================
   LOAD GROUPS
   ====================================================================== */
export async function loadGroups(householdId: string): Promise<FridgeGroup[]> {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("fridge_groups")
    .select("*")
    .eq("space_id", householdId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/* ======================================================================
   CREATE GROUP
   ====================================================================== */
export async function createGroup(
  householdId: string,
  x: number,
  y: number
): Promise<FridgeGroup> {
  const profileId = await getProfileId();
  const sb = await getSupabaseClient();

  const { data, error } = await sb
    .from("fridge_groups")
    .insert({
      space_id: householdId,
      created_by: profileId,
      title: "New Group",
      x,
      y,
      width: 500,
      height: 400,
      color: "gray",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as FridgeGroup;
}

/* ======================================================================
   UPDATE GROUP
   ====================================================================== */
export async function updateGroup(
  groupId: string,
  updates: Partial<Omit<FridgeGroup, "id" | "space_id" | "created_by" | "created_at">>
): Promise<void> {
  const sb = await getSupabaseClient();
  const { error } = await sb
    .from("fridge_groups")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", groupId);

  if (error) throw error;
}

/* ======================================================================
   DELETE GROUP
   ====================================================================== */
export async function deleteGroup(groupId: string): Promise<void> {
  const sb = await getSupabaseClient();

  // First, unassign all widgets from this group
  await sb
    .from("fridge_widgets")
    .update({ group_id: null })
    .eq("group_id", groupId);

  // Then delete the group
  const { error } = await sb
    .from("fridge_groups")
    .delete()
    .eq("id", groupId);

  if (error) throw error;
}

/* ======================================================================
   ASSIGN WIDGET TO GROUP
   ====================================================================== */
export async function assignWidgetToGroup(
  widgetId: string,
  groupId: string | null
): Promise<void> {
  console.log('🔵 assignWidgetToGroup called', { widgetId, groupId });

  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("fridge_widgets")
    .update({ group_id: groupId })
    .eq("id", widgetId)
    .select("*")
    .single();

  console.log('💾 Supabase update result:', { data, error });

  if (error) {
    console.error('❌ Supabase update failed:', error);
    throw error;
  }

  console.log('✅ Widget group assignment successful');
}
