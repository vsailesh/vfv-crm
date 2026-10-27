import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

export async function GET() {
  const rows = db.prepare("SELECT * FROM segments ORDER BY createdAt DESC").all().map((s: any) => ({
    ...s,
    customerIds: JSON.parse(s.customerIds),
    count: JSON.parse(s.customerIds).length,
  }));
  return ok({ data: rows });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.name) return bad("name required");
  const now = new Date().toISOString();
  const id = `seg_${Date.now().toString(36)}`;
  db.prepare("INSERT INTO segments (id, name, type, description, customerIds, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)")
    .run(id, b.name, b.type ?? "static", b.description ?? null, JSON.stringify(b.customerIds ?? []), now, now);
  return ok({ id });
}

// PATCH — rename / re-describe a segment
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.id) return bad("id required");
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const f of ["name", "description"] as const) {
    if (typeof b[f] === "string") { sets.push(`${f} = ?`); params.push(b[f]); }
  }
  if (Array.isArray(b.customerIds)) { sets.push("customerIds = ?"); params.push(JSON.stringify(b.customerIds)); }
  if (!sets.length) return bad("nothing to update");
  sets.push("updatedAt = ?");
  params.push(new Date().toISOString(), b.id);
  db.prepare(`UPDATE segments SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return ok({ id: b.id });
}

// DELETE ?id= — remove a segment (campaigns keep their snapshot counts)
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("id required");
  const res = db.prepare("DELETE FROM segments WHERE id = ?").run(id);
  if (res.changes === 0) return bad("segment not found", 404);
  return ok({ id, deleted: true });
}
