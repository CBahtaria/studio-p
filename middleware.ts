// Vercel Edge Middleware — uses Web Standard APIs (no next/server)
// Rate limits API routes (60/1min). Auth paths are intentionally excluded:
// /auth/callback is an OAuth redirect destination — intercepting it prevents
// the Vite SPA from loading and breaks the PKCE code exchange.

const hits = new Map<string, number[]>();

function getIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
): { limited: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) return { limited: true, remaining: 0 };
  timestamps.push(now);
  hits.set(key, timestamps);
  return { limited: false, remaining: limit - timestamps.length };
}

function tooMany(retryAfter: number, limit: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests', retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
      },
    },
  );
}

export default function middleware(req: Request): Response | undefined {
  const url = new URL(req.url);
  const { pathname } = url;
  const ip = getIP(req);

  if (pathname.startsWith('/api/')) {
    const { limited, remaining } = isRateLimited(`api:${ip}`, 60, 60 * 1000);
    if (limited) return tooMany(60, 60);
    const res = new Response(null, { status: 200 });
    res.headers.set('X-RateLimit-Remaining', String(remaining));
    return res;
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
