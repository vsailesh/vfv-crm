import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok } from "@/lib/api";

// GET /api/settings — workspace settings surfaced in the top bar and WhatsApp pages
export async function GET() {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('aiTokens', 'whatsappPhone')").all() as
    | Array<{ key: string; value: string }>
    | [];
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return ok({ aiTokens: Number(byKey.get("aiTokens") ?? 0), whatsappPhone: byKey.get("whatsappPhone") ?? null });
}

// PATCH /api/settings — { aiTokens?: number }
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (typeof b?.aiTokens !== "number") return ok({ noop: true });
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('aiTokens', ?)").run(String(b.aiTokens));
  return ok({ aiTokens: b.aiTokens });
}
