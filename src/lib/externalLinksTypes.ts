export type ExternalLinkContentType = 'video' | 'article' | 'social' | 'documentation' | 'recipe' | 'other';

export interface ExternalLink {
  id: string;
  space_id: string | null;
  space_type: 'personal' | 'shared';
  url: string;
  title: string;
  description: string | null;
  domain: string;
  thumbnail_url: string | null;
  author: string | null;
  content_type: ExternalLinkContentType | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface LinkTag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface LinkTagAssignment {
  link_id: string;
  tag_id: string;
  created_at: string;
}

export interface CollectionExternalLink {
  id: string;
  collection_id: string;
  link_id: string;
  added_by: string;
  added_at: string;
  display_order: number;
}

export interface ExternalLinkWithTags extends ExternalLink {
  tags?: LinkTag[];
}

export interface CreateExternalLinkParams {
  space_id?: string | null;
  space_type: 'personal' | 'shared';
  url: string;
  title: string;
  description?: string | null;
  domain: string;
  thumbnail_url?: string | null;
  author?: string | null;
  content_type?: ExternalLinkContentType | null;
}

export interface UpdateExternalLinkParams {
  title?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  author?: string | null;
  content_type?: ExternalLinkContentType | null;
}

export interface LinkMetadata {
  title: string;
  description?: string;
  domain: string;
  thumbnail_url?: string;
  author?: string;
  content_type?: ExternalLinkContentType;
  is_valid: boolean;
  error?: string;
}
