// Curated skill list for the SharedMinds profile system.
// Used as autocomplete suggestions — users can also free-text add anything.
//
// Goal of this catalogue: cover the working life of any knowledge worker,
// creator, founder, or operator we'd expect on SharedMinds. ~200 skills
// across 12 industry buckets. Order within a category is roughly
// popularity / demand-weighted.

export interface SkillCategory {
  id: string;
  label: string;
  emoji: string;
  skills: string[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'design',
    label: 'Design',
    emoji: '🎨',
    skills: [
      'UI Design',
      'UX Design',
      'Product Design',
      'Brand Identity',
      'Visual Design',
      'Web Design',
      'Logo Design',
      'Typography',
      'Illustration',
      'Iconography',
      'Motion Graphics',
      '3D Design',
      'Figma',
      'Design Systems',
      'Prototyping',
      'User Research',
      'Information Architecture',
      'Accessibility (a11y)',
      'Graphic Design',
      'Motion Design',
      'Art Direction',
      'Adobe Creative Suite',
    ],
  },
  {
    id: 'development',
    label: 'Engineering',
    emoji: '💻',
    skills: [
      'TypeScript',
      'JavaScript',
      'React',
      'Next.js',
      'Node.js',
      'Python',
      'Go',
      'Rust',
      'Swift',
      'Kotlin',
      'Java',
      'C#',
      'Ruby',
      'PHP',
      'SQL',
      'PostgreSQL',
      'GraphQL',
      'REST APIs',
      'AWS',
      'Google Cloud',
      'Azure',
      'Docker',
      'Kubernetes',
      'CI/CD',
      'Tailwind CSS',
      'Vue.js',
      'Svelte',
      'React Native',
      'Flutter',
      'iOS Development',
      'Android Development',
      'DevOps',
      'Site Reliability',
      'Security Engineering',
      'Mobile UX',
      'App Store Optimization',
      'Quality Assurance (QA)',
      'Data Science',
      'Infrastructure',
    ],
  },
  {
    id: 'nocode',
    label: 'No-Code & Automation',
    emoji: '🧩',
    skills: [
      'Webflow',
      'Bubble',
      'Airtable',
      'Zapier',
      'Make',
      'Notion',
      'Retool',
      'Glide',
      'Softr',
      'Workflow Automation',
    ],
  },
  {
    id: 'product',
    label: 'Product',
    emoji: '🧭',
    skills: [
      'Product Management',
      'Product Strategy',
      'Roadmapping',
      'Feature Scoping',
      'Discovery Interviews',
      'PRD Writing',
      'OKRs',
      'Prioritisation',
      'Agile / Scrum',
      'Stakeholder Management',
    ],
  },
  {
    id: 'data',
    label: 'Data & AI',
    emoji: '📊',
    skills: [
      'Data Analysis',
      'SQL Analytics',
      'Data Engineering',
      'Data Visualisation',
      'BI Dashboards',
      'Python (Pandas)',
      'R',
      'Machine Learning',
      'AI Engineering',
      'LLM / Prompt Engineering',
      'LangChain',
      'Vector Databases',
      'RAG',
      'Fine-tuning',
      'Hugging Face',
      'MLOps',
      'Computer Vision',
      'NLP',
      'Statistics',
      'Experimentation',
      'dbt',
      'Snowflake',
      'BigQuery',
      'Looker',
      'Tableau',
      'Metabase',
    ],
  },
  {
    id: 'business',
    label: 'Business & Operations',
    emoji: '📈',
    skills: [
      'Strategy',
      'Operations',
      'Finance',
      'Bookkeeping',
      'Accounting',
      'Fundraising',
      'Investor Relations',
      'Project Management',
      'Business Development',
      'Partnerships',
      'Negotiation',
      'Pricing',
      'Hiring',
      'Human Resources',
      'Recruiting',
      'Team Building',
      'Leadership',
      'Bootstrapping',
      'Legal Basics',
      'Contracts',
      'GDPR / Privacy',
      'IP / Trademark',
      'Compliance (SOC 2)',
      'Business Analysis',
      'Business Planning',
      'Business Process',
      'Business Intelligence',
      'Change Management',
      'Corporate Strategy',
      'Capital Markets',
      'Communications',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & Growth',
    emoji: '📣',
    skills: [
      'Marketing Strategy',
      'Growth',
      'SEO',
      'SEM',
      'Paid Ads',
      'Social Media',
      'Community Building',
      'Brand Strategy',
      'Influencer Marketing',
      'Email Marketing',
      'Marketing Analytics',
      'A/B Testing',
      'Content Marketing',
      'PR',
      'Lifecycle Marketing',
      'Affiliate Marketing',
      'YouTube',
      'TikTok',
      'Substack',
      'Patreon',
      'Creator Monetization',
      'Community Management',
      'Advertising',
      'Market Research',
      'Sales Strategy',
    ],
  },
  {
    id: 'sales',
    label: 'Sales & Customer',
    emoji: '💬',
    skills: [
      'Sales',
      'B2B Sales',
      'Outbound',
      'Cold Email',
      'Discovery Calls',
      'Customer Success',
      'Account Management',
      'Onboarding',
      'Support Operations',
      'Retention',
    ],
  },
  {
    id: 'writing',
    label: 'Writing',
    emoji: '✍️',
    skills: [
      'Copywriting',
      'Content Writing',
      'Technical Writing',
      'Editing',
      'Proofreading',
      'Storytelling',
      'Screenwriting',
      'Ghostwriting',
      'Blogging',
      'Newsletter Writing',
      'UX Writing',
      'Journalism',
      'Long-form Articles',
      'Translation',
      'Localization',
      'Multilingual Content',
    ],
  },
  {
    id: 'video',
    label: 'Video & Film',
    emoji: '🎬',
    skills: [
      'Cinematography',
      'Video Editing',
      'Color Grading',
      'Sound Design',
      'Producing',
      'Directing',
      'DaVinci Resolve',
      'Premiere Pro',
      'Final Cut Pro',
      'After Effects',
      'Documentary',
      'Music Video',
      'Commercial',
      'Lighting',
      'Animation',
      '2D Animation',
      '3D Animation',
      'VFX',
    ],
  },
  {
    id: 'audio',
    label: 'Music & Audio',
    emoji: '🎵',
    skills: [
      'Music Production',
      'Mixing',
      'Mastering',
      'Composition',
      'Songwriting',
      'Logic Pro',
      'Ableton Live',
      'Pro Tools',
      'Podcasting',
      'Voice Acting',
      'Audio Editing',
    ],
  },
  {
    id: 'creative',
    label: 'Creative Crafts',
    emoji: '✨',
    skills: [
      'Portrait Photography',
      'Product Photography',
      'Lightroom',
      'Photo Editing',
      'Game Design',
      'Game Development',
      'Industrial Design',
      'Architecture',
      'Interior Design',
      'Fashion Design',
      'Ceramics',
      'Woodworking',
      'Printmaking',
    ],
  },
  {
    id: 'education',
    label: 'Education & Coaching',
    emoji: '🎓',
    skills: [
      'Teaching',
      'Curriculum Design',
      'Mentoring',
      'Executive Coaching',
      'Life Coaching',
      'Workshop Facilitation',
      'Public Speaking',
      'Course Creation',
      'Therapy / Counselling',
      'Mediation',
      'Active Listening',
      'Conflict Resolution',
    ],
  },
  {
    id: 'wellness',
    label: 'Wellness & Body',
    emoji: '🌿',
    skills: [
      'ADHD Coaching',
      'Productivity Coaching',
      'Meditation',
      'Mindfulness',
      'Yoga',
      'Nutrition',
      'Personal Training',
      'Sleep Coaching',
      'Breathwork',
    ],
  },
  {
    id: 'builtworld',
    label: 'Built World Engineering',
    emoji: '🏗️',
    skills: [
      'Mechanical Engineering',
      'Civil Engineering',
      'Electrical Engineering',
      'Chemical Engineering',
      'Structural Engineering',
    ],
  },
  {
    id: 'web3',
    label: 'Web3 & Crypto',
    emoji: '⛓️',
    skills: [
      'Web3',
      'Crypto',
      'NFTs',
      'Smart Contracts',
      'Solidity',
      'Tokenomics',
    ],
  },
];

/** Soft cap on how many skills a single profile can list. UI nudges users
 *  past this to keep their profile scannable rather than a kitchen sink. */
export const MAX_SKILLS_PER_PROFILE = 12;

/** Self-rated proficiency for a single skill. 1..5 — see SKILL_LEVELS. */
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

/** A map of skill name → level. Persisted as JSONB in profiles.skill_levels. */
export type SkillLevelMap = Record<string, SkillLevel>;

/** Labels + short hints for each rating. Honesty-dependent but better than
 *  flat "have it / don't have it". */
export const SKILL_LEVELS: { value: SkillLevel; label: string; hint: string }[] = [
  { value: 1, label: 'Beginner',     hint: 'Just starting / under a year' },
  { value: 2, label: 'Novice',       hint: '~1 year, can do basics' },
  { value: 3, label: 'Intermediate', hint: '~2-3 years, comfortable on own' },
  { value: 4, label: 'Advanced',     hint: '~3-5 years, mentor others' },
  { value: 5, label: 'Expert',       hint: '5+ years, do this in your sleep' },
];

/** Flat list of all curated skills, useful for fast lookups. */
export const ALL_SKILLS: string[] = SKILL_CATEGORIES.flatMap((c) => c.skills);

/** Category lookup by skill name (case-insensitive). Returns null if not curated. */
const CATEGORY_BY_SKILL = new Map<string, SkillCategory>();
for (const cat of SKILL_CATEGORIES) {
  for (const s of cat.skills) {
    CATEGORY_BY_SKILL.set(s.toLowerCase(), cat);
  }
}

export function findSkillCategory(skill: string): SkillCategory | null {
  return CATEGORY_BY_SKILL.get(skill.toLowerCase()) ?? null;
}

/** Fallback emoji for skills that aren't in a curated category (custom-typed
 *  skills, or catalogued skills without a category hit). Guarantees every
 *  skill chip carries an icon rather than rendering bare text. */
export const DEFAULT_SKILL_EMOJI = '🏷️';

/** The emoji to show for a skill — its category's emoji, or a neutral
 *  fallback so nothing ever renders without an icon. */
export function skillEmoji(skill: string): string {
  return findSkillCategory(skill)?.emoji ?? DEFAULT_SKILL_EMOJI;
}
