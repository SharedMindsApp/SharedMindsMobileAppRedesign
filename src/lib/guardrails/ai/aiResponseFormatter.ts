import type { AIResponse, AIResponseType, AIDraft, AIDraftType } from './aiTypes';

export type ResponseBlockType =
  | 'text'
  | 'heading'
  | 'list'
  | 'table'
  | 'code'
  | 'quote'
  | 'divider'
  | 'draft_card'
  | 'action_buttons';

export interface ResponseBlock {
  type: ResponseBlockType;
  content: any;
  metadata?: Record<string, any>;
}

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface HeadingBlock {
  type: 'heading';
  content: string;
  level: 1 | 2 | 3;
}

export interface ListBlock {
  type: 'list';
  content: {
    items: string[];
    ordered: boolean;
  };
}

export interface TableBlock {
  type: 'table';
  content: {
    headers: string[];
    rows: string[][];
  };
}

export interface CodeBlock {
  type: 'code';
  content: {
    code: string;
    language?: string;
  };
}

export interface QuoteBlock {
  type: 'quote';
  content: string;
}

export interface DividerBlock {
  type: 'divider';
  content: null;
}

export interface DraftCardBlock {
  type: 'draft_card';
  content: {
    draftId: string;
    draftType: AIDraftType;
    title: string;
    summary: string;
    preview: any;
  };
}

export interface ActionButtonsBlock {
  type: 'action_buttons';
  content: {
    buttons: Array<{
      action: string;
      label: string;
      variant: 'primary' | 'secondary' | 'danger';
      metadata?: Record<string, any>;
    }>;
  };
}

export interface StructuredAIResponse {
  responseType: AIResponseType;
  plainText: string;
  blocks: ResponseBlock[];
  draftPayloads: Array<{
    draftId: string;
    draftType: AIDraftType;
    content: any;
  }>;
  suggestedActions: Array<{
    action: string;
    label: string;
    description: string;
    requiresInput: boolean;
    inputSchema?: Record<string, any>;
  }>;
  metadata: {
    generatedAt: string;
    contextHash?: string;
  };
}

export function formatAIResponseForChat(
  response: AIResponse,
  draftId?: string
): StructuredAIResponse {
  const blocks: ResponseBlock[] = [];
  const draftPayloads: StructuredAIResponse['draftPayloads'] = [];
  const suggestedActions: StructuredAIResponse['suggestedActions'] = [];
  let plainText = '';

  switch (response.responseType) {
    case 'explanation':
      plainText = formatExplanation(response, blocks);
      suggestedActions.push({
        action: 'save_as_note',
        label: 'Save as Note',
        description: 'Save this explanation for future reference',
        requiresInput: false,
      });
      break;

    case 'summary':
      plainText = formatSummary(response, blocks);
      suggestedActions.push(
        {
          action: 'save_as_note',
          label: 'Save as Note',
          description: 'Save this summary',
          requiresInput: false,
        },
        {
          action: 'export',
          label: 'Export',
          description: 'Export summary as document',
          requiresInput: false,
        }
      );
      break;

    case 'draft':
      plainText = formatDraft(response, blocks, draftPayloads, draftId);
      suggestedActions.push(
        {
          action: 'review_draft',
          label: 'Review & Edit',
          description: 'Review and edit the draft before applying',
          requiresInput: false,
        },
        {
          action: 'apply_draft',
          label: 'Apply',
          description: 'Apply this draft to create authoritative entity',
          requiresInput: true,
          inputSchema: { trackId: 'string?' },
        },
        {
          action: 'discard_draft',
          label: 'Discard',
          description: 'Discard this draft',
          requiresInput: false,
        }
      );
      break;

    case 'suggestion':
      plainText = formatSuggestion(response, blocks);
      suggestedActions.push(
        {
          action: 'save_as_note',
          label: 'Save Suggestion',
          description: 'Save for later consideration',
          requiresInput: false,
        },
        {
          action: 'create_task',
          label: 'Create Task',
          description: 'Turn this suggestion into a task',
          requiresInput: false,
        }
      );
      break;

    case 'critique':
      plainText = formatCritique(response, blocks);
      suggestedActions.push({
        action: 'save_as_note',
        label: 'Save Critique',
        description: 'Save this analysis',
        requiresInput: false,
      });
      break;

    case 'comparison':
      plainText = formatComparison(response, blocks);
      suggestedActions.push({
        action: 'save_as_note',
        label: 'Save Comparison',
        description: 'Save this comparison',
        requiresInput: false,
      });
      break;

    case 'checklist':
      plainText = formatChecklist(response, blocks);
      suggestedActions.push(
        {
          action: 'save_as_note',
          label: 'Save Checklist',
          description: 'Save for reference',
          requiresInput: false,
        },
        {
          action: 'create_tasks',
          label: 'Create Tasks',
          description: 'Turn checklist items into tasks',
          requiresInput: false,
        }
      );
      break;

    case 'timeline_proposal':
      plainText = formatTimeline(response, blocks);
      suggestedActions.push(
        {
          action: 'review_draft',
          label: 'Review Timeline',
          description: 'Review and adjust timeline',
          requiresInput: false,
        },
        {
          action: 'apply_timeline',
          label: 'Apply Timeline',
          description: 'Create roadmap items from timeline',
          requiresInput: true,
        }
      );
      break;

    case 'analysis':
      plainText = formatAnalysis(response, blocks);
      suggestedActions.push({
        action: 'save_as_note',
        label: 'Save Analysis',
        description: 'Save for reference',
        requiresInput: false,
      });
      break;

    case 'recommendation':
      plainText = formatRecommendation(response, blocks);
      suggestedActions.push({
        action: 'save_as_note',
        label: 'Save Recommendation',
        description: 'Save for consideration',
        requiresInput: false,
      });
      break;
  }

  if (suggestedActions.length > 0) {
    blocks.push({
      type: 'action_buttons',
      content: {
        buttons: suggestedActions.map(a => ({
          action: a.action,
          label: a.label,
          variant: a.action.includes('discard') ? 'danger' : a.action.includes('apply') ? 'primary' : 'secondary',
          metadata: { requiresInput: a.requiresInput },
        })),
      },
    });
  }

  return {
    responseType: response.responseType,
    plainText,
    blocks,
    draftPayloads,
    suggestedActions,
    metadata: {
      generatedAt: response.metadata.generatedAt,
      contextHash: response.metadata.contextScope.projectId,
    },
  };
}

