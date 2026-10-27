import { NextRequest, NextResponse } from "next/server";

/**
 * Route gate. Verifies the vfv_session HMAC with Web Crypto (edge-safe —
 * no node:crypto, no sqlite here). API paths get a 401 JSON envelope, pages
 * get redirected to /login with a return path.
 */
const AUTH_COOKIE = "vfv_session";
const SECRET = process.env.VFV_AUTH_SECRET ?? "vfv-dev-secret-change-me";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/me"];

function enc(s: string) {
  return new TextEncoder().encode(s);
}

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validSig(token: string | undefined) {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const key = await crypto.subtle.importKey("raw", enc(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = hex(await crypto.subtle.sign("HMAC", key, enc(body)));
  if (mac.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const payload = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload?.sub === "string" && typeof payload?.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p)) return NextResponse.next();

  if (await validSig(req.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ statusCode: 401, data: null, message: "Not authenticated" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
