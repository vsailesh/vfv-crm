import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

type P = { params: Promise<{ id: string }> };

// PATCH /api/wa/bots/[id] — {isActive?, isDefault?}
export async function PATCH(req: NextRequest, { params }: P) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const row = db.prepare("SELECT id FROM wa_bots WHERE id = ?").get(id);
  if (!row) return bad("chatbot not found", 404);

  if (b?.isActive === true) db.prepare("UPDATE wa_bots SET isActive = 1 WHERE id = ?").run(id);
  if (b?.isActive === false) db.prepare("UPDATE wa_bots SET isActive = 0 WHERE id = ?").run(id);
  if (b?.isDefault === true) {
    db.prepare("UPDATE wa_bots SET isDefault = 0").run();
    db.prepare("UPDATE wa_bots SET isDefault = 1, isActive = 1 WHERE id = ?").run(id);
  }
  return ok(db.prepare("SELECT * FROM wa_bots WHERE id = ?").get(id));
}

// DELETE /api/wa/bots/[id]
export async function DELETE(_req: NextRequest, { params }: P) {
  const { id } = await params;
  const res = db.prepare("DELETE FROM wa_bots WHERE id = ?").run(id);
  if (res.changes === 0) return bad("chatbot not found", 404);
  return ok({ id, deleted: true });
}
