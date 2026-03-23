import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface MetadataResponse {
  title: string;
  image: string | null;
  siteName: string | null;
  url: string;
}

function extractMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {};
  
  const metaRegex = /<meta[^>]+>/gi;
  const matches = html.match(metaRegex) || [];
  
  for (const match of matches) {
    const propertyMatch = match.match(/property=["']([^"']+)["']/);
    const contentMatch = match.match(/content=["']([^"']+)["']/);
    const nameMatch = match.match(/name=["']([^"']+)["']/);
    
    if (propertyMatch && contentMatch) {
      metaTags[propertyMatch[1]] = contentMatch[1];
    } else if (nameMatch && contentMatch) {
      metaTags[nameMatch[1]] = contentMatch[1];
    }
  }
  
  return metaTags;
}

function extractTitle(html: string, metaTags: Record<string, string>): string {
  if (metaTags['og:title']) return metaTags['og:title'];
  if (metaTags['twitter:title']) return metaTags['twitter:title'];
  
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1];
  
  return 'Untitled Recipe';
}

function extractImage(metaTags: Record<string, string>): string | null {
  if (metaTags['og:image']) return metaTags['og:image'];
  if (metaTags['twitter:image']) return metaTags['twitter:image'];
  return null;
}

function extractSiteName(url: string, metaTags: Record<string, string>): string | null {
  if (metaTags['og:site_name']) return metaTags['og:site_name'];
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    if (hostname.includes('tiktok.com')) return 'TikTok';
    if (hostname.includes('instagram.com')) return 'Instagram';
    if (hostname.includes('pinterest.com')) return 'Pinterest';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';
    if (hostname.includes('facebook.com')) return 'Facebook';
    
    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }

    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch URL' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const html = await response.text();
    const metaTags = extractMetaTags(html);

    const metadata: MetadataResponse = {
      title: extractTitle(html, metaTags),
      image: extractImage(metaTags),
      siteName: extractSiteName(finalUrl, metaTags),
      url: finalUrl,
    };

    return new Response(
      JSON.stringify(metadata),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to extract metadata' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});