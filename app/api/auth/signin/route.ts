import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { getValidationError, signInSchema } from "@/lib/validation/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = signInSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 });
    }

    const { email, password } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "User not found. Ask an admin to create your account." }, { status: 404 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Sign in failed:", error);
    return NextResponse.json({ error: "Could not sign in. Please try again." }, { status: 500 });
  }
}
