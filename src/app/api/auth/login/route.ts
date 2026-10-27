import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";
import { AUTH_COOKIE, mintSession, passwordHash } from "@/lib/auth";

// POST /api/auth/login — { email, password } → sets vfv_session cookie
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.email || !b?.password) return bad("email and password required", 400);

  const staff = db.prepare("SELECT * FROM staff WHERE lower(email) = lower(?) AND isActive = 1").get(String(b.email)) as any;
  if (!staff || staff.passwordHash !== passwordHash(staff.email, String(b.password))) {
    return bad("Invalid email or password", 401);
  }

  const { token, expires } = mintSession({ sub: staff.id, name: staff.name, role: staff.role });
  db.prepare("UPDATE staff SET lastSeenAt = ? WHERE id = ?").run(new Date().toISOString(), staff.id);
  const res = NextResponse.json({ statusCode: 200, data: { id: staff.id, name: staff.name, role: staff.role }, message: "OK" });
  res.cookies.set(AUTH_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", expires });
  return res;
}