function formatExplanation(response: AIResponse, blocks: ResponseBlock[]): string {
  const data: any = response.data;
  blocks.push({ type: 'heading', content: data.subject || 'Explanation', level: 2 } as HeadingBlock);
  blocks.push({ type: 'text', content: data.explanation } as TextBlock);
  return `${data.subject}: ${data.explanation}`;
}

function formatSummary(response: AIResponse, blocks: ResponseBlock[]): string {
  const data: any = response.data;
  blocks.push({ type: 'text', content: data.summary } as TextBlock);

  if (data.keyPoints && data.keyPoints.length > 0) {
    blocks.push({ type: 'divider', content: null } as DividerBlock);
    blocks.push({ type: 'heading', content: 'Key Points', level: 3 } as HeadingBlock);
    blocks.push({
      type: 'list',
      content: { items: data.keyPoints, ordered: false },
    } as ListBlock);
  }

  return `${data.summary}\n\nKey Points:\n${data.keyPoints?.map((p: string) => `• ${p}`).join('\n')}`;
}

function formatDraft(
  response: AIResponse,
  blocks: ResponseBlock[],
  draftPayloads: StructuredAIResponse['draftPayloads'],
  draftId?: string
): string {
  const draft: any = response.data;

  if (draftId) {
    blocks.push({
      type: 'draft_card',
      content: {
        draftId,
        draftType: draft.draftType || 'roadmap_item',
        title: draft.title || 'Draft',
        summary: draft.description || draft.reasoning || 'AI-generated draft ready for review',
        preview: draft,
      },
    } as DraftCardBlock);

    draftPayloads.push({
      draftId,
      draftType: draft.draftType || 'roadmap_item',
      content: draft,
    });
  }

  return `Draft created: ${draft.title || 'Untitled'}`;
}

function formatSuggestion(response: AIResponse, blocks: ResponseBlock[]): string {
  const data: any = response.data;
  blocks.push({ type: 'heading', content: data.title || 'Suggestion', level: 2 } as HeadingBlock);
  blocks.push({ type: 'text', content: data.description } as TextBlock);

  if (data.rationale) {
    blocks.push({ type: 'divider', content: null } as DividerBlock);
    blocks.push({ type: 'quote', content: `Rationale: ${data.rationale}` } as QuoteBlock);
  }

  return `${data.title}: ${data.description}`;
}

