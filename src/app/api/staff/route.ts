import { NextRequest } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

function hashPassword(email: string, password: string) {
  return crypto.createHash("sha256").update(`${(email ?? "").toLowerCase()}:${password}`).digest("hex");
}

// GET /api/staff — team roster + headline metrics
export async function GET() {
  const rows = (db.prepare("SELECT * FROM staff ORDER BY createdAt ASC").all() as any[]).map((s) => ({
    ...s,
    permissions: JSON.parse(s.permissions ?? "[]"),
    availability: s.isAvailable ? "available" : "busy",
    waCapacityUsed: s.currentActiveLeads,
    status: s.isActive ? "active" : "inactive",
    lastActiveAt: s.lastSeenAt ?? "",
  }));
  const metrics = db.prepare(
    `SELECT COUNT(*) AS totalStaff, SUM(isActive) AS activeStaff,
       (SELECT ROUND(100.0 * SUM(CASE WHEN l.status='converted' THEN 1 ELSE 0 END) / COUNT(*), 1) FROM leads l) AS conversionRate
     FROM staff`
  ).get();
  return ok({ data: rows, metrics });
}

// POST /api/staff — Add Staff Member
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.name || !b?.email) return bad("name and email required");
  const id = `stf_${Date.now().toString(36)}`;
  const perms = Array.isArray(b.permissions) && b.permissions.length ? JSON.stringify(b.permissions) : "[]";
  db.prepare(
    `INSERT INTO staff (id, staffCode, name, email, phone, role, department, designation, passwordHash, isActive, isAvailable, currentActiveLeads, maxActiveLeads, permissions, lastSeenAt, createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,1,0,?,?,NULL,?)`
  ).run(
    id, `STF-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, b.name, b.email, b.phone ?? null,
    b.role ?? "staff", b.department ?? null, b.designation ?? null,
    hashPassword(b.email, b.password ?? "welcome123"), Number(b.maxActiveLeads ?? 0), perms, new Date().toISOString(),
  );
  return ok({ id });
}

// PATCH /api/staff — availability/status flips and inline field edits by id
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("id required");
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const f of ["isActive", "role", "department", "designation", "name", "email", "phone", "isAvailable", "maxActiveLeads"] as const) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  }
  if (Array.isArray(b.permissions)) { sets.push("permissions = ?"); params.push(JSON.stringify(b.permissions)); }
  if (typeof b.password === "string" && b.password) {
    const email = (db.prepare("SELECT email FROM staff WHERE id = ?").get(b.id) as { email: string } | undefined)?.email;
    if (!email) return bad("staff not found", 404);
    sets.push("passwordHash = ?"); params.push(hashPassword(email, b.password));
  }
  if (!sets.length) return bad("nothing to update");
  params.push(b.id);
  db.prepare(`UPDATE staff SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return ok({ id: b.id });
}

// DELETE /api/staff?id= — remove a member (reassigns nothing; customers keep history)
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("id required");
  const res = db.prepare("DELETE FROM staff WHERE id = ?").run(id);
  if (res.changes === 0) return bad("staff not found", 404);
  return ok({ id, deleted: true });
}
