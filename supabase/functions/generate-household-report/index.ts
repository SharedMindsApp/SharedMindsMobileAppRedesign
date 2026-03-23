import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SYSTEM_PROMPT = `Generate a comprehensive Household Harmony Report.
Structure the output into:

1. Section Summaries
2. Insight Analysis
3. Perception Gaps
4. Strengths
5. Emotional Dynamics
6. ADHD-related dynamics
7. Action Plan:
   - Immediate actions (today/this week)
   - Weekly practices
   - Long-term systems
8. Feature Hooks (for habit systems, future assistant)

Tone:
- Warm
- Non-judgmental
- Supportive
- ADHD-aware
- Practical and empathetic

Do NOT reveal raw user answers. Summarise them safely.

Format the output in markdown with clear headings and bullet points.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: member } = await supabaseClient
      .from('members')
      .select('*, households(*)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      throw new Error('Member not found');
    }

    const householdId = member.household_id;

    const { data: householdMembers } = await supabaseClient
      .from('members')
      .select('*')
      .eq('household_id', householdId);

    if (!householdMembers || householdMembers.length === 0) {
      throw new Error('No household members found');
    }

    const { data: sections } = await supabaseClient
      .from('sections')
      .select('*')
      .order('order_index');

    const { data: questions } = await supabaseClient
      .from('questions')
      .select('*');

    const { data: answers } = await supabaseClient
      .from('answers')
      .select('*')
      .in('member_id', householdMembers.map(m => m.id));

    const sectionMap = new Map(sections?.map(s => [s.id, s]) || []);
    const questionMap = new Map(questions?.map(q => [q.id, q]) || []);
    const answersByMember = new Map();

    householdMembers.forEach(m => {
      answersByMember.set(m.id, []);
    });

    answers?.forEach(a => {
      if (answersByMember.has(a.member_id)) {
        answersByMember.get(a.member_id).push(a);
      }
    });

    const householdData = {
      household: {
        id: member.households.id,
        name: member.households.name,
      },
      members: householdMembers.map(m => {
        const memberAnswers = answersByMember.get(m.id) || [];
        const sectionAnswers: Record<string, any[]> = {};

        sections?.forEach(section => {
          const sectionKey = section.title.toLowerCase().replace(/\s+/g, '_').replace(/&/g, 'and');
          sectionAnswers[sectionKey] = [];

          memberAnswers.forEach(answer => {
            const question = questionMap.get(answer.question_id);
            if (question && question.section_id === section.id) {
              sectionAnswers[sectionKey].push({
                question: question.question_text,
                answer: answer.answer,
                type: question.type,
              });
            }
          });
        });

        return {
          id: m.id,
          name: m.name,
          role: m.role,
          age: m.age,
          section_answers: sectionAnswers,
        };
      }),
    };

    const userMessage = `Here is the household data:\n\n${JSON.stringify(householdData, null, 2)}\n\nPlease generate a comprehensive Household Harmony Report based on this data.`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      throw new Error(`Anthropic API error: ${errorText}`);
    }

    const anthropicData = await anthropicResponse.json();
    const reportContent = anthropicData.content[0].text;

    const { data: savedReport, error: saveError } = await supabaseClient
      .from('reports')
      .insert({
        household_id: householdId,
        generated_by: user.id,
        content: reportContent,
        metadata: {
          member_count: householdMembers.length,
          sections_count: sections?.length || 0,
          total_answers: answers?.length || 0,
        },
      })
      .select()
      .single();

    if (saveError) {
      throw saveError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: savedReport,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});