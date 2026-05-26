// suggest-project-roadmap — AI-generated phases and tasks for the
// onboarding project setup.
//
// Carries forward the legacy Guardrails philosophy:
//   • "Idea → intent → feasibility → execution" — projects move through
//     stages, not just task lists.
//   • Domain-aware suggestions — a screenwriter and an architect get
//     fundamentally different scaffolds.
//   • In-progress projects start from current state, not square one.
//   • Concrete actionable items with intent, not generic boilerplate.
//
// Deploy:
//   supabase functions deploy suggest-project-roadmap
//   (OPENROUTER_API_KEY already set)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { openrouterChat } from '../_shared/openrouter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

type ProjectType =
  | 'passion' | 'creative' | 'startup' | 'client'
  | 'employment' | 'freelance' | 'learning' | 'personal';

interface RoadmapRequest {
  /** 'roadmap' (new) → returns hierarchical milestones + phases.
   *  'phases' (legacy) → returns flat phases (back-compat for older clients).
   *  'tasks' → returns 3 first-week tasks anchored to a phase. */
  mode: 'roadmap' | 'phases' | 'tasks';
  project: {
    title: string;
    brain_dump?: string | null;
    done_state?: string | null;
    project_type?: ProjectType | null;
    started_status?: 'new' | 'in_progress' | null;
    initial_completion_pct?: number | null;
    target_date?: string | null;
    deadline_flexibility?: 'fixed' | 'flexible' | 'none' | null;
  };
  user_context?: {
    work_types?: string[];
    industries?: string[];
    skills?: string[];
  };
  /** For mode='tasks': the phases the user has confirmed. */
  phases?: string[];
}

/** Hierarchical roadmap response — what mode='roadmap' returns. */
interface RoadmapResponse {
  milestones: Array<{
    /** Destination — "Beta launch", "100 paying users", etc. (3–8 words) */
    title: string;
    /** % contribution to project total. Sum across all milestones ~= 100. */
    weight_pct?: number;
    /** Pre-checked if the user's brain dump suggests this milestone is already hit. */
    already_done?: boolean;
    /** 1-sentence rationale. */
    why?: string;
    phases: Array<{
      /** Work unit between milestones — 3–8 words describing the checkpoint. */
      title: string;
      /** % within this milestone (sum across the milestone's phases ~= 100). */
      weight_pct?: number;
      /** Pre-checked if already shipped. */
      already_done?: boolean;
    }>;
  }>;
}

/** Legacy flat-phases response — what mode='phases' returns. */
interface PhasesResponse {
  phases: Array<{
    title: string;
    weight_pct?: number;
    already_done?: boolean;
    why?: string;
  }>;
}

interface TasksResponse {
  tasks: Array<{ title: string }>;
}

