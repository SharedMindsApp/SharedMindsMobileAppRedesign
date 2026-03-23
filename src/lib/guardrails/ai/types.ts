export interface AIRoadmapGeneratorInput {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  domainType: 'work' | 'personal' | 'creative' | 'health';

  tracks: Array<{
    trackId: string;
    trackName: string;
    subtracks: Array<{
      subtrackId: string;
      subtrackName: string;
    }>;
  }>;

  constraints?: {
    timeAvailablePerWeek?: number;
    deadline?: string | null;
    resources?: string[];
  };
}

export interface AIGeneratedRoadmapItem {
  title: string;
  description: string;
  estimated_hours?: number;
  track?: string;
  subtrack?: string;
}

export interface AIRoadmapStructure {
  roadmap: Array<{
    track: string;
    subtrack?: string;
    items: Array<{
      title: string;
      description: string;
      estimated_hours?: number;
    }>;
  }>;
  timeline_suggestions?: {
    recommended_duration_weeks?: number;
    notes?: string;
  };
}

export interface AIRoadmapGeneratorResult {
  success: boolean;
  generationGroup: string;
  itemsCreated: number;
  items?: Array<{
    id: string;
    title: string;
    trackId?: string;
    subtrackId?: string;
  }>;
  timelineSuggestions?: {
    recommended_duration_weeks?: number;
    notes?: string;
  };
  error?: string;
  errorDetails?: string;
}

export interface AILogEntry {
  id?: string;
  master_project_id: string;
  generation_group: string;
  model: string;
  prompt: string;
  output?: string;
  error?: string;
  tokens_used?: number;
  created_at?: string;
}

export type LLMProvider = 'openai' | 'anthropic' | 'groq';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}
