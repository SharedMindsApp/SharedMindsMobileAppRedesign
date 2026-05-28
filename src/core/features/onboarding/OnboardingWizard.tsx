/**
 * OnboardingWizard — compulsory 9-step setup flow.
 *
 * Rendered full-screen (fixed inset-0) by CoreApp.tsx whenever
 * `profile.wizard_v2_completed_at` is null. There is no skip or
 * exit — the whole point is that users with ADHD will avoid setup
 * indefinitely if given the option.
 *
 * Steps:
 *  1. welcome       — landing screen, sets expectations
 *  2. profile       — avatar (optional), name, one-line bio, work type(s)
 *  3. skills        — quick-pick skill chips
 *  4. intentions    — pick the day for weekly intention-setting
 *  5. set_intentions — (conditional) set this week's 3 intentions
 *  6. project       — create their first project (title + goal + colour)
 *  7. goals         — add 2-3 phases / goals to the project
 *  8. tasks         — add first tasks (skippable)
 *  9. done          — completion screen → home
 *
 * Saves:
 *  • Profile (name, bio, work types, skills, intentions_reminder_day)
 *    saved in steps 2-4 progressively so a network interruption
 *    doesn't lose everything.
 *  • Intentions saved as weekly_intentions rows (step 5 only).
 *  • Project + goals + tasks + wizard_v2_completed_at all saved
 *    atomically on the final "done" step.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowRight, ArrowLeft, Loader2, Camera, Target, Flag, CheckSquare,
  Calendar, Sparkles, Check, Plus, X, Search, Wand2, Briefcase, Clock,
  Brain, Users, Coffee, Headphones,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { uploadAvatar } from '../../services/ProfileService';
import { ProjectService } from '../../services/ProjectService';
import { SpaceService } from '../../services/SpaceService';
import { TaskService } from '../../services/TaskService';
import { ReflectionService, mondayOf } from '../../services/ReflectionService';
import { buildRoadmapValidationPrompt, parseRoadmapReply, buildTasksPrompt, parseTasksReply } from '../../../lib/roadmapPrompt';
import { AvatarCropper } from './AvatarCropper';

// ── Constants ──────────────────────────────────────────────────────

const WORK_TYPES = [
  { id: 'designer',     label: 'Designer',             emoji: '🎨' },
  { id: 'developer',    label: 'Developer',            emoji: '💻' },
  { id: 'writer',       label: 'Writer / Creator',     emoji: '✍️' },
  { id: 'founder',      label: 'Founder',              emoji: '🚀' },
  { id: 'filmmaker',    label: 'Filmmaker / Producer', emoji: '🎬' },
  { id: 'photographer', label: 'Photographer',         emoji: '📸' },
  { id: 'marketer',     label: 'Marketer',             emoji: '📣' },
  { id: 'musician',     label: 'Musician / Audio',     emoji: '🎵' },
  { id: 'consultant',   label: 'Consultant',           emoji: '🎯' },
  { id: 'coach',        label: 'Coach / Mentor',       emoji: '🧭' },
  { id: 'educator',     label: 'Educator / Teacher',   emoji: '📚' },
  { id: 'researcher',   label: 'Researcher',           emoji: '🔬' },
  { id: 'product',      label: 'Product Manager',      emoji: '📊' },
  { id: 'analyst',      label: 'Data / Analyst',       emoji: '📈' },
  { id: 'engineer',     label: 'Engineer',             emoji: '🔧' },
  { id: '3d',           label: '3D / Animator',        emoji: '🎮' },
  { id: 'other',        label: 'Something else',       emoji: '✨' },
];

/**
 * Per-work-type skill curation. The skills step shows the union of all
 * lists for the work types the user picked, deduped by label. Keeps the
 * chip grid tightly relevant instead of showing 60 unrelated options.
 */
const WORK_TYPE_SKILLS: Record<string, { emoji: string; label: string }[]> = {
  designer: [
    { emoji: '🎨', label: 'UI Design' },
    { emoji: '✨', label: 'Brand Identity' },
    { emoji: '📐', label: 'Figma' },
    { emoji: '🖼️', label: 'Illustration' },
    { emoji: '🎨', label: 'Logo Design' },
    { emoji: '🖌️', label: 'Adobe Creative Suite' },
    { emoji: '🎞️', label: 'Motion Design' },
    { emoji: '📰', label: 'Print Design' },
    { emoji: '🔤', label: 'Typography' },
    { emoji: '🎨', label: 'UX Design' },
  ],
  developer: [
    { emoji: '⚛️', label: 'React' },
    { emoji: '💻', label: 'TypeScript' },
    { emoji: '🐍', label: 'Python' },
    { emoji: '💚', label: 'Node.js' },
    { emoji: '🌐', label: 'Next.js' },
    { emoji: '🗄️', label: 'PostgreSQL' },
    { emoji: '📱', label: 'iOS Development' },
    { emoji: '📱', label: 'Android Development' },
    { emoji: '☁️', label: 'AWS' },
    { emoji: '🐳', label: 'Docker' },
    { emoji: '🤖', label: 'AI Engineering' },
    { emoji: '🦀', label: 'Rust' },
    { emoji: '🐹', label: 'Go' },
  ],
  writer: [
    { emoji: '✍️', label: 'Copywriting' },
    { emoji: '📝', label: 'Content Writing' },
    { emoji: '👻', label: 'Ghostwriting' },
    { emoji: '📚', label: 'Long-form Writing' },
    { emoji: '✏️', label: 'Editing' },
    { emoji: '📖', label: 'Fiction' },
    { emoji: '📰', label: 'Journalism' },
    { emoji: '🖊️', label: 'Technical Writing' },
    { emoji: '🎬', label: 'Screenwriting' },
    { emoji: '📧', label: 'Newsletter' },
  ],
  founder: [
    { emoji: '🎯', label: 'Strategy' },
    { emoji: '💰', label: 'Fundraising' },
    { emoji: '📊', label: 'Product Management' },
    { emoji: '📣', label: 'Marketing' },
    { emoji: '💼', label: 'Sales' },
    { emoji: '🤝', label: 'Hiring' },
    { emoji: '📈', label: 'Growth' },
    { emoji: '⚙️', label: 'Operations' },
    { emoji: '🔮', label: 'Vision' },
  ],
  filmmaker: [
    { emoji: '🎬', label: 'Video Editing' },
    { emoji: '🎥', label: 'Directing' },
    { emoji: '📷', label: 'Cinematography' },
    { emoji: '🎬', label: 'Producing' },
    { emoji: '📺', label: 'YouTube' },
    { emoji: '✍️', label: 'Screenwriting' },
    { emoji: '🎚️', label: 'Sound Design' },
    { emoji: '🌈', label: 'Colour Grading' },
    { emoji: '🎬', label: 'After Effects' },
    { emoji: '🎬', label: 'DaVinci Resolve' },
    { emoji: '🎬', label: 'Premiere Pro' },
  ],
  photographer: [
    { emoji: '📸', label: 'Portrait Photography' },
    { emoji: '💍', label: 'Wedding Photography' },
    { emoji: '📦', label: 'Product Photography' },
    { emoji: '🌅', label: 'Landscape' },
    { emoji: '🏙️', label: 'Street Photography' },
    { emoji: '✨', label: 'Photo Editing' },
    { emoji: '🖼️', label: 'Lightroom' },
    { emoji: '🖌️', label: 'Photoshop' },
    { emoji: '👗', label: 'Fashion' },
  ],
  marketer: [
    { emoji: '📱', label: 'Social Media' },
    { emoji: '📧', label: 'Email Marketing' },
    { emoji: '🔍', label: 'SEO' },
    { emoji: '📋', label: 'Content Strategy' },
    { emoji: '💰', label: 'Paid Ads' },
    { emoji: '📈', label: 'Growth' },
    { emoji: '📊', label: 'Analytics' },
    { emoji: '🎨', label: 'Brand Strategy' },
    { emoji: '✉️', label: 'Newsletter' },
    { emoji: '🌱', label: 'Community Building' },
  ],
  musician: [
    { emoji: '🎵', label: 'Music Production' },
    { emoji: '🎚️', label: 'Mixing' },
    { emoji: '🎛️', label: 'Mastering' },
    { emoji: '🎙️', label: 'Podcasting' },
    { emoji: '🎬', label: 'Sound Design' },
    { emoji: '🎤', label: 'Vocals' },
    { emoji: '🎹', label: 'Instrument Playing' },
    { emoji: '🎼', label: 'Songwriting' },
    { emoji: '🎻', label: 'Composition' },
  ],
  consultant: [
    { emoji: '🎯', label: 'Strategy' },
    { emoji: '📊', label: 'Business Analysis' },
    { emoji: '🧭', label: 'Coaching' },
    { emoji: '📋', label: 'Project Management' },
    { emoji: '🔄', label: 'Change Management' },
    { emoji: '🤝', label: 'Facilitation' },
    { emoji: '⚙️', label: 'Operations' },
  ],
  coach: [
    { emoji: '🧭', label: 'Coaching' },
    { emoji: '🌟', label: 'Mentoring' },
    { emoji: '🛠️', label: 'Workshops' },
    { emoji: '🤝', label: 'Facilitation' },
    { emoji: '💼', label: 'Career Coaching' },
    { emoji: '🧘', label: 'Mindfulness' },
    { emoji: '👑', label: 'Leadership' },
    { emoji: '🎯', label: 'Goal Setting' },
  ],
  educator: [
    { emoji: '📚', label: 'Teaching' },
    { emoji: '📋', label: 'Curriculum Design' },
    { emoji: '🎓', label: 'Course Creation' },
    { emoji: '💻', label: 'E-learning' },
    { emoji: '👨‍🏫', label: 'Tutoring' },
    { emoji: '🛠️', label: 'Workshop Design' },
    { emoji: '🎬', label: 'Educational Video' },
  ],
  researcher: [
    { emoji: '🔬', label: 'User Research' },
    { emoji: '📊', label: 'Data Analysis' },
    { emoji: '🎓', label: 'Academic Research' },
    { emoji: '🗣️', label: 'Interviews' },
    { emoji: '📋', label: 'Surveys' },
    { emoji: '🔍', label: 'UX Research' },
    { emoji: '📝', label: 'Writing Reports' },
  ],
  product: [
    { emoji: '📊', label: 'Product Management' },
    { emoji: '🎯', label: 'Strategy' },
    { emoji: '🔬', label: 'User Research' },
    { emoji: '📈', label: 'Analytics' },
    { emoji: '🗺️', label: 'Roadmapping' },
    { emoji: '⚖️', label: 'Prioritisation' },
    { emoji: '📋', label: 'Project Management' },
    { emoji: '📐', label: 'Figma' },
  ],
  analyst: [
    { emoji: '📈', label: 'Data Analysis' },
    { emoji: '🗃️', label: 'SQL' },
    { emoji: '📊', label: 'Excel' },
    { emoji: '🐍', label: 'Python' },
    { emoji: '📊', label: 'Tableau' },
    { emoji: '🔭', label: 'Looker' },
    { emoji: '📐', label: 'Statistics' },
    { emoji: '🤖', label: 'Machine Learning' },
    { emoji: '📊', label: 'Power BI' },
  ],
  engineer: [
    { emoji: '⚙️', label: 'Mechanical Engineering' },
    { emoji: '⚡', label: 'Electrical Engineering' },
    { emoji: '🏗️', label: 'Civil Engineering' },
    { emoji: '📐', label: 'CAD' },
    { emoji: '🔧', label: 'Prototyping' },
    { emoji: '⚙️', label: 'Systems Design' },
    { emoji: '🧪', label: 'Materials Science' },
  ],
  '3d': [
    { emoji: '🎮', label: '3D Modelling' },
    { emoji: '🎞️', label: 'Animation' },
    { emoji: '🟠', label: 'Blender' },
    { emoji: '🎮', label: 'Cinema 4D' },
    { emoji: '🎮', label: 'Game Development' },
    { emoji: '⚫', label: 'Unity' },
    { emoji: '🟣', label: 'Unreal Engine' },
    { emoji: '🧑‍🎨', label: 'Character Design' },
    { emoji: '🌌', label: 'VFX' },
  ],
  other: [
    // Generic catch-all — cross-functional skills shown when only "Other"
    // is picked, so the user still has something to choose from.
    { emoji: '📋', label: 'Project Management' },
    { emoji: '✍️', label: 'Writing' },
    { emoji: '🗣️', label: 'Communication' },
    { emoji: '📣', label: 'Marketing' },
    { emoji: '🎯', label: 'Strategy' },
    { emoji: '🤝', label: 'Networking' },
    { emoji: '📊', label: 'Analytics' },
    { emoji: '🛠️', label: 'Problem Solving' },
  ],
};

/**
 * Industries — the markets/sectors a member works in. Distinct from
 * work_type (role): "Founder in Healthcare" needs different suggested
 * skills than "Founder in Tech". Collected in its own wizard step
 * between Profile and Skills so the skills picker can pre-feature the
 * relevant categories.
 */
const INDUSTRIES = [
  { id: 'tech',          label: 'Tech / Software',     emoji: '💻' },
  { id: 'healthcare',    label: 'Healthcare',          emoji: '🩺' },
  { id: 'finance',       label: 'Finance',             emoji: '💰' },
  { id: 'education',     label: 'Education',           emoji: '📚' },
  { id: 'media',         label: 'Media / Film',        emoji: '🎬' },
  { id: 'sports',        label: 'Sports / Fitness',    emoji: '💪' },
  { id: 'fashion',       label: 'Fashion / Beauty',    emoji: '👗' },
  { id: 'hospitality',   label: 'Food / Hospitality',  emoji: '🍴' },
  { id: 'real_estate',   label: 'Real Estate',         emoji: '🏠' },
  { id: 'retail',        label: 'Retail / E-commerce', emoji: '🛍️' },
  { id: 'legal',         label: 'Legal',               emoji: '⚖️' },
  { id: 'marketing',     label: 'Marketing / Ads',     emoji: '📣' },
  { id: 'sustainability',label: 'Sustainability',      emoji: '🌱' },
  { id: 'nonprofit',     label: 'Non-profit',          emoji: '💚' },
  { id: 'art',           label: 'Art / Creative',      emoji: '🎨' },
  { id: 'gaming',        label: 'Gaming',              emoji: '🎮' },
  { id: 'science',       label: 'Science / Research',  emoji: '🔬' },
  { id: 'music',         label: 'Music',               emoji: '🎵' },
  { id: 'other_industry',label: 'Something else',      emoji: '✨' },
];

/**
 * Skill categories — used to organise the master skill list and drive
 * the quick-filter pills on the skills step. Each ALL_SKILLS entry has
 * a category id pointing into this map.
 */
type SkillCategoryId =
  | 'design' | 'dev' | 'writing' | 'business' | 'marketing' | 'product'
  | 'data' | 'film' | 'photo' | 'music_audio' | 'education' | 'research'
  | 'health' | 'sports' | 'finance_legal' | 'trades' | 'hospitality_ops'
  | 'engineering' | '3d_games' | 'languages' | 'sales' | 'soft';

