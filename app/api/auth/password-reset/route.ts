import { NextResponse } from "next/server";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetCodeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitResponse, validatePublicJsonRequest } from "@/lib/security";
import {
  getValidationError,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/lib/validation/auth";

const RESET_CODE_MINUTES = 10;
const RESET_REQUEST_COOLDOWN_SECONDS = 60;
const RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RESET_REQUEST_SUCCESS_RESPONSE = { ok: true };

type ResetCodeRow = {
  id: string;
  userId: number;
};

type ResetCodeCooldownRow = {
  createdAt: Date;
};

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  return randomInt(100000, 1000000).toString();
}

export async function POST(req: Request) {
  try {
    const securityError = validatePublicJsonRequest(req);
    if (securityError) return securityError;

    const body = await req.json();
    const result = passwordResetRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 });
    }

    const { email } = result.data;
    const ip = getClientIp(req);
    const ipLimit = checkRateLimit({
      key: `password-reset-request:ip:${ip}`,
      limit: 10,
      windowMs: RESET_RATE_LIMIT_WINDOW_MS,
    });
    const accountLimit = checkRateLimit({
      key: `password-reset-request:account:${ip}:${email}`,
      limit: 3,
      windowMs: RESET_RATE_LIMIT_WINDOW_MS,
    });

    if (!ipLimit.allowed || !accountLimit.allowed) {
      return rateLimitResponse(Math.max(ipLimit.retryAfter, accountLimit.retryAfter));
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(RESET_REQUEST_SUCCESS_RESPONSE);
    }

    const recentCodes = await prisma.$queryRaw<ResetCodeCooldownRow[]>`
      SELECT "createdAt"
      FROM "PasswordResetCode"
      WHERE "userId" = ${user.id}
        AND "createdAt" > NOW() - (${RESET_REQUEST_COOLDOWN_SECONDS} * INTERVAL '1 second')
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    if (recentCodes[0]) {
      return NextResponse.json(RESET_REQUEST_SUCCESS_RESPONSE);
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + RESET_CODE_MINUTES * 60 * 1000);

    await prisma.$executeRaw`
      UPDATE "PasswordResetCode"
      SET "usedAt" = NOW()
      WHERE "userId" = ${user.id} AND "usedAt" IS NULL
    `;

    await prisma.$executeRaw`
      INSERT INTO "PasswordResetCode" ("id", "codeHash", "userId", "expiresAt", "createdAt")
      VALUES (${randomUUID()}, ${hashCode(code)}, ${user.id}, ${expiresAt}, NOW())
    `;

    await sendPasswordResetCodeEmail({
      to: user.email,
      code,
      expiresInMinutes: RESET_CODE_MINUTES,
    });

    return NextResponse.json({ ...RESET_REQUEST_SUCCESS_RESPONSE, expiresAt });
  } catch {
    return NextResponse.json({ error: "Could not send the verification code." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const securityError = validatePublicJsonRequest(req);
    if (securityError) return securityError;

    const body = await req.json();
    const result = passwordResetConfirmSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 });
    }

    const { email, code, password } = result.data;
    const ip = getClientIp(req);
    const ipLimit = checkRateLimit({
      key: `password-reset-confirm:ip:${ip}`,
      limit: 20,
      windowMs: RESET_RATE_LIMIT_WINDOW_MS,
    });
    const accountLimit = checkRateLimit({
      key: `password-reset-confirm:account:${ip}:${email}`,
      limit: 5,
      windowMs: RESET_RATE_LIMIT_WINDOW_MS,
    });

    if (!ipLimit.allowed || !accountLimit.allowed) {
      return rateLimitResponse(Math.max(ipLimit.retryAfter, accountLimit.retryAfter));
    }

    const resetCodes = await prisma.$queryRaw<ResetCodeRow[]>`
      SELECT prc."id", prc."userId"
      FROM "PasswordResetCode" prc
      INNER JOIN "User" u ON u."id" = prc."userId"
      WHERE u."email" = ${email}
        AND prc."codeHash" = ${hashCode(code)}
        AND prc."usedAt" IS NULL
        AND prc."expiresAt" > NOW()
      ORDER BY prc."createdAt" DESC
      LIMIT 1
    `;
    const resetCode = resetCodes[0];

    if (!resetCode) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetCode.userId },
        data: { passwordHash: hashPassword(password), updatedAt: new Date() },
      }),
      prisma.$executeRaw`
        UPDATE "PasswordResetCode"
        SET "usedAt" = NOW()
        WHERE "id" = ${resetCode.id}
      `,
      prisma.session.deleteMany({ where: { userId: resetCode.userId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not reset the password." }, { status: 500 });
  }
}
