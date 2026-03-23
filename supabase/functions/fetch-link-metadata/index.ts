import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Enforce JWT verification is disabled at function level
export const config = {
  verifyJWT: false,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

interface LinkMetadata {
  title: string;
  description: string;
  domain: string;
  content_type: string;
  thumbnail_url?: string;
  is_valid: boolean;
}

/**
 * Detect if URL is a YouTube video and extract video ID
 */
function parseYouTubeUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace('www.', '');

    // youtube.com/watch?v=VIDEO_ID
    if (hostname === 'youtube.com' && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v');
    }

    // youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      return urlObj.pathname.slice(1); // Remove leading slash
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch YouTube metadata using oEmbed API (no API key required)
 */
async function fetchYouTubeMetadata(url: string, videoId: string): Promise<LinkMetadata | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.error('YouTube oEmbed failed:', response.status);
      return null;
    }

    const data = await response.json();

    // Build metadata from oEmbed response
    return {
      title: data.title || url,
      description: data.author_name ? `Channel: ${data.author_name}` : '',
      domain: 'youtube.com',
      content_type: 'video',
      thumbnail_url: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      is_valid: true,
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return null;
  }
}

/**
 * Generic fallback metadata
 */
function getFallbackMetadata(url: string): LinkMetadata {
  let domain = url;
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace('www.', '');
  } catch {
    // Keep url as domain if parsing fails
  }

  return {
    title: url,
    description: '',
    domain,
    content_type: 'article',
    is_valid: true,
  };
}

Deno.serve(async (req: Request) => {
  // Handle OPTIONS preflight immediately - no auth checks, no parsing
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Manual auth validation for non-OPTIONS requests
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse request body
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ ok: false, error: "URL is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate URL format
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid URL format" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let metadata: LinkMetadata;

    // Try YouTube metadata extraction
    const videoId = parseYouTubeUrl(url);
    if (videoId) {
      const youtubeMetadata = await fetchYouTubeMetadata(url, videoId);
      if (youtubeMetadata) {
        metadata = youtubeMetadata;
      } else {
        // YouTube detected but oEmbed failed - use fallback
        metadata = getFallbackMetadata(url);
      }
    } else {
      // Not YouTube - use fallback
      metadata = getFallbackMetadata(url);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: metadata,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});