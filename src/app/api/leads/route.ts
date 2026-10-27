import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";
import { STAGES } from "@/lib/db";

const STAGE_KEYS = STAGES.map((s) => s.key);

// GET /api/leads?page=1&limit=20&status=new&q=search
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(100, Number(sp.get("limit") ?? 20));
  const status = sp.get("status");
  const q = sp.get("q");

  let where = " WHERE 1=1";
  const params: unknown[] = [];
  if (status && STAGE_KEYS.includes(status as never)) {
    where += " AND l.status = ?";
    params.push(status);
  }
  if (q) {
    where += " AND (c.name LIKE ? OR c.phone LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  const total = (db.prepare(`SELECT COUNT(*) AS n FROM leads l JOIN customers c ON c.id = l.customerId${where}`).get(...params) as { n: number }).n;
  const rows = db.prepare(
    `SELECT l.id, l.status, l.source, l.noteCount, l.activityCount, l.createdAt, l.updatedAt,
            c.id AS customerId, c.name AS fullName, c.phone, c.email, c.status AS customerStatus,
            s.name AS assignedToStaffName
     FROM leads l
     JOIN customers c ON c.id = l.customerId
     LEFT JOIN staff s ON s.id = l.assignedStaffId
     ${where}
     ORDER BY l.updatedAt DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, (page - 1) * limit);

  return ok({ data: rows, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}

// PATCH /api/leads — {id, status} moves a lead between stages (kanban drag)
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) return bad("id and status required");
  if (!STAGE_KEYS.includes(body.status)) return bad(`status must be one of: ${STAGE_KEYS.join(", ")}`);

  const lead = db.prepare("SELECT id, status FROM leads WHERE id = ?").get(body.id) as { id: string; status: string } | undefined;
  if (!lead) return bad("lead not found", 404);

  const now = new Date().toISOString();
  const hist = JSON.parse((db.prepare("SELECT statusHistory FROM leads WHERE id = ?").get(body.id) as { statusHistory: string }).statusHistory || "[]");
  hist.push({ status: body.status, at: now });

  db.prepare("UPDATE leads SET status = ?, statusHistory = ?, updatedAt = ? WHERE id = ?").run(body.status, JSON.stringify(hist), now, body.id);
  db.prepare("UPDATE customers SET leadStage = ?, updatedAt = ? WHERE id = (SELECT customerId FROM leads WHERE id = ?)").run(body.status, now, body.id);
  db.prepare("INSERT INTO activities (id, customerId, kind, text, createdAt) VALUES (?,?,?,?,?)").run(
    `act_${Date.now()}`, (db.prepare("SELECT customerId FROM leads WHERE id = ?").get(body.id) as { customerId: string }).customerId,
    "stage", `Moved ${lead.status} → ${body.status}`, now
  );
  return ok({ id: body.id, status: body.status });
}

// POST /api/leads — new lead (creates customer + lead)
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.name || !b?.phone) return bad("name and phone required");
  const now = new Date().toISOString();
  const cid = `cus_${Date.now().toString(36)}`;
  const lid = `lead_${Date.now().toString(36)}`;
  const stage = STAGE_KEYS.includes(b.stage) ? b.stage : "new";

  db.prepare(
    `INSERT INTO customers (id, customerNumber, name, phone, email, address, city, state, pincode, businessName, status, source, tags, assignedStaffId, leadStage, unseen, engagement, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?, 'prospect', 'manual', '[]', (SELECT id FROM staff WHERE isAvailable=1 ORDER BY currentActiveLeads LIMIT 1), ?, 0, 0, ?, ?)`
  ).run(cid, `BZ-C-${Date.now()}`, b.name, b.phone, b.email ?? null, b.address ?? null, b.city ?? null, b.state ?? null, b.pincode ?? null, b.businessName ?? null, stage, now, now);

  db.prepare("INSERT INTO leads (id, customerId, status, source, assignedStaffId, noteCount, activityCount, statusHistory, createdAt, updatedAt) VALUES (?,?,?,?,?,0,0,?,?,?)")
    .run(lid, cid, stage, "manual", null, JSON.stringify([{ status: stage, at: now }]), now, now);
  db.prepare("UPDATE customers SET leadStage=? WHERE id=?").run(stage, cid);
  return ok({ leadId: lid, customerId: cid });
}
