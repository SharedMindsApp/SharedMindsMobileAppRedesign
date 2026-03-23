import { supabase } from './supabase';

export type ColorScheme = 'cyan' | 'lavender' | 'mint' | 'pink' | 'yellow' | 'gray';

export interface StackCard {
  id: string;
  user_id: string;
  space_id: string | null;
  title: string;
  color_scheme: ColorScheme;
  is_collapsed: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StackCardItem {
  id: string;
  stack_id: string;
  title: string;
  content: string;
  color_scheme: ColorScheme;
  card_order: number;
  created_at: string;
  updated_at: string;
}

export interface StackCardWithItems extends StackCard {
  items: StackCardItem[];
}

export const COLOR_SCHEMES: Record<ColorScheme, { bg: string; text: string; border: string; name: string }> = {
  cyan: {
    bg: 'bg-cyan-200',
    text: 'text-gray-800',
    border: 'border-cyan-300',
    name: 'Cyan',
  },
  lavender: {
    bg: 'bg-blue-300',
    text: 'text-gray-800',
    border: 'border-blue-400',
    name: 'Blue',
  },
  mint: {
    bg: 'bg-green-300',
    text: 'text-gray-800',
    border: 'border-green-400',
    name: 'Mint',
  },
  pink: {
    bg: 'bg-pink-300',
    text: 'text-gray-800',
    border: 'border-pink-400',
    name: 'Pink',
  },
  yellow: {
    bg: 'bg-yellow-200',
    text: 'text-gray-800',
    border: 'border-yellow-300',
    name: 'Yellow',
  },
  gray: {
    bg: 'bg-gray-200',
    text: 'text-gray-800',
    border: 'border-gray-300',
    name: 'Gray',
  },
};

export const MAX_CARD_CHARACTERS = 300;

export async function getStackCardsForUser(spaceId?: string | null): Promise<StackCardWithItems[]> {
  let query = supabase
    .from('stack_cards')
    .select('*')
    .order('display_order', { ascending: true });

  if (spaceId !== undefined) {
    query = spaceId === null
      ? query.is('space_id', null)
      : query.eq('space_id', spaceId);
  }

  const { data: stacks, error: stackError } = await query;

  if (stackError) throw stackError;
  if (!stacks || stacks.length === 0) return [];

  const stackIds = stacks.map(s => s.id);
  const { data: items, error: itemsError } = await supabase
    .from('stack_card_items')
    .select('*')
    .in('stack_id', stackIds)
    .order('card_order', { ascending: true });

  if (itemsError) throw itemsError;

  return stacks.map(stack => ({
    ...stack,
    items: (items || []).filter(item => item.stack_id === stack.id),
  }));
}

export async function getStackCard(stackId: string): Promise<StackCardWithItems | null> {
  const { data: stack, error: stackError } = await supabase
    .from('stack_cards')
    .select('*')
    .eq('id', stackId)
    .maybeSingle();

  if (stackError) throw stackError;
  if (!stack) return null;

  const { data: items, error: itemsError } = await supabase
    .from('stack_card_items')
    .select('*')
    .eq('stack_id', stackId)
    .order('card_order', { ascending: true });

  if (itemsError) throw itemsError;

  return {
    ...stack,
    items: items || [],
  };
}

export async function createStackCard(data: {
  title: string;
  color_scheme: ColorScheme;
  space_id?: string | null;
}): Promise<StackCard> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: stack, error } = await supabase
    .from('stack_cards')
    .insert({
      user_id: user.id,
      space_id: data.space_id || null,
      title: data.title,
      color_scheme: data.color_scheme,
      is_collapsed: false,
      display_order: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return stack;
}

export async function createStackCardWithInitialCards(data: {
  title: string;
  color_scheme: ColorScheme;
  space_id?: string | null;
}): Promise<StackCard> {
  const stack = await createStackCard(data);

  // Create 6 cards with different pastel colors
  const colors: ColorScheme[] = ['cyan', 'mint', 'yellow', 'pink', 'lavender', 'gray'];

  for (let i = 0; i < colors.length; i++) {
    await createStackCardItem({
      stack_id: stack.id,
      content: '',
      color_scheme: colors[i],
      card_order: i,
    });
  }

  return stack;
}

export async function updateStackCard(
  stackId: string,
  updates: Partial<Pick<StackCard, 'title' | 'color_scheme' | 'is_collapsed' | 'display_order'>>
): Promise<void> {
  const { error } = await supabase
    .from('stack_cards')
    .update(updates)
    .eq('id', stackId);

  if (error) throw error;
}

export async function deleteStackCard(stackId: string): Promise<void> {
  const { error } = await supabase
    .from('stack_cards')
    .delete()
    .eq('id', stackId);

  if (error) throw error;
}

export async function createStackCardItem(data: {
  stack_id: string;
  title?: string;
  content: string;
  color_scheme: ColorScheme;
  card_order?: number;
}): Promise<StackCardItem> {
  if (data.content.length > MAX_CARD_CHARACTERS) {
    throw new Error(`Card content cannot exceed ${MAX_CARD_CHARACTERS} characters`);
  }

  const { data: item, error } = await supabase
    .from('stack_card_items')
    .insert({
      stack_id: data.stack_id,
      title: data.title || '',
      content: data.content,
      color_scheme: data.color_scheme,
      card_order: data.card_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return item;
}

export async function updateStackCardItem(
  itemId: string,
  updates: Partial<Pick<StackCardItem, 'title' | 'content' | 'card_order' | 'color_scheme'>>
): Promise<void> {
  if (updates.content && updates.content.length > MAX_CARD_CHARACTERS) {
    throw new Error(`Card content cannot exceed ${MAX_CARD_CHARACTERS} characters`);
  }

  const { error } = await supabase
    .from('stack_card_items')
    .update(updates)
    .eq('id', itemId);

  if (error) throw error;
}

export async function deleteStackCardItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('stack_card_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function reorderStackCardItems(stackId: string, itemIds: string[]): Promise<void> {
  const updates = itemIds.map((itemId, index) => ({
    id: itemId,
    card_order: index,
  }));

  for (const update of updates) {
    await updateStackCardItem(update.id, { card_order: update.card_order });
  }
}

export async function duplicateStackCardItem(itemId: string): Promise<StackCardItem> {
  const { data: item, error } = await supabase
    .from('stack_card_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) throw error;
  if (!item) throw new Error('Item not found');

  const { data: maxOrder } = await supabase
    .from('stack_card_items')
    .select('card_order')
    .eq('stack_id', item.stack_id)
    .order('card_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  return createStackCardItem({
    stack_id: item.stack_id,
    title: item.title,
    content: item.content,
    color_scheme: item.color_scheme,
    card_order: (maxOrder?.card_order ?? 0) + 1,
  });
}
