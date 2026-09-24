import { jwtVerify, SignJWT } from "jose";
import { env } from "../config";

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

export interface AuthTokenPayload {
  userId: string;
  username?: string;
}

export async function signAuthToken(userId: string, username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  if (!payload.sub) throw new Error("Token has no subject");
  return {
    userId: payload.sub,
    username: typeof payload.username === "string" ? payload.username : undefined,
  };
}
