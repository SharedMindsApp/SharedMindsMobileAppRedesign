import { supabase } from '../supabase';
import type { DomainType } from './templateTypes';

export interface SystemCategoryDefinition {
  key: string;
  name: string;
  description: string;
  icon?: string;
}

export const SYSTEM_CATEGORY_DEFINITIONS: SystemCategoryDefinition[] = [
  // Direction & Thinking
  {
    key: 'vision',
    name: 'Vision',
    description: 'Defines the long-term direction or desired end state',
  },
  {
    key: 'strategy',
    name: 'Strategy',
    description: 'High-level approach and planning for achieving goals',
  },
  {
    key: 'goals',
    name: 'Goals',
    description: 'Specific objectives and targets to achieve',
  },
  {
    key: 'success_criteria',
    name: 'Success Criteria',
    description: 'Metrics and conditions that define successful completion',
  },
  
  // Understanding & Exploration
  {
    key: 'research',
    name: 'Research',
    description: 'Gathering information, data, and understanding',
  },
  {
    key: 'discovery',
    name: 'Discovery',
    description: 'Exploring possibilities and uncovering insights',
  },
  {
    key: 'insights',
    name: 'Insights',
    description: 'Synthesizing learnings and developing understanding',
  },
  
  // Planning & Organisation
  {
    key: 'planning',
    name: 'Planning',
    description: 'Creating plans, timelines, and roadmaps',
  },
  {
    key: 'structure',
    name: 'Structure',
    description: 'Organizing work, systems, and frameworks',
  },
  {
    key: 'scope',
    name: 'Scope',
    description: 'Defining boundaries and what is included',
  },
  {
    key: 'dependencies',
    name: 'Dependencies',
    description: 'Managing relationships and prerequisites between work items',
  },
  
  // Creation & Development
  {
    key: 'design',
    name: 'Design',
    description: 'Creating designs, concepts, and visualizations',
  },
  {
    key: 'development',
    name: 'Development',
    description: 'Building, coding, and creating technical solutions',
  },
  {
    key: 'content',
    name: 'Content',
    description: 'Creating written, visual, or multimedia content',
  },
  {
    key: 'assets',
    name: 'Assets',
    description: 'Producing files, resources, and deliverables',
  },
  
  // Execution & Progress
  {
    key: 'execution',
    name: 'Execution',
    description: 'Carrying out planned work and activities',
  },
  {
    key: 'implementation',
    name: 'Implementation',
    description: 'Putting plans into practice and making things real',
  },
  {
    key: 'iteration',
    name: 'Iteration',
    description: 'Repeating cycles of improvement and refinement',
  },
  
  // Evaluation & Improvement
  {
    key: 'testing',
    name: 'Testing',
    description: 'Validating work through trials and checks',
  },
  {
    key: 'feedback',
    name: 'Feedback',
    description: 'Gathering input and responses from stakeholders',
  },
  {
    key: 'refinement',
    name: 'Refinement',
    description: 'Improving and polishing work based on learnings',
  },
  
  // Completion & Release
  {
    key: 'delivery',
    name: 'Delivery',
    description: 'Completing and handing off finished work',
  },
  {
    key: 'launch',
    name: 'Launch',
    description: 'Releasing products, services, or content to users',
  },
  {
    key: 'rollout',
    name: 'Rollout',
    description: 'Gradually deploying or releasing to broader audiences',
  },
  
  // Maintenance & Continuity
  {
    key: 'operations',
    name: 'Operations',
    description: 'Ongoing operational activities and processes',
  },
  {
    key: 'maintenance',
    name: 'Maintenance',
    description: 'Keeping systems and work in good condition',
  },
  {
    key: 'support',
    name: 'Support',
    description: 'Providing assistance and help to users or stakeholders',
  },
  
  // Human & Personal (intentional two-word categories)
  {
    key: 'people_management',
    name: 'People Management',
    description: 'Managing teams, relationships, and people-related activities',
  },
  {
    key: 'self_improvement',
    name: 'Self-Improvement',
    description: 'Personal growth, skill development, and self-care',
  },
  {
    key: 'health_management',
    name: 'Health Management',
    description: 'Managing physical and mental health goals',
  },
  
  // Learning & Growth
  {
    key: 'learning',
    name: 'Learning',
    description: 'Acquiring knowledge and new skills',
  },
  {
    key: 'practice',
    name: 'Practice',
    description: 'Repeated exercise to improve skills or performance',
  },
  {
    key: 'reflection',
    name: 'Reflection',
    description: 'Reviewing outcomes, learning, and planning next steps',
  },
  
  // Governance & Practicalities
  {
    key: 'finance',
    name: 'Finance',
    description: 'Financial planning, budgeting, and money management',
  },
  {
    key: 'legal',
    name: 'Legal',
    description: 'Legal matters, compliance, and regulatory requirements',
  },
  {
    key: 'administration',
    name: 'Administration',
    description: 'Organizational tasks and administrative work',
  },
];

