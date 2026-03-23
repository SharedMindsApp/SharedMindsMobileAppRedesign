/**
 * Recipe AI Service
 * 
 * Service for calling Perplexity AI API to generate recipes from internet searches.
 * Integrates with the recipe generator system and ensures ingredients link to pantry.
 * 
 * Uses AI routing system to route requests through configured Perplexity models.
 */

import { generatePerplexityPrompt, generateRecipeVariationsPrompt, processPerplexityResponse, validatePerplexityResponse, type RecipeGenerationRequest, type PerplexityRecipeResponse } from './recipeAIPromptService';
import { createRecipe, type CreateRecipeInput, getProfileIdFromAuthUserId } from './recipeGeneratorService';
import { createRecipeSource } from './recipeGeneratorService';
import type { Recipe, MealType, CuisineType } from './recipeGeneratorTypes';
import { aiRoutingService } from './guardrails/ai/aiRoutingService';
import { getProviderAdapter } from './guardrails/ai/providerFactory';
import type { NormalizedAIRequest } from './guardrails/ai/providerAdapter';
import type { ResolvedRoute } from './guardrails/ai/providerRegistryTypes';
import { normalizeMealCategories, normalizeCuisine, normalizeMealType } from './recipeCategoryNormalizer';
import { normalizeRecipeIngredients, convertPieceUnitsToGrams } from './unitNormalization';
import { supabase } from './supabase';
import { getRuntimeEnvironment, canMakeBrowserCalls } from './runtimeEnvironment';
import { showToast } from '../components/Toast';

export interface RecipeVariation {
  name: string;
  description: string;
  query: string;
}

/**
 * Configuration for Perplexity API
 */
interface PerplexityConfig {
  apiKey?: string; // Optional - will use VITE_PERPLEXITY_API_KEY if not provided
  model?: string; // Default: 'sonar' or 'sonar-pro'
  baseUrl?: string; // Default: 'https://api.perplexity.ai'
}

/**
 * Get Perplexity API key from environment or config
 */
function getPerplexityAPIKey(config?: PerplexityConfig): string {
  // Use provided API key if available
  if (config?.apiKey) {
    return config.apiKey;
  }
  
  // Otherwise, try to get from environment variable
  const envKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
  
  // Debug logging (only in development)
  if (import.meta.env.DEV) {
    console.log('[Perplexity API] Checking for API key:', {
      hasKey: !!envKey,
      keyLength: envKey?.length || 0,
      keyPrefix: envKey?.substring(0, 4) || 'none',
      allEnvKeys: Object.keys(import.meta.env).filter(k => k.includes('PERPLEXITY')),
    });
  }
  
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }
  
  throw new Error(
    'Perplexity API key not found. Please set VITE_PERPLEXITY_API_KEY environment variable ' +
    'in your .env file and restart the development server. ' +
    'Current env check: ' + (envKey ? `Found but empty` : 'Not found in import.meta.env')
  );
}

/**
 * Generate automatic tags for recipes based on meal_type, query, selected tags, and other characteristics
 */
function generateAutomaticTags(
  mealType: string,
  aiGeneratedTags: string[],
  searchQuery: string,
  selectedTags?: string[], // Tags selected by user in the search (e.g., ["asian", "quick-meal"])
  cuisine?: string | null,
  prepTime?: number | null,
  cookTime?: number | null
): string[] {
  const tags = new Set<string>(aiGeneratedTags.map(tag => tag.toLowerCase().trim()));
  
  // CRITICAL: Always add user-selected tags from search (e.g., "asian", "quick-meal")
  // These tags represent the user's intent and should always be included
  if (selectedTags && selectedTags.length > 0) {
    selectedTags.forEach(tag => {
      if (tag && tag.trim().length > 0) {
        tags.add(tag.toLowerCase().trim());
      }
    });
  }
  
  // Always add meal_type as a tag
  if (mealType) {
    tags.add(mealType.toLowerCase());
  }
  
  // Check if recipe is a drink/beverage
  const queryLower = searchQuery.toLowerCase();
  const drinkKeywords = ['drink', 'beverage', 'smoothie', 'juice', 'coffee', 'tea', 'cocktail', 'mocktail', 'shake', 'latte', 'cappuccino', 'soda', 'lemonade', 'iced tea', 'hot chocolate', 'cocoa'];
  const isDrink = drinkKeywords.some(keyword => queryLower.includes(keyword));
  
  if (isDrink) {
    tags.add('drink');
  }
  
  // Add cuisine tag if present
  if (cuisine) {
    tags.add(cuisine.toLowerCase());
  }
  
  // Add time-based tags based on total time
  const totalTime = (prepTime || 0) + (cookTime || 0);
  if (totalTime > 0) {
    if (totalTime <= 15) {
      tags.add('15-min');
      tags.add('quick-meal');
    } else if (totalTime <= 30) {
      tags.add('30-min');
      tags.add('quick-meal');
    }
  }
  
  // Extract tags from search query
  const queryTags = extractTagsFromQuery(searchQuery);
  queryTags.forEach(tag => tags.add(tag));
  
  // Remove empty strings and return as array
  return Array.from(tags).filter(tag => tag.length > 0);
}

/**
 * Extract relevant tags from search query
 */
