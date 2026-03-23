/**
 * Recipe Generator Service
 * 
 * Service functions for managing recipes, sources, and versions
 * Phase 1: Core CRUD operations
 * 
 * RLS Policy Architecture:
 * - AI recipes and non-AI recipes use SEPARATE INSERT policies to prevent NULL/OR traps
 * - Split policies ensure PostgreSQL only evaluates the relevant policy branch
 * - This prevents complex boolean logic from causing unexpected failures
 * - See migration 20250230000034_split_recipes_insert_policies.sql for details
 * 
 * Why Split Policies?
 * A single monolithic policy with complex OR chains can cause PostgreSQL to evaluate
 * branches you expect to be skipped. Boolean + NULL logic inside RLS is not short-circuited
 * like in application code. Split policies prevent these issues by ensuring only one
 * policy is evaluated per insert, making evaluation deterministic and predictable.
 */

import { supabase } from './supabase';
import type {
  Recipe,
  RecipeSource,
  RecipeVersion,
  CreateRecipeInput,
  UpdateRecipeInput,
  CreateRecipeSourceInput,
  RecipeFilters,
  MealType,
} from './recipeGeneratorTypes';
import { validateRecipe, saveValidationStatus } from './recipeValidationService';

// ============================================
// RECIPE SOURCE SERVICE
// ============================================

/**
 * Create a new recipe source
 */
