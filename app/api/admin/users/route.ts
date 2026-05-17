import { NextResponse } from "next/server";
import { hashPassword, isProtectedSuperAdminEmail, requireApiSuperAdmin, USER_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminUserSchema, getValidationError } from "@/lib/validation/auth";

export async function GET() {
  const auth = await requireApiSuperAdmin();
  if (auth.response) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      ...user,
      isProtected: isProtectedSuperAdminEmail(user.email),
      canDelete: auth.user?.id !== user.id && !isProtectedSuperAdminEmail(user.email),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireApiSuperAdmin();
  if (auth.response) return auth.response;

  const body = await req.json();
  const result = createAdminUserSchema.safeParse(body);
  const role = USER_ROLES.ADMIN;

  if (!result.success) {
    return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 });
  }

  const { name, email, password } = result.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name: name || null,
      email,
      passwordHash: hashPassword(password),
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
