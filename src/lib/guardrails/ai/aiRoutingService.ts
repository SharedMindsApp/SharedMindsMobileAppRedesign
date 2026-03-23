import { supabase } from '../../supabase';
import { validateModelForFeature } from './featureRegistry';
import type {
  ResolvedRoute,
  RouteResolutionRequest,
  AIFeatureRoute,
  AIProviderModel,
  AIProvider,
  SurfaceType,
  FeatureKey,
} from './providerRegistryTypes';
import { INTENT_TO_FEATURE_MAP } from './providerRegistryTypes';
import { NoRouteFoundError as NoRouteError } from './aiErrorTypes';

interface RouteCandidate {
  route: AIFeatureRoute;
  model: AIProviderModel;
  provider: AIProvider;
  specificity: number;
}

export class NoRouteFoundError extends NoRouteError {
  constructor(featureKey: FeatureKey, surfaceType?: SurfaceType) {
    super(featureKey, undefined, `No enabled route found for feature "${featureKey}"${surfaceType ? ` on surface "${surfaceType}"` : ''}`);
  }
}

export class AIRoutingService {
  async resolveRoute(request: RouteResolutionRequest): Promise<ResolvedRoute> {
    const featureKey = request.featureKey || this.inferFeatureFromIntent(request.intent);

    if (!featureKey) {
      console.error('[AI ROUTING] Unable to determine feature key', {
        intent: request.intent,
        featureKey: request.featureKey,
      });
      throw new Error('Unable to determine feature key from request');
    }

    const candidates = await this.fetchRouteCandidates(
      featureKey,
      request.surfaceType,
      request.projectId
    );

    if (candidates.length === 0) {
      console.warn('[AI ROUTING] No routes found, using fallback', {
        featureKey,
        surfaceType: request.surfaceType,
      });
      return this.getFallbackRoute();
    }

    const validCandidates = this.filterByIntent(candidates, request.intent);

    if (validCandidates.length === 0) {
      console.warn('[AI ROUTING] No route matching intent, using any available candidate', {
        intent: request.intent,
        featureKey,
      });
      const bestCandidate = this.selectBestRoute(candidates);
      return this.buildResolvedRoute(bestCandidate);
    }

    const bestCandidate = this.selectBestRoute(validCandidates);
    return this.buildResolvedRoute(bestCandidate);
  }

  private async fetchRouteCandidates(
    featureKey: FeatureKey,
    surfaceType?: SurfaceType,
    projectId?: string
  ): Promise<RouteCandidate[]> {
    const { data: routes, error } = await supabase
      .from('ai_feature_routes')
      .select(
        `
        *,
        provider_model:ai_provider_models(
          *,
          provider:ai_providers(*)
        )
      `
      )
      .eq('feature_key', featureKey)
      .eq('is_enabled', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Failed to fetch routes:', error);
      throw new Error(`Failed to fetch routes: ${error.message}`);
    }

    if (!routes || routes.length === 0) {
      return [];
    }

    const candidates: RouteCandidate[] = [];

    for (const route of routes) {
      const model = route.provider_model as any;
      if (!model || !model.is_enabled) continue;

      const provider = model.provider as any;
      if (!provider || !provider.is_enabled) continue;

      // Validate model capabilities match feature requirements
      const mappedModel = this.mapModelFromDB(model);
      const capabilityValidation = validateModelForFeature(mappedModel.capabilities, featureKey);
      
      if (!capabilityValidation.valid) {
        console.warn('[AI ROUTING] Model does not have required capabilities', {
          featureKey,
          modelId: mappedModel.id,
          modelKey: mappedModel.modelKey,
          missingCapabilities: capabilityValidation.missingCapabilities,
          modelCapabilities: mappedModel.capabilities,
        });
        continue; // Skip this route - model doesn't have required capabilities
      }

      let specificity = 0;

      if (route.master_project_id === projectId) {
        specificity = 3;
      } else if (route.master_project_id) {
        continue;
      }

      if (route.surface_type === surfaceType) {
        specificity += 2;
      } else if (route.surface_type !== null) {
        continue;
      } else {
        specificity += 1;
      }

      candidates.push({
        route: this.mapRouteFromDB(route),
        model: mappedModel,
        provider: this.mapProviderFromDB(provider),
        specificity,
      });
    }

    // Capability validation complete - no need to log unless there's an issue

    return candidates;
  }