const SKILL_CATEGORIES: Record<SkillCategoryId, { label: string; emoji: string }> = {
  design:           { label: 'Design',           emoji: '🎨' },
  dev:              { label: 'Development',      emoji: '💻' },
  writing:          { label: 'Writing',          emoji: '✍️' },
  business:         { label: 'Business',         emoji: '💼' },
  marketing:        { label: 'Marketing',        emoji: '📣' },
  product:          { label: 'Product',          emoji: '📊' },
  data:             { label: 'Data',             emoji: '📈' },
  film:             { label: 'Film & Video',     emoji: '🎬' },
  photo:            { label: 'Photography',      emoji: '📸' },
  music_audio:      { label: 'Music & Audio',    emoji: '🎵' },
  education:        { label: 'Education',        emoji: '📚' },
  research:         { label: 'Research',         emoji: '🔬' },
  health:           { label: 'Health & Medical', emoji: '🩺' },
  sports:           { label: 'Sports & Fitness', emoji: '💪' },
  finance_legal:    { label: 'Finance & Legal',  emoji: '💰' },
  trades:           { label: 'Trades & Crafts',  emoji: '🪵' },
  hospitality_ops:  { label: 'Hospitality',      emoji: '🍴' },
  engineering:      { label: 'Engineering',      emoji: '⚙️' },
  '3d_games':       { label: '3D / Games',       emoji: '🎮' },
  languages:        { label: 'Languages',        emoji: '🌍' },
  sales:            { label: 'Sales & CX',       emoji: '☎️' },
  soft:             { label: 'Soft Skills',      emoji: '🗣️' },
};

/**
 * Industry → preferred skill categories. When the user picks industries
 * in the wizard, the skills step features these categories at the front
 * of the filter pill row, and uses them to build the "Suggested" view.
 */
const INDUSTRY_TO_CATEGORIES: Record<string, SkillCategoryId[]> = {
  tech:           ['dev', 'design', 'product', 'data'],
  healthcare:     ['health', 'research'],
  finance:        ['finance_legal', 'data', 'business'],
  education:      ['education', 'writing', 'research'],
  media:          ['film', 'writing', 'music_audio', 'photo'],
  sports:         ['sports', 'health', 'education'],
  fashion:        ['design', 'photo', 'marketing'],
  hospitality:    ['hospitality_ops', 'trades', 'business'],
  real_estate:    ['business', 'finance_legal', 'sales'],
  retail:         ['marketing', 'sales', 'design'],
  legal:          ['finance_legal', 'writing', 'business'],
  marketing:      ['marketing', 'writing', 'design', 'data'],
  sustainability: ['research', 'engineering', 'business'],
  nonprofit:      ['marketing', 'writing', 'business'],
  art:            ['design', 'photo', 'music_audio'],
  gaming:         ['3d_games', 'dev', 'design'],
  science:        ['research', 'health', 'data'],
  music:          ['music_audio', 'film'],
  other_industry: ['soft', 'business'],
};

/**
 * Master skill list — the universe of all skills across industries.
 * Each entry has a category id used by the quick filter pills and by
 * the industry-tailored "Suggested" view. The search box on the skills
 * step matches across this whole list.
 *
 * Why this matters: "Founder" + "Healthcare" needs Clinical Research
 * and Biotechnology surfaced; "Founder" + "Sports" needs Personal
 * Training and Combat Sports. The cross of work-type × industry drives
 * which categories light up.
 */
const ALL_SKILLS: { emoji: string; label: string; category: SkillCategoryId }[] = [
  // ── Design ─────────────────────────────────────────────────
  { category: 'design', emoji: '🎨', label: 'UI Design' },
  { category: 'design', emoji: '🎨', label: 'UX Design' },
  { category: 'design', emoji: '✨', label: 'Brand Identity' },
  { category: 'design', emoji: '📐', label: 'Figma' },
  { category: 'design', emoji: '🖼️', label: 'Illustration' },
  { category: 'design', emoji: '🎨', label: 'Logo Design' },
  { category: 'design', emoji: '🖌️', label: 'Adobe Creative Suite' },
  { category: 'design', emoji: '🎞️', label: 'Motion Design' },
  { category: 'design', emoji: '📰', label: 'Print Design' },
  { category: 'design', emoji: '🔤', label: 'Typography' },
  { category: 'design', emoji: '📐', label: 'Sketch' },
  { category: 'design', emoji: '🏗️', label: 'Design Systems' },
  { category: 'design', emoji: '🎨', label: 'Interaction Design' },
  // ── Development ────────────────────────────────────────────
  { category: 'dev', emoji: '⚛️', label: 'React' },
  { category: 'dev', emoji: '💻', label: 'TypeScript' },
  { category: 'dev', emoji: '🐍', label: 'Python' },
  { category: 'dev', emoji: '💚', label: 'Node.js' },
  { category: 'dev', emoji: '🌐', label: 'Next.js' },
  { category: 'dev', emoji: '🗄️', label: 'PostgreSQL' },
  { category: 'dev', emoji: '📱', label: 'iOS Development' },
  { category: 'dev', emoji: '📱', label: 'Android Development' },
  { category: 'dev', emoji: '☁️', label: 'AWS' },
  { category: 'dev', emoji: '☁️', label: 'Azure' },
  { category: 'dev', emoji: '☁️', label: 'Google Cloud' },
  { category: 'dev', emoji: '🐳', label: 'Docker' },
  { category: 'dev', emoji: '🤖', label: 'AI Engineering' },
  { category: 'dev', emoji: '🤖', label: 'Machine Learning' },
  { category: 'dev', emoji: '🦀', label: 'Rust' },
  { category: 'dev', emoji: '🐹', label: 'Go' },
  { category: 'dev', emoji: '🪀', label: 'Vue' },
  { category: 'dev', emoji: '🧪', label: 'Testing' },
  { category: 'dev', emoji: '🔌', label: 'API Design' },
  { category: 'dev', emoji: '🔒', label: 'Security' },
  { category: 'dev', emoji: '🛠️', label: 'DevOps' },
  { category: 'dev', emoji: '🗃️', label: 'SQL' },
  { category: 'dev', emoji: '⚡', label: 'Performance' },
  // ── Writing & Content ──────────────────────────────────────
  { category: 'writing', emoji: '✍️', label: 'Copywriting' },
  { category: 'writing', emoji: '📝', label: 'Content Writing' },
  { category: 'writing', emoji: '👻', label: 'Ghostwriting' },
  { category: 'writing', emoji: '📚', label: 'Long-form Writing' },
  { category: 'writing', emoji: '✏️', label: 'Editing' },
  { category: 'writing', emoji: '📖', label: 'Fiction' },
  { category: 'writing', emoji: '📰', label: 'Journalism' },
  { category: 'writing', emoji: '🖊️', label: 'Technical Writing' },
  { category: 'writing', emoji: '🎬', label: 'Screenwriting' },
  { category: 'writing', emoji: '📧', label: 'Newsletter' },
  { category: 'writing', emoji: '📜', label: 'Poetry' },
  { category: 'writing', emoji: '📕', label: 'Book Authoring' },
  // ── Business & Founder ────────────────────────────────────
  { category: 'business', emoji: '🎯', label: 'Strategy' },
  { category: 'business', emoji: '💰', label: 'Fundraising' },
  { category: 'business', emoji: '🤝', label: 'Hiring' },
  { category: 'business', emoji: '📈', label: 'Growth' },
  { category: 'business', emoji: '⚙️', label: 'Operations' },
  { category: 'business', emoji: '🔮', label: 'Vision' },
  { category: 'business', emoji: '📊', label: 'Business Analysis' },
  { category: 'business', emoji: '🔄', label: 'Change Management' },
  { category: 'business', emoji: '🤝', label: 'Facilitation' },
  { category: 'business', emoji: '💼', label: 'Business Development' },
  { category: 'business', emoji: '🌍', label: 'Internationalisation' },
  { category: 'business', emoji: '⚖️', label: 'Negotiation' },
  // ── Marketing ──────────────────────────────────────────────
  { category: 'marketing', emoji: '📱', label: 'Social Media' },
  { category: 'marketing', emoji: '📧', label: 'Email Marketing' },
  { category: 'marketing', emoji: '🔍', label: 'SEO' },
  { category: 'marketing', emoji: '📋', label: 'Content Strategy' },
  { category: 'marketing', emoji: '💰', label: 'Paid Ads' },
  { category: 'marketing', emoji: '📊', label: 'Analytics' },
  { category: 'marketing', emoji: '🎨', label: 'Brand Strategy' },
  { category: 'marketing', emoji: '🌱', label: 'Community Building' },
  { category: 'marketing', emoji: '🎤', label: 'Public Relations' },
  { category: 'marketing', emoji: '📣', label: 'Influencer Marketing' },
  { category: 'marketing', emoji: '🎁', label: 'Affiliate Marketing' },
  // ── Product & Project ─────────────────────────────────────
  { category: 'product', emoji: '📊', label: 'Product Management' },
  { category: 'product', emoji: '🗺️', label: 'Roadmapping' },
  { category: 'product', emoji: '⚖️', label: 'Prioritisation' },
  { category: 'product', emoji: '📋', label: 'Project Management' },
  { category: 'product', emoji: '🏃', label: 'Agile / Scrum' },
  // ── Data & Analytics ──────────────────────────────────────
  { category: 'data', emoji: '📈', label: 'Data Analysis' },
  { category: 'data', emoji: '📊', label: 'Excel' },
  { category: 'data', emoji: '📊', label: 'Tableau' },
  { category: 'data', emoji: '🔭', label: 'Looker' },
  { category: 'data', emoji: '📐', label: 'Statistics' },
  { category: 'data', emoji: '📊', label: 'Power BI' },
  { category: 'data', emoji: '📈', label: 'Data Visualisation' },
  { category: 'data', emoji: '🧮', label: 'Data Science' },
  // ── Film & Video ──────────────────────────────────────────
  { category: 'film', emoji: '🎬', label: 'Video Editing' },
  { category: 'film', emoji: '🎥', label: 'Directing' },
  { category: 'film', emoji: '📷', label: 'Cinematography' },
  { category: 'film', emoji: '🎬', label: 'Producing' },
  { category: 'film', emoji: '📺', label: 'YouTube' },
  { category: 'film', emoji: '🌈', label: 'Colour Grading' },
  { category: 'film', emoji: '🎬', label: 'After Effects' },
  { category: 'film', emoji: '🎬', label: 'DaVinci Resolve' },
  { category: 'film', emoji: '🎬', label: 'Premiere Pro' },
  { category: 'film', emoji: '🎬', label: 'Documentary' },
  { category: 'film', emoji: '🎬', label: 'Drone Filming' },
  // ── Photography ───────────────────────────────────────────
  { category: 'photo', emoji: '📸', label: 'Portrait Photography' },
  { category: 'photo', emoji: '💍', label: 'Wedding Photography' },
  { category: 'photo', emoji: '📦', label: 'Product Photography' },
  { category: 'photo', emoji: '🌅', label: 'Landscape' },
  { category: 'photo', emoji: '🏙️', label: 'Street Photography' },
  { category: 'photo', emoji: '✨', label: 'Photo Editing' },
  { category: 'photo', emoji: '🖼️', label: 'Lightroom' },
  { category: 'photo', emoji: '🖌️', label: 'Photoshop' },
  { category: 'photo', emoji: '👗', label: 'Fashion Photography' },
  // ── Music & Audio ─────────────────────────────────────────
  { category: 'music_audio', emoji: '🎵', label: 'Music Production' },
  { category: 'music_audio', emoji: '🎚️', label: 'Mixing' },
  { category: 'music_audio', emoji: '🎛️', label: 'Mastering' },
  { category: 'music_audio', emoji: '🎙️', label: 'Podcasting' },
  { category: 'music_audio', emoji: '🎬', label: 'Sound Design' },
  { category: 'music_audio', emoji: '🎤', label: 'Vocals' },
  { category: 'music_audio', emoji: '🎹', label: 'Instrument Playing' },
  { category: 'music_audio', emoji: '🎼', label: 'Songwriting' },
  { category: 'music_audio', emoji: '🎻', label: 'Composition' },
  { category: 'music_audio', emoji: '🎚️', label: 'Audio Engineering' },
  { category: 'music_audio', emoji: '📻', label: 'Radio' },
  // ── Education & Coaching ──────────────────────────────────
  { category: 'education', emoji: '🧭', label: 'Coaching' },
  { category: 'education', emoji: '🌟', label: 'Mentoring' },
  { category: 'education', emoji: '🛠️', label: 'Workshops' },
  { category: 'education', emoji: '💼', label: 'Career Coaching' },
  { category: 'education', emoji: '🧘', label: 'Mindfulness' },
  { category: 'education', emoji: '👑', label: 'Leadership' },
  { category: 'education', emoji: '🎯', label: 'Goal Setting' },
  { category: 'education', emoji: '📚', label: 'Teaching' },
  { category: 'education', emoji: '📋', label: 'Curriculum Design' },
  { category: 'education', emoji: '🎓', label: 'Course Creation' },
  { category: 'education', emoji: '💻', label: 'E-learning' },
  { category: 'education', emoji: '👨‍🏫', label: 'Tutoring' },
  { category: 'education', emoji: '🎬', label: 'Educational Video' },
  { category: 'education', emoji: '🗣️', label: 'Public Speaking' },
  // ── Research ──────────────────────────────────────────────
  { category: 'research', emoji: '🔬', label: 'User Research' },
  { category: 'research', emoji: '🎓', label: 'Academic Research' },
  { category: 'research', emoji: '🗣️', label: 'Interviews' },
  { category: 'research', emoji: '📋', label: 'Surveys' },
  // ── Health & Medical ──────────────────────────────────────
  { category: 'health', emoji: '🩺', label: 'Medicine' },
  { category: 'health', emoji: '🩺', label: 'General Practice' },
  { category: 'health', emoji: '💊', label: 'Pharmacology' },
  { category: 'health', emoji: '🧬', label: 'Biotechnology' },
  { category: 'health', emoji: '🧬', label: 'Genetics' },
  { category: 'health', emoji: '🔬', label: 'Clinical Research' },
  { category: 'health', emoji: '🩺', label: 'Surgery' },
  { category: 'health', emoji: '🧠', label: 'Neuroscience' },
  { category: 'health', emoji: '🩺', label: 'Cardiology' },
  { category: 'health', emoji: '🩺', label: 'Oncology' },
  { category: 'health', emoji: '🩺', label: 'Paediatrics' },
  { category: 'health', emoji: '🩺', label: 'Psychiatry' },
  { category: 'health', emoji: '🧠', label: 'Psychology' },
  { category: 'health', emoji: '🛋️', label: 'Therapy / Counselling' },
  { category: 'health', emoji: '🥼', label: 'Nursing' },
  { category: 'health', emoji: '💪', label: 'Physical Therapy' },
  { category: 'health', emoji: '🦷', label: 'Dentistry' },
  { category: 'health', emoji: '👁️', label: 'Optometry' },
  { category: 'health', emoji: '🥗', label: 'Nutrition' },
  { category: 'health', emoji: '🧪', label: 'Laboratory Science' },
  { category: 'health', emoji: '🏥', label: 'Public Health' },
  { category: 'health', emoji: '🧘', label: 'Wellness' },
  { category: 'health', emoji: '🩺', label: 'Medical Devices' },
  // ── Sports & Fitness ──────────────────────────────────────
  { category: 'sports', emoji: '💪', label: 'Personal Training' },
  { category: 'sports', emoji: '🥋', label: 'Combat Sports' },
  { category: 'sports', emoji: '🥊', label: 'Boxing' },
  { category: 'sports', emoji: '🥋', label: 'Brazilian Jiu-Jitsu' },
  { category: 'sports', emoji: '🥋', label: 'MMA' },
  { category: 'sports', emoji: '🥋', label: 'Wrestling' },
  { category: 'sports', emoji: '🥋', label: 'Karate' },
  { category: 'sports', emoji: '🧘', label: 'Yoga' },
  { category: 'sports', emoji: '🧘', label: 'Pilates' },
  { category: 'sports', emoji: '🏃', label: 'Running Coach' },
  { category: 'sports', emoji: '🏋️', label: 'Strength & Conditioning' },
  { category: 'sports', emoji: '🏊', label: 'Swimming Coach' },
  { category: 'sports', emoji: '⚽', label: 'Team Sports Coaching' },
  { category: 'sports', emoji: '🧠', label: 'Sports Psychology' },
  { category: 'sports', emoji: '🏃', label: 'Athletic Training' },
  // ── Finance & Legal ───────────────────────────────────────
  { category: 'finance_legal', emoji: '💰', label: 'Investing' },
  { category: 'finance_legal', emoji: '📊', label: 'Accounting' },
  { category: 'finance_legal', emoji: '🧾', label: 'Tax' },
  { category: 'finance_legal', emoji: '🏠', label: 'Real Estate' },
  { category: 'finance_legal', emoji: '🤝', label: 'M&A' },
  { category: 'finance_legal', emoji: '💼', label: 'Venture Capital' },
  { category: 'finance_legal', emoji: '🏦', label: 'Banking' },
  { category: 'finance_legal', emoji: '📋', label: 'Financial Planning' },
  { category: 'finance_legal', emoji: '₿', label: 'Crypto / Web3' },
  { category: 'finance_legal', emoji: '📜', label: 'Contract Law' },
  { category: 'finance_legal', emoji: '⚖️', label: 'IP Law' },
  { category: 'finance_legal', emoji: '⚖️', label: 'Corporate Law' },
  { category: 'finance_legal', emoji: '✅', label: 'Compliance' },
  { category: 'finance_legal', emoji: '🛡️', label: 'Insurance' },
  // ── Trades & Crafts ───────────────────────────────────────
  { category: 'trades', emoji: '🪵', label: 'Woodworking' },
  { category: 'trades', emoji: '🔨', label: 'Metalworking' },
  { category: 'trades', emoji: '🏺', label: 'Pottery / Ceramics' },
  { category: 'trades', emoji: '🧵', label: 'Sewing' },
  { category: 'trades', emoji: '💍', label: 'Jewellery Making' },
  { category: 'trades', emoji: '🪡', label: 'Knitting / Crochet' },
  { category: 'trades', emoji: '🍳', label: 'Cooking' },
  { category: 'trades', emoji: '🍷', label: 'Sommelier' },
  { category: 'trades', emoji: '🌱', label: 'Gardening' },
  // ── Hospitality ───────────────────────────────────────────
  { category: 'hospitality_ops', emoji: '🍴', label: 'Restaurant Management' },
  { category: 'hospitality_ops', emoji: '🏨', label: 'Hotel Management' },
  { category: 'hospitality_ops', emoji: '🎉', label: 'Event Planning' },
  { category: 'hospitality_ops', emoji: '🥂', label: 'Catering' },
  // ── Manufacturing & Engineering ───────────────────────────
  { category: 'engineering', emoji: '⚙️', label: 'Mechanical Engineering' },
  { category: 'engineering', emoji: '⚡', label: 'Electrical Engineering' },
  { category: 'engineering', emoji: '🏗️', label: 'Civil Engineering' },
  { category: 'engineering', emoji: '🧪', label: 'Chemical Engineering' },
  { category: 'engineering', emoji: '📐', label: 'CAD' },
  { category: 'engineering', emoji: '🔧', label: 'Prototyping' },
  { category: 'engineering', emoji: '🚚', label: 'Supply Chain' },
  { category: 'engineering', emoji: '📦', label: 'Logistics' },
  { category: 'engineering', emoji: '✅', label: 'Quality Assurance' },
  { category: 'engineering', emoji: '🏭', label: 'Manufacturing' },
  // ── 3D / Games ────────────────────────────────────────────
  { category: '3d_games', emoji: '🎮', label: '3D Modelling' },
  { category: '3d_games', emoji: '🎞️', label: 'Animation' },
  { category: '3d_games', emoji: '🟠', label: 'Blender' },
  { category: '3d_games', emoji: '🎮', label: 'Cinema 4D' },
  { category: '3d_games', emoji: '🎮', label: 'Game Development' },
  { category: '3d_games', emoji: '⚫', label: 'Unity' },
  { category: '3d_games', emoji: '🟣', label: 'Unreal Engine' },
  { category: '3d_games', emoji: '🧑‍🎨', label: 'Character Design' },
  { category: '3d_games', emoji: '🌌', label: 'VFX' },
  // ── Languages & Cultural ──────────────────────────────────
  { category: 'languages', emoji: '🗣️', label: 'Translation' },
  { category: 'languages', emoji: '🌍', label: 'Interpretation' },
  { category: 'languages', emoji: '🌍', label: 'Bilingual / Multilingual' },
  // ── Sales & CX ────────────────────────────────────────────
  { category: 'sales', emoji: '💼', label: 'Sales' },
  { category: 'sales', emoji: '☎️', label: 'Cold Outreach' },
  { category: 'sales', emoji: '🎯', label: 'Account Management' },
  { category: 'sales', emoji: '💬', label: 'Customer Success' },
  { category: 'sales', emoji: '🆘', label: 'Customer Support' },
  // ── Soft / Cross-functional ───────────────────────────────
  { category: 'soft', emoji: '🗣️', label: 'Communication' },
  { category: 'soft', emoji: '🤝', label: 'Networking' },
  { category: 'soft', emoji: '🛠️', label: 'Problem Solving' },
  { category: 'soft', emoji: '📖', label: 'Storytelling' },
];

