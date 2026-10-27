import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

// GET /api/staff
export async function GET() {
  const rows = (db.prepare("SELECT * FROM staff ORDER BY createdAt ASC").all() as any[]).map((s) => ({
    ...s,
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
  db.prepare(
    `INSERT INTO staff (id, staffCode, name, email, phone, role, department, designation, isActive, isAvailable, currentActiveLeads, lastSeenAt, createdAt)
     VALUES (?,?,?,?,?,?,?,?,'1','1',0,NULL,?)`
  ).run(id, `STF-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, b.name, b.email, b.phone ?? null, b.role ?? "staff", b.department ?? null, b.designation ?? null, new Date().toISOString());
  return ok({ id });
}

// PATCH /api/staff — { id, isActive?, role?, department? }
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("id required");
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const f of ["isActive", "role", "department"] as const) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  }
  if (!sets.length) return bad("nothing to update");
  params.push(b.id);
  db.prepare(`UPDATE staff SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return ok({ id: b.id });
}
