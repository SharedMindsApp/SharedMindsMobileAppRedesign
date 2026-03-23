/**
 * Document Service
 * 
 * Phase 3.3: Documents Micro-App Service Layer
 * 
 * Handles document storage and management for Track & Subtrack Workspaces.
 * All database and storage access goes through this service layer.
 * 
 * ARCHITECTURAL RULES (Non-Negotiable):
 * - ✅ All DB access through this service
 * - ✅ All Storage access through this service
 * - ✅ UI components never query Supabase directly
 * - ✅ Errors returned, not thrown blindly
 * - ✅ Documents belong to Workspaces, not Roadmap
 */

import { supabase } from '../../supabase';

export interface TrackDocument {
  id: string;
  track_id: string;
  subtrack_id: string | null;
  title: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateTrackDocumentInput {
  trackId: string;
  subtrackId?: string | null;
  title: string;
  file: File;
  metadata?: Record<string, any>;
}

export interface UpdateTrackDocumentMetadataInput {
  title?: string;
  metadata?: Record<string, any>;
}

const STORAGE_BUCKET = 'track-documents';

/**
 * Get all documents for a track (and optionally a subtrack)
 */
export async function getTrackDocuments(
  trackId: string,
  subtrackId?: string | null
): Promise<TrackDocument[]> {
  let query = supabase
    .from('track_documents')
    .select('*')
    .eq('track_id', trackId)
    .order('uploaded_at', { ascending: false });

  if (subtrackId !== undefined && subtrackId !== null) {
    query = query.eq('subtrack_id', subtrackId);
  } else {
    query = query.is('subtrack_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[documentService] Error fetching documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return (data || []).map(mapDbDocumentToTrackDocument);
}

/**
 * Upload a document to a track
 */
export async function uploadTrackDocument(
  input: CreateTrackDocumentInput,
  userId: string,
  projectId: string
): Promise<TrackDocument> {
  const { trackId, subtrackId, title, file, metadata = {} } = input;

  // Generate document ID for storage path
  const documentId = crypto.randomUUID();

  // Build storage path: {projectId}/{trackId}/{subtrackId?}/{documentId}
  const storagePathParts = [projectId, trackId];
  if (subtrackId) {
    storagePathParts.push(subtrackId);
  }
  storagePathParts.push(documentId);
  const storagePath = storagePathParts.join('/');

  try {
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[documentService] Error uploading file:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Insert document metadata into database
    const { data: dbData, error: dbError } = await supabase
      .from('track_documents')
      .insert({
        id: documentId,
        track_id: trackId,
        subtrack_id: subtrackId || null,
        title,
        file_path: storagePath,
        file_type: file.type || null,
        file_size: file.size || null,
        uploaded_by: userId,
        metadata,
      })
      .select()
      .single();

    if (dbError) {
      // Try to clean up uploaded file if DB insert fails
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      console.error('[documentService] Error inserting document metadata:', dbError);
      throw new Error(`Failed to save document metadata: ${dbError.message}`);
    }

    return mapDbDocumentToTrackDocument(dbData);
  } catch (error) {
    console.error('[documentService] Error in uploadTrackDocument:', error);
    throw error;
  }
}

/**
 * Delete a document
 */
export async function deleteTrackDocument(documentId: string): Promise<void> {
  // First, get the document to get the file path
  const { data: document, error: fetchError } = await supabase
    .from('track_documents')
    .select('file_path')
    .eq('id', documentId)
    .single();

  if (fetchError) {
    console.error('[documentService] Error fetching document for deletion:', fetchError);
    throw new Error(`Failed to fetch document: ${fetchError.message}`);
  }

  if (!document) {
    throw new Error('Document not found');
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([document.file_path]);

  if (storageError) {
    console.error('[documentService] Error deleting file from storage:', storageError);
    // Continue with DB deletion even if storage deletion fails
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('track_documents')
    .delete()
    .eq('id', documentId);

  if (dbError) {
    console.error('[documentService] Error deleting document metadata:', dbError);
    throw new Error(`Failed to delete document: ${dbError.message}`);
  }
}

/**
 * Update document metadata (title and/or metadata JSON)
 */
export async function updateTrackDocumentMetadata(
  documentId: string,
  updates: UpdateTrackDocumentMetadataInput
): Promise<TrackDocument> {
  const updateData: any = {};

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  if (updates.metadata !== undefined) {
    updateData.metadata = updates.metadata;
  }

  const { data, error } = await supabase
    .from('track_documents')
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    console.error('[documentService] Error updating document metadata:', error);
    throw new Error(`Failed to update document: ${error.message}`);
  }

  return mapDbDocumentToTrackDocument(data);
}

/**
 * Get a signed URL for downloading a document
 */
export async function getDocumentDownloadUrl(
  documentId: string,
  expiresIn: number = 3600
): Promise<string> {
  // Get the document to get the file path
  const { data: document, error: fetchError } = await supabase
    .from('track_documents')
    .select('file_path')
    .eq('id', documentId)
    .single();

  if (fetchError || !document) {
    console.error('[documentService] Error fetching document for download:', fetchError);
    throw new Error('Document not found');
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(document.file_path, expiresIn);

  if (error) {
    console.error('[documentService] Error creating signed URL:', error);
    throw new Error(`Failed to create download URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Map database document to TrackDocument interface
 */
function mapDbDocumentToTrackDocument(dbDocument: any): TrackDocument {
  return {
    id: dbDocument.id,
    track_id: dbDocument.track_id,
    subtrack_id: dbDocument.subtrack_id,
    title: dbDocument.title,
    file_path: dbDocument.file_path,
    file_type: dbDocument.file_type,
    file_size: dbDocument.file_size,
    uploaded_by: dbDocument.uploaded_by,
    uploaded_at: dbDocument.uploaded_at,
    metadata: dbDocument.metadata || {},
    created_at: dbDocument.created_at,
    updated_at: dbDocument.updated_at,
  };
}
