import { supabase } from './supabase';
import type { MobileAppLayout, MobileAppFolder, UIMode, AppType, DEFAULT_APPS } from './mobileTypes';
import { DEFAULT_APPS as DEFAULT_APP_LIST } from './mobileTypes';

export async function getProfileIdFromAuthUserId(authUserId: string): Promise<string | null> {
  // In V1 schema, profiles.id IS the auth user id (references auth.users(id))
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', authUserId)
    .maybeSingle();

  if (error) throw error;

  return data?.id || null;
}

export async function getUserUIMode(_authUserId: string): Promise<UIMode> {
  // ui_mode column was removed in V1 schema — always return 'fridge' (default)
  return 'fridge';
}

export async function setUserUIMode(_authUserId: string, _mode: UIMode): Promise<void> {
  // ui_mode column was removed in V1 schema — no-op
}

export async function getMobileAppLayout(profileId: string): Promise<MobileAppLayout[]> {
  const { data, error } = await supabase
    .from('mobile_app_layout')
    .select('*')
    .eq('profile_id', profileId)
    .order('page', { ascending: true })
    .order('position', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function initializeDefaultAppLayout(profileId: string): Promise<void> {
  const existingLayout = await getMobileAppLayout(profileId);

  if (existingLayout.length === 0) {
    const defaultApps = DEFAULT_APP_LIST.map((appType, index) => ({
      profile_id: profileId,
      app_type: appType,
      page: Math.floor(index / 16),
      position: index % 16,
      widget_id: null,
      folder_id: null
    }));

    const { error } = await supabase
      .from('mobile_app_layout')
      .insert(defaultApps);

    if (error) throw error;
    return;
  }

  const existingAppTypes = new Set(existingLayout.map(app => app.app_type));
  const missingApps = DEFAULT_APP_LIST.filter(appType => !existingAppTypes.has(appType));

  if (missingApps.length > 0) {
    const maxPosition = Math.max(...existingLayout.map(app => app.page * 16 + app.position));
    const newApps = missingApps.map((appType, index) => {
      const position = maxPosition + 1 + index;
      return {
        profile_id: profileId,
        app_type: appType,
        page: Math.floor(position / 16),
        position: position % 16,
        widget_id: null,
        folder_id: null
      };
    });

    const { error } = await supabase
      .from('mobile_app_layout')
      .insert(newApps);

    if (error) throw error;
  }
}

export async function updateAppPosition(
  appId: string,
  page: number,
  position: number,
  folderId?: string | null
): Promise<void> {
  const updates: Partial<MobileAppLayout> = {
    page,
    position
  };

  if (folderId !== undefined) {
    updates.folder_id = folderId;
  }

  const { error } = await supabase
    .from('mobile_app_layout')
    .update(updates)
    .eq('id', appId);

  if (error) throw error;
}

export async function addWidgetToMobile(
  profileId: string,
  widgetId: string,
  page: number,
  position: number
): Promise<MobileAppLayout> {
  const { data, error } = await supabase
    .from('mobile_app_layout')
    .insert({
      profile_id: profileId,
      widget_id: widgetId,
      app_type: 'widget',
      page,
      position,
      folder_id: null
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function removeAppFromMobile(appId: string): Promise<void> {
  const { error } = await supabase
    .from('mobile_app_layout')
    .delete()
    .eq('id', appId);

  if (error) throw error;
}

export async function getMobileFolders(profileId: string): Promise<MobileAppFolder[]> {
  const { data, error } = await supabase
    .from('mobile_app_folders')
    .select('*')
    .eq('profile_id', profileId)
    .order('page', { ascending: true })
    .order('position', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function createFolder(
  profileId: string,
  name: string,
  page: number,
  position: number
): Promise<MobileAppFolder> {
  const { data, error } = await supabase
    .from('mobile_app_folders')
    .insert({
      profile_id: profileId,
      name,
      page,
      position
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateFolder(
  folderId: string,
  updates: Partial<MobileAppFolder>
): Promise<void> {
  const { error } = await supabase
    .from('mobile_app_folders')
    .update(updates)
    .eq('id', folderId);

  if (error) throw error;
}

export async function deleteFolder(folderId: string): Promise<void> {
  await supabase
    .from('mobile_app_layout')
    .update({ folder_id: null })
    .eq('folder_id', folderId);

  const { error } = await supabase
    .from('mobile_app_folders')
    .delete()
    .eq('id', folderId);

  if (error) throw error;
}

export async function batchUpdateAppPositions(
  updates: Array<{ id: string; page: number; position: number; folder_id?: string | null }>
): Promise<void> {
  const promises = updates.map(update =>
    updateAppPosition(update.id, update.page, update.position, update.folder_id)
  );

  await Promise.all(promises);
}
