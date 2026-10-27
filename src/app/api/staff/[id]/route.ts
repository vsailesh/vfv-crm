import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

type P = { params: Promise<{ id: string }> };

// GET /api/staff/[id] — member profile: identity, capacity, ownership stats, activity
export async function GET(_req: NextRequest, { params }: P) {
  const { id } = await params;
  const s = db.prepare("SELECT * FROM staff WHERE id = ?").get(id) as any;
  if (!s) return bad("staff not found", 404);

  const customersOwned = (db.prepare("SELECT COUNT(*) AS n FROM customers WHERE assignedStaffId = ?").get(id) as { n: number }).n;
  const leadStats = db.prepare(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted FROM leads WHERE assignedStaffId = ?"
  ).get(id) as { total: number; converted: number };
  const lastAssigned = db.prepare(
    "SELECT createdAt FROM customers WHERE assignedStaffId = ? ORDER BY createdAt DESC LIMIT 1"
  ).get(id) as { createdAt: string } | undefined;
  const pendingFu = (db.prepare(
    "SELECT COUNT(*) AS n FROM followups f JOIN customers c ON c.id = f.customerId WHERE c.assignedStaffId = ? AND f.status = 'pending'"
  ).get(id) as { n: number }).n;

  // Activity rows mention the member by name in seed data ("assigned to Naveen" etc.)
  const activity = db.prepare(
    "SELECT id, customerId, kind, text, createdAt FROM activities WHERE text LIKE ? ORDER BY createdAt DESC LIMIT 20"
  ).all(`%${s.name}%`);

  return ok({
    member: {
      ...s,
      permissions: JSON.parse(s.permissions ?? "[]"),
      status: s.isActive ? "active" : "inactive",
      availability: s.isAvailable ? "available" : "busy",
    },
    stats: {
      customersOwned,
      leadsAssigned: leadStats.total,
      leadsConverted: leadStats.converted,
      conversionPct: leadStats.total ? Math.round((leadStats.converted / leadStats.total) * 1000) / 10 : 0,
      lastAssignedAt: lastAssigned?.createdAt ?? null,
      pendingFollowUps: pendingFu,
    },
    activity,
  });
}
