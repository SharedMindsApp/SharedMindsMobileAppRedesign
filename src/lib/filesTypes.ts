export type FileType = 'pdf' | 'docx' | 'image' | 'other';
export type SpaceType = 'personal' | 'shared';

export interface FileRecord {
  id: string;
  user_id: string;
  space_id: string | null;
  space_type: SpaceType;
  original_filename: string;
  display_filename: string;
  file_type: FileType;
  mime_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export interface FileTag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface FileTagAssignment {
  file_id: string;
  tag_id: string;
  created_at: string;
}

export interface FileWithTags extends FileRecord {
  tags: FileTag[];
}

export type ViewMode = 'list' | 'grid';

export interface FileUploadData {
  file: File;
  space_id: string | null;
  space_type: SpaceType;
}