export interface ProjectTrackCategory {
  id: string;
  master_project_id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface CreateCategoryInput {
  master_project_id: string;
  name: string;
  description?: string;
}

/**
 * Get all categories for a project (system + custom)
 */
export async function getProjectTrackCategories(
  masterProjectId: string
): Promise<ProjectTrackCategory[]> {
  const { data, error } = await supabase
    .from('project_track_categories')
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('is_system', { ascending: false }) // System categories first
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching project track categories:', error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data || []) as ProjectTrackCategory[];
}

/**
 * Create a custom category for a project
 */
export async function createCustomCategory(
  input: CreateCategoryInput
): Promise<ProjectTrackCategory> {
  // Generate key from name (normalize: lowercase, replace spaces with underscores, remove special chars)
  const key = input.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  // Check if category with this key already exists (case-insensitive check via name)
  const existing = await supabase
    .from('project_track_categories')
    .select('*')
    .eq('master_project_id', input.master_project_id)
    .ilike('name', input.name.trim())
    .single();

  if (existing.data) {
    throw new Error('A category with this name already exists in this project');
  }

  // Generate unique key if needed
  let uniqueKey = key;
  let counter = 1;
  while (true) {
    const { data: existingWithKey } = await supabase
      .from('project_track_categories')
      .select('id')
      .eq('master_project_id', input.master_project_id)
      .eq('key', uniqueKey)
      .single();

    if (!existingWithKey) {
      break;
    }
    uniqueKey = `${key}_${counter}`;
    counter++;
  }

  const { data, error } = await supabase
    .from('project_track_categories')
    .insert({
      master_project_id: input.master_project_id,
      key: uniqueKey,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom category:', error);
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return data as ProjectTrackCategory;
}

/**
 * Seed system categories for a project
 * Seeds all default system categories (no filtering by domain/project type)
 */
export async function seedSystemCategoriesForProject(
  masterProjectId: string,
  domainType?: DomainType,
  projectTypeName?: string
): Promise<ProjectTrackCategory[]> {
  // Insert all system categories (no filtering - seed full set per project)
  const categoriesToInsert = SYSTEM_CATEGORY_DEFINITIONS.map(cat => ({
    master_project_id: masterProjectId,
    key: cat.key,
    name: cat.name,
    description: cat.description,
    is_system: true,
  }));

  const { data, error } = await supabase
    .from('project_track_categories')
    .insert(categoriesToInsert)
    .select();

  if (error) {
    // If error is due to duplicate key (category already seeded), fetch existing instead
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('project_track_categories')
        .select('*')
        .eq('master_project_id', masterProjectId)
        .eq('is_system', true);
      
      return (existing?.data || []) as ProjectTrackCategory[];
    }
    
    console.error('Error seeding system categories:', error);
    throw new Error(`Failed to seed system categories: ${error.message}`);
  }

  return (data || []) as ProjectTrackCategory[];
}

/**
 * Get category by ID
 */
export async function getCategoryById(
  categoryId: string
): Promise<ProjectTrackCategory | null> {
  const { data, error } = await supabase
    .from('project_track_categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching category:', error);
    throw new Error(`Failed to fetch category: ${error.message}`);
  }

  return data as ProjectTrackCategory;
}
