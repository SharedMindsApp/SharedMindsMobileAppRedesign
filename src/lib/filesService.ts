import { supabase } from './supabase';
import type { FileRecord, FileTag, FileWithTags, FileUploadData, FileType } from './filesTypes';

const STORAGE_BUCKET = 'files';

const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
];

export function isFileTypeSupported(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType);
}

export function getSupportedFileTypesMessage(): string {
  return 'Supported formats: Images (JPG, PNG, GIF, WebP, SVG), Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX), Text (TXT, CSV, HTML, MD), Archives (ZIP), Audio/Video (MP3, MP4, WAV, MOV, AVI)';
}

function sanitizeFilename(filename: string): string {
  const parts = filename.split('.');
  const extension = parts.length > 1 ? parts.pop() : '';
  const nameWithoutExt = parts.join('.');

  const sanitized = nameWithoutExt
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .trim()
    .substring(0, 100);

  return extension ? `${sanitized}.${extension}` : sanitized;
}

function getFileType(mimeType: string): FileType {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') return 'docx';
  if (mimeType.startsWith('image/')) return 'image';
  return 'other';
}

export async function uploadFile(data: FileUploadData): Promise<FileRecord> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!isFileTypeSupported(data.file.type)) {
    const fileExt = data.file.name.split('.').pop() || '';
    throw new Error(
      `File type not supported: ${fileExt ? `.${fileExt}` : data.file.type}\n\n${getSupportedFileTypesMessage()}`
    );
  }

  const fileId = crypto.randomUUID();
  const fileExtension = data.file.name.split('.').pop();
  const sanitizedFilename = sanitizeFilename(data.file.name);
  const storagePath = `${user.id}/${data.space_type}/${fileId}/${sanitizedFilename}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, data.file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const fileType = getFileType(data.file.type);

  const { data: fileRecord, error: dbError } = await supabase
    .from('files')
    .insert({
      id: fileId,
      user_id: user.id,
      space_id: data.space_id,
      space_type: data.space_type,
      original_filename: data.file.name,
      display_filename: data.file.name,
      file_type: fileType,
      mime_type: data.file.type,
      file_size: data.file.size,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw dbError;
  }

  return fileRecord;
}

export async function getFilesForSpace(
  spaceId: string | null,
  spaceType: 'personal' | 'shared'
): Promise<FileWithTags[]> {
  let query = supabase
    .from('files')
    .select(`
      *,
      file_tag_assignments(
        tag_id,
        file_tags(*)
      )
    `)
    .eq('space_type', spaceType)
    .order('created_at', { ascending: false });

  if (spaceType === 'personal') {
    query = query.is('space_id', null);
  } else {
    query = query.eq('space_id', spaceId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(file => ({
    ...file,
    tags: file.file_tag_assignments?.map((a: any) => a.file_tags).filter(Boolean) || [],
  }));
}

export async function searchFiles(
  spaceId: string | null,
  spaceType: 'personal' | 'shared',
  searchTerm: string
): Promise<FileWithTags[]> {
  const files = await getFilesForSpace(spaceId, spaceType);

  if (!searchTerm.trim()) return files;

  const term = searchTerm.toLowerCase();

  return files.filter(file => {
    const filenameMatch = file.display_filename.toLowerCase().includes(term);
    const tagMatch = file.tags.some(tag => tag.name.toLowerCase().includes(term));
    return filenameMatch || tagMatch;
  });
}

export async function renameFile(fileId: string, newFilename: string): Promise<void> {
  const { error } = await supabase
    .from('files')
    .update({
      display_filename: newFilename,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fileId);

  if (error) throw error;
}

export async function deleteFile(fileId: string): Promise<void> {
  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('storage_path')
    .eq('id', fileId)
    .single();

  if (fetchError) throw fetchError;
  if (!file) throw new Error('File not found');

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([file.storage_path]);

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (dbError) throw dbError;
}

export async function downloadFile(file: FileRecord): Promise<void> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(file.storage_path);

  if (error) throw error;
  if (!data) throw new Error('File not found');

  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.display_filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function getUserTags(): Promise<FileTag[]> {
  const { data, error } = await supabase
    .from('file_tags')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createTag(name: string): Promise<FileTag> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('file_tags')
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function assignTagToFile(fileId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('file_tag_assignments')
    .insert({ file_id: fileId, tag_id: tagId });

  if (error) throw error;
}

export async function removeTagFromFile(fileId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('file_tag_assignments')
    .delete()
    .eq('file_id', fileId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getFileIcon(fileType: string): string {
  switch (fileType) {
    case 'pdf': return '📄';
    case 'docx': return '📝';
    case 'image': return '🖼️';
    default: return '📎';
  }
}
