import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

// Edge-safe (no next/headers). Used by both middleware and server code.
const secret = new TextEncoder().encode(env.APP_SECRET);

export const SESSION_COOKIE = "cartopia_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export type SessionData = { id: string; email: string };

export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({ email: data.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { id: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}
