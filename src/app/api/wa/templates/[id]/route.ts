import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

type P = { params: Promise<{ id: string }> };

// PATCH /api/wa/templates/[id] — {status} flips approval (demo stand-in for Meta review)
export async function PATCH(req: NextRequest, { params }: P) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!["approved", "pending", "rejected"].includes(b?.status)) return bad("status must be approved|pending|rejected");
  const res = db.prepare("UPDATE wa_templates SET status = ? WHERE id = ?").run(b.status, id);
  if (res.changes === 0) return bad("template not found", 404);
  return ok(db.prepare("SELECT * FROM wa_templates WHERE id = ?").get(id));
}

// DELETE /api/wa/templates/[id]
export async function DELETE(_req: NextRequest, { params }: P) {
  const { id } = await params;
  const res = db.prepare("DELETE FROM wa_templates WHERE id = ?").run(id);
  if (res.changes === 0) return bad("template not found", 404);
  return ok({ id, deleted: true });
}
