import { NextResponse } from "next/server";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { hashPassword, requireApiSuperAdmin } from "@/lib/auth";
import { sendPasswordResetCodeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { adminPasswordResetConfirmSchema, getValidationError } from "@/lib/validation/auth";

const RESET_CODE_MINUTES = 10;

type ResetCodeRow = {
  id: string;
};

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  return randomInt(100000, 1000000).toString();
}

function getUserId(value: string) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getResetUser(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSuperAdmin();
  if (auth.response) return auth.response;

  try {
    const { id: rawId } = await params;
    const userId = getUserId(rawId);

    if (!userId) {
      return NextResponse.json({ error: "Invalid user." }, { status: 400 });
    }

    const user = await getResetUser(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + RESET_CODE_MINUTES * 60 * 1000);

    await prisma.$executeRaw`
      UPDATE "PasswordResetCode"
      SET "usedAt" = NOW()
      WHERE "userId" = ${userId} AND "usedAt" IS NULL
    `;

    await prisma.$executeRaw`
      INSERT INTO "PasswordResetCode" ("id", "codeHash", "userId", "expiresAt", "createdAt")
      VALUES (${randomUUID()}, ${hashCode(code)}, ${userId}, ${expiresAt}, NOW())
    `;

    await sendPasswordResetCodeEmail({
      to: user.email,
      code,
      expiresInMinutes: RESET_CODE_MINUTES,
    });

    return NextResponse.json({ ok: true, expiresAt });
  } catch {
    return NextResponse.json({ error: "Could not send the password reset code." }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSuperAdmin();
  if (auth.response) return auth.response;

  try {
    const { id: rawId } = await params;
    const userId = getUserId(rawId);
    const body = await req.json();
    const result = adminPasswordResetConfirmSchema.safeParse(body);

    if (!userId) {
      return NextResponse.json({ error: "Invalid user." }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 });
    }

    const { code, password } = result.data;
    const resetCodes = await prisma.$queryRaw<ResetCodeRow[]>`
      SELECT "id"
      FROM "PasswordResetCode"
      WHERE "userId" = ${userId}
        AND "codeHash" = ${hashCode(code)}
        AND "usedAt" IS NULL
        AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;
    const resetCode = resetCodes[0];

    if (!resetCode) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashPassword(password), updatedAt: new Date() },
      }),
      prisma.$executeRaw`
        UPDATE "PasswordResetCode"
        SET "usedAt" = NOW()
        WHERE "id" = ${resetCode.id}
      `,
      prisma.session.deleteMany({ where: { userId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not reset the password." }, { status: 500 });
  }
}
