import { z } from 'zod';

export const AIProjectIntakeSchema = z.object({
  goals: z.array(z.string()).min(1),
  concepts: z.array(z.string()).min(1),
  entities: z.array(z.string()).optional(),
  outputType: z.enum([
    'writing',
    'startup',
    'learning',
    'fitness',
    'system',
    'creative',
    'other',
  ]),
  confidence: z.number().min(0).max(1),
});

export const AIClarificationQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(5),
  type: z.enum(['text', 'single_choice', 'multi_choice']),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
});

export const AIStructureDraftSchema = z.object({
  tracks: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      subtracks: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        })
      ).optional(),
    })
  ),

  roadmapItems: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      type: z.enum(['task', 'event', 'milestone']),
      trackName: z.string(),
    })
  ).optional(),

  milestones: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
    })
  ).optional(),

  mindMeshNodes: z.array(
    z.object({
      label: z.string(),
      relatedTo: z.array(z.string()).optional(),
    })
  ).optional(),

  version: z.enum(['lean', 'standard', 'detailed']),
});

export const AITemplateMatchSchema = z.object({
  templateId: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  suggestedModifications: z.array(z.string()).optional(),
});

export const AIOffshotsAnalysisSchema = z.object({
  offshoots: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      category: z.enum(['idea', 'concern', 'blocker', 'opportunity']).default('idea'),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
    })
  ),
  summary: z.string().optional(),
});

export const AIRoadmapSuggestionSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      type: z.enum(['task', 'event', 'milestone']),
      trackName: z.string().optional(),
      estimatedDuration: z.string().optional(),
      dependencies: z.array(z.string()).optional(),
    })
  ),
  reasoning: z.string().optional(),
});

export const AIProjectTypeRecommendationSchema = z.object({
  projectTypeId: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  alternativeTypes: z.array(z.string()).optional(),
});

export const AITagSuggestionSchema = z.object({
  tags: z.array(z.string()).min(0).max(10),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

export type AIProjectIntake = z.infer<typeof AIProjectIntakeSchema>;
export type AIClarificationQuestion = z.infer<typeof AIClarificationQuestionSchema>;
export type AIStructureDraft = z.infer<typeof AIStructureDraftSchema>;
export type AITemplateMatch = z.infer<typeof AITemplateMatchSchema>;
export type AIOffshotsAnalysis = z.infer<typeof AIOffshotsAnalysisSchema>;
export type AIRoadmapSuggestion = z.infer<typeof AIRoadmapSuggestionSchema>;
export type AIProjectTypeRecommendation = z.infer<typeof AIProjectTypeRecommendationSchema>;
export type AITagSuggestion = z.infer<typeof AITagSuggestionSchema>;

export type ProjectIntakeAnalysis = AIProjectIntake;
export type ClarificationQuestion = AIClarificationQuestion;
export type ProjectStructureDraft = AIStructureDraft;

export type ClarificationAnswer = {
  questionId: string;
  question: string;
  answer: string;
};

export type VersionPreset = 'lean' | 'standard' | 'detailed';
export type RegenerateStyle = 'creative' | 'structured' | 'minimalist';

export const WizardAISchemas = {
  projectIntake: AIProjectIntakeSchema,
  clarificationQuestion: AIClarificationQuestionSchema,
  structureDraft: AIStructureDraftSchema,
  templateMatch: AITemplateMatchSchema,
  offshotsAnalysis: AIOffshotsAnalysisSchema,
  roadmapSuggestion: AIRoadmapSuggestionSchema,
  projectTypeRecommendation: AIProjectTypeRecommendationSchema,
  tagSuggestion: AITagSuggestionSchema,
} as const;
