import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const AUTH_COOKIE_NAME = "kanjirowa_session";
const SESSION_DAYS = 30;
const PASSWORD_KEY_LENGTH = 64;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is required for cookie authentication.");
  }

  return secret;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signValue(value: string) {
  return createHash("sha256").update(`${value}.${getAuthSecret()}`).digest("hex");
}

function serializeCookieValue(token: string) {
  return `${token}.${signValue(token)}`;
}

function parseCookieValue(value?: string) {
  if (!value) return null;

  const [token, signature] = value.split(".");
  if (!token || !signature || signValue(token) !== signature) return null;

  return token;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;

  const candidate = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const stored = Buffer.from(storedHash, "hex");

  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, serializeCookieValue(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = parseCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = parseCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) redirect("/signin");

  return user;
}
