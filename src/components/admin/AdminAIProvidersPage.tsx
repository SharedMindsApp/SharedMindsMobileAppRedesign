import { useState, useEffect } from 'react';
import { Settings, Check, X, Plus, Cpu, Zap, Wrench, Eye, DollarSign, Box, CheckCircle, XCircle, Trash2, Edit2, Play, Loader2, AlertTriangle, CheckCircle2, Server } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from './AdminLayout';
import type { AIProvider, AIProviderModel, ModelCapabilities, ModelType } from '../../lib/guardrails/ai/providerRegistryTypes';
import { getProviderAdapter } from '../../lib/guardrails/ai/providerFactory';
import type { NormalizedAIRequest } from '../../lib/guardrails/ai/providerAdapter';
import { ProviderNotConfiguredError, ModelNotSupportedError, ProviderAPIError } from '../../lib/guardrails/ai/providerAdapter';

interface AddProviderModalData {
  name: string;
  displayName: string;
  supportsTools: boolean;
  supportsStreaming: boolean;
}

import type { ReasoningLevel } from '../../lib/guardrails/ai/providerAdapter';

interface AddModelModalData {
  modelKey: string;
  displayName: string;
  modelType: ModelType;
  capabilities: ModelCapabilities;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  costInputPer1M: number | null;
  costOutputPer1M: number | null;
  reasoningLevel?: ReasoningLevel | null; // Admin-selectable preset for OpenAI models
}

