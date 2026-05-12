import { NextResponse } from "next/server";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetCodeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

const RESET_CODE_MINUTES = 10;

type ResetCodeRow = {
  id: string;
  userId: number;
};

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  return randomInt(100000, 1000000).toString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    return NextResponse.json({ ok: true, email: user.email, expiresAt });
  } catch (error) {
    console.error("Forgot password code failed:", error);
    return NextResponse.json({ error: "Could not send the verification code." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6 digit verification code." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
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
  } catch (error) {
    console.error("Forgot password reset failed:", error);
    return NextResponse.json({ error: "Could not reset the password." }, { status: 500 });
  }
}
