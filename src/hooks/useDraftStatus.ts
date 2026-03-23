import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AIDraft } from '../lib/guardrails/ai/aiTypes';

export function useDraftStatus(draft: AIDraft | null, userId: string) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateTitle(newTitle: string): Promise<{ success: boolean; error?: string }> {
    if (!draft) {
      return { success: false, error: 'No draft selected' };
    }

    if (draft.user_id !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('ai_drafts')
        .update({ title: newTitle })
        .eq('id', draft.id)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update title';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  }

  async function updateContent(newContent: any): Promise<{ success: boolean; error?: string }> {
    if (!draft) {
      return { success: false, error: 'No draft selected' };
    }

    if (draft.user_id !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    if (draft.status === 'accepted' || draft.status === 'discarded') {
      return { success: false, error: 'Cannot edit applied or discarded drafts' };
    }

    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('ai_drafts')
        .update({
          content: newContent,
          status: 'edited',
        })
        .eq('id', draft.id)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update content';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  }

  async function addNote(note: string): Promise<{ success: boolean; error?: string }> {
    if (!draft) {
      return { success: false, error: 'No draft selected' };
    }

    if (draft.user_id !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    try {
      setSaving(true);
      setError(null);

      const existingContent = draft.content || {};
      const updatedContent = {
        ...existingContent,
        user_notes: [...(existingContent.user_notes || []), note],
      };

      const { error: updateError } = await supabase
        .from('ai_drafts')
        .update({ content: updatedContent })
        .eq('id', draft.id)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add note';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return {
    saving,
    error,
    updateTitle,
    updateContent,
    addNote,
    clearError,
  };
}

export function getDraftStatusColor(status: string): string {
  switch (status) {
    case 'generated':
      return 'bg-blue-100 text-blue-800';
    case 'edited':
      return 'bg-yellow-100 text-yellow-800';
    case 'partially_applied':
      return 'bg-purple-100 text-purple-800';
    case 'accepted':
      return 'bg-green-100 text-green-800';
    case 'discarded':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function getDraftStatusLabel(status: string): string {
  switch (status) {
    case 'generated':
      return 'New';
    case 'edited':
      return 'Edited';
    case 'partially_applied':
      return 'Partially Applied';
    case 'accepted':
      return 'Applied';
    case 'discarded':
      return 'Discarded';
    default:
      return status;
  }
}

export function getDraftTypeLabel(draftType: string): string {
  switch (draftType) {
    case 'roadmap_item':
      return 'Roadmap Item';
    case 'task_list':
      return 'Task List';
    case 'checklist':
      return 'Checklist';
    case 'timeline':
      return 'Timeline';
    case 'summary':
      return 'Summary';
    case 'analysis':
      return 'Analysis';
    case 'risk_analysis':
      return 'Risk Analysis';
    default:
      return draftType;
  }
}

export function getDraftTypeIcon(draftType: string): string {
  switch (draftType) {
    case 'roadmap_item':
      return 'Map';
    case 'task_list':
      return 'ListTodo';
    case 'checklist':
      return 'CheckSquare';
    case 'timeline':
      return 'Calendar';
    case 'summary':
      return 'FileText';
    case 'analysis':
      return 'BarChart3';
    case 'risk_analysis':
      return 'AlertTriangle';
    default:
      return 'File';
  }
}

export function isApplicableDraft(draft: AIDraft): boolean {
  return draft.status === 'generated' || draft.status === 'edited';
}

export function canEditDraft(draft: AIDraft): boolean {
  return draft.status === 'generated' || draft.status === 'edited';
}

export function isDraftOutdated(draft: AIDraft): boolean {
  const createdAt = new Date(draft.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  return hoursSinceCreation > 72;
}
