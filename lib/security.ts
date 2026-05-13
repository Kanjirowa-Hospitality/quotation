import "server-only";

import { NextResponse } from "next/server";

const MAX_JSON_BODY_BYTES = 8 * 1024;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  count: number;
  remaining: number;
  retryAfter: number;
};

const rateLimitStore =
  ((globalThis as typeof globalThis & { __kanjirowaRateLimitStore?: Map<string, RateLimitEntry> })
    .__kanjirowaRateLimitStore ??= new Map<string, RateLimitEntry>());

function getForwardedHost(req: Request) {
  return req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host")?.trim() || "";
}

function getForwardedProtocol(req: Request) {
  return req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(req.url).protocol.replace(":", "");
}

export function getClientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  if (rateLimitStore.size > 10000) {
    for (const [entryKey, entry] of rateLimitStore) {
      if (entry.resetAt <= now) rateLimitStore.delete(entryKey);
    }
  }

  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, count: 1, remaining: limit - 1, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      count: current.count,
      remaining: 0,
      retryAfter: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    };
  }

  current.count += 1;
  return { allowed: true, count: current.count, remaining: Math.max(limit - current.count, 0), retryAfter: 0 };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}

export function validatePublicJsonRequest(req: Request) {
  const origin = req.headers.get("origin");

  if (origin) {
    const requestOrigin = `${getForwardedProtocol(req)}://${getForwardedHost(req)}`;

    if (origin !== requestOrigin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  return null;
}
