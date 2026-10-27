import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

// GET /api/wa/bots
export async function GET() {
  const rows = db.prepare("SELECT * FROM wa_bots ORDER BY createdAt DESC").all();
  return ok({ data: rows });
}

// POST /api/wa/bots — create a chatbot shell (flow edited in builder)
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const { name } = b ?? {};
  if (!name || typeof name !== "string" || !name.trim()) return bad("bot name is required");
  const id = `bot_${Date.now().toString(36)}`;
  db.prepare("INSERT INTO wa_bots (id, name, version, isActive, isDefault, sessions, completed, dropoffs, createdAt) VALUES (?,?,1,0,0,0,0,0,?)").run(
    id, name.trim(), new Date().toISOString());
  return ok(db.prepare("SELECT * FROM wa_bots WHERE id = ?").get(id));
}
