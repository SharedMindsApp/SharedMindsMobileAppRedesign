import { supabase } from '../supabase';

/**
 * System sub-track category definitions
 * These are activity primitives that describe what kind of work happens
 */
export interface SubtrackCategoryDefinition {
  key: string;
  label: string;
  description: string;
}

export const SUBTRACK_CATEGORY_DEFINITIONS: SubtrackCategoryDefinition[] = [
  {
    key: 'research',
    label: 'Research',
    description: 'Gathering information, data, and understanding',
  },
  {
    key: 'discovery',
    label: 'Discovery',
    description: 'Exploring possibilities and uncovering insights',
  },
  {
    key: 'ideation',
    label: 'Ideation',
    description: 'Generating ideas and concepts',
  },
  {
    key: 'analysis',
    label: 'Analysis',
    description: 'Examining and interpreting information',
  },
  {
    key: 'planning',
    label: 'Planning',
    description: 'Creating plans, timelines, and structures',
  },
  {
    key: 'design',
    label: 'Design',
    description: 'Creating designs, concepts, and visualizations',
  },
  {
    key: 'task_breakdown',
    label: 'Task Breakdown',
    description: 'Breaking work into smaller tasks and steps',
  },
  {
    key: 'development',
    label: 'Development',
    description: 'Building, coding, and creating technical solutions',
  },
  {
    key: 'implementation',
    label: 'Implementation',
    description: 'Putting plans into practice and making things real',
  },
  {
    key: 'testing',
    label: 'Testing',
    description: 'Validating work through trials and checks',
  },
  {
    key: 'feedback',
    label: 'Feedback',
    description: 'Gathering input and responses from stakeholders',
  },
  {
    key: 'refinement',
    label: 'Refinement',
    description: 'Improving and polishing work based on learnings',
  },
  {
    key: 'iteration',
    label: 'Iteration',
    description: 'Repeating cycles of improvement',
  },
  {
    key: 'documentation',
    label: 'Documentation',
    description: 'Creating written records and guides',
  },
  {
    key: 'progress_tracking',
    label: 'Progress Tracking',
    description: 'Monitoring and tracking work progress',
  },
  {
    key: 'review',
    label: 'Review',
    description: 'Reviewing outcomes and planning next steps',
  },
  {
    key: 'delivery',
    label: 'Delivery',
    description: 'Completing and handing off finished work',
  },
  {
    key: 'launch',
    label: 'Launch',
    description: 'Releasing products, services, or content',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Keeping systems and work in good condition',
  },
  {
    key: 'support',
    label: 'Support',
    description: 'Providing assistance and help',
  },
  {
    key: 'learning',
    label: 'Learning',
    description: 'Acquiring knowledge and new skills',
  },
  {
    key: 'practice',
    label: 'Practice',
    description: 'Repeated exercise to improve skills',
  },
  {
    key: 'communication',
    label: 'Communication',
    description: 'Sharing information and coordinating',
  },
  {
    key: 'collaboration',
    label: 'Collaboration',
    description: 'Working together with others',
  },
  {
    key: 'reporting',
    label: 'Reporting',
    description: 'Creating reports and summaries',
  },
];

export interface SubtrackCategory {
  id: string;
  key: string;
  label: string;
  description: string | null;
  created_at: string;
}

/**
 * Get all sub-track categories
 */
export async function getAllSubtrackCategories(): Promise<SubtrackCategory[]> {
  const { data, error } = await supabase
    .from('subtrack_categories')
    .select('*')
    .order('label', { ascending: true });

  if (error) {
    console.error('Error fetching sub-track categories:', error);
    throw new Error(`Failed to fetch sub-track categories: ${error.message}`);
  }

  return (data || []) as SubtrackCategory[];
}

/**
 * Get allowed sub-track categories for a track category key
 */
export async function getAllowedSubtrackCategoriesForTrackCategory(
  trackCategoryKey: string
): Promise<SubtrackCategory[]> {
  const { data, error } = await supabase
    .from('track_category_subtrack_categories')
    .select(`
      subtrack_category_id,
      subtrack_categories (*)
    `)
    .eq('track_category_key', trackCategoryKey);

  if (error) {
    console.error('Error fetching allowed sub-track categories:', error);
    throw new Error(`Failed to fetch allowed sub-track categories: ${error.message}`);
  }

  // Extract subtrack_categories from the join result
  const categories = (data || [])
    .map((row: any) => row.subtrack_categories)
    .filter(Boolean) as SubtrackCategory[];

  return categories;
}

/**
 * Validate that a sub-track category is allowed for a track category key
 */
export async function validateSubtrackCategoryForTrackCategory(
  subtrackCategoryId: string,
  trackCategoryKey: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('track_category_subtrack_categories')
    .select('subtrack_category_id')
    .eq('track_category_key', trackCategoryKey)
    .eq('subtrack_category_id', subtrackCategoryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return false; // No mapping found
    }
    console.error('Error validating sub-track category:', error);
    throw new Error(`Failed to validate sub-track category: ${error.message}`);
  }

  return !!data;
}

/**
 * Get sub-track category by ID
 */
export async function getSubtrackCategoryById(
  categoryId: string
): Promise<SubtrackCategory | null> {
  const { data, error } = await supabase
    .from('subtrack_categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching sub-track category:', error);
    throw new Error(`Failed to fetch sub-track category: ${error.message}`);
  }

  return data as SubtrackCategory;
}
