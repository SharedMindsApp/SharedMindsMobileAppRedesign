// Curated tag lists for the lightweight networking layer.
//
// `OFFERING_TAGS`  = what a member can help others with
// `SEEKING_TAGS`   = what a member would love help with
//
// Same shape: grouped categories with emoji headers for visual scanning.
// We keep the two lists separate (not just one shared list) because the
// vocabulary differs slightly — e.g. "Honest feedback" only makes sense
// in seeking, while "Active customer base" only makes sense in offering.
//
// Order within a category is roughly demand-weighted — most-asked-for
// items first.

export interface TagCategory {
  id: string;
  label: string;
  emoji: string;
  tags: string[];
}

// ── Offering ───────────────────────────────────────────────────────────────
export const OFFERING_TAGS: TagCategory[] = [
  {
    id: 'design',
    label: 'Design',
    emoji: '🎨',
    tags: [
      'Design feedback',
      'UI/UX review',
      'Brand identity',
      'Logo design',
      'Landing page critique',
      'Pitch deck design',
      'Figma pairing',
      'Illustration',
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering',
    emoji: '💻',
    tags: [
      'Code review',
      'Pairing sessions',
      'Architecture advice',
      'Frontend help',
      'Backend help',
      'DevOps / infra',
      'Database design',
      'AI / LLM integration',
      'Mobile (iOS/Android)',
      'Performance tuning',
    ],
  },
  {
    id: 'product',
    label: 'Product',
    emoji: '🧭',
    tags: [
      'Product strategy',
      'Feature scoping',
      'Roadmap critique',
      'User research',
      'Discovery interviews',
      'PRD review',
      'OKRs / planning',
    ],
  },
  {
    id: 'growth',
    label: 'Marketing & Growth',
    emoji: '📈',
    tags: [
      'Marketing strategy',
      'Copywriting',
      'SEO',
      'Content marketing',
      'Paid acquisition',
      'Email funnels',
      'Social / community',
      'Landing page conversion',
      'Brand positioning',
      'PR / launch playbooks',
    ],
  },
  {
    id: 'sales',
    label: 'Sales & Customers',
    emoji: '💬',
    tags: [
      'B2B sales',
      'Outbound playbooks',
      'Cold email review',
      'Discovery call practice',
      'Pricing strategy',
      'Customer success',
      'Account expansion',
    ],
  },
  {
    id: 'founder',
    label: 'Founder craft',
    emoji: '🚀',
    tags: [
      'Pitch deck review',
      'Fundraising advice',
      'Investor intros',
      'Cofounder dynamics',
      'Hiring',
      'Culture / ops',
      'Legal basics',
      'Mental health / burnout',
      'Accountability partner',
    ],
  },
  {
    id: 'craft',
    label: 'Other craft',
    emoji: '🛠',
    tags: [
      'Writing feedback',
      'Speaking / pitching practice',
      'Video editing',
      'Photography',
      'Music / audio',
      'Translation',
    ],
  },
];

// ── Seeking ────────────────────────────────────────────────────────────────
// Most overlaps with OFFERING but framed for "I need this" — plus a few
// human asks ("Honest feedback", "Sounding board") that only make sense
// from the asker's side.
export const SEEKING_TAGS: TagCategory[] = [
  {
    id: 'feedback',
    label: 'Feedback & soundboarding',
    emoji: '🪞',
    tags: [
      'Honest feedback',
      'Sounding board',
      'A second pair of eyes',
      'Pitch practice',
      'Decision support',
    ],
  },
  {
    id: 'design',
    label: 'Design help',
    emoji: '🎨',
    tags: [
      'Design feedback',
      'UI/UX review',
      'Brand identity',
      'Landing page critique',
      'Pitch deck design',
      'Logo / icon',
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering help',
    emoji: '💻',
    tags: [
      'Code review',
      'Pairing on a hard problem',
      'Architecture advice',
      'Frontend help',
      'Backend help',
      'AI / LLM integration',
      'Mobile (iOS/Android)',
      'Bug bash partner',
    ],
  },
  {
    id: 'product',
    label: 'Product help',
    emoji: '🧭',
    tags: [
      'Product strategy',
      'Feature scoping',
      'User research support',
      'PRD review',
    ],
  },
  {
    id: 'growth',
    label: 'Marketing & growth',
    emoji: '📈',
    tags: [
      'Marketing strategy',
      'Copywriting feedback',
      'SEO advice',
      'Content critique',
      'Paid acquisition',
      'Brand positioning',
      'Launch / PR',
    ],
  },
  {
    id: 'sales',
    label: 'Sales & customers',
    emoji: '💬',
    tags: [
      'Sales playbooks',
      'Cold email review',
      'Pricing strategy',
      'First-customer advice',
    ],
  },
  {
    id: 'founder',
    label: 'Founder craft',
    emoji: '🚀',
    tags: [
      'Pitch deck review',
      'Fundraising advice',
      'Cofounder dynamics',
      'Hiring advice',
      'Legal basics',
      'Accountability partner',
      'Mental health / burnout chat',
    ],
  },
];

// Flat lookup of every legal tag (for validation / autocomplete)
export const ALL_OFFERING_TAGS: string[] = OFFERING_TAGS.flatMap((c) => c.tags);
export const ALL_SEEKING_TAGS:  string[] = SEEKING_TAGS.flatMap((c) => c.tags);
