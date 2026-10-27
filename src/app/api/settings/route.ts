import { NextRequest } from "next/server";
import db from "@/lib/db";
import { ok } from "@/lib/api";

// GET /api/settings — workspace settings surfaced in the top bar
export async function GET() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'aiTokens'").get() as { value: string } | undefined;
  return ok({ aiTokens: Number(row?.value ?? 0) });
}

// PATCH /api/settings — { aiTokens?: number }
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (typeof b?.aiTokens !== "number") return ok({ noop: true });
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('aiTokens', ?)").run(String(b.aiTokens));
  return ok({ aiTokens: b.aiTokens });
}
