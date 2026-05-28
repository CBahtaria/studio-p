import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// In-memory store — resets per serverless instance, acceptable for edge rate limiting
const hits = new Map<string, number[]>();

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isRateLimited(key: string, limit: number, windowMs: number): { limited: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter(t => now - t < windowMs);
  if (timestamps.length >= limit) return { limited: true, remaining: 0 };
  timestamps.push(now);
  hits.set(key, timestamps);
  return { limited: false, remaining: limit - timestamps.length };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getIP(req);

  // Auth endpoints — 5 attempts per 15 minutes
  if (pathname.startsWith('/auth/') || pathname.includes('signIn') || pathname.includes('signUp')) {
    const { limited, remaining } = isRateLimited(`auth:${ip}`, 5, 15 * 60 * 1000);
    if (limited) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please wait before trying again.', retryAfter: 900 }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '900',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Remaining', String(remaining));
    return res;
  }

  // API endpoints — 60 requests per minute
  if (pathname.startsWith('/api/')) {
    const { limited, remaining } = isRateLimited(`api:${ip}`, 60, 60 * 1000);
    if (limited) {
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded', retryAfter: 60 }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Remaining', String(remaining));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/auth/:path*'],
};