  private filterByIntent(candidates: RouteCandidate[], intent?: string): RouteCandidate[] {
    if (!intent) return candidates;

    return candidates.filter((candidate) => {
      const constraints = candidate.route.constraints;

      if (constraints.disallowedIntents?.includes(intent)) {
        return false;
      }

      if (
        constraints.allowedIntents &&
        constraints.allowedIntents.length > 0 &&
        !constraints.allowedIntents.includes(intent)
      ) {
        return false;
      }

      return true;
    });
  }

  private selectBestRoute(candidates: RouteCandidate[]): RouteCandidate {
    candidates.sort((a, b) => {
      if (a.specificity !== b.specificity) {
        return b.specificity - a.specificity;
      }

      if (a.route.priority !== b.route.priority) {
        return b.route.priority - a.route.priority;
      }

      if (a.route.isFallback !== b.route.isFallback) {
        return a.route.isFallback ? 1 : -1;
      }

      return 0;
    });

    return candidates[0];
  }

  private buildResolvedRoute(candidate: RouteCandidate): ResolvedRoute {
    return {
      provider: candidate.provider.name,
      modelKey: candidate.model.modelKey,
      providerModelId: candidate.model.id,
      routeId: candidate.route.id,
      constraints: candidate.route.constraints,
      capabilities: candidate.model.capabilities,
      supportsStreaming: candidate.provider.supportsStreaming,
      requiresServerProxy: candidate.provider.requiresServerProxy,
      supportsBrowserCalls: candidate.provider.supportsBrowserCalls,
    };
  }

  private inferFeatureFromIntent(intent?: string): FeatureKey | null {
    if (!intent) return null;
    return INTENT_TO_FEATURE_MAP[intent] || null;
  }

  private async getFallbackRoute(): Promise<ResolvedRoute> {
    console.warn('Using hardcoded fallback route: Claude 3.5 Sonnet');

    return {
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
      },
      supportsStreaming: true,
      requiresServerProxy: false, // Anthropic supports browser calls
      supportsBrowserCalls: true,
    };
  }

  private mapRouteFromDB(data: any): AIFeatureRoute {
    return {
      id: data.id,
      featureKey: data.feature_key,
      surfaceType: data.surface_type,
      masterProjectId: data.master_project_id,
      providerModelId: data.provider_model_id,
      isFallback: data.is_fallback,
      priority: data.priority,
      constraints: data.constraints || {},
      isEnabled: data.is_enabled,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapModelFromDB(data: any): AIProviderModel {
    // Trim model keys when mapping from database to sanitize any existing bad data
    // OpenAI API rejects model identifiers with leading/trailing whitespace
    const rawCapabilities = data.capabilities || {};
    
    // Normalize capabilities to ensure all fields are properly set
    // This is critical for capability validation to work correctly
    const normalizedCapabilities = {
      chat: rawCapabilities.chat || false,
      reasoning: rawCapabilities.reasoning || false,
      vision: rawCapabilities.vision || false,
      search: rawCapabilities.search || false, // CRITICAL: Perplexity models need this
      longContext: rawCapabilities.longContext || rawCapabilities.long_context || false,
      tools: rawCapabilities.tools || false,
    };
    
    return {
      id: data.id,
      providerId: data.provider_id,
      modelKey: (data.model_key || '').trim(),
      displayName: data.display_name,
      modelType: (data.model_type || 'language_model') as 'language_model' | 'search_ai',
      capabilities: normalizedCapabilities,
      contextWindowTokens: data.context_window_tokens,
      maxOutputTokens: data.max_output_tokens,
      costInputPer1M: data.cost_input_per_1m,
      costOutputPer1M: data.cost_output_per_1m,
      reasoningLevel: data.reasoning_level || null,
      isEnabled: data.is_enabled,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapProviderFromDB(data: any): AIProvider {
    return {
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      isEnabled: data.is_enabled,
      supportsTools: data.supports_tools,
      supportsStreaming: data.supports_streaming,
      requiresServerProxy: data.requires_server_proxy || false,
      supportsBrowserCalls: data.supports_browser_calls !== false, // Default to true if not set
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const aiRoutingService = new AIRoutingService();
