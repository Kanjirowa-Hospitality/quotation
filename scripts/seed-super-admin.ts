import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const PASSWORD_KEY_LENGTH = 64;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const connectionString = requireEnv("DATABASE_URL");
const email = (process.env.SUPER_ADMIN_EMAIL?.trim() || "teamkanjirowa@gmail.com").toLowerCase();
const password = requireEnv("SUPER_ADMIN_PASSWORD");
const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";

if (password.length < 8) {
  throw new Error("SUPER_ADMIN_PASSWORD must be at least 8 characters.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const user = await prisma.user.upsert({
  where: { email },
  update: {
    name,
    role: "SUPER_ADMIN",
  },
  create: {
    name,
    email,
    passwordHash: hashPassword(password),
    role: "SUPER_ADMIN",
  },
  select: {
    id: true,
    email: true,
    role: true,
  },
});

await prisma.$disconnect();

console.log(`Super admin ready: ${user.email} (${user.role})`);
