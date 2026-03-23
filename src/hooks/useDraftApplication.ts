import { useState } from 'react';
import { applyDraft, markDraftAsPartiallyApplied, discardDraft } from '../lib/guardrails/ai/aiDraftService';
import type { AIDraft } from '../lib/guardrails/ai/aiTypes';

export interface ApplyDraftOptions {
  targetProjectId?: string;
  targetTrackId?: string;
  targetRoadmapItemId?: string;
  selectedElements?: string[];
}

export interface ApplyDraftResult {
  success: boolean;
  appliedItemIds?: string[];
  error?: string;
}

export function useDraftApplication() {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(
    draftId: string,
    userId: string,
    options: ApplyDraftOptions = {}
  ): Promise<ApplyDraftResult> {
    try {
      setApplying(true);
      setError(null);

      if (options.selectedElements && options.selectedElements.length > 0) {
        const result = await markDraftAsPartiallyApplied(
          draftId,
          userId,
          options.selectedElements
        );

        if (!result.success) {
          setError(result.error || 'Failed to apply draft partially');
          return { success: false, error: result.error };
        }

        return { success: true, appliedItemIds: result.appliedItemIds };
      } else {
        const result = await applyDraft(draftId, userId);

        if (!result.success) {
          setError(result.error || 'Failed to apply draft');
          return { success: false, error: result.error };
        }

        return { success: true, appliedItemIds: result.appliedItemIds };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply draft';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setApplying(false);
    }
  }

  async function discard(draftId: string, userId: string): Promise<ApplyDraftResult> {
    try {
      setApplying(true);
      setError(null);

      const result = await discardDraft(draftId, userId);

      if (!result.success) {
        setError(result.error || 'Failed to discard draft');
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to discard draft';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setApplying(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return {
    applying,
    error,
    apply,
    discard,
    clearError,
  };
}

export function validateDraftApplication(
  draft: AIDraft,
  targetProjectId?: string,
  targetTrackId?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (draft.status === 'accepted') {
    errors.push('This draft has already been applied');
  }

  if (draft.status === 'discarded') {
    errors.push('This draft has been discarded');
  }

  if (draft.draft_type === 'roadmap_item' && !targetTrackId) {
    errors.push('Target track required for roadmap item drafts');
  }

  if (draft.draft_type === 'task_list' && !targetProjectId) {
    errors.push('Target project required for task list drafts');
  }

  if (targetProjectId && draft.project_id && targetProjectId !== draft.project_id) {
    errors.push('Target project does not match draft project');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface DraftApplicationPreview {
  willCreate: string[];
  willUpdate: string[];
  willNotApply: string[];
  warnings: string[];
}

export function generateApplicationPreview(
  draft: AIDraft,
  selectedElements?: string[]
): DraftApplicationPreview {
  const preview: DraftApplicationPreview = {
    willCreate: [],
    willUpdate: [],
    willNotApply: [],
    warnings: [],
  };

  switch (draft.draft_type) {
    case 'roadmap_item':
      if (draft.content && typeof draft.content === 'object' && 'title' in draft.content) {
        preview.willCreate.push(`Roadmap item: "${draft.content.title}"`);
      }
      break;

    case 'task_list':
      if (draft.content && typeof draft.content === 'object' && 'tasks' in draft.content) {
        const tasks = draft.content.tasks as any[];
        if (selectedElements && selectedElements.length > 0) {
          const selected = tasks.filter((_, idx) => selectedElements.includes(String(idx)));
          selected.forEach((task) => {
            preview.willCreate.push(`Task: "${task.title}"`);
          });
          const notSelected = tasks.filter((_, idx) => !selectedElements.includes(String(idx)));
          notSelected.forEach((task) => {
            preview.willNotApply.push(`Task: "${task.title}"`);
          });
        } else {
          tasks.forEach((task) => {
            preview.willCreate.push(`Task: "${task.title}"`);
          });
        }
      }
      break;

    case 'checklist':
      if (draft.content && typeof draft.content === 'object' && 'items' in draft.content) {
        const items = draft.content.items as any[];
        if (selectedElements && selectedElements.length > 0) {
          const selected = items.filter((_, idx) => selectedElements.includes(String(idx)));
          selected.forEach((item) => {
            preview.willCreate.push(`Checklist item: "${item.text}"`);
          });
          const notSelected = items.filter((_, idx) => !selectedElements.includes(String(idx)));
          notSelected.forEach((item) => {
            preview.willNotApply.push(`Checklist item: "${item.text}"`);
          });
        } else {
          items.forEach((item) => {
            preview.willCreate.push(`Checklist item: "${item.text}"`);
          });
        }
      }
      break;

    case 'summary':
    case 'analysis':
    case 'risk_analysis':
      preview.warnings.push('This is an informational draft and will not create any records');
      break;

    default:
      preview.warnings.push('Unknown draft type - preview not available');
  }

  return preview;
}
