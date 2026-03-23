import type { AIProviderAdapter } from './providerAdapter';
import { AnthropicAdapter } from './anthropicAdapter';
import { OpenAIAdapter } from './openaiAdapter';
import { PerplexityAdapter } from './perplexityAdapter';
import { ProviderNotConfiguredError } from './providerAdapter';

const adapterCache = new Map<string, AIProviderAdapter>();

export function getProviderAdapter(providerName: string): AIProviderAdapter {
  if (adapterCache.has(providerName)) {
    return adapterCache.get(providerName)!;
  }

  let adapter: AIProviderAdapter;

  switch (providerName.toLowerCase()) {
    case 'anthropic':
      adapter = new AnthropicAdapter();
      break;
    case 'openai':
      adapter = new OpenAIAdapter();
      break;
    case 'perplexity':
      adapter = new PerplexityAdapter();
      break;
    default:
      console.error('[PROVIDER FACTORY] Unknown provider requested', {
        provider: providerName,
      });
      throw new ProviderNotConfiguredError(providerName);
  }

  adapterCache.set(providerName, adapter);
  return adapter;
}

export function clearAdapterCache(): void {
  adapterCache.clear();
}
