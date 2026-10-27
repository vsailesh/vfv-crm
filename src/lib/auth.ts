import crypto from "crypto";

/**
 * Stateless session tokens: base64url(payload).hmacHex.
 * Payload = { sub: staffId, name, role, exp }. The signature is verified by
 * both node routes (mint) and the edge middleware (verify via Web Crypto),
 * so no DB lookup is needed to gate a request.
 */
export const AUTH_COOKIE = "vfv_session";
const SECRET = process.env.VFV_AUTH_SECRET ?? "vfv-dev-secret-change-me";
const TTL_MS = 7 * 86400000;

export type SessionPayload = { sub: string; name: string; role: string; exp: number };

function b64url(s: string) {
  return Buffer.from(s, "utf-8").toString("base64url");
}

function hmac(data: string) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
}

export function mintSession(p: { sub: string; name: string; role: string }): { token: string; expires: Date } {
  const payload: SessionPayload = { ...p, exp: Date.now() + TTL_MS };
  const body = b64url(JSON.stringify(payload));
  return { token: `${body}.${hmac(body)}`, expires: new Date(payload.exp) };
}

/** Node-side verify (login-guarded routes). Returns null when invalid/expired. */
export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = hmac(body);
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (!payload?.sub || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function passwordHash(email: string, password: string) {
  return crypto.createHash("sha256").update(`${email.toLowerCase()}:${password}`).digest("hex");
}
