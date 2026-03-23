import { supabase } from './supabase';

export type SyncableItemType =
  | 'calendar_event'
  | 'task'
  | 'note'
  | 'roadmap_item'
  | 'goal'
  | 'habit'
  | 'reminder'
  | 'offshoot_idea'
  | 'side_project'
  | 'focus_session'
  | 'mind_mesh_node'
  | 'fridge_widget'
  | 'stack_card';

export type LinkType = 'send' | 'duplicate' | 'linked';

export interface SharedSpaceLink {
  id: string;
  shared_space_id: string;
  item_type: SyncableItemType;
  item_id: string;
  link_type: LinkType;
  allow_edit: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

async function getPersonalSpaceId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: space } = await supabase
    .from('spaces')
    .select('id')
    .eq('space_type', 'personal')
    .eq('owner_id', user.id)
    .maybeSingle();

  return space?.id || null;
}

export async function syncToPersonalSpace(
  itemType: SyncableItemType,
  itemId: string,
  itemData: any
): Promise<void> {
  const personalSpaceId = await getPersonalSpaceId();
  if (!personalSpaceId) {
    throw new Error('Personal space not found');
  }

  const widgetType = getWidgetTypeForItem(itemType);
  if (!widgetType) {
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (!profile) throw new Error('Profile not found');

  const { data: existingWidget } = await supabase
    .from('fridge_widgets')
    .select('id')
    .eq('space_id', personalSpaceId)
    .eq('linked_guardrail_target_id', itemId)
    .eq('linked_guardrail_type', itemType)
    .maybeSingle();

  if (existingWidget) {
    await supabase
      .from('fridge_widgets')
      .update({
        title: itemData.title || itemData.name || 'Untitled',
        content: itemData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingWidget.id);
  } else {
    await supabase
      .from('fridge_widgets')
      .insert({
        space_id: personalSpaceId,
        created_by: profile.id,
        widget_type: widgetType,
        title: itemData.title || itemData.name || 'Untitled',
        content: itemData,
        linked_guardrail_target_id: itemId,
        linked_guardrail_type: itemType,
        visibility_scope: 'private',
        shared: false,
      });
  }
}

export async function removeFromPersonalSpace(
  itemType: SyncableItemType,
  itemId: string
): Promise<void> {
  const personalSpaceId = await getPersonalSpaceId();
  if (!personalSpaceId) return;

  await supabase
    .from('fridge_widgets')
    .delete()
    .eq('space_id', personalSpaceId)
    .eq('linked_guardrail_target_id', itemId)
    .eq('linked_guardrail_type', itemType);
}

export async function publishToSharedSpace(
  sharedSpaceId: string,
  itemType: SyncableItemType,
  itemId: string,
  linkType: LinkType,
  allowEdit: boolean
): Promise<SharedSpaceLink> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (!profile) throw new Error('Profile not found');

  const { data: link, error } = await supabase
    .from('shared_space_links')
    .insert({
      shared_space_id: sharedSpaceId,
      item_type: itemType,
      item_id: itemId,
      link_type: linkType,
      allow_edit: allowEdit,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) throw error;

  if (linkType === 'send' || linkType === 'duplicate') {
    const itemData = await fetchItemData(itemType, itemId);
    if (itemData) {
      const widgetType = getWidgetTypeForItem(itemType);
      if (widgetType) {
        await supabase
          .from('fridge_widgets')
          .insert({
            space_id: sharedSpaceId,
            created_by: profile.id,
            widget_type: widgetType,
            title: itemData.title || itemData.name || 'Untitled',
            content: itemData,
            linked_guardrail_target_id: linkType === 'linked' ? itemId : null,
            linked_guardrail_type: linkType === 'linked' ? itemType : null,
            visibility_scope: 'all',
            shared: true,
          });
      }
    }
  } else if (linkType === 'linked') {
    const itemData = await fetchItemData(itemType, itemId);
    if (itemData) {
      const widgetType = getWidgetTypeForItem(itemType);
      if (widgetType) {
        await supabase
          .from('fridge_widgets')
          .insert({
            space_id: sharedSpaceId,
            created_by: profile.id,
            widget_type: widgetType,
            title: itemData.title || itemData.name || 'Untitled',
            content: itemData,
            linked_guardrail_target_id: itemId,
            linked_guardrail_type: itemType,
            visibility_scope: 'all',
            shared: true,
          });
      }
    }
  }

  return link;
}

export async function unpublishFromSharedSpace(linkId: string): Promise<void> {
  const { data: link } = await supabase
    .from('shared_space_links')
    .select('*')
    .eq('id', linkId)
    .maybeSingle();

  if (!link) return;

  if (link.link_type !== 'linked') {
    await supabase
      .from('fridge_widgets')
      .delete()
      .eq('space_id', link.shared_space_id)
      .eq('linked_guardrail_target_id', link.item_id)
      .eq('linked_guardrail_type', link.item_type);
  }

  await supabase
    .from('shared_space_links')
    .delete()
    .eq('id', linkId);
}

export async function getSharedSpaceLinks(
  itemType: SyncableItemType,
  itemId: string
): Promise<SharedSpaceLink[]> {
  const { data, error } = await supabase
    .from('shared_space_links')
    .select('*')
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchItemData(itemType: SyncableItemType, itemId: string): Promise<any> {
  const tableMap: Record<SyncableItemType, string> = {
    calendar_event: 'calendar_events',
    task: 'roadmap_items',
    note: 'fridge_widgets',
    roadmap_item: 'roadmap_items',
    goal: 'household_goals',
    habit: 'habits',
    reminder: 'reminders',
    offshoot_idea: 'offshoot_ideas',
    side_project: 'side_projects',
    focus_session: 'focus_sessions',
    mind_mesh_node: 'guardrails_nodes',
    fridge_widget: 'fridge_widgets',
  };

  const tableName = tableMap[itemType];
  if (!tableName) return null;

  const { data } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  return data;
}

function getWidgetTypeForItem(itemType: SyncableItemType): string | null {
  const widgetMap: Record<SyncableItemType, string> = {
    calendar_event: 'calendar',
    task: 'task',
    note: 'note',
    roadmap_item: 'task',
    goal: 'goal',
    habit: 'habit',
    reminder: 'reminder',
    offshoot_idea: 'note',
    side_project: 'note',
    focus_session: 'note',
    mind_mesh_node: 'note',
    fridge_widget: 'custom',
  };

  return widgetMap[itemType] || null;
}
