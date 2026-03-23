import { supabase } from '../../supabase';
import { generateAIResponse, getConfiguredProvider } from './llmProvider';
import { buildRoadmapPrompt } from './promptBuilder';
import { parseLLMJSON, validateRoadmapStructure } from './utils/safeLLMJson';
import { writeGeneratedRoadmap, logAIGeneration } from './databaseWriter';
import type {
  AIRoadmapGeneratorInput,
  AIRoadmapGeneratorResult,
  AIRoadmapStructure,
} from './types';

export async function generateRoadmapFromAI(
  input: AIRoadmapGeneratorInput
): Promise<AIRoadmapGeneratorResult> {
  const generationGroup = crypto.randomUUID();
  const model = getConfiguredProvider() || 'unknown';

  try {
    const prompt = buildRoadmapPrompt(input);

    let rawResponse: string;
    try {
      rawResponse = await generateAIResponse(prompt);
    } catch (llmError) {
      const errorMessage = llmError instanceof Error ? llmError.message : String(llmError);

      await logAIGeneration({
        master_project_id: input.projectId,
        generation_group: generationGroup,
        model,
        prompt,
        error: `LLM call failed: ${errorMessage}`,
      });

      return {
        success: false,
        generationGroup,
        itemsCreated: 0,
        error: 'Failed to communicate with AI service',
        errorDetails: errorMessage,
      };
    }

    let roadmapData: AIRoadmapStructure;
    try {
      roadmapData = parseLLMJSON<AIRoadmapStructure>(rawResponse);

      if (!validateRoadmapStructure(roadmapData)) {
        throw new Error('Invalid roadmap structure returned by AI');
      }
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);

      await logAIGeneration({
        master_project_id: input.projectId,
        generation_group: generationGroup,
        model,
        prompt,
        output: rawResponse,
        error: `JSON parsing failed: ${errorMessage}`,
      });

      return {
        success: false,
        generationGroup,
        itemsCreated: 0,
        error: 'Failed to parse AI response',
        errorDetails: errorMessage,
      };
    }

    let createdItems;
    try {
      createdItems = await writeGeneratedRoadmap(
        input.projectId,
        generationGroup,
        roadmapData,
        input.tracks
      );
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);

      await logAIGeneration({
        master_project_id: input.projectId,
        generation_group: generationGroup,
        model,
        prompt,
        output: rawResponse,
        error: `Database write failed: ${errorMessage}`,
      });

      return {
        success: false,
        generationGroup,
        itemsCreated: 0,
        error: 'Failed to save generated items to database',
        errorDetails: errorMessage,
      };
    }

    await logAIGeneration({
      master_project_id: input.projectId,
      generation_group: generationGroup,
      model,
      prompt,
      output: rawResponse,
    });

    return {
      success: true,
      generationGroup,
      itemsCreated: createdItems.length,
      items: createdItems,
      timelineSuggestions: roadmapData.timeline_suggestions,
    };
  } catch (unexpectedError) {
    const errorMessage =
      unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError);

    await logAIGeneration({
      master_project_id: input.projectId,
      generation_group: generationGroup,
      model,
      prompt: '',
      error: `Unexpected error: ${errorMessage}`,
    });

    return {
      success: false,
      generationGroup,
      itemsCreated: 0,
      error: 'An unexpected error occurred',
      errorDetails: errorMessage,
    };
  }
}

export async function generateRoadmapFromProjectId(
  projectId: string,
  allowRegeneration: boolean = false
): Promise<AIRoadmapGeneratorResult> {
  const { data: project, error: projectError } = await supabase
    .from('master_projects')
    .select('id, name, description, domain_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return {
      success: false,
      generationGroup: '',
      itemsCreated: 0,
      error: 'Project not found',
      errorDetails: projectError?.message,
    };
  }

  const { data: domain } = await supabase
    .from('domains')
    .select('name')
    .eq('id', project.domain_id)
    .single();

  const domainType = (domain?.name || 'work') as 'work' | 'personal' | 'creative' | 'health';

  const { data: tracks } = await supabase
    .from('guardrails_tracks')
    .select('id, name')
    .eq('master_project_id', projectId)
    .order('ordering_index');

  const tracksData = [];
  if (tracks) {
    for (const track of tracks) {
      const { data: subtracks } = await supabase
        .from('guardrails_tracks')
        .select('id, name')
        .eq('parent_track_id', track.id)
        .is('deleted_at', null)
        .order('ordering_index');

      tracksData.push({
        trackId: track.id,
        trackName: track.name,
        subtracks:
          subtracks?.map(st => ({
            subtrackId: st.id,
            subtrackName: st.name,
          })) || [],
      });
    }
  }

  if (!allowRegeneration) {
    const { data: existingItems } = await supabase
      .from('roadmap_items')
      .select('id')
      .not('generation_group', 'is', null)
      .limit(1);

    if (existingItems && existingItems.length > 0) {
      return {
        success: false,
        generationGroup: '',
        itemsCreated: 0,
        error: 'Roadmap already generated. Set allowRegeneration=true to regenerate.',
      };
    }
  }

  const input: AIRoadmapGeneratorInput = {
    projectId: project.id,
    projectName: project.name,
    projectDescription: project.description || undefined,
    domainType,
    tracks: tracksData,
  };

  return generateRoadmapFromAI(input);
}