export async function createRecipeSource(
  input: CreateRecipeSourceInput
): Promise<RecipeSource> {
  const { data, error } = await supabase
    .from('recipe_sources')
    .insert({
      source_type: input.source_type,
      source_name: input.source_name || null,
      source_url: input.source_url || null,
      source_api_key: input.source_api_key || null,
      metadata: input.metadata || {},
      trust_score: input.trust_score ?? 0.5,
      requires_validation: input.requires_validation ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get recipe source by ID
 */
export async function getRecipeSourceById(sourceId: string): Promise<RecipeSource | null> {
  const { data, error } = await supabase
    .from('recipe_sources')
    .select('*')
    .eq('id', sourceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// RECIPE SERVICE
// ============================================

/**
 * Helper: Get profile ID from auth user ID
 * created_by column references profiles(id), not auth.users(id)
 * 
 * Cached to avoid repeated database queries for the same user
 */
const profileIdCache = new Map<string, string | null>();

export async function getProfileIdFromAuthUserId(authUserId: string): Promise<string | null> {
  // Ensure profile resolution also depends on session
  if (!authUserId) {
    throw new Error('No auth UID when resolving active profile');
  }

  // Check cache first
  if (profileIdCache.has(authUserId)) {
    return profileIdCache.get(authUserId) || null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', authUserId)
    .maybeSingle();

  if (error) {
    console.error('[recipeGeneratorService] Error fetching profile:', error);
    profileIdCache.set(authUserId, null); // Cache null to avoid repeated queries
    return null;
  }

  const profileId = data?.id || null;
  profileIdCache.set(authUserId, profileId); // Cache result
  return profileId;
}

/**
 * Create a new recipe
 * Automatically creates initial version via trigger
 * 
 * @param input - Recipe data
 * @param userId - Auth user ID (auth.users.id) - will be converted to profiles.id
 */
export async function createRecipe(
  input: CreateRecipeInput,
  userId: string
): Promise<Recipe> {
  // Convert auth user ID to profile ID
  // created_by column references profiles(id), not auth.users(id)
  const profileId = await getProfileIdFromAuthUserId(userId);
  
  // For AI recipes, created_by must be NULL (enforced by database constraint)
  // For non-AI recipes, set created_by to null if profile doesn't exist
  const shouldSetCreatedByToNull = !profileId || input.source_type === 'ai';
  
  if (shouldSetCreatedByToNull) {
    if (input.source_type === 'ai') {
      // AI recipes should never have a creator (system-generated)
      console.log('[recipeGeneratorService] AI recipe - setting created_by to null (required for AI recipes)');
    } else if (!profileId) {
      // Non-AI recipe but profile not found
      console.warn('[recipeGeneratorService] No profile found for user, setting created_by to null', {
        authUserId: userId,
        sourceType: input.source_type,
        action: 'created_by set to null',
        possibleCauses: [
          'incomplete user onboarding',
          'failed profile creation flow',
          'edge case during import',
        ],
      });
    }
  }

  // 🚨 CRITICAL: Enforce profile ownership for created_for_profile_id
  // This ensures RLS policies can verify ownership correctly
  let validatedCreatedForProfileId: string | null = null;
  
  if (input.created_for_profile_id) {
    // Profile ID was provided - verify it belongs to the current user
    const { getActiveUserProfileId } = await import('./profiles/getActiveUserProfile');
    const activeProfileId = await getActiveUserProfileId();
    
    if (input.created_for_profile_id !== activeProfileId) {
      // Rejected: provided profile ID does not belong to current user
      console.error('[recipeGeneratorService] Profile ownership violation blocked:', {
        providedProfileId: input.created_for_profile_id,
        activeProfileId,
        authUserId: userId,
        sourceType: input.source_type,
        householdId: input.household_id,
        action: 'rejecting insert to prevent RLS violation',
      });
      throw new Error(
        'Cannot create recipe: provided profile ID does not belong to current user. ' +
        'This is a security violation and has been blocked.'
      );
    }
    
    // Validated: profile ID belongs to current user
    validatedCreatedForProfileId = input.created_for_profile_id;
    console.log('[recipeGeneratorService] Profile ownership validated:', {
      profileId: validatedCreatedForProfileId,
      authUserId: userId,
      sourceType: input.source_type,
    });
  } else if (input.source_type === 'ai' && !input.household_id) {
    // Personal AI recipe but no created_for_profile_id provided
    // Resolve it using the active user profile
    const { getActiveUserProfileId } = await import('./profiles/getActiveUserProfile');
    validatedCreatedForProfileId = await getActiveUserProfileId();
    console.log('[recipeGeneratorService] Resolved created_for_profile_id for personal AI recipe:', {
      resolvedProfileId: validatedCreatedForProfileId,
      authUserId: userId,
      note: 'auto-resolved from active user profile',
    });
  }

  // 🚨 CRITICAL: Runtime validation of required fields before insert
  // This prevents schema violations that Supabase reports as RLS errors
  if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
    console.error('[recipeGeneratorService] Recipe insert blocked: missing or empty name', {
      name: input.name,
      nameType: typeof input.name,
      sourceType: input.source_type,
      insertData: {
        source_type: input.source_type,
        household_id: input.household_id,
        created_for_profile_id: validatedCreatedForProfileId,
      },
    });
    throw new Error('Cannot create recipe: name is required and must be a non-empty string.');
  }

  // Normalize meal_type to always be an array
  // Handle both single values (backward compatibility) and arrays
  let normalizedMealTypeArray: MealType[];
  if (Array.isArray(input.meal_type)) {
    normalizedMealTypeArray = input.meal_type;
  } else if (input.meal_type) {
    // Single value - convert to array for backward compatibility
    normalizedMealTypeArray = [input.meal_type as MealType];
  } else {
    console.error('[recipeGeneratorService] Recipe insert blocked: missing meal_type', {
      meal_type: input.meal_type,
      sourceType: input.source_type,
      insertData: {
        source_type: input.source_type,
        household_id: input.household_id,
        created_for_profile_id: validatedCreatedForProfileId,
        name: input.name,
      },
    });
    throw new Error('Cannot create recipe: meal_type is required. Must be one of: breakfast, lunch, dinner, snack.');
  }

  // Validate all meal_type values are valid enum values
  const validMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const invalidTypes = normalizedMealTypeArray.filter(mt => !validMealTypes.includes(mt));
  if (invalidTypes.length > 0) {
    console.error('[recipeGeneratorService] Recipe insert blocked: invalid meal_type values', {
      meal_type: normalizedMealTypeArray,
      invalidTypes,
      validMealTypes,
      sourceType: input.source_type,
      insertData: {
        source_type: input.source_type,
        household_id: input.household_id,
        created_for_profile_id: validatedCreatedForProfileId,
        name: input.name,
      },
    });
    throw new Error(
      `Cannot create recipe: invalid meal_type values: ${invalidTypes.join(', ')}. ` +
      `Must be one of: ${validMealTypes.join(', ')}.`
    );
  }

  // Ensure at least one meal type is provided
  if (normalizedMealTypeArray.length === 0) {
    console.error('[recipeGeneratorService] Recipe insert blocked: empty meal_type array', {
      meal_type: normalizedMealTypeArray,
      sourceType: input.source_type,
    });
    throw new Error('Cannot create recipe: meal_type array cannot be empty. Must include at least one meal type.');
  }

  // Log recipe creation details for debugging
  console.log('[recipeGeneratorService] Creating recipe with validated data:', {
    source_type: input.source_type,
    household_id: input.household_id,
    created_for_profile_id: validatedCreatedForProfileId,
    created_by: shouldSetCreatedByToNull ? null : profileId,
    is_public: input.is_public ?? false,
    profileOwnershipValidated: validatedCreatedForProfileId !== null,
    requiredFields: {
      name: input.name,
      meal_type: normalizedMealTypeArray,
      nameValid: !!input.name && typeof input.name === 'string' && input.name.trim().length > 0,
      mealTypeValid: normalizedMealTypeArray.every(mt => validMealTypes.includes(mt)),
    },
  });

  // Build complete insert payload with all required fields explicitly set
  // Never rely on defaults for NOT NULL columns
  const insertData = {
    name: input.name.trim(), // Explicitly set required field
    description: input.description || null,
    meal_type: normalizedMealTypeArray, // Always an array (normalized above)
    servings: input.servings ?? 4,
    ingredients: input.ingredients || [], // Ensure array, never null
    instructions: input.instructions || null,
    instructions_structured: input.instructions_structured || null,
    categories: input.categories || [],
    cuisine: input.cuisine || null,
    difficulty: input.difficulty || 'medium',
    prep_time: input.prep_time || null,
    cook_time: input.cook_time || null,
    total_time: input.total_time || (
      (input.prep_time && input.cook_time) 
        ? (input.prep_time + input.cook_time)
        : (input.prep_time || input.cook_time || null)
    ), // Calculate if not provided: sum if both exist, otherwise use single value or null
    calories: input.calories || null,
    protein: input.protein || null,
    carbs: input.carbs || null,
    fat: input.fat || null,
    fiber: input.fiber || null,
    sodium: input.sodium || null,
    allergies: input.allergies || [],
    dietary_tags: input.dietary_tags || [],
    image_url: input.image_url || null,
    image_urls: input.image_urls || null,
    source_type: input.source_type,
    source_id: input.source_id || null,
    source_url: input.source_url || null,
    household_id: input.household_id || null,
    created_for_profile_id: validatedCreatedForProfileId, // Validated: always belongs to auth.uid()
    is_public: input.is_public ?? false,
    validation_status: input.validation_status || 'draft',
    created_by: shouldSetCreatedByToNull ? null : profileId, // NULL for AI recipes or if profile not found
  };

  // Log final insert payload for diagnostics
  console.log('[recipeGeneratorService] Final insert payload:', {
    requiredFields: {
      name: insertData.name,
      meal_type: insertData.meal_type,
      namePresent: !!insertData.name && insertData.name.length > 0,
      mealTypePresent: Array.isArray(insertData.meal_type) && insertData.meal_type.length > 0,
      mealTypeValid: Array.isArray(insertData.meal_type) && insertData.meal_type.every(mt => validMealTypes.includes(mt)),
    },
    sourceType: insertData.source_type,
    householdId: insertData.household_id,
    createdForProfileId: insertData.created_for_profile_id,
    createdBy: insertData.created_by,
    isPublic: insertData.is_public,
    ingredientCount: insertData.ingredients.length,
  });

  const { data, error } = await supabase
    .from('recipes')
    .insert(insertData)
    .select(`
      *,
      source:recipe_sources(*)
    `)
    .single();

  if (error) {
    // Diagnostic logging: Check which required fields were present/missing
    const requiredFieldsCheck = {
      name: {
        present: !!insertData.name,
        type: typeof insertData.name,
        length: insertData.name?.length || 0,
        trimmed: insertData.name?.trim().length || 0,
      },
      meal_type: {
        present: !!insertData.meal_type,
        value: insertData.meal_type,
        valid: validMealTypes.includes(insertData.meal_type),
      },
    };

    // Preflight diagnostics for RLS failures (403/42501)
    // Only call debug function on RLS errors to avoid spamming logs on success
    let rlsDebugInfo = null;
    if (error.code === '42501' || error.code === 'PGRST301' || (error.message && error.message.includes('row-level security'))) {
      // This is an RLS policy violation - call debug function to see which condition failed
      if (insertData.source_type === 'ai' && validatedCreatedForProfileId) {
        try {
          const { data: debugData, error: debugError } = await supabase.rpc('debug_can_insert_ai_recipe', {
            created_for_profile_id: validatedCreatedForProfileId,
          });
          
          if (!debugError && debugData) {
            rlsDebugInfo = debugData;
          } else {
            console.warn('[recipeGeneratorService] Debug function call failed:', debugError);
          }
        } catch (debugErr) {
          console.warn('[recipeGeneratorService] Error calling debug function:', debugErr);
        }
      }
    }

    // Get current session user ID for diagnostics
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const currentAuthUserId = currentUser?.id || null;

    console.error('[recipeGeneratorService] Recipe insert failed:', {
      error,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      requiredFieldsCheck,
      insertPayload: {
        name: insertData.name,
        meal_type: insertData.meal_type,
        source_type: insertData.source_type,
        household_id: insertData.household_id,
        created_for_profile_id: insertData.created_for_profile_id,
        created_by: insertData.created_by,
        is_public: insertData.is_public,
        ingredientCount: insertData.ingredients.length,
      },
      profileOwnership: {
        validated: validatedCreatedForProfileId !== null,
        profileId: validatedCreatedForProfileId,
        authUserId: userId,
        currentAuthUserId, // Current session user ID
      },
      rlsDebugInfo, // Debug function output showing which policy conditions passed/failed
      diagnosticNote: error.code === '42501' && (!requiredFieldsCheck.name.present || !requiredFieldsCheck.meal_type.present)
        ? 'This RLS error may be caused by missing required fields (name or meal_type). Check requiredFieldsCheck above.'
        : error.code === '42501' || error.code === 'PGRST301'
        ? 'RLS policy violation - check rlsDebugInfo above to see which policy condition failed. Split policies prevent NULL/OR traps by ensuring PostgreSQL only evaluates the relevant policy branch (AI vs non-AI).'
        : 'Check error details above.',
    });
    throw error;
  }
  
  // Auto-validate the new recipe
  try {
    const validationResult = await validateRecipe(data);
    // Use profileId for validation (or userId if profile not found, as fallback)
    await saveValidationStatus(data.id, validationResult, profileId || userId, 'automated');
  } catch (validationError) {
    // Don't fail recipe creation if validation fails - just log it
    console.error('Failed to auto-validate recipe:', validationError);
  }
  
  return data;
}

/**
 * Get recipe by ID with optional joins
 */
export async function getRecipeById(
  recipeId: string,
  options?: { includeSource?: boolean; includeVersion?: boolean }
): Promise<Recipe | null> {
  let query = supabase
    .from('recipes')
    .select('*');

  if (options?.includeSource) {
    query = query.select(`
      *,
      source:recipe_sources(*)
    `);
  }

  if (options?.includeVersion) {
    query = query.select(`
      *,
      current_version:recipe_versions(*)
    `);
  }

  if (options?.includeSource && options?.includeVersion) {
    query = query.select(`
      *,
      source:recipe_sources(*),
      current_version:recipe_versions(*)
    `);
  }

  const { data, error } = await query
    .eq('id', recipeId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Search recipes with fuzzy name matching using pg_trgm similarity
 * Returns recipes ordered by similarity score (highest first)
 */
export async function searchRecipesFuzzy(
  searchQuery: string,
  filters: Omit<RecipeFilters, 'search_query'> = {},
  similarityThreshold: number = 0.3
): Promise<Recipe[]> {
  console.log('[searchRecipesFuzzy] Starting fuzzy search:', {
    searchQuery,
    similarityThreshold,
    filters,
  });
  if (!searchQuery || searchQuery.trim().length === 0) {
    return listRecipes(filters);
  }

  // Use RPC function for fuzzy search if available, otherwise fallback to simple search
  const { data, error } = await supabase.rpc('search_recipes_fuzzy', {
    search_term: searchQuery.trim(),
    similarity_threshold: similarityThreshold,
    meal_type_filter: filters.meal_type || null,
    cuisine_filter: filters.cuisine || null,
    difficulty_filter: filters.difficulty || null,
    household_id_filter: filters.household_id || null,
    include_public: filters.include_public || false,
    tags_filter: filters.tags && filters.tags.length > 0 ? filters.tags : null,
    limit_count: filters.limit || 20,
  });

  if (error) {
    // Fallback to simple search if RPC doesn't exist
    console.warn('[searchRecipesFuzzy] Fuzzy search RPC not available, falling back to simple search:', {
      error,
      code: error.code,
      message: error.message,
      details: error.details,
      searchQuery,
    });
    return listRecipes({ ...filters, search_query: searchQuery });
  }

  const results = data || [];
  console.log('[searchRecipesFuzzy] Fuzzy search successful:', {
    searchQuery,
    resultCount: results.length,
    recipeNames: results.map(r => r.name),
    recipeIds: results.map(r => r.id),
    fullResults: results,
  });

  return results;
}

/**
 * List recipes with filters
 */
export async function listRecipes(filters: RecipeFilters = {}): Promise<Recipe[]> {
  // Simplified logging - only log if there are meaningful filters
  if (filters.tags?.length || filters.search_query || filters.meal_type) {
    console.log('[listRecipes] Query:', {
      tags: filters.tags?.length || 0,
      search: filters.search_query || null,
      meal_type: filters.meal_type || null,
    });
  }

  let query = supabase
    .from('recipes')
    .select('*')
    .is('deleted_at', null);

  // Apply filters
  // meal_type is now an array, so we check if it contains the filter value
  if (filters.meal_type) {
    query = query.contains('meal_type', [filters.meal_type]);
  }

  if (filters.categories && filters.categories.length > 0) {
    query = query.contains('categories', filters.categories);
  }

  if (filters.cuisine) {
    query = query.eq('cuisine', filters.cuisine);
  }

  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  // Tag filtering (using dietary_tags array)
  // Use OR logic: recipe must contain at least ONE of the specified tags
  // This is less restrictive than requiring ALL tags
  if (filters.tags && filters.tags.length > 0) {
    // For multiple tags, we want recipes that contain ANY of them
    // Supabase's contains() requires ALL tags, so we use OR logic instead
    if (filters.tags.length === 1) {
      // Single tag: use contains
      query = query.contains('dietary_tags', [filters.tags[0]]);
    } else {
      // Multiple tags: use OR logic - recipe must contain at least one tag
      // We'll filter in JavaScript after fetching, or use a more complex query
      // For now, use contains with the first tag and filter in post-processing
      // This is a limitation of Supabase's array contains - it requires ALL elements
      // We'll handle this by fetching more results and filtering client-side
      query = query.contains('dietary_tags', [filters.tags[0]]);
      // Note: We'll filter results client-side to include recipes with ANY of the tags
    }
  }

  if (filters.search_query) {
    query = query.ilike('name', `%${filters.search_query}%`);
  }

  // Handle household_id and public recipe filtering
  // CRITICAL FIX: Personal AI recipes rely on created_for_profile_id, not household_id
  // RLS policy allows: created_for_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  // We must ensure queries don't exclude these recipes
  
  if (filters.household_id !== undefined && filters.household_id !== null) {
    // Explicit household_id provided (household space)
    if (filters.include_public) {
      // Show household recipes OR public recipes
      query = query.or(`household_id.eq.${filters.household_id},is_public.eq.true`);
    } else {
      // Only show household recipes
      query = query.eq('household_id', filters.household_id);
    }
  } else if (filters.household_id === null) {
    // Personal space (household_id = null)
    // CRITICAL: Personal AI recipes have: household_id IS NULL, is_public = false, created_for_profile_id set
    // RLS policy allows: created_for_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    // We must NOT filter these out - let RLS handle access control
    
    // For personal spaces, we want:
    // - Personal AI recipes (household_id IS NULL, is_public = false, created_for_profile_id matches user) - RLS filters
    // - Public recipes (is_public = true) - can be in any space
    if (filters.include_public) {
      // Include personal recipes (household_id IS NULL) OR public recipes (any household_id)
      // RLS will filter personal AI recipes by created_for_profile_id
      // This OR condition ensures we request both:
      // 1. Recipes with household_id IS NULL (includes personal AI + public recipes with null household_id)
      // 2. Public recipes (is_public = true, any household_id)
      query = query.or('household_id.is.null,is_public.eq.true');
    } else {
      // Only personal recipes (no public recipes)
      // Filter for household_id IS NULL, RLS will filter by created_for_profile_id
      query = query.is('household_id', null);
    }
  } else {
    // No household_id filter (undefined) - show all accessible recipes
    // RLS will filter by:
    // - created_for_profile_id (personal AI recipes)
    // - household membership (household recipes)
    // - is_public = true (public recipes)
    // - created_by (user's own recipes)
    if (filters.include_public) {
      // Include all possibilities - RLS enforces access
      // This ensures personal AI recipes (created_for_profile_id) are included
      query = query.or('is_public.eq.true,household_id.is.null,household_id.not.is.null');
    }
    // If include_public is false and household_id is undefined, don't add filter
    // RLS will still filter appropriately
  }

  if (filters.validation_status) {
    query = query.eq('validation_status', filters.validation_status);
  } else {
    // Default: show approved, pending, and draft recipes
    // Draft recipes will be filtered by RLS to show only user's own recipes
    // This ensures users see their own recipes even if not yet approved
    query = query.in('validation_status', ['approved', 'pending', 'draft']);
  }

  // Ordering
  const orderBy = filters.order_by || 'created_at';
  const orderDirection = filters.order_direction || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  // Debug logging for personal space queries
  if (filters.household_id === null) {
    console.log('[listRecipes] Personal space query details:', {
      household_id: filters.household_id,
      include_public: filters.include_public,
      validation_status_filter: filters.validation_status || 'approved, pending, draft',
      query_conditions: 'household_id IS NULL OR is_public = true',
    });
  }

  // Pagination
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[listRecipes] Supabase query error:', {
      error,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      filters,
    });
    throw error;
  }

  let recipes = data || [];
  
  // Post-process tag filtering: if multiple tags provided, filter to include recipes with ANY tag
  if (filters.tags && filters.tags.length > 1) {
    const tagSet = new Set(filters.tags.map(t => t.toLowerCase()));
    recipes = recipes.filter(recipe => {
      const recipeTags = (recipe.dietary_tags || []).map((t: string) => t.toLowerCase());
      // Recipe must contain at least one of the specified tags
      return recipeTags.some((tag: string) => tagSet.has(tag));
    });
    console.log('[listRecipes] Post-filtered recipes by tags (ANY match):', {
      requestedTags: filters.tags,
      beforeFilter: data?.length || 0,
      afterFilter: recipes.length,
    });
  }
  
  // Debug logging for personal space queries
  if (filters.household_id === null) {
    console.log('[listRecipes] Personal space query results:', {
      totalCount: recipes.length,
      recipeIds: recipes.map(r => r.id),
      recipeNames: recipes.map(r => r.name),
      householdIds: recipes.map(r => r.household_id),
      isPublic: recipes.map(r => r.is_public),
      createdForProfileIds: recipes.map(r => (r as any).created_for_profile_id),
      sourceTypes: recipes.map(r => r.source_type),
      validationStatuses: recipes.map(r => r.validation_status),
      tagsFilter: filters.tags,
    });
  } else {
    // Simplified logging for other queries - only log count
    if (recipes.length > 0 || filters.tags?.length || filters.search_query) {
      console.log('[listRecipes] Found', recipes.length, 'recipes', {
        tagsFilter: filters.tags,
      });
    }
  }

  return recipes;
}

/**
 * Update recipe (creates new version automatically via application logic)
 * Note: This function updates the recipe directly. Version creation should be handled
 * separately if you want to track versions on every update.
 */
export async function updateRecipe(
  recipeId: string,
  input: UpdateRecipeInput,
  userId: string
): Promise<Recipe> {
  // Convert auth user ID to profile ID for validation status
  const profileId = await getProfileIdFromAuthUserId(userId);
  
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Only update provided fields
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.meal_type !== undefined) {
    // Normalize meal_type to always be an array
    if (Array.isArray(input.meal_type)) {
      // Validate all values are valid
      const validMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
      const invalidTypes = input.meal_type.filter(mt => !validMealTypes.includes(mt));
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid meal_type values: ${invalidTypes.join(', ')}. Must be one of: ${validMealTypes.join(', ')}.`);
      }
      if (input.meal_type.length === 0) {
        throw new Error('meal_type array cannot be empty. Must include at least one meal type.');
      }
      updateData.meal_type = input.meal_type;
    } else if (input.meal_type) {
      // Single value - convert to array for backward compatibility
      const validMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
      if (!validMealTypes.includes(input.meal_type as MealType)) {
        throw new Error(`Invalid meal_type: ${input.meal_type}. Must be one of: ${validMealTypes.join(', ')}.`);
      }
      updateData.meal_type = [input.meal_type as MealType];
    }
  }
  if (input.servings !== undefined) updateData.servings = input.servings;
  if (input.ingredients !== undefined) updateData.ingredients = input.ingredients;
  if (input.instructions !== undefined) updateData.instructions = input.instructions;
  if (input.instructions_structured !== undefined) updateData.instructions_structured = input.instructions_structured;
  if (input.categories !== undefined) updateData.categories = input.categories;
  if (input.cuisine !== undefined) updateData.cuisine = input.cuisine;
  if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;
  if (input.prep_time !== undefined) updateData.prep_time = input.prep_time;
  if (input.cook_time !== undefined) updateData.cook_time = input.cook_time;
  if (input.calories !== undefined) updateData.calories = input.calories;
  if (input.protein !== undefined) updateData.protein = input.protein;
  if (input.carbs !== undefined) updateData.carbs = input.carbs;
  if (input.fat !== undefined) updateData.fat = input.fat;
  if (input.fiber !== undefined) updateData.fiber = input.fiber;
  if (input.sodium !== undefined) updateData.sodium = input.sodium;
  if (input.allergies !== undefined) updateData.allergies = input.allergies;
  if (input.dietary_tags !== undefined) updateData.dietary_tags = input.dietary_tags;
  if (input.image_url !== undefined) updateData.image_url = input.image_url;
  if (input.image_urls !== undefined) updateData.image_urls = input.image_urls;

  const { data, error } = await supabase
    .from('recipes')
    .update(updateData)
    .eq('id', recipeId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  
  // Re-validate the updated recipe
  try {
    const validationResult = await validateRecipe(data);
    // Use profileId for validation (or userId if profile not found, as fallback)
    await saveValidationStatus(data.id, validationResult, profileId || userId, 'automated');
  } catch (validationError) {
    // Don't fail recipe update if validation fails - just log it
    console.error('Failed to auto-validate recipe:', validationError);
  }
  
  return data;
}

/**
 * Soft delete a recipe
 */
export async function deleteRecipe(recipeId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', recipeId)
    .is('deleted_at', null);

  if (error) throw error;
}

// ============================================
// RECIPE VERSION SERVICE
// ============================================

/**
 * Get recipe versions for a recipe
 */
export async function getRecipeVersions(recipeId: string): Promise<RecipeVersion[]> {
  const { data, error } = await supabase
    .from('recipe_versions')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get current version of a recipe
 */
export async function getCurrentVersion(recipeId: string): Promise<RecipeVersion | null> {
  const recipe = await getRecipeById(recipeId, { includeVersion: true });
  if (!recipe || !recipe.current_version_id) return null;

  const { data, error } = await supabase
    .from('recipe_versions')
    .select('*')
    .eq('id', recipe.current_version_id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get specific version by ID
 */
export async function getVersionById(versionId: string): Promise<RecipeVersion | null> {
  const { data, error } = await supabase
    .from('recipe_versions')
    .select('*')
    .eq('id', versionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create a new recipe version
 * This should typically be called when updating a recipe to preserve history
 */
export async function createRecipeVersion(
  recipeId: string,
  input: UpdateRecipeInput,
  userId: string,
  options?: {
    change_reason?: string;
    change_notes?: string;
    generated_by_job_id?: string;
    generation_prompt?: string;
    generation_context?: Record<string, any>;
  }
): Promise<{ recipe: Recipe; version: RecipeVersion }> {
  // First, get the current recipe and version
  const currentRecipe = await getRecipeById(recipeId, { includeVersion: true });
  if (!currentRecipe) {
    throw new Error('Recipe not found');
  }

  // Convert auth user ID to profile ID
  // created_by column references profiles(id), not auth.users(id)
  const profileId = await getProfileIdFromAuthUserId(userId);
  
  // For AI recipes, created_by must be NULL (enforced by database constraint)
  // For non-AI recipes, set created_by to null if profile doesn't exist
  const isAIRecipe = currentRecipe.source_type === 'ai';
  const shouldSetCreatedByToNull = !profileId || isAIRecipe;
  
  if (shouldSetCreatedByToNull) {
    if (isAIRecipe) {
      // AI recipes should never have a creator (system-generated)
      console.log('[recipeGeneratorService] AI recipe version - setting created_by to null (required for AI recipes)', {
        recipeId,
        sourceType: currentRecipe.source_type,
      });
    } else if (!profileId) {
      // Non-AI recipe but profile not found
      console.warn('[recipeGeneratorService] No profile found for user when creating version, setting created_by to null', {
        authUserId: userId,
        recipeId,
        sourceType: currentRecipe.source_type,
        action: 'created_by set to null',
        possibleCauses: [
          'incomplete user onboarding',
          'failed profile creation flow',
          'edge case during import',
        ],
      });
    }
  }

  // Determine parent version
  const parentVersionId = currentRecipe.current_version_id || null;
  const nextVersionNumber = currentRecipe.version_count + 1;

  // Build version data from current recipe + updates
  const versionData: any = {
    recipe_id: recipeId,
    version_number: nextVersionNumber,
    parent_version_id: parentVersionId,
    name: input.name ?? currentRecipe.name,
    description: input.description !== undefined ? input.description : currentRecipe.description,
    meal_type: currentRecipe.meal_type,
    servings: input.servings ?? currentRecipe.servings,
    ingredients: input.ingredients ?? currentRecipe.ingredients,
    instructions: input.instructions !== undefined ? input.instructions : currentRecipe.instructions,
    instructions_structured: input.instructions_structured ?? currentRecipe.instructions_structured,
    categories: input.categories ?? currentRecipe.categories,
    cuisine: input.cuisine ?? currentRecipe.cuisine,
    difficulty: input.difficulty ?? currentRecipe.difficulty,
    prep_time: input.prep_time ?? currentRecipe.prep_time,
    cook_time: input.cook_time ?? currentRecipe.cook_time,
    calories: input.calories ?? currentRecipe.calories,
    protein: input.protein ?? currentRecipe.protein,
    carbs: input.carbs ?? currentRecipe.carbs,
    fat: input.fat ?? currentRecipe.fat,
    allergies: input.allergies ?? currentRecipe.allergies,
    dietary_tags: input.dietary_tags ?? currentRecipe.dietary_tags,
    image_url: input.image_url ?? currentRecipe.image_url,
    image_urls: input.image_urls ?? currentRecipe.image_urls,
    change_reason: options?.change_reason || 'user_edit',
    change_notes: options?.change_notes || null,
    generated_by_job_id: options?.generated_by_job_id || null,
    generation_prompt: options?.generation_prompt || null,
    generation_context: options?.generation_context || null,
    created_by: shouldSetCreatedByToNull ? null : profileId, // NULL for AI recipes or if profile not found
  };

  // Create version
  const { data: version, error: versionError } = await supabase
    .from('recipe_versions')
    .insert(versionData)
    .select()
    .single();

  if (versionError) throw versionError;

  // Update recipe with new version and apply changes
  const updateData: any = {
    current_version_id: version.id,
    version_count: nextVersionNumber,
  };

  // Apply updates to recipe
  Object.keys(input).forEach((key) => {
    if (input[key as keyof UpdateRecipeInput] !== undefined) {
      // Special handling for meal_type to ensure it's always an array
      if (key === 'meal_type') {
        const mealTypeValue = input.meal_type;
        if (Array.isArray(mealTypeValue)) {
          // Validate all values are valid
          const validMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
          const invalidTypes = mealTypeValue.filter(mt => !validMealTypes.includes(mt));
          if (invalidTypes.length > 0) {
            throw new Error(`Invalid meal_type values: ${invalidTypes.join(', ')}. Must be one of: ${validMealTypes.join(', ')}.`);
          }
          if (mealTypeValue.length === 0) {
            throw new Error('meal_type array cannot be empty. Must include at least one meal type.');
          }
          updateData[key] = mealTypeValue;
        } else if (mealTypeValue) {
          // Single value - convert to array for backward compatibility
          const validMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
          if (!validMealTypes.includes(mealTypeValue as MealType)) {
            throw new Error(`Invalid meal_type: ${mealTypeValue}. Must be one of: ${validMealTypes.join(', ')}.`);
          }
          updateData[key] = [mealTypeValue as MealType];
        }
      } else {
        updateData[key] = input[key as keyof UpdateRecipeInput];
      }
    }
  });

  const { data: updatedRecipe, error: recipeError } = await supabase
    .from('recipes')
    .update(updateData)
    .eq('id', recipeId)
    .select()
    .single();

  if (recipeError) throw recipeError;

  return {
    recipe: updatedRecipe,
    version: version,
  };
}
