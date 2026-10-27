import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

// POST /api/auth/logout — clears the session cookie
export async function POST() {
  const res = NextResponse.json({ statusCode: 200, data: { loggedOut: true }, message: "OK" });
  res.cookies.set(AUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
