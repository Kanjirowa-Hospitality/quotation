import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, validatePublicJsonRequest } from "@/lib/security";
import { getValidationError, signInSchema } from "@/lib/validation/auth";

const DUMMY_PASSWORD_HASH =
  "9f5f9c7f1fdd4695b8e6b5ddc8a54c2d:3f032d018f74afec34b0bf6dbfb548561ed4b9b96e8da12e10b88dbb3604eed5a57882a30814af0ee26f7021b48f4de3a30edbf6f5c2ba321b45214cbad836c2";
const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const securityError = validatePublicJsonRequest(req);
    if (securityError) return securityError;

    const body = await req.json();
    const result = signInSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 });
    }

    const { email, password } = result.data;
    const ip = getClientIp(req);
    const ipLimit = checkRateLimit({ key: `signin:ip:${ip}`, limit: 20, windowMs: SIGN_IN_WINDOW_MS });
    const accountLimit = checkRateLimit({
      key: `signin:account:${ip}:${email}`,
      limit: 5,
      windowMs: SIGN_IN_WINDOW_MS,
    });

    if (!ipLimit.allowed || !accountLimit.allowed) {
      return rateLimitResponse(Math.max(ipLimit.retryAfter, accountLimit.retryAfter));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const isValidPassword = verifyPassword(password, user?.passwordHash || DUMMY_PASSWORD_HASH);

    if (!user || !isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch {
    return NextResponse.json({ error: "Could not sign in. Please try again." }, { status: 500 });
  }
}
