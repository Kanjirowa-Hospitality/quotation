export const AUTH_COOKIE_NAME = "kanjirowa_session";

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isSignedAuthCookie(value?: string) {
  if (!value || !process.env.AUTH_SECRET) return false;

  const [token, signature] = value.split(".");
  if (!token || !signature) return false;

  return (await digest(`${token}.${process.env.AUTH_SECRET}`)) === signature;
}