const PROJECT_COLOURS = [
  { token: 'violet', hex: '#8b5cf6', label: 'Violet' },
  { token: 'blue',   hex: '#3b82f6', label: 'Blue'   },
  { token: 'cyan',   hex: '#22d3ee', label: 'Cyan'   },
  { token: 'emerald',hex: '#10b981', label: 'Emerald' },
  { token: 'amber',  hex: '#f59e0b', label: 'Amber'  },
  { token: 'rose',   hex: '#f43f5e', label: 'Rose'   },
];

/**
 * Build the "use your AI's existing context" prompt with the project
 * name interpolated. Falls back to a bracketed placeholder if the name
 * is blank, so a user who hasn't typed a name yet still gets clear
 * instructions when they copy the prompt.
 *
 * Deliberately vendor-neutral and app-neutral — naming external apps
 * tends to derail AIs with strict context rules or web-search behaviour,
 * and makes the prompt feel like marketing copy.
 */
function buildBrainDumpPrompt(projectName: string): string {
  const trimmed = projectName.trim();
  const subject = trimmed.length > 0 ? trimmed : '[REPLACE WITH PROJECT NAME OR TOPIC]';
  return `Based on what you know about my work on ${subject}, write a 250–400 word project summary in first person, flowing prose (no headings, no bullet points), covering:

- What this project is — in one or two sentences
- Why I'm doing it / what motivated it
- Who it's for, or what shape it could take
- Where I am right now — what's done, what's in flight, what's blocked
- What's still to do, in rough phases
- Any constraints — deadlines, scope limits, dependencies, people involved

Write it as if I'm explaining it to a thoughtful collaborator. Keep it concrete — specific tools, names, decisions I've already made. Skip filler and skip the meta-narrative; just produce the summary itself, ready to paste.`;
}

/** 0 = Sunday … 6 = Saturday. All 7 days shown — Monday's note still
 *  flags it as recommended (and the UI puts a ★ badge on it), but the
 *  user gets to pick whatever fits their actual week. */
const INTENTION_DAYS = [
  { day: 1, label: 'Monday',    note: 'Recommended — clean start to the week' },
  { day: 2, label: 'Tuesday',   note: 'After Monday fires are out' },
  { day: 3, label: 'Wednesday', note: 'Mid-week reset and re-prioritise' },
  { day: 4, label: 'Thursday',  note: 'Plan ahead for end-of-week sprint' },
  { day: 5, label: 'Friday',    note: 'Set next week before signing off' },
  { day: 6, label: 'Saturday',  note: 'Weekend review and planning ritual' },
  { day: 0, label: 'Sunday',    note: 'Plan the week ahead the night before' },
];

// ── Types ──────────────────────────────────────────────────────────

type Step =
  | 'welcome'
  | 'profile'
  | 'industries'
  | 'skills'
  | 'intentions'
  | 'set_intentions'
  | 'project'
  | 'project_shape'
  | 'goals'
  | 'tasks'
  | 'done';

// Steps that are always visible (used for progress bar denominator).
// set_intentions is conditional, so we omit it from the fixed count.
//
// Onboarding is intentionally short: every step needs to either unlock
// something the product genuinely needs (display name, work type) OR
// materially personalise the experience right now (skills for matching).
// The project / project_shape / goals / tasks steps were cut in favour
// of an in-app "Plan a project" surface that fires once the user has
// completed their first session — by then they actually know what a
// project means in our product, and they'll fill it in with real
// intent rather than placeholder text. The step bodies stay in the
// file (`step === 'project'` etc.) so they can be revived later as a
// standalone wizard reachable from `/projects`.
const COUNTED_STEPS: Step[] = [
  'welcome', 'profile', 'industries', 'skills', 'intentions', 'done',
];

// ── Helpers ────────────────────────────────────────────────────────