function extractTagsFromQuery(query: string): string[] {
  const tags: string[] = [];
  const queryLower = query.toLowerCase();
  
  // Meal type keywords
  if (queryLower.includes('breakfast')) tags.push('breakfast');
  if (queryLower.includes('lunch')) tags.push('lunch');
  if (queryLower.includes('dinner')) tags.push('dinner');
  if (queryLower.includes('snack')) tags.push('snack');
  
  // Time/convenience keywords
  if (queryLower.includes('quick') || queryLower.includes('fast')) tags.push('quick-meal');
  if (queryLower.includes('easy')) tags.push('easy');
  if (queryLower.includes('simple')) tags.push('simple');
  if (queryLower.includes('one-pot') || queryLower.includes('one pot')) tags.push('one-pot');
  if (queryLower.includes('one-pan') || queryLower.includes('one pan')) tags.push('one-pan');
  if (queryLower.includes('meal prep') || queryLower.includes('meal-prep')) tags.push('meal-prep');
  
  // Dietary keywords
  if (queryLower.includes('vegan')) tags.push('vegan');
  if (queryLower.includes('vegetarian')) tags.push('vegetarian');
  if (queryLower.includes('gluten-free') || queryLower.includes('gluten free')) tags.push('gluten-free');
  if (queryLower.includes('keto')) tags.push('keto');
  if (queryLower.includes('healthy')) tags.push('healthy');
  
  // Characteristic keywords
  if (queryLower.includes('comfort')) tags.push('comfort-food');
  if (queryLower.includes('spicy')) tags.push('spicy');
  if (queryLower.includes('sweet')) tags.push('sweet');
  if (queryLower.includes('kid-friendly') || queryLower.includes('kid friendly')) tags.push('kid-friendly');
  if (queryLower.includes('family')) tags.push('family-friendly');
  
  return tags;
}

/**
 * Extract JSON from Perplexity response content
 * Handles various formats: direct JSON, JSON in markdown blocks, JSON at end of text
 */
function extractJsonFromPerplexity(content: string): any {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Perplexity response content is empty');
  }

  const trimmed = content.trim();

  // Step 1: Try direct JSON parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to extraction methods
  }

  // Step 2: Try extracting from markdown code blocks
  const markdownJsonMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (markdownJsonMatch) {
    try {
      return JSON.parse(markdownJsonMatch[1]);
    } catch {
      // Continue to next method
    }
  }

  // Step 3: Try extracting JSON object from text (look for { ... } pattern)
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Continue to next method
    }
  }

  // Step 4: Try finding JSON at the end of the response (common pattern)
  const lines = trimmed.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{')) {
      const jsonCandidate = lines.slice(i).join('\n');
      try {
        return JSON.parse(jsonCandidate);
      } catch {
        // Continue searching
      }
    }
  }

  // If all methods fail, throw error
  throw new Error('No valid JSON object found in Perplexity response');
}

/**
 * Determine if Perplexity should be used and how to route it
 */
function shouldUsePerplexity(
  route: ResolvedRoute | null,
  env: ReturnType<typeof getRuntimeEnvironment>
): { ok: boolean; via: 'server-proxy' | 'direct' | null; reason: string } {
  if (!route) {
    return { ok: false, via: null, reason: 'no-route' };
  }
  
  if (route.provider !== 'perplexity') {
    return { ok: false, via: null, reason: 'not-perplexity' };
  }
  
  // CRITICAL: If requiresServerProxy is true, ALWAYS use server proxy
  if (route.requiresServerProxy === true) {
    return { ok: true, via: 'server-proxy', reason: 'requires-server-proxy' };
  }
  
  // CRITICAL: If supportsBrowserCalls is false, ALWAYS use server proxy
  if (route.supportsBrowserCalls === false) {
    return { ok: true, via: 'server-proxy', reason: 'no-browser-calls' };
  }
  
  // If browser calls are supported, check if we can make them
  if (canMakeBrowserCalls(route.requiresServerProxy, route.supportsBrowserCalls)) {
    return { ok: true, via: 'direct', reason: 'browser-calls-supported' };
  }
  
  // Default to server proxy if unsure
  return { ok: true, via: 'server-proxy', reason: 'default-to-proxy' };
}

/**
 * Emit diagnostic event for Perplexity decisions
 */
function emitAIDiagnostic(event: {
  type: string;
  reason: string;
  platform: string;
  provider?: string;
  model?: string;
  routeId?: string;
  via?: string;
  error?: string;
}) {
  // In development, log to console
  if (import.meta.env.DEV) {
    console.warn('[AIDiagnostic]', event);
  }
  
  // In production, could send to telemetry service
  // For now, we'll use the diagnostic in the mobile debug overlay
  if (typeof window !== 'undefined') {
    // Store in sessionStorage for mobile debug overlay
    const diagnostics = JSON.parse(sessionStorage.getItem('ai_diagnostics') || '[]');
    diagnostics.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 10 diagnostics
    const recent = diagnostics.slice(-10);
    sessionStorage.setItem('ai_diagnostics', JSON.stringify(recent));
  }
}

/**
 * Call Perplexity AI API to search and extract recipe information
 * Uses AI routing system to route through configured Perplexity models
 */
