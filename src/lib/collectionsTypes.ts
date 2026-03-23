export type SpaceType = 'personal' | 'shared';
export type EntityType = 'link' | 'file' | 'table' | 'note';

export interface Collection {
  id: string;
  space_id: string | null;
  space_type: SpaceType;
  user_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionReference {
  id: string;
  collection_id: string;
  entity_type: EntityType;
  entity_id: string | null;
  link_url: string | null;
  link_title: string | null;
  link_description: string | null;
  display_order: number;
  added_by: string;
  created_at: string;
}

export interface CollectionWithChildren extends Collection {
  children: CollectionWithChildren[];
  referenceCount?: number;
}

export interface CollectionReferenceWithTags extends CollectionReference {
  tags?: Array<{ id: string; name: string }>;
  file_name?: string;
  file_type?: string;
  file_size?: number;
}

export interface CreateCollectionData {
  space_id: string | null;
  space_type: SpaceType;
  parent_id?: string | null;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateCollectionData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string | null;
  display_order?: number;
}

export interface CreateReferenceData {
  collection_id: string;
  entity_type: EntityType;
  entity_id?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  display_order?: number;
}

export interface CollectionTreeNode extends Collection {
  children: CollectionTreeNode[];
  depth: number;
  referenceCount: number;
}

export const COLLECTION_COLORS = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-500' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: 'text-pink-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-500' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-500' },
};
