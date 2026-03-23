import { useState, useEffect, useMemo } from 'react';
import { Settings, Plus, Trash2, Edit, MessageSquare, FileEdit, FileText, Clock, Brain, ListTodo, UtensilsCrossed, FileType, CheckSquare, Lightbulb, ChevronDown, ChevronRight, Target, Layers, ShoppingCart, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from './AdminLayout';
import type { AIFeatureRoute, AIProviderModel, RouteConstraints, SurfaceType, FeatureKey } from '../../lib/guardrails/ai/providerRegistryTypes';
import { FEATURE_KEYS } from '../../lib/guardrails/ai/providerRegistryTypes';
import { FEATURE_REGISTRY, validateModelForFeature } from '../../lib/guardrails/ai/featureRegistry';

interface FeatureRouteWithModel extends AIFeatureRoute {
  model?: AIProviderModel & { providerName?: string };
}

interface AddRouteModalData {
  featureKey: FeatureKey;
  surfaceType: SurfaceType | null;
  providerModelId: string;
  priority: number;
  constraints: RouteConstraints;
}

function getFeatureIcon(featureKey: string) {
  const iconMap: Record<string, any> = {
    'ai_chat': MessageSquare,
    'draft_generation': FileEdit,
    'project_summary': FileText,
    'deadline_analysis': Clock,
    'mind_mesh_explain': Brain,
    'taskflow_assist': ListTodo,
    'spaces_meal_planner': UtensilsCrossed,
    'spaces_notes_assist': FileType,
    'spaces_recipe_generation': UtensilsCrossed,
    'spaces_grocery_assist': ShoppingCart,
    'reality_check_assist': CheckSquare,
    'offshoot_analysis': Lightbulb,
    'reality_check_initial': CheckSquare,
    'reality_check_secondary': CheckSquare,
    'reality_check_detailed': CheckSquare,
    'reality_check_reframe': RefreshCw,
    'intelligent_todo': ListTodo,
  };
  return iconMap[featureKey] || Target;
}

function getFeatureLabel(featureKey: string): string {
  const labelMap: Record<string, string> = {
    'ai_chat': 'AI Chat',
    'draft_generation': 'Draft Generation',
    'project_summary': 'Project Summary',
    'deadline_analysis': 'Deadline Analysis',
    'mind_mesh_explain': 'Mind Mesh Explain',
    'taskflow_assist': 'Task Flow Assist',
    'spaces_meal_planner': 'Meal Planner',
    'spaces_notes_assist': 'Notes Assist',
    'spaces_recipe_generation': 'Recipe Generation',
    'spaces_grocery_assist': 'Grocery List Assistant',
    'reality_check_assist': 'Reality Check',
    'offshoot_analysis': 'Offshoot Analysis',
    'reality_check_initial': 'Initial Reality Check',
    'reality_check_secondary': 'Secondary Reality Check',
    'reality_check_detailed': 'Detailed Reality Check',
    'reality_check_reframe': 'Reality Check Reframe',
    'intelligent_todo': 'Intelligent Todo Breakdown',
  };
  return labelMap[featureKey] || featureKey;
}

function CapabilitiesReferenceCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const features = Object.values(FEATURE_REGISTRY);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Settings size={20} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-blue-900">Capability Requirements Reference</h3>
            <p className="text-xs text-blue-700 mt-0.5">
              See which capabilities each feature needs
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown size={20} className="text-blue-700" />
        ) : (
          <ChevronRight size={20} className="text-blue-700" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-blue-200 bg-white p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const Icon = getFeatureIcon(feature.key);
                    return <Icon size={16} className="text-blue-600" />;
                  })()}
                  <h4 className="font-semibold text-gray-900 text-sm">{feature.label}</h4>
                </div>
                <p className="text-xs text-gray-600 mb-2">{feature.description}</p>
                <div className="flex flex-wrap gap-1">
                  {feature.requiredCapabilities.map((cap) => (
                    <span
                      key={cap}
                      className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>Tip:</strong> When adding or editing models in AI Providers, make sure to enable the required capabilities. Only enabled models with matching capabilities will appear when creating routes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminAIRoutingPage() {
  const [routes, setRoutes] = useState<FeatureRouteWithModel[]>([]);
  const [models, setModels] = useState<(AIProviderModel & { providerName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [editingRoute, setEditingRoute] = useState<FeatureRouteWithModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadRoutes(), loadModels()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadRoutes() {
    const { data, error } = await supabase
      .from('ai_feature_routes')
      .select(
        `
        *,
        provider_model:ai_provider_models(
          *,
          provider:ai_providers(name, display_name)
        )
      `
      )
      .order('feature_key')
      .order('priority', { ascending: false });

    if (error) {
      console.error('Failed to load routes:', error);
      return;
    }

    setRoutes(
      (data || []).map((r: any) => ({
        id: r.id,
        featureKey: r.feature_key,
        surfaceType: r.surface_type,
        masterProjectId: r.master_project_id,
        providerModelId: r.provider_model_id,
        isFallback: r.is_fallback,
        priority: r.priority,
        constraints: r.constraints || {},
        isEnabled: r.is_enabled,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        model: r.provider_model
          ? {
              id: r.provider_model.id,
              providerId: r.provider_model.provider_id,
              modelKey: r.provider_model.model_key,
              displayName: r.provider_model.display_name,
              modelType: (r.provider_model.model_type || 'language_model') as 'language_model' | 'search_ai',
              capabilities: r.provider_model.capabilities || {},
              contextWindowTokens: r.provider_model.context_window_tokens,
              maxOutputTokens: r.provider_model.max_output_tokens,
              costInputPer1M: r.provider_model.cost_input_per_1m,
              costOutputPer1M: r.provider_model.cost_output_per_1m,
              isEnabled: r.provider_model.is_enabled,
              createdAt: r.provider_model.created_at,
              updatedAt: r.provider_model.updated_at,
              providerName: r.provider_model.provider?.display_name,
            }
          : undefined,
      }))
    );
  }

  async function loadModels() {
    const { data, error } = await supabase
      .from('ai_provider_models')
      .select('*, provider:ai_providers(id, name, display_name, is_enabled)')
      .eq('is_enabled', true);

    if (error) {
      console.error('[AdminAIRouting] Failed to load models:', error);
      return;
    }

    const mappedModels = (data || [])
      .filter((m: any) => m.provider?.is_enabled === true)
      .map((m: any) => {
        const rawCapabilities = m.capabilities || {};

        const normalizedCapabilities = {
          chat: rawCapabilities.chat || false,
          reasoning: rawCapabilities.reasoning || false,
          vision: rawCapabilities.vision || false,
          search: rawCapabilities.search || false,
          longContext: rawCapabilities.longContext || rawCapabilities.long_context || false,
          tools: rawCapabilities.tools || false,
        };

        // Trim model keys when loading to sanitize any existing bad data
        // OpenAI API rejects model identifiers with leading/trailing whitespace
        return {
          id: m.id,
          providerId: m.provider_id,
          modelKey: (m.model_key || '').trim(),
          displayName: m.display_name,
          modelType: (m.model_type || 'language_model') as 'language_model' | 'search_ai',
          capabilities: normalizedCapabilities,
          contextWindowTokens: m.context_window_tokens,
          maxOutputTokens: m.max_output_tokens,
          costInputPer1M: m.cost_input_per_1m,
          costOutputPer1M: m.cost_output_per_1m,
          reasoningLevel: m.reasoning_level || null,
          isEnabled: m.is_enabled,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
          providerName: m.provider?.display_name || 'Unknown',
        };
      });

    console.log('[AdminAIRouting] Loaded models:', mappedModels.length);
    console.log('[AdminAIRouting] Models data:', mappedModels);
    setModels(mappedModels);
  }

  async function toggleRouteEnabled(routeId: string, currentState: boolean) {
    try {
      const { error } = await supabase
        .from('ai_feature_routes')
        .update({ is_enabled: !currentState })
        .eq('id', routeId);

      if (error) throw error;
      await loadRoutes();
    } catch (error) {
      console.error('Failed to toggle route:', error);
      alert('Failed to update route');
    }
  }

  async function deleteRoute(routeId: string) {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const { error } = await supabase.from('ai_feature_routes').delete().eq('id', routeId);

      if (error) throw error;
      showSuccess('Route deleted successfully');
      await loadRoutes();
    } catch (error) {
      console.error('Failed to delete route:', error);
      showError(`Failed to delete route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleAddRoute(data: AddRouteModalData) {
    try {
      const { error } = await supabase.from('ai_feature_routes').insert({
        feature_key: data.featureKey,
        surface_type: data.surfaceType,
        master_project_id: null,
        provider_model_id: data.providerModelId,
        is_fallback: false,
        priority: data.priority,
        constraints: data.constraints,
        is_enabled: true,
      });

      if (error) throw error;
      showSuccess('Route added successfully');
      setShowAddRoute(false);
      await loadRoutes();
    } catch (error) {
      console.error('Failed to add route:', error);
      showError(`Failed to add route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleUpdateRoute(routeId: string, data: AddRouteModalData) {
    try {
      const { error } = await supabase
        .from('ai_feature_routes')
        .update({
          feature_key: data.featureKey,
          surface_type: data.surfaceType,
          provider_model_id: data.providerModelId,
          priority: data.priority,
          constraints: data.constraints,
        })
        .eq('id', routeId);

      if (error) throw error;
      showSuccess('Route updated successfully');
      setEditingRoute(null);
      await loadRoutes();
    } catch (error) {
      console.error('Failed to update route:', error);
      showError(`Failed to update route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function showError(message: string) {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }

  function showSuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }

  // Get all feature keys from the registry (ensures all features are shown)
  const featureKeys = Object.keys(FEATURE_REGISTRY) as FeatureKey[];
  const routesByFeature = routes.reduce(
    (acc, route) => {
      if (!acc[route.featureKey]) {
        acc[route.featureKey] = [];
      }
      acc[route.featureKey].push(route);
      return acc;
    },
    {} as Record<string, FeatureRouteWithModel[]>
  );

  const toggleFeature = (featureKey: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureKey)) {
      newExpanded.delete(featureKey);
    } else {
      newExpanded.add(featureKey);
    }
    setExpandedFeatures(newExpanded);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading routes...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Layers size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Feature Routing</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Configure which AI models are used for each feature
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            console.log('[AdminAIRoutingPage] Opening modal with models.length:', models.length);
            setShowAddRoute(true);
          }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Add Route
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <CapabilitiesReferenceCard />

      <div className="space-y-3">
        {featureKeys.map((featureKey) => {
          const featureRoutes = routesByFeature[featureKey] || [];
          const defaultRoute = featureRoutes.find((r) => !r.surfaceType && !r.masterProjectId);
          const surfaceRoutes = featureRoutes.filter((r) => r.surfaceType && !r.masterProjectId);
          const projectRoutes = featureRoutes.filter((r) => r.masterProjectId);
          const hasRoutes = defaultRoute || surfaceRoutes.length > 0 || projectRoutes.length > 0;
          const isExpanded = expandedFeatures.has(featureKey);
          const FeatureIcon = getFeatureIcon(featureKey);

          return (
            <div key={featureKey} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleFeature(featureKey)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <FeatureIcon size={20} className="text-blue-700" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{getFeatureLabel(featureKey)}</h3>
                    {defaultRoute ? (
                      <div className="text-sm text-gray-600 mt-0.5">
                        Default: {defaultRoute.model?.providerName} · {defaultRoute.model?.displayName}
                      </div>
                    ) : (
                      <div className="text-sm text-amber-600 mt-0.5">No default route configured</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {hasRoutes && (
                    <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                      {featureRoutes.length} {featureRoutes.length === 1 ? 'route' : 'routes'}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && hasRoutes && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-2">
                  {defaultRoute && (
                    <RouteCard
                      route={defaultRoute}
                      onToggle={toggleRouteEnabled}
                      onDelete={deleteRoute}
                      onEdit={setEditingRoute}
                    />
                  )}
                  {surfaceRoutes.map((route) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      onToggle={toggleRouteEnabled}
                      onDelete={deleteRoute}
                      onEdit={setEditingRoute}
                    />
                  ))}
                  {projectRoutes.map((route) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      onToggle={toggleRouteEnabled}
                      onDelete={deleteRoute}
                      onEdit={setEditingRoute}
                    />
                  ))}
                </div>
              )}

              {isExpanded && !hasRoutes && (
                <div className="border-t border-gray-200 px-5 py-8 text-center bg-gray-50">
                  <Target size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No routes configured</p>
                  <p className="text-xs text-gray-400 mt-1">Add a route to configure this feature</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddRoute && (
        <AddRouteModal
          models={models}
          onClose={() => setShowAddRoute(false)}
          onSave={handleAddRoute}
        />
      )}

      {editingRoute && (
        <EditRouteModal
          route={editingRoute}
          models={models}
          onClose={() => setEditingRoute(null)}
          onSave={(data) => handleUpdateRoute(editingRoute.id, data)}
        />
      )}
    </div>
    </AdminLayout>
  );
}

interface RouteCardProps {
  route: FeatureRouteWithModel;
  onToggle: (id: string, currentState: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (route: FeatureRouteWithModel) => void;
}

function RouteCard({ route, onToggle, onDelete, onEdit }: RouteCardProps) {
  const getScopeInfo = () => {
    if (route.masterProjectId) {
      return { label: 'Project Override', color: 'purple', specificity: 3 };
    } else if (route.surfaceType === 'project') {
      return { label: 'Project Surface', color: 'blue', specificity: 2 };
    } else if (route.surfaceType === 'personal') {
      return { label: 'Personal Surface', color: 'green', specificity: 2 };
    } else if (route.surfaceType === 'shared') {
      return { label: 'Shared Surface', color: 'orange', specificity: 2 };
    } else {
      return { label: 'Global Default', color: 'gray', specificity: 1 };
    }
  };

  const scope = getScopeInfo();
  const scopeColors = {
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${scopeColors[scope.color as keyof typeof scopeColors]}`}>
              {scope.label}
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {route.model?.providerName}
            </span>
            <span className="text-sm text-gray-400">→</span>
            <span className="text-sm font-medium text-gray-700">
              {route.model?.displayName}
            </span>
            {route.isFallback && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200 font-medium">
                Fallback
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-gray-700">Priority:</span>
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono">{route.priority}</span>
            </div>
            {route.constraints?.maxContextTokens && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-700">Max Context:</span>
                <span className="font-mono">{(route.constraints.maxContextTokens / 1000).toFixed(0)}K</span>
              </div>
            )}
            {route.constraints?.maxOutputTokens && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-700">Max Output:</span>
                <span className="font-mono">{(route.constraints.maxOutputTokens / 1000).toFixed(0)}K</span>
              </div>
            )}
          </div>

          {(route.constraints?.allowedIntents || route.constraints?.disallowedIntents) && (
            <div className="mt-2 text-xs">
              {route.constraints.allowedIntents && route.constraints.allowedIntents.length > 0 && (
                <div className="text-gray-600">
                  <span className="font-medium">Allowed:</span>{' '}
                  <span className="text-gray-500">{route.constraints.allowedIntents.join(', ')}</span>
                </div>
              )}
              {route.constraints.disallowedIntents && route.constraints.disallowedIntents.length > 0 && (
                <div className="text-gray-600">
                  <span className="font-medium">Blocked:</span>{' '}
                  <span className="text-gray-500">{route.constraints.disallowedIntents.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onToggle(route.id, route.isEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              route.isEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {route.isEnabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={() => onEdit(route)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit route"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(route.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete route"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddRouteModalProps {
  models: (AIProviderModel & { providerName: string })[];
  onClose: () => void;
  onSave: (data: AddRouteModalData) => void;
}

function AddRouteModal({ models, onClose, onSave }: AddRouteModalProps) {
  const DEFAULT_FEATURE_KEY: FeatureKey = 'ai_chat';
  const [featureKey, setFeatureKey] = useState<FeatureKey>(DEFAULT_FEATURE_KEY);
  const [surfaceType, setSurfaceType] = useState<SurfaceType | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState(100);
  const [maxContextTokens, setMaxContextTokens] = useState<number | null>(null);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | null>(null);

  const selectedFeature = useMemo(() => FEATURE_REGISTRY[featureKey], [featureKey]);

  const compatibleModels = useMemo(() => {
    // Use validateModelForFeature which handles both AND and OR logic
    // (e.g., spaces_meal_planner accepts chat OR search)
    return models
      .filter(m => m.isEnabled)
      .filter(m => {
        const validation = validateModelForFeature(m.capabilities, featureKey);
        return validation.valid;
      });
  }, [models, featureKey]);

  const selectedModel = useMemo(() => {
    return models.find(m => m.id === selectedModelId);
  }, [models, selectedModelId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedModelId) {
      alert('Please select a model');
      return;
    }

    const constraints: RouteConstraints = {
      maxContextTokens: maxContextTokens || undefined,
      maxOutputTokens: maxOutputTokens || undefined,
      allowedIntents: selectedFeature?.allowedIntents,
    };

    onSave({
      featureKey,
      surfaceType,
      providerModelId: selectedModelId,
      priority,
      constraints,
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Add Feature Route</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feature
            </label>
            <select
              value={featureKey}
              onChange={(e) => {
                const next = e.target.value as FeatureKey;
                setFeatureKey(next);
                setSelectedModelId(undefined);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(FEATURE_REGISTRY).map(([key, feature]) => (
                <option key={key} value={key}>
                  {feature.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{selectedFeature.description}</p>
          </div>

          <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <div className="text-sm font-bold text-yellow-900 mb-2">DEBUG STATE</div>
            <div className="space-y-1 text-xs font-mono text-yellow-900">
              <div><strong>featureKey:</strong> {featureKey}</div>
              <div><strong>selectedFeature.label:</strong> {selectedFeature.label}</div>
              <div><strong>requiredCapabilities:</strong> [{selectedFeature.requiredCapabilities.join(', ')}]</div>
              <div><strong>compatibleModels.length:</strong> {compatibleModels.length}</div>
              <div className="mt-2 pt-2 border-t border-yellow-300">
                <strong>Expected on open:</strong>
                <div>featureKey = ai_chat</div>
                <div>selectedFeature.label = AI Chat</div>
                <div>requiredCapabilities = [chat]</div>
                <div>compatibleModels.length = 5</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope
            </label>
            <select
              value={surfaceType || 'global'}
              onChange={(e) => setSurfaceType(e.target.value === 'global' ? null : e.target.value as SurfaceType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="global">Global Default</option>
              <option value="project">Project Surface</option>
              <option value="personal">Personal Surface</option>
              <option value="shared">Shared Surface</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {surfaceType === null && 'Default route for this feature across all surfaces'}
              {surfaceType === 'project' && 'Route for project-specific conversations'}
              {surfaceType === 'personal' && 'Route for personal space conversations'}
              {surfaceType === 'shared' && 'Route for shared space conversations'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>

            <select
              value={selectedModelId || ''}
              onChange={(e) => setSelectedModelId(e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a model...</option>
              {compatibleModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.providerName} — {model.displayName}
                </option>
              ))}
            </select>

            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">
                Required Capabilities:
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedFeature.requiredCapabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium"
                  >
                    {cap}
                  </span>
                ))}
              </div>
              {compatibleModels.length === 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  No enabled models have all required capabilities. Go to AI Providers and enable the capabilities when adding/editing a model.
                </p>
              )}
              {compatibleModels.length > 0 && (
                <p className="text-xs text-green-700 mt-2">
                  {compatibleModels.length} compatible model(s) available
                </p>
              )}
            </div>

            {selectedModel && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedModel.modelType === 'search_ai' ? (
                  <span>Search / Retrieval AI (no token limits)</span>
                ) : (
                  <>
                    Context: {selectedModel.contextWindowTokens ? `${(selectedModel.contextWindowTokens / 1000).toFixed(0)}K tokens` : 'N/A'},
                    Output: {selectedModel.maxOutputTokens ? `${(selectedModel.maxOutputTokens / 1000).toFixed(0)}K tokens` : 'N/A'}
                  </>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              required
              min="0"
              max="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher priority routes are selected first. Default: 100
            </p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Constraints (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Context Tokens
                </label>
                <input
                  type="number"
                  value={maxContextTokens || ''}
                  onChange={(e) => setMaxContextTokens(e.target.value ? Number(e.target.value) : null)}
                  placeholder={selectedModel ? `Default: ${selectedModel.contextWindowTokens || 'N/A'}` : "Override model limit"}
                  min="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use model default
                  {selectedModel && selectedModel.contextWindowTokens && ` (${selectedModel.contextWindowTokens})`}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Output Tokens
                </label>
                <input
                  type="number"
                  value={maxOutputTokens || ''}
                  onChange={(e) => setMaxOutputTokens(e.target.value ? Number(e.target.value) : null)}
                  placeholder={selectedModel ? `Default: ${selectedModel.maxOutputTokens || 'N/A'}` : "Override model limit"}
                  min="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use model default
                  {selectedModel && selectedModel.maxOutputTokens && ` (${selectedModel.maxOutputTokens})`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={compatibleModels.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Route
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditRouteModalProps {
  route: FeatureRouteWithModel;
  models: (AIProviderModel & { providerName: string })[];
  onClose: () => void;
  onSave: (data: AddRouteModalData) => void;
}

function EditRouteModal({ route, models, onClose, onSave }: EditRouteModalProps) {
  const [featureKey, setFeatureKey] = useState<FeatureKey>(route.featureKey);
  const [surfaceType, setSurfaceType] = useState<SurfaceType | null>(route.surfaceType);
  const [selectedModelId, setSelectedModelId] = useState<string>(route.providerModelId);
  const [priority, setPriority] = useState(route.priority);
  const [maxContextTokens, setMaxContextTokens] = useState<number | null>(route.constraints?.maxContextTokens || null);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | null>(route.constraints?.maxOutputTokens || null);

  const selectedFeature = useMemo(() => FEATURE_REGISTRY[featureKey], [featureKey]);

  const compatibleModels = useMemo(() => {
    // Use validateModelForFeature which handles both AND and OR logic
    // (e.g., spaces_meal_planner accepts chat OR search)
    return models
      .filter(m => m.isEnabled)
      .filter(m => {
        const validation = validateModelForFeature(m.capabilities, featureKey);
        return validation.valid;
      });
  }, [models, featureKey]);

  const selectedModel = useMemo(() => {
    return models.find(m => m.id === selectedModelId);
  }, [models, selectedModelId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedModelId) {
      alert('Please select a model');
      return;
    }

    const constraints: RouteConstraints = {
      maxContextTokens: maxContextTokens || undefined,
      maxOutputTokens: maxOutputTokens || undefined,
      allowedIntents: selectedFeature?.allowedIntents,
    };

    onSave({
      featureKey,
      surfaceType,
      providerModelId: selectedModelId,
      priority,
      constraints,
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Feature Route</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feature
            </label>
            <select
              value={featureKey}
              onChange={(e) => {
                const next = e.target.value as FeatureKey;
                setFeatureKey(next);
                setSelectedModelId(compatibleModels[0]?.id || '');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(FEATURE_REGISTRY).map(([key, feature]) => (
                <option key={key} value={key}>
                  {feature.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{selectedFeature.description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope
            </label>
            <select
              value={surfaceType || 'global'}
              onChange={(e) => setSurfaceType(e.target.value === 'global' ? null : e.target.value as SurfaceType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="global">Global Default</option>
              <option value="project">Project Surface</option>
              <option value="personal">Personal Surface</option>
              <option value="shared">Shared Surface</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {surfaceType === null && 'Default route for this feature across all surfaces'}
              {surfaceType === 'project' && 'Route for project-specific conversations'}
              {surfaceType === 'personal' && 'Route for personal space conversations'}
              {surfaceType === 'shared' && 'Route for shared space conversations'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>

            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a model...</option>
              {compatibleModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.providerName} — {model.displayName}
                </option>
              ))}
            </select>

            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">
                Required Capabilities:
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedFeature.requiredCapabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium"
                  >
                    {cap}
                  </span>
                ))}
              </div>
              {compatibleModels.length === 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  No enabled models have all required capabilities. Go to AI Providers and enable the capabilities when adding/editing a model.
                </p>
              )}
              {compatibleModels.length > 0 && (
                <p className="text-xs text-green-700 mt-2">
                  {compatibleModels.length} compatible model(s) available
                </p>
              )}
            </div>

            {selectedModel && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedModel.modelType === 'search_ai' ? (
                  <span>Search / Retrieval AI (no token limits)</span>
                ) : (
                  <>
                    Context: {selectedModel.contextWindowTokens ? `${(selectedModel.contextWindowTokens / 1000).toFixed(0)}K tokens` : 'N/A'},
                    Output: {selectedModel.maxOutputTokens ? `${(selectedModel.maxOutputTokens / 1000).toFixed(0)}K tokens` : 'N/A'}
                  </>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              required
              min="0"
              max="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher priority routes are selected first. Default: 100
            </p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Constraints (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Context Tokens
                </label>
                <input
                  type="number"
                  value={maxContextTokens || ''}
                  onChange={(e) => setMaxContextTokens(e.target.value ? Number(e.target.value) : null)}
                  placeholder={selectedModel ? `Default: ${selectedModel.contextWindowTokens || 'N/A'}` : "Override model limit"}
                  min="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use model default
                  {selectedModel && selectedModel.contextWindowTokens && ` (${selectedModel.contextWindowTokens})`}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Output Tokens
                </label>
                <input
                  type="number"
                  value={maxOutputTokens || ''}
                  onChange={(e) => setMaxOutputTokens(e.target.value ? Number(e.target.value) : null)}
                  placeholder={selectedModel ? `Default: ${selectedModel.maxOutputTokens || 'N/A'}` : "Override model limit"}
                  min="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use model default
                  {selectedModel && selectedModel.maxOutputTokens && ` (${selectedModel.maxOutputTokens})`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={compatibleModels.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