export async function callPerplexityAPI(
  prompt: string,
  config?: PerplexityConfig,
  userId?: string,
  spaceId?: string
): Promise<PerplexityRecipeResponse> {
  // Get runtime environment
  const env = getRuntimeEnvironment();
  
  // Initialize diagnostic object
  const perplexityDebug: {
    platform: string;
    isMobile: boolean;
    isBrowser: boolean;
    isServer: boolean;
    supportsBrowserCalls: boolean;
    requiresServerProxy: boolean;
    routeId?: string;
    provider?: string;
    model?: string;
    decision: string;
    via?: string;
  } = {
    platform: env.platform,
    isMobile: env.isMobile,
    isBrowser: env.isBrowser,
    isServer: env.isServer,
    supportsBrowserCalls: false,
    requiresServerProxy: false,
    decision: 'not-evaluated',
  };
  
  // Use AI routing system to get the appropriate Perplexity model
  // This ensures the request goes through the configured route for spaces_recipe_generation
  let route: ResolvedRoute | null = null;
  let isServerOnlyProvider = false;
  
  try {
    route = await aiRoutingService.resolveRoute({
      featureKey: 'spaces_recipe_generation',
      surfaceType: 'shared', // Meal planner is in shared spaces
      intent: 'generate_recipe',
      userId: userId || 'system', // Use system if no user ID provided
    });

    // Populate diagnostic with route info
    perplexityDebug.routeId = route.routeId;
    perplexityDebug.provider = route.provider;
    perplexityDebug.model = route.modelKey;
    perplexityDebug.requiresServerProxy = route.requiresServerProxy === true;
    perplexityDebug.supportsBrowserCalls = route.supportsBrowserCalls !== false;

    // Determine if Perplexity should be used and how
    const shouldUse = shouldUsePerplexity(route, env);
    perplexityDebug.decision = shouldUse.reason;
    perplexityDebug.via = shouldUse.via || undefined;

    // Check if this is a server-only provider (like Perplexity)
    isServerOnlyProvider = route.requiresServerProxy === true || route.supportsBrowserCalls === false;

    console.log('[RecipeAI] Using routed model:', {
      provider: route.provider,
      model: route.modelKey,
      routeId: route.routeId,
      requiresServerProxy: route.requiresServerProxy,
      supportsBrowserCalls: route.supportsBrowserCalls,
      isServerOnly: isServerOnlyProvider,
      decision: shouldUse.reason,
      via: shouldUse.via,
      environment: env,
    });
    
    // If Perplexity should not be used, throw error with diagnostic
    // NOTE: This should rarely happen if routing is configured correctly
    if (!shouldUse.ok) {
      perplexityDebug.decision = `skipped-${shouldUse.reason}`;
      emitAIDiagnostic({
        type: 'perplexity_skipped',
        reason: shouldUse.reason,
        platform: env.platform,
        provider: route.provider,
        model: route.modelKey,
        routeId: route.routeId,
      });
      
      // If route is not Perplexity, that's a configuration issue
      if (shouldUse.reason === 'not-perplexity') {
        throw new Error(
          `Recipe AI route is configured with ${route.provider}, not Perplexity. ` +
          `Please configure a Perplexity route for recipe generation in Admin → AI Feature Routing.`
        );
      }
      
      throw new Error(`Perplexity cannot be used: ${shouldUse.reason}`);
    }
    
    // CRITICAL: Log the routing decision for debugging
    console.log('[RecipeAI] Perplexity routing decision:', {
      decision: shouldUse.reason,
      via: shouldUse.via,
      requiresServerProxy: route.requiresServerProxy,
      supportsBrowserCalls: route.supportsBrowserCalls,
      environment: env,
      debug: perplexityDebug,
    });

    // Get the adapter for the routed provider
    const adapter = getProviderAdapter(route.provider);

    // Build the normalized request
    const systemPrompt = 'You are a recipe extraction assistant. Always return valid JSON only, no markdown formatting, no code blocks. Follow the exact JSON schema provided in the user prompt.';
    
    const normalizedRequest: NormalizedAIRequest = {
      provider: route.provider,
      modelKey: config?.model || route.modelKey, // Use config model if provided, otherwise use routed model
      intent: 'generate_recipe',
      featureKey: 'spaces_recipe_generation',
      surfaceType: 'shared',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      systemPrompt,
      userPrompt: prompt,
      budgets: {
        maxInputTokens: route.constraints.maxContextTokens || 100000,
        maxOutputTokens: route.constraints.maxOutputTokens || 4096,
      },
      temperature: 0.2, // Lower temperature for more consistent JSON output
      maxTokens: 4000,
    };

    console.log('[RecipeAI] Sending request to adapter:', {
      provider: route.provider,
      model: normalizedRequest.modelKey,
      systemPrompt: systemPrompt,
      userPrompt: prompt,
      promptLength: prompt.length,
      messageCount: normalizedRequest.messages.length,
      temperature: normalizedRequest.temperature,
      maxTokens: normalizedRequest.maxTokens,
    });

    // Call the adapter to generate the response
    const response = await adapter.generate(normalizedRequest);
    
    console.log('[RecipeAI] Received raw response from adapter:', {
      hasText: !!response.text,
      textLength: response.text?.length || 0,
      textPreview: response.text?.substring(0, 500) || '(empty)', // First 500 chars for preview
      fullText: response.text, // Full response text for debugging
      responseKeys: Object.keys(response),
      metadata: response.metadata,
    });
    
    // Stage 1: Extract raw content from normalized response
    // Perplexity responses come through the adapter as normalized text
    const rawContent = response.text;
    if (!rawContent || typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      console.error('[RecipeAI] Empty or invalid response from adapter:', {
        hasText: !!response.text,
        textLength: response.text?.length || 0,
        responseKeys: Object.keys(response),
      });
      throw new Error('Perplexity response missing message content');
    }

    // Stage 2: Extract JSON from content (handles various formats)
    let parsed: any;
    try {
      parsed = extractJsonFromPerplexity(rawContent);
      console.log('[RecipeAI] Successfully extracted JSON from response:', {
        hasRecipe: !!parsed?.recipe,
        recipeName: parsed?.recipe?.name,
        mealType: parsed?.recipe?.meal_type,
        ingredientCount: parsed?.recipe?.ingredients?.length || 0,
        parsedJson: parsed, // Full parsed JSON for debugging
      });
    } catch (extractError) {
      console.error('[RecipeAI] Failed to extract JSON from Perplexity response:', {
        error: extractError instanceof Error ? extractError.message : String(extractError),
        contentPreview: rawContent.substring(0, 300),
        contentLength: rawContent.length,
        fullRawContent: rawContent, // Full raw content for debugging
      });
      throw new Error(
        'Perplexity response could not be parsed — invalid JSON format. ' +
        'The AI response may not match the expected recipe format. Please try again.'
      );
    }

    // Stage 3: Validate recipe structure (relaxed validation for search-based LLM)
    if (!validatePerplexityResponse(parsed)) {
      console.error('[RecipeAI] Recipe validation failed:', {
        hasRecipe: !!parsed.recipe,
        hasName: !!parsed.recipe?.name,
        hasIngredients: Array.isArray(parsed.recipe?.ingredients),
        hasInstructions: !!parsed.recipe?.instructions,
        hasInstructionsStructured: !!parsed.recipe?.instructions_structured,
        parsedKeys: Object.keys(parsed),
        recipeKeys: parsed.recipe ? Object.keys(parsed.recipe) : [],
      });
      throw new Error(
        'Perplexity response could not be parsed — check response mapper. ' +
        'The AI response structure does not match the expected recipe format. Please try again or contact support.'
      );
    }

    // Normalize categories from AI response (may be strings that don't match enum)
    // This ensures only valid enum values are passed through
    if (parsed.recipe.categories && Array.isArray(parsed.recipe.categories)) {
      parsed.recipe.categories = normalizeMealCategories(parsed.recipe.categories as string[]);
    }

    // Add metadata about the routing used
    parsed.metadata = parsed.metadata || {};
    parsed.metadata.routed_provider = route.provider;
    parsed.metadata.routed_model = route.modelKey;
    parsed.metadata.route_id = route.routeId;

    return parsed;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Update diagnostic with error
    perplexityDebug.decision = `error-${errorMessage.substring(0, 50)}`;
    
    // If routing fails, check if provider requires server proxy
    // For server-only providers (like Perplexity), NEVER fallback to direct browser calls
    
    // If we already have route info, use it; otherwise try to get it
    if (!route) {
      try {
        route = await aiRoutingService.resolveRoute({
          featureKey: 'spaces_recipe_generation',
          surfaceType: 'shared',
          intent: 'generate_recipe',
          userId: userId || 'system',
        });
        isServerOnlyProvider = route.requiresServerProxy === true || route.supportsBrowserCalls === false;
        
        // Update diagnostic
        perplexityDebug.routeId = route.routeId;
        perplexityDebug.provider = route.provider;
        perplexityDebug.model = route.modelKey;
        perplexityDebug.requiresServerProxy = route.requiresServerProxy === true;
        perplexityDebug.supportsBrowserCalls = route.supportsBrowserCalls !== false;
      } catch (routeError) {
        // If we can't resolve route, assume it might be server-only (safer default for Perplexity)
        // Perplexity is the primary use case, so default to server-only
        isServerOnlyProvider = true;
        perplexityDebug.decision = 'route-resolution-failed';
      }
    }
    
    // Emit diagnostic for the error
    emitAIDiagnostic({
      type: 'perplexity_error',
      reason: perplexityDebug.decision,
      platform: env.platform,
      provider: route?.provider,
      model: route?.modelKey,
      routeId: route?.routeId,
      via: perplexityDebug.via,
      error: errorMessage,
    });
    
    // Log structured warning
    console.warn('[PerplexitySkipped]', perplexityDebug);
    
    // Show user-visible feedback in dev mode
    if (import.meta.env.DEV && env.isMobile) {
      showToast('warning', `Perplexity skipped: ${perplexityDebug.decision}`, 5000);
    }
    
    // Check if it's a routing configuration issue
    if (errorMessage.includes('No route found') || errorMessage.includes('NoRouteFoundError')) {
      console.warn('[RecipeAI] No route configured for spaces_recipe_generation. Please configure a route in Admin → AI Feature Routing.');
      throw new Error(
        'Recipe AI routing not configured. Please set up a route for "Recipe Generation" feature in Admin → AI Feature Routing, ' +
        'or contact your administrator. The route should use a Perplexity model with search capability.'
      );
    }
    
    // Check if it's a response validation error
    if (errorMessage.includes('Invalid response structure') || errorMessage.includes('No content in')) {
      console.error('[RecipeAI] Perplexity response validation failed:', error);
      throw new Error(
        'Perplexity response could not be parsed — check response mapper. ' +
        'The AI response may not match the expected recipe format. Please try again or contact support.'
      );
    }
    
    // For server-only providers, try to fallback to alternative AI provider
    // This ensures mobile users always get results even if Perplexity fails
    if (isServerOnlyProvider) {
      console.error('[RecipeAI] Server-only provider error, attempting fallback to alternative provider:', error);
      
      // Try to get fallback route (routing service will return a different provider if available)
      try {
        // The routing service's getFallbackRoute() returns Anthropic as default
        // We'll try to use that, but first check if we can get any alternative route
        let fallbackRoute: ResolvedRoute | null = null;
        
        // Try to get routes and find a non-Perplexity one
        try {
          // This might return the same route, so we'll use the hardcoded fallback if needed
          const testRoute = await aiRoutingService.resolveRoute({
            featureKey: 'spaces_recipe_generation',
            surfaceType: 'shared',
            intent: 'generate_recipe',
            userId: userId || 'system',
          });
          
          // Only use if it's a different provider
          if (testRoute && testRoute.provider !== 'perplexity') {
            fallbackRoute = testRoute;
          }
        } catch {
          // If route resolution fails, we'll use hardcoded fallback
        }
        
        // Use hardcoded fallback if we don't have a different route
        if (!fallbackRoute) {
          fallbackRoute = {
            provider: 'anthropic',
            modelKey: 'claude-3-5-sonnet-20241022',
            providerModelId: 'fallback',
            routeId: 'fallback',
            constraints: {
              maxContextTokens: 100000,
              maxOutputTokens: 4096,
            },
            capabilities: {
              chat: true,
              reasoning: true,
              vision: true,
              tools: true,
              longContext: true,
              search: false,
            },
            supportsStreaming: true,
            requiresServerProxy: false,
            supportsBrowserCalls: true,
          };
        }
        
        console.log('[RecipeAI] Attempting fallback to alternative provider:', fallbackRoute.provider);
        
        const fallbackAdapter = getProviderAdapter(fallbackRoute.provider);
        const systemPrompt = 'You are a recipe extraction assistant. Always return valid JSON only, no markdown formatting, no code blocks. Follow the exact JSON schema provided in the user prompt.';
        
        const fallbackRequest: NormalizedAIRequest = {
          provider: fallbackRoute.provider,
          modelKey: fallbackRoute.modelKey,
          intent: 'generate_recipe',
          featureKey: 'spaces_recipe_generation',
          surfaceType: 'shared',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          systemPrompt,
          userPrompt: prompt,
          budgets: {
            maxInputTokens: fallbackRoute.constraints.maxContextTokens || 100000,
            maxOutputTokens: fallbackRoute.constraints.maxOutputTokens || 4096,
          },
          temperature: 0.2,
          maxTokens: 4000,
        };
        
        const fallbackResponse = await fallbackAdapter.generate(fallbackRequest);
        const rawContent = fallbackResponse.text;
        
        if (!rawContent || typeof rawContent !== 'string' || rawContent.trim().length === 0) {
          throw new Error('Fallback provider response missing message content');
        }
        
        const parsed = extractJsonFromPerplexity(rawContent);
        if (!validatePerplexityResponse(parsed)) {
          throw new Error('Fallback provider response validation failed');
        }
        
        // Add metadata about fallback
        parsed.metadata = parsed.metadata || {};
        parsed.metadata.routed_provider = fallbackRoute.provider;
        parsed.metadata.routed_model = fallbackRoute.modelKey;
        parsed.metadata.route_id = fallbackRoute.routeId;
        parsed.metadata.fallback_from = 'perplexity';
        parsed.metadata.fallback_reason = errorMessage;
        
        emitAIDiagnostic({
          type: 'perplexity_fallback_used',
          reason: 'perplexity-failed',
          platform: env.platform,
          provider: fallbackRoute.provider,
          model: fallbackRoute.modelKey,
          routeId: fallbackRoute.routeId,
          via: fallbackRoute.requiresServerProxy ? 'server-proxy' : 'direct',
        });
        
        console.log('[RecipeAI] Successfully used fallback provider:', fallbackRoute.provider);
        return parsed;
      } catch (fallbackError) {
        console.error('[RecipeAI] Fallback to alternative provider also failed:', fallbackError);
        emitAIDiagnostic({
          type: 'perplexity_fallback_failed',
          reason: 'fallback-also-failed',
          platform: env.platform,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
      }
      
      // If fallback failed, throw error with diagnostic info
      throw new Error(
        `Recipe generation failed for server-only provider. ` +
        `This provider requires server-side proxy and cannot be called directly from the browser. ` +
        `Error: ${errorMessage}. Please check server configuration or try again.`
      );
    }
    
    // Only allow fallback for browser-capable providers (shouldn't happen for Perplexity)
    // This should never execute for Perplexity, but kept for other providers
    console.warn('[RecipeAI] Routing failed, falling back to direct API call (browser-capable provider):', error);
    
    // Fallback to original direct API call (only for non-Perplexity providers)
    const apiKey = getPerplexityAPIKey(config);
    const model = config?.model || 'sonar';
    const baseUrl = config?.baseUrl || 'https://api.perplexity.ai';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a recipe extraction assistant. Always return valid JSON only, no markdown formatting, no code blocks. Follow the exact JSON schema provided in the user prompt.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonContent);
    if (!validatePerplexityResponse(parsed)) {
      throw new Error('Invalid response structure from Perplexity');
    }

    return parsed;
  }
}

/**
 * Generate a recipe from a search query using Perplexity AI
 * Uses AI routing system to route through configured Perplexity models
 */
/**
 * Convert spaceId to household_id for recipe queries
 * - If space.context_type = 'household', use space.context_id (which is households.id)
 * - If space.context_type = 'personal', return null (personal recipes don't have household_id)
 * - If space doesn't exist or is invalid, return null
 * 
 * Exported for use in components that need to query recipes by space
 */
export async function getHouseholdIdFromSpaceId(spaceId: string | undefined): Promise<string | null> {
  if (!spaceId) return null;

  const { data: space, error } = await supabase
    .from('spaces')
    .select('type')
    .eq('id', spaceId)
    .maybeSingle();

  if (error || !space) {
    console.warn('[recipeAIService] Space not found or error fetching space:', {
      spaceId,
      error: error?.message,
    });
    return null;
  }

  // For household spaces, context_id is the household_id
  if (space.context_type === 'household' && space.context_id) {
    return space.context_id;
  }

  // For personal spaces, household_id should be null
  if (space.context_type === 'personal') {
    return null;
  }

  // For other types (team, etc.), return null for now
  // Recipes might not support team contexts yet
  console.warn('[recipeAIService] Space context type not supported for recipes:', {
    spaceId,
    contextType: space.context_type,
  });
  return null;
}

export async function generateRecipeFromQuery(
  request: RecipeGenerationRequest,
  userId: string,
  spaceId?: string, // Space ID (personal/household/team)
  perplexityConfig?: PerplexityConfig,
  includeLocationInAI: boolean = true // Whether to include location in AI prompts (default: true)
): Promise<Recipe> {
  // Convert spaceId to household_id
  // spaceId is spaces.id, but household_id must reference households.id
  const householdId = await getHouseholdIdFromSpaceId(spaceId);
  
  console.log('[recipeAIService] Space to household conversion:', {
    spaceId,
    householdId,
    isPersonalSpace: householdId === null,
  });

  // For AI recipes in personal spaces (householdId is NULL), we need created_for_profile_id
  // This allows RLS to grant access without requiring created_by (which must be NULL for AI recipes)
  // 
  // CRITICAL: Always use getActiveUserProfile() to ensure profile ownership
  // Never trust profile IDs from UI context or other sources
  let createdForProfileId: string | null = null;
  if (householdId === null) {
    // Personal space: resolve the user's active profile
    // This ensures created_for_profile_id always belongs to auth.uid()
    try {
      const { getActiveUserProfileId } = await import('./profiles/getActiveUserProfile');
      const profileId = await getActiveUserProfileId();
      
      // Defensive check: verify the resolved profile ID
      if (!profileId) {
        throw new Error('Cannot create personal AI recipe: active user profile not found');
      }
      
      createdForProfileId = profileId;
      console.log('[recipeAIService] AI recipe in personal space - resolved active profile', {
        userId,
        resolvedProfileId: createdForProfileId,
        spaceId,
        householdId,
        note: 'created_for_profile_id is guaranteed to belong to auth.uid()',
      });
    } catch (error) {
      console.error('[recipeAIService] Failed to resolve active user profile for personal AI recipe:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        spaceId,
        householdId,
        action: 'blocking recipe insert to prevent RLS violation',
      });
      throw error instanceof Error 
        ? error 
        : new Error('Cannot create personal AI recipe: failed to resolve user profile');
    }
  }

  // Generate the prompt - location inclusion is controlled by user preference
  const prompt = generatePerplexityPrompt(request, includeLocationInAI);
  
  console.log('[recipeAIService] Generated prompt for Perplexity:', {
    promptLength: prompt.length,
    request: {
      query: request.query,
      mealType: request.meal_type,
      cuisine: request.cuisine,
      dietaryRestrictions: request.dietary_restrictions,
      servings: request.servings,
    },
    prompt: prompt, // Full prompt for debugging
  });

  // Call Perplexity API through AI routing system
  const perplexityResponse = await callPerplexityAPI(prompt, perplexityConfig, userId, spaceId);
  
  console.log('[recipeAIService] Received response from Perplexity:', {
    hasResponse: !!perplexityResponse,
    recipeName: perplexityResponse?.recipe?.name,
    mealType: perplexityResponse?.recipe?.meal_type,
    ingredientCount: perplexityResponse?.recipe?.ingredients?.length || 0,
    confidenceScore: perplexityResponse?.metadata?.confidence_score,
    sources: perplexityResponse?.metadata?.sources,
    fullResponse: perplexityResponse, // Full response for debugging
  });

  // Process response and map ingredients to food_item_ids
  const processed = await processPerplexityResponse(perplexityResponse, spaceId);

  // Create recipe source
  const source = await createRecipeSource({
    source_type: 'ai',
    source_name: perplexityResponse.metadata.sources[0] || 'Perplexity AI',
    source_url: processed.recipe.source_url || null,
    metadata: {
      perplexity_confidence: perplexityResponse.metadata.confidence_score,
      sources: perplexityResponse.metadata.sources,
      extraction_method: perplexityResponse.metadata.extraction_method,
      generation_request: request,
      recipe_hash: processed.metadata.recipe_hash, // Store hash for deduplication
    },
    trust_score: perplexityResponse.metadata.confidence_score,
    requires_validation: perplexityResponse.metadata.confidence_score < 0.7,
  });

  // 🚨 CRITICAL: Validate required fields before proceeding
  // This prevents schema violations that Supabase reports as RLS errors
  if (!processed.recipe.name || typeof processed.recipe.name !== 'string' || processed.recipe.name.trim().length === 0) {
    console.error('[recipeAIService] Invalid AI recipe: missing or empty name', {
      recipeName: processed.recipe.name,
      recipeType: typeof processed.recipe.name,
      fullRecipe: processed.recipe,
    });
    throw new Error('Invalid AI recipe: missing or empty name. The recipe must have a valid name.');
  }

  // Normalize and validate meal_type
  // Handle both single values and arrays from AI response
  let normalizedMealTypeArray: MealType[];
  if (Array.isArray(processed.recipe.meal_type)) {
    // Already an array - normalize each value
    const normalized = processed.recipe.meal_type
      .map(mt => normalizeMealType(mt))
      .filter((mt): mt is MealType => mt !== null);
    
    if (normalized.length === 0) {
      console.error('[recipeAIService] Invalid AI recipe: no valid meal_type values in array', {
        providedMealType: processed.recipe.meal_type,
        fullRecipe: processed.recipe,
      });
      throw new Error(
        `Invalid AI recipe: no valid meal_type values in array. ` +
        `Provided: ${JSON.stringify(processed.recipe.meal_type)}. ` +
        `Must be one of: breakfast, lunch, dinner, snack, or drink.`
      );
    }
    normalizedMealTypeArray = normalized;
  } else {
    // Single value - normalize and convert to array
    const normalizedMealType = normalizeMealType(processed.recipe.meal_type);
    if (!normalizedMealType) {
      console.error('[recipeAIService] Invalid AI recipe: missing or invalid meal_type', {
        providedMealType: processed.recipe.meal_type,
        normalizedMealType,
        fullRecipe: processed.recipe,
      });
      throw new Error(
        `Invalid AI recipe: missing or invalid meal_type. ` +
        `Provided: "${processed.recipe.meal_type}". ` +
        `Must be one of: breakfast, lunch, dinner, snack, or drink.`
      );
    }
    normalizedMealTypeArray = [normalizedMealType];
  }

  // Normalize ingredient units to canonical metric format before saving
  let normalizedIngredients = normalizeRecipeIngredients(processed.recipe.ingredients);
  
  // Convert piece-based units to grams where possible
  // Add ingredient names to the normalized ingredients for conversion
  // Use original perplexityResponse to get ingredient names (before food_item_id mapping)
  const ingredientsWithNames = normalizedIngredients.map((ing, index) => {
    const originalIngredient = perplexityResponse.recipe.ingredients[index];
    // Get food item name from the original ingredient (before mapping to food_item_id)
    const foodItemName = originalIngredient?.name || '';
    return {
      ...ing,
      name: foodItemName,
    };
  });
  
  normalizedIngredients = await convertPieceUnitsToGrams(ingredientsWithNames);

  // Create recipe input with validated and normalized fields
  const recipeInput: CreateRecipeInput = {
    name: processed.recipe.name.trim(), // Ensure no leading/trailing whitespace
    description: processed.recipe.description || null,
    meal_type: normalizedMealTypeArray, // Use normalized meal_type array
    servings: processed.recipe.servings,
    ingredients: normalizedIngredients,
    instructions: processed.recipe.instructions || null,
    instructions_structured: processed.recipe.instructions_structured
      ? { steps: processed.recipe.instructions_structured }
      : null,
    // Normalize AI-provided categories to valid enum values
    // Unknown categories are dropped (never cause insert failures)
    categories: normalizeMealCategories(processed.recipe.categories),
    // Normalize AI-provided cuisine to valid enum value
    // Unknown cuisines are set to null (never cause insert failures)
    cuisine: normalizeCuisine(processed.recipe.cuisine) || null,
    difficulty: processed.recipe.difficulty || 'medium',
    prep_time: processed.recipe.prep_time_minutes || null,
    cook_time: processed.recipe.cook_time_minutes || null,
    total_time: (processed.recipe.prep_time_minutes && processed.recipe.cook_time_minutes) 
      ? (processed.recipe.prep_time_minutes + processed.recipe.cook_time_minutes)
      : (processed.recipe.prep_time_minutes || processed.recipe.cook_time_minutes || null), // Calculate total time, or use single value if only one exists
    calories: processed.recipe.nutrition?.calories || null,
    protein: processed.recipe.nutrition?.protein_grams || null,
    carbs: processed.recipe.nutrition?.carbs_grams || null,
    fat: processed.recipe.nutrition?.fat_grams || null,
    fiber: processed.recipe.nutrition?.fiber_grams || null,
    sodium: processed.recipe.nutrition?.sodium_mg || null,
    allergies: processed.recipe.allergies || [],
    dietary_tags: generateAutomaticTags(
      processed.recipe.meal_type,
      processed.recipe.dietary_tags || [],
      request.query,
      request.selected_tags, // Pass selected tags from search - these will always be included
      processed.recipe.cuisine,
      processed.recipe.prep_time_minutes,
      processed.recipe.cook_time_minutes
    ),
    image_url: processed.recipe.image_url || null,
    source_type: 'ai',
    source_id: source.id,
    source_url: processed.recipe.source_url || null,
    household_id: householdId, // Converted from spaceId (space.context_id for household spaces)
    created_for_profile_id: createdForProfileId, // Set for AI recipes in personal spaces (householdId is NULL)
    is_public: false,
    validation_status: perplexityResponse.metadata.confidence_score >= 0.7 ? 'pending' : 'draft',
  };

  // Create the recipe
  const recipe = await createRecipe(recipeInput, userId);

  return recipe;
}

