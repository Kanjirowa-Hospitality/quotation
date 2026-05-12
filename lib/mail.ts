import "server-only";

import nodemailer from "nodemailer";

const BRAND_NAME = "Kanjirowa-Hospitality";
const EMAIL_LOGO_PATH = "/email-logo.png";

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

function getPublicUrl(path: string) {
  const appUrl =
    process.env.APP_URL?.trim().replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim().replace(/\/$/, "")}` : "");

  if (!appUrl) {
    throw new Error("APP_URL is required for public email assets.");
  }

  return `${appUrl}${path}`;
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
  const logoUrl = getPublicUrl(EMAIL_LOGO_PATH);

  await createTransporter().sendMail({
    from,
    to,
    subject: `${BRAND_NAME} password reset verification code`,
    text: [
      `Please verify your identity, ${BRAND_NAME}.`,
      "",
      `Your verification code is: ${code}`,
      `This code is valid for ${expiresInMinutes} minutes and can only be used once.`,
      "Please do not share this code with anyone.",
      "",
      "If you did not request this, ignore this email or contact your super admin.",
      "",
      "Thanks,",
      "The Kanjirowa Team",
    ].join("\n"),
    html: `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>${BRAND_NAME} verification code</title>
        </head>
        <body style="margin:0; padding:0; background:#ffffff; color:#111827; font-family:Arial, Helvetica, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#ffffff;">
            <tr>
              <td align="center" style="padding:48px 16px 24px;">
                <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:640px;">
                  <tr>
                    <td align="center" style="padding-bottom:18px;">
                      <img src="${logoUrl}" width="48" height="48" alt="${BRAND_NAME}" style="display:block; width:48px; height:48px; object-fit:contain; border:0;" />
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 8px 24px;">
                      <h1 style="margin:0; color:#111827; font-size:28px; line-height:36px; font-weight:400; letter-spacing:0;">
                        Please verify your identity, <strong style="font-weight:700;">${BRAND_NAME}</strong>
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="border:1px solid #d0d7de; border-radius:6px; padding:24px 22px; color:#111827;">
                      <p style="margin:0 0 22px; font-size:16px; line-height:24px;">
                        Here is your Kanjirowa password reset verification code:
                      </p>
                      <p style="margin:0 0 26px; text-align:center; color:#111827; font-size:30px; line-height:38px; letter-spacing:8px; font-weight:400;">
                        ${code}
                      </p>
                      <p style="margin:0 0 16px; font-size:16px; line-height:24px;">
                        This code is valid for <strong style="font-weight:700;">${expiresInMinutes} minutes</strong> and can only be used once.
                      </p>
                      <p style="margin:0 0 18px; font-size:16px; line-height:24px;">
                        <strong style="font-weight:700;">Please don&apos;t share this code with anyone:</strong> we&apos;ll never ask for it on the phone or via email.
                      </p>
                      <p style="margin:0; font-size:16px; line-height:24px;">
                        Thanks,<br />
                        The Kanjirowa Team
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 0 20px; color:#57606a; font-size:16px; line-height:24px;">
                      You&apos;re receiving this email because a verification code was requested for your Kanjirowa account. If this wasn&apos;t you, please ignore this email.
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #d8dee4; padding-top:26px; text-align:center; color:#57606a; font-size:13px; line-height:20px;">
                      ${BRAND_NAME}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}
