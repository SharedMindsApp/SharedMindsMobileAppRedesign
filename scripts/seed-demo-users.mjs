#!/usr/bin/env node
/**
 * Seed demo users for UI testing.
 *
 * Creates ~12 fake but realistic-looking members so the Pulse tab, People
 * directory, and matching logic have something to show before there are
 * real users. Each demo user is flagged `is_demo = true` so they can be
 * wiped before launch with a single SQL statement:
 *
 *   DELETE FROM auth.users
 *   WHERE id IN (SELECT id FROM profiles WHERE is_demo = true);
 *
 * Usage:
 *   1. Apply the migration first:  npx supabase db push
 *   2. Set env vars in your terminal:
 *        export SUPABASE_URL="https://<project>.supabase.co"
 *        export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
 *   3. Run:  node scripts/seed-demo-users.mjs
 *
 * The script is idempotent on user creation — if a user with the same
 * email already exists, the auth.admin.createUser call errors and we
 * skip them. Safe to re-run.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Demo personas ──────────────────────────────────────────────────────────
//
// Spread across:
//   • Work types (founder/builder, designer, marketer, engineer, etc.)
//   • Skills + locations (varied)
//   • Offering / seeking — designed so users overlap in productive ways
//     (e.g. user who OFFERS "Code review" matches user who SEEKS it).

const DEMO_USERS = [
  {
    email: 'sara.demo@sharedminds.app',
    display_name: 'Sara Chen',
    bio: 'Designer turned founder. Building a payments tool for indie creators.',
    work_types: ['Founder', 'Designer'],
    // All skills below are drawn from src/lib/skills.ts so peer-similarity matches.
    skills: ['UI Design', 'UX Design', 'Brand Identity', 'Figma', 'Design Systems', 'Prototyping'],
    offering: ['Design feedback', 'UI/UX review', 'Brand identity', 'Pitch deck design'],
    seeking: ['Code review', 'Backend help', 'Pricing strategy'],
    city: 'Berlin',
    country_code: 'DE',
    avatar_color: '#ec4899',
  },
  {
    email: 'marcus.demo@sharedminds.app',
    display_name: 'Marcus Okonkwo',
    bio: 'Senior backend engineer, learning sales the hard way.',
    work_types: ['Engineer', 'Founder'],
    skills: ['Go', 'PostgreSQL', 'AWS', 'REST APIs', 'DevOps', 'Site Reliability', 'Docker'],
    offering: ['Code review', 'Backend help', 'Architecture advice', 'Database design'],
    seeking: ['B2B sales', 'Pricing strategy', 'Cold email review', 'Marketing strategy'],
    city: 'Lagos',
    country_code: 'NG',
    avatar_color: '#3b82f6',
  },
  {
    email: 'priya.demo@sharedminds.app',
    display_name: 'Priya Sharma',
    bio: 'Marketing lead-turned-solo-founder. Writing about ADHD productivity.',
    work_types: ['Marketer', 'Writer'],
    skills: ['Content Marketing', 'SEO', 'Copywriting', 'Email Marketing', 'Brand Strategy', 'Newsletter Writing'],
    offering: ['Copywriting', 'SEO', 'Content marketing', 'Brand positioning'],
    seeking: ['Design feedback', 'Frontend help', 'Pitch deck review'],
    city: 'Bengaluru',
    country_code: 'IN',
    avatar_color: '#8b5cf6',
  },
  {
    email: 'tom.demo@sharedminds.app',
    display_name: 'Tom Whitaker',
    bio: 'Solo developer building a niche SaaS. 6 months in, looking for company.',
    work_types: ['Engineer', 'Founder'],
    skills: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'Next.js', 'PostgreSQL'],
    offering: ['Pairing sessions', 'Frontend help', 'Accountability partner'],
    seeking: ['Honest feedback', 'Marketing strategy', 'First-customer advice', 'Sounding board'],
    city: 'Bristol',
    country_code: 'GB',
    avatar_color: '#10b981',
  },
  {
    email: 'aisha.demo@sharedminds.app',
    display_name: 'Aisha Rahman',
    bio: 'Product manager at a Series B. Side-projecting a writing tool.',
    work_types: ['Product Manager'],
    skills: ['Product Management', 'Product Strategy', 'Roadmapping', 'Discovery Interviews', 'PRD Writing', 'OKRs', 'User Research'],
    offering: ['Product strategy', 'Feature scoping', 'Roadmap critique', 'User research'],
    seeking: ['Pairing sessions', 'Design feedback'],
    city: 'Dubai',
    country_code: 'AE',
    avatar_color: '#f59e0b',
  },
  {
    email: 'leo.demo@sharedminds.app',
    display_name: 'Leo Hartmann',
    bio: 'Y Combinator alum, two exits. Now coaching first-time founders.',
    work_types: ['Founder', 'Advisor'],
    skills: ['Fundraising', 'Strategy', 'Hiring', 'Leadership', 'Negotiation', 'Investor Relations', 'Executive Coaching'],
    offering: ['Pitch deck review', 'Fundraising advice', 'Cofounder dynamics', 'Hiring'],
    seeking: ['Mental health / burnout chat', 'Accountability partner'],
    city: 'San Francisco',
    country_code: 'US',
    avatar_color: '#06b6d4',
  },
  {
    email: 'mia.demo@sharedminds.app',
    display_name: 'Mia Larsson',
    bio: 'Brand designer. Spending solo afternoons on a small ceramic studio side hustle.',
    work_types: ['Designer'],
    skills: ['Brand Identity', 'Typography', 'Illustration', 'Logo Design', 'Visual Design', 'Ceramics'],
    offering: ['Brand identity', 'Logo design', 'Design feedback'],
    seeking: ['Marketing strategy', 'First-customer advice', 'Pricing strategy'],
    city: 'Stockholm',
    country_code: 'SE',
    avatar_color: '#f43f5e',
  },
  {
    email: 'kai.demo@sharedminds.app',
    display_name: 'Kai Watanabe',
    bio: 'AI engineer. Burned out at FAANG, building something quiet and small.',
    work_types: ['Engineer'],
    skills: ['Machine Learning', 'AI Engineering', 'LLM / Prompt Engineering', 'Python (Pandas)', 'MLOps', 'NLP'],
    offering: ['AI / LLM integration', 'Code review', 'Architecture advice'],
    seeking: ['Honest feedback', 'Mental health / burnout chat', 'Sounding board'],
    city: 'Tokyo',
    country_code: 'JP',
    avatar_color: '#a855f7',
  },
  {
    email: 'gabriela.demo@sharedminds.app',
    display_name: 'Gabriela Costa',
    bio: 'Growth marketer for early-stage startups. ADHD, lots of caffeine.',
    work_types: ['Marketer', 'Consultant'],
    skills: ['Growth', 'Paid Ads', 'Email Marketing', 'A/B Testing', 'Marketing Analytics', 'Lifecycle Marketing', 'SEM'],
    offering: ['Paid acquisition', 'Email funnels', 'Marketing strategy', 'Brand positioning'],
    seeking: ['Code review', 'Frontend help', 'Pairing on a hard problem'],
    city: 'São Paulo',
    country_code: 'BR',
    avatar_color: '#22c55e',
  },
  {
    email: 'nat.demo@sharedminds.app',
    display_name: 'Nat Eze',
    bio: 'Writer. Newsletter to 5k subscribers. Treating this as my new office.',
    work_types: ['Writer', 'Creator'],
    skills: ['Copywriting', 'Storytelling', 'Newsletter Writing', 'Long-form Articles', 'Editing', 'Content Writing'],
    offering: ['Writing feedback', 'Copywriting', 'Content marketing'],
    seeking: ['Honest feedback', 'Accountability partner', 'Sounding board'],
    city: 'Brooklyn',
    country_code: 'US',
    avatar_color: '#eab308',
  },
  {
    email: 'finn.demo@sharedminds.app',
    display_name: 'Finn O\'Sullivan',
    bio: 'Cofounder of a tiny B2B SaaS. Always in revenue mode.',
    work_types: ['Founder', 'Sales'],
    skills: ['Sales', 'B2B Sales', 'Outbound', 'Cold Email', 'Customer Success', 'Pricing', 'Discovery Calls'],
    offering: ['B2B sales', 'Outbound playbooks', 'Cold email review', 'Pricing strategy'],
    seeking: ['Frontend help', 'Pairing sessions', 'Design feedback'],
    city: 'Dublin',
    country_code: 'IE',
    avatar_color: '#0ea5e9',
  },
  {
    email: 'zoe.demo@sharedminds.app',
    display_name: 'Zoe Bauer',
    bio: 'PhD turned indie hacker. Lots of nervous energy that needs a body double.',
    work_types: ['Researcher', 'Founder'],
    skills: ['User Research', 'Data Analysis', 'Statistics', 'Experimentation', 'Technical Writing', 'Discovery Interviews'],
    offering: ['User research', 'Discovery interviews', 'Sounding board'],
    seeking: ['Accountability partner', 'Honest feedback', 'Code review'],
    city: 'Zurich',
    country_code: 'CH',
    avatar_color: '#d946ef',
  },
];

// ── Helper: generate a tiny SVG avatar so they're not all blank ────────────
function avatarDataUrl({ display_name, avatar_color }) {
  const initial = display_name.trim().charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="${avatar_color}"/>
      <text x="50%" y="50%" font-family="Inter, system-ui, sans-serif" font-size="92"
            font-weight="700" fill="white" text-anchor="middle" dominant-baseline="central">${initial}</text>
    </svg>`.trim();
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// ── Main ───────────────────────────────────────────────────────────────────

// Look up an existing auth user by email. Supabase's admin API doesn't expose
// a direct "find by email" call, so we page through listUsers. The demo set
// is tiny so this is fine.
async function findUserByEmail(email) {
  let page = 1;
  // 1000 is the API max per page.
  const perPage = 1000;
  // Hard cap to avoid infinite paging in case of bugs.
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page++;
  }
  return null;
}

async function seedOne(persona) {
  // 1. Find or create the auth user. Idempotent: if the user already exists,
  //    we reuse their id so the profile upsert below refreshes the latest
  //    skills/offering/seeking values rather than skipping.
  let id;
  const existing = await findUserByEmail(persona.email);
  if (existing) {
    id = existing.id;
    console.log(`↺  Updating existing ${persona.email}…`);
  } else {
    const password = 'demo-' + Math.random().toString(36).slice(2, 12);
    const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
      email: persona.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: persona.display_name, is_demo: true },
    });
    if (createErr) {
      console.error(`✘  Failed to create ${persona.email}:`, createErr.message);
      return null;
    }
    id = createdUser.user.id;
  }

  // 2. Upsert the profile (a row may already exist from a trigger)
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id,
      display_name: persona.display_name,
      bio: persona.bio,
      avatar_url: avatarDataUrl(persona),
      work_types: persona.work_types,
      skills: persona.skills,
      offering: persona.offering,
      seeking: persona.seeking,
      city: persona.city,
      country_code: persona.country_code,
      is_demo: true,
      avatar_status: 'approved',  // demo users skip face verification
    }, { onConflict: 'id' });

  if (profileErr) {
    console.error(`✘  Failed to upsert profile for ${persona.email}:`, profileErr.message);
    return null;
  }

  console.log(`✓  Seeded ${persona.display_name} (${persona.email})`);
  return id;
}

(async () => {
  console.log(`Seeding ${DEMO_USERS.length} demo users…\n`);

  let success = 0;
  for (const persona of DEMO_USERS) {
    const id = await seedOne(persona);
    if (id) success++;
  }

  console.log(`\n✨  Done. ${success}/${DEMO_USERS.length} seeded.`);
  console.log(`\nTo remove later:`);
  console.log(`  DELETE FROM auth.users WHERE id IN (SELECT id FROM profiles WHERE is_demo = true);`);
})();
