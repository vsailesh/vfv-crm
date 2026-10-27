import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

// GET /api/wa/bots
export async function GET() {
  const rows = db.prepare("SELECT * FROM wa_bots ORDER BY createdAt DESC").all();
  return ok({ data: rows });
}

// POST /api/wa/bots — create a chatbot shell with a starter trigger node.
// Name optional: absent/blank creates "Untitled flow" (renamed in the builder).
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const name = typeof b?.name === "string" && b.name.trim() ? b.name.trim() : "Untitled flow";
  const id = `bot_${Date.now().toString(36)}`;
  const nodes = JSON.stringify([
    { id: "trigger_0", type: "trigger", position: { x: 120, y: 200 }, data: { keywords: [] } },
  ]);
  db.prepare("INSERT INTO wa_bots (id, name, version, isActive, isDefault, sessions, completed, dropoffs, nodes, edges, createdAt) VALUES (?,?,1,0,0,0,0,0,?,'[]',?)").run(
    id, name, nodes, new Date().toISOString());
  return ok(db.prepare("SELECT * FROM wa_bots WHERE id = ?").get(id));
}
