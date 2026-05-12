import { NextResponse } from "next/server";
import { hashPassword, requireApiSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAdminUserSchema, getValidationError, updateAdminUserSchema } from "@/lib/validation/auth";

function getUserId(value: string) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSuperAdmin();
  if (auth.response) return auth.response;

  const { id: rawId } = await params;
  const userId = getUserId(rawId);

  if (!userId) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 });
  }

  const body = await req.json();
  const result = updateAdminUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 });
  }

  const { name, email, password } = result.data;
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existingUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const emailOwner = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (emailOwner && emailOwner.id !== userId) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || null,
      email,
      ...(password ? { passwordHash: hashPassword(password) } : {}),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (password) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  return NextResponse.json({ user });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSuperAdmin();
  if (auth.response) return auth.response;

  const { id: rawId } = await params;
  const userId = getUserId(rawId);

  if (!userId) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 });
  }

  if (auth.user?.id === userId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const body = await req.json();
  const result = deleteAdminUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: getValidationError(result.error) }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (result.data.email !== user.email) {
    return NextResponse.json({ error: "Email confirmation does not match this user." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
