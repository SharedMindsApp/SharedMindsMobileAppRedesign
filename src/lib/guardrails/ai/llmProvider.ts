import type { LLMConfig, LLMProvider } from './types';

let providerOverride: ((prompt: string) => Promise<string>) | null = null;

export function overrideLLMProvider(mockFn: ((prompt: string) => Promise<string>) | null) {
  providerOverride = mockFn;
}

function getLLMConfig(): LLMConfig | null {
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;

  if (openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4-turbo-preview',
    };
  }

  if (anthropicKey) {
    return {
      provider: 'anthropic',
      apiKey: anthropicKey,
      model: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    };
  }

  if (groqKey) {
    return {
      provider: 'groq',
      apiKey: groqKey,
      model: import.meta.env.VITE_GROQ_MODEL || 'mixtral-8x7b-32768',
    };
  }

  return null;
}

async function callOpenAI(prompt: string, apiKey: string, model: string): Promise<string> {
  // Trim model name to prevent invalid OpenAI API requests
  // OpenAI API rejects model identifiers with leading/trailing whitespace
  const trimmedModel = model.trim();
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: trimmedModel,
      messages: [
        {
          role: 'system',
          content: 'You are a project planning assistant. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callAnthropic(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `You are a project planning assistant. Always respond with valid JSON only, no additional text.\n\n${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

async function callGroq(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a project planning assistant. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function generateAIResponse(prompt: string): Promise<string> {
  if (providerOverride) {
    return providerOverride(prompt);
  }

  const config = getLLMConfig();

  if (!config) {
    throw new Error(
      'No LLM provider configured. Please set one of: VITE_OPENAI_API_KEY, VITE_ANTHROPIC_API_KEY, or VITE_GROQ_API_KEY'
    );
  }

  switch (config.provider) {
    case 'openai':
      return callOpenAI(prompt, config.apiKey, config.model);
    case 'anthropic':
      return callAnthropic(prompt, config.apiKey, config.model);
    case 'groq':
      return callGroq(prompt, config.apiKey, config.model);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

export function isLLMConfigured(): boolean {
  return getLLMConfig() !== null;
}

export function getConfiguredProvider(): LLMProvider | null {
  const config = getLLMConfig();
  return config?.provider || null;
}
