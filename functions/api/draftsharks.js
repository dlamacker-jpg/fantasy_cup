// ─── Draft Sharks API Proxy ───
// Proxies requests to Parse.bot's Draft Sharks API using PARSE_API_KEY env var.
// Caches responses in KV for 7 days. Serves stale cache if API is unavailable.

const PARSE_BASE = 'https://api.parse.bot/scraper/8cbb56cd-270c-41c6-ab5b-ff713cf1ef13';
const CACHE_TTL = 604800; // 7 days in seconds

const ALLOWED_ENDPOINTS = {
  rankings: 'get_rankings',
  player: 'get_player_profile',
  sos: 'get_strength_of_schedule',
  depth_charts: 'get_depth_charts',
  news: 'get_news_articles',
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint');
  const forceRefresh = url.searchParams.get('refresh') === 'true';

  if (!endpoint || !ALLOWED_ENDPOINTS[endpoint]) {
    return json({
      error: 'Invalid endpoint',
      available: Object.keys(ALLOWED_ENDPOINTS),
    }, 400);
  }

  const apiKey = env.PARSE_API_KEY;

  // Build the upstream query params (pass through everything except 'endpoint' and 'refresh')
  const upstreamParams = new URLSearchParams();
  for (const [key, val] of url.searchParams.entries()) {
    if (key === 'endpoint' || key === 'refresh') continue;
    upstreamParams.set(key, val);
  }

  // Check KV cache
  const kv = env.POWERUPS;
  const cacheKey = `ds:${endpoint}:${upstreamParams.toString()}`;

  if (kv && !forceRefresh) {
    try {
      const cached = await kv.get(cacheKey, 'json');
      if (cached) {
        return json({ ...cached, _cached: true });
      }
    } catch { /* cache miss, continue */ }
  }

  // No API key or out of credits — serve stale cache if available
  if (!apiKey) {
    if (kv) {
      try {
        const stale = await kv.get(cacheKey, 'json');
        if (stale) return json({ ...stale, _cached: true, _stale: true });
      } catch {}
    }
    return json({ error: 'PARSE_API_KEY not configured and no cached data' }, 500);
  }

  const upstreamUrl = `${PARSE_BASE}/${ALLOWED_ENDPOINTS[endpoint]}?${upstreamParams}`;

  // Fetch from Parse.bot
  try {
    const res = await fetch(upstreamUrl, {
      headers: { 'X-API-Key': apiKey },
    });

    if (!res.ok) {
      // API error (rate limit, out of credits, etc.) — serve stale cache
      if (kv) {
        try {
          const stale = await kv.get(cacheKey, 'json');
          if (stale) return json({ ...stale, _cached: true, _stale: true });
        } catch {}
      }
      const text = await res.text();
      return json({
        error: `Draft Sharks API error: ${res.status}`,
        detail: text,
      }, res.status);
    }

    const data = await res.json();

    // Cache in KV (7-day TTL)
    if (kv) {
      try {
        await kv.put(cacheKey, JSON.stringify(data), { expirationTtl: CACHE_TTL });
      } catch { /* cache write failure is non-fatal */ }
    }

    return json(data);
  } catch (err) {
    // Network error — serve stale cache
    if (kv) {
      try {
        const stale = await kv.get(cacheKey, 'json');
        if (stale) return json({ ...stale, _cached: true, _stale: true });
      } catch {}
    }
    return json({ error: 'Failed to fetch from Draft Sharks', detail: err.message }, 502);
  }
}