/**
 * Generate recipe variations (e.g., 5 different pizza types)
 * Returns an array of recipe variation suggestions without generating full recipes
 */
export async function generateRecipeVariations(
  baseQuery: string,
  mealType?: MealType,
  cuisine?: CuisineType,
  dietaryRequirements?: string[],
  userId?: string,
  spaceId?: string,
  foodProfile?: import('./foodProfileTypes').UserFoodProfile | null,
  location?: string | null,
  selectedTags?: string[], // Tags selected by user for this meal type (e.g., ["quick-meal", "vegetarian"])
  includeLocationInAI: boolean = true, // Whether to include location in AI prompts (default: true)
  courseType?: 'starter' | 'side' | 'main' | 'dessert' | 'shared' | 'snack' // Course/dish type (e.g., "dessert", "starter")
): Promise<RecipeVariation[]> {
  // Generate prompt for variations (food profile constraints will be applied when generating actual recipes)
  // Include selected tags and course type in the prompt to tailor suggestions
  const prompt = generateRecipeVariationsPrompt(baseQuery, mealType, cuisine, dietaryRequirements, location, selectedTags, includeLocationInAI, courseType);

  try {
    // Use AI routing to get Perplexity adapter
    const route = await aiRoutingService.resolveRoute({
      featureKey: 'spaces_recipe_generation',
      surfaceType: 'shared',
      intent: 'generate_recipe',
      userId: userId || 'system',
    });

    const adapter = getProviderAdapter(route.provider);
    
    const systemPrompt = 'You are a FOOD and DRINK recipe suggestion assistant. You MUST ONLY suggest edible food recipes and drink recipes that can be prepared in a kitchen. NEVER suggest non-food items like LED bulbs, appliances, furniture, or any products that cannot be eaten or drunk. Return ONLY valid JSON arrays, no markdown, no code blocks.';
    
    const normalizedRequest: NormalizedAIRequest = {
      provider: route.provider,
      modelKey: route.modelKey,
      intent: 'generate_recipe',
      featureKey: 'spaces_recipe_generation',
      surfaceType: 'shared',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      systemPrompt,
      userPrompt: prompt,
      budgets: {
        maxInputTokens: route.constraints.maxContextTokens || 100000,
        maxOutputTokens: route.constraints.maxOutputTokens || 4096,
      },
      temperature: 0.7,
      maxTokens: 2000,
    };

    const response = await adapter.generate(normalizedRequest);

    // Extract raw content from normalized response (use text, not content)
    const rawContent = response.text;
    if (!rawContent || typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      console.error('[recipeAIService] Empty or invalid response from adapter:', {
        hasText: !!response.text,
        textLength: response.text?.length || 0,
        responseKeys: Object.keys(response),
      });
      return generateFallbackVariations(baseQuery);
    }

    // Extract JSON array from content (handles various formats)
    // Helper function to check if a variation is a food/drink recipe
    const isFoodVariation = (variation: RecipeVariation): boolean => {
      const text = `${variation.name} ${variation.description || ''}`.toLowerCase();
      
      // Non-food keywords that should be rejected
      const nonFoodKeywords = [
        'led bulb', 'light bulb', 'light fixture', 'lighting', 'lamp', 'light switch',
        'electrical', 'appliance', 'furniture', 'hardware', 'tool', 'gadget',
        'product listing', 'buy', 'purchase', 'price', 'watt', 'voltage', 'lumens',
        'socket', 'fixture', 'wiring', 'circuit', 'electrical item', 'home improvement',
        'lighting solution', 'bulb type', 'bulb size', 'bulb wattage', 'bayonet cap',
        'edison screw', 'gu10', 'mr16', 'b22', 'e27', 'philips hue', 'smart bulb'
      ];
      
      // Food/drink keywords that indicate it's a recipe
      const foodKeywords = [
        'recipe', 'dish', 'meal', 'food', 'drink', 'beverage', 'smoothie', 'juice',
        'salad', 'soup', 'curry', 'pasta', 'pizza', 'dessert', 'cake', 'bread',
        'chicken', 'beef', 'fish', 'vegetable', 'fruit', 'ingredient', 'cook', 'bake',
        'prepare', 'serve', 'taste', 'flavor', 'cuisine', 'dining', 'eating'
      ];
      
      // Check for non-food keywords
      if (nonFoodKeywords.some(keyword => text.includes(keyword))) {
        return false;
      }
      
      // Check for food keywords (at least one should be present)
      return foodKeywords.some(keyword => text.includes(keyword));
    };

    let parsed: RecipeVariation[];
    try {
      const trimmed = rawContent.trim();
      
      // Step 1: Try direct JSON parse (array)
      try {
        const direct = JSON.parse(trimmed);
        if (Array.isArray(direct)) {
          parsed = direct;
        } else if (direct && typeof direct === 'object' && Array.isArray(direct.variations)) {
          parsed = direct.variations;
        } else if (direct && typeof direct === 'object' && Array.isArray(direct.data)) {
          parsed = direct.data;
        } else {
          throw new Error('Direct parse did not yield an array');
        }
      } catch {
        // Step 2: Try extracting from markdown code blocks (array)
        const markdownArrayMatch = trimmed.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (markdownArrayMatch) {
          try {
            parsed = JSON.parse(markdownArrayMatch[1]);
            if (!Array.isArray(parsed)) throw new Error('Not an array');
          } catch {
            // Continue to next method
          }
        }
        
        // Step 3: Try extracting JSON array from text (look for [ ... ] pattern)
        if (!parsed) {
          const jsonArrayMatch = trimmed.match(/\[[\s\S]*\]/);
          if (jsonArrayMatch) {
            try {
              parsed = JSON.parse(jsonArrayMatch[0]);
              if (!Array.isArray(parsed)) throw new Error('Not an array');
            } catch {
              // Continue to next method
            }
          }
        }
        
        // Step 4: Try finding JSON array at the end of the response
        if (!parsed) {
          const lines = trimmed.split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('[')) {
              const jsonCandidate = lines.slice(i).join('\n');
              try {
                parsed = JSON.parse(jsonCandidate);
                if (Array.isArray(parsed)) break;
              } catch {
                // Continue searching
              }
            }
          }
        }
        
        if (!parsed || !Array.isArray(parsed)) {
          throw new Error('No valid JSON array found in response');
        }
      }
      
      // Success - parsed array extracted
    } catch (extractError) {
      console.error('[recipeAIService] Failed to extract JSON array from variations response:', {
        error: extractError instanceof Error ? extractError.message : String(extractError),
        rawContentPreview: rawContent.substring(0, 500),
        rawContentLength: rawContent.length,
        fullRawContent: rawContent,
      });
      return generateFallbackVariations(baseQuery);
    }

    // Filter out non-food variations before validation
    const filteredVariations = parsed.filter(isFoodVariation);
    
    if (filteredVariations.length === 0) {
      console.warn('[recipeAIService] All variations were filtered out as non-food items. Using fallback.');
      return generateFallbackVariations(baseQuery);
    }
    
    if (filteredVariations.length < parsed.length) {
      console.warn('[recipeAIService] Filtered out', parsed.length - filteredVariations.length, 'non-food variations:', {
        total: parsed.length,
        filtered: filteredVariations.length,
        rejected: parsed.filter(v => !isFoodVariation(v)).map(v => v.name),
      });
    }
    
    const variations = filteredVariations;
    
    // Validate and clean variations
    const validVariations = variations
      .filter(v => v && v.name && v.query)
      .slice(0, 5) // Limit to 5 variations
      .map(v => ({
        name: v.name.trim(),
        description: (v.description || '').trim(),
        query: v.query.trim() || v.name.trim(),
      }));

    // Successfully parsed variations - no need to log

    return validVariations.length > 0 ? validVariations : generateFallbackVariations(baseQuery);
  } catch (error) {
    console.error('[recipeAIService] Error generating variations:', error);
    return generateFallbackVariations(baseQuery);
  }
}

