import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";
import { rulesWhere } from "@/lib/segment-rules";

// GET /api/campaigns — list with segment names
export async function GET() {
  const rows = db.prepare(
    `SELECT m.id, m.name, m.template, m.status, m.recipientCount, m.scheduledAt, m.createdAt,
            s.name AS segmentName
     FROM campaigns m
     LEFT JOIN segments s ON s.id = m.segmentId
     ORDER BY COALESCE(m.scheduledAt, m.createdAt) DESC`
  ).all();
  return ok({ data: rows });
}

// POST /api/campaigns — queue a campaign against a segment
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const { segmentId, name, template, scheduledAt } = b ?? {};
  if (!segmentId || !name || !template) return bad("segmentId, name and template are required");

  const seg = db.prepare("SELECT id, customerIds, type, rules FROM segments WHERE id = ?").get(segmentId) as
    | { id: string; customerIds: string; type: string; rules: string | null }
    | undefined;
  if (!seg) return bad("segment not found", 404);

  let count = 0;
  if (seg.type === "dynamic" && seg.rules) {
    // dynamic segments resolve their audience at queue time
    const r = JSON.parse(seg.rules);
    const w = rulesWhere(r);
    if (!w) return bad("dynamic segment has no active rules");
    count = (db.prepare(`SELECT COUNT(*) AS n FROM customers c${w.where}`).get(...w.params) as { n: number }).n;
  } else {
    try { count = (JSON.parse(seg.customerIds) as string[]).length; } catch { count = 0; }
  }

  const id = `cmp_${Date.now().toString(36)}`;
  db.prepare(
    "INSERT INTO campaigns (id, segmentId, name, template, status, recipientCount, scheduledAt, createdAt) VALUES (?,?,?,?,?,?,?,?)"
  ).run(id, segmentId, name, template, "queued", count,
    typeof scheduledAt === "string" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    new Date().toISOString());

  return ok({ id, status: "queued", recipientCount: count });
}