export function AdminAIProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [models, setModels] = useState<AIProviderModel[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDisableConfirm, setShowDisableConfirm] = useState<{ id: string; name: string; type: 'provider' | 'model' } | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [editingModel, setEditingModel] = useState<AIProviderModel | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; name: string; type: 'provider' | 'model'; modelCount?: number } | null>(null);
  const [testingModel, setTestingModel] = useState<{ model: AIProviderModel; provider: AIProvider } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      loadModels(selectedProvider);
    }
  }, [selectedProvider]);

  async function loadProviders() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .order('name');

      if (error) throw error;

      setProviders(
        (data || []).map((p) => ({
          id: p.id,
          name: p.name,
          displayName: p.display_name,
          isEnabled: p.is_enabled,
          supportsTools: p.supports_tools,
          supportsStreaming: p.supports_streaming,
          requiresServerProxy: p.requires_server_proxy || false,
          supportsBrowserCalls: p.supports_browser_calls !== false, // Default to true if not set
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }))
      );

      if (data && data.length > 0 && !selectedProvider) {
        setSelectedProvider(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadModels(providerId: string) {
    try {
      console.log('[AdminAIProviders] Loading models for provider:', providerId);
      const { data, error } = await supabase
        .from('ai_provider_models')
        .select('*')
        .eq('provider_id', providerId)
        .order('display_name');

      if (error) throw error;

      // Trim model keys when loading to sanitize any existing bad data
      // OpenAI API rejects model identifiers with leading/trailing whitespace
      const mappedModels = (data || []).map((m) => ({
        id: m.id,
        providerId: m.provider_id,
        modelKey: (m.model_key || '').trim(),
        displayName: m.display_name,
        modelType: (m.model_type || 'language_model') as ModelType,
        capabilities: m.capabilities || {},
        contextWindowTokens: m.context_window_tokens,
        maxOutputTokens: m.max_output_tokens,
        costInputPer1M: m.cost_input_per_1m,
        costOutputPer1M: m.cost_output_per_1m,
        reasoningLevel: m.reasoning_level || null,
        isEnabled: m.is_enabled,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));

      console.log('[AdminAIProviders] Loaded', mappedModels.length, 'models:', mappedModels.map(m => ({ id: m.id, name: m.displayName, enabled: m.isEnabled })));
      setModels(mappedModels);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  async function toggleProviderEnabled(providerId: string, currentState: boolean) {
    if (currentState) {
      const provider = providers.find((p) => p.id === providerId);
      if (provider) {
        setShowDisableConfirm({ id: providerId, name: provider.displayName, type: 'provider' });
        return;
      }
    }

    try {
      console.log('[AdminAIProviders] Toggling provider:', providerId, 'to', !currentState);
      const { data, error } = await supabase
        .from('ai_providers')
        .update({ is_enabled: !currentState })
        .eq('id', providerId)
        .select();

      console.log('[AdminAIProviders] Toggle result:', { data, error });
      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No rows were updated - possible permission issue');
      }

      console.log('[AdminAIProviders] Provider toggled successfully, reloading...');
      await loadProviders();
      showSuccess(`Provider ${!currentState ? 'enabled' : 'disabled'} successfully`);
      console.log('[AdminAIProviders] Providers reloaded');
    } catch (error) {
      console.error('Failed to toggle provider:', error);
      showError(`Failed to update provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function toggleModelEnabled(modelId: string, currentState: boolean) {
    if (currentState) {
      const model = models.find((m) => m.id === modelId);
      if (model) {
        setShowDisableConfirm({ id: modelId, name: model.displayName, type: 'model' });
        return;
      }
    }

    try {
      console.log('[AdminAIProviders] Toggling model:', modelId, 'to', !currentState);
      const { data, error } = await supabase
        .from('ai_provider_models')
        .update({ is_enabled: !currentState })
        .eq('id', modelId)
        .select();

      console.log('[AdminAIProviders] Toggle result:', { data, error });
      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No rows were updated - possible permission issue');
      }

      console.log('[AdminAIProviders] Model toggled successfully, reloading...');
      showSuccess(`Model ${!currentState ? 'enabled' : 'disabled'} successfully`);

      if (selectedProvider) {
        await loadModels(selectedProvider);
        console.log('[AdminAIProviders] Models reloaded');
      }
    } catch (error) {
      console.error('Failed to toggle model:', error);
      showError(`Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function confirmDisable() {
    if (!showDisableConfirm) return;

    try {
      console.log('[AdminAIProviders] Disabling', showDisableConfirm.type, showDisableConfirm.id);

      if (showDisableConfirm.type === 'provider') {
        const { data, error } = await supabase
          .from('ai_providers')
          .update({ is_enabled: false })
          .eq('id', showDisableConfirm.id)
          .select();

        console.log('[AdminAIProviders] Update result:', { data, error });
        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error('No rows were updated - possible permission issue');
        }

        console.log('[AdminAIProviders] Provider disabled, reloading...');
        await loadProviders();
        showSuccess('Provider disabled successfully');
        console.log('[AdminAIProviders] Providers reloaded');
      } else {
        const { data, error } = await supabase
          .from('ai_provider_models')
          .update({ is_enabled: false })
          .eq('id', showDisableConfirm.id)
          .select();

        console.log('[AdminAIProviders] Update result:', { data, error });
        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error('No rows were updated - possible permission issue');
        }

        console.log('[AdminAIProviders] Model disabled, reloading...');
        if (selectedProvider) {
          await loadModels(selectedProvider);
        }
        showSuccess('Model disabled successfully');
        console.log('[AdminAIProviders] Models reloaded');
      }
      setShowDisableConfirm(null);
    } catch (error) {
      console.error('Failed to disable:', error);
      showError(`Failed to disable ${showDisableConfirm.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowDisableConfirm(null);
    }
  }

  async function handleAddProvider(data: AddProviderModalData) {
    try {
      const { error } = await supabase.from('ai_providers').insert({
        name: data.name,
        display_name: data.displayName,
        supports_tools: data.supportsTools,
        supports_streaming: data.supportsStreaming,
        is_enabled: true,
      });

      if (error) throw error;
      showSuccess('Provider added successfully');
      setShowAddProvider(false);
      await loadProviders();
    } catch (error) {
      console.error('Failed to add provider:', error);
      showError(`Failed to add provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleAddModel(data: AddModelModalData) {
    if (!selectedProvider) return;

    try {
      // Trim model key to prevent whitespace issues in API requests
      // OpenAI API rejects model names with leading/trailing whitespace
      const trimmedModelKey = data.modelKey.trim();
      
      const { error } = await supabase.from('ai_provider_models').insert({
        provider_id: selectedProvider,
        model_key: trimmedModelKey,
        display_name: data.displayName,
        model_type: data.modelType,
        capabilities: data.capabilities,
        context_window_tokens: data.contextWindowTokens,
        max_output_tokens: data.maxOutputTokens,
        cost_input_per_1m: data.costInputPer1M,
        cost_output_per_1m: data.costOutputPer1M,
        reasoning_level: data.reasoningLevel || null,
        is_enabled: true,
      });

      if (error) throw error;
      showSuccess('Model added successfully');
      setShowAddModel(false);
      await loadModels(selectedProvider);
    } catch (error) {
      console.error('Failed to add model:', error);
      showError(`Failed to add model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleUpdateProvider(data: AddProviderModalData) {
    if (!editingProvider) return;

    try {
      const { error } = await supabase
        .from('ai_providers')
        .update({
          name: data.name,
          display_name: data.displayName,
          supports_tools: data.supportsTools,
          supports_streaming: data.supportsStreaming,
        })
        .eq('id', editingProvider.id);

      if (error) throw error;
      showSuccess('Provider updated successfully');
      setEditingProvider(null);
      await loadProviders();
    } catch (error) {
      console.error('Failed to update provider:', error);
      showError(`Failed to update provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleUpdateModel(data: AddModelModalData) {
    if (!editingModel) return;

    try {
      // Trim model key to prevent whitespace issues in API requests
      // OpenAI API rejects model names with leading/trailing whitespace
      const trimmedModelKey = data.modelKey.trim();
      
      const { error } = await supabase
        .from('ai_provider_models')
        .update({
          model_key: trimmedModelKey,
          display_name: data.displayName,
          model_type: data.modelType,
          capabilities: data.capabilities,
          context_window_tokens: data.contextWindowTokens,
          max_output_tokens: data.maxOutputTokens,
          cost_input_per_1m: data.costInputPer1M,
          cost_output_per_1m: data.costOutputPer1M,
          reasoning_level: data.reasoningLevel || null,
        })
        .eq('id', editingModel.id);

      if (error) throw error;
      showSuccess('Model updated successfully');
      setEditingModel(null);
      if (selectedProvider) {
        await loadModels(selectedProvider);
      }
    } catch (error) {
      console.error('Failed to update model:', error);
      showError(`Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleDeleteProvider(providerId: string) {
    const { count } = await supabase
      .from('ai_provider_models')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId);

    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    setShowDeleteConfirm({
      id: providerId,
      name: provider.displayName,
      type: 'provider',
      modelCount: count || 0,
    });
  }

  async function handleDeleteModel(modelId: string) {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;

    setShowDeleteConfirm({
      id: modelId,
      name: model.displayName,
      type: 'model',
    });
  }

  async function confirmDelete() {
    if (!showDeleteConfirm) return;

    try {
      console.log('[AdminAIProviders] Deleting', showDeleteConfirm.type, showDeleteConfirm.id);

      if (showDeleteConfirm.type === 'provider') {
        if (showDeleteConfirm.modelCount && showDeleteConfirm.modelCount > 0) {
          showError('Cannot delete provider with existing models. Delete all models first.');
          setShowDeleteConfirm(null);
          return;
        }

        const { data, error } = await supabase
          .from('ai_providers')
          .delete()
          .eq('id', showDeleteConfirm.id)
          .select();

        console.log('[AdminAIProviders] Delete result:', { data, error });
        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error('No rows were deleted - possible permission issue');
        }

        console.log('[AdminAIProviders] Provider deleted, reloading...');
        await loadProviders();
        showSuccess('Provider deleted successfully');
        console.log('[AdminAIProviders] Providers reloaded');
      } else {
        const { data, error } = await supabase
          .from('ai_provider_models')
          .delete()
          .eq('id', showDeleteConfirm.id)
          .select();

        console.log('[AdminAIProviders] Delete result:', { data, error });
        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error('No rows were deleted - possible permission issue');
        }

        console.log('[AdminAIProviders] Model deleted, reloading...');
        if (selectedProvider) {
          await loadModels(selectedProvider);
        }
        showSuccess('Model deleted successfully');
        console.log('[AdminAIProviders] Models reloaded');
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete:', error);
      showError(`Failed to delete ${showDeleteConfirm.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowDeleteConfirm(null);
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

  const selectedProviderData = providers.find((p) => p.id === selectedProvider);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading providers...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Cpu size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Providers</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Manage AI providers and models for the application
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAddProvider(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Provider
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900">Providers</h2>
              <p className="text-xs text-gray-500 mt-0.5">{providers.length} available</p>
            </div>
            <div className="divide-y divide-gray-200">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`w-full p-4 transition-all cursor-pointer ${
                    selectedProvider === provider.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'border-l-4 border-transparent hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedProvider(provider.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900">{provider.displayName}</div>
                        {provider.isEnabled ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">{provider.name}</div>
                      <div className="flex gap-1.5 mt-2">
                        {provider.supportsStreaming && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            <Zap size={11} />
                            Streaming
                          </span>
                        )}
                        {provider.supportsTools && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            <Wrench size={11} />
                            Tools
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProviderEnabled(provider.id, provider.isEnabled);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          provider.isEnabled
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {provider.isEnabled ? <Check size={18} /> : <X size={18} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProvider(provider);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProvider(provider.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selectedProviderData?.displayName || 'Select a provider'}
                  </h2>
                  {selectedProviderData && (
                    <p className="text-xs text-gray-500 mt-0.5">{models.length} models available</p>
                  )}
                </div>
                {selectedProviderData && (
                  <button
                    onClick={() => setShowAddModel(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={16} />
                    Add Model
                  </button>
                )}
              </div>
            </div>
            {selectedProviderData ? (
              <div className="p-4 space-y-3">
                {models.length === 0 ? (
                  <div className="text-center py-12">
                    <Box size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No models available</p>
                    <p className="text-sm text-gray-400 mt-1">Add a model to get started</p>
                  </div>
                ) : (
                  models.map((model) => (
                    <div
                      key={model.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-gray-900">{model.displayName}</div>
                            {model.isEnabled ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 font-mono">{model.modelKey}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {model.modelType === 'search_ai' ? 'Search / Retrieval AI' : 'Language Model'}
                          </div>

                          {model.modelType === 'language_model' && (
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div className="flex items-start gap-2">
                                <Eye size={16} className="text-gray-400 mt-0.5" />
                                <div>
                                  <div className="text-xs text-gray-500">Context Window</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-0.5">
                                    {model.contextWindowTokens ? `${(model.contextWindowTokens / 1000).toFixed(0)}K tokens` : 'N/A'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <DollarSign size={16} className="text-gray-400 mt-0.5" />
                                <div>
                                  <div className="text-xs text-gray-500">Cost per 1M tokens</div>
                                  <div className="text-sm font-semibold text-gray-900 mt-0.5">
                                    ${model.costInputPer1M?.toFixed(2) || 'N/A'} / $
                                    {model.costOutputPer1M?.toFixed(2) || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-1.5 mt-3">
                            {model.capabilities.chat && (
                              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                Chat
                              </span>
                            )}
                            {model.capabilities.reasoning && (
                              <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                                Reasoning
                              </span>
                            )}
                            {model.capabilities.vision && (
                              <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                                Vision
                              </span>
                            )}
                            {model.capabilities.tools && (
                              <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full">
                                Tools
                              </span>
                            )}
                            {model.capabilities.longContext && (
                              <span className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full">
                                Long Context
                              </span>
                            )}
                            {model.capabilities.search && (
                              <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                                Search
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => toggleModelEnabled(model.id, model.isEnabled)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              model.isEnabled
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {model.isEnabled ? 'Enabled' : 'Disabled'}
                          </button>
                          {model.isEnabled && selectedProviderData && (
                            <button
                              onClick={() => setTestingModel({ model, provider: selectedProviderData })}
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Test this model"
                            >
                              <Play size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingModel(model)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteModel(model.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Cpu size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Select a provider</p>
                <p className="text-sm text-gray-400 mt-1">Choose a provider from the list to view its models</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddProvider && (
        <AddProviderModal
          onClose={() => setShowAddProvider(false)}
          onSave={handleAddProvider}
        />
      )}

      {editingProvider && (
        <AddProviderModal
          onClose={() => setEditingProvider(null)}
          onSave={handleUpdateProvider}
          initialData={editingProvider}
        />
      )}

      {showAddModel && selectedProvider && (
        <AddModelModal
          onClose={() => setShowAddModel(false)}
          onSave={handleAddModel}
          providerName={selectedProviderData?.name}
        />
      )}

      {editingModel && (
        <AddModelModal
          onClose={() => setEditingModel(null)}
          onSave={handleUpdateModel}
          initialData={editingModel}
          providerName={selectedProviderData?.name}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete {showDeleteConfirm.type === 'provider' ? 'Provider' : 'Model'}?
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
            </p>
            {showDeleteConfirm.type === 'provider' && showDeleteConfirm.modelCount && showDeleteConfirm.modelCount > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800 font-medium">
                  Cannot delete: This provider has {showDeleteConfirm.modelCount} model(s). Delete all models first.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  This action cannot be undone. All routes using this {showDeleteConfirm.type} will be affected.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              {(!showDeleteConfirm.modelCount || showDeleteConfirm.modelCount === 0) && (
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Disable {showDisableConfirm.type === 'provider' ? 'Provider' : 'Model'}?
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to disable <strong>{showDisableConfirm.name}</strong>?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                {showDisableConfirm.type === 'provider'
                  ? 'Disabling this provider will stop all AI features that depend on it unless a fallback is configured.'
                  : 'Disabling this model may affect routes that use it. Make sure alternative models are available.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisableConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisable}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}

      {testingModel && (
        <TestModelModal
          model={testingModel.model}
          provider={testingModel.provider}
          onClose={() => setTestingModel(null)}
        />
      )}
    </div>
    </AdminLayout>
  );
}

interface AddProviderModalProps {
  onClose: () => void;
  onSave: (data: AddProviderModalData) => void;
  initialData?: AIProvider;
}

function AddProviderModal({ onClose, onSave, initialData }: AddProviderModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [supportsTools, setSupportsTools] = useState(initialData?.supportsTools || false);
  const [supportsStreaming, setSupportsStreaming] = useState(initialData?.supportsStreaming || false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name, displayName, supportsTools, supportsStreaming });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {initialData ? 'Edit Provider' : 'Add Provider'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Name (lowercase, e.g., anthropic)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              pattern="[a-z0-9_]+"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="anthropic"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Anthropic"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={supportsTools}
                onChange={(e) => setSupportsTools(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Supports Tools/Function Calling</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={supportsStreaming}
                onChange={(e) => setSupportsStreaming(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Supports Streaming</span>
            </label>
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {initialData ? 'Save Changes' : 'Add Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddModelModalProps {
  onClose: () => void;
  onSave: (data: AddModelModalData) => void;
  initialData?: AIProviderModel;
  providerName?: string; // Provider name to determine if reasoning level should be shown
}

function AddModelModal({ onClose, onSave, initialData, providerName }: AddModelModalProps) {
  const [modelKey, setModelKey] = useState(initialData?.modelKey || '');
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [modelType, setModelType] = useState<ModelType>(initialData?.modelType || 'language_model');
  const [capabilities, setCapabilities] = useState<ModelCapabilities>(
    initialData?.capabilities || {
      chat: false,
      reasoning: false,
      vision: false,
      search: false,
      longContext: false,
      tools: false,
    }
  );
  const [contextWindowTokens, setContextWindowTokens] = useState<number | null>(initialData?.contextWindowTokens ?? 100000);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | null>(initialData?.maxOutputTokens ?? 4096);
  const [costInputPer1M, setCostInputPer1M] = useState<number | null>(initialData?.costInputPer1M ?? null);
  const [costOutputPer1M, setCostOutputPer1M] = useState<number | null>(initialData?.costOutputPer1M ?? null);
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel | ''>(initialData?.reasoningLevel || '');
  
  // Check if this is an OpenAI model (reasoning level only applies to OpenAI)
  const isOpenAI = providerName === 'openai';
  const isSearchAI = modelType === 'search_ai';
  const isLanguageModel = modelType === 'language_model';
  
  // When model type changes, update capabilities and token fields
  useEffect(() => {
    if (modelType === 'search_ai') {
      // For search_ai, set search capability and clear token fields
      setCapabilities(prev => ({
        ...prev,
        search: true,
        chat: false,
        reasoning: false,
        vision: false,
        longContext: false,
      }));
      setContextWindowTokens(null);
      setMaxOutputTokens(null);
    } else {
      // For language_model, set default token values if null
      if (contextWindowTokens === null) {
        setContextWindowTokens(100000);
      }
      if (maxOutputTokens === null) {
        setMaxOutputTokens(4096);
      }
    }
  }, [modelType]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validation: search_ai must have search capability
    if (modelType === 'search_ai' && !capabilities.search) {
      alert('Search AI models must have the Search capability enabled.');
      return;
    }
    
    // Trim model key on form submit to prevent whitespace issues
    // This ensures clean data even if user accidentally adds spaces
    onSave({
      modelKey: modelKey.trim(),
      displayName,
      modelType,
      capabilities,
      contextWindowTokens: isSearchAI ? null : contextWindowTokens,
      maxOutputTokens: isSearchAI ? null : maxOutputTokens,
      costInputPer1M: isSearchAI ? null : costInputPer1M,
      costOutputPer1M: isSearchAI ? null : costOutputPer1M,
      reasoningLevel: reasoningLevel || null, // Store null if empty
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {initialData ? 'Edit Model' : 'Add Model'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Model Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modelType"
                  value="language_model"
                  checked={modelType === 'language_model'}
                  onChange={(e) => setModelType(e.target.value as ModelType)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Language Model</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modelType"
                  value="search_ai"
                  checked={modelType === 'search_ai'}
                  onChange={(e) => setModelType(e.target.value as ModelType)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Search / Retrieval AI</span>
              </label>
            </div>
            {isSearchAI && (
              <p className="text-xs text-gray-500 mt-2">
                Search-based AI providers like Perplexity don't use token-based pricing or context windows.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Key
              </label>
              <input
                type="text"
                value={modelKey}
                onChange={(e) => setModelKey(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="claude-3-5-sonnet-20241022"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Claude 3.5 Sonnet"
              />
            </div>
          </div>

          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <label className="block text-sm font-semibold text-blue-900 mb-1">
              Model Capabilities
            </label>
            <p className="text-xs text-blue-700 mb-3">
              These determine which features can use this model. Each feature requires specific capabilities.
            </p>
            <div className="grid grid-cols-2 gap-3 bg-white rounded-lg p-3">
              {isSearchAI ? (
                <>
                  <label className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={capabilities.search || false}
                      onChange={(e) =>
                        setCapabilities({ ...capabilities, search: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                      required={isSearchAI}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Search</span>
                      <p className="text-xs text-gray-500">Web search capability</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={capabilities.tools || false}
                      onChange={(e) =>
                        setCapabilities({ ...capabilities, tools: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Structured Output (JSON)</span>
                      <p className="text-xs text-gray-500">JSON response formatting</p>
                    </div>
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={capabilities.chat || false}
                      onChange={(e) =>
                        setCapabilities({ ...capabilities, chat: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Chat</span>
                      <p className="text-xs text-gray-500">Basic conversational AI</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={capabilities.reasoning || false}
                      onChange={(e) =>
                        setCapabilities({ ...capabilities, reasoning: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Reasoning</span>
                      <p className="text-xs text-gray-500">Complex problem solving</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={capabilities.vision || false}
                      onChange={(e) =>
                        setCapabilities({ ...capabilities, vision: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Vision</span>
                      <p className="text-xs text-gray-500">Image understanding</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={capabilities.longContext || false}
                      onChange={(e) =>
                        setCapabilities({ ...capabilities, longContext: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Long Context</span>
                      <p className="text-xs text-gray-500">Large document handling</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={capabilities.tools || false}
                      onChange={(e) =>
                        setCapabilities({ ...capabilities, tools: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Tools</span>
                      <p className="text-xs text-gray-500">Function calling support</p>
                    </div>
                  </label>
                </>
              )}
            </div>
          </div>

          {isLanguageModel && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Context Window (tokens)
                  </label>
                  <input
                    type="number"
                    value={contextWindowTokens ?? ''}
                    onChange={(e) => setContextWindowTokens(e.target.value ? Number(e.target.value) : null)}
                    required={isLanguageModel}
                    min="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Output (tokens)
                  </label>
                  <input
                    type="number"
                    value={maxOutputTokens ?? ''}
                    onChange={(e) => setMaxOutputTokens(e.target.value ? Number(e.target.value) : null)}
                    required={isLanguageModel}
                    min="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost per 1M input tokens ($)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={costInputPer1M !== null ? String(costInputPer1M) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setCostInputPer1M(null);
                      } else if (/^\d*\.?\d*$/.test(val)) {
                        setCostInputPer1M(val as any);
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val === '' || val === '.') {
                        setCostInputPer1M(null);
                      } else {
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 0) {
                          setCostInputPer1M(parseFloat(num.toFixed(2)));
                        } else {
                          setCostInputPer1M(null);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="e.g., 0.05"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost per 1M output tokens ($)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={costOutputPer1M !== null ? String(costOutputPer1M) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setCostOutputPer1M(null);
                      } else if (/^\d*\.?\d*$/.test(val)) {
                        setCostOutputPer1M(val as any);
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val === '' || val === '.') {
                        setCostOutputPer1M(null);
                      } else {
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 0) {
                          setCostOutputPer1M(parseFloat(num.toFixed(2)));
                        } else {
                          setCostOutputPer1M(null);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="e.g., 0.15"
                  />
                </div>
              </div>
            </>
          )}

          {/* Reasoning Level - Only for OpenAI models */}
          {isOpenAI && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reasoning Level
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Preset that expands to model-specific parameters. GPT-5 uses max_completion_tokens + reasoning.effort, other OpenAI models use max_tokens + temperature.
              </p>
              <select
                value={reasoningLevel}
                onChange={(e) => setReasoningLevel(e.target.value as ReasoningLevel | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">None (use defaults)</option>
                <option value="fast">Fast (quick responses)</option>
                <option value="balanced">Balanced (default)</option>
                <option value="deep">Deep (more thorough reasoning)</option>
                <option value="long_form">Long Form (extended outputs)</option>
              </select>
            </div>
          )}

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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {initialData ? 'Save Changes' : 'Add Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TestModelModalProps {
  model: AIProviderModel;
  provider: AIProvider;
  onClose: () => void;
}

function TestModelModal({ model, provider, onClose }: TestModelModalProps) {
  const [testPrompt, setTestPrompt] = useState('Say "Hello, this is a test response." in exactly those words.');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    response?: string;
    latency?: number;
    tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number };
    diagnostics?: {
      step: string;
      status: 'success' | 'error' | 'warning';
      message: string;
      details?: any;
    }[];
  } | null>(null);

  async function runTest() {
    setIsTesting(true);
    setTestResult(null);

    const diagnostics: {
      step: string;
      status: 'success' | 'error' | 'warning';
      message: string;
      details?: any;
    }[] = [];

    const startTime = Date.now();

    try {
      // Step 1: Check API key configuration (skip for server-only providers)
      const isServerOnly = provider.requiresServerProxy || !provider.supportsBrowserCalls;
      
      if (isServerOnly) {
        diagnostics.push({
          step: 'API Key Check',
          status: 'success',
          message: 'This provider runs server-side for security reasons',
          details: {
            note: 'API key is stored server-side and never exposed to the client',
            proxyRequired: true,
          },
        });
      } else {
        diagnostics.push({
          step: 'API Key Check',
          status: 'success',
          message: 'Checking API key configuration...',
        });

        const apiKeyEnvVar = 
          provider.name === 'openai' ? 'VITE_OPENAI_API_KEY' :
          provider.name === 'anthropic' ? 'VITE_ANTHROPIC_API_KEY' :
          'UNKNOWN';
        const apiKey = import.meta.env[apiKeyEnvVar];

        if (!apiKey) {
          diagnostics.push({
            step: 'API Key Check',
            status: 'error',
            message: `API key not found in environment variable: ${apiKeyEnvVar}`,
            details: {
              expectedEnvVar: apiKeyEnvVar,
              provider: provider.name,
              suggestion: `Set ${apiKeyEnvVar} in your .env file or environment variables`,
            },
          });
          throw new ProviderNotConfiguredError(provider.name);
        }

        diagnostics.push({
          step: 'API Key Check',
          status: 'success',
          message: `API key found (${apiKey.substring(0, 8)}...)`,
        });
      }

      // Step 2: Get provider adapter
      diagnostics.push({
        step: 'Adapter Initialization',
        status: 'success',
        message: 'Initializing provider adapter...',
      });

      let adapter;
      try {
        adapter = getProviderAdapter(provider.name);
        diagnostics.push({
          step: 'Adapter Initialization',
          status: 'success',
          message: `Adapter created for ${provider.name}`,
        });
      } catch (error) {
        const supportedProviders = ['openai', 'anthropic', 'perplexity'];
        diagnostics.push({
          step: 'Adapter Initialization',
          status: 'error',
          message: `Failed to create adapter: ${error instanceof Error ? error.message : String(error)}`,
          details: {
            provider: provider.name,
            supportedProviders,
          },
        });
        throw error;
      }

      // Step 3: Validate model
      diagnostics.push({
        step: 'Model Validation',
        status: 'success',
        message: `Validating model: ${model.modelKey}`,
      });

      // Step 4: Create test request
      diagnostics.push({
        step: 'Request Preparation',
        status: 'success',
        message: 'Preparing test request...',
      });

      // Trim model key to prevent invalid OpenAI API requests
      // OpenAI API rejects model identifiers with leading/trailing whitespace
      const trimmedModelKey = model.modelKey.trim();

      const request: NormalizedAIRequest = {
        provider: provider.name,
        modelKey: trimmedModelKey,
        intent: 'test',
        featureKey: 'ai_chat',
        messages: [
          { role: 'user', content: testPrompt },
        ],
        systemPrompt: 'You are a helpful assistant. Respond concisely.',
        userPrompt: testPrompt,
        budgets: {
          maxInputTokens: model.contextWindowTokens || 100000,
          maxOutputTokens: model.maxOutputTokens || 4096,
        },
        maxTokens: model.maxOutputTokens || 4096, // Will be overridden by reasoning level if set
        temperature: 0.7,
        reasoningLevel: model.reasoningLevel || undefined, // Use model's reasoning level preset if configured
      };

      diagnostics.push({
        step: 'Request Preparation',
        status: 'success',
        message: 'Request prepared successfully',
        details: {
          model: trimmedModelKey,
          promptLength: testPrompt.length,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          reasoningLevel: request.reasoningLevel || 'none (using defaults)',
          note: request.reasoningLevel 
            ? 'Reasoning level preset will expand to model-specific parameters (max_completion_tokens + reasoning.effort for GPT-5, max_tokens + temperature for others)'
            : 'No reasoning level preset - using explicit maxTokens and temperature',
        },
      });

      // Step 5: Send request
      diagnostics.push({
        step: 'API Call',
        status: 'success',
        message: 'Sending request to API...',
        details: {
          model: trimmedModelKey,
          promptLength: testPrompt.length,
          maxTokens: request.maxTokens,
          reasoningLevel: request.reasoningLevel || 'none',
        },
      });

      const response = await adapter.generate(request);
      const latency = Date.now() - startTime;

      // Validate that we actually received a response
      if (!response || typeof response.text !== 'string') {
        diagnostics.push({
          step: 'API Call',
          status: 'error',
          message: 'Invalid response structure received from adapter',
          details: {
            responseType: typeof response,
            hasText: !!response?.text,
            responseKeys: response ? Object.keys(response) : [],
          },
        });
        throw new Error('Invalid response structure: no text field in response');
      }

      // Check if response is empty (which might indicate an issue)
      if (response.text.trim().length === 0) {
        diagnostics.push({
          step: 'API Call',
          status: 'warning',
          message: 'Response received but text is empty',
          details: {
            finishReason: response.finishReason,
            tokenUsage: response.tokenUsage,
            suggestion: 'This might indicate the model hit a length limit or the response was filtered',
          },
        });
      }

      const responseText = response.text;

      diagnostics.push({
        step: 'API Call',
        status: 'success',
        message: `Response received (${latency}ms)`,
        details: {
          responseLength: responseText.length,
          tokenUsage: response.tokenUsage,
          latencyMs: response.latencyMs,
          finishReason: response.finishReason,
        },
      });

      setTestResult({
        success: true,
        response: responseText || '(Empty response received)',
        latency,
        tokenUsage: response.tokenUsage,
        diagnostics,
      });
    } catch (error) {
      const latency = Date.now() - startTime;

      // Add error diagnostic
      if (error instanceof ProviderNotConfiguredError) {
        const envVarName = 
          provider.name === 'openai' ? 'VITE_OPENAI_API_KEY' :
          provider.name === 'anthropic' ? 'VITE_ANTHROPIC_API_KEY' :
          provider.name === 'perplexity' ? 'VITE_PERPLEXITY_API_KEY' :
          'API_KEY';
        diagnostics.push({
          step: 'Error',
          status: 'error',
          message: 'Provider not configured',
          details: {
            error: error.message,
            provider: provider.name,
            suggestion: `Set ${envVarName} in your environment variables`,
          },
        });
      } else if (error instanceof ModelNotSupportedError) {
        diagnostics.push({
          step: 'Error',
          status: 'error',
          message: 'Model not supported',
          details: {
            error: error.message,
            requestedModel: model.modelKey,
            provider: provider.name,
            suggestion: 'Check that the model key matches the provider\'s supported models',
          },
        });
      } else if (error instanceof ProviderAPIError) {
        const isServerOnly = provider.requiresServerProxy || !provider.supportsBrowserCalls;
        const suggestion = isServerOnly
          ? (error.message.includes('proxy') || error.message.includes('Server proxy')
              ? 'Check that the Perplexity proxy Edge Function is deployed and PERPLEXITY_API_KEY is set in Supabase environment variables'
              : 'Perplexity requires a server-side proxy. Please check backend configuration.')
          : (error.retryable
              ? 'This error may be temporary. Try again in a moment.'
              : 'Check your API key, model name, and account status with the provider');
        
        diagnostics.push({
          step: 'Error',
          status: 'error',
          message: 'API request failed',
          details: {
            error: error.message,
            statusCode: (error as any).statusCode,
            retryable: error.retryable,
            suggestion,
          },
        });
      } else if (error instanceof Error) {
        diagnostics.push({
          step: 'Error',
          status: 'error',
          message: error.message,
          details: {
            errorType: error.constructor.name,
            errorMessage: error.message,
            suggestion: 'Check the browser console for more details',
          },
        });
      } else {
        diagnostics.push({
          step: 'Error',
          status: 'error',
          message: 'Unknown error occurred',
          details: {
            error: String(error),
            suggestion: 'Check the browser console for more details',
          },
        });
      }

      setTestResult({
        success: false,
        latency,
        diagnostics,
      });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Test Model</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="font-semibold text-gray-900">{provider.displayName}</div>
              <span className="text-gray-400">→</span>
              <div className="font-medium text-gray-700">{model.displayName}</div>
            </div>
            <div className="text-xs text-gray-500 font-mono">{model.modelKey}</div>
            {(provider.requiresServerProxy || !provider.supportsBrowserCalls) && (
              <div className="mt-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                <Server size={14} />
                <span>This provider runs server-side for security reasons</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Prompt
            </label>
            <textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              disabled={isTesting}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter a test prompt..."
            />
          </div>

          <button
            onClick={runTest}
            disabled={isTesting || !testPrompt.trim()}
            className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play size={18} />
                Run Test
              </>
            )}
          </button>

          {testResult && (
            <div className="mt-4 space-y-4">
              {testResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={20} className="text-green-600" />
                    <h4 className="font-semibold text-green-900">Test Successful</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-green-900">Response:</span>
                      <textarea
                        readOnly
                        value={testResult.response || '(No response text received)'}
                        rows={4}
                        className="mt-1 w-full p-2 bg-white border border-green-200 rounded text-gray-900 text-sm resize-none"
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                    {testResult.latency && (
                      <div>
                        <span className="font-medium text-green-900">Latency:</span>{' '}
                        <span className="text-green-700">{testResult.latency}ms</span>
                      </div>
                    )}
                    {testResult.tokenUsage && (
                      <div>
                        <span className="font-medium text-green-900">Token Usage:</span>{' '}
                        <span className="text-green-700">
                          {testResult.tokenUsage.inputTokens} input / {testResult.tokenUsage.outputTokens} output / {testResult.tokenUsage.totalTokens} total
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={20} className="text-red-600" />
                    <h4 className="font-semibold text-red-900">Test Failed</h4>
                  </div>
                  {testResult.latency && (
                    <div className="text-sm text-red-700 mb-2">
                      Failed after {testResult.latency}ms
                    </div>
                  )}
                </div>
              )}

              {testResult.diagnostics && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900 text-sm">Diagnostics</h4>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {testResult.diagnostics.map((diag, idx) => (
                      <div key={idx} className="p-3">
                        <div className="flex items-start gap-2 mb-1">
                          {diag.status === 'success' && (
                            <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          )}
                          {diag.status === 'error' && (
                            <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                          )}
                          {diag.status === 'warning' && (
                            <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 text-sm">{diag.step}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                diag.status === 'success' ? 'bg-green-100 text-green-700' :
                                diag.status === 'error' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {diag.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{diag.message}</p>
                            {diag.details && (
                              <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600 overflow-x-auto">
                                <pre>{JSON.stringify(diag.details, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
