import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

// GET /api/customers/:id — detail incl notes, activities, followups, lead
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const customer = db.prepare(
    `SELECT c.*, s.name AS assignedStaffName FROM customers c LEFT JOIN staff s ON s.id = c.assignedStaffId WHERE c.id = ?`
  ).get(id);
  if (!customer) return bad("customer not found", 404);

  const notes = db.prepare("SELECT * FROM notes WHERE customerId = ? ORDER BY createdAt DESC").all(id);
  const activities = db.prepare("SELECT * FROM activities WHERE customerId = ? ORDER BY createdAt DESC").all(id);
  const followups = db.prepare("SELECT * FROM followups WHERE customerId = ? ORDER BY dueAt ASC").all(id);
  const lead = db.prepare("SELECT * FROM leads WHERE customerId = ? ORDER BY updatedAt DESC LIMIT 1").get(id);
  return ok({ customer, notes, activities, followups, lead });
}

// PATCH — edit / archive
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b) return bad("body required");
  const fields = ["name", "phone", "email", "address", "city", "state", "pincode", "businessName", "status", "assignedStaffId", "unseen"] as const;
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const f of fields) if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  if (b.archived !== undefined) { sets.push(`status = ?`); params.push(b.archived ? "archived" : "prospect"); }
  if (!sets.length) return bad("nothing to update");
  sets.push("updatedAt = ?");
  params.push(new Date().toISOString());
  params.push(id);
  db.prepare(`UPDATE customers SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return ok({ id });
}
