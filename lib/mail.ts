import "server-only";

import nodemailer from "nodemailer";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for SMTP email.`);
  }

  return value;
}

function getSmtpPort() {
  const value = process.env.SMTP_PORT?.trim();
  const port = value ? Number(value) : 587;

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  return port;
}

function createTransporter() {
  const port = getSmtpPort();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_PASSWORD"),
    },
  });
}

export async function sendPasswordResetCodeEmail({
  to,
  code,
  expiresInMinutes,
}: {
  to: string;
  code: string;
  expiresInMinutes: number;
}) {
  const from = process.env.SMTP_FROM?.trim() || requireEnv("SMTP_USER");

  await createTransporter().sendMail({
    from,
    to,
    subject: "Kanjirowa password reset verification code",
    text: [
      "A password reset was requested for your Kanjirowa account.",
      "",
      `Verification code: ${code}`,
      `This code expires in ${expiresInMinutes} minutes.`,
      "",
      "If you did not request this, contact your super admin.",
    ].join("\n"),
    html: `
      <p>A password reset was requested for your Kanjirowa account.</p>
      <p><strong>Verification code:</strong> ${code}</p>
      <p>This code expires in ${expiresInMinutes} minutes.</p>
      <p>If you did not request this, contact your super admin.</p>
    `,
  });
}
