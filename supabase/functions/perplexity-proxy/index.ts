import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PerplexityProxyRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface PerplexityProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        provider: 'perplexity',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Get API key from environment (server-side only)
    // CRITICAL: Must be PERPLEXITY_API_KEY (NOT VITE_PERPLEXITY_API_KEY)
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    // Hard runtime check - fail fast if key is missing
    if (!PERPLEXITY_API_KEY || PERPLEXITY_API_KEY.trim().length === 0) {
      console.error('[PerplexityProxy] PERPLEXITY_API_KEY missing on server');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PERPLEXITY_API_KEY missing on server. Please set PERPLEXITY_API_KEY in Supabase Edge Function secrets.',
        } as PerplexityProxyResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    let requestBody: PerplexityProxyRequest;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim().length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request body is required',
          } as PerplexityProxyResponse),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('[PerplexityProxy] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
        } as PerplexityProxyResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate required fields
    if (!requestBody.model || typeof requestBody.model !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request: model (string) is required',
        } as PerplexityProxyResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!requestBody.messages || !Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request: messages (non-empty array) is required',
        } as PerplexityProxyResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate model name (Perplexity models: sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro)
    const modelKey = requestBody.model.trim();
    const validModels = ['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro'];
    if (!validModels.includes(modelKey)) {
      console.warn(`[PerplexityProxy] Unusual model name: ${modelKey}. Valid models: ${validModels.join(', ')}`);
    }

    // Build Perplexity API request body
    const perplexityBody: any = {
      model: modelKey,
      messages: requestBody.messages,
    };

    if (requestBody.temperature !== undefined) {
      perplexityBody.temperature = requestBody.temperature;
    }

    if (requestBody.max_tokens !== undefined) {
      perplexityBody.max_tokens = requestBody.max_tokens;
    }

    if (requestBody.stream === true) {
      perplexityBody.stream = true;
    }

    console.log('[PerplexityProxy] Calling Perplexity API:', {
      model: modelKey,
      messageCount: requestBody.messages.length,
      hasTemperature: requestBody.temperature !== undefined,
      hasMaxTokens: requestBody.max_tokens !== undefined,
      streaming: requestBody.stream === true,
    });

    // Call Perplexity API - Official endpoint: https://api.perplexity.ai/chat/completions
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(perplexityBody),
    });

    // Handle streaming responses
    if (requestBody.stream === true && perplexityResponse.ok) {
      // Return streaming response
      return new Response(perplexityResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming responses
    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      let errorData: any;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      // Structured error logging - CRITICAL for debugging
      console.error('[PerplexityProxy] Perplexity API error:', {
        status: perplexityResponse.status,
        statusText: perplexityResponse.statusText,
        error: errorData,
        model: modelKey,
        messageCount: requestBody.messages.length,
      });

      // Return detailed error to frontend
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${perplexityResponse.status}: ${perplexityResponse.statusText}`;
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          statusCode: perplexityResponse.status,
        } as PerplexityProxyResponse),
        {
          status: perplexityResponse.status >= 400 && perplexityResponse.status < 500 
            ? perplexityResponse.status 
            : 500, // Map 5xx to 500 for consistency
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse and return successful response
    let data: any;
    try {
      data = await perplexityResponse.json();
      console.log('[PerplexityProxy] Success:', {
        model: modelKey,
        hasChoices: !!data.choices,
        choiceCount: data.choices?.length || 0,
        hasUsage: !!data.usage,
      });
    } catch (parseError) {
      console.error('[PerplexityProxy] Failed to parse Perplexity response:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to parse Perplexity API response',
        } as PerplexityProxyResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
      } as PerplexityProxyResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // Catch-all error handler with detailed logging
    console.error('[PerplexityProxy] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as PerplexityProxyResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
