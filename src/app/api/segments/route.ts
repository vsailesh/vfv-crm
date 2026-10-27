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