function gradFor(name: string): string {
  const grads = [
    'from-violet-400 to-fuchsia-500',
    'from-cyan-400 to-blue-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return grads[Math.abs(h) % grads.length];
}

function todayDayOfWeek(): number {
  return new Date().getDay(); // 0=Sunday
}

// ── Step wrapper (shared chrome) ───────────────────────────────────

/**
 * Wizard-scoped keyframes. Declared via a <style> tag so they're globally
 * available by name while the wizard is mounted, without polluting index.css.
 * All anims respect prefers-reduced-motion via the @media query at the bottom.
 */
const WIZARD_ANIM_CSS = `
@keyframes wizFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wizFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes wizPop {
  0%   { transform: scale(0.85); opacity: 0; }
  60%  { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1); }
}
@keyframes wizGentleBounce {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50%      { transform: translateY(-6px) rotate(3deg); }
}
@keyframes wizPulseGlow {
  0%, 100% { box-shadow: 0 8px 24px -4px rgb(99 102 241 / 0.4); }
  50%      { box-shadow: 0 12px 32px -2px rgb(168 85 247 / 0.6); }
}
@keyframes wizConfettiBurst {
  0%   { transform: translateY(0) rotate(0); opacity: 1; }
  100% { transform: translateY(-180px) rotate(720deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .wiz-anim, .wiz-anim * { animation: none !important; }
}
`;

function StepShell({
  step,
  canGoBack,
  onBack,
  onClose,
  children,
}: {
  step: Step;
  canGoBack: boolean;
  onBack: () => void;
  /** When provided (newProject mode), shows an X to exit the wizard. */
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const visibleIndex = COUNTED_STEPS.indexOf(step === 'set_intentions' ? 'intentions' : step);
  const total = COUNTED_STEPS.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface overflow-hidden wiz-anim">
      <style>{WIZARD_ANIM_CSS}</style>

      {/* Progress bar */}
      <div className="w-full h-1 bg-surface-container shrink-0">
        <div
          className="h-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
          style={{ width: `${((visibleIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Header row: back button + step label */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1 shrink-0">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Go back"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
            canGoBack
              ? 'bg-surface-container-low hover:bg-surface-container stitch-text-primary'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <ArrowLeft size={16} />
        </button>
        <span
          key={step}
          className="text-[10px] font-bold stitch-text-secondary uppercase tracking-widest"
          style={{ animation: 'wizFadeIn 300ms ease-out both' }}
        >
          {onClose ? 'New project' : `Step ${Math.max(1, visibleIndex + 1)} of ${total}`}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-low hover:bg-surface-container stitch-text-secondary transition-all active:scale-90"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Scrollable content — keyed by step so each transition replays the anim */}
      <div className="flex-1 overflow-y-auto">
        <div
          key={step}
          className="max-w-lg mx-auto px-5 pt-4 pb-8"
          style={{ animation: 'wizFadeUp 400ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export function OnboardingWizard({
  onComplete,
  mode = 'onboarding',
  onProjectCreated,
}: {
  /** In onboarding mode: navigate the user into the app. In newProject mode:
   *  the close/cancel handler (X button). */
  onComplete: () => void;
  /** 'onboarding' = full first-run flow. 'newProject' = launched from
   *  /projects to set up a single project (starts at the project step,
   *  skips profile/skills, doesn't touch onboarding state). */
  mode?: 'onboarding' | 'newProject';
  /** newProject only — fires with the new project's id once created. */
  onProjectCreated?: (projectId: string) => void;
}) {
  const { profile, refreshProfile } = useAuth();

  // ── Step state ─────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(mode === 'newProject' ? 'project' : 'welcome');
  /** Stack of previous steps for the back button. Pushed on every forward
   *  navigation; popped (and applied) when the user taps Back. Tracking this
   *  explicitly is the cleanest way to handle the conditional `set_intentions`
   *  step — a static "previous step" map would get the conditional wrong. */
  const [stepHistory, setStepHistory] = useState<Step[]>([]);

  // ── Profile fields ─────────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatar_url ?? null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  /** When non-null, the cropper modal is shown over the wizard with this
   *  raw file (pre-crop). Cleared on confirm or cancel. */
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [workTypes, setWorkTypes] = useState<string[]>(
    profile?.work_types?.length
      ? profile.work_types
      : profile?.work_type
      ? [profile.work_type]
      : [],
  );

  // ── Industries ─────────────────────────────────────────────────
  const [industries, setIndustries] = useState<string[]>(profile?.industries ?? []);

  // ── Skills ─────────────────────────────────────────────────────
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [skillQuery, setSkillQuery] = useState('');
  /** Active category quick filter; null = show "Suggested for you". */
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<SkillCategoryId | null>(null);

  // ── Intentions ─────────────────────────────────────────────────
  const [intentionsDay, setIntentionsDay] = useState<number>(1); // default Monday
  const [intentions, setIntentions] = useState<string[]>(['', '', '']);

  // ── Project ────────────────────────────────────────────────────
  const [projectTitle, setProjectTitle] = useState('');
  /** Free-text "brain dump" — what is this project, why are you doing it,
   *  who is it for, what could it become? Up to ~500 words. Becomes rich
   *  context for the AI roadmap generator on the goals/tasks steps.
   *  Persisted to projects.description. */
  const [projectBrainDump, setProjectBrainDump] = useState('');
  const [projectColour, setProjectColour] = useState('violet');

  // ── Project shape (drives AI roadmap relevance) ────────────────
  const [projectStartedStatus, setProjectStartedStatus] =
    useState<'new' | 'in_progress'>('new');
  const [projectCompletionPct, setProjectCompletionPct] = useState(0);
  const [projectType, setProjectType] =
    useState<
      | 'passion' | 'creative' | 'startup' | 'client'
      | 'employment' | 'freelance' | 'learning' | 'personal'
      | null
    >(null);
  const [projectTargetDate, setProjectTargetDate] = useState<string>('');
  const [projectDeadlineFlex, setProjectDeadlineFlex] =
    useState<'fixed' | 'flexible' | 'none'>('flexible');

  // ── AI suggestion state ─────────────────────────────────────────
  const [suggestingPhases, setSuggestingPhases] = useState(false);
  const [suggestingTasks, setSuggestingTasks] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ── Clarifying questions (AI's "need more context" path) ──────
  // When the roadmap call returns questions instead of milestones, we
  // stash them here and render an inline form. On submit we re-call the
  // edge function with the typed answers as `clarifications`.
  type AiQuestion = { id: string; question: string; max_chars: number; why?: string };
  const [pendingQuestions, setPendingQuestions] = useState<AiQuestion[] | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  // ── "Use your own AI" prompt helper ────────────────────────────
  // A copy-able prompt the user pastes into ChatGPT/Claude/etc — which
  // already has rich context from their existing chats — to produce a
  // brain dump they can paste back into the textarea above. Lowers the
  // blank-page barrier dramatically.
  const [showAiPromptHelper, setShowAiPromptHelper] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  // Roadmap "validate with your own AI" helper (goals step).
  const [showRoadmapHelper, setShowRoadmapHelper] = useState(false);
  const [roadmapPromptCopied, setRoadmapPromptCopied] = useState(false);
  const [roadmapReply, setRoadmapReply] = useState('');
  const [roadmapApplyMsg, setRoadmapApplyMsg] = useState<string | null>(null);
  // Tasks "write with your own AI" helper (tasks step).
  const [showTasksHelper, setShowTasksHelper] = useState(false);
  const [tasksPromptCopied, setTasksPromptCopied] = useState(false);
  const [tasksReply, setTasksReply] = useState('');
  const [tasksApplyMsg, setTasksApplyMsg] = useState<string | null>(null);

  // ── Roadmap: milestones with nested phases ─────────────────────
  // Two-tier structure:
  //   • Milestones are destinations (Beta launch · 100 paying users · …).
  //     weight_pct = % of the whole project this milestone represents.
  //   • Phases are work units within a milestone.
  //     weight_pct = % within the milestone (sum ~= 100 per milestone).
  // already_done is the reality-check toggle on either level.
  type PhaseInput = { title: string; weight_pct: number; already_done: boolean };
  type MilestoneInput = {
    title: string;
    weight_pct: number;
    already_done: boolean;
    phases: PhaseInput[];
  };
  const [milestoneInputs, setMilestoneInputs] = useState<MilestoneInput[]>([
    {
      title: '',
      weight_pct: 50,
      already_done: false,
      phases: [
        { title: '', weight_pct: 50, already_done: false },
        { title: '', weight_pct: 50, already_done: false },
      ],
    },
    {
      title: '',
      weight_pct: 50,
      already_done: false,
      phases: [{ title: '', weight_pct: 100, already_done: false }],
    },
  ]);

  // ── Tasks ──────────────────────────────────────────────────────
  const [taskInputs, setTaskInputs] = useState<string[]>(['', '', '']);

  // ── UI state ───────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ────────────────────────────────────────────────────

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Send through the cropper instead of using the raw file directly.
    setCropSourceFile(file);
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = '';
  }

  async function copyBrainDumpPrompt() {
    try {
      await navigator.clipboard.writeText(buildBrainDumpPrompt(projectTitle));
      setPromptCopied(true);
      // Reset the visual confirmation after a moment so a second copy still
      // feels acknowledged.
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      // Clipboard API can fail on unsupported browsers — leave the prompt
      // visible so the user can manually select+copy.
      setPromptCopied(false);
    }
  }

  async function copyRoadmapPrompt() {
    try {
      await navigator.clipboard.writeText(
        buildRoadmapValidationPrompt({
          projectName: projectTitle,
          brainDump: projectBrainDump,
          milestones: milestoneInputs,
          startedStatus: projectStartedStatus,
          completionPct: projectStartedStatus === 'in_progress' ? projectCompletionPct : null,
        }),
      );
      setRoadmapPromptCopied(true);
      setTimeout(() => setRoadmapPromptCopied(false), 2000);
    } catch {
      setRoadmapPromptCopied(false);
    }
  }

  /** Parse the AI's reply (M:/P: format) and replace the roadmap with it. */
  function applyRoadmapReply() {
    const parsed = parseRoadmapReply(roadmapReply);
    if (parsed.length === 0) {
      setRoadmapApplyMsg("Couldn't read that — make sure you pasted the AI's reply in the M:/P: format.");
      return;
    }
    setMilestoneInputs(parsed.map((m) => ({
      title: m.title,
      weight_pct: m.weight_pct,
      already_done: m.done,
      phases: m.phases.length > 0
        ? m.phases.map((p) => ({ title: p.title, weight_pct: p.weight_pct, already_done: p.done }))
        : [{ title: '', weight_pct: 100, already_done: false }],
    })));
    const phaseCount = parsed.reduce((n, m) => n + m.phases.length, 0);
    setRoadmapApplyMsg(`Applied ${parsed.length} milestone${parsed.length === 1 ? '' : 's'} · ${phaseCount} phase${phaseCount === 1 ? '' : 's'}.`);
    setRoadmapReply('');
    setShowRoadmapHelper(false);
  }

  async function copyTasksPrompt() {
    try {
      await navigator.clipboard.writeText(
        buildTasksPrompt({ projectName: projectTitle, brainDump: projectBrainDump, milestones: milestoneInputs }),
      );
      setTasksPromptCopied(true);
      setTimeout(() => setTasksPromptCopied(false), 2000);
    } catch {
      setTasksPromptCopied(false);
    }
  }

  function applyTasksReply() {
    const parsed = parseTasksReply(tasksReply);
    if (parsed.length === 0) {
      setTasksApplyMsg("Couldn't read any tasks — paste the AI's reply with one task per line.");
      return;
    }
    setTaskInputs(parsed);
    setTasksApplyMsg(`Added ${parsed.length} task${parsed.length === 1 ? '' : 's'}.`);
    setTasksReply('');
    setShowTasksHelper(false);
  }

  function handleCropConfirm(croppedFile: File, previewUrl: string) {
    setAvatarFile(croppedFile);
    setAvatarPreview(previewUrl);
    setCropSourceFile(null);
  }

  function toggleIndustry(id: string) {
    setIndustries((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 3) return cur;
      return [...cur, id];
    });
  }

  function toggleWorkType(id: string) {
    setWorkTypes((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 3) return cur;
      return [...cur, id];
    });
  }

  function toggleSkill(label: string) {
    setSkills((cur) => {
      if (cur.includes(label)) return cur.filter((s) => s !== label);
      if (cur.length >= 6) return cur;
      return [...cur, label];
    });
  }

  // ── Milestone + phase mutation helpers ─────────────────────────
  // All helpers go through `setMilestoneInputs` with immutable updates.
  // The `mi` index always refers to milestone position; `pi` to phase
  // position within that milestone.

  function clampPct(val: number): number {
    return Math.max(0, Math.min(100, Math.round(val)));
  }

  function updateMilestone(mi: number, patch: Partial<Omit<MilestoneInput, 'phases'>>) {
    setMilestoneInputs((cur) =>
      cur.map((m, i) => (i === mi ? { ...m, ...patch } : m)),
    );
  }
  function toggleMilestoneDone(mi: number) {
    setMilestoneInputs((cur) =>
      cur.map((m, i) => (i === mi ? { ...m, already_done: !m.already_done } : m)),
    );
  }
  function addMilestoneRow() {
    if (milestoneInputs.length < 6) {
      setMilestoneInputs((cur) => [
        ...cur,
        {
          title: '',
          weight_pct: 20,
          already_done: false,
          phases: [{ title: '', weight_pct: 100, already_done: false }],
        },
      ]);
    }
  }
  function removeMilestoneRow(mi: number) {
    if (milestoneInputs.length <= 1) return;
    setMilestoneInputs((cur) => cur.filter((_, i) => i !== mi));
  }

  function updatePhase(mi: number, pi: number, patch: Partial<PhaseInput>) {
    setMilestoneInputs((cur) =>
      cur.map((m, i) =>
        i === mi
          ? { ...m, phases: m.phases.map((p, j) => (j === pi ? { ...p, ...patch } : p)) }
          : m,
      ),
    );
  }
  function togglePhaseDone(mi: number, pi: number) {
    setMilestoneInputs((cur) =>
      cur.map((m, i) =>
        i === mi
          ? { ...m, phases: m.phases.map((p, j) => (j === pi ? { ...p, already_done: !p.already_done } : p)) }
          : m,
      ),
    );
  }
  function addPhaseRow(mi: number) {
    setMilestoneInputs((cur) =>
      cur.map((m, i) => {
        if (i !== mi) return m;
        if (m.phases.length >= 6) return m;
        return { ...m, phases: [...m.phases, { title: '', weight_pct: 20, already_done: false }] };
      }),
    );
  }
  function removePhaseRow(mi: number, pi: number) {
    setMilestoneInputs((cur) =>
      cur.map((m, i) => {
        if (i !== mi) return m;
        if (m.phases.length <= 1) return m;
        return { ...m, phases: m.phases.filter((_, j) => j !== pi) };
      }),
    );
  }

  function updateTask(i: number, val: string) {
    setTaskInputs((cur) => cur.map((t, idx) => (idx === i ? val : t)));
  }

  function addTaskRow() {
    if (taskInputs.length < 6) setTaskInputs((cur) => [...cur, '']);
  }

  function updateIntention(i: number, val: string) {
    setIntentions((cur) => cur.map((x, idx) => (idx === i ? val : x)));
  }

  // ── Step savers ────────────────────────────────────────────────

  const saveProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Avatar upload (fire and ignore moderation errors — user can fix later)
    let avatarUrl = profile?.avatar_url ?? null;
    if (avatarFile) {
      try {
        avatarUrl = await uploadAvatar(avatarFile);
      } catch {
        // Non-fatal — profile saves without avatar if moderation rejects it
      }
    }

    await supabase.from('profiles').update({
      display_name: name.trim(),
      bio: bio.trim() || null,
      work_types: workTypes,
      work_type: workTypes[0] ?? null,
      ...(avatarUrl !== profile?.avatar_url ? { avatar_url: avatarUrl } : {}),
    }).eq('id', user.id);
  }, [name, bio, workTypes, avatarFile, profile?.avatar_url]);

  const saveIndustries = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({
      industries: industries.length > 0 ? industries : null,
    }).eq('id', user.id);
  }, [industries]);

  const saveSkills = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({
      skills: skills.length > 0 ? skills : null,
    }).eq('id', user.id);
  }, [skills]);

  const saveIntentionsDay = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({
      intentions_reminder_day: intentionsDay,
    }).eq('id', user.id);
  }, [intentionsDay]);

  /** Save weekly intentions rows if the user set them on step 5. */
  const saveIntentionsIfSet = useCallback(async () => {
    const filled = intentions.filter((s) => s.trim());
    if (filled.length === 0) return;

    try {
      const weekStart = mondayOf();
      const reflection = await ReflectionService.ensureReflection(weekStart);
      for (let i = 0; i < filled.length; i++) {
        await ReflectionService.addIntention({
          reflectionId: reflection.id,
          title: filled[i].trim(),
          sortOrder: i as 0 | 1 | 2,
        });
      }
    } catch {
      // Non-fatal — intentions can be set later from the reflection page
    }
  }, [intentions]);

  // ── AI roadmap suggestions ──────────────────────────────────────
  // Both helpers call the suggest-project-roadmap edge function. They
  // populate the goal/task input rows on success. On failure they leave
  // the rows as-is and surface a small error — the user can still type
  // manually and proceed.

  /** Call the edge function in hierarchical mode and unpack the response.
   *  Two possible outcomes:
   *    1. AI returned milestones → populate state, clear any pending questions.
   *    2. AI returned questions → show the questions card; user answers and
   *       this fn is called again with the clarifications array. */
  const suggestRoadmap = useCallback(async (
    clarifications?: Array<{ question: string; answer: string }>,
  ) => {
    if (suggestingPhases) return;
    setSuggestingPhases(true);
    setAiError(null);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-project-roadmap', {
        body: {
          mode: 'roadmap',
          project: {
            title: projectTitle,
            brain_dump: projectBrainDump || null,
            project_type: projectType,
            started_status: projectStartedStatus,
            initial_completion_pct: projectStartedStatus === 'in_progress' ? projectCompletionPct : null,
            target_date: projectTargetDate || null,
            deadline_flexibility: projectTargetDate ? projectDeadlineFlex : null,
          },
          user_context: {
            work_types: workTypes,
            industries: industries,
            skills: skills,
          },
          ...(clarifications && clarifications.length > 0 ? { clarifications } : {}),
        },
      });
      if (error) {
        // FunctionsError swallows the response body. Try to read .context for
        // the detail message the edge function sent back with the 502.
        const detail = (error as any)?.context?.body
          ? await (error as any).context.text().catch(() => null)
          : null;
        console.error('[suggestRoadmap] edge function error', { error, detail });
        throw new Error(detail ?? error.message ?? 'Unknown error');
      }

      // ── Branch 1: AI is asking for more context ───────────────
      // It returned questions instead of milestones. Stash them and
      // render the inline question form. The user's typed answers feed
      // back through this same function as `clarifications`.
      const rawQuestions: Array<any> = data?.questions ?? [];
      if (rawQuestions.length > 0) {
        const cleaned: AiQuestion[] = rawQuestions
          .filter((q) => q?.question && typeof q.question === 'string')
          .slice(0, 3)
          .map((q, i) => ({
            id: typeof q.id === 'string' ? q.id : `q${i + 1}`,
            question: q.question.trim(),
            max_chars: typeof q.max_chars === 'number'
              ? Math.max(40, Math.min(500, Math.round(q.max_chars)))
              : 200,
            why: typeof q.why === 'string' ? q.why.trim() : undefined,
          }));
        if (cleaned.length > 0) {
          setPendingQuestions(cleaned);
          // Reset previously-typed answers so the form starts fresh.
          setQuestionAnswers({});
          return; // don't fall through to milestone path
        }
      }

      // ── Branch 2: AI returned milestones — populate roadmap ───
      // Reaching this path means we have a usable roadmap; clear any
      // stale question state from a previous round.
      setPendingQuestions(null);
      setQuestionAnswers({});

      type RawPhase = { title?: string; weight_pct?: number; already_done?: boolean };
      type RawMilestone = {
        title?: string;
        weight_pct?: number;
        already_done?: boolean;
        phases?: RawPhase[];
      };
      const raw: RawMilestone[] = data?.milestones ?? [];
      const milestones: MilestoneInput[] = raw
        .filter((m) => m.title && m.title.trim().length > 0)
        .map((m) => {
          // Build phases first so we can fall back to "milestone is just one
          // implicit phase" if the model didn't return any.
          const rawPhases = Array.isArray(m.phases) ? m.phases : [];
          const phases: PhaseInput[] = rawPhases
            .filter((p) => p.title && p.title.trim().length > 0)
            .map((p) => ({
              title: p.title!.trim(),
              weight_pct: typeof p.weight_pct === 'number'
                ? clampPct(p.weight_pct)
                : Math.round(100 / Math.max(rawPhases.length, 1)),
              already_done: Boolean(p.already_done),
            }));
          return {
            title: m.title!.trim(),
            weight_pct: typeof m.weight_pct === 'number'
              ? clampPct(m.weight_pct)
              : Math.round(100 / Math.max(raw.length, 1)),
            already_done: Boolean(m.already_done),
            phases: phases.length > 0
              ? phases
              : [{ title: '', weight_pct: 100, already_done: Boolean(m.already_done) }],
          };
        });

      if (milestones.length > 0) {
        setMilestoneInputs(milestones);
      } else {
        setAiError('No suggestions returned — try filling out a bit more about the project.');
      }
    } catch (e: any) {
      console.error('[suggestRoadmap]', e);
      setAiError('Suggestion service unavailable — fill the roadmap manually.');
    } finally {
      setSuggestingPhases(false);
    }
  }, [suggestingPhases, projectTitle, projectBrainDump, projectType, projectStartedStatus,
      projectCompletionPct, projectTargetDate, projectDeadlineFlex,
      workTypes, industries, skills]);

  const suggestTasks = useCallback(async () => {
    if (suggestingTasks) return;
    setSuggestingTasks(true);
    setAiError(null);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-project-roadmap', {
        body: {
          mode: 'tasks',
          project: {
            title: projectTitle,
            brain_dump: projectBrainDump || null,
            project_type: projectType,
            started_status: projectStartedStatus,
            initial_completion_pct: projectStartedStatus === 'in_progress' ? projectCompletionPct : null,
            target_date: projectTargetDate || null,
            deadline_flexibility: projectTargetDate ? projectDeadlineFlex : null,
          },
          // Flatten across all milestones — the model gets the full list of
          // phase titles so it can pick the first one not yet shipped.
          phases: milestoneInputs
            .flatMap((m) => m.phases.map((p) => p.title))
            .filter((t) => t.trim()),
          user_context: {
            work_types: workTypes,
            industries: industries,
            skills: skills,
          },
        },
      });
      if (error) throw error;
      const tasks: string[] = (data?.tasks ?? []).map((t: any) => t.title).filter(Boolean);
      if (tasks.length > 0) {
        const padded = [...tasks, ...Array(Math.max(0, taskInputs.length - tasks.length)).fill('')];
        setTaskInputs(padded.slice(0, Math.max(tasks.length, 3)));
      } else {
        setAiError('No suggestions returned — try adding tasks manually.');
      }
    } catch (e: any) {
      console.error('[suggestTasks]', e);
      setAiError('Suggestion service unavailable — fill tasks manually.');
    } finally {
      setSuggestingTasks(false);
    }
  }, [suggestingTasks, projectTitle, projectBrainDump, projectType, projectStartedStatus,
      projectCompletionPct, projectTargetDate, projectDeadlineFlex,
      milestoneInputs, workTypes, industries, skills, taskInputs.length]);

  /** Create project + goals + tasks, then stamp wizard complete. */
  const saveProjectAndComplete = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // No-project path: the trimmed onboarding flow skips steps 6-9
    // entirely, so projectTitle is always empty when arriving at done.
    // We just stamp wizard_v2_completed_at and return — no space
    // bootstrap, no project insert, no milestones, no tasks. Saves
    // a round-trip and avoids RLS / NULL-title errors.
    if (!projectTitle.trim()) {
      await supabase.from('profiles').update({
        wizard_v2_completed_at: new Date().toISOString(),
      }).eq('id', user.id);
      return;
    }

    // 0. Make sure the user has a personal space and grab its id.
    //    The projects table requires space_id (not null) and RLS only
    //    permits inserts where the user is a space_member. Bootstrapping
    //    is idempotent: returns the existing personal space if it exists.
    const personalSpace = await SpaceService.bootstrapPersonalSpace(user.id);

    // 1. Create project (incl. the new shape fields)
    const project = await ProjectService.createProject({
      space_id:   personalSpace.id,
      title:      projectTitle.trim(),
      description:projectBrainDump.trim() || null,
      color:      projectColour,
      status:     'active',
      created_by: user.id,
      started_status: projectStartedStatus,
      initial_completion_pct: projectStartedStatus === 'in_progress' ? projectCompletionPct : null,
      project_type: projectType,
      target_date: projectTargetDate || null,
      deadline_flexibility: projectTargetDate ? projectDeadlineFlex : null,
    } as any);

    // 2. Create milestones + their nested phases.
    //    Two passes so we have milestone IDs before creating phases.
    const filledMilestones = milestoneInputs.filter((m) => m.title.trim());
    for (let mi = 0; mi < filledMilestones.length; mi++) {
      const m = filledMilestones[mi];
      const milestone = await ProjectService.createMilestone({
        project_id: project.id,
        title: m.title.trim(),
        weight_pct: m.weight_pct,
        sort_order: mi,
        completed_at: m.already_done ? new Date().toISOString() : null,
      });

      const filledPhases = m.phases.filter((p) => p.title.trim());
      for (let pi = 0; pi < filledPhases.length; pi++) {
        const p = filledPhases[pi];
        await ProjectService.createPhase({
          project_id:   project.id,
          milestone_id: milestone.id,
          title:        p.title.trim(),
          weight_pct:   p.weight_pct,
          sort_order:   pi,
          completed_at: p.already_done ? new Date().toISOString() : null,
        });
      }
    }

    // 3. Create tasks. Schema uses created_by (not user_id) and requires
    //    space_id (NOT NULL) inherited from the project's space.
    const filledTasks = taskInputs.filter((t) => t.trim());
    for (const title of filledTasks) {
      await TaskService.createTask({
        title:      title.trim(),
        space_id:   personalSpace.id,
        project_id: project.id,
        created_by: user.id,
      } as any);
    }

    // 4. Stamp wizard complete — onboarding only. A standalone new-project
    //    run from /projects must not toggle the user's onboarding state.
    if (mode === 'onboarding') {
      await supabase.from('profiles').update({
        wizard_v2_completed_at: new Date().toISOString(),
      }).eq('id', user.id);
    }
    return project;
  }, [mode, projectTitle, projectBrainDump, projectColour, projectStartedStatus,
      projectCompletionPct, projectType, projectTargetDate, projectDeadlineFlex,
      milestoneInputs, taskInputs]);

  // ── Step transitions ───────────────────────────────────────────

  async function advance(to: Step, saveAction?: () => Promise<void>) {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      if (saveAction) await saveAction();
      setStepHistory((h) => [...h, step]);
      setStep(to);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /** Forward navigation without a save (used by project → goals → tasks). */
  function navigateForward(to: Step) {
    if (saving) return;
    setStepHistory((h) => [...h, step]);
    setStep(to);
  }

  function goBack() {
    if (saving || stepHistory.length === 0) return;
    setError(null);
    const previous = stepHistory[stepHistory.length - 1];
    setStepHistory((h) => h.slice(0, -1));
    setStep(previous);
  }

  // Guard so the auto-finalize useEffect below (and a re-render of
  // the celebration screen) don't double-call handleComplete().
  // Reset on error inside handleComplete to allow the Retry link.
  const hasFinalizedRef = useRef(false);

  async function handleComplete() {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      // newProject mode: just create the project (+ milestones/tasks) and hand
      // the id back to the caller. No onboarding stamp, no celebration screen,
      // no app navigation — the parent closes the wizard + routes.
      if (mode === 'newProject') {
        const project = await saveProjectAndComplete();
        if (project) onProjectCreated?.(project.id);
        return;
      }
      // Minimum-dwell so the celebration screen is actually visible —
      // the save + profile refresh together run in ~200–400ms which
      // isn't long enough for the pop, fade-ups, and ambient float to
      // play through. We run the save sequence in parallel with a
      // ~1.8s timer; navigation only happens when BOTH resolve. If
      // the save somehow takes longer than 1.8s, the timer is moot
      // and we wait on the save. The user perceives a deliberate
      // beat where the welcome animation lands, then transitions.
      const MIN_DWELL_MS = 1800;
      await Promise.all([
        (async () => {
          await saveProjectAndComplete();
          await saveIntentionsIfSet();
          await refreshProfile();
        })(),
        new Promise<void>((r) => setTimeout(r, MIN_DWELL_MS)),
      ]);
      onComplete();
    } catch {
      // Allow retry — clear the auto-finalize guard so the Retry
      // link in the celebration screen actually re-runs this path.
      hasFinalizedRef.current = false;
      setError('Something went wrong — please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Auto-finalize when stepping into 'done'. The trimmed onboarding
  // (welcome → … → intentions → done) doesn't have a final form-submit
  // step like the old wizard's 'tasks' page did — so without this
  // effect, advance('done') just lands the user on the celebration
  // screen forever, with no wizard_v2_completed_at stamp + no
  // onComplete() call to navigate them out. The hasFinalizedRef
  // declared above guards against double-fires.
  useEffect(() => {
    if (step !== 'done') return;
    if (hasFinalizedRef.current) return;
    hasFinalizedRef.current = true;
    void handleComplete();
    // handleComplete deps are stable callbacks captured at render
    // time — re-running this effect on its identity change would
    // double-fire the API call, which we explicitly prevent above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Primary button helper ──────────────────────────────────────

  function PrimaryBtn({
    label,
    icon,
    onClick,
    disabled = false,
  }: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || saving}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-all duration-200 mt-6 ${
          !disabled && !saving
            ? 'stitch-btn--primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:scale-[0.98]'
            : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
        }`}
      >
        {saving
          ? <Loader2 size={18} className="animate-spin" />
          : <>{label}{icon ?? <ArrowRight size={18} />}</>
        }
      </button>
    );
  }

  // ── Skill search ────────────────────────────────────────────────
  // When the user types, search across the full master list (not just
  // the tailored subset) so e.g. a founder can find "Brazilian Jiu-Jitsu"
  // or "Pharmacology" without those being in their work-type curation.
  const trimmedQuery = skillQuery.trim();
  const filteredSkills = useMemo(() => {
    if (!trimmedQuery) return null;
    const q = trimmedQuery.toLowerCase();
    return ALL_SKILLS.filter((s) => s.label.toLowerCase().includes(q));
  }, [trimmedQuery]);

  const hasExactMatch = useMemo(() => {
    if (!trimmedQuery) return true;
    const q = trimmedQuery.toLowerCase();
    return ALL_SKILLS.some((s) => s.label.toLowerCase() === q);
  }, [trimmedQuery]);

  function addCustomSkill() {
    const label = trimmedQuery;
    if (!label || skills.includes(label) || skills.length >= 6) return;
    setSkills((cur) => [...cur, label]);
    setSkillQuery('');
  }

  // ── Featured categories (industry-driven) ──────────────────────
  // The skill categories pre-emphasised based on the industries the user
  // picked, used to order/highlight the quick-filter pills and to expand
  // the "Suggested for you" set with industry-relevant skills.
  const featuredCategories = useMemo(() => {
    const out = new Set<SkillCategoryId>();
    for (const ind of industries) {
      for (const cat of INDUSTRY_TO_CATEGORIES[ind] ?? []) {
        out.add(cat);
      }
    }
    return out;
  }, [industries]);

  // ── Suggested skill list ─────────────────────────────────────────
  // The "for you" default view. Built from:
  //  1. Work-type curation (WORK_TYPE_SKILLS — the role-specific top picks).
  //  2. Anything in the featured categories (industry-driven).
  //  3. Already-selected skills (so they remain visible after edits to
  //     work types/industries — otherwise they'd silently disappear).
  // Deduped by label, in that priority order.
  const suggestedSkills = useMemo(() => {
    const sources = workTypes.length > 0 ? workTypes : ['other'];
    const seen = new Set<string>();
    const out: { emoji: string; label: string; category: SkillCategoryId }[] = [];

    // 1. Work-type top picks first
    for (const wt of sources) {
      for (const s of WORK_TYPE_SKILLS[wt] ?? []) {
        if (!seen.has(s.label)) {
          seen.add(s.label);
          // Look up the canonical category from ALL_SKILLS, fall back to 'soft'
          const cat = ALL_SKILLS.find((x) => x.label === s.label)?.category ?? 'soft';
          out.push({ ...s, category: cat });
        }
      }
    }

    // 2. Add a sample from each featured category (industry-driven). Cap
    //    per-category so the suggested list doesn't balloon — the user
    //    can drill in via the category filter for more.
    for (const cat of featuredCategories) {
      const fromCat = ALL_SKILLS.filter((s) => s.category === cat).slice(0, 8);
      for (const s of fromCat) {
        if (!seen.has(s.label)) {
          seen.add(s.label);
          out.push(s);
        }
      }
    }

    // 3. Sticky already-selected
    for (const label of skills) {
      if (!seen.has(label)) {
        seen.add(label);
        const found = ALL_SKILLS.find((x) => x.label === label);
        out.push(found ?? { emoji: '✨', label, category: 'soft' });
      }
    }
    return out;
  }, [workTypes, featuredCategories, skills]);

  // Categories present in the current "Suggested" view — used to choose
  // which category-filter pills are worth showing.
  const suggestedCategoryIds = useMemo(() => {
    const set = new Set<SkillCategoryId>();
    for (const s of suggestedSkills) set.add(s.category);
    // Always include featured (industry) categories even if no suggested
    // skills landed under them yet.
    for (const cat of featuredCategories) set.add(cat);
    return set;
  }, [suggestedSkills, featuredCategories]);

  // ── Renders ────────────────────────────────────────────────────

  // ── 1. Welcome ────────────────────────────────────────────────
  if (step === 'welcome') {
    const bullets = [
      { icon: '👤', text: 'Your profile — who you are and what you do' },
      { icon: '📅', text: 'Your intentions day — when you set weekly goals' },
      { icon: '🎯', text: "Your first project — the macro thing you're working on" },
      { icon: '✅', text: "First tasks — what you'll actually do this week" },
    ];
    return (
      <StepShell step="welcome" canGoBack={false} onBack={goBack}>
        {/* Hero brain — gentle bounce + pulse glow */}
        <div
          className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mb-5 mx-auto"
          style={{
            animation: 'wizPop 500ms cubic-bezier(0.16, 1, 0.3, 1) both, wizPulseGlow 2.4s ease-in-out 600ms infinite',
          }}
        >
          <span className="text-3xl" style={{ animation: 'wizGentleBounce 2.8s ease-in-out infinite' }}>🧠</span>
        </div>

        <h1
          className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 leading-tight text-center"
          style={{ animation: 'wizFadeUp 450ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both' }}
        >
          Welcome to SharedMinds
        </h1>
        <p
          className="text-sm stitch-text-secondary leading-relaxed mb-5 text-center"
          style={{ animation: 'wizFadeUp 450ms cubic-bezier(0.16, 1, 0.3, 1) 180ms both' }}
        >
          Quick setup — about <strong className="stitch-text-primary">4 minutes</strong>, only once.
        </p>

        {/* Bullets, staggered */}
        <div className="space-y-2.5 mb-5">
          {bullets.map(({ icon, text }, i) => (
            <div
              key={text}
              className="flex items-start gap-3 rounded-xl px-3 py-2 bg-surface-container-low/50"
              style={{
                animation: `wizFadeUp 450ms cubic-bezier(0.16, 1, 0.3, 1) ${260 + i * 80}ms both`,
              }}
            >
              <span className="text-base shrink-0 mt-0.5">{icon}</span>
              <p className="text-sm stitch-text-primary font-medium leading-snug">{text}</p>
            </div>
          ))}
        </div>

        {/* "Why no skip" — fades in last */}
        <div
          className="rounded-2xl bg-primary/5 ring-1 ring-primary/10 px-4 py-3 mb-5"
          style={{ animation: 'wizFadeUp 450ms cubic-bezier(0.16, 1, 0.3, 1) 600ms both' }}
        >
          <p className="text-xs stitch-text-secondary leading-relaxed">
            <span className="font-bold stitch-text-primary">Why can't I skip this?</span>{' '}
            If we gave you a skip button, you'd click it — and the home screen would
            be cluttered with setup prompts forever. This is better.
          </p>
        </div>

        <div style={{ animation: 'wizFadeUp 450ms cubic-bezier(0.16, 1, 0.3, 1) 700ms both' }}>
          <PrimaryBtn label="Let's go" onClick={() => navigateForward('profile')} />
        </div>
      </StepShell>
    );
  }

  // ── 2. Profile ────────────────────────────────────────────────
  if (step === 'profile') {
    return (
      <>
        {cropSourceFile && (
          <AvatarCropper
            file={cropSourceFile}
            onConfirm={handleCropConfirm}
            onCancel={() => setCropSourceFile(null)}
          />
        )}
      <StepShell step="profile" canGoBack={stepHistory.length > 0} onBack={goBack}>
        <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-1">
          Your profile
        </h2>
        <p className="text-sm stitch-text-secondary mb-6">
          This is how you appear to other members.
        </p>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group active:scale-95 transition-transform"
          >
            {avatarPreview ? (
              <img
                key={avatarPreview}
                src={avatarPreview}
                alt="Avatar preview"
                className="w-24 h-24 rounded-3xl object-cover ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all"
                style={{ animation: 'wizPop 500ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
              />
            ) : (
              <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${gradFor(name || 'user')} flex items-center justify-center text-white text-3xl font-extrabold ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all`}>
                {name ? name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md group-hover:scale-110 group-active:scale-95 transition-transform">
              <Camera size={14} className="text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <p className="text-center text-[11px] stitch-text-secondary mb-6">
          Tap to add a photo · optional, add later if you prefer
        </p>

        {/* Name */}
        <div className="mb-4">
          <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
            Your name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should we call you?"
            maxLength={50}
            autoFocus
            className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low stitch-text-primary text-base font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
            One line about your work
          </label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. Building a SaaS for indie filmmakers"
            maxLength={120}
            className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Work types */}
        <div className="mb-2">
          <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-3">
            What kind of work do you do? * <span className="normal-case font-normal">(pick up to 3)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {WORK_TYPES.map((wt, i) => {
              const selected = workTypes.includes(wt.id);
              const disabled = !selected && workTypes.length >= 3;
              return (
                <button
                  key={wt.id}
                  type="button"
                  onClick={() => toggleWorkType(wt.id)}
                  disabled={disabled}
                  style={{
                    animation: `wizFadeUp 400ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 35}ms both`,
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-sm font-bold transition-all duration-200 active:scale-[0.95] hover:scale-[1.02] ${
                    selected
                      ? 'stitch-btn--primary text-white shadow-md shadow-primary/30 scale-[1.02]'
                      : disabled
                      ? 'bg-surface-container-low stitch-text-secondary opacity-40 cursor-not-allowed'
                      : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                  } ${wt.id === 'other' ? 'col-span-2' : ''}`}
                >
                  <span className={`text-base transition-transform ${selected ? 'scale-110' : ''}`}>{wt.emoji}</span>
                  <span className="truncate">{wt.label}</span>
                  {selected && (
                    <Check size={14} className="ml-auto shrink-0" style={{ animation: 'wizPop 280ms cubic-bezier(0.16, 1, 0.3, 1) both' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>}

        <PrimaryBtn
          label="Next"
          disabled={!name.trim() || workTypes.length === 0}
          onClick={() => advance('industries', saveProfile)}
        />
      </StepShell>
      </>
    );
  }

  // ── 3. Industries ─────────────────────────────────────────────
  if (step === 'industries') {
    return (
      <StepShell step="industries" canGoBack={stepHistory.length > 0} onBack={goBack}>
        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center mb-4">
          <Target size={18} className="text-cyan-600" />
        </div>
        <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
          What industry are you in?
        </h2>
        <p className="text-sm stitch-text-secondary mb-6">
          Pick up to 3. This helps us suggest the right skills next —
          a founder in healthcare and a founder in gaming need very
          different things.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {INDUSTRIES.map((ind, i) => {
            const selected = industries.includes(ind.id);
            const disabled = !selected && industries.length >= 3;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => toggleIndustry(ind.id)}
                disabled={disabled}
                style={{
                  animation: `wizFadeUp 400ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 30}ms both`,
                }}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-sm font-bold transition-all duration-200 active:scale-[0.95] hover:scale-[1.02] ${
                  selected
                    ? 'stitch-btn--primary text-white shadow-md shadow-primary/30 scale-[1.02]'
                    : disabled
                    ? 'bg-surface-container-low stitch-text-secondary opacity-40 cursor-not-allowed'
                    : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                } ${ind.id === 'other_industry' ? 'col-span-2' : ''}`}
              >
                <span className={`text-base transition-transform ${selected ? 'scale-110' : ''}`}>{ind.emoji}</span>
                <span className="truncate">{ind.label}</span>
                {selected && (
                  <Check size={14} className="ml-auto shrink-0" style={{ animation: 'wizPop 280ms cubic-bezier(0.16, 1, 0.3, 1) both' }} />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] stitch-text-secondary text-center mt-3 tabular-nums">
          {industries.length}/3 selected
        </p>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>}

        <PrimaryBtn
          label={industries.length > 0 ? 'Next' : 'Skip for now'}
          onClick={() => advance('skills', saveIndustries)}
        />
      </StepShell>
    );
  }

  // ── 4. Skills ─────────────────────────────────────────────────
  if (step === 'skills') {
    return (
      <StepShell step="skills" canGoBack={stepHistory.length > 0} onBack={goBack}>
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
          <Sparkles size={18} className="text-violet-600" />
        </div>
        <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
          What are you working with?
        </h2>
        <p className="text-sm stitch-text-secondary mb-4">
          Pick up to 6. Browse by category, search, or add your own.
        </p>

        {/* ── Search input ────────────────────────────── */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 stitch-text-secondary pointer-events-none" />
          <input
            type="text"
            value={skillQuery}
            onChange={(e) => {
              setSkillQuery(e.target.value);
              if (e.target.value.trim()) setSkillCategoryFilter(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trimmedQuery && !hasExactMatch && skills.length < 6) {
                e.preventDefault();
                addCustomSkill();
              }
            }}
            placeholder={`Search ${ALL_SKILLS.length}+ skills or add your own…`}
            className="w-full pl-10 pr-9 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {skillQuery && (
            <button
              type="button"
              onClick={() => setSkillQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors"
              aria-label="Clear search"
            >
              <X size={12} className="stitch-text-secondary" />
            </button>
          )}
        </div>

        {/* ── Category quick filters (hidden when searching) ── */}
        {!trimmedQuery && (() => {
          // Order: "Suggested" pill first, then featured-industry categories,
          // then any other category that has skills available. Categories
          // already in featuredCategories are highlighted.
          const orderedCategoryIds: SkillCategoryId[] = [
            ...Array.from(featuredCategories),
            ...(Object.keys(SKILL_CATEGORIES) as SkillCategoryId[])
              .filter((id) => !featuredCategories.has(id)),
          ];
          return (
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-2 mb-3 snap-x">
              <button
                type="button"
                onClick={() => setSkillCategoryFilter(null)}
                className={`snap-start shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                  skillCategoryFilter === null
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                }`}
              >
                <Sparkles size={11} />
                Suggested
              </button>
              {orderedCategoryIds.map((catId) => {
                const cat = SKILL_CATEGORIES[catId];
                const active = skillCategoryFilter === catId;
                const isFeatured = featuredCategories.has(catId);
                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => setSkillCategoryFilter(active ? null : catId)}
                    className={`snap-start shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                      active
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : isFeatured
                        ? 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                        : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* ── Selected chips — sticky reminder ── */}
        {skills.length > 0 && (
          <div className="mb-4 rounded-xl bg-primary/5 ring-1 ring-primary/10 px-3 py-2.5">
            <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
              Selected ({skills.length}/6)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSkills((cur) => cur.filter((s) => s !== label))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-white text-xs font-semibold transition-all active:scale-95 hover:bg-primary/90"
                  style={{ animation: 'wizPop 280ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
                >
                  {label}
                  <X size={11} strokeWidth={3} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Chip grid ─────────────────────────────────
             Three modes:
             1. Search query active → show filtered results across the whole list
             2. Category filter active → show all skills in that category
             3. Default → show "Suggested for you" (tailored)            */}
        {(() => {
          let chips: { emoji: string; label: string; category?: SkillCategoryId }[];
          let label = '';

          if (filteredSkills !== null) {
            chips = filteredSkills;
            label = `${filteredSkills.length} match${filteredSkills.length !== 1 ? 'es' : ''}`;
          } else if (skillCategoryFilter) {
            chips = ALL_SKILLS.filter((s) => s.category === skillCategoryFilter);
            label = SKILL_CATEGORIES[skillCategoryFilter].label;
          } else {
            chips = suggestedSkills;
            label = 'Suggested for you';
          }

          return (
            <>
              {chips.length > 0 && (
                <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
                  {label}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-4">
                {chips.map(({ emoji, label: chipLabel }, i) => {
                  const selected = skills.includes(chipLabel);
                  const disabled = !selected && skills.length >= 6;
                  return (
                    <button
                      key={chipLabel}
                      type="button"
                      onClick={() => toggleSkill(chipLabel)}
                      disabled={disabled}
                      style={{ animation: `wizFadeUp 250ms cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, 14) * 16}ms both` }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-[0.92] hover:scale-105 ${
                        selected
                          ? 'bg-primary text-white shadow-sm shadow-primary/40 scale-105'
                          : disabled
                          ? 'bg-surface-container-low stitch-text-secondary opacity-40 cursor-not-allowed'
                          : 'bg-surface-container stitch-text-primary hover:bg-surface-container-high'
                      }`}
                    >
                      <span className={`transition-transform ${selected ? 'rotate-12' : ''}`}>{emoji}</span>
                      {chipLabel}
                    </button>
                  );
                })}
              </div>

              {/* Custom add — only relevant when searching */}
              {filteredSkills !== null && trimmedQuery.length >= 2 && !hasExactMatch && skills.length < 6 && (
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-semibold transition-all active:scale-[0.98] mb-2"
                  style={{ animation: 'wizFadeUp 250ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
                >
                  <Plus size={14} strokeWidth={3} />
                  Add "<span className="font-bold">{trimmedQuery}</span>" as a custom skill
                </button>
              )}

              {chips.length === 0 && (
                <p className="text-sm stitch-text-secondary text-center py-6">
                  No matching skills.
                </p>
              )}
            </>
          );
        })()}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-2">{error}</p>}

        <PrimaryBtn
          label={skills.length > 0 ? 'Looks good' : 'Skip for now'}
          onClick={() => advance('intentions', saveSkills)}
        />
      </StepShell>
    );
  }

  // ── 4. Intentions day ─────────────────────────────────────────
  if (step === 'intentions') {
    return (
      <StepShell step="intentions" canGoBack={stepHistory.length > 0} onBack={goBack}>
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
          <Calendar size={18} className="text-blue-600" />
        </div>
        <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
          When do you set your weekly intentions?
        </h2>
        <p className="text-sm stitch-text-secondary mb-6">
          Once a week you'll set 3 things you want to accomplish.
          Pick the day that works best for you.
        </p>

        <div className="space-y-2.5">
          {INTENTION_DAYS.map(({ day, label, note }, i) => {
            const selected = intentionsDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setIntentionsDay(day)}
                style={{
                  animation: `wizFadeUp 400ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms both`,
                }}
                className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-200 active:scale-[0.98] hover:scale-[1.01] ${
                  selected
                    ? 'stitch-btn--primary text-white shadow-md shadow-primary/30 scale-[1.01]'
                    : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                  selected ? 'border-white bg-white/30' : 'border-surface-container-high'
                }`}>
                  {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">
                    {label}
                    {day === 1 && (
                      <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        selected ? 'bg-white/20' : 'bg-primary/10 text-primary'
                      }`}>
                        ★ recommended
                      </span>
                    )}
                  </p>
                  <p className={`text-xs mt-0.5 ${selected ? 'text-white/70' : 'stitch-text-secondary'}`}>
                    {note}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>}

        <PrimaryBtn
          label="Next"
          onClick={() => {
            // After picking the intentions day, branch only on whether
            // today IS that day (→ set_intentions to fill them in now)
            // or not (→ jump straight to done). Project setup has been
            // moved out of onboarding — see COUNTED_STEPS comment.
            const nextStep: Step =
              todayDayOfWeek() === intentionsDay ? 'set_intentions' : 'done';
            advance(nextStep, saveIntentionsDay);
          }}
        />
      </StepShell>
    );
  }

  // ── 5. Set this week's intentions (conditional) ───────────────
  if (step === 'set_intentions') {
    const filledCount = intentions.filter((s) => s.trim()).length;
    return (
      <StepShell step="set_intentions" canGoBack={stepHistory.length > 0} onBack={goBack}>
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
          <Target size={18} className="text-emerald-600" />
        </div>
        <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
          Today's your intention day — perfect timing
        </h2>
        <p className="text-sm stitch-text-secondary mb-2">
          Set up to 3 things you want to accomplish this week.
          One sentence each — no essays.
        </p>
        <p className="text-xs text-primary font-semibold mb-6">
          Three is the cap. The constraint is the point.
        </p>

        <div className="space-y-3">
          {intentions.map((val, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
              style={{ animation: `wizFadeUp 400ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms both` }}
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <input
                type="text"
                value={val}
                onChange={(e) => updateIntention(i, e.target.value)}
                placeholder={[
                  'e.g. Ship the landing page',
                  'e.g. Finish the client proposal',
                  'e.g. Record the first podcast episode',
                ][i]}
                maxLength={120}
                className="flex-1 px-3.5 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>}

        <PrimaryBtn
          label={filledCount > 0 ? `Set ${filledCount} intention${filledCount !== 1 ? 's' : ''}` : 'Skip for now'}
          onClick={() => advance('done')}
        />
      </StepShell>
    );
  }

  // ── 6. First project ──────────────────────────────────────────
  if (step === 'project') {
    return (
      <StepShell step="project" canGoBack={stepHistory.length > 0} onBack={goBack} onClose={mode === 'newProject' ? onComplete : undefined}>
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
          <Target size={18} className="text-amber-600" />
        </div>
        <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
          What's the big thing you're working on?
        </h2>
        <p className="text-sm stitch-text-secondary mb-6">
          A project is the macro goal your focus sessions are chipping at.
          Could be a product, a client, a creative work — anything with an end state.
        </p>

        {/* Title */}
        <div className="mb-4">
          <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
            Project name *
          </label>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="e.g. Pitch deck v1, Film script, iOS app beta"
            maxLength={80}
            autoFocus
            className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low stitch-text-primary text-base font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Brain dump — rich context the AI uses on later steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
              Brain dump <span className="lowercase font-normal">(optional)</span>
            </label>
            <span className={`text-[10px] font-medium tabular-nums ${
              projectBrainDump.length > 2700 ? 'text-amber-600' : 'stitch-text-secondary'
            }`}>
              {projectBrainDump.trim().split(/\s+/).filter(Boolean).length} / ~500 words
            </span>
          </div>
          <textarea
            value={projectBrainDump}
            onChange={(e) => setProjectBrainDump(e.target.value)}
            placeholder={
              'Dump everything you know about this project — what it is, who it\'s for, ' +
              'why now, what it could become. The more context here, the better the AI ' +
              'can suggest phases later.\n\nDon\'t worry about polish — this is for your eyes only.'
            }
            maxLength={3000}
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm leading-relaxed placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-y min-h-[140px]"
          />
          <p className="text-[11px] stitch-text-secondary mt-1.5">
            On the next steps, AI uses this to scaffold phases and tasks tailored to your project.
          </p>

          {/* ── "Use your own AI" prompt helper ────────────────────
              For users who already have rich context in ChatGPT/Claude
              about this project — they paste this prompt into their
              existing chat, get a summary back, and paste that above. */}
          <div className="mt-3">
            {!showAiPromptHelper ? (
              <button
                type="button"
                onClick={() => setShowAiPromptHelper(true)}
                className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity inline-flex items-center gap-1.5"
              >
                <Sparkles size={12} />
                Already using an AI assistant for this? Get it to draft this for you
              </button>
            ) : (
              <div
                className="rounded-xl bg-violet-50 ring-1 ring-violet-200 p-3"
                style={{ animation: 'wizFadeUp 300ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-violet-600 shrink-0" />
                    <p className="text-xs font-bold text-violet-900">
                      Use your AI's existing context
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiPromptHelper(false)}
                    className="shrink-0 w-5 h-5 rounded-full hover:bg-violet-100 flex items-center justify-center transition-colors"
                    aria-label="Close"
                  >
                    <X size={11} className="text-violet-700" />
                  </button>
                </div>
                <ol className="text-[11px] text-violet-900 leading-relaxed list-decimal pl-4 space-y-0.5 mb-2.5">
                  <li>Copy the prompt below</li>
                  <li>Paste it into your AI chat — wherever you're already talking about this project</li>
                  <li>Paste the reply into the brain dump above</li>
                </ol>
                <div className="rounded-lg bg-white border border-violet-200 p-2.5 max-h-32 overflow-y-auto mb-2">
                  <pre className="text-[10.5px] leading-snug text-slate-700 whitespace-pre-wrap font-mono">
                    {buildBrainDumpPrompt(projectTitle)}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={copyBrainDumpPrompt}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ${
                    promptCopied
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-500/30'
                  }`}
                >
                  {promptCopied
                    ? <><Check size={12} strokeWidth={3} /> Copied — paste into your AI</>
                    : <><Sparkles size={12} /> Copy prompt</>
                  }
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Colour */}
        <div>
          <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-3">
            Colour
          </label>
          <div className="flex gap-3">
            {PROJECT_COLOURS.map(({ token, hex, label }, i) => {
              const selected = projectColour === token;
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => setProjectColour(token)}
                  title={label}
                  style={{
                    backgroundColor: hex,
                    boxShadow: selected ? `0 0 0 3px var(--surface, white), 0 0 0 6px ${hex}` : undefined,
                    animation: `wizPop 400ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 50}ms both`,
                  }}
                  className={`w-10 h-10 rounded-full transition-all duration-200 active:scale-90 hover:scale-110 ${
                    selected ? 'scale-110' : ''
                  }`}
                />
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>}

        <PrimaryBtn
          label="Next"
          disabled={!projectTitle.trim()}
          onClick={() => navigateForward('project_shape')}
        />
      </StepShell>
    );
  }

  // ── 7. Project shape ──────────────────────────────────────────
  // The "tell us about this project" step. Drives the AI roadmap
  // generator on the next two steps so phases/tasks are relevant to
  // the actual shape of the work — not generic boilerplate.
  if (step === 'project_shape') {
    const today = new Date().toISOString().slice(0, 10);
    return (
      <StepShell step="project_shape" canGoBack={stepHistory.length > 0} onBack={goBack} onClose={mode === 'newProject' ? onComplete : undefined}>
        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center mb-4">
          <Briefcase size={18} className="text-cyan-600" />
        </div>
        <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
          Tell us about this project
        </h2>
        <p className="text-sm stitch-text-secondary mb-6">
          Quick context so we suggest the right phases — a brand-new pitch
          deck and a half-finished film script need different scaffolds.
        </p>

        {/* ── Status ── */}
        <div className="mb-5">
          <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'new',         emoji: '🌱', label: 'Brand new' },
              { id: 'in_progress', emoji: '⚡', label: 'Already started' },
            ] as const).map(({ id, emoji, label }) => {
              const selected = projectStartedStatus === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setProjectStartedStatus(id)}
                  className={`flex items-center gap-2 px-3.5 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${
                    selected
                      ? 'stitch-btn--primary text-white shadow-md shadow-primary/30'
                      : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                  }`}
                >
                  <span className="text-base">{emoji}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Completion (only if in progress) ── */}
        {projectStartedStatus === 'in_progress' && (
          <div className="mb-5" style={{ animation: 'wizFadeUp 350ms cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
                Current progress
              </label>
              <span className="text-sm font-bold text-primary tabular-nums">
                {projectCompletionPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={projectCompletionPct}
              onChange={(e) => setProjectCompletionPct(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        )}

        {/* ── Project type ── */}
        <div className="mb-5">
          <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
            Project type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'passion',    emoji: '🎨', label: 'Passion project' },
              { id: 'creative',   emoji: '✨', label: 'Creative work' },
              { id: 'startup',    emoji: '🚀', label: 'Startup / company' },
              { id: 'client',     emoji: '👤', label: 'Client work' },
              { id: 'freelance',  emoji: '🤝', label: 'Freelance' },
              { id: 'employment', emoji: '💼', label: 'Employment' },
              { id: 'learning',   emoji: '🎓', label: 'Learning / skill' },
              { id: 'personal',   emoji: '🌱', label: 'Personal goal' },
            ] as const).map(({ id, emoji, label }) => {
              const selected = projectType === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setProjectType(selected ? null : id)}
                  className={`flex items-center gap-2 px-3.5 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${
                    selected
                      ? 'stitch-btn--primary text-white shadow-md shadow-primary/30'
                      : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                  }`}
                >
                  <span className="text-base">{emoji}</span>
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Target date ── */}
        <div className="mb-5">
          <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
            Target completion (optional)
          </label>
          <input
            type="date"
            value={projectTargetDate}
            min={today}
            onChange={(e) => setProjectTargetDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* ── Deadline flexibility (only if target date set) ── */}
        {projectTargetDate && (
          <div className="mb-2" style={{ animation: 'wizFadeUp 350ms cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase block mb-2">
              How fixed is that date?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'fixed',    emoji: '🔒', label: 'Fixed' },
                { id: 'flexible', emoji: '🌊', label: 'Flexible' },
                { id: 'none',     emoji: '🌀', label: 'No real deadline' },
              ] as const).map(({ id, emoji, label }) => {
                const selected = projectDeadlineFlex === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setProjectDeadlineFlex(id)}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] ${
                      selected
                        ? 'stitch-btn--primary text-white shadow-md shadow-primary/30'
                        : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                    }`}
                  >
                    <span className="text-base">{emoji}</span>
                    <span className="text-[11px]">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>}

        <PrimaryBtn
          label="Next"
          onClick={() => navigateForward('goals')}
        />
      </StepShell>
    );
  }

  // ── 8. Roadmap — milestones with nested phases ────────────────
  if (step === 'goals') {
    const filledMilestones = milestoneInputs.filter((m) => m.title.trim());

    // Milestone weights should sum to ~100 across the whole project.
    const milestoneWeightSum = filledMilestones.reduce((s, m) => s + m.weight_pct, 0);

    // Per-milestone done %: sum of done phase weights / sum of phase weights
    // (or 100 if `already_done` toggled at the milestone level with no phases).
    const milestoneDonePct = (m: MilestoneInput): number => {
      const filledPhases = m.phases.filter((p) => p.title.trim());
      if (filledPhases.length === 0) return m.already_done ? 100 : 0;
      const phaseWeightSum = filledPhases.reduce((s, p) => s + p.weight_pct, 0);
      if (phaseWeightSum === 0) return m.already_done ? 100 : 0;
      const doneWeightSum = filledPhases
        .filter((p) => p.already_done)
        .reduce((s, p) => s + p.weight_pct, 0);
      return Math.round((doneWeightSum / phaseWeightSum) * 100);
    };

    // Project completion = Σ (milestone_weight × milestone_done / 100)
    const projectDonePct = filledMilestones.reduce(
      (s, m) => s + (m.weight_pct * milestoneDonePct(m)) / 100,
      0,
    );
    const projectDoneRounded = Math.round(projectDonePct);

    const gutEstimate = projectStartedStatus === 'in_progress' ? projectCompletionPct : 0;
    const gutDelta = filledMilestones.length > 0 ? Math.abs(projectDoneRounded - gutEstimate) : 0;

    return (
      <StepShell step="goals" canGoBack={stepHistory.length > 0} onBack={goBack} onClose={mode === 'newProject' ? onComplete : undefined}>
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
          <Flag size={18} className="text-violet-600" />
        </div>
        <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
          Roadmap to done
        </h2>
        <p className="text-sm stitch-text-secondary mb-4">
          <strong>Milestones</strong> are your destinations (Beta launch · 100 users · …).
          <strong> Phases</strong> are the work between them. Tick what you've already shipped —
          the number below becomes your true progress.
        </p>

        {/* ── AI Suggest button ── */}
        <button
          type="button"
          onClick={() => suggestRoadmap()}
          disabled={suggestingPhases || !projectTitle.trim()}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] mb-4 ${
            suggestingPhases
              ? 'bg-violet-100 text-violet-700 cursor-wait'
              : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30 hover:-translate-y-0.5'
          }`}
        >
          {suggestingPhases
            ? <><Loader2 size={16} className="animate-spin" /> Thinking…</>
            : <><Wand2 size={14} /> Suggest milestones + phases</>
          }
        </button>

        {/* ── Use your own AI ────────────────────────────────────
            Available from the start: hand the project to an assistant that
            already knows it to WRITE the whole roadmap — or, once there's a
            draft, to sanity-check it — then paste the result straight back. */}
        {projectTitle.trim() && (() => {
          const hasDraft = milestoneInputs.some((m) => m.title.trim());
          return (
          <div className="mb-4">
            {!showRoadmapHelper ? (
              <button
                type="button"
                onClick={() => { setShowRoadmapHelper(true); setRoadmapApplyMsg(null); }}
                className="text-xs font-semibold text-violet-700 hover:opacity-70 transition-opacity inline-flex items-center gap-1.5"
              >
                <Sparkles size={12} />
                {hasDraft
                  ? 'Want a second opinion? Get your own AI to sanity-check this roadmap'
                  : 'Prefer your own AI? Get it to write the whole roadmap, paste it back'}
              </button>
            ) : (
              <div
                className="rounded-xl bg-violet-50 ring-1 ring-violet-200 p-3"
                style={{ animation: 'wizFadeUp 300ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-violet-600 shrink-0" />
                    <p className="text-xs font-bold text-violet-900">
                      {hasDraft ? 'Validate with your AI' : 'Write it with your AI'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRoadmapHelper(false)}
                    className="shrink-0 w-5 h-5 rounded-full hover:bg-violet-100 flex items-center justify-center transition-colors"
                    aria-label="Close"
                  >
                    <X size={11} className="text-violet-700" />
                  </button>
                </div>
                <ol className="text-[11px] text-violet-900 leading-relaxed list-decimal pl-4 space-y-0.5 mb-2.5">
                  <li>{hasDraft ? 'Copy the prompt — it bundles your project + this draft roadmap' : 'Copy the prompt — it bundles your project context'}</li>
                  <li>Paste it into your AI chat (the one that knows this project)</li>
                  <li>Paste the roadmap it returns back below and Apply</li>
                </ol>
                <div className="rounded-lg bg-white border border-violet-200 p-2.5 max-h-32 overflow-y-auto mb-2">
                  <pre className="text-[10.5px] leading-snug text-slate-700 whitespace-pre-wrap font-mono">
                    {buildRoadmapValidationPrompt({ projectName: projectTitle, brainDump: projectBrainDump, milestones: milestoneInputs, startedStatus: projectStartedStatus, completionPct: projectStartedStatus === 'in_progress' ? projectCompletionPct : null })}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={copyRoadmapPrompt}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-[0.97] mb-2.5 ${
                    roadmapPromptCopied
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-500/30'
                  }`}
                >
                  {roadmapPromptCopied
                    ? <><Check size={12} strokeWidth={3} /> Copied — paste into your AI</>
                    : <><Sparkles size={12} /> Copy prompt</>
                  }
                </button>

                <textarea
                  value={roadmapReply}
                  onChange={(e) => { setRoadmapReply(e.target.value); setRoadmapApplyMsg(null); }}
                  placeholder={"Paste your AI's reply here (the M: / P: lines)…"}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-violet-200 text-[12px] leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-400/30 resize-y mb-2"
                />
                <button
                  type="button"
                  onClick={applyRoadmapReply}
                  disabled={!roadmapReply.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-violet-100 text-violet-800 hover:bg-violet-200 transition-colors disabled:opacity-40"
                >
                  <Wand2 size={12} /> Apply to roadmap
                </button>
              </div>
            )}
            {roadmapApplyMsg && (
              <p className="text-[11px] font-semibold text-violet-700 mt-1.5">{roadmapApplyMsg}</p>
            )}
          </div>
          );
        })()}

        {aiError && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
            {aiError}
          </p>
        )}

        {/* ── AI clarifying questions card ─────────────────────
            Shown when the AI thinks it needs more context before
            generating a roadmap. Each question is character-limited;
            the submit button feeds the answers back as `clarifications`
            on the next call, which forces the AI to produce milestones. */}
        {pendingQuestions && pendingQuestions.length > 0 && (
          <div
            className="mb-4 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-200 p-4"
            style={{ animation: 'wizFadeUp 350ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <div className="flex items-start gap-2 mb-3">
              <Sparkles size={14} className="text-violet-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-violet-900 mb-0.5">
                  A few quick questions before I build the roadmap
                </p>
                <p className="text-[11px] text-violet-700/80 leading-snug">
                  I'd rather ask than guess. Answer what you can — leave anything tricky blank.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPendingQuestions(null); setQuestionAnswers({}); }}
                className="shrink-0 w-6 h-6 rounded-full hover:bg-violet-100 flex items-center justify-center transition-colors"
                aria-label="Dismiss questions"
              >
                <X size={11} className="text-violet-700" />
              </button>
            </div>

            <div className="space-y-3">
              {pendingQuestions.map((q, i) => {
                const value = questionAnswers[q.id] ?? '';
                const overLimit = value.length > q.max_chars;
                return (
                  <div key={q.id} style={{ animation: `wizFadeUp 280ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms both` }}>
                    <label className="text-[11px] font-semibold text-violet-900 block mb-1 leading-snug">
                      {q.question}
                    </label>
                    <textarea
                      value={value}
                      onChange={(e) => setQuestionAnswers((cur) => ({ ...cur, [q.id]: e.target.value }))}
                      rows={2}
                      maxLength={q.max_chars}
                      placeholder="Your answer…"
                      className="w-full px-3 py-2 rounded-lg bg-white text-xs stitch-text-primary placeholder:stitch-text-secondary border border-violet-200 focus:border-violet-400 outline-none focus:ring-2 focus:ring-violet-200 transition-all resize-none"
                    />
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-violet-700/70 italic">
                        {q.why ?? ' '}
                      </span>
                      <span className={`tabular-nums font-medium ${
                        overLimit ? 'text-rose-600' : value.length > q.max_chars * 0.85 ? 'text-amber-600' : 'text-violet-700/70'
                      }`}>
                        {value.length}/{q.max_chars}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const clarifications = pendingQuestions
                  .map((q) => ({ question: q.question, answer: (questionAnswers[q.id] ?? '').trim() }))
                  .filter((c) => c.answer.length > 0);
                if (clarifications.length === 0) {
                  setAiError('Please answer at least one question before generating.');
                  return;
                }
                suggestRoadmap(clarifications);
              }}
              disabled={suggestingPhases}
              className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                suggestingPhases
                  ? 'bg-violet-100 text-violet-700 cursor-wait'
                  : 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-500/30'
              }`}
            >
              {suggestingPhases
                ? <><Loader2 size={14} className="animate-spin" /> Building roadmap…</>
                : <><Wand2 size={12} /> Generate roadmap with my answers</>
              }
            </button>
          </div>
        )}

        {/* ── Milestone list ─────────────────────────────────── */}
        <div className="space-y-3">
          {milestoneInputs.map((m, mi) => {
            const mDone = milestoneDonePct(m);
            const mAllPhasesDone = mDone >= 100;
            const phaseWeightSum = m.phases
              .filter((p) => p.title.trim())
              .reduce((s, p) => s + p.weight_pct, 0);
            return (
              <div
                key={mi}
                className={`rounded-2xl p-3 transition-all ${
                  mAllPhasesDone || m.already_done
                    ? 'bg-emerald-50 ring-1 ring-emerald-300'
                    : 'bg-violet-50/50 ring-1 ring-violet-200'
                }`}
                style={{ animation: `wizFadeUp 350ms cubic-bezier(0.16, 1, 0.3, 1) ${mi * 80}ms both` }}
              >
                {/* Milestone header */}
                <div className="flex items-center gap-2">
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                    mAllPhasesDone || m.already_done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-violet-500 text-white'
                  }`}>
                    M{mi + 1}
                  </div>
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => updateMilestone(mi, { title: e.target.value })}
                    placeholder={[
                      'e.g. Beta launch',
                      'e.g. Public launch',
                      'e.g. 100 active users',
                      'e.g. 100 paying users',
                      'e.g. Feature complete',
                      'e.g. Sustainable revenue',
                    ][mi] ?? `Milestone ${mi + 1}`}
                    maxLength={80}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
                      mAllPhasesDone || m.already_done
                        ? 'bg-white/60 stitch-text-primary line-through opacity-80'
                        : 'bg-white stitch-text-primary'
                    }`}
                  />
                  {milestoneInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestoneRow(mi)}
                      className="shrink-0 w-7 h-7 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition-colors"
                      aria-label="Remove milestone"
                    >
                      <X size={12} className="stitch-text-secondary" />
                    </button>
                  )}
                </div>

                {/* Milestone weight + done toggle */}
                <div className="flex items-center gap-3 mt-2 ml-9">
                  <span className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider w-14">
                    of project
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={m.weight_pct}
                    onChange={(e) => updateMilestone(mi, { weight_pct: clampPct(Number(e.target.value)) })}
                    className="flex-1 accent-violet-600 h-1"
                  />
                  <span className="text-[11px] font-bold tabular-nums w-9 text-right text-violet-700">
                    {m.weight_pct}%
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleMilestoneDone(mi)}
                    title="Mark the whole milestone as done"
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                      m.already_done
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                        : 'bg-white/70 stitch-text-secondary hover:bg-white'
                    }`}
                  >
                    {m.already_done ? <><Check size={10} strokeWidth={3} /> Hit</> : 'Hit?'}
                  </button>
                </div>

                {/* Phases nested under the milestone */}
                <div className="mt-2.5 ml-3 space-y-1.5 border-l-2 border-violet-200 pl-3">
                  {m.phases.map((p, pi) => (
                    <div
                      key={pi}
                      className={`rounded-lg p-2 transition-all ${
                        p.already_done
                          ? 'bg-emerald-100/60'
                          : 'bg-white/70'
                      }`}
                    >
                      {/* Phase title */}
                      <div className="flex items-center gap-2">
                        <Flag size={12} className={`shrink-0 ${p.already_done ? 'text-emerald-500' : 'text-violet-400'}`} />
                        <input
                          type="text"
                          value={p.title}
                          onChange={(e) => updatePhase(mi, pi, { title: e.target.value })}
                          placeholder={`Phase ${pi + 1}`}
                          maxLength={120}
                          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium placeholder:stitch-text-secondary bg-transparent border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
                            p.already_done ? 'line-through opacity-80' : ''
                          }`}
                        />
                        {m.phases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePhaseRow(mi, pi)}
                            className="shrink-0 w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors"
                            aria-label="Remove phase"
                          >
                            <X size={11} className="stitch-text-secondary" />
                          </button>
                        )}
                      </div>

                      {/* Phase weight + done */}
                      <div className="flex items-center gap-2 mt-1 ml-4">
                        <span className="text-[9px] font-bold stitch-text-secondary uppercase tracking-wider w-12">
                          of milestone
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={p.weight_pct}
                          onChange={(e) => updatePhase(mi, pi, { weight_pct: clampPct(Number(e.target.value)) })}
                          className="flex-1 accent-violet-400 h-1"
                        />
                        <span className="text-[10px] font-bold tabular-nums w-8 text-right text-violet-600">
                          {p.weight_pct}%
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePhaseDone(mi, pi)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                            p.already_done
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-surface-container stitch-text-secondary hover:bg-surface-container-high'
                          }`}
                        >
                          {p.already_done ? <><Check size={8} strokeWidth={3} /> Done</> : 'Mark'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {m.phases.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addPhaseRow(mi)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:opacity-70 transition-opacity pl-1"
                    >
                      <Plus size={11} /> Add phase
                    </button>
                  )}
                </div>

                {/* Per-milestone progress + weight-sum hint */}
                <div className="flex items-center justify-between mt-2.5 ml-9 text-[10px]">
                  <span className={`stitch-text-secondary ${phaseWeightSum !== 100 && m.phases.some((p) => p.title.trim()) ? 'text-amber-700 font-semibold' : ''}`}>
                    Phase weights: {phaseWeightSum}%
                    {phaseWeightSum !== 100 && m.phases.some((p) => p.title.trim()) && ' — aim for 100'}
                  </span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    {mDone}% to milestone
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {milestoneInputs.length < 6 && (
          <button
            type="button"
            onClick={addMilestoneRow}
            className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            <Plus size={14} /> Add another milestone
          </button>
        )}

        {/* ── Live project-completion summary ── */}
        {filledMilestones.length > 0 && (
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-violet-50 ring-1 ring-violet-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
                Real progress
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                {projectDoneRounded}<span className="text-sm stitch-text-secondary">%</span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/70 overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                style={{ width: `${Math.min(100, projectDoneRounded)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className={`stitch-text-secondary ${milestoneWeightSum !== 100 ? 'text-amber-700 font-semibold' : ''}`}>
                Milestone weights sum to {milestoneWeightSum}%
                {milestoneWeightSum !== 100 && ' — aim for 100'}
              </span>
              {projectStartedStatus === 'in_progress' && gutDelta >= 15 && (
                <span className="text-amber-700 font-semibold">
                  Gut said {gutEstimate}%
                </span>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>}

        <PrimaryBtn
          label={filledMilestones.length > 0 ? 'Next' : 'Skip roadmap for now'}
          onClick={() => navigateForward('tasks')}
        />
      </StepShell>
    );
  }

  // ── 8. First tasks ────────────────────────────────────────────
  if (step === 'tasks') {
    const filledTasks = taskInputs.filter((t) => t.trim());
    return (
      <StepShell step="tasks" canGoBack={stepHistory.length > 0} onBack={goBack} onClose={mode === 'newProject' ? onComplete : undefined}>
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
          <CheckSquare size={18} className="text-emerald-600" />
        </div>
        <h2 className="stitch-headline text-2xl font-extrabold tracking-tight mb-2">
          What are the first things to do?
        </h2>
        <p className="text-sm stitch-text-secondary mb-1">
          These land in your Tasks list, linked to{' '}
          <span className="font-semibold stitch-text-primary">{projectTitle}</span>.
        </p>
        <p className="text-xs stitch-text-secondary mb-4">
          Keep them small — things you could finish in one focus session.
        </p>

        {/* ── AI Suggest button ── */}
        <button
          type="button"
          onClick={suggestTasks}
          disabled={suggestingTasks || !projectTitle.trim()}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] mb-4 ${
            suggestingTasks
              ? 'bg-emerald-100 text-emerald-700 cursor-wait'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 hover:-translate-y-0.5'
          }`}
        >
          {suggestingTasks
            ? <><Loader2 size={16} className="animate-spin" /> Thinking…</>
            : <><Wand2 size={14} /> Suggest first tasks for me</>
          }
        </button>

        {/* ── Write tasks with your own AI ────────────────────────
            Backend-free alternative: hand the project + roadmap to your
            own AI, paste the task list straight back. */}
        {projectTitle.trim() && (
          <div className="mb-4">
            {!showTasksHelper ? (
              <button
                type="button"
                onClick={() => { setShowTasksHelper(true); setTasksApplyMsg(null); }}
                className="text-xs font-semibold text-emerald-700 hover:opacity-70 transition-opacity inline-flex items-center gap-1.5"
              >
                <Sparkles size={12} />
                Prefer your own AI? Get it to suggest the tasks, paste them back
              </button>
            ) : (
              <div
                className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3"
                style={{ animation: 'wizFadeUp 300ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-emerald-600 shrink-0" />
                    <p className="text-xs font-bold text-emerald-900">Tasks from your AI</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTasksHelper(false)}
                    className="shrink-0 w-5 h-5 rounded-full hover:bg-emerald-100 flex items-center justify-center transition-colors"
                    aria-label="Close"
                  >
                    <X size={11} className="text-emerald-700" />
                  </button>
                </div>
                <ol className="text-[11px] text-emerald-900 leading-relaxed list-decimal pl-4 space-y-0.5 mb-2.5">
                  <li>Copy the prompt — it bundles your project + roadmap</li>
                  <li>Paste it into your AI chat</li>
                  <li>Paste the task list it returns back below and Apply</li>
                </ol>
                <div className="rounded-lg bg-white border border-emerald-200 p-2.5 max-h-32 overflow-y-auto mb-2">
                  <pre className="text-[10.5px] leading-snug text-slate-700 whitespace-pre-wrap font-mono">
                    {buildTasksPrompt({ projectName: projectTitle, brainDump: projectBrainDump, milestones: milestoneInputs })}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={copyTasksPrompt}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-[0.97] mb-2.5 ${
                    tasksPromptCopied
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/30'
                  }`}
                >
                  {tasksPromptCopied
                    ? <><Check size={12} strokeWidth={3} /> Copied — paste into your AI</>
                    : <><Sparkles size={12} /> Copy prompt</>
                  }
                </button>
                <textarea
                  value={tasksReply}
                  onChange={(e) => { setTasksReply(e.target.value); setTasksApplyMsg(null); }}
                  placeholder={"Paste your AI's task list here (one per line)…"}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-emerald-200 text-[12px] leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-400/30 resize-y mb-2"
                />
                <button
                  type="button"
                  onClick={applyTasksReply}
                  disabled={!tasksReply.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors disabled:opacity-40"
                >
                  <Wand2 size={12} /> Apply tasks
                </button>
              </div>
            )}
            {tasksApplyMsg && (
              <p className="text-[11px] font-semibold text-emerald-700 mt-1.5">{tasksApplyMsg}</p>
            )}
          </div>
        )}

        {aiError && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
            {aiError}
          </p>
        )}

        <div className="space-y-2.5">
          {taskInputs.map((val, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
              style={{ animation: `wizFadeUp 350ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 70}ms both` }}
            >
              <div className="w-4 h-4 rounded border-2 border-surface-container-high shrink-0" />
              <input
                type="text"
                value={val}
                onChange={(e) => updateTask(i, e.target.value)}
                placeholder={[
                  'e.g. Write the problem statement',
                  'e.g. Collect 5 competitor examples',
                  'e.g. Draft slide 1–3',
                  'e.g. Book 30-min review call',
                ][i] ?? `Task ${i + 1}`}
                maxLength={120}
                className="flex-1 px-3.5 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          ))}
        </div>

        {taskInputs.length < 6 && (
          <button
            type="button"
            onClick={addTaskRow}
            className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
          >
            <Plus size={14} /> Add another task
          </button>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mt-4">{error}</p>}

        <PrimaryBtn
          label={filledTasks.length > 0 ? `Save ${filledTasks.length} task${filledTasks.length !== 1 ? 's' : ''} and finish` : 'Skip tasks — finish setup'}
          onClick={handleComplete}
        />
      </StepShell>
    );
  }

  // ── Done — the celebration ────────────────────────────────────
  //
  // The auto-finalize useEffect above fires handleComplete() on first
  // render of this step; that call ultimately invokes onComplete()
  // which navigates the user out. This screen is what they see for
  // the ~300–800ms between save + redirect.
  //
  // Themed for SharedMinds: coworking + focus + neurodiversity. The
  // hero icon is a stylised "two minds together" composition rather
  // than a generic ✓. Ambient symbols (Brain, Headphones, Target,
  // Coffee, Users) float up the gradient — each maps to a piece of
  // the product (deep work, music room, declared goals, shared
  // moments, body-doubling). Violet is the neurodiversity infinity
  // colour, paired with cyan/teal for the broader brand.
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface gap-5 overflow-hidden wiz-anim">
      {/* Background tint — opacity-blended so it adapts to light AND
          dark theme tokens. The violet→cyan wash reads as a warm
          neurodiversity-palette glow on a light bg, and a soft
          coloured halo on a dark bg. No theme branching needed. */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-violet-500/[0.07] via-transparent to-cyan-500/[0.07]" />

      <style>{WIZARD_ANIM_CSS}</style>
      <style>{`
        @keyframes wizFloat {
          0%   { transform: translate(0, 0) rotate(0deg);   opacity: 0; }
          15%  { opacity: 0.85; }
          100% { transform: translate(var(--dx), -120vh) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes wizPulse {
          0%, 100% { transform: scale(1);    opacity: 0.6; }
          50%      { transform: scale(1.18); opacity: 0.9; }
        }
        @keyframes wizOrbit {
          from { transform: rotate(0deg)   translateX(38px) rotate(0deg);   }
          to   { transform: rotate(360deg) translateX(38px) rotate(-360deg); }
        }

        /* Reduced-motion respect — important for the neurodiversity
           audience this product targets. Vestibular sensitivity
           overlaps significantly with ADHD/autism. We keep the
           one-shot pop + fade-up (brief, doesn't loop) but kill the
           three looping animations: the rising icons, the pulsing
           halo, and the orbiting spark. Users still see a clean
           celebration — just without motion that could trigger
           discomfort. */
        @media (prefers-reduced-motion: reduce) {
          .wiz-anim [data-anim="float"],
          .wiz-anim [data-anim="pulse"],
          .wiz-anim [data-anim="orbit"] {
            animation: none !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      {/* Ambient float — themed icons rising up the screen. Each carries
          a meaning rather than a generic confetti burst. Positions are
          spread across the width so it reads as motion, not a stack. */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {([
          { Icon: Brain,      left: 8,  delay: 0,   dx: 12,  rot: 8,   cls: 'text-violet-400/80' },
          { Icon: Users,      left: 22, delay: 220, dx: -8,  rot: -6,  cls: 'text-cyan-500/80' },
          { Icon: Target,     left: 36, delay: 110, dx: 14,  rot: 12,  cls: 'text-emerald-500/80' },
          { Icon: Headphones, left: 52, delay: 380, dx: -16, rot: -10, cls: 'text-fuchsia-500/80' },
          { Icon: Sparkles,   left: 66, delay: 60,  dx: 10,  rot: 6,   cls: 'text-amber-500/80' },
          { Icon: Coffee,     left: 80, delay: 300, dx: -12, rot: -8,  cls: 'text-orange-500/80' },
          { Icon: Brain,      left: 92, delay: 170, dx: 6,   rot: 4,   cls: 'text-blue-500/80' },
        ] as const).map((c, i) => (
          <c.Icon
            key={i}
            size={28}
            data-anim="float"
            className={`absolute ${c.cls}`}
            style={{
              left: `${c.left}%`,
              top: '70%',
              ['--dx' as any]: `${c.dx}px`,
              ['--rot' as any]: `${c.rot}deg`,
              animation: `wizFloat 2400ms cubic-bezier(0.22, 1, 0.36, 1) ${c.delay}ms both`,
            }}
          />
        ))}
      </div>

      {/* Hero composition — a glowing badge with two figures + a soft
          pulsing halo. The halo lives behind everything via z-stacking.
          Two Users icons overlap to suggest the "shared" in SharedMinds
          (two minds coworking) without forcing a literal brain emoji. */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Pulsing halo */}
        <span
          data-anim="pulse"
          className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 blur-2xl"
          style={{ animation: 'wizPulse 2400ms ease-in-out infinite' }}
        />
        {/* Orbiting spark — implies momentum + connection */}
        <span
          data-anim="orbit"
          className="absolute w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.7)]"
          style={{ animation: 'wizOrbit 3.6s linear infinite' }}
        />
        {/* The badge itself */}
        <div
          className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-violet-500/40"
          style={{ animation: 'wizPop 600ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
        >
          <Users size={34} className="text-white" strokeWidth={2.25} />
        </div>
      </div>

      <h2
        className="stitch-headline text-2xl font-extrabold tracking-tight text-center px-6"
        style={{ animation: 'wizFadeUp 500ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both' }}
      >
        Welcome to the room
      </h2>
      <p
        className="text-sm stitch-text-secondary text-center max-w-xs px-6"
        style={{ animation: 'wizFadeUp 500ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both' }}
      >
        Pulling up your seat at the focus table…
      </p>

      {/* Loading state hint — only shown if the redirect takes long. */}
      <Loader2 size={18} className="animate-spin stitch-text-secondary opacity-70 mt-1" />

      {error && (
        <p
          className="text-xs font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-xl px-3 py-2 max-w-xs text-center"
          style={{ animation: 'wizFadeUp 400ms ease-out both' }}
        >
          {error} · <button type="button" onClick={() => { hasFinalizedRef.current = false; void handleComplete(); }} className="underline font-bold">Retry</button>
        </p>
      )}
    </div>
  );
}