function bad(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Build the system prompt — carries the Guardrails voice. */
function systemPrompt(): string {
  return [
    'You are a project execution coach for SharedMinds, a virtual coworking platform for creators and solopreneurs.',
    '',
    'You help people break their projects into clear phases (the checkpoints from "idea" to "done") and concrete first tasks (specific things they could finish in one focus session).',
    '',
    'PRINCIPLES:',
    '• Be domain-aware. A screenwriter, architect, musician, and SaaS founder all need different scaffolds — phases for a film script are not "research/outline/draft", they are "lock the logline, outline acts, draft pages, get notes, polish, final pass". Adapt to the user\'s actual work.',
    '• Be status-aware. If the project is already in progress, start FROM that point. Do not waste a phase on "kick off" if they\'re at 60%.',
    '• Be deadline-aware. Fixed deadlines mean tighter, more specific phases. No deadline means scaffold for sustainable momentum.',
    '• Be type-aware. Passion projects need intrinsic-motivation phrasing. Client work needs deliverable check-ins. Employment work needs stakeholder alignment beats. Freelance needs scope/payment phases.',
    '• Concrete > generic. "Lock pitch deck narrative with co-founder" beats "Refine pitch". "Send second-act draft to producer" beats "Get feedback".',
    '• Short phrases. 3–8 words per phase title. 5–12 words per task. No filler.',
    '',
    'You always respond with valid JSON in the exact shape requested.',
  ].join('\n');
}

/** Build the user prompt with all the project context the model needs. */
function userPrompt(req: RoadmapRequest): string {
  const p = req.project;
  const lines: string[] = [];

  lines.push(`PROJECT: "${p.title}"`);
  // Brain dump is the richest context we have — give it generous space in
  // the prompt. Fall back to legacy `done_state` for old clients.
  const context = (p.brain_dump ?? p.done_state ?? '').trim();
  if (context) {
    lines.push('');
    lines.push('USER\'S BRAIN DUMP (their own words about this project — use this as your primary signal):');
    lines.push(context);
    lines.push('');
  }

  if (p.project_type) {
    const typeLabel: Record<ProjectType, string> = {
      passion:    'Passion project (intrinsic motivation, no external client, momentum is everything)',
      creative:   'Creative work (a song, film, book, design — craft, vision, iteration, taste-driven phases)',
      startup:    'Startup / company (build–measure–learn, customer discovery, fundraising and traction milestones)',
      client:     'Client work (external deliverables, check-ins, scope management)',
      freelance:  'Freelance / contractor (scope, milestones, invoicing phases)',
      employment: 'Employment work (stakeholder alignment, internal review beats, manager updates)',
      learning:   'Learning / skill (practice, progression, mastery — phases are levels of capability not deliverables)',
      personal:   'Personal goal (habit, accountability, lifestyle — phases are about behaviour change not output)',
    };
    lines.push(`TYPE: ${typeLabel[p.project_type]}`);
  }

  if (p.started_status === 'in_progress' && p.initial_completion_pct != null) {
    lines.push(`STATUS: Already ${p.initial_completion_pct}% in. DO NOT include phases for work already done. Start from where they are now.`);
  } else if (p.started_status === 'new') {
    lines.push('STATUS: Brand new project. Scaffold from the very start.');
  }

  if (p.target_date) {
    const days = Math.ceil((new Date(p.target_date).getTime() - Date.now()) / 86_400_000);
    const flex = p.deadline_flexibility ?? 'flexible';
    if (days > 0) {
      lines.push(`DEADLINE: ${days} day${days !== 1 ? 's' : ''} away (${flex}).`);
      if (flex === 'fixed') {
        lines.push('Tight, focused phases. Cut anything optional.');
      }
    }
  }

  const ctx = req.user_context;
  if (ctx?.work_types?.length) {
    lines.push(`USER WORKS AS: ${ctx.work_types.join(', ')}`);
  }
  if (ctx?.industries?.length) {
    lines.push(`INDUSTRIES: ${ctx.industries.join(', ')}`);
  }

  lines.push('');
  if (req.mode === 'roadmap') {
    lines.push('Generate a HIERARCHICAL roadmap: 3–5 milestones (the destinations / major checkpoints), and 2–5 phases nested under each milestone (the work between checkpoints).');
    lines.push('');
    lines.push('MILESTONES are the answer to "what big things am I aiming for?" — examples: Beta launch · Public launch · 100 active users · 100 paying users · First award submission · Final cut delivered. They are outcome-shaped destinations, not work units.');
    lines.push('');
    lines.push('PHASES are the work between milestones — examples under "Beta launch": Polish onboarding · Wire referral system · Run friends-and-family test.');
    lines.push('');
    lines.push('FOR EACH MILESTONE:');
    lines.push('  • title (3–8 words)');
    lines.push('  • weight_pct: % of the WHOLE PROJECT this milestone represents. Sum across all milestones ~= 100.');
    lines.push('  • already_done: TRUE if the user has clearly already hit this milestone given the brain dump.');
    lines.push('    Use aggressively for foundational milestones if the user said they\'ve shipped that work.');
    lines.push('  • why: 1-sentence rationale');
    lines.push('  • phases: array of nested phases');
    lines.push('');
    lines.push('FOR EACH PHASE (inside a milestone):');
    lines.push('  • title (3–8 words describing what "done" looks like at that checkpoint)');
    lines.push('  • weight_pct: % within THIS MILESTONE (sum across phases inside the milestone ~= 100)');
    lines.push('  • already_done: TRUE if shipped');
    lines.push('');
    lines.push('CALIBRATION TARGET: if the user said "X% done", the project completion computed from done milestones (each contributing weight_pct × milestone_done_pct/100) should APPROXIMATELY MATCH X. Use this to decide which milestones/phases to pre-check.');
    lines.push('');
    lines.push('IMPORTANT: do NOT compress everything shipped into one milestone — split foundational work into 1-3 distinct shipped milestones with named-out phases. The whole point is restoring fidelity that a flat list collapses.');
    lines.push('');
    lines.push('Return JSON: { "milestones": [{ "title": "...", "weight_pct": 25, "already_done": true, "why": "...", "phases": [{ "title": "...", "weight_pct": 50, "already_done": true }] }] }');
  } else if (req.mode === 'phases') {
    lines.push('Generate 3–6 phases — the macro checkpoints on the way to done.');
    lines.push('');
    lines.push('FOR EACH PHASE include:');
    lines.push('  • "title": the phase name (3–8 words, describing what "done" looks like at that checkpoint)');
    lines.push('  • "weight_pct": % contribution to overall completion (integer). Sum across all phases ~= 100.');
    lines.push('    Weight by effort/significance, not duration.');
    lines.push('  • "already_done": boolean. TRUE if the user has likely finished this phase given their brain dump + stated completion %.');
    lines.push('    Use this aggressively: if the user said "40% done" and mentioned shipping the core loop, mark early phases as done so the math works out.');
    lines.push('  • "why": 1-sentence rationale (short)');
    lines.push('');
    lines.push('IMPORTANT: The sum of weight_pct on "already_done: true" phases should APPROXIMATELY MATCH the user\'s stated completion %. Use that as a calibration target.');
    lines.push('');
    lines.push('Return JSON: { "phases": [{ "title": "...", "weight_pct": 25, "already_done": false, "why": "..." }] }');
  } else {
    if (req.phases && req.phases.length > 0) {
      lines.push(`THE USER\'S PHASES:\n${req.phases.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
      lines.push('');
    }
    lines.push('Generate 3 concrete first tasks — things they could finish in one focus session this week.');
    lines.push('Anchor them to the FIRST phase (or current state if in progress).');
    lines.push('Return JSON: { "tasks": [{ "title": "..." }] }');
  }

  return lines.join('\n');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return bad('Method not allowed', 405);
  }

  let body: RoadmapRequest;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON');
  }

  if (!body?.project?.title?.trim()) {
    return bad('project.title is required');
  }
  if (body.mode !== 'roadmap' && body.mode !== 'phases' && body.mode !== 'tasks') {
    return bad('mode must be "roadmap", "phases", or "tasks"');
  }

  // OpenRouter model picks (verified slugs at https://openrouter.ai/models):
  //   • google/gemini-2.5-flash — cheap, vision-capable, fast, very reliable
  //     for structured JSON output. Primary.
  //   • anthropic/claude-3.5-haiku — strong backup if Google has a hiccup.
  //   • openai/gpt-4o-mini — third-line safety net.
  //
  // Earlier versions tried hypothetical slugs (gpt-5.4-nano,
  // claude-haiku-4.5) — when none resolved, OpenRouter returned an error
  // that we caught and turned into an empty success, masking the real
  // problem. The slugs above are confirmed-available on OpenRouter today.
  let result: RoadmapResponse | PhasesResponse | TasksResponse | null = null;
  let lastErr: unknown = null;

  try {
    const { text, raw } = await openrouterChat({
      model: 'google/gemini-2.5-flash',
      fallbacks: ['anthropic/claude-3.5-haiku', 'openai/gpt-4o-mini'],
      jsonMode: true,
      temperature: 0.5,
      maxTokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user',   content: userPrompt(body) },
      ],
    });
    console.log('[suggest-project-roadmap] model used:', raw?.model ?? 'unknown');
    try {
      result = JSON.parse(text) as RoadmapResponse | PhasesResponse | TasksResponse;
    } catch (parseErr) {
      console.error('[suggest-project-roadmap] JSON parse failed. Raw text:', text.slice(0, 500));
      lastErr = parseErr;
    }
  } catch (callErr) {
    console.error('[suggest-project-roadmap] OpenRouter call failed:', callErr);
    lastErr = callErr;
  }

  if (!result) {
    // Surface the actual reason so the wizard can show something useful
    // instead of a confusing "no suggestions" notice.
    const message = lastErr instanceof Error ? lastErr.message : 'unknown error';
    return new Response(
      JSON.stringify({
        error: 'Suggestion service failed',
        detail: message,
        ...(body.mode === 'roadmap' ? { milestones: [] }
         : body.mode === 'phases'  ? { phases: [] }
         :                            { tasks: [] }),
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return ok(result);
});
