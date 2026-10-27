import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok, bad } from "@/lib/api";

type P = { params: Promise<{ id: string }> };

// GET /api/wa/bots/[id]/responses — captured answers from Store-Response-In nodes
export async function GET(_req: NextRequest, { params }: P) {
  const { id } = await params;
  const row = db.prepare("SELECT id FROM wa_bots WHERE id = ?").get(id);
  if (!row) return bad("chatbot not found", 404);
  const data = db.prepare("SELECT id, phone, nodeLabel, answer, createdAt FROM wa_bot_responses WHERE botId = ? ORDER BY createdAt DESC LIMIT 100").all(id);
  return ok({ data });
}