/**
 * Generate fallback variations when AI fails
 */
function generateFallbackVariations(baseQuery: string): RecipeVariation[] {
  const query = baseQuery.toLowerCase().trim();
  
  // Common variations for popular foods
  const variationMap: Record<string, string[]> = {
    pizza: ['Margherita Pizza', 'Pepperoni Pizza', 'Hawaiian Pizza', 'BBQ Chicken Pizza', 'Vegetarian Pizza'],
    'ice cream': ['Vanilla Ice Cream', 'Chocolate Ice Cream', 'Strawberry Ice Cream', 'Cookies and Cream Ice Cream', 'Mint Chocolate Chip Ice Cream'],
    pasta: ['Spaghetti Carbonara', 'Fettuccine Alfredo', 'Penne Arrabbiata', 'Lasagna', 'Penne alla Vodka'],
    curry: ['Chicken Curry', 'Vegetable Curry', 'Thai Green Curry', 'Butter Chicken', 'Lamb Curry'],
    soup: ['Tomato Soup', 'Chicken Noodle Soup', 'Minestrone Soup', 'French Onion Soup', 'Cream of Mushroom Soup'],
    salad: ['Caesar Salad', 'Greek Salad', 'Caprese Salad', 'Cobb Salad', 'Waldorf Salad'],
  };

  // Check for exact match
  if (variationMap[query]) {
    return variationMap[query].map(name => ({
      name,
      description: `A delicious ${name.toLowerCase()}`,
      query: name,
    }));
  }

  // Check for partial match
  for (const [key, variations] of Object.entries(variationMap)) {
    if (query.includes(key) || key.includes(query)) {
      return variations.map(name => ({
        name,
        description: `A delicious ${name.toLowerCase()}`,
        query: name,
      }));
    }
  }

  // Default: return generic variations
  return [
    { name: `Classic ${baseQuery}`, description: `Traditional ${baseQuery} recipe`, query: `classic ${baseQuery}` },
    { name: `Easy ${baseQuery}`, description: `Simple ${baseQuery} recipe`, query: `easy ${baseQuery}` },
    { name: `Quick ${baseQuery}`, description: `Fast ${baseQuery} recipe`, query: `quick ${baseQuery}` },
    { name: `Healthy ${baseQuery}`, description: `Healthy ${baseQuery} recipe`, query: `healthy ${baseQuery}` },
    { name: `Gourmet ${baseQuery}`, description: `Premium ${baseQuery} recipe`, query: `gourmet ${baseQuery}` },
  ];
}

/**
 * Batch generate multiple recipes
 */
export async function generateRecipesBatch(
  requests: RecipeGenerationRequest[],
  userId: string,
  spaceId?: string, // Space ID (personal/household/team)
  perplexityConfig?: PerplexityConfig
): Promise<Recipe[]> {
  const recipes: Recipe[] = [];

  // Process requests sequentially to avoid rate limits
  for (const request of requests) {
    try {
      const recipe = await generateRecipeFromQuery(request, userId, spaceId, perplexityConfig);
      recipes.push(recipe);
    } catch (error) {
      console.error(`Error generating recipe for "${request.query}":`, error);
      // Continue with other recipes even if one fails
    }
  }

  return recipes;
}
