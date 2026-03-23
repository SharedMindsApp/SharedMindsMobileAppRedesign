import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GenerateRoadmapRequest {
  projectId: string;
  allowRegeneration?: boolean;
}

interface Track {
  id: string;
  name: string;
  subtracks: Array<{
    id: string;
    name: string;
  }>;
}

interface AIRoadmapStructure {
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

function buildPrompt(
  projectName: string,
  projectDescription: string | null,
  domainType: string,
  tracks: Track[]
): string {
  const tracksDesc = tracks.map((track, i) => {
    const subtracksList = track.subtracks.map(st => `  - ${st.name}`).join('\n');
    return `${i + 1}. ${track.name}\n   Subtracks:\n${subtracksList || '   (No subtracks)'}`;
  }).join('\n\n');

  return `
You are a project planning expert. Generate a detailed roadmap for this project.

PROJECT: ${projectName}
${projectDescription ? `DESCRIPTION: ${projectDescription}` : ''}
DOMAIN: ${domainType}

TRACKS AND SUBTRACKS:
${tracksDesc}

Create 3-8 actionable items per subtrack. Each item needs:
- Clear title
- 2-3 sentence description
- Estimated hours

Return ONLY valid JSON:
{
  "roadmap": [
    {
      "track": "Track Name",
      "subtrack": "Subtrack Name",
      "items": [
        {
          "title": "Item title",
          "description": "What to do and why",
          "estimated_hours": 5
        }
      ]
    }
  ],
  "timeline_suggestions": {
    "recommended_duration_weeks": 12,
    "notes": "Timeline notes"
  }
}

No markdown, no extra text, just JSON.
`.trim();
}

async function callLLM(prompt: string): Promise<string> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (openaiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a project planning assistant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  if (anthropicKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
    const data = await response.json();
    return data.content[0]?.text || '';
  }

  throw new Error('No LLM API key configured');
}

function sanitizeJSON(text: string): string {
  let clean = text.trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) clean = jsonMatch[0];

  const codeMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) clean = codeMatch[1].trim();

  clean = clean.replace(/,\s*([}\]])/g, '$1');
  clean = clean.replace(/([{,]\s*)(\w+):/g, '$1"$2":');

  return clean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { projectId, allowRegeneration = false }: GenerateRoadmapRequest = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: project } = await supabaseClient
      .from('master_projects')
      .select('id, name, description, domain_id, user_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || user.id !== project.user_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allowRegeneration) {
      const { data: existing } = await supabaseClient
        .from('roadmap_items')
        .select('id')
        .not('generation_group', 'is', null)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Roadmap already generated' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: domain } = await supabaseClient
      .from('domains')
      .select('name')
      .eq('id', project.domain_id)
      .single();

    const { data: tracksData } = await supabaseClient
      .from('guardrails_tracks')
      .select('id, name')
      .eq('master_project_id', projectId)
      .order('ordering_index');

    const tracks: Track[] = [];
    if (tracksData) {
      for (const track of tracksData) {
        const { data: subtracks } = await supabaseClient
          .from('guardrails_subtracks')
          .select('id, name')
          .eq('track_id', track.id)
          .order('ordering_index');

        tracks.push({
          id: track.id,
          name: track.name,
          subtracks: subtracks?.map(st => ({ id: st.id, name: st.name })) || [],
        });
      }
    }

    const generationGroup = crypto.randomUUID();
    const prompt = buildPrompt(project.name, project.description, domain?.name || 'work', tracks);

    let rawResponse: string;
    try {
      rawResponse = await callLLM(prompt);
    } catch (llmError) {
      await supabaseClient.from('ai_logs').insert({
        master_project_id: projectId,
        generation_group: generationGroup,
        model: 'openai',
        prompt,
        error: String(llmError),
      });

      return new Response(
        JSON.stringify({ error: 'AI service error', details: String(llmError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let roadmapData: AIRoadmapStructure;
    try {
      const cleaned = sanitizeJSON(rawResponse);
      roadmapData = JSON.parse(cleaned);
    } catch (parseError) {
      await supabaseClient.from('ai_logs').insert({
        master_project_id: projectId,
        generation_group: generationGroup,
        model: 'openai',
        prompt,
        output: rawResponse,
        error: `Parse error: ${String(parseError)}`,
      });

      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trackLookup: Record<string, { id: string; subtracks: Record<string, string> }> = {};
    for (const track of tracks) {
      const subMap: Record<string, string> = {};
      for (const sub of track.subtracks) {
        subMap[sub.name] = sub.id;
      }
      trackLookup[track.name] = { id: track.id, subtracks: subMap };
    }

    const createdItems: any[] = [];

    for (const section of roadmapData.roadmap) {
      const trackInfo = trackLookup[section.track];
      if (!trackInfo) continue;

      const subtrackId = section.subtrack ? trackInfo.subtracks[section.subtrack] : null;

      let sectionRecord = (await supabaseClient
        .from('roadmap_sections')
        .select('id')
        .eq('master_project_id', projectId)
        .limit(1)
        .maybeSingle()).data;

      if (!sectionRecord) {
        sectionRecord = (await supabaseClient
          .from('roadmap_sections')
          .insert({
            master_project_id: projectId,
            title: `${section.track} Tasks`,
            order_index: 0,
          })
          .select('id')
          .single()).data;
      }

      if (!sectionRecord) continue;

      for (let i = 0; i < section.items.length; i++) {
        const item = section.items[i];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + i * 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);

        const { data } = await supabaseClient
          .from('roadmap_items')
          .insert({
            section_id: sectionRecord.id,
            track_id: trackInfo.id,
            subtrack_id: subtrackId,
            title: item.title,
            description: item.description,
            estimated_hours: item.estimated_hours,
            generation_group: generationGroup,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'not_started',
            order_index: i,
          })
          .select('id, title')
          .single();

        if (data) createdItems.push(data);
      }
    }

    await supabaseClient.from('ai_logs').insert({
      master_project_id: projectId,
      generation_group: generationGroup,
      model: 'openai',
      prompt,
      output: rawResponse,
    });

    return new Response(
      JSON.stringify({
        success: true,
        generationGroup,
        itemsCreated: createdItems.length,
        items: createdItems,
        timelineSuggestions: roadmapData.timeline_suggestions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