function formatCritique(response: AIResponse, blocks: ResponseBlock[]): string {
  const data: any = response.data;
  blocks.push({ type: 'heading', content: data.subject || 'Critique', level: 2 } as HeadingBlock);

  if (data.strengths && data.strengths.length > 0) {
    blocks.push({ type: 'heading', content: 'Strengths', level: 3 } as HeadingBlock);
    blocks.push({
      type: 'list',
      content: { items: data.strengths, ordered: false },
    } as ListBlock);
  }

  if (data.weaknesses && data.weaknesses.length > 0) {
    blocks.push({ type: 'heading', content: 'Weaknesses', level: 3 } as HeadingBlock);
    blocks.push({
      type: 'list',
      content: { items: data.weaknesses, ordered: false },
    } as ListBlock);
  }

  if (data.recommendations && data.recommendations.length > 0) {
    blocks.push({ type: 'heading', content: 'Recommendations', level: 3 } as HeadingBlock);
    blocks.push({
      type: 'list',
      content: { items: data.recommendations, ordered: false },
    } as ListBlock);
  }

  return `Critique: ${data.overallAssessment}`;
}

function formatComparison(response: AIResponse, blocks: ResponseBlock[]): string {
  const data: any = response.data;
  blocks.push({ type: 'heading', content: 'Comparison', level: 2 } as HeadingBlock);

  const tableData = {
    headers: ['', 'Pros', 'Cons'],
    rows: [
      [data.optionA?.title || 'Option A', data.optionA?.pros.join(', ') || '', data.optionA?.cons.join(', ') || ''],
      [data.optionB?.title || 'Option B', data.optionB?.pros.join(', ') || '', data.optionB?.cons.join(', ') || ''],
    ],
  };

  blocks.push({ type: 'table', content: tableData } as TableBlock);

  if (data.recommendation) {
    blocks.push({ type: 'divider', content: null } as DividerBlock);
    blocks.push({ type: 'quote', content: `Recommendation: ${data.recommendation}` } as QuoteBlock);
  }

  return `Comparison: ${data.optionA?.title} vs ${data.optionB?.title}`;
}

function formatChecklist(response: AIResponse, blocks: ResponseBlock[]): string {
  const data: any = response.data;
  blocks.push({ type: 'heading', content: 'Checklist', level: 2 } as HeadingBlock);

  const items = data.items?.map((item: any) => item.text) || [];
  blocks.push({
    type: 'list',
    content: { items, ordered: false },
  } as ListBlock);

  return `Checklist (${items.length} items)`;
}

function formatTimeline(response: AIResponse, blocks: ResponseBlock[]): string {
  const data: any = response.data;
  blocks.push({ type: 'heading', content: 'Timeline Proposal', level: 2 } as HeadingBlock);

  if (data.phases) {
    blocks.push({
      type: 'list',
      content: {
        items: data.phases.map((p: any) => `${p.title} (${p.duration} days)`),
        ordered: true,
      },
    } as ListBlock);
  }

  return `Timeline: ${data.totalDuration} days total`;
}

function formatAnalysis(response: AIResponse, blocks: ResponseBlock[]): string {
  const data: any = response.data;
  blocks.push({ type: 'heading', content: 'Analysis', level: 2 } as HeadingBlock);
  blocks.push({ type: 'text', content: data.summary || 'Analysis complete' } as TextBlock);
  return data.summary || 'Analysis complete';
}

function formatRecommendation(response: AIResponse, blocks: ResponseBlock[]): string {
  const data: any = response.data;
  blocks.push({ type: 'heading', content: 'Recommendation', level: 2 } as HeadingBlock);
  blocks.push({ type: 'text', content: data.description || data.title } as TextBlock);
  return data.title || 'Recommendation';
}

export const RESPONSE_FORMAT_GUARANTEES = {
  UI_AGNOSTIC: 'Response blocks are UI-framework-agnostic',
  STRUCTURED_DATA: 'All responses have structured block representation',
  PLAIN_TEXT_FALLBACK: 'Plain text is always available',
  DRAFT_PAYLOADS_SEPARATE: 'Draft payloads are separate from display blocks',
  ACTION_SUGGESTIONS: 'Suggested actions are explicit and metadata-rich',
  REUSABLE: 'Blocks can be rendered in any UI (web, mobile, chat)',
};

export const SUPPORTED_ACTIONS = {
  save_as_note: 'Save response content as a note',
  export: 'Export response as document',
  review_draft: 'Open draft for review and editing',
  apply_draft: 'Apply draft via authoritative service',
  discard_draft: 'Discard draft',
  create_task: 'Create task from suggestion',
  create_tasks: 'Create multiple tasks',
  apply_timeline: 'Apply timeline to roadmap',
  attach_to_item: 'Attach content to roadmap item',
};
